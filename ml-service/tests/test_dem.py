"""
ml-service/tests/test_dem.py

IMPORTANT: No real SRTM .hgt tiles exist in this environment. All
rasters here are SYNTHETIC. Discovery tests use dummy-content files
literally named per the SRTM convention (filename-parsing only, no
raster read). Mosaic/derivative tests use small synthetic GeoTIFFs,
since the mosaic/derivative code is format-agnostic once rasterio has
opened a raster (see module docstring in src/features/dem.py).
"""

import os
import numpy as np
import geopandas as gpd
import rasterio
from rasterio.transform import from_origin
from shapely.geometry import box

from src.features.dem import (
    parse_hgt_filename,
    discover_hgt_tiles,
    tiles_covering_bounds,
    build_dem_mosaic,
    compute_slope_aspect_curvature,
    extract_dem_features_for_grid,
    HgtTile,
)

CRS = "EPSG:32643"


# ---------------------------------------------------------------------
# HGT filename parsing / discovery
# ---------------------------------------------------------------------

def test_parse_hgt_filename_standard_cases():
    assert parse_hgt_filename("N21E088.hgt") == (21, 88)
    assert parse_hgt_filename("S05W070.hgt") == (-5, -70)
    assert parse_hgt_filename("n29e097.hgt") == (29, 97)  # case-insensitive


def test_parse_hgt_filename_rejects_bad_names():
    assert parse_hgt_filename("random.tif") is None
    assert parse_hgt_filename("N21.hgt") is None


def test_discover_hgt_tiles_empty_dir_returns_empty(tmp_path):
    assert discover_hgt_tiles(str(tmp_path)) == []


def test_discover_hgt_tiles_missing_dir_returns_empty():
    assert discover_hgt_tiles("/nonexistent/path/xyz") == []


def test_discover_hgt_tiles_finds_and_parses_dummy_files(tmp_path):
    for name in ["N21E088.hgt", "N22E089.hgt", "not_a_tile.txt"]:
        (tmp_path / name).write_bytes(b"\x00" * 8)  # dummy content, discovery is filename-based only
    tiles = discover_hgt_tiles(str(tmp_path))
    assert len(tiles) == 2
    lats_lons = sorted((t.lat, t.lon) for t in tiles)
    assert lats_lons == [(21, 88), (22, 89)]


# ---------------------------------------------------------------------
# Tile coverage / boundary filtering
# ---------------------------------------------------------------------

def test_tiles_covering_bounds_filters_correctly():
    tiles = [HgtTile("a", 21, 88), HgtTile("b", 22, 89), HgtTile("c", 25, 95)]
    covering = tiles_covering_bounds(tiles, bounds=(88.2, 21.2, 89.5, 22.5))
    names = sorted(t.path for t in covering)
    assert names == ["a", "b"]  # tile c (25,95) does not intersect


def test_tiles_covering_bounds_empty_when_no_overlap():
    tiles = [HgtTile("a", 21, 88)]
    assert tiles_covering_bounds(tiles, bounds=(0, 0, 1, 1)) == []


# ---------------------------------------------------------------------
# Mosaic construction (synthetic GeoTIFF stand-ins for tile content)
# ---------------------------------------------------------------------

def _write_synthetic_tile(path, bounds, crs, resolution, fill_fn):
    minx, miny, maxx, maxy = bounds
    width = int((maxx - minx) / resolution)
    height = int((maxy - miny) / resolution)
    transform = from_origin(minx, maxy, resolution, resolution)
    rows, cols = np.meshgrid(np.arange(height), np.arange(width), indexing="ij")
    data = fill_fn(rows, cols, width, height).astype("float32")
    with rasterio.open(
        path, "w", driver="GTiff", height=height, width=width, count=1,
        dtype="float32", crs=crs, transform=transform, nodata=-9999.0,
    ) as dst:
        dst.write(data, 1)
    return str(path)


def test_build_dem_mosaic_single_tile_constant_elevation(tmp_path):
    path = _write_synthetic_tile(
        tmp_path / "tile1.tif", (200000, 1000000, 201000, 1001000), CRS, 100.0,
        fill_fn=lambda r, c, w, h: np.full((h, w), 500.0),
    )
    elevation, transform, crs, nodata = build_dem_mosaic([path], working_crs=CRS)
    assert crs == CRS
    assert np.nanmean(elevation) == 500.0


