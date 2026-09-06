"""
Acquire Natural Earth 10m Physical Rivers & Stream Centerlines for 8 NER states.
"""

from pathlib import Path
import urllib.request
import zipfile
import geopandas as gpd

BASE_DIR = Path(__file__).resolve().parents[2]
HYDRO_DIR = BASE_DIR / "data" / "external" / "hydrography"
HYDRO_DIR.mkdir(parents=True, exist_ok=True)

url = "https://naturalearth.s3.amazonaws.com/10m_physical/ne_10m_rivers_lake_centerlines.zip"
zip_path = HYDRO_DIR / "ne_10m_rivers_lake_centerlines.zip"
streams_shp = HYDRO_DIR / "ner_streams.shp"


def acquire_stream_network() -> Path:
    if not streams_shp.exists():
        print(f"Downloading Natural Earth 10m Rivers & Streams from {url}...")
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=30) as resp, open(zip_path, "wb") as out_f:
            out_f.write(resp.read())

        print(f"Downloaded {zip_path.name} ({zip_path.stat().st_size / 1e6:.2f} MB). Extracting...")
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(HYDRO_DIR)

        ne_rivers_shp = HYDRO_DIR / "ne_10m_rivers_lake_centerlines.shp"
        gdf = gpd.read_file(ne_rivers_shp)

        # Bounding box filter for 8 NER states (88.0E - 97.5E, 21.5N - 30.0N)
        gdf_ner = gdf.cx[88.0:97.5, 21.5:30.0].copy()
        gdf_ner.to_file(streams_shp)
        print(f"Successfully saved {len(gdf_ner)} NER river/stream line segments to {streams_shp}")
    else:
        print(f"NER stream line network shapefile already present at {streams_shp}")

    return streams_shp


if __name__ == "__main__":
    acquire_stream_network()
