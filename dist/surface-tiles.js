import { Box3, BufferAttribute, BufferGeometry, Group, Mesh, Sphere, Vector3 } from './vendor/three.module.js';

const tileSize = 224;
const batchSize = 2048;
const closeScale = 1.45;

function* buildTiles(source, target, originalTriangles) {
  const original = source.geometry;
  const position = original.getAttribute('position');
  const index = original.index?.array;
  const count = index?.length ?? position.count;
  const IndexArray = index?.constructor ?? (position.count > 65535 ? Uint32Array : Uint16Array);
  const groups = Array.isArray(source.material) ? original.groups : [{start: 0, count, materialIndex: 0}];
  const tiles = new Map();
  const vertex = new Vector3();
  let faces = 0;
  for (const group of groups) {
    const end = Math.min(count, group.start + group.count);
    for (let i = group.start; i < end; i += 3) {
      const a = index?.[i] ?? i, b = index?.[i+1] ?? i+1, c = index?.[i+2] ?? i+2;
      const x = (position.getX(a) + position.getX(b) + position.getX(c)) / 3;
      const z = (position.getZ(a) + position.getZ(b) + position.getZ(c)) / 3;
      const key = `${Math.floor(x / tileSize)},${Math.floor(z / tileSize)}`;
      let tile = tiles.get(key);
      if (!tile) {
        tile = {indices: [], faces: [], groups: [], bounds: new Box3()};
        tiles.set(key, tile);
      }
      let part = tile.groups.at(-1);
      if (!part || part.materialIndex !== group.materialIndex) {
        part = {start: tile.indices.length, count: 0, materialIndex: group.materialIndex};
        tile.groups.push(part);
      }
      part.count += 3;
      tile.indices.push(a, b, c);
      tile.faces.push(i / 3);
      tile.bounds.expandByPoint(vertex.fromBufferAttribute(position, a));
      tile.bounds.expandByPoint(vertex.fromBufferAttribute(position, b));
      tile.bounds.expandByPoint(vertex.fromBufferAttribute(position, c));
      if (++faces % batchSize === 0) yield;
    }
  }
  for (const tile of tiles.values()) {
    const geometry = new BufferGeometry();
    // These are index partitions, so all attributes and the exact triangles
    // remain shared with the source. Bounds include every vertex of each face.
    for (const [name, attribute] of Object.entries(original.attributes)) geometry.setAttribute(name, attribute);
    geometry.setIndex(new BufferAttribute(new IndexArray(tile.indices), 1));
    for (const {start, count, materialIndex} of tile.groups) geometry.addGroup(start, count, materialIndex);
    geometry.boundingBox = tile.bounds;
    geometry.boundingSphere = tile.bounds.getBoundingSphere(new Sphere());
    const mesh = new Mesh(geometry, source.material);
    mesh.receiveShadow = source.receiveShadow;
    mesh.renderOrder = source.renderOrder;
    mesh.layers.mask = source.layers.mask;
    originalTriangles.set(mesh, {source, faces: new Uint32Array(tile.faces)});
    target.add(mesh);
    yield;
  }
}

function isVisible(source) {
  for (let node = source; node; node = node.parent) if (!node.visible) return false;
  return true;
}

function syncMaterial(entry, source) {
  if (entry.material === source.material) return;
  entry.material = source.material;
  for (const mesh of entry.target.children) mesh.material = entry.material;
}

export function createSurfaceTiles(scene, sources, invalidate = () => {}, pickOnly = []) {
  const root = new Group();
  root.name = '地形道路显示分区';
  root.visible = false;
  const entries = new Map();
  const originalTriangles = new WeakMap();
  const hidden = [];
  let started = false, ready = false, closeView = false;

  function* addEntry(source, renderable) {
    const geometry = source?.geometry;
    if (!geometry?.getAttribute('position') || (renderable && (!geometry.index || source.castShadow))) return;
    const target = new Group();
    yield* buildTiles(source, target, originalTriangles);
    if (target.children.length) {
      entries.set(source, {target, material: source.material, renderable});
      if (renderable) root.add(target);
    }
  }

  function* build() {
    for (const source of sources) yield* addEntry(source, true);
    ready = true;
    if (closeView && root.children.length) invalidate();
    for (const source of pickOnly) if (!entries.has(source)) yield* addEntry(source, false);
  }

  function start() {
    started = true;
    const work = build();
    function schedule() {
      if (typeof requestIdleCallback === 'function') requestIdleCallback(step, {timeout: 500});
      else setTimeout(step, 16);
    }
    function step(deadline) {
      const until = performance.now() + 5;
      do {
        if (work.next().done) return;
      } while (performance.now() < until && (!deadline || deadline.timeRemaining() > 2));
      schedule();
    }
    schedule();
  }

  function intersectObjects(ray, sources) {
    const meshes = [], partitionedSources = new Set();
    for (const source of sources) {
      const entry = entries.get(source);
      const {drawRange} = source.geometry ?? {};
      if (!entry || drawRange?.start !== 0 || drawRange?.count !== Infinity) {
        meshes.push(source);
        continue;
      }
      // Use the same triangles for picking, including beyond the moving camera's
      // view. Keep the original triangle numbers for the building lookup.
      syncMaterial(entry, source);
      partitionedSources.add(source);
      for (const mesh of entry.target.children) {
        mesh.matrixWorld.copy(source.matrixWorld);
        mesh.layers.mask = source.layers.mask;
        meshes.push(mesh);
      }
    }
    const hits = ray.intersectObjects(meshes, false);
    if (!partitionedSources.size) return hits;
    for (const hit of hits) {
      const original = originalTriangles.get(hit.object);
      if (!original) continue;
      hit.faceIndex = original.faces[hit.faceIndex];
      hit.object = original.source;
    }
    // Tile traversal can reverse hits on shared edges or coincident faces.
    hits.sort((a, b) => a.distance - b.distance || sources.indexOf(a.object) - sources.indexOf(b.object)
      || (partitionedSources.has(a.object) ? a.faceIndex - b.faceIndex : 0));
    return hits;
  }

  return {
    intersect: (ray, source) => intersectObjects(ray, [source]),
    intersectObjects,
    render(renderer, camera, pixelsPerMetre) {
      closeView = pixelsPerMetre >= (closeView ? 1.25 : closeScale);
      if (!ready || !closeView || !root.children.length) {
        root.removeFromParent();
        renderer.render(scene, camera);
        if (!started) start();
        return;
      }
      if (!root.parent) scene.add(root);
      root.visible = true;
      for (const [source, entry] of entries) {
        if (!entry.renderable) continue;
        const {target} = entry;
        target.visible = isVisible(source);
        if (!target.visible) continue;
        syncMaterial(entry, source);
        source.visible = false;
        hidden.push(source);
      }
      try {
        renderer.render(scene, camera);
      } finally {
        // Picking, the studio material registry and GLB export keep the
        // original meshes. Only this synchronous draw uses substitutes.
        for (const source of hidden) source.visible = true;
        hidden.length = 0;
        root.visible = false;
      }
    }
  };
}
