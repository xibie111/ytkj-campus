import * as THREE from './vendor/three.module.js';
import {groundPolygonDistance} from './terrain-surface.js';

// Pitch-local u runs toward the west end and v toward the north hillside.
// The western length ends at the rock break in the 10.2 s view. The toe
// disappears behind conifers and stays uphill of the mapped service road.
const bank = [
  [-21.6,90.7], [36.1,81.6], [79.5,74.8], [74.6,68.0],
  [65.5,69.1], [56,69.9], [36,71.85], [-21.5,80.6],
];
const rows = [
  [[-19.7,88.2],[-12.9,87.3],[-6.3,86.9],[.9,85.4],[7.1,84.9],[14.1,83.3],[20.2,82.4],[26.5,81.4],[32.7,80.4],[38.6,79.4],[45.1,78.4],[58.5,75.8],[67.5,74.6],[76.9,73.3]],
  [[-16.3,85.6],[-9.6,84.9],[-2.5,83.6],[4,82.9],[10.6,81.7],[17,80.7],[23.3,79.6],[29.5,78.6],[35.8,77.6],[41.5,76.8],[47.8,75.9],[62.3,73.3],[70.2,72.3]],
  [[-19.8,83.5],[-12.9,83.1],[.8,80.8],[7.2,80],[14.1,78.8],[20,78],[26.4,77],[32.5,76],[38.5,75],[44.5,74.2],[57.7,72]],
  [[10.5,77.2],[23.1,75.2],[29.3,74.3]],
];

const gradientU=.1691, gradientV=.8833;
const height=(u,v)=>gradientU*u+gradientV*v-64.177;
const origin=new THREE.Vector3(0,height(0,0),0);
const across=new THREE.Vector3(1,0,-gradientU/gradientV).normalize();
const normal=new THREE.Vector3(-gradientU,1,-gradientV).normalize();
const uphill=across.clone().cross(normal);
const facePoint=(u,v)=>new THREE.Vector3(u,height(u,v),v);
const flatten=(u,v)=>{
  const d=facePoint(u,v).sub(origin);
  return new THREE.Vector2(d.dot(across),d.dot(uphill));
};
function restore(p,depth=0){
  return origin.clone().addScaledVector(across,p.x).addScaledVector(uphill,p.y).addScaledVector(normal,depth);
}
function arch(center,width,rise) {
  const radius=width/2, left=center.x-radius, right=center.x+radius;
  const bottom=center.y-rise/2, spring=bottom+rise-radius;
  const ring=[new THREE.Vector2(left,bottom),new THREE.Vector2(right,bottom)];
  for(let j=0;j<=8;j++){
    const a=Math.PI*j/8;
    ring.push(new THREE.Vector2(center.x+radius*Math.cos(a),spring+radius*Math.sin(a)));
  }
  return ring;
}

const contour=bank.map(([u,v])=>flatten(u,v));
const openings=rows.flat().map(([u,v])=>{
  const center=flatten(u,v);
  return {center, rim:arch(center,1.32,1.78), inside:arch(center,.92,1.4)};
});
const bankDistance=groundPolygonDistance(bank,10);
export function onNorthBank(field,x,z){
  if(!field)return false;
  const c=Math.cos(field.angle),s=Math.sin(field.angle),dx=x-field.x,dz=z-field.z;
  return bankDistance(c*dx+s*dz,-s*dx+c*dz)<.35;
}

export function northBankGrade(field,level,roads) {
  if(!field)return null;
  const c=Math.cos(field.angle),s=Math.sin(field.angle);
  const world=bank.map(([u,v])=>[field.x+c*u-s*v,field.z+s*u+c*v]);
  const blend=8, distance=groundPolygonDistance(world,blend+15);
  const minX=Math.min(...world.map(p=>p[0]))-14, maxX=Math.max(...world.map(p=>p[0]))+14;
  const minZ=Math.min(...world.map(p=>p[1]))-14, maxZ=Math.max(...world.map(p=>p[1]))+14;
  const guards=(roads?.polygons||[]).filter(({ring})=>
    !ring.every(([x])=>x<minX)&&!ring.every(([x])=>x>maxX)&&
    !ring.every(([,z])=>z<minZ)&&!ring.every(([,z])=>z>maxZ)
  ).map(({ring})=>groundPolygonDistance(ring,4));
  return {distance,blend,subdivisions:18,adjust(x,z,baseline){
    const outside=distance(x,z);
    if(outside>=blend)return baseline;
    let clearance=4;
    for(const guard of guards)clearance=Math.min(clearance,guard(x,z));
    const roadWeight=THREE.MathUtils.smoothstep(clearance,1.45,3.8);
    if(!roadWeight)return baseline;
    const dx=x-field.x,dz=z-field.z, u=c*dx+s*dz,v=-s*dx+c*dz;
    // Keep the ground behind the shallow recesses. The coarse regional DSM
    // crosses their centres by 1–6 m in the calibrated part of the wall.
    const target=level+height(u,v)-.72;
    return baseline+(target-baseline)*(1-THREE.MathUtils.smoothstep(outside,0,blend))*roadWeight;
  }};
}

function stoneTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d');
  let seed=52173;
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  ctx.fillStyle='#a59d8d';ctx.fillRect(0,0,256,256);
  // Jittered, interlocked rubble rather than continuous horizontal brickwork.
  const joints=[];
  for(let j=0;j<16;j++){
    joints.push(Array.from({length:18},(_,i)=>[i*256/18+random()*8,j*16+random()*7]));
  }
  const joint=(i,j)=>{
    const p=joints[(j+16)%16][(i+18)%18];
    return [p[0]+Math.floor(i/18)*256,p[1]+Math.floor(j/16)*256];
  };
  for(let j=-1;j<16;j++)for(let i=-1;i<18;i++){
    const tint=Math.round(148+random()*46);
    ctx.fillStyle='rgb('+tint+','+(tint-6)+','+(tint-17)+')';
    const pts=[joint(i,j),joint(i+1,j),joint(i+1,j+1),joint(i,j+1)];
    ctx.beginPath();pts.forEach(([x,y],k)=>k?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
    ctx.fill();ctx.strokeStyle='#a39a89';ctx.lineWidth=1.3;ctx.stroke();
  }
  const px=ctx.getImageData(0,0,256,256);
  for(let i=0;i<px.data.length;i+=4){
    const noise=(random()-.5)*19;
    for(let k=0;k<3;k++)px.data[i+k]+=noise;
  }
  ctx.putImageData(px,0,0);
  const texture=new THREE.CanvasTexture(canvas);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  return texture;
}

export function drawNorthBank(ctx){
  ctx.save();
  ctx.fillStyle='#b4ab98';ctx.beginPath();
  bank.forEach(([u,v],i)=>i?ctx.lineTo(u,v):ctx.moveTo(u,v));ctx.closePath();ctx.fill();
  ctx.strokeStyle='#cdc4b1';ctx.lineWidth=.2;ctx.beginPath();
  for(let i=0;i<3;i++)i?ctx.lineTo(...bank[i]):ctx.moveTo(...bank[i]);
  ctx.stroke();
  for(const {rim,inside} of openings){
    for(const [path,fill] of [[rim,'#d5cbb5'],[inside,'#6a6757']]){
      ctx.fillStyle=fill;ctx.beginPath();
      path.forEach((p,i)=>{const {x,z}=restore(p);i?ctx.lineTo(x,z):ctx.moveTo(x,z);});
      ctx.closePath();ctx.fill();
    }
  }
  ctx.restore();
}

export function createNorthBank(overlayHeight){
  const positions=[],colors=[],uv=[],vColor=new THREE.Color();
  function triangle(a,b,c,tint){
    vColor.set(tint);
    for(const p of [a,b,c]){
      positions.push(p.x,p.y,p.z);colors.push(vColor.r,vColor.g,vColor.b);
      const d=p.clone().sub(origin);uv.push(d.dot(across)/5,d.dot(uphill)/5);
    }
  }
  function quad(a,b,c,d,tint){triangle(a,b,c,tint);triangle(a,c,d,tint);}
  // Each recessed opening owns its surrounding patch. Clipping by nearest
  // centre keeps the thin facing manifold at the irregular staggered rows.
  for(const opening of openings){
    let patch=contour;
    for(const other of openings){
      if(opening===other)continue;
      const axis=other.center.clone().sub(opening.center);
      const mid=opening.center.clone().lerp(other.center,.5);
      const next=[];
      for(let j=0;j<patch.length;j++){
        const a=patch[j],b=patch[(j+1)%patch.length];
        const da=axis.x*(a.x-mid.x)+axis.y*(a.y-mid.y);
        const db=axis.x*(b.x-mid.x)+axis.y*(b.y-mid.y);
        if(da<=0)next.push(a);
        if((da<0&&db>0)||(da>0&&db<0))next.push(a.clone().lerp(b,da/(da-db)));
      }
      patch=next;
    }
    const triangles=THREE.ShapeUtils.triangulateShape(patch,[opening.rim]);
    const points=[...patch,...opening.rim];
    for(const [a,b,c] of triangles)triangle(restore(points[c]),restore(points[b]),restore(points[a]),'#ffffff');
  }
  const bodyCount=positions.length/3;
  for(let i=0;i<contour.length;i++){
    const a=restore(contour[i]),b=restore(contour[(i+1)%contour.length]);
    const buried=p=>p.clone().add(new THREE.Vector3(0,-.93,0));
    quad(a,b,buried(b),buried(a),i<2?'#c7c0ab':'#9c9383');
  }
  for(const {rim,inside} of openings){
    const innerSurface=inside.map(p=>restore(p,.025)), inset=inside.map(p=>restore(p,-.30));
    const jamb=rim.map(p=>restore(p)), n=jamb.length;
    const center=new THREE.Vector3();inset.forEach(p=>center.add(p));center.divideScalar(n);
    for(let i=0;i<n;i++){
      const j=(i+1)%n;
      quad(jamb[i],jamb[j],innerSurface[j],innerSurface[i],'#d5ccb8');
      quad(innerSurface[i],innerSurface[j],inset[j],inset[i],i===0?'#99917c':'#827c6b');
      triangle(center,inset[j],inset[i],'#58574b');
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.addGroup(0,bodyCount,0);geometry.addGroup(bodyCount,positions.length/3-bodyCount,1);
  geometry.computeVertexNormals();
  const materials=[
    new THREE.MeshStandardMaterial({map:stoneTexture(),side:THREE.DoubleSide,roughness:1}),
    new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:1}),
  ];
  const mesh=new THREE.Mesh(geometry,materials);
  mesh.name='田径场北坡东段石砌护坡';mesh.position.y=-overlayHeight;
  mesh.castShadow=mesh.receiveShadow=true;
  mesh.userData={source:'https://www.ytkj.edu.cn/info/1115/6346.htm',
    secondSource:'https://www.ytkj.edu.cn/info/1081/8367.htm',eventDates:['2024-05-30','2026-09-20'],
    videoSeconds:[10.2,25.2],observedOpenings:rows.map(r=>r.length),stereoMatchedOpenings:12,
    fittedSlopeDegrees:42,basis:'东段四排可辨拱口。12 处可跨机位匹配。墙顶长约 102 米，受遮挡的坡脚与拱内深度为示意。西段裸岩与独立砌面未并入。'};
  return mesh;
}
