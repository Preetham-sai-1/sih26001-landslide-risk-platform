"""
ml-service/tests/test_negative_sampling.py

Unit tests for ml-service/src/data/negative_sampling.py.

IMPORTANT: All data used here is SYNTHETIC. The "region" and "positive"
points are simple hand-built shapes for testing sampling logic, not any
real geography.
"""

import geopandas as gpd
from shapely.geometry import Point, Polygon

from src.data.negative_sampling import sample_negatives


def make_region():
    # A simple 10km x 10km synthetic square region in a projected CRS.
    square = Polygon([(0, 0), (10000, 0), (10000, 10000), (0, 10000)])
    return gpd.GeoDataFrame(geometry=[square], crs="EPSG:32643")


def make_positives():
    return gpd.GeoDataFrame(
        {"district": ["A", "A", "B"]},
        geometry=[Point(2000, 2000), Point(2100, 2100), Point(8000, 8000)],
        crs="EPSG:32643",
    )


def test_sample_negatives_returns_requested_count_when_feasible():
    region = make_region()
    positives = make_positives()
    negatives = sample_negatives(
        positives, region, n_negatives=20, buffer_m=200, random_state=42,
    )
    assert len(negatives) <= 20
    assert len(negatives) > 0
    assert (negatives["label"] == 0).all()


def test_sample_negatives_respects_exclusion_buffer():
    region = make_region()
    positives = make_positives()
    buffer_m = 500
    negatives = sample_negatives(
        positives, region, n_negatives=30, buffer_m=buffer_m, random_state=1,
    )
    # No negative should fall within buffer_m of any positive.
    for neg_point in negatives.geometry:
        min_dist = positives.geometry.distance(neg_point).min()
        assert min_dist >= buffer_m * 0.99  # small tolerance for float/rounding


def test_sample_negatives_stratified_by_district():
    region = make_region()
    positives = make_positives()
    negatives = sample_negatives(
        positives, region, n_negatives=20, buffer_m=100,
        stratify_col="district", random_state=7,
    )
    assert "stratum" in negatives.columns
    assert set(negatives["stratum"].unique()).issubset({"A", "B"})


def test_sample_negatives_requires_projected_crs():
    region = make_region().to_crs(epsg=4326)
    positives = make_positives().to_crs(epsg=4326)
    try:
        sample_negatives(positives, region, n_negatives=10, buffer_m=100)
        assert False, "Expected ValueError for geographic CRS"
    except ValueError:
        pass
