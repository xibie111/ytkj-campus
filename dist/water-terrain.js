import {groundPolygonDistance} from './terrain-surface.js';

const bedDepth = .15;
const flatShoreGuard = 1;
// The furthest possible affected point is this radius plus one fine face
// diagonal (under .943 m in the regional grid). The closest road is 3.155 m.
const blend = 2.12;
const subdivisions = 18;

export function prepareWaterTerrain(water, levels, [left, top, right, bottom]) {
  const profiles = new Map((levels?.profiles || []).map(profile => [profile.osmWay, profile]));
  const observed = (levels?.observedSurfaces || []).filter(({ring, levelMetres}) =>
    Number.isFinite(levelMetres) && ring.every(([x,z]) => x>=left && x<=right && z>=top && z<=bottom)
  );
  const patches = [];
  const surfaces = [...water,...observed].map(area => {
    const levelMetres = area.surfaceId ? area.levelMetres : profiles.get(area.id)?.levelMetres;
    if (!Number.isFinite(levelMetres)) return area;
    // The observed pool has room for a gentler mesh transition on open ground.
    const transition = area.surfaceId ? 5 : blend;
    const distance = groundPolygonDistance(area.ring,12);
    const bed = levelMetres - bedDepth;
    function adjust(x, z, baseline) {
      const d = distance(x, z);
      if (d >= transition) return baseline;
      if (d <= flatShoreGuard) return bed;
      const t = (d - flatShoreGuard) / (transition - flatShoreGuard);
      return bed + (baseline - bed) * t * t * (3 - 2 * t);
    }
    patches.push({distance, blend:transition, subdivisions, adjust});
    return {...area, levelMetres};
  });
  return {surfaces, patches};
}
