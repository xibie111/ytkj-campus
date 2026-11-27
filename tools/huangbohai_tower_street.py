"""Evidence-backed pavement and paint between the G1 and G2 arrival fronts."""
import math

from shapely import get_parts
from shapely.geometry import LineString, Polygon
from shapely.ops import unary_union


TOWER_STREET = "hbh-tower-front-street"


def add_tower_front_street(aprons, control, occupied, model):
    origin = control["originXZ"]
    along, inward = control["alongXZ"], control["inwardXZ"]

    def project(point):
        a, b = point
        return tuple(origin[i] + a * along[i] + b * inward[i] for i in range(2))

    def shape(record):
        return Polygon(record["ring"], record.get("holes", []))

    def add(name, kind, polygon):
        def loop(coords):
            return [[round(x, 7), round(z, 7)] for x, z in list(coords)[:-1]]

        for i, part in enumerate(get_parts(polygon), 1):
            if part.geom_type == "Polygon" and part.area > .014:
                aprons.append(dict(id=f"{TOWER_STREET}-{name}-{i}", kind=kind, ring=loop(part.exterior.coords),
                                   holes=[loop(h.coords) for h in part.interiors]))

    reserved = unary_union([shape(p) for b in model["buildings"] for p in b["polygons"]]).buffer(.25)
    paths = unary_union([shape(p) for p in occupied if p["style"] in ("walk", "gardenWalk", "courtWalk")])
    pavement = unary_union([
        Polygon([project(p) for p in control[key]]) for key in ("frontageLocalM", "towerLinkLocalM")
    ]).difference(reserved.union(paths))
    add("drive", "drive", pavement)
    earlier_marking = unary_union([
        shape(p) for p in occupied if p["style"] in ("crossing", "trafficMedian", "frontage", "trunk")
    ])
    paint_support = pavement.difference(earlier_marking).buffer(-.02)

    white = control["zebra"]
    for i in range(white["markCount"]):
        x = white["firstOffsetM"] + i * white["pitchM"]
        start, end = white["spanM"]
        stripe = LineString((project((x, start)), project((x + white["startSkewM"], end))))
        outline = stripe.buffer(white["barWidthM"]/2, cap_style="flat")
        assert paint_support.covers(outline), (i + 1, outline.difference(paint_support).area)
        add(f"crossing-{i+1}", "crossing", outline)

    period = control["hatchPitchM"]
    width = control["hatchWidthM"]
    for i, ring in enumerate(control["yellowGridLocalM"], 1):
        local = Polygon(ring)
        hatch = Polygon([project(p) for p in ring])
        zone = hatch.intersection(paint_support)
        parts = [hatch.boundary.buffer(width / 2, join_style="mitre")]
        for sign in (-1, 1):
            # A diagonally striped road painting uses both bearings, bounded
            # to the visible lattice rather than extended across the lane.
            values = [x + sign*y for x, y in ring]
            step = period * math.sqrt(2)
            bounds = range(math.floor(min(values) / step), math.ceil(max(values) / step) + 1)
            for tick in bounds:
                offset = tick * step
                a, b = (offset + sign*180, -180), (offset - sign*180, 180)
                segment = LineString((a, b)).intersection(local)
                for part in get_parts(segment):
                    if part.geom_type == "LineString" and part.length > .02:
                        edge = LineString([project(p) for p in part.coords])
                        parts.append(edge.buffer(width / 2, cap_style="flat"))
        add(f"lattice-{i}", "yellowMarking", unary_union(parts).intersection(zone))
