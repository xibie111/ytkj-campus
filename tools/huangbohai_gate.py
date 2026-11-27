"""Observed geometry of the Huang-Bohai campus northwest entrance garden."""

import json
from pathlib import Path

import numpy as np
import shapely
from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont
from shapely.geometry import LineString, Polygon, box

ROOT = Path(__file__).resolve().parents[1]
CONTROLS = ROOT / "tools/data/huangbohai-northwest-gate.json"
GATE_MATERIALS = [
    ("景墙浅米色石材", (213, 192, 158)),
    ("校名朱红色字面", (141, 54, 46)),
    ("浅灰石缘", (197, 194, 181)),
    ("入口草坪", (126, 151, 92)),
    ("墙前低篱", (85, 111, 70)),
    ("西北门房浅色檐板", (217, 219, 213)),
    ("西北门房檐底与后墙", (125, 133, 135)),
    ("西北门房玻璃", (63, 91, 94)),
    ("西北门房窗框", (113, 128, 129)),
    ("西北门房屋面暗带", (109, 121, 123)),
]
STONE, LETTERS, CURB, GRASS, HEDGE = range(8, 13)
PAVILION_EAVE, PAVILION_SOFT, PAVILION_GLASS, PAVILION_FRAME, PAVILION_BAND = range(13, 18)


def axis(gate):
    inward = np.array(gate["inwardXZ"])
    return inward / np.linalg.norm(inward)


def xz(gate, across, station):
    inward = axis(gate)
    right = np.array([-inward[1], inward[0]])
    point = np.array(gate["centerXZ"]) + right * across + inward * station
    return point.round(3).tolist()


def to_world(gate, shape):
    return Polygon([xz(gate, u, v) for u, v in shape.exterior.coords])


def ring(shape):
    return [[round(x, 3), round(z, 3)] for x, z in list(shape.exterior.coords)[:-1]]


def panel_plans(gate):
    count = len(gate["inscription"])
    width = gate["panelWidthM"]
    pitch = width + gate["panelGapM"]
    station = gate["wallStationM"]
    half_depth = gate["panelThicknessM"] / 2
    for i in range(count):
        center = (i - (count - 1) / 2) * pitch
        yield to_world(
            gate,
            box(
                center - width / 2,
                station - half_depth,
                center + width / 2,
                station + half_depth,
            ),
        )


def dem_level(dem, position):
    west, north, east, south = dem["boundsCellCentres"]
    x, z = position
    col = (x - west) / (east - west) * (dem["width"] - 1)
    row = (z - north) / (south - north) * (dem["height"] - 1)
    samples = np.asarray(dem["metres"]).reshape(dem["height"], dem["width"])
    i, j = int(col), int(row)
    horizontal = samples[j : j + 2, i] * (1 - (col - i)) + samples[j : j + 2, i + 1] * (
        col - i
    )
    return round(float(horizontal[0] * (1 - (row - j)) + horizontal[1] * (row - j)), 2)


def save_if_changed(path, data):
    if json.loads(path.read_bytes()) != data:
        path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )


