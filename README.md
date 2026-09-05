# SIH26001 — AI-Based Landslide Early-Warning and Resilient Disaster Monitoring System

## Problem Statement Reference

SIH26001: A decision-support system that estimates landslide risk for selected
geographic zones and communicates that risk to authorities and, where
appropriate, at-risk populations — even when connectivity is degraded or lost.

## What This Project Is

This is a **disaster-risk decision-support prototype**, not a certified
early-warning system. It combines historical landslide records, rainfall
data, terrain/DEM-derived features, and satellite/environmental indicators
into a machine-learning risk model, then surfaces that risk through a GIS
dashboard with configurable alerting.

**This system does not, and will not, claim 100% predictive accuracy.**
Landslide occurrence is influenced by factors (subsurface hydrology, soil
composition, unmonitored micro-triggers) that cannot be fully captured by
any remote-sensing/tabular dataset. The engineering goal is the **highest
defensible predictive performance**, achieved through rigorous data
quality control, leakage prevention, spatial and temporal validation,
probability calibration, and explicit false-negative analysis — not
through inflated claims. See [`docs/validation_strategy.md`](docs/validation_strategy.md).

## Core Architecture

```
React + TypeScript + Leaflet              (Dashboard / Frontend)
        ↓
Spring Boot + Spring Security + JPA/Hibernate   (Orchestration / API / Auth)
        ↓
PostgreSQL + PostGIS                       (Spatial data store)
        ↓
FastAPI ML Service                         (Model serving)
        ↓
Python ML Pipeline                         (Feature engineering, training)
        ↓
Logistic Regression / Random Forest / XGBoost / LightGBM   (Candidate models)
        ↓
SHAP Explainability                        (Per-prediction feature attribution)
```

Full detail in [`docs/architecture.md`](docs/architecture.md).

## Repository Structure

```
SIH26001/
├── backend/
│   └── springboot/        # Spring Boot orchestration service (API, auth, alert dispatch)
├── ml-service/
│   ├── data/
│   │   ├── raw/            # Immutable original data dumps (never edited in place)
│   │   ├── interim/        # Intermediate cleaning/transform outputs
│   │   ├── processed/      # Final, model-ready feature tables
│   │   └── external/       # Third-party reference data (DEM, rainfall grids, etc.)
│   ├── notebooks/          # Exploratory analysis, never imported by pipeline code
│   ├── src/
│   │   ├── data/            # Data loading / ingestion / validation code
│   │   ├── features/        # Feature engineering (terrain, rainfall, satellite)
│   │   ├── models/          # Training, evaluation, calibration code
│   │   └── explainability/  # SHAP-based explanation generation
│   ├── models/              # Serialized trained model artifacts (git-ignored)
│   ├── reports/             # Evaluation reports, metrics, validation output
│   └── tests/               # ML pipeline unit/integration tests
├── frontend/
│   └── react/              # React + TypeScript + Leaflet dashboard
├── gis/
│   ├── raw/                 # Original shapefiles / rasters as received
│   ├── processed/           # Cleaned/reprojected GIS layers
│   └── zones/               # Defined monitoring zone boundaries
├── docs/                   # Architecture and strategy documentation
├── scripts/                # Cross-service automation/dev scripts
├── docker/                 # Per-service Dockerfiles and shared Docker assets
├── docker-compose.yml      # Local multi-service orchestration
├── .gitignore
└── README.md
```

## Status

**Current phase: repository scaffolding and architecture documentation only.**
No application code, ML training, datasets, or infrastructure has been
implemented yet. See the Recommended Implementation Order below for what
comes next.

## Key Engineering Principles (binding for all future work)

1. No fabricated datasets, APIs, or accuracy numbers — ever, including in demos.
2. No hard-coded fake production results presented as if real.
3. Demo/mock data must be clearly and mechanically distinguishable from real data
   (naming convention + config flag, not just a comment).
4. Secrets only via environment variables — never committed.
5. Tests are required for non-trivial backend and ML logic.
6. Services are containerized where practical.
7. Services stay modular and independently deployable.
8. Every non-trivial architectural decision is documented in `docs/`.
9. Existing code/structure is inspected before new work is added; avoid
   unnecessary rewrites.
