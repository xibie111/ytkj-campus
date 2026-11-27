import { Frustum, Group, InstancedBufferAttribute, InstancedMesh, Matrix4, Plane, Scene, Vector3 } from './vendor/three.module.js';
import { createSurfaceTiles } from './surface-tiles.js';

const tileSize = 224;

function copyInstances(source, indices) {
  const mesh = new InstancedMesh(source.geometry, source.material, indices.length);
  const sourceMatrices = source.instanceMatrix.array;
  const colors = source.instanceColor;
  if (colors) {
    const array = new colors.array.constructor(indices.length * colors.itemSize);
    mesh.instanceColor = new InstancedBufferAttribute(array, colors.itemSize, colors.normalized);
  }
  for (const [i, index] of indices.entries()) {
    mesh.instanceMatrix.array.set(sourceMatrices.subarray(index * 16, (index + 1) * 16), i * 16);
    if (colors) {
      const offset = index * colors.itemSize;
      mesh.instanceColor.array.set(colors.array.subarray(offset, offset + colors.itemSize), i * colors.itemSize);
    }
  }
  mesh.castShadow = source.castShadow;
  mesh.receiveShadow = source.receiveShadow;
  return mesh;
}

function makeWoodlandTiles({trunk, canopy, forestCount}) {
  const root = new Group();
  root.name = '林地显示分区';
  const tiles = new Map();
  const matrices = trunk.instanceMatrix.array;
  for (let i = 0; i < forestCount; i++) {
    const x = Math.floor(matrices[i * 16 + 12] / tileSize);
    const z = Math.floor(matrices[i * 16 + 14] / tileSize);
    const key = `${x},${z}`;
    if (!tiles.has(key)) tiles.set(key, []);
    tiles.get(key).push(i);
  }
  for (const indices of tiles.values()) {
    root.add(copyInstances(trunk, indices), copyInstances(canopy, indices));
  }

  // The exact proxy trees around the plaza switch off when the detailed
  // models take over. Keep them separate from the fixed woodland tiles.
  const plaza = new Group();
  const plazaIndices = Array.from({length: trunk.instanceMatrix.count - forestCount}, (_, i) => forestCount + i);
  if (plazaIndices.length) plaza.add(copyInstances(trunk, plazaIndices), copyInstances(canopy, plazaIndices));
  root.add(plaza);
  return {root, plaza};
}

function prelinkVisibleColors(renderer, scene, camera) {
  // Three r180's compile() reads the active clipping count, so prepare each
  // count in an empty pass before queuing the real materials. No scene objects
  // are moved and the complete model is drawn in this same browser frame.
  const originalPlanes = renderer.clippingPlanes;
  if (originalPlanes.length) return;
  camera.updateMatrixWorld();
  scene.updateMatrixWorld();
  const projection = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const frustum = new Frustum().setFromProjectionMatrix(projection);
  const batches = new Map();
  scene.traverseVisible(mesh => {
    if (!mesh.isMesh || !mesh.layers.test(camera.layers) || (mesh.frustumCulled && !frustum.intersectsObject(mesh))) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!material?.visible || material.clipIntersection) continue;
      const count = material.isShaderMaterial && !material.clipping ? 0 : (material.clippingPlanes?.length || 0);
      if (!batches.has(count)) batches.set(count, new Group());
      // compile() needs the original geometry and instancing flags, but one
      // material per entry lets arrays with different clipping counts split.
      const proxy = Object.create(mesh);
      proxy.material = material;
      proxy.children = [];
      batches.get(count).children.push(proxy);
    }
  });
  const empty = new Scene();
  const neutral = new Plane(new Vector3(0, 1, 0), 1e6);
  try {
    for (const [count, batch] of batches) {
      renderer.clippingPlanes = Array(count).fill(neutral);
      renderer.render(empty, camera);
      renderer.compile(batch, camera, scene);
    }
  } finally {
    renderer.clippingPlanes = originalPlanes;
  }
}

