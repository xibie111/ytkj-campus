import * as THREE from './vendor/three.module.js';
import {createEighthDorm} from './dongshan-eighth-dorm.js';
import {createSlopeDorm} from './dongshan-slope-dorm.js';
import {cultureFacade, xianjingFacade, houdeEntrance, selectDiningEntrance} from './dining-architecture.js';
import {houdePlazaFront} from './houde-plaza-front.js';
import {libraryPlazaFront, libraryFrontEvidence} from './library-plaza-front.js';
import {createFinanceBridge} from './finance-bridge.js';
import {financeWingRoof} from './finance-wing.js';
import {drawFinanceNorthFront, drawFinanceTowerWest} from './finance-north-frontage.js';
import {sixthTeachingWall, sixthTeachingRoof, sixthTeachingEvidence} from './sixth-teaching-roof.js';

// X points east, Z points south. All lengths are metres. The tile is original
// procedural artwork. Window spacing, materials and parapets are approximations.
const profiles = {
  library: { wall: '#d7d9cf', roof: '#a7ada8', rim: '#ecece0', glass: [77, 99, 108], bay: 2.05, storey: 4.2 },
  westArcade: { wall: '#c7d0cd', roof: '#aaafaa', rim: '#dfe2da', glass: [74, 126, 133], bay: 3.1, storey: 3.4 },
  eastCommercial: { wall: '#e0e1d6', roof: '#b7b8ab', rim: '#eeede1', glass: [85, 125, 129], bay: 3.45, storey: 4.5 },
  teaching: { wall: '#d9cdbb', roof: '#a4a9a3', rim: '#e9dfcd', glass: [85, 111, 116], bay: 3.9, storey: 3.8 },
  sixthTeaching: { wall: '#e3ded2', roof: '#c7c3b7', rim: '#d8d7cd', glass: [85, 104, 107], bay: 2.25, storey: 3.8 },
  dorm: { wall: '#e1d7c5', roof: '#9fa6a2', rim: '#eee6d9', glass: [92, 111, 117], bay: 3.4, storey: 3.2 },
  sports: { wall: '#c5d2d2', roof: '#6799ae', rim: '#dce6e4', glass: [73, 114, 124], bay: 5.2, storey: 5.3 },
  hall: { wall: '#ddd4c5', roof: '#a2aaa9', rim: '#e9e4d9', glass: [83, 104, 108], bay: 3.9, storey: 4.2 },
  dining: { wall: '#d5beaa', roof: '#a9aaa3', rim: '#e4d8c7', glass: [86, 111, 111], bay: 4.3, storey: 4.1 },
  cultureDining: { wall: '#ab6251', roof: '#a5a9a5', rim: '#e8e5d8', glass: [79, 112, 119], bay: 4.5, storey: 4.1 },
  xianjingDining: { wall: '#dadbd5', roof: '#929a99', rim: '#d5d8ce', glass: [76, 107, 114], bay: 3.1, storey: 4.0 },
  service: { wall: '#d2c8b6', roof: '#a3a7a1', rim: '#e1dbce', glass: [108, 124, 122], bay: 4.5, storey: 3.6 },
  unknown: { wall: '#d5cdbe', roof: '#abaea7', rim: '#e7e0d4', glass: [104, 121, 123], bay: 4.0, storey: 3.6 }
};

function makeFacade(kind, profile) {
  // Three bays reduce the repetition of the glazing. All solid surfaces sample
  // the white texel at the corner of the tile, including across mip levels.
  const width = 192, height = 64, pixels = new Uint8Array(width * height * 4);
  pixels.fill(255);
  const continuous = ['library', 'sports', 'hall', 'westArcade'].includes(kind);
  const left = continuous ? 2 : kind === 'dorm' ? 8 : 9;
  const right = continuous ? 62 : 55;
  const bottom = kind === 'westArcade' ? 3 : continuous ? 12 : 16;
  const top = kind === 'westArcade' ? 62 : continuous ? 54 : 51;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const col = x % 64, bay = Math.floor(x / 64);
      let rgb = [255, 255, 255];
      if (col >= left && col <= right && y >= bottom && y <= top) {
        const frame = col < left + 2 || col >= right - 1 || y <= bottom + 1 || y >= top - 1;
        const mullion = col === 31 || col === 32 || y === top - 9;
        const sky = 0.77 + (y - bottom) * .007 + [0, .07, -.06][bay] + (col < 31 ? .055 : 0);
        rgb = frame ? [83, 89, 85] : mullion ? [192, 193, 183] : profile.glass.map(c => Math.min(255, c * sky));
      } else if (y === bottom - 2 && col >= left - 1 && col <= right + 1) {
        rgb = [205, 204, 197];
      } else if (kind === 'teaching' && y > 4 && y < bottom - 3) {
        rgb = [211, 171, 150];
      } else if (kind === 'dorm' && col >= left - 2 && col <= right + 2 && y >= 4 && y < bottom - 2) {
        rgb = [204, 193, 181];
      }
      const offset = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel++) pixels[offset + channel] = rgb[channel];
    }
  }
  const texture = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat);
  texture.name = kind + ' · wall bays';
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return new THREE.MeshStandardMaterial({
    name: kind + ' · facade', map: texture, vertexColors: true, roughness: .85, metalness: 0
  });
}

