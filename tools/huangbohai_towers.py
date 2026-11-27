"""The road-facing G1 and G2 facades, fitted to the visible divisions in a campus video."""

import numpy as np

G1_FACADE_MATERIALS = [
    ("G1浅色立面竖框", (219, 220, 214)),
    ("G1深色立面开间", (70, 81, 83)),
    ("G1浅灰立面墙板", (153, 163, 163)),
    ("G1首层深灰墙面", (94, 103, 104)),
]


G2_FACADE_MATERIALS = [
    ("G2浅色立面分框", (217, 219, 214)),
    ("G2深灰窗面", (76, 89, 92)),
    ("G2灰色墙面分格", (145, 155, 155)),
    ("G2首层深色墙面", (96, 105, 105)),
]


def facade_from_photo(mesh, footprint, data, light):
    left, right = map(np.array, data["edgeFromPhotoLeftXZ"])
    frame = next(
        entry for entry in mesh.edges(footprint)
        if (
            np.linalg.norm(entry[0] - left) < .01
            and np.linalg.norm(entry[0] + entry[1] * entry[3] - right) < .01
        ) or (
            np.linalg.norm(entry[0] - right) < .01
            and np.linalg.norm(entry[0] + entry[1] * entry[3] - left) < .01
        )
    )
    anchor, along, out, length = frame
    reversed_in_photo = np.linalg.norm(anchor - left) > .01

    def physical(l, r):
        if reversed_in_photo:
            l, r = 1 - r, 1 - l
        return l * length, r * length

    def painted(l, r, low, high, offset, material):
        begin, end = physical(l, r)
        mesh.panel(frame, begin, end, low, high, offset, material)

    def face_point(s, y, offset):
        where = anchor + along * s + out * offset
        return [where[0], y, where[1]]

    def raised(l, r, low, high):
        begin, end = physical(l, r)
        depth = data["displayReliefM"]
        mesh.panel(frame, begin, end, low, high, depth, light)
        corners = [(begin, low), (begin, high), (end, high), (end, low)]
        for (s0, y0), (s1, y1) in zip(corners, corners[1:] + corners[:1]):
            mesh.face([
                face_point(s1, y1, .025), face_point(s1, y1, depth),
                face_point(s0, y0, depth), face_point(s0, y0, .025),
            ], light)

    return tuple(anchor), painted, raised


def draw_g1_front(mesh, footprint, row, first_material):
    data = row["streetFacade"]
    base, height = row["baseM"], row["displayHeightM"]
    bottom, top = base + height * data["podiumFraction"], base + height - .28
    light, dark, panel, plinth = range(first_material, first_material + 4)

    start, painted, raised = facade_from_photo(mesh, footprint, data, light)
    painted(.013, .987, base + .12, bottom, .025, plinth)
    rails = [bottom + (1 - t) * (top - bottom) for t in data["barPositionsImageY"]]
    for l, r in data["openBaysImageX"]:
        painted(l, r, bottom, top, .039, dark)
        for rail in rails:
            raised(l, r, rail - .073, rail + .074)
    for l, r in data["wallBaysImageX"]:
        painted(l, r, bottom, top, .032, panel)
        width = r - l
        for rail, next_rail in zip(rails, rails[1:]):
            pitch = rail - next_rail
            painted(l + .59 * width, l + .85 * width, next_rail + pitch * .24,
                    rail - pitch * .15, .052, dark)
    for center in data["pierCentersImageX"]:
        raised(center - .009, center + .009, bottom, top)
    return start


def draw_g2_front(mesh, footprint, row, first_material):
    data = row["streetFacade"]
    light, glass, grey, plinth = range(first_material, first_material + 4)
    start, painted, raised = facade_from_photo(mesh, footprint, data, light)
    base, height = row["baseM"], row["displayHeightM"]
    bottom, top = base + height * data["podiumFraction"], base + height - .28

    painted(.012, .988, base + .12, bottom, .025, plinth)
    painted(.011, .985, bottom, top, .029, grey)
    pier_half_width = .010
    piers = data["pierCentersImageX"]
    rails = [bottom + (1 - t) * (top - bottom) for t in data["beltPositionsImageY"]]
    # Leave a small solid band under the eave and above the ground floor.
    levels = [top - .81, *rails, bottom + .64]
    for left_pier, right_pier in zip(piers, piers[1:]):
        left, right = left_pier + pier_half_width, right_pier - pier_half_width
        bars = [u for u in data["mullionCentersImageX"] if left < u < right]
        choices = [left, *bars, right]
        for a, b in zip(choices, choices[1:]):
            width = b - a
            for upper, lower in zip(levels, levels[1:]):
                rise = upper - lower
                painted(a + .14 * width, b - .15 * width, lower + rise * .16,
                        upper - rise * .13, .046, glass)
    for middle in data["mullionCentersImageX"]:
        painted(middle - .0025, middle + .0025, bottom, top, .061, light)
    for center in piers:
        raised(center - pier_half_width, center + pier_half_width, bottom, top)
    return start
