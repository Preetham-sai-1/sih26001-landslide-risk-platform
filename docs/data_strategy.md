# Data Strategy

Status: **Phase 3 complete — dataset construction attempted and found
NOT READY FOR TRAINING.** Phase 2 identified and recommended sources
(see `docs/data_sources.md`). Phase 3 attempted to actually acquire the
primary landslide inventory and build a validated training dataset
around it. **The raw dataset file could not be downloaded in this
sandboxed environment** (network egress restricted to a software-package
allowlist that excludes every required scientific/geospatial data host;
confirmed by direct testing — see
`ml-service/data/raw/kerala_landslide_inventory_2018/ACQUISITION_STATUS.md`).
Real, verified metadata about the dataset was still obtained from the
peer-reviewed source paper's full text (see
`docs/inventory_metadata_report.md`), and a complete negative-sampling
strategy, spatial representation decision, temporal alignment plan, and
tested (on synthetic data) quality/leakage-check pipeline were built —
see `docs/negative_sampling.md`, `docs/spatial_representation.md`,
`docs/temporal_alignment.md`, `docs/spatial_alignment.md`, and
`docs/leakage_audit.md`. No model training has occurred and none should
until a human obtains the raw file and the pipeline is re-run against it.

## 1. Pilot Region

**Kerala (Western Ghats), focused on the districts affected by the
August 2018 monsoon landslide disaster.** Chosen because it is the only
Indian region for which this research found a landslide inventory that
is simultaneously real, DOI-verifiable, peer-reviewed, methodologically
transparent, and large enough (4,728 points) to support supervised
learning — see `docs/data_sources.md` §"Pilot Region Recommendation" for
the full comparison against Uttarakhand and other Western Ghats states,
and for the explicit limitations of this choice (single-event inventory,
not a multi-year time series).

## 2. Data Categories and Sourcing Decisions

