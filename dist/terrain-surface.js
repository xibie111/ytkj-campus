import * as THREE from './vendor/three.module.js';

// Objects, contours and the GLB use the same triangles, including on graded slopes.
export function createTerrainSurface(bounds, sourceHeight, spacing = 8) {
  const [west, north, east, south] = bounds;
  const columns = Math.ceil((east - west) / spacing);
  const rows = Math.ceil((south - north) / spacing);
  const dx = (east - west) / columns;
  const dz = (south - north) / rows;
  const geometry = new THREE.PlaneGeometry(east - west, south - north, columns, rows);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate((west + east) / 2, 0, (north + south) / 2);
  const positions = geometry.attributes.position;
  for (let index = 0; index < positions.count; index++) {
    positions.setY(index, sourceHeight(positions.getX(index), positions.getZ(index)));
  }
  geometry.computeVertexNormals();

  function heightAt(x, z) {
    const u = THREE.MathUtils.clamp((x - west) / dx, 0, columns);
    const v = THREE.MathUtils.clamp((z - north) / dz, 0, rows);
    const i = Math.min(Math.floor(u), columns - 1);
    const j = Math.min(Math.floor(v), rows - 1);
    const a = j * (columns + 1) + i;
    const b = a + columns + 1;
    const fx = u - i, fz = v - j;
    if (fx + fz <= 1) {
      return (1 - fx - fz) * positions.getY(a) + fx * positions.getY(a + 1) + fz * positions.getY(b);
    }
    return (fx + fz - 1) * positions.getY(b + 1)
      + (1 - fx) * positions.getY(b) + (1 - fz) * positions.getY(a + 1);
  }
  return {geometry, heightAt, columns, rows};
}

export function groundPolygonDistance(ring, searchLimit=Infinity) {
  const west = Math.min(...ring.map(([x]) => x));
  const east = Math.max(...ring.map(([x]) => x));
  const north = Math.min(...ring.map(([, z]) => z));
  const south = Math.max(...ring.map(([, z]) => z));
  const edges = [];
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, az] = ring[j], [bx, bz] = ring[i];
    const dx = bx - ax, dz = bz - az;
    const squaredLength = dx * dx + dz * dz;
    if (squaredLength !== 0) edges.push({ax, az, bz, dx, dz, squaredLength});
  }
  return (x, z) => {
    const outside = Math.max(west - x, x - east, north - z, z - south, 0);
    // Beyond the patch margin, the box is a sufficient lower-bound distance.
    if (outside > searchLimit) return outside;
    let inside = false;
    let nearestSquared = Infinity;
    for (const {ax, az, bz, dx, dz, squaredLength} of edges) {
      if ((az > z) !== (bz > z) && x < ax + (z - az) * dx / dz) inside = !inside;
      const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / squaredLength));
      const px = x - ax - t * dx;
      const pz = z - az - t * dz;
      nearestSquared = Math.min(nearestSquared, px * px + pz * pz);
    }
    return inside ? 0 : Math.sqrt(nearestSquared);
  };
}
