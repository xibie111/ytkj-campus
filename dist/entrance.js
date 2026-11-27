import * as THREE from './vendor/three.module.js';
import {drawPlazaGarden,plazaCypresses} from './plaza-grass.js';
import {pavingFill} from './paving-materials.js';
import {createPlazaTerrace,drawPlazaStairs,plazaStairs} from './plaza-terrace.js';

// Local u runs east along the sign, v runs uphill from the gate toward the library.
// The small offset of the flanking campus roads is from the WGS84 OSM extract.
export function toWorld(g, u, v) {
  const c = Math.cos(g.angle), s = Math.sin(g.angle);
  return [g.x + u*c - v*s, g.z + u*s + v*c];
}

// Shared extent of the brick paths behind the two north gatehouses.
const gateBrickPaths=[
  [[-26.8,3.4],[-26.3,0.65],[-33.0,0.2],[-33.6,2.0],[-32.843,3.513],[-28.518,6.949]],
  [[24.8,3.8],[25.9,7.4],[27.771,7.578],[29.954,5.836],[31.6,3.9],[31.5,1.2],[30.0,-0.4],[24.4,-0.4],[23.8,2.1]]
];
export const gateBrickPavingColor='#b68b78';
export function gateBrickPavingRings(gate) {
  return gateBrickPaths.map(ring=>ring.map(([u,v])=>toWorld(gate,u,v)));
}

export function inEntranceGarden(data, x, z) {
  if (!data.gate) return false;
  const g = data.gate, c = Math.cos(g.angle), s = Math.sin(g.angle);
  const u = (x-g.x)*c + (z-g.z)*s, v = -(x-g.x)*s + (z-g.z)*c;
  return v > -10 && v < 136 && u > -56 && u < 64;
}

export function entranceTreeSites(data) {
  if (!data.gate) return [];
  const sites = [];
  const add = (u,v,height,radius,kind) => {
    const [x,z] = toWorld(data.gate,u,v);
    sites.push({x,z,height,radius,kind});
  };
  for (const sign of [-1,1]) {
    for (const [i,[u,v]] of plazaCypresses(sign).entries()) add(u,v,5.7+(i%3)*.22,1.7+(i%2)*.12,'cypress');
    for (const v of [34,50,68,95,114,128]) add(sign*26,v,7+(v%3)*.35,3.4+(v%2)*.25,'broadleaf');
  }
  for (const v of [41,64,95,117]) add(54,v,6.8,3.4,'broadleaf');
  return sites;
}

function polygon(ctx, vertices, fill) {
  ctx.beginPath();
  vertices.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
  ctx.closePath(); ctx.fillStyle=fill; ctx.fill();
}

const signBed={half:10.55,front:-2.85,back:-1.30,edge:.14};
const signBedStone='#c3c3b8',signBedSoil='#6b7451';

function rect(ctx,x,v,w,d,color) {
  ctx.fillStyle=color; ctx.fillRect(x,v,w,d);
}

export function drawEntranceGround(ctx,data,showMarkings=true,apron=null) {
  const g=data.gate;
  if (!g) return;
  ctx.save();
  const asphalt=pavingFill(ctx,'asphalt','#999e98');
  if(apron)polygon(ctx,apron.ring,asphalt);
  ctx.translate(g.x,g.z);ctx.rotate(g.angle);
  // The access apron widens toward Xianjing West Road. Its limits join the
  // observed OSM approach-road junctions. The central crossroad stays open.
  if(!apron)polygon(ctx,[[-48.5,-41.5],[59.2,-85.1],[60.6,-45.9],[24.7,-8.8],[35.8,-3.0],
               [35.8,1.4],[16.5,16.8],[-16.4,16.8],[-35.8,1.4],[-35.8,-3],[-23,-7]],asphalt);
  if(showMarkings)for (const side of [-1,1]) {
    ctx.save();ctx.scale(side,1);
    ctx.lineWidth=.18;ctx.strokeStyle='#d9ba73';
    for (const u of [12.1,15.7,19.3]) {
      for(const k of [-.16,.16]){
        ctx.beginPath();ctx.moveTo(u+k,-.8);ctx.lineTo(u+k+(u-12.1)*.42,-29);ctx.stroke();
      }
    }
    rect(ctx,10.4,1.2,12,.30,'#e6e5d8');ctx.restore();
  }
  const {half,front,back,edge}=signBed;
  rect(ctx,-half,front,2*half,back-front,signBedStone);
  rect(ctx,-half+edge,front+edge,2*(half-edge),back-front-edge,signBedSoil);
  const brick=pavingFill(ctx,'brick',gateBrickPavingColor);
  for(const ring of gateBrickPaths)polygon(ctx,ring,brick);
  drawPlazaGarden(ctx);
  drawPlazaStairs(ctx);
  ctx.restore();
}

