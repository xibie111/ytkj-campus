"""Build the two visible elevations and the roof of Boya teaching building, J5.

The school guide shows the southwest framed glass and the southeast vertical
fins. Only the walls facing the J1–J4 group and the southeast boundary use
these assemblies. Heights, bay spacing and construction sections are estimates.
"""
import numpy as np
from shapely.geometry import Polygon
from shapely.ops import unary_union


BOYA_MATERIALS = [
    ("博雅楼浅色外框", (221, 224, 221)),
    ("博雅楼深色幕墙", (69, 89, 103)),
    ("博雅楼蓝灰玻璃", (101, 126, 140)),
    ("博雅楼窗框与阴影", (91, 105, 112)),
    ("博雅楼屋面", (178, 180, 172)),
    ("博雅楼屋面深色分区", (127, 136, 135)),
]


def draw_elevation(mesh, frame, base, top, floors, screen, materials):
    stone, deep_glass, light_glass, frame_grey = materials[:4]
    origin, axis, normal, length = frame
    height = top - base
    left, right = ((.035, .965) if screen else (.15, .855))
    left, right = left * length, right * length
    sill = base + height * (.105 if screen else .095)
    head = top - height * (.075 if screen else .115)
    recess = .54 if screen else .42

    def point(x, y, depth):
        xz = origin + axis * x + normal * depth
        return [xz[0], y, xz[1]]

    def returned(corners, expected_normal, material):
        vertices = np.array([point(*p) for p in corners])
        face_normal = np.cross(vertices[1]-vertices[0], vertices[2]-vertices[0])
        if np.dot(face_normal, expected_normal) < 0:
            vertices = vertices[::-1]
        mesh.face(vertices, material)

    def lining(a, b, low, high, depth, material):
        along = np.array([axis[0], 0, axis[1]])
        returned([(a, low, 0), (a, high, 0), (a, high, -depth), (a, low, -depth)], along, material)
        returned([(b, low, 0), (b, high, 0), (b, high, -depth), (b, low, -depth)], -along, material)
        returned([(a, low, 0), (a, low, -depth), (b, low, -depth), (b, low, 0)], [0, 1, 0], material)
        returned([(a, high, 0), (a, high, -depth), (b, high, -depth), (b, high, 0)], [0, -1, 0], material)

    mesh.panel(frame, 0, left, base, top, 0, stone)
    mesh.panel(frame, right, length, base, top, 0, stone)
    mesh.panel(frame, left, right, base, sill, 0, stone)
    mesh.panel(frame, left, right, head, top, 0, stone)
    lining(left, right, sill, head, recess, stone)

    # Subdivide the glass skin at the transoms and mullions so these faces
    # partition the opening. The projecting fins then have actual side faces.
    bays = round((right-left) / (2.25 if screen else 2.9))
    xs = np.linspace(left, right, bays + 1)
    grid = [sill, head]
    for floor in range(1, floors):
        level = base + height * floor / floors
        if sill < level - .10 < level + .10 < head:
            grid += [level - .10, level + .10]
    grid.sort()
    fin_top = base + height * .72
    for i, (x0, x1) in enumerate(zip(xs, xs[1:])):
        joint = .11 if i else 0
        glass = light_glass if screen or i in (0, 1, bays-2, bays-1) else deep_glass
        if joint:
            mesh.panel(frame, x0, x0+joint, sill, head, -recess, frame_grey)
        for k, (lo, hi) in enumerate(zip(grid, grid[1:])):
            mesh.panel(frame, x0+joint, x1, lo, hi, -recess, frame_grey if k % 2 else glass)
        if screen and i:
            a, b = x0-.14, x0+.14
            mesh.panel(frame, a, b, sill, fin_top, -.025, stone)
            along = np.array([axis[0], 0, axis[1]])
            for x, side in ((a, -along), (b, along)):
                returned([(x,sill,-.025),(x,fin_top,-.025),(x,fin_top,-recess),(x,sill,-recess)], side, stone)
            returned([(a,fin_top,-.025),(a,fin_top,-recess),(b,fin_top,-recess),(b,fin_top,-.025)], [0,1,0], stone)


def draw_boya(mesh, footprint, row, first_material):
    materials = tuple(range(first_material, first_material + len(BOYA_MATERIALS)))
    stone, _, _, frame, deck_material, dark_zone = materials
    evidence = row["facadeEvidence"]
    roofs = evidence["roofParts"]
    base = row["baseM"]
    top = base + row["displayHeightM"]
    deck = top - evidence["parapetHeightM"]
    inner = footprint.buffer(-evidence["parapetWidthM"], join_style="mitre")
    inset = Polygon(row["roofInset"]["ring"])
    parts = [Polygon(r["ring"]) for r in roofs]
    assert all(inner.contains(zone) and not inset.intersects(zone) for zone in parts)
    assert abs(unary_union(parts).area - sum(p.area for p in parts)) < .001
    mesh.cap(footprint, base, stone, False)
    mesh.cap(footprint.difference(inner), top, stone, True)
    mesh.cap(inner.difference(unary_union([inset, *parts])), deck, deck_material, True)

    def inner_wall(polygon, lo, hi):
        for start, direction, outside, length in mesh.edges(polygon):
            reverse = (start + length * direction, -direction, -outside, length)
            mesh.panel(reverse, 0, length, lo, hi, 0, frame)

    inner_wall(inner, deck, top)
    inset_bottom = top - row["roofInset"]["depthM"]
    inner_wall(inset, inset_bottom, deck)
    mesh.cap(inset, inset_bottom, 3, True)
    for area, control in zip(parts, roofs):
        rise = control["heightAboveDeckM"]
        if rise:
            mesh.boundary(area, deck, deck + rise, stone)
        mesh.cap(area, deck + rise, dark_zone if control["kind"] == "field" else 1, True)
    # Slim, dark divisions are legible across the southwest side of the long
    # roof volume in the campus guide. Its short end also shows three openings.
    long_room = parts[0]
    southwest = np.array([-1., 1.]) / np.sqrt(2)
    southeast = np.array([1., 1.]) / np.sqrt(2)
    for edge in mesh.edges(long_room):
        length = edge[3]
        if np.dot(edge[2], southwest) > .9:
            count = round(length / .95)
        elif np.dot(edge[2], southeast) > .9:
            count = 3
        else:
            continue
        for center in np.linspace(.11*length, .89*length, count):
            mesh.panel(edge, center-.14, center+.14, deck+.25,
                       deck+roofs[0]["heightAboveDeckM"]-.25, .018, frame)

    facade_edges = {tuple(evidence["southwestStartXZ"]): False,
                    tuple(evidence["southeastStartXZ"]): True}
    found = set()
    for edge in mesh.edges(footprint):
        start = tuple(edge[0])
        if start in facade_edges:
            draw_elevation(mesh, edge, base, top, row["facadeDivisions"], facade_edges[start], materials)
            found.add(start)
        else:
            mesh.panel(edge, 0, edge[3], base, top, 0, 0)
    assert found == set(facade_edges)
    mesh.glass(row, footprint, excluded_starts=found)
