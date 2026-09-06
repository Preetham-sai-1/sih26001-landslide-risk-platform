"""
Fast Parallel / Streamed V8 Dataset Downloader.
"""

import os
from pathlib import Path
import urllib.request
import zipfile

BASE_DIR = Path(__file__).resolve().parents[2]
EXTERNAL_DIR = BASE_DIR / "data" / "external"


def download_file(url: str, out_path: Path):
    if out_path.exists() and out_path.stat().st_size > 1000:
        print(f"File {out_path.name} already downloaded ({out_path.stat().st_size / 1e6:.1f} MB).")
        return
    print(f"Downloading {out_path.name} from {url}...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as resp, open(out_path, 'wb') as out_f:
        chunk_size = 1024 * 1024
        while True:
            chunk = resp.read(chunk_size)
            if not chunk:
                break
            out_f.write(chunk)
    print(f"Completed {out_path.name} ({out_path.stat().st_size / 1e6:.1f} MB)")


def main():
    wc_dir = EXTERNAL_DIR / "esa_worldcover"
    hydro_dir = EXTERNAL_DIR / "hydrography"
    roads_dir = EXTERNAL_DIR / "road_network"

    wc_dir.mkdir(parents=True, exist_ok=True)
    hydro_dir.mkdir(parents=True, exist_ok=True)
    roads_dir.mkdir(parents=True, exist_ok=True)

    # 1. ESA WorldCover (Central NER tile N24E090 & N27E090)
    wc_tiles = ['N24E090', 'N27E090', 'N21E090']
    for tile in wc_tiles:
        url = f"https://esa-worldcover.s3.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_{tile}_Map.tif"
        out_tif = wc_dir / f"ESA_WorldCover_10m_2021_v200_{tile}_Map.tif"
        try:
            download_file(url, out_tif)
        except Exception as e:
            print(f"WorldCover {tile} download failed: {e}")

    # 2. HydroBASINS lev01-12
    hydro_url = "https://data.hydrosheds.org/file/hydrobasins/standard/hybas_as_lev01-12_v1c.zip"
    hydro_zip = hydro_dir / "hybas_as_lev01-12_v1c.zip"
    try:
        download_file(hydro_url, hydro_zip)
        if hydro_zip.exists() and not (hydro_dir / "hybas_as_lev06_v1c.shp").exists():
            print("Extracting HydroBASINS shapefile...")
            with zipfile.ZipFile(hydro_zip, 'r') as zf:
                zf.extractall(hydro_dir)
    except Exception as e:
        print(f"HydroBASINS download failed: {e}")

    # 3. Geofabrik Roads
    roads_url = "https://download.geofabrik.de/asia/india-210101-free.shp.zip"
    roads_zip = roads_dir / "india-210101-free.shp.zip"
    try:
        download_file(roads_url, roads_zip)
        if roads_zip.exists() and not (roads_dir / "gis_osm_roads_free_1.shp").exists():
            print("Extracting OSM roads shapefile...")
            with zipfile.ZipFile(roads_zip, 'r') as zf:
                for item in zf.namelist():
                    if "roads" in item:
                        zf.extract(item, roads_dir)
    except Exception as e:
        print(f"Geofabrik roads download failed: {e}")


if __name__ == "__main__":
    main()
