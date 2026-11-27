import * as T from './vendor/three.module.js';

const stripe = .05;
const paint = '#f3eee0';
const keyColour = '#a6645d';

// Coordinates are in metres across and along an individual court. Boundary
// dimensions are measured from the inner edge, as in FIBA Article 2.
function referencePaths({widthMetres=15,lengthMetres=28,keyWidthMetres=4.9,keyDepthMetres=5.8}={}) {
  const halfWidth=widthMetres/2,halfLength=lengthMetres/2,h=stripe/2;
  const x=halfWidth+h,z=halfLength+h;
  const paths=[
    {points:[[-x,-z],[x,-z],[x,z],[-x,z]],closed:true},
    {points:[[-x-.15,0],[x+.15,0]]}
  ];
  function arc(cx,cz,r,from,to,segments,closed=false) {
    const count=segments+(closed?0:1);
    return Array.from({length:count},(_,i)=>{
      const a=from+(to-from)*i/segments;
      return [cx+r*Math.cos(a),cz+r*Math.sin(a)];
    });
  }
  paths.push({points:arc(0,0,1.8-h,0,2*Math.PI,96,true),closed:true});
  const hoop=1.575,side=halfWidth-.9-h,radius=6.75-h;
  const start=Math.acos(T.MathUtils.clamp(side/radius,-1,1)),free=keyDepthMetres-h,key=keyWidthMetres/2-h,restricted=1.3-h;
  for(const sign of [-1,1]) {
    const end=points=>paths.push({points:points.map(([u,v])=>[u,sign*(v-halfLength)])});
    end([[-key,0],[-key,free],[key,free],[key,0]]);
    end(arc(0,free,1.8-h,0,Math.PI,48));
    end([[side,0],...arc(0,hoop,radius,start,Math.PI-start,72),[-side,0]]);
    end([[restricted,1.2],...arc(0,hoop,restricted,0,Math.PI,36),[-restricted,1.2]]);
    for(const edge of [-1,1]) {
      end([[edge*(halfWidth+stripe),8.325],[edge*(halfWidth+stripe+.15),8.325]]);
    }
  }
  return paths;
}

const localPaths=referencePaths();

function projectCourt(centre,angleDegrees) {
  const angle=angleDegrees*Math.PI/180;
  const east=Math.cos(angle),south=Math.sin(angle);
  return ([x,z])=>[centre[0]+x*east-z*south,centre[1]+x*south+z*east];
}

function courtPaths(centre,{platformAxisDegrees,offsetsMetres,observed}) {
  if(observed){
    const paths=[],keys=[];
    for(const court of observed.courts){
      const project=projectCourt(court.centerXZ,court.angleDegrees);
      for(const {points,closed} of referencePaths(court))paths.push({points:points.map(project),closed});
      const w=court.keyWidthMetres/2,l=court.lengthMetres/2,d=court.keyDepthMetres;
      for(const side of [-1,1])keys.push([[-w,side*l],[w,side*l],[w,side*(l-d)],[-w,side*(l-d)]].map(project));
    }
    return {paths,keys};
  }
  const project=projectCourt(centre,platformAxisDegrees);
  const paths=offsetsMetres.flatMap(offset=>localPaths.map(({points,closed})=>
    ({points:points.map(([x,z])=>project([x+offset,z])),closed})));
  return {paths,keys:[]};
}

function edgeNormal(a,b) {
  const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
  return [dz/len,-dx/len];
}

