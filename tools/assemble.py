"""Assemble source footprints and explicitly identified campus landmarks in local metres."""
import math,json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
S=R/'dist'/'data'
def read(path):return json.loads(path.read_text('utf8'))
def meter(p):return [round((p[0]-120.70525)*111320*math.cos(math.radians(37.80598)),2),round((37.80598-p[1])*110993,2)]
def ll(lon,lat):return meter([lon,lat])
def area(ring):return sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(ring,ring[1:]+ring[:1]))/2
def centroid(ring):
    A=area(ring)
    return [round(sum((a[k]+b[k])*(a[0]*b[1]-b[0]*a[1]) for a,b in zip(ring,ring[1:]+ring[:1]))/(6*A),2) for k in range(2)]
def local(center,angle,coords):
    a=math.radians(angle);return [[round(center[0]+x*math.cos(a)-z*math.sin(a),2),round(center[1]+x*math.sin(a)+z*math.cos(a),2)] for x,z in coords]
def rectangle(center,angle,width,depth):
    x,z=width/2,depth/2
    return local(center,angle,[[-x,-z],[x,-z],[x,z],[-x,z]])

def finance_wing_roof(ring, profile):
    from shapely import constrained_delaunay_triangles
    from shapely.geometry import Point, Polygon
    from shapely.geometry.polygon import orient

    outline = Polygon(ring)
    vertices, indices, slopes, caps = [], {}, [], []
    tower = Polygon(profile['tower']['ring']) if 'tower' in profile else None

    def add_faces(surface, lower_edge, low, high, faces):
        if tower is not None:
            surface = surface.difference(tower)
        for triangle in constrained_delaunay_triangles(surface).geoms:
            face = []
            for point in list(orient(triangle, sign=-1).exterior.coords)[:-1]:
                fraction = low if lower_edge.distance(Point(point)) < 1e-6 else high
                vertex = (round(point[0], 3), round(point[1], 3), fraction)
                if vertex not in indices:
                    indices[vertex] = len(vertices)
                    vertices.append(vertex)
                face.append(indices[vertex])
            faces.append(face)

    # Follow the whole bent roof. The narrowed join splits into two independent
    # caps as the eaves recede; intermediate offsets preserve its hip and valley.
    outer = outline
    for step in range(1, 5):
        fraction = step / 4
        inner = outline.buffer(-profile['insetMetres'] * fraction, join_style='mitre')
        add_faces(outer.difference(inner), outer.boundary, (step-1)/4, fraction, slopes)
        outer = inner
    cap_fraction = 1 - profile.get('capDropMetres', 0) / profile['riseMetres']
    add_faces(outer, outer.boundary, cap_fraction, cap_fraction, caps)
    result = {**profile, 'vertices': vertices, 'slopes': slopes, 'caps': caps}
    if cap_fraction < 1:
        inset = outer.boundary.difference(tower) if tower is not None else outer.boundary
        lines = getattr(inset, 'geoms', [inset])
        result['capEdges'] = [[[round(x,3),round(z,3)] for x,z in line.coords] for line in lines]
    return result
