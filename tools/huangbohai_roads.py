"""Rebuild Huang-Bohai campus paving from the engineering plan and current centre lines.

Requires rasterio and shapely >= 2. Run with --check to verify the published
polygons, or with no flags to regenerate them. No external imagery is required.
"""
import argparse
from collections import defaultdict
from itertools import pairwise
import json
import math
from pathlib import Path

from affine import Affine
from rasterio.warp import transform
from shapely import constrained_delaunay_triangles, set_precision
from shapely.geometry import LineString, Point, Polygon, box
from shapely.ops import nearest_points, unary_union
from huangbohai_culture_wave_planting import WAVE_PREFIX, add_culture_wave, realign_culture_walk
from huangbohai_tower_street import TOWER_STREET, add_tower_front_street


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "dist/data"
STYLES = ("trafficMedian", "crossing", "yellowMarking", "trunk", "frontage", "drive", "cultureWaveBlue", "cultureWaveLight", "walk", "cultureNorthApron", "courtBlueWalk", "courtWalk", "gardenWalk", "boyaApron", "linkGrayApron",
          "courtLine", "courtSurfaceBlue", "courtSurfaceTeal", "practiceLine", "practiceSurface", "lightFarmLaneGround")
STREET_ID = "hbh-zhiying-road"
JUNCTION_ID = "hbh-zhiying-approach"
GARDEN_ID = "hbh-boya-garden"
SOUTH_FORECOURT = "hbh-south-junction"
CULTURE_FORECOURT = "hbh-culture-forecourt"
GATE_ARRIVAL = "hbh-northwest-crosswalk"
TRACK_PERIMETER = "hbh-track-west-south"
RESIDENCE_COURT = "hbh-s5-court"
CENTRAL_EAST_WALK = "hbh-central-east-walk"
CENTRAL_SMALL_FIELD = "hbh-central-west-small-field"
BOYA_SOUTH_APRON = "hbh-boya-south-apron"
TEACHING_DRIVE = "hbh-j1-j4-drive"
S3_APRON = "hbh-s3-apron"
COURT_WEST_PAVING = "hbh-court-west-paving"
EAST_PERIMETER_LIGHT_PAVING = "hbh-east-perimeter-light-paving"
NORTHWEST_FARM_LANE = "hbh-northwest-farm-lane"


def read(path):
    return json.loads(path.read_bytes())


def make_transform(model):
    fit = model["fit"]
    scale = complex(*fit["scaleChipPixelsPerPlanPixel"])
    shift = complex(*fit["chipOriginShift"])
    affine = Affine(*fit["sourceAffine"])
    lon0, lat0 = model["originWGS84"]

    def project(pixel):
        chip = complex(*pixel) * scale + shift
        easting, northing = affine * (chip.real, chip.imag)
        lon, lat = transform("EPSG:32651", "EPSG:4326", [easting], [northing])
        return [round((lon[0]-lon0)*model["xMetresPerLongitudeDegree"], 2),
                round((lat0-lat[0])*model["zMetresPerLatitudeDegree"], 2)]

    return project


def register_arc(original, bank_shift, shared_shift):
    """Blend each bank registration into the two shared promenade junctions."""
    line = LineString(original)
    registered = []
    for point in original:
        distance = line.project(Point(point))
        weight = min(1, distance/22, (line.length-distance)/22)
        registered.append([round(v+a+(s-a)*weight, 2)
                           for v, a, s in zip(point, shared_shift, bank_shift)])
    return registered


def clear_known_surfaces(points, obstacles):
    """Make the smallest local offset required by independently registered court edges."""
    line = LineString(points)
    stations = {line.project(Point(p)) for p in points}
    stations.update(range(3, int(line.length), 3))
    corrected = []
    for distance in sorted(stations):
        point = line.interpolate(distance)
        for polygon in obstacles:
            if polygon.contains(point):
                point = nearest_points(point, polygon.exterior)[1]
        corrected.append(point.coords[0])
    return [[round(v, 2) for v in p] for p in LineString(corrected).simplify(.05).coords]


