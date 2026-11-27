"""Open pedestrian deck and visible structure on the central Huang-Bohai link."""
import math

from shapely import get_parts
from shapely.geometry import LineString, Point
from shapely.ops import unary_union

LINK_MATERIALS = [
    ("连廊浅灰铺面", (185, 179, 169)),
    ("连廊浅色侧缘", (214, 211, 199)),
    ("连廊底梁与桥柱", (160, 164, 157)),
    ("连廊栏杆", (120, 127, 126)),
]


def draw_central_link(mesh, polygon, row, material_start, prism):
    pave, edge, concrete, rail = range(material_start, material_start + 4)
    control = row["facadeEvidence"]
    deck = row["baseM"] + control["deckAboveBaseM"]
    soffit = deck - control["deckThicknessM"]
    mesh.cap(polygon, soffit, concrete, up=False)
    mesh.boundary(polygon, soffit, deck, edge)
    interior = polygon.buffer(-.22, join_style="mitre")
    mesh.cap(polygon.difference(interior), deck, edge, up=True)
    mesh.cap(interior, deck, pave, up=True)

    # The ends stay open where the route approaches a building or landing.
    loops = row["polygons"][0]
    skipped = set(control["openLandingEdgeIndices"])
    guards = []
    for pattern, skip in [(loops["ring"], skipped), *[(h, set()) for h in loops["holes"]]]:
        for index, (a, b) in enumerate(zip(pattern, pattern[1:] + pattern[:1])):
            if index not in skip:
                guards.append(LineString((a, b)))

    band = unary_union([line.buffer(.095, cap_style="flat") for line in guards]).intersection(polygon)
    for part in get_parts(band):
        if part.geom_type == "Polygon" and part.area > .0001:
            prism(mesh, part, deck + 1.08, deck + 1.17, rail, rail)
            prism(mesh, part, deck + .37, deck + .43, rail, rail)

    for line in guards:
        count = max(1, math.ceil(line.length / 2.2))
        for index in range(count):
            centre = line.interpolate((index + .5) / count, normalized=True)
            foot = centre.buffer(.092, quad_segs=1).intersection(polygon)
            prism(mesh, foot, deck, deck + 1.08, rail, rail)

    for support in control["piers"]:
        base = support["modelGroundM"] - .22
        shape = Point(support["xz"]).buffer(.34, quad_segs=3)
        prism(mesh, shape, base, soffit - .13, concrete, concrete)
        cap = Point(support["xz"]).buffer(.47, quad_segs=3)
        prism(mesh, cap, soffit - .13, soffit, concrete, concrete)