export function createRenderBudget({scene, trees, forest, sun, surfaces = [], pickOnly = [], invalidate, invalidateModel = invalidate}) {
  let previousShadowMap, previousLayers, tiled = false, woodland;
  let shadowsStale = true, firstShadow;
  const casters = [];
  const surfaceTiles = surfaces.length || pickOnly.length ? createSurfaceTiles(scene, surfaces, invalidate, pickOnly) : null;

  function useWoodlandTiles(pixelsPerMetre) {
    if (!forest?.forestCount) return;
    const next = trees.visible && pixelsPerMetre >= (tiled ? 1.05 : 1.24);
    if (next && !woodland) {
      woodland = makeWoodlandTiles(forest);
    }
    if (next !== tiled) {
      tiled = next;
      // Alternate render batches stay outside the exportable landscape,
      // and outside the scene traversal entirely for wide views.
      if (tiled) scene.add(woodland.root);
      else woodland.root.removeFromParent();
      forest.trunk.visible = forest.canopy.visible = !tiled;
      shadowsStale = true;
    }
    if (tiled) {
      const plazaVisible = forest.trunk.count > forest.forestCount;
      if (woodland.plaza.visible !== plazaVisible) {
        woodland.plaza.visible = plazaVisible;
        shadowsStale = true;
      }
    }
  }

  function checkTreeCasters() {
    // Detailed plaza trees compact the visible instance matrices as the
    // view moves. A count alone cannot detect a different set of trees.
    let index = 0;
    trees.traverseVisible(node => {
      if (!node.castShadow) return;
      const count = node.count;
      const version = node.instanceMatrix?.version;
      const previous = casters[index];
      if (previous?.node !== node || previous.count !== count || previous.version !== version) {
        casters[index] = {node, count, version};
        shadowsStale = true;
      }
      index++;
    });
    if (index !== casters.length) {
      casters.length = index;
      shadowsStale = true;
    }
  }

  function drawScene(renderer, camera, pixelsPerMetre) {
    if (surfaceTiles) surfaceTiles.render(renderer, camera, pixelsPerMetre);
    else renderer.render(scene, camera);
  }

  function drawBeforeShadows(renderer, camera, pixelsPerMetre) {
    const intensity = sun.shadow.intensity;
    sun.shadow.intensity = 0;
    renderer.shadowMap.needsUpdate = false;
    try {
      if (!firstShadow.queued) {
        try { prelinkVisibleColors(renderer, scene, camera); }
        catch (error) { console.warn('三维着色器预编译失败，将直接绘制。', error); }
      }
      drawScene(renderer, camera, pixelsPerMetre);
    } finally {
      sun.shadow.intensity = intensity;
    }
    if (firstShadow.queued) return;
    const request = firstShadow;
    request.queued = true;
    // Let the color frame reach the screen before compiling and drawing depth.
    requestAnimationFrame(() => {
      const settle = () => {
        if (firstShadow !== request) return;
        firstShadow = null;
        invalidateModel();
      };
      if (window.requestIdleCallback) requestIdleCallback(settle, {timeout: 180});
      else setTimeout(settle, 32);
    });
  }

  return {
    invalidateShadows() { shadowsStale = true; },
    intersectSurface(ray, mesh) {
      return surfaceTiles ? surfaceTiles.intersect(ray, mesh) : ray.intersectObject(mesh, false);
    },
    intersectObjects(ray, meshes) {
      return surfaceTiles ? surfaceTiles.intersectObjects(ray, meshes) : ray.intersectObjects(meshes, false);
    },
    render(renderer, camera, pixelsPerMetre) {
      const shadowMap = renderer.shadowMap;
      // Three.js rebuilds this object when WebGL regains its context.
      if (shadowMap !== previousShadowMap) {
        previousShadowMap = shadowMap;
        shadowMap.autoUpdate = false;
        shadowsStale = true;
        firstShadow = sun ? {queued: false} : null;
      }
      if (camera.layers.mask !== previousLayers) {
        previousLayers = camera.layers.mask;
        shadowsStale = true;
      }
      useWoodlandTiles(pixelsPerMetre);
      checkTreeCasters();
      if (firstShadow) {
        drawBeforeShadows(renderer, camera, pixelsPerMetre);
        return;
      }
      if (shadowsStale) {
        shadowMap.needsUpdate = true;
        shadowsStale = false;
      }
      drawScene(renderer, camera, pixelsPerMetre);
    }
  };
}
