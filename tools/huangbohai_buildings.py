"""Rebuild the public Huang-Bohai building GLB from the checked-in model and gate controls.

Run with python -B tools/huangbohai_buildings.py, then rebuild the road
surfaces with tools/huangbohai_roads.py after changing the entrance controls.
Binary reproduction was checked with NumPy 2.5.5, Shapely 2.2.0 (GEOS
3.14.1), and fontTools 4.55.0. The six-glyph font subset and its SIL Open
Font License are in tools/data alongside the source dimensions.
"""

from pathlib import Path
import json, struct
from collections import defaultdict
import numpy as np
import shapely as S
from shapely.geometry import Polygon, box
from shapely.ops import unary_union
from huangbohai_towers import G1_FACADE_MATERIALS, G2_FACADE_MATERIALS, draw_g1_front, draw_g2_front
from huangbohai_gate import add_gate_record, draw_gate, GATE_MATERIALS
from huangbohai_stand import draw_east_stand, STAND_MATERIALS
from huangbohai_boya import draw_boya, BOYA_MATERIALS
from huangbohai_s2 import draw_s2, S2_MATERIALS
from huangbohai_tengwang import draw_tengwang, draw_tengwang_wing, TENGWANG_MATERIALS
from huangbohai_j1 import draw_j1, J1_MATERIALS
from huangbohai_j4 import draw_j4, J4_MATERIALS
from huangbohai_central_link import draw_central_link, LINK_MATERIALS
from huangbohai_j34_wing import draw_j34_wing, J34_WING_MATERIALS
from huangbohai_culture import draw_culture, silhouette_partition, CULTURE_MATERIALS

here = Path(__file__).resolve().parents[1] / "dist" / "data"
data = json.loads((here / "huangbohai-models.json").read_bytes())
add_gate_record(data, here)
rows = data["buildings"]
shapes = {
    b["code"]: unary_union([Polygon(p["ring"], p["holes"]) for p in b["polygons"]])
    for b in rows
}
entry = next(row for row in rows if row["code"] == "culture")
culture_band, culture_bridge = silhouette_partition(
    shapes["culture"], shapes["stadium"], entry["facadeEvidence"]["raisedPassage"],
)
meta = {
    "asset": {
        "version": "2.0",
        "generator": "Yantai campus atlas / Huang-Bohai phase one",
    },
    "scene": 0,
    "scenes": [{"name": "烟台科技学院黄渤海校区", "nodes": [0]}],
    "nodes": [
        {
            "name": "黄渤海校区建筑",
            "children": [],
            "extras": {
                "originWGS84": data["originWGS84"],
                "axis": "X east, Y up EGM2008, Z south",
                "sources": data["sources"],
                "services": [
                    {
                        "id": service["id"],
                        "name": service["name"],
                        "buildings": service["buildings"],
                        "note": service["note"],
                        "source": service.get("source", data["sources"]["guide"]),
                    }
                    for service in data["services"]
                ],
            },
        }
    ],
    "meshes": [],
    "materials": [],
    "bufferViews": [],
    "accessors": [],
}


def srgb(v):
    v = v / 255
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4


