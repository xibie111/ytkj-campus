import * as THREE from './vendor/three.module.js';
import {createNorthBank, drawNorthBank, onNorthBank} from './athletics-north-bank.js';
import {createTerraceLayout} from './athletics-terraces.js';
import {createFlagTerrace, drawFlagTerrace} from './athletics-flag-terrace.js';
import {drawTrainingCourts} from './training-courts.js';
import {createFootballGoals, goalOpeningWidth} from './football-goals.js';
import {addDeckGuardrail, addGrandstandTruss, addStairGuardrail, createSouthStandWings, drawSouthStandPlan, membraneLift, smoothMembraneBay, southStandExcludesTree} from './grandstand-details.js';

// The 2025/2026 Sentinel-2 red-surface edges constrain the apron, not the
// painted lanes. Dimensions below are rounded to reflect the 10 m imagery.
const APRON_STRAIGHT = 75;
const APRON_RADIUS = 52.5;
const APRON_OFFSET = -3;
const APRON_TURN = -.045;
const LANE = 1.22;
const TRACK_STRAIGHT = 75;
// World Athletics measures lane one 0.30 m from its inside raised kerb.
const KERB_RADIUS = (400 - 2 * TRACK_STRAIGHT) / (2 * Math.PI) - .30;
const FIELD_LEVEL = 54.4; // seven Copernicus GLO-30 grass-pixel centres, median 54.374 m
const northTerraces=createTerraceLayout(APRON_STRAIGHT, APRON_RADIUS, APRON_OFFSET, APRON_TURN);

// A small periodic colour tile represents aggregate and turf nap. The
// patterns are authored here and have no dependency on the reference photos.
const finishes = new Map();
export function sportsFinish(ctx, kind, hex) {
  const key = kind + hex;
  if (finishes.has(key)) return finishes.get(key);
  const size = 96, metres = kind === 'turf' ? 4.8 : 5.4;
  const tile = document.createElement('canvas');
  tile.width = tile.height = size;
  const brush = tile.getContext('2d'), pixels = brush.createImageData(size, size);
  const color = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  let seed = 71329;
  function random() {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296 - .5;
  }
  const nap = Array.from({length:size}, random);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const grain = kind === 'turf'
        ? nap[x] * 3.5 + random() * 9
        : random() * (kind === 'rubber' ? 19 : 11) + random() * 5;
      for (let k = 0; k < 3; k++) pixels.data[i+k] = color[k] + grain;
      pixels.data[i+3] = 255;
    }
  }
  brush.putImageData(pixels, 0, 0);
  const pattern = ctx.createPattern(tile, 'repeat');
  pattern.setTransform(new DOMMatrix().scale(metres / size));
  finishes.set(key, pattern);
  return pattern;
}

