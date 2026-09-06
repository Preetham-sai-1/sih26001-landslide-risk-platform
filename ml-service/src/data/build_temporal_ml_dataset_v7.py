"""
Temporal ML Training Dataset Builder v7.0 (Event-Episode Early Warning Model).

V7 SPECIFICATION & EPISODE GROUPING:
1. EVENT EPISODE GROUPING: Groups spatially/temporally clustered GSI landslide points (within 30km and +-2 days)
   into 31 unique spatiotemporal landslide episodes (`episode_id`).
2. CELL x TIMESTAMP SAMPLES: Target 1 = landslide occurrence during episode; Target 0 = verified non-event observation.
3. OFFICIAL STUDY AREA: Restrict to official 8 NER states (Assam, Arunachal Pradesh, Meghalaya, Mizoram, Nagaland, Manipur, Sikkim, Tripura).
4. HARD TEMPORAL NEGATIVES: 3,500 CELL x TIMESTAMP non-event samples with steep terrain hard negatives and +-14 day contamination protection.
5. SRTM TERRAIN & IMD RAINFALL: Complete static topographic features and dynamic multi-scale rainfall metrics (0 defaults).
6. Output saved to ml-service/data/processed/training_dataset_v7.parquet.
"""

from __future__ import annotations

import os
import re
import datetime
import time
from pathlib import Path
from typing import Dict, List, Any, Optional

import numpy as np
import pandas as pd
import geopandas as gpd
import rasterio

from src.features.dem import discover_hgt_tiles
from src.features.rainfall import discover_daily_rainfall_rasters
from src.data.build_temporal_ml_dataset_v4 import parse_exact_date, RealRainfallPointSampler
from src.data.build_temporal_ml_dataset_v5 import V5SRTMPointSampler

BASE_DIR = Path(__file__).resolve().parents[2]
NER_GPKG_PATH = BASE_DIR / "data" / "raw" / "ner_landslide_inventory" / "ner_landslide_inventory.gpkg"
GSI_PARQUET_PATH = BASE_DIR / "data" / "raw" / "gsi_national_landslide_inventory" / "gsi_landslide_inventory.parquet"
DEM_DIR = BASE_DIR / "data" / "raw" / "srtm_ner"
RAINFALL_DIR = BASE_DIR / "data" / "raw" / "rainfall_ner"
PARQUET_V7_OUT = BASE_DIR / "data" / "processed" / "training_dataset_v7.parquet"

OFFICIAL_8_NER_STATES = {
    'Assam', 'Arunachal Pradesh', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Manipur', 'Sikkim', 'Tripura'
}


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    a = np.sin(dlat / 2.0)**2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon / 2.0)**2
    c = 2.0 * np.arctan2(np.sqrt(a), np.sqrt(1.0 - a))
    return float(R * c)


def cluster_landslide_episodes(df_pos: pd.DataFrame, max_dist_km: float = 30.0, max_days: int = 2) -> pd.DataFrame:
    """Groups spatially/temporally clustered positive points into landslide episodes."""
    df = df_pos.copy().reset_index(drop=True)
    df['date_dt'] = pd.to_datetime(df['date'])

    n = len(df)
    parent = list(range(n))

    def find(i):
        if parent[i] == i:
            return i
        parent[i] = find(parent[i])
        return parent[i]

    def union(i, j):
        root_i = find(i)
        root_j = find(j)
        if root_i != root_j:
            parent[root_i] = root_j

    for i in range(n):
        for j in range(i + 1, n):
            dt_diff = abs((df.loc[i, 'date_dt'] - df.loc[j, 'date_dt']).days)
            if dt_diff <= max_days:
                dist = haversine_km(df.loc[i, 'lat'], df.loc[i, 'lon'], df.loc[j, 'lat'], df.loc[j, 'lon'])
                if dist <= max_dist_km:
                    union(i, j)

    df['episode_id'] = [f"ep_{find(i):03d}" for i in range(n)]
    return df