colours = [
    ("浅色墙面", (224, 222, 212)),
    ("灰白屋顶", (201, 205, 201)),
    ("蓝灰玻璃", (105, 137, 149)),
    ("深灰门窗与屋面", (112, 132, 140)),
    ("浅灰基座", (191, 190, 179)),
    ("体育馆面板", (220, 227, 227)),
    ("看台踏步", (207, 194, 172)),
    ("连廊顶", (198, 189, 175)),
]
STADIUM_MATERIALS = [
    ("风雨操场银灰横带", (169, 181, 192)),
    ("风雨操场蓝灰长窗", (92, 117, 145)),
    ("风雨操场窗框", (121, 139, 153)),
    ("风雨操场外墙板缝", (193, 197, 200)),
    ("风雨操场浅色挑边", (227, 227, 220)),
    ("风雨操场深灰主屋面", (88, 98, 93)),
    ("风雨操场蓝灰窄屋面", (100, 129, 131)),
]
(
    STADIUM_GREY, STADIUM_GLASS, STADIUM_FRAME, STADIUM_JOINT, STADIUM_TRIM,
    STADIUM_CHARCOAL_ROOF, STADIUM_BLUE_GREY_ROOF,
) = range(
    len(colours + GATE_MATERIALS), len(colours + GATE_MATERIALS + STADIUM_MATERIALS)
)
stand_material_start = len(colours + GATE_MATERIALS + STADIUM_MATERIALS)
boya_material_start = stand_material_start + len(STAND_MATERIALS)
s2_material_start = boya_material_start + len(BOYA_MATERIALS)
tengwang_material_start = s2_material_start + len(S2_MATERIALS)
culture_material_start = tengwang_material_start + len(TENGWANG_MATERIALS)
j1_material_start = culture_material_start + len(CULTURE_MATERIALS)
j4_material_start = j1_material_start + len(J1_MATERIALS)
central_link_material_start = j4_material_start + len(J4_MATERIALS)
j34_wing_material_start = central_link_material_start + len(LINK_MATERIALS)
roof_finish_material_start = len(colours + GATE_MATERIALS + STADIUM_MATERIALS + STAND_MATERIALS + BOYA_MATERIALS + S2_MATERIALS + TENGWANG_MATERIALS + CULTURE_MATERIALS + J1_MATERIALS + J4_MATERIALS + LINK_MATERIALS + J34_WING_MATERIALS)
ROOF_FINISH_MATERIALS = {
    "G2": ("G2深灰屋面分区", (94, 106, 98)),
    "G1": ("G1深灰屋面分区", (85, 98, 87)),
    "S4": ("S4深灰屋面分区", (91, 104, 96)),
    "S3": ("S3深灰屋面分区", (91, 104, 96)),
    "S5": ("S5深灰屋面分区", (91, 104, 96)),
    "J-link-2": ("J2–J3 连接翼绿色屋面", (72, 107, 68)),
    "J-link-1": ("J1–J2 连接翼绿色屋面", (72, 107, 68)),
}
roof_finish_slots = {code: roof_finish_material_start + i for i, code in enumerate(ROOF_FINISH_MATERIALS)}
g1_facade_material_start = roof_finish_material_start + len(ROOF_FINISH_MATERIALS)
g2_facade_material_start = g1_facade_material_start + len(G1_FACADE_MATERIALS)
tower_facades = {"G1": (draw_g1_front, g1_facade_material_start), "G2": (draw_g2_front, g2_facade_material_start)}
S1_CENTER_MATERIALS = [
    ("S1 东南中段深灰墙板", (106, 112, 112)),
    ("S1 东南中段浅色竖框", (222, 221, 209)),
]
S1_CENTER_PANEL = g2_facade_material_start + len(G2_FACADE_MATERIALS)
S1_CENTER_FRAME = S1_CENTER_PANEL + 1
for name, rgb in colours + GATE_MATERIALS + STADIUM_MATERIALS + STAND_MATERIALS + BOYA_MATERIALS + S2_MATERIALS + TENGWANG_MATERIALS + CULTURE_MATERIALS + J1_MATERIALS + J4_MATERIALS + LINK_MATERIALS + J34_WING_MATERIALS + list(ROOF_FINISH_MATERIALS.values()) + G1_FACADE_MATERIALS + G2_FACADE_MATERIALS + S1_CENTER_MATERIALS:
    meta["materials"].append(
        {
            "name": name,
            "pbrMetallicRoughness": {
                "baseColorFactor": [*(srgb(v) for v in rgb), 1.0],
                "metallicFactor": 0,
                "roughnessFactor": 0.86,
            },
        }
    )
binary = bytearray()


