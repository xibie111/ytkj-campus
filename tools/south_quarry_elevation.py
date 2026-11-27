"""Reconstruct the measured south-side cut on the existing 20 m terrain lattice.

Use the ATL08 cut fit and the laser profiles of the low slope and eastern
exposed bench. Each fit uses its own optical support on the same lattice.
"""
from collections import defaultdict
from hashlib import sha256
import json
import math
from pathlib import Path

import numpy as np
from scipy.interpolate import LinearNDInterpolator
from scipy.optimize import least_squares
from scipy.spatial import ConvexHull, cKDTree
from shapely import contains_xy, distance, points
from shapely.geometry import Polygon
from south_cut_slope import eastern_cut_adjustment

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'dist/data'


def smoothstep(value, low, high):
    t = np.clip((value - low) / (high - low), 0, 1)
    return t * t * (3 - 2 * t)


def control_cells(samples):
    cells = defaultdict(list)
    for row in samples:
        x, z = row[:2]
        cells[math.floor(x / 45), math.floor(z / 50)].append(row)
    anchors = []
    for _, cell in sorted(cells.items()):
        strong = [row for row in cell if row[6]]
        anchors.append(np.median([row[:3] for row in strong or cell], axis=0))
    return np.array(anchors)


def create_adjustments(grid, bounds, support, observations):
    minimum, step, size = (grid[key] for key in ('min', 'step', 'n'))
    elevations = np.asarray(grid['values']).reshape(size, size)
    axis = minimum + np.arange(size) * step
    x, z = np.meshgrid(axis, axis)
    lattice = np.column_stack((x.ravel(), z.ravel()))

    def bilinear(x, z):
        u = np.clip((x - minimum) / step, 0, size - 1.001)
        v = np.clip((z - minimum) / step, 0, size - 1.001)
        i, j = u.astype(int), v.astype(int)
        f, g = u - i, v - j
        return ((1 - g) * ((1 - f) * elevations[j, i] + f * elevations[j, i + 1])
                + g * ((1 - f) * elevations[j + 1, i] + f * elevations[j + 1, i + 1]))

    def terrain_base(x, z):
        west, north, east, south = bounds
        width, depth = east - west, south - north
        spacing = max(10, math.ceil(math.sqrt(width * depth / 62000)))
        columns, rows = math.ceil(width / spacing), math.ceil(depth / spacing)
        dx, dz = width / columns, depth / rows
        u = np.clip((x - west) / dx, 0, columns)
        v = np.clip((z - north) / dz, 0, rows)
        i, j = np.minimum(u.astype(int), columns - 1), np.minimum(v.astype(int), rows - 1)
        f, g = u - i, v - j
        w, n = west + i * dx, north + j * dz
        a, b = bilinear(w, n), bilinear(w + dx, n)
        c, d = bilinear(w, n + dz), bilinear(w + dx, n + dz)
        triangle = np.where(f + g <= 1,
                            (1 - f - g) * a + f * b + g * c,
                            (f + g - 1) * d + (1 - f) * c + (1 - g) * b)
        # A collar of source grid south of the model keeps support at the edge.
        return np.where(z <= south, triangle, bilinear(x, z))

    anchors = control_cells(observations)
    sites = anchors[:, :2]
    hull = Polygon(sites[ConvexHull(sites).vertices])
    indices = np.flatnonzero(contains_xy(support, x.ravel(), z.ravel())
                             & contains_xy(hull, x.ravel(), z.ravel()))
    query = lattice[indices]
    # Correct elevations downward at observed cuts. No terrain extrapolation
    # beyond measured support, including where the distant south mesh is clipped.
    change = np.clip(anchors[:, 2] - terrain_base(*sites.T), -76, 0)
    scale = np.array([.85, 1.])
    predicted = LinearNDInterpolator(sites * scale, change, fill_value=0)(query * scale)
    nearest = cKDTree(sites).query(query)[0]
    sample_points = points(query)
    weight = ((1 - smoothstep(nearest, 116, 178))
              * smoothstep(distance(hull.boundary, sample_points), 0, 72)
              * smoothstep(distance(support.boundary, sample_points), 0, 55))
    centimetres = np.rint(np.minimum(0, predicted) * weight * 100).astype(int)

    return encode_runs(indices, centimetres)