// Join repeated stone, glazing, kerb and metal geometry into a single opaque
// mesh. Named stonework textures are independent canvases, all bundled in GLB.
class SolidBatch {
  constructor(){this.positions=[];this.normals=[];this.colors=[]}
  put(geometry,color,x,y,z,rx=0,ry=0,rz=0){
    const mesh=geometry.index?geometry.toNonIndexed():geometry;
    const matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1));
    mesh.applyMatrix4(matrix);
    const p=mesh.attributes.position.array,n=mesh.attributes.normal.array,c=new THREE.Color(color);
    for(let i=0;i<p.length;i+=3){this.positions.push(p[i],p[i+1],p[i+2]);this.normals.push(n[i],n[i+1],n[i+2]);this.colors.push(c.r,c.g,c.b)}
    mesh.dispose();if(mesh!==geometry)geometry.dispose();
  }
  box(x,y,z,w,h,d,color){this.put(new THREE.BoxGeometry(w,h,d),color,x,y,z)}
  cylinder(x,y,z,r,h,color,n=10){this.put(new THREE.CylinderGeometry(r,r,h,n),color,x,y,z)}
  build(){const g=new THREE.BufferGeometry();
    for(const [key,data] of [['position',this.positions],['normal',this.normals],['color',this.colors]])g.setAttribute(key,new THREE.Float32BufferAttribute(data,3));
    g.computeBoundingSphere();const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85}));
    m.castShadow=true;m.receiveShadow=true;m.name='北门构架与广场构筑物';return m}
}

// Use the same rectangular bed limits as the plan. Sampling the frontage
// along its length lets the stone edging follow the sloped apron.
function buildSignBed(batch, ground) {
  const {half,front,back,edge}=signBed;
  function strip(x0,x1,z0,z1,lift,color) {
    const positions=[],faces=[],segments=Math.max(1,Math.ceil((x1-x0)/.65));
    for(let i=0;i<=segments;i++){
      const x=x0+(x1-x0)*i/segments;
      positions.push(x,ground(x,z0)+lift,z0,x,ground(x,z1)+lift,z1);
      if(i<segments){const j=2*i;faces.push(j,j+1,j+2,j+1,j+3,j+2)}
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setIndex(faces);geometry.computeVertexNormals();
    batch.put(geometry,color,0,0,0);
  }
  const ring=[[-half,front],[half,front],[half,back],[-half,back]];
  const wall=[],faces=[];
  for(let i=0;i<ring.length;i++){
    const [x0,z0]=ring[i],[x1,z1]=ring[(i+1)%ring.length];
    const count=Math.ceil(Math.hypot(x1-x0,z1-z0)/.65);
    const start=wall.length/3;
    for(let k=0;k<=count;k++){
      const x=x0+(x1-x0)*k/count,z=z0+(z1-z0)*k/count;
      const height=ground(x,z);
      wall.push(x,height+.02,z,x,height+.16,z);
      if(k<count){const j=start+2*k;faces.push(j,j+1,j+2,j+1,j+3,j+2)}
    }
  }
  const border=new THREE.BufferGeometry();
  border.setAttribute('position',new THREE.Float32BufferAttribute(wall,3));
  border.setIndex(faces);border.computeVertexNormals();
  batch.put(border,signBedStone,0,0,0);
  strip(-half,half,front,front+edge,.16,signBedStone);
  strip(-half,-half+edge,front+edge,back,.16,signBedStone);
  strip(half-edge,half,front+edge,back,.16,signBedStone);
  strip(-half+edge,half-edge,front+edge,back,.115,signBedSoil);
}

function fittedText(ctx,text,x,y,width,font,color) {
  ctx.save();ctx.font=font;ctx.fillStyle=color;ctx.textAlign='center';
  const natural=ctx.measureText(text).width;ctx.translate(x,y);ctx.scale(width/natural,1);
  ctx.fillText(text,0,0);ctx.restore();
}

function signPanel(root,text,x,y,v,width,height,school=false){
  const cv=document.createElement('canvas');cv.width=school?2048:768;cv.height=school?256:216;
  const c=cv.getContext('2d'),w=cv.width,h=cv.height;
  c.fillStyle=school?'#e2e2d9':'#e5e4dc';c.fillRect(0,0,w,h);
  c.lineWidth=1;c.strokeStyle=school?'#c7c9bf':'#c5c8be';
  const across=school?20:9;
  for(let i=1;i<across;i++){const a=w*i/across;c.beginPath();c.moveTo(a,0);c.lineTo(a,h);c.stroke()}
  if(school){
    c.beginPath();c.moveTo(0,h*.49);c.lineTo(w,h*.49);c.stroke();
    fittedText(c,text,w/2,h*.68,w*.475,'bold 130px KaiTi, STKaiti, "Noto Serif CJK SC", serif','#252b2b');
    fittedText(c,'Yantai Institute of Science and Technology',w/2,h*.875,w*.49,'bold italic 30px Georgia,serif','#333838');
  }else{fittedText(c,text,w/2,h*.76,w*.76,'bold 134px "Microsoft YaHei",sans-serif','#942c34')}
  const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshStandardMaterial({map:tex,roughness:.89}));
  m.name=text;m.position.set(x,y,v);m.rotation.y=Math.PI;root.add(m);
}