def attribute(vals, ty, n, kind="VEC3", target=34962):
    arr = np.array(vals, dtype=ty)
    start = len(binary)
    raw = arr.tobytes()
    binary.extend(raw)
    binary.extend(b"\0" * ((-len(binary)) % 4))
    vi = len(meta["bufferViews"])
    meta["bufferViews"].append(
        {"buffer": 0, "byteOffset": start, "byteLength": len(raw), "target": target}
    )
    a = {"bufferView": vi, "componentType": n, "count": int(len(arr)), "type": kind}
    if kind == "VEC3":
        a.update(min=arr.min(axis=0).tolist(), max=arr.max(axis=0).tolist())
    idx = len(meta["accessors"])
    meta["accessors"].append(a)
    return idx


def polygons(obj):
    if obj.is_empty:
        return []
    return (
        [obj]
        if obj.geom_type == "Polygon"
        else [g for g in obj.geoms if g.geom_type == "Polygon" and g.area > 1e-7]
    )


def prism(api, poly, lo, hi, wall=0, roof=1, roofCut=None):
    shape = poly.difference(roofCut) if roofCut is not None else poly
    api.cap(shape, hi, roof, up=True)
    api.cap(poly, lo, wall, up=False)
    api.boundary(poly, lo, hi, wall)


class Mesh:
    def __init__(self):
        self.groups = defaultdict(lambda: [[], [], []])

    def face(self, vs, m):
        vs = np.asarray(vs, dtype=float)
        n = np.cross(vs[1] - vs[0], vs[2] - vs[0])
        length = np.linalg.norm(n)
        if length < 1e-7:
            return
        a, b, idx = self.groups[m]
        base = len(a)
        a.extend(vs.tolist())
        b.extend([list(n / length)] * len(vs))
        idx.extend(
            [base, base + 1, base + 2]
            if len(vs) == 3
            else [base, base + 1, base + 2, base, base + 2, base + 3]
        )

    def cap(self, geometry, y, material, up):
        for poly in polygons(geometry):
            surface = S.constrained_delaunay_triangles(poly)
            area = 0
            for part in surface.geoms:
                if part.area < 1e-8:
                    continue
                ring = np.array(part.exterior.coords)[:3]
                vs = np.c_[ring[:, 0], np.full(3, y), ring[:, 1]]
                if (np.cross(vs[1] - vs[0], vs[2] - vs[0])[1] > 0) != up:
                    vs = vs[[2, 1, 0]]
                self.face(vs, material)
                area += part.area
            assert abs(poly.area - area) < 0.005

    def edges(self, poly):
        poly = S.orient_polygons(poly, exterior_cw=False)
        for loop in [poly.exterior, *poly.interiors]:
            pts = list(loop.coords)
            for a, b in zip(pts, pts[1:]):
                a, b = np.array(a), np.array(b)
                v = b - a
                L = np.linalg.norm(v)
                if L < 0.02:
                    continue
                v /= L
                out = np.array([v[1], -v[0]])
                yield a, v, out, L

    def panel(self, frame, x0, x1, y0, y1, offset, mat):
        a, v, out, _ = frame
        if x1 - x0 < 0.025 or y1 - y0 < 0.025:
            return

        def point(x, y):
            p = a + v * x + out * offset
            return [p[0], y, p[1]]

        self.face([point(x0, y0), point(x0, y1), point(x1, y1), point(x1, y0)], mat)

    def boundary(self, poly, lo, hi, m):
        for edge in self.edges(poly):
            self.panel(edge, 0, edge[3], lo, hi, 0, m)

    def glass(self, b, poly, excluded_starts=(), display_height=None):
        typ = b["kind"]
        count = b["facadeDivisions"]
        lo = b["baseM"]
        H = b["displayHeightM"] if display_height is None else display_height
        dy = H / count
        if typ == "teachingLink":
            count = 2
        if typ in ("stadium", "cultural"):
            count = 3
            dy = H / count
        for frame in self.edges(poly):
            a, v, out, L = frame
            if L < 3 or tuple(a) in excluded_starts:
                continue
            # Hide panels on interfaces with another physical building of the same group.
            neighbourTop = -1e9
            mid = a + 0.5 * L * v + out * 0.13
            for other in rows:
                if other["code"] != b["code"] and shapes[other["code"]].covers(
                    S.Point(*mid)
                ):
                    height = other["displayHeightM"]
                    if other["kind"] == "link":
                        # An open guard does not block the adjacent facade like the deck.
                        height = other.get("facadeEvidence", {}).get("deckAboveBaseM", height)
                    neighbourTop = max(neighbourTop, other["baseM"] + height)
            width = 3.1 if typ in ("dorm", "exchange") else 4.5
            if typ in ("stadium", "cultural"):
                width = 8.0
            n = max(1, round((L - 1.0) / width))
            for i in range(n):
                x0 = 0.55 + (L - 1.1) * i / n
                x1 = 0.55 + (L - 1.1) * (i + 1) / n
                for f in range(count):
                    y0 = lo + dy * (f + 0.21)
                    y1 = lo + dy * (f + 0.76)
                    if (
                        typ in ("dorm", "exchange")
                        and L < 24
                        and n > 2
                        and abs(i - (n - 1) / 2) > 1.1
                    ):
                        continue
                    if typ in ("dorm", "exchange"):
                        x0gap, x1gap = 0.16, 0.16
                    elif typ in ("stadium", "cultural"):
                        x0gap, x1gap = 0.035, 0.035
                    else:
                        x0gap, x1gap = 0.11, 0.11
                    self.panel(
                        frame,
                        x0 + x0gap,
                        x1 - x1gap,
                        max(y0, neighbourTop + 0.05),
                        y1,
                        0.025,
                        2,
                    )


