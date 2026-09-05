"""
ml-service/tests/test_rainfall.py

IMPORTANT: All rasters here are SYNTHETIC daily GeoTIFFs written to
temp files purely to exercise the aggregation logic. No real IMD/GPM
rainfall data has been acquired in this environment.
"""

from datetime import date, timedelta

import numpy as np
import geopandas as gpd
import rasterio
from rasterio.transform import from_origin
from shapely.geometry import box

from src.features.rainfall import (
    parse_date_from_filename,
    discover_daily_rainfall_rasters,
    accumulate_rainfall_window,
    extract_rainfall_features_for_grid,
    RAINFALL_WINDOWS,
)

CRS = "EPSG:32643"
REF_DATE = date(2018, 8, 15)


def _write_daily_raster(path, bounds, crs, resolution, value, nodata=-9999.0):
    minx, miny, maxx, maxy = bounds
    width = int((maxx - minx) / resolution)
    height = int((maxy - miny) / resolution)
    transform = from_origin(minx, maxy, resolution, resolution)
    data = np.full((height, width), value, dtype="float32")
    with rasterio.open(
        path, "w", driver="GTiff", height=height, width=width, count=1,
        dtype="float32", crs=crs, transform=transform, nodata=nodata,
    ) as dst:
        dst.write(data, 1)
    return str(path)


def _make_daily_dir(tmp_path, dates_and_values, bounds=(200000, 1000000, 201000, 1001000)):
    d = tmp_path / "rainfall_ner"
    d.mkdir(exist_ok=True)
    for dt, val in dates_and_values:
        _write_daily_raster(d / f"rain_{dt.strftime('%Y%m%d')}.tif", bounds, CRS, 100.0, val)
    return str(d)


# ---------------------------------------------------------------------
# Filename parsing / discovery
# ---------------------------------------------------------------------

def test_parse_date_from_filename_standard():
    assert parse_date_from_filename("rain_20180815.tif") == date(2018, 8, 15)
    assert parse_date_from_filename("20180101_grid.tif") == date(2018, 1, 1)


def test_parse_date_from_filename_no_match_returns_none():
    assert parse_date_from_filename("no_date_here.tif") is None


def test_discover_daily_rainfall_rasters_empty_or_missing_dir(tmp_path):
    assert discover_daily_rainfall_rasters(str(tmp_path / "nope")) == {}
    empty = tmp_path / "empty"
    empty.mkdir()
    assert discover_daily_rainfall_rasters(str(empty)) == {}


def test_discover_daily_rainfall_rasters_finds_dated_files(tmp_path):
    rdir = _make_daily_dir(tmp_path, [(REF_DATE, 10.0), (REF_DATE - timedelta(days=1), 5.0)])
    found = discover_daily_rainfall_rasters(rdir)
    assert set(found.keys()) == {REF_DATE, REF_DATE - timedelta(days=1)}


# ---------------------------------------------------------------------
# Windowed accumulation: 24h / 3d / 7d
# ---------------------------------------------------------------------

def test_accumulate_24h_window_uses_exactly_one_day(tmp_path):
    rdir = _make_daily_dir(tmp_path, [(REF_DATE, 12.0)])
    daily = discover_daily_rainfall_rasters(rdir)
    result = accumulate_rainfall_window(daily, REF_DATE, window_days=1, working_crs=CRS)
    assert result.days_found == 1
    assert np.nanmean(result.array) == 12.0


def test_accumulate_3day_window_sums_three_days(tmp_path):
    values = [(REF_DATE - timedelta(days=i), float(i + 1)) for i in range(3)]  # 1,2,3
    rdir = _make_daily_dir(tmp_path, values)
    daily = discover_daily_rainfall_rasters(rdir)
    result = accumulate_rainfall_window(daily, REF_DATE, window_days=3, working_crs=CRS)
    assert result.days_found == 3
    assert np.nanmean(result.array) == 6.0  # 1+2+3


def test_accumulate_7day_window_sums_seven_days(tmp_path):
    values = [(REF_DATE - timedelta(days=i), 10.0) for i in range(7)]
    rdir = _make_daily_dir(tmp_path, values)
    daily = discover_daily_rainfall_rasters(rdir)
    result = accumulate_rainfall_window(daily, REF_DATE, window_days=7, working_crs=CRS)
    assert result.days_found == 7
    assert np.nanmean(result.array) == 70.0


def test_accumulate_30day_window_sums_thirty_days(tmp_path):
    values = [(REF_DATE - timedelta(days=i), 5.0) for i in range(30)]
    rdir = _make_daily_dir(tmp_path, values)
    daily = discover_daily_rainfall_rasters(rdir)
    result = accumulate_rainfall_window(daily, REF_DATE, window_days=30, working_crs=CRS)
    assert result.days_found == 30
    assert np.nanmean(result.array) == 150.0


