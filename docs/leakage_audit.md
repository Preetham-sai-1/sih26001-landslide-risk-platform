# Leakage Audit

Status: **audit design + implemented, code-tested checks — not yet
run against real data.**

Per the task instructions, this document goes beyond stating that
leakage is *possible* — it reports what automated checks actually exist
and what running them (against synthetic fixtures, since real data is
unavailable) actually showed.

## 1. Spatial Leakage

**Check implemented:** `check_spatial_leakage_between_splits` in
`ml-service/src/data/leakage_audit.py` — flags any test-fold record
within a specified minimum distance of any training-fold record.

**Tested:** Yes, against a synthetic fixture
(`ml-service/tests/test_leakage_audit.py::test_spatial_leakage_detects_close_points`
and `..._passes_when_well_separated`). Both pass: the check correctly
flags a synthetic point 5 units from a training point (with a 100-unit
minimum separation) and correctly passes a well-separated pair.

**Run on real data:** No — no real train/test split exists yet, since no
real data has been acquired or split.

## 2. Temporal Leakage

**Check implemented:** `check_temporal_leakage` — flags any record where
a feature's declared "as-of" date is after that record's own prediction
reference time T.

**Tested:** Yes
(`test_temporal_leakage_flags_future_feature`) — correctly flags a
synthetic feature dated after its synthetic reference date and passes
the one dated before.

**Run on real data:** No. Additionally flagged as a **design-level open
item** independent of data acquisition: `docs/temporal_alignment.md` §6
notes that the prediction reference time T itself is not yet defined for
this single-event-window inventory — this check cannot be meaningfully
run until T is defined, which is a modeling decision, not just a data
acquisition one.

## 3. Duplicate-Event Leakage

**Check implemented:** `check_duplicate_event_leakage` — flags records
sharing a source/event identifier, so that the same physical landslide
(e.g., one of the 422 landslides confirmed by both NRSC and GSI, per
`docs/inventory_metadata_report.md`) cannot accidentally end up
counted as two independent samples split across train and test.

**Tested:** Yes
(`test_duplicate_event_leakage_detects_shared_source_id`) — correctly
flags two synthetic records sharing a source id and correctly ignores
records with no id / different ids.

**Run on real data:** No — the real `data_source` attribute (which the
source paper confirms exists) has not been inspected, since the raw
file hasn't been acquired.

## 4. Feature Leakage

**Check implemented:** `check_feature_leakage_by_source_date` —
metadata-level check flagging any feature whose declared source
acquisition date is after the prediction reference date (e.g., catching
a configuration mistake where a post-event WorldCover/Sentinel-2 layer
is wired in as a "current conditions" feature — the exact risk
identified in `docs/temporal_alignment.md` §5).

**Tested:** Yes
(`test_feature_leakage_by_source_date_flags_post_event_layer`) —
correctly flags a synthetic "worldcover_2021" source dated after a
synthetic 2018-08-01 reference date, and correctly does not flag a
pre-event synthetic DEM source or a static/undated (None) source.

**Run on real data:** No — no real feature-source metadata has been
compiled, since no real feature pipeline has been executed.

## 5. Target Leakage

**Check implemented:** `check_target_leakage_by_correlation` — flags any
numeric feature with a near-perfect correlation to the target, as a
manual-review signal (not an automatic feature-removal rule, since
genuinely strong predictors can exist and shouldn't be discarded purely
for being informative).

**Tested:** Yes
(`test_target_leakage_flags_near_perfect_correlation`) — correctly
flags a synthetic feature engineered to correlate near-perfectly with a
synthetic target, and correctly does not flag a synthetic feature with
weak/no correlation.

**Run on real data:** No — no real feature table exists yet.

## Summary Table

| Leakage type | Automated check implemented | Verified via synthetic test | Run on real data |
|---|---|---|---|
| 1. Spatial | Yes | Yes (2/2 tests pass) | No |
| 2. Temporal | Yes | Yes (1/1 test passes) | No — also blocked on an unresolved design decision (T) |
| 3. Duplicate-event | Yes | Yes (1/1 test passes) | No |
| 4. Feature | Yes | Yes (1/1 test passes) | No |
| 5. Target | Yes | Yes (1/1 test passes) | No |

## What This Means

The audit *mechanism* exists, is real code, and is demonstrably correct
against known synthetic cases (20/20 tests pass across all pipeline
modules — see `ml-service/reports/dataset_quality_report.md`). But per
the task's own framing — "do not merely document that leakage is
possible; implement automated checks where practical" — implementing
the checks was possible and has been done; **running them against the
real dataset was not possible in this environment**, and that specific,
tested limitation is why this document cannot report actual leakage
findings for the real Kerala inventory.
