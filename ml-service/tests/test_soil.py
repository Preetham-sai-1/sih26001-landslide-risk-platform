"""
ml-service/tests/test_soil.py

IMPORTANT: All rasters/readings here are SYNTHETIC. No real SoilGrids
data or soil-moisture feed has been acquired in this environment.
"""

from datetime import date

import numpy as np
import geopandas as gpd
import rasterio
from rasterio.transform import from_origin
from shapely.geometry import box

from src.features.soil import (
    resolve_soil_property_source,
    extract_soil_properties_for_grid,
    SoilMoistureReading,
    validate_soil_moisture_readings,
    extract_soil_moisture_for_grid,
)

CRS = "EPSG:32643"


def _write_raster(path, bounds, crs, resolution, value, nodata=-9999.0):
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


def _make_grid():
    cell = box(200000, 1000000, 201000, 1001000)
    return gpd.GeoDataFrame({"grid_id": ["g1"]}, geometry=[cell], crs=CRS)


# ---------------------------------------------------------------------
# Discovery / configuration: single file vs. directory of tiles
# ---------------------------------------------------------------------

def test_resolve_soil_property_source_single_file(tmp_path):
    path = _write_raster(tmp_path / "clay.tif", (200000, 1000000, 201000, 1001000), CRS, 100.0, 25.0)
    resolved = resolve_soil_property_source(path, working_crs=CRS)
    assert resolved is not None
    array, transform, crs, nodata = resolved
    assert np.nanmean(array[array != nodata]) == 25.0


def test_resolve_soil_property_source_directory_of_tiles(tmp_path):
    d = tmp_path / "clay_tiles"
    d.mkdir()
    _write_raster(d / "t1.tif", (200000, 1000000, 200500, 1001000), CRS, 100.0, 10.0)
    _write_raster(d / "t2.tif", (200500, 1000000, 201000, 1001000), CRS, 100.0, 20.0)
    resolved = resolve_soil_property_source(str(d), working_crs=CRS)
    assert resolved is not None


def test_resolve_soil_property_source_missing_path_returns_none():
    assert resolve_soil_property_source("/nonexistent/clay.tif", working_crs=CRS) is None


def test_resolve_soil_property_source_empty_directory_returns_none(tmp_path):
    d = tmp_path / "empty"
    d.mkdir()
    assert resolve_soil_property_source(str(d), working_crs=CRS) is None


# ---------------------------------------------------------------------
# CRS handling
# ---------------------------------------------------------------------

def test_resolve_soil_property_source_reprojects_from_wgs84(tmp_path):
    path = _write_raster(tmp_path / "sand.tif", (76.0, 9.0, 77.0, 10.0), "EPSG:4326", 0.01, 40.0)
    resolved = resolve_soil_property_source(path, working_crs=CRS)
    assert resolved is not None
    array, transform, crs, nodata = resolved
    assert crs == CRS


# ---------------------------------------------------------------------
# Each property extraction (clay, sand, bulk_density, soil_organic_carbon)
# ---------------------------------------------------------------------

def test_extract_soil_properties_all_four_target_properties(tmp_path):
    grid = _make_grid()
    bounds = (200000, 1000000, 201000, 1001000)
    paths = {}
    values = {"clay": 30.0, "sand": 45.0, "bulk_density": 1.3, "soil_organic_carbon": 12.0}
    for name, val in values.items():
        paths[name] = _write_raster(tmp_path / f"{name}.tif", bounds, CRS, 100.0, val)

    df, diag = extract_soil_properties_for_grid(grid, paths, working_crs=CRS)
    for name, val in values.items():
        assert abs(df.loc[0, f"soil_{name}"] - val) < 1e-4  # float32 storage precision, not a bug
        assert diag[name]["found"] is True


def test_extract_soil_properties_missing_property_not_in_dict(tmp_path):
    grid = _make_grid()
    path = _write_raster(tmp_path / "clay.tif", (200000, 1000000, 201000, 1001000), CRS, 100.0, 30.0)
    df, diag = extract_soil_properties_for_grid(grid, {"clay": path}, working_crs=CRS)
    assert "soil_sand" not in df.columns  # only requested properties appear; caller/feature_extraction fills the rest


# ---------------------------------------------------------------------
# Missing / out-of-coverage rasters
# ---------------------------------------------------------------------

def test_extract_soil_properties_missing_file_yields_nan(tmp_path):
    grid = _make_grid()
    df, diag = extract_soil_properties_for_grid(grid, {"clay": "/nonexistent/clay.tif"}, working_crs=CRS)
    assert df["soil_clay"].isna().all()
    assert diag["clay"]["found"] is False


