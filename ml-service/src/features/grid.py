"""
ml-service/src/features/grid.py

Prediction-grid construction, landslide-label assignment, and negative-
candidate selection for the SIH26001 Kerala pipeline-development
dataset.

STATUS: this module IS executed against the real Kerala 2018 landslide
inventory (see ml-service/data/raw/kerala_landslide_inventory_2018/).
It does NOT use any fabricated data for that step. However, the "study
area" polygon used here is an explicit, documented PROXY (a buffered
convex hull of the actual landslide points) because no authoritative
Kerala administrative boundary has been downloaded in this environment
(see docs/data_sources.md §8 and the acquisition blockers documented
throughout this project). This proxy is clearly labeled everywhere it
is used and must be replaced with a real boundary (geoBoundaries/GADM)
once available -- see docs/training_dataset_build.md.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

import geopandas as gpd
import numpy as np
import pandas as pd
from shapely.geometry import Point, Polygon, box


# A documented, non-arbitrary default: EPSG:32643 is the UTM zone
# (Zone 43N) appropriate for Kerala's longitude range (~75-77 E), used
# throughout this project's prior phases (docs/spatial_alignment.md,
# ml-service tests) as the working metric CRS for exactly this region.
DEFAULT_WORKING_CRS = "EPSG:32643"


@dataclass
class StudyAreaResult:
    polygon_gdf: gpd.GeoDataFrame
    method: str
    buffer_m: float
    source_point_count: int
    notes: str


def build_study_area_proxy(
    positives: gpd.GeoDataFrame,
    buffer_m: float = 5000.0,
    working_crs: str = DEFAULT_WORKING_CRS,
) -> StudyAreaResult:
    """Builds a PROXY study-area polygon from the convex hull of the
    positive landslide points, buffered outward by `buffer_m` meters.

    This is explicitly NOT the real Kerala state boundary. It exists so
    that grid generation and negative sampling can run against a
    concrete area in the absence of a downloaded authoritative boundary
    (see docs/data_sources.md §8 -- geoBoundaries/GADM access has not
    been completed in this environment). Every caller of this function
    must treat the resulting area as provisional.
    """
    pts = positives.to_crs(working_crs)
    hull = pts.geometry.union_all().convex_hull
    buffered = hull.buffer(buffer_m)
    gdf = gpd.GeoDataFrame({"area_type": ["proxy_convex_hull_buffered"]}, geometry=[buffered], crs=working_crs)
    return StudyAreaResult(
        polygon_gdf=gdf,
        method="convex_hull_of_positives_buffered",
        buffer_m=buffer_m,
        source_point_count=len(positives),
        notes=(
            "PROXY study area only -- convex hull of the 4,728 real landslide "
            f"points, buffered by {buffer_m}m. Not an authoritative Kerala "
            "boundary. See docs/training_dataset_build.md."
        ),
    )


def build_prediction_grid(
    study_area: gpd.GeoDataFrame,
    cell_size_m: float,
    working_crs: str = DEFAULT_WORKING_CRS,
) -> gpd.GeoDataFrame:
    """Builds a regular square grid covering the bounding box of
    `study_area`, keeping only cells whose centroid falls within the
    study area polygon (so the grid respects the (proxy) area's actual
    shape, not just its bounding box).

    Returns a GeoDataFrame with columns: grid_id, geometry (cell
    polygon), centroid (Point), in_study_area (bool, always True for
    returned rows since out-of-area cells are dropped).
    """
    if study_area.crs != working_crs:
        study_area = study_area.to_crs(working_crs)
    area_union = study_area.geometry.union_all()
    minx, miny, maxx, maxy = area_union.bounds

    xs = np.arange(minx, maxx, cell_size_m)
    ys = np.arange(miny, maxy, cell_size_m)

    cells = []
    for x in xs:
        for y in ys:
            cell = box(x, y, x + cell_size_m, y + cell_size_m)
            centroid = cell.centroid
            # Include a cell if it INTERSECTS the study area (not merely
            # if its centroid falls inside it). Centroid-only inclusion
            # was found (via testing) to silently drop edge cells whose
            # centroid lies just outside the area but whose polygon still
            # covers real points near the area boundary -- this caused a
            # genuine label-loss bug caught by test_grid.py. Using
            # `intersects` guarantees any point inside the (proxy) study
            # area falls within at least one included cell.
            if area_union.intersects(cell):
                cells.append((cell, centroid))

    grid_ids = [f"grid_{i:06d}" for i in range(len(cells))]
    gdf = gpd.GeoDataFrame(
        {
            "grid_id": grid_ids,
            "centroid": [c[1] for c in cells],
            "in_study_area": [True] * len(cells),
        },
        geometry=[c[0] for c in cells],
        crs=working_crs,
    )
    return gdf


def assign_landslide_labels(
    grid_gdf: gpd.GeoDataFrame,
    positives: gpd.GeoDataFrame,
    working_crs: str = DEFAULT_WORKING_CRS,
) -> gpd.GeoDataFrame:
    """Spatially joins the real landslide points onto the grid. Adds:
    - `positive_count`: number of landslide points falling within each cell
    - `target`: 1 if positive_count > 0, else 0 (0 here means "no
      landslide point fell in this cell" -- NOT yet a validated negative
      label; see select_negative_grid_cells for the actual negative-
      sampling logic that decides which target=0 cells are ACCEPTED as
      negatives for training, per docs/negative_sampling.md).
    """
    pts = positives.to_crs(working_crs)
    grid = grid_gdf.to_crs(working_crs).copy()
    joined = gpd.sjoin(
        grid.set_geometry("geometry"),
        pts[["geometry"]],
        how="left",
        predicate="intersects",
    )
    counts = joined.groupby(joined.index).size()
    # sjoin with how='left' produces one row per grid cell per matching
    # point; cells with no match still appear once with index_right NaN.
    counts = joined.groupby(level=0)["index_right"].apply(lambda s: s.notna().sum())
    grid["positive_count"] = grid.index.map(counts).fillna(0).astype(int)
    grid["target"] = (grid["positive_count"] > 0).astype(int)
    return grid


@dataclass
class NegativeSamplingReport:
    total_grid_cells: int
    positive_cells: int
    candidate_negative_cells: int
    buffer_excluded_cells: int
    accepted_negative_cells: int
    sampling_ratio_negative_to_positive: float
    buffer_m: float
    n_strata: int
    per_stratum_counts: dict
    notes: str


def select_negative_grid_cells(
    grid_gdf: gpd.GeoDataFrame,
    buffer_m: float,
    positives: gpd.GeoDataFrame,
    max_negatives: Optional[int] = None,
    n_spatial_strata_per_axis: int = 4,
    random_state: Optional[int] = None,
    working_crs: str = DEFAULT_WORKING_CRS,
) -> tuple[gpd.GeoDataFrame, NegativeSamplingReport]:
    """Implements the negative-sampling strategy selected in
    docs/negative_sampling.md at the grid-cell level:

    1. Positive cells (target==1) are never candidates.
    2. Cells whose polygon falls within `buffer_m` of ANY positive point
       are excluded from candidacy (docs/negative_sampling.md §1.2 --
       exclusion buffer), directly addressing the near-duplicate
       clustering found in Phase 3B (30m/100m pairs).
    3. Remaining candidate cells are spatially stratified using a coarse
       n_spatial_strata_per_axis x n_spatial_strata_per_axis block grid
       over the study area bounding box -- used INSTEAD of district-based
       stratification (docs/negative_sampling.md §1.6) because no real
       administrative boundary has been joined to these grid cells (see
       module docstring). This is a documented substitution, not a
       silent one.
    4. Sampling is capped at `max_negatives` (if given), drawn evenly
       across strata where possible.

    Terrain matching (§1.5) and observation-coverage-aware sampling
    (§1.4) are NOT implemented here, consistent with docs/negative_sampling.md's
    explicit statement that both are deferred.
    """
    rng = np.random.default_rng(random_state)
    grid = grid_gdf.to_crs(working_crs).copy()
    pts = positives.to_crs(working_crs)

    total_cells = len(grid)
    positive_mask = grid["target"] == 1
    positive_cells = int(positive_mask.sum())

    positives_union = pts.geometry.union_all()
    buffered_positives = positives_union.buffer(buffer_m)

    # ADDITIONAL exclusion layer, added after a real audit finding: a
    # candidate cell can be > buffer_m from the actual landslide POINT
    # yet still be < buffer_m from the edge of a POSITIVE GRID CELL
    # polygon, because a positive cell (up to ~1.4x cell_size/2 from its
    # own centroid to a far corner) extends spatially beyond the single
    # point that triggered it. A real run against the Kerala data found
    # 103 of 6,417 accepted negatives (1.6%) fell inside buffer_m of a
    # positive CELL polygon despite being outside buffer_m of the raw
    # points (see docs/training_dataset_build.md). Buffering the positive
    # cells themselves, in addition to the points, closes this gap.
    positive_cells_union = grid.loc[positive_mask].geometry.union_all() if positive_mask.any() else None
    if positive_cells_union is not None:
        buffered_positive_cells = positive_cells_union.buffer(buffer_m)
        combined_exclusion = buffered_positives.union(buffered_positive_cells)
    else:
        combined_exclusion = buffered_positives

    non_positive = grid.loc[~positive_mask].copy()
    excluded_mask = non_positive.geometry.intersects(combined_exclusion)
    buffer_excluded_cells = int(excluded_mask.sum())

    candidates = non_positive.loc[~excluded_mask].copy()
    candidate_negative_cells = len(candidates)

    # Coarse spatial stratification over the study bounding box.
    minx, miny, maxx, maxy = grid.total_bounds
    x_edges = np.linspace(minx, maxx, n_spatial_strata_per_axis + 1)
    y_edges = np.linspace(miny, maxy, n_spatial_strata_per_axis + 1)

    def stratum_for(pt):
        xi = min(np.searchsorted(x_edges, pt.x, side="right") - 1, n_spatial_strata_per_axis - 1)
        yi = min(np.searchsorted(y_edges, pt.y, side="right") - 1, n_spatial_strata_per_axis - 1)
        xi = max(xi, 0)
        yi = max(yi, 0)
        return f"block_{xi}_{yi}"

    if len(candidates) > 0:
        candidates["stratum"] = candidates["centroid"].apply(stratum_for)
    else:
        candidates["stratum"] = []

    strata = sorted(candidates["stratum"].unique()) if len(candidates) > 0 else []
    n_strata = len(strata)

    if max_negatives is not None and len(candidates) > max_negatives:
        per_stratum_target = max(1, max_negatives // max(1, n_strata))
        sampled_parts = []
        for s in strata:
            pool = candidates[candidates["stratum"] == s]
            take = min(len(pool), per_stratum_target)
            if take > 0:
                idx = rng.choice(pool.index.to_numpy(), size=take, replace=False)
                sampled_parts.append(pool.loc[idx])
        accepted = gpd.GeoDataFrame(pd.concat(sampled_parts), crs=working_crs) if sampled_parts else candidates.iloc[0:0]
        # Top up to max_negatives if under target due to small strata, from remaining pool.
        if len(accepted) < max_negatives:
            remaining_pool = candidates.drop(index=accepted.index)
            shortfall = max_negatives - len(accepted)
            if len(remaining_pool) > 0:
                take = min(len(remaining_pool), shortfall)
                idx = rng.choice(remaining_pool.index.to_numpy(), size=take, replace=False)
                accepted = gpd.GeoDataFrame(pd.concat([accepted, remaining_pool.loc[idx]]), crs=working_crs)
        # STRICT cap enforcement: per-stratum allocation using integer
        # division (max_negatives // n_strata) can overshoot max_negatives
        # when it doesn't divide evenly (e.g. 5 negatives requested across
        # 10 strata each contributing >=1 -- a real bug caught by
        # test_grid.py::test_select_negative_grid_cells_respects_max_cap).
        # Enforce the cap exactly here, even if it means an uneven final
        # per-stratum distribution -- documented as a known trade-off,
        # not silently hidden.
        if len(accepted) > max_negatives:
            keep_idx = rng.choice(accepted.index.to_numpy(), size=max_negatives, replace=False)
            accepted = accepted.loc[keep_idx]
    else:
        accepted = candidates

    accepted_negative_cells = len(accepted)
    per_stratum_counts = accepted["stratum"].value_counts().to_dict() if len(accepted) > 0 else {}

    ratio = round(accepted_negative_cells / positive_cells, 4) if positive_cells > 0 else float("nan")

    report = NegativeSamplingReport(
        total_grid_cells=total_cells,
        positive_cells=positive_cells,
        candidate_negative_cells=candidate_negative_cells,
        buffer_excluded_cells=buffer_excluded_cells,
        accepted_negative_cells=accepted_negative_cells,
        sampling_ratio_negative_to_positive=ratio,
        buffer_m=buffer_m,
        n_strata=n_strata,
        per_stratum_counts=per_stratum_counts,
        notes=(
            "Stratification uses coarse spatial blocks (proxy for district-based "
            "stratification), since no real administrative boundary is joined to "
            "the grid in this environment. See docs/training_dataset_build.md."
        ),
    )
    return accepted, report