def fit_entry_roads(ground, gate, island, phase_boundary):
    """Keep both approaches outside the lawn and connect them to the existing paths."""
    roads = ground["roads"]
    lookup = {r["id"]: r for r in roads}
    drive = lookup["hbh-northwest-entry"]
    walk = lookup["hbh-north-forecourt-walk"]
    inner = lookup["hbh-gate-sports-drive"]["ring"][0]
    across = lookup.get("hbh-northwest-entry-east")
    if across is None:
        across = {"id": "hbh-northwest-entry-east", "kind": "drive"}
        roads.insert(roads.index(drive) + 1, across)
    for branch, side in [(drive, 1), (across, -1)]:
        stations = [
            (9.4, -21.5),
            (10.2, -16),
            (10.55, -8),
            (10.55, 7.1),
            (10.15, 10.2),
            (8.9, 13.2),
            (6.65, 15.65),
            (4.2, 17.0),
        ]
        branch["width"] = 5.2
        branch["ring"] = [xz(gate, side * u, v) for u, v in stations] + [inner]
    # The existing forecourt walk meets the northeastern branch at the side of the island.
    walk["ring"][0] = xz(gate, -10.55, -0.2)
    for road in (drive, across, walk):
        assert LineString(road["ring"]).distance(island) > road["width"] / 2, road["id"]
    # Truncate the forecourt at the georeferenced plan's street-side boundary.
    # The 2025 campus photograph establishes the common paved foreground.
    template = Polygon([(-14.7, -34), (14.7, -34), (14.7, -19),
                        (13.3, -15.0), (-13.3, -15.0), (-14.7, -19)])
    forecourt = to_world(gate, template).union(island.buffer(3.8, quad_segs=8)).convex_hull
    apron = forecourt.intersection(Polygon(phase_boundary)).difference(island)
    aprons = ground.setdefault("roadAprons", [])
    entry = {"id": "hbh-northwest-entry-apron", "kind": "drive", "ring": ring(apron),
             "holes": [ring(island)]}
    for i, other in enumerate(aprons):
        if other["id"] == entry["id"]:
            aprons[i] = entry
            break
    else:
        aprons.append(entry)
    assert apron.intersection(island).area < 0.001
    for branch in (drive, across):
        assert apron.contains(shapely.Point(branch["ring"][0]).buffer(branch["width"] / 2))


def add_gate_record(model, folder):
    gate = json.loads(CONTROLS.read_bytes())
    ground_file = folder / "huangbohai-ground.json"
    ground = json.loads(ground_file.read_bytes())
    radius = gate["islandWidthM"] / 2
    end = gate["islandLengthM"] / 2 - radius
    island = to_world(
        gate, LineString([(0, -end), (0, end)]).buffer(radius, quad_segs=12)
    )
    width = (
        len(gate["inscription"]) * (gate["panelWidthM"] + gate["panelGapM"])
        - gate["panelGapM"]
    ) / 2
    v, half = gate["wallStationM"], gate["panelThicknessM"] / 2
    wall = to_world(gate, box(-width, v - half, width, v + half))
    new = {
        "code": gate["code"],
        "name": gate["name"],
        "kind": "entranceGarden",
        "planSource": gate["plan"],
        "identificationSource": gate["nameSource"],
        "polygons": [{"ring": ring(island), "holes": []}],
        "labelXZ": xz(gate, 0, v),
        "areaM2": round(island.area, 1),
        "displayHeightM": gate["topAboveGradeM"],
        "baseM": dem_level(ground["dem"], gate["centerXZ"]),
        "heightBasis": gate["heightBasis"],
        "positionBasis": gate["positionBasis"],
        "entryGarden": {
            "centerXZ": gate["centerXZ"],
            "inwardXZ": gate["inwardXZ"],
            "signRingXZ": ring(wall),
            "panelRingsXZ": [ring(p) for p in panel_plans(gate)],
            "panelCount": len(gate["inscription"]),
            "lettering": gate["lettering"],
            "inscription": gate["inscription"],
            "photo": gate["photo"],
        },
    }
    for key in ("southwestPavilion", "northeastPavilion"):
        pavilion = gate.get(key)
        if not pavilion:
            continue
        ring_xz = np.asarray(pavilion["roofRingXZ"])
        probes = np.vstack([ring_xz.mean(axis=0), (ring_xz + np.roll(ring_xz, -1, axis=0)) / 2])
        level = round(float(np.median([dem_level(ground["dem"], point) for point in probes])), 3)
        new["entryGarden"][key] = dict(pavilion, baseM=level)
    records = model["buildings"]
    matching = [i for i, row in enumerate(records) if row["code"] == new["code"]]
    if matching:
        assert len(matching) == 1
        records[matching[0]] = new
    else:
        records.append(new)
    fit_entry_roads(ground, gate, island, model["phase1BoundaryXZ"])
    save_if_changed(ground_file, ground)
    save_if_changed(folder / "huangbohai-models.json", model)


