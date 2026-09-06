"""
Download HydroBASINS lev06 (12.8MB) and OSM Road Network extract.
"""

from pathlib import Path
import urllib.request
import zipfile

BASE_DIR = Path(__file__).resolve().parents[2]
EXTERNAL_DIR = BASE_DIR / "data" / "external"
HYDRO_DIR = EXTERNAL_DIR / "hydrography"
ROADS_DIR = EXTERNAL_DIR / "road_network"

HYDRO_DIR.mkdir(parents=True, exist_ok=True)
ROADS_DIR.mkdir(parents=True, exist_ok=True)

# 1. Download HydroBASINS lev06 (12.8 MB)
hydro_url = "https://data.hydrosheds.org/file/hydrobasins/standard/hybas_as_lev06_v1c.zip"
hydro_zip = HYDRO_DIR / "hybas_as_lev06_v1c.zip"

print(f"Downloading HydroBASINS lev06 (12.8 MB) from {hydro_url}...")
req = urllib.request.Request(hydro_url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=60) as resp, open(hydro_zip, "wb") as out_f:
    out_f.write(resp.read())

print(f"Downloaded {hydro_zip.name} ({hydro_zip.stat().st_size / 1e6:.1f} MB)")
with zipfile.ZipFile(hydro_zip, "r") as zf:
    zf.extractall(HYDRO_DIR)
print("Extracted HydroBASINS lev06 shapefiles.")

# 2. OpenStreetMap Roads (Overpass API Bounding Box query for NER roads or Geofabrik extract)
# We query Overpass API for primary/secondary/trunk/motorway roads in NER bbox [88.0, 21.5, 97.5, 30.0]
import json
import geopandas as gpd
from shapely.geometry import LineString, MultiLineString

overpass_url = "https://overpass-api.de/api/interpreter"
overpass_query = """
[out:json][timeout:60];
(
  way["highway"~"primary|secondary|trunk|motorway"](21.5,88.0,30.0,97.5);
);
out body;
>;
out skel qt;
"""

print("Querying OpenStreetMap Overpass API for official NER road network...")
try:
    data_encoded = urllib.parse.urlencode({'data': overpass_query}).encode('utf-8')
    req_op = urllib.request.Request(overpass_url, data=data_encoded, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req_op, timeout=60) as resp:
        osm_json = json.loads(resp.read().decode('utf-8'))

    nodes = {n['id']: (n['lon'], n['lat']) for n in osm_json.get('elements', []) if n.get('type') == 'node'}
    ways = [w for w in osm_json.get('elements', []) if w.get('type') == 'way']

    features = []
    for w in ways:
        w_nodes = w.get('nodes', [])
        coords = [nodes[nid] for nid in w_nodes if nid in nodes]
        if len(coords) >= 2:
            geom = LineString(coords)
            props = w.get('tags', {})
            props['geometry'] = geom
            features.append(props)

    if len(features) > 0:
        gdf_roads = gpd.GeoDataFrame(features, crs="EPSG:4326")
        roads_shp = ROADS_DIR / "ner_osm_roads.shp"
        gdf_roads.to_file(roads_shp)
        print(f"Saved {len(gdf_roads)} NER road segments to {roads_shp}")
    else:
        print("No OSM road segments returned from query.")
except Exception as e:
    print(f"OSM Overpass query note: {e}")

print("Acquisition script completed.")
