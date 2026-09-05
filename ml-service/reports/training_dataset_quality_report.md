# Training Dataset Quality Report (Phase 4)

Status: **Real report, generated from checks actually executed against
real data** (the labeled grid and accepted negatives built in Phase 4
from the real Kerala 2018 inventory). This supersedes
`ml-service/reports/dataset_quality_report.md` (Phase 3) for the
grid/label pipeline specifically; that earlier report remains accurate
as a historical record of the Phase 3 synthetic-only testing state.

## Inputs Checked

- `ml-service/data/interim/kerala_grid_labeled_1km.gpkg` — 42,620 real grid cells
- `ml-service/data/interim/kerala_grid_negatives_accepted_3to1.gpkg` — 6,417 real accepted negative cells

## Results

| Check | Tool function | Result | Detail |
|---|---|---|---|
| Geometry validity | `quality_checks.check_geometry_validity` | **PASS** | 0 of 42,620 cells have null/empty/invalid geometry |
| CRS defined + correct | `quality_checks.check_crs` | **PASS** | EPSG:32643 confirmed on the labeled grid |
| Duplicate grid IDs | direct `pandas.Series.duplicated()` on `grid_id` | **PASS** | 0 duplicates across 42,620 unique IDs |
| Missing values | `quality_checks.check_missing_values` | **PASS** | 0 missing across `grid_id`, `in_study_area`, `positive_count`, `target` |
| Spatial leakage (negatives vs. positives) | `leakage_audit.check_spatial_leakage_between_splits` | **PASS (after fix)** | Initial run: 103 of 6,417 (1.6%) flagged within 1,999m of a positive cell polygon. Root cause: exclusion buffer was computed against raw points only, not positive cell polygons. Fixed in `ml-service/src/features/grid.py::select_negative_grid_cells`. Re-run: 0 flagged. |
| Accepted negatives never overlap positive cells | direct set-intersection check | **PASS** | 0 of 6,417 accepted negative `grid_id` values appear in the positive-cell `grid_id` set |
| Label completeness (no point lost at grid edges) | direct sum check | **PASS (after fix)** | `positive_count` sums to exactly 4,728 across all cells, matching the raw record count exactly. Initial implementation (centroid-based cell inclusion) lost points at the study-area edge, caught by `ml-service/tests/test_grid.py`; fixed by switching to an `intersects`-based inclusion rule. |

## Checks Not Yet Applicable

The following checks from `ml-service/src/data/quality_checks.py` /
`leakage_audit.py` exist and are tested (Phase 3, synthetic fixtures)
but were not run this phase because their required inputs don't exist
yet:

- `check_impossible_numeric_values` — no numeric *feature* columns exist
  on the grid yet (only bookkeeping fields `positive_count`/`target`,
  which have no meaningful "impossible value" range beyond non-negativity,
  already implied by construction).
- `check_temporal_leakage`, `check_feature_leakage_by_source_date` — no
  feature table with source dates exists yet (blocked on external data,
  see `docs/training_dataset_build.md` §9).
- `check_target_leakage_by_correlation` — no feature columns exist to
  correlate against the target yet.
- `check_duplicate_event_leakage` — this check operates on the raw
  inventory's own `data_source`-style fields (e.g. `NRSC`/`GSI`/`New`),
  which are explicitly excluded from any predictive pipeline per
  `feature_policy.yaml` and were never joined into the grid; there is
  nothing for this check to run against in the grid/label table by
  design.

## Bugs Found and Fixed This Phase (full detail)

Two genuine defects were found by actually running the pipeline against
real data and its own test suite — neither was caught by Phase 3's
synthetic-only testing, because the synthetic fixtures used there were
too small/simple to expose either issue:

1. **Grid edge-inclusion bug**: `build_prediction_grid` used
   `area_union.contains(centroid)` to decide whether to keep a candidate
   cell. This silently drops cells whose centroid falls just outside the
   study-area polygon but whose body still overlaps it — an edge effect
   invisible with small synthetic datasets but real at scale. Caught by
   `test_grid.py::test_assign_landslide_labels_marks_positive_cells`
   (5 of 6 synthetic points captured instead of 6 of 6). **Fixed** by
   switching to `area_union.intersects(cell)`.

2. **Negative-sampling cap overshoot**: when `max_negatives` didn't
   divide evenly across spatial strata, the per-stratum floor allocation
   (`max(1, max_negatives // n_strata)`) could produce a total exceeding
   `max_negatives` (e.g. requesting 5 across 10 strata could return 10).
   Caught by `test_grid.py::test_select_negative_grid_cells_respects_max_cap`.
   **Fixed** by adding a strict final cap-enforcement step.

3. **Point-vs-cell buffer gap** (found via this quality report's own
   leakage check, not the unit tests): described above. **Fixed**.

## Conclusion

The grid/label/negative-sampling pipeline, as it currently stands, is
**internally consistent and leak-free by the checks available** —
geometry, CRS, identifiers, and spatial separation between the positive
and accepted-negative sets all pass. It is **not** a finished training
dataset: no external features are attached (see
`docs/training_dataset_build.md` §9, §11), and the negative-sampling
sensitivity analysis required by `docs/negative_sampling.md` §3 has not
been run.
