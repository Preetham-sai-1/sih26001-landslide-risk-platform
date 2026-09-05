# AGENTS.md

Instructions for any human or AI agent working on this repository.
This file documents how to reproduce and run the CURRENT project — it
does not describe intended/future architecture (see `docs/architecture.md`
for that).

## Environment

- Python 3.12 (verified: 3.12.3, pinned in `.python-version`). Java 21
  present but no Maven project exists yet (Spring Boot service not
  implemented — `pom.xml` absent, so Maven's absence is not currently a
  blocker). Node 22 present but the React frontend is not yet
  implemented.
- No environment variables are currently read by any ml-service code.
  `.env.example` at the repo root lists planned variables for later
  phases (DB, alert providers) — none are used yet. No real `.env` or
  secret has ever been committed (verified by search).

## One-command setup and run

```
bash scripts/setup_ml_service.sh && bash scripts/run_ml_tests.sh
```

## Setup

```
bash scripts/setup_ml_service.sh      # creates ml-service/.venv, installs pinned deps
```

or manually:

```
cd ml-service
pip install -r requirements.txt
```

`ml-service/requirements.txt` is pinned to exact versions verified
working together (`rasterio==1.5.1`, `geopandas==1.1.4`, etc.) — do not
loosen these pins without re-verifying the full test suite.

## Running tests

```
bash scripts/run_ml_tests.sh
```

or `cd ml-service && python -m pytest tests/ -v`. `ml-service/pytest.ini`
sets `pythonpath = .` so `from src...` imports resolve regardless of
the invoking working directory — this was previously undocumented and
depended on manually `cd`-ing into `ml-service/` first.

## Docker

`ml-service/Dockerfile` builds an image that installs pinned
dependencies and runs the test suite (`CMD` runs pytest). It does
**not** serve an API — no FastAPI app exists yet. Not yet verified by
an actual `docker build`/`docker run` in this environment (no `docker`
binary available here) — verify before relying on it.

## Data

Real data currently present only in `ml-service/data/raw/` and
`ml-service/data/interim/` (Kerala 2018 landslide shapefile + derived
grid/label GeoPackages) is **not tracked by git** (`.gitignore`
excludes data directory contents by design — see manifests below for
provenance instead of committing large files). See:

- `ml-service/data/raw/kerala_landslide_inventory_2018/manifest.yaml`
- `ml-service/data/interim/manifest.yaml`
- `ml-service/data/external/manifest.yaml` (tracks all NER external
  sources — all currently `NOT ACQUIRED`; this sandboxed environment's
  network egress cannot reach any of the required data hosts, verified
  by direct testing across multiple phases)

## Rules established across this project's prior work (do not relitigate silently)

- Never fabricate data, accuracy, or a downloaded dataset that wasn't
  actually acquired.
- Missing raster/vector inputs yield `NaN` features with an explicit
  warning — never a filled/guessed value.
- Kerala 2018 is pipeline-development/validation data only — it is not
  claimed representative of the North Eastern Region (the actual SIH
  target), per `docs/training_dataset_build.md` §1.
- No model has been trained yet.

## Portability fixes made (reproducibility audit)

- `DEFAULT_DEM_DIR`/`DEFAULT_RAINFALL_DIR`/`DEFAULT_SOIL_DIR` (in
  `dem.py`/`rainfall.py`/`soil.py`) used to be relative strings that
  only resolved correctly when invoked from the repo root. Fixed to
  resolve via `Path(__file__).resolve()`, independent of invocation
  cwd — verified identical from both `ml-service/` and repo root.
- `scripts/extract_ner_landslide_subset.py` had the same cwd-fragility
  bug; fixed the same way.
- `ner_landslide_inventory.gpkg`'s checksum changes on every re-run
  because GeoPackage embeds a write timestamp
  (`gpkg_contents.last_change`) — this is expected file-format
  behavior, not a data change. The manifest documents this and
  recommends comparing record count/state counts/OBJECTIDs/bounds
  instead of raw file checksum for this specific output.
