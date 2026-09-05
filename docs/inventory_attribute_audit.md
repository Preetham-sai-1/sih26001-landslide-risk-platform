# Landslide Inventory — Attribute-Level Forensic Audit (Phase 3B)

Status: **Real audit, run against the actual uploaded shapefile.**
`ml-service/data/raw/kerala_landslide_inventory_2018/Kerela landslide.shp`
(+ `.dbf`/`.shx`/`.prj`/`.cpg`), loaded with `geopandas` and inspected
directly. Every number in this document is the result of code executed
against the real file in this session — none are drawn from the paper
unless explicitly marked as such. The raw files were not modified.

## File Integrity

All five required components were present in the uploaded archive and
copied unmodified into `ml-service/data/raw/kerala_landslide_inventory_2018/`:
`.shp`, `.dbf`, `.shx`, `.prj`, `.cpg`. MD5 checksums were recorded at
copy time for provenance (see the acquisition-status note in that
directory — a follow-up note documenting the successful acquisition
should replace the earlier blocked-acquisition status).

## Headline Structural Facts

- **Number of records: 4,728.** This exactly matches the count reported
  in the peer-reviewed paper — real confirmation that this is the
  described dataset.
- **Number of columns: 21** (20 attribute fields + `geometry`).
- **Geometry type: Point** (uniform across all 4,728 records — confirmed
  by direct inspection, matching the paper's stated design).
- **CRS: EPSG:4326** (WGS 84 geographic), confirmed by reading `gdf.crs`
  directly from the loaded file and independently by reading the `.prj`
  file's raw text (`GEOGCS["GCS_WGS_1984"...]`). This resolves the
  "CRS — REQUIRES RAW FILE INSPECTION" item from Phase 3.
- **Encoding (`.cpg`): UTF-8.**

---

## TASK 1 — Attribute Inventory

| Field | Data type | Unique values | Missing (count / %) | Min / Max (numeric) | Representative values (categorical) |
|---|---|---|---|---|---|
| `No` | int64 | 2,501 (incl. 0) | 0 / 0% | 0 / 2,507 | — |
| `District` | string | 13 | 0 / 0% | — | Idukki, Palakkad, Malappuram, Wayanad, Thrissur, Kozhikode, Kannur, Ernakulam, Pathanamthitta, Kottayam, Kasaragod, Kollam, Thiruvananthapuram |
| `NRSC` | string | 2 | 0 / 0% | — | Y (2,899), N (1,829) |
| `GSI` | string | 2 | 0 / 0% | — | N (3,333), Y (1,395) |
| `New` | string | 2 | 0 / 0% | — | N (3,872), Y (856) |
| `Type_of_sl` | string | 3 | 0 / 0% | — | DF (2,816), SS (1,760), RF (152) |
| `Length` | int64 | 408 | 0 / 0% | 0 / 3,138 | — |
| `Width` | int64 | 84 | 0 / 0% | 0 / 306 | — |
| `Area` | float64 | 3,469 | 0 / 0% (see note below) | 0.0 / 23,887,853.0 | — |
| `Building_I` | int64 | 11 | 0 / 0% | 0 / 23 | — |
| `Road_impac` | string | 3 | 0 / 0% | — | N (3,831), C (625), D (272) |
| `Impact_Agr` | string | 8 | 0 / 0% | — | N (2,534), FMP (1,194), SPL (433), TEA (176), FCP (162), GMC (101), BSL (72), RUB (56) |
| `LU_2010` | string | 24 | 0 / 0% | — | FMP (1,227), FDN (1,142), SPL (424), BRF (382), BUI (258), FNO (231), FCP (189), TEA (172), and 16 more |
| `LU_2018` | string | 25 | 0 / 0% | — | FMP (1,185), FDN (1,103), SPL (422), BRF (387), BUI (334), FNO (243), and 19 more |
| `Specific_r` | string | 24 | 3,864 / 81.73% | — | 2 (267), 1 (266), 10 (137), 5 (59), 4 (36), 3 (30), plus combined codes like "1/2", "3/10" |
| `Remarks` | string | 606 | 3,698 / 78.21% | — | "Road blocked" (80), "Built up increased" (70), "The slide occur in the cultivated land." (26), plus 603 more distinct free-text entries |
| `POINT_X` | float64 | 4,708 | 0 / 0% | 75.015414 / 77.396262 | — |
| `POINT_Y` | float64 | 4,718 | 0 / 0% | 8.474453 / 12.654953 | — |
| `Reclass_Sl` | int64 | 9 | 0 / 0% | 1 / 9 | — |
| `RASTERVALU` | float64 | 2,917 | 0 / 0% | 0.0 / 87.8661727905 | — |
| `geometry` | geometry (Point, XYZ) | 4,728 distinct (0 exact coordinate duplicates) | 0 / 0% | see Task 4 | — |

**Important note on `Area` missingness:** `Area` shows **0 records with a
true `NaN`**, but **420 records (8.88%) have `Area == 0.0`**. This
number — 420 — is the exact figure the source paper reports as
"landslides with no area estimate" (per `docs/inventory_metadata_report.md`).
This is a real, confirmed finding: **the source data uses `0` as a
sentinel value for "not measured," not a null/NaN.** Any pipeline that
treats `Area == 0` as a genuine zero-area landslide (rather than
missing data) would be introducing a real, undetected data-quality bug.
Also confirmed: all 420 zero-`Area` records also have `Length == 0` and
`Width == 0` simultaneously — consistent with a single "not measured"
flag applied across all three size fields together, not independent
missingness per field.

### Interpretation/purpose — documented vs. not

| Field | Interpretation | Documented by source paper? |
|---|---|---|
| `District` | Kerala administrative district | Yes — matches the paper's district-level reporting |
| `NRSC`, `GSI`, `New` | Source-confirmation flags: whether this landslide was identified by NRSC's OBIA analysis, GSI's field survey, and/or newly digitized by the study authors | Yes — the paper explicitly describes exactly these three source categories and reports counts that match this file exactly (see Task 3 cross-tab below) |
| `Type_of_sl` | Landslide process type: DF = debris flow, SS = shallow slide, RF = rock fall | Yes — the paper states these exact three categories and reports counts (DF 2,816 / SS 1,760 / RF 152) that match this file exactly |
| `Length`, `Width`, `Area` | Landslide physical dimensions | Area is explicitly named in the paper's attribute list; Length/Width are not separately named in the paper text retrieved, but are self-evidently dimensional measurements consistent with the same "physical extent" attribute family |
| `Building_I`, `Road_impac`, `Impact_Agr` | Damage/impact indicators (buildings, roads, agriculture) | Yes, at the category level — the paper states "damage (building/road/agriculture impact)" is recorded; the exact code meanings (e.g., what `C` vs `D` mean in `Road_impac`, or what count unit `Building_I` uses) are **UNKNOWN** — not stated in the paper text retrieved |
| `LU_2010`, `LU_2018` | Land use classification, 2010 and 2018 | Yes, at the category level — the paper explicitly describes exactly these two attributes and states there are 25 defined land-use classes; the exact code-to-label mapping (e.g., what `FMP`, `FDN`, `BRF` stand for) is **UNKNOWN** — the paper mentions example class names in prose (dense natural forest, mixed forest plantation, tea/rubber plantation, bare cut slopes, quarry) but does not give a verified code table in the text retrieved, and the accompanying metadata Word document referenced by the paper was not available in this session |
| `Specific_r` | "Specific reason for failure" | Yes, at the category level — the paper states 10 defined reason categories exist; the exact numeric-code-to-reason mapping is **UNKNOWN** |
| `Remarks` | Free-text field-survey notes | Yes, named in the paper; content is unstructured free text |
| `No` | Appears to be an original sequential record identifier | **UNKNOWN** — not documented in the paper text retrieved. See Task 3 analysis below for what was actually found about it |
| `POINT_X`, `POINT_Y` | Longitude/latitude, apparently redundant with `geometry` | **UNKNOWN / INFERRED** — not documented; standard GIS-software-generated fields (e.g., from an "Add XY Coordinates" tool), but this is our inference from the field names and values, not a documented fact |
| `Reclass_Sl` | Appears to be a 9-class reclassification of `RASTERVALU` | **UNKNOWN / INFERRED** — see Task 3 below |
| `RASTERVALU` | A value extracted from an unspecified raster layer at each point | **UNKNOWN** — not documented anywhere retrieved. `RASTERVALU` is the literal default output field name produced by certain GIS "Extract Values to Points" operations, which is suggestive of *how* the field was created but says nothing about *which* raster it came from. This is explicitly flagged as UNKNOWN, not guessed |

---

## TASK 2 — Field Classification

Legend: **A** = Safe Predictor, **B** = Potential Predictor (needs
verification), **C** = Target/Label, **D** = Post-Event Information,
**E** = Metadata/Identifier, **F** = Leakage Risk, **G** = Unknown.

| Field | Classification | Reasoning |
|---|---|---|
| `No` | **E** | Behaves like a record identifier (2,500 unique non-zero sequential-looking values); carries no predictive/physical meaning. The large number of zeros (2,228) does not correspond cleanly to any other documented flag (checked against `New`: only 675 of 2,228 zero-`No` records are also `New == Y` — no clean explanatory relationship found), so its exact meaning is otherwise unclear, but its role as an identifier/bookkeeping field is clear enough to classify it as metadata rather than unknown. |
| `District` | **B** | Administrative geography, not itself a landslide characteristic. Could be a legitimate categorical predictor (proxy for regional geology/climate) but risks the model learning "which district GSI/NRSC happened to survey" rather than genuine susceptibility (per the documented road-survey bias in `docs/inventory_metadata_report.md`) — needs verification against independent terrain/rainfall features before being trusted as causally meaningful. |
| `NRSC` | **F** | Directly states which detection method found this record. This is definitionally **only known because the landslide was already confirmed** — it cannot exist for a "no landslide occurred here" negative sample by construction, making it a structural leakage field, not merely a risky one. |
| `GSI` | **F** | Same reasoning as `NRSC` — a detection/survey-source flag that only exists for confirmed positives. |
| `New` | **F** | Same reasoning — flags whether the study authors newly digitized this record; only meaningful for known positives. |
| `Type_of_sl` | **D** | This is the landslide's own process classification (debris flow / shallow slide / rock fall) — it describes a characteristic of the event **after it happened**. It cannot be known in advance for a prediction task ("will a landslide occur," not "what type will it be") and must not be used as an input feature to predict occurrence. |
| `Length` | **D / F** | A physical dimension of the landslide itself, measurable only after occurrence. Also a leakage risk in the strict sense: non-zero for essentially every positive by construction (only 0 when explicitly unmeasured) and undefined for any true negative. |
| `Width` | **D / F** | Same reasoning as `Length`. |
| `Area` | **D / F** | Same reasoning as `Length`/`Width`. Additionally has the documented `0`-as-missing sentinel issue (Task 1), so even its "missingness" pattern is post-event survey metadata, not a usable predictor. |
| `Building_I` | **D** | A damage count — this is a *consequence* of the landslide, observed afterward, not a pre-event condition. |
| `Road_impac` | **D** | Same reasoning — post-event damage/impact category. |
| `Impact_Agr` | **D** | Same reasoning — post-event agricultural impact category. |
| `LU_2010` | **B** | Land use *before* the event (2010) is, in principle, legitimate pre-event context (consistent with the planned `land_cover` feature in `docs/data_dictionary.md`). Classified as "requires verification" rather than "safe" because: (1) the exact code meanings are undocumented (Task 1), and (2) 2010 land use is 8 years stale relative to the actual 2018 event — whether it's a good enough proxy for pre-event conditions needs an explicit judgment call, not an assumption. |
| `LU_2018` | **F** | Land use *as recorded for this dataset's 2018 attribute* is ambiguous in timing relative to the landslide itself within the 2018 monsoon season, and — critically — 707 of 4,728 records (14.95%) show a **different** LU_2018 code than LU_2010, which is very plausibly the landslide's own scar/disturbance being reclassified as different land use. Using this as a predictive input risks directly leaking the outcome (a landslide scar reclassified as "bare/disturbed" land use would trivially predict itself). Must not be used as a pre-event predictor. |
| `Specific_r` | **D** | Explicitly a post-event field-survey judgment about *why* a confirmed landslide occurred — this is an expert's after-the-fact causal attribution, not a measurable pre-event condition, and is also 81.7% missing. |
| `Remarks` | **D** | Free-text field notes, overwhelmingly describing post-event damage/observations ("Road blocked," "Built up increased," etc., per Task 1's representative values) — not usable as a pre-event feature. |
| `POINT_X`, `POINT_Y` | **E** | Redundant coordinate metadata. Found (Task 4) to have small but non-trivial discrepancies (up to ~150 m) from the actual `geometry` field — see Task 4 finding. Classified as metadata, not a predictor; if coordinates are needed, `geometry` should be used as authoritative, not these fields. |
| `Reclass_Sl` | **G** | Its relationship to `RASTERVALU` (clean, monotonic ~5-unit interval binning, confirmed by direct groupby analysis in Task 3) is clear, but **what `RASTERVALU` itself represents is undocumented**, so `Reclass_Sl` inherits the same uncertainty. Cannot be classified as safe or even "requires verification" until `RASTERVALU`'s source is identified — see Task 3. |
| `RASTERVALU` | **G / F** | Genuinely unknown source raster. Classified as unknown **and** flagged as a leakage-risk candidate specifically because its name (a default "Extract Values to Points" output field) means it was almost certainly sampled from some raster layer at each landslide point — and if that raster were itself derived using this landslide inventory (e.g., a susceptibility model calibrated on these same points), using it as a feature would be severely circular. There is no information in this file or the paper confirming or ruling this out. |
| `geometry` | **A (as a coordinate reference only, not as a feature value itself)** | The spatial location is exactly what's needed to join against DEM/rainfall/land-cover layers (per `docs/spatial_alignment.md`). Classified safe as a *join key*, not as a directly-modeled numeric feature. |

---

## TASK 3 — Critical Leakage Audit (fields specifically named in the task)

| Field | Only knowable after the landslide? | Verdict |
|---|---|---|
| `NRSC` | **Yes.** Confirmed by cross-tabulation: `NRSC=='Y'` for 2,899 records, `NRSC=='Y' & GSI=='Y'` for exactly 422 records — precisely matching the paper's stated "422 landslides confirmed by both sources" figure. This field is a detection-method record that presupposes detection, i.e., presupposes the landslide already happened and was found. **MUST NOT be used as a predictive feature.** |
| `GSI` | **Yes.** Same reasoning; `GSI=='Y'` for 1,395 records — matches the paper's 973 (GSI-only) + 422 (both) = 1,395 exactly. **MUST NOT be used.** |
| `Type_of_sl` | **Yes.** Landslide process type is an intrinsic characteristic of the event itself, unobservable before it occurs. **MUST NOT be used.** |
| `Length` | **Yes.** A physical measurement of the landslide's own extent. Value is 0 only when explicitly unmeasured (420 cases, tied to the same 420 zero-`Area` cases), never a real pre-event quantity. **MUST NOT be used.** |
| `Width` | **Yes.** Same reasoning as `Length`. **MUST NOT be used.** |
| `Area` | **Yes.** Same reasoning; additionally carries the `0`-as-missing-sentinel data-quality issue documented in Task 1. **MUST NOT be used.** |
| `Building_I` | **Yes.** A count of damaged buildings — a consequence, not a cause. Confirmed non-degenerate: 645 records (13.6%) have `Building_I > 0`, up to a maximum of 23. **MUST NOT be used.** |
| `Road_impac` | **Yes.** Post-event road-damage category (`N`/`C`/`D`, meanings of `C`/`D` undocumented but clearly a damage-severity code from context and field naming). **MUST NOT be used.** |
| `Impact_Agr` | **Yes.** Post-event agricultural-impact category. **MUST NOT be used.** |
| `LU_2010` | **No, not inherently** — this is a *pre-event* (2010) land-use snapshot, which is exactly the kind of pre-event context feature the project wants (see Task 2). Flagged **B**, not **F**, but still requires code-meaning verification before use. |
| `LU_2018` | **Ambiguous, and the data itself shows why it's risky.** 707 records (14.95%) have a `LU_2018` code different from `LU_2010` at the *same point* — a large, real, directly-measured shift concentrated exactly at landslide locations is consistent with the landslide's own disturbance being reflected in the 2018 land-use classification. **MUST NOT be used** as a pre-event predictor. |
| `Specific_r` | **Yes.** Explicitly a post-event causal judgment recorded by field surveyors. **MUST NOT be used.** |
| `Remarks` | **Yes.** Free-text post-event field notes (representative values in Task 1 are damage descriptions like "Road blocked"). **MUST NOT be used.** |
| `Reclass_Sl` | **Unknown — cannot be ruled out.** Its exact source (`RASTERVALU`, see below) is undocumented. Not confirmed as post-event, but not confirmed as safe either. **Requires verification before any use; excluded from the allowed set until then.** |
| `RASTERVALU` | **Unknown — cannot be ruled out.** No documentation identifies the source raster. Because the field-naming pattern is consistent with a GIS point-extraction operation performed specifically against this landslide point set, there is a real, undismissable possibility that it reflects a raster built using knowledge of these same landslide locations (which would make it circularly post-event in effect, even if it isn't a literal "damage" field). **Requires verification before any use; excluded from the allowed set until then.** |

---

## TASK 4 — Geometry Audit

- **Geometry type:** Point (uniform, confirmed for all 4,728 records; 0 nulls, 0 empty geometries).
- **CRS:** EPSG:4326 (WGS 84 geographic), confirmed both via `gdf.crs` and by directly reading the `.prj` file text.
- **Bounding box:** longitude **[75.015414, 77.396262]**, latitude **[8.474453, 12.654953]**. This is broadly consistent with Kerala's general geographic extent, but **this document does not assert an authoritative match against an official Kerala boundary polygon**, because no verified boundary layer (geoBoundaries/GADM, per `docs/data_sources.md` §8) has actually been loaded and intersected against these points in this session — doing so is listed as a remaining data requirement below, not claimed as already done.
- **Latitude range:** 8.474453°N to 12.654953°N.
- **Longitude range:** 75.015414°E to 77.396262°E.
- **Z values:** **Every single record has `has_z = True`, and every single Z value is exactly `0.0`** (confirmed: 4,728 of 4,728 records, 1 unique Z value, that value being `0.0`). Per the task instruction not to assume Z represents elevation: **it does not** — a genuine elevation field would show variation across 4,728 points spread over a mountainous state; a constant `0.0` across every record is the signature of a shapefile that was saved with 3D/Z-enabled geometry but never had real Z data populated (a common, incidental GIS export artifact). **Conclusion: the Z dimension carries no information and must not be used or interpreted as elevation.** Elevation, if needed, must come from the DEM sources documented in `docs/data_sources.md`, not from this file's Z coordinate.
- **Missing/invalid geometries:** 0 null, 0 empty, 0 topologically invalid (all checked directly).
- **Exact duplicate coordinates:** **0** records share an identical (rounded to 6 decimal places, ≈0.1 m precision) X/Y pair.
- **Near-duplicate coordinates:** a real, non-trivial number exist. Using a projected metric CRS (EPSG:32643, UTM 43N) and `scipy.spatial.cKDTree`:
  - Within **10 m**: **6 pairs**
  - Within **30 m**: **91 pairs**
  - Within **100 m**: **816 pairs**
  Several of the closest pairs (e.g., 0.98 m, 11.28 m apart) occur between records with **different `No` values but the same `District`**, suggesting either (a) genuinely closely-spaced but distinct landslides (plausible in a debris-flow event, where multiple failures can occur meters apart along the same slope), or (b) possible digitization/duplication artifacts from the multi-source reconciliation process described in the paper. **This cannot be resolved from the data alone** — it is reported as a finding requiring judgment during negative-sampling design (buffer distance selection, `docs/negative_sampling.md`), not resolved here.
- **Suspicious coordinates outside Kerala:** No coordinates were found that are obviously implausible (e.g., 0,0 "null island," or far outside South Asia) — the full bounding box is plausible for Kerala. A rigorous "inside Kerala's actual boundary polygon" check was not performed in this session (see remaining data requirements).
- **`POINT_X`/`POINT_Y` vs. `geometry.x`/`geometry.y`:** These are **not always identical** — maximum absolute difference found: **0.000725° longitude, 0.001420° latitude** (roughly up to ~150 m at this latitude). This is a genuine, confirmed data-quality finding: the `POINT_X`/`POINT_Y` attribute fields and the actual point `geometry` are two independently-stored representations of location that have drifted apart by up to ~150 m for at least some records, most plausibly because `POINT_X`/`POINT_Y` were computed at an earlier processing stage before some points were manually repositioned (consistent with the paper's description of manual point-adjustment during quality control). **Recommendation: treat `geometry` as authoritative; do not use `POINT_X`/`POINT_Y` for any spatial computation.**

---

## TASK 5 — Source Metadata: Documented vs. Inferred

| Finding | Status |
|---|---|
| Total record count = 4,728 | **DOCUMENTED BY SOURCE** (paper) — and independently **CONFIRMED BY US** against the real file |
| `NRSC`/`GSI`/`New` = the three source-confirmation categories, with counts 2,477 / 973 / 856 and 422 dual-confirmed | **DOCUMENTED BY SOURCE** (paper states the categories and percentages) — and **CONFIRMED BY US** exactly via direct cross-tabulation of the real file (2,477 + 973 + 422 + 856 = 4,728 exactly) |
| `Type_of_sl` categories (DF/SS/RF) and counts (2,816/1,760/152) | **DOCUMENTED BY SOURCE** (paper) — **CONFIRMED BY US** exactly against the real file |
| Idukki district accounts for the largest single share of landslides | **DOCUMENTED BY SOURCE** (paper states 47.02%) — **CONFIRMED BY US**: 2,223 of 4,728 = 47.03% in this file, matching within rounding |
| 420 records missing an area estimate | **DOCUMENTED BY SOURCE** (paper) — **CONFIRMED BY US**, and additionally we determined *how* this is encoded in the file (as `Area == 0.0`, not `NaN`) — that encoding detail is **INFERRED BY US**, not stated in the paper |
| CRS = EPSG:4326 | **NOT stated in the paper text retrieved** — **DOCUMENTED BY THE FILE ITSELF** (`.prj` contents), which we read directly |
| Meaning of `LU_2010`/`LU_2018` category codes (e.g., `FMP`, `FDN`, `BRF`) | **NOT DOCUMENTED** — the paper names *example* land-use categories in prose but the file's actual codes were not matched against a verified code table (the metadata Word document referenced by the paper is not available in this session). **UNKNOWN**, not inferred/guessed. |
| Meaning of `Road_impac` codes `C`/`D` | **NOT DOCUMENTED.** **UNKNOWN.** |
| Meaning of `RASTERVALU` and `Reclass_Sl` | **NOT DOCUMENTED anywhere available.** The fact that `Reclass_Sl` is a clean ~5-unit-interval binning of `RASTERVALU` is **INFERRED BY US** from direct statistical analysis (groupby min/max per class shows contiguous, non-overlapping ~5-point bands) — this is a strong pattern, not a documented fact, and is reported as an inference, not asserted as the field's true construction method. |
| Purpose of `No` field | **NOT DOCUMENTED. UNKNOWN.** Its behavior (mostly-unique sequential integers with many zeros) is **directly observed**, but its intended meaning is not inferred beyond "likely an identifier," since guessing further would go beyond what the data supports. |
| Purpose/construction of `POINT_X`/`POINT_Y` | **NOT DOCUMENTED.** That they are likely GIS-software-generated coordinate-duplicate fields is **INFERRED BY US** from field naming conventions, not confirmed. |

---

## Files Produced by This Phase

- `docs/inventory_attribute_audit.md` — this document
- `reports/inventory_attribute_statistics.csv` — machine-readable per-field statistics
- `ml-service/src/data/feature_policy.yaml` — machine-readable allowed/excluded feature policy
