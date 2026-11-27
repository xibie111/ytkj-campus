import * as T from './vendor/three.module.js';

// Column order matches tools/ground_materials.py. The 4 m repeat is tied to
// local east/north coordinates, independent of DEM spacing and atlas bounds.
const finishes = [
  [10, '林下枯落物', .98], [30, '草地', .95], [40, '耕地土团', 1],
  [50, '建成区地表', .92], [60, '裸地碎砾', 1], [80, '水面', .90], [90, '湿地表土', .95],
  [20, '灌草与枯落物', .98]
];
const tileMetres = 4;
const byCode = new Map(finishes.map(([code], i) => [code, i]));
const cellSize = 144;

function tileImage(atlas, column, row) {
  const size = atlas.height / 3;
  const tile = document.createElement('canvas');
  tile.width = tile.height = size;
  tile.getContext('2d').drawImage(atlas, column * size, row * size, size, size, 0, 0, size, size);
  return tile;
}

function metricTexture(texture) {
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.channel = 1;
  texture.anisotropy = 8;
  return texture;
}

function solidMetricTexture(r,g,b) {
  const texture = metricTexture(new T.DataTexture(new Uint8Array([r,g,b,255]),1,1));
  texture.needsUpdate = true;
  return texture;
}

// Both views use the same ring. A water surface with a level estimate is
// triangulated exactly; other water retains the terrain-draped fallback.
function createShorePatch({ring, id, surfaceId, name, levelMetres}, surface, waterMaterial) {
  const x = ring.map(p => p[0]), z = ring.map(p => p[1]);
  const left = Math.floor(Math.min(...x)) - 2, top = Math.floor(Math.min(...z)) - 2;
  const width = Math.ceil(Math.max(...x)) + 2 - left, depth = Math.ceil(Math.max(...z)) + 2 - top;
  const canvas = document.createElement('canvas');
  const resolution = Math.min(8, 2048 / Math.max(width, depth));
  canvas.width = Math.ceil(width * resolution); canvas.height = Math.ceil(depth * resolution);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(canvas.width / width, 0, 0, canvas.height / depth, -left * canvas.width / width, -top * canvas.height / depth);
  const path = new Path2D();
  ring.forEach(([px, pz], i) => i ? path.lineTo(px, pz) : path.moveTo(px, pz));
  path.closePath();
  function paintShore(c) {
    c.fillStyle = '#88adab'; c.fill(path);
    c.save(); c.clip(path); c.strokeStyle = '#82a7a4'; c.lineWidth = .65; c.stroke(path); c.restore();
  }
  const levelled = Number.isFinite(levelMetres);
  if (levelled) {
    ctx.save();ctx.resetTransform();ctx.fillStyle='#88adab';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();
  }
  paintShore(ctx);
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
  const material = new T.MeshStandardMaterial({map, normalMap: waterMaterial.normalMap, roughness: .85, alphaTest: levelled ? 0 : .45});
  material.name = '岸线内水面';
  const geometry = levelled
    ? levelWaterGeometry(ring, levelMetres, left, top, width, depth)
    : drapedWaterGeometry(surface, left, top, width, depth);
  const mesh = new T.Mesh(geometry, material);
  mesh.receiveShadow = true; mesh.name = name ?? '实线岸界水面';
  if (levelled) {
    const localIdentifier = surfaceId ? {surfaceId} : {osmWay:id};
    mesh.userData = {...localIdentifier, estimatedLevelMetres:levelMetres, reference:'data/water-levels.json'};
  } else {
    mesh.position.y = .035;
  }
  return {mesh, path, paintShore, left, top, width, depth};
}