d=dict(origin=[120.70525,37.80598],buildings=[],landmarks=[],roads=[],areas=[],courts=[])
d['dongshanNorthBankGrade']=read(R/'tools'/'data'/'penglai-dongshan-north-bank-grade.json')
d['unconfirmedWaterWays']=[w['osmWay'] for w in read(S/'water-observations.json')['ways'] if w['omitOpenWaterFill']]
ridge_peak=max(read(S/'ridge-profile.json')['stations'],key=lambda row:row['atl08'])
d['eastRidgeStation']=meter([ridge_peak['lon'],ridge_peak['lat']])
heights=read(S/'heights.json')['buildings']
matches={r['best_old_id']:r for r in read(S/'crosswalk.json')['records'] if r['iou']>=.7 and r['best_old_id']}
dining=read(S/'dining-models.json')
dining_models={model['id']:model for model in dining['buildings']}
dining_existing={model['id']:model for model in dining['existingDining']}
dorms=read(S/'dorm-buildings.json')
named_models=read(S/'named-building-models.json')
first_teaching=named_models.get('firstTeaching')
finance_south=named_models['financeSouthWing']
finance_wings={model['id']:model for model in (finance_south,named_models['financeNorthWing'])}
d['dormPlantedMedian']=dorms['plantedMedian']
d['dormRoofClearance']=dorms['dormRoofClearance']
dorm_refinements={model['id']:model for model in dorms['footprintRefinements']}
for f in read(S/'ground.geojson')['features']:
    p=f['properties']; geo=f['geometry']; kind=p['kind']
    ring=[meter(x) for x in (geo['coordinates'] if geo['type']=='LineString' else geo['coordinates'][0])]
    if kind=='road': d['roads'].append(dict(ring=ring,width={'secondary':18,'residential':6,'service':5}.get(p.get('highway'),4)))
    elif kind=='pitch':
        cx,cz=centroid(ring[:-1]);sides=[(math.dist(a,b),math.atan2(b[1]-a[1],b[0]-a[0])) for a,b in zip(ring,ring[1:])]
        d['pitch']=dict(x=cx,z=cz,width=min(sides)[0],length=max(sides)[0],angle=max(sides)[1])
    elif kind=='water': d['areas'].append(dict(kind=kind,ring=ring,id=p['id']))
    else: d['areas'].append(dict(kind=kind,ring=ring))
known={'B023':('第一教学楼','teaching'),'B037':('体育馆','sports'),'B007':('学术报告厅','hall')}
tennis_apron=read(R/'tools'/'data'/'penglai-tennis-apron.json')
excluded={'B001','B002','B003','B004','B012','B025','B057','B067','B071'}
excluded.update(row['id'] for row in dorms.get('excludedFootprints',[]))
excluded.update(row['id'] for row in named_models.get('excludedFootprints',[]))
if first_teaching:
    excluded.update(first_teaching['replaces'])
for model in dining_models.values():
    excluded.update(model['suppressStandaloneIds'])
for refinement in dorm_refinements.values():
    excluded.update(refinement.get('replaces',[]))
