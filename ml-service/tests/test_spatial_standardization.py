"""
ml-service/tests/test_spatial_standardization.py

IMPORTANT: All raster data in this file is SYNTHETIC, generated
in-memory with numpy/rasterio purely to exercise the utility functions.
None of it represents real DEM, rainfall, land cover, or any other real
dataset -- no such raster has been downloaded in this environment.
"""

import numpy as np
import geopandas as gpd
import pytest
from shapely.geometry import Point, box
from rasterio.transform import from_origin

from src.data.spatial_standardization import (
    validate_and_fix_geometries,
    normalize_crs,
    summarize_nodata,
    zonal_mean,
    zonal_majority_class,
)


def test_validate_and_fix_geometries_flags_none_and_empty():
    gdf = gpd.GeoDataFrame(geometry=[Point(0, 0), None, Point(1, 1)], crs="EPSG:4326")
    cleaned, n_invalid = validate_and_fix_geometries(gdf, drop_invalid=True)
    assert n_invalid == 1
    assert len(cleaned) == 2


def test_normalize_crs_raises_without_crs():
    gdf = gpd.GeoDataFrame(geometry=[Point(0, 0)])
    gdf.crs = None
    with pytest.raises(ValueError):
        normalize_crs(gdf, target_crs="EPSG:32643")


def test_normalize_crs_reprojects():
    gdf = gpd.GeoDataFrame(geometry=[Point(76.0, 10.0)], crs="EPSG:4326")
    out = normalize_crs(gdf, target_crs="EPSG:32643")
    assert out.crs.to_string() == "EPSG:32643"
    # Reprojected coordinates should be large UTM-scale numbers, not degrees.
    assert out.geometry.iloc[0].x > 100000


def test_summarize_nodata_with_nan():
    arr = np.array([[1.0, np.nan], [3.0, np.nan]])
    report = summarize_nodata(arr, nodata_value=None)
    assert report.n_nodata == 2
    assert report.n_total == 4
    assert report.pct_nodata == 50.0


def test_summarize_nodata_with_sentinel_value():
    arr = np.array([[1, -9999], [3, -9999]])
    report = summarize_nodata(arr, nodata_value=-9999)
    assert report.n_nodata == 2
    assert report.pct_nodata == 50.0


def test_zonal_mean_computes_correctly():
    arr = np.array([[10.0, 20.0], [30.0, 40.0]])
    mask = np.array([[True, True], [False, False]])
    result = zonal_mean(arr, mask)
    assert result == 15.0  # mean of 10, 20


def test_zonal_mean_returns_none_for_empty_zone():
    arr = np.array([[10.0, 20.0]])
    mask = np.array([[False, False]])
    assert zonal_mean(arr, mask) is None


def test_zonal_majority_class_picks_mode():
    arr = np.array([[1, 1], [1, 2]])
    mask = np.array([[True, True], [True, True]])
    result = zonal_majority_class(arr, mask)
    assert result == 1


def test_zonal_majority_class_excludes_nodata():
    arr = np.array([[1, -1], [1, 1]])
    mask = np.array([[True, True], [True, True]])
    result = zonal_majority_class(arr, mask, nodata_value=-1)
    assert result == 1