function levelWaterGeometry(ring, level, left, top, width, depth) {
  const contour = ring.map(([x,z]) => new T.Vector2(x,z));
  const faces = T.ShapeUtils.triangulateShape(contour, []);
  const positions = [], normals = [], tangents = [], uv = [], uv1 = [], indices = [];
  for (const {x,y:z} of contour) {
    positions.push(x,level,z);
    normals.push(0,1,0);
    tangents.push(1,0,0,1);
    uv.push((x-left)/width,1-(z-top)/depth);
    uv1.push(x/tileMetres,-z/tileMetres);
  }
  for (const [a,b,c] of faces) {
    const p=contour[a], q=contour[b], r=contour[c];
    const signed=(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
    if (signed < 0) indices.push(a,b,c);
    if (signed > 0) indices.push(a,c,b);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  geometry.setAttribute('tangent',new T.Float32BufferAttribute(tangents,4));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  geometry.setAttribute('uv1',new T.Float32BufferAttribute(uv1,2));
  geometry.setIndex(indices);
  return geometry;
}

function drapedWaterGeometry(surface, left, top, width, depth) {
  const geometry = new T.BufferGeometry(), p = surface.attributes.position;
  const vertices = new Map(), ids = [], original = [], uv = [];
  const index = surface.index.array;
  for (let i = 0; i < index.length; i += 3) {
    const face = [index[i], index[i+1], index[i+2]];
    if (face.every(k => p.getX(k) < left) || face.every(k => p.getX(k) > left + width) ||
        face.every(k => p.getZ(k) < top) || face.every(k => p.getZ(k) > top + depth)) continue;
    for (const k of face) {
      if (!vertices.has(k)) {
        vertices.set(k, original.length);
        original.push(k); uv.push((p.getX(k)-left)/width, 1-(p.getZ(k)-top)/depth);
      }
      ids.push(vertices.get(k));
    }
  }
  for (const key of ['position', 'normal', 'tangent', 'uv1']) {
    const attr = surface.attributes[key], values = [];
    for (const k of original) for (let j=0; j<attr.itemSize; ++j) values.push(attr.getComponent(k,j));
    geometry.setAttribute(key, new T.Float32BufferAttribute(values, attr.itemSize));
  }
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geometry.setIndex(ids);
  return geometry;
}



export function createGroundSurface(source, colorMap, classify, confirmedWater) {
  // Keep the original raster treatment of the uncertain wet area outside
  // an observed core. Only mapped shorelines use the wider matte apron.
  const shoreBounds=confirmedWater.filter(area=>!area.surfaceId).map(({ring}) => ({
    west:Math.min(...ring.map(p=>p[0]))-16, east:Math.max(...ring.map(p=>p[0]))+16,
    north:Math.min(...ring.map(p=>p[1]))-16, south:Math.max(...ring.map(p=>p[1]))+16
  }));
  function finishAt(x, z) {
    const code=classify(x,z);
    // The mapped patch supplies the water here. Keep the terrain underneath
    // matte, including coarse water-class pixels that straddle the shore.
    if(code===80 && shoreBounds.some(b=>x>=b.west && x<=b.east && z>=b.north && z<=b.south)) return byCode.get(60);
    return byCode.get(code) ?? byCode.get(30);
  }
  // Keep shader inputs and material identities stable while the full-resolution
  // atlas downloads. The first frame still has the terrain's color and slope.
  const flatNormal = solidMetricTexture(128,128,255);
  const noOcclusion = solidMetricTexture(255,255,255);
  let planTiles, patterns;
  const materials = finishes.map(([code, name, roughness]) => {
    const material = new T.MeshStandardMaterial({
      map: colorMap, roughness,
      normalMap: flatNormal,
      normalScale: new T.Vector2().setScalar([10,30,40,60].includes(code)?1.30:1),
      aoMap: code === 80 ? null : noOcclusion
    });
    material.name = name;
    return material;
  });
  function setGrain(atlas) {
    const tileSize=atlas.height/3;
    const replaced = new Set();
    planTiles = materials.map((material, index) => {
      // The grass tile also supports an older cached atlas with seven columns.
      const column=(index+1)*tileSize<=atlas.width?index:byCode.get(30);
      replaced.add(material.normalMap);
      material.normalMap = metricTexture(new T.CanvasTexture(tileImage(atlas, column, 0)));
      if (material.aoMap) {
        replaced.add(material.aoMap);
        material.aoMap = metricTexture(new T.CanvasTexture(tileImage(atlas, column, 2)));
      }
      return tileImage(atlas, column, 1);
    });
    for (const shore of shores) shore.mesh.material.normalMap = materials[byCode.get(80)].normalMap;
    for (const texture of replaced) texture.dispose();
    patterns = undefined;
  }
  const geometry = new T.BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes)) geometry.setAttribute(name, attribute);
  const p = source.attributes.position;
  const normals = source.attributes.normal;
  const tangents = new Float32Array(p.count * 4);
  const uv1 = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; ++i) {
    // U runs east at constant Z. For a heightfield N, (Ny, -Nx, 0)
    // is that tangent; N cross T points towards increasing V (north).
    const nx = normals.getX(i), ny = normals.getY(i), length = Math.hypot(nx, ny);
    tangents[i * 4] = ny / length;
    tangents[i * 4 + 1] = -nx / length;
    tangents[i * 4 + 3] = 1;
    uv1[i * 2] = p.getX(i) / tileMetres;
    uv1[i * 2 + 1] = -p.getZ(i) / tileMetres;
  }
  geometry.setAttribute('tangent', new T.BufferAttribute(tangents, 4));
  geometry.setAttribute('uv1', new T.BufferAttribute(uv1, 2));
  const groups = materials.map(() => []);
  const chunks = new Map();
  const indices = source.index.array;
  for (let f = 0; f < indices.length; f += 3) {
    const a = indices[f], b = indices[f + 1], c = indices[f + 2];
    const x = (p.getX(a) + p.getX(b) + p.getX(c)) / 3;
    const z = (p.getZ(a) + p.getZ(b) + p.getZ(c)) / 3;
    const type = finishAt(x, z);
    groups[type].push(a, b, c);
    const key = Math.floor(x / cellSize) + ',' + Math.floor(z / cellSize);
    if (!chunks.has(key)) chunks.set(key, {faces: [], paths: null});
    chunks.get(key).faces.push(f, type);
  }
  // Only the rendering index is regrouped. Grading, road draping, ray heights
  // and the deterministic planting sampler retain the original triangle mesh.
  const sorted = new indices.constructor(indices.length);
  let offset = 0;
  groups.forEach((group, i) => {
    if (!group.length) return;
    sorted.set(group, offset);
    geometry.addGroup(offset, group.length, i);
    offset += group.length;
  });
  geometry.setIndex(new T.BufferAttribute(sorted, 1));
  const mesh = new T.Mesh(geometry, materials);
  mesh.name = '地形与地表';
  mesh.receiveShadow = true;

  const shores=confirmedWater.map(area=>createShorePatch(area,geometry,materials[byCode.get(80)]));
  const waterLayer=new T.Group();waterLayer.name='已绘水体岸线';
  for(const shore of shores)waterLayer.add(shore.mesh);

  function pathsOf(chunk) {
    if (chunk.paths) return chunk.paths;
    const paths = new Map();
    for (let k = 0; k < chunk.faces.length; k += 2) {
      const f = chunk.faces[k], type = chunk.faces[k + 1];
      if (!paths.has(type)) paths.set(type, new Path2D());
      const path = paths.get(type);
      const a = indices[f], b = indices[f+1], c = indices[f+2];
      path.moveTo(p.getX(a), p.getZ(a));
      path.lineTo(p.getX(b), p.getZ(b));
      path.lineTo(p.getX(c), p.getZ(c));
    }
    chunk.paths = paths;
    chunk.faces = null;
    return paths;
  }
  function drawPlan(ctx, [west, north, east, south], scale) {
    if (scale <= 2) return;
    if (planTiles && !patterns) patterns = planTiles.map(tile => {
      const pattern = ctx.createPattern(tile, 'repeat');
      pattern.setTransform(new DOMMatrix().scale(tileMetres / tile.width));
      return pattern;
    });
    if (patterns) {
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = Math.min(.94, (scale - 2) / 5);
      // Faces are bucketed by centroid. One neighbouring chunk on each side
      // includes triangles crossing a bucket boundary.
      for (let iz = Math.floor(north / cellSize)-1; iz <= Math.floor(south / cellSize)+1; iz++) {
        for (let ix = Math.floor(west / cellSize)-1; ix <= Math.floor(east / cellSize)+1; ix++) {
          const chunk = chunks.get(ix + ',' + iz);
          if (!chunk) continue;
          for (const [type, path] of pathsOf(chunk)) {
            ctx.fillStyle = patterns[type];
            ctx.fill(path);
          }
        }
      }
      ctx.restore();
    }
    for(const shore of shores) {
      if (west>shore.left+shore.width || east<shore.left || north>shore.top+shore.depth || south<shore.top) continue;
      ctx.save();
      shore.paintShore(ctx);
      if (patterns) {
        ctx.globalCompositeOperation='soft-light';
        ctx.globalAlpha=Math.min(.94,(scale-2)/5);
        ctx.fillStyle=patterns[byCode.get(80)];
        ctx.fill(shore.path);
      }
      ctx.restore();
    }
  }
  return {mesh, materials, waterLayer, setGrain, drawPlan};
}
