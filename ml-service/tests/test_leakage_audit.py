"""
ml-service/tests/test_leakage_audit.py

Unit tests for ml-service/src/data/leakage_audit.py.

IMPORTANT: All data used here is SYNTHETIC and hand-constructed solely
to exercise the check logic. No real inventory data is used.
"""

import geopandas as gpd
import pandas as pd
from shapely.geometry import Point

from src.data.leakage_audit import (
    check_spatial_leakage_between_splits,
    check_temporal_leakage,
    check_duplicate_event_leakage,
    check_feature_leakage_by_source_date,
    check_target_leakage_by_correlation,
)


def test_spatial_leakage_detects_close_points():
    train = gpd.GeoDataFrame(geometry=[Point(0, 0), Point(1000, 1000)], crs="EPSG:32643")
    test = gpd.GeoDataFrame(geometry=[Point(5, 5), Point(50000, 50000)], crs="EPSG:32643")
    result = check_spatial_leakage_between_splits(train, test, min_separation_m=100)
    assert not result.passed
    assert result.n_flagged == 1  # only the (5,5) point is within 100m of (0,0)


def test_spatial_leakage_passes_when_well_separated():
    train = gpd.GeoDataFrame(geometry=[Point(0, 0)], crs="EPSG:32643")
    test = gpd.GeoDataFrame(geometry=[Point(50000, 50000)], crs="EPSG:32643")
    result = check_spatial_leakage_between_splits(train, test, min_separation_m=100)
    assert result.passed


def test_temporal_leakage_flags_future_feature():
    df = pd.DataFrame({
        "feature_as_of": ["2018-09-01", "2018-05-01"],  # first is AFTER the event window (synthetic)
        "prediction_reference": ["2018-08-01", "2018-08-01"],
    })
    result = check_temporal_leakage(df, "feature_as_of", "prediction_reference")
    assert not result.passed
    assert result.n_flagged == 1


def test_duplicate_event_leakage_detects_shared_source_id():
    gdf = gpd.GeoDataFrame(
        {"source_event_id": ["A1", "A1", "B2", None]},
        geometry=[Point(0, 0), Point(1, 1), Point(2, 2), Point(3, 3)],
        crs="EPSG:32643",
    )
    result = check_duplicate_event_leakage(gdf, group_col="source_event_id")
    assert not result.passed
    assert result.n_flagged == 2  # the two A1 records


def test_feature_leakage_by_source_date_flags_post_event_layer():
    metadata = {
        "worldcover_2021": "2021-01-01",  # synthetic — genuinely post-dates a synthetic 2018 event
        "srtm_dem": "2000-02-01",
        "soilgrids": None,  # static/undated, correctly excluded from the check
    }
    result = check_feature_leakage_by_source_date(metadata, prediction_reference_date="2018-08-01")
    assert not result.passed
    assert "worldcover_2021" in result.details
    assert "srtm_dem" not in result.details.split(":")[-1]


def test_target_leakage_flags_near_perfect_correlation():
    df = pd.DataFrame({
        "leaky_feature": [0, 0, 1, 1, 1],
        "benign_feature": [0.1, 0.4, 0.3, 0.9, 0.2],
        "target": [0, 0, 1, 1, 1],
    })
    result = check_target_leakage_by_correlation(
        df, feature_cols=["leaky_feature", "benign_feature"], target_col="target",
        correlation_threshold=0.98,
    )
    assert not result.passed
    assert result.n_flagged == 1
    assert "leaky_feature" in result.details
    # benign_feature should not appear as a flagged tuple entry
    assert "'benign_feature'" not in result.details