function cross(a,b,p) {
  return (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
}

function surfaceClip(ring) {
  const orientation=Math.sign(T.ShapeUtils.area(ring.map(([x,z])=>new T.Vector2(x,z))));
  return points=>{
    let clipped=points;
    for(let i=0;i<ring.length&&clipped.length;i++){
      const a=ring[i],b=ring[(i+1)%ring.length],part=[];
      for(let j=0;j<clipped.length;j++){
        const p=clipped[j],q=clipped[(j+1)%clipped.length];
        const dp=cross(a,b,p)*orientation,dq=cross(a,b,q)*orientation;
        if(dp>=0)part.push(p);
        if((dp<0&&dq>0)||(dp>0&&dq<0)){
          const fraction=dp/(dp-dq);
          part.push([T.MathUtils.lerp(p[0],q[0],fraction),T.MathUtils.lerp(p[1],q[1],fraction)]);
        }
      }
      clipped=part;
    }
    return clipped;
  };
}

function triangulateConvex(positions,indices,points) {
  if(points.length<3)return;
  const offset=positions.length/3;
  for(const [x,z] of points)positions.push(x,0,z);
  for(let i=2;i<points.length;i++){
    const area=cross(points[0],points[i-1],points[i]);
    if(area<-1e-10)indices.push(offset,offset+i-1,offset+i);
    else if(area>1e-10)indices.push(offset,offset+i,offset+i-1);
  }
}

function horizontalMesh(positions,indices,color) {
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geo.setIndex(indices);geo.computeVertexNormals();
  const material=new T.MeshStandardMaterial({color,roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  const mesh=new T.Mesh(geo,material);
  mesh.receiveShadow=true;
  return mesh;
}

export function createBasketballMarkings(centre,height,layout) {
  const {paths,keys}=courtPaths(centre,layout);
  const xyz=[],indices=[];
  for(const {points,closed} of paths) {
    const start=xyz.length/3,n=points.length;
    for(let i=0;i<n;i++) {
      const p=points[i],prev=points[(i+n-1)%n],next=points[(i+1)%n];
      const before=closed||i?edgeNormal(prev,p):edgeNormal(p,next);
      const after=closed||i<n-1?edgeNormal(p,next):before;
      // Offset each side in the angle bisector so corners join without gaps.
      const den=1+before[0]*after[0]+before[1]*after[1];
      const dx=(before[0]+after[0])*stripe/(2*den);
      const dz=(before[1]+after[1])*stripe/(2*den);
      xyz.push(p[0]-dx,0,p[1]-dz,p[0]+dx,0,p[1]+dz);
      if(i<n-1||closed) {
        const a=start+2*i,b=start+2*((i+1)%n);
        indices.push(a,b,a+1,a+1,b,b+1);
      }
    }
  }
  const observed=layout.observed;
  let mesh;
  if(observed){
    // Keep all eight courts in the plan, and clip the 3D paint to the
    // existing flat platform and its photo-supported shoulder.
    const clip=surfaceClip(observed.modelRingXZ);
    const positions=[],triangles=[],keyPositions=[],keyTriangles=[];
    for(let i=0;i<indices.length;i+=3){
      const face=indices.slice(i,i+3).map(k=>[xyz[3*k],xyz[3*k+2]]);
      triangulateConvex(positions,triangles,clip(face));
    }
    for(const key of keys)triangulateConvex(keyPositions,keyTriangles,clip(key));
    mesh=horizontalMesh(positions,triangles,paint);
    const keyMesh=horizontalMesh(keyPositions,keyTriangles,keyColour);
    keyMesh.name='篮球场红色禁区';
    keyMesh.position.y=-.003;
    keyMesh.userData={courtSurface:true,courtId:'B057',layoutBasis:observed.layoutBasis};
    mesh.add(keyMesh);
  }else mesh=horizontalMesh(xyz,indices,paint);
  mesh.position.y=height+.006;
  mesh.name=observed?'篮球场八片场线':'篮球场标线（示意）';
  mesh.userData={
    courtSurface:true,courtId:'B057',referenceCourts:observed?.courts.length??layout.offsetsMetres.length,lineWidthMetres:stripe,
    layoutStatus:observed?.layoutBasis??'Schematic court count and positions. Nominal line dimensions follow FIBA Article 2.',
    verticalSupport:observed?.verticalSupport
  };

  function drawPlan(ctx, scale=Infinity) {
    ctx.save();
    if(keys.length){
      ctx.fillStyle=keyColour;
      ctx.beginPath();
      for(const points of keys){
        ctx.moveTo(...points[0]);
        for(const point of points.slice(1))ctx.lineTo(...point);
        ctx.closePath();
      }
      ctx.fill();
    }
    ctx.strokeStyle=paint;
    ctx.lineWidth=Math.max(stripe,.7/scale);
    ctx.beginPath();
    for(const {points,closed} of paths){
      ctx.moveTo(...points[0]);
      for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);
      if(closed)ctx.closePath();
    }
    ctx.stroke();ctx.restore();
  }
  return {mesh,drawPlan};
}
