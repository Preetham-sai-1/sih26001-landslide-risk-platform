# Data Sources — Research and Candidate Evaluation

Status: **research document, Phase 2 of SIH26001**. This document records
what was actually found through verification (web search of official
sources, published papers, and data portals) as of September 2026. No
dataset, URL, resolution, or accuracy figure below is invented — every
entry is either sourced from an official/authoritative page or a peer-
reviewed publication, and anything that could not be verified is marked
**UNVERIFIED** rather than guessed. No data has been downloaded yet.

Legend for the priority tags used throughout: **A** = required for MVP,
**B** = high-value if available, **C** = future/optional.

---

## 1. Historical Landslide Inventory

### 1.1 GSI Bhukosh / Bhusanket — Geological Survey of India (Priority A)

- **Official source/organization:** Geological Survey of India (GSI), Ministry of Mines — national nodal agency for landslide hazard mitigation (designated 29 Jan 2004).
- **Dataset name:** Bhukosh geoscientific data portal / Bhusanket landslide hazard database.
- **Official URL:** https://bhukosh.gsi.gov.in and https://bhusanket.gsi.gov.in
- **API/download mechanism:** Web GIS portal with catalog/zip download referenced on the Open Government Data (OGD) Platform India listing; a documented bulk API was **not** found during this research — **TO VERIFY** the exact programmatic access mechanism before pipeline design.
- **Geographic coverage:** National (India); by 2013 GSI reported over 50,000 km² covered by macro-scale (1:50,000) landslide susceptibility mapping — coverage is uneven across states, concentrated in accessible hilly terrain.
- **Spatial resolution:** Macro-scale susceptibility mapping at 1:50,000; underlying inventory points are individual mapped landslide locations. Exact positional accuracy of inventory points — **TO VERIFY**.
- **Temporal resolution / historical time range:** Inventory is cumulative/event-triggered, not a regular time series; GSI's landslide investigation work dates back to 1880, with systematic susceptibility mapping since 1980. Exact per-record date completeness — **TO VERIFY**.
- **Update frequency:** Described as periodically updated as new events occur; exact cadence — **TO VERIFY**.
- **File/API format:** Web portal access (shapefile/GIS layers implied); exact export format — **TO VERIFY**.
- **Coordinate reference system:** **TO VERIFY**.
- **Important variables:** Landslide location, GSI's susceptibility class categories (macro/meso/site-specific/PDLS assessments per GSI's Landslide Report structure).
- **Free/openly accessible:** Yes — released under India's National Data Sharing and Accessibility Policy (NDSAP).
- **License/usage restrictions:** NDSAP terms; specific attribution requirements — **TO VERIFY**.
- **Authentication/API keys required:** Portal login noted in some references ("Please Login to Subscribe") — **TO VERIFY** whether this blocks bulk download.
- **Expected download size:** **TO VERIFY** (depends on region/scale requested).
- **Advantages:** Only authoritative, government-mandated national landslide inventory for India; long institutional history; used as a primary source in multiple peer-reviewed susceptibility studies (e.g., Western Ghats Karnataka study using 680 Bhukosh points).
- **Limitations:** Coverage is uneven; exact download/API mechanics not fully documented publicly; likely requires manual portal interaction rather than a clean bulk API, which affects reproducibility.
- **Suitability for SIH26001:** High value as the authoritative national reference layer and for cross-validating other inventories, but its access mechanics need direct verification before being relied on as the primary training-label source.

### 1.2 NASA COOLR (Cooperative Open Online Landslide Repository) incl. Global Landslide Catalog (Priority B)