class GlyphPen(BasePen):
    """Flatten the project font into closed rings, retaining counters inside the Han glyphs."""

    def __init__(self, glyphs):
        super().__init__(glyphs)
        self.rings = []
        self.points = []

    def _moveTo(self, point):
        self.points = [point]

    def _lineTo(self, point):
        self.points.append(point)

    def _curve(self, controls):
        points = np.array([self.points[-1], *controls], dtype=float)
        for t in np.linspace(0, 1, 7)[1:]:
            level = points
            while len(level) > 1:
                level = level[:-1] * (1 - t) + level[1:] * t
            self.points.append(tuple(level[0]))

    def _qCurveToOne(self, control, end):
        self._curve([control, end])

    def _curveToOne(self, first, second, end):
        self._curve([first, second, end])

    def _closePath(self):
        if len(self.points) > 2:
            self.rings.append(Polygon(self.points))
        self.points = []


def add_inscription(mesh, gate, base):
    exterior = -axis(gate)
    wall_front = gate["wallStationM"] - gate["panelThicknessM"] / 2 - 0.012
    origin = np.asarray(gate["centerXZ"]) - exterior * wall_front
    baseline = np.array([exterior[1], -exterior[0]])
    pitch = gate["panelWidthM"] + gate["panelGapM"]
    inscription = gate["inscription"]
    with TTFont(ROOT / "tools/data/huangbohai-gate-lettering.ttf") as font:
        glyphs = font.getGlyphSet()
        names = font.getBestCmap()
        for i, char in enumerate(inscription):
            pen = GlyphPen(glyphs)
            glyphs[names[ord(char)]].draw(pen)
            shape = Polygon()
            for path in pen.rings:
                shape = shape.symmetric_difference(shapely.make_valid(path))
            left, bottom, right, top = shape.bounds
            # Sub-millimetre curves of the font do not need full tessellation at this sign scale.
            shape = shape.simplify((top - bottom) * 0.0012, preserve_topology=True)
            scale = gate["letterHeightM"] / (top - bottom)
            center = (i - (len(inscription) - 1) / 2) * pitch
            for tri in shapely.constrained_delaunay_triangles(shape).geoms:
                vertices = []
                for x, y in list(tri.exterior.coords)[:3]:
                    px, pz = origin + baseline * (center + (x - (left + right) / 2) * scale)
                    vertices.append([px, base + 0.67 + (y - bottom) * scale, pz])
                a, b, c = np.asarray(vertices)
                if np.dot(np.cross(b - a, c - a)[[0, 2]], exterior) < 0:
                    vertices.reverse()
                mesh.face(vertices, LETTERS)


def draw_hedge(mesh, gate, base):
    """A continuous low planting strip with a rounded, slightly irregular crown."""
    station = gate["wallStationM"] - 0.69
    length = len(gate["inscription"]) * (gate["panelWidthM"] + gate["panelGapM"])
    width_profile = [-1, -1, -0.72, 0, 0.72, 1, 1]
    height_profile = [0, 0.52, 0.85, 1.0, 0.85, 0.52, 0]
    previous = None
    for u in np.linspace(-length / 2, length / 2, 36):
        half_width = 0.32 + 0.035 * np.cos(3.7 * u)
        crown = 0.31 + 0.046 * np.sin(2.4 * u) + 0.022 * np.cos(5.7 * u)
        section = []
        for side, height in zip(width_profile, height_profile):
            px, pz = xz(gate, u, station + side * half_width)
            section.append([px, base + gate["lawnTopM"] + height * crown, pz])
        if previous is not None:
            for i in range(len(section) - 1):
                mesh.face([previous[i], section[i], section[i + 1], previous[i + 1]], HEDGE)
        if previous is None or u == length / 2:
            for i in range(1, len(section) - 1):
                cap = [section[0], section[i], section[i + 1]]
                mesh.face(cap if previous is None else cap[::-1], HEDGE)
        previous = section