function stadiumPath(ctx, straight, radius) {
  ctx.beginPath();
  ctx.arc(straight / 2, 0, radius, -Math.PI / 2, Math.PI / 2);
  ctx.arc(-straight / 2, 0, radius, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
}

function localTrack(field, x, z) {
  const dx = x - field.x, dz = z - field.z;
  const ca = Math.cos(field.angle), sa = Math.sin(field.angle);
  const u = dx * ca + dz * sa;
  const v = -dx * sa + dz * ca - APRON_OFFSET;
  const c = Math.cos(APRON_TURN), s = Math.sin(APRON_TURN);
  return [u * c + v * s, -u * s + v * c];
}

export function athleticsEdgeDistance(field, x, z, protectTerraces=false) {
  if (!field) return Infinity;
  const [u,v] = localTrack(field,x,z);
  if(protectTerraces && (northTerraces.excludesTree(u,v)||southStandExcludesTree(x,z)||onNorthBank(field,x,z))) return 0;
  return Math.hypot(Math.max(0,Math.abs(u) - APRON_STRAIGHT / 2),v) - APRON_RADIUS;
}

export function athleticsGround(baseHeight, field) {
  if (!field) return baseHeight;
  return (x,z) => {
    const edge = athleticsEdgeDistance(field,x,z);
    // An 18 m guard band covers the diagonal of the 12 m terrain triangles.
    // This prevents edge triangles from cutting through the running surface.
    if (edge <= 18) return FIELD_LEVEL;
    if (edge >= 42) return baseHeight(x,z);
    const t = (edge-18)/24;
    const blend = t*t*(3-2*t);
    return FIELD_LEVEL + (baseHeight(x,z)-FIELD_LEVEL)*blend;
  };
}

function pitchLines(c, length, width, lineWidth=.12) {
  const end = length / 2, side = width / 2;
  const penaltyHalf = 16.5 + goalOpeningWidth/2, goalHalf = 5.5 + goalOpeningWidth/2;
  c.strokeStyle='#edf1df';c.fillStyle=c.strokeStyle;c.lineWidth=lineWidth;
  c.strokeRect(-end,-side,length,width);
  c.beginPath();c.moveTo(0,-side);c.lineTo(0,side);c.stroke();
  c.beginPath();c.arc(0,0,9.15,0,Math.PI*2);c.stroke();
  const spot=(x,z)=>{c.beginPath();c.arc(x,z,.15,0,Math.PI*2);c.fill()};
  spot(0,0);
  for (const sign of [-1,1]) {
    c.save();c.scale(sign,1);
    c.strokeRect(end-16.5,-penaltyHalf,16.5,2*penaltyHalf);
    c.strokeRect(end-5.5,-goalHalf,5.5,2*goalHalf);
    spot(end-11,0);
    const alpha = Math.acos(5.5/9.15);
    c.beginPath();c.arc(end-11,0,9.15,Math.PI-alpha,Math.PI+alpha);c.stroke();
    c.beginPath();c.arc(end,-side,1,Math.PI/2,Math.PI);c.stroke();
    c.beginPath();c.arc(end,side,1,Math.PI,Math.PI*1.5);c.stroke();
    c.restore();
  }
}

// Both the plan and the 3D ribbons use these same centre lines.
function runningLines(ring,segment) {
  const inside=-KERB_RADIUS;
  for (let i=0;i<=8;i++) ring(KERB_RADIUS+i*LANE);
  for (let i=0;i<=10;i++) {
    const z=inside-i*LANE;
    if (i<=8) {
      segment(-64,z,-TRACK_STRAIGHT/2,z);
      segment(TRACK_STRAIGHT/2,z,59,z);
    } else segment(-64,z,59,z);
  }
  // The two schematic sprint markings are exactly 100 m apart.
  for (const x of [-60,40]) segment(x,inside,x,inside-10*LANE);
}

function createRunningPaint() {
  const positions=[],indices=[],offsets=[];
  const paintWidth=.05,half=paintWidth/2;
  function ribbon(points) {
    let prev=-1;
    for (const [x,z,nx,nz] of points) {
      const id=positions.length/3;
      positions.push(x-nx*half,0,z-nz*half,x+nx*half,0,z+nz*half);
      offsets.push(-nx*.5,-nz*.5,nx*.5,nz*.5);
      if (prev>=0) indices.push(prev,id,prev+1,prev+1,id,id+1);
      prev=id;
    }
  }
  runningLines(radius=>{
    const pts=[];
    for (const side of [1,-1]) {
      for (let i=0;i<=96;i++) {
        const a=(side===1?-Math.PI/2:Math.PI/2)+i*Math.PI/96;
        const nx=Math.cos(a),nz=Math.sin(a);
        pts.push([side*TRACK_STRAIGHT/2+radius*nx,radius*nz,nx,nz]);
      }
    }
    pts.push(pts[0]);ribbon(pts);
  },(x,z,u,v)=>{
    const len=Math.hypot(u-x,v-z),nx=(v-z)/len,nz=-(u-x)/len;
    ribbon([[x,z,nx,nz],[u,v,nx,nz]]);
  });
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('strokeOffset',new THREE.Float32BufferAttribute(offsets,2));
  geo.setIndex(indices);geo.computeVertexNormals();
  const mat=new THREE.MeshStandardMaterial({color:'#f2e8d7',roughness:1,
    polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  // Thin paint can miss alternating raster samples in an oblique view.
  // Widen subpixel strokes on screen only, using their projected direction.
  const viewport={value:new THREE.Vector2(1,1)};
  mat.onBeforeCompile=shader=>{
    shader.uniforms.strokeViewport=viewport;
    shader.vertexShader='attribute vec2 strokeOffset; uniform vec2 strokeViewport;\n'+
      shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        vec2 offsetDirection = 2. * strokeOffset;
        mat4 mvp = projectionMatrix * modelViewMatrix;
        vec2 normalOnScreen = (mvp * vec4(offsetDirection.x, 0., offsetDirection.y, 0.)).xy * strokeViewport * .5;
        vec2 lineOnScreen = (mvp * vec4(-offsetDirection.y, 0., offsetDirection.x, 0.)).xy * strokeViewport * .5;
        float pixelsPerMetre = abs(normalOnScreen.x * lineOnScreen.y - normalOnScreen.y * lineOnScreen.x) / max(.001, length(lineOnScreen));
        float width = max(${paintWidth}, min(.20, .85 / max(.001, pixelsPerMetre)));
        transformed.xz += strokeOffset * (width - ${paintWidth});`);
  };
  const mesh=new THREE.Mesh(geo,mat);
  mesh.onBeforeRender=renderer=>renderer.getSize(viewport.value);
  mesh.position.set(0,.003,APRON_OFFSET);mesh.rotation.y=-APRON_TURN;
  mesh.name='环道与短跑道白线';mesh.receiveShadow=true;
  return mesh;
}

function drawLocalAthletics(c,field,paintRunningLines=true) {
  c.save();c.translate(0,APRON_OFFSET);c.rotate(APRON_TURN);
  stadiumPath(c, APRON_STRAIGHT, APRON_RADIUS);
  c.fillStyle=sportsFinish(c,'rubber','#b57165');c.fill();
  // The running band keeps the fitted lane edges; only its finish changes.
  stadiumPath(c,TRACK_STRAIGHT,KERB_RADIUS+4*LANE);
  c.strokeStyle=sportsFinish(c,'rubber','#ae655b');c.lineWidth=8*LANE;c.stroke();
  c.save();
  // The south straight facing the rostrum has extra sprint markings. Campus
  // photographs show these, but do not resolve every lane around the bends.
  const inside = -KERB_RADIUS;
  c.fillStyle=sportsFinish(c,'rubber','#ae655b');c.fillRect(-64,inside-10*LANE,123,10*LANE);
  if (paintRunningLines) drawRunningMarks(c,.05);
  c.restore();c.restore();
  const L=field.length,W=field.width;
  c.fillStyle=sportsFinish(c,'turf','#748b5e');c.fillRect(-L/2-1.5,-W/2-1.5,L+3,W+3);
  const stripes=26;
  for(let i=0;i<stripes;i++){
    c.fillStyle=sportsFinish(c,'turf',i%2?'#809763':'#91a574');
    c.fillRect(-L/2+i*L/stripes,-W/2,L/stripes+.001,W);
  }
  drawTrainingCourts(c,field);
  pitchLines(c,L,W);
}

function drawRunningMarks(c,lineWidth) {
  c.strokeStyle='#f2e8d7';c.lineWidth=lineWidth;
  runningLines(r=>{stadiumPath(c,TRACK_STRAIGHT,r);c.stroke()},(x,z,u,v)=>{
    c.beginPath();c.moveTo(x,z);c.lineTo(u,v);c.stroke();
  });
}

export function athleticsHalfExtent(field,x,z) {
  const angle=field.angle+APRON_TURN;
  return APRON_RADIUS*Math.hypot(x,z)+APRON_STRAIGHT/2*Math.abs(x*Math.cos(angle)+z*Math.sin(angle));
}

export function athleticsPlanBounds(field) {
  const x=field.x-APRON_OFFSET*Math.sin(field.angle);
  const z=field.z+APRON_OFFSET*Math.cos(field.angle);
  const halfWidth=athleticsHalfExtent(field,1,0);
  const halfHeight=athleticsHalfExtent(field,0,1);
  return [x-halfWidth,z-halfHeight,x+halfWidth,z+halfHeight];
}

// At the venue scale the existing paint widths are subpixel. Reuse the
// existing centre lines and leave the terrain atlas and 3D dimensions intact.
export function drawAthleticsPlanMarks(c,field,scale,view) {
  if (!field||scale<=.65||scale>=12) return;
  const [west,north,east,south]=athleticsPlanBounds(field);
  if (east<view[0]||south<view[1]||west>view[2]||north>view[3]) return;
  const width=Math.min(.55,.60/scale);
  c.save();
  c.globalAlpha*=Math.min(1,(scale-.65)/.25);
  c.translate(field.x,field.z);c.rotate(field.angle);
  c.save();c.translate(0,APRON_OFFSET);c.rotate(APRON_TURN);
  drawRunningMarks(c,width);
  c.restore();
  if(width>.105)drawTrainingCourts(c,field,width);
  if(width>.12)pitchLines(c,field.length,field.width,width);
  c.restore();
}

export function drawAthletics(c,field) {
  if (!field) return;
  c.save();c.translate(field.x,field.z);c.rotate(field.angle);
  drawLocalAthletics(c,field);northTerraces.drawPlan(c);drawFlagTerrace(c);drawNorthBank(c);c.restore();
  drawSouthStandPlan(c);
}

export function createAthleticsOverlay(field) {
  if (!field) return null;
  const width=208,height=128,scale=12;
  const canvas=document.createElement('canvas');canvas.width=width*scale;canvas.height=height*scale;
  const c=canvas.getContext('2d');c.setTransform(scale,0,0,scale,canvas.width/2,canvas.height/2);
  drawLocalAthletics(c,field,false);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;
  const geo=new THREE.PlaneGeometry(width,height);geo.rotateX(-Math.PI/2);
  const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({map:tex,alphaTest:.45,roughness:1}));
  mesh.name='田径场面层与标线';mesh.position.set(field.x,FIELD_LEVEL+.045,field.z);
  mesh.userData.trainingCourts={count:2,stripes:26,source:'https://www.ytkj.edu.cn/info/1115/6346.htm',
    eventDate:'2024-05-30', videoSeconds:[25.2,30.9], basis:'黄色横向小场、分区弧和草皮条带据影片估放。尺寸未经实测。'};
  mesh.userData.appearance='Original illustrative rubber aggregate and alternating turf bands, compared to school athletics photographs. Lane geometry retained.';
  mesh.rotation.y=-field.angle;mesh.receiveShadow=true;
  mesh.add(createRunningPaint(),createFootballGoals(field));
  mesh.add(createNorthBank(mesh.position.y-FIELD_LEVEL));
  mesh.add(northTerraces.mesh(mesh.position.y - FIELD_LEVEL));
  mesh.add(createFlagTerrace(mesh.position.y-FIELD_LEVEL));
  mesh.add(createSouthStandWings(field,mesh.position.y-FIELD_LEVEL));
  return mesh;
}

// Original geometry based on the school’s frontal photographs. Keep one
// pickable mesh, use the recorded B082 roof long axis and the inherited height.
export function createGrandstand(item,field,heightAt) {
  const ring=item.ring,center=item.center;
  let longest=0,ux=1,uz=0;
  for(let i=0;i<ring.length;i++){
    const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
    if(len>longest){longest=len;ux=dx/len;uz=dz/len}
  }
  let vx=-uz,vz=ux;
  if((field.x-center[0])*vx+(field.z-center[1])*vz<0){vx=-vx;vz=-vz}
  const depthAxis=ring.map(p=>(p[0]-center[0])*vx+(p[1]-center[1])*vz);
  const D=Math.max(...depthAxis)-Math.min(...depthAxis),W=longest,H=item.height;
  const base=heightAt(center[0],center[1]);
  const positions=[],colors=[],color=new THREE.Color();
  function triangle(a,b,c,fill){
    color.set(fill);
    for(const p of [a,b,c]){
      positions.push(ux*p[0]+vx*p[2],p[1],uz*p[0]+vz*p[2]);
      colors.push(color.r,color.g,color.b);
    }
  }
  function quad(a,b,c,d,fill){triangle(a,b,c,fill);triangle(a,c,d,fill)}
  function box(x0,x1,y0,y1,z0,z1,fill){
    quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],fill);
    quad([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],fill);
    quad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],fill);
    quad([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],fill);
    quad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],fill);
  }
  const front=D*.48,back=-D*.42;
  box(-W*.487,W*.487,-.24,H*.23,back,front,'#e3e4dc');
  for(let i=0;i<8;i++){
    const x=(i-3.5)*W*.096;
    box(x-.72,x+.72,0,H*.165,front,front+.04,'#5c696a');
  }
  for(let tier=0;tier<3;tier++){
    const level=H*(.32+tier*.09),edge=front-(tier+1)*D*.14;
    box(-W*.435,W*.435,H*.23+tier*.09*H,level,back,edge,'#dfdfd5');
    addDeckGuardrail(box,-W*.435,W*.435,level,edge);
  }
  for(const side of [-1,1]){
    const x0=side<0?-W*.495:W*.442,x1=x0+W*.053;
    for(let i=0;i<20;i++){
      const z=front-(i+1)*D*.041;
      box(x0,x1,0,H*.52*(i+1)/20,z,z+D*.041,'#b7b9ae');
    }
    const outer=side<0?x0+.10:x1-.10;
    addStairGuardrail(box,quad,outer,front,D*.041,H*.52/20,20);
  }
  box(-W*.485,W*.485,H*.47,H*.73,back-.07*D,back,'#cfcec1');
  // Slim columns on the two sides and the rear support the five peaked bays.
  for(let i=0;i<=5;i++){
    const x=(i/5-.5)*W;
    box(x-.10,x+.10,H*.50,H*.84,back+.12,back+.32,'#babeae');
  }
  for(const side of [-1,1]){
    box(side*W*.48-.12,side*W*.48+.12,H*.30,H*.81,front*.33,front*.33+.23,'#c1c2b5');
  }
  const membraneColour='#f3f0e5', membraneBays=[];
  addGrandstandTruss(box,quad,W,H,front*.60);
  for(let bay=0;bay<5;bay++){
    const first=positions.length/3;
    const x0=-W*.525+W*1.05*bay/5,x1=x0+W*1.05/5,xc=(x0+x1)/2;
    const near=front*.60,far=-D*.55,peakDepth=(near+far)/2;
    // A concave radial section gives the canopy a tensile silhouette.
    const grid=8,point=(i,j)=>{
      const u=i/grid,v=j/grid;
      return [xc+(u-.5)*(x1-x0),H*(.80+.20*membraneLift(u,v,bay)),peakDepth+(v-.5)*(near-far)];
    };
    for(let j=0;j<grid;j++)for(let i=0;i<grid;i++){
      quad(point(i,j),point(i+1,j),point(i+1,j+1),point(i,j+1),membraneColour);
    }
    membraneBays.push([first,positions.length/3]);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  for(const [first,last] of membraneBays)smoothMembraneBay(geometry,first,last);
  // Positions use east/down-map axes. The open membrane is visible from below.

  const material=new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.88});
  const mesh=new THREE.Mesh(geometry,material);mesh.name=item.name;mesh.position.set(center[0],base,center[1]);
  mesh.userData.buildingId=item.id;
  mesh.userData.guardrailEvidence={
    source:'https://www.ytkj.edu.cn/info/1081/3549.htm',
    date:'2022-09-08',
    basis:'校方田径场正面照片可辨三道看台栏杆及两端斜梯扶手。与现有台阶连接，杆距和高度为展示估值。'
  };
  mesh.castShadow=mesh.receiveShadow=true;
  return mesh;
}

