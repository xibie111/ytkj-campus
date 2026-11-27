"""Build the photographed culture-centre bands and the adjacent raised passage."""

import numpy as np
import shapely as S
from shapely.geometry import LineString, Point, Polygon


CULTURE_MATERIALS = [
    ("文化中心银白横板", (198, 207, 211)),
    ("文化中心灰银窗间板", (164, 176, 184)),
    ("文化中心浅色檐线", (227, 231, 227)),
    ("文化中心蓝灰玻璃", (85, 115, 139)),
    ("文化中心首层通高玻璃", (61, 83, 93)),
    ("文化中心幕墙竖缝", (150, 165, 174)),
    ("文化中心架空廊底", (78, 90, 103)),
    ("文化中心架空钢柱", (170, 179, 183)),
]


def facing_ribbon(mesh, frame, heights, station, trim_m, joint_m, window, material_start):
    white, grey, trim, glass, tall_glass, joint, *_ = range(material_start, material_start + len(CULTURE_MATERIALS))
    _, _, _, length = frame
    absolute_length = station(frame[0], frame[1], length)
    divisions = max(1, round(length / joint_m))
    for k in range(divisions):
        a, b = k * length / divisions, (k + 1) * length / divisions
        for bottom, top, band in heights:
            material = window(band, absolute_length((a + b) / 2))
            if band == "base":
                material = tall_glass
            elif band == "trim":
                material = trim
            elif material is None:
                material = grey if band in ("low", "middle", "upper") else white
            mesh.panel(frame, a, b - trim_m, bottom, top, 0, material)
            mesh.panel(frame, b - trim_m, b, bottom, top, 0, joint if band != "trim" else trim)


def silhouette_partition(culture, stadium, evidence):
    """Split the two traced roofs at the ends of the dark passage in overhead imagery."""
    north_a, north_b, south_b, south_a = np.asarray(evidence["roofCornersXZ"], dtype=float)
    north_axis = north_b - north_a
    north_axis /= np.linalg.norm(north_axis)
    south_axis = south_b - south_a
    south_axis /= np.linalg.norm(south_axis)
    width = 135
    band = Polygon([
        north_a - width * north_axis, north_b + width * north_axis,
        south_b + width * south_axis, south_a - width * south_axis,
    ])
    # The original independent maps have a narrow seam between these two roofs.
    combined = S.union(culture, stadium).buffer(2.2, quad_segs=4).buffer(-2.2, quad_segs=4)
    shell = band.intersection(combined)
    assert shell.geom_type == "Polygon" and shell.is_valid
    return band, shell


def draw_culture(mesh, original, row, band, bridge, material_start, prism):
    ev = row["facadeEvidence"]
    base = row["baseM"]
    roof = base + row["displayHeightM"]
    visible = LineString(ev["northwestFaceXZ"])
    wall = original.difference(band)
    assert wall.geom_type == "Polygon"
    mesh.cap(wall, base, 5, up=False)
    rooftop_core = Polygon(row["roofInset"]["ring"])
    assert wall.covers(rooftop_core)
    mesh.cap(wall.difference(rooftop_core), roof, 1, up=True)
    mesh.cap(rooftop_core, roof, 3, up=True)
    profile = [
        (0.0, .208, "base"), (.208, .220, "trim"),
        (.220, .314, "low"), (.314, .325, "trim"),
        (.325, .431, "silver"), (.431, .443, "trim"),
        (.443, .551, "middle"), (.551, .563, "trim"),
        (.563, .669, "silver"), (.669, .681, "trim"),
        (.681, .789, "upper"), (.789, .801, "trim"),
        (.801, .907, "clerestory"), (.907, .919, "trim"),
        (.919, .988, "silver"), (.988, 1.0, "trim"),
    ]
    heights = [(base + a*(roof-base), base + b*(roof-base), mat) for a, b, mat in profile]
    hidden_starts = []
    length = visible.length
    def station(a, direction, _length):
        return lambda distance: visible.project(Point(*(a + direction * distance))) / length
    def window(section, t):
        spans = ev["visibleGlazingRuns"].get(section, [])
        if any(lo <= t <= hi for lo, hi in spans):
            return material_start + 3
        return None
    for frame in mesh.edges(wall):
        a, u, _, width = frame
        mid = Point(*(a + u * width / 2))
        if visible.distance(mid) < 0.36 and band.boundary.distance(mid) > .36:
            hidden_starts.append(tuple(a))
            facing_ribbon(mesh, frame, heights, station, .065, 1.42, window, material_start)
        else:
            mesh.panel(frame, 0, width, base, roof, 0, 5)
            if band.boundary.distance(mid) < .36:
                hidden_starts.append(tuple(a))
    mesh.glass(row, wall, excluded_starts=hidden_starts)
    draw_passage(mesh, bridge, ev["raisedPassage"], material_start, prism, base)


def draw_passage(mesh, shape, ev, material_start, prism, base):
    ground, low, top = [base + level for level in ev["relativeLevelsM"]]
    white, grey, trim, glass, _, joint, ceiling, post = range(material_start, material_start + len(CULTURE_MATERIALS))
    mesh.cap(shape, top, 3, up=True)
    mesh.cap(shape, low, ceiling, up=False)
    profile = [
        (low, low+.14, "trim"),
        (low+.14, low+(top-low)*.27, "silver"),
        (low+(top-low)*.27, low+(top-low)*.30, "trim"),
        (low+(top-low)*.30, low+(top-low)*.51, "middle"),
        (low+(top-low)*.51, low+(top-low)*.54, "trim"),
        (low+(top-low)*.54, low+(top-low)*.76, "upper"),
        (low+(top-low)*.76, low+(top-low)*.79, "trim"),
        (low+(top-low)*.79, top-.10, "silver"),
        (top-.10, top, "trim"),
    ]
    front = LineString([ev["roofCornersXZ"][0], ev["roofCornersXZ"][3]])
    for frame in mesh.edges(shape):
        a, direction, _, width = frame
        mid = Point(*(a + direction * width / 2))
        if front.distance(mid) <= 3.5:
            def distance(start, tangent, _):
                return lambda at: front.project(Point(*(start + tangent * at))) / front.length
            def window(section, t):
                return glass if section == "upper" and t > .51 else None
            facing_ribbon(mesh, frame, profile, distance, .065, 1.42, window, material_start)
        else:
            mesh.panel(frame, 0, width, low, top, 0, grey)
    for p in ev["columnCentresXZ"]:
        column = Point(*p).buffer(.43, quad_segs=4)
        assert shape.buffer(.05).covers(column)
        prism(mesh, column, ground, low, post, post)
