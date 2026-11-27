import * as THREE from './vendor/three.module.js';

// The source ring starts at the northwest corner of the lower, western wing.
// Its junction with the older eastern footprint is the only open-data split.
const mix=(p,q,t)=>p.map((v,i)=>v+(q[i]-v)*t);

export function eighthDormWings(item) {
  const [a,b,c,d]=item.ring;
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  const split=item.dorm8Roof.westWingLengthMetres/length;
  const northJoint=mix(a,b,split),southJoint=mix(d,c,split);
  return [
    {ring:[a,northJoint,southJoint,d],level:0},
    {ring:[northJoint,b,c,southJoint],level:item.dorm8Roof.eastStepMetres}
  ];
}

export function createEighthDorm(item,material,geometry,{makeEdge,face,projection},terrainHeight) {
  const profile=item.dorm8Roof;
  const wings=eighthDormWings(item);
  const [a,b,c,d]=item.ring;
  const [,northJoint,southJoint]=wings[0].ring;
  const midpoint=(p,q)=>mix(p,q,.5);
  const vertex=(p,y)=>[p[0],y,p[1]];
  const {eaveAboveBaseMetres:eave,riseMetres:rise,eastStepMetres:step}=profile;
  const floorCount=item.floors;
  const corners=item.ring.concat([northJoint,southJoint]);
  const base=item.baseY??item.modelBaseMetres;
  const foot=Math.min(-.3,...corners.map(([x,z])=>(terrainHeight?.(x,z)??base)-base-.4));
  function longWall(edge,level) {
    const roof=level+eave;
    const bays=Math.max(4,Math.round(edge.length/3.1));
    const uv=[[0,0],[0,floorCount],[bays/3,floorCount],[bays/3,0]];
    face(geometry,edge,0,edge.length,foot,level+.65,0,'#a39b8d');
    face(geometry,edge,0,edge.length,level+.65,roof-.66,0,'#e3dbcc',uv);
    const span=edge.length/bays;
    for(let i=1;i<bays;i++){
      if(i%5!==1&&i%5!==3)continue;
      const x=i*span;
      projection(geometry,edge,x-.20,x+.20,level+.65,roof-3.8,.17,'#aa7d62');
    }
    projection(geometry,edge,0,edge.length,roof-.66,roof-.40,.23,'#626368');
    projection(geometry,edge,0,edge.length,roof-.40,roof,.34,'#c4c2b9');
  }
  function closedEnd(edge,low,roof) {
    face(geometry,edge,0,edge.length,low,roof,0,'#e4dfd2');
    projection(geometry,edge,0,edge.length,roof-.66,roof-.40,.23,'#626368');
    projection(geometry,edge,0,edge.length,roof-.40,roof,.34,'#c4c2b9');
  }
  function triangle(a,b,c,color) {
    geometry.indices.push(...[a,b,c].map(p=>geometry.vertex(p,color)));
  }
  function roof(ring,elevation) {
    const [p,q,r,s]=ring;
    const near=midpoint(p,s),far=midpoint(q,r);
    const width=Math.hypot(p[0]-s[0],p[1]-s[1]);
    const len=Math.hypot(far[0]-near[0],far[1]-near[1]);
    const inset=Math.min(.36,width*.46/len);
    const nearRidge=vertex(mix(near,far,inset),elevation+rise);
    const farRidge=vertex(mix(far,near,inset),elevation+rise);
    const [pn,qn,rn,sn]=ring.map(q=>vertex(q,elevation));
    geometry.quad(pn,nearRidge,farRidge,qn,'#777a78');
    geometry.quad(sn,rn,farRidge,nearRidge,'#797c79');
    triangle(pn,sn,nearRidge,'#747775');
    triangle(qn,farRidge,rn,'#797b78');
  }
  for(const {ring,level} of wings){
    longWall(makeEdge(ring[0],ring[1]),level);
    longWall(makeEdge(ring[2],ring[3]),level);
    roof(ring,level+eave);
  }
  closedEnd(makeEdge(d,a),foot,eave);
  closedEnd(makeEdge(b,c),foot,step+eave);
  closedEnd(makeEdge(southJoint,northJoint),eave,step+eave);
  geometry.quad(vertex(a,foot),vertex(b,foot),vertex(c,foot),vertex(d,foot),'#aaa59a');
  const mesh=new THREE.Mesh(geometry.build(),material);
  mesh.castShadow=mesh.receiveShadow=true;
  mesh.name=item.name;
  mesh.position.y=base;
  mesh.userData.buildingId=item.id;
  mesh.userData.dorm8Roof={observedWindowRows:floorCount,westEaveMetres:base+eave,
    eastEaveMetres:base+step+eave,westRidgeMetres:base+eave+rise,eastRidgeMetres:base+step+eave+rise,
    junctionXZ:[northJoint,southJoint],sources:profile.sources};
  return mesh;
}
