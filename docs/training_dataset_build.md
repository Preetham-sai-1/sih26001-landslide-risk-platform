# Training Dataset Build (Phase 4)

Status: **Real pipeline run against the real Kerala 2018 inventory.
Blocked on external feature data before a full training table can be
produced.** This document is the authoritative record of what was
actually built, what is real vs. proxy, and what remains blocked.

---

## 1. Training Geography: Kerala vs. the North Eastern Region

**This section exists specifically to prevent an incorrect claim that
Kerala data represents the North Eastern Region (NER). It does not.**

| | Kerala 2018 dataset (in hand) | North Eastern Region (SIH target) |
|---|---|---|
| Status | Real, verified, forensically audited (Phase 3B), 4,728 labeled points | **No labeled landslide inventory has been identified, sourced, or acquired for NER in this project.** |
| Role in this project | **Pipeline-development and methodology-validation dataset.** Used to build, test, and debug the grid construction, labeling, negative-sampling, quality-check, and leakage-audit code against real (not synthetic) geometry and real (not synthetic) label counts. | **The actual eventual deployment target**, per the SIH26001 problem statement's stated scope. |
| What it proves | That the data-engineering pipeline works correctly against a real, non-trivial labeled dataset (real bugs were found and fixed this phase — see §5). | Nothing about NER specifically. Kerala's terrain (Western Ghats), monsoon rainfall regime, geology, and land-use patterns are not asserted to generalize to the Eastern Himalaya / NER terrain, climate, or geology. |
| What it does NOT prove | Anything about model accuracy, feature importance, or risk patterns in any other region, including NER. | — |

**Explicit statement, per this phase's instructions:** Kerala 2018 is
**not** claimed to be representative of the North Eastern Region, with
or without evidence — no such evidence has been gathered, and this
project has not attempted to gather it. Any eventual NER-facing model
requires its own NER-specific landslide inventory, rainfall data,
terrain data, and land-cover data, sourced and audited with the same
rigor applied to the Kerala dataset in Phases 2–3B. This is a
**named, tracked blocker**, not a gap to paper over with the Kerala
data.

**Preserved project decision:** consistent with Phase 2's pilot-region
reasoning (`docs/data_sources.md` §"Pilot Region Recommendation"),
Kerala remains the correct choice for *building and validating the
pipeline itself*, precisely because it is the only region with a
verified, peer-reviewed, DOI-backed, now-directly-audited inventory
available to this project. This Phase 4 work is explicitly framed as
**pipeline development**, not as progress toward an NER-deployable
model.

---

## 2. What Already Existed (Step 1 — Repository Inspection)

Read in full before any new work began, per instructions:

- `docs/data_sources.md` — Phase 2 candidate source research (11 categories, pilot region recommendation)
- `docs/data_strategy.md` — sourcing decisions and open assumptions
- `docs/data_dictionary.md` — proposed training-table schema with AVAILABLE/TO VERIFY/OPTIONAL/NOT AVAILABLE tags
- `docs/inventory_attribute_audit.md` — Phase 3B's real, executed forensic audit of the actual shapefile
- `docs/negative_sampling.md` — the selected negative-sampling strategy (buffered, coverage-aware, spatially stratified), with buffer distance and ratio left as open parameters
- `docs/validation_strategy.md` — spatial/temporal CV methodology, leakage checklist, calibration/false-negative-analysis plan
- `docs/features.md` — planned feature categories
- `ml-service/src/data/feature_policy.yaml` — machine-readable allowed/excluded field policy from Phase 3B, with every one of the 20 raw shapefile fields accounted for

Existing code inspected: `ml-service/src/data/quality_checks.py`,
`leakage_audit.py`, `negative_sampling.py` (point-based, from Phase 3),
`ml-service/src/features/feature_table_schema.py` (Phase 3 schema
scaffold), and the full existing test suite (20 tests, all passing at
the start of this phase).

**What was missing (confirmed, not assumed):** a grid-based spatial
representation actually implemented and run; reusable raster
standardization utilities; any real quality/leakage check actually
executed against real geometry; a documented, concrete grid-cell-size
decision (`docs/spatial_representation.md` had explicitly left this
open); and any of the 10 non-landslide external data categories
actually downloaded.