for f in read(S/'buildings.geojson')['features']:
    p=f['properties'];id=p['label_id'];rings=[[meter(x) for x in v[:-1]] for v in f['geometry']['coordinates']]
    ring=rings[0];center=centroid(ring)
    if id=='B057':d['courts'].append(dict(id=id,center=center,ring=ring))
    if id=='B071':d['courts'].append(tennis_apron)
    if id in excluded:continue
    ar=abs(area(ring));height=heights[id]['height_m'];count=heights[id]['valid_cells']
    name,kind=known.get(id,('博文苑建筑' if p['zone']=='bowen' else '校园建筑','dorm' if p['zone']=='bowen' and ar>120 else 'unknown'))
    if id not in known:name+=' · '+id
    heightSource='CNBH 2020 遥感估高' if height else '类型近似，待测量'
    if not height:height=5.0 if ar<150 else 11.0 if ar<450 else 16.0
    meta=(f'模型楼高约 {height:.0f} m · '+heightSource+(f' · {count} 个有效像元' if count else ''))
    item=dict(id=id,name=name,kind=kind,ring=ring,holes=rings[1:],center=center,height=round(height,2),meta=meta,originalId=p['id'],heightSource=heightSource)
    if first_teaching and id==first_teaching['id']:
        outline=first_teaching['ring']
        item.update(ring=outline,center=centroid(outline),groundAnchor=first_teaching['groundAnchor'],
            roofColor=first_teaching['roofColor'],rooflights=first_teaching['rooflights'],sourceFragments=[id,*first_teaching['replaces']],
            firstTeaching={key:first_teaching[key] for key in ('frontEndPanels','roofGrille','sources','dates')},
            geometryBasis=first_teaching['geometryBasis'],note=first_teaching['note'])
    match=matches.get(id)
    if match:
        alt=match['globfp_height_estimate_m']
        item['heightChecks']={'cnbh':heights[id],'globfp2020':alt,'globfpId':match['id'],'footprintIoU':match['iou']}
        if not count:
            item.update(height=alt,heightSource='3D-GloBFP 2020 多源模型估高',meta=f'模型楼高约 {alt:.0f} m · 3D-GloBFP 遥感估高')
        elif abs(alt-height)>=5:
            item['meta']+=f'。另一公开模型估计约 {alt:.0f} m'
    model=dining_models.get(id)
    if model:
        for key in ('name','kind','ring','holes','center','floors','height','heightSource',
                    'sourceFragments','entranceNormal','diningEntrance','geometryMethod','entranceBasis'):
            item[key]=model[key]
        if 'diningApronCenter' in model:
            item['diningApronCenter']=model['diningApronCenter']
        item['heightChecks']['sourceParts']=[
            {'id':part['id'],'cnbh':part['cnbh2020'],'globfp2020':part['globfp2020'],'globfpId':part['globfpId']}
            for part in model['sourceParts']
        ]
        item['floorSources']=[model['identitySource']]
        item['diningSource']=model['identitySource']
        item['meta']=f"三层 · 遥感估高约 {model['height']:.0f} m"
    if roof_refinement := dorms.get('roofRefinements',{}).get(id):
        item.update(roof_refinement)
    if facade_refinement := dorms.get('facadeRefinements',{}).get(id):
        item.update(facade_refinement)
    refinement=dorm_refinements.get(id)
    if refinement:
        adjusted_ring=refinement['ring']
        item.update(name=refinement['name'],kind='dorm',ring=adjusted_ring,center=centroid(adjusted_ring),
            note=refinement['note'],geometryBasis=refinement['geometryBasis'],
            roofSource=dorms['roofData']['url'])
        if refinement.get('retainOriginalGroundAnchor'):
            item['groundAnchor']=center
        if refinement.get('replaces'):
            item['sourceFragments']=[id,*refinement['replaces']]
            item['heightChecks']['reconstruction']=refinement['heightBasis']
            item.update(height=refinement['height'],heightSource=refinement.get('heightSource','参照东翼模型屋顶标高'),
                meta=f"展示高度约 {refinement['height']:.1f} m · 檐高与层数待测")
            if refinement.get('floors'):
                item['floors']=refinement['floors']
        for field in ('modelBaseMetres','meta','viewDirection','viewWidth','labelSpan','endFacade','dormSideFacade'):
            if field in refinement:
                item[field]=refinement[field]
        if slope_dorm := refinement.get('slopeDorm'):
            item.update(slopeDorm=slope_dorm,height=round(max(w['eave']+w['rise'] for w in slope_dorm['wings']),2),
                floors=5,heightSource=refinement['heightSource'],floorSources=slope_dorm['sources'])
        if roof_profile := refinement.get('dorm8Roof'):
            height=roof_profile['eaveAboveBaseMetres']+roof_profile['riseMetres']+roof_profile['eastStepMetres']
            item.update(dorm8Roof=roof_profile,height=round(height,2),floors=refinement['floors'],
                heightSource=refinement['heightSource'],floorSources=roof_profile['sources'])
        if 'heightReferences' in refinement:
            item['heightChecks']['references']=refinement['heightReferences']
    wing=finance_wings.get(id)
    if wing:
        original_checks=item.get('heightChecks',{})
        item.update(wing)
        item['center']=centroid(item['ring'])
        item['heightChecks']={**wing['heightChecks'],'originalFragment':original_checks}
        item['financeWingRoof']=finance_wing_roof(item['ring'],wing['financeWingRoof'])
    d['buildings'].append(item)
for f in read(S/'footprint-additions.geojson')['features']:
    p=f['properties'];id=p['id'];rings=[[meter(x) for x in v[:-1]] for v in f['geometry']['coordinates']]
    ring=rings[0];height=p['globfp_height_estimate_m']
    teaching_names={'G043':'第二教学楼','G018':'6号教学楼'}
    kind='teaching' if id in teaching_names else 'dorm'
    name=teaching_names.get(id,'博文苑建筑 · '+id)
    d['buildings'].append(dict(id=id,name=name,kind=kind,ring=ring,holes=rings[1:],center=centroid(ring),height=height,heightSource='3D-GloBFP 2020',meta=f'模型楼高约 {height:.0f} m · 3D-GloBFP 遥感估高',originalId=p['upstream_record']))
