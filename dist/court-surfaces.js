import * as T from './vendor/three.module.js';
import {sportsFinish} from './sports.js';
import {createCourtPlatformSurface} from './court-platform.js';

// School guide labels identify the two banks. Counts, orientation and bounds
// come from the existing campus reconstruction. Interior lines are schematic.
const fallbackAngle = -.27;
const layout = {
  B057: {name:'篮球场面层与标线', count:4, bay:18, depth:32, paint:basketball},
  B071: {name:'网球场面层与标线', count:3, bay:16, depth:30, paint:tennis},
};

function line(c, x1, z1, x2, z2) {
  c.moveTo(x1,z1); c.lineTo(x2,z2);
}

function basketball(c) {
  // Nominal FIBA 28 x 15 m playing area. Coordinates run along the court.
  c.fillStyle=sportsFinish(c,'acrylic','#7b90a2');
  c.fillRect(-8.5,-16,17,32);
  c.strokeRect(-7.5,-14,15,28);
  c.beginPath();line(c,-7.5,0,7.5,0);c.stroke();
  c.beginPath();c.arc(0,0,1.8,0,Math.PI*2);c.stroke();
  for (const sign of [-1,1]) {
    c.save();c.scale(1,sign);c.translate(0,-14);
    c.fillStyle=sportsFinish(c,'acrylic','#71899c');
    c.fillRect(-2.45,0,4.9,5.8);
    c.strokeRect(-2.45,0,4.9,5.8);
    c.beginPath();c.arc(0,5.8,1.8,0,Math.PI);c.stroke();
    const side=6.6, radius=6.75, arcStart=Math.acos(side/radius);
    const join=1.575+radius*Math.sin(arcStart);
    c.beginPath();c.moveTo(side,0);c.lineTo(side,join);
    c.arc(0,1.575,radius,arcStart,Math.PI-arcStart);
    c.lineTo(-side,0);c.stroke();c.restore();
  }
}

const tennisDimensions={length:23.77,singles:8.23,doubles:10.97};

function tennis(c, color='#78989f') {
  // ITF doubles and singles sidelines, service boxes and short centre marks.
  c.fillStyle=sportsFinish(c,'acrylic',color);
  const {length,doubles}=tennisDimensions;
  c.fillRect(-doubles/2,-length/2,doubles,length);
  tennisLines(c);
}

function tennisLines(c) {
  const {length,singles,doubles}=tennisDimensions;
  c.strokeRect(-doubles/2,-length/2,doubles,length);
  c.beginPath();
  for (const sign of [-1,1]) {
    line(c,sign*singles/2,-length/2,sign*singles/2,length/2);
    line(c,-singles/2,sign*6.40,singles/2,sign*6.40);
    line(c,0,sign*length/2,0,sign*(length/2-.1));
  }
  line(c,0,-6.40,0,6.40);c.stroke();
}

function courtOutline(c, ring) {
  c.beginPath();
  c.moveTo(...ring[0]);
  for (const point of ring.slice(1)) c.lineTo(...point);
  c.closePath();
}

function courtAtlas(court, spec, roads) {
  // Transparent guard texels outside the apron also cover the overhanging
  // terrain faces when texture coordinates clamp at the atlas edge.
  const courtLayout=court.layout;
  const width=courtLayout?.width??(spec.count*spec.bay+5), depth=courtLayout?.depth??(spec.depth+5), ppm=24;
  const angle=courtLayout?.angle??fallbackAngle;
  const canvas=document.createElement('canvas');
  canvas.width=width*ppm;canvas.height=depth*ppm;
  const c=canvas.getContext('2d');
  c.setTransform(ppm,0,0,ppm,canvas.width/2,canvas.height/2);
  const baseColor=courtLayout?'#50776c':court.id==='B057'?'#98aa99':'#90a99c';
  c.fillStyle=sportsFinish(c,'acrylic',baseColor);
  if (courtLayout?.apronXZLocal) {
    c.save();
    courtOutline(c,courtLayout.apronXZLocal);c.clip();
  }
  c.fillRect(.5-width/2,.5-depth/2,width-1,depth-1);
  c.strokeStyle='#efece0';c.lineWidth=.05;c.lineJoin='round';
  if(courtLayout){
    for(const [x,z] of courtLayout.blueCourtsXZLocal){
      c.save();c.translate(x,z);c.rotate(courtLayout.paintAngle??0);
      tennis(c,'#485e94');c.restore();
    }
    const [panelWidth,panelDepth]=courtLayout.redPanelSizeMetres;
    if (courtLayout.redBandXZLocal) {
      c.fillStyle=sportsFinish(c,'acrylic','#555777');
      courtOutline(c,courtLayout.redBandXZLocal);c.fill();
    }
    c.fillStyle=sportsFinish(c,'acrylic','#bd695d');
    for(const [x,z] of courtLayout.redPanelsXZLocal){
      c.save();c.translate(x,z);c.rotate(courtLayout.paintAngle??0);
      c.fillRect(-panelWidth/2,-panelDepth/2,panelWidth,panelDepth);c.restore();
    }
  }else{
    for(let i=0;i<spec.count;i++){
      c.save();c.translate((i+.5-spec.count/2)*spec.bay,0);spec.paint(c);c.restore();
    }
  }
  if (courtLayout?.apronXZLocal) c.restore();
  // The measured overlap at the basketball apron is ~49 m². Keep the
  // mapped service road and shoulder clear at every zoom and camera angle.
  const [x,z]=court.center, radius=Math.hypot(width,depth)/2;
  c.rotate(-angle);c.translate(-x,-z);c.globalCompositeOperation='destination-out';
  c.fillStyle='#000';
  for (const {ring,holes=[]} of roads?.polygons||[]) {
    if (ring.every(p=>p[0]<x-radius)||ring.every(p=>p[0]>x+radius)||
        ring.every(p=>p[1]<z-radius)||ring.every(p=>p[1]>z+radius)) continue;
    c.beginPath();
    for (const loop of [ring,...holes]) {
      c.moveTo(...loop[0]);
      for (let i=1;i<loop.length;i++) c.lineTo(...loop[i]);
      c.closePath();
    }
    c.fill('evenodd');
  }
  return {canvas,width,depth,angle};
}