function orientedRing(input, outer) {
  const result = [];
  for (const pt of input || []) {
    if (!Array.isArray(pt) || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) continue;
    const prev = result.at(-1);
    if (!prev || Math.hypot(pt[0] - prev[0], pt[1] - prev[1]) > .01) result.push(pt);
  }
  if (result.length > 1 && Math.hypot(result[0][0] - result.at(-1)[0], result[0][1] - result.at(-1)[1]) < .01) result.pop();
  let area = 0;
  for (let i = 0; i < result.length; i++) {
    const a = result[i], b = result[(i + 1) % result.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  if (Math.abs(area) < .02) return [];
  if ((area > 0) !== outer) result.reverse();
  return result;
}

const solidUV = [0.001, 0.02];
class BuildingGeometry {
  constructor() {
    this.positions = [];
    this.colors = [];
    this.uvs = [];
    this.indices = [];
    this.colorMap = new Map();
  }
  vertex(point, color, uv = solidUV) {
    let value = this.colorMap.get(color);
    if (!value) {
      value = new THREE.Color(color).toArray().map(c => Math.round(c * 255));
      this.colorMap.set(color, value);
    }
    this.positions.push(...point);
    this.colors.push(...value);
    this.uvs.push(...uv);
    return this.positions.length / 3 - 1;
  }
  quad(a, b, c, d, color, uvs) {
    const first = this.positions.length / 3;
    [a, b, c, d].forEach((pt, i) => this.vertex(pt, color, uvs?.[i]));
    this.indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
  }
  build() {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geom.setAttribute('color', new THREE.Uint8BufferAttribute(this.colors, 3, true));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    geom.setIndex(this.indices);
    geom.computeVertexNormals();
    geom.computeBoundingSphere();
    return geom;
  }
}

function makeEdge(a, b) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const dx = (b[0] - a[0]) / length, dz = (b[1] - a[1]) / length;
  return {
    length, nx: dz, nz: -dx,
    point(s, y, out = 0) { return [a[0] + s * dx + out * dz, y, a[1] + s * dz - out * dx]; }
  };
}

function face(geo, edge, left, right, bottom, top, out, color, uvs) {
  const p = edge.point;
  geo.quad(p(left, bottom, out), p(left, top, out), p(right, top, out), p(right, bottom, out), color, uvs);
}

function artsCornerWall(g, edge, bottom, top, floors, segment) {
  const length = edge.length;
  const storey = (top - bottom) / floors;
  for (let i = 0; i < floors; i++) {
    const low = bottom + i * storey;
    face(g, edge, 0, length, low, low + .25, 0, '#d8dbd4');
    face(g, edge, 0, length, low + .25, low + storey, 0, segment % 2 ? '#3c5f73' : '#456b80');
  }
  if (segment % 3 === 1) {
    cuboid(g, edge, length / 2 - .09, length / 2 + .09, bottom, top, 0, .12, '#c85a41');
  }
}

function ninthTeachingWest(g,edge,baseY,bottom,eave,ground) {
  const wall='#e0dbc9',dark='#757a76';
  const width=edge.length;
  face(g,edge,0,width,bottom,eave,0,wall);
  const center=width*.80,right=center+1.24,left=center-1.24;
  const foot=edge.point(center,0,.15);
  const terrain=ground?.(foot[0],foot[2]);
  const grade=Math.max(bottom,(terrain??baseY)-baseY);
  const height=eave-grade;
  for(const offset of [.16,.34,.52,.70]){
    const y=eave-height*offset;
    const low=y-height*.058,high=y+height*.058;
    face(g,edge,left-.10,right+.10,low-.50,high+.10,.025,dark);
    glazing(g,edge,left,right,low,high,.06,2);
  }
  const doorTop=grade+Math.min(2.48,height*.16);
  face(g,edge,left-.1,right+.1,grade,doorTop+.14,.055,'#b7b6ab');
  glazing(g,edge,left+.16,right-.16,grade+.10,doorTop-.07,.08,1);
  cuboid(g,edge,left-.50,right+.50,doorTop+.20,doorTop+.36,.03,1.07,'#c9ccc1');
  cuboid(g,edge,left-.55,right+.55,grade-.12,grade+.015,0,.98,'#a6a69b');
}

function tenthTeachingSouthWing(g, edge, baseY, bottom, eave, wall, terrainHeight) {
  const width = edge.length, dark = '#62645d';
  const ends = (a,b) => [width*(1-b),width*(1-a)];
  const panel = (a,b,low,high,out,color) => face(g,edge,...ends(a,b),low,high,out,color);
  const glass = (a,b,low,high,out) => glazing(g,edge,...ends(a,b),low,high,out,2);
  const gradeAt = fraction => {
    const [x,,z] = edge.point(width*(1-fraction),0,.035);
    return Math.max(bottom,(terrainHeight?.(x,z) ?? baseY)-baseY);
  };
  face(g,edge,0,width,bottom,eave,0,wall);
  if (edge.nx < -.85) {
    // Rectify the two paired west windows from the 2024 aerial view.
    const grade = gradeAt(.13);
    const y = distance => eave-(eave-grade)*distance;
    for (const [top,sill,glassTop,glassSill] of [[.10,.49,.157,.438],[.56,.85,.614,.785]]) {
      panel(.035,.225,y(sill),y(top),.035,dark);
      panel(.053,.222,y(glassSill),y(glassTop),.052,wall);
      glass(.068,.119,y(glassSill),y(glassTop),.068);
      glass(.166,.218,y(glassSill),y(glassTop),.068);
    }
    return;
  }
  // The south side has two glazed tiers, with a projecting upper bay over
  // the doorway at the eastern end. The threshold follows the existing mesh.
  const sill = gradeAt(.625) + .04;
  const doorTop = sill + 2.16;
  const canopyBottom = doorTop + .16;
  for (const [low,high] of [[sill-.54,sill+1.07],[eave-3.43,eave-1.14]]) {
    panel(.164,.548,low-.18,high+.15,.045,dark);
    for (const [a,b] of [[.173,.272],[.287,.413],[.427,.538]]) {
      glass(a,b,low,high,.061);
      const middle = (a+b)/2;
      panel(middle-.002,middle+.002,low,high,.071,'#b9b8ad');
    }
  }
  panel(.577,.674,sill,doorTop+.1,.041,dark);
  glass(.587,.665,sill+.07,doorTop-.08,.066);
  panel(.625-.002,.625+.002,sill+.07,doorTop-.08,.077,'#b6b8ae');
  cuboid(g,edge,...ends(.550,.874),canopyBottom,eave-.35,.01,.42,wall);
  panel(.672,.841,canopyBottom+.22,eave-.95,.43,dark);
  for (const [a,b] of [[.683,.729],[.737,.781],[.789,.83]]) {
    glass(a,b,canopyBottom+.34,eave-1.10,.448);
  }
}

function darkSlopedCoping(g,ring,edges,deck,eave,inset=.81) {
  function course(offset,y) {
    return ring.map(([x,z],i)=>{
      const next=edges[i],previous=edges.at(i-1);
      const miter=offset/(1+next.nx*previous.nx+next.nz*previous.nz);
      return [x+(next.nx+previous.nx)*miter,y,z+(next.nz+previous.nz)*miter];
    });
  }
  // Keep the raised trim below the existing eave and inside the roof fixtures.
  const profiles=[
    [course(0,deck),course(.53,deck),'#666a66'],
    [course(.53,deck),course(.53,deck+.16),'#696f6d'],
    [course(.53,deck+.16),course(.09-inset,eave),'#465055'],
    [course(.09-inset,eave),course(-inset,eave),'#596164'],
    [course(-inset,eave),course(-inset,deck),'#5c6060']
  ];
  for (const [bottom,top,color] of profiles) {
    for (let i=0;i<ring.length;i++) {
      const j=(i+1)%ring.length;
      g.quad(bottom[i],top[i],top[j],bottom[j],color);
    }
  }
}

function observedDormWall(geometry, edge, base, eave, facade) {
  const height = eave - base;
  const width = edge.length;
  const seam = eave - height * facade.plinthBelowEave;
  const halfHeight = height * facade.heightFraction / 2;
  const halfWidth = halfHeight * facade.widthToHeight;
  const ochre = '#c29c7f', ivory = '#e0dccf';
  function wall(x0, x1, y0, y1) {
    if (y0 < seam) face(geometry, edge, x0, x1, y0, Math.min(y1, seam), 0, ochre);
    if (y1 > seam) face(geometry, edge, x0, x1, Math.max(y0, seam), y1, 0, ivory);
  }
  const point = edge.point;
  const recess = -.15;
  const columns = facade.centersAcrossEdge ?? [facade.centerFraction];
  let previousRight = 0;
  for (const column of columns) {
    const left = width * column - halfWidth, right = width * column + halfWidth;
    wall(previousRight, left, base, eave);
    let previous = base;
    for (const fraction of facade.centersBelowEave) {
      const center = eave - height * fraction;
      const bottom = center - halfHeight, top = center + halfHeight;
      wall(left, right, previous, bottom);
      const jamb = '#b2aba0';
      geometry.quad(point(left, bottom), point(left, top), point(left, top, recess), point(left, bottom, recess), jamb);
      geometry.quad(point(right, bottom, recess), point(right, top, recess), point(right, top), point(right, bottom), jamb);
      geometry.quad(point(left, bottom), point(left, bottom, recess), point(right, bottom, recess), point(right, bottom), jamb);
      geometry.quad(point(left, top, recess), point(left, top), point(right, top), point(right, top, recess), jamb);
      face(geometry, edge, left, right, bottom, top, recess, '#687375');
      previous = top;
    }
    wall(left, right, previous, eave);
    previousRight = right;
  }
  wall(previousRight, width, base, eave);
  for (const [begin, end] of facade.pilasterSpans ?? []) {
    projection(geometry, edge, width * begin, width * end, base, seam, .13, '#d5ac8d');
    projection(geometry, edge, width * begin, width * end, seam, eave, .13, '#f2eee4');
  }
}

// Shallow rectangular projections expose returns and a top face at low angles.
function projection(geo, edge, left, right, bottom, top, out, color) {
  const p = edge.point, q = (s, y) => p(s, y, out);
  face(geo, edge, left, right, bottom, top, out, color);
  geo.quad(q(left, top), p(left, top), p(right, top), q(right, top), color);
  geo.quad(p(left, bottom), p(left, top), q(left, top), q(left, bottom), color);
  geo.quad(q(right, bottom), q(right, top), p(right, top), p(right, bottom), color);
}

// near and far are signed offsets along the outward facade normal.
function cuboid(g, edge, left, right, low, high, near, far, color) {
  const p = edge.point;
  face(g, edge, left, right, low, high, far, color);
  g.quad(p(right,low,near),p(right,high,near),p(left,high,near),p(left,low,near),color);
  g.quad(p(left,high,far),p(left,high,near),p(right,high,near),p(right,high,far),color);
  g.quad(p(left,low,near),p(left,low,far),p(right,low,far),p(right,low,near),color);
  g.quad(p(left,low,near),p(left,high,near),p(left,high,far),p(left,low,far),color);
  g.quad(p(right,low,far),p(right,high,far),p(right,high,near),p(right,low,near),color);
}

function steel(g, start, end, radius, color) {
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
  const dir = b.clone().sub(a).normalize();
  const u = new THREE.Vector3().crossVectors(dir, Math.abs(dir.y) > .9
    ? new THREE.Vector3(1,0,0) : new THREE.Vector3(0,1,0)).normalize();
  const v = new THREE.Vector3().crossVectors(dir,u);
  const ring = Array.from({length:6}, (_,i) => {
    const t = i * Math.PI / 3;
    return u.clone().multiplyScalar(radius*Math.cos(t)).addScaledVector(v,radius*Math.sin(t));
  });
  const offset = (p,n) => p.clone().add(n).toArray();
  for (let i=0; i<ring.length; i++) {
    const r=ring[i], s=ring[(i+1)%ring.length];
    g.quad(offset(a,r),offset(a,s),offset(b,s),offset(b,r),color);
  }
}

function pattern(cols, rows, phase = 0) {
  return [[phase,0], [phase,rows], [phase+cols/3,rows], [phase+cols/3,0]];
}

function glazing(g,edge,left,right,low,high,out,shade=0) {
  const p=edge.point, palettes=[
    ['#3f5d67','#8fa7a8','#7e989e','#47626b'],
    ['#47616a','#88a0a2','#a0b0ae','#58747a'],
    ['#3d5962','#9aaeb0','#78969b','#4b646d']
  ];
  const colors=palettes[shade%palettes.length];
  const ids=[p(left,low,out),p(left,high,out),p(right,high,out),p(right,low,out)]
    .map((pt,i)=>g.vertex(pt,colors[i]));
  g.indices.push(ids[0],ids[1],ids[2],ids[0],ids[2],ids[3]);
}

// The university tour shows paired teal windows with pale mullions above the
// rectangular stone entrance. Carry this rhythm along the entrance elevation.
function teachingWindows(g,edge,left,right,startLevel,floors,base,storey) {
  const bays=Math.max(1,Math.round((right-left)/3.25)),step=(right-left)/bays;
  face(g,edge,left,right,base+startLevel*storey,base+floors*storey,0,'#d4d5cf');
  for(let floor=startLevel;floor<floors;floor++){
    const y=base+floor*storey,low=y+storey*.17,high=y+storey*.90;
    for(let i=0;i<bays;i++){
      const x=left+step*i,a=x+.17,b=x+step-.17,mid=(a+b)/2;
      face(g,edge,a,b,low,high,.037,'#526f75');
      const colors=i%3===1?['#51838d','#a3c6c8','#a5cdcd','#598791']:['#527e87','#a2c4c9','#a2c7c6','#5b858c'];
      const ids=[edge.point(a+.06,low+.06,.056),edge.point(a+.06,high-.06,.056),
        edge.point(b-.06,high-.06,.056),edge.point(b-.06,low+.06,.056)].map((p,j)=>g.vertex(p,colors[j]));
      g.indices.push(ids[0],ids[1],ids[2],ids[0],ids[2],ids[3]);
      face(g,edge,mid-.042,mid+.042,low,high,.076,'#46666b');
      face(g,edge,a,b,high-.48,high-.40,.078,'#526f72');
    }
    if(floor>0)projection(g,edge,left,right,y-.06,y+.105,.16,'#dfe0d9');
  }
  for(let i=1;i<bays;i++){
    const s=left+step*i;
    projection(g,edge,s-.085,s+.085,base+startLevel*storey,base+floors*storey,.15,'#e2e2dc');
  }
}

function teachingEndPanel(g, edge, start, end, base, top) {
  const rim = '#d2d3cc';
  const left=start+1.10, right=end-.85;
  const low=base+.35, high=top-1.2;
  face(g,edge,start,left,base,top,0,rim);
  face(g,edge,right,end,base,top,0,rim);
  face(g,edge,left,right,base,low,0,rim);
  face(g,edge,left,right,high,top,0,rim);
  const p=edge.point, recess=-.20;
  g.quad(p(left,low),p(left,high),p(left,high,recess),p(left,low,recess),'#aab0a9');
  g.quad(p(right,low,recess),p(right,high,recess),p(right,high),p(right,low),'#b7b8ae');
  g.quad(p(left,low),p(left,low,recess),p(right,low,recess),p(right,low),rim);
  g.quad(p(left,high,recess),p(left,high),p(right,high),p(right,high,recess),rim);
  face(g,edge,left,right,low,high,recess,'#3d5050');
}

function teachingEntrance(g,edge,extent,base,top,floors,grade,frontEndPanels) {
  const p=edge.point,storey=(top-base)/floors;
  const width=Math.min(edge.length*.30,12.8),half=width/2;
  const origin=p(0,0),along=[-edge.nz,edge.nx];
  const stations=extent.map(([x,z])=>(x-origin[0])*along[0]+(z-origin[2])*along[1]);
  const mid=THREE.MathUtils.clamp((Math.min(...stations)+Math.max(...stations))/2,half+1,edge.length-half-1);
  const left=mid-half,right=mid+half,header=base+3*storey;
  const foot=p(mid,0,0),ground=grade(foot[0],foot[2]);
  const threshold=Number.isFinite(ground)?Math.max(ground+.10,base-.8):base;
  const eave=base+storey*1.82,back=-1.05,stone='#cdcfc9';
  const endWidth=frontEndPanels?.widthMetres || 0;
  if(endWidth){
    teachingEndPanel(g,edge,0,endWidth,base,top);
    teachingEndPanel(g,edge,edge.length-endWidth,edge.length,base,top);
  }
  teachingWindows(g,edge,endWidth,left,0,floors,base,storey);
  teachingWindows(g,edge,right,edge.length-endWidth,0,floors,base,storey);
  teachingWindows(g,edge,left,right,3,floors,base,storey);

  const pier=1.05;
  cuboid(g,edge,left,left+pier,Math.min(base,threshold)-.55,header,back,1.12,stone);
  cuboid(g,edge,right-pier,right,Math.min(base,threshold)-.55,header,back,1.12,stone);
  cuboid(g,edge,left+pier,right-pier,header-1.08,header,back,1.12,'#d9dad3');
  face(g,edge,left+pier,right-pier,threshold-.38,header-.98,back,'#71878a');
  const a=left+pier+.18,b=right-pier-.18;
  const doorTop=Math.min(eave-1.98,threshold+2.82);
  for(let i=0;i<4;i++){
    const x0=a+(b-a)*i/4,x1=a+(b-a)*(i+1)/4;
    glazing(g,edge,x0+.055,x1-.055,threshold,doorTop,back+.045,i);
    face(g,edge,x0+.055,x1-.055,doorTop+.14,eave-.32,back+.045,i%2?'#436b81':'#3c667c');
    glazing(g,edge,x0+.055,x1-.055,eave+.12,header-1.18,back+.045,i+2);
    cuboid(g,edge,x0-.045,x0+.045,threshold,doorTop+.10,back+.045,back+.13,'#97a9a8');
  }
  cuboid(g,edge,a,b,doorTop-.065,doorTop+.13,back+.04,back+.19,'#a5b2af');
  cuboid(g,edge,a,b,threshold-.18,threshold+.015,back+.02,1.16,'#bcbdb5');

  // The photographed cantilever has a straight back, elliptical outer rim,
  // longitudinal ribs, crossbars and two light diagonal suspension rods.
  const rx=half-pier*.72,collar=.50,reach=3.75,segments=26;
  const rim=t=>p(mid-rx*Math.cos(t),eave,collar+reach*Math.sin(t));
  const glass=[],indices=[];
  for(let i=0;i<=segments;i++){
    const t=i*Math.PI/segments,pt=rim(t),s=mid-rx*Math.cos(t);
    glass.push(...p(s,eave+.063,back+.035),pt[0],pt[1]+.063,pt[2]);
    if(!i)continue;
    const k=2*i;
    indices.push(k-2,k-1,k, k,k-1,k+1);
    steel(g,rim((i-1)*Math.PI/segments),pt,.083,'#536d70');
  }
  for(let i=-3;i<=3;i++){
    const f=i/3.45,x=mid+f*rx,out=collar+reach*Math.sqrt(1-f*f);
    cuboid(g,edge,x-.08,x+.08,eave-.13,eave+.015,back+.025,out,'#485d64');
  }
  for(const t of [.21,.59]){
    const x=rx*Math.sqrt(1-t*t),out=collar+reach*t;
    cuboid(g,edge,mid-x,mid+x,eave-.115,eave+.024,out-.045,out+.045,'#657a7d');
  }
  for(const side of [-1,1]){
    const x=mid+side*rx*.55;
    steel(g,p(x,header-.82,1),p(x,eave+.09,collar+reach*.79),.048,'#ced3c7');
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(glass,3));geo.setIndex(indices);geo.computeVertexNormals();
  const canopy=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({
    name:'一教雨篷 · 浅青玻璃',color:'#96c8c9',emissive:'#163136',transparent:true,opacity:.48,roughness:.28,side:THREE.DoubleSide,depthWrite:false
  }));
  canopy.name='一教入口玻璃雨篷';canopy.userData.buildingId='B023';
  return {canopy,entry:{point:[foot[0],foot[2]],normal:[edge.nx,edge.nz],
    placement:'Schematic entrance on the south-facing long edge of the open B023 footprint. Position and dimensions are not surveyed.',
    form:'University campus tour photograph of Teaching Building I: rectangular portal, glazed projecting canopy and teal window grid.'}};
}