def draw_stadium_front(mesh, poly, row):
    """Replace the field-facing wall with a single joined skin around the north turn."""
    evidence = row["facadeEvidence"]
    coords = list(S.orient_polygons(poly, exterior_cw=False).exterior.coords)[:-1]
    first = coords.index(tuple(evidence["fieldFaceStartXZ"]))
    last = coords.index(tuple(evidence["fieldFaceEndXZ"]))
    path = np.asarray(coords[first : last + 1])
    segments = np.diff(path, axis=0)
    lengths = np.linalg.norm(segments, axis=1)
    cumulative = np.r_[0, np.cumsum(lengths)]
    total = cumulative[-1]
    directions = segments / lengths[:, None]
    normals = np.column_stack((directions[:, 1], -directions[:, 0]))
    # Join offsets at each plan vertex so that the sill and fascia stay continuous.
    miters = np.vstack([normals[0], normals[:-1] + normals[1:], normals[-1]])
    miters[1:-1] /= np.sum(miters[1:-1] * normals[:-1], axis=1)[:, None]

    runs = evidence["blueWindowRunsFromNorth"]
    stations = set(cumulative.tolist())
    for intervals in runs.values():
        for start, stop in intervals:
            stations.update([(1 - start) * total, (1 - stop) * total])
    joint_centres = np.linspace(0, total, round(total / 1.45) + 1)[1:-1]
    half_joint = 0.027
    for center in joint_centres:
        stations.update([center - half_joint, center + half_joint])

    # Roof-to-ribbon spacing and the relative ribbon widths follow the 2026 close
    # photograph. These display heights are relative to the existing estimated datum.
    # Points define (height above base, horizontal offset); material describes the
    # surface running upward from that point to the next one, including thin returns.
    surfaces = [
        (0, 0, "panel"),
        (3.63, 0, "trim"), (3.68, .06, "trim"), (3.74, .06, "trim"),
        (3.77, -.08, "lower"), (5.25, -.08, "trim"),
        (5.28, .06, "trim"), (5.35, .06, "trim"), (5.38, 0, "panel"),
        (7.24, 0, "trim"), (7.28, .06, "trim"), (7.34, .06, "trim"),
        (7.37, -.08, "middle"), (8.90, -.08, "trim"),
        (8.93, .06, "trim"), (9.00, .06, "trim"), (9.03, 0, "panel"),
        (9.19, 0, "lightPanel"), (10.78, 0, "panel"),
        (10.98, 0, "trim"), (11.02, .06, "trim"), (11.08, .06, "trim"),
        (11.11, -.08, "upper"), (12.63, -.08, "trim"),
        (12.66, .06, "trim"), (12.73, .06, "trim"), (12.76, 0, "panel"),
        (14.52, 0, "trim"), (14.56, .04, "trim"), (14.60, 0, None),
    ]
    base, height = row["baseM"], row["displayHeightM"]
    roof = evidence["roofConstraint"]
    old_height = roof["originalHeightM"]
    main_start = coords.index(tuple(roof["mainBodyStartXZ"]))
    main_body = Polygon(coords[main_start:last + 1])
    visible_body = poly.difference(culture_band)
    low_wing = visible_body.difference(main_body)
    main_wall_starts = set(coords[main_start:last])
    mesh.cap(visible_body, base, 5, up=False)
    roof_surfaces = evidence.get("roofSurfaceEvidence", {}).get("roofSurfacePatches", [])
    finish_materials = {"charcoal": STADIUM_CHARCOAL_ROOF, "blueGrey": STADIUM_BLUE_GREY_ROOF}
    roof_patches = [(Polygon(patch["ringXZ"]), finish_materials[patch["material"]]) for patch in roof_surfaces]
    assert all(patch.is_valid and main_body.covers(patch) for patch, _ in roof_patches)
    if roof_patches:
        footprint = unary_union([patch for patch, _ in roof_patches])
        mesh.cap(main_body.difference(footprint), base + height, 1, up=True)
        for patch, material in roof_patches:
            mesh.cap(patch, base + height, material, up=True)
    else:
        mesh.cap(main_body, base + height, 1, up=True)
    mesh.cap(low_wing, base + old_height, 1, up=True)
    # The photograph constrains the connected field-side hall. Its northern
    # connecting wing keeps the old eave, joined to the main roof along plan bends.
    transition = np.asarray(coords[main_start]) - path[-1]
    span = np.linalg.norm(transition)
    tangent = transition / span
    riser = (path[-1], tangent, np.array([tangent[1], -tangent[0]]), span)
    mesh.panel(riser, 0, span, base + old_height, base + height, 0, 5)
    excluded = {tuple(point) for point in path[:-1]}
    for frame in mesh.edges(visible_body):
        if tuple(frame[0]) not in excluded:
            wall_height = height if tuple(frame[0]) in main_wall_starts else old_height
            mesh.panel(frame, 0, frame[3], base, base + wall_height, 0, 5)
    mesh.glass(row, visible_body, excluded_starts=excluded, display_height=old_height)

    previous, previous_station = None, None
    for station in sorted(stations):
        seg = min(np.searchsorted(cumulative, station, side="right") - 1, len(lengths) - 1)
        fraction = (station - cumulative[seg]) / lengths[seg]
        position = path[seg] + directions[seg] * (station - cumulative[seg])
        normal = (1 - fraction) * miters[seg] + fraction * miters[seg + 1]
        # Fade the reveal into the untouched wall at the two ends of the frontage.
        normal *= min(1, station / 0.65, (total - station) / 0.65)
        section = []
        for y, offset, _ in surfaces:
            x, z = position + normal * offset
            absolute_y = base if y == 0 else base + height - old_height + y
            section.append([x, absolute_y, z])
        if previous is not None:
            mid = (station + previous_station) / 2
            from_north = 1 - mid / total
            joint = np.any(np.abs(joint_centres - mid) < half_joint)
            for i, (_, _, kind) in enumerate(surfaces[:-1]):
                if kind == "trim":
                    material = STADIUM_TRIM
                elif any(a <= from_north <= b for a, b in runs.get(kind, [])):
                    material = STADIUM_FRAME if joint else STADIUM_GLASS
                elif kind in ("lower", "middle", "upper"):
                    material = STADIUM_FRAME if joint else STADIUM_GREY
                else:
                    material = STADIUM_JOINT if joint else 5
                mesh.face([previous[i], previous[i + 1], section[i + 1], section[i]], material)
        previous, previous_station = section, station


