# Negative Sampling Strategy

Status: **design document — the highest-priority deliverable of Phase 3**,
per the task instructions. This document evaluates candidate strategies
for constructing non-landslide ("negative") training examples to pair
with the 4,728 positive records in the Hao et al. (2020) Kerala
inventory, and states explicitly where confidence runs out.

## 0. Why This Cannot Be a Default/Automatic Choice

The landslide inventory gives us **only positive locations** — places
where a landslide is confirmed to have occurred. It says nothing about
where landslides did *not* occur. Labeling "everywhere else in Kerala"
as negative is not a neutral default; it is a strong, usually false,
implicit assumption, for a specific reason documented in
`docs/inventory_metadata_report.md`: the GSI field-survey component of
the inventory is **explicitly biased toward roads** (surveyors recorded
damage "mainly along roads"), and the paper itself states that
completeness of the *overall* inventory (i.e., whether every real 2018
landslide was captured) is "not possible to quantify." Any negative
sampled from an area that actually had an unrecorded landslide would be
a **false negative baked directly into the label**, and a naive random
background-sampling approach gives no way to bound how often this
happens.

## 1. Candidate Strategies

### 1.1 Random Background Sampling (naive baseline)

**Method:** Sample random points/cells across the entire study area
(excluding exact positive coordinates) and label them negative.

- **Advantages:** Trivial to implement; produces any desired class
  balance; widely used in published landslide-susceptibility literature
  as a baseline approach.
