"""
ml-service/src/features/feature_table_schema.py

Defines the target feature-table schema for the first model iteration,
and a scaffold function for assembling it. This module defines
STRUCTURE, not data — it cannot be run end-to-end until the raw
landslide inventory and the other input layers (DEM, rainfall, land
cover, NDVI, soil) are actually acquired (see
ml-service/data/raw/kerala_landslide_inventory_2018/ACQUISITION_STATUS.md
and docs/data_sources.md for the acquisition plan for every other layer).

STATUS: schema defined and documented; assembly function is a scaffold
that will raise NotImplementedError until real input readers exist. It
is written now so the exact contract is explicit and reviewable before
any real feature is computed, and so downstream code (quality checks,
leakage audit, negative sampling) has a concrete table shape to target.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class Availability(str, Enum):
    AVAILABLE = "AVAILABLE"
    TO_VERIFY = "TO_VERIFY"
    OPTIONAL = "OPTIONAL"
    NOT_AVAILABLE = "NOT_AVAILABLE"


@dataclass
class FeatureSpec:
    name: str
    description: str
    source: str
    availability: Availability
    notes: str = ""


# This list mirrors docs/data_dictionary.md exactly -- that document is
# the authoritative, human-readable version; this is the machine-usable
# mirror used to drive schema validation in the pipeline. If the two
# diverge, docs/data_dictionary.md should be treated as the source of
# truth and this list updated to match, not the other way around.
FEATURE_TABLE_SCHEMA = [
    FeatureSpec("zone_id", "Spatial unit identifier", "internal (see docs/spatial_representation.md)", Availability.TO_VERIFY,
                "Grid cell representation selected; exact cell size not yet decided."),
    FeatureSpec("timestamp_or_event_window", "Prediction reference time T, or event window if T undefined", "derived (see docs/temporal_alignment.md)", Availability.TO_VERIFY,
                "No per-record date exists in the source inventory; T must be defined via a documented method (e.g. peak-rainfall proxy), not assumed."),
    FeatureSpec("geometry_reference", "Zone centroid or polygon reference", "internal", Availability.AVAILABLE),
    FeatureSpec("rainfall_6h", "6-hour antecedent rainfall", "GPM IMERG", Availability.AVAILABLE,
                "Requires NASA Earthdata access; not yet acquired in this environment."),
    FeatureSpec("rainfall_24h", "24-hour antecedent rainfall", "IMD gridded daily / GPM IMERG", Availability.AVAILABLE),
    FeatureSpec("rainfall_72h", "72-hour antecedent rainfall", "IMD gridded daily / GPM IMERG", Availability.AVAILABLE),
    FeatureSpec("rainfall_7d", "7-day antecedent rainfall", "IMD gridded daily", Availability.AVAILABLE),
    FeatureSpec("elevation", "Elevation in meters", "SRTM 30m DEM", Availability.AVAILABLE),
    FeatureSpec("slope", "Slope angle, derived from DEM", "SRTM 30m DEM (derived)", Availability.AVAILABLE),
    FeatureSpec("aspect", "Slope-facing direction, derived from DEM", "SRTM 30m DEM (derived)", Availability.AVAILABLE),
    FeatureSpec("curvature", "Plan/profile curvature, derived from DEM", "SRTM 30m DEM (derived)", Availability.AVAILABLE),
    FeatureSpec("land_cover", "Land cover class", "ESA WorldCover 10m (2021)", Availability.AVAILABLE,
                "2021 vintage; documented mismatch vs. the 2018 event date, see docs/temporal_alignment.md."),
    FeatureSpec("ndvi", "Vegetation index", "MODIS MOD13Q1 250m", Availability.AVAILABLE),
    FeatureSpec("soil_features", "Soil organic carbon, pH, texture, bulk density", "SoilGrids 2.0", Availability.AVAILABLE,
                "Modeled, not measured; REST API confirmed paused at research time -- bulk file access assumed."),
    FeatureSpec("historical_landslide_features", "Prior landslide count/context", "Hao et al. (2020) inventory", Availability.NOT_AVAILABLE,
                "EXCLUDED for the MVP -- leakage risk given single-event inventory, see docs/temporal_alignment.md \u00a75."),
    FeatureSpec("target", "Binary landslide occurrence label", "Hao et al. (2020) positives + designed negative sample", Availability.TO_VERIFY,
                "Positives available in principle; negative-sampling strategy designed (docs/negative_sampling.md) but not executed -- raw data not acquired."),
]


def print_schema_report() -> str:
    lines = ["Field | Availability | Notes", "---|---|---"]
    for spec in FEATURE_TABLE_SCHEMA:
        lines.append(f"{spec.name} | {spec.availability.value} | {spec.notes}")
    return "\n".join(lines)


def assemble_feature_table(*args, **kwargs):
    """Scaffold only. Raises until real input readers (DEM, rainfall,
    land cover, NDVI, soil, and the acquired landslide inventory) exist
    and are wired in. This function intentionally does not return a
    fabricated or synthetic feature table dressed up as real -- see
    ml-service/reports/dataset_quality_report.md for why.
    """
    raise NotImplementedError(
        "assemble_feature_table cannot run yet: the raw landslide inventory "
        "and other input layers have not been acquired in this environment. "
        "See ml-service/data/raw/kerala_landslide_inventory_2018/ACQUISITION_STATUS.md."
    )
