"""
Stream and extract Geofabrik OpenStreetMap India Roads dataset for NER states.
"""

from pathlib import Path
import urllib.request
import zipfile

BASE_DIR = Path(__file__).resolve().parents[2]
ROADS_DIR = BASE_DIR / "data" / "external" / "road_network"
ROADS_DIR.mkdir(parents=True, exist_ok=True)

url = "https://download.geofabrik.de/asia/india-latest-free.shp.zip"
zip_path = ROADS_DIR / "india-latest-free.shp.zip"

if not (ROADS_DIR / "gis_osm_roads_free_1.shp").exists():
    print(f"Downloading Geofabrik OpenStreetMap India transport shapefiles from {url}...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=120) as resp, open(zip_path, "wb") as out_f:
        chunk_size = 2 * 1024 * 1024
        downloaded = 0
        while True:
            chunk = resp.read(chunk_size)
            if not chunk:
                break
            out_f.write(chunk)
            downloaded += len(chunk)
            if downloaded % (20 * 1024 * 1024) == 0:
                print(f"Downloaded {downloaded / 1e6:.1f} MB...")

    print(f"Downloaded zip file ({zip_path.stat().st_size / 1e6:.1f} MB). Extracting roads shapefiles...")
    with zipfile.ZipFile(zip_path, "r") as zf:
        for item in zf.namelist():
            if "roads" in item:
                zf.extract(item, ROADS_DIR)
                print(f"Extracted {item}")

print("Road network dataset preparation complete.")
