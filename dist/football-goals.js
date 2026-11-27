import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

export const goalOpeningWidth = 7.32;
const openingHeight = 2.44;
const frontRadius = .055;
const backRadius = .029;
const goalDepth = 2.10;
const topDepth = .82;

function tube(a, b, radius) {
  const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
  const length = from.distanceTo(to);
  const geometry = new THREE.CylinderGeometry(radius,radius,length,8);
  const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),to.sub(from).normalize());
  geometry.applyQuaternion(rotation);
  return geometry.translate(from.x + to.x*length/2,from.y + to.y*length/2,from.z + to.z*length/2);
}

function drawFrame() {
  const side = goalOpeningWidth/2 + frontRadius, top = openingHeight + frontRadius;
  const foot = .006;
  const pieces = [tube([0,top,-side],[0,top,side],frontRadius)];
  for (const z of [-side,side]) {
    pieces.push(
      tube([0,foot,z],[0,top,z],frontRadius),
      tube([0,top,z],[topDepth,top,z],backRadius),
      tube([topDepth,top,z],[goalDepth,foot,z],backRadius),
      tube([0,foot,z],[goalDepth,foot,z],backRadius),
    );
  }
  pieces.push(tube([goalDepth,foot,-side],[goalDepth,foot,side],backRadius));
  const geometry = mergeGeometries(pieces);
  for (const piece of pieces) piece.dispose();
  return geometry;
}

function drawNet() {
  const values = [], side = goalOpeningWidth/2, height = openingHeight;
  const bottom = .018;
  const line = (a,b) => values.push(...a,...b);
  const spans = 30, up = 10;
  for (let i=0;i<=spans;i++) {
    const z = side*(2*i/spans-1);
    line([.045,height,z],[topDepth,height,z]);
    line([topDepth,height,z],[goalDepth,bottom,z]);
  }
  for (let i=0;i<=up;i++) {
    const v=i/up, x=THREE.MathUtils.lerp(goalDepth,topDepth,v), y=THREE.MathUtils.lerp(bottom,height,v);
    line([x,y,-side],[x,y,side]);
    for (const z of [-side,side]) line([.045,y,z],[x,y,z]);
  }
  for (const z of [-side,side]) {
    for (let i=0;i<=8;i++) {
      const v=i/8;
      line([THREE.MathUtils.lerp(.045,goalDepth,v),bottom,z],[THREE.MathUtils.lerp(.045,topDepth,v),height,z]);
    }
  }
  for (let i=0;i<4;i++) {
    const x=THREE.MathUtils.lerp(.045,topDepth,i/4);
    line([x,height,-side],[x,height,side]);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(values,3));
  return geometry;
}

export function createFootballGoals(field) {
  const group=new THREE.Group();
  group.name='蓬莱足球场球门';
  const frameGeometry=drawFrame(), netGeometry=drawNet();
  const coating=new THREE.MeshStandardMaterial({color:'#eeeae0',roughness:.68});
  const twine=new THREE.LineBasicMaterial({color:'#e6e4cb',transparent:true,opacity:.26,depthWrite:false});
  for(const sign of [-1,1]) {
    const end=new THREE.Group();
    const east=sign*Math.cos(field.angle)>0;
    end.name=east?'足球场东端球门':'足球场西端球门';
    end.position.x=sign*field.length/2;
    if (sign<0) end.rotation.y=Math.PI;
    const frame=new THREE.Mesh(frameGeometry,coating);
    frame.name='门柱、横梁和斜撑';
    frame.castShadow=true;
    const net=new THREE.LineSegments(netGeometry,twine);
    net.name='球网';
    end.add(frame,net);
    group.add(end);
  }
  group.userData = {
    evidence:'https://www.ytkj.edu.cn/info/1081/8367.htm',
    photo:'https://www.ytkj.edu.cn/__local/4/AE/F4/EC39BD46E57E35DA7C935115075_9F33D088_C604F.jpg',
    eventDate:'2026-09-19/2026-09-20',
    goalOpeningMetres:[goalOpeningWidth,openingHeight],
    dimensions:'Visible end-line goals. Model openings use IFAB reference dimensions; posts, brace and net sizes are approximations.',
  };
  return group;
}