def draw_s1_center(mesh, poly, row):
    band = row["facadeEvidence"]["southeastCenterBand"]
    start, end = band["edgeFromNortheastXZ"]
    frame = next(
        edge for edge in mesh.edges(poly)
        if np.allclose(edge[0], start, rtol=0, atol=0.01)
        and np.allclose(edge[0] + edge[1] * edge[3], end, rtol=0, atol=0.01)
    )
    x0, x1 = (fraction * frame[3] for fraction in band["spanFromNortheast"])
    y0 = row["baseM"] + band["displayPodiumM"]
    y1 = row["baseM"] + row["displayHeightM"]
    trim = band["displayTrimWidthM"]
    mesh.panel(frame, x0, x1, y0, y1, 0.045, S1_CENTER_PANEL)
    mesh.panel(frame, x0, x0 + trim, y0, y1, 0.075, S1_CENTER_FRAME)
    mesh.panel(frame, x1 - trim, x1, y0, y1, 0.075, S1_CENTER_FRAME)


def draw_s4_vertical_frames(mesh, poly, row):
    evidence = row["facadeEvidence"]["southeastVerticalFrames"]
    start, end = evidence["edgeFromNortheastXZ"]
    frame = next(
        edge for edge in mesh.edges(poly)
        if np.allclose(edge[0], start, rtol=0, atol=0.01)
        and np.allclose(edge[0] + edge[1] * edge[3], end, rtol=0, atol=0.01)
    )
    base = row["baseM"]
    height = row["displayHeightM"]
    lower, upper = (
        base + fraction * height
        for fraction in evidence["displayHeightFraction"]
    )
    half_width = evidence["displayWidthM"] / 2
    centres = sorted((1 - fraction) * frame[3] for fraction in evidence["centresFromSouthwest"])
    for centre in centres:
        mesh.panel(frame, centre - half_width, centre + half_width, lower, upper, 0.05, 0)

    # Secondary divisions in the photograph follow the main bands at roughly thirds.
    # Keep the existing floor heights and subdivisions along the other walls.
    lefts = [0.55] + [centre + half_width for centre in centres]
    rights = [centre - half_width for centre in centres] + [frame[3] - 0.55]
    typical_width = float(np.median(np.diff(centres))) / 3
    divisions = row["facadeDivisions"]
    floor = height / divisions
    for left, right in zip(lefts, rights, strict=True):
        cells = max(1, round((right - left) / typical_width))
        width = (right - left) / cells
        for cell in range(cells):
            x0 = left + cell * width + 0.12
            x1 = left + (cell + 1) * width - 0.12
            for level in range(divisions):
                y0 = base + floor * (level + 0.21)
                y1 = base + floor * (level + 0.76)
                mesh.panel(frame, x0, x1, y0, y1, 0.025, 2)
    return tuple(frame[0])


