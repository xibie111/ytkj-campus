import {groundPolygonDistance} from './terrain-surface.js';

function fade(distance, width) {
  const t = Math.max(0, Math.min(1, distance / width));
  return t * t * (3 - 2 * t);
}

export function dongshanBoundaryRoadGrade(roads, buildings) {
  const lane = roads?.segments.find(segment => segment.dongshanBoundaryGrade);
  if (!lane) return null;
  const profile = lane.dongshanBoundaryGrade;
  const ring = lane.ring;
  const blend = profile.transitionM;
  const extent = [
    Math.min(...ring.map(p => p[0])), Math.min(...ring.map(p => p[1])),
    Math.max(...ring.map(p => p[0])), Math.max(...ring.map(p => p[1]))
  ];
  function outside(x, z) {
    return Math.max(extent[0] - x, extent[1] - z, x - extent[2], z - extent[3], 0);
  }
  let station = 0;
  const segments = ring.slice(1).map(([endX, endZ], i) => {
    const [x, z] = ring[i];
    const dx = endX - x, dz = endZ - z;
    const length = Math.hypot(dx, dz);
    const segmentStart = station;
    station += length;
    return {x, z, station: segmentStart, dx: dx / length, dz: dz / length, length,
      level: profile.levelsMetres[i], rise: profile.levelsMetres[i + 1] - profile.levelsMetres[i]};
  });
  const protectedItems = [...buildings, ...roads.areas.filter(area => area.id !== profile.pavementId)];
  const protections = protectedItems.filter(item => {
    // Buildings with deep footings can coexist with the already modelled shoulder.
    if (item.preserveBoundaryRoadGrade) return false;
    const box = [
      Math.min(...item.ring.map(p => p[0])), Math.min(...item.ring.map(p => p[1])),
      Math.max(...item.ring.map(p => p[0])), Math.max(...item.ring.map(p => p[1]))
    ];
    const margin = blend + profile.campusHalfWidthM + 6;
    return box[2] >= extent[0] - margin && box[0] <= extent[2] + margin &&
      box[3] >= extent[1] - margin && box[1] <= extent[3] + margin;
  }).map(item => groundPolygonDistance(item.ring, 6));

  function nearest(x, z) {
    let best, bestD2 = Infinity;
    for (const s of segments) {
      const mx = x - s.x, mz = z - s.z;
      const u = mx * s.dx + mz * s.dz;
      const t = Math.max(0, Math.min(s.length, u));
      const ex = mx - t * s.dx, ez = mz - t * s.dz;
      const d2 = ex * ex + ez * ez;
      if (d2 >= bestD2) continue;
      const inward = mx * s.dz - mz * s.dx > 0;
      // Only the first 68 m have a documented campus-side red walking band.
      const innerWidth = profile.villageHalfWidthM + (profile.campusHalfWidthM - profile.villageHalfWidthM) * (1 - fade(s.station + t - 68, 6));
      const half = inward ? innerWidth : profile.villageHalfWidthM;
      bestD2 = d2;
      const pastStart = s === segments[0] ? -u : 0;
      const pastFinish = s === segments[segments.length - 1] ? u - s.length : 0;
      best = {fromAxis: Math.sqrt(d2), d: Math.max(0, Math.sqrt(d2) - half), level: s.level + s.rise * t / s.length,
        pastEnd: Math.max(0, pastStart, pastFinish)};
    }
    return best;
  }
  return {
    blend, subdivisions: 18,
    distance(x, z) {
      const bound = outside(x, z) - profile.campusHalfWidthM;
      return bound > blend + 10 ? bound : nearest(x, z).d;
    },
    adjust(x, z, baseline) {
      if (outside(x, z) > blend + profile.campusHalfWidthM) return baseline;
      const hit = nearest(x, z);
      if (hit.d >= blend || hit.pastEnd >= blend) return baseline;
      let protection = 1;
      for (const distance of protections) {
        const clearance = distance(x, z) - 1;
        protection = Math.min(protection, fade(clearance, Math.min(5, 0.45 + 1.8 * Math.max(0, hit.fromAxis - lane.width / 2))));
      }
      const capLength = Math.min(blend, 3 + 1.2 * hit.d);
      const weight = protection * (1 - fade(hit.d, blend)) * (1 - fade(hit.pastEnd, capLength));
      // Let the bank rise towards the original hillside beyond the pavement.
      const bankLevel = Math.min(baseline, hit.level + 0.42 * hit.d);
      const target = Math.min(baseline + profile.maximumFillM, Math.max(hit.level, bankLevel));
      return baseline + weight * (target - baseline);
    }
  };
}