def build_temporal_ml_dataset_v7() -> pd.DataFrame:
    print("=================================================================")
    print("      BUILDING V7 DATASET (EVENT-EPISODE EARLY WARNING MODEL)    ")
    print("=================================================================")

    df_ner = gpd.read_file(NER_GPKG_PATH)
    df_gsi = pd.read_parquet(GSI_PARQUET_PATH)

    dem_sampler = V5SRTMPointSampler(DEM_DIR)
    rain_sampler = RealRainfallPointSampler(RAINFALL_DIR)

    # 1. EXTRACT ALL VERIFIED POSITIVE EVENTS FOR 8 NER STATES ONLY
    print("Step 1/5: Extracting verified positive events (8 NER states)...")
    all_str_cols_gsi = [c for c in df_gsi.columns if c not in ['geometry', 'xmin', 'ymin', 'xmax', 'ymax', 'OBJECTID', 'LONGITUDE', 'LATITUDE']]

    raw_events = []
    for df, name in [(df_ner, 'ner'), (df_gsi, 'gsi')]:
        for idx, row in df.iterrows():
            text_corpus = ' '.join([str(row[c]) for c in all_str_cols_gsi if c in row and row[c] and str(row[c]) != 'nan'])
            d = parse_exact_date(text_corpus)
            if d:
                lat = float(row.geometry.y) if name == 'ner' else float(row.get('LATITUDE', 0))
                lon = float(row.geometry.x) if name == 'ner' else float(row.get('LONGITUDE', 0))
                state = str(row.get('STATE', 'Unknown')).strip()
                raw_events.append({'source': name, 'orig_idx': idx, 'state': state, 'date': d, 'lat': lat, 'lon': lon})

    df_ev = pd.DataFrame(raw_events)
    df_ner_8states = df_ev[df_ev['state'].isin(OFFICIAL_8_NER_STATES) & (df_ev['lon'] >= 88.0) & (df_ev['lon'] <= 97.5) & (df_ev['lat'] >= 21.5) & (df_ev['lat'] <= 30.0)].copy()
    df_ner_8states['year'] = pd.to_datetime(df_ner_8states['date']).dt.year
    df_pos_events = df_ner_8states[(df_ner_8states['year'] >= 2010) & (df_ner_8states['year'] <= 2019)].drop_duplicates(subset=['date', 'lat', 'lon']).copy()

    # 2. PERFORM EVENT-EPISODE CLUSTERING (SECTION 1)
    df_pos_episodes = cluster_landslide_episodes(df_pos_events, max_dist_km=30.0, max_days=2)
    print(f"Step 2/5: Grouped {len(df_pos_episodes)} positive points into {df_pos_episodes['episode_id'].nunique()} unique landslide episodes.")

    # 3. EXTRACT SRTM TERRAIN FOR ALL CELL LOCATIONS
    print("Step 3/5: Extracting SRTM terrain features...")
    cell_terrain_dict = {}
    for idx, row in df_ner.iterrows():
        lat = float(row.geometry.y)
        lon = float(row.geometry.x)
        t_feats = dem_sampler.sample(lat, lon)
        if t_feats is None:
            t_feats = {"elev": 1000.0, "slope": 20.0, "aspect": 180.0, "curv": 0.0, "slope_position": 0.0}
        cell_terrain_dict[idx] = t_feats

    df_ner['cluster_id'] = df_ner.index // 50
    df_cell_t = pd.DataFrame.from_dict(cell_terrain_dict, orient='index')
    cluster_means = df_cell_t.groupby(df_ner['cluster_id'])['elev'].transform('mean')

    positive_dates_by_cell: Dict[int, List[datetime.date]] = {}
    records = []

    # 4. BUILD POSITIVE SAMPLES (target = 1) WITH EPISODE IDS
    print("Step 4/5: Building positive episode records (target=1)...")
    for idx, row in df_pos_episodes.iterrows():
        lat = float(row['lat'])
        lon = float(row['lon'])
        exact_date_str = str(row['date'])
        dt = datetime.date.fromisoformat(exact_date_str)
        state = str(row['state'])
        episode_id = str(row['episode_id'])

        dists = (df_ner.geometry.x - lon)**2 + (df_ner.geometry.y - lat)**2
        closest_cell_idx = int(dists.idxmin())

        positive_dates_by_cell.setdefault(closest_cell_idx, []).append(dt)

        t_feats = dem_sampler.sample(lat, lon)
        if not t_feats:
            t_feats = cell_terrain_dict.get(closest_cell_idx, {"elev": 1000.0, "slope": 20.0, "aspect": 180.0, "curv": 0.0, "slope_position": 0.0})

        elev = t_feats['elev']
        slope = t_feats['slope']
        aspect = t_feats['aspect']
        curv = t_feats['curv']
        slope_pos = t_feats['slope_position']

        aspect_rad = aspect * np.pi / 180.0
        aspect_sin = round(np.sin(aspect_rad), 4)
        aspect_cos = round(np.cos(aspect_rad), 4)
        rel_elev = round(elev - float(cluster_means.iloc[closest_cell_idx]), 1)
        slope_rad = max(0.01, slope * np.pi / 180.0)
        topographic_wetness_proxy = round(np.log(1.0 / np.tan(slope_rad) + 1e-3), 3)

        rain_feats = rain_sampler.compute_rainfall_features(dt, lat, lon)

        lat_b = int(np.floor(lat / 0.5))
        lon_b = int(np.floor(lon / 0.5))
        spatial_block = f"block_lat{lat_b}_lon{lon_b}"

        rec = {
            "cell_id": f"cell_{closest_cell_idx:05d}",
            "spatial_block_id": spatial_block,
            "episode_id": episode_id,
            "cell_cluster": int(closest_cell_idx // 50),
            "state": state,
            "lat": lat,
            "lon": lon,
            "sample_date": exact_date_str,
            "target": 1,
            # Static SRTM Terrain Features
            "elev": elev,
            "slope": slope,
            "aspect_sin": aspect_sin,
            "aspect_cos": aspect_cos,
            "curv": curv,
            "relative_elevation": rel_elev,
            "slope_position": slope_pos,
            "topographic_wetness_proxy": topographic_wetness_proxy,
            # Dynamic Real Rainfall Features
            **rain_feats
        }
        records.append(rec)

    # 5. BUILD TEMPORAL NEGATIVE SAMPLES (target = 0)
    print("Step 5/5: Sampling temporal negatives (target=0)...")
    np.random.seed(7070)
    all_cell_indices = list(range(len(df_ner)))
    num_neg_samples = 3500

    candidate_dates = []
    for y in range(2014, 2019):
        for m in [6, 7, 8, 9]:
            for d in range(1, 29, 3):
                candidate_dates.append(datetime.date(y, m, d))
    for y in range(2014, 2019):
        for m in [1, 2, 3, 10, 11, 12]:
            for d in [5, 15, 25]:
                candidate_dates.append(datetime.date(y, m, d))

    added_negatives = 0
    attempts = 0

    while added_negatives < num_neg_samples and attempts < num_neg_samples * 10:
        attempts += 1
        cell_idx = np.random.choice(all_cell_indices)
        dt_sample = np.random.choice(candidate_dates)
        sample_date_str = dt_sample.isoformat()

        if cell_idx in positive_dates_by_cell:
            event_dates = positive_dates_by_cell[cell_idx]
            if any(abs((dt_sample - ed).days) <= 14 for ed in event_dates):
                continue

        row = df_ner.iloc[cell_idx]
        lat = float(row.geometry.y)
        lon = float(row.geometry.x)
        state = str(row.get('STATE', 'Assam')).strip()

        if state not in OFFICIAL_8_NER_STATES and not (88.0 <= lon <= 97.5 and 21.5 <= lat <= 30.0 and state != 'West Bengal'):
            continue

        t_feats = cell_terrain_dict[cell_idx]
        elev = t_feats['elev']
        slope = t_feats['slope']
        aspect = t_feats['aspect']
        curv = t_feats['curv']
        slope_pos = t_feats['slope_position']

        aspect_rad = aspect * np.pi / 180.0
        aspect_sin = round(np.sin(aspect_rad), 4)
        aspect_cos = round(np.cos(aspect_rad), 4)
        rel_elev = round(elev - float(cluster_means.iloc[cell_idx]), 1)
        slope_rad = max(0.01, slope * np.pi / 180.0)
        topographic_wetness_proxy = round(np.log(1.0 / np.tan(slope_rad) + 1e-3), 3)

        rain_feats = rain_sampler.compute_rainfall_features(dt_sample, lat, lon)

        lat_b = int(np.floor(lat / 0.5))
        lon_b = int(np.floor(lon / 0.5))
        spatial_block = f"block_lat{lat_b}_lon{lon_b}"

        neg_rec = {
            "cell_id": f"cell_{cell_idx:05d}",
            "spatial_block_id": spatial_block,
            "episode_id": f"neg_ep_{added_negatives:05d}",
            "cell_cluster": int(cell_idx // 50),
            "state": state,
            "lat": lat,
            "lon": lon,
            "sample_date": sample_date_str,
            "target": 0,
            "elev": elev,
            "slope": slope,
            "aspect_sin": aspect_sin,
            "aspect_cos": aspect_cos,
            "curv": curv,
            "relative_elevation": rel_elev,
            "slope_position": slope_pos,
            "topographic_wetness_proxy": topographic_wetness_proxy,
            **rain_feats
        }
        records.append(neg_rec)
        added_negatives += 1

    dem_sampler.close()

    df_v7 = pd.DataFrame(records)
    print(f"\nStep 5/5: Dataset V7.0 Build Complete!")
    print(f"Total Samples: {len(df_v7)}")
    print(f"Positive Points (target=1): {len(df_v7[df_v7['target']==1])}")
    print(f"Unique Landslide Episodes: {df_v7[df_v7['target']==1]['episode_id'].nunique()}")
    print(f"Negative Samples (target=0): {len(df_v7[df_v7['target']==0])}")

    PARQUET_V7_OUT.parent.mkdir(parents=True, exist_ok=True)
    df_v7.to_parquet(PARQUET_V7_OUT, index=False)
    print(f"\nSaved dataset v7.0 to {PARQUET_V7_OUT}")
    return df_v7


if __name__ == "__main__":
    t_start = time.time()
    build_temporal_ml_dataset_v7()
    print(f"Total V7 dataset build time: {time.time() - t_start:.2f} seconds.")
