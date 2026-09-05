"""
ml-service/tests/test_feature_extraction.py

IMPORTANT: All rasters here are SYNTHETIC, written to temp GeoTIFF files
purely to exercise the extraction pipeline. None represent real DEM,
rainfall, soil, land-cover, or NDVI data -- no such file has been
acquired in this environment.
"""

import numpy as np
import geopandas as gpd
import rasterio
from rasterio.transform import from_origin
from shapely.geometry import Point, box

from src.features.grid import build_study_area_proxy, build_prediction_grid, assign_landslide_labels
from src.features.feature_extraction import (
    RasterSourceConfig,
    extract_zonal_raster_feature,
    one_hot_encode_categorical,
    build_feature_table,
)

CRS = "EPSG:32643"


def make_synthetic_grid(tmp_path):
    positives = gpd.GeoDataFrame(
        {"id": range(4)},
        geometry=[Point(76.90, 9.90), Point(76.92, 9.92), Point(76.95, 9.95), Point(77.00, 10.00)],
        crs="EPSG:4326",
    )
    study_area = build_study_area_proxy(positives, buffer_m=1500.0)
    grid = build_prediction_grid(study_area.polygon_gdf, cell_size_m=1000.0)
    labeled = assign_landslide_labels(grid, positives)
    return labeled


def write_synthetic_raster(path, bounds, crs, resolution, fill_value, dtype="float32", nodata=-9999.0):
    minx, miny, maxx, maxy = bounds
    width = max(1, int((maxx - minx) / resolution))
    height = max(1, int((maxy - miny) / resolution))
    transform = from_origin(minx, maxy, resolution, resolution)
    data = np.full((height, width), fill_value, dtype=dtype)
    with rasterio.open(
        path, "w", driver="GTiff", height=height, width=width, count=1,
        dtype=dtype, crs=crs, transform=transform, nodata=nodata,
    ) as dst:
        dst.write(data, 1)
    return str(path)


def test_extract_zonal_continuous_feature(tmp_path):
    labeled = make_synthetic_grid(tmp_path)
    labeled_proj = labeled.to_crs(CRS)
    bounds = labeled_proj.total_bounds
    raster_path = write_synthetic_raster(tmp_path / "synthetic_elevation.tif", bounds, CRS, 100.0, fill_value=500.0)

    cfg = RasterSourceConfig(name="elevation", path=raster_path, kind="continuous")
    series, meta = extract_zonal_raster_feature(labeled, cfg, working_crs=CRS)

    assert len(series) == len(labeled)
    assert (series.dropna() == 500.0).all()
    assert meta["source_crs"] == CRS
    assert meta["n_cells_total"] == len(labeled)


def test_extract_zonal_categorical_feature(tmp_path):
    labeled = make_synthetic_grid(tmp_path)
    labeled_proj = labeled.to_crs(CRS)
    bounds = labeled_proj.total_bounds
    raster_path = write_synthetic_raster(
        tmp_path / "synthetic_landcover.tif", bounds, CRS, 100.0, fill_value=3, dtype="int32", nodata=-1,
    )
    cfg = RasterSourceConfig(name="land_cover", path=raster_path, kind="categorical", nodata_override=-1)
    series, meta = extract_zonal_raster_feature(labeled, cfg, working_crs=CRS)
    assert (series.dropna() == 3).all()


def test_missing_coverage_produces_nan_not_zero(tmp_path):
    labeled = make_synthetic_grid(tmp_path)
    # Raster far away from the grid -- no overlap at all.
    raster_path = write_synthetic_raster(
        tmp_path / "synthetic_offgrid.tif", (900000, 900000, 901000, 901000), CRS, 100.0, fill_value=42.0,
    )
    cfg = RasterSourceConfig(name="offgrid", path=raster_path, kind="continuous")
    series, meta = extract_zonal_raster_feature(labeled, cfg, working_crs=CRS)
    assert series.isna().all()
    assert meta["n_cells_no_coverage"] == len(labeled)


def test_one_hot_encode_categorical_keeps_nan_as_all_zero():
    import pandas as pd
    s = pd.Series([1, 2, np.nan, 1])
    onehot = one_hot_encode_categorical(s, prefix="lc")
    assert onehot.loc[2].sum() == 0  # the NaN row is all-zero, not a fabricated category
    assert onehot.loc[0].sum() == 1


