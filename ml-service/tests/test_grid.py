"""
ml-service/tests/test_grid.py

IMPORTANT: This test file uses a small, hand-built SYNTHETIC point set
to exercise the grid/labeling/negative-sampling logic quickly and
deterministically. It does NOT represent the real Kerala inventory.
The real inventory was run separately (see
docs/training_dataset_build.md for the actual, real numbers produced
by running these same functions against the real 4,728-point file).
"""

import geopandas as gpd
from shapely.geometry import Point

from src.features.grid import (
    build_study_area_proxy,
    build_prediction_grid,
    assign_landslide_labels,
    select_negative_grid_cells,
)


def make_synthetic_positives():
    # A small synthetic cluster of "landslide" points -- NOT real data.
    # Roughly spread over several km so a coarse grid produces multiple cells.
    return gpd.GeoDataFrame(
        {"id": range(6)},
        geometry=[
            Point(76.90, 9.90),
            Point(76.905, 9.905),
            Point(76.95, 9.95),
            Point(77.00, 10.00),
            Point(77.05, 10.05),
            Point(77.10, 10.10),
        ],
        crs="EPSG:4326",
    )


def test_build_study_area_proxy_returns_polygon_covering_points():
    positives = make_synthetic_positives()
    result = build_study_area_proxy(positives, buffer_m=1000.0)
    assert result.source_point_count == 6
    assert result.polygon_gdf.geometry.area.sum() > 0
    # Every original point (reprojected) should fall within the buffered area.
    pts_proj = positives.to_crs(result.polygon_gdf.crs)
    area = result.polygon_gdf.geometry.union_all()
    assert all(area.contains(p) for p in pts_proj.geometry)


def test_build_prediction_grid_produces_cells_within_area():
    positives = make_synthetic_positives()
    study_area = build_study_area_proxy(positives, buffer_m=1000.0)
    grid = build_prediction_grid(study_area.polygon_gdf, cell_size_m=2000.0)
    assert len(grid) > 0
    assert set(["grid_id", "geometry", "centroid", "in_study_area"]).issubset(grid.columns)
    assert grid["grid_id"].is_unique


def test_assign_landslide_labels_marks_positive_cells():
    positives = make_synthetic_positives()
    study_area = build_study_area_proxy(positives, buffer_m=1000.0)
    grid = build_prediction_grid(study_area.polygon_gdf, cell_size_m=2000.0)
    labeled = assign_landslide_labels(grid, positives)
    assert labeled["target"].sum() > 0  # at least some cells should contain a synthetic point
    assert labeled["positive_count"].sum() == 6  # all 6 synthetic points accounted for


def test_select_negative_grid_cells_excludes_buffer_and_positives():
    positives = make_synthetic_positives()
    study_area = build_study_area_proxy(positives, buffer_m=1000.0)
    grid = build_prediction_grid(study_area.polygon_gdf, cell_size_m=500.0)
    labeled = assign_landslide_labels(grid, positives)

    negatives, report = select_negative_grid_cells(
        labeled, buffer_m=300.0, positives=positives, max_negatives=None, random_state=1,
    )
    # No accepted negative cell should itself be a positive cell.
    accepted_ids = set(negatives["grid_id"])
    positive_ids = set(labeled.loc[labeled["target"] == 1, "grid_id"])
    assert accepted_ids.isdisjoint(positive_ids)
    assert report.positive_cells == int((labeled["target"] == 1).sum())
    assert report.accepted_negative_cells == len(negatives)


def test_select_negative_grid_cells_respects_max_cap():
    positives = make_synthetic_positives()
    study_area = build_study_area_proxy(positives, buffer_m=2000.0)
    grid = build_prediction_grid(study_area.polygon_gdf, cell_size_m=300.0)
    labeled = assign_landslide_labels(grid, positives)

    negatives, report = select_negative_grid_cells(
        labeled, buffer_m=200.0, positives=positives, max_negatives=5, random_state=2,
    )
    assert len(negatives) <= 5
