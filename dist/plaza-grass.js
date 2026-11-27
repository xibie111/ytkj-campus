import * as T from './vendor/three.module.js';
import {pavingFill,pavingTexture,pavingMetres} from './paving-materials.js';

// Gate-local metres. Leave a transparent guard around the beds on every side.
const left=-39, top=2, width=104, height=134;
const bed={x:-37,z:25.2,w:100.8,d:109};
const island={x:0,z:7.3,rx:9.05,rz:4.4};
const kerb={rx:9.5,rz:4.8};
const pale='#d4d1c4', rose='#bb9180';
const squareBorder='#c8ab89', squareCentre='#a68b71';
const paving=[
  // Stone connection between the plaza and the gate crossroad.
  [-11.4,22.1,22.8,3.13,pale],
  [-12.5,25.2,25,109.1,rose],[-8.8,25.2,17.6,109.1,pale],
  ...[-12.8,-9,8.8,12.55].map(x=>[x,25.2,.28,109.1,'#929b8e']),
  [-18.5,88,37,38.5,rose],[-13.4,88,26.8,38.5,pale],
  [-7.1,96.7,15.2,15.5,squareBorder],[-3.2,100.9,8,7.4,squareCentre],
  [-37,127,100.8,7.2,pale],
  // Exposed warm ground visible inside the rows on either side of the square.
  // Use the common cores of the dated views and leave the shaded edges in turf.
  ...[
    [-25.2,90.8,4.9,2.4],[-24.6,98.3,4.3,4.1],
    [-24.1,107.1,3.6,3.9],[-24.3,117.2,2.5,2.9],
    [22.2,91.0,4.5,2.1],[21.1,98.25,5.2,4.3],
    [20.3,107.15,6.5,4.15],[23.3,116.7,4.4,3.7]
  ].map(rect=>[...rect,'#b29a80','drySoil']),
  // East garden north of the transverse brick walk. The narrow brick
  // planting edge borders a pale interior walk and a separate lawn.
  [38,33,3.5,43.8,rose],[41.5,33,6.9,43.8,pale],
  // South of the hedge, the dated views show a separate pale path and exposed
  // planting strip. Keep the path inside its observed turf margins.
  [37,90.7,5.7,28.1,'#b4a08a','drySoil'],
  [36.4,118.8,6.3,8.2,'#b8937d','grit'],
  [42.7,90.7,6.5,36.3,pale],
  [-36.8,76.8,25.7,5.6,rose],[11.2,76.8,50,5.6,rose],
  [12.8,55,35.6,.95,'#d0c9b6'],[12.8,120,41,.95,'#d0c9b6']
];

// pad is the crown radius of an individual tuft. Contract the ellipse by its
// smaller radius so even the tips stay inside its kerb at oblique angles.
export function containsPlazaTurf(u,v,pad=0){
  const maxRadius=1-pad/Math.min(island.rx,island.rz);
  if(maxRadius>0&&Math.hypot((u-island.x)/island.rx,(v-island.z)/island.rz)<maxRadius)return true;
  if(u<=bed.x+pad||v<=bed.z+pad||u>=bed.x+bed.w-pad||v>=bed.z+bed.d-pad)return false;
  return !paving.some(([x,z,w,d])=>u>=x-pad&&u<=x+w+pad&&v>=z-pad&&v<=z+d+pad);
}
export function plazaCypresses(side){
  return Array.from({length:7},(_,i)=>[side*7.1,30.5+i*8]);
}
// Cut the same kerb outline out of the vehicle apron, including the island
// grass and sign-wall base that occupy its centre.
function islandRing(gate,{rx,rz}) {
  const c=Math.cos(gate.angle),s=Math.sin(gate.angle);
  return Array.from({length:96},(_,i)=>{
    const a=i*Math.PI/48,u=island.x+rx*Math.cos(a),v=island.z+rz*Math.sin(a);
    return [gate.x+c*u-s*v,gate.z+s*u+c*v];
  });
}

export function plazaIslandRing(gate) {
  return islandRing(gate,kerb);
}