// The pale blades rise toward the entrance; the outer shafts flare at their feet.
function addGateFin(batch,u,v,y,side,stone){
  const blade=u-side*1.1,w=.74;
  const profile=new THREE.Shape();
  profile.moveTo(-w,0);
  profile.lineTo(w,0);
  profile.lineTo(w,side>0?7.68:8.17);
  profile.lineTo(-w,side>0?8.17:7.68);
  profile.closePath();
  batch.put(new THREE.ExtrudeGeometry(profile,{depth:3.25,bevelEnabled:false}),stone,blade,y,v-1.625);
  for(let k=1;k<6;k++)batch.box(blade,y+k*1.18,v,1.50,.07,3.27,'#89978d');

  const shaft=new THREE.Shape();
  shaft.moveTo(-side*1.225,0);
  shaft.lineTo(side*1.48,0);
  shaft.quadraticCurveTo(side*1.47,.85,side*1.37,1.52);
  shaft.quadraticCurveTo(side*1.25,2.43,side*1.225,3.32);
  shaft.lineTo(side*1.225,6);
  shaft.lineTo(-side*1.225,6);
  shaft.closePath();
  batch.put(new THREE.ExtrudeGeometry(shaft,{depth:3,bevelEnabled:false,curveSegments:4}),'#a8b2a4',u,y,v-1.22);
  // A narrow dark stone course is visible across the north face of all six shafts.
  batch.box(u+side*.025,y+2.58,v-1.227,2.50,.22,.026,'#775b53');
}

