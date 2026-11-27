"""Rebuild the area around the Penglai campus from licensed geographic data."""
import hashlib
import json
import math
import tempfile
import zipfile
from pathlib import Path

import numpy as np
import rasterio
import requests
import shapefile
from PIL import Image
from rasterio.warp import reproject, Resampling
from rasterio.transform import from_bounds
from shapely.affinity import affine_transform
from shapely.geometry import Point, Polygon, LineString, box, shape
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "dist" / "data"
LON, LAT = 120.70525, 37.80598
MX, MY = 111320 * math.cos(math.radians(LAT)), 110993
BOUNDS = (-1500, -1180, 1500, 1480)
GLO = 'https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N37_00_E120_00_DEM/Copernicus_DSM_COG_10_N37_00_E120_00_DEM.tif'
BUILDINGS = 'https://ndownloader.figshare.com/files/54116813'

def lonlat(x,z):
    return (LON+x/MX,LAT-z/MY)

def local(g):
    return affine_transform(g,[MX,0,0,-MY,-LON*MX,LAT*MY])

def line(coords):
    return [[round(x,2),round(z,2)] for x,z in coords]

def save(name, obj):
    (DATA/name).write_text(json.dumps(obj,separators=(',',':'),ensure_ascii=False),'utf8')

west,north,east,south=BOUNDS
frame=box(west,north,east,south)
lo,la=lonlat(west,south)
hi,ha=lonlat(east,north)
areas=json.loads((DATA/'ground.geojson').read_text('utf8'))['features']
campus=unary_union([local(shape(f['geometry'])) for f in areas if 'boundary' in f['properties']['kind']])
cache=Path(tempfile.gettempdir())

def buildings():
    archive=cache/'ytkj-glob2414.zip'
    if not archive.is_file():
        r=requests.get(BUILDINGS,timeout=180);r.raise_for_status();archive.write_bytes(r.content)
    if hashlib.md5(archive.read_bytes()).hexdigest()!='f6936f92ee02e8ccbaea8c9d07357992':
        raise ValueError('unexpected 3D-GloBFP partition checksum')
    folder=cache/'ytkj-glob2414';folder.mkdir(exist_ok=True)
    with zipfile.ZipFile(archive) as z:
        for name in z.namelist():
            dest=folder/Path(name).name
            if dest.suffix in ('.shp','.dbf','.shx') and not dest.exists():dest.write_bytes(z.read(name))
    reader=shapefile.Reader(str(next(folder.glob('*.shp'))),encoding='latin1')
    image=np.asarray(Image.open(ROOT/'dist/sentinel.jpg').convert('RGB'))
    out=[]
    for row in reader.iterShapeRecords(bbox=(lo,la,hi,ha)):
        g=local(shape(row.shape.__geo_interface__))
        if not g.is_valid:g=g.buffer(0)
        centre=g.representative_point()
        if not frame.covers(g) or campus.intersects(g):continue
        for g1 in getattr(g,'geoms',[g]):
            if g1.geom_type!='Polygon' or g1.area<18:continue
            p=g1.representative_point();x,z=p.x,p.y
            rgb=image[int((z+1600)/10),int((x+1600)/10)].astype(float)
            v=list(g1.minimum_rotated_rectangle.exterior.coords)
            a,b=max(zip(v,v[1:]),key=lambda e:math.dist(*e))
            direction=math.atan2(b[1]-a[1],b[0]-a[0])
            height=float(row.record['Height'])
            if not 0<height<200:continue
            out.append({'fid':row.shape.oid,'ring':line(list(g1.exterior.coords)[:-1]),
                 'holes':[line(list(i.coords)[:-1]) for i in g1.interiors], 'height':round(height,2),
                 'center':[round(x,2),round(z,2)],'axis':round(direction,4),
                 'tint':'clay' if rgb[0]>rgb[1]*1.15 and rgb[0]>rgb[2]*1.35 else 'grey'})
    return out

def split_reviewed_buildings(meshes):
    gate_candidate={'reason':'候选屋顶与校方北门照片所示的开阔车道重叠。',
        'source':'https://eng.ytkj.edu.cn/static/images/xyfg2.png'}
    replaced=json.loads((DATA/'east-teaching-buildings.json').read_text('utf8'))['excludedRegionalRoof']
    reviews={943193:gate_candidate,943196:gate_candidate,replaced['fid']:replaced}
    kept=[]; excluded=[]
    for building in meshes:
        review=reviews.get(building['fid'])
        if review:
            excluded.append({'fid':building['fid'],'original':building,
                'reason':review['reason'],'source':review['source']})
        else:
            kept.append(building)
    return kept,excluded


def apply_village_observations(meshes):
    """Retain existing selection IDs for partial footprints of two observed roofs."""
    source = json.loads((ROOT/'tools/data/village-roof-observations.json').read_bytes())
    observed = {row['building']['fid']: row['building'] for row in source['rows']}
    result = [observed.pop(building['fid'], building) for building in meshes]
    return result + list(observed.values())