def test_accumulate_30day_window_missing_one_day_returns_none(tmp_path):
    # 29 of 30 needed days present -> must not silently return a partial sum.
    values = [(REF_DATE - timedelta(days=i), 5.0) for i in range(30) if i != 15]
    rdir = _make_daily_dir(tmp_path, values)
    daily = discover_daily_rainfall_rasters(rdir)
    result = accumulate_rainfall_window(daily, REF_DATE, window_days=30, working_crs=CRS)
    assert result.array is None
    assert result.days_found == 29
    assert result.missing_dates == [REF_DATE - timedelta(days=15)]


def test_accumulate_window_missing_days_returns_none_not_partial_sum(tmp_path):
    # Only 2 of 3 needed days present.
    values = [(REF_DATE, 5.0), (REF_DATE - timedelta(days=2), 5.0)]
    rdir = _make_daily_dir(tmp_path, values)
    daily = discover_daily_rainfall_rasters(rdir)
    result = accumulate_rainfall_window(daily, REF_DATE, window_days=3, working_crs=CRS)
    assert result.array is None
    assert result.days_found == 2
    assert result.days_expected == 3
    assert result.missing_dates == [REF_DATE - timedelta(days=1)]


# ---------------------------------------------------------------------
# CRS / alignment
# ---------------------------------------------------------------------

def test_accumulate_window_reprojects_source_crs_to_working_crs(tmp_path):
    # Write a single-day raster in EPSG:4326, request accumulation in EPSG:32643.
    d = tmp_path / "rainfall_ner"
    d.mkdir()
    _write_daily_raster(d / f"rain_{REF_DATE.strftime('%Y%m%d')}.tif", (76.0, 9.0, 77.0, 10.0), "EPSG:4326", 0.01, 20.0)
    daily = discover_daily_rainfall_rasters(str(d))
    result = accumulate_rainfall_window(daily, REF_DATE, window_days=1, working_crs=CRS)
    assert result.days_found == 1
    assert np.nanmean(result.array) > 0  # successfully reprojected and produced real values


def test_accumulate_window_raises_on_missing_crs(tmp_path):
    d = tmp_path / "rainfall_ner"
    d.mkdir()
    path = d / f"rain_{REF_DATE.strftime('%Y%m%d')}.tif"
    # Write without a CRS.
    transform = from_origin(0, 10, 1.0, 1.0)
    with rasterio.open(str(path), "w", driver="GTiff", height=10, width=10, count=1, dtype="float32", transform=transform) as dst:
        dst.write(np.ones((10, 10), dtype="float32"), 1)
    daily = discover_daily_rainfall_rasters(str(d))
    try:
        accumulate_rainfall_window(daily, REF_DATE, window_days=1, working_crs=CRS)
        assert False, "expected ValueError"
    except ValueError:
        pass


# ---------------------------------------------------------------------
# Missing input handling / full-grid integration
# ---------------------------------------------------------------------

def _make_small_grid():
    cell = box(200000, 1000000, 201000, 1001000)
    return gpd.GeoDataFrame({"grid_id": ["g1"]}, geometry=[cell], crs=CRS)


def test_extract_rainfall_features_missing_dir_all_nan():
    grid = _make_small_grid()
    df, diag = extract_rainfall_features_for_grid(grid, rainfall_dir="/nonexistent/rain_dir", reference_date=REF_DATE, working_crs=CRS)
    assert df.isna().all().all()
    for feat in RAINFALL_WINDOWS:
        assert diag[feat].array is None


def test_extract_rainfall_features_full_coverage_all_windows(tmp_path):
    grid = _make_small_grid()
    values = [(REF_DATE - timedelta(days=i), 10.0) for i in range(30)]
    rdir = _make_daily_dir(tmp_path, values)
    df, diag = extract_rainfall_features_for_grid(grid, rainfall_dir=rdir, reference_date=REF_DATE, working_crs=CRS)
    assert df.loc[0, "rainfall_24h"] == 10.0
    assert df.loc[0, "rainfall_3d"] == 30.0
    assert df.loc[0, "rainfall_7d"] == 70.0
    assert df.loc[0, "rainfall_30d"] == 300.0


def test_extract_rainfall_features_partial_coverage_mixed_nan(tmp_path):
    grid = _make_small_grid()
    # Only today's raster present -> 24h works, 3d/7d are NaN.
    rdir = _make_daily_dir(tmp_path, [(REF_DATE, 15.0)])
    df, diag = extract_rainfall_features_for_grid(grid, rainfall_dir=rdir, reference_date=REF_DATE, working_crs=CRS)
    assert df.loc[0, "rainfall_24h"] == 15.0
    assert np.isnan(df.loc[0, "rainfall_3d"])
    assert np.isnan(df.loc[0, "rainfall_7d"])
    assert np.isnan(df.loc[0, "rainfall_30d"])
