"""
ml-service/src/data/ner_temporal_policy.py

Reproducible temporal-eligibility classification for the NER landslide
inventory's INITIATION year field. Read-only: never modifies source
records, never fabricates a missing year. Classifies each record into
exactly one temporal-eligibility group, to be used by future
feature-joining code (not implemented here) to decide whether a record
may receive time-dependent (rainfall/soil-moisture/dated-satellite)
features or only static (DEM/soil-property/single-snapshot-land-cover)
features.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import pandas as pd
import geopandas as gpd

MISSING_YEAR_SENTINEL = 0
PLAUSIBLE_YEAR_MIN = 1901  # IMD's gridded rainfall record begins 1901 (docs/data_sources.md 2.1)
PLAUSIBLE_YEAR_MAX = 2026  # current project year; a later year would itself be implausible, not fabricated

TemporalGroup = Literal["time_dependent_eligible", "missing_year_static_only", "implausible_year_flagged"]


def classify_temporal_eligibility(gdf: gpd.GeoDataFrame, year_col: str = "INITIATION") -> pd.Series:
    """Assigns exactly one of three groups per record:

    - "time_dependent_eligible": year present and within a plausible
      range. Eligible IN PRINCIPLE for rainfall/soil-moisture/dated-
      satellite features once those sources exist -- eligibility here
      does NOT mean a specific day-level reference date has been
      defined (see module docstring / docs/ner_temporal_policy.md for
      the remaining open item: year alone cannot anchor a 24h/3d/7d/30d
      rainfall window without an additional, separately-justified
      within-year reference-date method).
    - "missing_year_static_only": year is the missing-sentinel (0).
      Must never receive any time-dependent feature -- doing so would
      require fabricating a date. Only static features (terrain, soil
      properties, or a land-cover/NDVI snapshot used as undated context
      per the same caveat already applied to Kerala's WorldCover
      mismatch) may be joined to these records.
    - "implausible_year_flagged": year is present but outside
      [PLAUSIBLE_YEAR_MIN, PLAUSIBLE_YEAR_MAX] -- not expected in this
      dataset (none found in the real 8,546-record audit) but checked
      explicitly rather than assumed absent.
    """
    years = gdf[year_col]
    is_missing = years == MISSING_YEAR_SENTINEL
    is_implausible = (~is_missing) & ((years < PLAUSIBLE_YEAR_MIN) | (years > PLAUSIBLE_YEAR_MAX))
    is_eligible = (~is_missing) & (~is_implausible)

    result = pd.Series(index=gdf.index, dtype="object")
    result[is_eligible] = "time_dependent_eligible"
    result[is_missing] = "missing_year_static_only"
    result[is_implausible] = "implausible_year_flagged"
    return result


@dataclass
class TemporalPolicySummary:
    total_records: int
    time_dependent_eligible: int
    missing_year_static_only: int
    implausible_year_flagged: int
    per_state_missing_pct: dict


def summarize_temporal_policy(gdf: gpd.GeoDataFrame, year_col: str = "INITIATION", state_col: str = "STATE") -> TemporalPolicySummary:
    groups = classify_temporal_eligibility(gdf, year_col)
    per_state_missing = (
        gdf.assign(_group=groups)
        .groupby(state_col)["_group"]
        .apply(lambda s: round((s == "missing_year_static_only").mean() * 100, 1))
        .to_dict()
    )
    counts = groups.value_counts()
    return TemporalPolicySummary(
        total_records=len(gdf),
        time_dependent_eligible=int(counts.get("time_dependent_eligible", 0)),
        missing_year_static_only=int(counts.get("missing_year_static_only", 0)),
        implausible_year_flagged=int(counts.get("implausible_year_flagged", 0)),
        per_state_missing_pct=per_state_missing,
    )
