"""The southwest entrance connector observed between S6 and S7. Its rear limit is approximate."""

from contextlib import ExitStack
from pathlib import Path
import numpy as np
import shapely
from shapely.geometry import Polygon
from fontTools.ttLib import TTFont
from huangbohai_gate import GlyphPen

TENGWANG_MATERIALS = [
    ("滕王阁浅灰石材", (222, 220, 205)),
    ("滕王阁浅色屋顶", (200, 204, 199)),
    ("滕王阁檐底", (86, 93, 94)),
    ("滕王阁冷灰玻璃", (100, 128, 137)),
    ("滕王阁金属门框", (164, 169, 166)),
    ("滕王阁招牌金字", (190, 134, 66)),
    ("滕王阁店面红色横带", (174, 77, 67)),
    ("滕王阁门标底", (117, 66, 57)),
    ("餐厅连廊侧宿舍浅色窗带", (220, 219, 206)),
    ("餐厅连廊侧宿舍深灰窗间墙", (115, 123, 124)),
    ("餐厅连廊侧宿舍灰蓝玻璃", (76, 101, 113)),
    ("餐厅连廊侧宿舍深色百叶", (63, 72, 75)),
    ("滕王阁白色檐口接缝", (185, 187, 172)),
]
FONT = Path(__file__).resolve().parent / "data/huangbohai-dining-lettering.ttf"


def draw_tengwang_wing(mesh, footprint, row, first_material, entrance_eave):
    light, cladding, glass, louvre = range(first_material + 8, first_material + 12)
    evidence = row["facadeEvidence"]["innerWing"]
    near, far = map(np.asarray, evidence["edgeFromRestaurantXZ"])
    frame = next(
        edge for edge in mesh.edges(footprint)
        if all(
            min(np.linalg.norm(point - end) for end in (edge[0], edge[0] + edge[1] * edge[3])) < .01
            for point in (near, far)
        )
    )
    origin, _, _, length = frame
    photo_direction_reversed = np.linalg.norm(origin - near) > .01
    base, height = row["baseM"], row["displayHeightM"]

    def panel(left, right, bottom, top, offset, material):
        bottom = max(entrance_eave + .03, bottom)
        if photo_direction_reversed:
            left, right = length - right, length - left
        mesh.panel(frame, left, right, bottom, top, offset, material)

    highest = base + height
    spine_left, spine_right = (length * fraction for fraction in evidence["spineFromRestaurant"])
    margin = .38
    panel(margin, length - margin, base, highest, .035, cladding)
    pale_rails = [(margin, margin + .52), (spine_left - .28, spine_left + .17),
                  (spine_right - .17, spine_right + .28), (length - margin - .52, length - margin)]
    for left, right in pale_rails:
        panel(left, right, base, highest, .115, light)

    spans = [(margin + .52, spine_left - .28), (spine_right + .28, length - margin - .52)]
    pitch = height / row["facadeDivisions"]
    for level in range(row["facadeDivisions"]):
        sill = base + pitch * level
        cap = sill + pitch
        panel(margin, length - margin, sill, sill + pitch * .27, .083, light)
        for (span_start, span_end), bays in zip(spans, evidence["wingBaysFromRestaurant"]):
            width = (span_end - span_start) / bays
            for bay in range(bays):
                left = span_start + width * bay
                low, high = sill + pitch * .31, cap - pitch * .12
                panel(left + .21, left + width * .67, low, high, .058, glass)
                vent_start, vent_end = left + width * .73, left + width - .21
                panel(vent_start, vent_end, low, high, .059, louvre)
                for slat in range(1, 5):
                    y = low + (high - low) * slat / 5
                    panel(vent_start, vent_end, y - .018, y + .018, .071, cladding)
        panel(spine_left + .48, spine_right - .48, sill + pitch * .40, cap - pitch * .19, .061, louvre)
    panel(margin, length - margin, highest - .48, highest, .088, light)


