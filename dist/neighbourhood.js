import * as T from './vendor/three.module.js';
import {drawVillageRoof} from './village-roofs.js';

// Keep the selection on the ground so it leaves the actual roof and wall colours visible.
export function footprintOutline(ring, ground) {
  const points = ring.map(([x,z]) => new T.Vector2(x,z));
  const winding = Math.sign(T.ShapeUtils.area(points));
  const normals = points.map((p,i) => {
    const q = points[(i+1)%points.length];
    return new T.Vector2(q.y-p.y,p.x-q.x).normalize().multiplyScalar(winding);
  });
  const corners = points.map((p,i) => {
    const outward = normals[i].clone().add(normals[(i+points.length-1)%points.length]).normalize();
    return p.clone().addScaledVector(outward, .32 / Math.max(.5,outward.dot(normals[i])));
  });
  const vertices = [];
  for (const [i,a] of corners.entries()) {
    const b = corners[(i+1)%corners.length];
    const steps = Math.max(1,Math.ceil(a.distanceTo(b)/1.5));
    for (let j=0;j<steps;j++) {
      const x=T.MathUtils.lerp(a.x,b.x,j/steps), z=T.MathUtils.lerp(a.y,b.y,j/steps);
      vertices.push(new T.Vector3(x,ground(x,z)+.15,z));
    }
  }
  return new T.BufferGeometry().setFromPoints(vertices);
}

// Split sloped roofs along their ridge so their silhouettes follow the footprint.
// The height field is the estimated top. Roof forms are illustrative.
function section(tri, offset, keepAbove) {
  const out=[];
  for(let i=0;i<tri.length;i++){
    const a=tri[i],b=tri[(i+1)%tri.length],va=offset(a),vb=offset(b);
    const inside=keepAbove?va>=0:va<=0, next=keepAbove?vb>=0:vb<=0;
    if(inside)out.push(a);
    if(inside!==next){const f=va/(va-vb);out.push([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f])}
  }
  return out;
}
export function createNeighbourhood(footprints,ground){
  const pos=[],colors=[],ranges=[];
  const paint=new T.Color();
  const tri=(a,b,c,hex)=>{
    const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2];
    const vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
    if(Math.hypot(uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx)<.0001)return;
    paint.set(hex);pos.push(...a,...b,...c);
    for(let i=0;i<3;i++)colors.push(Math.round(paint.r*255),Math.round(paint.g*255),Math.round(paint.b*255));
  };
  for(const record of footprints){
    const {ring,holes,height,center,axis,tint}=record;
    const start=pos.length/9;
    if(record.villageRoof){
      drawVillageRoof(record,ground,tri);
      ranges.push({firstTriangle:start,lastTriangle:pos.length/9-1,sourceRecord:record.fid,
        heightMetres:height,
        heightSource:record.villageRoof.heightSource ||
          (record.villageRoof.keepTerrain?'School aerial image with estimated height, 2025-04-08':'School aerial image, 2025-04-08'),
        ridgeXZ:record.villageRoof.ridgeXZ,sources:record.villageRoof.sources});
      continue;
    }
    const nx=-Math.sin(axis),nz=Math.cos(axis);
    const depth=p=>(p[0]-center[0])*nx+(p[1]-center[1])*nz;
    const ds=ring.map(depth);const lo=Math.min(...ds),hi=Math.max(...ds),width=hi-lo,mid=(lo+hi)/2;
    const top=ground(...center)+height;
    const rise=height<12&&width>=3&&width<22?Math.min(2.2,width*.17,height*.22):0;
    const offset=p=>depth(p)-mid;
    const eave=top-rise;
    const roofY=p=>top-(rise*2/Math.max(.1,width))*Math.abs(offset(p));
    const roof=tint==='clay'?['#a77761','#b58a70']:['#828e8b','#9ca5a0'];
    const wall=height<10?'#d7c9b3':'#d5d2c3';
    const loops=[ring,...(holes||[])];
    const orientation=Math.sign(T.ShapeUtils.area(ring.map(v=>new T.Vector2(...v))));
    for(const loop of loops)for(let i=0;i<loop.length;i++){
      const p=loop[i],q=loop[(i+1)%loop.length];
      const a=[p[0],ground(...p)-.65,p[1]],b=[q[0],ground(...q)-.65,q[1]];
      const c=[q[0],roofY(q),q[1]],d=[p[0],roofY(p),p[1]];
      tri(a,b,c,wall);tri(a,c,d,wall);
      if(rise&&offset(p)*offset(q)<0){const f=offset(p)/(offset(p)-offset(q));tri(d,c,[p[0]+(q[0]-p[0])*f,top,p[1]+(q[1]-p[1])*f],wall)}
      // Add shallow window bands only on facades long enough to resolve them.
      const length=Math.hypot(q[0]-p[0],q[1]-p[1]);
      if(length<4)continue;
      const bays=Math.max(1,Math.floor(length/(height<10?4.3:4.9))),floors=Math.max(1,Math.round((height-rise)/3.4));
      const step=(height-rise)/floors;
      const dir=loop===ring?orientation:0;
      if(!dir)continue;
      const dx=q[0]-p[0],dz=q[1]-p[1],ox=dir*dz/length*.045,oz=-dir*dx/length*.045;
      const pt=(u,y)=>[p[0]+u*dx+ox,y,p[1]+u*dz+oz];
      for(let f=0;f<floors;f++){
        const y=eave-(floors-f)*step+step*.34;
        for(let j=0;j<bays;j++){const left=(j+.25)/bays,right=(j+.73)/bays;
          const a=pt(left,y),b=pt(right,y),c=pt(right,y+step*.43),d=pt(left,y+step*.43);
          tri(a,b,c,'#667875');tri(a,c,d,'#667875')}
      }
    }
    const loops2=loops.map(v=>v.map(p=>new T.Vector2(...p))),all=loops.flat();
    const faces=T.ShapeUtils.triangulateShape(loops2[0],loops2.slice(1));
    for(const face of faces){
      const xyz=face.map(i=>all[i]);
      const parts=rise?[section(xyz,offset,true),section(xyz,offset,false)]:[xyz];
      parts.forEach((part,side)=>{
        const points=part.map(p=>[p[0],roofY(p),p[1]]);
        for(let i=1;i+1<points.length;i++)tri(points[0],points[i+1],points[i],roof[side]||roof[0]);
      });
    }
    ranges.push({firstTriangle:start,lastTriangle:pos.length/9-1,sourceRecord:record.fid,heightMetres:height});
  }
  const geom=new T.BufferGeometry();
  geom.setAttribute('position',new T.Float32BufferAttribute(pos,3));geom.setAttribute('color',new T.Uint8BufferAttribute(colors,3,true));
  geom.computeVertexNormals();
  const mesh=new T.Mesh(geom,new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.96}));
  mesh.name='校界外建筑 · 3D-GloBFP';mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.userData={source:'https://doi.org/10.6084/m9.figshare.28906499',license:'CC BY 4.0 (3D-GloBFP)',
    villageRoofSource:'https://www.ytkj.edu.cn/info/1049/8478.htm',records:ranges,
    roofForms:'Records with ridgeXZ use attributed imagery; their dimensions may be estimates. Other roof forms are illustrative.'};
  function pick(face){let a=0,b=ranges.length-1;while(a<=b){const mid=(a+b)>>1,r=ranges[mid];if(face<r.firstTriangle)b=mid-1;else if(face>r.lastTriangle)a=mid+1;else return footprints[mid]}return null}
  return {mesh,pick};
}

