"""Rebuild the Dongshan boundary road from the school's plan and photograph."""
import argparse
import json
from pathlib import Path

import numpy as np
from scipy.interpolate import PchipInterpolator
from scipy.ndimage import gaussian_filter1d
from scipy.optimize import minimize_scalar
from shapely.geometry import LineString, Point, Polygon


TOOLS = Path(__file__).resolve().parent


def stations(points):
    return np.r_[0, np.cumsum(np.linalg.norm(np.diff(points, axis=0), axis=1))]


def at_stations(distance, points, target):
    return np.column_stack([np.interp(target, distance, column) for column in points.T])


def registered_plan(source, start, end):
    points = np.asarray(source, dtype=float)[::-1]
    line = LineString(points)
    join = line.interpolate(line.project(Point(start)))
    on = np.asarray(join.coords[0])
    nearest = np.argmin(np.linalg.norm(points - on, axis=1))
    if line.project(Point(points[nearest])) < line.project(join):
        nearest += 1
    points = np.vstack([on, points[nearest:]])
    vector = points[:, 0] + points[:, 1] * 1j
    mapped = (vector - vector[0]) / (vector[-1] - vector[0])
    mapped = mapped * (complex(*end) - complex(*start)) + complex(*start)
    points = np.column_stack([mapped.real, mapped.imag])
    distance = stations(points)
    samples = np.linspace(0, distance[-1], 250)
    return samples, PchipInterpolator(distance, points)(samples)


def build(source):
    start, end = np.asarray(source["endXZ"])
    end_levels = np.asarray(source["endY"])
    photo = LineString(source["imageAxisHalfPx"])
    view = source["camera"]
    origin = np.asarray(view["origin"])
    translation = np.asarray(view["translation"])
    basis = np.asarray(view["basis"])
    principal = np.asarray(view["principalPoint"])
    focal = view["focalLengthPx"]
    samples, plan = registered_plan(source["planAxisXZ"], start, end)

    def project(xz, heights):
        xyz = np.column_stack([xz[:, 0], heights, xz[:, 1]])
        camera = (xyz - translation - origin) @ basis
        return (camera[:, :2] / camera[:, 2:] * focal + principal) / 2

    limits = [photo.project(Point(uv)) for uv in project(plan[[0, -1]], end_levels)]
    image_points = [photo.interpolate(s).coords[0] for s in np.linspace(*limits, len(plan))]
    rays = np.column_stack([(np.asarray(image_points) * 2 - principal) / focal, np.ones(len(plan))]) @ basis.T
    # One-third weight for the photograph's cross-track displacement. Preserve
    # both registered ends, where the existing road and square locate the join.
    initial = np.interp(samples, samples[[0, -1]], end_levels)
    heights = initial
    for _ in range(5):
        along = (heights - translation[1] - origin[1]) / rays[:, 1]
        xz = (origin + rays * along[:, None] + translation)[:, [0, 2]]
        photo_line = LineString(gaussian_filter1d(xz, 2, axis=0, mode="nearest"))
        nearby = np.asarray([photo_line.interpolate(photo_line.project(Point(pt))).coords[0] for pt in plan])
        road = plan + (nearby - plan) / 3
        road += ((start - road[0]) * np.maximum(0, 1 - samples / 16)[:, None]
                 + (end - road[-1]) * np.maximum(0, 1 - (samples[-1] - samples) / 20)[:, None])
        distance = stations(road)
        heights = np.interp(distance, [0, LineString(road).length], end_levels)

    # Solve only five height controls. The source is an oblique photograph.
    # The endpoint-interpolated profile regularizes the height estimate.
    length = LineString(road).length
    control_distance = np.linspace(0, length, 5)
    control_points = at_stations(distance, road, control_distance)
    photo_levels = np.asarray([
        minimize_scalar(lambda h: photo.distance(Point(project(pt[None, :], [h])[0])),
                        bounds=(18, 55), method="bounded").x for pt in control_points
    ])
    photo_levels += np.interp(control_distance, [0, length], end_levels - photo_levels[[0, -1]])
    linear = np.interp(control_distance, [0, length], end_levels)
    grade = np.interp(distance, control_distance, (photo_levels + linear) / 2)
    vertices = np.r_[np.arange(0, length, 3), length]

    record = source["record"]
    segment = record["segments"][0]
    segment["ring"] = at_stations(distance, road, vertices).round(3).tolist()
    segment["dongshanBoundaryGrade"]["levelsMetres"] = np.interp(vertices, distance, grade).round(3).tolist()
    walk_axis = at_stations(distance, road, np.arange(2., 69., 2))
    tangent = np.gradient(walk_axis, axis=0)
    tangent /= np.linalg.norm(tangent, axis=1)[:, None]
    normal = np.column_stack([tangent[:, 1], -tangent[:, 0]])
    walk = np.vstack([walk_axis + normal * 3.25, (walk_axis + normal * 5.3)[::-1]])
    if not Polygon(walk).is_valid:
        raise ValueError("The walking band's edges intersect.")
    record["areas"][0]["ring"] = walk.round(3).tolist()
    return record


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--controls", type=Path, default=TOOLS / "data/dongshan-boundary-road-controls.json")
    parser.add_argument("--out", type=Path, default=TOOLS.parent / "dist/data/dongshan-boundary-road.json")
    args = parser.parse_args()
    result = build(json.loads(args.controls.read_bytes()))
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