| Category | Recommended source (Priority A) | Status |
|---|---|---|
| Historical landslide records | Hao et al. (2020) Kerala 2018 monsoon inventory, DOI 10.17026/dans-x6c-y7x2 (4,728 points) | Verified (peer-reviewed, DOI-backed). Single-event only — negative sampling strategy and multi-event expansion are open design items. |
| Rainfall | IMD 0.25° daily gridded rainfall (1901–2024), imdpune.gov.in | Verified, free direct download. GPM IMERG (0.1°, half-hourly, NASA) recommended as a complementary finer-resolution source. |
| Terrain / DEM | USGS SRTM 1 arc-second (30 m), via EarthExplorer | Verified, free, simple reproducible download path. ISRO/NRSC CartoDEM (30 m, India-specific) tracked as a higher-value upgrade once Bhoonidhi portal access is confirmed. |
| Satellite imagery | Copernicus Sentinel-2 (10 m, ~5-day revisit), Copernicus Data Space Ecosystem | Verified, free API access. Monsoon-season cloud cover is a documented limitation. |
| Land cover | ESA WorldCover 10 m 2021 (v200), CC-BY 4.0 | Verified, free, permissive license, independently validated 76.7% overall accuracy (ESA's figure for the product, not a claim about our model). |
| Vegetation / NDVI | MODIS MOD13Q1 (250 m, 16-day), NASA LP DAAC | Verified, free, no usage restriction, 25+ year record. |
| Soil / environmental | SoilGrids 2.0 (ISRIC), 250 m, ODbL | Verified dataset; **REST API confirmed paused at time of research** — bulk file access is the assumed path until re-verified. Modeled (not measured) data — a real accuracy caveat. |
| Administrative boundaries | geoBoundaries (CC-BY, commercial-friendly) preferred; GADM (non-commercial-only license) as an alternative | Verified. Survey of India (the official authority) is **UNVERIFIED** — open item, see `docs/data_sources.md` §8.3. |
| Villages / populated places | OpenStreetMap via Overpass API, ODbL | Verified access mechanism; **completeness in the pilot region is not yet spot-checked** — treat population figures as approximate. Census of India village directory is **UNVERIFIED** — open item. |
| Roads | OpenStreetMap via Overpass API, ODbL | Verified access mechanism; same rural-completeness caveat as villages. |
| Critical infrastructure | OpenStreetMap infrastructure tags, ODbL | Verified access mechanism but **lower reliability than roads/villages** — Priority C (future/optional), not an MVP dependency. No stronger authoritative source identified yet. |

Full detail — official URLs, API/download mechanisms, exact resolutions,
license text, authentication requirements, advantages, and limitations
for every candidate (including alternatives not selected above) — is in
`docs/data_sources.md`. This table is a summary, not a replacement for
that document.

## 2. Directory Conventions (`ml-service/data/`)

- **`raw/`** — data exactly as obtained from its source. Never edited in
  place. If a source file needs correction, the correction happens in a
  documented processing step that writes to `interim/` or `processed/`,
  never by hand-editing `raw/`.
- **`interim/`** — intermediate outputs of cleaning/joining/reprojection
  steps. Reproducible from `raw/` by re-running the relevant script in
  `ml-service/src/data/`.
- **`processed/`** — final, model-ready feature tables (one row per
  zone × time-period, or equivalent), reproducible from `interim/`.
- **`external/`** — reference data not specific to this project's own
  collection (e.g. a public DEM tile, an administrative boundary file)
  that is fetched rather than generated by our own pipeline.

All four directories are git-ignored for actual data content (see
`.gitignore`); only `.gitkeep` placeholders and, where practical, small
schema/sample files are committed. Large or licensed data does not belong
in version control.

## 3. Mock vs. Real Data Policy

Because this is a hackathon MVP being built before real data is fully
sourced, some development (e.g. UI work, API contract testing) may need
placeholder data. The following rules are binding for all future work:

1. Mock/demo data lives under a path or naming convention that makes it
   unambiguous — e.g. a `demo=true` flag on seed data, or a clearly
   separated `*_mock.*` / `*_demo.*` file naming pattern (exact
   convention to be finalized in the ML/backend implementation phase and
   documented here once chosen).
2. Mock data is never used to compute or report a model accuracy figure
   presented as if it came from real evaluation.
3. Any dashboard or demo view built against mock data must visibly
   indicate that it is showing demo data, not live model output.
4. Switching between mock and real data sources is a configuration
   change (environment variable / config flag), not a code change.

## 4. Data Quality and Leakage-Prevention Principles

These principles govern the eventual feature-engineering work in
`ml-service/src/features/` and are elaborated with concrete validation
mechanics in `docs/validation_strategy.md`:

- Features must be computable using only information that would actually
  be available *before* the prediction date in a real deployment (no use
  of future rainfall, future satellite imagery, or post-event data when
  constructing a "pre-event" feature row).
- Any join between historical landslide records and environmental/terrain
  data must be checked for spatial and temporal misalignment before being
  trusted.
- Class imbalance (landslide events are rare relative to non-event
  zone/time combinations) will be handled explicitly and documented —
  not silently ignored, and not "fixed" by inflated accuracy reporting.

## 5. Open Assumptions and Remaining Items (explicitly tracked, not resolved by assumption)

Phase 2 resolved *which sources are candidates and which is recommended*
for each category (§2 above). The following remain genuinely open and
must be resolved with real information — not assumed — before the
corresponding implementation begins:

- **Exact monitoring zone definition** (geographic extent within Kerala,
  granularity — e.g. district, sub-district, or a custom grid) — not yet
  decided; depends on how finely the Hao et al. (2020) landslide points
  cluster and on what the backend's zone schema ends up needing.
- **Negative-sampling strategy** for the single-event Kerala inventory
  (how "no landslide occurred here" examples are constructed) — this is
  a validation-critical decision deferred to `docs/validation_strategy.md`
  and the ML pipeline design phase, not decided here.
- **GSI Bhukosh's exact download/API mechanism** — marked TO VERIFY in
  `docs/data_sources.md` §1.1; needed if Bhukosh is used as a
  cross-validation source for the primary Kerala inventory.
- **SoilGrids REST API status** — confirmed paused at research time;
  must be re-checked before the pipeline depends on it, with bulk-file
  access as the fallback.
- **GADM vs. geoBoundaries licensing decision** — depends on how
  SIH26001's outputs will actually be distributed/used; GADM's
  non-commercial restriction may or may not be acceptable.
- **Survey of India's official boundary requirements** — UNVERIFIED; India
  has a general expectation that published maps use SOI-approved
  boundaries, which has not been investigated yet.
- **Census of India village-level data access** — UNVERIFIED; needed if
  OSM population data proves too sparse for the pilot region.
- **The definition of "connectivity anomaly"** (see `docs/architecture.md`
  §5) in concrete, measurable terms (e.g. missed-heartbeat threshold) —
  unrelated to data sourcing, still open from Phase 1.

Each of these will be resolved through a documented decision (this file,
`docs/data_sources.md`, or a linked ADR) before the corresponding
implementation begins, and the interface will be built configurably so
the specific choice can change without a rewrite.

## 6. Status Update — Phase 4 (Training Dataset Build)

A real prediction grid, real landslide labels, and a real candidate
negative set were built and quality-checked against the actual Kerala
2018 inventory — see `docs/training_dataset_build.md` for the full
account, including two genuine pipeline bugs found and fixed by testing
against real data. **No external feature source (rainfall, DEM, land
cover, NDVI, soil) has been acquired** — the network restriction
documented in Phase 3 was re-verified and still applies. Consequently
`ml-service/data/processed/training_dataset.parquet` was **not**
created; `ml-service/data/interim/` holds the real, labels-only
grid/negative artifacts instead. Phase 4 also documented, explicitly,
that this Kerala work is pipeline-development only and does **not**
represent the North Eastern Region, which is the project's actual SIH
target and for which no landslide inventory has yet been sourced — see
`docs/training_dataset_build.md` §1.
