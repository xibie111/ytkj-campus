import * as THREE from './vendor/three.module.js';

const wall = '#ded9cd';
const rim = '#eee9dc';
const frame = '#6b7777';
const glass = ['#697d80', '#879a9b', '#758a8f', '#667a7e'];

function cap(g, ring, triangles, y, color, upward) {
  const verts = ring.map(([x, z]) => g.vertex([x, y, z], color));
  for (const [a, b, c] of triangles) {
    if (upward) g.indices.push(verts[c], verts[b], verts[a]);
    else g.indices.push(verts[a], verts[b], verts[c]);
  }
}

function windowBand(g, edge, low, high, face) {
  const length = edge.length;
  const bays = Math.max(1, Math.round(length / 1.3));
  const step = length / bays;
  const glassOut = .025, frameOut = .055;
  for (let i = 0; i < bays; ++i) {
    const left = step * i, right = step * (i + 1);
    face(g, edge, left, right, low, high, glassOut, glass[i % glass.length]);
    face(g, edge, left, left + .075, low, high, frameOut, frame);
  }
  face(g, edge, length - .075, length, low, high, frameOut, frame);
  face(g, edge, 0, length, high - .63, high - .57, frameOut, frame);
  face(g, edge, 0, length, high - .08, high, frameOut, frame);
  face(g, edge, 0, length, low, low + .09, frameOut, rim);
}

export function createFinanceBridge(item, material, g, tools, terrainHeight) {
  const {makeEdge, face, cuboid} = tools;
  // The ring is counterclockwise in X/Z; its west-facing edges follow the
  // photographed elevation. End faces terminate inside the adjoining wings.
  const ring = item.ring;
  const triangles = THREE.ShapeUtils.triangulateShape(ring.map(p => new THREE.Vector2(...p)), []);
  const {soffitAboveThresholdMetres: soffit, westWindowBandsMetres: bands,
    westFacadeEdges, pierCentersXZ, pierWidthMetres: width} = item.passage;
  const base = item.baseY ?? item.modelBaseMetres;
  const roof = item.height;

  cap(g, ring, triangles, soffit, '#cdc8bb', false);
  cap(g, ring, triangles, roof, '#b8b5a9', true);
  for (let i = 0; i < ring.length; ++i) {
    const edge = makeEdge(ring[i], ring[(i + 1) % ring.length]);
    let low = soffit;
    if (westFacadeEdges.includes(i)) {
      for (const [sill, head] of bands) {
        face(g, edge, 0, edge.length, low, sill, 0, wall);
        windowBand(g, edge, sill, head, face);
        low = head;
      }
    }
    face(g, edge, 0, edge.length, low, roof - .35, 0, wall);
    face(g, edge, 0, edge.length, roof - .35, roof, 0, rim);
  }
  // Two piers are visible on the west facade. Only these narrow members
  // descend to the local terrain; the underside of the span stays exposed.
  for (const [x, z] of pierCentersXZ) {
    const edge = makeEdge([x - .23, z - .45], [x + .23, z + .45]);
    const center = edge.length / 2;
    const ground = terrainHeight?.(x, z);
    const foot = (Number.isFinite(ground) ? ground - base : 0) - .22;
    cuboid(g, edge, center - width / 2, center + width / 2, foot, soffit, -width / 2, width / 2, rim);
  }
  const mesh = new THREE.Mesh(g.build(), material);
  mesh.name = '第四教学楼西连廊';
  mesh.position.y = base;
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.userData.buildingId = item.id;
  mesh.userData.passage = {
    thresholdDatumMetres: base,
    soffitAboveThresholdMetres: soffit,
    westWindowBandsMetres: bands,
    westPierCentersXZ: pierCentersXZ
  };
  return mesh;
}