def draw_tengwang(mesh, footprint, row, first_material):
    stone, roof, soffit, glass, frame, gold, red, plaque = range(
        first_material, first_material + 8
    )
    e = row["facadeEvidence"]
    a, b = (np.asarray(e[k]) for k in ("frontFromXZ", "frontToXZ"))
    span = np.linalg.norm(b - a)
    right = (b - a) / span
    front = np.array([-right[1], right[0]])
    mid = (a + b) / 2
    normal = np.array([front[0], 0, front[1]])
    along = np.array([right[0], 0, right[1]])
    up = np.array([0, 1, 0])
    base = row["baseM"]
    height = row["displayHeightM"]
    sill = e["thresholdRiseM"]
    back = -e["frontageAlcoveM"]

    def vertex(x, y, z):
        xp, zp = mid + x * right + z * front
        return [xp, base + y, zp]

    def face(coords, direction, material):
        v = np.array([vertex(*xyz) for xyz in coords])
        if np.cross(v[1] - v[0], v[2] - v[0]) @ direction < 0:
            v = v[::-1]
        mesh.face(v, material)

    def wall(x0, x1, y0, y1, z, material):
        face([(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)], normal, material)

    def deck(x0, x1, z0, z1, y, material, upward=True):
        face([(x0, y, z0), (x0, y, z1), (x1, y, z1), (x1, y, z0)], up if upward else -up, material)

    def cheek(x, y0, y1, z0, z1, direction, material):
        face([(x, y0, z0), (x, y0, z1), (x, y1, z1), (x, y1, z0)], direction, material)

    # All heights remain on the same front datum. The 1.75 m disagreement
    # between the old tower pads is absorbed by a buried skirt at the seams.
    mesh.cap(footprint, base + height, roof, True)
    mesh.cap(footprint, base - 1.25, stone, False)
    for f in mesh.edges(footprint):
        start, axis, _, length = f
        if max(abs((start - mid) @ front), abs((start + axis * length - mid) @ front)) > 0.02:
            mesh.panel(f, 0, length, base - 1.25, base + height, 0, stone)

    half = span / 2
    # Cropped photo width is ~30 m relative to the height of a door. Its
    # extensions to the two tower seams are neutral rather than copied shops.
    observed = 15.05
    fascia_low = 4.82
    wall(-half, half, fascia_low, height, 0, stone)
    if fascia := e.get("fasciaJoints"):
        joint = first_material + 12
        half_joint = fascia["widthM"] / 2
        rows = [fascia_low + fraction * (height - fascia_low) for fraction in fascia["rowsFromBottom"]]
        for level in rows:
            wall(-observed, observed, level - half_joint, level + half_joint, .012, joint)
        lower_edges = [fascia_low, *(level + half_joint for level in rows)]
        upper_edges = [*(level - half_joint for level in rows), height]
        for bottom, top in zip(lower_edges, upper_edges):
            for center in fascia["centresFromFacadeMidM"]:
                wall(center - half_joint, center + half_joint, bottom, top, .012, joint)
    wall(-half, -observed, -1.25, fascia_low, 0, stone)
    wall(observed, half, -1.25, fascia_low, 0, stone)
    deck(-observed, observed, back, 0, fascia_low, soffit, False)
    cheek(-observed, -1.25, fascia_low, back, 0, along, soffit)
    cheek(observed, -1.25, fascia_low, back, 0, -along, soffit)
    wall(-observed, observed, -1.25, sill, back, stone)
    deck(-observed, observed, back, 0.22, sill, stone)

    # The three exposed front nosings run across both door groups.
    for n in range(3):
        top = sill * (3 - n) / 3
        near = 0.22 + n * 0.38
        far = near + 0.38
        deck(-observed, observed, near, far, top, stone)
        wall(-observed, observed, top - sill / 3, top, far, stone)
        cheek(-observed, top - sill / 3, top, near, far, -along, stone)
        cheek(observed, top - sill / 3, top, near, far, along, stone)

    # The official photograph shows glazing above and below the A/B transom.
    for lo, hi, bays in [(-15.05, -9.75, 6), (10.49, 15.05, 6)]:
        for i in range(bays):
            l = lo + (hi - lo) * i / bays
            r = lo + (hi - lo) * (i + 1) / bays
            edge = 0.065
            wall(l, l + edge, sill, 4.11, back, frame)
            wall(l + edge, r, sill, sill + 0.08, back, frame)
            wall(l + edge, r, sill + 0.08, 2.48, back, glass)
            wall(l + edge, r, 2.48, 2.57, back, frame)
            wall(l + edge, r, 2.57, 4.11, back, glass)
        wall(lo, hi, 4.11, fascia_low, back, soffit)

    # The photograph crops before both outer shop boundaries. Reproduce the
    # stable bands and bay divisions inside that crop, without loose merchandise.
    store = (-9.75, 10.49)
    for i in range(8):
        l = store[0] + (store[1] - store[0]) * i / 8
        r = store[0] + (store[1] - store[0]) * (i + 1) / 8
        wall(l, l + 0.14, sill, 2.49, back, stone)
        wall(l + 0.14, r, sill, 2.49, back, glass)
    wall(*store, 2.49, 4.10, back, red)
    wall(*store, 4.10, fascia_low, back, soffit)

    for x in [-11.85, 12.15]:
        circle = [
            (x + 0.39 * np.cos(t), 3.42 + 0.39 * np.sin(t), back + 0.024)
            for t in np.linspace(0, 2 * np.pi, 26, endpoint=False)
        ]
        for i, v in enumerate(circle):
            face([(x, 3.42, back + 0.024), v, circle[(i + 1) % len(circle)]], normal, plaque)

    with ExitStack() as fonts:
        brush = fonts.enter_context(TTFont(FONT))
        sans = fonts.enter_context(TTFont(FONT.with_name("huangbohai-dining-sans.ttf")))
        for text, y, size, pitch, z, center, mat in [
            (e["inscription"], 5.42, 0.91, 2.12, 0.025, 0, gold),
            ("TENGWANG PAVILION RESTAURANT", 5.02, 0.255, 0.34, 0.025, 0, gold),
            ("赵一鸣", 2.68, 0.96, 1.38, back + 0.026, -5.54, stone),
            ("赵一鸣", 2.68, 0.96, 1.38, back + 0.026, 6.08, stone),
            ("A", 3.18, 0.45, 0.5, back + 0.033, -11.85, stone),
            ("B", 3.18, 0.45, 0.5, back + 0.033, 12.15, stone),
        ]:
            ft = brush if text == e["inscription"] else sans
            glyphs = ft.getGlyphSet()
            chars = ft.getBestCmap()
            shapes = {}
            for char in set(text) - {" "}:
                pen = GlyphPen(glyphs)
                glyphs[chars[ord(char)]].draw(pen)
                outline = Polygon()
                for ring in pen.rings:
                    outline = outline.symmetric_difference(shapely.make_valid(ring))
                shapes[char] = outline
            low = min(g.bounds[1] for g in shapes.values())
            high = max(g.bounds[3] for g in shapes.values())
            scale = size / (high - low)
            for i, char in enumerate(text):
                if char == " ":
                    continue
                shape = shapes[char]
                l, bot, r, t = shape.bounds
                shape = shape.simplify((t - bot) * 0.002, preserve_topology=True)
                dx = center + (i - (len(text) - 1) / 2) * pitch
                for triangle in shapely.constrained_delaunay_triangles(shape).geoms:
                    if triangle.area * scale * scale < 0.000015:
                        continue
                    face(
                        [
                            (dx + (u - (l + r) / 2) * scale, y + (v - low) * scale, z)
                            for u, v in list(triangle.exterior.coords)[:3]
                        ],
                        normal,
                        mat,
                    )
