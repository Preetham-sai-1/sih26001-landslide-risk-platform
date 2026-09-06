"""
ml-service/src/features/rainfall.py

Reusable rainfall pipeline: daily-raster discovery, windowed
accumulation (24h/3d/7d/30d), and zonal sampling onto the project's grid.

STATUS: implemented and tested against SYNTHETIC daily rasters (see
ml-service/tests/test_rainfall.py). No real IMD/GPM data has been
acquired in this environment (see docs/training_dataset_build.md §3).
`rainfall_dir` and `reference_date` are caller-supplied, configurable
values -- nothing hard-coded -- so this module runs unchanged once real
daily rainfall rasters are available.

Expected real-data shape: ONE raster file PER CALENDAR DAY, each a
single-band grid of that day's rainfall total, with a filename
containing an 8-digit YYYYMMDD date (configurable regex). IMD's native
per-year multi-day file and GPM IMERG's native per-granule files must be
pre-split into this one-file-per-day form upstream of this module --
that conversion is out of scope here and is not implemented.

Windowed accumulation only produces a value when EVERY day in the
window is present. A partial sum (e.g. 5 of 7 days available) would
silently understate real rainfall and is never returned as if it were
a complete window -- missing days yield NaN, with the exact gap
reported.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import geopandas as gpd
import rasterio
from rasterio.crs import CRS
from rasterio.features import geometry_mask

from src.data.spatial_standardization import zonal_mean, reproject_raster_array

DEFAULT_RAINFALL_DIR = str(Path(__file__).resolve().parents[2] / "data" / "raw" / "rainfall_ner")
_DATE_RE = re.compile(r"(\d{8})")

RAINFALL_WINDOWS = {"rainfall_24h": 1, "rainfall_3d": 3, "rainfall_7d": 7, "rainfall_30d": 30}


def parse_date_from_filename(filename: str, pattern: re.Pattern = _DATE_RE) -> Optional[date]:
    """Extracts a YYYYMMDD date from a filename. Returns None (never a
    guessed date) if no match is found."""
    m = pattern.search(os.path.basename(filename))
    if not m:
        return None
    try:
        return date(int(m.group(1)[:4]), int(m.group(1)[4:6]), int(m.group(1)[6:8]))
    except ValueError:
        return None


def discover_daily_rainfall_rasters(rainfall_dir: str, pattern: re.Pattern = _DATE_RE) -> dict:
    """Scans `rainfall_dir` for daily raster files. Returns {date: path}.
    Returns an empty dict (not an error) if the directory doesn't exist
    -- callers must check explicitly, consistent with dem.py's
    discover_hgt_tiles."""
    if not os.path.isdir(rainfall_dir):
        return {}
    result = {}
    for fname in sorted(os.listdir(rainfall_dir)):
        d = parse_date_from_filename(fname, pattern)
        if d is not None:
            result[d] = os.path.join(rainfall_dir, fname)
    return result


@dataclass
class WindowAccumulationResult:
    array: Optional[np.ndarray]
    transform: Optional[object]
    nodata: Optional[float]
    days_found: int
    days_expected: int
    missing_dates: list


def accumulate_rainfall_window(
    daily_rasters: dict,
    reference_date: date,
    window_days: int,
    working_crs: str = "EPSG:32643",
) -> WindowAccumulationResult:
    """Sums daily rainfall rasters over [reference_date - window_days + 1,
    reference_date] inclusive. Only returns a real array if ALL days in
    the window are present in `daily_rasters` -- otherwise returns
    array=None with the specific missing dates listed, never a partial
    (understated) sum.
    """
    needed_dates = [reference_date - timedelta(days=i) for i in range(window_days)]
    missing = [d for d in needed_dates if d not in daily_rasters]
    if missing:
        return WindowAccumulationResult(
            array=None, transform=None, nodata=None,
            days_found=window_days - len(missing), days_expected=window_days,
            missing_dates=sorted(missing),
        )

    total = None
    transform = None
    nodata = None
    for d in needed_dates:
        with rasterio.open(daily_rasters[d]) as src:
            if src.crs is None:
                raise ValueError(f"Raster '{daily_rasters[d]}' has no CRS defined; refusing to assume one.")
            arr = src.read(1).astype("float64")
            day_nodata = src.nodata
            if day_nodata is not None:
                arr = np.where(arr == day_nodata, np.nan, arr)
            if src.crs.to_string() != working_crs:
                arr, day_transform = reproject_raster_array(arr, src.transform, src.crs.to_string(), working_crs)
            else:
                day_transform = src.transform
            if total is None:
                total = arr
                transform = day_transform
                nodata = day_nodata
            else:
                if arr.shape != total.shape:
                    # Real daily products can differ slightly in grid alignment;
                    # this pipeline requires identical grids across days rather
                    # than silently resampling one onto another mid-sum, which
                    # could misalign pixels without the caller knowing.
                    raise ValueError(
                        f"Daily raster for {d} has shape {arr.shape}, expected {total.shape}. "
                        "All daily rasters in a window must share an identical grid after "
                        "reprojection; pre-align inputs before use."
                    )
                total = total + arr  # NaN-propagating: any NaN day-pixel makes that window-pixel NaN

    return WindowAccumulationResult(
        array=total, transform=transform, nodata=None,  # NaN already used as the missing-data marker
        days_found=window_days, days_expected=window_days, missing_dates=[],
    )


def _zonal_sample(array: np.ndarray, transform, grid: gpd.GeoDataFrame) -> pd.Series:
    values = []
    for geom in grid.geometry:
        try:
            mask = geometry_mask([geom], transform=transform, invert=True, out_shape=array.shape, all_touched=True)
        except Exception:
            values.append(np.nan)
            continue
        if not mask.any():
            values.append(np.nan)
            continue
        v = zonal_mean(array, mask, nodata_value=None)
        values.append(v if v is not None else np.nan)
    return pd.Series(values, index=grid.index)


def extract_rainfall_features_for_grid(
    grid: gpd.GeoDataFrame,
    rainfall_dir: str,
    reference_date: date,
    working_crs: str = "EPSG:32643",
) -> tuple:
    """Full pipeline for all three windows. Returns (DataFrame with
    rainfall_24h/rainfall_3d/rainfall_7d/rainfall_30d, dict of per-window diagnostic
    info for warning/reporting purposes).
    """
    daily_rasters = discover_daily_rainfall_rasters(rainfall_dir)
    grid_proj = grid.to_crs(working_crs) if grid.crs.to_string() != working_crs else grid

    out = {}
    diagnostics = {}
    for feat_name, window_days in RAINFALL_WINDOWS.items():
        result = accumulate_rainfall_window(daily_rasters, reference_date, window_days, working_crs)
        diagnostics[feat_name] = result
        if result.array is None:
            out[feat_name] = pd.Series([np.nan] * len(grid), index=grid.index)
        else:
            out[feat_name] = _zonal_sample(result.array, result.transform, grid_proj)

    return pd.DataFrame(out, index=grid.index), diagnostics
