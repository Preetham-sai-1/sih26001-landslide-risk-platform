"""
Acquire official OpenStreetMap road network lines for 8 NER states.
"""

import json
from pathlib import Path
import urllib.request
import urllib.parse
import geopandas as gpd
from shapely.geometry import LineString

BASE_DIR = Path(__file__).resolve().parents[2]
ROADS_DIR = BASE_DIR / "data" / "external" / "road_network"
ROADS_DIR.mkdir(parents=True, exist_ok=True)

roads_shp = ROADS_DIR / "gis_osm_roads_free_1.shp"

if not roads_shp.exists():
    print("Fetching OpenStreetMap primary/trunk/secondary highways for 8 NER states...")
    query = """
    [out:json][timeout:30];
    way["highway"~"primary|trunk|secondary|motorway"](21.5,88.0,30.0,97.5);
    out body;
    >;
    out skel qt;
    """
    url = "https://overpass-api.de/api/interpreter"
    data = urllib.parse.urlencode({'data': query}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json'
    })

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw_json = json.loads(resp.read().decode('utf-8'))

        nodes = {n['id']: (n['lon'], n['lat']) for n in raw_json.get('elements', []) if n.get('type') == 'node'}
        ways = [w for w in raw_json.get('elements', []) if w.get('type') == 'way']

        records = []
        for w in ways:
            w_nodes = w.get('nodes', [])
            coords = [nodes[nid] for nid in w_nodes if nid in nodes]
            if len(coords) >= 2:
                tags = w.get('tags', {})
                records.append({
                    'osm_id': str(w.get('id')),
                    'code': 5111,
                    'fclass': str(tags.get('highway', 'road')),
                    'name': str(tags.get('name', 'Unassigned')),
                    'ref': str(tags.get('ref', '')),
                    'oneway': str(tags.get('oneway', 'F')),
                    'maxspeed': 0,
                    'layer': 0,
                    'bridge': 'F',
                    'tunnel': 'F',
                    'geometry': LineString(coords)
                })

        if len(records) > 0:
            gdf = gpd.GeoDataFrame(records, crs="EPSG:4326")
            gdf.to_file(roads_shp)
            print(f"Successfully saved {len(gdf)} NER road segments to {roads_shp}")
        else:
            print("No OSM road elements returned.")
    except Exception as e:
        print(f"OSM Overpass query error: {e}")
else:
    print(f"Road network shapefile already present at {roads_shp}")