def road_tags(element):
    tags=element['tags']
    values={key:tags[key] for key in ('oneway','surface','lanes','bridge','tunnel','layer','junction') if key in tags}
    if 'width' in tags:values['widthTag']=tags['width']
    values['osmVersion']=element['version']
    return values


def roads_and_places():
    bbox=f'{lo:.7f},{la:.7f},{hi:.7f},{ha:.7f}'
    url='https://api.openstreetmap.org/api/0.6/map.json'
    path=cache/('ytkj-osm-region-'+hashlib.md5(bbox.encode()).hexdigest()+'.json')
    if not path.exists():
        r=requests.get(url,params={'bbox':bbox},headers={'User-Agent':'Penglai-campus-atlas/1.0'},timeout=90)
        r.raise_for_status();path.write_bytes(r.content)
    elements=json.loads(path.read_text('utf8'))['elements']
    nodes={e['id']:e for e in elements if e['type']=='node'}
    roads=[];places=[];water=[];land=[]
    for e in elements:
        tags=e.get('tags',{})
        if e['type']=='node' and tags.get('place') in ('village','hamlet','suburb','neighbourhood') and tags.get('name'):
            p=local(Point(e['lon'],e['lat']))
            if frame.covers(p):places.append({'name':tags['name'],'id':e['id'],'point':line([p.coords[0]])[0]})
        if e['type']!='way' or not tags:continue
        xy=[(nodes[n]['lon'],nodes[n]['lat']) for n in e['nodes'] if n in nodes]
        if len(xy)<2:continue
        highway=tags.get('highway')
        if highway:
            g=local(LineString(xy)).intersection(frame)
            for segment in getattr(g,'geoms',[g]):
                if segment.is_empty or segment.geom_type!='LineString':continue
                width={'primary':18,'secondary':15,'tertiary':10,'residential':6,'unclassified':5,'service':4.5,'track':2.8,'path':1.7,'footway':1.7,'steps':1.7}.get(highway,4.5)
                try:width=float(tags.get('width',width))
                except ValueError:pass
                roads.append({'id':e['id'],'ring':line(segment.coords),'width':width,'kind':highway,'name':tags.get('name',''),**road_tags(e)})
        natural=tags.get('natural');use=tags.get('landuse')
        if len(xy)<4 or xy[0]!=xy[-1] or not (natural in ('water','wood','scrub') or use in ('orchard','farmland','forest','reservoir')):continue
        g=local(Polygon(xy)).buffer(0).intersection(frame)
        for polygon in getattr(g,'geoms',[g]):
            if polygon.is_empty or polygon.geom_type!='Polygon':continue
            rec={'ring':line(list(polygon.exterior.coords)[:-1]),'kind':natural or use,'id':e['id']}
            (water if natural=='water' or use=='reservoir' else land).append(rec)
    return roads,places,water,land

def dem():
    # Pixel centres are exactly the same local metre coordinates as the old grid.
    n=161;step=20
    lo,la=lonlat(-1610,1610);hi,ha=lonlat(1610,-1610)
    dst=np.zeros((n,n),dtype='float32')
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',GDAL_HTTP_TIMEOUT='30'),rasterio.open(GLO) as src:
        reproject(rasterio.band(src,1),dst,dst_transform=from_bounds(lo,la,hi,ha,n,n),dst_crs='EPSG:4326',resampling=Resampling.bilinear)
    old=np.array(json.loads((ROOT/'dist/dem.json').read_text('utf8'))['values']).reshape(n,n)
    if not np.isfinite(dst).all() or not (dst.max()>80 and dst.min()<5):raise ValueError('incomplete DSM')
    xy=np.arange(-1600,1601,step)
    # Preserve checked campus grades. Transition over the first 100 m around the boundary.
    for iz,z in enumerate(xy):
        for ix,x in enumerate(xy):
            a=min(1,campus.distance(Point(x,z))/100)
            a=a*a*(3-2*a)
            dst[iz,ix]=old[iz,ix]*(1-a)+dst[iz,ix]*a
    return dict(min=-1600,step=step,n=n,values=np.round(dst.flatten().astype(float),2).tolist())

if __name__=='__main__':
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=3) as pool:
        fb,fr,fd=[pool.submit(f) for f in (buildings,roads_and_places,dem)]
        meshes=fb.result();roads,places,water,land=fr.result();height=fd.result()
    meshes,excluded=split_reviewed_buildings(meshes)
    meshes=apply_village_observations(meshes)
    save('surroundings.json',dict(bounds=BOUNDS,buildings=meshes,excludedBuildings=excluded,roads=roads,places=places,water=water,land=land,
        buildingSource='https://doi.org/10.6084/m9.figshare.28906499',buildingLicense='CC BY 4.0',
        roadSource='© OpenStreetMap contributors, ODbL 1.0',terrainSource=GLO))
    save('surrounding-dem.json',height)
    print(len(meshes),'roof polygons;',len(roads),'road lines;',places,'places;',len(water),'water areas;',len(land),'land cover areas')