**No existing functionality was duplicated.** The point-based
`ml-service/src/data/negative_sampling.py` from Phase 3 (built before
the real inventory was available) is preserved unmodified; this phase
adds a **grid-cell-based** implementation (`ml-service/src/features/grid.py`)
because Step 6 of this phase requires a grid representation, which the
point-based module does not provide. Both remain in the repository;
`docs/negative_sampling.md` should be treated as the strategy document
governing both, and this document (`docs/training_dataset_build.md`)
records that the grid-based implementation is the one actually
exercised against real data in Phase 4.

---

## 3. Data Source Acquisition Status (Step 3)

Re-verified by direct network testing in this session (not assumed
carried over from Phase 3): `curl` to the DOI resolver, `data.humdata.org`,
USGS EarthExplorer, Copernicus Data Space, IMD, ISRIC, and GADM all
returned **HTTP 403** — the sandbox's network egress remains restricted
to a software-package allowlist that excludes every required
geospatial/scientific data host. See `ml-service/data/external/manifest.yaml`
for the full per-category breakdown (machine-readable).

| Category | Status |
|---|---|
| Landslide inventory | **ACQUIRED** (Kerala 2018, Phase 3B) |
| Rainfall | NOT ACQUIRED |
| DEM / elevation | NOT ACQUIRED |
| Slope / aspect / curvature | NOT DERIVABLE (depends on DEM) |
| Land cover | NOT ACQUIRED |
| NDVI / vegetation | NOT ACQUIRED |
| Soil | NOT ACQUIRED |
| Administrative boundaries | NOT ACQUIRED |
| Roads | NOT ACQUIRED |
| Villages / populated places | NOT ACQUIRED |
| Critical infrastructure | NOT ACQUIRED (Priority C, not blocking) |

**No dataset is claimed available merely because a URL exists for it** —
every "NOT ACQUIRED" row reflects an actual, tested, failed access
attempt in this session or (for sources not re-tested individually) the
identical, still-unresolved blocker documented in Phase 3.

---

## 4. Data Directory Structure (Step 4)

The repository's existing convention — `ml-service/data/{raw,interim,processed,external}`
— already satisfies this requirement and was **preserved, not
duplicated**. No new top-level `data/` directory was created outside
`ml-service/`, consistent with the instruction to preserve existing
structure unless modification is necessary.

Manifests added this phase (all real, none fabricated):

- `ml-service/data/raw/kerala_landslide_inventory_2018/manifest.yaml` — source, acquisition date, CRS, record count, checksums for the real shapefile bundle
- `ml-service/data/interim/manifest.yaml` — provenance for the real grid/label/negative outputs produced this phase (derivation parameters, checksums, record counts)
- `ml-service/data/external/manifest.yaml` — acquisition status for all 10 non-landslide categories, per §3 above

`ml-service/data/processed/` remains empty (only `.gitkeep`) — see §9,
Step 11: the final training table was deliberately **not** produced.

---

## 5. Spatial Standardization (Step 5)

Implemented in `ml-service/src/data/spatial_standardization.py`:
geometry validation (without silent auto-repair), CRS normalization
(refuses to guess a missing CRS), raster clipping to a study-area
polygon, raster reprojection with an explicit, caller-chosen resampling
method (bilinear/cubic for continuous data vs. majority/mode for
categorical — **never** defaulted silently, since bilinear-interpolating
a categorical raster like land cover would produce meaningless
fractional class values), nodata summarization, and zonal aggregation
functions (`zonal_mean` for continuous rasters, `zonal_majority_class`
for categorical ones).

**Tested against synthetic in-memory rasters** (8 tests, all passing —
see `ml-service/tests/test_spatial_standardization.py`). **Not yet run
against any real raster**, because no real DEM/rainfall/land-cover/NDVI/
soil raster has been acquired (§3). This module is ready to use the
moment a real raster is available.

### Grid resolution decision (resolves the open item in `docs/spatial_representation.md`)

