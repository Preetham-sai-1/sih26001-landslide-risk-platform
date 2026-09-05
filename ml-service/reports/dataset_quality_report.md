# Dataset Quality Report

Status: **Phase 3 status report — NOT a report of results on the real
dataset.** This document states, honestly, what quality-checking
infrastructure exists and what it has actually been validated against.

## What Exists and Has Been Verified

The following checks are implemented as real, executable Python code in
`ml-service/src/data/quality_checks.py` and `ml-service/src/data/leakage_audit.py`,
and have been **run successfully in this session** against small,
explicitly synthetic test fixtures (`ml-service/tests/test_quality_checks.py`,
`test_leakage_audit.py`, `test_negative_sampling.py`) using `pytest`.
**All 20 tests pass.** This confirms the *logic* of each check is
correct — it does not constitute a finding about the real inventory.

| Check | Implemented | Tested against synthetic data | Run against real data |
|---|---|---|---|
| Geometry validity (null/empty/invalid) | Yes | Yes (passes + fails correctly) | **No** |
| CRS defined / matches expected | Yes | Yes | **No** |
| Coordinate bounds (in/out of study area) | Yes | Yes | **No** |
| Duplicate geometries (coordinate coincidence) | Yes | Yes (a real bug was found and fixed during testing — see note below) | **No** |
| Missing values (per-column) | Yes | Yes | **No** |
| Impossible numeric values (range rules) | Yes | Yes | **No** |
| Spatial leakage between train/test splits | Yes | Yes | **No** |
| Temporal leakage (feature dated after prediction reference) | Yes | Yes | **No** |
| Duplicate-event leakage (shared source/event id) | Yes | Yes | **No** |
| Feature leakage by source date | Yes | Yes | **No** |
| Target leakage by correlation | Yes | Yes | **No** |
| Negative sampling (buffered, stratified) | Yes | Yes (buffer distance and count constraints verified) | **No** |

**Note on the bug found during testing:** the first version of the
`check_duplicate_geometries` test used an out-of-range synthetic
longitude/latitude value (200°, 100°) to represent "an out-of-bounds
point." When that point was reprojected to a metric UTM CRS (required
for the duplicate-distance check), the projection produced an infinite
coordinate and the check crashed with `OverflowError`. This was a bug
in the **test fixture**, not the check logic, but it is reported here
because it is a genuine example of the kind of coordinate-validity
problem this pipeline is specifically built to catch — and it was only
caught by actually running the code, which is exactly why this report
distinguishes "implemented" from "verified by execution" from "run on
real data."

## Why Real Numbers Are Not in This Report

**The actual raw dataset has not been acquired in this environment.**
See `ml-service/data/raw/kerala_landslide_inventory_2018/ACQUISITION_STATUS.md`
for the specific, tested reasons (sandbox network egress restricted to a
software-package allowlist that does not include DANS, GSI, USGS,
Copernicus, IMD, or any other required geospatial data host; the DANS
repository additionally rejects automated fetches with bot-detection).

Consequently, **none of the following can be honestly reported with
real numbers**, and this report will not fabricate placeholder values
to fill the gaps:
- Actual duplicate record count
- Actual missing-value counts per field (beyond the one figure directly
  quoted from the source paper in `docs/inventory_metadata_report.md` —
  the 420 records missing an `area` value)
- Actual CRS of the real shapefile
- Actual coordinate validity against Kerala's real boundary
- Actual spatial/temporal misalignment measurements
- Actual leakage audit results on real features/labels

## What This Report Recommends

1. Obtain the raw file (see the acquisition status document for exactly
   what is needed — a human downloading it outside this sandboxed
   environment, or providing it as an uploaded file).
2. Once obtained, run `ml-service/src/data/quality_checks.run_all_quality_checks`
   and `ml-service/src/data/leakage_audit.run_full_leakage_audit` against
   the real file and regenerate this report with actual findings,
   replacing every "No" in the table above.
3. Do not skip straight to feature engineering or model training once
   the file is obtained — this report's checks are a required gate,
   consistent with the project's engineering rules and the explicit
   Task 9 instruction not to train until the dataset is validated.

See `reports/dataset_statistics.csv` (or its absence, explained there)
for the equivalent situation regarding summary statistics.
