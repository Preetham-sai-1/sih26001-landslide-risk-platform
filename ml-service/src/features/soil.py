"""
ml-service/src/features/soil.py

Reusable soil pipeline, in two parts:

1. Static soil PROPERTIES (clay, sand, bulk_density, soil_organic_carbon)
   -- each a configurable raster (single file or a directory of tiles,
   mosaicked by reusing dem.py's generic mosaic/reproject logic rather
   than duplicating it), zonal-sampled onto the grid.

2. Time-varying soil MOISTURE -- a separate, pluggable interface for
   real sensor/API-sourced readings supplied by the caller as plain
   data. This module never calls hardware or an external API itself
   (no such call is made here) and never fabricates a reading: a grid
   cell/date with no supplied reading is NaN, with an explicit warning.

STATUS: implemented and tested against SYNTHETIC rasters/readings (see
ml-service/tests/test_soil.py). No real SoilGrids data or soil-moisture
feed has been acquired in this environment (see
docs/training_dataset_build.md §3). `soil_dir`/per-property paths and
the moisture-reading list are all caller-supplied, configurable values.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import geopandas as gpd
import rasterio
from rasterio.features import geometry_mask

from src.data.spatial_standardization import zonal_mean
from src.features.dem import build_dem_mosaic  # generic single-band raster mosaic + reproject, reused as-is

DEFAULT_SOIL_DIR = str(Path(__file__).resolve().parents[2] / "data" / "raw" / "soilgrids_ner")
SOIL_PROPERTIES = ["clay", "sand", "bulk_density", "soil_organic_carbon"]

_RASTER_EXTENSIONS = (".tif", ".tiff", ".vrt")


def _list_raster_files(dir_path: str) -> list:
    if not os.path.isdir(dir_path):
        return []
    return [
        os.path.join(dir_path, f) for f in sorted(os.listdir(dir_path))
        if f.lower().endswith(_RASTER_EXTENSIONS)
    ]


def resolve_soil_property_source(path: str, working_crs: str = "EPSG:32643"):
    """Resolves a configured soil-property path to (array, transform,
    crs, nodata). Accepts either a single raster file, or a directory of
    tile files (mosaicked via dem.build_dem_mosaic, reused rather than
    reimplemented). Returns None if the path is missing or the directory
    has no raster files -- callers must treat this as 'not available',
    never fabricate a fallback.
    """
    if os.path.isfile(path):
        return build_dem_mosaic([path], working_crs=working_crs)
    if os.path.isdir(path):
        tiles = _list_raster_files(path)
        if not tiles:
            return None
        return build_dem_mosaic(tiles, working_crs=working_crs)
    return None


def _zonal_sample(array: np.ndarray, transform, grid: gpd.GeoDataFrame, nodata: Optional[float] = None) -> pd.Series:
    values = []
    for geom in grid.geometry:
        try:
            mask = geometry_mask([geom], transform=transform, invert=True, out_shape=array.shape)
        except Exception:
            values.append(np.nan)
            continue
        if not mask.any():
            values.append(np.nan)
            continue
        v = zonal_mean(array, mask, nodata_value=nodata)
        values.append(v if v is not None else np.nan)
    return pd.Series(values, index=grid.index)


def extract_soil_properties_for_grid(
    grid: gpd.GeoDataFrame,
    property_paths: dict,
    working_crs: str = "EPSG:32643",
) -> tuple:
    """`property_paths`: dict of {property_name: path}. Only the
    properties actually passed are computed; others are simply absent
    from the result (caller/feature_extraction.py fills NaN + warns for
    any of the four target properties not present in the dict).

    Returns (DataFrame with soil_<name> columns, dict of per-property
    diagnostics: {"found": bool, "path": path}).
    """
    grid_proj = grid.to_crs(working_crs) if grid.crs.to_string() != working_crs else grid
    out = {}
    diagnostics = {}
    for name, path in property_paths.items():
        resolved = resolve_soil_property_source(path, working_crs)
        col = f"soil_{name}"
        if resolved is None:
            out[col] = pd.Series([np.nan] * len(grid), index=grid.index)
            diagnostics[name] = {"found": False, "path": path}
        else:
            array, transform, crs, nodata = resolved
            out[col] = _zonal_sample(array, transform, grid_proj, nodata=nodata)
            diagnostics[name] = {"found": True, "path": path}
    return pd.DataFrame(out, index=grid.index), diagnostics


# ---------------------------------------------------------------------
# Soil moisture: time-varying, sensor/API-sourced, hardware-free interface
# ---------------------------------------------------------------------

@dataclass
class SoilMoistureReading:
    """One real, externally-supplied soil-moisture observation. This
    module does not fetch these itself -- readings must be supplied by
    the caller (e.g. already pulled from a sensor telemetry feed or an
    API, upstream of this pipeline). `value` unit (e.g. % volumetric
    water content) is the caller's responsibility to document/keep
    consistent; this module only validates physical plausibility.
    """
    grid_id: str
    reading_date: date
    value: float
    source: str = "unspecified"


def validate_soil_moisture_readings(readings: list) -> list:
    """Returns a list of warning strings for physically implausible or
    structurally invalid readings (out-of-range value, duplicate
    grid_id+date). Does not drop or correct anything itself -- flags
    only, so the caller decides how to handle them."""
    warnings_list = []
    seen = set()
    for r in readings:
        if not (0.0 <= r.value <= 100.0):
            warnings_list.append(
                f"Soil moisture reading for grid_id={r.grid_id} on {r.reading_date} has "
                f"value={r.value}, outside the physically plausible 0-100% range."
            )
        key = (r.grid_id, r.reading_date)
        if key in seen:
            warnings_list.append(
                f"Duplicate soil moisture reading for grid_id={r.grid_id} on {r.reading_date}."
            )
        seen.add(key)
    return warnings_list


def extract_soil_moisture_for_grid(
    grid: gpd.GeoDataFrame,
    readings: Optional[list],
    reference_date: date,
) -> tuple:
    """Maps supplied SoilMoistureReading objects onto grid cells by
    (grid_id, reference_date). A grid cell with no matching reading is
    NaN -- never fabricated, never filled from a neighboring cell or
    date. Returns (pd.Series indexed like grid, list of warnings).
    """
    warnings_list = []
    if not readings:
        warnings_list.append(
            "Soil moisture: no readings supplied -- all cells NaN. This module never "
            "fetches sensor/API data itself; readings must be supplied by the caller."
        )
        return pd.Series([np.nan] * len(grid), index=grid.index), warnings_list

    warnings_list.extend(validate_soil_moisture_readings(readings))
    by_key = {(r.grid_id, r.reading_date): r.value for r in readings}

    values = []
    n_missing = 0
    for gid in grid["grid_id"]:
        key = (gid, reference_date)
        if key in by_key:
            values.append(by_key[key])
        else:
            values.append(np.nan)
            n_missing += 1
    if n_missing > 0:
        warnings_list.append(
            f"Soil moisture: {n_missing} of {len(grid)} grid cells have no reading for "
            f"{reference_date} -- left as NaN."
        )
    return pd.Series(values, index=grid.index), warnings_list