def draw_roof_glazing(mesh, shape, control, base, top):
    endpoints = np.array(control["edgeXZ"])
    eave = top - control["displayEaveDepthM"]
    front = None
    for edge in mesh.edges(shape):
        origin, axis, _, length = edge
        candidates = np.array([origin, origin + axis * length])
        offsets = np.linalg.norm(candidates[:, None] - endpoints[None, :], axis=2)
        if offsets.min(axis=1).max() < 0.01:
            front = edge
        mesh.panel(edge, 0, length, eave, top, 0.03, 0)
    assert front is not None
    mesh.panel(front, 0.7, front[3] - 0.7, base + 0.31, eave - 0.075, 0.025, 2)


def draw_roof_apron_eaves(mesh, poly, row, control):
    path = control["pathXZ"]
    spans = {frozenset((tuple(a), tuple(b))) for a, b in zip(path, path[1:])}
    excluded = set()
    base = row["baseM"]
    for frame in mesh.edges(poly):
        a, direction, _, length = frame
        end = np.round(a + direction * length, 3)
        if frozenset((tuple(a), tuple(end))) not in spans:
            continue
        excluded.add(tuple(a))
        for lo, hi in control["relativeGlazingM"]:
            mesh.panel(frame, 0.06, length - 0.06, base + lo, base + hi, 0.025, 2)
            mesh.panel(frame, 0, length, base + hi, base + hi + control["displayFasciaM"], 0.075, 0)
    return excluded


