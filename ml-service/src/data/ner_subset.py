"""
ml-service/src/data/ner_subset.py

Reusable, reproducible extraction of a state-based subset from the
national GSI Landslide Inventory. Never edits the source dataset in
place -- reads it, filters it, and writes a derived output. Pure,
testable filter logic; no hard-coded file paths (those live in the
driver script, scripts/extract_ner_landslide_subset.py).
"""

from __future__ import annotations

import geopandas as gpd
import pandas as pd

NER_STATES = [
    "Arunachal Pradesh", "Assam", "Manipur", "Meghalaya",
    "Mizoram", "Nagaland", "Sikkim", "Tripura",
]


def extract_state_subset(gdf: gpd.GeoDataFrame, state_col: str, target_states: list) -> gpd.GeoDataFrame:
    """Returns rows where `state_col` exactly matches one of
    `target_states`. Does not fuzzy-match or normalize state name
    variants (e.g. "UT: Jammu and Kashmir" vs "Jammu & Kashmir") --
    a mismatch here means a record is silently excluded, which is safer
    than guessing an equivalence. Callers should verify state_col's
    actual unique values against `target_states` before relying on
    this for completeness.
    """
    return gdf[gdf[state_col].isin(target_states)].copy()


def year_from_initiation_field(series: pd.Series, missing_sentinel: int = 0) -> pd.Series:
    """Converts the source's INITIATION field to a usable year,
    treating `missing_sentinel` (0 in this dataset, confirmed by
    inspection -- 25,354 of 30,842 national records) as missing (NaN),
    not a real year. Never fabricates a year for a missing record.
    """
    return series.where(series != missing_sentinel, other=pd.NA)
