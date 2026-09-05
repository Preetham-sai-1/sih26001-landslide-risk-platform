# NER Inventory: Temporal Policy

Status: **Real analysis, run against the actual 8,546-record NER
subset via `ml-service/src/data/ner_temporal_policy.py`.** No source
records modified; no dates fabricated.

## Findings: `INITIATION` Field

- **1,760 of 8,546 records (20.6%) have a valid year** (range 1940–2020).
- **6,786 of 8,546 (79.4%) use the `0` missing-year sentinel** (confirmed
  in the prior duplicate/CRS audit — `0` is not a real year).
- **0 implausible years** found (none outside 1901–2026).
- **Valid years are heavily concentrated in one decade**: 1,687 of 1,760
  (95.9%) fall in 2010–2019; only 73 records span the other 70 years
  (1940–2009) combined.
- **Per-state missingness** ranges from 43.3% (Tripura, best) to 99.1%
  (Sikkim, worst) — coverage is highly uneven, not just sparse overall.

## Which Records Can Safely Receive Time-Dependent Features

**In principle, only the 1,760 `time_dependent_eligible` records** —
those with a plausible, non-missing year. This is necessary but **not
sufficient**: a year alone cannot anchor the project's existing
day-level rainfall windows (`rainfall_24h/3d/7d/30d`, per
`ml-service/src/features/rainfall.py`) without a further, separately
justified within-year reference-date method — the same problem already
solved (partially) for Kerala's single shared event window in
`docs/temporal_alignment.md` §6, but harder here because each NER
record has its **own, different** year rather than one shared window.
**This method is not defined in this task** — it is an explicit
remaining open item, not resolved by assumption.

## Reproducible Rule

`classify_temporal_eligibility()` assigns exactly one group per record:

| Group | Rule | Count (real) |
|---|---|---|
| `time_dependent_eligible` | `INITIATION` present and in [1901, 2026] | 1,760 |
| `missing_year_static_only` | `INITIATION == 0` (missing sentinel) | 6,786 |
| `implausible_year_flagged` | `INITIATION` present but outside [1901, 2026] | 0 |

1901 is not arbitrary — it is IMD's gridded-rainfall record start date
(`docs/data_sources.md` §2.1); a year before that could never receive a
real rainfall feature regardless of missingness status. 2026 is the
current project year.

## Missing-Year Records: Decision

**Missing-year records (6,786, 79.4%) remain usable, but static-only —
they are not excluded from the project, and not moved to a separate
dataset file.** Reasoning: excluding 79.4% of the inventory would
discard most of the NER labels this project has; a separate-file split
would fragment the pipeline without a clear benefit over a single
column-based eligibility flag. They may receive DEM/soil-property/
single-snapshot-land-cover features (same static feature groups already
available per `docs/data_dictionary.md`), but **must never** receive
`rainfall_24h/3d/7d/30d`, soil-moisture readings, or any other feature
requiring a specific reference date — doing so would require fabricating
a date, which is prohibited.

## Leakage Prevention: Post-Event Attributes

The NER schema's damage/classification fields (`ACTIVITY`, `STYLE`,
`TRIGGERING`, `DEPTH`, `LENGTH`, `WIDTH`, `HEIGHT`, `LS_AREA`,
`LS_VOLUME`, `PERSONS_DE`, `PEOPLE_AFF`, `LIVESTOCK_`, `COMMUNICAT`,
`LANDUSE_AF`, `INFRASTRUC`, `REMARKS`, `ABSTRACT`, `CITATION`,
`GEOSCIENTI`) are **all post-event characterizations or damage
records**, exactly analogous to the Kerala fields already excluded in
`ml-service/src/data/feature_policy.yaml`. **None of these are read by
`ner_temporal_policy.py` or `ner_duplicate_audit.py`** — both modules
only ever touch `INITIATION`, `STATE`, `SLIDE_NO`, `OBJECTID`, and
geometry. A companion `feature_policy.yaml`-style exclusion list for
the NER schema is a natural next step but is **not created in this
task**, which is scoped to temporal policy only.

## Summary

| | Count |
|---|---|
| Total NER records | 8,546 |
| Time-dependent eligible (pending reference-date method) | 1,760 |
| Static-only (missing year) | 6,786 |
| Implausible/flagged | 0 |
