# Temporal Alignment and Leakage-Prevention Design

Status: **design document, grounded in the verified facts in
`docs/inventory_metadata_report.md`.** This document exists specifically
to satisfy the project's leakage-prevention rule: *for a prediction at
time T, features must only use information available at or before T,
unless explicitly defined as a forecast.*

## 1. What Temporal Information the Landslide Inventory Actually Provides

As established in `docs/inventory_metadata_report.md`, the Hao et al.
(2020) inventory does **not** have a per-record date field. What it does
provide:

- **A single, defined event window:** 1 June – 26 August 2018 (the 2018
  Kerala monsoon season), explicitly stated in the source paper as the
  period of "the most severe extreme rainfall event since 1924."
- All 4,728 positive records are landslides that occurred *sometime*
  within this window — the exact day is not recoverable from the
  dataset's documented attributes.

**Consequence:** this inventory cannot support a genuinely day-level
temporal model (e.g., "did rainfall in the 3 days before date X trigger
a landslide at location Y on date X specifically"). It can only support
a **coarser, event-window-level framing**: "did a landslide occur within
this zone during the defined high-rainfall window." Any feature or
model design that implies day-level precision from this label source
would be a false precision claim and must be avoided.

## 2. Observation Windows for Other Planned Sources

| Source | Native temporal grain | Usable window for this event | Status |
|---|---|---|---|
| IMD gridded rainfall | Daily | Full daily record from 1901–2024 covers the June–Aug 2018 window and any lookback period needed for antecedent totals | AVAILABLE (per `docs/data_sources.md` §2.1) |
| GPM IMERG | Half-hourly (aggregable) | 2000–present covers 2018; usable for 6h/24h/72h windows ending at/around the event window | AVAILABLE, pending NASA Earthdata access (§2.2) |
| Sentinel-2 | ~5-day revisit | Mission active since 2015, so pre-event (e.g., early-to-mid 2018) and post-event imagery both exist in principle | AVAILABLE, subject to cloud-cover gaps during the monsoon itself (§4.1) |
| ESA WorldCover | Annual snapshot (2020, 2021 only) | **No 2018 vintage exists.** The nearest available snapshot (2021) is roughly 3 years after the event | Documented mismatch — see §3 |
| MODIS NDVI (MOD13Q1) | 16-day composite | 2000–present covers 2018 directly | AVAILABLE |
| SRTM DEM | Static (Feb 2000 acquisition) | Predates the event by 18 years; terrain is assumed stable over that period except where a landslide itself changed it (see §4 static/dynamic split) | AVAILABLE, staleness caveat applies |
| SoilGrids | Static modeled surface | Not tied to a specific date at all | AVAILABLE (with modeled-data caveat), pending API-pause resolution |

## 3. Known Temporal Mismatches (documented, not hidden)

- **Land cover (WorldCover):** the only available vintages (2020, 2021)
  post-date the August 2018 event by 2–3 years. Using this as a "land
  cover at time of event" feature is an approximation, not a measurement
  — Kerala's land cover in 2018 may have already changed by the time
  WorldCover's 2021 snapshot was captured (indeed, the source paper
  itself found post-event land-use change was a live phenomenon at
  landslide sites). This mismatch must be stated wherever WorldCover-
  derived features are used, not silently treated as "current
  conditions in 2018."
- **DEM (SRTM):** static from 2000. Assumed representative of 2018
  terrain except at locations where a landslide (or other disturbance)
  has since altered the surface — which is precisely the phenomenon
  being modeled. This is a structural limitation of using a pre-event
  static DEM for a feature that is supposed to describe pre-event
  terrain: it is *actually* correct for pre-2000-disturbance terrain,
  but any terrain change between 2000 and 2018 (natural or
  anthropogenic) is invisible to it.

## 4. Static vs. Dynamic Variables

