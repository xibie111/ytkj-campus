"""J4's southern teaching wing and the deep opening visible in the flyover."""
import numpy as np
from shapely import get_parts
from shapely.geometry import Polygon

J4_MATERIALS = [
    ("J4 浅石色外框", (222, 221, 215)),
    ("J4 蓝灰玻璃", (96, 120, 134)),
    ("J4 窄窗与凹槽", (72, 92, 104)),
    ("J4 深灰底层", (105, 110, 114)),
    ("J4 灰色屋面", (171, 180, 180)),
]


def draw_j4(mesh, footprint, row, first_material, prism):
    stone, glass, recess, base_wall, roof = range(first_material, first_material + 5)
    detail = row["facadeEvidence"]
    base = row["baseM"]
    head = base + detail["mainEaveRelativeM"]
    podium = base + detail["podiumEaveRelativeM"]
    street = base + detail["baseEaveRelativeM"]
    origin, end = np.array(detail["longitudinalAxisXZ"])
    along = end - origin
    along /= np.linalg.norm(along)
    inward = np.array([along[1], -along[0]])

    def bounds(coords):
        a, b, c, d = coords
        return Polygon([origin + along * x + inward * z for x, z in ((a, c), (b, c), (b, d), (a, d))])

    tower = footprint.intersection(bounds(detail["mainBoundsM"]))
    low_wing = footprint.intersection(bounds(detail["podiumBoundsM"]))
    north_recess_limit = detail["northRecessToStationM"]

    def wall(edge, lo, hi, courses, main):
        start, vector, normal, length = edge
        front = np.dot(normal, -inward) > .96
        rear = np.dot(normal, inward) > .96
        visible_end = np.dot(normal, -along) > .96
        if length < 12 or not (front or rear or visible_end or main):
            mesh.panel(edge, 0, length, lo, hi, 0, stone)
            return
        margin = 2.5 if length > 30 else 2
        n = max(2, round(length / (5.2 if front else 6.1)))
        width = (length - 2 * margin) / n

        def slab(a,b,sill,top,depth,mat):
            mesh.panel(edge,a,b,sill,top,depth,mat)

        def reveal(a,b,sill,top,depth):
            def pt(x,y,o):
                xz = start + vector*x + normal*o
                return [xz[0], y, xz[1]]

            for corners in (
                [(a,sill,0),(a,top,0),(a,top,depth),(a,sill,depth)],
                [(b,sill,depth),(b,top,depth),(b,top,0),(b,sill,0)],
                [(a,sill,depth),(b,sill,depth),(b,sill,0),(a,sill,0)],
                [(a,top,0),(b,top,0),(b,top,depth),(a,top,depth)],
            ):
                mesh.face([pt(*corner) for corner in corners], recess)

        lower = lo
        for index, (sill_rel, top_rel) in enumerate(courses):
            sill, top = base+sill_rel, base+top_rel
            slab(0,length,lower,sill,0,stone)
            slab(0,margin,sill,top,0,stone)
            slab(length-margin,length,sill,top,0,stone)
            bays = [(margin + bay * width, margin + (bay + 1) * width) for bay in range(n)]
            recessed = []
            if main and front and index == 2:
                recessed = [
                    i for i, (a, b) in enumerate(bays)
                    if np.dot(start + vector * (a + b) * .5 - origin, along) < north_recess_limit
                ]
                if recessed:
                    a, b = bays[recessed[0]][0], bays[recessed[-1]][1]
                    reveal(a, b, sill, top, -.94)
            for i, (a, b) in enumerate(bays):
                left, right = a + .14, b - .14
                if i in recessed:
                    # Build one continuous inset gallery with the piers inside the face.
                    sill_inset, head_inset = sill + .64, top - .52
                    slab(a,b,sill,sill_inset,-.94,recess)
                    slab(a,b,head_inset,top,-.94,recess)
                    slab(a,left,sill_inset,head_inset,-.94,recess)
                    slab(left,right,sill_inset,head_inset,-.94,glass)
                    slab(right,b,sill_inset,head_inset,-.94,recess)
                    continue
                depth = -.19
                slab(a,left,sill,top,0,stone)
                slab(right,b,sill,top,0,stone)
                reveal(left,right,sill,top,depth)
                split = left + (right - left) * .37
                slab(left,split-.10,sill,top,depth,recess)
                slab(split-.10,split+.10,sill,top,depth,stone)
                slab(split+.10,right,sill,top,depth,glass)
            lower = top
        slab(0,length,lower,hi,0,stone)

    # The linked teaching buildings remain distinct nodes. These courses stop
    # at J4's own footprint and do not raise the neighbouring connecting wing.
    mesh.cap(footprint,base,base_wall,up=False)
    mesh.boundary(footprint,base,street,base_wall)
    for part in get_parts(footprint.difference(low_wing)):
        if part.area > 1e-6:
            mesh.cap(part,street,roof,up=True)
    for edge in mesh.edges(low_wing):
        wall(edge,street,podium,detail["podiumGlassRelativeM"],False)
    mesh.cap(low_wing.difference(tower),podium,roof,up=True)
    for edge in mesh.edges(tower):
        wall(edge,podium,head,detail["mainGlassRelativeM"],True)
    housings = [bounds(coords) for coords in detail["roofVolumesBoundsM"]]
    mesh.cap(tower.difference(housings[0].union(housings[1])),head,roof,up=True)
    for housing in housings:
        prism(mesh,housing,head,base+row["displayHeightM"],stone,roof)
