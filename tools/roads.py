"""Build the Penglai road surfaces in local metres from the bundled OSM extracts.

Requires Shapely 2. Campus features interpreted from university imagery are
kept distinct from OSM geometry. No network access is needed.
"""
from collections import defaultdict
import json
import math
from pathlib import Path

from shapely import STRtree, set_precision, union_all
from shapely.affinity import affine_transform, rotate, translate
from shapely.geometry import GeometryCollection, LineString, Point, Polygon, box, shape
from shapely.ops import substring
from penglai_xianjing_frontage import xianjing_frontage

DIST = Path(__file__).resolve().parents[1] / 'dist'
DATA = DIST / 'data'
GRID = .01  # clipping precision in metres
TILE = 120
GATE_PHOTO = 'https://eng.ytkj.edu.cn/static/images/xyfg2.png'
STYLES = {
    'primary': 'arterial', 'secondary': 'arterial', 'tertiary': 'collector',
    'residential': 'local', 'unclassified': 'local', 'living_street': 'local',
    'service': 'service', 'pedestrian': 'walk', 'footway': 'walk',
    'path': 'walk', 'steps': 'walk', 'cycleway': 'walk', 'track': 'service',
}
# Distance from the modelled pavement edge to the outer edge of its seam.
EDGE_WIDTH = {'arterial': .50, 'collector': .40, 'local': .32,
              'service': .25, 'walk': .18, 'brickWalk': .18, 'forecourt': .25}


def read(path):
    return json.loads(path.read_text('utf8'))


def coords(points):
    return [[round(x, 2), round(z, 2)] for x, z in points]


def parts(geometry, kind):
    if geometry.is_empty:
        return
    if geometry.geom_type == kind:
        yield geometry
    elif hasattr(geometry, 'geoms'):
        for child in geometry.geoms:
            yield from parts(child, kind)


def round_geom(geom):
    return set_precision(geom, GRID)


def combine(geometries):
    return union_all(geometries, grid_size=GRID)


def street_segments(region, campus, bounds):
    groups = defaultdict(list)
    segments, skipped, exact = [], 0, set()
    for record in region['roads']:
        line = round_geom(LineString(record['ring']))
        key = (record['id'], line.normalize().wkb)
        if key in exact:
            skipped += 1
            continue
        exact.add(key)
        road = {**record, 'source': 'osm', 'widthSource': 'classEstimate'}
        if 'widthTag' in road:
            try:
                width = float(road['widthTag'])
            except (ValueError, TypeError):
                width = 0
            if width > 0:
                road.update(width=width, widthSource='osmWidth')
        if road['widthSource'] != 'osmWidth':
            if road.get('oneway') in ('yes', '1', 'true', '-1') and road['kind'] in ('secondary', 'tertiary'):
                road.update(width=7.2 if road['kind'] == 'secondary' else 6., widthSource='singleCarriagewayEstimate')
            elif road['kind'] == 'pedestrian':
                road['width'] = 2.8
        segments.append(road)
        groups[road['id']].append(line)

    # The historical campus extract was clipped independently. Compare its
    # actual linework; two disjoint portions of one way must both survive.
    lat = campus['origin'][1]
    mx, mz = 111320 * math.cos(math.radians(lat)), 110993
    project = [mx, 0, 0, -mz, -campus['origin'][0] * mx, lat * mz]
    campus_roads = [f for f in read(DATA/'ground.geojson')['features'] if f['properties']['kind'] == 'road']
    covered_campus = 0
    for f in campus_roads:
        tags = f['properties']
        line = affine_transform(shape(f['geometry']), project).intersection(bounds)
        if line.is_empty:
            continue
        covered = combine(groups[tags['id']]).buffer(.15) if groups[tags['id']] else GeometryCollection()
        remainder = line.difference(covered)
        leftovers = [v for v in parts(remainder, 'LineString') if v.length > .5]
        if not leftovers:
            covered_campus += 1
            continue
        for v in leftovers:
            kind = tags['highway']
            seg = {'id':tags['id'], 'ring':coords(v.coords), 'kind':kind,
                   'width':{'secondary':15, 'residential':6, 'service':4.5}.get(kind, 4),
                   'widthSource':'classEstimate', 'source':'osm'}
            seg.update({k:tags[k] for k in ('name','surface','oneway') if k in tags})
            segments.append(seg)
            groups[seg['id']].append(v)
    return segments, {'regionExactDuplicates': skipped, 'campusSourceParts': len(campus_roads),
                      'campusDuplicateParts': covered_campus}


