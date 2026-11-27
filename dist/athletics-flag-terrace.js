import * as T from './vendor/three.module.js';

// Station, apron-side edge, and rear edge in the existing field's metre frame.
const profiles = [[-54,49.2,54.5],[-47,50.6,57],[-37,51.4,58.3],[-27,51,57.8]];
const poles = [[-37.7,56.2,14.4],[-39.6,56.3,14.9],[-41.6,56.4,14.4]];
const deck = 1.50;
const concrete = '#c9bdaa';
const wall = '#b2a794';

function band(near,far,start=profiles[0][0],end=profiles.at(-1)[0]) {
  const stations=[start,...profiles.map(row=>row[0]).filter(u=>u>start&&u<end),end];
  function edge(u,fraction) {
    const i=profiles.findIndex((p,i)=>i>0&&u<=p[0]);
    const [u0,v0,b0]=profiles[i-1], [u1,v1,b1]=profiles[i];
    const rate=(u-u0)/(u1-u0);
    return [u,T.MathUtils.lerp(T.MathUtils.lerp(v0,v1,rate),T.MathUtils.lerp(b0,b1,rate),fraction)];
  }
  return [...stations.map(u=>edge(u,near)),...stations.reverse().map(u=>edge(u,far))];
}

const surfaces = [
  {ring:band(0,1),base:-.06,top:.15,color:concrete},
  {ring:band(.12,.59,-48.3,-30.5),base:.15,top:.58,color:concrete},
  {ring:band(.30,.61,-48.24,-30.56),base:.58,top:1.04,color:'#c1b6a3'},
  {ring:band(.54,1),base:.15,top:deck,color:concrete},
  {ring:band(.955,1),base:deck,top:2.17,color:wall}
];

export function createFlagTerrace(overlayOffset) {
  const group=new T.Group();
  group.name='田径场北直道旗台';group.position.y=-overlayOffset;
  group.userData={
    sources:['https://www.ytkj.edu.cn/info/1115/6346.htm','https://www.ytkj.edu.cn/info/1081/6881.htm'],
    layout:'两期正射复核旗台和通道的平面，杆位和高度用校方录像及照片估算。场坪采用原田径场标高。'
  };
  for(const {ring,base,top,color} of surfaces){
    const shape=new T.Shape(ring.map(([u,v])=>new T.Vector2(u,v)));
    shape.closePath();
    const geometry=new T.ExtrudeGeometry(shape,{depth:top-base,bevelEnabled:false});
    geometry.rotateX(Math.PI/2);
    const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color,roughness:.96}));
    mesh.position.y=top;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
  }
  const metal=new T.MeshStandardMaterial({color:'#e0dfd7',roughness:.45,metalness:.3});
  for(const [u,v,height] of poles){
    const stem=new T.Mesh(new T.CylinderGeometry(.042,.079,height,10),metal);
    stem.name='旗杆';stem.position.set(u,deck+height/2,v);group.add(stem);
    const base=new T.Mesh(new T.CylinderGeometry(.15,.17,.15,12),metal);
    base.position.set(u,deck+.075,v);group.add(base);
  }
  return group;
}

export function drawFlagTerrace(c) {
  c.save();
  for(const {ring,color} of surfaces){
    c.fillStyle=color;c.beginPath();c.moveTo(...ring[0]);
    for(const point of ring.slice(1))c.lineTo(...point);
    c.closePath();c.fill();
  }
  c.fillStyle='#79746a';
  for(const [u,v] of poles){c.beginPath();c.arc(u,v,.26,0,2*Math.PI);c.fill();}
  c.restore();
}