def encode_runs(indices, centimetres):
    runs = []
    for index, amount in zip(indices, centimetres):
        if amount == 0:
            continue
        if runs and runs[-1][0] + len(runs[-1][1]) == index:
            runs[-1][1].append(int(amount))
        else:
            runs.append([int(index), [int(amount)]])
    return runs


def profile_text(profile):
    return json.dumps(profile, separators=(',', ':')) + '\n'


def add_low_slope(grid, quarry, controls):
    if sha256(profile_text(quarry).encode('utf8')).hexdigest() != controls['baselineQuarryPatchSHA256']:
        raise ValueError('Baseline quarry adjustment changed; revalidate the low-slope survey fit')

    minimum, step, size = (grid[key] for key in ('min', 'step', 'n'))
    prior_cm = np.zeros(size * size, dtype=int)
    for start, run in quarry['runs']:
        prior_cm[start:start + len(run)] = run
    heights = (np.asarray(grid['values']) + prior_cm / 100).reshape(size, size)
    x, z = np.meshgrid(minimum + np.arange(size) * step, minimum + np.arange(size) * step)

    observations = np.array([row[:3] for row in controls['observations']])
    support = Polygon(controls['supportPolygon'])
    inside = contains_xy(support, x, z)
    survey_xy = observations[:, :2]

    def plane_terms(x, z):
        return np.column_stack((np.ones(x.size), (x + 100) / 100, (z - 550) / 100))

    design = plane_terms(*survey_xy.T)
    plane = least_squares(lambda k: design @ k - observations[:, 2],
                          [34.75, -.6, 2.4], loss='soft_l1', f_scale=.20).x
    wanted_height = plane_terms(x[inside], z[inside]) @ plane
    query = np.column_stack((x[inside], z[inside]))
    boundary = distance(support.boundary, points(query))
    nearest = cKDTree(survey_xy).query(query)[0]
    weight = smoothstep(boundary, 0, 65) * (1 - smoothstep(nearest, 66, 76))
    drops = np.zeros_like(heights, dtype=int)
    drops[inside] = np.floor(np.clip(heights[inside] - wanted_height, 0, 12) * weight * 100 + 1e-8).astype(int)

    # Limit changes to sharp slopes at the edge where the terrain is not surveyed.
    # Tightening each adjacent pair can lower the adjustment but cannot extend it.
    def edge_budget(rise):
        limit = np.minimum(np.maximum(np.abs(rise) + .08 * step, .20 * step),
                           np.maximum(np.abs(rise), .39 * step))
        return [np.floor((limit + sign * rise) * 100 + 1e-6).astype(int) for sign in (1, -1)]

    east, west = edge_budget(heights[:, 1:] - heights[:, :-1])
    south, north = edge_budget(heights[1:, :] - heights[:-1, :])
    for _ in range(50):
        previous = drops.copy()
        drops[:, 1:] = np.minimum(drops[:, 1:], drops[:, :-1] + east)
        drops[:, :-1] = np.minimum(drops[:, :-1], drops[:, 1:] + west)
        drops[1:, :] = np.minimum(drops[1:, :], drops[:-1, :] + south)
        drops[:-1, :] = np.minimum(drops[:-1, :], drops[1:, :] + north)
        if np.array_equal(previous, drops):
            break
    else:
        raise ValueError('Low-slope edge limits did not converge')

    merged = prior_cm - drops.ravel()
    indices = np.flatnonzero(merged)
    return {**quarry, 'runs': encode_runs(indices, merged[indices])}