def pavement_axes(segments):
    # Preserve every source coordinate in segments. Use short tangent arcs
    # only for the display outlines of local streets, away from intersections.
    source = [LineString(s['ring']) for s in segments]
    tree = STRtree(source)
    result, changed, max_offset = [], 0, 0.
    for i,(road,line) in enumerate(zip(segments,source)):
        if road.get('source') != 'osm' or road['kind'] not in ('service','residential','unclassified') or not line.is_simple:
            result.append(line)
            continue
        nearby = [source[j] for j in tree.query(line.buffer(4.4)) if j != i]
        points = list(line.coords)
        path = [points[0]]
        for a,b,c in zip(points,points[1:],points[2:]):
            ab,bc = math.dist(a,b),math.dist(b,c)
            if min(ab,bc) < .8:
                path.append(b)
                continue
            dx,dz = (b[0]-a[0])/ab,(b[1]-a[1])/ab
            ex,ez = (c[0]-b[0])/bc,(c[1]-b[1])/bc
            turn = math.acos(max(-1., min(1.,dx*ex+dz*ez)))
            if not math.radians(12) < turn < math.radians(125):
                path.append(b)
                continue
            # The symmetric quadratic's mid-point lies at most 0.55 m
            # from the original corner. Consecutive arcs cannot overlap.
            trim = min(4., .4*ab, .4*bc, 1.10/math.sin(turn/2))
            if any(other.distance(Point(b)) <= trim+.15 for other in nearby):
                path.append(b)
                continue
            for t in (0,.25,.5,.75,1):
                v,w = (1-t)**2*trim, t*t*trim
                path.append((b[0]-v*dx+w*ex,b[1]-v*dz+w*ez))
            changed += 1
        path.append(points[-1])
        axis = round_geom(LineString(path))
        deviation = axis.hausdorff_distance(line)
        assert deviation <= .6
        max_offset = max(max_offset,deviation)
        result.append(axis)
    return result,{'roundedCorners':changed,'maxCornerOffsetMetres':round(max_offset,3)}


def gate_ground(campus, approach_arrows=()):
    g = campus['gate']
    co, si = math.cos(g['angle']), math.sin(g['angle'])
    matrix = [co, -si, si, co, g['x'], g['z']]
    def world(geometry):
        return round_geom(affine_transform(geometry, matrix))
    # Identical control points to drawEntranceGround in entrance.js, in the
    # gate frame. The cross streets at either end of the lawn remain open.
    apron = world(Polygon([(-48.5,-41.5),(59.2,-85.1),(60.6,-45.9),(24.7,-8.8),
                (35.8,-3),(35.8,1.4),(16.5,16.8),(-16.4,16.8),(-35.8,1.4),(-35.8,-3),(-23,-7)]))
    garden = world(box(-37,25.2,63.8,134.3))
    paint = defaultdict(list)
    for side in (-1, 1):
        # Four boundaries delimit three photographed lanes. The outer two are
        # single lines, the two inner seams double. Locations are approximate.
        for index, u in enumerate((10.4,14.2,18.1,22.2)):
            offsets = (-.15,.15) if index in (1,2) else (0,)
            for offset in offsets:
                v0, v1 = -.9, -30.0
                near = u + offset
                far = near + (u - 9.5) * .38
                line = LineString([(side*near,v0), (side*far,v1)])
                paint['markingYellow'].append(world(line.buffer(.085, cap_style='flat')))
        left, right = sorted((10.4*side,22.2*side))
        paint['marking'].append(world(box(left,.80,right,1.12)))
        # In the north-facing-gate photo the east group's outer lane and west
        # group's inner lane point away from the campus; the others face in.
        for lane, u in enumerate((12.3,16.15,20.15)):
            sign = -1 if (side > 0 and lane == 2) or (side < 0 and lane == 0) else 1
            centre = side*(u+(u-9.5)*.275)
            arrow = Polygon([(-.19,-1.9),(.19,-1.9),(.19,.37),(.63,.30),(0,1.9),(-.63,.30),(-.19,.37)])
            # Follow the lane's fan angle.
            angle = math.atan(-side*(u-9.5)*.38/29.1)
            arrow = rotate(arrow, -angle if sign > 0 else math.pi-angle, origin=(0,0), use_radians=True)
            paint['marking'].append(world(translate(arrow,centre,-23)))
    paint['marking'].extend(world(Polygon(arrow['ringGateUV'])) for arrow in approach_arrows)
    return apron, garden, paint


