"""Sample the public Mapzen Terrarium DEM on a local metric grid."""
import concurrent.futures
import io
import json
import math
from pathlib import Path

import requests
from PIL import Image

origin = (120.70525, 37.80598)
z = 12
scale = 256 * 2 ** z
east = 111320 * math.cos(math.radians(origin[1]))
north = 110993.0

def pixel(x, s):
    lon, lat = origin[0] + x / east, origin[1] - s / north
    return ((lon+180)/360*scale-.5, (1-math.asinh(math.tan(math.radians(lat)))/math.pi)*scale/2-.5)

def get_tile(k):
    u,v=k
    url=f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{u}/{v}.png'
    res=requests.get(url, timeout=35)
    res.raise_for_status()
    return k, Image.open(io.BytesIO(res.content)).convert('RGB')

a,b=pixel(-1600,-1600)
c,d=pixel(1600,1600)
keys=[(i,j) for i in range(int(a)//256,int(c+1)//256+1) for j in range(int(b)//256,int(d+1)//256+1)]
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    tiles=dict(pool.map(get_tile,keys))
def height(i,j):
    r,g,b=tiles[(i//256,j//256)].getpixel((i%256,j%256))
    return r*256+g+b/256-32768
def sample(x,s):
    u,v=pixel(x,s)
    i,j=math.floor(u),math.floor(v)
    f,g=u-i,v-j
    return round((1-g)*((1-f)*height(i,j)+f*height(i+1,j))+g*((1-f)*height(i,j+1)+f*height(i+1,j+1)),1)
data=[sample(x,s) for s in range(-1600,1601,20) for x in range(-1600,1601,20)]
out=Path(__file__).resolve().parents[1]/'dist'/'dem.json'
out.write_text(json.dumps(dict(origin=origin,min=-1600,step=20,n=161,values=data),separators=(',',':')))
print(out, min(data), max(data))

