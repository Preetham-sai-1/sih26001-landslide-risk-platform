"""
ml-service/src/data/spatial_standardization.py

Reusable spatial preprocessing utilities: CRS normalization, clipping,
raster alignment, nodata handling, and geometry validation.

STATUS: implemented and tested against small SYNTHETIC in-memory rasters
(ml-service/tests/test_spatial_standardization.py) using rasterio's
MemoryFile, since no real raster inputs (DEM, rainfall, land cover,
NDVI, soil) have been downloaded in this environment -- see
docs/data_sources.md and docs/training_dataset_build.md for the
acquisition status of each. These functions are ready to run against
real rasters once obtained; they have not been run against any.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import geopandas as gpd
import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.enums import Resampling
from rasterio.mask import mask as rio_mask
from rasterio.warp import calculate_default_transform, reproject
from shapely.geometry.base import BaseGeometry


# ---------------------------------------------------------------------
# Vector geometry validation and CRS normalization
# ---------------------------------------------------------------------

def validate_and_fix_geometries(gdf: gpd.GeoDataFrame, drop_invalid: bool = False) -> gpd.GeoDataFrame:
    """Flags invalid geometries; optionally drops them. Does NOT attempt
    to silently repair geometries (e.g. via buffer(0)) by default, since
    automatic repair can silently alter real data -- repair must be an
    explicit, separate, documented step if ever used.
    """
    valid_mask = gdf.geometry.notna() & ~gdf.geometry.is_empty & gdf.geometry.is_valid
    n_invalid = int((~valid_mask).sum())
    if drop_invalid:
        return gdf.loc[valid_mask].copy(), n_invalid
    return gdf.copy(), n_invalid


def normalize_crs(gdf: gpd.GeoDataFrame, target_crs: str) -> gpd.GeoDataFrame:
    """Reprojects a GeoDataFrame to `target_crs`, raising if the input
    has no CRS at all (silently assuming one would risk misaligning
    every downstream layer -- see docs/spatial_alignment.md §2).
    """
    if gdf.crs is None:
        raise ValueError(
            "Input GeoDataFrame has no CRS defined. Refusing to assume one; "
            "confirm the source CRS (e.g. from a .prj file) before reprojecting."
        )
    if str(gdf.crs) == target_crs or gdf.crs.to_string() == target_crs:
        return gdf.copy()
    return gdf.to_crs(target_crs)


# ---------------------------------------------------------------------
# Raster clipping to a study area
# ---------------------------------------------------------------------

def clip_raster_to_polygon(
    raster_path: str,
    clip_geometry: BaseGeometry,
    clip_crs: str,
    nodata: Optional[float] = None,
) -> tuple:
    """Clips a raster file to `clip_geometry`. Reprojects the clip
    geometry to the raster's own CRS first (never the other way around,
    to avoid resampling the raster unnecessarily just to clip it).
    Returns (clipped_array, clipped_transform, clipped_meta).
    """
    with rasterio.open(raster_path) as src:
        geom_gdf = gpd.GeoDataFrame(geometry=[clip_geometry], crs=clip_crs).to_crs(src.crs)
        out_image, out_transform = rio_mask(
            src, geom_gdf.geometry, crop=True,
            nodata=nodata if nodata is not None else src.nodata,
        )
        out_meta = src.meta.copy()
        out_meta.update({
            "height": out_image.shape[1],
            "width": out_image.shape[2],
            "transform": out_transform,
        })
    return out_image, out_transform, out_meta


# ---------------------------------------------------------------------
# Raster reprojection / alignment
# ---------------------------------------------------------------------

def reproject_raster_array(
    source_array: np.ndarray,
    source_transform,
    source_crs: str,
    target_crs: str,
    resampling: Resampling = Resampling.bilinear,
) -> tuple:
    """Reprojects an in-memory raster array to `target_crs`.

    `resampling` must be chosen deliberately by the caller based on data
    type (docs/spatial_alignment.md §3) -- bilinear/cubic for continuous
    data, nearest/mode for categorical data. No default is silently
    assumed to be universally correct; the default here (bilinear) is
    only appropriate for continuous data and callers working with
    categorical rasters (e.g. land cover) MUST override it.
    """
    src_crs = CRS.from_string(source_crs)
    dst_crs = CRS.from_string(target_crs)
    height, width = source_array.shape[-2], source_array.shape[-1]
    transform, dst_width, dst_height = calculate_default_transform(
        src_crs, dst_crs, width, height, *rasterio.transform.array_bounds(height, width, source_transform)
    )
    destination = np.zeros((dst_height, dst_width), dtype=source_array.dtype)
    reproject(
        source=source_array,
        destination=destination,
        src_transform=source_transform,
        src_crs=src_crs,
        dst_transform=transform,
        dst_crs=dst_crs,
        resampling=resampling,
    )
    return destination, transform


# ---------------------------------------------------------------------
# Nodata handling
# ---------------------------------------------------------------------

@dataclass
class NodataReport:
    n_nodata: int
    n_total: int
    pct_nodata: float
    nodata_value: Optional[float]


def summarize_nodata(array: np.ndarray, nodata_value: Optional[float]) -> NodataReport:
    """Reports how much of a raster array is nodata, without silently
    filling/imputing it -- imputation, if ever needed, must be an
    explicit downstream decision documented per-feature (per
    docs/data_dictionary.md's missing-data policy requirement).
    """
    n_total = array.size
    if nodata_value is None:
        n_nodata = int(np.isnan(array).sum()) if np.issubdtype(array.dtype, np.floating) else 0
    else:
        n_nodata = int((array == nodata_value).sum())
    pct = round(n_nodata / n_total * 100, 4) if n_total else 0.0
    return NodataReport(n_nodata=n_nodata, n_total=n_total, pct_nodata=pct, nodata_value=nodata_value)


# ---------------------------------------------------------------------
# Zonal aggregation (grid cell <- raster), for continuous vs categorical
# ---------------------------------------------------------------------

def zonal_mean(array: np.ndarray, mask_array: np.ndarray, nodata_value: Optional[float] = None) -> Optional[float]:
    """Area-weighted-equivalent mean for a continuous raster within a
    zone (mask_array is boolean, True = inside the zone). Appropriate
    for continuous quantities (elevation, NDVI, rainfall) per
    docs/spatial_alignment.md §3 -- NOT for categorical rasters.
    """
    values = array[mask_array]
    if nodata_value is not None:
        values = values[values != nodata_value]
    else:
        values = values[~np.isnan(values)] if np.issubdtype(values.dtype, np.floating) else values
    if values.size == 0:
        return None
    return float(values.mean())


def zonal_majority_class(array: np.ndarray, mask_array: np.ndarray, nodata_value: Optional[float] = None):
    """Majority (mode) class for a categorical raster (e.g. land cover)
    within a zone. Bilinear/cubic interpolation must NEVER be used for
    categorical data (docs/spatial_alignment.md §3) -- this function is
    the documented correct alternative.
    """
    values = array[mask_array]
    if nodata_value is not None:
        values = values[values != nodata_value]
    if values.size == 0:
        return None
    vals, counts = np.unique(values, return_counts=True)
    return vals[np.argmax(counts)]
