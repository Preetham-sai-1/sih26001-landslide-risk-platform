# Feature Plan

Status: **planning document**. Lists planned feature *categories* and
their intended source category and computation approach at a conceptual
level. No feature has been computed yet; no specific dataset, API, or
column name is asserted as already available, since none has been
sourced (see `docs/data_strategy.md`).

## 1. Feature Categories

### 1.1 Terrain / DEM-derived

Computed from a Digital Elevation Model once one is sourced, using
`rasterio`/`GDAL`/`GeoPandas`/`Shapely` in `ml-service/src/features/`.

Planned features (standard terrain-stability indicators in landslide
literature; not all may prove available or useful depending on DEM
resolution actually obtained):
- Slope
- Aspect
- Curvature (plan/profile)
- Elevation
- Terrain roughness / relief
- Flow accumulation / drainage-related indices, if DEM resolution supports it

### 1.2 Rainfall

Computed once a rainfall data source is selected (see `docs/data_strategy.md`
§1 — not yet chosen):
- Antecedent rainfall over configurable windows (e.g. short- and
  long-term accumulation; exact windows to be tuned against real data,
  not fixed here)
- Rainfall intensity measures
- Anomaly relative to local/seasonal baseline, if baseline data is
  available

### 1.3 Satellite / Environmental

Computed once a satellite/environmental data source is selected:
- Land cover / land use classification
- Vegetation indices (e.g. NDVI-style indicators), if source imagery
  supports it
- Soil moisture, if a suitable source is available

### 1.4 Historical / Contextual

Derived from the historical landslide inventory once sourced:
- Prior event frequency in a zone (careful handling required so this
  does not leak future information — see `docs/validation_strategy.md`)
- Zone-level static attributes derived from geology/land-use reference
  data, where available

### 1.5 Zone Identity

- Zone identifier and geometry, joined from `gis/zones/`, used both as a
  join key and as the spatial unit the model predicts over.

## 2. Feature Engineering Pipeline (planned structure)

```
ml-service/src/data/          → load and validate raw inputs
ml-service/src/features/       → compute the categories above, per zone/time
ml-service/src/models/         → train/evaluate on the resulting feature table
ml-service/src/explainability/ → SHAP values computed against the trained model
```

Each stage is expected to be a set of composable, testable functions
(tested via `ml-service/tests/`) rather than a single monolithic script,
so that feature computation can be validated independently of model
training.

## 3. Explainability (SHAP)

Once a model is trained (see `docs/validation_strategy.md`), SHAP will be
used to generate:
- Global feature importance across the validation set, to sanity-check
  that the model is relying on physically plausible features (e.g.
  rainfall and slope should matter; an accidental leakage feature should
  not dominate).
- Per-prediction local explanations, served alongside each risk
  prediction from the FastAPI ML service, so the authority dashboard can
  show *why* a zone is flagged, not just a bare risk score.

## 4. Explicit Non-Commitments

This document intentionally does not specify:
- Exact column names or units (depends on the real data source's schema).
- Exact time windows for rainfall accumulation (to be tuned against real
  data).
- Which specific satellite product/index will be used (source not yet
  selected).

These will be filled in — and this document updated — once the
corresponding data source is actually selected and evaluated, per
`docs/data_strategy.md`.

## 5. Status Update — Phase 4

The spatial unit these features will eventually attach to is now
concrete: a 1km x 1km grid cell (42,620 real cells generated over the
Kerala proxy study area) — see `docs/training_dataset_build.md` §5 for
the resolution decision and reasoning. No feature in §1 above has
actually been computed yet; all remain blocked on external data
acquisition (rainfall, DEM, land cover, NDVI, soil — see
`docs/training_dataset_build.md` §3, §9). This section is a pointer,
not a restatement, to avoid the two documents drifting out of sync.