def manual(id,name,kind,lon,lat,coords,angle,height,note):
    center=ll(lon,lat);ring=local(center,angle,coords)
    d['buildings'].append(dict(id=id,name=name,kind=kind,ring=ring,center=center,height=height,meta=f'模型楼高约 {height} m · 体量近似',note=note,heightSource='类型和照片近似'))
manual('library','图文楼','library',120.70339,37.80836,[[-49,-10],[-35,-14],[-20,-17],[20,-17],[35,-14],[49,-10],[49,13],[41,17],[-40,17],[-49,12]],-16,23,'位于观海广场南侧。校方照片显示北立面有密排竖肋和中央门廊；楼体范围依据公开资料近似重建。')
manual('west-arc','专家公寓（厚德餐厅）','westArcade',120.70214,37.80906,[[-40,-9],[-26,-15],[-10,-18],[7,-18],[24,-15],[40,-8],[45,-2],[42,12],[23,9],[5,7],[-13,8],[-35,15],[-43,12]],45,17,'依据北门实景和公开影像补建弧形主体。西侧立面的竖向窗带、红色窗间构件和浅灰色底层可从校门照片辨认。')
manual('east-north','学府路商业街北段','eastCommercial',120.70382,37.81004,[[-16,-54],[13,-54],[17,-48],[17,51],[10,55],[-17,55],[-17,-47]],-16,15,'校方导览标注此片为商业街。北段采用沿街长条体量，轮廓范围和楼层均为近似。')
arts=read(S/'arts-building.json')
arts_roof=arts['roofGeometry']
arts_elevation=arts['elevation']
arts_height=round(arts_elevation['mainRoofMetres']+arts_elevation['modelParapetMetres']-arts_elevation['baseReferenceMetres'],2)
arts_corner=arts['westCorner']['arcXZ']
arts_ring=[arts['ring'][0],*arts_corner,*arts['ring'][1:]]
d['buildings'].append(dict(id='east-south',name=arts['name'],kind='teaching',ring=arts_ring,
    center=centroid(arts['ring']),height=arts_height,modelBaseMetres=arts_elevation['baseReferenceMetres'],
    artsCornerSegments=len(arts_corner)-1,
    floors=arts['displayFloors'],floorSources=[arts['floorSource']],sourceFragments=arts['sourceFragments'],
    roofSource=arts_roof['url'],roofColor=arts_roof['finish'],geometryBasis=arts_roof['basis'],heightChecks=arts_elevation,
    heightSource='ICESat-2 屋面回波与相邻道路高程',
    meta=f"四层展示 · 主屋面标高约 {arts_elevation['mainRoofMetres']:.2f} m（EGM2008）"))
for model in dorms['buildings']:
    ring=rectangle(model['center'],model['angle'],model['width'],model['depth'])
    d['buildings'].append(dict(id=model['id'],name=model['name'],kind='dorm',
        ring=ring,center=model['center'],height=model['height'],heightSource=model['heightSource'],
        note=model['note'],meta=f"屋顶轮廓近似 · 楼高约 {model['height']:g} m · {model['heightSource']}",
        geometryBasis=model['geometryBasis'],roofSource=dorms['roofData']['url']))
