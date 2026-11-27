import * as T from './vendor/three.module.js';

// Summer views of the gate plaza show pale, exposed broadleaf trunks on the
// lawns and darker, upright, multi-tipped crowns along the axial walk.
const TAU = Math.PI * 2;
const goldenAngle = Math.PI * (3 - Math.sqrt(5));
const dimensions = {broadleaf:[3.4,7], cypress:[1.7,6]};
const V = (x,y,z) => new T.Vector3(x,y,z);
function random(seed) {
  return () => (seed = (Math.imul(seed,1664525) + 1013904223) >>> 0) / 4294967296;
}

// All crown offsets and radii are in metres. These small descriptions also
// supply the plan view, even when WebGL and detailed tree geometry are absent.
function describe(kind,variant) {
  const broad = kind === 'broadleaf', seed = (broad?3517:8401) + variant*824;
  const rand = random(seed), crowns = [];
  function ring(count, distance, y, rx, ry, rz, light) {
    const offset = rand()*TAU;
    for (let i=0;i<count;i++) {
      const angle = offset+(i+(rand()-.5)*.32)*TAU/count;
      const reach = distance*(.86+rand()*.24);
      crowns.push({
        x:Math.cos(angle)*reach, z:Math.sin(angle)*reach, y:y+(rand()-.5)*(broad?.48:.76),
        rx:rx*(.92+rand()*.14), ry:ry*(.90+rand()*.17), rz:rz*(.91+rand()*.16),
        angle:angle+(rand()-.5)*.65, light:light+rand()*.16
      });
    }
  }
  if (broad) {
    ring(7,1.81,4.55,1.46,1.14,1.25,.21);
    ring(4,1.08,5.49,1.37,1.17,1.22,.50);
    crowns.push({x:.10,y:5.90,z:-.16,rx:1.30,ry:1.10,rz:1.26,angle:.25,light:.74});
  } else {
    ring(7,.80,2.87,.75,1.85,.61,.18);
    ring(4,.52,3.73,.57,1.72,.48,.48);
    crowns.push({x:.06,y:3.53,z:-.08,rx:.64,ry:2.47,rz:.62,angle:0,light:.68});
  }
  return {kind,variant,seed,crowns:crowns.sort((a,b)=>(a.y+a.ry)-(b.y+b.ry))};
}

function buffers() {
  return {p:[],c:[],uv:[],indices:[],seams:[]};
}
function addVertex(buf,point,color) {
  buf.p.push(point.x,point.y,point.z);
  buf.c.push(color.r,color.g,color.b);
  return buf.p.length/3-1;
}
function finish(buf) {
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(buf.p,3));
  geo.setAttribute('color',new T.Float32BufferAttribute(buf.c,3));
  if(buf.uv.length)geo.setAttribute('uv',new T.Float32BufferAttribute(buf.uv,2));
  geo.setIndex(buf.indices);geo.computeVertexNormals();
  const normals=geo.getAttribute('normal'),a=new T.Vector3(),b=new T.Vector3();
  for(const [left,right] of buf.seams){
    a.fromBufferAttribute(normals,left).add(b.fromBufferAttribute(normals,right)).normalize();
    normals.setXYZ(left,a.x,a.y,a.z);normals.setXYZ(right,a.x,a.y,a.z);
  }
  geo.computeBoundingSphere();
  return geo;
}

