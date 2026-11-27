"""Grid adjustment around the independently surveyed eastern part of the southern cut."""
from collections import Counter
import numpy as np
from scipy.optimize import least_squares
from scipy.spatial import cKDTree
from shapely import MultiPoint, distance, points

def eastern_cut_adjustment(grid, controls, observations):
    n, step, minimum = (grid[key] for key in ("n", "step", "min"))
    heights = np.asarray(grid["values"]).reshape(n, n)
    samples = np.asarray([row[:3] for row in observations])
    source = [row[3] for row in observations]
    counts = Counter(source)
    weights = np.array([1/np.sqrt(counts[identifier]) for identifier in source])
    cx, cz = controls["originXZ"]
    def design(x, z):
        return np.column_stack((np.ones(x.size), (x-cx)/100, (z-cz)/100))
    observed = design(*samples[:,:2].T)
    assert np.linalg.matrix_rank(observed) == 3
    plane = least_squares(lambda p: (observed @ p - samples[:,2])*weights,
                          [35.,0.,0.], loss="soft_l1", f_scale=.30).x
    indices = np.asarray(controls["allowedSourceIndices"], int)
    cells = np.column_stack((minimum+(indices%n)*step, minimum+(indices//n)*step))
    edge_distance = distance(MultiPoint(samples[:,:2]).convex_hull, points(cells))
    nearest = cKDTree(samples[:,:2]).query(cells)[0]
    def fade(values, start, end):
        t = np.clip((values-start)/(end-start), 0, 1)
        return 1-t*t*(3-2*t)
    weight = fade(edge_distance, 0., 46.) * fade(nearest, 43., 78.)
    target = design(*cells.T) @ plane
    drops = np.zeros((n,n), dtype=int)
    drops.ravel()[indices] = np.floor(np.maximum(0.,heights.ravel()[indices]-target)*weight*100).astype(int)
    # Keep the taper inside the supported optical area. Bound adjacent grades
    # and preserve existing steeper slopes where an unchanged edge requires it.
    def budgets(rise):
        lim=np.maximum(abs(rise),.46*step)
        return [np.floor((lim+s*rise)*100+1e-7).astype(int) for s in (1,-1)]
    east,west=budgets(np.diff(heights,axis=1))
    south,north=budgets(np.diff(heights,axis=0))
    for _ in range(n):
        old = drops.copy()
        drops[:,1:] = np.minimum(drops[:,1:],drops[:,:-1]+east)
        drops[:,:-1] = np.minimum(drops[:,:-1],drops[:,1:]+west)
        drops[1:,:] = np.minimum(drops[1:,:],drops[:-1,:]+south)
        drops[:-1,:] = np.minimum(drops[:-1,:],drops[1:,:]+north)
        if np.array_equal(old,drops):
            return -drops, plane
    raise ValueError("Eastern cut grade limiter did not converge")