export function createPlazaKerb(gate,heightAt) {
  if(!gate)return null;
  const outer=plazaIslandRing(gate),inner=islandRing(gate,island);
  const xyz=[],uv=[];
  const tile=pavingMetres('stone'),top=.125,base=.018;
  function band(a,b,ha,hb) {
    for(let i=0;i<a.length;i++){
      const j=(i+1)%a.length;
      for(const [[x,z],lift] of [[a[i],ha],[a[j],ha],[b[i],hb],[a[j],ha],[b[j],hb],[b[i],hb]]){
        xyz.push(x,heightAt(x,z)+lift,z);uv.push(x/tile,-z/tile);
      }
    }
  }
  // Top and both retaining faces share the same edges with the plan island.
  band(inner,outer,top,top);band(outer,outer,top,base);band(inner,inner,base,top);
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(xyz,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();
  const material=new T.MeshStandardMaterial({map:pavingTexture('stone','#c2bfae'),roughness:1});
  const mesh=new T.Mesh(geometry,material);
  mesh.name='北门绿岛立体路缘';mesh.receiveShadow=true;
  mesh.userData={surfaceStyle:'edge',displayOffsetMetres:top,nominalRiseMetres:top-base,
    evidence:'University north gate photographs. Height and outline are display estimates.'};
  return mesh;
}
function paintPaving(ctx){
  for(const [x,z,w,d,color,tile=color===rose?'brick':'stone'] of paving){
    ctx.fillStyle=w<.5?color:pavingFill(ctx,tile,color);
    ctx.fillRect(x,z,w,d);
  }
}

let turfImage,loading,pendingTurf;
export function loadPlazaGrass(){
  if(!loading)loading=loadAtlas().catch(error=>{loading=undefined;throw error});
  return loading;
}
export function preloadPlazaTurf(){
  if(pendingTurf)return;
  const image=new Image();
  pendingTurf=image;
  image.fetchPriority='low';
  image.addEventListener('error',()=>{
    if(pendingTurf===image)pendingTurf=undefined;
  },{once:true});
  image.src=new URL('./plaza-turf.jpg',import.meta.url).href;
}
async function loadAtlas(){
  preloadPlazaTurf();
  const image=pendingTurf;
  try{await image.decode()}
  finally{if(pendingTurf===image)pendingTurf=undefined}
  turfImage=image;
  return makeAtlas(image.width,image.height);
}
function makeAtlas(pixelWidth,pixelHeight){
  const canvas=document.createElement('canvas');canvas.width=pixelWidth;canvas.height=pixelHeight;
  const ctx=canvas.getContext('2d'),sx=canvas.width/width,sy=canvas.height/height;
  ctx.setTransform(sx,0,0,sy,-left*sx,-top*sy);
  drawPlazaGarden(ctx);
  return canvas;
}

function plazaTexture(atlas){
  const texture=new T.CanvasTexture(atlas);
  texture.colorSpace=T.SRGBColorSpace;
  texture.anisotropy=8;
  return texture;
}

export function applyPlazaAtlas(mesh,atlas){
  mesh.material.map.dispose();
  mesh.material.map=plazaTexture(atlas);
}

// Keep the small backing rectangle so the finished turf can be redrawn with
// the original paving and stair edge compositing, without repainting the map.
export function preservePlazaPlan(ctx,gate,apron,paint){
  const transform=ctx.getTransform();
  const toPixels=transform.translate(gate.x,gate.z).rotate(gate.angle*180/Math.PI);
  // Enclose the complete gate drawing, including the fallback access roads.
  const corners=[
    [-65,-90],[70,-90],[-65,140],[70,140]
  ].map(([x,y])=>toPixels.transformPoint({x,y}));
  for(const [x,y] of apron?.ring||[])corners.push(transform.transformPoint({x,y}));
  const xs=corners.map(p=>p.x),ys=corners.map(p=>p.y);
  const x=Math.max(0,Math.floor(Math.min(...xs))-3);
  const y=Math.max(0,Math.floor(Math.min(...ys))-3);
  const w=Math.min(ctx.canvas.width,Math.ceil(Math.max(...xs))+3)-x;
  const h=Math.min(ctx.canvas.height,Math.ceil(Math.max(...ys))+3)-y;
  if(w<=0||h<=0)return null;
  const patch=document.createElement('canvas');
  patch.width=w;patch.height=h;
  const patchCtx=patch.getContext('2d');
  patchCtx.drawImage(ctx.canvas,x,y,w,h,0,0,w,h);
  return ()=>{
    ctx.resetTransform();
    ctx.drawImage(patch,x,y);
    ctx.setTransform(transform);
    paint();
  };
}

// The plan (including its high-zoom redraw) and the ground atlas use exactly
// the same walkways, narrow transverse paths, oval kerb and turf edges.
export function drawPlazaGarden(ctx){
  ctx.beginPath();ctx.ellipse(island.x,island.z,kerb.rx,kerb.rz,0,0,Math.PI*2);
  ctx.fillStyle='#c2bfae';ctx.fill();
  ctx.save();
  ctx.beginPath();ctx.ellipse(island.x,island.z,island.rx,island.rz,0,0,Math.PI*2);
  ctx.rect(bed.x,bed.z,bed.w,bed.d);ctx.clip();
  if(turfImage)ctx.drawImage(turfImage,left,top,width,height);
  else{ctx.fillStyle='#a2b380';ctx.fillRect(left,top,width,height)}
  ctx.restore();
  paintPaving(ctx);
  ctx.fillStyle='#aaa99e';for(let v=27;v<84;v+=3)ctx.fillRect(-8.8,v,17.6,.09);
  ctx.fillStyle='#aeada1';for(let v=90;v<126;v+=3)ctx.fillRect(-13.4,v,26.8,.09);
  ctx.fillStyle='#86986e';
  for(const side of [-1,1])for(const [x,z] of plazaCypresses(side))ctx.fillRect(x-1.1,z-1.1,2.2,2.2);
}

export function createPlazaGrass(data,terrain){
  if(!data.gate)return null;
  const gate=data.gate,c=Math.cos(gate.angle),s=Math.sin(gate.angle);
  const pos=terrain.getAttribute('position'),normal=terrain.getAttribute('normal'),source=terrain.index.array;
  const positions=[],normals=[],uvs=[],indices=[],ids=new Map();
  // Retain complete triangles under the atlas so its surface follows the
  // real terrain diagonals. The high-resolution atlas includes the adjoining
  // paths, which prevents the coarse base map from blurring the grass edges.
  const uv=id=>{
    const x=pos.getX(id)-gate.x,z=pos.getZ(id)-gate.z;
    return [(x*c+z*s-left)/width,1-(-x*s+z*c-top)/height];
  };
  const radius=Math.hypot(Math.max(-left,left+width),top+height);
  for(let i=0;i<source.length;i+=3){
    const a=source[i],b=source[i+1],d=source[i+2];
    // Source grid spacing is at most 12 m per axis in the regional terrain.
    if(Math.abs(pos.getX(a)-gate.x)>radius+24||Math.abs(pos.getZ(a)-gate.z)>radius+24)continue;
    const points=[a,b,d],coords=points.map(uv);
    if([0,1].some(axis=>coords.every(p=>p[axis]<0)||coords.every(p=>p[axis]>1)))continue;
    points.forEach((key,j)=>{
      if(!ids.has(key)){
        ids.set(key,positions.length/3);
        positions.push(pos.getX(key),pos.getY(key)+.015,pos.getZ(key));
        normals.push(normal.getX(key),normal.getY(key),normal.getZ(key));uvs.push(...coords[j]);
      }
      indices.push(ids.get(key));
    });
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);
  const map=plazaTexture(makeAtlas(width,height));
  const material=new T.MeshStandardMaterial({map,roughness:1,alphaTest:.5,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  const mesh=new T.Mesh(geometry,material);mesh.name='观海广场草坪';mesh.receiveShadow=true;
  mesh.userData={
    source:'https://www.ytkj.edu.cn/info/1049/8476.htm',
    appearance:'Illustrative short turf within the reconstructed plaza beds.',
    plazaPaving:{
      referenceDates:['2024-03-09','2025-06-02'],referenceArchives:['13192','3692'],
      shandongReference:{
        source:'https://www.sdmap.gov.cn/map.html',layer:'BJ3 2026年二季度主影像',timelineLabel:'20260501'
      },
      scope:'北口接续、两侧横向红铺装、中轴方形铺装及东侧花园。南段按影像区分浅色步道、暖色种植边和草带，方坪两侧保留共同可辨的暖色露地。分缝和局部材质为示意。'
    }
  };
  return mesh;
}