function teachingRoofLights(g, {axis,width,rise,frames}, roofY) {
  const edge=makeEdge(...axis);
  const {point,length}=edge;
  const eave=roofY+.22, ridge=eave+rise;
  cuboid(g,edge,0,length,roofY-.03,eave,-width/2,width/2,'#c4c5ba');
  for(const row of [-1,1]){
    const middle=row*width/4, half=width/4-.12;
    for(let bay=0;bay<frames;bay++){
      const west=(bay+.05)*length/frames, east=(bay+.95)*length/frames;
      const a=point(west,eave,middle-half),b=point(east,eave,middle-half);
      const c=point(west,ridge,middle),d=point(east,ridge,middle);
      const e=point(west,eave,middle+half),f=point(east,eave,middle+half);
      g.quad(a,b,d,c,'#76a3a6');
      g.quad(c,d,f,e,'#6c999c');
      const left=[e,a,c].map(v=>g.vertex(v,'#87abad'));
      const right=[b,f,d].map(v=>g.vertex(v,'#87abad'));
      g.indices.push(...left,...right);
      steel(g,a,c,.07,'#d5dcd5');steel(g,c,e,.07,'#d5dcd5');
      steel(g,b,d,.07,'#d5dcd5');steel(g,d,f,.07,'#d5dcd5');
      steel(g,c,d,.055,'#b6cbc6');
    }
  }
}