def add_east_bench(grid, profile, controls):
    expected = controls['baselineGridPatchSHA256']
    if sha256(profile_text(profile).encode('utf8')).hexdigest() != expected:
        raise ValueError('Quarry grid has changed; recheck the east bench observations')

    minimum, step, size = (grid[key] for key in ('min', 'step', 'n'))
    base_patch = np.zeros(size * size, dtype=int)
    for start, run in profile['runs']:
        base_patch[start:start + len(run)] = run
    height = (np.asarray(grid['values']) + base_patch / 100).reshape(size, size)
    x, z = np.meshgrid(minimum + np.arange(size) * step, minimum + np.arange(size) * step)

    stations = np.asarray(controls['profileStations'])
    expected_height = np.interp(z, stations[:, 0], stations[:, 1])
    lateral = np.asarray(controls['lateralEnvelope'])
    left, west_bank, east_bank, right = [np.interp(z, lateral[:, 0], lateral[:, i]) for i in range(1, 5)]
    outer_north, bench_north, bench_south, outer_south = controls['longitudinalEnvelope']
    weight = (smoothstep(x, left, west_bank) * (1 - smoothstep(x, east_bank, right))
              * smoothstep(z, outer_north, bench_north) * (1 - smoothstep(z, bench_south, outer_south)))
    drop = np.rint(100 * np.maximum(height - expected_height, 0) * weight).astype(int)
    merged = base_patch - drop.ravel()
    indices = np.flatnonzero(merged)
    return {**profile, 'runs': encode_runs(indices, merged[indices])}



def apply_lattice_adjustments(profile, controls):
    centimetres = np.zeros(profile['n'] ** 2, dtype=int)
    for start, run in profile['runs']:
        centimetres[start:start + len(run)] = run
    for index, previous, adjustment in controls['adjustments']:
        if not (0 <= index < centimetres.size and centimetres[index] == previous and adjustment < 0):
            raise ValueError(f"Recheck {controls['name']} against the revised base grid")
        centimetres[index] += adjustment
    indices = np.flatnonzero(centimetres)
    return {**profile, 'runs': encode_runs(indices, centimetres[indices])}


def main():
    controls = json.loads((ROOT / 'tools/data/south-quarry-controls.json').read_bytes())
    source = (DATA / 'surrounding-dem.json').read_bytes()
    if sha256(source).hexdigest() != controls['sourceGridSHA256']:
        raise ValueError('Base elevation grid has changed; revalidate the survey fit before rebuilding')
    grid = json.loads(source)
    bounds = json.loads((DATA / 'surroundings.json').read_bytes())['bounds']
    patches = {
        'version': 1,
        **{key: grid[key] for key in ('min', 'step', 'n')},
        'runs': create_adjustments(grid, bounds, Polygon(controls['supportPolygon']), controls['observations']),
    }
    low_slope = json.loads((ROOT / 'tools/data/south-low-slope-controls.json').read_bytes())
    quarry = add_low_slope(grid, patches, low_slope)
    east = json.loads((ROOT / 'tools/data/south-eastern-cut-controls.json').read_bytes())
    if sha256(profile_text(quarry).encode('utf8')).hexdigest() != east['baselineQuarrySHA256']:
        raise ValueError('Southern cut baseline changed; revalidate the eastern bench observations')
    prior_cm = np.zeros(grid['n'] ** 2, dtype=int)
    for start, run in quarry['runs']:
        prior_cm[start:start+len(run)] = run
    local_grid = {**grid, 'values': np.asarray(grid['values']) + prior_cm/100}
    increment, _ = eastern_cut_adjustment(local_grid, east, east['observations'])
    merged = prior_cm + increment.ravel()
    nonzero = np.flatnonzero(merged)
    eastern_cut = {**quarry, 'runs': encode_runs(nonzero, merged[nonzero])}
    bench = json.loads((ROOT / 'tools/data/south-east-bench-controls.json').read_bytes())
    output = DATA / 'south-quarry-elevation.json'
    east_bench = add_east_bench(grid, eastern_cut, bench)
    north_rim = json.loads((ROOT / 'tools/data/south-north-rim-controls.json').read_bytes())
    northern = apply_lattice_adjustments(east_bench, north_rim)
    west = json.loads((ROOT / 'tools/data/south-west-extension-controls.json').read_bytes())
    western = apply_lattice_adjustments(northern, west)
    southeast = json.loads((ROOT / 'tools/data/south-southeast-dry-controls.json').read_bytes())
    output.write_text(profile_text(apply_lattice_adjustments(western, southeast)), 'utf8')


if __name__ == '__main__':
    main()
