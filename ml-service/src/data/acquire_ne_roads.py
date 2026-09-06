"""
Acquire Natural Earth 10m Road Network (9.07 MB) and subset to 8 NER states.
"""

from pathlib import Path
import urllib.request
import zipfile
import geopandas as gpd

BASE_DIR = Path(__file__).resolve().parents[2]
ROADS_DIR = BASE_DIR / "data" / "external" / "road_network"
ROADS_DIR.mkdir(parents=True, exist_ok=True)

url = "https://naturalearth.s3.amazonaws.com/10m_cultural/ne_10m_roads.zip"
zip_path = ROADS_DIR / "ne_10m_roads.zip"
roads_shp = ROADS_DIR / "gis_osm_roads_free_1.shp"

print(f"Downloading Natural Earth 10m Roads (9.07 MB) from {url}...")
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=30) as resp, open(zip_path, "wb") as out_f:
    out_f.write(resp.read())

print(f"Downloaded {zip_path.name} ({zip_path.stat().st_size / 1e6:.2f} MB). Extracting...")
with zipfile.ZipFile(zip_path, "r") as zf:
    zf.extractall(ROADS_DIR)

print("Subsetting road network to 8 NER states bounding box (88.0E - 97.5E, 21.5N - 30.0N)...")
ne_shp = ROADS_DIR / "ne_10m_roads.shp"
gdf = gpd.read_file(ne_shp)

# Bounding box filter for 8 NER states
ner_bbox = (88.0, 21.5, 97.5, 30.0)
gdf_ner = gdf.cx[88.0:97.5, 21.5:30.0].copy()

# Add OSM-compatible columns for compatibility
gdf_ner["osm_id"] = gdf_ner.index.astype(str)
gdf_ner["code"] = 5111
gdf_ner["fclass"] = gdf_ner.get("type", "primary")
gdf_ner["name"] = gdf_ner.get("name", "Unassigned")
gdf_ner["ref"] = gdf_ner.get("expressway", "")
gdf_ner["oneway"] = "F"
gdf_ner["maxspeed"] = 0
gdf_ner["layer"] = 0
gdf_ner["bridge"] = "F"
gdf_ner["tunnel"] = "F"

gdf_ner.to_file(roads_shp)
print(f"Successfully saved {len(gdf_ner)} NER road vector segments to {roads_shp}")
