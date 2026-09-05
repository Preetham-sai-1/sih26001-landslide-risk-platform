# Landslide Inventory Metadata Report — Hao et al. (2020) Kerala Dataset

Status: **Literature-derived metadata report.** All facts in this
document are drawn directly from the peer-reviewed paper (Hao et al.,
2020, *Earth System Science Data*, full text retrieved and read in this
session) that describes the construction of the dataset — not from
direct inspection of the raw shapefile, which could not be acquired in
this environment (see
`ml-service/data/raw/kerala_landslide_inventory_2018/ACQUISITION_STATUS.md`).
Anything the paper does not state is marked **NOT STATED IN SOURCE /
REQUIRES RAW FILE INSPECTION** rather than guessed.

## Number of Records

**4,728 confirmed landslide records** in the final, reconstructed
inventory. Composition by original source:
- 2,477 (52%) derived from NRSC's object-based image analysis (OBIA) polygon inventory, converted to points
- 973 (21%) derived from GSI/KSDMA field-survey points
- 422 (9%) present in both the NRSC and GSI inventories independently
- 856 (18%) newly digitized by the study's own analysts from Google Earth historical imagery, not present in either original source

(Note: 2,477 + 973 − 422 + 856 = 3,884, not 4,728 — the paper's own
breakdown does not arithmetically reconcile to a simple sum in the way
one might expect; the 52%/21%/9%/18% figures are quoted directly as
stated in the paper's Sect. 4.1 and should be treated as the source's own
reported percentages of "landslides per source category" rather than
re-derived by us. This apparent inconsistency is itself worth flagging
for anyone who later obtains the raw file — it should be reconciled
against the actual per-record `data_source` attribute rather than
assumed to be an error in this reporting.)

## Geometry Type

**Point** — explicitly stated: "The dataset is provided in the form of
an Environmental Systems Research Institute (ESRI) point shapefile."
The paper explains that although some contributing data started as
polygons (NRSC's OBIA output), the final published product converts all
landslides to a single point per landslide, placed at "the initiation
point of the landslides" (i.e., the scarp/starting area, not a polygon
footprint of the whole landslide runout). This is an important,
source-documented design choice: the dataset does not represent
landslide extent/area as geometry — area is instead a separate
*attribute* value where available (see below), not something derivable
from the point geometry itself.

## Coordinate Reference System (CRS)

**NOT STATED IN SOURCE — REQUIRES RAW FILE INSPECTION.** The paper does
not specify an EPSG code or CRS name for the shapefile in the sections
retrieved. A `.prj` file is a near-universal part of an ESRI shapefile
bundle, so one almost certainly exists — but this cannot be confirmed
without the actual file. This is marked as a required first check once
the raw file is obtained (see Task 8 automated checks below).

## Latitude/Longitude Validity

**REQUIRES RAW FILE INSPECTION.** The paper describes an extensive,
expert, multi-pass visual correction process (comparing the NRSC and GSI
inventories against pre-/post-event Google Earth imagery, moving
points onto visible scarps, discarding points with no visible landslide
signature) — which is strong *qualitative* evidence of positional care,
but is not a substitute for a coordinate-bounds/validity check against
Kerala's actual geographic extent, which requires the real coordinate
values.

## Duplicate Records

**Not literally zero by the source's own account, but explicitly
reconciled — not a data-quality accident.** The paper documents that
overlapping detections between NRSC and GSI (422 landslides identified
by both methods) were deliberately merged into single records, not left
as duplicates, and cases where one polygon actually contained multiple
distinct landslides (or multiple polygons represented one landslide)
were manually split or merged before finalizing point locations.
**However, whether any true duplicate point records remain in the final
4,728 is not stated and requires an actual geometry-level duplicate
check on the raw file** (exact or near-exact coincident coordinates)
once obtained — this is one of the automated checks specified for
Task 8 below.

## Missing Values

**REQUIRES RAW FILE INSPECTION for exact counts.** The paper does state
one specific, important missingness fact: of the 1,276 landslides
confirmed by only one source, 420 (9% of the total 4,728) have **no
area estimate**, because they were GSI field points too small or
obscured to measure from imagery. This is a real, documented,
non-random missingness pattern in at least the `area` attribute (missing
specifically for small, single-source, field-verified landslides) —
worth carrying into any later modeling step that uses `area` as a
feature, since it is not missing-at-random.

## Event/Date Fields