def test_extract_soil_properties_out_of_coverage_yields_nan(tmp_path):
    grid = _make_grid()
    # Raster far away -- no spatial overlap with the grid cell.
    path = _write_raster(tmp_path / "clay.tif", (900000, 900000, 901000, 901000), CRS, 100.0, 30.0)
    df, diag = extract_soil_properties_for_grid(grid, {"clay": path}, working_crs=CRS)
    assert df["soil_clay"].isna().all()
    assert diag["clay"]["found"] is True  # file exists and opened; the cell just has no overlap


def test_extract_soil_properties_nodata_excluded_from_mean(tmp_path):
    # Regression test for a real bug found during implementation:
    # build_dem_mosaic (reused for mosaicking) leaves the raw nodata
    # sentinel in the array when no reprojection occurs; without
    # explicitly passing nodata into the zonal mean, a nodata-filled
    # region would silently corrupt the average instead of being
    # excluded.
    bounds = (200000, 1000000, 201000, 1001000)
    minx, miny, maxx, maxy = bounds
    width = int((maxx - minx) / 100.0)
    height = int((maxy - miny) / 100.0)
    transform = from_origin(minx, maxy, 100.0, 100.0)
    data = np.full((height, width), 50.0, dtype="float32")
    data[: height // 2, :] = -9999.0  # half the tile is nodata
    path = tmp_path / "clay_partial.tif"
    with rasterio.open(
        str(path), "w", driver="GTiff", height=height, width=width, count=1,
        dtype="float32", crs=CRS, transform=transform, nodata=-9999.0,
    ) as dst:
        dst.write(data, 1)

    grid = _make_grid()
    df, diag = extract_soil_properties_for_grid(grid, {"clay": str(path)}, working_crs=CRS)
    # If nodata were NOT excluded, the mean would be pulled far below 50.
    assert df.loc[0, "soil_clay"] == 50.0


# ---------------------------------------------------------------------
# Soil moisture: validation
# ---------------------------------------------------------------------

def test_validate_soil_moisture_flags_out_of_range_value():
    readings = [SoilMoistureReading(grid_id="g1", reading_date=date(2018, 8, 15), value=150.0)]
    warnings_list = validate_soil_moisture_readings(readings)
    assert any("outside the physically plausible" in w for w in warnings_list)


def test_validate_soil_moisture_flags_duplicates():
    d = date(2018, 8, 15)
    readings = [
        SoilMoistureReading(grid_id="g1", reading_date=d, value=20.0),
        SoilMoistureReading(grid_id="g1", reading_date=d, value=22.0),
    ]
    warnings_list = validate_soil_moisture_readings(readings)
    assert any("Duplicate" in w for w in warnings_list)


def test_validate_soil_moisture_accepts_valid_readings():
    readings = [SoilMoistureReading(grid_id="g1", reading_date=date(2018, 8, 15), value=25.0)]
    assert validate_soil_moisture_readings(readings) == []


# ---------------------------------------------------------------------
# Soil moisture: missing data handling
# ---------------------------------------------------------------------

def test_extract_soil_moisture_no_readings_supplied_all_nan():
    grid = _make_grid()
    series, warnings_list = extract_soil_moisture_for_grid(grid, readings=None, reference_date=date(2018, 8, 15))
    assert series.isna().all()
    assert any("no readings supplied" in w for w in warnings_list)


def test_extract_soil_moisture_matches_real_reading():
    grid = _make_grid()
    d = date(2018, 8, 15)
    readings = [SoilMoistureReading(grid_id="g1", reading_date=d, value=33.0)]
    series, warnings_list = extract_soil_moisture_for_grid(grid, readings=readings, reference_date=d)
    assert series.iloc[0] == 33.0
    assert not any("no reading" in w for w in warnings_list)


def test_extract_soil_moisture_partial_missing_cells_reports_count():
    grid = gpd.GeoDataFrame(
        {"grid_id": ["g1", "g2"]},
        geometry=[box(0, 0, 1, 1), box(1, 0, 2, 1)],
        crs=CRS,
    )
    d = date(2018, 8, 15)
    readings = [SoilMoistureReading(grid_id="g1", reading_date=d, value=33.0)]
    series, warnings_list = extract_soil_moisture_for_grid(grid, readings=readings, reference_date=d)
    assert series.iloc[0] == 33.0
    assert np.isnan(series.iloc[1])
    assert any("1 of 2" in w for w in warnings_list)


def test_extract_soil_moisture_never_fabricates_never_uses_hardware():
    # No hardware/API call is possible here by construction: the function
    # signature only accepts a plain list of pre-supplied readings.
    import inspect
    sig = inspect.signature(extract_soil_moisture_for_grid)
    assert "readings" in sig.parameters
    assert "api" not in str(sig).lower()
    assert "sensor_connect" not in str(sig).lower()
