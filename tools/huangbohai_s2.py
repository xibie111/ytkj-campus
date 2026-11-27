"""Rebuild the southeast S2 window ribbons, inset vertical spine and lowered top."""
import numpy as np
from shapely.geometry import Polygon


S2_MATERIALS = [
    ("S2翼楼浅石色窗带", (226, 224, 211)),
    ("S2翼楼灰色窗间墙", (156, 161, 160)),
    ("S2深色立面板", (80, 87, 88)),
    ("S2冷灰玻璃", (111, 139, 151)),
    ("S2窗框", (88, 101, 105)),
]


def draw_s2(mesh, footprint, row, first_material):
    stone, grey, dark, glass, metal = range(first_material, first_material + 5)
    evidence = row["facadeEvidence"]
    base, height = row["baseM"], row["displayHeightM"]
    top = base + height

    # The traced SE frontage runs from the NE corner to the SW corner. Refer
    # distances to its measured endpoints rather than a rectangularized plan.
    start = np.array(evidence["southeastFaceStartXZ"])
    frames = list(mesh.edges(footprint))
    front = next(f for f in frames if np.linalg.norm(f[0] - start) < .02)
    origin, axis, normal, length = front
    ne, sw = (length * x for x in evidence["spineFromNortheast"])
    core_top = top - evidence["spineDropM"]
    set_back = evidence["spineRecessM"]
    notch = evidence["roofNotchDepthM"]

    def plan(x, depth):
        return origin + axis*x + normal*depth

    def vert(x, y, depth):
        xz = plan(x, depth)
        return np.array([xz[0], y, xz[1]])

    def face(corners, expected, material):
        points = np.array([vert(*corner) for corner in corners])
        if np.dot(np.cross(points[1]-points[0], points[2]-points[0]), expected) < 0:
            points = points[::-1]
        mesh.face(points, material)

    def panel(a, b, low, high, depth, material):
        mesh.panel(front, a, b, low, high, depth, material)

    def slot(a, b, y0, y1, surface, recess, material):
        """A true inset with four returns. The normal points at the opening."""
        along = [axis[0],0,axis[1]]
        face([(a,y0,surface),(a,y1,surface),(a,y1,recess),(a,y0,recess)], along, material)
        face([(b,y0,surface),(b,y1,surface),(b,y1,recess),(b,y0,recess)], -np.array(along), material)
        face([(a,y0,surface),(b,y0,surface),(b,y0,recess),(a,y0,recess)], [0,1,0], material)
        face([(a,y1,surface),(b,y1,surface),(b,y1,recess),(a,y1,recess)], [0,-1,0], material)

    def window_segment(a, b, y0, y1, plane, pier):
        # The opening contains two glazing lights and a real central divider.
        rim = .075
        panel(a,b,y0,y0+rim,plane,pier)
        panel(a,b,y1-rim,y1,plane,pier)
        mid = (a+b)/2
        for left,right,mat in [(a,a+rim,pier),(a+rim,mid-.035,glass),(mid-.035,mid+.035,metal),
                               (mid+.035,b-rim,glass),(b-rim,b,pier)]:
            panel(left,right,y0+rim,y1-rim,plane,mat)

    mouth = Polygon([plan(ne,.1),plan(sw,.1),plan(sw,-notch),plan(ne,-notch)])
    lowered = Polygon([plan(ne,-set_back),plan(sw,-set_back),plan(sw,-notch),plan(ne,-notch)])
    mesh.cap(footprint.difference(mouth), top, 1, True)
    mesh.cap(lowered, core_top, 1, True)
    mesh.cap(footprint.difference(Polygon([plan(ne,.1),plan(sw,.1),plan(sw,-set_back),plan(ne,-set_back)])), base, 0, False)
    panel(ne,sw,core_top,top,-notch,grey)
    along = np.array([axis[0],0,axis[1]])
    for x, direction in [(ne,along),(sw,-along)]:
        face([(x,base,0),(x,core_top,0),(x,core_top,-set_back),(x,base,-set_back)], direction,stone)
        face([(x,core_top,0),(x,top,0),(x,top,-notch),(x,core_top,-notch)], direction,stone)
    excluded = {tuple(front[0])}
    for frame in frames:
        if tuple(frame[0]) not in excluded:
            mesh.panel(frame,0,frame[3],base,top,0,0)
    mesh.glass(row,footprint,excluded_starts=excluded)

    pitch = evidence["coursePitchM"]
    high = top
    front_base = base + evidence["podiumM"]
    # Photo rectification shows eleven complete courses above the podium and
    # a twelfth only partly exposed directly behind the podium cornice.
    for course in range(12):
        head = top - .41 - course*pitch
        sill = max(front_base, head - pitch*.72)
        if head <= sill:
            break
        for a,b,count in [(0,ne,8),(sw,length,6)]:
            panel(a,b,head,high,0,stone)
            inner0,inner1 = a+.56,b-.56
            panel(a,inner0,sill,head,0,stone)
            panel(inner1,b,sill,head,0,stone)
            slot(inner0,inner1,sill,head,0,-.30,grey)
            # Rectified photographs show one dark infill for each pair of windows.
            # Work in pairs, retaining the unequal six/eight wing widths on the plan.
            unit = (inner1-inner0)/(count/2)
            for pair in range(count//2):
                x = inner0+unit*pair
                for left,right,typ in [(0,.29,"glass"),(.29,.47,"panel"),(.47,.76,"glass"),(.76,1,"wall")]:
                    l,r = x+unit*left,x+unit*right
                    if typ=="glass":
                        window_segment(l,r,sill,head,-.30,metal)
                    else:
                        panel(l,r,sill,head,-.30,dark if typ=="panel" else grey)
        high = sill
    for a,b in [(0,ne),(sw,length)]:
        panel(a,b,base,high,0,stone)

    # Continuous gray centre pier, a dark vertical insert and one window on
    # each side. Upper course is omitted where the centre steps down.
    high = core_top
    for course in range(1,12):
        head = min(core_top, top - .41 - course*pitch)
        sill = max(front_base,head - pitch*.69)
        if head <= sill:
            break
        panel(ne,sw,head,high,-set_back,grey)
        cuts=[ne+(sw-ne)*v for v in (0,.09,.34,.41,.59,.66,.91,1)]
        for j,(a,b) in enumerate(zip(cuts,cuts[1:])):
            if j in (1,5):
                slot(a,b,sill,head,-set_back,-set_back-.17,grey)
                window_segment(a,b,sill,head,-set_back-.17,metal)
            else:
                panel(a,b,sill,head,-set_back,dark if j==3 else grey)
        high=sill
    panel(ne,sw,base,high,-set_back,grey)