def add_sports_paths(roads, control, project, court_supports, west_paving):
    by_id = {road["id"]: road for road in roads}
    central = by_id["hbh-central-drive"]
    widths = control["widthsMetres"]
    radius = widths["perimeter"]/2
    obstacles = [pad.buffer(radius+1.0) for pad in court_supports]
    obstacles.append(LineString(central["ring"]).buffer(central["width"]/2+radius+.8))
    shifts = control["arcRegistrationXZMetres"]
    shared = [sum(axis)/2 for axis in zip(shifts["west"], shifts["east"])]
    arcs = []
    for bank in ("west", "east"):
        original = [project(p) for p in control[bank]]
        points = clear_known_surfaces(register_arc(original, shifts[bank], shared), obstacles)
        route = dict(id=f"hbh-court-{bank}-loop", kind="courtWalk", width=widths["perimeter"], ring=points)
        if bank == "west":
            # The outline records the changing width and distinct light-paved ends.
            points = [points[0], *west_paving["routeInteriorXZ"], points[-1]]
            route.update(ring=points, surfaceFromAprons=True)
        arcs.append(points)
        roads.append(route)
    start, end = arcs[0][0], arcs[0][-1]
    assert start == arcs[1][0] and end == arcs[1][-1]

    # Carry the promenade axis to the observed central-road junction. Share
    # its node with the drive so the routes stay connected after rounding.
    length = LineString([end, start]).length
    far = [a+30*(a-b)/length for a, b in zip(start, end)]
    cross = LineString([start, far]).intersection(LineString(central["ring"]))
    assert cross.geom_type == "Point"
    joint = [round(v, 2) for v in cross.coords[0]]
    if joint not in central["ring"]:
        segments = list(pairwise(central["ring"]))
        i = min(range(len(segments)), key=lambda j: LineString(segments[j]).distance(cross))
        central["ring"].insert(i+1, joint)
    gym = by_id["hbh-gym-south-walk"]["ring"][-1]
    bend = [[round(v+s, 2) for v, s in zip(project(p), shared)] for p in control["southApproach"]]
    for name, points, width in (("crossing", [start, *west_paving["crossingWestTailXZ"], end], widths["promenade"]),
                                ("north-access", [start, joint], widths["promenade"]),
                                ("south-access", [end, *bend, gym], widths["southApproach"])):
        roads.append(dict(id=f"hbh-court-{name}", kind="walk", width=width, ring=points))


