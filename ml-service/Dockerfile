# ml-service Dockerfile
# Infra only: packages the existing Python pipeline/tests exactly as
# they are. Does not change feature definitions, preprocessing, or
# model logic. No FastAPI app exists yet (see docs/architecture.md) --
# this image is for running the data/feature pipeline and test suite
# reproducibly, not for serving requests.

FROM python:3.12-slim

# System dependencies required by rasterio/geopandas at runtime
# (GDAL/GEOS/PROJ). rasterio's manylinux wheels normally bundle GDAL,
# but geopandas' dependency chain (fiona/pyproj) still needs the PROJ
# data files and shared libs present on some base images.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgdal-dev \
        libgeos-dev \
        libproj-dev \
        gdal-bin \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ src/
COPY tests/ tests/
COPY pytest.ini .

EXPOSE 8000

CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
