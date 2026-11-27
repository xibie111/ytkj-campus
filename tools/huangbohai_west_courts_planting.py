"""Fit the confirmed local planting around the west court loop into published land data."""
from argparse import ArgumentParser
from pathlib import Path
import json

from shapely import set_precision, union_all
from shapely.geometry import Polygon, LineString

parser=ArgumentParser(description=__doc__)
parser.add_argument('--check',action='store_true')
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
data=root/'dist/data'
land_path=data/'huangbohai-landcover.json'
land=json.loads(land_path.read_bytes())
ground=json.loads((data/'huangbohai-ground.json').read_bytes())
assert ground.get('courtWestPavingEvidence'), 'Generate the new west-court paving first.'
control=json.loads((root/'tools/data/huangbohai-west-courts-planting.json').read_bytes())
prefix='west-court-observed-vegetation-'

def polygon(row):
    return Polygon(row['ring'],row.get('holes',[])).buffer(0)

def parts(area,min_area=.01):
    if area.geom_type=='Polygon':
        return [area] if area.area>=min_area else []
    return [p for part in getattr(area,'geoms',[]) for p in parts(part,min_area)]

hard=union_all([polygon(row) for row in ground['roadSurfaces']])
ties=union_all([polygon(row) for row in ground['roadAprons'] if row['id'].startswith('hbh-court-west-paving-')])
crossing=next(row for row in ground['roads'] if row['id']=='hbh-court-crossing')
end=LineString(crossing['ring'][1:]).buffer(crossing['width']/2)
local_hard=hard.intersection(ties.union(end)).buffer(.15)
local_hard=set_precision(local_hard,.0001)

def coords(poly):
    return [[round(a,4),round(b,4)] for a,b in list(poly.coords)[:-1]]

def replace(record,shape,name):
    return dict(record,id=name,ring=coords(shape.exterior),holes=[coords(i) for i in shape.interiors])

records=[]
touched=[]
area_removed=0
for item in land['polygons']:
    if item['id'].startswith(prefix):
        continue
    before=polygon(item)
    if item['style'] not in ('campusVegetation','courtPlanting') or before.intersection(local_hard).area<=.001:
        records.append(item)
        continue
    remaining=set_precision(before,.0001).difference(local_hard)
    components=sorted(parts(remaining),key=lambda v:-v.area)
    records.extend(replace(item,p,item['id'] if i==0 else f"{item['id']}-west-split-{i}")
                   for i,p in enumerate(components))
    area_removed+=before.area-sum(p.area for p in components)
    touched.append(item['id'])
clear=union_all([polygon(p) for p in records]).union(hard.buffer(.2))
green=set_precision(union_all([Polygon(ring) for ring in control['visualGreenRingsXZ']]).difference(clear),.0001)
new_green=sorted(parts(green,2.5),key=lambda v:v.bounds)
assert all(part.intersection(hard).area<.0001 for part in new_green)
records.extend(replace({'style':'campusVegetation'},p,prefix+str(i+1)) for i,p in enumerate(new_green))
result=dict(land,polygons=records)
metrics={}
for style in land['styles']:
    group=[r for r in records if r['style']==style]
    metrics[style]=dict(patches=len(group),areaM2=round(union_all([polygon(row) for row in group]).area))
result['metrics']=metrics
encoded=json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n'
if args.check:
    expected_by_id = {row['id']: row for row in result['polygons']}
    actual_by_id = {row['id']: row for row in land['polygons']}
    assert expected_by_id == actual_by_id and result['metrics'] == land['metrics'], (
        'Local west-loop vegetation differs from the published candidate.'
    )
else:
    land_path.write_text(encoded,encoding='utf-8',newline='\n')
print(json.dumps({'oldPolygonsClipped':touched,'removedPavedOverlapM2':round(area_removed,2),
                  'restoredObservedGreenM2':round(sum(p.area for p in new_green),2),
                  'addedPatches':len(new_green)},ensure_ascii=False,indent=2))
