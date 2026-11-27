"""Crop an openly available Sentinel-2 TCI to a 3200 m local frame."""
import math
from pathlib import Path
import rasterio
from rasterio.warp import reproject, Resampling
from rasterio.transform import from_bounds
from PIL import Image
import numpy as np
url='https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/51/S/TB/2026/10/S2B_51STB_20261014_0_L2A/TCI.tif'
lat,lon=37.80598,120.70525
dx=1600/(111320*math.cos(math.radians(lat)));dy=1600/110993
target=from_bounds(lon-dx,lat-dy,lon+dx,lat+dy,320,320)
out=np.zeros((3,320,320),dtype='uint8')
with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif',GDAL_HTTP_TIMEOUT='30'):
    with rasterio.open(url) as src:
        for i in range(3):
            reproject(rasterio.band(src,i+1),out[i],dst_transform=target,dst_crs='EPSG:4326',resampling=Resampling.bilinear)
Image.fromarray(out.transpose(1,2,0)).save(Path(__file__).resolve().parents[1]/'dist'/'sentinel.jpg',quality=96)

