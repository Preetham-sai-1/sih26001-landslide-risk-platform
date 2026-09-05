"""
ml-service/src/data/leakage_audit.py

Automated leakage-detection checks for the SIH26001 feature/training
pipeline, covering the five categories required in Phase 3 Task 8:
1. spatial leakage
2. temporal leakage
3. duplicate-event leakage
4. feature leakage
5. target leakage

STATUS: implemented and exercised against a small SYNTHETIC fixture
(see ml-service/tests/test_leakage_audit.py). NOT yet run against the
real dataset — see the acquisition blocker documented in
ml-service/data/raw/kerala_landslide_inventory_2018/ACQUISITION_STATUS.md.
Do not treat any docstring example as a real finding.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import geopandas as gpd
import numpy as np
import pandas as pd

from .quality_checks import CheckResult


# ---------------------------------------------------------------------
# 1. Spatial leakage
# ---------------------------------------------------------------------

def check_spatial_leakage_between_splits(
    train_gdf: gpd.GeoDataFrame,
    test_gdf: gpd.GeoDataFrame,
    min_separation_m: float,
) -> CheckResult:
    """Flags any test record within `min_separation_m` of any train record.

    Requires both inputs to share a projected (metric) CRS. This
    directly operationalizes the spatial cross-validation requirement
    in docs/validation_strategy.md — a fold split that fails this check
    is not a valid spatial split, regardless of how the split was
    constructed.
    """
    if train_gdf.crs is None or train_gdf.crs.is_geographic:
        raise ValueError("Requires a projected (metric) CRS for train_gdf.")
    if test_gdf.crs != train_gdf.crs:
        test_gdf = test_gdf.to_crs(train_gdf.crs)

    train_union = train_gdf.geometry.union_all()
    too_close = test_gdf.geometry.distance(train_union) < min_separation_m
    n = int(too_close.sum())
    return CheckResult(
        check_name="spatial_leakage_between_splits",
        passed=(n == 0),
        n_flagged=n,
        details=f"{n} of {len(test_gdf)} test records are within "
                f"{min_separation_m} m of a training record.",
        flagged_indices=test_gdf.index[too_close].tolist(),
    )


# ---------------------------------------------------------------------
# 2. Temporal leakage
# ---------------------------------------------------------------------

def check_temporal_leakage(
    df: pd.DataFrame,
    feature_as_of_col: str,
    prediction_reference_col: str,
) -> CheckResult:
    """Flags any record where a feature's `as-of` date is after the
    prediction reference time T for that record — i.e., a feature that
    was computed using information from the future relative to the
    prediction it's meant to support.

    This directly implements the core rule from docs/temporal_alignment.md:
    "for a prediction at time T, features must only use information
    available at or before T."
    """
    if feature_as_of_col not in df.columns or prediction_reference_col not in df.columns:
        raise ValueError("Both columns must be present in the dataframe.")
    future_leak = pd.to_datetime(df[feature_as_of_col]) > pd.to_datetime(df[prediction_reference_col])
    n = int(future_leak.sum())
    return CheckResult(
        check_name="temporal_leakage",
        passed=(n == 0),
        n_flagged=n,
        details=f"{n} of {len(df)} records have a feature dated after "
                f"their own prediction reference time T.",
        flagged_indices=df.index[future_leak].tolist(),
    )


# ---------------------------------------------------------------------
# 3. Duplicate-event leakage
# ---------------------------------------------------------------------

def check_duplicate_event_leakage(
    gdf: gpd.GeoDataFrame,
    group_col: str,
    tolerance_m: float = 1.0,
) -> CheckResult:
    """Flags cases where the same underlying event (e.g., same
    `data_source` cross-reference, or coincident geometry) appears more
    than once across the dataset in a way that could let the same event
    appear in both a train and a test fold. This is distinct from plain
    duplicate-geometry detection (quality_checks.check_duplicate_geometries)
    because it groups by an explicit event/source identifier rather than
    coordinates alone, per the documented NRSC/GSI dual-confirmation
    structure in docs/inventory_metadata_report.md (422 landslides
    confirmed by both sources are ONE event, not two).
    """
    if group_col not in gdf.columns:
        raise ValueError(f"'{group_col}' not found in columns.")
    dup_mask = gdf[group_col].duplicated(keep=False) & gdf[group_col].notna()
    n = int(dup_mask.sum())
    return CheckResult(
        check_name="duplicate_event_leakage",
        passed=(n == 0),
        n_flagged=n,
        details=f"{n} of {len(gdf)} records share a `{group_col}` value with "
                f"at least one other record — verify these represent the same "
                f"physical event and are kept together in the same fold "
                f"(per docs/validation_strategy.md group-aware splitting).",
        flagged_indices=gdf.index[dup_mask].tolist(),
    )


# ---------------------------------------------------------------------
# 4. Feature leakage
# ---------------------------------------------------------------------

def check_feature_leakage_by_source_date(
    feature_metadata: dict,
    prediction_reference_date,
) -> CheckResult:
    """Given a dict of {feature_name: source_acquisition_date_or_None},
    flags any feature whose declared source date is after the prediction
    reference date. This is a metadata-level check (it audits the
    *declared* provenance of each feature source, e.g. "this WorldCover
    tile is dated 2021-01-01") rather than a per-record numeric check —
    it is meant to catch pipeline-configuration mistakes (e.g.,
    accidentally wiring in a post-event satellite layer as a "current
    conditions" feature), which is exactly the WorldCover/Sentinel-2
    risk flagged in docs/temporal_alignment.md §5.

    `source_acquisition_date_or_None` should be None only for genuinely
    static/undated sources (e.g., SoilGrids modeled surfaces) — passing
    None is a deliberate, explicit statement that the feature has no
    date to check, not a default.
    """
    flagged = []
    for name, source_date in feature_metadata.items():
        if source_date is None:
            continue
        if pd.to_datetime(source_date) > pd.to_datetime(prediction_reference_date):
            flagged.append(name)
    n = len(flagged)
    return CheckResult(
        check_name="feature_leakage_by_source_date",
        passed=(n == 0),
        n_flagged=n,
        details=f"Features with a source date after the prediction reference "
                f"date {prediction_reference_date}: {flagged}",
    )


# ---------------------------------------------------------------------
# 5. Target leakage
# ---------------------------------------------------------------------

def check_target_leakage_by_correlation(
    df: pd.DataFrame,
    feature_cols: list,
    target_col: str,
    correlation_threshold: float = 0.98,
) -> CheckResult:
    """Flags any feature suspiciously (near-)perfectly correlated with the
    target — a common symptom of accidental target leakage (e.g., a
    feature that was itself derived from the labeling process). A high
    correlation is a *flag for manual review*, not proof of leakage on
    its own — genuine strong predictors can exist — so this check's
    role is to surface candidates, not to auto-reject features.
    """
    if target_col not in df.columns:
        raise ValueError(f"'{target_col}' not in dataframe.")
    flagged = []
    for col in feature_cols:
        if col not in df.columns:
            continue
        if not np.issubdtype(df[col].dtype, np.number):
            continue
        valid = df[[col, target_col]].dropna()
        if len(valid) < 2 or valid[col].nunique() < 2:
            continue
        corr = valid[col].corr(valid[target_col])
        if abs(corr) >= correlation_threshold:
            flagged.append((col, round(float(corr), 4)))
    n = len(flagged)
    return CheckResult(
        check_name="target_leakage_by_correlation",
        passed=(n == 0),
        n_flagged=n,
        details=f"Features with |correlation| >= {correlation_threshold} to target: {flagged}. "
                f"Each flagged feature requires manual review, not automatic removal.",
    )


def run_full_leakage_audit(
    train_gdf: Optional[gpd.GeoDataFrame] = None,
    test_gdf: Optional[gpd.GeoDataFrame] = None,
    min_separation_m: Optional[float] = None,
    temporal_df: Optional[pd.DataFrame] = None,
    feature_as_of_col: Optional[str] = None,
    prediction_reference_col: Optional[str] = None,
    duplicate_event_gdf: Optional[gpd.GeoDataFrame] = None,
    group_col: Optional[str] = None,
    feature_metadata: Optional[dict] = None,
    prediction_reference_date=None,
    target_df: Optional[pd.DataFrame] = None,
    feature_cols: Optional[list] = None,
    target_col: Optional[str] = None,
) -> list:
    """Runs whichever of the five checks have sufficient inputs supplied;
    skips (with an explicit note) any check whose required inputs are
    not provided, rather than silently omitting it.
    """
    results = []

    if train_gdf is not None and test_gdf is not None and min_separation_m is not None:
        results.append(check_spatial_leakage_between_splits(train_gdf, test_gdf, min_separation_m))
    else:
        results.append(CheckResult("spatial_leakage_between_splits", False, -1,
                                    "SKIPPED: train/test split not yet constructed."))

    if temporal_df is not None and feature_as_of_col and prediction_reference_col:
        results.append(check_temporal_leakage(temporal_df, feature_as_of_col, prediction_reference_col))
    else:
        results.append(CheckResult("temporal_leakage", False, -1,
                                    "SKIPPED: feature table with as-of dates not yet built."))

    if duplicate_event_gdf is not None and group_col:
        results.append(check_duplicate_event_leakage(duplicate_event_gdf, group_col))
    else:
        results.append(CheckResult("duplicate_event_leakage", False, -1,
                                    "SKIPPED: raw inventory not yet acquired (no group_col available)."))

    if feature_metadata is not None and prediction_reference_date is not None:
        results.append(check_feature_leakage_by_source_date(feature_metadata, prediction_reference_date))
    else:
        results.append(CheckResult("feature_leakage_by_source_date", False, -1,
                                    "SKIPPED: feature source-date metadata not yet compiled."))

    if target_df is not None and feature_cols and target_col:
        results.append(check_target_leakage_by_correlation(target_df, feature_cols, target_col))
    else:
        results.append(CheckResult("target_leakage_by_correlation", False, -1,
                                    "SKIPPED: feature table not yet built."))

    return results
