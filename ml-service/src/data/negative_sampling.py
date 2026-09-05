"""
ml-service/src/data/negative_sampling.py

Implements the negative-sampling strategy selected in
docs/negative_sampling.md: buffered exclusion around known positives,
extra caution in dense clusters, and spatial stratification by a
grouping column (e.g., district).

STATUS: implemented and exercised against a small SYNTHETIC fixture
(see ml-service/tests/test_negative_sampling.py). NOT yet run against
the real inventory (acquisition blocker documented in
ml-service/data/raw/kerala_landslide_inventory_2018/ACQUISITION_STATUS.md).
Terrain/environmental matching (docs/negative_sampling.md §1.5) and
observation-coverage-aware sampling (§1.4) are explicitly NOT
implemented here yet, consistent with that document's stated scope.
"""

from __future__ import annotations

from typing import Optional

import geopandas as gpd
import numpy as np
from shapely.geometry import Point


def sample_negatives(
    positives: gpd.GeoDataFrame,
    candidate_region: gpd.GeoDataFrame,
    n_negatives: int,
    buffer_m: float,
    stratify_col: Optional[str] = None,
    cluster_buffer_multiplier: float = 1.0,
    cluster_threshold_count: Optional[int] = None,
    random_state: Optional[int] = None,
) -> gpd.GeoDataFrame:
    """Samples candidate negative points.

    Parameters
    ----------
    positives : GeoDataFrame of known landslide points, in a projected
        (metric) CRS. Required so that `buffer_m` is meaningful.
    candidate_region : GeoDataFrame (single or multiple polygons)
        defining the area within which negatives may be sampled (e.g.,
        Kerala's boundary), same CRS as `positives`.
    n_negatives : total number of negative points to attempt to sample.
        Not guaranteed to be reached exactly if the excluded (buffered)
        area leaves insufficient candidate space — the function returns
        as many as it can and the caller must check the returned count,
        rather than silently padding with something invalid.
    buffer_m : exclusion buffer radius (meters) around every positive.
        This is the single most consequential free parameter in this
        strategy (see docs/negative_sampling.md §3 sensitivity analysis
        requirement) — no default is silently assumed; the caller must
        supply it explicitly.
    stratify_col : optional column in `positives` (e.g. 'district') used
        to distribute negative sampling proportionally to where positives
        are concentrated, per docs/negative_sampling.md §1.6. If None,
        sampling is uniform across the candidate region minus exclusions
        (with dense-cluster caution still applied, see below).
    cluster_buffer_multiplier : multiplier applied to `buffer_m` in areas
        identified as dense clusters (docs/negative_sampling.md §1.3).
        A value of 1.0 (default) applies no extra caution — the caller
        must opt in explicitly to a larger multiplier if desired.
    cluster_threshold_count : if stratify_col is given, any stratum with
        more than this many positives is treated as a dense cluster and
        gets the larger buffer. If None, no cluster-based adjustment is
        applied even if stratify_col is given.
    random_state : for reproducibility.

    Returns
    -------
    GeoDataFrame of sampled negative points with a `stratum` column (if
    stratify_col was used) and a `label` column set to 0.
    """
    rng = np.random.default_rng(random_state)

    if positives.crs is None or positives.crs.is_geographic:
        raise ValueError("positives must be in a projected (metric) CRS for buffer_m to be meaningful.")
    if candidate_region.crs != positives.crs:
        candidate_region = candidate_region.to_crs(positives.crs)

    region_union = candidate_region.geometry.union_all()

    def excluded_area_for(pts: gpd.GeoSeries, radius: float):
        if len(pts) == 0:
            return None
        return pts.buffer(radius).union_all()

    if stratify_col is not None and stratify_col in positives.columns:
        strata = positives[stratify_col].unique()
        n_per_stratum = max(1, n_negatives // max(1, len(strata)))
        sampled_frames = []
        for stratum in strata:
            stratum_positives = positives[positives[stratify_col] == stratum]
            radius = buffer_m
            if cluster_threshold_count is not None and len(stratum_positives) > cluster_threshold_count:
                radius = buffer_m * cluster_buffer_multiplier
            excluded = excluded_area_for(stratum_positives.geometry, radius)
            allowed_area = region_union.difference(excluded) if excluded is not None else region_union
            pts = _random_points_in_polygon(allowed_area, n_per_stratum, rng)
            gdf = gpd.GeoDataFrame(
                {"stratum": [stratum] * len(pts), "label": [0] * len(pts)},
                geometry=pts,
                crs=positives.crs,
            )
            sampled_frames.append(gdf)
        if sampled_frames:
            import pandas as pd
            result = gpd.GeoDataFrame(pd.concat(sampled_frames, ignore_index=True), crs=positives.crs)
        else:
            result = gpd.GeoDataFrame({"stratum": [], "label": []}, geometry=[], crs=positives.crs)
        return result
    else:
        excluded = excluded_area_for(positives.geometry, buffer_m)
        allowed_area = region_union.difference(excluded) if excluded is not None else region_union
        pts = _random_points_in_polygon(allowed_area, n_negatives, rng)
        return gpd.GeoDataFrame({"label": [0] * len(pts)}, geometry=pts, crs=positives.crs)


def _random_points_in_polygon(polygon, n, rng, max_attempts_multiplier: int = 50):
    """Rejection-sampling of n random points inside `polygon`'s bounding
    box, keeping only those that actually fall within the polygon. Not
    guaranteed to return exactly n points if the polygon is very small
    relative to its bounding box or n is large relative to available
    area — returns as many as found within a bounded number of attempts,
    rather than looping indefinitely.
    """
    if polygon is None or polygon.is_empty:
        return []
    minx, miny, maxx, maxy = polygon.bounds
    points = []
    attempts = 0
    max_attempts = max(1, n) * max_attempts_multiplier
    while len(points) < n and attempts < max_attempts:
        x = rng.uniform(minx, maxx)
        y = rng.uniform(miny, maxy)
        p = Point(x, y)
        if polygon.contains(p):
            points.append(p)
        attempts += 1
    return points
