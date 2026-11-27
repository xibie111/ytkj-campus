import * as T from './vendor/three.module.js';
import {createPlantedMedian} from './grass.js';

// The six-teaching courtyard already has a measured-in-model opening in the
// paving. The photo supports its planted centre; the kerb section is schematic.
export function teachingCourtIsland(court, heightAt) {
  if (!court?.holes?.length) return null;
  const ring=court.holes[0];
  const center=ring.reduce(([sumX,sumZ],[x,z])=>[sumX+x/ring.length,sumZ+z/ring.length],[0,0]);
  const inner=ring.map(([x,z])=>{
    const dx=center[0]-x, dz=center[1]-z, length=Math.hypot(dx,dz);
    return [x+.22*dx/length,z+.22*dz/length];
  });
  const planting=createPlantedMedian({id:'six-teaching-court',name:'六教内院草坪',
    ring:inner,source:'data/roads.json',lift:.13,basis:court.basis});
  const position=[], indices=[], uv=[];
  const coords=[center,...inner];
  for(const [x,z] of coords){
    position.push(x,heightAt(x,z)+.13,z);
    uv.push(x/planting.profile.period,-z/planting.profile.period);
  }
  let winding=0;
  for(let i=0;i<ring.length;i++){
    const [x,z]=ring[i],[nx,nz]=ring[(i+1)%ring.length];
    winding+=x*nz-z*nx;
  }
  for(let i=0;i<ring.length;i++){
    const next=(i+1)%ring.length;
    indices.push(0,...(winding<0?[i+1,next+1]:[next+1,i+1]));
  }
  const lawn=new T.BufferGeometry();
  lawn.setAttribute('position',new T.Float32BufferAttribute(position,3));
  lawn.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  lawn.setIndex(indices);lawn.computeVertexNormals();

  const rimPosition=[];
  const at=([x,z],lift)=>[x,heightAt(x,z)+lift,z];
  function quad(a,b,c,d) { rimPosition.push(...a,...b,...c,...a,...c,...d); }
  for(let i=0;i<ring.length;i++){
    const j=(i+1)%ring.length, a=ring[i], b=ring[j], c=inner[j], d=inner[i];
    // Outer face, stone cap and inner lip keep the edge visible at ground level.
    quad(at(a,.02),at(b,.02),at(b,.17),at(a,.17));
    quad(at(a,.17),at(b,.17),at(c,.17),at(d,.17));
    quad(at(d,.17),at(c,.17),at(c,.12),at(d,.12));
  }
  const rim=new T.BufferGeometry();
  rim.setAttribute('position',new T.Float32BufferAttribute(rimPosition,3));rim.computeVertexNormals();
  const stone=new T.Mesh(rim,new T.MeshStandardMaterial({color:'#b8b4a5',roughness:1,side:T.DoubleSide}));
  stone.name='六教内院绿岛缘石';stone.receiveShadow=true;
  const group=new T.Group();group.name='六教庭院绿岛';
  group.userData={source:court.geometrySource,basis:court.basis,illustrativeKerbWidthM:.22,illustrativeKerbTopM:.17};
  group.add(planting.createMesh(lawn),stone);
  const path=new Path2D();path.moveTo(...ring[0]);for(const p of ring.slice(1))path.lineTo(...p);path.closePath();
  return {group,drawPlan(ctx){
    ctx.save();ctx.fillStyle='#b8b4a5';ctx.fill(path);ctx.restore();planting.drawPlan(ctx);
  }};
}
