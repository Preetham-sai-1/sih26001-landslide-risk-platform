#!/usr/bin/env python3
"""
scripts/extract_ner_landslide_subset.py

Reproducible extraction step: reads the immutable national GSI
Landslide Inventory (ml-service/data/raw/gsi_national_landslide_inventory/),
filters to the 8 NER states, and writes the derived subset to
ml-service/data/raw/ner_landslide_inventory/. Never modifies the source
files. Re-running this script reproduces the same output from the same
source (deterministic filter, no randomness).

Paths are resolved relative to this script's own location (not the
invoking shell's cwd) -- this was fixed after finding the script only
worked when invoked exactly as `python3 scripts/extract_ner_landslide_subset.py`
from the repo root; running it via an absolute path or from another
directory silently failed to find its inputs.
"""
import sys
from pathlib import Path

import geopandas as gpd

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "ml-service"))

from src.data.ner_subset import extract_state_subset, NER_STATES

SOURCE_SHP = REPO_ROOT / "ml-service" / "data" / "raw" / "gsi_national_landslide_inventory" / "GSI_Landslide_Inventory.shp"
OUTPUT_PATH = REPO_ROOT / "ml-service" / "data" / "raw" / "ner_landslide_inventory" / "ner_landslide_inventory.gpkg"

if __name__ == "__main__":
    gdf = gpd.read_file(SOURCE_SHP)
    ner_gdf = extract_state_subset(gdf, state_col="STATE", target_states=NER_STATES)
    ner_gdf.to_file(OUTPUT_PATH, driver="GPKG")
    print(f"Source records: {len(gdf)}")
    print(f"NER subset records: {len(ner_gdf)}")
    print(ner_gdf["STATE"].value_counts())
    print(f"Written to {OUTPUT_PATH}")