**Decision: 1 km × 1 km grid cells**, in EPSG:32643 (UTM 43N — the
appropriate metric CRS for Kerala's longitude range, used consistently
across this project since Phase 3).

**Reasoning:**
- Finer than IMD rainfall (~25 km) and GPM IMERG (~10 km) — meaning
  every grid cell within a given rainfall pixel will necessarily share
  an identical rainfall value once that layer is joined. This is
  **not** a flaw introduced by choosing 1 km; it is an honest
  reflection of rainfall's real native resolution, and the join
  approach (§6 below) is designed to keep this traceable rather than
  hidden, per `docs/spatial_alignment.md` §4's explicit rule against
  false rainfall precision.
- Coarser than DEM (30 m) and WorldCover (10 m) and MODIS NDVI (250 m)
  — meaning those layers will be aggregated *into* each 1 km cell via
  zonal statistics (mean for continuous, majority-class for categorical
  — see `spatial_standardization.py`), not the reverse.
- **Computationally validated as feasible**: generating a full grid
  over the ~41,900 km² Kerala study-area proxy at 1 km resolution
  produced 42,620 real cells in under 3 seconds — tractable for an MVP,
  unlike, say, a 100 m grid (which would produce roughly 100x more
  cells for uncertain benefit given rainfall's real resolution ceiling).
- **This is a concrete, documented, reversible decision** — not
  arbitrary. If future work determines a different resolution is
  warranted (e.g., once real rainfall data reveals its exact native
  grid alignment relative to Kerala), this section should be revised
  explicitly, not silently overridden elsewhere in the codebase.

---

## 6. Prediction Grid (Step 6)

Implemented in `ml-service/src/features/grid.py::build_prediction_grid`,
**run against the real study area** (§7 below).

Each grid cell has: `grid_id` (unique, e.g. `grid_000001`), `geometry`
(the cell polygon), `centroid` (a Point), `in_study_area` (bool), CRS
(EPSG:32643, uniform across the whole grid — confirmed by direct
`check_crs` execution against the real output, see §10).

**A real bug was found and fixed during this phase**: the grid was
initially built by testing whether each candidate cell's *centroid*
fell inside the study-area polygon. This silently dropped edge cells
whose polygon still covered real points near the study-area boundary —
caught by `test_grid.py::test_assign_landslide_labels_marks_positive_cells`
failing (a synthetic point was unaccounted for: 5 of 6 captured instead
of 6 of 6). **Fixed** by switching the inclusion rule to `intersects`
(a cell is included if its polygon touches the study area at all, not
only if its centroid is inside it). Re-verified against the real Kerala
data: the sum of `positive_count` across all real grid cells is now
exactly **4,728** — matching the real positive record count exactly,
confirming no landslide point is silently lost at the grid's edge.

---

## 7. Landslide Labels (Step 7)

**Study area:** an explicit **PROXY** — the convex hull of the real
4,728 Kerala landslide points, buffered outward by 5 km
(`ml-service/src/features/grid.py::build_study_area_proxy`). This is
**not** an authoritative Kerala state boundary — none has been
downloaded (§3) — and is labeled as a proxy everywhere it appears in
code, manifests, and this document. Area of the resulting proxy region:
**~41,900 km²** (for reference, Kerala's actual land area is
approximately 38,850 km² per general geographic knowledge — the proxy
is somewhat larger, consistent with a convex-hull-plus-buffer
overestimating a concave coastline-and-mountain-range shape; this
comparison is offered as a sanity check, not as validation against an
authoritative source).

**Label assignment** (`assign_landslide_labels`): a spatial join between
the real landslide points and the real grid, using an `intersects`
predicate. Result (real numbers, from the corrected pipeline):

- **Total grid cells: 42,620**
- **Positive cells (target = 1): 2,139**
- **Sum of `positive_count` across all cells: 4,728** (exact match to
  the raw record count — confirms complete, lossless label assignment)
- **1,017 cells contain more than one landslide point** (up to a
  maximum of **27** points in a single 1 km cell) — a direct,
  real-data confirmation of the dense-clustering pattern already
  flagged in Phase 3B's near-duplicate-coordinate findings (91 point
  pairs within 30 m, 816 within 100 m).

