"""
ml-service/tests/test_ner_temporal_policy.py

Synthetic fixtures only. Real 8,546-record results are validated
separately and recorded in docs/ner_temporal_policy.md.
"""

import geopandas as gpd
from shapely.geometry import Point

from src.data.ner_temporal_policy import classify_temporal_eligibility, summarize_temporal_policy


def _make_gdf(years, states=None):
    n = len(years)
    states = states or ["Assam"] * n
    return gpd.GeoDataFrame(
        {"INITIATION": years, "STATE": states},
        geometry=[Point(i, i) for i in range(n)],
        crs="EPSG:4326",
    )


def test_missing_sentinel_year_classified_static_only():
    gdf = _make_gdf([0, 0, 2015])
    result = classify_temporal_eligibility(gdf)
    assert list(result) == ["missing_year_static_only", "missing_year_static_only", "time_dependent_eligible"]


def test_implausible_year_flagged_not_silently_accepted():
    gdf = _make_gdf([1850, 2999])  # before IMD record start / absurd future year
    result = classify_temporal_eligibility(gdf)
    assert (result == "implausible_year_flagged").all()


def test_valid_year_range_boundaries():
    gdf = _make_gdf([1901, 2026, 1900, 2027])
    result = classify_temporal_eligibility(gdf)
    assert result.iloc[0] == "time_dependent_eligible"
    assert result.iloc[1] == "time_dependent_eligible"
    assert result.iloc[2] == "implausible_year_flagged"
    assert result.iloc[3] == "implausible_year_flagged"


def test_no_year_is_ever_fabricated():
    # Missing records must never be reclassified as eligible regardless
    # of neighboring records' years.
    gdf = _make_gdf([0, 2015, 2016, 2017])
    result = classify_temporal_eligibility(gdf)
    assert result.iloc[0] == "missing_year_static_only"


def test_summarize_temporal_policy_counts_and_per_state_missingness():
    gdf = _make_gdf([0, 0, 2015, 2016], states=["Assam", "Assam", "Sikkim", "Sikkim"])
    summary = summarize_temporal_policy(gdf)
    assert summary.total_records == 4
    assert summary.missing_year_static_only == 2
    assert summary.time_dependent_eligible == 2
    assert summary.per_state_missing_pct["Assam"] == 100.0
    assert summary.per_state_missing_pct["Sikkim"] == 0.0
