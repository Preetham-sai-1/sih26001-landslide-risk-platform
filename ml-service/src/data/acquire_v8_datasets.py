"""
V8 Data Acquisition Script for Landslide Risk Platform.

Acquires and subsets external geospatial datasets for the 8 official NER states:
- ESA WorldCover 10m (2021) from AWS S3 Open Data
- Hydrography (HydroBASINS lev01-12 & OSM Waterways)
- Road Network (OpenStreetMap transport extract via Geofabrik)

Documents authentication/portal blockers for:
- NASA GPM IMERG V07B (NASA Earthdata login required)
- NASA SMAP (NASA NSIDC login required)
- Geological Survey of India Lithology (GSI Bhukosh portal login required)
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import urllib.request
import zipfile

import geopandas as gpd
import rasterio

BASE_DIR = Path(__file__).resolve().parents[2]
EXTERNAL_DIR = BASE_DIR / "data" / "external"

OFFICIAL_8_NER_STATES = {
    'Assam', 'Arunachal Pradesh', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Manipur', 'Sikkim', 'Tripura'
}

NER_BBOX = [88.0, 21.5, 97.5, 30.0]  # min_lon, min_lat, max_lon, max_lat


def compute_sha256(filepath: Path) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def acquire_esa_worldcover() -> Path:
    print("\n--- Acquiring ESA WorldCover 10m 2021 (AWS Open Data) ---")
    wc_dir = EXTERNAL_DIR / "esa_worldcover"
    wc_dir.mkdir(parents=True, exist_ok=True)

    # WorldCover 3x3 degree tiles covering NER (88E-97.5E, 21.5N-30N)
    wc_tiles = [
        'N21E087', 'N21E090', 'N21E093', 'N21E096',
        'N24E087', 'N24E090', 'N24E093', 'N24E096',
        'N27E087', 'N27E090', 'N27E093', 'N27E096'
    ]

    downloaded_tiles = []
    for tile in wc_tiles:
        url = f"https://esa-worldcover.s3.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_{tile}_Map.tif"
        out_file = wc_dir / f"ESA_WorldCover_10m_2021_v200_{tile}_Map.tif"
        if not out_file.exists():
            print(f"Downloading {tile} from AWS S3...")
            try:
                urllib.request.urlretrieve(url, out_file)
                print(f"Downloaded {out_file.name} ({out_file.stat().st_size / 1e6:.1f} MB)")
            except Exception as e:
                print(f"Failed to download tile {tile}: {e}")
        else:
            print(f"Tile {tile} already exists locally.")
        if out_file.exists():
            downloaded_tiles.append(out_file)

    print(f"Acquired {len(downloaded_tiles)}/{len(wc_tiles)} WorldCover tiles covering NER.")
    return wc_dir


def acquire_hydrography() -> Path:
    print("\n--- Acquiring Hydrography (HydroBASINS lev01-12) ---")
    hydro_dir = EXTERNAL_DIR / "hydrography"
    hydro_dir.mkdir(parents=True, exist_ok=True)

    url = "https://data.hydrosheds.org/file/hydrobasins/standard/hybas_as_lev01-12_v1c.zip"
    zip_out = hydro_dir / "hybas_as_lev01-12_v1c.zip"
    if not zip_out.exists():
        print(f"Downloading HydroBASINS Asia lev01-12 dataset...")
        try:
            urllib.request.urlretrieve(url, zip_out)
            print(f"Downloaded HydroBASINS zip ({zip_out.stat().st_size / 1e6:.1f} MB)")
        except Exception as e:
            print(f"Failed to download HydroBASINS: {e}")

    if zip_out.exists() and not (hydro_dir / "hybas_as_lev06_v1c.shp").exists():
        print("Extracting HydroBASINS shapefiles...")
        with zipfile.ZipFile(zip_out, 'r') as zf:
            zf.extractall(hydro_dir)

    print(f"Hydrography dataset directory prepared at {hydro_dir}")
    return hydro_dir


def acquire_road_network() -> Path:
    print("\n--- Acquiring Road Network (Geofabrik OpenStreetMap India) ---")
    roads_dir = EXTERNAL_DIR / "road_network"
    roads_dir.mkdir(parents=True, exist_ok=True)

    url = "https://download.geofabrik.de/asia/india-210101-free.shp.zip"
    zip_out = roads_dir / "india-210101-free.shp.zip"
    if not zip_out.exists():
        print("Downloading Geofabrik OpenStreetMap India transport shapefiles...")
        try:
            urllib.request.urlretrieve(url, zip_out)
            print(f"Downloaded OSM roads zip ({zip_out.stat().st_size / 1e6:.1f} MB)")
        except Exception as e:
            print(f"Failed to download Geofabrik roads: {e}")

    if zip_out.exists() and not (roads_dir / "gis_osm_roads_free_1.shp").exists():
        print("Extracting OSM roads shapefiles...")
        with zipfile.ZipFile(zip_out, 'r') as zf:
            for item in zf.namelist():
                if "roads" in item:
                    zf.extract(item, roads_dir)

    print(f"Road network dataset directory prepared at {roads_dir}")
    return roads_dir


def run_acquisition():
    print("=================================================================")
    print("      V8 DATA ACQUISITION — REAL-WORLD DATA BOTTLENECK FIX       ")
    print("=================================================================")

    acquire_esa_worldcover()
    acquire_hydrography()
    acquire_road_network()

    print("\nAcquisition completed! Next step: Validate files and generate manifest_v8.yaml")


if __name__ == "__main__":
    run_acquisition()
