# NER Inventory: CRS Resolution and Duplicate Audit

Status: **Real audit, run against the actual NER subset (8,546 records)
via `ml-service/src/data/ner_duplicate_audit.py`.** No records deleted
or modified; source files untouched.

## CRS Conclusion

**WGS84 geographic (OGC:CRS84 axis convention: longitude, latitude) —
practically and numerically equivalent to EPSG:4326 for this dataset's
stored point coordinates.**

**Evidence (not a guess):**
- The source `.prj` file's own WKT explicitly names `GCS_WGS_84_CRS84`
  and, once parsed, resolves to `DATUM["WGS_1984", AUTHORITY["EPSG","6326"]]`
  and `SPHEROID["WGS 84", ..., AUTHORITY["EPSG","7030"]]` — these are the
  exact defining datum and ellipsoid authority codes for EPSG:4326.
- The parsed axis order is `Longitude (east), Latitude (north)` — this
  is literally the OGC CRS84 convention (x=lon, y=lat), which matches
  how the coordinates are actually stored and how geopandas/shapely
  already read `geometry.x`/`geometry.y`.
- Coordinate plausibility cross-check: all 8,546 points fall within
  India's real longitude/latitude range in that exact (lon, lat) order.
- `pyproj`'s `crs.to_epsg()` returns `None` because CRS84's formally
  swapped axis order prevents automatic EPSG resolution — this is a
  metadata/interoperability quirk, not evidence of a different datum.

**Conclusion:** treating this CRS as EPSG:4326 for all downstream
spatial operations (reprojection, distance, joins) is directly
justified by the source file's own embedded authority codes, not
assumed.

## Duplicate-Coordinate Audit (739 records, 287 groups)

| Finding | Count | % of groups |
|---|---|---|
| Groups with different `SLIDE_NO` per record (distinct events, same reported point) | 282 | 98.3% |
| Groups where all records share the same `SLIDE_NO` | 5 | 1.7% |
| Groups that are fully identical rows (excl. `OBJECTID`/geometry) | 0 | 0% |

**Interpretation:** the overwhelming majority of coordinate duplication
is **distinct, individually-identified landslides sharing a reported
point** — plausible given that field/toposheet-based reporting often
records a village or toposheet centroid rather than the precise scarp
location (consistent with the same limitation observed in the Kerala
inventory's near-duplicate clustering, Phase 3B). **Zero groups are
exact duplicate rows.** No conclusive evidence supports treating
coordinate duplication as database duplication.

## Duplicate-`SLIDE_NO` Audit (22 records, 11 groups)

| `SLIDE_NO` groups | Same coordinates | Fully identical rows |
|---|---|---|
| 6 of 11 | Yes | No |
| 5 of 11 | No | No |

**Interpretation:** inconclusive. None of the 11 pairs are exact
duplicate rows, but 5 of 11 pairs have **different coordinates entirely**
under the same ID — this could reflect a genuine data-entry ID reuse in
the source, a multi-part record, or a real re-activation event recorded
under a related ID. **This cannot be conclusively resolved from the
data alone** and is not deduplicated.

## Reproducible Rule (only the conclusively justified one)

`OBJECTID` is confirmed unique across all 8,546 NER records and is the
correct canonical per-record identifier for any leakage-audit grouping
(e.g. `leakage_audit.check_duplicate_event_leakage`) — **`SLIDE_NO`
must not be used as a group key** without further GSI-side
verification, since it is demonstrably non-unique. Implemented as
`ner_duplicate_audit.assign_canonical_event_id()`.

## What Remains Unresolved

- The 22 duplicate-`SLIDE_NO` records require GSI-side clarification
  before any deduplication decision can be made.
- Coordinate-duplication's implication for negative-sampling buffer
  design (per `docs/negative_sampling.md`) is not addressed here — this
  audit only characterizes the duplicates, it does not extend the
  negative-sampling strategy to NER.
