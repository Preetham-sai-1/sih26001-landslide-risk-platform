# Spatial Alignment Plan

Status: **design document.** Documents the true spatial resolution of
every planned input, the CRS handling plan, and the resampling/
aggregation methodology to be used when building the feature table.
Written before any real data is in hand (see the acquisition blocker),
so this describes the *plan* the pipeline code in `ml-service/src/data/`
is built to follow — it has not been executed against real files.

## 1. Native Resolution of Every Planned Input (no rounding up, no false precision)

| Input | Native spatial resolution | Native CRS (as documented in `docs/data_sources.md`) |
|---|---|---|
| Landslide inventory (Hao et al. 2020) | Point (no inherent resolution) | **UNVERIFIED — requires raw file** |
| SRTM DEM | 30 m (1 arc-second) | WGS84 geographic (EPSG:4326) |
| IMD gridded rainfall | **~25 km (0.25° × 0.25°)** | TO VERIFY (assumed WGS84, not confirmed) |
| GPM IMERG | ~10 km (0.1° × 0.1°) | WGS84 geographic |
| Sentinel-2 | 10 m (visible/NIR bands) | UTM, per-tile (zone-dependent) |
| ESA WorldCover | 10 m | EPSG:4326 (explicitly confirmed by ESA) |
| MODIS NDVI (MOD13Q1) | 250 m | MODIS Sinusoidal (native) — requires reprojection |
| SoilGrids | 250 m | TO VERIFY |
| geoBoundaries / GADM | Vector polygons (no raster resolution) | TO VERIFY, conventionally WGS84 |

**The coarsest input by a wide margin is IMD rainfall at ~25 km.** This
single fact governs the entire alignment strategy: no output of this
pipeline may imply rainfall information more precise than a ~25 km cell,
regardless of what grid/zone resolution is chosen for the final feature
table (see `docs/spatial_representation.md`).

## 2. CRS Handling Plan

1. **Establish one working/analysis CRS for the whole pipeline.** Given
   the study area is Kerala (a relatively small, low-latitude region),
   an appropriate equal-area or conformal projected CRS should be
   selected for any distance/area-based computation (e.g., buffer
   distances in `docs/negative_sampling.md`, slope computation) — WGS84
   geographic coordinates are not appropriate for real-world distance
   math since they are angular, not linear. **The specific projected CRS
   (e.g., a UTM zone appropriate for Kerala, or an India-specific
   projected system) is not selected in this document** — this is
   explicitly deferred to implementation, to be chosen deliberately
   rather than defaulted to WGS84 out of convenience.
2. **Every input's actual CRS must be read from its own file/service
   metadata, not assumed**, given that several rows in the table above
   are marked TO VERIFY. The pipeline code below includes an explicit
   CRS-reading and reprojection step for exactly this reason — silently
   assuming EPSG:4326 for a file whose actual CRS is something else
   would silently misalign every subsequent computation.
3. **MODIS's native Sinusoidal grid requires reprojection before use**
   alongside anything else — this is called out specifically because it
   is the one native CRS in the table that is unambiguously *not*
   geographic/UTM, and skipping this step would corrupt the alignment
   silently rather than obviously.

## 3. Resampling / Aggregation Methodology (by data type, not one-size-fits-all)

Using a single resampling method for every raster is scientifically
inappropriate — the correct method depends on what kind of quantity is
being resampled:

- **Continuous, smoothly-varying quantities (elevation, NDVI, rainfall
  when upsampling for context):** bilinear or cubic interpolation is
  appropriate when *upsampling* (going from coarser to finer) is truly
  needed for visualization, but should not be used to fabricate detail
  that doesn't exist in the source (see §4 on the specific rainfall
  case). When *downsampling* (finer to coarser, e.g., aggregating 10 m
  WorldCover into a coarser grid cell), an area-weighted average (for
  continuous data) is appropriate.
- **Categorical data (land cover classes):** **never** use bilinear/
  cubic interpolation, which would produce meaningless fractional class
  values. Use majority-class (mode) resampling when downsampling, or
  compute per-class proportion features (e.g., "% forest cover in this
  cell") instead of collapsing to a single class — the latter is
  generally more informative and is the recommended approach for the
  feature table.
- **Slope/aspect/curvature:** must be **derived from the DEM at its
  native 30 m resolution first**, then aggregated to the chosen grid
  cell size — computing slope from an already-resampled, coarser DEM
  would understate true local steepness. This ordering (derive first,
  then aggregate) is a specific, deliberate methodological choice.

## 4. The Rainfall Resolution Problem (explicit, not glossed over)

Per the task instructions: *"Do NOT falsely claim that coarse rainfall
data has 30m precision."* Concretely, this means:

- If the chosen grid cell size (per `docs/spatial_representation.md`) is
  finer than IMD's ~25 km native rainfall grid, **every grid cell inside
  a given rainfall cell must be documented as sharing the identical
  rainfall value** — the feature table should make this traceable (e.g.,
  by retaining a `rainfall_source_cell_id` field), not obscure it by
  silently interpolating a smooth-looking but fabricated rainfall
  surface.
- GPM IMERG's ~10 km resolution is finer than IMD but still far coarser
  than the DEM/WorldCover layers — the same honesty requirement applies
  at IMERG's resolution too, just at a smaller scale of the same
  problem.
- This directly constrains the grid-cell-size decision left open in
  `docs/spatial_representation.md`: choosing a very fine grid (e.g., to
  match 10 m WorldCover) would create an *illusion* of fine-grained risk
  variation that is actually just fine-grained terrain/land-cover
  variation riding on a much coarser, shared rainfall signal. This
  trade-off must be an explicit, documented modeling decision.

## 5. Status

This is a **plan**, not an executed pipeline run. The code in
`ml-service/src/data/` implements the steps described here in a form
ready to run once real input files are available, but — consistent with
the rest of this Phase 3 report — **it has not been executed against
real source data**, because none of that data has been acquired in this
environment (see the acquisition blocker documented in
`ml-service/data/raw/kerala_landslide_inventory_2018/ACQUISITION_STATUS.md`).