def mesh_node(row, geometry):
    m = Mesh()
    ref = row["baseM"]
    high = ref + row["displayHeightM"]
    kind = row["kind"]
    for p in polygons(geometry):
        if kind == "entranceGarden":
            draw_gate(m, p, row, prism)
        elif row["code"] == "stadium":
            draw_stadium_front(m, p, row)
        elif row["code"] == "culture":
            draw_culture(m, p, row, culture_band, culture_bridge, culture_material_start, prism)
        elif row["code"] == "stand-2":
            draw_east_stand(m, p, row, prism, stand_material_start)
        elif row["code"] == "service-S6-S7":
            draw_tengwang(m, p, row, tengwang_material_start)
        elif row["code"] == "S2":
            draw_s2(m, p, row, s2_material_start)
        elif row["code"] == "J1":
            draw_j1(m, p, row, j1_material_start, prism)
        elif row["code"] == "J4":
            draw_j4(m, p, row, j4_material_start, prism)
        elif row["code"] == "J5":
            draw_boya(m, p, row, boya_material_start)
        elif row["code"] == "J-link-3":
            draw_j34_wing(m, p, row, j34_wing_material_start, prism)
        elif kind == "stand":
            # Orient ascending rows away from the field, using the long axis of the plan rectangle.
            coords = np.array(p.minimum_rotated_rectangle.exterior.coords)[:-1]
            directions = np.roll(coords, -1, axis=0) - coords
            axis = directions[np.argmin(np.linalg.norm(directions, axis=1))]
            axis /= np.linalg.norm(axis)
            if (axis[0] > 0) != (row["code"] == "stand-2"):
                axis = -axis
            across = np.array([-axis[1], axis[0]])
            lo, hi = np.min(coords @ axis), np.max(coords @ axis)
            for i in range(6):
                a = lo + (hi - lo) * i / 6
                b = lo + (hi - lo) * (i + 1) / 6
                clip = Polygon(
                    [
                        u * axis + t * across
                        for u, t in ((a, -1500), (b, -1500), (b, 1500), (a, 1500))
                    ]
                )
                for s in polygons(p.intersection(clip)):
                    prism(m, s, ref, ref + row["displayHeightM"] * (i + 1) / 6, 6, 6)
        elif kind == "link":
            draw_central_link(m, p, row, central_link_material_start, prism)
        else:
            inset = Polygon(row["roofInset"]["ring"]) if "roofInset" in row else None
            finish = row.get("roofFinishEvidence", {})
            bands = [Polygon(ring) for ring in finish.get("bandsXZ", [])]
            assert all(band.is_valid and geometry.covers(band) for band in bands)
            bands = [band for band in bands if p.covers(band)]
            caps = [band for band in bands]
            if inset is not None:
                caps.append(inset)
            roof_cut = unary_union(caps) if bands else inset
            prism(m, p, ref, high, 5 if kind in ("stadium", "cultural") else 0, 1, roof_cut)
            for band in bands:
                m.cap(band, high, roof_finish_slots[row["code"]], True)
            if inset is not None:
                h = high - row["roofInset"]["depthM"]
                m.cap(inset, h, 3, True)
                for ed in m.edges(inset):
                    a, v, out, L = ed
                    reversedEdge = (a + v * L, -v, -out, L)
                    m.panel(reversedEdge, 0, L, h, high, 0.0, 3)
            for part in row.get("roofAccessories", {}).get("parts", []):
                accessory = Polygon(part["ring"])
                if p.covers(accessory):
                    top = high + part["displayHeightM"]
                    prism(m, accessory, high, top, 3, 0 if part["kind"] == "housing" else 4)
                    if glazing := part.get("glazedFront"):
                        draw_roof_glazing(m, accessory, glazing, high, top)
            if row.get("streetFacade"):
                draw_front, first_material = tower_facades[row["code"]]
                edge_start = draw_front(m, p, row, first_material)
                m.glass(row, p, excluded_starts=(edge_start,))
            elif kind != "ancillary":
                measured_start = ()
                if eaves := row.get("facadeEvidence", {}).get("roofApronEaves"):
                    measured_start = draw_roof_apron_eaves(m, p, row, eaves)
                if row["code"] == "S4" and row.get("facadeEvidence", {}).get("southeastVerticalFrames"):
                    measured_start = (draw_s4_vertical_frames(m, p, row),)
                m.glass(row, p, excluded_starts=measured_start)
                if row["code"] == "S1" and row.get("facadeEvidence", {}).get("southeastCenterBand"):
                    draw_s1_center(m, p, row)
                if row.get("facadeEvidence", {}).get("innerWing"):
                    connector = next(b for b in rows if b["code"] == "service-S6-S7")
                    draw_tengwang_wing(
                        m, p, row, tengwang_material_start, connector["baseM"] + connector["displayHeightM"]
                    )
    prims = []
    for material, (v, n, ids) in sorted(m.groups.items()):
        if len(v) == 0:
            continue
        idxWidth = "<u2" if len(v) <= 65535 else "<u4"
        fmt = 5123 if idxWidth == "<u2" else 5125
        prims.append(
            {
                "attributes": {
                    "POSITION": attribute(v, "<f4", 5126),
                    "NORMAL": attribute(n, "<f4", 5126),
                },
                "indices": attribute(ids, idxWidth, fmt, "SCALAR", 34963),
                "material": material,
            }
        )
    assert prims, row["code"]
    ii = len(meta["meshes"])
    meta["meshes"].append({"name": row["code"], "primitives": prims})
    node = {
        "name": row["name"],
        "mesh": ii,
        "extras": {
            "buildingId": row["code"],
            "relativeHeightM": row["displayHeightM"],
            "baseElevationM": row["baseM"],
            "heightBasis": row["heightBasis"],
        },
    }
    if row.get("placeAliases"):
        node["extras"]["facilities"] = row["placeAliases"]
    if "streetFacade" in row:
        node["extras"]["streetFacade"] = row["streetFacade"]
    if "roofFinishEvidence" in row:
        node["extras"]["roofFinishEvidence"] = row["roofFinishEvidence"]
    if row.get("facadeEvidence"):
        node["extras"]["facadeEvidence"] = row["facadeEvidence"]
    if row.get("roofAccessories"):
        node["extras"]["roofAccessories"] = row["roofAccessories"]
    if "entryGarden" in row:
        garden = row["entryGarden"]
        node["extras"].update(
            inscription=garden["inscription"],
            panelCount=garden["panelCount"],
            photo=garden["photo"]["page"],
            lettering=garden["lettering"],
            plan=row["planSource"],
            identification=row["identificationSource"],
            positionBasis=row["positionBasis"],
        )
        for key in ("southwestPavilion", "northeastPavilion"):
            if pavilion := garden.get(key):
                node["extras"][key] = pavilion
    meta["nodes"][0]["children"].append(len(meta["nodes"]))
    meta["nodes"].append(node)


for b in rows:
    mesh_node(b, shapes[b["code"]])
meta["buffers"] = [{"byteLength": len(binary)}]
raw = json.dumps(meta, ensure_ascii=False, separators=(",", ":")).encode()
raw += b" " * ((-len(raw)) % 4)
out = (
    struct.pack("<4sII", b"glTF", 2, 28 + len(raw) + len(binary))
    + struct.pack("<I4s", len(raw), b"JSON")
    + raw
    + struct.pack("<I4s", len(binary), b"BIN\0")
    + binary
)
(here / "huangbohai-buildings.glb").write_bytes(out)
print(len(out), "bytes", len(rows), "objects")