| Variable | Classification | Rationale |
|---|---|---|
| Elevation, slope, aspect, curvature (DEM-derived) | **Static** (for this MVP) | Single 2000-era DEM; no time-varying terrain data sourced |
| Land cover (WorldCover) | **Quasi-static** (annual snapshot, no true multi-year series for this event) | Only 2020/2021 vintages available; treated as static per-pixel context, with the mismatch in §3 documented |
| NDVI (MODIS) | **Dynamic** | 16-day composites exist for the actual 2018 period; can be aligned to a pre-event window |
| Soil properties (SoilGrids) | **Static** | Explicitly a modeled, non-dated surface |
| Rainfall (IMD, GPM IMERG) | **Dynamic** | Daily/sub-daily; this is the primary genuinely time-resolved feature category, and the only one that can be aligned to windows *before* the event in a meaningful sense |
| Historical landslide count | **Dynamic in principle, constrained in practice** | See §5 — leakage risk |

## 5. Leakage-Prevention Rule Applied

**Core rule (restated from the task instructions):** for a prediction at
time T, features must only use information available at or before T.

Applied to this specific dataset:

- **Rainfall features** (`rainfall_6h/24h/72h/7d`) must be computed
  using only rainfall data *ending at or before* the prediction
  reference time. Because the label itself only pins the event to a
  ~12-week window rather than a specific day, the "prediction reference
  time" (T) is itself a modeling choice that needs to be made carefully
  — e.g., using the peak rainfall date within the window (derivable
  independently from IMD/GPM rainfall data, not from the landslide
  inventory) as a proxy T, rather than an arbitrary or event-end date.
  This choice is **not yet made** and is flagged as an open item — it
  materially affects whether antecedent-rainfall features are
  genuinely pre-event or accidentally include rainfall from after a
  given landslide occurred within the window.
- **Historical landslide count** as a feature (proposed in
  `docs/data_dictionary.md`) is a clear leakage risk given this dataset:
  since all 4,728 positives share the same ~3-month event window, any
  "prior landslide count" feature computed naively from this same
  inventory would either be trivially zero (no prior events in this
  single-event dataset) or, worse, could leak future-window information
  if implemented carelessly (e.g., counting landslides elsewhere in the
  same event window as "history"). **Recommendation: exclude this
  feature from the first model iteration entirely**, or restrict it
  strictly to inventories from *other, earlier* events if such data is
  later obtained — not to be computed from within the same event window.
- **Land cover / NDVI "before" vs. "after":** Sentinel-2/MODIS/WorldCover
  imagery dated *after* 26 August 2018 must not be used as a "pre-event
  condition" feature for any record — this is the most direct concrete
  leakage risk in this pipeline design, since post-event vegetation loss
  at a landslide scar is definitionally correlated with the landslide
  having occurred there. All environmental/vegetation features intended
  as pre-event context must be explicitly filtered/dated to end before
  1 June 2018 (or before the peak-rainfall proxy T, once defined) — not
  simply "the most recent available image," which would very likely be
  a post-event image and would leak the outcome directly into the
  features.

## 6. Final Temporal Alignment (as currently defined — provisional)

```
Prediction reference time (T) = TO BE DEFINED — proposed as the date of
    peak rainfall within the 1 June–26 Aug 2018 window, per zone,
    derivable independently from IMD/GPM rainfall records (not from the
    landslide inventory itself, to avoid circularity)

Rainfall features   → computed using only rainfall data with timestamp ≤ T
Terrain features     → SRTM (dated ~2000), used as static, staleness documented
Land cover features   → WorldCover (2020/2021) used as approximate context,
                         explicitly NOT claimed as "as of 2018"; mismatch documented
NDVI features         → MODIS composite selected to end before T
Soil features         → SoilGrids, static, undated
Historical landslide  → EXCLUDED for the MVP (see §5 leakage risk)
```

This alignment is provisional because **T itself is not yet defined**
— this is the single most important open item carried out of Task 2 and
must be resolved (with a documented, defensible method, not an
arbitrary date) before any rainfall feature is actually computed.