def test_build_feature_table_with_no_sources_returns_nan_columns_and_warnings(tmp_path):
    labeled = make_synthetic_grid(tmp_path)
    result = build_feature_table(labeled)
    for col in ["elevation", "slope", "aspect", "curvature", "rainfall_24h", "rainfall_3d", "rainfall_7d", "rainfall_30d", "ndvi_mean"]:
        assert col in result.table.columns
        assert result.table[col].isna().all()
    assert len(result.warnings_list) >= 5
    assert "target" in result.table.columns
    assert set(result.table["target"].unique()).issubset({0, 1})


def test_build_feature_table_preserves_target_and_grid_id(tmp_path):
    labeled = make_synthetic_grid(tmp_path)
    result = build_feature_table(labeled)
    assert set(result.table["grid_id"]) == set(labeled["grid_id"])
    assert result.table["target"].sum() == labeled["target"].sum()


def test_build_feature_table_is_deterministic(tmp_path):
    labeled = make_synthetic_grid(tmp_path)
    r1 = build_feature_table(labeled)
    r2 = build_feature_table(labeled)
    assert r1.table["grid_id"].tolist() == r2.table["grid_id"].tolist()


def test_build_feature_table_with_dem_not_configured_stays_nan(tmp_path):
    labeled = make_synthetic_grid(tmp_path)
    result = build_feature_table(labeled, dem_config=None)
    for col in ["elevation", "slope", "aspect", "curvature"]:
        assert result.table[col].isna().all()


# ---------------------------------------------------------------------
# DEM integration: proves build_feature_table actually delegates to
# dem.py's real HGT discovery/mosaic/derivative pipeline, not a stub.
# ---------------------------------------------------------------------

def _write_synthetic_hgt_tile(path, lat, lon, fill_value, size=1201):
    """Writes a real, GDAL-recognizable SRTM3-sized (1201x1201) .hgt
    tile with constant elevation. Only used here to prove real
    end-to-end integration; 1201x1201 is the minimum standard size
    GDAL's SRTMHGT driver recognizes (verified empirically -- smaller
    ad-hoc sizes are rejected)."""
    import numpy as np
    data = np.full((size, size), fill_value, dtype=">i2")
    with open(path, "wb") as f:
        f.write(data.tobytes())
    return str(path)


def test_build_feature_table_dem_config_none_vs_empty_dict_both_gate_correctly(tmp_path):
    labeled = make_synthetic_grid(tmp_path)
    # dem_config=None -> DEM group entirely skipped (existing behavior).
    result_none = build_feature_table(labeled, dem_config=None)
    assert any("DEM group not configured" in w for w in result_none.warnings_list)
    # dem_config={} -> DEM group enabled but pointed at an empty dir -> NaN with a specific warning
    # naming the actual dem_dir used, proving the path was threaded through to dem.py, not stubbed.
    empty_dem_dir = tmp_path / "empty_srtm"
    empty_dem_dir.mkdir()
    result_empty = build_feature_table(labeled, dem_config={"dem_dir": str(empty_dem_dir)})
    assert result_empty.table["elevation"].isna().all()
    assert any(str(empty_dem_dir) in w for w in result_empty.warnings_list)
    assert result_empty.sources_used["dem"]["dem_dir"] == str(empty_dem_dir)


def test_build_feature_table_dem_uses_default_srtm_ner_dir_when_dict_has_no_override(tmp_path):
    labeled = make_synthetic_grid(tmp_path)
    from src.features.dem import DEFAULT_DEM_DIR
    result = build_feature_table(labeled, dem_config={})
    assert result.sources_used["dem"]["dem_dir"] == DEFAULT_DEM_DIR


def test_build_feature_table_returns_real_elevation_from_real_hgt_tile(tmp_path):
    # A small, self-contained synthetic grid fully inside one SRTM degree
    # tile (well away from any lat/lon boundary), so a single real .hgt
    # tile fully covers it.
    positives = gpd.GeoDataFrame(
        {"id": [0]}, geometry=[Point(76.50, 9.50)], crs="EPSG:4326",
    )
    study_area = build_study_area_proxy(positives, buffer_m=500.0)
    grid = build_prediction_grid(study_area.polygon_gdf, cell_size_m=1000.0)
    labeled = assign_landslide_labels(grid, positives)

    srtm_dir = tmp_path / "srtm_ner"
    srtm_dir.mkdir()
    _write_synthetic_hgt_tile(srtm_dir / "N09E076.hgt", lat=9, lon=76, fill_value=700)

    result = build_feature_table(labeled, dem_config={"dem_dir": str(srtm_dir)})

    assert not result.table["elevation"].isna().all()
    assert (result.table["elevation"].dropna().round(0) == 700).all()
    # Flat constant-elevation tile -> slope should be ~0 for covered interior cells.
    assert (result.table["slope"].dropna() < 1.0).all()
    # A perfectly flat synthetic tile has genuinely undefined aspect
    # everywhere (dem.py correctly returns NaN for flat cells rather than
    # fabricating a direction) -- only elevation/slope are expected to
    # have real values here; aspect's all-NaN warning is correct, not a bug.
    assert not any("elevation" in w and "all-NaN" in w for w in result.warnings_list)
    assert not any("slope" in w and "all-NaN" in w for w in result.warnings_list)


