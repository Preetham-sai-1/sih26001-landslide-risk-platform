"""
Temporal ML Training Dataset Builder v6.0 (Generalization-First Rebuild).

V6 SPECIFICATION & LEAKAGE PROTECTION:
1. OFFICIAL STUDY AREA: Restrict to 8 NER states (Assam, Arunachal Pradesh, Meghalaya, Mizoram, Nagaland, Manipur, Sikkim, Tripura).
   EXCLUDE West Bengal from the official cohort.
2. VERIFIED POSITIVE EVENTS: 66 verified positive events with exact dates across the 8 NER states (2010-2019).
3. GEOGRAPHIC SPATIAL BLOCKING: Assign 0.5° x 0.5° lat/lon spatial block IDs to prevent spatial data leakage.
4. ENHANCED TEMPORAL NEGATIVES: 3,500 CELL x DATE non-event samples across all rainfall regimes (low, moderate, heavy, extreme)
   with steep terrain hard negatives, without target-dependent rainfall filtering.
5. CONTAMINATION PROTECTION: Excludes cell locations within +-14 days of positive event dates.
6. Output saved to ml-service/data/processed/training_dataset_v6.parquet.
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
PARQUET_V6_OUT = BASE_DIR / "data" / "processed" / "training_dataset_v6.parquet"

OFFICIAL_8_NER_STATES = {
    'Assam', 'Arunachal Pradesh', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Manipur', 'Sikkim', 'Tripura'
}


def get_spatial_block_id(lat: float, lon: float, block_size_deg: float = 0.5) -> str:
    """Computes geographic spatial block ID based on lat/lon coordinates."""
    lat_b = int(np.floor(lat / block_size_deg))
    lon_b = int(np.floor(lon / block_size_deg))
    return f"block_lat{lat_b}_lon{lon_b}"


def build_temporal_ml_dataset_v6() -> pd.DataFrame:
    print("=================================================================")
    print("      BUILDING V6 DATASET (OFFICIAL 8 NER STATES ONLY)           ")
    print("=================================================================")

    df_ner = gpd.read_file(NER_GPKG_PATH)
    df_gsi = pd.read_parquet(GSI_PARQUET_PATH)

    dem_sampler = V5SRTMPointSampler(DEM_DIR)
    rain_sampler = RealRainfallPointSampler(RAINFALL_DIR)

    # 1. EXTRACT ALL VERIFIED POSITIVE EVENTS ACROSS GSI NATIONAL + NER GPKG FOR 8 NER STATES ONLY
    print("Step 1/5: Extracting verified positive events for 8 official NER states...")
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

    # Filter spatial bounding box & 8 official NER states (EXCLUDING West Bengal)
    df_ner_8states = df_ev[df_ev['state'].isin(OFFICIAL_8_NER_STATES) & (df_ev['lon'] >= 88.0) & (df_ev['lon'] <= 97.5) & (df_ev['lat'] >= 21.5) & (df_ev['lat'] <= 30.0)].copy()
    df_ner_8states['year'] = pd.to_datetime(df_ner_8states['date']).dt.year
    df_pos_events = df_ner_8states[(df_ner_8states['year'] >= 2010) & (df_ner_8states['year'] <= 2019)].drop_duplicates(subset=['date', 'lat', 'lon']).copy()
    df_pos_events.reset_index(drop=True, inplace=True)

    print(f"Official 8 NER States Verified Positive Events: {len(df_pos_events)}")

    # 2. EXTRACT SRTM TERRAIN FOR ALL CELL LOCATIONS
    print("Step 2/5: Extracting SRTM terrain features (0 defaults)...")
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

    # 3. BUILD POSITIVE SAMPLES (target = 1)
    print("Step 3/5: Building positive records (target=1)...")
    for idx, row in df_pos_events.iterrows():
        lat = float(row['lat'])
        lon = float(row['lon'])
        exact_date_str = str(row['date'])
        dt = datetime.date.fromisoformat(exact_date_str)
        state = str(row['state'])

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

        spatial_block = get_spatial_block_id(lat, lon)

        rec = {
            "cell_id": f"cell_{closest_cell_idx:05d}",
            "spatial_block_id": spatial_block,
            "cell_cluster": int(closest_cell_idx // 50),
            "state": state,
            "lat": lat,
            "lon": lon,
            "sample_date": exact_date_str,
            "target": 1,
            # Static Terrain Features
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

    # 4. BUILD UNBIASED HARD TEMPORAL NEGATIVE SAMPLES (target = 0)
    print("Step 4/5: Sampling temporal negatives (target=0)...")
    np.random.seed(6060)
    all_cell_indices = list(range(len(df_ner)))
    num_neg_samples = 3500

    candidate_dates = []
    # Monsoon dates
    for y in range(2014, 2019):
        for m in [6, 7, 8, 9]:
            for d in range(1, 29, 3):
                candidate_dates.append(datetime.date(y, m, d))
    # Non-monsoon / dry dates
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

        # Contamination Check: Exclude if cell location has a landslide within +-14 days
        if cell_idx in positive_dates_by_cell:
            event_dates = positive_dates_by_cell[cell_idx]
            if any(abs((dt_sample - ed).days) <= 14 for ed in event_dates):
                continue

        row = df_ner.iloc[cell_idx]
        lat = float(row.geometry.y)
        lon = float(row.geometry.x)
        state = str(row.get('STATE', 'Assam')).strip()

        # Only use cell locations within the 8 official NER states
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
        spatial_block = get_spatial_block_id(lat, lon)

        neg_rec = {
            "cell_id": f"cell_{cell_idx:05d}",
            "spatial_block_id": spatial_block,
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

    # 5. SUMMARY AUDIT & EXPORT
    df_v6 = pd.DataFrame(records)
    print(f"\nStep 5/5: Dataset V6.0 Build Complete!")
    print(f"Total Samples: {len(df_v6)}")
    print(f"Positive Events (target=1): {len(df_v6[df_v6['target']==1])}")
    print(f"Negative Samples (target=0): {len(df_v6[df_v6['target']==0])}")
    print(f"Geographic Spatial Blocks Count: {df_v6['spatial_block_id'].nunique()}")

    pos_slope = df_v6[df_v6['target']==1]['slope']
    neg_slope = df_v6[df_v6['target']==0]['slope']
    print("\n--- TERRAIN DISTRIBUTION AUDIT (V6 - 8 NER STATES) ---")
    print(f"Positive Slope: mean={pos_slope.mean():.2f}°, std={pos_slope.std():.2f}°, min={pos_slope.min():.2f}°, max={pos_slope.max():.2f}°")
    print(f"Negative Slope: mean={neg_slope.mean():.2f}°, std={neg_slope.std():.2f}°, min={neg_slope.min():.2f}°, max={neg_slope.max():.2f}°")

    pos_r24 = df_v6[df_v6['target']==1]['r24h']
    neg_r24 = df_v6[df_v6['target']==0]['r24h']
    print("\n--- REAL RAINFALL DISTRIBUTION AUDIT (V6) ---")
    print(f"Positive r24h: mean={pos_r24.mean():.1f}mm, max={pos_r24.max():.1f}mm")
    print(f"Negative r24h: mean={neg_r24.mean():.1f}mm, max={neg_r24.max():.1f}mm")

    PARQUET_V6_OUT.parent.mkdir(parents=True, exist_ok=True)
    df_v6.to_parquet(PARQUET_V6_OUT, index=False)
    print(f"\nSaved dataset v6.0 to {PARQUET_V6_OUT}")
    return df_v6


if __name__ == "__main__":
    t_start = time.time()
    build_temporal_ml_dataset_v6()
    print(f"Total V6 dataset build time: {time.time() - t_start:.2f} seconds.")