east_teaching=read(S/'east-teaching-buildings.json')
for model in east_teaching['buildings']:
    center,angle=model['center'],model['angle']
    ring=rectangle(center,angle,model['width'],model['depth'])
    structure=model['roofStructure']
    roof_structure_ring=rectangle(local(center,angle,[structure['offset']])[0],angle,structure['width'],structure['depth'])
    roof_details=[
        {'ring':rectangle(local(center,angle,[part['offset']])[0],angle,part['width'],part['depth']),
         'height':part['height'],'color':part.get('color')}
        for part in model.get('roofDetails',[])
    ]
    height_source='窗带与影像阴影估高'
    height_evidence={'displayStoreys':model['floors'],'source':'高德和 Google 的影像外观与 Sentinel-2 阴影'}
    if model.get('minimumConfirmedFloors'):
        height_evidence['minimumConfirmedFloors']=model['minimumConfirmedFloors']
    item=dict(id=model['id'],name=model['name'],kind=model['kind'],
        ring=ring,center=center,height=model['height'],floors=model['floors'],heightSource=height_source,
        note=model['note'],meta=f"展示高度约 {model['height']} m · 楼层与檐高待测",
        geometryBasis=model['geometryBasis'],roofSource=east_teaching['roofData']['url'],
        roofStructure={'ring':roof_structure_ring,'height':structure['height']},
        roofDetails=roof_details,roofDetailSources=east_teaching.get('roofDetailSources',[]),
        darkSlopedCoping=east_teaching.get('darkSlopedCoping'),
        heightChecks=height_evidence,floorSources=[model['identitySource']])
    for field in ('facadeFinish','viewDirection','viewWidth','labelSpan'):
        if field in model:
            item[field]=model[field]
    d['buildings'].append(item)
for model in named_models['buildings']:
    d['buildings'].append({**model,'center':centroid(model['ring'])})
d['buildings'].append(read(S/'finance-bridge.json'))
d['teaching10Grade']=named_models.get('teaching10Grade')
d['financeCourt']=named_models.get('financeCourt')
for item in d['buildings']:
    if item['id']=='library': item['floors']=6
    if item['id']=='B037':
        gym_roof=read(S/'penglai-gym-roof-ridge.json')
        item.update(roofRidgeFinish=gym_roof['ridgeFinish'],roofDetailSources=gym_roof['sources'])
    if item['id']=='B007':
        item['academicHallRooflights']=read(S/'academic-hall-rooflights.json')
        envelope=read(S/'academic-hall-envelope.json')
        outline=envelope['ring']
        item.update(ring=outline,center=centroid(outline),groundAnchor=item['center'],
                    roofColor=envelope['roofColor'],academicHallEnvelope=envelope)
    if item['id']=='east-north':
        item['sourceFragments']=['B001']
        item['roofSource']='https://livingatlas.arcgis.com/wayback/#active=3692&mapCenter=120.70382%2C37.81004%2C18'
        item['geometryBasis']='校方导览核对商业街位置。高德及 2024-03-09、2025-06-02 两期高清影像可辨中轴长采光带和北端斜向采光带，形态和尺寸为模型近似。'
        item['rooflights']=[
            {'axis':local(item['center'],-16,[[3,-17.5],[4.8,52.5]]),'width':4.2,'rise':.65,'frameSpacing':6},
            {'axis':local(item['center'],-16,[[-14,-33],[9,-41.5]]),'width':2.3,'rise':.45},
        ]
        roof_panels=read(S/'north-commercial-roof-panels.json')
        item['roofDetails']=[{'ring':ring,'height':.14,'color':'#a79e87'} for ring in roof_panels['roofRibsXZ']]
    if item['id']=='west-arc':
        item['sourceFragments']=['B002']
        item.update(named_models['houdeRoof'])
    if item['id']=='library':item['sourceFragments']=['B012']
    dining_site=dining_existing.get(item['id'])
    if dining_site:
        for key in ('diningName','diningFloor','diningEntrance','entranceNormal','entranceBasis'):
            item[key]=dining_site[key]
        item['diningSource']=dining_site['source']