// Rings share vertices along the limb so the flare, twist and tapered forks
// read as one continuous piece. Adjacent bands meet at the whitewash line.
function limb(buf,points,radii,baseColor,sides) {
  const start=buf.p.length/3;
  const tint=new T.Color(baseColor);
  for(let j=0;j<points.length;j++){
    const axis=points[Math.min(j+1,points.length-1)].clone().sub(points[Math.max(0,j-1)]).normalize();
    const side=V(0,0,1).cross(axis).normalize(),across=axis.clone().cross(side);
    for(let i=0;i<sides;i++){
      const angle=TAU*i/sides;
      const radius=radii[j]*(1+.08*Math.cos(3*angle+.2));
      const point=points[j].clone().addScaledVector(side,radius*Math.cos(angle)).addScaledVector(across,radius*Math.sin(angle));
      addVertex(buf,point,tint.clone().multiplyScalar(.89+.13*Math.cos(3*angle+.8)));
      if(j===0)continue;
      const a=start+(j-1)*sides+i,b=start+(j-1)*sides+(i+1)%sides;
      buf.indices.push(a,b,b+sides,a,b+sides,a+sides);
    }
  }
}
function woodyFrame(buf,description,rand) {
  const broad=description.kind==='broadleaf';
  const split=V(.07,broad?2.12:1.07,.01),bend=V(.035,1.16,-.025);
  const bark=broad?'#776d56':'#706447';
  if(broad){
    limb(buf,[V(0,-.045,0),V(.014,.17,-.012),bend],[.24,.165,.132],'#c9c9b7',9);
    limb(buf,[bend,split,V(-.14,4.18,-.06),V(.16,5.9,-.09)],[.132,.122,.080,.024],bark,9);
  }else{
    limb(buf,[V(0,-.035,0),split,V(-.07,3.42,.04),V(.06,5.82,-.08)],[.15,.116,.072,.012],bark,7);
  }
  for(const crown of description.crowns){
    const u=split.clone().add(V(0,rand()*(broad?1.22:.7),0));
    const elbow=V(crown.x*.58,u.y+(crown.y-u.y)*.47,crown.z*.54);
    const tip=V(crown.x,crown.y+.18,crown.z);
    limb(buf,[u,elbow,tip],[broad?.071:.052,broad?.045:.035,.015],bark,6);
    if(broad){
      const twig=tip.clone().add(V((rand()-.5)*1.23,.38,(rand()-.5)*1.23));
      limb(buf,[elbow,twig],[.038,.009],bark,5);
    }
  }
}

// A small transparent twig supplies the leaf-scale gaps at the crown edge.
// Both the axial spray and its foliage are generated locally and embedded
// in GLB by the normal exporter. Opaque inner crowns preserve distant mass.
function sprigTexture(broad) {
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=128;
  const c=canvas.getContext('2d'),rand=random(broad?5463:18741);
  function stem(x,y,u,v,width) {
    c.strokeStyle=broad?'#938b62':'#81845c';c.lineWidth=width;c.lineCap='round';
    c.beginPath();c.moveTo(x,y);c.lineTo(u,v);c.stroke();
  }
  function leaf(x,y,angle,len,wide,tint) {
    c.save();c.translate(x,y);c.rotate(angle);c.fillStyle=tint;c.beginPath();c.moveTo(0,0);
    c.quadraticCurveTo(len*.38,-wide,len,0);c.quadraticCurveTo(len*.51,wide,0,0);c.fill();c.restore();
  }
  const palette=broad?['#deebc9','#c7ddb3','#e1edd2','#d1e6b8','#bfd5ae']:['#b9c8ac','#c6d1b5','#d1d8bd','#afc19f'];
  stem(60,125,67,6,1.6);
  for(let j=0;j<6;j++){
    for(const sign of [-1,1]){
      const y=113-j*16+(rand()-.5)*6,x=60+(125-y)*.06;
      const reach=(broad?40:37)*(1-j*.088)*(1+rand()*.21);
      const u=x+sign*reach,v=y-(broad?20:33)-rand()*6;
      stem(x,y,u,v,broad?1.25:1.7);
      const pairs=broad?4:7;
      for(let k=1;k<=pairs;k++){
        const t=k/(pairs+.3);
        for(const s of [-1,1]){
          const angle=Math.atan2(v-y,u-x)+s*(.46+rand()*.47);
          leaf(x+(u-x)*t,y+(v-y)*t,angle,(broad?12:9)*(1-t*.24)+rand()*3,broad?5.6:2.7,palette[Math.floor(rand()*palette.length)]);
        }
      }
      leaf(u,v,Math.atan2(v-y,u-x),8,2.5,palette[j%palette.length]);
    }
  }
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.name=broad?'阔叶小枝':'常绿枝梢';
  return tex;
}

function* crownTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const c=canvas.getContext('2d'),rand=random(13449);
  c.fillStyle='#c4d0b6';c.fillRect(0,0,256,256);
  const palette=['#94a68a','#a7b699','#c3cfb6','#d4decc','#e9efdd'];
  // Small alternating patches of sunlit and occluded leaves cover the dense
  // interior between the silhouette sprigs. The bark samples a neutral texel.
  for(let j=0;j<420;j++){
    const x=rand()*256,y=rand()*256,angle=rand()*TAU;
    const band=Math.floor(rand()*palette.length);
    for(let k=0;k<9;k++){
      const t=rand()*13,w=(rand()-.5)*9;
      c.fillStyle=palette[Math.max(0,Math.min(4,band+Math.round((rand()-.5)*2)))];
      c.beginPath();c.ellipse(x+Math.cos(angle)*t-Math.sin(angle)*w,y+Math.sin(angle)*t+Math.cos(angle)*w,
        1.1+rand()*2.8,1+rand(),angle+(rand()-.5)*1.8,0,TAU);c.fill();
    }
    if((j+1)%24===0)yield;
  }
  c.fillStyle='#fff';c.fillRect(0,240,16,16);
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.name='冠内叶面明暗';return tex;
}

function* model(description) {
  const solid=buffers(),sprigs=buffers(),rand=random(description.seed+315);
  const broad=description.kind==='broadleaf';
  const [radius,height]=dimensions[description.kind];
  const foliage=new T.Color(broad?'#809d65':'#5d7854');
  woodyFrame(solid,description,rand);
  for(let i=0;i<solid.p.length/3;i++)solid.uv.push(.025,.025);
  for(const crown of description.crowns){
    const ca=Math.cos(crown.angle),sa=Math.sin(crown.angle),phase=rand()*TAU;
    const local=(xx,yy,zz) => V(crown.x+ca*xx-sa*zz,crown.y+yy,crown.z+sa*xx+ca*zz);
    const ringSize=12,stacks=6;
    // A gently lobed envelope stops the twig cards revealing an empty shell.
    function shell(y,angle,scale) {
      const horizontal=Math.sqrt(Math.max(0,1-y*y));
      const ripple=1+.09*Math.cos(3*angle+phase+y)+.065*Math.sin(5*angle-phase+y*2.4);
      const width=horizontal*ripple*scale*(broad?1:1-.17*y);
      return local(Math.cos(angle)*width*crown.rx,y*crown.ry*scale,Math.sin(angle)*width*crown.rz);
    }
    const bottom=addVertex(solid,shell(-1,0,.9),foliage.clone().multiplyScalar(.63));
    solid.uv.push(.5,.055);
    let previous;
    for(let j=1;j<stacks;j++){
      const y=-Math.cos(Math.PI*j/stacks);
      const row=solid.p.length/3;
      for(let i=0;i<=ringSize;i++){
        const a=TAU*(i+(j%2)*.27)/ringSize;
        const tint=foliage.clone().multiplyScalar((.69+.40*crown.light+.13*y)*(.90+rand()*.20));
        addVertex(solid,shell(y,a,broad?.91:.87),tint);
        solid.uv.push(.09+.86*i/ringSize,.06+.89*j/stacks);
        if(!i)continue;
        if(j===1)solid.indices.push(bottom,row+i-1,row+i);
        else solid.indices.push(previous+i-1,row+i-1,previous+i, previous+i,row+i-1,row+i);
      }
      solid.seams.push([row,row+ringSize]);previous=row;
    }
    const top=addVertex(solid,shell(1,0,.9),foliage.clone().multiplyScalar(1.06));
    solid.uv.push(.5,.97);
    for(let i=0;i<ringSize;i++)solid.indices.push(previous+i,top,previous+i+1);
    const count=broad?65:78;
    for(let i=0;i<count;i++){
      const y=2*(i+.5)/count-1,a=phase+i*goldenAngle+(rand()-.5)*.25;
      const p=shell(y,a,.97),worldAngle=a+crown.angle;
      const side=V(-Math.sin(worldAngle),(.5-rand())*(broad?.86:.16),Math.cos(worldAngle)).normalize();
      const flat=Math.sqrt(1-y*y),out=V(Math.cos(worldAngle),0,Math.sin(worldAngle));
      const rise=broad?.36+.64*y+(rand()-.5)*.78:1;
      const tip=V(0,rise,0).addScaledVector(out,broad?.76+flat*.22:.24-y*.20).normalize();
      tip.addScaledVector(side,(rand()-.5)*(broad?1.8:.64)).normalize();
      side.addScaledVector(tip,-side.dot(tip)).normalize();
      if(broad)side.applyAxisAngle(tip,(rand()-.5)*2.45);
      const width=(broad?.74:.44)*(1+rand()*.5),len=(broad?.54:.72)*(1+rand()*.52);
      const base=p.clone().addScaledVector(tip,-len*.46);
      const top=base.clone().addScaledVector(tip,len);
      const tone=new T.Color(broad?'#9ab781':'#81967b').multiplyScalar(.84+crown.light*.22+rand()*.20);
      const k=sprigs.p.length/3;
      for(const [pt,sign] of [[base,-1],[base,1],[top,1],[top,-1]]){
        addVertex(sprigs,pt.clone().addScaledVector(side,sign*width*.5),tone);
      }
      sprigs.uv.push(0,0,1,0,1,1,0,1);
      sprigs.indices.push(k,k+1,k+2,k,k+2,k+3);
    }
    yield;
  }
  // Fit the final combined crown (including branchlet tips) to the original
  // site envelope, so switching detail never moves the trunk or grows the tree.
  let peak=0,spread=0;
  for(const {p} of [solid,sprigs])for(let j=0;j<p.length;j+=3){
    peak=Math.max(peak,p[j+1]);spread=Math.max(spread,Math.hypot(p[j],p[j+2]));
  }
  for(const {p} of [solid,sprigs])for(let j=0;j<p.length;j+=3){
    p[j]*=radius/spread;p[j+1]*=height/peak;p[j+2]*=radius/spread;
  }
  return [finish(solid),finish(sprigs)];
}

