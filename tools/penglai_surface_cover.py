"""Build the Penglai/Dongshan colour-atlas overlay from independently dated public land-cover observations.

Usage: python tools/penglai_surface_cover.py Yantai.tif path/to/band-cache
SinoLC-1 is a classified map, not aerial photography. Only the natural/hard surface classes
consistent with two recent optical observations are coloured; the satellite view stays raw.
"""
import argparse
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image
import rasterio
from rasterio.transform import from_bounds
from rasterio.warp import reproject, Resampling, transform_bounds
from rasterio.windows import from_bounds as source_window, Window
from scipy.ndimage import median_filter, gaussian_filter
import requests

OUT = Path(__file__).resolve().parents[1] / 'dist'
LON, LAT = 120.70525, 37.80598
HALF = 1600
DX = 111320 * math.cos(math.radians(LAT))
BOUNDS = (LON - HALF / DX, LAT - HALF / 110993, LON + HALF / DX, LAT + HALF / 110993)
SCENES = ['S2C_T51STB_20250520T025723_L2A', 'S2B_T51STB_20250611T024655_L2A', 'S2C_T51STB_20260704T025425_L2A']

def sample(path, size, dtype):
    target = np.zeros((size, size), dtype=dtype)
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', GDAL_HTTP_TIMEOUT='35'):
        with rasterio.open(path) as src:
            coords = transform_bounds('EPSG:4326', src.crs, *BOUNDS)
            w = source_window(*coords, transform=src.transform)
            window = Window(math.floor(w.col_off)-2, math.floor(w.row_off)-2,
                            math.ceil(w.width)+5, math.ceil(w.height)+5)
            raw = src.read(1, window=window, boundless=True, fill_value=0)
            reproject(raw, target, src_transform=src.window_transform(window), src_crs=src.crs,
                      dst_transform=from_bounds(*BOUNDS, size, size), dst_crs='EPSG:4326',
                      src_nodata=0, dst_nodata=0, resampling=Resampling.nearest)
    return target

def scene_index(scene, cache):
    path = cache / (scene + '-320-ndvi.npy')
    if path.exists():
        return np.load(path)
    url = 'https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1-l2a/items/' + scene
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    assets = response.json()['assets']
    def reflectance(name):
        asset = assets[name]
        values = sample(asset['href'], 320, np.float32)
        band = asset['raster:bands'][0]
        return np.where(values>0, values*band.get('scale',1)+band.get('offset',0), np.nan)
    red, nir = reflectance('red'), reflectance('nir')
    quality = sample(assets['scl']['href'], 320, np.uint8)
    valid = np.isin(quality,[4,5]) & (red >= 0) & (nir >= 0) & ((nir+red)>.02)
    index = np.divide(nir-red,nir+red,out=np.full_like(red,np.nan),where=valid)
    if valid.mean()<.5:
        raise ValueError(f'{scene} has too little usable land coverage')
    np.save(path,index)
    return index

def build(source, cache):
    cache.mkdir(parents=True, exist_ok=True)
    recent = np.stack([scene_index(scene,cache) for scene in SCENES])
    # Keep recent-season evidence and at least one observation in the previous year.
    vegetated = (recent[-1]>.27) & np.any(recent[:2]>.37,axis=0)
    hard = (recent[-1]<.27) & np.any(recent[:2]<.23,axis=0)
    world = np.asarray(Image.open(OUT/'cover.png').convert('L'))
    size = 3200
    mapped = median_filter(sample(source, size, np.uint8), size=3)
    def mask(coarse):
        # Soften the *confidence* boundary of the 10 m support pixels. The fine
        # edge between classes still follows the independent high-resolution map.
        smooth = gaussian_filter(coarse.astype(np.float32), .65)
        return np.asarray(Image.fromarray(smooth).resize((size,size), Image.Resampling.BILINEAR))
    green = mask(vegetated)
    paved = mask(hard & (world==50))
    exposed = mask(hard & np.isin(world,[30,40,60]))
    farmland = mask(vegetated & (world==40))
    # These colours encode land use. They do not recreate the colour of individual leaves or roofs.
    palette = [(2,[91,121,82],green,.74), (3,[130,146,107],green,.80),
               (4,[165,177,120],green,.85), (5,[167,158,112],farmland,.82),
               (6,[171,165,150],paved,.84), (7,[189,164,133],exposed,.82)]
    rgba = np.zeros((size,size,4),dtype=np.uint8)
    # Dongshan has independent low-canopy height measurements in these cells.
    # The renderer applies the more specific correction to its base layer.
    low_cover = json.loads((OUT/'data/dongshan-low-vegetation.json').read_bytes())
    keep = np.ones((320,320),dtype=bool)
    for start,count in low_cover['runs']:
        keep.flat[start:start+count] = False
    keep = keep.repeat(10,axis=0).repeat(10,axis=1)
    areas = {}
    for code,colour,support,opacity in palette:
        selected = (mapped==code) & (support>.40) & keep
        alpha = np.clip((support[selected]-.40)/.48,0,1)*opacity
        rgba[selected,:3] = colour
        rgba[selected,3] = np.rint(255*alpha).astype(np.uint8)
        areas[str(code)] = int(np.count_nonzero(selected & (rgba[:,:,3]>=64)))
    Image.fromarray(rgba).save(OUT/'data/penglai-surface-cover.webp', lossless=True, method=4)
    print(json.dumps({'grid':size,'retainedSquareMetresAtAlpha64':areas,'scenes':SCENES}))

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('yantai_tif',type=Path)
    parser.add_argument('band_cache',type=Path)
    args=parser.parse_args()
    build(args.yantai_tif,args.band_cache)
