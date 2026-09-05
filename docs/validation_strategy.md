# Validation Strategy

Status: **planning document**. Describes the validation methodology the ML
pipeline will follow once real data is sourced and training begins. No
model has been trained and no performance numbers exist yet — none are
quoted here, and none should be added to this file until produced by an
actual, reproducible evaluation run.

## 1. Guiding Principle

The objective is the **highest defensible predictive performance**, where
"defensible" means: measured under conditions that resemble real
deployment (no leakage, appropriate splits), reported with honest
uncertainty, and accompanied by explicit analysis of failure modes —
especially false negatives, which are the costlier error class for a
disaster-risk system.

This system will never state or imply 100% accuracy, and will not report
a headline metric without also reporting how it was measured.

## 2. Why Naive Validation Fails for This Problem

Two properties of landslide risk data make standard random train/test
splitting unreliable if used naively:

1. **Spatial autocorrelation.** Nearby locations share terrain, rainfall,
   and geological characteristics. A random split can place
   near-duplicate spatial neighbors in both train and test sets,
   inflating apparent performance because the model is effectively
   memorizing local conditions rather than generalizing.
2. **Temporal structure.** Rainfall and satellite features are
   time-dependent, and a model that "sees" data from after the event it's
   predicting (even indirectly, through a poorly-aligned join) will
   appear more accurate than it would be in real deployment.

Both are leakage risks, and both are addressed structurally, not just by
being "careful."

## 3. Planned Validation Approach

Exact parameters (fold count, buffer distance, split dates) depend on the
real dataset's actual spatial/temporal extent and will be set once that
data is available — the mechanisms below are fixed, the parameters are
not invented in advance:

- **Spatial cross-validation:** folds constructed so that test-set
  locations are held sufficiently far from training-set locations to
  limit spatial leakage (e.g. spatial blocking / buffered leave-one-region-out,
  exact method TBD based on data density).
- **Temporal validation:** where event dates are available, evaluation
  will include a forward-in-time split (train on earlier period, test on
  later period) to approximate real deployment, in addition to spatial
  CV.
- **Group-aware splitting:** if multiple records derive from the same
  zone/event, they are kept together in the same fold to avoid leaking
  zone-specific information across the split.

## 4. Leakage Prevention Checklist (applied before any model is trained)

- [ ] Every feature's data source is confirmed to have been available
      *before* the corresponding prediction date.
- [ ] No feature is derived, even indirectly, from the label itself
      (e.g. post-event imagery reused as a "current condition" feature).
- [ ] Spatial join between labels and features is checked for
      misalignment/duplication.
- [ ] Train/validation/test folds are constructed using the spatial and
      temporal methods above, not plain random shuffling.
- [ ] Class balance in each fold is reported, not just overall.

## 5. Candidate Models

Logistic Regression, Random Forest, XGBoost, and LightGBM are the planned
candidate models, evaluated on the same folds for a fair comparison.
Logistic Regression is retained as an interpretable baseline; the
gradient-boosted and ensemble models are evaluated for potential
performance gains, with SHAP explainability applied to whichever model is
selected for serving (see `docs/features.md` and the
`ml-service/src/explainability/` module, not yet implemented).

Model selection will be based on validation performance under the
methodology above, not training-set performance, and the choice — along
with the metrics that drove it — will be documented once available.

## 6. Metrics Plan

Because landslide events are rare relative to non-events, accuracy alone
is not a meaningful metric and will not be reported as a standalone
headline number. Planned metrics (computed once real evaluation is run):

- Precision, recall, and F1 at the operating threshold(s) actually used
  for alerting.
- ROC-AUC and PR-AUC (PR-AUC weighted more heavily given class
  imbalance).
- Calibration assessment (reliability diagrams / Brier score) — since the
  system reports risk probabilities that inform alerting thresholds, the
  probabilities themselves need to be trustworthy, not just rank-ordered
  correctly.
- Confusion matrix broken down by fold (spatial and temporal), not just
  aggregated, so uneven performance across regions/time is visible rather
  than averaged away.

## 7. False-Negative Analysis (mandatory, not optional)

Given the disaster-response context, false negatives (predicting low risk
where a landslide occurs) are analyzed explicitly and separately from
aggregate metrics:

- Every false negative in validation will be reviewed for a plausible
  explanation (missing feature coverage, data quality issue, genuinely
  hard case) and logged in `ml-service/reports/`.
- Recall at the alerting threshold will be reported alongside precision,
  not omitted in favor of a single blended metric.
- If false-negative review reveals systematic gaps (e.g. a region or
  season underrepresented in training data), that gap will be documented
  as a known limitation rather than papered over.

## 8. Calibration

Because the system's alerting logic depends on risk *levels* (e.g.
High/Critical vs. Low/Moderate) feeding into the connectivity-anomaly
state machine described in `docs/architecture.md` §5, the predicted
probabilities need to be calibrated, not just ranked correctly. Planned
approach: evaluate raw model output calibration first, then apply
calibration (e.g. Platt scaling or isotonic regression) if reliability
diagrams show meaningful miscalibration, choosing the method based on
what the validation data actually shows rather than assuming one upfront.

## 9. Reporting Discipline

- All metrics reported anywhere (README, dashboard, demo, documentation)
  must be traceable to a specific evaluation run and dataset version —
  no illustrative/placeholder numbers presented as if real.
- Any number that is illustrative (e.g. for UI mockups before real model
  output exists) must be clearly labeled as a mock value in both the code
  and any accompanying documentation or demo narration.
- `ml-service/reports/` will store the actual evaluation artifacts
  (metrics files, calibration plots, false-negative logs) once produced,
  so results are reproducible and auditable rather than asserted.
