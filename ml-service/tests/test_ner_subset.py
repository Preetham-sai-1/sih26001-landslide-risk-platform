"""
ml-service/tests/test_ner_subset.py

Uses small SYNTHETIC records to test the pure filter/year logic. The
real 30,842-record national file is not loaded in tests (too large for
fast/deterministic unit testing) -- it was validated separately via the
driver script (scripts/extract_ner_landslide_subset.py), see
docs references in the manifest for real results.
"""

import pandas as pd
import geopandas as gpd
from shapely.geometry import Point

from src.data.ner_subset import extract_state_subset, year_from_initiation_field, NER_STATES


def test_ner_states_list_has_exactly_eight_states():
    assert len(NER_STATES) == 8
    assert set(NER_STATES) == {
        "Arunachal Pradesh", "Assam", "Manipur", "Meghalaya",
        "Mizoram", "Nagaland", "Sikkim", "Tripura",
    }


def test_extract_state_subset_filters_correctly():
    gdf = gpd.GeoDataFrame(
        {"STATE": ["Kerala", "Assam", "Sikkim", "Himachal Pradesh"]},
        geometry=[Point(0, 0), Point(1, 1), Point(2, 2), Point(3, 3)],
        crs="EPSG:4326",
    )
    subset = extract_state_subset(gdf, "STATE", NER_STATES)
    assert set(subset["STATE"]) == {"Assam", "Sikkim"}
    assert len(subset) == 2


def test_extract_state_subset_no_fuzzy_matching():
    # "UT: Jammu and Kashmir" style variants must NOT match "Assam" etc.
    gdf = gpd.GeoDataFrame(
        {"STATE": ["assam", "ASSAM", "Assam "]},  # case/whitespace variants
        geometry=[Point(0, 0), Point(1, 1), Point(2, 2)],
        crs="EPSG:4326",
    )
    subset = extract_state_subset(gdf, "STATE", NER_STATES)
    assert len(subset) == 0  # none exactly match "Assam" -- no silent fuzzy correction


def test_extract_state_subset_empty_when_no_match():
    gdf = gpd.GeoDataFrame({"STATE": ["Kerala"]}, geometry=[Point(0, 0)], crs="EPSG:4326")
    assert len(extract_state_subset(gdf, "STATE", NER_STATES)) == 0


def test_year_from_initiation_field_treats_zero_as_missing():
    s = pd.Series([0, 2015, 0, 1998])
    result = year_from_initiation_field(s)
    assert pd.isna(result.iloc[0])
    assert result.iloc[1] == 2015
    assert pd.isna(result.iloc[2])
    assert result.iloc[3] == 1998


def test_year_from_initiation_field_does_not_fabricate_values():
    s = pd.Series([0, 0, 0])
    result = year_from_initiation_field(s)
    assert result.isna().all()