function teachingRoofGrille(g, {center,radius,angle}, roofY) {
  const y=roofY+.075, c=Math.cos(angle),s=Math.sin(angle);
  const at=(u,v)=>[center[0]+u*c-v*s,y,center[1]+u*s+v*c];
  const middle=g.vertex(at(0,0),'#a49e87');
  const border=[];
  for(let i=0;i<32;i++){
    const t=2*Math.PI*i/32;
    border.push(at(radius*Math.cos(t),radius*Math.sin(t)));
  }
  const ids=border.map(p=>g.vertex(p,'#a49e87'));
  border.forEach((point,i)=>{
    const next=(i+1)%border.length;
    g.indices.push(middle,ids[next],ids[i]);
    steel(g,point,border[next],.16,'#b6af99');
  });
  for(const step of [-3.4,-2.27,-1.13,0,1.13,2.27,3.4]){
    const half=Math.sqrt(radius*radius-step*step);
    steel(g,at(-half,step),at(half,step),.14,'#c9c1aa');
  }
}

// The two low storeys on the plaza elevation have small punched openings.
// The east wing uses brick red infill; the west wing has a grey stone plinth.
function libraryPodium(g,edge,left,right,baseTop,top,west,offset=0) {
  const L=right-left, bays=Math.max(1,Math.round(L/(west?4.05:4.45))), step=L/bays;
  const storey=(top-baseTop)/2, base=west?'#b3b4a9':'#a76654';
  face(g,edge,left,right,baseTop,top,offset,base);
  for(let floor=0;floor<2;floor++) {
    for(let i=0;i<bays;i++) {
      const x=left+step*(i+.5), half=Math.min(step*(west?.245:.205),1.16);
      const low=baseTop+(floor+.25)*storey, high=baseTop+(floor+.80)*storey;
      face(g,edge,x-half-.095,x+half+.095,low-.11,high+.11,offset+.035,west?'#d5d7ca':'#936558');
      glazing(g,edge,x-half,x+half,low,high,offset+.065,i+floor);
      face(g,edge,x-.035,x+.035,low,high,offset+.08,'#aebcb5');
    }
  }
}

function westArcade(g, edge, baseTop, roofY, height, floors, profile, tools) {
  if (houdePlazaFront(g,edge,baseTop,roofY,height,floors,tools)) return;
  const L=edge.length, podium=baseTop+(roofY-baseTop)/floors;
  face(g,edge,0,L,baseTop,podium,0,'#d6d9d0');
  const glassFloors=Math.max(1,floors-1), bays=Math.max(1,Math.round(L/5.3)), bay=L/bays;
  face(g,edge,0,L,podium,roofY,0,'#dbe5e1',pattern(bays*2.5,glassFloors));
  for(let i=0;i<bays;i++) {
    const x=i*bay;
    cuboid(g,edge,x,Math.min(x+.34,L),podium,height-.18,0,.25,'#975d51');
    if(edge.nx>-.15 && bay>3.8) {
      face(g,edge,x+bay*.24,x+bay*.76,baseTop+.16,podium-.55,.045,'#6d8584');
      face(g,edge,x+bay*.28,x+bay*.74,baseTop+.19,podium-.62,.06,'#94a5a2',
        pattern(1,.85));
    }
  }
  cuboid(g,edge,0,L,podium-.17,podium+.12,0,.36,profile.rim);
  for(let floor=1;floor<glassFloors;floor++) {
    const y=podium+(roofY-podium)*floor/glassFloors;
    cuboid(g,edge,0,L,y-.16,y+.10,0,.13,'#9ba9aa');
  }
}