- **Official source/organization:** NASA Goddard Space Flight Center.
- **Dataset name:** Cooperative Open Online Landslide Repository (COOLR), incorporating the NASA Global Landslide Catalog (GLC).
- **Official URL:** Landslide Viewer / Landslides @ NASA (referenced at https://gpm.nasa.gov/landslides/data.html); REST feature services at https://gis.earthdata.nasa.gov and https://maps.nccs.nasa.gov (COOLR_Events_Polygon / COOLR_Events_Points map services).
- **API/download mechanism:** Downloadable via the Landslide Viewer web app (CSV/Shapefile) and queryable via a published ArcGIS REST API (MapServer/FeatureServer), confirmed live.
- **Geographic coverage:** Global, including India.
- **Spatial resolution:** Point-based reports; location accuracy is itself a stored attribute (`loc_accu`, in km), meaning precision varies per record — this is a genuine data-quality signal to use, not to ignore.
- **Temporal resolution / historical time range:** GLC baseline covers 2007–2019 rainfall-triggered landslides (~11,033 events as of the 2019 update); COOLR is continuously updated with citizen-science and other contributed inventories.
- **Update frequency:** Ongoing/rolling as reports and inventories are added.
- **File/API format:** Shapefile, CSV, and live ArcGIS REST feature services (JSON).
- **Coordinate reference system:** Standard geographic (lat/lon); exact EPSG code not stated in sources reviewed — **TO VERIFY**, though ArcGIS REST services conventionally serve WGS84 (EPSG:4326).
- **Important variables:** Location, date, trigger type (rainfall, earthquake, construction, etc.), fatalities, event/report source, digitization method, citation.
- **Free/openly accessible:** Yes.
- **License/usage restrictions:** Open Data; CC-BY attribution requested; specific citation requirements are documented per inventory (event-based vs. citizen-report layers cite different papers, e.g. Kirschbaum et al. 2015, Juang et al. 2019).
- **Authentication/API keys required:** Not required to view/query the REST services based on sources reviewed; **TO VERIFY** for bulk export.
- **Expected download size:** Small (point/polygon vector data, likely low tens of MB globally).
- **Advantages:** Genuinely global, citable, actively maintained, live API confirmed, good metadata (trigger type, date, accuracy).
- **Limitations:** Citizen-science component means uneven completeness and possible reporting bias toward populated/connected areas — a meaningful limitation for a rural disaster-risk use case, and one to document rather than paper over. India-specific record density within COOLR was not independently confirmed in this research — **TO VERIFY** before relying on it as a primary label source for an Indian pilot region.
- **Suitability for SIH26001:** Good as a supplementary/cross-validation source and for out-of-India method validation later; not confirmed as dense enough in India to be the primary label source for the MVP.

### 1.3 Kerala 2018 Monsoon Landslide Inventory (Hao et al., 2020) (Priority A — see Pilot Region Recommendation)

- **Official source/organization:** Joint academic effort (Faculty of Geo-Information Science and Earth Observation, University of Twente; Chengdu University of Technology; Michigan Technological University) built on inventories from NRSC (ISRO) and GSI/Kerala State Disaster Management Authority (KSDMA); published in Copernicus's Earth System Science Data (ESSD), a peer-reviewed open-access journal.
- **Dataset name:** "Constructing a complete landslide inventory dataset for the 2018 monsoon disaster in Kerala, India, for land use change analysis" (Hao, van Westen, Rajaneesh, Sajinkumar, Martha, Jaiswal, McAdoo, 2020, ESSD 12(4), 2899–2918).
- **Official URL (paper):** https://essd.copernicus.org/articles/12/2899/2020/ — **Official URL (dataset):** https://doi.org/10.17026/dans-x6c-y7x2 (DANS data repository, van Westen 2020).
- **API/download mechanism:** Direct dataset download via DOI-resolved DANS repository page (standard research-data repository download, not an API).
- **Geographic coverage:** State of Kerala, India (Western Ghats windward slope).
- **Spatial resolution:** Point inventory; landslides originally digitized/mapped from Resourcesat-2 and Sentinel-2 (OBIA) and field surveys, then manually re-interpreted and adjusted against pre-/post-event high-resolution imagery in Google Earth.
- **Temporal resolution / historical time range:** **Single event**, the August 2018 Kerala monsoon disaster — this is an event-based inventory, not a multi-year time series.
- **Update frequency:** Static, one-time published dataset (2020).
- **File/API format:** Point vector data with attribute table (land use in 2010 and 2018 among attributes); exact file format (shapefile/CSV/GeoPackage) — **TO VERIFY** on the DANS page before use.
- **Coordinate reference system:** **TO VERIFY** on the DANS page (not stated in the sources reviewed here).
- **Important variables:** Landslide location, source inventory (NRSC OBIA-derived vs. field survey vs. newly digitized), land use in 2010, land use in 2018.
- **Free/openly accessible:** Yes — published as open dataset accompanying a peer-reviewed, open-access ESSD article.
- **License/usage restrictions:** Standard academic dataset citation requirement (cite Hao et al. 2020); exact license (e.g., CC-BY) — **TO VERIFY** on the DANS page.
- **Authentication/API keys required:** Not expected for a DANS-hosted public dataset — **TO VERIFY**.
- **Expected download size:** Small (point vector data, likely a few MB).
- **Advantages:** The most complete, methodologically documented, peer-reviewed, DOI-citable landslide inventory found for any Indian region in this research — 4,728 confirmed landslide points, cross-validated across two independent original inventories (NRSC OBIA and GSI/KSDMA field survey) plus manual correction. This is a materially stronger label source than anything else found for an Indian pilot area.
- **Limitations:** Single-event snapshot (2018 monsoon only) — it establishes *where* landslides occurred during one well-documented disaster, but does not by itself give a multi-year time series needed for training on varied rainfall/antecedent conditions. It will need to be paired with negative (non-landslide) sampling and, ideally, supplemented by other years' events if the pilot region and timeframe are extended.
- **Suitability for SIH26001:** **Recommended primary landslide-label source for the MVP**, precisely because it is real, verifiable, peer-reviewed, and its construction methodology (and limitations) are transparently documented — unlike scattered event write-ups found for other regions during this research.

### Cross-Region Note

Comparable searches for Uttarakhand Himalaya landslide data found real events (e.g., the June 2013 Bhagirathi valley disaster, 6,013 landslides mapped per Martha et al. as cited in Uniyal/Rossi-era literature) but **no single consolidated, openly downloadable, DOI-backed inventory dataset** as clean as the Kerala 2020 dataset — Uttarakhand's landslide record is scattered across multiple standalone research papers and government situation reports rather than one packaged, reproducible dataset. This directly informed the pilot-region recommendation below.

---

## 2. Rainfall

### 2.1 IMD High-Resolution Gridded Daily Rainfall (0.25° × 0.25°) (Priority A)

- **Official source/organization:** India Meteorological Department (IMD), Pune — Climate Research and Services.
- **Dataset name:** IMD New High Spatial Resolution (0.25° × 0.25°) Long Period Daily Gridded Rainfall Data Set over India.
- **Official URL:** https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_NetCDF.html (also `_Bin.html` for binary format) and https://www.imdpune.gov.in/Clim_Pred_LRF_New/Grided_Data_Download.html
- **API/download mechanism:** Direct file download (binary `.grd`/ASCII `.TXT`/NetCDF), one file per year; no REST API found — batch scripting would call the download URLs directly.
- **Geographic coverage:** All of India, grid arranged 135×129 points from 6.5°N/66.5°E to 38.5°N/100.0°E.
- **Spatial resolution:** 0.25° × 0.25° (~25 km) — coarse relative to a single monitoring zone, a real limitation to document rather than gloss over.
- **Temporal resolution:** Daily.
- **Historical time range:** 1901–2024 (124 years) per the current IMD listing.
- **Update frequency:** Updated periodically as new years are finalized (irregular; not sub-annual real-time).
- **File/API format:** GRD (binary), ASCII TXT, and NetCDF.
- **Coordinate reference system:** Geographic lat/lon grid as described; explicit EPSG not stated on the source pages — **TO VERIFY** (conventionally treated as WGS84/EPSG:4326 for this kind of product, but not confirmed here).
- **Important variables:** Daily rainfall in millimeters per grid cell.
- **Free/openly accessible:** Yes, direct download, no login barrier evident in the sources reviewed.
- **License/usage restrictions:** Attribution requested via citation of Pai et al. (2014); IMD disclaims correctness guarantees but does not appear to restrict use.
- **Authentication/API keys required:** Not evident from sources reviewed.
- **Expected download size:** Each yearly file is a compact binary grid (135×129 points × 365/366 days) — small, on the order of low MB per year; full multi-decade archive would be larger but still modest (order of tens to low hundreds of MB total, not confirmed exactly — **TO VERIFY** by inspecting actual file sizes).
- **Advantages:** Official, long-running, authoritative Indian government rainfall product; daily resolution over decades enables genuine antecedent-rainfall feature engineering; free and directly downloadable without an account.
- **Limitations:** 0.25° (~25 km) spatial resolution is coarse relative to landslide-triggering rainfall variability, which can be highly localized in complex terrain — this is a defensible-but-real constraint on feature quality that should be stated plainly, not hidden.
- **Suitability for SIH26001:** **Recommended primary rainfall source** for its authority, free access, and long daily record; to be supplemented with a finer-resolution satellite product for short-window features (see below).

### 2.2 NASA GPM IMERG (Priority A/B)

- **Official source/organization:** NASA (GES DISC / Goddard Space Flight Center), joint NASA–JAXA Global Precipitation Measurement (GPM) mission.
- **Dataset name:** Integrated Multi-satellitE Retrievals for GPM (IMERG), e.g., GPM_3IMERGHH (half-hourly) and GPM_3IMERGDF (daily) Final Run, V07.
- **Official URL:** https://gpm.nasa.gov/data/imerg and https://disc.gsfc.nasa.gov (GES DISC catalog).
- **API/download mechanism:** NASA Earthdata account required; download via GES DISC (OPeNDAP/HTTP), or accessed via Google Earth Engine (`NASA/GPM_L3/IMERG_V07`) without local download.
- **Geographic coverage:** Global (60°N–60°S full coverage per mission design), includes India.
- **Spatial resolution:** 0.1° × 0.1° (~10 km) — meaningfully finer than IMD's 0.25° grid.
- **Temporal resolution:** Half-hourly (native); also aggregated daily/monthly products.
- **Historical time range:** June 2000–present (TRMM-era back to 2000, GPM Core Observatory from 2014).
- **Update frequency:** Near-real-time Early Run (~4h latency) through to research-grade Final Run (~3.5 month latency); for training data, the Final Run is the appropriate choice.
- **File/API format:** HDF5/NetCDF, GeoTIFF; also available as an Earth Engine ImageCollection.
- **Coordinate reference system:** WGS84 geographic grid (standard for this product family).
- **Important variables:** Precipitation rate (mm/hr), precipitation source flag, quality index; can be aggregated into 6h/24h/72h/7-day accumulations.
- **Free/openly accessible:** Yes, no cost.
- **License/usage restrictions:** NASA open-data policy — free for public use with citation.
- **Authentication/API keys required:** Yes — NASA Earthdata Login account required for direct GES DISC download; Google Earth Engine access (also free, separate registration) is an alternative that avoids local bulk download.
- **Expected download size:** Meaningful for a multi-year, sub-daily archive even over one state-sized region — **TO VERIFY** with an actual subset request before committing to local storage; Earth Engine avoids this by computing server-side.
- **Advantages:** Finer spatial and temporal resolution than IMD's gridded product, enabling genuine 6h/24h/72h rainfall-intensity features; satellite-based so it doesn't depend on gauge density in remote hilly terrain.
- **Limitations:** Satellite precipitation retrievals are explicitly documented by NASA as having lower skill over complex terrain and coastal zones — precisely the terrain type relevant to landslide risk — so IMERG should be treated as a complement to, not a replacement for, IMD's gauge-based product, and this caveat should be carried into the validation strategy's discussion of feature reliability.
- **Suitability for SIH26001:** High value for short-window rainfall-intensity features (6h/24h) that IMD's daily product cannot provide; recommended as a secondary/complementary rainfall source.

---

## 3. Digital Elevation Model (DEM)

### 3.1 ISRO/NRSC CartoDEM (Cartosat-1) (Priority A)

- **Official source/organization:** National Remote Sensing Centre (NRSC), Indian Space Research Organisation (ISRO), Department of Space, Government of India.
- **Dataset name:** CartoDEM — Digital Elevation Model generated from Cartosat-1 stereo data.
- **Official URL:** https://bhoonidhi.nrsc.gov.in (current NRSC open-data portal, successor interface to Bhuvan for this purpose).
- **API/download mechanism:** Bhoonidhi web portal (search/browse/order + instant download where available online); a "Bhoonidhi API" has reportedly been released, access via request to bhoonidhi@nrsc.gov.in — **TO VERIFY** exact programmatic access terms.
- **Geographic coverage:** All of India.
- **Spatial resolution:** 30 m posting (1 arc-second) — open for all users; finer 10 m and 2.5 m Cartosat DSM products exist but are open only for Indian Government Entities and priced for Non-Government Entities.
- **Temporal resolution:** Static elevation product (not a time series); source imagery era tied to Cartosat-1 (launched 2005).
- **Historical time range:** Not applicable (static terrain product).
- **Update frequency:** Versioned releases (v1.0, then v1.1 R1 per data.gov.in listing); not continuously updated.
- **File/API format:** GeoTIFF.
- **Coordinate reference system:** Geographic (lat/lon), Datum WGS-84 (per the 2.5m CartoDSM specification sheet; the 30m open product is expected to follow the same datum, though this specific confirmation is for the 2.5m product — **TO VERIFY** for the 30m open product specifically).
- **Important variables:** Elevation (meters); vertical accuracy ~8 m LE90, horizontal ~15 m CE90 (as documented for the related 2.5 m CartoDSM product — the 30 m product's own accuracy spec was not separately confirmed in this research — **TO VERIFY**).
- **Free/openly accessible:** Yes, the 30 m posting Carto DSM product is listed as "Open For All" on the official Bhoonidhi brochure.
- **License/usage restrictions:** Released under NDSAP-style open data terms typical of Indian government EO data; exact license text — **TO VERIFY** on Bhoonidhi.
- **Authentication/API keys required:** Portal account/login expected for Bhoonidhi downloads — **TO VERIFY** exact registration requirements.
- **Expected download size:** Tile-based (7.5' × 7.5' tiles per the CartoDSM spec sheet referenced); a pilot-region extract would be a modest number of tiles, likely tens to low hundreds of MB — **TO VERIFY** exactly.
- **Advantages:** India-specific, ISRO-generated, higher potential fidelity to Indian terrain than a global product, free and open at 30 m.
- **Limitations:** Portal-based access (not a simple bulk API) makes reproducibility more manual; some finer-resolution tiers are restricted to government entities, which may not apply to a hackathon team — **TO VERIFY** eligibility before assuming access to anything finer than 30 m.
- **Suitability for SIH26001:** Strong candidate as the primary, India-specific DEM at 30 m; SRTM (below) is recommended as the more immediately reproducible fallback for the MVP given its simpler, well-documented download path.

### 3.2 USGS SRTM 1 Arc-Second Global (Priority A)

- **Official source/organization:** USGS EROS Center, in partnership with NASA/NGA (original mission), distributed via EarthExplorer / LP DAAC.
- **Dataset name:** SRTM 1 Arc-Second Global (Void Filled), DOI 10.5066/F7PR7TFT.
- **Official URL:** https://www.usgs.gov/centers/eros/science/usgs-eros-archive-digital-elevation-shuttle-radar-topography-mission-srtm and access via https://earthexplorer.usgs.gov
- **API/download mechanism:** USGS EarthExplorer web interface (tile search + download); M2M API also exists for USGS EROS products generally — **TO VERIFY** specific applicability to this exact SRTM product.
- **Geographic coverage:** Near-global, 60°N to 56°S latitude (~80% of Earth's land surface) — covers all of India.
- **Spatial resolution:** 1 arc-second (~30 m); 3 arc-second (~90 m) also available for global coverage.
- **Temporal resolution:** Static (single acquisition mission, Feb 2000).
- **Historical time range:** Not applicable — reflects terrain as of the February 2000 shuttle mission.
- **Update frequency:** Static archive (void-filled processing has been refined over time, but the underlying elevation data is fixed).
- **File/API format:** GeoTIFF, BIL, DTED — confirmed multiple formats via EarthExplorer.
- **Coordinate reference system:** WGS84 geographic (standard for SRTM products).
- **Important variables:** Elevation (meters); from this, slope/aspect/curvature are derived downstream, not provided directly.
- **Free/openly accessible:** Yes, free and open distribution.
- **License/usage restrictions:** Public domain / US Government open data; no restrictions found.
- **Authentication/API keys required:** Yes — a free EarthExplorer (USGS) account is required to download.
- **Expected download size:** Individual 1°×1° tiles are small (tens of MB each); a pilot-region extract covering a few degrees would be on the order of low hundreds of MB — **TO VERIFY** exactly once specific tiles are identified.
- **Advantages:** Extremely well-documented, globally standard, simple and reproducible download path via a stable, well-known tool (EarthExplorer); void-filled version avoids common data-quality gaps; free.
- **Limitations:** Fixed to a single 2000-era acquisition, so it cannot reflect any terrain change since then (e.g., from major landslides or construction) — a genuine, disclosed staleness risk for a "current terrain" feature; 30 m resolution may be coarse for very local slope-stability features.
- **Suitability for SIH26001:** **Recommended as the primary/default DEM for the MVP** specifically because its access path is simple, free, and highly reproducible (important for a hackathon timeline), while CartoDEM is tracked as a higher-value, India-specific upgrade path once portal access is confirmed.

---

## 4. Satellite Imagery

### 4.1 Copernicus Sentinel-2 (Priority A)

- **Official source/organization:** European Space Agency (ESA) / Copernicus Programme (European Commission).
- **Dataset name:** Copernicus Sentinel-2 (Level-1C and Level-2A products).
- **Official URL:** https://dataspace.copernicus.eu (Copernicus Data Space Ecosystem) and https://browser.stac.dataspace.copernicus.eu
- **API/download mechanism:** OData/OpenSearch REST APIs, STAC API, openEO, and Sentinel Hub API, all confirmed live and documented; Copernicus Browser for interactive access.
- **Geographic coverage:** Global (includes India), wide swath (290 km).
- **Spatial resolution:** 10 m for the visible/NIR bands used in most vegetation/land applications (finer/coarser for other spectral bands).
- **Temporal resolution:** ~5-day revisit at the equator with the two/three-satellite constellation (per Copernicus's own published figures).
- **Historical time range:** Mission operational since 2015 (Sentinel-2A launch); full multi-satellite constellation revisit improvements from 2017 (2B) onward.
- **Update frequency:** Continuous, systematic acquisition per the published observation plan.
- **File/API format:** SAFE format (JPEG2000-based bands within), also accessible as Cloud-Optimized GeoTIFFs (COGs) through derived products like the WorldCover mosaics.
- **Coordinate reference system:** UTM per-tile projection (standard Sentinel-2 tiling scheme); reprojection to a common CRS is a required processing step, not automatic.
- **Important variables:** Multispectral reflectance bands (13 bands) enabling NDVI and other vegetation/moisture indices, land cover classification, and change detection (e.g., for identifying bare/disturbed slopes indicative of past landslide scars).
- **Free/openly accessible:** Yes, systematically free of charge to all users including the general public.
- **License/usage restrictions:** Copernicus open data policy; attribution expected.
- **Authentication/API keys required:** Yes — a free Copernicus Data Space Ecosystem account/OAuth client is required for API access.
- **Expected download size:** A single Sentinel-2 tile/scene is on the order of ~1 GB (compressed); a multi-date, multi-tile time series over a pilot region would require careful subsetting/cloud processing rather than bulk local download — **TO VERIFY** exact volumes once the pilot region's tile footprint is known.
- **Advantages:** Free, high-resolution, high-revisit, official ESA/Copernicus product with a modern, well-documented API stack; directly usable for both static land-cover/vegetation features and for detecting visible surface disturbance.
- **Limitations:** Cloud cover is a major practical obstacle in monsoon-season, landslide-prone terrain — exactly when landslides are most likely to occur — which limits usable pre-/post-event image pairs; this is a genuine methodological constraint to document (and precisely why some landslide inventories, including the Kerala 2018 one, combine multiple sensors and manual interpretation rather than relying on a single automated Sentinel-2 pass).
- **Suitability for SIH26001:** Primary satellite imagery source for optical feature derivation (feeding into NDVI and land-cover-adjacent features); cloud-cover limitations must be explicitly handled (e.g., cloud masking, compositing) rather than assumed away.

---

## 5. Land Cover

### 5.1 ESA WorldCover 10 m (2020 / 2021) (Priority A)

- **Official source/organization:** European Space Agency (ESA), produced by a consortium led by VITO Remote Sensing with Brockmann Consult, Gamma Remote Sensing, IIASA, and Wageningen University.
- **Dataset name:** ESA WorldCover 10 m v100 (2020) and v200 (2021).
- **Official URL:** https://esa-worldcover.org and https://worldcover2021.esa.int/download ; also on Zenodo (DOI 10.5281/zenodo.7254221 for v200) and AWS Open Data (Registry of Open Data on AWS).
- **API/download mechanism:** Direct tile download (COG GeoTIFFs, 3°×3° tiles grouped into 60°×60° macrotiles) from the ESA portal, Zenodo, or AWS S3; also available as a Google Earth Engine ImageCollection (`ESA/WorldCover/v200`) for server-side use without bulk download.
- **Geographic coverage:** Global, includes India.
- **Spatial resolution:** 10 m.
- **Temporal resolution:** Annual snapshot (2020 and 2021 only — not a continuous time series).
- **Historical time range:** 2020 and 2021 only.
- **Update frequency:** Two releases to date (v100/2020, v200/2021); no confirmed newer year found in this research — **TO VERIFY** if a more recent WorldCover year has since been released.
- **File/API format:** Cloud-Optimized GeoTIFF (COG).
- **Coordinate reference system:** EPSG:4326 (geographic lat/lon, WGS84 ellipsoid), explicitly stated by ESA.
- **Important variables:** 11 land cover classes (Tree cover, Shrubland, Grassland, Cropland, Built-up, Bare/sparse vegetation, Snow and Ice, Permanent water bodies, Herbaceous Wetland, Mangrove, Moss and lichen), derived from Sentinel-1 + Sentinel-2.
- **Free/openly accessible:** Yes, provided free of charge without restriction of use.
- **License/usage restrictions:** Creative Commons Attribution 4.0 International (CC-BY 4.0) — permissive, including commercial use, with attribution.
- **Authentication/API keys required:** No login required for the direct portal/AWS/Zenodo downloads based on sources reviewed.
- **Expected download size:** Full global product is ~124 GB across ~2,631–2,651 tiles; a single pilot-region tile subset would be a small fraction of this (low GB or less) — **TO VERIFY** exact size once the specific tile(s) covering the pilot region are identified.
- **Advantages:** Free, high (10 m) resolution, permissive CC-BY license (no non-commercial restriction, unlike GADM below), independently validated with a **published overall accuracy of 76.7%** for the 2021 v200 product (Wageningen University statistical validation, per ESA's own documentation) — a real, source-attributed figure describing the land-cover product itself, not a claim about our system.
- **Limitations:** Only two snapshot years (2020, 2021) — not useful for tracking land-cover change across the full span of any multi-year landslide inventory; a documented ~77% accuracy is respectable but not perfect, meaning land-cover-derived features will carry some irreducible noise that any downstream model needs to account for rather than ignore.
- **Suitability for SIH26001:** **Recommended primary land-cover source** given its free/permissive license, resolution, and independently reported accuracy figure.

---

## 6. Vegetation / NDVI

### 6.1 MODIS MOD13Q1 Vegetation Indices (Priority A)

- **Official source/organization:** NASA Land Processes Distributed Active Archive Center (LP DAAC), USGS EROS Center; MODIS instrument aboard NASA's Terra satellite.
- **Dataset name:** MOD13Q1 (V6.1) — Terra Vegetation Indices 16-Day Global 250 m.
- **Official URL:** https://www.earthdata.nasa.gov/data/catalog/lpcloud-mod13q1-061 ; also on Google Earth Engine (`MODIS/061/MOD13Q1`) and AWS Open Data.
- **API/download mechanism:** NASA Earthdata download (LP DAAC), Google Earth Engine ImageCollection access (avoids local bulk download), or AWS S3 registry.
- **Geographic coverage:** Global, includes India.
- **Spatial resolution:** 250 m.
- **Temporal resolution:** 16-day composite (best-pixel selection within each 16-day window).
- **Historical time range:** 18 February 2000 to present (dataset listing shows continued coverage into 2025 and beyond).
- **Update frequency:** Continuous, every 16 days.
- **File/API format:** HDF (native), also GeoTIFF-convertible; Earth Engine access avoids raw HDF handling.
- **Coordinate reference system:** MODIS Sinusoidal grid (SIN Grid) natively — requires reprojection to a standard CRS (e.g., WGS84/UTM) for use alongside other layers, a real processing step to plan for.
- **Important variables:** NDVI, EVI (Enhanced Vegetation Index), plus reflectance bands and per-pixel quality flags.
- **Free/openly accessible:** Yes.
- **License/usage restrictions:** NASA/LP DAAC data have no restrictions on subsequent use, sale, or redistribution.
- **Authentication/API keys required:** Yes for direct LP DAAC download (NASA Earthdata Login); Google Earth Engine requires its own free registration.
- **Expected download size:** Individual tiles are modest; a 20+ year, single-tile time series for a pilot region is manageable, but exact size — **TO VERIFY**.
- **Advantages:** Free, very long historical record (25+ years), regular 16-day cadence well-suited to tracking vegetation-cover trends relevant to slope stability (e.g., deforestation-linked risk), no usage restrictions.
- **Limitations:** 250 m resolution is coarse relative to a single zone or a single landslide scar — useful for trend/context features, not fine-grained per-event vegetation state; native Sinusoidal grid requires a reprojection step in the pipeline.
- **Suitability for SIH26001:** Recommended as the primary NDVI/vegetation-trend source; Sentinel-2-derived NDVI (10 m, computable from the same Sentinel-2 imagery already sourced for §4) is a higher-resolution complement worth evaluating once the pipeline exists, at the cost of Sentinel-2's cloud-cover limitations.

---

## 7. Soil / Environmental Variables

### 7.1 SoilGrids 2.0 (ISRIC) (Priority B)

- **Official source/organization:** ISRIC — World Soil Information (International Soil Reference and Information Centre).
- **Dataset name:** SoilGrids 2.0 / SoilGrids250m.
- **Official URL:** https://soilgrids.org and https://www.isric.org/explore/soilgrids
- **API/download mechanism:** REST API (`https://rest.isric.org/soilgrids/v2.0/properties/query`) for point queries; bulk raster download via `https://files.isric.org/soilgrids/latest/data/`; also available on Google Earth Engine as community-hosted assets. **Important verified caveat: ISRIC's own SoilGrids page states the REST API is currently paused** ("We are currently experiencing issues with the REST API for SoilGrids, and have decided to temporarily pause the service... no estimated timeline") — this must be treated as an active access risk, not assumed resolved, and re-checked before the ML pipeline depends on it.
- **Geographic coverage:** Global, includes India.
- **Spatial resolution:** 250 m.
- **Temporal resolution:** Static (a modeled soil-property surface, not a time series).
- **Historical time range:** Not applicable — reflects the ~150,000+ profile training dataset used to fit the underlying models (WoSIS database), not a dated observation.
- **Update frequency:** Versioned releases (e.g., 2.0 in 2021 per Poggio et al.); not continuously updated.
- **File/API format:** GeoTIFF (bulk), JSON (REST API when available).
- **Coordinate reference system:** Homolosine/standard global grid for bulk files (per ISRIC documentation conventions) — exact EPSG for the specific files to be used — **TO VERIFY**.
- **Important variables:** Soil organic carbon, bulk density, pH, cation exchange capacity, sand/silt/clay fractions, coarse fragments, nitrogen — at six standard depth intervals (0–5, 5–15, 15–30, 30–60, 60–100, 100–200 cm).
- **Free/openly accessible:** Yes.
- **License/usage restrictions:** Open Database License (ODbL) v1.0.
- **Authentication/API keys required:** No for the documented access paths, though the REST API's current pause is itself an access blocker regardless of authentication.
- **Expected download size:** Global GeoTIFFs are large; a pilot-region clip via Earth Engine or a subset download would be small — **TO VERIFY** exact size for the chosen extraction method.
- **Advantages:** Only readily available global, free, high-resolution (250 m) soil-property dataset found in this research; ODbL license is permissive; scientifically documented (peer-reviewed methodology, Poggio et al. 2021).
- **Limitations:** It is a **modeled/predicted** surface (machine-learning interpolation from sparse profile observations), not a direct measurement, and ISRIC itself recommends comparing it against local/national soil maps where available rather than treating it as ground truth — a genuine caveat for feature reliability; the REST API's current outage is a live access risk.
- **Suitability for SIH26001:** Reasonable secondary/environmental feature source given the lack of a better-verified alternative; the modeled nature of the data and the current API outage should both be documented as known limitations, and bulk-file access (rather than the paused REST API) should be the assumed access path until the API status is reconfirmed.

---

## 8. Administrative Boundaries

### 8.1 GADM (Priority A, with a licensing caveat)

- **Official source/organization:** GADM project (originally led by Robert J. Hijmans).
- **Dataset name:** GADM database of Global Administrative Areas, current version 4.1.
- **Official URL:** https://gadm.org/download_country.html
- **API/download mechanism:** Direct file download (GeoPackage, Shapefile, KMZ, R spatial objects), per-country or global.
- **Geographic coverage:** Global, includes India with up to 5 administrative levels (national down to local units, varies by country).
- **Spatial resolution:** Vector polygon boundaries; positional accuracy not separately quantified in sources reviewed — **TO VERIFY**.
- **Temporal resolution / historical range:** Reflects current/recent administrative divisions as compiled; not a historical boundary-change archive.
- **Update frequency:** Versioned (v4.1 released 16 July 2022 per Wikipedia's GADM entry) — not frequently updated.
- **File/API format:** GeoPackage (current standard format), Shapefile, KMZ.
- **Coordinate reference system:** Standard geographic (WGS84) is the norm for GADM; explicit confirmation for the India layer — **TO VERIFY**.
- **Important variables:** Administrative unit names and hierarchy (state/district/sub-district, etc.), boundary geometry.
- **Free/openly accessible:** Free for academic and non-commercial use.
- **License/usage restrictions:** **Commercial use requires a separate license from the GADM project; redistribution is restricted.** This is a real constraint worth flagging early — a hackathon prototype is likely non-commercial, but this should be explicitly confirmed against SIH26001's actual usage/distribution terms rather than assumed.
- **Authentication/API keys required:** No.
- **Expected download size:** Small to moderate for a single country's admin layers (order of tens to low hundreds of MB depending on level of detail) — **TO VERIFY** exactly for India.
- **Advantages:** Consistent, well-known, widely used in research; multiple administrative levels available for India; simple direct download.
- **Limitations:** Non-commercial license restriction (see above); not a continuously updated authoritative government source.
- **Suitability for SIH26001:** Usable for MVP prototyping under its non-commercial terms; **geoBoundaries (below) is recommended instead wherever a more permissive license is needed**, and Survey of India (official) should be the long-term authoritative target — see the open item below.

### 8.2 geoBoundaries (Priority A/B — permissive alternative)

- **Official source/organization:** geoBoundaries project (open, community/academic-maintained since 2017), distributed via the Humanitarian Data Exchange (HDX).
- **Dataset name:** geoBoundaries Global Database of Political Administrative Boundaries — India Subnational Administrative Boundaries (ADM1–ADM5).
- **Official URL:** https://www.geoboundaries.org ; India-specific listing at https://data.humdata.org/dataset/geoboundaries-admin-boundaries-for-india
- **API/download mechanism:** Direct download via HDX dataset page.
- **Geographic coverage:** India, multiple administrative levels (ADM1 through ADM5 per the HDX listing).
- **Spatial resolution / accuracy:** Not separately quantified in sources reviewed — **TO VERIFY**.
- **Temporal resolution / historical range:** Current administrative divisions as maintained; not a change-history archive.
- **Update frequency:** Maintained on an ongoing basis since 2017 per the project's own description.
- **File/API format:** Standard GIS vector formats via HDX (typically Shapefile/GeoJSON) — exact formats offered — **TO VERIFY**.
- **Coordinate reference system:** **TO VERIFY**.
- **Important variables:** Administrative hierarchy and boundary geometry.
- **Free/openly accessible:** Yes.
- **License/usage restrictions:** Open license (CC-BY), explicitly noted as allowing commercial use without restriction — the more permissive option compared to GADM.
- **Authentication/API keys required:** No.
- **Expected download size:** Comparable order of magnitude to GADM for India — **TO VERIFY**.
- **Advantages:** Fully open license with no commercial-use restriction, humanitarian-sector backing (HDX hosting implies some quality vetting).
- **Limitations:** Generally considered to have somewhat less granular detail than GADM in some regions (per general GIS community comparisons) — not independently confirmed for India specifically in this research — **TO VERIFY**.
- **Suitability for SIH26001:** Strong candidate wherever GADM's non-commercial restriction is a concern.

### 8.3 Survey of India (Official Authoritative Source) — UNVERIFIED

- **Official source/organization:** Survey of India, the national mapping agency.
- **Dataset name/URL/access mechanism:** Not independently verified in this research session — general awareness that Survey of India is the constitutionally recognized authority for India's official boundaries (referenced indirectly by the `imdR` package description, which mentions "Survey of India approved boundaries"), but no specific dataset page, download mechanism, license, or resolution was confirmed.
- **Status: UNVERIFIED.** This is flagged explicitly rather than guessed at, per the project's engineering rules. Before any production or public-facing map uses administrative boundaries, Survey of India's official position (and any requirement to use SOI-approved boundaries specifically, which is a known general expectation for maps published in India) should be directly investigated — this is a documented open item, not a decision made here.

---

## 9. Villages / Populated Places

### 9.1 OpenStreetMap (via Overpass API) (Priority A/B)

- **Official source/organization:** OpenStreetMap Foundation / global volunteer contributor community.
- **Dataset name:** OpenStreetMap `place=village` / `place=town` / `place=hamlet` nodes (and related tags).
- **Official URL:** https://www.openstreetmap.org ; query interface at https://overpass-turbo.eu ; India-specific community at https://www.openstreetmap.in
- **API/download mechanism:** Overpass API (Overpass QL queries) for programmatic extraction by bounding box/region; also full planet/regional extracts (e.g., via Geofabrik-style regional `.osm.pbf` files, not independently verified here — **TO VERIFY** the specific extract source used).
- **Geographic coverage:** Global, includes India, but **completeness is contributor-dependent and known to vary significantly by region** — this is a documented, real limitation of OSM generally, not specific to India.
- **Spatial resolution:** Point-based place nodes; positional accuracy varies by how the data was surveyed/imported.
- **Temporal resolution / historical range:** Continuously edited; historical versions are retrievable but the "current" extract reflects the latest edits, not a fixed-date snapshot unless explicitly pinned.
- **Update frequency:** Continuous (community-edited).
- **File/API format:** OSM XML or JSON via Overpass API; GeoJSON/Shapefile/GeoPackage via various export front-ends.
- **Coordinate reference system:** WGS84 (EPSG:4326), standard for OSM.
- **Important variables:** Place name, place type (village/town/hamlet), population (where tagged, often missing or stale), administrative relations.
- **Free/openly accessible:** Yes.
- **License/usage restrictions:** Open Database License (ODbL) — attribution ("© OpenStreetMap contributors") mandatory, and share-alike applies to derived *databases* (not to rendered maps).
- **Authentication/API keys required:** No for standard Overpass API use, though public instances are rate-limited and not intended for high-volume/production use per the Overpass API's own documentation.
- **Expected download size:** Small for a single region's village-level points.
- **Advantages:** Free, ODbL-permissive (commercial use allowed with attribution), queryable directly by bounding box without needing a full planet download, actively maintained.
- **Limitations:** Coverage completeness in rural/hilly Indian regions (precisely where landslide risk is concentrated) is not guaranteed and should be spot-checked against the actual pilot region before being relied on for population-exposure estimates — a real risk to disclose, not assume away.
- **Suitability for SIH26001:** Reasonable starting point for populated-place context in the dashboard; population-count accuracy should be treated as approximate and cross-checked, not authoritative, until verified for the chosen pilot region.

### 9.2 Census of India — Village Directory / SECC — UNVERIFIED

- Census of India publishes village-level demographic data (e.g., via the Village Directory / District Census Handbooks and, separately, Socio-Economic and Caste Census data), which would be the authoritative source for population figures. No specific dataset page, current download mechanism, license, or format was independently verified in this research session. **Status: UNVERIFIED — open item**, to be investigated directly against the current Census of India / data.gov.in listings before being relied upon.

---

## 10. Roads

### 10.1 OpenStreetMap Road Network (via Overpass API) (Priority A/B)

- Same organization, access mechanism, license (ODbL), and general characteristics as §9.1, filtered to `highway=*` ways instead of place nodes.
- **Important variables:** Road classification (highway, primary, secondary, track, path, etc.), surface type where tagged, name.
- **Advantages:** Free, queryable by region, useful both for GIS context (dashboard road layer) and as a terrain-access proxy feature (e.g., distance-to-road, a factor used in multiple published landslide susceptibility studies reviewed in §1).
- **Limitations:** Same completeness caveat as §9.1 — rural/hilly road network mapping completeness in the pilot region should be spot-checked, not assumed comprehensive, especially for minor tracks that may be locally significant for access/evacuation planning.
- **Suitability for SIH26001:** Good, low-effort source for the "distance to road" feature category referenced in the feature plan and for dashboard basemap context.

---

## 11. Critical Infrastructure

### 11.1 OpenStreetMap Infrastructure Tags (Priority C)

- **Official source/organization/access/license:** Same as §9.1/§10.1 (OSM via Overpass API, ODbL).
- **Relevant tags:** Healthcare facilities (`amenity=hospital`, `amenity=clinic`), schools (`amenity=school`), power infrastructure (`power=*`), emergency facilities, where tagged.
- **Advantages:** Free, no separate licensing negotiation needed beyond standard ODbL attribution; usable for dashboard context (e.g., "this zone contains N schools/health facilities within the risk area").
- **Limitations:** Critical-infrastructure tagging completeness in OSM is generally **less reliable than road/place data**, especially in rural hilly regions, because it depends on individual contributors surveying and tagging specific buildings — this is a materially bigger caveat than for roads/villages and should not be presented on the dashboard as a complete inventory of critical infrastructure without explicit verification against the pilot region.
- **No other authoritative, verified source for critical infrastructure was identified in this research session.** A state/district-level government asset inventory (e.g., from the relevant State Disaster Management Authority) would be a stronger source if it can be obtained — this is an open item, not resolved here.
- **Suitability for SIH26001:** Explicitly **Priority C (future/optional)** — useful for dashboard richness once the core MVP works, not a dependency for the first trained model, and any infrastructure count shown to authorities should be labeled as OSM-derived and approximate rather than authoritative.

---

## Pilot Region Recommendation

### Regions compared

| Region | Landslide label data found | Rainfall/DEM/satellite coverage | Verdict |
|---|---|---|---|
| **Kerala (Western Ghats)** | Hao et al. (2020) — 4,728-point, peer-reviewed, DOI-backed, methodologically documented single-event (Aug 2018) inventory built from NRSC + GSI/KSDMA sources | Full coverage from every source in §2–§8 (all are national/global products) | **Strongest candidate** |
| **Uttarakhand (Himalaya)** | Real, well-known events (June 2013 Bhagirathi valley disaster, 6,013 landslides mapped per literature) but **no single consolidated, openly downloadable inventory dataset** was found — records are scattered across individual research papers and government situation reports | Same national/global product coverage as Kerala | Data-rich in *literature*, not in *ready-to-use datasets* |
| **Darjeeling / Nilgiris / other Western Ghats states (Karnataka)** | Referenced in literature (e.g., 680-point Bhukosh-derived inventory used in a Karnataka Western Ghats susceptibility study) but not confirmed as an independently downloadable, DOI-backed dataset of comparable completeness to Kerala's | Same national/global product coverage | Plausible future expansion, not the strongest MVP starting point |

### Recommendation: **Kerala (Western Ghats), focused on the 2018-monsoon-affected districts covered by the Hao et al. (2020) inventory**

**Why:** This is the only Indian region for which this research found a landslide inventory that is simultaneously (a) real and verifiable via a DOI, (b) peer-reviewed with a transparent construction methodology, (c) large enough (4,728 points) to be genuinely useful for supervised learning, and (d) explicitly documented well enough to support honest leakage-prevention and false-negative analysis per `docs/validation_strategy.md`. Every other required layer (rainfall, DEM, Sentinel-2, land cover, NDVI, soil, administrative boundaries, OSM villages/roads) is a national or global product with full coverage over Kerala, so choosing Kerala does not sacrifice any other data category.

**What this recommendation does not claim:** It does not claim Kerala is the most landslide-prone region in India (Uttarakhand and other Himalayan states have severe, well-documented landslide histories), nor that the Hao et al. dataset is sufficient on its own for a multi-year time-series model — it is a single-event (2018 monsoon) inventory. The MVP's first model should be scoped accordingly (see below), and expansion to a genuine multi-year, multi-region dataset is a documented next step, not assumed to be automatic.

---

## Minimum Dataset Required to Train a First Model

Based on the sources verified above, the minimum viable combination for a first, honestly-scoped model is:

1. **Labels:** Hao et al. (2020) Kerala 2018 landslide inventory (positive points) + a documented, defensible negative-sampling strategy (e.g., non-landslide points within the same terrain/rainfall conditions, sampled with the same spatial-leakage care described in `docs/validation_strategy.md` — the exact sampling method is an implementation decision, not fixed here).
2. **Rainfall:** IMD 0.25° daily gridded rainfall for the relevant Kerala districts and time window around August 2018 (antecedent rainfall features), optionally supplemented by GPM IMERG for finer-window features.
3. **Terrain:** SRTM 1 arc-second (30 m) DEM for Kerala, from which slope/aspect/curvature are derived.
4. **Land cover:** ESA WorldCover 10 m (2021 vintage, closest available year to the 2018 event — noting the year mismatch as a documented limitation, not hidden).
5. **Vegetation:** MODIS MOD13Q1 NDVI for the relevant time window.
6. **Zone/administrative geometry:** geoBoundaries (or GADM, license permitting) India ADM boundaries for Kerala, to define initial monitoring zones.

This is the minimum combination needed to build the first honestly-evaluated model — it is **not** a claim that this combination is sufficient for a deployable early-warning system, which would need multi-year, multi-event coverage per the false-negative and generalization concerns already documented in `docs/validation_strategy.md`.

## Major Data Risks (carried into the final recommendation section)

- **Single-event label bias:** Training on one event's inventory (2018 Kerala monsoon) risks a model that reflects that specific storm's spatial pattern rather than landslide susceptibility in general — this must be treated as a first-pass constraint, explicitly stated in any reporting, not smoothed over.
- **Resolution mismatch across sources:** IMD rainfall (~25 km) vs. SRTM DEM (30 m) vs. WorldCover (10 m) vs. MODIS NDVI (250 m) span nearly three orders of magnitude in spatial resolution — the feature-engineering design must make a deliberate, documented choice about the target zone resolution and how coarser layers are handled (not silently upsampled without acknowledging the introduced pseudo-precision).
- **GSI Bhukosh and SoilGrids access mechanics are not fully confirmed** (portal login uncertainty; SoilGrids REST API confirmed paused as of this research) — both are flagged **TO VERIFY**/**UNVERIFIED** rather than assumed working.
- **GADM's non-commercial license** may or may not fit SIH26001's actual usage terms — an open item requiring a real decision, not an assumption.
- **OSM completeness in rural, hilly, landslide-prone terrain is unverified for the specific pilot region** and should be spot-checked before being relied upon for population/infrastructure claims shown to authorities.
- **Land-cover/vegetation product years (2020/2021 WorldCover, MODIS ongoing) do not exactly match the 2018 event date** — a real temporal-alignment gap that must be documented, not silently treated as "current conditions at the time of the event."
