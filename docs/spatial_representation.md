# Spatial Representation Decision

Status: **design document.** Evaluates candidate spatial units for the
first model and states a recommendation with reasoning, per Task 4.

## 1. Options Evaluated

### 1.1 Point (the landslide inventory's native representation)

- **Label quality:** Highest possible fidelity to the source data — no
  aggregation/generalization loss, since positives are used exactly as
  mapped.
- **Spatial resolution:** Effectively unbounded/arbitrary — a point has
  no inherent area, so "resolution" is really determined by whatever
  feature-extraction buffer/window is used around each point (e.g., "the
  30m DEM pixel under this point," or "a 100m neighborhood").
- **Computational feasibility:** Straightforward for the 4,728 positives;
  negatives can also be points per the sampling design in
  `docs/negative_sampling.md`. Feature extraction becomes a point-sampling
  operation against each raster layer (DEM, rainfall grid, NDVI, etc.),
  which is computationally simple.
- **Compatibility with other data:** **This is the central problem.**
  Rainfall data (IMD, ~25 km grid) is vastly coarser than a point. A
  point-level model would report a rainfall value from a single
  25 km-wide cell as if it were specific to a single coordinate — this
  would be a **false precision claim**, exactly what the task
  instructions explicitly warn against ("Do NOT falsely claim that
  coarse rainfall data has 30m precision" — the same principle applies
  in reverse: don't claim rainfall data is meaningfully point-specific
  when its source resolution is ~25 km).
- **GIS dashboard requirements:** A point-level risk prediction is
  awkward to communicate to authorities responsible for zone-level
  decisions (evacuation orders, monitoring assignments) — dashboards
  typically need to answer "is this administrative area / monitoring
  zone at risk," not "is this exact GPS coordinate at risk."
- **Verdict:** Excellent for the label itself, poor as the unit for
  the *model's* prediction, because it invites false precision given the
  coarse rainfall/soil layers.

### 1.2 Grid Cell (regular raster grid, e.g., matching DEM or a coarser custom grid)

- **Label quality:** Positives can be aggregated to "did any landslide
  occur in this cell during the event window" — a defensible, honest
  transformation of point data, though it does discard some spatial
  precision.
- **Spatial resolution:** Fully explicit and controllable — the grid
  cell size is a first-class, documented decision (e.g., could be set to
  match DEM resolution, IMD rainfall resolution, or something
  in-between).
- **Computational feasibility:** Standard approach in the landslide-
  susceptibility literature; well-supported by `rasterio`/`GeoPandas`
  tooling already in the planned stack.
- **Compatibility with other data:** Strong — a grid explicitly forces a
  single, stated resolution, making it impossible to accidentally imply
  finer precision than the coarsest input actually supports (as long as
  the grid resolution is chosen honestly relative to rainfall's ~25 km
  native grid, not finer).
- **GIS dashboard requirements:** Grids can render acceptably on a
  Leaflet map, though they are visually less intuitive to non-technical
  authority users than named administrative boundaries ("risk in this
  district" reads more naturally than "risk in cell 4471").
- **Verdict:** Strong technical fit; weaker on direct interpretability
  for the dashboard's actual audience.

### 1.3 Administrative Unit (district / sub-district, via geoBoundaries/GADM)

- **Label quality:** Coarsest aggregation of the three options — a
  district-level "landslide occurred somewhere in this district" label
  discards the substantial within-district variation that the source
  paper itself documents (e.g., Idukki's 47.02% share vs. other
  districts) and could combine areas of genuinely different risk into
  one unit.
- **Spatial resolution:** Determined entirely by administrative
  geography, not by any property of the underlying hazard — Kerala's
  14 districts vary enormously in area and terrain diversity.
- **Computational feasibility:** Simple; boundary data already sourced
  (§8 of `docs/data_sources.md`).
- **Compatibility with other data:** Reasonable — coarser than the grid
  option, so no false-precision risk, but likely too coarse to be useful
  for anything beyond a very high-level situational overview.
- **GIS dashboard requirements:** Most intuitive for authority users
  (district/sub-district names are familiar administrative units tied to
  actual jurisdiction and response responsibility).
- **Verdict:** Best for dashboard communication and jurisdictional
  alignment with disaster-response authority, but too coarse on its own
  to be the *modeling* unit for a rare, spatially concentrated hazard
  like this one (per Idukki's disproportionate share).

### 1.4 Custom Monitoring Zone (a purpose-built unit, e.g., grid cells aggregated up to a chosen size, or hand-defined zones)

- **Label quality / resolution / compatibility:** Same trade-offs as the
  grid option, but with the flexibility to be tuned specifically to the
  problem (e.g., sized to balance "not so fine it implies false rainfall
  precision" against "not so coarse it erases Idukki-style
  concentration").
- **Computational feasibility:** Requires an explicit zone-definition
  step (not yet done) rather than reusing an off-the-shelf
  grid/administrative layer directly.
- **GIS dashboard requirements:** Can be designed for interpretability
  (e.g., zones that respect administrative boundaries where practical)
  while still being finer than a full district.
- **Verdict:** The right long-term target, but requires a design step
  (zone definition) that has not been done, so it's not something to
  fabricate a specific size for right now.

## 2. Decision

**Recommended representation for the first model: a regular grid cell,
sized to the coarsest scientifically meaningful input resolution
actually available — not finer than what the rainfall data can honestly
support.**

**Reasoning:**
- A point-level model would misrepresent the precision of coarse inputs
  (rainfall, soil), which is explicitly prohibited by the task
  instructions' false-precision rule.
- An administrative-unit model would be too coarse to capture the
  documented within-Kerala concentration of risk (Idukki's 47.02% share)
  and would waste the DEM/NDVI resolution that is genuinely available at
  10–30 m.
- A grid cell is the most honest middle ground: it forces an explicit,
  stated resolution decision rather than an implicit one, and it is the
  most directly compatible representation for combining rasters of very
  different native resolutions (SRTM 30 m, WorldCover 10 m, MODIS NDVI
  250 m, IMD rainfall ~25 km) into one consistent feature table via
  resampling/aggregation (see `docs/spatial_alignment.md`, Task 5).
- **The exact grid cell size is not decided in this document** — doing
  so requires deciding how the coarse rainfall grid will be
  disaggregated or how the model will otherwise handle features that are
  constant across many cells (since a single ~25 km rainfall cell will
  cover many candidate grid cells at finer resolutions). This is a
  genuine open design question, flagged for Task 5, not fixed arbitrarily
  here.
- **Administrative boundaries remain the intended dashboard/communication
  layer** — a grid-level model's outputs can be aggregated up to
  district/sub-district for the authority-facing dashboard (e.g., "N
  cells at High/Critical risk within District X"), preserving both
  modeling honesty and communication clarity. This mapping (grid → admin
  unit, for display only) is a separate, later design step.

## 3. What Remains Open

- Exact grid cell size (depends on a deliberate decision about how to
  handle the rainfall-resolution mismatch — to be resolved in
  `docs/spatial_alignment.md`, not here).
- Whether the eventual "custom monitoring zone" (§1.4) will be defined
  as a simple aggregation of grid cells or a separately hand-drawn
  boundary set — deferred until there is operational/dashboard
  feedback on what authorities actually need.
