"""J1's stepped athletics frontage, reconstructed from the university flyover."""
import numpy as np
from shapely import get_parts
from shapely.geometry import Polygon

J1_MATERIALS = [
    ("J1 浅石色外框", (223, 224, 219)),
    ("J1 玻璃深处", (79, 105, 121)),
    ("J1 玻璃主面", (113, 136, 148)),
    ("J1 凹槽和底层", (104, 111, 115)),
    ("J1 暗灰窗框", (149, 164, 171)),
    ("J1 灰色屋面", (181, 190, 192)),
]


def draw_j1(mesh, footprint, row, first_material, prism):
    stone, shadow_glass, glazing, shadow, frame_trim, roof = range(first_material, first_material + 6)
    evidence = row["facadeEvidence"]
    base = row["baseM"]
    origin, end = np.array(evidence["athleticsEdgeXZ"])
    along = end - origin
    along /= np.linalg.norm(along)
    inward = np.array([along[1], -along[0]])

    def plan_rect(bounds):
        a, b, c, d = bounds
        return Polygon([origin + along * x + inward * z for x, z in [(a,c), (b,c), (b,d), (a,d)]])

    podium = footprint.intersection(plan_rect(evidence["podiumBoundsM"]))
    upper = podium.intersection(plan_rect(evidence["upperBoundsM"]))
    recess = upper.buffer(-.38, join_style=2)
    service_wing = footprint.difference(podium)
    lower_cap, podium_cap, recess_cap, main_cap = (base + h for h in evidence["datumHeightsM"])

    def returns(edge, a, b, sill, head, depth):
        point, direction, out, _ = edge

        def xyz(station, y, offset):
            x, z = point + direction * station + out * offset
            return [x, y, z]

        for corners in [
            [(a,sill,0),(a,head,0),(a,head,depth),(a,sill,depth)],
            [(b,sill,depth),(b,head,depth),(b,head,0),(b,sill,0)],
            [(a,sill,depth),(b,sill,depth),(b,sill,0),(a,sill,0)],
            [(a,head,0),(b,head,0),(b,head,depth),(a,head,depth)],
        ]:
            mesh.face([xyz(*v) for v in corners], shadow)

    def window_courses(edge, lo, hi, courses, count, margin):
        length = edge[3]
        if not count:
            mesh.panel(edge, 0, length, lo, hi, 0, stone)
            return
        first, last = margin, length - margin
        unit = (last - first) / count
        recess_offset = -.22
        previous = lo
        for sill, head in courses:
            sill, head = base + sill, base + head
            mesh.panel(edge, 0, length, previous, sill, 0, stone)
            mesh.panel(edge, 0, first, sill, head, 0, stone)
            mesh.panel(edge, last, length, sill, head, 0, stone)
            for i in range(count):
                a = first + i * unit
                b = first + (i + 1) * unit
                margin_frame = min(.115, .045 * unit)
                left, right = a + margin_frame, b - margin_frame
                mesh.panel(edge, a, left, sill, head, 0, stone)
                mesh.panel(edge, right, b, sill, head, 0, stone)
                returns(edge, left, right, sill, head, recess_offset)
                # The flyover shows unequal lights set between the wide pale piers.
                split = left + .32 * (right - left)
                mesh.panel(edge, left, split - .065, sill, head, recess_offset, shadow_glass)
                mesh.panel(edge, split - .065, split + .065, sill, head, recess_offset, frame_trim)
                mesh.panel(edge, split + .065, right, sill, head, recess_offset, glazing)
            previous = head
        mesh.panel(edge, 0, length, previous, hi, 0, stone)

    def photographed_courses(edge, lo, hi, openings_rows):
        _, direction, _, length = edge
        reversed_from_photo = np.dot(direction, along) < 0
        previous = lo
        depth = -.22
        for record in reversed(openings_rows):
            top, bottom = record["fromTop"]
            sill, head = hi - bottom * (hi - lo), hi - top * (hi - lo)
            mesh.panel(edge, 0, length, previous, sill, 0, stone)
            openings = record["fromPhotoLeft"]
            if reversed_from_photo:
                openings = [(1 - right, 1 - left) for left, right in reversed(openings)]
            cursor = 0
            for left, right in openings:
                start, end = length * left, length * right
                mesh.panel(edge, cursor, start, sill, head, 0, stone)
                returns(edge, start, end, sill, head, depth)
                mesh.panel(edge, start, end, sill, head, depth, glazing)
                cursor = end
            mesh.panel(edge, cursor, length, sill, head, 0, stone)
            previous = head
        mesh.panel(edge, 0, length, previous, hi, 0, stone)

    def volume(poly, lo, hi, courses, roof_cut=None, photographed_rows=None):
        surface = poly if roof_cut is None else poly.difference(roof_cut)
        mesh.cap(surface, hi, roof, up=True)
        for edge in mesh.edges(poly):
            _, _, out, length = edge
            track_side = np.dot(out, -inward) > .98
            visible_end = np.dot(out, -along) > .98
            if track_side and length > 30:
                if photographed_rows:
                    photographed_courses(edge, lo, hi, photographed_rows)
                else:
                    window_courses(edge, lo, hi, courses, round(length / 5.4), 2.65)
            elif visible_end and length > 10:
                window_courses(edge, lo, hi, courses, round(length / 5.8), 2.2)
            else:
                # Retain neutral facade detail along the long unphotographed side.
                count = round(length / 7) if length >= 35 else 0
                window_courses(edge, lo, hi, courses, count, 2.7)

    mesh.cap(footprint, base, shadow, up=False)
    mesh.boundary(footprint, base, lower_cap, shadow)
    for edge in mesh.edges(footprint):
        _, _, out, length = edge
        if np.dot(out, -inward) <= .98 or length < 50:
            continue
        bays = round(length / 5.6)
        for i in range(bays):
            start, end = i * length / bays, (i + 1) * length / bays
            mesh.panel(edge, start + .7, end - .7, base + 1.45, base + 4.7, .012, shadow_glass)
    for wing in get_parts(service_wing):
        if wing.area > 1e-6:
            mesh.cap(wing, lower_cap + 2.7, roof, up=True)
            mesh.boundary(wing, lower_cap, lower_cap + 2.7, stone)
    volume(podium, lower_cap, podium_cap, evidence["podiumGlassRelativeM"], recess)
    prism(mesh, recess, podium_cap, recess_cap, shadow, shadow, roofCut=upper)
    housings = [plan_rect(bounds) for bounds in evidence["roofVolumesBoundsM"]]
    roof_cut = housings[0].union(housings[1])
    upper_track = evidence.get("upperTrackFacade", {})
    volume(upper, recess_cap, main_cap, evidence["upperGlassRelativeM"], roof_cut, upper_track.get("openingsRows"))
    for housing in housings:
        prism(mesh, housing, main_cap, base + row["displayHeightM"], stone, roof)