def stadium(campus):
    pitch = campus['pitch']
    # Same rounded, satellite-fitted apron boundary used by sports.js.
    track = LineString([(-37.5,0),(37.5,0)]).buffer(52.5,quad_segs=24)
    track = rotate(track,-.045,origin=(0,0),use_radians=True)
    track = translate(track,0,-3)
    track = rotate(track,pitch['angle'],origin=(0,0),use_radians=True)
    return round_geom(translate(track,pitch['x'],pitch['z']))


def tiled_surfaces(layers, mask, frame):
    # Subtract each class inside a single tile from the very same remaining
    # face. Clipping the two sides of a kerb independently introduces hairline
    # overlaps, especially where a long, diagonal kerb crosses the tile grid.
    def ring(points):
        return [[round(x,5),round(z,5)] for x,z in points[:-1]]
    layers = [(name,set_precision(geom,0)) for name,geom in layers]
    mask = set_precision(mask,0)
    x0,z0,x1,z1 = frame.bounds
    for z in range(math.floor(z0/TILE)*TILE, math.ceil(z1/TILE)*TILE, TILE):
        for x in range(math.floor(x0/TILE)*TILE, math.ceil(x1/TILE)*TILE, TILE):
            cell = box(x,z,x+TILE,z+TILE).intersection(frame)
            if not any(geom.intersects(cell) for _,geom in layers):
                continue
            remaining = cell.difference(mask)
            for style,geom in layers:
                if not geom.intersects(remaining):
                    continue
                for piece in parts(remaining.intersection(geom), 'Polygon'):
                    if piece.area < .002:
                        continue
                    poly = {'style':style, 'ring':ring(piece.exterior.coords)}
                    if piece.interiors:
                        poly['holes'] = [ring(v.coords) for v in piece.interiors]
                    yield poly
                remaining = remaining.difference(geom)


def named_roads(segments, details):
    names = {}
    for road in segments:
        name = road.get('name')
        if name and road.get('source') == 'osm':
            entry = names.setdefault(name, {'name':name, 'source':'osm', 'segments':[]})
            entry['segments'].append({'wayId':road['id'], 'ring':road['ring']})
        elif name and (road.get('source') == 'dormAccessApproximation' or road.get('destination')):
            names[name] = {'id':road['id'],'name':name,'source':road['source'],
                           'segments':[{'wayId':road['id'],'ring':road['ring']}]}
    for record in details.get('roadNames', []):
        entry = {**record, 'segments':[]}
        for span in record['segments']:
            # Match both endpoints as well as the way. A changed upstream trace
            # needs a new check against the university guide before it is named.
            i, j = span['fromIndex'], span['toIndex']
            matches = [r['ring'][i:j+1] for r in segments if r['id']==span['wayId']
                       and 0<=i<j<len(r['ring']) and r['ring'][i]==span['start'] and r['ring'][j]==span['end']]
            if len(matches)!=1:
                raise ValueError(f"Campus road anchors do not match: {record['name']}")
            entry['segments'].append({'wayId':span['wayId'], 'fromIndex':i, 'toIndex':j, 'ring':matches[0]})
        names[entry['name']] = entry
    return list(names.values())


def attach_road_contact(polygons, style, lane_area, occupied, frame):
    local = []
    for row in polygons:
        if row['style'] == 'edge':
            continue
        shape = Polygon(row['ring'], row.get('holes', []))
        if lane_area.envelope.intersects(shape):
            local.append(shape)
    mask = combine([occupied, *local])
    lane_parts = list(tiled_surfaces([(style, lane_area)], mask, frame))
    lane = combine([Polygon(row['ring'], row.get('holes', [])) for row in lane_parts])
    result = []
    def clipped_ring(points):
        return [[round(x, 8), round(z, 8)] for x, z in list(points)[:-1]]

    for row in polygons:
        if row['style'] != 'edge':
            result.append(row)
            continue
        shoulder = Polygon(row['ring'], row.get('holes', []))
        if not shoulder.intersects(lane):
            result.append(row)
            continue
        # Trim only the shared mouth of the lane. Do not re-union unrelated
        # shoulders, which can move their centimetre-grid intersections.
        for part in parts(shoulder.difference(lane), 'Polygon'):
            result.append(dict(style='edge', ring=clipped_ring(part.exterior.coords),
                               holes=[clipped_ring(h.coords) for h in part.interiors]))
    return [*result, *lane_parts]