function commercialStreet(g, edge, item, baseTop, roofY, floors, profile) {
  const L=edge.length, north=item.id==='east-north' || item.name?.includes('北');
  const storey=(roofY-baseTop)/floors, fascia=baseTop+storey;
  const publicSide=edge.nx<-.32 || (edge.nz<-.58 && L>6);
  const bays=Math.max(1,Math.round(L/(north?5.8:5.0))), step=L/bays;
  face(g,edge,0,L,baseTop,roofY,0,profile.wall,pattern(Math.max(1,Math.round(L/profile.bay)),floors));
  if(publicSide && L>5) {
    face(g,edge,0,L,baseTop,fascia, .04,'#b8bcb1');
    for(let i=0;i<bays;i++) {
      const a=step*i+.15, b=step*(i+1)-.15;
      const door=a+(b-a)*.66, windowTop=fascia-.69;
      face(g,edge,a,b,baseTop+.05,windowTop,.10,'#4b6367');
      glazing(g,edge,a+.08,door-.10,baseTop+.26,windowTop-.08,.14,i);
      glazing(g,edge,door+.09,b-.08,baseTop+.08,windowTop-.08,.14,i+1);
      face(g,edge,a,b,windowTop+.03,fascia-.12,.12,['#607f85','#927363','#979d87','#567c81'][i%4]);
    }
    cuboid(g,edge,0,L,fascia-.13,fascia+.07,-.08,.54,'#dadbd0');
  }
  if(!north && L>5) {
    for(let i=0;i<=bays;i++) {
      const x=step*i, half=.24;
      cuboid(g,edge,Math.max(0,x-half),Math.min(L,x+half),baseTop,roofY+.14,-.02,.36,'#b77764');
    }
  }
}

function commercialPlazaArc(g, edge, bottom, roofY) {
  const length = edge.length;
  const base = bottom + (roofY - bottom) * .24;
  const glassBand = (roofY - base) / 4;
  face(g, edge, 0, length, bottom, base, 0, '#55534c');
  for (let i = 0; i < 4; i++) {
    const low = base + i * glassBand;
    face(g, edge, 0, length, low, low + .11, 0, '#a8aa9e');
    face(g, edge, 0, length, low + .11, low + glassBand, 0, '#364a48');
  }
  cuboid(g, edge, .038, .11, bottom, roofY, 0, .06, '#b8bab0');
}

function commercialRooflight(g, {axis,width,rise,frameSpacing}, roofY) {
  const edge = makeEdge(...axis);
  const {length,point} = edge;
  const y = roofY + .12;
  const section = [[-.5,0],[-.34,.65],[0,1],[.34,.65],[.5,0]];
  const at = (s, [offset, height], lift=0) => point(s,y+height*rise+lift,offset*width);
  cuboid(g,edge,0,length,roofY,y,-width/2,width/2,'#d1c7ac');
  const bays = Math.ceil(length / (frameSpacing ?? 3.1));
  const frameHalfWidth = frameSpacing ? .12 : .035;
  for(let i=0;i<section.length-1;i++){
    const a=section[i], b=section[i+1];
    g.quad(at(0,a),at(length,a),at(length,b),at(0,b),i<2?'#69999d':'#507f88');
    for(let j=0;j<=bays;j++){
      const s=length*j/bays, left=Math.max(0,s-frameHalfWidth), right=Math.min(length,s+frameHalfWidth);
      g.quad(at(left,a,.014),at(right,a,.014),at(right,b,.014),at(left,b,.014),'#b1c3b9');
    }
  }
  for(const s of [0,length]){
    for(let i=1;i<section.length-1;i++){
      const tri=[at(s,section[0]),at(s,section[i]),at(s,section[i+1])];
      if(s===length)tri.reverse();
      g.indices.push(...tri.map(p=>g.vertex(p,'#79979a')));
    }
  }
}

// Clip the roof triangles along the ridge and any metal roof panel seams.
function gabledRoof(geo, points, triangles, outerEdges, height, eaveY, roofColors, wallColor, ridgeFinish) {
  const axis = outerEdges.reduce((best, e) => e.length > best.length ? e : best);
  const across = ([x,z]) => axis.nx * x + axis.nz * z;
  const offsets = points.map(across);
  const min = Math.min(...offsets), max = Math.max(...offsets), mid = (max + min) / 2;
  const y = p => height - (height - eaveY) * Math.abs(across(p) - mid) / ((max - min) / 2);
  const at = p => [p[0], y(p), p[1]];
  function clip(polygon, threshold, keepAbove) {
    const out = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length];
      const da = across(a) - threshold, db = across(b) - threshold;
      const inA = keepAbove ? da >= -1e-7 : da <= 1e-7;
      const inB = keepAbove ? db >= -1e-7 : db <= 1e-7;
      if (inA) out.push(a);
      if (inA !== inB && Math.abs(da) > 1e-7 && Math.abs(db) > 1e-7) {
        const t = da / (da - db);
        out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
      }
    }
    return out;
  }
  const ridgeHalfWidth = (ridgeFinish?.widthMetres ?? 0) / 2;
  const ridgeStart = mid - ridgeHalfWidth, ridgeEnd = mid + ridgeHalfWidth;
  const panels = roofColors ? 2 : Math.max(2, Math.round((max - min) / 4)) * 2;
  for (let panel = 0; panel < panels; panel++) {
    const start = min + (max - min) * panel / panels;
    const end = min + (max - min) * (panel + 1) / panels;
    const strips = roofColors ? [[start, end, roofColors[panel]]] : [
      [start, end - .10, panel % 3 === 0 ? '#6d9eaf' : '#6999ab'],
      [end - .10, end, '#a1bdc5']
    ];
    const finishes = ridgeHalfWidth ? strips.flatMap(([lo, hi, color]) => [
      [lo, Math.min(hi, ridgeStart), color],
      [Math.max(lo, ridgeStart), Math.min(hi, ridgeEnd), ridgeFinish.color],
      [Math.max(lo, ridgeEnd), hi, color],
    ]) : strips;
    for (const [lo, hi, color] of finishes) {
      if (hi <= lo) continue;
      for (const tri of triangles) {
        const poly = clip(clip(tri.map(i => points[i]), lo, true), hi, false);
        if (poly.length < 3) continue;
        const ids = poly.map(p => geo.vertex(at(p), color));
        for (let i = 1; i < ids.length - 1; i++) geo.indices.push(ids[0], ids[i + 1], ids[i]);
      }
    }
  }
  for (const edge of outerEdges) {
    const a3 = edge.point(0, 0), b3 = edge.point(edge.length, 0);
    const a = [a3[0], a3[2]], b = [b3[0], b3[2]];
    const da = across(a)-mid, db = across(b)-mid;
    const cuts = da * db < 0 ? [0, edge.length * da / (da - db), edge.length] : [0, edge.length];
    for (let i = 0; i < cuts.length-1; i++) {
      const left = edge.point(cuts[i], eaveY), right = edge.point(cuts[i+1], eaveY);
      const leftUpper = at([left[0], left[2]]), rightUpper = at([right[0], right[2]]);
      const side = [left];
      if (leftUpper[1] - eaveY > .001) side.push(leftUpper);
      if (rightUpper[1] - eaveY > .001) side.push(rightUpper);
      side.push(right);
      if (side.length > 2) {
        const ids = side.map(p => geo.vertex(p, wallColor));
        geo.indices.push(ids[0],ids[1],ids[2]);
        if (ids.length === 4) geo.indices.push(ids[0],ids[2],ids[3]);
      }
    }
  }
}