# Re-sample the corrected footprints instead of inheriting values from tiny roof fragments.
import numpy as np
import rasterio
from rasterio.features import geometry_mask
from rasterio.warp import transform_geom
with rasterio.open(S/'CNBH2020-campus.tif') as src:
    values=src.read(1)
    for item in d['buildings']:
        if item.get('heightChecks'): continue
        ring=[[120.70525+x/(111320*math.cos(math.radians(37.80598))),37.80598-z/110993] for x,z in item['ring']]
        g=transform_geom('EPSG:4326',src.crs,dict(type='Polygon',coordinates=[ring+[ring[0]]]))
        cells=values[geometry_mask([g],out_shape=values.shape,transform=src.transform,invert=True)]
        good=cells[(cells>0)&np.isfinite(cells)]
        if len(good):
            med=round(float(np.median(good)),1)
            item['heightChecks']={'cnbh':{'height_m':med,'valid_cells':len(good),'footprint_cells':len(cells)}}
            if item['id']=='east-north' and len(good)>=3:
                item.update(height=med,heightSource='校正轮廓 CNBH 中位数',meta=f'模型楼高约 {med:.0f} m · CNBH 估高，{len(good)} 个有效像元')
            elif abs(item['height']-med)>=4:
                item['meta']+=f'。CNBH 对该范围估计约 {med:.0f} m'
# Retain the existing height sample when refining this short facade edge.
commercial=next(item for item in d['buildings'] if item['id']=='east-north')
plaza_arc=read(S/'north-commercial-plaza-arc.json')
commercial['ring'][6:6]=plaza_arc['arcXZ']
commercial['commercialPlazaArcEdges']=[6,6+len(plaza_arc['arcXZ'])-1]
commercial['roofFinishes']=[{'ring':plaza_arc['insetRoofFinishXZ'],'color':'#b5ae9b'}]
floor_evidence=read(S/'floor-evidence.json')
records={row['id']:row for row in floor_evidence['buildings']}
for item in d['buildings']:
    if item['id']=='B082':
        stand=read(S/'athletics-fit.json')['grandstand']
        item['name']='田径场主席台'
        item.update({k:v for k,v in stand.items() if k!='imageCheck'})
        item.setdefault('heightChecks',{})['membranePeaks']=stand['imageCheck']
    evidence=records.get(item['id'])
    if not evidence: continue
    item['floors']=evidence['recommended_display_floors']
    item['height']=evidence['recommended_display_height_m']
    item['floorSources']=[floor_evidence['sources'][key]['url'] for key in evidence['sources']]
    if item['id']=='west-arc':
        item['heightSource']='校方立面照片与假定层高'
        reason='一层石材基座、五排玻璃窗带'
    elif item['id']=='G018':
        item['heightSource']='CNBH 2020 估高与校方房号'
        reason='校方活动记录确认至少四层'
    else:
        item['heightSource']='校方房号推定层数与假定层高'
        reason='按校方 6 字头房号推定六层'
    item['meta']=f"{reason} · 展示高度约 {item['height']:g} m，檐高待测"
    if item['id']=='B023':
        item['meta']+='。遥感估值约 15 m 和 30 m'
    if item['id']=='G043':
        item['heightChecks']['globfp2020']=11.44
        item['meta']+='。遥感估值约 11–13 m'
        roof_survey=read(S/'second-teaching-roof.json')
        item.update({key:roof_survey[key] for key in ('roofColor','roofFinishes','roofDetailSources')})
gate=ll(120.70280,37.80996); end=ll(120.70339,37.80836)
axis=math.atan2(-(end[0]-gate[0]),end[1]-gate[1])
d['gate']=dict(x=gate[0],z=gate[1],angle=axis)
L=math.dist(gate,end)-31;d['plaza']=dict(x=gate[0]-math.sin(axis)*(L/2+7),z=gate[1]+math.cos(axis)*(L/2+7),width=61,length=L,angle=axis)
def spot(id,name,en,icon,x,z,note,bid=None,span=300,tag=10,meta='位置与形态约取'):
    d['landmarks'].append(dict(id=id,name=name,en=en,icon=icon,x=x,z=z,note=note,buildingId=bid,span=span,tagHeight=tag,meta=meta))