export function plazaTreeDetail(sites,heightAt) {
  const descriptions=new Map(),groups=new Map(),poses=new Map(),footprints=new Map(),rand=random(578131);
  const root=new T.Group();root.name='观海广场树木';root.visible=false;
  const solid=new T.MeshStandardMaterial({vertexColors:true,roughness:1});
  const foliageMaterials=new Map(Object.keys(dimensions).map(kind=>[kind,new T.MeshStandardMaterial({
    vertexColors:true,alphaTest:.46,side:T.DoubleSide,roughness:1,emissive:kind==='broadleaf'?'#273323':'#1b271b'
  })]));
  root.userData.appearance='Crown forms and pale lower trunks interpreted from university photographs. Individual trees are not surveyed.';
  const bounds=new T.Box3();
  for(const site of sites){
    const variant=Math.floor(rand()*2),rotation=rand()*TAU,key=site.kind+variant;
    if(!descriptions.has(key)){descriptions.set(key,describe(site.kind,variant));groups.set(key,[])}
    const desc=descriptions.get(key),[r,h]=dimensions[site.kind],s=site.radius/r;
    const ca=Math.cos(rotation),sa=Math.sin(rotation),ground=heightAt(site.x,site.z);
    poses.set(site,[site.x,ground,site.z,rotation,s,site.height/h]);
    groups.get(key).push(site);
    // Include the ground shadow cast beyond the silhouette by the scene sun.
    footprints.set(site,new T.Sphere(V(site.x,ground+site.height*.5,site.z),
      Math.hypot(site.radius,site.height*.5)+site.height*.76));
    bounds.expandByPoint(V(site.x-site.radius,ground,site.z-site.radius));
    bounds.expandByPoint(V(site.x+site.radius,ground+site.height,site.z+site.radius));
    site.planCrown=desc.crowns.map(c=>[
      s*(ca*c.x+sa*c.z),s*(-sa*c.x+ca*c.z),s*c.rx,s*c.rz,c.angle-rotation,c.light
    ]);
  }
  const sphere=bounds.getBoundingSphere(new T.Sphere()),clip=new T.Matrix4(),frustum=new T.Frustum();
  sphere.radius+=8;
  const previousClip=new T.Matrix4(),batches=[];
  let previousCamera;
  let built=false, preparation, preparationError, notifyReady;
  function* buildBatches() {
    const dummy=new T.Object3D();
    solid.map=yield* crownTexture();solid.needsUpdate=true;
    for(const [key,group] of groups){
      const desc=descriptions.get(key),broad=desc.kind==='broadleaf';
      const leaves=foliageMaterials.get(desc.kind);
      if(!leaves.map){leaves.map=sprigTexture(broad);leaves.needsUpdate=true}
      const geometries=yield* model(desc);
      const meshes=[];
      for(let part=0;part<geometries.length;part++){
        const mesh=new T.InstancedMesh(geometries[part],part?leaves:solid,group.length);
        mesh.name=(broad?'广场阔叶':'中轴窄冠')+(desc.variant+1)+(part?'枝叶':'主枝与树冠');
        for(const [i,site] of group.entries()){
          const [x,y,z,angle,s,sy]=poses.get(site);
          dummy.position.set(x,y,z);dummy.rotation.y=angle;dummy.scale.set(s,sy,s);dummy.updateMatrix();
          mesh.setMatrixAt(i,dummy.matrix);
        }
        mesh.computeBoundingSphere();mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);meshes.push(mesh);
      }
      batches.push({meshes,order:group.map((_,i)=>i),spheres:group.map(site=>footprints.get(site)),
        matrices:meshes[0].instanceMatrix.array.slice()});
      yield;
    }
  }
  function ensure() {
    if(preparationError)throw preparationError;
    if(built)return;
    preparation??=buildBatches();
    while(!preparation.next().done){}
    finishPreparation();
  }
  function finishPreparation() {
    built=true;
    preparation=null;
    const notify=notifyReady;
    notifyReady=null;
    notify?.();
  }
  function prepare(onReady) {
    if(preparation||preparationError)return;
    preparation=buildBatches();
    notifyReady=onReady;
    function schedule() {
      if(typeof requestIdleCallback==='function')requestIdleCallback(step,{timeout:120});
      else setTimeout(step,16);
    }
    function step(deadline) {
      if(built)return;
      const end=performance.now()+(deadline?.didTimeout?1.5:4);
      try {
        do {
          if(preparation.next().done){finishPreparation();return;}
        } while(performance.now()<end&&(!deadline||deadline.timeRemaining()>1));
        schedule();
      } catch(error) {
        preparationError=error;
        console.warn('Unable to prepare plaza tree detail',error);
      }
    }
    schedule();
  }
  function selectVisible(batch,view){
    let count=0,changed=false;
    for(const [i,sphere] of batch.spheres.entries()){
      if(view&&!view.intersectsSphere(sphere))continue;
      if(batch.order[count]!==i){
        const matrix=batch.matrices.subarray(i*16,i*16+16);
        for(const mesh of batch.meshes)mesh.instanceMatrix.array.set(matrix,count*16);
        batch.order[count]=i;changed=true;
      }
      count++;
    }
    for(const mesh of batch.meshes){
      mesh.count=count;mesh.visible=count>0;
      if(changed)mesh.instanceMatrix.needsUpdate=true;
    }
  }
  function update(pixelsPerMetre,camera,onReady) {
    let active=sites.length>0 && root.parent.visible && pixelsPerMetre>=2;
    if(active&&camera){
      camera.updateWorldMatrix(true,false);root.updateWorldMatrix(true,false);
      clip.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(root.matrixWorld);
      active=frustum.setFromProjectionMatrix(clip,camera.coordinateSystem,camera.reversedDepth).intersectsSphere(sphere);
    }
    if(active&&!built){
      if(onReady){prepare(onReady);active=false;}
      else ensure();
    }
    if(active){
      if(!root.visible||previousCamera!==camera||(camera&&!clip.equals(previousClip))){
        for(const batch of batches)selectVisible(batch,camera?frustum:null);
        if(camera)previousClip.copy(clip);
        previousCamera=camera;
      }
    }
    root.visible=active;
    return active;
  }
  function prepareExport(snapshot){
    const copy=snapshot.getObjectByName(root.name);copy.visible=true;
    for(const batch of batches)for(const mesh of batch.meshes){
      const node=copy.getObjectByName(mesh.name);node.visible=true;
      node.instanceMatrix.array.set(batch.matrices);node.count=batch.spheres.length;
    }
  }
  return {root,materials:[solid,...foliageMaterials.values()],ensure,update,prepareExport};
}
