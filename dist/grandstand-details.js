import * as THREE from './vendor/three.module.js';

// The banks adjoin the two ends of B082's publicly mapped roof footprint.
// These two X/Z coordinates are the recorded corners of its track-facing edge.
const east=[-350.51,494.87],west=[-388.63,506.71];
const length=Math.hypot(west[0]-east[0],west[1]-east[1]);
const ux=(west[0]-east[0])/length,uz=(west[1]-east[1])/length;
const sx=uz,sz=-ux, center=[(east[0]+west[0])/2,(east[1]+west[1])/2];
const setback=4.8,rows=7,tread=.82,rise=.34,wingLength=51.0;
const sides=[[-length/2-wingLength,-length/2],[length/2,length/2+wingLength]];
const point=(u,y,d)=>[center[0]+ux*u+sx*d,y,center[1]+uz*u+sz*d];
const source='https://www.ytkj.edu.cn/info/1115/6346.htm';

// The two low concrete wings and their rear guardrails are present in the
// frontal 2022 ceremony photo and in the 2024 sports-day film at 00:30.9.
function eachRow(draw){
  for(const [a,b] of sides)for(let row=0;row<rows;row++){
    const inside=setback+tread*row,outside=inside+tread;
    draw(a,b,inside,outside,rise*row,rise*(row+1),row===rows-1);
  }
}

export function drawSouthStandPlan(ctx){
  ctx.save();
  eachRow((a,b,inside,outside)=>{
    const ring=[point(a,0,inside),point(a,0,outside),point(b,0,outside),point(b,0,inside)];
    ctx.fillStyle='#c4bdb0';ctx.strokeStyle='#9d998e';ctx.lineWidth=.09;
    ctx.beginPath();ctx.moveTo(ring[0][0],ring[0][2]);
    for(const p of ring.slice(1))ctx.lineTo(p[0],p[2]);
    ctx.closePath();ctx.fill();ctx.stroke();
  });
  ctx.restore();
}

export function southStandExcludesTree(x,z){
  const dx=x-center[0],dz=z-center[1],u=dx*ux+dz*uz,d=dx*sx+dz*sz;
  return d>=setback-1 && d<=setback+rows*tread+1 &&
    sides.some(([a,b])=>u>=a-1 && u<=b+1);
}

export function createSouthStandWings(field,overlayOffset){
  const positions=[],colors=[],c=new THREE.Color(),co=Math.cos(field.angle),si=Math.sin(field.angle);
  function quad(a,b,e,f,color) {
    c.set(color);
    for(const p of [a,e,b,a,f,e]) {
      const x=p[0]-field.x,z=p[2]-field.z;
      positions.push(co*x+si*z,p[1],-si*x+co*z);colors.push(c.r,c.g,c.b);
    }
  }
  function block(a,b,y0,y1,d0,d1,mat){
    const p=(u,y,d)=>point(u,y,d);
    quad(p(a,y1,d0),p(a,y1,d1),p(b,y1,d1),p(b,y1,d0),mat);
    quad(p(a,y0,d0),p(a,y1,d0),p(b,y1,d0),p(b,y0,d0),mat);
    quad(p(b,y0,d1),p(b,y1,d1),p(a,y1,d1),p(a,y0,d1),mat);
    quad(p(a,y0,d1),p(a,y1,d1),p(a,y1,d0),p(a,y0,d0),mat);
    quad(p(b,y0,d0),p(b,y1,d0),p(b,y1,d1),p(b,y0,d1),mat);
  }
  eachRow((a,b,i,o,lo,hi,rear)=>{
    quad(point(a,hi,i),point(a,hi,o),point(b,hi,o),point(b,hi,i),'#c3bcb0');
    quad(point(a,lo,i),point(a,hi,i),point(b,hi,i),point(b,lo,i),'#a6a296');
    quad(point(a,-.12,o),point(a,hi,o),point(a,hi,i),point(a,-.12,i),'#acaa9f');
    quad(point(b,-.12,i),point(b,hi,i),point(b,hi,o),point(b,-.12,o),'#acaa9f');
    if(rear)quad(point(b,-.12,o),point(b,hi,o),point(a,hi,o),point(a,-.12,o),'#aaa698');
  });
  const rear=setback+rows*tread-.08,top=rows*rise;
  for(const [a,b] of sides) {
    block(a,b,top+.98,top+1.05,rear-.036,rear+.036,'#8f9c93');
    block(a,b,top+.52,top+.56,rear-.028,rear+.028,'#88958e');
    const spans=Math.ceil((b-a)/2.1);
    for(let i=0;i<=spans;i++) {
      const u=a+.08+(b-a-.16)*i/spans;
      block(u-.035,u+.035,top,top+1.04,rear-.035,rear+.035,'#929e96');
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  g.computeVertexNormals();
  const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.93}));
  m.name='南侧主席台两翼露天看台';m.position.y=-overlayOffset;m.castShadow=m.receiveShadow=true;
  m.userData={source,videoSeconds:30.9,banks:2,assumedRows:rows,estimatedLengthEach:wingLength,
    basis:'两侧露天水泥台阶、后栏和端部据校方影像。级数、长度与进深为估值。'};
  return m;
}