spot('gate','北门与观海广场','NORTH GATE','gate',*gate,'从仙境西路进入蓬莱校区。白色校名墙后方是观海广场，中央步道沿缓坡通向图文楼。',span=260)
for id,en,ic,note in [('library','LIBRARY','library',''),('B023','TEACHING BUILDING I','teaching','门框与玻璃雨篷参照校方照片复原，入口位置为估算。公开轮廓只覆盖部分楼体。'),('G043','TEACHING BUILDING II','teaching','位于第一教学楼和体育馆之间，采用 3D-GloBFP 的屋顶轮廓。'),('B037','GYMNASIUM','hall','蓝色屋顶的体育馆位于第二教学楼南侧，模型使用公开屋顶轮廓。')]:
    a=next(a for a in d['buildings'] if a['id']==id)
    if first_teaching and id==first_teaching['id']:
        note=first_teaching['note']
    spot(id,a['name'],en,ic,*a['center'],note or a['note'],id,240,a['height']+3,a['meta'])
pitch=d['pitch'];spot('field','田径场','ATHLETICS FIELD','sports',pitch['x'],pitch['z'],'足球场沿用公开轮廓，红色铺装外缘按三期卫星影像拟合。南侧为五峰膜顶主席台。',span=300,meta='场坪约 54.4 m · GLO-30 遥感高程，分道线按运动场规则近似')
d['landmarks'].append(dict(
    id='east-pocket-square',name='东山口袋广场',aliases='口袋广场 东山校区口袋广场',icon='plaza',
    x=179,z=-157,group='campus',span=134,tagHeight=3,roofLabel=True,
    note='位于东山教学组团西南侧，靠教学楼一端有台阶。',
    source='https://www.ytkj.edu.cn/info/1083/7991.htm',sourceLabel='校方广场活动报道'))
for location in [
    dict(id='campus-clinic',name='蓬莱校区医务室',aliases='医务室 校医务室 校医室',x=-79,z=-386,
        note='到访区位于三教艺术楼北侧。',source='https://zwc.ytkj.edu.cn/info/1090/1613.htm',
        sourceLabel='校方医务室信息'),
    dict(id='campus-innovation-park',name='大学生科技创新创业园',aliases='创新创业园 大学生创业园 创业园',x=-109,z=-402,
        note='到访区位于商业街北段的南端。',source='https://chinajob.mohrss.gov.cn/c/2023-05-06/376751.shtml',
        sourceLabel='人社部门现场报道'),
]:
    d['landmarks'].append(dict(**location,icon='pin',group='campus',span=130,tagHeight=3,
        roofLabel=True,locationOnly=True,meta='到访区域，具体入口待核实'))
buildings_by_id={item['id']:item for item in d['buildings']}
finance_label=finance_south['labelPoint']
d['landmarks'].append(dict(id='east-finance-college',buildingId=finance_south['id'],name=finance_south['name'],
    x=finance_label[0],z=finance_label[1],group='campus',icon='teaching',span=107,eye=11,
    viewCenter=[256,-202],viewDirection=[-.9,.90,.34],viewWidth=136,
    tagHeight=28,roofLabel=True,note=finance_south['note'],
    meta='南翼屋脊约 72 米，北翼西塔塔冠约 81 米（EGM2008） · 航拍推估',
    source=finance_south['identitySource'],sourceLabel='校方四教活动记录'))
