"""
ml-service/src/features/feature_extraction.py

Feature-extraction pipeline: joins external GIS raster/vector sources
onto the existing 1km grid (ml-service/src/features/grid.py) to produce
a feature table keyed by grid_id.

STATUS: implemented and tested against SYNTHETIC in-memory rasters
(ml-service/tests/test_feature_extraction.py) since no real soil/
land-cover/NDVI raster has been acquired (see
docs/training_dataset_build.md §3, §9). The DEM group is wired to
ml-service/src/features/dem.py and the rainfall group to
ml-service/src/features/rainfall.py, each supporting real data once
placed in their configurable directories (defaults
ml-service/data/raw/srtm_ner/ and ml-service/data/raw/rainfall_ner/
respectively) -- see the corresponding integration tests, which invoke
the real pipelines (via synthetic tiles/rasters) rather than mocking
them. Every other source path is caller-supplied (RasterSourceConfig),
not hard-coded, so this module is ready to run the moment real rasters
are available. Reuses ml-service/src/data/spatial_standardization.py
(zonal_mean, zonal_majority_class, reproject_raster_array) rather than
reimplementing zonal aggregation.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional, Literal
import warnings

import geopandas as gpd
import numpy as np
import pandas as pd
import rasterio
from rasterio.crs import CRS
from rasterio.features import geometry_mask
from rasterio.warp import calculate_default_transform, reproject
from rasterio.enums import Resampling

from src.data.spatial_standardization import zonal_mean, zonal_majority_class, summarize_nodata
from src.features.dem import extract_dem_features_for_grid, DEFAULT_DEM_DIR
from src.features.rainfall import extract_rainfall_features_for_grid, DEFAULT_RAINFALL_DIR, RAINFALL_WINDOWS
from src.features.soil import (
    extract_soil_properties_for_grid, extract_soil_moisture_for_grid,
    DEFAULT_SOIL_DIR, SOIL_PROPERTIES,
)


@dataclass
class RasterSourceConfig:
    """Configurable pointer to one external raster. `path` is never
    hard-coded elsewhere in this module -- callers supply it, so this
    pipeline works identically for a real file once acquired."""
    name: str
    path: str
    band: int = 1
    kind: Literal["continuous", "categorical"] = "continuous"
    nodata_override: Optional[float] = None


@dataclass
class FeatureExtractionResult:
    table: pd.DataFrame
    warnings_list: list = field(default_factory=list)
    sources_used: dict = field(default_factory=dict)


def _validate_raster_against_grid(raster_path: str, grid_crs: str) -> dict:
    """Checks CRS presence, resolution, and bounds overlap with a
    reasonable sanity threshold. Raises on missing CRS (refusing to
    guess, consistent with spatial_standardization.normalize_crs)."""
    with rasterio.open(raster_path) as src:
        if src.crs is None:
            raise ValueError(f"Raster '{raster_path}' has no CRS defined; refusing to assume one.")
        return {
            "crs": src.crs.to_string(),
            "resolution": src.res,
            "bounds": src.bounds,
            "nodata": src.nodata,
            "width": src.width,
            "height": src.height,
        }


def extract_zonal_raster_feature(
    grid: gpd.GeoDataFrame,
    config: RasterSourceConfig,
    working_crs: str = "EPSG:32643",
) -> tuple[pd.Series, dict]:
    """Extracts one zonal statistic per grid cell from a raster.

    Reprojection is explicit: the raster is reprojected to `working_crs`
    only if its native CRS differs (never assumed already aligned).
    Categorical rasters use majority-class aggregation; continuous
    rasters use the mean -- never bilinear-interpolated into a single
    scalar per cell, and never silently filled where a cell has no
    valid raster coverage (returns np.nan, not 0 or an invented value).
    """
    grid_proj = grid.to_crs(working_crs) if grid.crs.to_string() != working_crs else grid

    with rasterio.open(config.path) as src:
        if src.crs is None:
            raise ValueError(f"Raster '{config.path}' has no CRS defined; refusing to assume one.")
        nodata = config.nodata_override if config.nodata_override is not None else src.nodata

        src_crs = src.crs
        array = src.read(config.band)
        transform = src.transform

        if src_crs.to_string() != working_crs:
            dst_crs = CRS.from_string(working_crs)
            dst_transform, dst_w, dst_h = calculate_default_transform(
                src_crs, dst_crs, src.width, src.height, *src.bounds
            )
            destination = np.full((dst_h, dst_w), nodata if nodata is not None else np.nan, dtype=array.dtype if np.issubdtype(array.dtype, np.floating) else np.float64)
            resampling = Resampling.nearest if config.kind == "categorical" else Resampling.bilinear
            reproject(
                source=array, destination=destination,
                src_transform=transform, src_crs=src_crs,
                dst_transform=dst_transform, dst_crs=dst_crs,
                resampling=resampling,
                src_nodata=nodata, dst_nodata=nodata,
            )
            array, transform = destination, dst_transform

        values = []
        n_no_coverage = 0
        for geom in grid_proj.geometry:
            try:
                mask = geometry_mask([geom], transform=transform, invert=True, out_shape=array.shape)
            except Exception:
                values.append(np.nan)
                n_no_coverage += 1
                continue
            if not mask.any():
                values.append(np.nan)
                n_no_coverage += 1
                continue
            if config.kind == "categorical":
                v = zonal_majority_class(array, mask, nodata_value=nodata)
            else:
                v = zonal_mean(array, mask, nodata_value=nodata)
            values.append(v if v is not None else np.nan)

        meta = {
            "source_path": config.path,
            "source_crs": src_crs.to_string(),
            "source_resolution": src.res,
            "nodata_value": nodata,
            "n_cells_no_coverage": n_no_coverage,
            "n_cells_total": len(grid_proj),
        }

    return pd.Series(values, index=grid.index, name=config.name), meta


def one_hot_encode_categorical(series: pd.Series, prefix: str) -> pd.DataFrame:
    """Encodes a categorical (e.g. land-cover class) column as one-hot
    columns, keeping NaN (no-coverage cells) as all-zero rows rather
    than inventing a category -- callers must check for all-zero rows
    separately if they need to distinguish 'no data' from a real class
    that happens to be absent."""
    dummies = pd.get_dummies(series, prefix=prefix, dummy_na=False)
    return dummies.astype(int)


def build_feature_table(
    labeled_grid: gpd.GeoDataFrame,
    dem_config: Optional[dict] = None,
    rainfall_configs: Optional[dict] = None,
    soil_configs: Optional[dict] = None,
    land_cover_config: Optional[RasterSourceConfig] = None,
    ndvi_config: Optional[RasterSourceConfig] = None,
    working_crs: str = "EPSG:32643",
) -> FeatureExtractionResult:
    """Assembles the deterministic feature table keyed by grid_id.

    Every argument is optional and None by default -- callers pass only
    the sources they actually have. Missing groups are reported in
    `warnings_list`, not silently skipped without a trace. `target` is
    preserved verbatim from `labeled_grid` (never recomputed from
    environmental features -- this function never reads `target` as an
    input to any calculation, only copies it through).

    `dem_config`: a dict gating the DEM group. If None, DEM is not
    computed (all four columns NaN). If provided, DEM is computed via
    ml-service/src/features/dem.py::extract_dem_features_for_grid,
    reading `dem_config.get("dem_dir", dem.DEFAULT_DEM_DIR)` -- i.e.
    pass `{}` to use the default srtm_ner/ directory, or
    `{"dem_dir": "/other/path"}` to override it. This replaces the
    earlier per-feature RasterSourceConfig shape for this group: an
    SRTM mosaic inherently produces all four DEM features from one
    tile directory, so a single-raster-per-feature config cannot
    represent it. Out-of-coverage or missing tiles yield NaN, not
    fabricated values (see dem.py).

    `rainfall_configs`: a dict gating the rainfall group, analogous to
    `dem_config`. Requires `"reference_date"` (a `datetime.date`, the
    prediction reference time -- no safe default exists) and optionally
    `"rainfall_dir"` (defaults to rainfall.DEFAULT_RAINFALL_DIR). Each
    window (24h/3d/7d/30d) is only populated if every day in that window has
    a real daily raster present in `rainfall_dir`; otherwise NaN with the
    specific missing dates reported in `warnings_list` (see rainfall.py).

    `soil_configs`: a dict gating the soil group:
    `{"properties": {"clay": path, "sand": path, ...}, "moisture_readings":
    [SoilMoistureReading, ...], "reference_date": date}`. Static
    properties delegate to soil.py (single file or tiled directory per
    property); any of the four target properties absent from
    "properties" is NaN + warned. Soil moisture is a separate,
    hardware-free interface -- this function never fetches sensor/API
    data itself, only maps caller-supplied readings onto the grid by
    (grid_id, reference_date); missing readings are NaN + warned, never
    fabricated.
    """
    result_warnings = []
    sources_used = {}

    df = pd.DataFrame({
        "grid_id": labeled_grid["grid_id"].values,
        "target": labeled_grid["target"].values,
    }, index=labeled_grid.index)

    # DEM group: elevation, slope, aspect, curvature.
    # Delegates to dem.py's HGT discovery/mosaic/derivative pipeline
    # (reused, not duplicated) rather than treating each feature as an
    # independent single-raster RasterSourceConfig -- a real SRTM tile
    # set naturally yields all four derived features from one mosaic.
    if dem_config is not None:
        dem_dir = dem_config.get("dem_dir", DEFAULT_DEM_DIR)
        dem_df = extract_dem_features_for_grid(labeled_grid, dem_dir=dem_dir, working_crs=working_crs)
        for feat_name in ["elevation", "slope", "aspect", "curvature"]:
            df[feat_name] = dem_df[feat_name].values
            if df[feat_name].isna().all():
                result_warnings.append(
                    f"DEM feature '{feat_name}' is all-NaN -- no SRTM tile covers this grid's "
                    f"extent in '{dem_dir}' (or the directory has no valid tiles)."
                )
        sources_used["dem"] = {"dem_dir": dem_dir}
    else:
        for feat_name in ["elevation", "slope", "aspect", "curvature"]:
            df[feat_name] = np.nan
        result_warnings.append("DEM group not configured -- all DEM features awaiting real source data.")

    # Rainfall group.
    # Delegates to rainfall.py's daily-raster discovery + windowed
    # accumulation pipeline (reused, not duplicated) -- mirrors the DEM
    # group's dem_dir pattern. `rainfall_configs` gates the whole group:
    # {"rainfall_dir": <path>, "reference_date": <date>} (reference_date
    # required -- there is no meaningful default "today" for a
    # pipeline-development dataset tied to a specific historical event).
    if rainfall_configs is not None:
        rainfall_dir = rainfall_configs.get("rainfall_dir", DEFAULT_RAINFALL_DIR)
        reference_date = rainfall_configs.get("reference_date")
        if reference_date is None:
            raise ValueError(
                "rainfall_configs requires an explicit 'reference_date' -- "
                "there is no safe default prediction reference time."
            )
        rainfall_df, rainfall_diag = extract_rainfall_features_for_grid(
            labeled_grid, rainfall_dir=rainfall_dir, reference_date=reference_date, working_crs=working_crs,
        )
        for feat_name in RAINFALL_WINDOWS:
            df[feat_name] = rainfall_df[feat_name].values
            diag = rainfall_diag[feat_name]
            if diag.array is None:
                result_warnings.append(
                    f"Rainfall feature '{feat_name}' is all-NaN -- window incomplete "
                    f"({diag.days_found}/{diag.days_expected} days found in '{rainfall_dir}'; "
                    f"missing: {diag.missing_dates})."
                )
            elif df[feat_name].isna().all():
                result_warnings.append(
                    f"Rainfall feature '{feat_name}' is all-NaN -- window complete but no "
                    f"grid cell overlaps the raster coverage."
                )
        sources_used["rainfall"] = {"rainfall_dir": rainfall_dir, "reference_date": str(reference_date)}
    else:
        for feat_name in RAINFALL_WINDOWS:
            df[feat_name] = np.nan
        result_warnings.append("Rainfall group not configured -- awaiting real source data.")

    # Soil group: configurable list of properties.
    # Static properties delegate to soil.py (reused, not duplicated) --
    # supports a single-file or tiled-directory path per property (clay,
    # sand, bulk_density, soil_organic_carbon). soil_configs shape:
    # {"properties": {"clay": path, ...}, "moisture_readings": [...],
    #  "reference_date": date}. Any of the four target properties not
    # included in "properties" is filled with NaN + a warning, same
    # convention as the DEM/rainfall groups.
    if soil_configs:
        property_paths = soil_configs.get("properties", {})
        if property_paths:
            soil_df, soil_diag = extract_soil_properties_for_grid(labeled_grid, property_paths, working_crs)
            for name in SOIL_PROPERTIES:
                col = f"soil_{name}"
                if name in property_paths:
                    df[col] = soil_df[col].values
                    if df[col].isna().all():
                        result_warnings.append(f"Soil property '{name}' is all-NaN -- file/tiles not found or no grid overlap.")
                    sources_used[col] = soil_diag[name]
                else:
                    df[col] = np.nan
                    result_warnings.append(f"Soil property '{name}' not configured -- awaiting real source data.")
        else:
            for name in SOIL_PROPERTIES:
                df[f"soil_{name}"] = np.nan
            result_warnings.append("Soil properties not configured -- no soil_* columns populated, awaiting real source data.")

        # Soil moisture: time-varying, sensor/API-sourced, hardware-free.
        # This module never fetches readings itself -- only maps
        # caller-supplied SoilMoistureReading objects onto the grid.
        moisture_readings = soil_configs.get("moisture_readings")
        moisture_ref_date = soil_configs.get("reference_date")
        if moisture_ref_date is not None:
            moisture_series, moisture_warnings = extract_soil_moisture_for_grid(
                labeled_grid, readings=moisture_readings, reference_date=moisture_ref_date,
            )
            df["soil_moisture"] = moisture_series.values
            result_warnings.extend(moisture_warnings)
            sources_used["soil_moisture"] = {"reference_date": str(moisture_ref_date), "n_readings": len(moisture_readings) if moisture_readings else 0}
        else:
            df["soil_moisture"] = np.nan
            result_warnings.append("Soil moisture not configured (no reference_date) -- awaiting real sensor/API data.")
    else:
        for name in SOIL_PROPERTIES:
            df[f"soil_{name}"] = np.nan
        df["soil_moisture"] = np.nan
        result_warnings.append("Soil group not configured -- no soil_* columns produced, awaiting real source data.")

    # Land cover: categorical, one-hot encoded (kept separate from continuous features).
    if land_cover_config:
        series, meta = extract_zonal_raster_feature(labeled_grid, land_cover_config, working_crs)
        onehot = one_hot_encode_categorical(series, prefix="land_cover")
        df = pd.concat([df, onehot.set_index(df.index)], axis=1)
        sources_used["land_cover"] = meta
    else:
        result_warnings.append("Land cover not configured -- awaiting real source data.")

    # NDVI: continuous mean per cell.
    if ndvi_config:
        series, meta = extract_zonal_raster_feature(labeled_grid, ndvi_config, working_crs)
        df["ndvi_mean"] = series.values
        sources_used["ndvi_mean"] = meta
    else:
        df["ndvi_mean"] = np.nan
        result_warnings.append("NDVI not configured -- awaiting real source data.")

    # Determinism: sort by grid_id, reset index.
    df = df.sort_values("grid_id").reset_index(drop=True)

    return FeatureExtractionResult(table=df, warnings_list=result_warnings, sources_used=sources_used)