def build():
    region = read(DATA/'surroundings.json')
    campus = read(DIST/'campus.json')
    frame = box(*region['bounds'])
    segments, stats = street_segments(region,campus,frame)
    details = read(DATA/'campus-road-details.json')
    boundary_road = read(DATA/'dongshan-boundary-road.json')
    for key in ('segments','areas'):
        details[key].extend(boundary_road[key])
    village_lane = read(Path(__file__).resolve().parent / 'data/zouyu-village-lane.json')
    village_connector = read(Path(__file__).resolve().parent / 'data/zouyu-south-road.json')
    details['areas'].extend(village_connector['areas'])
    frontage_walk, frontage_paint = xianjing_frontage(segments)
    details['areas'].append(frontage_walk)
    court = campus.get('financeCourt')
    if court:
        details['areas'].append(dict(id='east-finance-court-paving', name='四教庭院铺地',
            style='forecourt', ring=court['pavingRingXZ'], source='campusInterpretation',
            sourceLabel='校方场区图与两期影像核对', geometrySource=court['planSource'], basis=court['basis']))
    # The connector spans a pedestrian passage. Follow its covered footprint
    # and leave the adjoining wings in the ordinary building exclusion mask.
    bridge = next((b for b in campus['buildings'] if b['id']=='east-finance-bridge'), None)
    if bridge:
        details['areas'].append(dict(id='east-finance-covered-walk', name='四教连廊下通道',
            style='forecourt', ring=bridge['ring'], source='campusInterpretation',
            sourceLabel='校方航拍', geometrySource='https://www.ytkj.edu.cn/info/1049/8478.htm',
            basis='航拍可见首层通道。铺面范围取上方连廊投影，材质为示意。'))
    segments.extend(details['segments'])
    walks = read(DATA/'dorm-walks.json')
    segments.extend({**walk,'kind':'footway','width':2,'widthSource':'estimate',
                     'source':'dormAccessApproximation'} for walk in walks['segments'])
    footprints = [Polygon(row['ring'],row.get('holes',[])).buffer(0)
                  for row in campus['buildings']+region['buildings'] if row is not bridge]
    approach = details.get('northGateApproachArrows', {})
    approach_arrows = approach.get('shapes', [])
    apron, garden, paint = gate_ground(campus, approach_arrows)
    pavement, shoulders = defaultdict(list), []
    axes, curve_stats = pavement_axes(segments)
    stats.update(curve_stats)
    replacements = {
        area['replacesPavementOf']: area.get('replacePavementWithin')
        for area in details['areas'] if 'replacesPavementOf' in area
    }
    for road,line in zip(segments,axes):
        limits = replacements.get(road['id'])
        if road['id'] in replacements and limits is None:
            continue
        half = road['width']/2
        if road['source']=='dormAccessApproximation':
            # Guide marks on the terrain, kept visually distinct from pavements.
            for offset in range(0, math.ceil(line.length), 9):
                dash = substring(line, offset, min(offset+5, line.length))
                if dash.geom_type=='LineString':
                    pavement['estimatedWalk'].append(dash.buffer(half,cap_style='flat'))
            continue
        style = STYLES[road['kind']]
        surface = line.buffer(half,quad_segs=5)
        shoulder = line.buffer(half+EDGE_WIDTH[style],quad_segs=5)
        if limits is not None:
            footprint = Polygon(limits)
            surface = surface.difference(footprint, grid_size=GRID)
            shoulder = shoulder.difference(footprint, grid_size=GRID)
        pavement[style].append(surface)
        shoulders.append(shoulder)
    surface_patches, surface_overlays, observed_shoulders = [], [], []
    for area in details['areas']:
        surface = Polygon(area['ring'],area.get('holes',[])).buffer(0)
        if area.get('overlayOn'):
            surface_overlays.append((area['style'],surface,area['overlayOn']))
            continue
        if area.get('surfaceOnly'):
            surface_patches.append((area['style'],surface,area.get('joinRoadShoulder', False)))
            continue
        pavement[area['style']].append(surface)
        shoulder = surface.buffer(EDGE_WIDTH[area['style']],quad_segs=4)
        shoulders.append(shoulder)
        if 'replacesPavementOf' in area:
            observed_shoulders.append(shoulder)
    # The north gate photo shows an uninterrupted public carriageway. Its
    # inside edge sets the upper limit of the campus approach. Remove the
    # shared area from the apron before calculating edge seams.
    public_road = combine(pavement['arterial'])
    apron = max(parts(apron.difference(public_road,grid_size=GRID),'Polygon'),key=lambda p:p.area)
    # The legacy plaza mask approximates land use. An observed road supplies its own edge.
    pedestrian_garden = garden.difference(combine(observed_shoulders)) if observed_shoulders else garden
    occupied = combine([*footprints, apron, pedestrian_garden, stadium(campus)])
    # Assign every square metre of a junction to a single road class. The
    # outer seam runs around the complete union, never across another road.
    classes = ('arterial','collector','local','service','brickWalk','walk','forecourt','estimatedWalk')
    layers = [(style,combine(pavement[style])) for style in classes]
    layers.append(('edge',combine(shoulders)))
    polygons = list(tiled_surfaces(layers,occupied,frame))
    village_surface = combine([Polygon(area['ring'], area.get('holes', [])) for area in village_lane['areas']])
    polygons = attach_road_contact(polygons, 'villageLane', village_surface, occupied, frame)
    # An observed ground patch adds paving without reprocessing road shoulders.
    for style, surface, join_shoulder in surface_patches:
        if join_shoulder:
            polygons = attach_road_contact(polygons, style, round_geom(surface), occupied, frame)
            continue
        existing = [Polygon(p['ring'],p.get('holes',[])) for p in polygons]
        mask = combine([occupied,*(p for p in existing if p.intersects(surface))])
        polygons.extend(tiled_surfaces([(style,surface)],mask,frame))
    for style,surface,base_styles in surface_overlays:
        support = [Polygon(row['ring'],row.get('holes',[])) for row in polygons if row['style'] in base_styles]
        paved = combine([shape for shape in support if shape.intersects(surface)])
        clipped = surface.intersection(paved,grid_size=GRID)
        polygons.extend(tiled_surfaces([(style,clipped)],GeometryCollection(),frame))
    # Gate markings have photographic evidence. No painted stripe is inferred
    # from a street's width, name or highway class.
    markings = [(style,combine(shapes).intersection(apron)) for style,shapes in paint.items()]
    polygons.extend(tiled_surfaces(markings,GeometryCollection(),apron.envelope))
    frontage_paint = frontage_paint.intersection(public_road)
    polygons.extend(tiled_surfaces([('marking',frontage_paint)],GeometryCollection(),frontage_paint.envelope))
    # The school photos show two outbound and two turning arrows on the
    # approach to the inner crossroad. Clip the inferred outlines to the
    # visible driveway and service-road polygons, including the gate apron.
    interior = details.get('northGateInteriorArrows', {})
    if interior.get('shapes'):
        gate = campus['gate']
        co, si = math.cos(gate['angle']), math.sin(gate['angle'])
        matrix = [co, -si, si, co, gate['x'], gate['z']]
        arrows = [affine_transform(Polygon(p['ringGateUV']), matrix) for p in interior['shapes']]
        driveway = combine([apron, *(Polygon(p['ring'], p.get('holes', [])) for p in polygons
                                    if p['style'] in ('service', 'local'))])
        interior_paint = combine(arrows).intersection(driveway, grid_size=GRID)
        polygons.extend(tiled_surfaces([('marking',interior_paint)],GeometryCollection(),interior_paint.envelope))

    osm = [row for row in segments if row.get('source')=='osm']
    stats.update(osmWays=len({row['id'] for row in osm}),osmParts=len(osm),campusInterpretedParts=len(details['segments']),
                 dormWalkApproximations=len(walks['segments']),
                 campusForecourts=sum(a['style']=='forecourt' for a in details['areas']),
                 campusBrickWalks=sum(a['style']=='brickWalk' for a in details['areas']),photoGateArrows=6+len(approach_arrows),photoInnerGateArrows=len(interior.get('shapes',[])),polygonParts=len(polygons))
    areas = [*details['areas'],*village_lane['areas'],{'id':'north-gate-vehicle-apron','style':'gateApron',
              'source':'gatePhoto','ring':coords(apron.exterior.coords[:-1])}]
    return {'bounds':region['bounds'],'segments':segments,'areas':areas,'polygons':polygons,
            'planAreas':details.get('planAreas',[]),
            'roadNames':named_roads(segments,details),
            'stats':stats,'source':{'streets':'© OpenStreetMap contributors, ODbL 1.0',
                 'license':'https://www.openstreetmap.org/copyright','gate':GATE_PHOTO,
                 'campus':'campus-road-details.json','dormWalks':'dorm-walks.json','zouyuVillageLane':village_lane['sources'],'innerGateArrows':interior.get('sources',[]),'approachArrows':approach.get('sources',[]),
                 'precision':'Model widths are estimates unless widthSource is osmWidth. Gate paint is photo-interpreted.'}}


if __name__ == '__main__':
    roads = build()
    (DATA/'roads.json').write_text(json.dumps(roads,ensure_ascii=False,separators=(',',':')),'utf8')
    print(roads['stats'])

