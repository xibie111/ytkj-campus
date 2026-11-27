import {MathUtils} from './vendor/three.module.js';

const {clamp, smoothstep} = MathUtils;

// Key light from the northwest and two weaker oblique fills keep opposing
// valley walls readable. Directions are in local east/south coordinates.
const lights = [
  [-.707, -.707, .58],
  [-1, 0, .24],
  [0, -1, .18]
];
const levelLight = Math.SQRT1_2;

function ringAt(heightAt, x, z, radius) {
  const d = radius * Math.SQRT1_2;
  const left = heightAt(x - radius, z), right = heightAt(x + radius, z);
  const north = heightAt(x, z - radius), south = heightAt(x, z + radius);
  const nw = heightAt(x - d, z - d), se = heightAt(x + d, z + d);
  const ne = heightAt(x + d, z - d), sw = heightAt(x - d, z + d);
  // Least-squares slope on eight evenly spaced directions.
  return {
    east: (right - left + (ne + se - nw - sw) * Math.SQRT1_2) / (4 * radius),
    south: (south - north + (sw + se - nw - ne) * Math.SQRT1_2) / (4 * radius),
    mean: (left + right + north + south + nw + ne + sw + se) / 8
  };
}

export function terrainRelief(heightAt, [west, north, east, south]) {
  return (x, z) => {
    const close = ringAt(heightAt, x, z, 16);
    const wide = ringAt(heightAt, x, z, 52);
    const dx = close.east * .72 + wide.east * .28;
    const dz = close.south * .72 + wide.south * .28;
    const length = Math.hypot(dx, 1, dz);
    let illumination = 0;
    for (const [lightX, lightZ, weight] of lights) {
      illumination += weight * Math.max(0, levelLight * (1 - dx * lightX - dz * lightZ) / length);
    }

    const height = heightAt(x, z);
    // Local position relative to its neighbours reveals actual crests, cuts
    // and folds. It only drives illumination, never the height of the mesh.
    const form = .65 * clamp((height - close.mean) / 6, -1, 1)
      + .35 * clamp((height - wide.mean) / 18, -1, 1);
    const outside = Math.max(west - x, x - east, north - z, z - south, 0);
    const hillside = Math.max(smoothstep(outside, 20, 150), .55 * smoothstep(length, 1.015, 1.12));
    const lighting = illumination - levelLight;
    const shade = 1 + (.79 + .45 * hillside) * lighting + (.044 + .106 * hillside) * form;
    return {
      shade: clamp(shade, .68, 1.22),
      warmth: hillside * clamp(14 * lighting + 3.2 * form, -6, 6)
    };
  };
}