function academicHallWall(g,edge,base,top,glazed) {
  const length = edge.length;
  const plinth = top * .26;
  for (let row=0;row<4;row++) {
    const low = base + (plinth-base)*row/4, high = base + (plinth-base)*(row+1)/4;
    face(g,edge,0,length,low,high,0,row%2 ? '#777568' : '#817f70');
  }
  face(g,edge,0,length,plinth,top,0,'#dedad0');
  if (!glazed) return;
  const margin = Math.min(.75,length*.04);
  const bays = Math.max(2,Math.round((length-2*margin)/1.7));
  const width = (length-2*margin)/bays;
  const low = plinth + .12, high = top - .45;
  face(g,edge,margin,length-margin,low,high,.006,'#a0acab');
  for (let row=0;row<3;row++) {
    for (let bay=0;bay<bays;bay++) {
      const left = margin + bay*width, y = low + (high-low)*row/3;
      glazing(g,edge,left+.035,left+width-.035,y+.035,
        low+(high-low)*(row+1)/3-.035,.017,(bay+row)%4);
    }
  }
}

function academicHallPortals(g, {baseAxisXZ,depthMetres,widthMetres,riseMetres,offsetFractions}, roofY) {
  const axis = makeEdge(...baseAxisXZ);
  const nodes = [[0,.4],[-1.2,riseMetres],[-depthMetres,.14]];
  for (const along of offsetFractions) {
    const start = along * axis.length - widthMetres/2;
    const end = start + widthMetres;
    for (let i=1;i<nodes.length;i++) {
      const [a,ay]=nodes[i-1], [b,by]=nodes[i];
      const corner=(s,out,y,drop=0)=>axis.point(s,roofY+y-drop,out);
      const front=[corner(start,a,ay),corner(end,a,ay),corner(end,b,by),corner(start,b,by)];
      const underside=[corner(start,a,ay,.32),corner(end,a,ay,.32),corner(end,b,by,.32),corner(start,b,by,.32)];
      g.quad(front[0],front[3],front[2],front[1],'#ece8dc');
      g.quad(...underside,'#b5aca1');
      g.quad(front[0],underside[0],underside[3],front[3],'#d6d1c6');
      g.quad(front[2],underside[2],underside[1],front[1],'#d6d1c6');
      if(i===1)g.quad(front[1],underside[1],underside[0],front[0],'#ded9ce');
      if(i===nodes.length-1)g.quad(front[3],underside[3],underside[2],front[2],'#ded9ce');
    }
  }
}

function academicHallRooflights(g, {axisXZ,widthMetres,count,risePerBay}, roofY) {
  const axis = makeEdge(...axisXZ);
  const bay = axis.length / count;
  const half = widthMetres / 2;
  const at = (s, offset, lift) => axis.point(s, roofY + lift, offset);
  const colors = ['#6d9394','#668c90','#7a9b98','#739594'];
  const midpoint = (a, b) => a.map((value,k)=>(value+b[k])/2);
  for (let i = 0; i < count; i++) {
    const left = i * bay + .06, right = (i+1) * bay - .06;
    const peak = at((left+right)/2, 0, bay * risePerBay);
    const corners = [at(left,-half,.04),at(right,-half,.04),at(right,half,.04),at(left,half,.04)];
    for (let j = 0; j < corners.length; j++) {
      const a = corners[j], b = corners[(j+1) % corners.length];
      g.indices.push(g.vertex(a,colors[j]),g.vertex(b,colors[j]),g.vertex(peak,colors[j]));
      steel(g,a,peak,.025,'#4c6a70');
      steel(g,a,b,.022,'#607c80');
      if (j % 2 === 0) {
        const panel = [midpoint(a,b),midpoint(b,peak),midpoint(peak,a)];
        for (let k=0;k<panel.length;k++) steel(g,panel[k],panel[(k+1)%panel.length],.018,'#516c70');
      }
    }
  }
}

function porticoWall(g, edge, bottom, top, wallColor) {
  const {length} = edge;
  const left = length * .24, right = length * .76;
  const lintel = bottom + (top - bottom) * .79;
  cuboid(g, edge, 0, left, bottom, top, -.6, 0, wallColor);
  cuboid(g, edge, right, length, bottom, top, -.6, 0, wallColor);
  cuboid(g, edge, left, right, lintel, top, -.6, 0, wallColor);
  face(g, edge, left, right, bottom, lintel, -.61, '#4f342c');
}