function drapeCourt(court, spec, terrain, atlas) {
  const {canvas,width,depth,angle}=atlas, [cx,cz]=court.center;
  const cos=Math.cos(angle),sin=Math.sin(angle);
  const source=terrain.index.array,pos=terrain.attributes.position,normal=terrain.attributes.normal;
  const coords=[],normals=[],uv=[],indices=[],vertices=new Map();
  const radius=Math.hypot(width,depth)/2;
  for (let i=0;i<source.length;i+=3) {
    const a=source[i],b=source[i+1],c=source[i+2];
    const xs=[pos.getX(a),pos.getX(b),pos.getX(c)],zs=[pos.getZ(a),pos.getZ(b),pos.getZ(c)];
    if (Math.max(...xs)<cx-radius||Math.min(...xs)>cx+radius||
        Math.max(...zs)<cz-radius||Math.min(...zs)>cz+radius) continue;
    const us=xs.map((x,j)=>.5+((x-cx)*cos+(zs[j]-cz)*sin)/width);
    const vs=zs.map((z,j)=>.5-(-(xs[j]-cx)*sin+(z-cz)*cos)/depth);
    if (Math.max(...us)<0||Math.min(...us)>1||Math.max(...vs)<0||Math.min(...vs)>1) continue;
    for (const [j,key] of [a,b,c].entries()) {
      if (!vertices.has(key)) {
        vertices.set(key,coords.length/3);
        coords.push(xs[j],pos.getY(key)+.018,zs[j]);
        normals.push(normal.getX(key),normal.getY(key),normal.getZ(key));uv.push(us[j],vs[j]);
      }
      indices.push(vertices.get(key));
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(coords,3));
  geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
  const material=new T.MeshStandardMaterial({map,alphaTest:.45,roughness:.97});
  const mesh=new T.Mesh(geometry,material);mesh.name=spec.name;mesh.receiveShadow=true;
  mesh.userData={courtSurface:true,courtId:court.id,displayOffsetMetres:.018,
    basis:court.evidence??'School-guide use labels. Existing approximate bank extents and counts, nominal sport markings and illustrative paint colours.'};
  return mesh;
}

export function createCourtSurfaces(data, terrainGeometry, roads, platform=null) {
  const mesh=new T.Group();mesh.name='篮球场与网球场';
  const banks=[];
  const revised=platform?createCourtPlatformSurface(platform):null;
  if(revised)mesh.add(revised.mesh,revised.markings);
  for (const court of data.courts||[]) {
    if (court.verifiedPlatform) continue;
    const spec=layout[court.id];if (!spec) continue;
    const atlas=courtAtlas(court,spec,roads);
    mesh.add(drapeCourt(court,spec,terrainGeometry,atlas));banks.push({court,...atlas});
  }
  function drawPlan(c,scale=Infinity) {
    revised?.drawPlan(c,scale);
    for (const {court,canvas,width,depth,angle} of banks) {
      c.save();c.translate(...court.center);c.rotate(angle);
      c.drawImage(canvas,-width/2,-depth/2,width,depth);
      // Keep the six-court layout legible as the entire bank enters view.
      if (court.layout && Number.isFinite(scale)) {
        c.strokeStyle='#efece0';c.lineWidth=Math.max(.05,.72/scale);
        for (const [x,z] of court.layout.blueCourtsXZLocal) {
          c.save();c.translate(x,z);c.rotate(court.layout.paintAngle??0);
          tennisLines(c);c.restore();
        }
      }
      c.restore();
    }
  }
  return {mesh,drawPlan};
}
