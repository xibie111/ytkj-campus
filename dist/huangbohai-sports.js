import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {pavingFill,pavingMetres,pavingNormal,pavingTexture} from './paving-materials.js';

function path2D(ring, holes=[]) {
  const path=new Path2D();
  for(const polygon of [ring,...holes]){
    path.moveTo(...polygon[0]);
    for(const point of polygon.slice(1))path.lineTo(...point);
    path.closePath();
  }
  return path;
}

function makeBaskets(baskets,levels,ownerCode){
  const board=new T.BoxGeometry(1.8,1.05,.06).translate(0,3.425,-.405);
  const ring=new T.TorusGeometry(.233,.009,6,20).rotateX(Math.PI/2).translate(0,3.041,0);
  const upright=new T.BoxGeometry(.14,3.4,.14).translate(0,1.7,-2.70);
  const arm=new T.BoxGeometry(.12,.12,2.30).translate(0,3.4,-1.55);
  const bracket=new T.BoxGeometry(.12,.045,.18).translate(0,3.03,-.30);
  const frame=mergeGeometries([upright,arm,bracket]);
  const parts=[[board,'#e2e7de','篮板'],[frame,'#596c63','支架'],[ring,'#bb5531','篮圈']];
  return parts.map(([geometry,color,name])=>{
    const members=baskets.map(b=>{
      const [x,z]=b.centerXZ,[dx,dz]=b.axisTowardPlayXZ;
      return geometry.clone().rotateY(Math.atan2(dx,dz)).translate(x,levels.get(b.supportId),z);
    });
    const m=new T.Mesh(mergeGeometries(members),new T.MeshStandardMaterial({color,roughness:.75}));
    m.name=name;m.userData.ownerCode=ownerCode;m.castShadow=true;m.receiveShadow=true;
    return m;
  });
}

