import * as T from './vendor/three.module.js';
import {createBasketballMarkings} from './basketball-markings.js';
import {groundPolygonDistance} from './terrain-surface.js';
import {pavingFill,pavingMetres,pavingTexture} from './paving-materials.js';

const finish = '#6d8898';
const displayOffset = .018;

export function prepareCourtPlatform(courts, profile, protectedAreas) {
  if (!profile) return null;
  const {id,ringXZ,centerXZ,levelMetres,grading} = profile;
  const original = courts.find(court => court.id === id);
  if (!original) return null;
  const {shoulderMetres,blendMetres,subdivisions,protectedClearanceMetres,adjacentClearanceMetres} = grading;
  const distance = groundPolygonDistance(ringXZ,blendMetres+9);
  const limit=blendMetres+protectedClearanceMetres[1];
  const xs=ringXZ.map(p=>p[0]),zs=ringXZ.map(p=>p[1]);
  const [west,north,east,south]=[
    Math.min(...xs)-limit,Math.min(...zs)-limit,Math.max(...xs)+limit,Math.max(...zs)+limit
  ];
  function nearbyGuards(rings, limit) {
    return rings.filter(ring=>ring?.length &&
      !ring.every(([x])=>x<west) && !ring.every(([x])=>x>east) &&
      !ring.every(([,z])=>z<north) && !ring.every(([,z])=>z>south))
      .map(ring=>groundPolygonDistance(ring,limit));
  }
  const guards=[
    {range:protectedClearanceMetres,rings:protectedAreas.map(item=>item.ring)},
    {range:adjacentClearanceMetres,rings:profile.adjacentPavingRings}
  ].map(({range:[near,far],rings})=>({near,far,distances:nearbyGuards(rings,far)}));
  function adjust(x,z,baseline) {
    const d = distance(x,z);
    if (d >= blendMetres) return baseline;
    let weight=1-T.MathUtils.smoothstep(d,shoulderMetres,blendMetres);
    for(const {near,far,distances} of guards){
      let clearance=far;
      for(const toGuard of distances)clearance=Math.min(clearance,toGuard(x,z));
      weight*=T.MathUtils.smoothstep(clearance,near,far);
    }
    return T.MathUtils.lerp(baseline,levelMetres,weight);
  }
  return {
    court:{...original,center:centerXZ,ring:ringXZ,verifiedPlatform:true},
    patch:{adjust,distance,blend:blendMetres,subdivisions},
    levelMetres,markingLayout:profile.markings
  };
}

export function createCourtPlatformSurface(platform) {
  const {court,levelMetres,markingLayout} = platform;
  const observed=markingLayout?.observed;
  const contour = (observed?.modelRingXZ??court.ring).map(([x,z]) => new T.Vector2(x,z));
  const faces = T.ShapeUtils.triangulateShape(contour, []);
  const path = new Path2D();
  const xyz = [], uv = [], indices = [];
  const tile = pavingMetres('grit');
  for (const [i,{x,y:z}] of contour.entries()) {
    xyz.push(x,levelMetres+displayOffset,z);uv.push(x/tile,-z/tile);
  }
  const planRing=observed?.planRingXZ??court.ring;
  path.moveTo(...planRing[0]);
  for(const point of planRing.slice(1))path.lineTo(...point);
  path.closePath();
  for (const [a,b,c] of faces) {
    const p=contour[a],q=contour[b],r=contour[c];
    const signed=(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
    if (signed < 0) indices.push(a,b,c);
    if (signed > 0) indices.push(a,c,b);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(xyz,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const material = new T.MeshStandardMaterial({map:pavingTexture('grit',finish),roughness:.97});
  const mesh = new T.Mesh(geometry,material);
  mesh.name='篮球场主铺装';mesh.receiveShadow=true;
  mesh.userData={
    courtId:court.id,courtSurface:true,levelMetres,displayOffsetMetres:displayOffset,
    evidence:'data/basketball-platform.json',
    basis:'Sentinel-2 main paving envelope and ATL03 spot-height constraints. Perimeter grading is reconstructed.',
    layoutSources:observed?.sources,
    verticalSupport:observed?.verticalSupport
  };
  const markings=createBasketballMarkings(court.center,levelMetres+displayOffset,markingLayout);
  function drawPlan(c,scale) {
    c.save();c.fillStyle=pavingFill(c,'grit',finish);c.fill(path);c.restore();
    markings.drawPlan(c,scale);
  }
  return {mesh,markings:markings.mesh,drawPlan};
}