10. When a data source, API, or requirement is uncertain, the assumption is
    documented explicitly and the interface is made configurable rather than
    hard-coded — implementation does not silently proceed on a guess.

## Critical Product Logic: Connectivity vs. Risk

**Internet/connectivity loss alone is never treated as evidence of a landslide.**

```
HIGH/CRITICAL ML RISK  +  CONNECTIVITY ANOMALY  =  PRIORITY VERIFICATION ALERT
```

Connectivity loss by itself (with no elevated ML risk) is logged as an
infrastructure/monitoring event, not a disaster signal. See
[`docs/architecture.md`](docs/architecture.md#connectivity-anomaly-vs-landslide-inference)
for the full state model.

## Planned Capabilities (not yet implemented)

- GIS-based landslide risk zones rendered on a Leaflet map
- Historical landslide record ingestion
- Rainfall feature pipeline
- DEM-derived terrain feature pipeline (slope, aspect, curvature, etc.)
- Satellite/environmental feature pipeline
- ML-based risk classification with calibrated probabilities
- SHAP-based per-prediction explainability
- Authority-facing dashboard (React)
- SMS alerting (behind a channel abstraction)
- Automated voice-call alerting (behind the same channel abstraction)
- Connectivity anomaly detection
- Offline cached / last-known risk state
- Store-and-forward sync when connectivity returns
- Optional ESP32 edge-sensor ingestion (tilt, soil moisture, vibration) —
  explicitly optional; the MVP must function with zero hardware.

## Documentation Index

- [`docs/architecture.md`](docs/architecture.md) — system architecture, service
  responsibilities, connectivity/verification state model
- [`docs/data_sources.md`](docs/data_sources.md) — researched, verified candidate
  data sources for all 11 required categories, with official URLs, license
  terms, and the pilot-region recommendation
- [`docs/data_strategy.md`](docs/data_strategy.md) — sourcing decisions, raw/interim/processed
  conventions, mock-vs-real data policy, open assumptions
- [`docs/data_dictionary.md`](docs/data_dictionary.md) — proposed training-table
  fields and their availability status
- [`docs/inventory_metadata_report.md`](docs/inventory_metadata_report.md) — verified
  metadata about the primary landslide inventory, drawn from the peer-reviewed source paper
- [`docs/temporal_alignment.md`](docs/temporal_alignment.md) — event window, observation
  windows, static/dynamic variables, and the leakage-prevention temporal rule
- [`docs/negative_sampling.md`](docs/negative_sampling.md) — evaluated and selected
  negative-sampling strategy, with its documented confidence limits
- [`docs/spatial_representation.md`](docs/spatial_representation.md) — spatial unit
  decision (point vs. grid vs. admin unit vs. custom zone)
- [`docs/spatial_alignment.md`](docs/spatial_alignment.md) — native resolution of every
  input, CRS handling plan, resampling methodology
- [`docs/leakage_audit.md`](docs/leakage_audit.md) — status of the five required
  automated leakage checks
- [`docs/validation_strategy.md`](docs/validation_strategy.md) — spatial/temporal
  validation, leakage prevention, calibration, false-negative analysis plan
- [`docs/features.md`](docs/features.md) — planned feature categories and their
  data dependencies

## Status Update — Phase 3 (Dataset Construction): NOT READY FOR TRAINING

Phase 3 attempted to acquire the primary landslide inventory (Hao et
al., 2020) and build a validated training dataset. **The raw dataset
file could not be downloaded in this sandboxed environment** — network
egress is restricted to a software-package allowlist that excludes
every required scientific/geospatial data host, confirmed by direct
testing (see `ml-service/data/raw/kerala_landslide_inventory_2018/ACQUISITION_STATUS.md`).
Real, verified dataset metadata was still obtained from the peer-reviewed
source paper's full text. A complete, tested (on synthetic data) data-
quality and leakage-audit pipeline, a negative-sampling strategy, a
spatial representation decision, and a temporal-alignment plan were all
built and documented — see the Documentation Index above. No model
training has occurred, consistent with the project's rule against
proceeding on assumptions where real data is required.

## Recommended Implementation Order

See the end of this document's companion inspection report for the phased
build order (infra skeleton → data strategy finalization → ML pipeline →
FastAPI serving → Spring Boot orchestration → React dashboard → alerting →
offline/connectivity layer → optional edge layer).