const standRailColor='#828c88';

export function addDeckGuardrail(box,left,right,level,edge) {
  const z=edge-.095;
  box(left,right,level+.94,level+1.01,z-.036,z+.036,standRailColor);
  box(left,right,level+.15,level+.19,z-.022,z+.022,standRailColor);
  const spans=Math.ceil((right-left)/.27);
  for(let i=0;i<=spans;i++){
    const x=left+.037+(right-left-.074)*i/spans;
    box(x-.017,x+.017,level,level+.97,z-.017,z+.017,standRailColor);
  }
}

export function addStairGuardrail(box,quad,x,front,tread,rise,count) {
  const first=front-.42*tread,last=front-(count-.25)*tread;
  const near=rise+1.01,far=count*rise+1.01,half=.039;
  quad([x-half,near,first],[x+half,near,first],[x+half,far,last],[x-half,far,last],standRailColor);
  quad([x-half,near-.067,first],[x-half,near,first],[x-half,far,last],[x-half,far-.067,last],standRailColor);
  quad([x+half,far-.067,last],[x+half,far,last],[x+half,near,first],[x+half,near-.067,first],standRailColor);
  quad([x-half,near-.067,first],[x-half,far-.067,last],[x+half,far-.067,last],[x+half,near-.067,first],standRailColor);
  quad([x-half,near-.067,first],[x+half,near-.067,first],[x+half,near,first],[x-half,near,first],standRailColor);
  quad([x+half,far-.067,last],[x-half,far-.067,last],[x-half,far,last],[x+half,far,last],standRailColor);
  for(let i=0;i<count;i++){
    const z=front-(i+.50)*tread,level=rise*(i+1);
    const top=near+(far-near)*(first-z)/(first-last);
    const post=i%4===0?.036:.021;
    box(x-post,x+post,level,top-.03,z-post,z+post,standRailColor);
  }
}

export function smoothMembraneBay(geometry,first,last) {
  const position=geometry.attributes.position;
  const normal=geometry.attributes.normal;
  // Each bay keeps its own seam. Within a bay, duplicate corners share a normal.
  const corners=new Map();
  for(let i=first;i<last;i++){
    const key=[position.getX(i),position.getY(i),position.getZ(i)].join(',');
    let corner=corners.get(key);
    if(!corner){
      corner={indices:[],normal:new THREE.Vector3()};
      corners.set(key,corner);
    }
    corner.indices.push(i);
    corner.normal.x+=normal.getX(i);
    corner.normal.y+=normal.getY(i);
    corner.normal.z+=normal.getZ(i);
  }
  for(const corner of corners.values()){
    const {x,y,z}=corner.normal.normalize();
    for(const index of corner.indices)normal.setXYZ(index,x,y,z);
  }
}

export function membraneLift(u,v,bay){
  const r=Math.max(Math.abs(2*u-1),Math.abs(2*v-1));
  const peak=(1-r)**1.55;
  const saddle=(1-Math.abs(2*v-1))**1.45*Math.min(1,2*(bay+u),2*(5-bay-u));
  return .67*peak+.33*saddle;
}

// The frontal eave shows a shallow open web below the white membrane.
export function addGrandstandTruss(box,quad,width,height,depth) {
  const left=-width*.525,right=-left,top=height*.80-.035,low=top-.55;
  box(left,right,top-.065,top,depth-.09,depth+.09,'#a8a391');
  box(left,right,low-.055,low,depth-.07,depth+.07,'#938e7b');
  const spaces=34;
  for(let j=0;j<spaces;j++){
    const a=left+(right-left)*j/spaces,b=left+(right-left)*(j+1)/spaces;
    const y=j%2?top-.04:low,yy=j%2?low:top-.04,z=depth+.025;
    quad([a,y-.04,z],[a,y+.04,z],[b,yy+.04,z],[b,yy-.04,z],'#948c78');
  }
}
