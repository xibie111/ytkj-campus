"""Check the three mapped water polygons against dated Copernicus Sentinel-2 L2A scenes."""
import json
import math
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import rasterio
from rasterio.transform import from_bounds
from rasterio.warp import Resampling, reproject
from shapely.geometry import Point, Polygon

DATA = Path(__file__).resolve().parents[1] / 'dist/data'
SCENES = ['S2C_51STB_20250520_0_L2A', 'S2B_51STB_20250611_0_L2A', 'S2B_51STB_20261014_0_L2A']
WEST, NORTH, EAST, SOUTH = 400, 380, 1460, 930
COLS, ROWS = (EAST-WEST)//10, (SOUTH-NORTH)//10
LON, LAT = 120.70525, 37.80598
MX, MY = 111320*math.cos(math.radians(LAT)), 110993
GRID = from_bounds(LON+WEST/MX, LAT-SOUTH/MY, LON+EAST/MX, LAT-NORTH/MY, COLS, ROWS)


def read_band(key):
    scene, band = key
    date = scene.split('_')[2]
    base = 'https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/51/S/TB'
    url = f'{base}/{int(date[:4])}/{int(date[4:6])}/{scene}/{band}.tif'
    dest = np.zeros((ROWS,COLS), dtype=np.uint16)
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', GDAL_HTTP_TIMEOUT='30'):
        with rasterio.open(url) as src:
            pixel = 20 if band=='SCL' else 10
            if src.crs.to_epsg()!=32651 or (src.transform.a,src.transform.e)!=(pixel,-pixel):
                raise ValueError(f'Unexpected georeferencing for {url}')
            reproject(rasterio.band(src,1), dest, dst_transform=GRID,
                      dst_crs='EPSG:4326', resampling=Resampling.nearest)
    return key, dest


def review(way, bands):
    polygon = Polygon(way['ring'])
    interior = polygon.buffer(-10)
    points = [(j,i) for j in range(ROWS) for i in range(COLS)
              if interior.covers(Point(WEST+(i+.5)*10,NORTH+(j+.5)*10))]
    results = []
    for scene in SCENES:
        values = [[grid[j,i] for j,i in points] for grid in
                  (bands[scene,'B03'], bands[scene,'B08'], bands[scene,'SCL'])]
        green, nir, classes = map(np.asarray, values)
        results.append(dict(scene=scene, vegetationOrBare=int(np.isin(classes,[4,5]).sum()),
                            waterClass=int((classes==6).sum()),
                            positiveGreenMinusNir=int((green>nir).sum())))
    # A doubtful or narrow polygon keeps its OSM rendering. Three clear dates
    # must agree across every tested interior point to omit a water fill.
    suppress = len(points)>=5 and all(r['vegetationOrBare']==len(points) and
                                     r['positiveGreenMinusNir']==0 for r in results)
    return dict(osmWay=way['id'], interiorSamples=len(points), omitOpenWaterFill=suppress, scenes=results)


if __name__=='__main__':
    ways=json.loads((DATA/'surroundings.json').read_text('utf8'))['water']
    with ThreadPoolExecutor(max_workers=6) as pool:
        bands=dict(pool.map(read_band,((s,b) for s in SCENES for b in ['B03','B08','SCL'])))
    record=dict(source='Copernicus Sentinel-2 L2A, EPSG:32651. B03 and B08 10 m, SCL 20 m.',
                method='Nearest samples on a 10 m local grid at least 10 m inside the OSM boundary. Positive green minus NIR has the sign of NDWI. SCL 4/5: vegetation or bare ground, 6: water.',
                ways=[review(way,bands) for way in ways])
    (DATA/'water-observations.json').write_text(json.dumps(record,indent=2)+'\n','utf8')