- **Limitations:** Directly exposed to the false-negative risk in §0 —
  a random point could land in a real, unrecorded landslide (especially
  plausible far from roads, exactly where the GSI field survey is weakest
  and where the paper's own completeness caveat applies most strongly).
  Provides no terrain/environmental control, so a model trained on it
  risks simply learning "areas GSI/NRSC happened to survey" rather than
  genuine susceptibility.
- **Verdict:** Not recommended as the sole strategy for this dataset,
  specifically because of the documented survey bias — not as a generic
  objection to random sampling in general.

### 1.2 Spatial Exclusion Buffers Around Known Landslides

**Method:** Define a buffer radius (e.g., some number of meters/DEM
pixels) around every positive point; exclude the buffered area entirely
from negative sampling, so negatives are drawn only from locations
clearly separated from any confirmed landslide.

- **Advantages:** Directly reduces the chance of a negative accidentally
  coinciding with an unmapped extension of a *known* landslide's runout/
  source area (the point geometry marks only the initiation point, not
  the full landslide footprint, per the inventory metadata report — the
  actual disturbed area around a point is larger than the point itself).
  Also reduces a specific spatial-autocorrelation leakage risk relevant
  to the validation strategy: a negative sampled immediately adjacent to
  a positive would share nearly identical terrain/rainfall features,
  making the classification task artificially easy at the boundary and
  inflating apparent performance.
- **Limitations:** Buffer radius is a free parameter with no data-driven
  value available from this inventory alone (landslide `area` is only
  present for a subset of records — 420 of the 973 GSI-only records are
  explicitly missing area, per the metadata report — so a per-landslide,
  area-informed buffer isn't uniformly computable). An arbitrary buffer
  radius is itself a modeling assumption that should be sensitivity-
  tested (see §3), not fixed by guesswork.
- **Verdict:** Recommended as a **necessary component**, combined with
  another strategy below — not sufficient alone.

### 1.3 Exclusion of Known Landslide Clusters (beyond individual buffers)

**Method:** Identify dense clusters of positive points (e.g., in Idukki
district, which the source paper reports accounts for 47.02% of all
landslides) and treat the whole cluster's surrounding area with extra
caution — either wider buffers or explicit exclusion from negative
sampling — since dense clustering itself is evidence that the
surrounding terrain is broadly unstable, not just the exact mapped
points.

- **Advantages:** Responds directly to the documented, real spatial
  concentration in the source data (Idukki's 47.02% share) rather than
  treating all districts as equally reliable for negative sampling.
- **Limitations:** Risks *under*-sampling negatives from genuinely
  landslide-prone districts precisely where the model most needs to
  learn to distinguish risk levels; could introduce a different bias if
  applied too aggressively (e.g., a model that never sees any Idukki
  negatives cannot learn what "lower risk within a high-risk district"
  looks like).
- **Verdict:** Useful as a *qualifier* on buffer sizing (larger
  buffers/more caution in dense-cluster districts) rather than a
  wholesale district exclusion.

### 1.4 Sampling Only from Areas with Reliable Observation Coverage

**Method:** Restrict negative sampling to the subset of Kerala judged to
have had genuinely thorough landslide detection coverage in 2018 — e.g.,
areas covered by the GSI field survey's 10 districts, or areas with good
Sentinel-2/Resourcesat cloud-free coverage in the relevant window — and
exclude areas known to be poorly observed (the source paper documents
specific reasons for missed detections: cloud cover, shadow, dense
post-event vegetation regrowth before the first available post-event
image).

- **Advantages:** Most directly addresses the actual, source-documented
  cause of potential false negatives (observation gaps), rather than a
  purely geometric proxy like a buffer distance.
- **Limitations:** "Reliable observation coverage" is not a field that
  currently exists as data in this pipeline — determining it would
  require reconstructing cloud-cover/imagery-availability maps for the
  2018 window, which is additional work not yet scoped, and the source
  paper's discussion of these gaps is qualitative (with figure examples)
  rather than a ready-to-use dataset of "well-observed vs.
  poorly-observed" zones.
- **Verdict:** Conceptually the strongest approach, but **not currently
  implementable** with data in hand — flagged as a valuable future
  enhancement (Priority B), not part of the MVP strategy, precisely to
  avoid overstating what can be defended right now.

### 1.5 Terrain/Environmental Matching

**Method:** For each positive, select a statistically matched negative
with similar terrain characteristics (e.g., similar slope, elevation
band) but confirmed absence of a mapped landslide — a common approach
in the landslide-susceptibility literature to avoid a model trivially
learning "flat vs. steep" instead of genuine risk factors.

- **Advantages:** Forces the model to learn finer-grained distinctions
  than gross terrain type; a standard, defensible technique in the
  broader field.
- **Limitations:** Requires the terrain feature pipeline (DEM
  slope/aspect/curvature) to already be built and validated before
  negatives can be selected this way — a sequencing dependency on Task 5
  that is not yet complete in this repository. Also does not, by itself,
  solve the "was this location actually landslide-free" problem — it
  only controls for terrain similarity, not for the underlying
  observation-completeness risk from §1.4.
- **Verdict:** A valuable **refinement layer** to apply on top of
  buffered, coverage-aware sampling, not a substitute for it — sequenced
  after Task 5's terrain pipeline exists.

### 1.6 Spatial Stratification

**Method:** Ensure negatives are drawn proportionally across
geographic strata (e.g., districts, or a grid) rather than
concentrated in a few convenient areas, so the negative set reflects
Kerala's actual spatial diversity rather than sampling convenience.

- **Advantages:** Directly supports the spatial cross-validation
  methodology already committed to in `docs/validation_strategy.md`
  — stratified sampling makes it possible to construct spatially
  separated folds that still have reasonable within-fold class balance.
- **Limitations:** Stratification alone doesn't resolve the false-
  negative risk in §0; it's an orthogonal, complementary design axis
  (spatial fairness of sampling) rather than a fix for label
  correctness.
- **Verdict:** Recommended as a **cross-cutting requirement** applied to
  whichever primary strategy is chosen, not a standalone strategy.

### 1.7 Class Balance Considerations

Landslide occurrence is rare relative to the full land area of Kerala,
so a "realistic" prevalence-matched negative set would be extremely
imbalanced (consistent with the general class-imbalance principle
already stated in `docs/data_strategy.md` §4 and
`docs/validation_strategy.md` §6). For an MVP:
- A **moderately balanced training set** (e.g., a fixed positive:negative
  ratio, not 1:1 necessarily, but not full real-world prevalence either)
  is a common, defensible starting choice in the literature — chosen for
  learnability, not because it reflects true prevalence.
- **The exact ratio is an open parameter**, not decided here, and should
  itself be part of the sensitivity analysis in §3 rather than fixed
  arbitrarily. Reported metrics must always state the actual ratio used
  in a given experiment (this connects directly to
  `docs/validation_strategy.md` §6's requirement to report fold-level
  class balance, not just an aggregate).

## 2. Selected Strategy for the MVP

**Combined approach:** buffered, coverage-aware, spatially stratified
random sampling, with terrain matching deferred to a later refinement
once the DEM pipeline exists.

Concretely, for the first defensible negative set:

1. **Exclusion buffer** around every positive point (§1.2), sized
   conservatively given the missing-area data problem — a fixed buffer
   distance rather than an area-derived one, since area isn't
   consistently available. The exact distance is an open parameter for
   the sensitivity analysis in §3, not fixed here.
2. **Extra caution in dense clusters** (§1.3) — larger buffers or lower
   negative-sampling density in districts with disproportionate positive
   concentration (Idukki, per the documented 47.02% figure), reasoned
   from, not overriding, the buffer approach.
3. **Spatial stratification** (§1.6) across districts so the negative
   set is not concentrated in a few convenient areas.
4. **Terrain matching (§1.5) explicitly deferred** — not part of the
   first negative set, to be added once the Task 5 DEM/terrain pipeline
   is built and validated, at which point this document should be
   revisited and updated rather than silently superseded.
5. **The observation-coverage-aware refinement (§1.4) is explicitly
   flagged as not implementable yet** and is not part of the MVP
   strategy — this is a known gap in this strategy, not a solved
   problem.

## 3. Sensitivity Analysis Requirement

Per the task instructions, a single fixed strategy is not enough on its
own — the following sensitivity analysis is **specified as required
future work**, not yet executed (it depends on the terrain pipeline and
the actual coordinate data, neither of which exist in this environment
yet — see the raw-data acquisition blocker):

- Re-run negative sampling (and any downstream validation metrics) under
  at least two or three different buffer distances, to check whether
  model conclusions are sensitive to this arbitrary parameter.
- Compare model behavior under at least two different positive:negative
  ratios.
- Report whether headline metrics (precision/recall at the alerting
  threshold, per `docs/validation_strategy.md` §6) are stable or highly
  sensitive to these choices — instability here would itself be an
  important, honestly-reported finding, not something to average away.

## 4. Explicit Statement of Confidence Limits (per task instructions)

Per the task instructions: *"If the available inventory is insufficient
to confidently construct negatives, STOP and report the limitation
instead of fabricating certainty."*

**This is exactly the situation here, in two compounding ways:**

1. **Data acquisition blocker:** the actual coordinate data needed to
   physically construct buffers, stratify by district, or run any of the
   above sampling logic has not been obtained in this environment (see
   `ml-service/data/raw/kerala_landslide_inventory_2018/ACQUISITION_STATUS.md`).
   Everything in this document is a **strategy design**, ready to execute
   once the raw file is available — it has not actually been run.
2. **Inherent label-completeness limitation:** even once the raw file is
   obtained and the strategy above is executed, the source paper's own
   explicit statement that inventory completeness "is not possible to
   quantify" means **no negative-sampling strategy applied to this single
   inventory can fully eliminate false-negative risk** — it can only
   reduce it through the buffering/coverage-awareness measures above.
   This should be carried forward as a permanent, disclosed limitation
   of any model trained on this negative set, not something later phases
   should present as resolved.

**Conclusion for this task (Phase 3): a defensible strategy has been
designed and documented, but it has not been executed, and even once
executed it cannot fully resolve the inventory's own documented
completeness limitation.** This is one of the concrete reasons the
overall Phase 3 dataset is not yet ready for training — see the final
summary.

## 5. Status Update — Phase 4: Executed at the Grid-Cell Level

This strategy has now been **executed for real**, adapted to a grid-cell
representation (§ "Spatial Representation" was resolved in
`docs/training_dataset_build.md` §5 as 1km cells), in
`ml-service/src/features/grid.py::select_negative_grid_cells`. Real
results: 2,139 positive cells, 10,172 buffer-excluded cells, 30,309
candidate negatives, 6,417 accepted (3:1 ratio, buffer = 2,000m). Full
detail, including a real bug found and fixed (the buffer was initially
computed against raw points only, missing 103 cells that were too close
to a *positive cell's polygon* rather than the point itself), is in
`docs/training_dataset_build.md` §8.

**What §4's confidence-limit caveats above still apply, unchanged:**
the inventory's own completeness cannot be fully verified (item 2
above), and the sensitivity analysis required in §3 has **still not
been run** — the 2,000m buffer and 3:1 ratio are documented, reasoned
choices, not validated-optimal ones. This negative set remains a
candidate for pipeline development, not a finalized training label set.