**Post-event fields excluded, per `feature_policy.yaml` and this
phase's explicit instruction:** `NRSC`, `GSI`, `New`, `Type_of_sl`,
`Length`, `Width`, `Area`, `Building_I`, `Road_impac`, `Impact_Agr`,
`Specific_r`, `Remarks`, `LU_2018` were **not** read into the grid/label
construction at all — `assign_landslide_labels` only ever touches
`geometry` from the positives file. This was verified by inspecting the
function's own code (it selects `pts[["geometry"]]` before the spatial
join) rather than merely asserted.

---

## 8. Negative Sampling (Step 8)

Implemented in `ml-service/src/features/grid.py::select_negative_grid_cells`,
following the strategy selected in `docs/negative_sampling.md` §2,
adapted to the grid representation:

1. **Positive cells are never candidates** (2,139 excluded by
   construction).
2. **Buffered exclusion**, buffer = **2,000 m**. A real, quantified
   finding during this phase's own quality audit (§10) showed that
   buffering only the raw *points* left 103 of 6,417 accepted negatives
   (1.6%) within the buffer distance of a *positive cell's polygon
   edge* (since a 1 km positive cell can extend up to several hundred
   meters beyond the single point that triggered it). **Fixed**: the
   exclusion now buffers the union of (a) the raw points and (b) the
   positive cell polygons themselves. Re-verified: the spatial-leakage
   check (§10) now passes with **0** flagged cells.
3. **Spatial stratification**: a coarse 4×4 block grid over the study
   bounding box, used **as a documented substitute** for the
   district-based stratification described in `docs/negative_sampling.md`
   §1.6 — no real administrative boundary is joined to the grid cells
   (§3), so district membership cannot be honestly assigned to a grid
   cell yet. This substitution is explicit, not silent.
4. **Terrain matching (§1.5) and observation-coverage-aware sampling
   (§1.4) remain unimplemented**, exactly as `docs/negative_sampling.md`
   specified they should be deferred.
5. **Sampling ratio: 3 negatives per positive** — a documented choice,
   not an arbitrary 50/50 split (explicitly prohibited by this phase's
   instructions). Reasoning: `docs/negative_sampling.md` §1.7 states a
   "moderately balanced" set is a defensible MVP starting point without
   claiming true real-world prevalence; 3:1 sits between full balance
   (1:1, likely to understate real class imbalance) and the full
   available candidate pool (~14:1 uncapped), and — per
   `docs/negative_sampling.md` §3 — is explicitly one point in a
   sensitivity analysis that still needs to be run, not asserted as
   optimal.

### Real Results (final, corrected)

