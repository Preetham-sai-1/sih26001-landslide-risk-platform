# Kerala 2018 Landslide Inventory — Raw Data Acquisition Status

## STATUS: ACQUIRED — 2 September 2026 (Phase 3B)

**Update:** the raw shapefile bundle was provided directly by the user
as an upload (`Kerela_landslide.zip`) and has been placed, unmodified,
in this directory as the five-file ESRI shapefile bundle:
`Kerela landslide.shp`, `.dbf`, `.shx`, `.prj`, `.cpg`. All five
components were verified present before use. See
`docs/inventory_attribute_audit.md` for the full forensic inspection of
this file's actual contents (4,728 records, confirmed against the
source paper's own reported figures).

**The blocker described below (Phase 3) is resolved for this specific
file.** It is retained in this document as an accurate historical record
of why the file could not be obtained automatically in this sandboxed
environment, since the same network restriction still applies to every
*other* data source listed in `docs/data_sources.md` (rainfall, DEM,
satellite, land cover, NDVI, soil, boundaries) — those still require
either manual acquisition and upload, or a network-enabled environment.

---

## Original Status (Phase 3): NOT ACQUIRED — environment network restriction (verified, not assumed)

This directory is where the raw Hao et al. (2020) landslide inventory
shapefile is supposed to live, per the repository's data conventions
(`docs/data_strategy.md` §2). **The actual binary dataset file is not
present**, and this file documents exactly why, so the gap is visible
and auditable rather than silently missing.

## What was verified

- **Source citation:** Hao, L., Rajaneesh A., van Westen, C., Sajinkumar K. S.,
  Martha, T. R., Jaiswal, P., and McAdoo, B. G. (2020). Constructing a
  complete landslide inventory dataset for the 2018 monsoon disaster in
  Kerala, India, for land use change analysis. *Earth System Science
  Data*, 12(4), 2899–2918. https://doi.org/10.5194/essd-12-2899-2020
- **Dataset DOI (actual data file host):** van Westen, C. (2020).
  Landslide inventory of the 2018 monsoon rainfall in Kerala, India.
  DANS. https://doi.org/10.17026/dans-x6c-y7x2
- The full peer-reviewed paper text was retrieved and read in this
  session (via a web-fetch capable of general web/HTML content), which is
  how the detailed, verified facts in
  `docs/inventory_metadata_report.md` were obtained — those facts come
  from the published paper itself, not from inspecting the raw file.

## What was attempted and why it failed

1. **Direct download attempt from this sandbox's shell environment**
   (`curl` to the DOI resolver, the DANS repository, and five other
   required data hosts — GSI Bhukosh, USGS EarthExplorer, Copernicus
   Data Space, IMD) — **all returned HTTP 403**. This sandbox's network
   egress is restricted to a fixed allowlist of software-package and
   code-hosting domains (PyPI, npm, GitHub, crates.io, Ubuntu archives,
   etc.) and does **not** include any scientific/geospatial data host.
   This is an environment-level restriction, not a per-request failure.
2. **Fetch via the general web-content tool available in this session**
   — this tool can retrieve readable web pages (and successfully
   retrieved the full ESSD paper text, see below), but the DANS
   repository page itself (`phys-techsciences.datastations.nl`) actively
   rejects it with a bot-detection challenge page ("Protected by
   BotStopper... DroneBL reported an entry: AutoDetectedBotIP"),
   confirmed by the actual response captured in this session.
3. Even where a page *is* reachable this way, that tool returns page
   content into the conversation, not a file written to this sandbox's
   disk — there is no mechanism in this environment to pipe a fetched
   binary (shapefile `.shp`/`.dbf`/`.shx`/`.prj` bundle, typically
   delivered as a `.zip`) directly into `ml-service/data/raw/`.

## What this means for Phase 3

**The actual landslide inventory geometry, coordinates, and per-record
attribute values have not been inspected in this session.** Every
Task 1 finding in `docs/inventory_metadata_report.md` is drawn from the
published paper's text (a legitimate, citable, peer-reviewed source) —
not from running `geopandas`/`pandas` against the real file. This is an
important distinction: the paper tells us *what the dataset contains
in aggregate* (counts, sources, districts, types) with high confidence,
but it cannot substitute for record-level checks like exact CRS,
individual coordinate validity, duplicate-geometry detection, or
per-field missingness — those require the actual file.

## What is needed to unblock this

A human with network access to https://doi.org/10.17026/dans-x6c-y7x2
needs to download the dataset (freely available, no login apparent from
the paper's description) and either:
- place the extracted shapefile bundle in this directory, or
- provide it as an uploaded file in a future session, so it can be
  inspected directly.

Until then, this is a **documented, tracked blocker**, not a silently
skipped step — see the final Phase 3 summary for how this affects
training-readiness.