function renderBuilding(item, material, profile, kind, terrainHeight,westFragment) {
  const outer = orientedRing(item.ring, true);
  if (outer.length < 3) return null;
  const holes = (item.holes || []).map(ring => orientedRing(ring, false)).filter(ring => ring.length > 2);
  const loops = [outer, ...holes];
  const height = Number(item.height) > 0 ? Number(item.height) : 10;
  const base = Number(item.baseY) || 0;
  const floors = Math.max(1, Math.min(80, Math.round(Number(item.floors) || (height - .6) / profile.storey)));
  const isHall = kind === 'sports' && holes.length === 0;
  const tileRoof = holes.length === 0 && item.roofRise > 0;
  const wallTop = item.financeWingRoof ? (item.financeWingRoof.eaveAboveBaseMetres ?? height - item.financeWingRoof.riseMetres) :
    isHall ? height - Math.min(2.8, height * .13) : tileRoof ? height - item.roofRise : height;
  const roofY = tileRoof ? wallTop : Math.max(.4, wallTop - Math.min(.6, height * .08));
  const baseTop = Math.min(.65, roofY * .1);
  const edges = loops.map(loop => loop.map((pt, i) => makeEdge(pt, loop[(i + 1) % loop.length])));
  const ninthWest = item.ninthTeachingWest && edges[0].reduce((best,edge)=>edge.nx<best.nx?edge:best);
  const facingEdge = facade => {
    if (!facade?.normalXZ) return null;
    const [nx, nz] = facade.normalXZ;
    const score = edge => edge.nx * nx + edge.nz * nz;
    return edges[0].reduce((best, edge) => score(edge) > score(best) ? edge : best);
  };
  const dormEnd = facingEdge(item.endFacade);
  const dormSide = facingEdge(item.dormSideFacade);
  const finishedFace = facingEdge(item.facadeFinish);
  const sixthWest = kind === 'sixthTeaching' ? edges[0].reduce((a,b)=>a.length>b.length?a:b) : null;
  const sixthNorth = sixthWest && edges[0][(edges[0].indexOf(sixthWest)+1)%edges[0].length];
  const northFace = edges[0].reduce((best, edge) =>
    edge.length * Math.max(0, -edge.nz) ** 2 > best.length * Math.max(0, -best.nz) ** 2 ? edge : best);
  const along = outer.map(([x,z]) => -x*northFace.nz+z*northFace.nx);
  const frontage = Math.max(...along)-Math.min(...along);
  const diningModel = kind === 'cultureDining' || kind === 'xianjingDining' || kind === 'westArcade';
  const diningDoor = diningModel ? selectDiningEntrance(edges[0],item) : null;
  const facadeTools = {face,cuboid,glazing,steel,makeEdge};
  const g = new BuildingGeometry();
  const teachingFace=item.id==='B023'&&floors>=4?edges[0].reduce((best,e)=>
    e.length*Math.max(0,e.nz)**2>best.length*Math.max(0,best.nz)**2?e:best):null;
  const facing = item.porticoFacing;
  const porticoScore = edge => edge.nx * facing[0] + edge.nz * facing[1];
  const porticoFace = facing && edges[0].reduce((best, edge) => porticoScore(edge) > porticoScore(best) ? edge : best);
  let teachingDoor;
  const wallColor = item.wallColor ?? profile.wall;
  let foundation = -.15;
  if (typeof terrainHeight === 'function') {
    for (const loop of edges) for (const edge of loop) {
      const n = Math.max(1, Math.ceil(edge.length / 8));
      for (let i = 0; i <= n; i++) {
        const [x, ,z] = edge.point(edge.length * i / n, 0);
        const ground = terrainHeight(x, z);
        if (Number.isFinite(ground)) foundation = Math.min(foundation, ground - base - .4);
      }
    }
  }

  for (const loop of edges) for (const edge of loop) {
    if (sixthWest) {
      sixthTeachingWall(g,edge,sixthWest,sixthNorth,foundation,roofY,floors,{face,projection});
      continue;
    }
    const L = edge.length, point = edge.point;
    const bays = Math.max(1, Math.round(L / profile.bay)), step = L / bays;
    const uv = [[0, 0], [0, floors], [bays / 3, floors], [bays / 3, 0]];
    const observedWall = edge === dormEnd ? item.endFacade : edge === dormSide ? item.dormSideFacade : null;
    let wallBase = baseTop;
    if (observedWall?.followTerrainAtBase && terrainHeight) {
      const [x, , z] = point(L / 2, 0);
      const ground = terrainHeight(x, z);
      if (Number.isFinite(ground)) wallBase = Math.max(foundation, Math.min(baseTop, ground - base));
    }
    face(g, edge, 0, L, foundation, wallBase, 0, observedWall ? '#ab8566' : '#aea99d');
    const lip = Math.min(.4, L * .12, roofY * .06);
    if (!tileRoof && !item.darkSlopedCoping) face(g, edge, 0, L, roofY, wallTop, 0, profile.rim);
    if (!isHall && !tileRoof && !item.darkSlopedCoping) {
      g.quad(point(0, wallTop), point(0, wallTop, -lip), point(L, wallTop, -lip), point(L, wallTop), profile.rim);
      g.quad(point(L, roofY, -lip), point(L, wallTop, -lip), point(0, wallTop, -lip), point(0, roofY, -lip), '#aaa99f');
    }

    if (item.academicHallEnvelope) {
      academicHallWall(g,edge,wallBase,roofY,edge===northFace || L>12);
      continue;
    }

    if (loop === edges[0] && item.artsCornerSegments) {
      const arcSegment = loop.indexOf(edge) - 1;
      if (arcSegment >= 0 && arcSegment < item.artsCornerSegments) {
        artsCornerWall(g, edge, wallBase, roofY, floors, arcSegment);
        continue;
      }
    }

    if (item.id === 'B015' && item.financeWingRoof) {
      const tower = item.financeWingRoof.tower;
      const west = tower.ring[tower.westEdge], next = tower.ring[(tower.westEdge+1)%tower.ring.length];
      const [x,,z] = point(0, 0), [xx,,zz] = point(L, 0);
      if (Math.hypot(x-west[0],z-west[1]) < .02 && Math.hypot(xx-next[0],zz-next[1]) < .02) {
        drawFinanceTowerWest(g,edge,baseTop,wallTop,{face,projection});
        continue;
      }
      if (drawFinanceNorthFront(g,edge,baseTop,roofY,{face,projection})) continue;
    }

    if (kind === 'library' && floors >= 4) {
      const ground = (s,out) => {
        const [x,,z] = point(s,0,out);
        const value = terrainHeight?.(x,z);
        return Number.isFinite(value) ? value-base : 0;
      };
      if (libraryPlazaFront(g,edge,northFace,frontage,Math.min(...along),foundation,baseTop,roofY,height,
        {...facadeTools,podium:libraryPodium,ground})) continue;
    }
    if(edge===teachingFace&&L>25){
      const extent=outer.concat(westFragment?.ring||[]);
      teachingDoor=teachingEntrance(g,edge,extent,baseTop,roofY,floors,(x,z)=>terrainHeight?.(x,z)-base,item.firstTeaching?.frontEndPanels);
      continue;
    }
    if (kind === 'westArcade') {
      westArcade(g,edge,baseTop,roofY,height,floors,profile,facadeTools);
      houdeEntrance(g,edge,diningDoor,baseTop,baseTop+(roofY-baseTop)/floors,facadeTools);
      continue;
    }
    if (kind === 'cultureDining' || kind === 'xianjingDining') {
      const draw = kind === 'cultureDining' ? cultureFacade : xianjingFacade;
      draw(g,edge,item,diningDoor,baseTop,roofY,wallTop,floors,facadeTools);
      continue;
    }
    if (kind === 'eastCommercial') {
      const arc = loop === edges[0] && item.commercialPlazaArcEdges;
      const index = arc ? loop.indexOf(edge) : -1;
      if (arc && index >= arc[0] && index < arc[1]) {
        commercialPlazaArc(g, edge, baseTop, roofY);
      } else {
        commercialStreet(g,edge,item,baseTop,roofY,floors,profile);
      }
      continue;
    }
    if (edge === porticoFace) {
      porticoWall(g, edge, baseTop, roofY, wallColor);
      continue;
    }
    if (facing) {
      face(g, edge, 0, L, baseTop, roofY, 0, wallColor);
      continue;
    }
    if (observedWall) {
      observedDormWall(g, edge, wallBase, roofY, observedWall);
      continue;
    }
    if (item.tenthSouthFacade && (edge.nx < -.85 || edge.nz > .85)) {
      tenthTeachingSouthWing(g,edge,base,baseTop,roofY,wallColor,terrainHeight);
      continue;
    }
    if (edge === ninthWest) {
      ninthTeachingWest(g,edge,base,baseTop,roofY,terrainHeight);
      continue;
    }
    if (edge === finishedFace) {
      const {color, spans} = item.facadeFinish;
      const tint = (start, end, material) => {
        if (end <= start) return;
        const a = start * bays / 3, b = end * bays / 3;
        face(g, edge, start * L, end * L, baseTop, roofY, 0, material,
          [[a, 0], [a, floors], [b, floors], [b, 0]]);
      };
      let cursor = 0;
      for (const [start, end] of spans) {
        tint(cursor, start, wallColor);
        tint(start, end, color);
        cursor = end;
      }
      tint(cursor, 1, wallColor);
    } else {
      face(g, edge, 0, L, baseTop, roofY, 0, wallColor, L > 2 && roofY > 2 ? uv : undefined);
    }
    if (kind === 'library' && L > 4 && floors >= 4) {
      const bandY = baseTop + (roofY - baseTop) * 2 / floors;
      const lowerUV = [[0,0], [0,2], [bays/3,2], [bays/3,0]];
      // A terracotta lower storey and pale upper fins wrap the curved facade.
      const westWing = edge.nz < -.4 && point(L/2,0)[0] < northFace.point(northFace.length/2,0)[0];
      if (edge.nz < -.45) libraryPodium(g,edge,0,L,baseTop,bandY,westWing,.045);
      else face(g, edge, 0, L, baseTop, bandY, .045, '#b77866', lowerUV);
    }
    if (kind !== 'unknown' && kind !== 'service' && L >= 8) {
      for (let level = 1; level < floors; level++) {
        const y = baseTop + (roofY - baseTop) * level / floors;
        projection(g, edge, 0, L, y - .12, y + .10, .16, profile.rim);
      }
      const interval = kind === 'library' ? 1 : kind === 'dorm' ? 3 : 4;
      if (L > 14) for (let bay = interval; bay < bays; bay += interval) {
        const x = bay * step;
        const major = kind === 'library' && bay % 4 === 0;
        const half = major ? .33 : kind === 'library' ? .15 : .21;
        const startY = kind === 'library' && !major ? baseTop + (roofY - baseTop) * 2 / floors : baseTop;
        const trimTop = item.darkSlopedCoping ? roofY : wallTop - .13;
        projection(g, edge, x - half, x + half, startY, trimTop, kind === 'library' ? .42 : .20, profile.rim);
      }
    }

  }

  const vectors = loops.map(loop => loop.map(p => new THREE.Vector2(...p)));
  const triangles = THREE.ShapeUtils.triangulateShape(vectors[0], vectors.slice(1));
  const all = loops.flat();
  if (isHall) gabledRoof(g, all, triangles, edges[0], height, wallTop, null, '#abc2c6', item.roofRidgeFinish);
  else if (tileRoof) gabledRoof(g, all, triangles, edges[0], height, wallTop, item.roofColors, wallColor);
  else if (item.financeWingRoof) financeWingRoof(g,item,wallTop,{makeEdge,face,projection,drawFinanceTowerWest});
  else {
    const roofColor = item.roofColor ?? (item.rooflights ? '#cbbfa7' : profile.roof);
    const finishes = (item.roofFinishes ?? []).map(({ring,color})=>({ring:orientedRing(ring,false),color}));
    const roofRings = finishes.length ? [...loops,...finishes.map(({ring})=>ring)] : loops;
    const roofTriangles = finishes.length ? THREE.ShapeUtils.triangulateShape(vectors[0],
      [...vectors.slice(1),...finishes.map(({ring})=>ring.map(p=>new THREE.Vector2(...p)))]) : triangles;
    const roofVertices = roofRings.flat().map(([x,z])=>g.vertex([x,roofY,z],roofColor));
    for (const [a,b,c] of roofTriangles) g.indices.push(roofVertices[c],roofVertices[b],roofVertices[a]);
    for (const {ring,color} of finishes) {
      const faceTriangles=THREE.ShapeUtils.triangulateShape(ring.map(p=>new THREE.Vector2(...p)),[]);
      const toneVertices=ring.map(([x,z])=>g.vertex([x,roofY,z],color));
      for (const [a,b,c] of faceTriangles) g.indices.push(toneVertices[c],toneVertices[b],toneVertices[a]);
    }
  }
  if (item.academicHallRooflights) academicHallRooflights(g,item.academicHallRooflights,roofY);
  if (item.academicHallEnvelope) academicHallPortals(g,item.academicHallEnvelope.portalFrames,roofY);
  for(const rooflight of item.rooflights || []) {
    if(item.firstTeaching)teachingRoofLights(g,rooflight,roofY);
    else commercialRooflight(g,rooflight,roofY);
  }
  if(item.firstTeaching?.roofGrille)teachingRoofGrille(g,item.firstTeaching.roofGrille,roofY);
  if (item.darkSlopedCoping) darkSlopedCoping(g,outer,edges[0],roofY,wallTop,item.darkSlopedCoping.insetMetres);
  const sixthTowerRing = sixthWest && sixthTeachingRoof(g,outer,edges[0],sixthWest,wallTop,roofY,{face,cuboid});
  for (const part of [item.roofStructure, ...(item.roofDetails ?? [])].filter(Boolean)) {
    const structure = orientedRing(part.ring, true);
    const top = roofY + part.height;
    for (let i = 0; i < structure.length; i++) {
      const edge = makeEdge(structure[i], structure[(i + 1) % structure.length]);
      face(g, edge, 0, edge.length, roofY, top, 0, profile.rim);
    }
    const cap = structure.map(([x,z]) => g.vertex([x, top, z], part.color ?? profile.roof));
    const roofTriangles = THREE.ShapeUtils.triangulateShape(structure.map(point => new THREE.Vector2(...point)), []);
    for (const [a,b,c] of roofTriangles) g.indices.push(cap[c], cap[b], cap[a]);
  }
  const bottom = all.map(([x,z]) => g.vertex([x,foundation,z], '#a29c91'));
  for (const [a,b,c] of triangles) g.indices.push(bottom[a], bottom[b], bottom[c]);
  const mesh = new THREE.Mesh(g.build(), material);
  mesh.name = item.name || String(item.id);
  mesh.position.y = base;
  mesh.userData.buildingId = item.id;
  if (kind === 'westArcade') {
    mesh.userData.plazaFacade = {
      panorama: 'https://eng.ytkj.edu.cn/static/images/xyfg2.png',
      entrancePhoto: item.diningSource,
      glazedStoreys: floors - 1,
      openRoofCanopies: 2,
      basis: '窗体、门位与屋面构架按校方照片估放，进深与高度未经实测。'
    };
  }
  if (kind === 'library' && floors >= 4) mesh.userData.plazaFront = libraryFrontEvidence;
  if (item.tenthSouthFacade) mesh.userData.tenthSouthFacade = item.tenthSouthFacade;
  if (item.academicHallRooflights) mesh.userData.academicHallRooflights = item.academicHallRooflights;
  if (item.academicHallEnvelope) mesh.userData.academicHallEnvelope = item.academicHallEnvelope;
  if (item.darkSlopedCoping) mesh.userData.darkSlopedCoping = item.darkSlopedCoping;
  if (sixthTowerRing) mesh.userData.sixthTeachingRoof = {...sixthTeachingEvidence,ringXZ:sixthTowerRing};
  if(teachingDoor){
    mesh.userData.entrance=teachingDoor.entry;mesh.add(teachingDoor.canopy);
    if(item.firstTeaching){
      mesh.userData.entrance.placement='Approximate entrance aligned to the existing south-facing wall; detailed coordinates are not surveyed.';
      mesh.userData.roofEvidence={sources:item.firstTeaching.sources,dates:item.firstTeaching.dates,
        skylightGroups:item.rooflights.length,basis:item.geometryBasis};
    }
    // Building picking intentionally tests top-level meshes without recursion.
    mesh.raycast=function(ray,hits){
      THREE.Mesh.prototype.raycast.call(this,ray,hits);
      const first=hits.length;this.children[0].raycast(ray,hits);
      for(let i=first;i<hits.length;i++)hits[i].object=this;
    };
  }
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export function createCampusBuildings(footprints, options = {}) {
  const root = new THREE.Group();
  root.name = '蓬莱校区建筑';
  const materials = new Map();
  const westFragment=footprints.find(item=>item.id==='B029');
  for (const item of footprints) {
    const kind = item.id === 'G018' ? 'sixthTeaching' : Object.hasOwn(profiles, item.kind) ? item.kind : 'unknown';
    if (!materials.has(kind)) materials.set(kind, makeFacade(kind, profiles[kind]));
    const material = materials.get(kind);
    if (item.slopeDorm) {
      root.add(createSlopeDorm(item,material,new BuildingGeometry(),{makeEdge,face,projection},options.terrainHeight));
      continue;
    }
    if (item.dorm8Roof) {
      root.add(createEighthDorm(item,material,new BuildingGeometry(),{makeEdge,face,projection},options.terrainHeight));
      continue;
    }
    const mesh = item.passage
      ? createFinanceBridge(item, material, new BuildingGeometry(), {makeEdge, face, cuboid}, options.terrainHeight)
      : renderBuilding(item, material, profiles[kind], kind, options.terrainHeight,westFragment);
    if (mesh) root.add(mesh);
  }
  return root;
}
