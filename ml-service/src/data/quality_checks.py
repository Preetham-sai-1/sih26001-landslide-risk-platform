"""
ml-service/src/data/quality_checks.py

Data quality check functions for the SIH26001 landslide inventory
pipeline.

IMPORTANT STATUS NOTE: These functions are implemented and have been
exercised against a small SYNTHETIC test fixture (see
ml-service/tests/test_quality_checks.py) to confirm the logic is
correct. They have NOT been run against the real Hao et al. (2020)
Kerala inventory, because that raw file could not be acquired in the
development environment this pipeline was built in (see
ml-service/data/raw/kerala_landslide_inventory_2018/ACQUISITION_STATUS.md).
Do not treat any example output in this module's docstrings as a real
result.

Expected input: a geopandas.GeoDataFrame of point geometries with at
minimum a `geometry` column, and ideally the attribute fields documented
in docs/inventory_metadata_report.md (district, landslide_type, area,
data_source, etc.) for the fuller checks.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

import geopandas as gpd
import pandas as pd
from shapely.geometry.base import BaseGeometry


@dataclass
class CheckResult:
    """Structured result for a single quality/leakage check."""
    check_name: str
    passed: bool
    n_flagged: int
    details: str
    flagged_indices: list = field(default_factory=list)


# ---------------------------------------------------------------------
# Geometry / CRS / coordinate validity
# ---------------------------------------------------------------------

def check_geometry_validity(gdf: gpd.GeoDataFrame) -> CheckResult:
    """Flags null, empty, or topologically invalid geometries."""
    invalid_mask = (
        gdf.geometry.isna()
        | gdf.geometry.is_empty
        | ~gdf.geometry.apply(lambda g: g.is_valid if isinstance(g, BaseGeometry) else False)
    )
    n = int(invalid_mask.sum())
    return CheckResult(
        check_name="geometry_validity",
        passed=(n == 0),
        n_flagged=n,
        details=f"{n} of {len(gdf)} records have null/empty/invalid geometry.",
        flagged_indices=gdf.index[invalid_mask].tolist(),
    )


def check_crs(gdf: gpd.GeoDataFrame, expected_epsg: Optional[int] = None) -> CheckResult:
    """Confirms a CRS is defined, and optionally that it matches an expected EPSG code.

    A missing CRS is treated as a hard failure: every downstream spatial
    operation (buffering, reprojection, area calculation) is silently
    wrong without a defined CRS, so this check does not attempt to guess
    or default one.
    """
    if gdf.crs is None:
        return CheckResult(
            check_name="crs_defined",
            passed=False,
            n_flagged=len(gdf),
            details="No CRS is defined on the GeoDataFrame. All records flagged; "
                    "spatial operations cannot be trusted until a CRS is confirmed "
                    "against the source's own .prj file or documentation.",
        )
    if expected_epsg is not None:
        actual_epsg = gdf.crs.to_epsg()
        if actual_epsg != expected_epsg:
            return CheckResult(
                check_name="crs_matches_expected",
                passed=False,
                n_flagged=len(gdf),
                details=f"CRS is EPSG:{actual_epsg}, expected EPSG:{expected_epsg}. "
                        f"Reprojection required before alignment with other layers.",
            )
    return CheckResult(
        check_name="crs_defined",
        passed=True,
        n_flagged=0,
        details=f"CRS is defined (EPSG:{gdf.crs.to_epsg()}).",
    )


def check_coordinate_bounds(
    gdf: gpd.GeoDataFrame,
    min_lon: float,
    max_lon: float,
    min_lat: float,
    max_lat: float,
) -> CheckResult:
    """Flags points outside a given lon/lat bounding box.

    The caller must supply the actual bounding box for the pilot region
    (e.g., Kerala's real extent) — no bounding box is hard-coded here,
    since guessing one would be exactly the kind of unverified assumption
    this project's engineering rules prohibit.
    """
    if gdf.crs is not None and gdf.crs.to_epsg() != 4326:
        check_gdf = gdf.to_crs(epsg=4326)
    else:
        check_gdf = gdf
    x = check_gdf.geometry.x
    y = check_gdf.geometry.y
    out_of_bounds = (x < min_lon) | (x > max_lon) | (y < min_lat) | (y > max_lat)
    n = int(out_of_bounds.sum())
    return CheckResult(
        check_name="coordinate_bounds",
        passed=(n == 0),
        n_flagged=n,
        details=f"{n} of {len(gdf)} records fall outside the expected "
                f"bounding box [{min_lon},{min_lat},{max_lon},{max_lat}].",
        flagged_indices=check_gdf.index[out_of_bounds].tolist(),
    )


# ---------------------------------------------------------------------
# Duplicates
# ---------------------------------------------------------------------

def check_duplicate_geometries(gdf: gpd.GeoDataFrame, tolerance_m: float = 1.0) -> CheckResult:
    """Flags records whose point geometry coincides (within tolerance) with another record's.

    Requires a projected (metric) CRS for the tolerance to be meaningful
    in meters; the caller is responsible for reprojecting first (see
    docs/spatial_alignment.md on CRS handling) — this function will
    raise rather than silently assume a CRS is metric.
    """
    if gdf.crs is None or gdf.crs.is_geographic:
        raise ValueError(
            "check_duplicate_geometries requires a projected (metric) CRS; "
            "reproject to an appropriate metric CRS for Kerala before calling this."
        )
    coords = gdf.geometry.apply(lambda g: (round(g.x / tolerance_m), round(g.y / tolerance_m)))
    dup_mask = coords.duplicated(keep=False)
    n = int(dup_mask.sum())
    return CheckResult(
        check_name="duplicate_geometries",
        passed=(n == 0),
        n_flagged=n,
        details=f"{n} of {len(gdf)} records share a coordinate within {tolerance_m} m of another record.",
        flagged_indices=gdf.index[dup_mask].tolist(),
    )


# ---------------------------------------------------------------------
# Missing values / impossible values
# ---------------------------------------------------------------------

def check_missing_values(df: pd.DataFrame, required_columns: Optional[list] = None) -> CheckResult:
    """Reports per-column missing counts; optionally restricted to required_columns."""
    cols = required_columns if required_columns is not None else list(df.columns)
    missing_counts = {c: int(df[c].isna().sum()) for c in cols if c in df.columns}
    total_missing = sum(missing_counts.values())
    return CheckResult(
        check_name="missing_values",
        passed=(total_missing == 0),
        n_flagged=total_missing,
        details=f"Per-column missing counts: {missing_counts}",
    )


def check_impossible_numeric_values(df: pd.DataFrame, rules: dict) -> CheckResult:
    """rules: {column_name: (min_allowed, max_allowed)}. Flags values outside the given range.

    No default ranges are assumed for any field — the caller supplies
    them explicitly (e.g., elevation plausible range for Kerala,
    rainfall >= 0, slope in [0, 90] degrees), consistent with the
    project's rule against inventing thresholds.
    """
    flagged_total = 0
    details_parts = []
    for col, (lo, hi) in rules.items():
        if col not in df.columns:
            continue
        bad = df[col].notna() & ((df[col] < lo) | (df[col] > hi))
        n = int(bad.sum())
        flagged_total += n
        details_parts.append(f"{col}: {n} values outside [{lo}, {hi}]")
    return CheckResult(
        check_name="impossible_numeric_values",
        passed=(flagged_total == 0),
        n_flagged=flagged_total,
        details="; ".join(details_parts) if details_parts else "No rules matched any column.",
    )


# ---------------------------------------------------------------------
# Report assembly
# ---------------------------------------------------------------------

def run_all_quality_checks(
    gdf: gpd.GeoDataFrame,
    bounds: Optional[dict] = None,
    numeric_rules: Optional[dict] = None,
    duplicate_tolerance_m: float = 1.0,
) -> list:
    """Runs the standard suite and returns a list of CheckResult.

    `bounds` (if given): dict with keys min_lon, max_lon, min_lat, max_lat.
    `numeric_rules` (if given): passed through to check_impossible_numeric_values.
    Geometry-CRS-dependent checks (duplicates) are skipped with a note if
    the input CRS is not projected/metric, rather than silently producing
    a wrong answer.
    """
    results = []
    results.append(check_geometry_validity(gdf))
    results.append(check_crs(gdf))
    if bounds is not None:
        results.append(check_coordinate_bounds(gdf, **bounds))
    results.append(check_missing_values(gdf.drop(columns="geometry", errors="ignore")))
    if numeric_rules is not None:
        results.append(check_impossible_numeric_values(gdf, numeric_rules))
    if gdf.crs is not None and not gdf.crs.is_geographic:
        results.append(check_duplicate_geometries(gdf, tolerance_m=duplicate_tolerance_m))
    else:
        results.append(CheckResult(
            check_name="duplicate_geometries",
            passed=False,
            n_flagged=-1,
            details="SKIPPED: input CRS is geographic (degrees), not metric; "
                    "reproject before running this check.",
        ))
    return results