| Metric | Value |
|---|---|
| Total grid cells | 42,620 |
| Positive cells | 2,139 |
| Buffer-excluded cells (non-positive, too close to a positive) | 10,172 |
| Candidate negative cells (after exclusion, before ratio cap) | 30,309 |
| Accepted negative cells (3:1 cap applied) | 6,417 |
| Sampling ratio achieved | 3.0 : 1 (exact) |
| Spatial strata represented | 12 of 12 (all 4×4 blocks that contain any candidate area) |
| Per-stratum accepted counts | 153–642 cells per stratum (uneven — proportional to each stratum's candidate pool, not forced equal; see `ml-service/data/interim/manifest.yaml` for exact per-stratum counts) |

**Excluded area reasons, explicit:** the 10,172 buffer-excluded cells
were excluded because their polygon falls within 2,000 m of either a
raw landslide point or a positive cell's polygon — i.e., they are
judged too spatially close to a confirmed landslide to be trusted as a
genuine negative, per the reasoning in `docs/negative_sampling.md` §0
(the source inventory's own documented incompleteness means an
unbuffered negative risks silently sitting on an unrecorded landslide).

**This is a candidate negative set for pipeline development, not a
finalized training label set** — the sensitivity analysis required by
`docs/negative_sampling.md` §3 (varying buffer distance and ratio) has
not been run, and terrain-matching / coverage-awareness refinements
remain open.

---

## 9. Feature Engineering (Step 9) — Blocked

**No external feature (rainfall, terrain, land cover, NDVI, soil) has
been computed for any grid cell**, because no real external raster/
vector source has been acquired (§3). `ml-service/src/features/feature_table_schema.py`
(from Phase 3) already documents the intended feature list with
AVAILABLE/TO VERIFY/OPTIONAL/NOT AVAILABLE tags per field — that
document remains accurate and was not duplicated. No feature value has
been invented to fill this gap.

---

## 10. Data Quality (Step 10) — Real Checks, Run Against Real Data

Using the existing, previously-synthetic-tested modules
(`ml-service/src/data/quality_checks.py`, `leakage_audit.py`), the
following checks were **actually executed against the real 42,620-cell
labeled grid and the real 6,417-cell accepted-negative set**:

| Check | Result |
|---|---|
| Geometry validity (labeled grid) | **PASSED** — 0 of 42,620 null/empty/invalid |
| CRS defined and matches EPSG:32643 | **PASSED** |
| Duplicate `grid_id` | **PASSED** — 0 duplicates (42,620 unique IDs) |
| Missing values (`grid_id`, `in_study_area`, `positive_count`, `target`) | **PASSED** — 0 missing in every column |
| Spatial leakage (accepted negatives vs. positive cells, ≥1,999 m separation) | **Initially FAILED** (103/6,417 flagged) → **root cause found and fixed** (§8) → **re-verified PASSED**, 0 flagged |
| No accepted negative cell is also a positive cell | **PASSED** — 0 overlap |

**This is a materially different situation from Phase 3**, where every
check was implemented and tested only against synthetic fixtures. This
phase actually ran the checks against real, non-trivial data (42,620
real cells) and **found and fixed two genuine bugs** (the grid
edge-inclusion bug in §6, and the point-vs-cell buffer gap in §8) that
synthetic testing alone had not caught. See
`ml-service/reports/training_dataset_quality_report.md` for the report
version of this table.

---

## 11. Final Training Table (Step 11) — NOT PRODUCED

Per this phase's explicit instruction — *"If required external data is
still missing, STOP before creating a fake training dataset"* —
**`ml-service/data/processed/training_dataset.parquet` was NOT
created.**

A training table with `grid_id`, `geometry`, `target`, and metadata but
**no rainfall/terrain/environment/soil feature columns** would not be a
training dataset in any meaningful sense (there is nothing for a model
to learn from beyond the labels themselves) — creating it would either
require leaving those columns fabricated/empty in a way that invites
confusion later, or misrepresenting an incomplete artifact as the "real
training table." Neither is acceptable. The real, genuinely-computed
grid and label data instead live in `ml-service/data/interim/` (§4),
correctly reflecting their actual status as an intermediate,
labels-only artifact pending feature attachment.

**Exact next blocker:** at least one real external feature source
(rainfall, DEM, or land cover — the three flagged as minimally required
in `docs/data_sources.md` "Minimum Dataset Required to Train a First
Model") must be acquired by a human with unrestricted network access,
or uploaded directly to a future session, before `training_dataset.parquet`
can be produced.

---

## 12. Documentation Updated This Phase

- `docs/data_strategy.md` — Phase 4 status section added
- `docs/data_dictionary.md` — grid-cell-size decision cross-referenced
- `docs/features.md` — cross-referenced to this document for the concrete grid resolution decision
- `docs/negative_sampling.md` — cross-referenced to the grid-based implementation and the real results in §8 above
- `docs/training_dataset_build.md` — this document (new)
- `ml-service/reports/training_dataset_quality_report.md` — real quality report (new)

## 13. Tests Added This Phase

- `ml-service/tests/test_spatial_standardization.py` (8 tests, synthetic rasters)
- `ml-service/tests/test_grid.py` (5 tests, synthetic points — deliberately small/fast; the *real* Kerala numbers reported throughout this document come from separately running the same functions against the real file, not from the test suite itself)

Full suite result at the end of this phase is reported precisely in the
final response, not restated here, to avoid transcription drift between
this document and the actual `pytest` run.