# ---------------------------------------------------------------------
# Rainfall integration: proves build_feature_table actually delegates
# to rainfall.py's real daily-raster discovery/accumulation pipeline.
# ---------------------------------------------------------------------

def _write_daily_rainfall_raster(path, bounds, crs, resolution, value):
    import rasterio as _rio
    from rasterio.transform import from_origin as _from_origin
    minx, miny, maxx, maxy = bounds
    width = int((maxx - minx) / resolution)
    height = int((maxy - miny) / resolution)
    transform = _from_origin(minx, maxy, resolution, resolution)
    data = np.full((height, width), value, dtype="float32")
    with _rio.open(
        path, "w", driver="GTiff", height=height, width=width, count=1,
        dtype="float32", crs=crs, transform=transform, nodata=-9999.0,
    ) as dst:
        dst.write(data, 1)


def test_build_feature_table_requires_reference_date_for_rainfall(tmp_path):
    labeled = make_synthetic_grid(tmp_path)
    try:
        build_feature_table(labeled, rainfall_configs={"rainfall_dir": str(tmp_path)})
        assert False, "expected ValueError for missing reference_date"
    except ValueError:
        pass


def test_build_feature_table_rainfall_not_configured_stays_nan(tmp_path):
    labeled = make_synthetic_grid(tmp_path)
    result = build_feature_table(labeled, rainfall_configs=None)
    for col in ["rainfall_24h", "rainfall_3d", "rainfall_7d", "rainfall_30d"]:
        assert result.table[col].isna().all()


def test_build_feature_table_returns_real_rainfall_from_daily_rasters(tmp_path):
    from datetime import date, timedelta

    positives = gpd.GeoDataFrame({"id": [0]}, geometry=[Point(76.50, 9.50)], crs="EPSG:4326")
    study_area = build_study_area_proxy(positives, buffer_m=500.0)
    grid = build_prediction_grid(study_area.polygon_gdf, cell_size_m=1000.0)
    labeled = assign_landslide_labels(grid, positives)

    labeled_proj = labeled.to_crs(CRS)
    bounds = labeled_proj.total_bounds
    ref_date = date(2018, 8, 15)
    rain_dir = tmp_path / "rainfall_ner"
    rain_dir.mkdir()
    for i in range(30):
        d = ref_date - timedelta(days=i)
        _write_daily_rainfall_raster(
            rain_dir / f"rain_{d.strftime('%Y%m%d')}.tif", bounds, CRS, 100.0, value=10.0,
        )

    result = build_feature_table(
        labeled, rainfall_configs={"rainfall_dir": str(rain_dir), "reference_date": ref_date},
    )
    assert (result.table["rainfall_24h"].dropna() == 10.0).all()
    assert (result.table["rainfall_3d"].dropna() == 30.0).all()
    assert (result.table["rainfall_7d"].dropna() == 70.0).all()
    assert (result.table["rainfall_30d"].dropna() == 300.0).all()
    assert result.sources_used["rainfall"]["reference_date"] == str(ref_date)
    assert not any("rainfall" in w and "all-NaN" in w for w in result.warnings_list)


