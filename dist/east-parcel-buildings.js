import * as THREE from './vendor/three.module.js';

const finishes = {
  wall: '#d4d3c4', plinth: '#626d70', roof: '#4c565c', roofShade: '#424b52',
  trim: '#e4e1d2', glass: '#687d84', door: '#879994',
};

function parcelRow(ring, inner, ground) {
  const [nw, ne, se, sw] = ring;
  const position = (u, v, y) => [
    THREE.MathUtils.lerp(THREE.MathUtils.lerp(nw[0], ne[0], u), THREE.MathUtils.lerp(sw[0], se[0], u), v),
    y,
    THREE.MathUtils.lerp(THREE.MathUtils.lerp(nw[1], ne[1], u), THREE.MathUtils.lerp(sw[1], se[1], u), v),
  ];
  const grade = (u, v) => {
    const [x, , z] = position(u, v, 0);
    return ground(x, z);
  };
  const base = grade(.5, .5), eave = base + 2.85, ridge = eave + .82;
  // XZ uses east/south axes. The quad point order supplies outward-facing normals.
  const vertices = [], colors = [];
  function face(kind, points) {
    const color = new THREE.Color(finishes[kind]);
    for (let i = 1; i < points.length - 1; i++) {
      for (const p of [points[0], points[i], points[i + 1]]) {
        vertices.push(...p);
        colors.push(color.r, color.g, color.b);
      }
    }
  }
  const orientation = (points, reverse) => reverse ? points.slice().reverse() : points;
  function longPanel(u, from, to, low, high, finish) {
    const at = (v, height) => position(u, v, typeof height === 'number' ? height : height(u, v));
    face(finish, orientation([at(from, low), at(to, low), at(to, high), at(from, high)], u > .5));
  }
  const wallU = [.028, .972], [north, south] = [.008, .992];
  const footing = (u, v) => grade(u, v) - .12;
  const plinth = (u, v) => grade(u, v) + .36;
  for (const u of wallU) {
    longPanel(u, north, south, footing, plinth, 'plinth');
    longPanel(u, north, south, plinth, eave, 'wall');
  }
  for (const v of [north, south]) {
    const [a, b] = wallU;
    const end = points => orientation(points, v > .5);
    face('plinth', end([position(b, v, footing(b, v)), position(a, v, footing(a, v)),
      position(a, v, plinth(a, v)), position(b, v, plinth(b, v))]));
    face('wall', end([position(b, v, plinth(b, v)), position(a, v, plinth(a, v)),
      position(a, v, eave), position(b, v, eave)]));
    face('wall', end([position(b, v, eave), position(a, v, eave), position(.5, v, ridge)]));
  }
  function roofing(finish, points) {
    const [a, b, c] = points;
    const up = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    face(finish, orientation(points, up < 0));
  }
  const r0 = position(.5, 0, ridge), r1 = position(.5, 1, ridge);
  for (const [u, finish] of [[0, 'roofShade'], [1, 'roof']]) {
    roofing(finish, [position(u, 0, eave), position(u, 1, eave), r1, r0]);
    longPanel(u, 0, 1, eave - .13, eave, 'trim');
  }

  // Three transverse entry gables on the inner face. Their valleys meet the main roof.
  const sign = inner === 1 ? 1 : -1;
  const wall = inner === 1 ? wallU[1] : wallU[0];
  const edge = inner + sign * .07, rise = .62, meet = inner - sign * .5 * rise / (ridge - eave);
  const front = wall + sign * .003, glazing = wall + sign * .007;
  for (const middle of [.16, .48, .80]) {
    const from = middle - .054, to = middle + .054;
    const l = position(edge, from, eave), c = position(edge, middle, eave + rise);
    const r = position(edge, to, eave), back = position(meet, middle, eave + rise);
    face('trim', orientation([l, r, c], sign > 0));
    roofing('roof', [l, position(inner, from, eave), back, c]);
    roofing('roofShade', [c, back, position(inner, to, eave), r]);
    const doorstep = grade(wall, middle) + .045;
    longPanel(front, middle - .027, middle + .027, doorstep, doorstep + 2.12, 'trim');
    longPanel(glazing, middle - .023, middle + .023, doorstep + .04, doorstep + 2.06, 'door');

    const windowStart = middle + .070, windowEnd = middle + .188;
    const sill = grade(wall, (windowStart + windowEnd) / 2) + .94;
    longPanel(front, windowStart, windowEnd, sill, sill + 1.21, 'trim');
    const light = (windowEnd - windowStart) / 3;
    for (let i = 0; i < 3; i++) {
      const left = windowStart + i * light;
      longPanel(glazing, left + .004, left + light - .004, sill + .045, sill + 1.165, 'glass');
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({vertexColors:true,roughness:.86}));
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export function createEastParcelBuildings(spot, terrainHeight) {
  return spot.plan.roofs.map((ring, index) => {
    const mesh = parcelRow(ring, index ? 0 : 1, terrainHeight);
    mesh.name = index ? '东山快递驿站 · 东排' : '东山快递驿站 · 西排';
    mesh.userData = {
      landmarkId: spot.id, floors:1, roofOutlineEvidence:spot.plan.references,
      planSource:spot.plan.geometrySource, facadeSource:spot.model.facadeSource,
      facadeEvidence:'Two opposing rows, three entry gables each and glazed window bays shown in the university photograph.',
      elevationEvidence:'Building heights and the paved courtyard level are model estimates; no post-construction survey.',
    };
    return mesh;
  });
}
