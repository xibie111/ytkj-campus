// The presentation lives in the scene alongside the geographic model. Its
// geometry, tints and paper contours are never part of the exported campus.
const paperProfiles = {
  architecture: [0.43, 1.13],
  context:      [0.43, 0.88],
  foliage:      [0.50, 0.76],
  terrain:      [0.60, 0.82],
  meadow:       [0.60, 0.80],
  roadway:      [0.34, 0.84],
  field:        [0.38, 0.94],
  edge:         [0.60, 0.82]
};

const contourFunctions = `
  // Distances are measured in metres of elevation. Derivatives keep the
  // fine paper edges legible both in the overview and near an entrance.
  float paperStroke(float distanceToLevel, float halfWidth, float pixel) {
    return 1.0 - smoothstep(max(halfWidth - 0.5 * pixel, 0.0),
                            halfWidth + 0.5 * pixel, abs(distanceToLevel));
  }
`;

const contourShading = `
  float heightMetres = vPaperHeight - uPaperOffset;
  float pixel = max(fwidth(heightMetres), 0.0001);
  float phase = mod(heightMetres + 2.5, 5.0) - 2.5;
  float slopeCoverage = smoothstep(0.0002, 0.003, pixel);
  float resolved = 1.0 - smoothstep(1.5, 4.0, pixel);
  float lip = paperStroke(phase, max(0.12, pixel * 0.58), pixel);
  float bevel = paperStroke(phase - max(0.29, pixel), max(0.22, pixel * 0.73), pixel);
  float relief = slopeCoverage * resolved * uPaperRelief;
  paper *= 1.0 + relief * (0.08 * bevel - 0.23 * lip);
`;

function paperMaterial(material, kind, profile, paperOn, surfaceOffset, relief) {
  const originalHook = material.onBeforeCompile;
  const originalKey = material.customProgramCacheKey();
  const hasContours = surfaceOffset !== null;
  const hasIvoryRoof = kind === 'architecture';
  const smoothCanopy = kind === 'foliage' && material.flatShading;
  const variant = hasContours ? 'topography' : hasIvoryRoof ? 'architecture' : smoothCanopy ? 'canopy' : 'object';
  material.customProgramCacheKey = () => originalKey + '|studio-paper-' + variant;
  material.onBeforeCompile = function(shader, renderer) {
    originalHook.call(this, shader, renderer);
    shader.uniforms.uPaperOn = paperOn;
    shader.uniforms.uPaperRange = {value: profile};
    let vertex = shader.vertexShader;
    let fragment = shader.fragmentShader;
    const common = '#include <common>';
    if (smoothCanopy) {
      vertex = vertex.replace(common, common + '\nvarying vec3 vPaperNormal;')
        .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nvPaperNormal = transformedNormal;');
      fragment = fragment.replace(common, common + '\nvarying vec3 vPaperNormal;')
        .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nif (uPaperOn) normal = normalize(mix(normal, normalize(vPaperNormal), 0.82));');
    }
    if (hasIvoryRoof) {
      vertex = vertex.replace(common, common + '\nvarying float vPaperRoof;')
        .replace('#include <beginnormal_vertex>', `
          #include <beginnormal_vertex>
          vPaperRoof = smoothstep(0.35, 0.85, normalize(mat3(modelMatrix) * objectNormal).y);
        `);
      fragment = fragment.replace(common, common + '\nvarying float vPaperRoof;');
    }
    const vertexHeight = `
      #include <begin_vertex>
      vPaperHeight = (modelMatrix * vec4(transformed, 1.0)).y;
    `;
    if (hasContours) {
      vertex = vertex.replace(common, common + '\nvarying float vPaperHeight;')
        .replace('#include <begin_vertex>', vertexHeight);
      fragment = fragment.replace(common, common + `
        varying float vPaperHeight;
        uniform float uPaperOffset;
        uniform float uPaperRelief;
        ${contourFunctions}
      `);
      shader.uniforms.uPaperOffset = {value: surfaceOffset};
      shader.uniforms.uPaperRelief = {value: relief};
    }
    fragment = fragment.replace(common, common + '\nuniform bool uPaperOn;\nuniform vec2 uPaperRange;')
      .replace('#include <color_fragment>', `
        #include <color_fragment>
        if (uPaperOn) {
          float luminance = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          float tone = sqrt(clamp(luminance, 0.0, 1.0));
          vec3 paper = mix(uPaperRange.x, uPaperRange.y, tone) * vec3(0.994, 0.999, 1.005);
          ${hasIvoryRoof ? 'paper = mix(paper, vec3(1.13, 1.12, 1.09), 0.68 * vPaperRoof);' : ''}
          ${hasContours ? contourShading : ''}
          diffuseColor.rgb = paper;
        }
      `);
    shader.vertexShader = vertex;
    shader.fragmentShader = fragment;
  };
  material.needsUpdate = true;
}