export function makeSports(data,{displayStrokeBoost=true,ownerCode='track'}={}) {
  const supports=data.supports||[data.support];
  const levels=new Map(supports.map(s=>[s.id,s.levelM]));
  const group=new T.Group(),picks=[];
  const surfacePaths=[], markingPaths=[], surfaces=new Map();
  group.name=data.name;
  for(const area of data.surfaces){
    const level=levels.get(area.supportId);
    if(!Number.isFinite(level))throw Error(area.id+' 场坪高程缺失');
    const rings=[area.ring,...area.holes].map(ring=>ring.map(([x,z])=>new T.Vector2(x,z)));
    const faces=T.ShapeUtils.triangulateShape(rings[0],rings.slice(1));
    const finish=area.kind==='footballGrass'?'meadow':area.kind==='infieldTraining'?'grit':'sportsGrit';
    const metres=pavingMetres(finish),points=rings.flat();
    const geom=new T.BufferGeometry();
    geom.setAttribute('position',new T.Float32BufferAttribute(points.flatMap(v=>[v.x,level+.075,v.y]),3));
    geom.setIndex(faces.flatMap(([a,b,c])=>[a,c,b]));
    geom.computeVertexNormals();
    geom.setAttribute('uv',new T.Float32BufferAttribute(points.flatMap(v=>[v.x/metres,-v.y/metres]),2));
    const normal=geom.getAttribute('normal');
    geom.setAttribute('tangent',new T.Float32BufferAttribute(
      points.flatMap((_,i)=>[1,0,0,normal.getY(i)<0?-1:1]),4));
    const key=finish+area.fill;
    if(!surfaces.has(key)){
      const map=pavingTexture(finish,area.fill),strength=finish==='meadow'?.50:.72;
      const material=new T.MeshStandardMaterial({map,normalMap:pavingNormal(finish),
        normalScale:new T.Vector2(strength,strength),roughness:1,side:T.DoubleSide});
      surfaces.set(key,{material,map,strength,fill:area.fill});
    }
    const mesh=new T.Mesh(geom,surfaces.get(key).material);
    mesh.name=area.id;mesh.userData.ownerCode=ownerCode;mesh.receiveShadow=true;
    group.add(mesh);picks.push(mesh);surfacePaths.push([path2D(area.ring,area.holes),area.fill,finish]);
  }
  const worldPixel={value:1}, positions=[], offsets=[], widths=[], colors=[], indices=[];
  for(const mark of data.markings){
    const level=levels.get(mark.supportId);
    if(!Number.isFinite(level))throw Error(mark.id+' 场坪高程缺失');
    const points=mark.points.map(([x,z])=>new T.Vector2(x,z)),count=points.length,first=positions.length/3;
    const color=new T.Color(mark.color),path=new Path2D();
    path.moveTo(...mark.points[0]);for(const p of mark.points.slice(1))path.lineTo(...p);
    if(mark.closed)path.closePath();
    markingPaths.push([path,mark.color,mark.widthM]);
    for(let i=0;i<count;i++){
      const p=points[i];
      const prev=points[i>0?i-1:mark.closed?count-1:0],next=points[i+1<count?i+1:mark.closed?0:count-1];
      const incoming=p.clone().sub(prev).normalize(),outgoing=next.clone().sub(p).normalize();
      if(!incoming.lengthSq())incoming.copy(outgoing);
      if(!outgoing.lengthSq())outgoing.copy(incoming);
      const bisector=incoming.clone().add(outgoing).normalize();
      const miter=.5/Math.max(.5,bisector.dot(outgoing));
      for(const sign of [-1,1]){
        const ox=-bisector.y*miter*sign,oz=bisector.x*miter*sign;
        positions.push(p.x+ox*mark.widthM,level+.14,p.y+oz*mark.widthM);offsets.push(ox,oz);
        widths.push(mark.widthM);colors.push(color.r,color.g,color.b);
      }
      if(mark.closed||i+1<count){
        const a=first+i*2,b=first+(i+1)%count*2;indices.push(a,a+1,b,b,a+1,b+1);
      }
    }
  }
  const strokes=new T.BufferGeometry();
  strokes.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  strokes.setAttribute('color',new T.Float32BufferAttribute(colors,3));strokes.setIndex(indices);
  strokes.computeVertexNormals();
  const material=new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide});
  if(displayStrokeBoost){
    strokes.setAttribute('strokeOffset',new T.Float32BufferAttribute(offsets,2));
    strokes.setAttribute('strokeWidth',new T.Float32BufferAttribute(widths,1));
    material.onBeforeCompile=shader=>{
      shader.uniforms.worldPixel=worldPixel;
      shader.vertexShader='attribute vec2 strokeOffset; attribute float strokeWidth; uniform float worldPixel;\n'+
        shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.xz+=strokeOffset*max(0.,min(.24,worldPixel*.72)-strokeWidth);');
    };
  }
  const lines=new T.Mesh(strokes,material);lines.name=ownerCode==='track'?'田径与足球划线':'篮球场划线';group.add(lines);
  if(data.baskets?.length){
    const hardware=makeBaskets(data.baskets,levels,ownerCode);group.add(...hardware);picks.push(...hardware);
  }
  return {group,picks,worldPixel,supports,ownerCode,setSatellite(on){
    for(const {material,map,strength,fill} of surfaces.values()){
      material.map=on?null:map;
      material.color.set(on?fill:0xffffff);
      material.normalScale.setScalar(on?0:strength);
      material.needsUpdate=true;
    }
  },draw(ctx,units,showFinish=true){
    for(const [path,fill,finish] of surfacePaths){
      ctx.fillStyle=showFinish?pavingFill(ctx,finish,fill):fill;
      ctx.fill(path,'evenodd');
    }
    ctx.lineJoin='round';
    for(const [path,color,width] of markingPaths){
      ctx.strokeStyle=color;ctx.lineWidth=Math.max(width,Math.min(.24,units*.72));ctx.stroke(path);
    }
  }};
}
