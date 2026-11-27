"""Refine the observed east frontage of the J3–J4 teaching wing."""
import numpy as np
from shapely.geometry import Polygon


J34_WING_MATERIALS = [
    ("J3–J4 连接翼浅色横带", (219, 218, 211)),
    ("J3–J4 连接翼蓝灰玻璃", (89, 115, 130)),
    ("J3–J4 连接翼深色窗套", (112, 123, 127)),
    ("J3–J4 连接翼深绿色屋面", (106, 123, 103)),
]


def draw_j34_wing(mesh, footprint, row, material_start, prism):
    stone, glazing, reveal, roof_colour = range(material_start, material_start + 4)
    base = row["baseM"]
    top = base + row["displayHeightM"]
    control = row["facadeEvidence"]
    pair = np.array(control["eastFaceXZ"])
    edges = list(mesh.edges(footprint))

    def is_confirmed_face(frame):
        start, direction, _, length = frame
        candidates = np.array([start, start + direction * length])
        matched = np.linalg.norm(candidates[:, None] - pair[None, :], axis=2).min(axis=1)
        return max(matched) < .025

    front = next((frame for frame in edges if is_confirmed_face(frame)), None)
    if front is None:
        prism(mesh, footprint, base, top)
        mesh.glass(row, footprint)
        return

    roof = Polygon(control["roofColourRingXZ"]).intersection(footprint)
    mesh.cap(footprint.difference(roof), top, 1, up=True)
    mesh.cap(roof, top, roof_colour, up=True)
    mesh.cap(footprint, base, 0, up=False)
    skip = tuple(front[0])
    for frame in edges:
        if tuple(frame[0]) != skip:
            mesh.panel(frame, 0, frame[3], base, top, 0, 0)
    mesh.glass(row, footprint, excluded_starts={skip})

    origin, axis, outward, length = front
    margin = 1
    span = (length - 2 * margin) / control["windowBays"]

    def panel(a, b, low, high, depth, material):
        mesh.panel(front, a, b, low, high, depth, material)

    def rect(point, y, offset):
        x, z = origin + axis * point + outward * offset
        return [x, y, z]

    def returns(a, b, sill, head, inset):
        for points in [
            [(a, sill, 0), (a, head, 0), (a, head, inset), (a, sill, inset)],
            [(b, sill, inset), (b, head, inset), (b, head, 0), (b, sill, 0)],
            [(a, sill, inset), (b, sill, inset), (b, sill, 0), (a, sill, 0)],
            [(a, head, 0), (b, head, 0), (b, head, inset), (a, head, inset)],
        ]:
            mesh.face([rect(*point) for point in points], reveal)

    last = base
    for low, high, setback in control["relativeGlazingM"]:
        sill, head = base + low, base + high
        panel(0, length, last, sill, 0, stone)
        panel(0, margin, sill, head, 0, stone)
        panel(length - margin, length, sill, head, 0, stone)
        inset = -setback
        for i in range(control["windowBays"]):
            a, b = margin + span * i, margin + span * (i + 1)
            left, right = a + .17, b - .17
            panel(a, left, sill, head, 0, stone)
            panel(right, b, sill, head, 0, stone)
            returns(left, right, sill, head, inset)
            first = left + (right - left) / 3
            second = right - (right - left) / 3
            panel(left, first - .046, sill, head, inset, glazing)
            panel(first - .046, first + .046, sill, head, inset, reveal)
            panel(first + .046, second - .046, sill, head, inset, glazing)
            panel(second - .046, second + .046, sill, head, inset, reveal)
            panel(second + .046, right, sill, head, inset, glazing)
        last = head
    panel(0, length, last, top, 0, stone)