function describeMesh(mesh, buildings, surroundings, land) {
  if (mesh === surroundings?.mesh) return ['context'];
  if (mesh.parent === buildings || mesh.parent?.name === '北门与观海广场') return ['architecture'];
  if (mesh.parent === land.trees) return ['foliage'];
  if (mesh.userData.courtSurface || mesh.parent?.name === '已绘水体岸线') return ['field'];
  if (mesh.userData.surfaceStyle) return ['roadway', mesh.userData.displayOffsetMetres, 0.28];
  if (mesh.userData.groundCover) return ['meadow', mesh.userData.displayOffsetMetres, 1];
  switch (mesh.name) {
    case '地形与地表': return ['terrain', 0, 1];
    case '草地近景纹理': return ['meadow', 0.025, 1];
    case '观海广场草坪': return ['meadow', 0.015, 0.85];
    case '田径场面层与标线': return ['field'];
    default: return ['edge'];
  }
}

function makeBoard(T, bounds, low, h) {
  const [west, north, east, south] = bounds;
  const width = east - west, depth = south - north;
  const cx = (west + east) / 2, cz = (north + south) / 2;
  const baseY = Math.floor(low / 5) * 5 - 20;
  const shoulderY = baseY + 6;
  const board = new T.Group();
  board.name = '白模展台';
  const corners = [[west, north], [east, north], [east, south], [west, south]]
    .map(([x, z]) => new T.Vector3(x, h(x, z), z));

  const positions = [], indices = [];
  for (let side = 0; side < 4; side++) {
    const start = corners[side], end = corners[(side + 1) % 4];
    const segments = Math.ceil(Math.hypot(end.x - start.x, end.z - start.z) / 2);
    const first = positions.length / 3;
    for (let i = 0; i <= segments; i++) {
      const x = T.MathUtils.lerp(start.x, end.x, i / segments);
      const z = T.MathUtils.lerp(start.z, end.z, i / segments);
      positions.push(x, shoulderY, z, x, h(x, z), z);
      if (i < segments) {
        const a = first + i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
  }
  const skirt = new T.BufferGeometry();
  skirt.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  skirt.setIndex(indices);
  skirt.computeVertexNormals();
  const section = new T.MeshStandardMaterial({color: 0xefefec, roughness: 1});
  section.onBeforeCompile = shader => {
    const common = '#include <common>';
    shader.vertexShader = shader.vertexShader.replace(common, common + '\nvarying float vSectionHeight;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSectionHeight = position.y;');
    shader.fragmentShader = shader.fragmentShader.replace(common, common + '\nvarying float vSectionHeight;')
      .replace('#include <color_fragment>', `
        #include <color_fragment>
        float pixel = max(fwidth(vSectionHeight), 0.0001);
        float seam = abs(mod(vSectionHeight + 2.5, 5.0) - 2.5);
        float ink = (1.0 - smoothstep(0.12, 0.12 + pixel, seam))
                  * (1.0 - smoothstep(1.5, 3.5, pixel));
        float stackSeam = abs(mod(vSectionHeight + 10.0, 20.0) - 10.0);
        float layer = (1.0 - smoothstep(0.25, 0.25 + 0.8 * pixel, stackSeam))
                    * (1.0 - smoothstep(5.0, 12.0, pixel));
        diffuseColor.rgb *= 1.0 - 0.10 * ink - 0.12 * layer;
      `);
  };
  const face = new T.Mesh(skirt, section);
  board.add(face);

  const addSlab = (spread, bottom, top, color) => {
    const mesh = new T.Mesh(new T.BoxGeometry(width + spread, top - bottom, depth + spread),
      new T.MeshStandardMaterial({color, roughness: 1}));
    mesh.position.set(cx, (bottom + top) / 2, cz);
    board.add(mesh);
  };
  addSlab(0, baseY + 2.3, shoulderY, 0xe7e8e5);
  addSlab(-2.2, baseY + 1.5, baseY + 2.3, 0xbfc1c1);
  addSlab(0, baseY, baseY + 1.5, 0xefefed);

  // A soft contact shadow follows the footprint as the camera orbits. Its
  // transparent edge blends with the page and requires no shadow-map pass.
  const penumbra = 54;
  const shadowSize = new T.Vector2(width + penumbra * 2, depth + penumbra * 2);
  const shadow = new T.Mesh(new T.PlaneGeometry(shadowSize.x, shadowSize.y),
    new T.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: {
        size: {value: shadowSize}, halfBoard: {value: new T.Vector2(width / 2, depth / 2)},
        shade: {value: new T.Color(0x54585b)}
      },
      vertexShader: `varying vec2 vUV;
        void main() {
          vUV = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `varying vec2 vUV;
        uniform vec2 size, halfBoard;
        uniform vec3 shade;
        void main() {
          vec2 q = abs((vUV - 0.5) * size) - halfBoard;
          float distanceToEdge = length(max(q, 0.0));
          float alpha = 0.17 * exp(-0.5 * pow(distanceToEdge / 14.0, 2.0));
          gl_FragColor = vec4(shade, alpha);
          #include <colorspace_fragment>
        }`
    }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(cx + 4, baseY - 0.7, cz + 6);
  shadow.renderOrder = -1;
  board.add(shadow);
  return {board, baseY, corners};
}

export function createStudioModel({THREE: T, scene, land, bounds, buildings, surroundings}) {
  const [west, north, east, south] = bounds;
  let low = Infinity;
  for (let row = 0; row <= 48; row++) for (let col = 0; col <= 48; col++) {
    const z = T.MathUtils.lerp(north, south, row / 48);
    const x = T.MathUtils.lerp(west, east, col / 48);
    const y = land.h(x, z);
    low = Math.min(low, y);
  }
  const {board, baseY, corners} = makeBoard(T, bounds, low, land.h);
  board.visible = false;
  scene.add(board);
  const paperOn = {value: false};
  const outsideModel = Math.max(...land.bounds.map(Math.abs)) + 2000;
  const limits = [-west, east, -north, south];
  const planes = [
    new T.Plane(new T.Vector3(1, 0, 0), outsideModel),
    new T.Plane(new T.Vector3(-1, 0, 0), outsideModel),
    new T.Plane(new T.Vector3(0, 0, 1), outsideModel),
    new T.Plane(new T.Vector3(0, 0, -1), outsideModel)
  ];
  const registered = new Set();
  const locallyClipped = [];
  function registerMaterial(material, kind, offset = null, relief = 0) {
    if (registered.has(material)) return;
    registered.add(material);
    const original = material.clippingPlanes;
    if (original?.length) {
      // Retain the original intersection and shadow rules for materials
      // that already use independent local clipping.
      locallyClipped.push({material, original, clipped: [...original, ...planes], clipShadows: material.clipShadows});
    } else {
      // Keep the color and shadow program keys identical across views.
      // In browse mode only the plane offsets move beyond the model.
      material.clippingPlanes = planes;
      material.clipShadows = true;
    }
    paperMaterial(material, kind, new T.Vector2(...paperProfiles[kind]), paperOn, offset, relief);
  }
  land.root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const [kind, offset = null, relief = 0] = describeMesh(mesh, buildings, surroundings, land);
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      registerMaterial(material, kind, offset, relief);
    }
  });
  // These materials also need the paper finish when their close-up geometry
  // is first created after zooming in from the exhibition view.
  for (const material of land.gardenMaterials) registerMaterial(material, 'foliage');
  function setView({white, board: showBoard}) {
    paperOn.value = Boolean(white);
    if (board.visible === Boolean(showBoard)) return false;
    board.visible = Boolean(showBoard);
    for (let i = 0; i < planes.length; i++) planes[i].constant = board.visible ? limits[i] : outsideModel;
    for (const {material, original, clipped, clipShadows} of locallyClipped) {
      material.clippingPlanes = board.visible ? clipped : original;
      material.clipShadows = board.visible || clipShadows;
      material.needsUpdate = true;
    }
    return true;
  }
  function contains(point) {
    return !board.visible || (point.x >= west && point.x <= east && point.z >= north && point.z <= south);
  }
  return {setView, contains, baseY, corners};
}