export function createEntrance(data,heightAt,terrace=createPlazaTerrace(data.gate,heightAt)) {
  const root=new THREE.Group();root.name='北门与观海广场';
  const g=data.gate;if(!g)return root;
  const ground=(u,v)=>heightAt(...toWorld(g,u,v));
  root.position.set(g.x,0,g.z);root.rotation.y=-g.angle;
  root.userData={basis:'校方北门正面、反向照片及 OSM 横路位置',dimensions:'以20米校名墙为锚的照片比例估计，未经现场测量'};
  const batch=new SolidBatch(),stone='#d8dbd0',silver='#b9c2bd',darkGlass='#58707a',plinth='#939d92';
  // Build a skirt down to the lowest sampled ground around each footprint.
  // The roof line and signs stay level while the perimeter meets the slope.
  function pad(u,v,w,d,c=.12){
    const levels=[];
    for(const a of [-.5,0,.5])for(const b of [-.5,0,.5])levels.push(ground(u+a*w,v+b*d));
    const low=Math.min(...levels)-.25,top=Math.max(...levels)+c;
    batch.box(u,(low+top)/2,v,w,top-low,d,plinth);return top;
  }

  buildSignBed(batch,ground);
  const signBase=pad(0,0,20.45,2.6,.03),signH=2.53;
  batch.box(0,signBase+signH/2,0,20,signH,1.5,'#dedfd6');
  signPanel(root,'烟台科技学院',0,signBase+signH/2,-.754,19.98,signH-.01,true);

  for(const side of [-1,1]){
    const u=side*28.1,v=.6,w=8.9,d=4.7,base=pad(u,v,w+.3,d+.4);
    batch.box(u,base+1.72,v,w,3.44,d,stone);
    batch.box(u,base+1.68,v-d/2-.025,w-.55,2.85,.10,darkGlass);
    for(let j=1;j<6;j++)batch.box(u-w/2+j*w/6,base+1.7,v-d/2-.09,.085,2.90,.08,silver);
    batch.box(u,base+2.05,v-d/2-.09,w-.45,.085,.08,silver);
    batch.box(u,base+4.5,v,10.2,2.35,5.5,stone);
    signPanel(root,side>0?'爱国自强':'求实创新',u,base+4.5,v-2.756,10.17,2.32);
    const pier=u+side*5.4,pierbase=pad(pier,v,2.5,4.2);
    batch.box(pier,pierbase+3.15,v,2.5,6.3,4.2,'#aeb6a9');
    for(let i=0;i<3;i++){
      const a=side*(39.0+i*6.9),vp=1.15+i*.18;
      const footing=pad(a,vp,3,3.7);
      addGateFin(batch,a,vp,footing,side,stone);
    }
  }

  // Warm stone planters define the pedestrian edge behind the crossroad.
  for(let i=-4;i<=4;i++){
    const u=i*2.55,v=26,b=pad(u,v,.98,.68,.02);
    batch.box(u,b+.22,v,.98,.44,.68,'#817665');
    batch.box(u,b+.46,v,.85,.12,.56,'#627a52');
  }
  // Dark, slender landscape lamps appear on both sides of the main promenade.
  for(const side of [-1,1])for(let i=0;i<8;i++){
    const u=side*13.35,v=30+i*8.25,b=ground(u,v);
    batch.box(u,b+1.63,v,.17,3.42,.19,'#444c46');
    batch.box(u,b+2.75,v-.10,.13,1.0,.04,'#dedac6');
  }

  const {firstTread,run,count,width,deckLength}=plazaStairs;
  const {lower,upper,end,riser}=terrace;
  const pavingLift=.022;
  for(let i=0;i<count;i++){
    const front=firstTread+i*run,back=front+run;
    const top=lower+(i+1)*riser+pavingLift;
    const bottom=Math.min(lower-.30,ground(-width/2,front)-.10,ground(width/2,front)-.10);
    batch.box(0,(top+bottom)/2,(front+back)/2,width,top-bottom,run,i%2?'#cecdc1':'#d4d2c4');
  }
  // The upper platform is level. A skirt spans the short transition back
  // onto the graded ground and keeps its side edges joined to the stair.
  const top=upper+pavingLift;
  const bottom=Math.min(ground(-width/2,end),ground(0,end),ground(width/2,end),lower)-.10;
  batch.box(0,(top+bottom)/2,end+deckLength/2,width,top-bottom,deckLength,'#cecdc1');
  root.userData.plazaTerrace={
    firstTread,end,width,run,count,riser,lower,upper,
    source:'https://www.ytkj.edu.cn/info/1049/1752.htm',
    basis:'The campus photo confirms the terrace. Display risers and levels are estimates fitted to the existing DEM.'
  };

  // The dark footprint is visible inside the square of reddish paving in
  // both orthoimages. Campus photos show a south stair with sloped cheeks.
  const flagU=.85,flagNorth=101.3,flagSouth=106.45,flagWidth=7.5,flagStepWidth=5.05;
  const flagRisers=4,flagRun=.48,flagRiser=.155;
  const flagDeckSouth=flagSouth-(flagRisers-1)*flagRun;
  const flagEdges=[flagU-flagWidth/2,flagU,flagU+flagWidth/2];
  const flagLanding=Math.max(...flagEdges.map(u=>ground(u,flagSouth)));
  const flagFoot=Math.min(...flagEdges.flatMap(u=>[flagNorth,flagDeckSouth,flagSouth].map(v=>ground(u,v))))-.10;
  const flagTop=flagLanding+flagRisers*flagRiser;
  const flagStone='#867467',flagEdge='#75665b';
  batch.box(flagU,(flagFoot+flagTop)/2,(flagNorth+flagDeckSouth)/2,flagWidth,flagTop-flagFoot,flagDeckSouth-flagNorth,flagStone);
  for(let i=1;i<flagRisers;i++){
    const v=flagSouth-(i-.5)*flagRun,y=flagLanding+i*flagRiser;
    batch.box(flagU,(flagFoot+y)/2,v,flagStepWidth,y-flagFoot,flagRun,flagStone);
  }
  const cheek=new THREE.Shape();
  cheek.moveTo(flagDeckSouth-.10,flagFoot);
  cheek.lineTo(flagSouth,flagFoot);
  cheek.lineTo(flagSouth,flagLanding+.14);
  cheek.lineTo(flagDeckSouth-.10,flagTop+.23);
  cheek.closePath();
  const cheekWidth=(flagWidth-flagStepWidth)/2;
  for(const side of [-1,1]){
    const u=flagU+side*(flagStepWidth/2+cheekWidth/2);
    const profile=new THREE.ExtrudeGeometry(cheek,{depth:cheekWidth,bevelEnabled:false});
    batch.put(profile,flagEdge,u+cheekWidth/2,0,0,0,-Math.PI/2);
  }
  const flagV=103.15,poleOffsets=[-1.57,0,1.57],poleHeights=[13.15,13.6,13.15];
  for(const [i,u] of poleOffsets.entries()){
    const h=poleHeights[i];
    batch.cylinder(flagU+u,flagTop+h/2,flagV,.082,h,'#c4cbc4',8);
  }
  root.userData.plazaFlagstand={
    u:flagU,north:flagNorth,south:flagSouth,width:flagWidth,stairWidth:flagStepWidth,
    deckSouth:flagDeckSouth,landing:flagLanding,deckHeight:flagTop,risers:flagRisers,poleV:flagV,poleOffsets,
    source:'https://www.ytkj.edu.cn/info/1049/1752.htm',
    basis:'2024-03-09 与 2025-06-02 影像校核旗台平面。校方地面照片支持三杆、前阶和斜侧墙。高度按原地形与照片比例估算。'
  };

  // East side of the plaza looking uphill: red-framed outdoor display panels
  // with thin grey shelter roofs, visible in the School of Engineering image.
  for(const u of [40.2,48.5])for(const v of [44,65,86,107]){
    for(const dv of [-1.45,1.45]){
      const b=ground(u,v+dv);batch.box(u,b+1.5,v+dv,.17,3.10,.17,'#a84234');
    }
    const b=ground(u,v);batch.box(u,b+2.90,v,.24,.27,3.12,'#a84234');
    batch.box(u,b+1.47,v,.10,1.58,2.66,'#d1cbbb');
    batch.box(u,b+3.05,v,1.23,.13,3.65,'#a6aba5');
  }

  root.userData.gateBrickPaving={
    captures:['2024-03-09','2025-06-02'],
    ringsGateUV:gateBrickPaths,
    sources:[
      'https://livingatlas.arcgis.com/wayback/#active=13192&mapCenter=120.70280%2C37.80996%2C18',
      'https://livingatlas.arcgis.com/wayback/#active=3692&mapCenter=120.70280%2C37.80996%2C18'
    ],
    basis:'Brick-coloured paving visible on both dates. The displayed extent is the shared visible section within the current gate apron, following its existing grade.'
  };
  root.userData.gateFins={
    sources:['https://www.ytkj.edu.cn/info/1049/8475.htm','https://www.ytkj.edu.cn/info/1049/8483.htm'],
    basis:'Summer and winter photos show six sloped pale caps and dark courses on the flared shafts. Footings use the existing model; section dimensions are display estimates.'
  };
  root.add(batch.build());return root;
}