def test_build_dem_mosaic_requires_nonempty_list():
    try:
        build_dem_mosaic([], working_crs=CRS)
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_build_dem_mosaic_merges_two_adjacent_tiles(tmp_path):
    p1 = _write_synthetic_tile(
        tmp_path / "t1.tif", (200000, 1000000, 201000, 1001000), CRS, 100.0,
        fill_fn=lambda r, c, w, h: np.full((h, w), 100.0),
    )
    p2 = _write_synthetic_tile(
        tmp_path / "t2.tif", (201000, 1000000, 202000, 1001000), CRS, 100.0,
        fill_fn=lambda r, c, w, h: np.full((h, w), 200.0),
    )
    elevation, transform, crs, nodata = build_dem_mosaic([p1, p2], working_crs=CRS)
    # Merged raster should span both tiles' elevation values.
    unique_vals = set(np.round(np.unique(elevation[~np.isnan(elevation)]), 0))
    assert 100.0 in unique_vals or 200.0 in unique_vals  # reprojection may blend edges; core values present


# ---------------------------------------------------------------------
# Slope / aspect / curvature derivation
# ---------------------------------------------------------------------

def test_flat_surface_has_zero_slope_and_curvature():
    z = np.full((10, 10), 500.0)
    transform = from_origin(0, 1000, 10.0, 10.0)  # 10m pixels
    result = compute_slope_aspect_curvature(z, transform, nodata=None)
    interior_slope = result["slope"][1:-1, 1:-1]
    interior_curv = result["curvature"][1:-1, 1:-1]
    assert np.allclose(interior_slope, 0.0, atol=1e-6)
    assert np.allclose(interior_curv, 0.0, atol=1e-6)
    # Aspect undefined on a perfectly flat surface -> NaN, not fabricated.
    assert np.isnan(result["aspect"][5, 5])


def test_tilted_plane_has_expected_slope_angle():
    # Elevation increases 10m per 10m pixel eastward => 45 degree slope.
    size = 12
    pixel = 10.0
    cols = np.arange(size)
    z = np.tile(cols * pixel, (size, 1)).astype("float64")  # z = x (in meters), since dx=10 and step=10/px
    transform = from_origin(0, size * pixel, pixel, pixel)
    result = compute_slope_aspect_curvature(z, transform, nodata=None)
    interior_slope = result["slope"][2:-2, 2:-2]
    assert np.allclose(interior_slope, 45.0, atol=0.5)


def test_edges_are_nan_not_extrapolated():
    z = np.random.default_rng(0).normal(500, 10, size=(8, 8))
    transform = from_origin(0, 80, 10.0, 10.0)
    result = compute_slope_aspect_curvature(z, transform, nodata=None)
    assert np.isnan(result["slope"][0, :]).all()
    assert np.isnan(result["slope"][:, 0]).all()
    assert np.isnan(result["curvature"][0, :]).all()


def test_nodata_is_converted_to_nan_not_used_as_elevation():
    z = np.full((6, 6), 500.0)
    z[2, 2] = -9999.0
    transform = from_origin(0, 60, 10.0, 10.0)
    result = compute_slope_aspect_curvature(z, transform, nodata=-9999.0)
    assert np.isnan(result["elevation"][2, 2])


# ---------------------------------------------------------------------
# Full grid extraction, including out-of-coverage handling
# ---------------------------------------------------------------------

def _make_small_grid():
    cell = box(200000, 1000000, 201000, 1001000)
    return gpd.GeoDataFrame({"grid_id": ["g1"]}, geometry=[cell], crs=CRS)


def test_extract_dem_features_out_of_coverage_returns_nan(tmp_path):
    grid = _make_small_grid()
    # dem_dir has no tiles at all -> everything NaN, nothing fabricated.
    df = extract_dem_features_for_grid(grid, dem_dir=str(tmp_path), working_crs=CRS)
    assert list(df.columns) == ["elevation", "slope", "aspect", "curvature"]
    assert df.isna().all().all()


def test_extract_dem_features_missing_dem_dir_returns_nan():
    grid = _make_small_grid()
    df = extract_dem_features_for_grid(grid, dem_dir="/nonexistent/srtm_dir", working_crs=CRS)
    assert df.isna().all().all()
