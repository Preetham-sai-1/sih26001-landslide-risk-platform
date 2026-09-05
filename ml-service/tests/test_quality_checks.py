"""
ml-service/tests/test_quality_checks.py

Unit tests for ml-service/src/data/quality_checks.py.

IMPORTANT: All data used in these tests is SYNTHETIC, hand-constructed
for the purpose of exercising the check logic. None of it represents
real landslide locations, real Kerala coordinates chosen for accuracy,
or any real dataset. This file exists to prove the check functions
behave correctly, not to produce any finding about the real inventory.
"""

import geopandas as gpd
import pandas as pd
import pytest
from shapely.geometry import Point

from src.data.quality_checks import (
    check_geometry_validity,
    check_crs,
    check_coordinate_bounds,
    check_duplicate_geometries,
    check_missing_values,
    check_impossible_numeric_values,
)

# Synthetic points loosely within Kerala's real bounding box, but these
# specific coordinates are NOT real landslide locations — arbitrary
# synthetic test values only.
SYNTHETIC_POINTS = [
    Point(76.90, 9.90),
    Point(76.95, 9.95),
    Point(77.00, 10.00),
    Point(85.00, 25.00),  # deliberately out-of-Kerala synthetic point (still valid lon/lat)
]


def make_synthetic_gdf(crs="EPSG:4326"):
    gdf = gpd.GeoDataFrame(
        {
            "district": ["Idukki", "Idukki", "Wayanad", "Nowhere"],
            "area": [120.0, None, 45.0, 10.0],
            "elevation": [800, 950, -50, 500],  # -50 is a deliberately impossible synthetic value
        },
        geometry=SYNTHETIC_POINTS,
        crs=crs,
    )
    return gdf


def test_geometry_validity_flags_none():
    gdf = make_synthetic_gdf()
    result = check_geometry_validity(gdf)
    assert result.passed
    assert result.n_flagged == 0


def test_geometry_validity_flags_null_geometry():
    gdf = make_synthetic_gdf()
    gdf.loc[0, "geometry"] = None
    result = check_geometry_validity(gdf)
    assert not result.passed
    assert result.n_flagged == 1


def test_crs_defined():
    gdf = make_synthetic_gdf()
    result = check_crs(gdf)
    assert result.passed


def test_crs_missing_is_flagged():
    gdf = make_synthetic_gdf()
    gdf.crs = None
    result = check_crs(gdf)
    assert not result.passed
    assert result.n_flagged == len(gdf)


def test_crs_mismatch_flagged():
    gdf = make_synthetic_gdf()
    result = check_crs(gdf, expected_epsg=32643)  # a UTM zone, deliberately not EPSG:4326
    assert not result.passed


def test_coordinate_bounds_flags_out_of_bounds_point():
    gdf = make_synthetic_gdf()
    # Kerala's real approximate bounding box (used only as a plausible
    # test bound, not asserted here as an authoritative source-verified
    # figure — see docs/data_sources.md for verified boundary sources).
    result = check_coordinate_bounds(gdf, min_lon=74.5, max_lon=77.5, min_lat=8.0, max_lat=12.9)
    assert not result.passed
    assert result.n_flagged == 1  # only the (200, 100) synthetic point


def test_duplicate_geometries_requires_projected_crs():
    gdf = make_synthetic_gdf(crs="EPSG:4326")
    with pytest.raises(ValueError):
        check_duplicate_geometries(gdf)


def test_duplicate_geometries_detects_coincident_points():
    gdf = make_synthetic_gdf().to_crs(epsg=32643)  # project to a metric UTM CRS
    # Add a synthetic duplicate of the first point.
    dup_row = gdf.iloc[[0]].copy()
    gdf = pd.concat([gdf, dup_row], ignore_index=True)
    gdf = gpd.GeoDataFrame(gdf, crs="EPSG:32643")
    result = check_duplicate_geometries(gdf, tolerance_m=1.0)
    assert not result.passed
    assert result.n_flagged == 2  # the original and its duplicate


def test_missing_values_reports_correct_counts():
    gdf = make_synthetic_gdf()
    result = check_missing_values(gdf.drop(columns="geometry"))
    assert not result.passed
    assert result.n_flagged == 1  # the single None in 'area'


def test_impossible_numeric_values_flags_negative_elevation():
    gdf = make_synthetic_gdf()
    result = check_impossible_numeric_values(gdf, rules={"elevation": (0, 3000)})
    assert not result.passed
    assert result.n_flagged == 1  # the synthetic -50 elevation value
