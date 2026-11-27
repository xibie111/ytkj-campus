"""The athletics eastern stand, identified by the sports hall immediately behind it.

School photographs 38 and 40, published 2026-09-20:
https://www.ytkj.edu.cn/info/1081/8367.htm
https://www.ytkj.edu.cn/__local/C/34/EC/FB8B1C97623C68BAF7CB4C57552_3533962E_87F32.jpg

The full view identifies a north blue bank, a larger south rose-red bank, four
end stair aisles and an opening below the central landing. Event banners are
omitted. The six seating bands follow the visible tier rhythm. Their profiles,
the passage clear height and support sections are estimates within the existing
plan footprint and display-height envelope, not measured construction details.
"""
import numpy as np
from shapely.geometry import Polygon


STAND_MATERIALS = [
    ("东看台蓝色座席", (61, 113, 163)),
    ("东看台暗红座席", (153, 84, 109)),
    ("东看台灰色混凝土", (177, 179, 176)),
    ("东看台深灰栏杆", (96, 103, 106)),
]


def draw_east_stand(mesh, footprint, row, prism, first_material):
    """Build both solid seating terraces and the physically open central passage."""
    blue, rose, concrete, rail = range(first_material, first_material + 4)
    coords = np.asarray(footprint.minimum_rotated_rectangle.exterior.coords)[:-1]
    edges = np.roll(coords, -1, axis=0) - coords
    depth = edges[np.argmin(np.linalg.norm(edges, axis=1))]
    depth = depth / np.linalg.norm(depth)
    if depth[0] < 0:
        depth = -depth
    along = np.array([-depth[1], depth[0]])  # from north to south
    north, south = min(coords @ along), max(coords @ along)
    front, back = min(coords @ depth), max(coords @ depth)
    length, width = south-north, back-front
    base, height = row["baseM"], row["displayHeightM"]

    def block(s0, s1, d0, d1, y0, y1, material):
        corners = [(north+s)*along + (front+d)*depth
                   for s, d in ((s0, d0), (s1, d0), (s1, d1), (s0, d1))]
        section = Polygon(corners).intersection(footprint)
        if section.area > .0001:
            prism(mesh, section, base+y0, base+y1, material, material)

    # Fractions refer to distance along the full eastern stand, not image pixels.
    opening_start, opening_end = .381*length, .466*length
    lower_terrace, upper_terrace = .28*height, .81*height
    seat_front, seat_back = .14*width, .85*width
    pitch = (seat_back-seat_front)/6
    riser = (upper_terrace-lower_terrace)/6

    def guard(s0, s1, d, platform):
        rail_height = height-platform
        # A slender horizontal bar is seated on posts, including at both ends.
        for station in np.linspace(s0+.04, s1-.04, int(np.ceil((s1-s0)/2.4))+1):
            block(station-.035, station+.035, d-.035, d+.035, platform, height-.06, rail)
        block(s0, s1, d-.045, d+.045, platform+rail_height-.06, height, rail)

    for s0, s1, outer_aisle, inner_aisle, colour in (
        (0, opening_start, 2.35, 1.60, blue),
        (opening_end, length, 1.65, 2.60, rose),
    ):
        bank_start, bank_end = s0+outer_aisle, s1-inner_aisle
        block(s0, s1, 0, seat_front, 0, lower_terrace, concrete)
        for i in range(6):
            d = seat_front + i*pitch
            level = lower_terrace + (i+1)*riser
            block(bank_start, bank_end, d, d+pitch, 0, level, concrete)
            # Keep the seat and its back on this tread. The remaining front
            # portion stays exposed concrete, separating successive rows.
            lip = d+.74*pitch
            block(bank_start, bank_end, d+.31*pitch, lip, level, level+.20, colour)
            block(bank_start, bank_end, lip, d+.85*pitch, level, level+.39, colour)
            for a, b in ((s0, bank_start), (bank_end, s1)):
                for j in range(3):
                    top = level-riser+(j+1)*riser/3
                    block(a, b, d+j*pitch/3, d+(j+1)*pitch/3, 0, top, concrete)
        block(s0, s1, seat_back, width, 0, upper_terrace, concrete)

    # A deck behind the passage spans the two banks. The photograph resolves
    # a narrow support on the north side and two side faces. The centre stays
    # open from the track-side apron all the way to the back of the stand.
    soffit = .61*height
    deck_front = .56*width
    block(opening_start, opening_end, deck_front, width, soffit, upper_terrace, concrete)
    for a, b in ((opening_start, opening_start+.34), (opening_end-.34, opening_end)):
        block(a, b, deck_front, width, 0, soffit, concrete)
    pier = opening_start + .25*(opening_end-opening_start)
    block(pier-.28, pier+.28, deck_front, deck_front+.68, 0, soffit, concrete)
    guard(.15, length-.15, .95*width, upper_terrace)