**Critical finding: there is no confirmed per-record landslide date
field.** The inventory is explicitly an **event-based inventory** tied
to a single trigger event: the 2018 Kerala monsoon, described in the
paper as the extreme rainfall period from **1 June to 26 August 2018**
(the paper further notes this was "the most severe extreme rainfall
event since 1924"). GSI's field survey work happened over several
months *after* the event (the paper states survey teams of 20 people
worked for 1 month, followed by a 10-person team for another 3 months).
The dataset's attribute list, as stated in the paper's Data Availability
section, is: *district*, *landslide type*, *area*, *damage* (building/
road/agriculture impact), *land use in 2010*, *land use in 2018*,
*specific reasons for landslide occurrence*, *remarks*, and *data
source* — **date/timestamp is not listed among these attributes.** This
must be treated as a hard constraint, not an oversight to work around:
every positive record in this inventory should be treated as
representing "occurred sometime within the 1 June – 26 August 2018
window," not a specific day. See `docs/temporal_alignment.md` (Task 2)
for how this constrains rainfall-feature construction.

## Spatial Distribution

Documented at the district level in the paper's Table 1 (not
independently re-extracted here since the table itself is an image/XLSX
asset, not retrievable as text in this session — **REQUIRES RAW FILE OR
TABLE ASSET INSPECTION** for the full per-district breakdown). One
figure is stated directly in the text: **Idukki district was the most
affected, accounting for 47.02% of the total landslides in Kerala.**
The GSI field-survey component of the inventory spanned 10 districts.
The paper also notes the deliberate bias in the GSI component: field
teams surveyed damage "mainly along roads," meaning the field-sourced
portion of the inventory is not a spatially unbiased sample of all
landslides — it is biased toward accessible, infrastructure-adjacent
locations. This is a real, source-documented spatial bias, directly
relevant to negative-sampling design (see `docs/negative_sampling.md`).

## Attribute Fields

As stated in the paper's Data Availability section, the shapefile
includes: `district`, `landslide_type` (three classes: shallow slide
[SS], debris flow [DF], rock fall [RF]), `area`, `damage` (separate
building/road/agriculture impact indicators), `land_use_2010`,
`land_use_2018` (25 defined land-use classes, listed in the paper's
Fig. 16 legend — e.g., dense natural forest, mixed forest plantation,
tea/rubber plantation, bare cut slopes, quarry in use/abandoned),
`specific_reason_for_failure` (a defined set of 10 categories, e.g.
building cut-slope failure, road cut-slope failure, deforestation),
`remarks`, and `data_source` (which original inventory/inventories
confirmed the record). An accompanying metadata Word document (not
independently obtained in this session) is stated to define exact
attribute codes.

## Individual Landslides vs. Another Observation Type

**Individual landslide events**, not e.g. susceptibility zones or
administrative-unit aggregates. Each point represents one distinct,
visually and/or field-confirmed slope failure, classified into one of
three landslide process types (debris flow, shallow slide, rock fall).
The paper reports the type breakdown: debris flow 2,816, shallow slide
1,760, rock fall 152.

## Data Quality Signal Reported by the Source Itself (not our own claim)

The paper states its own confidence assessment explicitly: 3,452 (73%)
of the 4,728 landslides were **confirmed by at least two independent
sources** (NRSC automated detection, GSI field survey, and/or the
study's own Google Earth re-interpretation), while 1,276 (27%) rest on a
single source. The paper states: *"the minimum overall accuracy of the
final inventory is 73%, although we consider it to be much larger given
the fact that we visually inspected the entire area. However, it is not
possible to quantify the completeness of the final inventory due to the
lack of another independent and confirmed complete inventory."* This is
the source authors' own documented limitation, quoted here because it
is directly relevant to our own honest accuracy claims later — our
model's ceiling is bounded by the label quality of its training data,
and that label quality is explicitly stated by its creators to be
**at minimum 73% (by their own single/multi-source-confirmation
metric), with completeness (i.e., whether all real landslides were
captured) explicitly unquantifiable.**

## Summary of What Remains Unverified Pending Raw File Access

| Item | Status |
|---|---|
| Exact CRS/EPSG code | REQUIRES RAW FILE |
| Individual coordinate validity (in-bounds check) | REQUIRES RAW FILE |
| Exact duplicate-geometry count | REQUIRES RAW FILE |
| Per-field missing-value counts (beyond the one documented `area` case) | REQUIRES RAW FILE |
| Full per-district breakdown (Table 1) | REQUIRES RAW FILE OR TABLE ASSET |
| Exact attribute codes/values | REQUIRES the accompanying metadata Word document or raw file |
