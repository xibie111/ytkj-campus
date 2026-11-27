import {groundPolygonDistance} from './terrain-surface.js';

function smooth(low, high, value) {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
}

// The photographed lower vehicle entrance passes below the paved upper landing.
// Profile heights follow the road axes. Blend outside their shoulders and keep
// the upper landing and the existing building foundations independent.
export function teachingFrontageGrade(roads, buildings) {
  const lanes = (roads?.segments || []).filter(road => road.teaching10Grade);
  if (!lanes.length) return null;

  const blend = Math.max(...lanes.map(lane => lane.teaching10Grade.blendMetres));
  const parts = [];
  for (const lane of lanes) {
    const {levelsMetres} = lane.teaching10Grade;
    for (let i = 1; i < lane.ring.length; i++) {
      const [x, z] = lane.ring[i - 1], [endX, endZ] = lane.ring[i];
      const dx = endX - x, dz = endZ - z;
      parts.push({x, z, dx, dz, length2: dx*dx + dz*dz, half: lane.width / 2,
        fill: lane.teaching10Grade.maximumFillMetres || 0,
        startY: levelsMetres[i - 1], rise: levelsMetres[i] - levelsMetres[i - 1]});
    }
  }
  const border = Math.max(...lanes.map(lane => lane.width / 2));
  const points = lanes.flatMap(lane => lane.ring);
  const west = Math.min(...points.map(p => p[0])) - border, east = Math.max(...points.map(p => p[0])) + border;
  const north = Math.min(...points.map(p => p[1])) - border, south = Math.max(...points.map(p => p[1])) + border;
  const outside = (x,z) => Math.max(west-x, x-east, north-z, z-south, 0);
  const upper = roads.areas.find(area => area.id === 'east-teaching-10-upper-forecourt');
  const guards = buildings.filter(b => b.id.startsWith('east-teaching-10')).map(b => b.ring);
  if (upper) guards.push(upper.ring);
  const distances = guards.map(ring => groundPolygonDistance(ring, 6));

  function profile(x, z, heights) {
    let nearest = Infinity, levels = 0, fill = 0, weights = 0;
    for (const p of parts) {
      const t = Math.max(0, Math.min(1, ((x-p.x)*p.dx + (z-p.z)*p.dz)/p.length2));
      const centre = Math.hypot(x-p.x-t*p.dx, z-p.z-t*p.dz);
      const edge = Math.max(0, centre-p.half);
      nearest = Math.min(nearest, edge);
      if (heights && edge < blend) {
        const w = (1-smooth(0, blend, edge)) / (.1 + centre*centre);
        levels += w*(p.startY + t*p.rise);
        fill += w*p.fill;
        weights += w;
      }
    }
    return heights ? [nearest, levels / weights, fill / weights] : nearest;
  }
  return {
    blend,
    subdivisions: 18,
    distance(x,z) {
      const boxDistance = outside(x,z);
      return boxDistance > blend + 20 ? boxDistance : profile(x,z,false);
    },
    adjust(x,z,baseline) {
      if (outside(x,z) >= blend) return baseline;
      const [edge, level, maximumFill] = profile(x,z,true);
      if (edge >= blend) return baseline;
      const separation = Math.min(...distances.map(distance => distance(x,z)));
      const weight = (1-smooth(0,blend,edge)) * smooth(.8,3.2,separation);
      return baseline + weight * (Math.min(level,baseline + maximumFill) - baseline);
    }
  };
}

export function xuefuParallelRoadGrade(roads) {
  const controls = roads?.areas.find(area => area.id === 'xuefu-east-parallel-approach')?.gradeSections;
  if (!controls) return null;

  const blend = 4;
  const west = Math.min(...controls.map(([x,,,half]) => x-half));
  const east = Math.max(...controls.map(([x,,,half]) => x+half));
  const north = Math.min(...controls.map(([,z,,half]) => z-half));
  const south = Math.max(...controls.map(([,z,,half]) => z+half));
  const outside = (x,z) => Math.max(west-x, x-east, north-z, z-south, 0);
  let length = 0;
  const parts = controls.slice(1).map(([endX,endZ,endY,endHalf], index) => {
    const [x,z,y,half] = controls[index];
    const dx = endX-x, dz = endZ-z;
    const distance = Math.hypot(dx,dz), start = length;
    length += distance;
    return {x,z,y,half,dx,dz,distance,start,rise:endY-y,change:endHalf-half};
  });
  function nearest(x,z) {
    let best, min = Infinity;
    for (const part of parts) {
      const vx = x-part.x, vz = z-part.z;
      const t = Math.max(0,Math.min(1,(vx*part.dx+vz*part.dz)/(part.distance*part.distance)));
      const ex = vx-t*part.dx, ez = vz-t*part.dz;
      const squared = ex*ex+ez*ez;
      if (squared >= min) continue;
      min = squared;
      best = {edge:Math.sqrt(min)-part.half-t*part.change,
        y:part.y+t*part.rise, station:part.start+t*part.distance};
    }
    return best;
  }
  return {
    blend,
    subdivisions:6,
    distance(x,z) {
      const boxDistance = outside(x,z);
      return boxDistance > blend+20 ? boxDistance : nearest(x,z).edge;
    },
    adjust(x,z,baseline) {
      if (outside(x,z) >= blend) return baseline;
      const hit = nearest(x,z);
      if (hit.edge >= blend) return baseline;
      // Fade into both existing junctions and leave the planted median beyond the shoulder.
      const weight = (1-smooth(0,blend,hit.edge))*smooth(0,14,hit.station)*smooth(0,2.8,length-hit.station);
      return baseline+weight*Math.max(-1.7,Math.min(1.7,hit.y-baseline));
    }
  };
}
