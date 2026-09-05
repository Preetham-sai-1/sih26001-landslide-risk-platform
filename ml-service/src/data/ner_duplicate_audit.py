"""
ml-service/src/data/ner_duplicate_audit.py

Reproducible duplicate-record audit for the NER GSI landslide subset.
Read-only: never deletes/modifies records. Only the conclusively
justified rule (§ below) is implemented as code; everything else is
flagged for manual review, per instruction not to auto-delete.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import geopandas as gpd
import pandas as pd

# Columns excluded from full-row-identity comparison: OBJECTID is a
# generated primary key (always unique by construction) and geometry
# is compared separately via coordinates.
_IDENTITY_EXCLUDE_COLS = {"OBJECTID", "geometry"}


@dataclass
class DuplicateAuditResult:
    n_duplicate_coordinate_records: int
    n_duplicate_coordinate_groups: int
    n_groups_same_slide_no: int
    n_groups_different_slide_no: int
    n_groups_fully_identical_rows: int
    n_duplicate_slide_no_records: int
    n_duplicate_slide_no_groups: int
    duplicate_slide_no_detail: list = field(default_factory=list)


def audit_duplicates(gdf: gpd.GeoDataFrame, id_col: str = "SLIDE_NO") -> DuplicateAuditResult:
    """Runs the coordinate- and ID-based duplicate audit. Read-only."""
    xy = gdf.geometry.apply(lambda g: (round(g.x, 6), round(g.y, 6)))
    dup_coord_mask = xy.duplicated(keep=False)
    dup_coord = gdf[dup_coord_mask].copy()
    dup_coord["_xy"] = xy[dup_coord_mask]

    attr_cols = [c for c in gdf.columns if c not in _IDENTITY_EXCLUDE_COLS]
    same_id_groups = 0
    diff_id_groups = 0
    identical_row_groups = 0
    n_groups = 0
    for _, g in dup_coord.groupby("_xy"):
        n_groups += 1
        if g[id_col].nunique() == 1:
            same_id_groups += 1
        else:
            diff_id_groups += 1
        if g[attr_cols].drop_duplicates().shape[0] == 1:
            identical_row_groups += 1

    dup_id_mask = gdf[id_col].duplicated(keep=False) & gdf[id_col].notna()
    dup_id = gdf[dup_id_mask]
    detail = []
    for id_val, g in dup_id.groupby(id_col):
        same_coords = g.geometry.apply(lambda geo: (round(geo.x, 6), round(geo.y, 6))).nunique() == 1
        identical = g[attr_cols].drop_duplicates().shape[0] == 1
        detail.append({
            "id": id_val, "n": len(g), "same_coordinates": bool(same_coords),
            "fully_identical_rows": bool(identical), "states": g["STATE"].unique().tolist(),
        })

    return DuplicateAuditResult(
        n_duplicate_coordinate_records=len(dup_coord),
        n_duplicate_coordinate_groups=n_groups,
        n_groups_same_slide_no=same_id_groups,
        n_groups_different_slide_no=diff_id_groups,
        n_groups_fully_identical_rows=identical_row_groups,
        n_duplicate_slide_no_records=len(dup_id),
        n_duplicate_slide_no_groups=dup_id[id_col].nunique() if len(dup_id) else 0,
        duplicate_slide_no_detail=detail,
    )


def assign_canonical_event_id(gdf: gpd.GeoDataFrame, primary_key_col: str = "OBJECTID") -> pd.Series:
    """The ONLY conclusively justified rule from this audit: use
    `primary_key_col` (OBJECTID, confirmed unique across all 8,546 NER
    records) as the canonical per-record event identifier for any
    leakage-audit grouping (e.g. leakage_audit.check_duplicate_event_leakage),
    INSTEAD of SLIDE_NO -- SLIDE_NO is demonstrably non-unique (22
    records share a value with another record, none of which are fully
    identical rows) and cannot be trusted as a group key without further
    GSI-side verification. This function does not deduplicate anything;
    it only returns the column to use as a reliable identifier.
    """
    if not gdf[primary_key_col].is_unique:
        raise ValueError(f"'{primary_key_col}' is not unique in this GeoDataFrame; cannot use as canonical ID.")
    return gdf[primary_key_col]