def draw_pavilion(mesh, pavilion, prism):
    left, right, rear_right, rear_left = map(np.asarray, pavilion["roofRingXZ"])
    base = pavilion["baseM"]
    foundation_bottom = base - .62
    roof_height = base + pavilion["displayEaveM"]
    eave_bottom = roof_height - pavilion["displayCanopyThicknessM"]

    def point(u, v):
        return (1 - v) * ((1 - u) * left + u * right) + v * ((1 - u) * rear_left + u * rear_right)

    def outline(u0, u1, v0, v1):
        return Polygon([point(u, v) for u, v in ((u0, v0), (u1, v0), (u1, v1), (u0, v1))])

    canopy = Polygon(pavilion["roofRingXZ"])
    band = outline(.095, .865, .59, .72)
    prism(mesh, canopy, eave_bottom, roof_height, PAVILION_EAVE, PAVILION_EAVE, roofCut=band)
    mesh.cap(band, roof_height, PAVILION_BAND, up=True)

    body_front = pavilion.get("bodyFrontFraction", .11)
    body = outline(.06, .94, body_front, .87)
    mesh.cap(body, foundation_bottom, PAVILION_SOFT, up=False)
    fronts = (point(.06, body_front), point(.94, body_front))
    for edge in mesh.edges(body):
        anchor, slope, _, length = edge
        front = all(
            min(np.linalg.norm(candidate - end) for end in (anchor, anchor + length * slope)) < .01
            for candidate in fronts
        )
        if not front:
            mesh.panel(edge, 0, length, foundation_bottom, eave_bottom, 0, PAVILION_SOFT)
            continue
        reverse = np.linalg.norm(anchor - fronts[0]) > .01

        def panel(x0, x1, low, high, offset, material):
            if reverse:
                x0, x1 = length - x1, length - x0
            mesh.panel(edge, x0, x1, low, high, offset, material)

        glass_start, glass_end = length * .21, length * .93
        sill, head = base + .31, eave_bottom - .13
        panel(0, glass_start, foundation_bottom, eave_bottom, 0, PAVILION_EAVE)
        panel(glass_end, length, foundation_bottom, eave_bottom, 0, PAVILION_EAVE)
        panel(glass_start, glass_end, foundation_bottom, sill, 0, PAVILION_SOFT)
        panel(glass_start, glass_end, head, eave_bottom, 0, PAVILION_FRAME)
        dividers = np.linspace(glass_start, glass_end, 8)
        for start, end in zip(dividers, dividers[1:]):
            panel(start, start + .105, sill, head, .035, PAVILION_FRAME)
            panel(start + .105, end, sill, head, 0, PAVILION_GLASS)
        panel(glass_start, glass_end, sill + 1.91, sill + 1.96, .035, PAVILION_FRAME)


def draw_gate(mesh, island, row, prism):
    gate = json.loads(CONTROLS.read_bytes())
    base = row["baseM"]
    lawn = island.buffer(-gate["curbWidthM"])
    mesh.cap(lawn, base + gate["lawnTopM"], GRASS, up=True)
    prism(
        mesh, island.difference(lawn), base - 0.32, base + gate["curbTopM"], CURB, CURB
    )
    for plan in panel_plans(gate):
        prism(
            mesh,
            plan,
            base + gate["lawnTopM"],
            base + gate["topAboveGradeM"],
            STONE,
            STONE,
        )
    draw_hedge(mesh, gate, base)
    add_inscription(mesh, gate, base)
    for key in ("southwestPavilion", "northeastPavilion"):
        if pavilion := row["entryGarden"].get(key):
            draw_pavilion(mesh, pavilion, prism)
