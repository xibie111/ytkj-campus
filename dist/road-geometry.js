// No DOM or WebGL resources are needed to drape pavement onto the terrain.
import {arrayNeedsUint32,BufferAttribute,ShapeUtils,Vector2} from './vendor/three.core.js';

// Roads can cross both the original 12 m triangles and the finer grids around
// dining entrances. Index the actual indexed mesh, including those fine faces.
function indexTerrain(position, index, bounds) {
  const [left,top,right] = bounds, spacing=24;
  const columns=Math.ceil((right-left)/spacing)+1;
  const buckets=new Map(), used=new Uint32Array(index.length/3);
  const col=x=>Math.floor((x-left)/spacing), row=z=>Math.floor((z-top)/spacing);
  for (let i=0;i<index.length;i+=3) {
    const a=index[i],b=index[i+1],c=index[i+2];
    const ax=position.getX(a), bx=position.getX(b), cx=position.getX(c);
    const az=position.getZ(a), bz=position.getZ(b), cz=position.getZ(c);
    const i0=col(Math.min(ax,bx,cx)), i1=col(Math.max(ax,bx,cx));
    const j0=row(Math.min(az,bz,cz)), j1=row(Math.max(az,bz,cz));
    for (let j=j0;j<=j1;j++) for (let k=i0;k<=i1;k++) {
      const key=j*columns+k;
      if (!buckets.has(key)) buckets.set(key,[]);
      buckets.get(key).push(i);
    }
  }
  let stamp=0;
  return function forEachCandidate(triangle, visit) {
    const [a,b,c]=triangle;
    const west=Math.min(a.x,b.x,c.x), east=Math.max(a.x,b.x,c.x);
    const north=Math.min(a.y,b.y,c.y), south=Math.max(a.y,b.y,c.y);
    stamp++;
    for (let j=row(north);j<=row(south);j++) for (let k=col(west);k<=col(east);k++) {
      const bucket=buckets.get(j*columns+k);
      if (!bucket) continue;
      for (const i of bucket) {
        if (used[i/3]===stamp) continue;
        used[i/3]=stamp;
        visit(index[i],index[i+1],index[i+2]);
      }
    }
  };
}

// Clip a convex polygon to the inside of an oriented terrain-triangle edge.
function clipEdge(poly, ax,az, bx,bz, direction) {
  if (!poly.length) return poly;
  const dx=bx-ax, dz=bz-az;
  const signed=p=>direction*(dx*(p.y-az)-dz*(p.x-ax));
  const out=[];
  let a=poly[poly.length-1], da=signed(a);
  for (const b of poly) {
    const db=signed(b);
    if ((da<0)!==(db<0)) {
      const t=da/(da-db);
      out.push(new Vector2(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t));
    }
    if (db>=0) out.push(b);
    a=b; da=db;
  }
  return out;
}

export function buildRoadGeometry({bounds,polygons,profiles,positions,normals,indices}) {
  const position=new BufferAttribute(positions,3), normal=new BufferAttribute(normals,3);
  const candidates=indexTerrain(position,indices,bounds);
  const buffers=new Map();
  for (const {style,ring,holes=[]} of polygons) {
    if (!buffers.has(style)) buffers.set(style,{positions:[],normals:[],indices:[],ids:new Map()});
    const batch=buffers.get(style);
    const loops=[ring,...holes].map(loop=>loop.map(([x,z])=>new Vector2(x,z)));
    const faces=ShapeUtils.triangulateShape(loops[0],loops.slice(1));
    const points=loops.flat();
    for (const face of faces) {
      const triangle=face.map(i=>points[i]);
      candidates(triangle,(a,b,c)=>{
        const ax=position.getX(a), bx=position.getX(b), cx=position.getX(c);
        const az=position.getZ(a), bz=position.getZ(b), cz=position.getZ(c);
        const ux=bx-ax,uz=bz-az,vx=cx-ax,vz=cz-az, det=ux*vz-uz*vx;
        if (det===0) return;
        const sign=Math.sign(det);
        let poly=clipEdge(triangle,ax,az,bx,bz,sign);
        if (poly.length<3) return;
        poly=clipEdge(poly,bx,bz,cx,cz,sign);
        if (poly.length<3) return;
        poly=clipEdge(poly,cx,cz,ax,az,sign);
        if (poly.length<3) return;
        // Check triangle area using the coordinates the GPU and GLB will
        // actually receive. Nearly coincident clipping points can collapse in
        // float32 even when their double-precision area is nonzero.
        poly=poly.map(p=>new Vector2(
          Math.fround(Math.round(p.x*1e5)/1e5),Math.fround(Math.round(p.y*1e5)/1e5)));
        const vertex=p=>{
          // Shared triangles must have identical vertices along clipping seams.
          const key=p.x+','+p.y;
          if (batch.ids.has(key)) return batch.ids.get(key);
          const x=p.x-ax,z=p.y-az, wb=(x*vz-z*vx)/det,wc=(ux*z-uz*x)/det,wa=1-wb-wc;
          const y=wa*position.getY(a)+wb*position.getY(b)+wc*position.getY(c);
          const id=batch.positions.length/3;
          batch.positions.push(p.x,y+profiles[style].lift,p.y);
          const nx=wa*normal.getX(a)+wb*normal.getX(b)+wc*normal.getX(c);
          const ny=wa*normal.getY(a)+wb*normal.getY(b)+wc*normal.getY(c);
          const nz=wa*normal.getZ(a)+wb*normal.getZ(b)+wc*normal.getZ(c);
          const len=Math.hypot(nx,ny,nz);
          batch.normals.push(nx/len,ny/len,nz/len);
          batch.ids.set(key,id);
          return id;
        };
        for (let j=1;j<poly.length-1;j++) {
          const p=poly[0],q=poly[j],r=poly[j+1];
          const area=(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
          if (Math.abs(area)<1e-7) continue;
          const first=vertex(p),second=vertex(q),third=vertex(r);
          if (first===second || second===third || first===third) continue;
          if (area<0) batch.indices.push(first,second,third);
          else batch.indices.push(first,third,second);
        }
      });
    }
  }
  const batches=[];
  for (const [style,batch] of buffers) {
    if (!batch.indices.length) continue;
    const profile=profiles[style];
    const mesh={
      style,
      position:Float32Array.from(batch.positions),
      normal:Float32Array.from(batch.normals),
      index:arrayNeedsUint32(batch.indices)?Uint32Array.from(batch.indices):Uint16Array.from(batch.indices)
    };
    if(profile.period){
      const {period,angle}=profile;
      const cos=Math.cos(angle),sin=Math.sin(angle),c=cos/period,s=sin/period;
      const count=batch.positions.length/3;
      const uv=new Float32Array(2*count),tangents=new Float32Array(4*count);
      for(let i=0;i<count;i++){
        const [x,z]=[batch.positions[3*i],batch.positions[3*i+2]];
        uv[2*i]=c*x+s*z;
        uv[2*i+1]=s*x-c*z;
        const nx=batch.normals[3*i],ny=batch.normals[3*i+1],nz=batch.normals[3*i+2];
        // Follow increasing U along the terrain with N cross T towards V.
        const tx=ny*cos,ty=-(nx*cos+nz*sin),tz=ny*sin;
        const length=Math.hypot(tx,ty,tz);
        tangents[4*i]=tx/length;
        tangents[4*i+1]=ty/length;
        tangents[4*i+2]=tz/length;
        tangents[4*i+3]=1;
      }
      mesh.uv=uv;
      mesh.tangent=tangents;
    }
    batches.push(mesh);
  }
  return batches;
}
