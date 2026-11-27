"""Campus-facing segment of Xianjing West Road.

The supplied 50 m AMap overview distinguishes the two cross-street bands and
the pale coastal-side pedestrian surface. Two dated reference images were
used for visual checks. All distributable coordinates are generated on the
bundled, attributed OSM street and junction, with approximate dimensions.
"""
import math

from shapely.geometry import LineString, Point, Polygon
from shapely.ops import unary_union


def xianjing_frontage(segments):
    roads = {r["id"]: r for r in segments}
    road = roads[449238285]
    axis = LineString(road["ring"])
    west_drive = LineString(roads[1073365553]["ring"])
    east_drive = LineString(roads[1073365531]["ring"])
    west = axis.intersection(west_drive)
    east = axis.intersection(east_drive)
    if west.geom_type != "Point" or east.geom_type != "Point":
        raise ValueError("Recheck the north-gate frontage against the OSM junctions")
    west_join, east_join = axis.project(west), axis.project(east)
    # The source way runs east to west. Use its junction ordering so directed
    # offsets remain on the sea side if the OSM way orientation is reversed.
    sign = 1 if west_join > east_join else -1
    half = road["width"]/2

    def point(station, inside):
        a, b = axis.interpolate(station-.3), axis.interpolate(station+.3)
        c = axis.interpolate(station)
        dx, dz = b.x-a.x, b.y-a.y
        length = math.hypot(dx, dz)
        # The local map has south-positive Z. On this westbound section its
        # campus-facing verge is southeast, towards the gate forecourt.
        return [c.x+sign*inside*dz/length, c.y-sign*inside*dx/length]

    vertices = [axis.project(Point(p)) for p in axis.coords]

    def strip(start, end, near, far):
        lo, hi = sorted([start, end])
        # Include all source corners, and sample locally to keep both verges
        # parallel to the same carriageway.
        stations = sorted({lo, hi, *[lo+i for i in range(2, math.ceil(hi-lo), 2)],
                            *[s for s in vertices if lo < s < hi]})
        return Polygon([point(s, near) for s in stations]+[point(s, far) for s in reversed(stations)])

    # Keep to the checked frontage, approximately 190 m along the open way.
    start, end = east_join, west_join + sign*69
    sidewalk = strip(start, end, -half-.47, -half-3.45)
    area = dict(id="xianjing-north-frontage-walk", name="仙境西路临海侧人行铺装", style="walk",
                ring=[[round(x,3),round(z,3)] for x,z in sidewalk.exterior.coords[:-1]],
                source="openStreetAxisAndReferenceCheck", geometrySource="https://www.openstreetmap.org/way/449238285",
                sourceLabel="OpenStreetMap 道路轴线与北门影像校核",
                referenceDate="2025-06-02",
                basis="位置沿开放道路轴线，范围据北门前地面影像校核。步带宽与收头为模型近似，未取得市政实测横断面。")
    # Offsets and band widths are rounded interpretations of the supplied
    # scale bar. Individual stripe widths/counts are representative.
    west_cross = west_join + sign*8.5
    east_cross = west_cross - sign*89.5
    cross_width = 4.5
    bars = []
    for station in [west_cross, east_cross]:
        for i in range(15):
            lateral=(i-7)*(road["width"]-.85)/15
            bars.append(strip(station-cross_width/2, station+cross_width/2,
                              lateral-.22, lateral+.22))
    hatch_start, hatch_end = sorted([west_cross, east_cross])
    hatch_start += cross_width/2+.30
    hatch_end -= cross_width/2+.30
    near, far = half-3.75, half-.16
    band = strip(hatch_start, hatch_end, near, far)
    for i in range(math.ceil((hatch_end-hatch_start)/1.22)+2):
        station = hatch_start-1.22 + i*1.22
        marking = LineString([point(station, near-.5), point(station+sign*1.42, far+.5)]).buffer(.16, cap_style="flat")
        bars.append(marking.intersection(band))
    paint = unary_union(bars)
    return area, paint
