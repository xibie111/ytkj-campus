import {MathUtils} from './vendor/three.module.js';

export const plazaStairs = {
  firstTread: 85.36,
  run: .48,
  count: 5,
  width: 20,
  deckLength: 5.6
};

// The steps and upper court are visible in the school's looking-seaward
// panorama. Calibrate the display levels against the DEM on both terraces.
export function createPlazaTerrace(gate, heightAt) {
  if (!gate) return null;
  const [c, s] = [Math.cos(gate.angle), Math.sin(gate.angle)];
  const {firstTread, run, count, width} = plazaStairs;
  const end = firstTread + run * count;
  const centerHeight = v => heightAt(gate.x - s * v, gate.z + c * v);
  const lower = centerHeight(firstTread - .7);
  const upper = lower + MathUtils.clamp(centerHeight(105) - lower, .58, .82);
  const blend = 6;
  function coordinates(x, z) {
    const dx = x - gate.x, dz = z - gate.z;
    return [dx * c + dz * s, dz * c - dx * s];
  }
  function distance(x, z) {
    const [u, v] = coordinates(x, z);
    return Math.hypot(Math.max(0, Math.abs(u) - width / 2), Math.max(0, 82 - v, v - 105));
  }
  function adjust(x, z, baseline) {
    const margin=distance(x,z);
    if(margin>=blend)return baseline;
    const v = coordinates(x, z)[1];
    // A buried sloping support closes the underside between terraces. The
    // exposed risers are modeled separately at the same lower/upper levels.
    const level = MathUtils.lerp(lower, upper, MathUtils.smoothstep(v, end, end + 4));
    return MathUtils.lerp(baseline, level, 1 - MathUtils.smoothstep(margin, 0, blend));
  }
  return {distance, adjust, blend, lower, upper, end, riser: (upper - lower) / count};
}

export function drawPlazaStairs(ctx) {
  const {firstTread, run, count, width} = plazaStairs;
  ctx.save();
  ctx.fillStyle = '#c9c9be';
  ctx.fillRect(-width / 2, firstTread, width, run * count);
  ctx.strokeStyle = '#aaa99a';
  ctx.lineWidth = .065;
  ctx.beginPath();
  for (let i = 0; i <= count; ++i) {
    const v = firstTread + i * run;
    ctx.moveTo(-width / 2, v);
    ctx.lineTo(width / 2, v);
  }
  ctx.stroke();
  ctx.restore();
}
