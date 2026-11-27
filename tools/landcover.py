"""Crop ESA WorldCover 2021 to the local model grid. The output stores class IDs."""
import json, math, tempfile
from pathlib import Path
import numpy as np
import rasterio
import requests
from PIL import Image

url='https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N36E120_Map.tif'
path=Path(tempfile.gettempdir())/'ytkj-worldcover-2021.tif'
if not path.exists():
    r=requests.get(url+'?campus=full',timeout=120); r.raise_for_status(); path.write_bytes(r.content)
with rasterio.open(path) as src:
    xy=(np.arange(320)+.5)*10-1600
    col=np.floor((120.70525+xy/(111320*math.cos(math.radians(37.80598)))-src.transform.c)/src.transform.a).astype(int)
    row=np.floor((37.80598-xy/110993-src.transform.f)/src.transform.e).astype(int)
    box=rasterio.windows.Window(col.min(),row.min(),col.max()-col.min()+1,row.max()-row.min()+1)
    subset=src.read(1,window=box)
    data=subset[np.ix_(row-row.min(),col-col.min())]
    dist=Path(__file__).resolve().parents[1]/'dist'
    refinement=json.loads((dist/'data/landcover-refinement.json').read_text('utf8'))
    grid=refinement['grid']
    if refinement['version']!=1 or data.shape!=(grid['size'],grid['size']) or grid['stepMetres']!=10 or grid['minLocalMetres']!=-1600:
        raise ValueError('Land-cover refinement does not match the local grid')
    cells=data.reshape(-1)
    for start,count in refinement['runs']:
        if not 0<=start<start+count<=len(cells) or not np.all(cells[start:start+count]==refinement['fromClass']):
            raise ValueError('Land-cover refinement does not match the WorldCover pixels')
        cells[start:start+count]=refinement['toClass']
    out=dist/'cover.png'
    Image.fromarray(data).save(out)
    print(out,np.unique(data,return_counts=True))