def add_boya_garden(roads, control, project):
    registration = control["registration"]
    widths = control["widthsMetres"]

    def registered(point):
        return [round(a+b, 2) for a, b in zip(project(point), registration["shiftXZ"])]

    centre = [registered(p) for p in control["walk"]]
    axis = LineString(centre)
    curve = []
    for point in centre:
        station = axis.project(Point(point), normalized=True)
        distance = abs(station-registration["returnPeakFraction"])
        weight = max(0, 1-distance/registration["returnHalfSpanFraction"])
        weight = weight*weight*(3-2*weight)
        curve.append([v+weight*d for v, d in zip(point, registration["returnShiftXZ"])])
    # Corner cutting keeps the ends fixed and stays inside each turn's controls.
    for _ in range(2):
        refined = [curve[0]]
        for a, b in pairwise(curve):
            refined.extend([[x+(y-x)*t for x, y in zip(a, b)] for t in (.25, .75)])
        curve = [*refined, curve[-1]]
    curve = [[round(x, 2), round(z, 2)] for x, z in LineString(curve).simplify(.09).coords]

    court = next(r for r in roads if r["id"] == "hbh-court-south-access")["ring"][0]
    access = [court, *[registered(p) for p in control["courtApproach"]], curve[0]]
    frontage = [*[registered(p) for p in control["frontageBefore"]], curve[-1],
                *[registered(p) for p in control["frontageAfter"]]]
    roads.extend([
        dict(id=GARDEN_ID+"-approach", kind="walk", width=widths["courtApproach"], ring=access),
        dict(id=GARDEN_ID+"-frontage", kind="walk", width=widths["frontage"], ring=frontage),
        dict(id=GARDEN_ID, kind="gardenWalk", width=widths["walk"], ring=curve,
             name="博雅楼花园步道", labelXZ=curve[len(curve)//2], source=control["figure"],
             sourceLabel="看一期工程总图", publicNote="小径从中央篮球场一侧的步道穿过绿地，接到博雅楼前。路线依据一期总图和影像校核，铺面宽度为估计值。"),
    ])


def add_frontage(roads, aprons, control, project, outer_control):
    """Show the observed external street corridor only within the model board."""
    a, b = [project(p) for p in control["frontageBoundaryPlanPixels"]]
    length = math.dist(a, b)
    axis = [(b[i]-a[i])/length for i in range(2)]
    outside = [axis[1], -axis[0]]
    def offset(point, along=0, out=0):
        return [point[i]+along*axis[i]+out*outside[i] for i in range(2)]
    def lateral(point):
        return sum((point[i]-a[i])*outside[i] for i in range(2))
    def snapped(point):
        return [round(v, 3) for v in point]

    board = box(*outer_control["displayBounds"])
    inner, outer = control["frontageDisplayOuterOffsetsM"]
    centre = (inner+outer)/2
    axis_line = LineString([offset(a, -1500, centre), offset(b, 1500, centre)])
    centre_line = axis_line.intersection(board)
    apron = next(p for p in aprons if p["id"] == "hbh-northwest-entry-apron")
    # The reconstructed apron ends on the published boundary. Extend that
    # opening, and only that opening, to the carriageway edge.
    edge = sorted(apron["ring"], key=lateral)[-2:]
    assert abs(lateral(edge[0])) < .05 and abs(lateral(edge[1])) < .05
    far = [offset(p, out=inner-lateral(p)+.1) for p in edge]
    aprons.append(dict(id=JUNCTION_ID, kind="drive", ring=[snapped(p) for p in [*edge, *reversed(far)]]))
    middle = [(edge[0][i]+edge[1][i])/2 for i in range(2)]
    junction = snapped(offset(middle, out=centre-lateral(middle)))
    endpoints = [snapped(p) for p in centre_line.coords]
    # OSM node 11333153543 is shared by the mapped street approach and the
    # near carriageway. The opposite carriageway has no mapped crossing here.
    street_end = outer_control["streetEndXZ"]
    roads.append(dict(id=STREET_ID, kind="frontage", name="芝樱路", width=outer-inner,
                      ring=[street_end, junction, endpoints[-1]], labelXZ=junction,
                      source=control["streetNameSource"], limit="西南端与G228近侧车行面相接，东北端截于模型边界。铺面宽度为估计值。"))
    branch = next(r for r in roads if r["id"] == "hbh-northwest-entry")
    roads.append(dict(id=JUNCTION_ID, kind="drive", width=branch["width"],
                      ring=[branch["ring"][0], snapped(middle), junction]))
    return board


def add_outer_roads(roads, board, control):
    for index, way in enumerate(control["roads"]):
        clipped = LineString(way["ring"]).intersection(board)
        record = dict(id=way["id"], kind="trunk", name="G228 丹东线", ownerCode="hbh-g228",
                          width=int(way["tags"]["lanes"])*control["laneWidthEstimateM"],
                          source=way["source"], sourceLabel="看道路中心线",
                          ring=[[round(x,3),round(z,3)] for x,z in clipped.coords])
        if index == 0:
            label = clipped.interpolate(.52, normalized=True)
            record.update(labelXZ=[round(v, 2) for v in label.coords[0]],
                          publicNote="芝樱路在校区西侧接入这条国道。")
        roads.append(record)



def add_planted_forecourt(aprons, control, identifier):
    """Join an image-traced driveway around a circular planting bed."""
    centre = Point(control["centreXZ"])
    radius = control["radiusMetres"]
    half_kerb = control["kerbWidthMetres"] / 2
    outside = centre.buffer(radius + half_kerb, quad_segs=24)
    inside = centre.buffer(radius - half_kerb, quad_segs=24)
    def loop(polygon):
        return [[round(x, 4), round(z, 4)] for x, z in list(polygon.exterior.coords)[:-1]]
    aprons.append(dict(id=f"{identifier}-drive", kind="drive",
                       ring=control["apronXZ"], holes=[loop(outside)]))
    kerb = dict(id=f"{identifier}-kerb", kind="walk", ring=loop(outside), holes=[loop(inside)])
    if "kerbHeightMetres" in control:
        kerb["heightM"] = control["kerbHeightMetres"]
    aprons.append(kerb)
    for i, ring in enumerate(control.get("markingsXZ", [])):
        aprons.append(dict(id=f"{identifier}-crossing-{i+1}",
                           kind="crossing", ring=ring, holes=[]))



def add_gate_crosswalks(aprons, control):
    """Add the three observed pedestrian links and their local pavement."""
    origin = control["originXZ"]
    inward = control["inwardXZ"]
    length = math.hypot(*inward)
    u, v = (n / length for n in inward)

    def project(points):
        return [[round(origin[0] + v*a + u*b, 5), round(origin[1] - u*a + v*b, 5)]
                for a, b in points]

    def add(name, kind, ring):
        record = dict(id=f"{GATE_ARRIVAL}-{name}", kind=kind, ring=project(ring), holes=[])
        aprons.append(record)

    add("near-carriageway", "frontage", control["frontageExtension"])
    add("inner-approach", "drive", control["innerApron"])
    for walk in control["sidewalks"]:
        add(f'sidewalk-{walk["id"]}', "walk", walk["ring"])
    for i, ring in enumerate(control["plantedMedians"], 1):
        add(f"median-{i}", "trafficMedian", ring)
    for band in control["bands"]:
        a, b = band["endsM"]
        for i in range(band["count"]):
            centre = band["firstM"] + band["pitchM"] * i
            low, high = centre - band["stripeM"] / 2, centre + band["stripeM"] / 2
            ring = [(a, low), (b, low), (b, high), (a, high)]
            if band["along"] == "perpendicular":
                ring = [(v, u) for u, v in ring]
            add(f'{band["id"]}-stroke-{i+1}', "crossing", ring)


def audit_gate_crosswalks(roads, aprons, board):
    marks = [a for a in aprons if a["id"].startswith(GATE_ARRIVAL + "-") and a["kind"] == "crossing"]
    under = [p for p in paving(roads, [a for a in aprons if a not in marks], board)
             if p["style"] in ("frontage", "drive")]
    support = unary_union([Polygon(p["ring"], p["holes"]) for p in under])
    for mark in marks:
        outline = Polygon(mark["ring"])
        assert support.covers(outline), (mark["id"], outline.difference(support).area)



def add_track_perimeter(aprons, control, occupied, model, athletics):
    """Trace the pavement bands and the north turnoff outside the track."""
    track = Polygon(athletics["support"]["ring"])
    covers = unary_union([
        Polygon(p["ring"], p.get("holes", []))
        for building in model["buildings"] for p in building["polygons"]
    ]).union(track).buffer(.24)
    for kind, key, keep in [
        ("drive", "driveXZ", ("walk", "gardenWalk", "courtWalk")),
        ("walk", "walkXZ", ("drive", "frontage", "trafficMedian")),
    ]:
        earlier_surfaces = [Polygon(p["ring"], p["holes"]) for p in occupied if p["style"] in keep]
        outline = Polygon(control[key])
        if kind == "walk":
            turnoff = Polygon(control["northTurnoffXZ"])
            assert turnoff.is_valid and turnoff.intersects(outline)
            outline = outline.union(turnoff)
        area = outline.difference(covers.union(unary_union(earlier_surfaces)))
        parts = [area] if area.geom_type == "Polygon" else area.geoms

        def loop(coords):
            return [[round(x, 7), round(z, 7)] for x, z in coords[:-1]]

        for index, part in enumerate(parts, 1):
            if part.geom_type == "Polygon" and part.area > .015:
                aprons.append(dict(id=f"{TRACK_PERIMETER}-{kind}-{index}", kind=kind,
                                   ring=loop(part.exterior.coords),
                                   holes=[loop(h.coords) for h in part.interiors]))


def add_residence_court(aprons, control):
    """Build the observed S5 court colours and draped white line surfaces."""
    edge = Polygon(control["edgeXZ"])
    blue_side = Polygon(control["blueSideXZ"])
    teal_side = Polygon(control["tealSideXZ"])
    blue_patches = unary_union([Polygon(ring) for ring in control["bluePatchesXZ"]])
    teal_patches = unary_union([Polygon(ring) for ring in control["tealPatchesXZ"]])
    blue = blue_side.difference(teal_patches).union(blue_patches).intersection(edge)
    teal = edge.difference(blue)
    assert blue_side.covers(teal_patches) and teal_side.covers(blue_patches)
    assert blue.area > 0 and teal.area > 0
    width = control["markingWidthM"]
    markings = unary_union([LineString(row["pointsXZ"]).buffer(width/2, cap_style="flat", join_style="mitre")
                           for row in control["markings"]])
    assert edge.covers(markings)

    def ring(coords):
        return [[round(x, 6), round(z, 6)] for x, z in coords[:-1]]

    for kind, area in (("courtLine", markings), ("courtSurfaceBlue", blue), ("courtSurfaceTeal", teal)):
        parts = [area] if area.geom_type == "Polygon" else area.geoms
        for i, part in enumerate(parts):
            if part.geom_type == "Polygon" and part.area >= .005:
                aprons.append(dict(id=f"{RESIDENCE_COURT}-{kind}-{i+1}", kind=kind,
                                   ring=ring(part.exterior.coords), holes=[ring(h.coords) for h in part.interiors]))


def add_central_small_field(aprons, control):
    """Use the green surface and the white segments visible in the dated image."""
    field = Polygon(control["surfaceXZ"])
    width = control["lineWidthM"]
    lines = unary_union([
        LineString(mark["pointsXZ"]).buffer(width/2, cap_style="flat", join_style="mitre")
        for mark in control["markings"]
    ])
    assert field.is_valid and field.covers(lines)
    ring = lambda coords: [[round(x, 7), round(z, 7)] for x, z in coords[:-1]]
    aprons.append(dict(id=CENTRAL_SMALL_FIELD + "-surface", kind="practiceSurface",
                       ring=control["surfaceXZ"], holes=[]))
    parts = [lines] if lines.geom_type == "Polygon" else lines.geoms
    for index, part in enumerate(parts, 1):
        aprons.append(dict(id=f"{CENTRAL_SMALL_FIELD}-line-{index}", kind="practiceLine",
                           ring=ring(part.exterior.coords), holes=[ring(i.coords) for i in part.interiors]))


def paving(roads, aprons, board):
    """Assign junctions to a single surface so GLB materials never overlap."""
    output = []
    occupied = Polygon()

    def ring(coords):
        # Preserve intersections between centimetre-rounded source edges.
        return [[round(x, 7), round(z, 7)] for x, z in coords[:-1]]

    assert all(road["kind"] in STYLES for road in roads)
    for style in STYLES:
        paths = []
        for road in (r for r in roads if r["kind"] == style and not r.get("surfaceFromAprons")):
            points = list(road["ring"])
            if style in ("frontage", "trunk"):
                # Extend only cut edges. The west end of Zhiying Road stops at G228.
                for idx, other in [(0,1),(-1,-2)]:
                    if style == "frontage" and idx == 0:
                        continue
                    a,b=points[idx],points[other]
                    points[idx]=[a[i]+(a[i]-b[i])*road["width"]/math.dist(a,b) for i in range(2)]
            paths.append(LineString(points).buffer(road["width"]/2, quad_segs=5).intersection(board))
        merged = set_precision(unary_union(paths), .01)
        aprons_for_style = [Polygon(a["ring"], a.get("holes", [])) for a in aprons if a["kind"] == style]
        # Preserve the exact green-island hole shared with the gate model.
        envelope = unary_union([set_precision(merged, 0), *aprons_for_style])
        region = envelope.difference(occupied)
        occupied = occupied.union(region)
        if style == "practiceSurface":
            # Cut thin paint holes into separate triangles before the browser
            # drapes them. Re-triangulating the long holes can bridge the paint.
            parts = constrained_delaunay_triangles(region).geoms
            minimum_area = 1e-7
        else:
            parts = [region] if region.geom_type == "Polygon" else region.geoms
            minimum_area = .005
        for part in parts:
            if part.geom_type == "Polygon" and part.area >= minimum_area:
                record = dict(style=style, ring=ring(part.exterior.coords),
                              holes=[ring(h.coords) for h in part.interiors])
                if style in ("frontage","trunk"):
                    record["ownerCode"] = STREET_ID if style == "frontage" else "hbh-g228"
                elif style == "gardenWalk":
                    record["ownerCode"] = GARDEN_ID
                output.append(record)
    return output


def audit(roads, surfaces, model, courts, athletics, underpass):
    nodes = defaultdict(set)
    for road in roads:
        for a, b in pairwise(map(tuple, road["ring"])):
            nodes[a].add(b)
            nodes[b].add(a)
    stack = [next(iter(nodes))]
    seen = set(stack)
    while stack:
        for neighbour in nodes[stack.pop()] - seen:
            seen.add(neighbour)
            stack.append(neighbour)
    assert all(tuple(p) in seen for r in roads if r["kind"] != "trunk" for p in r["ring"]), "Disconnected campus road graph"
    # The second G228 carriageway continues outside the board; do not add a median crossing.
    components=1
    for start in nodes:
        if start not in seen:
            components+=1
            seen.add(start)
            stack=[start]
            while stack:
                for neighbour in nodes[stack.pop()] - seen:
                    seen.add(neighbour)
                    stack.append(neighbour)
    parts = [Polygon(p["ring"], p["holes"]) for p in surfaces]
    assert all(part.is_valid for part in parts)
    paved = unary_union(parts)
    assert sum(p.area for p in parts)-paved.area < .0001, "Overlapping road surfaces"
    geometry = {
        "buildings": unary_union([Polygon(p["ring"], p.get("holes", [])) for b in model["buildings"]
                                  if b["code"] not in ("northwest-gate", "link") for p in b["polygons"]]),
        "athletics": Polygon(athletics["support"]["ring"]),
        "courtAprons": unary_union([Polygon(p["ring"]) for p in courts["supports"]]),
        "courtPaint": unary_union([LineString(m["points"]+([m["points"][0]] if m["closed"] else []))
                                   for m in courts["markings"]]),
    }
    gate = next((b for b in model["buildings"] if b["code"] == "northwest-gate"), None)
    if gate:
        island = unary_union([Polygon(p["ring"]) for p in gate["polygons"]])
        assert paved.intersection(island).area < .0001
    clearance = {name: round(paved.distance(obj), 2) for name, obj in geometry.items()}
    assert all(paved.disjoint(obj) for obj in geometry.values()), clearance
    # The documented vehicle lane runs underneath the central pedestrian deck.
    link = next(b for b in model["buildings"] if b["code"] == "link")
    deck = unary_union([Polygon(p["ring"], p["holes"]) for p in link["polygons"]])
    assert paved.intersection(deck).difference(underpass).area < .0001
    piers = [Point(p["xz"]).buffer(.5) for p in link["facadeEvidence"]["piers"]]
    assert all(underpass.disjoint(pier) for pier in piers)
    if gate:
        clearance["gateIsland"] = round(paved.distance(island), 2)
    return dict(routes=len(roads), sharedJunctions=sum(len(links)>=3 for links in nodes.values()),
                connectedComponents=components, surfaces=len(parts), clearanceM=clearance,
                addedLengthM=round(sum(LineString(r["ring"]).length for r in roads if r["id"].startswith("hbh-court-")), 2),
                gardenWalkLengthM=round(LineString(next(r["ring"] for r in roads if r["id"] == GARDEN_ID)).length, 2),
                areaByStyleM2={style:round(sum(p.area for p, s in zip(parts, surfaces) if s["style"] == style), 2)
                               for style in STYLES})


def main(check):
    path = DATA / "huangbohai-ground.json"
    ground = read(path)
    model = read(DATA / "huangbohai-models.json")
    courts = read(DATA / "huangbohai-courts.json")
    athletics = read(DATA / "huangbohai-sports.json")
    control = read(ROOT / "tools/data/huangbohai-sports-walks.json")
    outer = read(ROOT / "tools/data/huangbohai-g228.json")
    roads = [r for r in ground["roads"] if not r["id"].startswith(("hbh-court-","hbh-g228-",GARDEN_ID)) and r["id"] not in (STREET_ID, JUNCTION_ID)]
    project = make_transform(model)
    west_paving = read(ROOT / "tools/data/huangbohai-court-west-paving.json")
    add_sports_paths(roads, control, project, [Polygon(p["ring"]) for p in courts["supports"]], west_paving)
    add_boya_garden(roads, read(ROOT / "tools/data/huangbohai-boya-garden.json"), project)
    mapped_forecourts = (SOUTH_FORECOURT + "-", CULTURE_FORECOURT + "-", GATE_ARRIVAL + "-", TRACK_PERIMETER + "-", TOWER_STREET + "-", RESIDENCE_COURT + "-", CENTRAL_EAST_WALK + "-",
                            WAVE_PREFIX, CENTRAL_SMALL_FIELD + "-", COURT_WEST_PAVING + "-", "hbh-residence-crossing-", S3_APRON + "-", TEACHING_DRIVE + "-", "hbh-culture-north-path-")
    aprons = [a for a in ground["roadAprons"] if a["id"] not in (JUNCTION_ID, BOYA_SOUTH_APRON, EAST_PERIMETER_LIGHT_PAVING, NORTHWEST_FARM_LANE)
              and not a["id"].startswith(mapped_forecourts)]
    for apron in west_paving["aprons"]:
        aprons.append(dict(apron, id=COURT_WEST_PAVING + "-" + apron["id"]))
    add_planted_forecourt(aprons, read(ROOT / "tools/data/huangbohai-south-junction.json"), SOUTH_FORECOURT)
    add_planted_forecourt(aprons, read(ROOT / "tools/data/huangbohai-culture-forecourt.json"), CULTURE_FORECOURT)
    board = add_frontage(roads, aprons, control, project, outer)
    add_outer_roads(roads, board, outer)
    gate_control = read(ROOT / "tools/data/huangbohai-gate-crosswalks.json")
    add_gate_crosswalks(aprons, gate_control)
    track_control = read(ROOT / "tools/data/huangbohai-track-perimeter.json")
    realign_culture_walk(roads)
    earlier_surfaces = paving(roads, aprons, board)
    add_track_perimeter(aprons, track_control, earlier_surfaces, model, athletics)
    tower_control = read(ROOT / "tools/data/huangbohai-tower-street.json")
    add_tower_front_street(aprons, tower_control, earlier_surfaces, model)
    residence_court = read(ROOT / "tools/data/huangbohai-residence-court.json")
    add_residence_court(aprons, residence_court)
    green_field = read(ROOT / "tools/data/huangbohai-central-small-field.json")
    add_central_small_field(aprons, green_field)
    central_east = read(ROOT / "tools/data/huangbohai-central-east-walk.json")
    walkway = Polygon(central_east["ring"])
    hedge = Polygon(central_east["protectionRing"])
    assert walkway.is_valid and hedge.distance(walkway) > .3
    for end in ("hbh-boya-garden-approach", "hbh-boya-garden-frontage"):
        route = next(road for road in roads if road["id"] == end)
        assert walkway.intersects(LineString(route["ring"]).buffer(route["width"]/2))
    aprons.append(dict(id=CENTRAL_EAST_WALK + "-paving", kind="walk", ring=central_east["ring"], holes=[]))
    link_gray = read(ROOT / "tools/data/huangbohai-link-north-gray-paving.json")
    landing = Polygon(link_gray["ring"])
    central_deck = next(b for b in model["buildings"] if b["code"] == "link")
    assert landing.is_valid and board.covers(landing)
    assert all(landing.disjoint(Polygon(p["ring"], p["holes"])) for p in central_deck["polygons"])
    aprons.append(dict(id=CENTRAL_EAST_WALK + "-link-north-gray", kind="linkGrayApron",
                       ring=link_gray["ring"], holes=[]))
    boya_north = read(ROOT / "tools/data/huangbohai-boya-court-north-paving.json")
    boya_paving = Polygon(boya_north["ring"])
    garden = next(road for road in roads if road["id"] == GARDEN_ID)
    assert boya_paving.is_valid and board.covers(boya_paving)
    assert boya_paving.intersection(LineString(garden["ring"]).buffer(garden["width"] / 2)).area > 1
    aprons.append(dict(id=CENTRAL_EAST_WALK + "-boya-north", kind="walk", ring=boya_north["ring"], holes=[]))
    residence_crossings = read(ROOT / "tools/data/huangbohai-residence-crossings.json")
    alignment = residence_crossings["roadAlignment"]
    drive = next(road for road in roads if road["id"] == alignment["roadId"])
    start = drive["ring"].index(alignment["startXZ"])
    end = drive["ring"].index(alignment["endXZ"], start + 1)
    drive["ring"][start + 1:end] = alignment["middleXZ"]
    walk = next(road for road in roads if road["id"] == alignment["walkId"])
    assert walk["ring"][-1] in (alignment["previousJunctionXZ"], alignment["newJunctionXZ"])
    assert alignment["newJunctionXZ"] in alignment["middleXZ"]
    walk["ring"][-1] = alignment["newJunctionXZ"]
    pavement = Polygon(alignment["corridorXZ"])
    assert pavement.is_valid
    aprons.append(dict(id="hbh-residence-crossing-paving", kind="drive",
                       ring=alignment["corridorXZ"], holes=[]))
    for group in residence_crossings["groups"]:
        prefix = f'hbh-residence-crossing-{group["id"]}'
        for i, ring in enumerate(group["markingsXZ"], 1):
            assert pavement.covers(Polygon(ring))
            aprons.append(dict(id=f"{prefix}-{i}", kind="crossing", ring=ring, holes=[]))
    s3_apron = read(ROOT / "tools/data/huangbohai-s3-apron.json")
    apron = Polygon(s3_apron["ring"])
    walkway = next(road for road in roads if road["id"] == "hbh-residence-inner-walk")
    assert apron.is_valid and apron.intersects(LineString(walkway["ring"]).buffer(walkway["width"] / 2))
    aprons.append(dict(id=S3_APRON + "-paving", kind="walk", ring=s3_apron["ring"], holes=[]))
    teaching_drive = read(ROOT / "tools/data/huangbohai-j1-j4-drive.json")
    corridor = Polygon(teaching_drive["ring"], teaching_drive["holes"])
    aprons.append(dict(id=TEACHING_DRIVE + "-paving", kind="drive",
                       ring=teaching_drive["ring"], holes=teaching_drive["holes"]))
    for band in teaching_drive["bands"]:
        for i, ring in enumerate(band["strokes"], 1):
            assert corridor.covers(Polygon(ring))
            aprons.append(dict(id=f'{TEACHING_DRIVE}-{band["id"]}-{i}', kind="crossing", ring=ring, holes=[]))
    south_bands = read(ROOT / "tools/data/huangbohai-j1-j4-south-markings.json")
    for apron in south_bands["aprons"]:
        aprons.append(dict(apron, id=f'{TEACHING_DRIVE}-south-{apron["id"]}'))
    boya_apron = read(ROOT / "tools/data/huangbohai-boya-south-apron.json")
    aprons.append(dict(id=BOYA_SOUTH_APRON, kind="boyaApron", ring=boya_apron["ring"], holes=[]))
    cultural_paving = read(ROOT / "tools/data/huangbohai-culture-north-path.json")
    path_outline = Polygon(cultural_paving["ring"])
    assert path_outline.is_valid and board.covers(path_outline)
    aprons.append(dict(id="hbh-culture-north-path-paving", kind="walk", ring=cultural_paving["ring"], holes=[]))
    cultural_apron = read(ROOT / "tools/data/huangbohai-culture-north-apron.json")
    apron = Polygon(cultural_apron["ring"])
    assert apron.is_valid and board.covers(apron)
    aprons.append(dict(id="hbh-culture-north-path-apron", kind="cultureNorthApron",
                       ring=cultural_apron["ring"], holes=[]))
    east_perimeter = read(ROOT / "tools/data/huangbohai-east-perimeter-light-paving.json")
    east_paving = Polygon(east_perimeter["ring"])
    assert east_paving.is_valid and board.covers(east_paving)
    aprons.append(dict(id=EAST_PERIMETER_LIGHT_PAVING, kind="walk",
                       ring=east_perimeter["ring"], holes=[]))
    culture_wave_evidence = add_culture_wave(aprons, model["buildings"], board)
    farm_lane = read(ROOT / "tools/data/huangbohai-northwest-farm-lane.json")
    farm_surface = Polygon(farm_lane["ring"])
    assert farm_surface.is_valid and board.covers(farm_surface)
    assert farm_surface.disjoint(Polygon(model["phase1BoundaryXZ"]))
    aprons.append(dict(id=NORTHWEST_FARM_LANE, kind="lightFarmLaneGround", ring=farm_lane["ring"], holes=[]))
    audit_gate_crosswalks(roads, aprons, board)
    surfaces = paving(roads, aprons, board)
    print(json.dumps(audit(roads, surfaces, model, courts, athletics, corridor), ensure_ascii=False, indent=2))
    expected = dict(roads=roads, roadAprons=aprons, roadSurfaces=surfaces,
                    displayBounds=outer["displayBounds"], gateArrivalEvidence=gate_control["evidence"],
                    trackPerimeterEvidence=track_control["evidence"], towerFrontEvidence=tower_control["source"],
                    residenceCourtEvidence=residence_court["evidence"],
                    centralEastWalkEvidence=central_east["evidence"],
                    linkNorthGrayPavingEvidence=link_gray["evidence"],
                    boyaCourtNorthPavingEvidence=boya_north["evidence"],
                    centralSmallFieldEvidence=green_field["evidence"],
                    courtWestPavingEvidence=west_paving["evidence"],
                    residenceCrossingEvidence=residence_crossings["evidence"],
                    s3ApronEvidence=s3_apron["evidence"], teachingDriveEvidence=teaching_drive["evidence"],
                    teachingDriveSouthMarkingEvidence=south_bands["evidence"],
                    boyaSouthApronEvidence=boya_apron["evidence"],
                    cultureNorthPavingEvidence=cultural_paving["evidence"],
                    cultureNorthApronEvidence=cultural_apron["evidence"],
                    cultureWavePavingEvidence=culture_wave_evidence,
                    eastPerimeterLightPavingEvidence=east_perimeter["evidence"],
                    northwestFarmLaneEvidence=farm_lane["evidence"])
    current = all(ground.get(key) == value for key, value in expected.items())
    if check:
        assert current, "Published road data is stale"
    elif not current:
        ground.update(expected)
        ground["outerRoadEvidence"] = dict(attribution=outer["attribution"], license=outer["source"], ways=[r["source"] for r in outer["roads"]])
        path.write_text(json.dumps(ground, ensure_ascii=False, separators=(",", ":"))+"\n", encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    main(parser.parse_args().check)