def test_build_feature_table_rainfall_partial_days_yields_nan_not_fabricated(tmp_path):
    from datetime import date

    positives = gpd.GeoDataFrame({"id": [0]}, geometry=[Point(76.50, 9.50)], crs="EPSG:4326")
    study_area = build_study_area_proxy(positives, buffer_m=500.0)
    grid = build_prediction_grid(study_area.polygon_gdf, cell_size_m=1000.0)
    labeled = assign_landslide_labels(grid, positives)

    labeled_proj = labeled.to_crs(CRS)
    bounds = labeled_proj.total_bounds
    ref_date = date(2018, 8, 15)
    rain_dir = tmp_path / "rainfall_ner"
    rain_dir.mkdir()
    # Only today's raster present.
    _write_daily_rainfall_raster(rain_dir / f"rain_{ref_date.strftime('%Y%m%d')}.tif", bounds, CRS, 100.0, value=8.0)

    result = build_feature_table(
        labeled, rainfall_configs={"rainfall_dir": str(rain_dir), "reference_date": ref_date},
    )
    assert (result.table["rainfall_24h"].dropna() == 8.0).all()
    assert result.table["rainfall_3d"].isna().all()
    assert result.table["rainfall_7d"].isna().all()
    assert result.table["rainfall_30d"].isna().all()
    assert any("rainfall_3d" in w and "all-NaN" in w for w in result.warnings_list)
    assert any("rainfall_7d" in w and "all-NaN" in w for w in result.warnings_list)
    assert any("rainfall_30d" in w and "all-NaN" in w for w in result.warnings_list)


# ---------------------------------------------------------------------
# Soil integration: proves build_feature_table actually delegates to
# soil.py for both static properties and soil-moisture readings.
# ---------------------------------------------------------------------

def test_build_feature_table_soil_not_configured_stays_nan(tmp_path):
    labeled = make_synthetic_grid(tmp_path)
    result = build_feature_table(labeled, soil_configs=None)
    for name in ["clay", "sand", "bulk_density", "soil_organic_carbon"]:
        assert result.table[f"soil_{name}"].isna().all()
    assert result.table["soil_moisture"].isna().all()


def test_build_feature_table_returns_real_soil_properties(tmp_path):
    positives = gpd.GeoDataFrame({"id": [0]}, geometry=[Point(76.50, 9.50)], crs="EPSG:4326")
    study_area = build_study_area_proxy(positives, buffer_m=500.0)
    grid = build_prediction_grid(study_area.polygon_gdf, cell_size_m=1000.0)
    labeled = assign_landslide_labels(grid, positives)

    labeled_proj = labeled.to_crs(CRS)
    bounds = labeled_proj.total_bounds
    soil_dir = tmp_path / "soilgrids_ner"
    soil_dir.mkdir()
    values = {"clay": 28.0, "sand": 42.0, "bulk_density": 1.4, "soil_organic_carbon": 15.0}
    property_paths = {}
    for name, val in values.items():
        p = write_synthetic_raster(soil_dir / f"{name}.tif", bounds, CRS, 100.0, fill_value=val)
        property_paths[name] = p

    result = build_feature_table(labeled, soil_configs={"properties": property_paths})
    for name, val in values.items():
        assert (abs(result.table[f"soil_{name}"].dropna() - val) < 1e-3).all()
    assert result.table["soil_moisture"].isna().all()  # not configured in this call
    assert any("reference_date" in w for w in result.warnings_list)


def test_build_feature_table_missing_soil_property_stays_nan_with_warning(tmp_path):
    labeled = make_synthetic_grid(tmp_path)
    labeled_proj = labeled.to_crs(CRS)
    bounds = labeled_proj.total_bounds
    clay_path = write_synthetic_raster(tmp_path / "clay.tif", bounds, CRS, 100.0, fill_value=30.0)
    result = build_feature_table(labeled, soil_configs={"properties": {"clay": clay_path}})
    assert not result.table["soil_clay"].isna().all()
    assert result.table["soil_sand"].isna().all()
    assert any("sand" in w and "not configured" in w for w in result.warnings_list)


def test_build_feature_table_soil_moisture_real_readings(tmp_path):
    from src.features.soil import SoilMoistureReading
    from datetime import date

    labeled = make_synthetic_grid(tmp_path)
    ref_date = date(2018, 8, 15)
    readings = [
        SoilMoistureReading(grid_id=gid, reading_date=ref_date, value=35.0)
        for gid in labeled["grid_id"]
    ]
    result = build_feature_table(
        labeled, soil_configs={"moisture_readings": readings, "reference_date": ref_date},
    )
    assert (result.table["soil_moisture"].dropna() == 35.0).all()
    assert not any("no reading" in w for w in result.warnings_list)


def test_build_feature_table_soil_moisture_missing_readings_nan_with_warning(tmp_path):
    from datetime import date

    labeled = make_synthetic_grid(tmp_path)
    result = build_feature_table(
        labeled, soil_configs={"reference_date": date(2018, 8, 15)},  # no moisture_readings supplied
    )
    assert result.table["soil_moisture"].isna().all()
    assert any("no readings supplied" in w for w in result.warnings_list)
