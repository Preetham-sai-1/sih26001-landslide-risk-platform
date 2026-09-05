"""
ml-service/src/features/dem.py

Reusable DEM pipeline: SRTM .hgt tile discovery/coverage, mosaic
construction, terrain-derivative computation (slope/aspect/curvature),
and zonal sampling onto the project's 1km grid (grid.py).

STATUS: implemented and tested against SYNTHETIC rasters only (see
ml-service/tests/test_dem.py). No real SRTM tiles exist in this
environment (ml-service/data/raw/srtm_ner/ is empty/absent) -- this
module has NOT been run against real elevation data. `dem_dir` is a
caller-supplied, configurable path everywhere (default
"ml-service/data/raw/srtm_ner"), so the same code runs unchanged once
real .hgt tiles are placed there.

Tile-format note: real SRTM .hgt files are raw binary grids with no
embedded header; GDAL's SRTMHGT driver (used transparently by
rasterio.open) identifies them from filename convention (e.g.
"N21E088.hgt") plus exact file size (3601x3601 for SRTM1). That
driver-level detail is irrelevant to this module's logic once a tile is
opened -- mosaic/derivative code here is format-agnostic and operates
identically on any raster rasterio can open. Tests therefore use small
synthetic GeoTIFFs (fast, no multi-MB binary fixtures) to exercise the
mosaic/derivative logic, and separately test filename-based discovery
against dummy-content files literally named "*.hgt".
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import numpy as np
import geopandas as gpd
import pandas as pd
import rasterio
from rasterio.merge import merge as rio_merge
from rasterio.crs import CRS
from rasterio.warp import calculate_default_transform, reproject
from rasterio.enums import Resampling
from rasterio.features import geometry_mask

from src.data.spatial_standardization import zonal_mean

DEFAULT_DEM_DIR = str(Path(__file__).resolve().parents[2] / "data" / "raw" / "srtm_ner")

# Standard SRTM .hgt naming: [N|S]DD[E|W]DDD.hgt, lower-left corner of the tile.
_HGT_RE = re.compile(r"^([NS])(\d{2})([EW])(\d{3})\.hgt$", re.IGNORECASE)


@dataclass
class HgtTile:
    path: str
    lat: int  # lower-left latitude, degrees (negative = South)
    lon: int  # lower-left longitude, degrees (negative = West)

    @property
    def bounds(self):
        # Each SRTM tile covers exactly 1x1 degree.
        return (self.lon, self.lat, self.lon + 1, self.lat + 1)


def parse_hgt_filename(filename: str) -> Optional[tuple]:
    """Parses an SRTM .hgt filename into (lat, lon) of its lower-left
    corner. Returns None if the filename doesn't match the standard
    convention -- never guesses a fallback location."""
    m = _HGT_RE.match(os.path.basename(filename))
    if not m:
        return None
    ns, lat_str, ew, lon_str = m.groups()
    lat = int(lat_str) * (1 if ns.upper() == "N" else -1)
    lon = int(lon_str) * (1 if ew.upper() == "E" else -1)
    return lat, lon


def discover_hgt_tiles(dem_dir: str = DEFAULT_DEM_DIR) -> list:
    """Scans `dem_dir` for files matching the SRTM .hgt naming
    convention. Returns an empty list (not an error) if the directory
    doesn't exist -- callers must check for this explicitly (see
    build_dem_mosaic), consistent with never fabricating tiles."""
    if not os.path.isdir(dem_dir):
        return []
    tiles = []
    for fname in sorted(os.listdir(dem_dir)):
        parsed = parse_hgt_filename(fname)
        if parsed is None:
            continue
        lat, lon = parsed
        tiles.append(HgtTile(path=os.path.join(dem_dir, fname), lat=lat, lon=lon))
    return tiles


def tiles_covering_bounds(tiles: list, bounds: tuple) -> list:
    """Filters `tiles` (HgtTile list) to those whose 1x1 degree extent
    intersects `bounds` = (minx, miny, maxx, maxy) in EPSG:4326 degrees."""
    minx, miny, maxx, maxy = bounds
    result = []
    for t in tiles:
        tminx, tminy, tmaxx, tmaxy = t.bounds
        if tminx < maxx and tmaxx > minx and tminy < maxy and tmaxy > miny:
            result.append(t)
    return result


def build_dem_mosaic(tile_paths: list, working_crs: str = "EPSG:32643"):
    """Builds a mosaic from the given tile file paths, reprojected to
    `working_crs`. Only opens the tiles actually passed in (callers
    should pre-filter with tiles_covering_bounds to avoid loading
    unneeded tiles). Returns (array, transform, crs, nodata).

    Raises ValueError if `tile_paths` is empty -- never returns a
    fabricated empty-but-valid mosaic.
    """
    if not tile_paths:
        raise ValueError("No tile paths supplied; cannot build a DEM mosaic from zero tiles.")

    srcs = [rasterio.open(p) for p in tile_paths]
    try:
        mosaic_arr, mosaic_transform = rio_merge(srcs)
        src_crs = srcs[0].crs
        nodata = srcs[0].nodata
        if src_crs is None:
            raise ValueError(f"Tile '{tile_paths[0]}' has no CRS defined; refusing to assume one.")
    finally:
        for s in srcs:
            s.close()

    elevation = mosaic_arr[0].astype("float64")

    if src_crs.to_string() != working_crs:
        dst_crs = CRS.from_string(working_crs)
        dst_transform, dst_w, dst_h = calculate_default_transform(
            src_crs, dst_crs, elevation.shape[1], elevation.shape[0],
            *rasterio.transform.array_bounds(elevation.shape[0], elevation.shape[1], mosaic_transform),
        )
        destination = np.full((dst_h, dst_w), nodata if nodata is not None else np.nan, dtype="float64")
        reproject(
            source=elevation, destination=destination,
            src_transform=mosaic_transform, src_crs=src_crs,
            dst_transform=dst_transform, dst_crs=dst_crs,
            resampling=Resampling.bilinear,
            src_nodata=nodata, dst_nodata=nodata,
        )
        elevation, mosaic_transform = destination, dst_transform

    return elevation, mosaic_transform, working_crs, nodata


def compute_slope_aspect_curvature(elevation: np.ndarray, transform, nodata: Optional[float] = None) -> dict:
    """Computes slope (degrees), aspect (degrees, 0-360 clockwise from
    north), and curvature (Laplacian, 1/m) from an elevation array in a
    metric (projected) CRS. Uses central-difference gradients; the
    interior 1-pixel border is real data, the outer 1-pixel border is
    NaN (never fabricated via one-sided/edge extrapolation).

    `transform` must be in a projected (metric) CRS -- pixel size is
    read directly from it, so slope/aspect are in true degrees, not
    degrees-of-longitude-per-degree-of-latitude nonsense from an
    unprojected raster.
    """
    dx = abs(transform.a)
    dy = abs(transform.e)

    z = elevation.copy()
    if nodata is not None:
        z = np.where(z == nodata, np.nan, z)

    # Central differences, interior only (edges -> NaN, not extrapolated).
    dzdx = np.full_like(z, np.nan)
    dzdy_south = np.full_like(z, np.nan)  # positive = increasing southward (row index direction)
    dzdx[1:-1, 1:-1] = (z[1:-1, 2:] - z[1:-1, :-2]) / (2 * dx)
    dzdy_south[1:-1, 1:-1] = (z[2:, 1:-1] - z[:-2, 1:-1]) / (2 * dy)
    dzdy_north = -dzdy_south  # true-world north-positive gradient (row index increases southward)

    slope_rad = np.arctan(np.sqrt(dzdx**2 + dzdy_north**2))
    slope_deg = np.degrees(slope_rad)

    aspect_rad = np.arctan2(dzdy_north, -dzdx)
    aspect_deg = (90.0 - np.degrees(aspect_rad)) % 360.0
    # Flat cells (both gradients ~0) have undefined aspect -- leave as NaN, not a fabricated 0.
    flat_mask = (np.abs(dzdx) < 1e-9) & (np.abs(dzdy_north) < 1e-9)
    aspect_deg = np.where(flat_mask, np.nan, aspect_deg)

    curvature = np.full_like(z, np.nan)
    curvature[1:-1, 1:-1] = (
        (z[1:-1, 2:] - 2 * z[1:-1, 1:-1] + z[1:-1, :-2]) / (dx**2)
        + (z[2:, 1:-1] - 2 * z[1:-1, 1:-1] + z[:-2, 1:-1]) / (dy**2)
    )

    return {"elevation": z, "slope": slope_deg, "aspect": aspect_deg, "curvature": curvature}


def _zonal_sample(array: np.ndarray, transform, grid: gpd.GeoDataFrame) -> pd.Series:
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
        v = zonal_mean(array, mask, nodata_value=None)  # array already has NaN for nodata/edges
        values.append(v if v is not None else np.nan)
    return pd.Series(values, index=grid.index)


def extract_dem_features_for_grid(
    grid: gpd.GeoDataFrame,
    dem_dir: str = DEFAULT_DEM_DIR,
    working_crs: str = "EPSG:32643",
) -> pd.DataFrame:
    """Full pipeline: discover tiles -> filter to grid's coverage ->
    mosaic (only the needed tiles) -> reproject -> derive slope/aspect/
    curvature -> zonal-sample onto each grid cell.

    Returns a DataFrame with columns elevation, slope, aspect, curvature,
    indexed like `grid`. If no tiles cover the grid's extent (including
    when `dem_dir` doesn't exist or is empty), all four columns are NaN
    for every cell -- never fabricated.
    """
    grid_wgs84 = grid.to_crs("EPSG:4326") if grid.crs.to_string() != "EPSG:4326" else grid
    bounds = tuple(grid_wgs84.total_bounds)

    all_tiles = discover_hgt_tiles(dem_dir)
    covering = tiles_covering_bounds(all_tiles, bounds)

    if not covering:
        nan_col = pd.Series([np.nan] * len(grid), index=grid.index)
        return pd.DataFrame({"elevation": nan_col, "slope": nan_col, "aspect": nan_col, "curvature": nan_col})

    elevation, transform, crs, nodata = build_dem_mosaic([t.path for t in covering], working_crs)
    derivatives = compute_slope_aspect_curvature(elevation, transform, nodata)

    grid_proj = grid.to_crs(working_crs) if grid.crs.to_string() != working_crs else grid
    out = {}
    for name in ["elevation", "slope", "aspect", "curvature"]:
        out[name] = _zonal_sample(derivatives[name], transform, grid_proj).values
    return pd.DataFrame(out, index=grid.index)