for location in read(S/'parcel-services.json')['locations']:
    service={
        'id':location['id'], 'name':location['name'], 'aliases':location['aliases'],
        'x':location['x'], 'z':location['z'], 'icon':'cube', 'group':'campus',
        'span':location['span'], 'eye':6, 'tagHeight':3, 'roofLabel':True, 'locationOnly':True,
        'source':location['source'], 'sourceLabel':location['sourceLabel'],
        'note':location['near'], 'meta':'到访区域，具体入口待核实',
    }
    if location.get('plan'):
        service.update(plan=location['plan'],
                       note='仙境食府南侧主路旁，两排坡屋顶夹着取件院坪。',
                       meta='平面可见屋顶与院坪 · 入口和地坪标高待核')
    if location.get('model'):
        from shapely.geometry import Polygon
        from shapely.ops import unary_union

        plan=location['plan']
        access=Polygon(plan['accessRoad'])
        yard=Polygon(plan['yard'])
        existing=[Polygon(road['ring'],road.get('holes',[])).buffer(0) for road in read(S/'roads.json')['polygons']
                  if road['style'] in {'service','brickWalk','edge'}]
        space=access.difference(unary_union([yard,*[road for road in existing if road.intersects(access)]]))
        assert space.geom_type=='Polygon' and space.is_valid
        drive=[list(p) for p in space.exterior.coords[:-1]]
        model={**location['model'],'facadeSource':location['sourcePhoto'],'paving':[
            {'style':'service','ring':drive},{'style':'parcelYard','ring':plan['yard']}
        ]}
        service.update(model=model, locationOnly=False, tagHeight=4.4,
                       viewCenter=model['viewCenter'], viewDirection=model['viewDirection'],
                       viewWidth=model['viewWidth'], eye=model['eye'],
                       note='从仙境食府南侧主路进入，两排单层门面之间是取件院坪。',
                       meta='建筑高度、院坪标高为估算')
    d['landmarks'].append(service)
for location in dining['landmarks']:
    item=buildings_by_id[location['buildingId']]
    x,z=item['diningEntrance']
    d['landmarks'].append({**location,'icon':'dining','group':'dining','x':x,'z':z,
                           'entranceNormal':item['entranceNormal'],'source':item['diningSource']})
x,z=tennis_apron['center']
d['landmarks'].append(dict(id='tennis-courts',name='网球场',icon='pin',group='campus',
    x=x,z=z,span=75,viewWidth=112,viewDirection=[.34,1.65,.94],tagHeight=.5,
    note='北侧有六片网球场，南侧红色铺面的用途待核实。'))
# Place the label in the unpainted apron so it does not cover court lines.
d['landmarks'].append(dict(id='basketball-courts',name='篮球场',aliases='露天篮球场 球场划线',
    icon='sports',group='campus',x=-151.4,z=366.84,span=108,viewWidth=138,viewDirection=[.15,.98,.30],
    viewCenter=[-139,342],eye=.5,tagHeight=.8,
    note='北侧六片并排，南侧两片转向。',meta='靠坡边缘高程待核',
    source='https://livingatlas.arcgis.com/wayback/#active=3692&mapCenter=120.70362%2C37.80288%2C18',
    sourceLabel='2025 年卫星影像'))
points=[p for a in d['areas'] if 'boundary' in a['kind'] for p in a['ring']];d['bounds']=[math.floor(min(p[k] for p in points)/10)*10-42 for k in (0,1)]+[math.ceil(max(p[k] for p in points)/10)*10+42 for k in (0,1)]
d['attribution']='© OpenStreetMap contributors, Overture Maps Foundation, East Asian Buildings (CC BY 4.0), Wu et al. CNBH-10m 2020 (CC BY 4.0), Che et al. 3D-GloBFP 2020 (CC BY 4.0), Mapzen Terrain Tiles; produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved. The organisations in charge of the Copernicus programme by law or by delegation do not incur any liability for any use of the Copernicus WorldDEM-30. ESA WorldCover 2021, Copernicus Sentinel-2 2026.'
d['sources']=(R/'tools'/'credits.html').read_text('utf8').replace('{buildingCount}',str(len(d['buildings'])))
d['attribution'] += ' CBRA 2021, Liu, Tang, Feng and Lyu (CC BY 4.0), doi:10.5281/zenodo.7861676.'
d['attribution'] += ' '+east_teaching['roofData']['attribution']+'.'
d['attribution'] += ' Land-cover boundaries adapted from SinoLC-1, Zhuohong Li et al. (CC BY 4.0), doi:10.5281/zenodo.7709370. Contains modified Copernicus Sentinel data 2025–2026.'
(R/'dist'/'campus.json').write_text(json.dumps(d,ensure_ascii=False,separators=(',',':')),'utf8')
print(len(d['buildings']),len(d['roads']),len(d['landmarks']),d['bounds'])

