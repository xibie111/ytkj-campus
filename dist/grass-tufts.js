import * as T from './vendor/three.module.js';
import {meadowPatch} from './grass.js';
import {containsPlazaTurf} from './plaza-grass.js';

export const tuftStartScale=2.5;

function seededRandom(seed){
  return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
}

// A ribbon represents a few neighbouring leaves. The narrowed, bent tip
// catches the light as the orbit angle changes without billboard textures.
function lawnGeometry(){
  const random=seededRandom(52493);
  const positions=[],colors=[],indices=[];
  const spread=.23, leaves=13;
  const dark=new T.Color('#879b69');
  const green=new T.Color('#99ad76');
  const straw=new T.Color('#acb77d');
  // Each patch has a dominant crown and several smaller lateral shoots.
  const shoots=Array.from({length:4},(_,i)=>{
    const angle=i*2.4+random()*.65,r=i?spread*(.45+.5*random()):0;
    return {x:r*Math.cos(angle),z:r*Math.sin(angle),size:i?.51+random()*.39:1};
  });
  for(let i=0;i<leaves;i++){
    const shoot=shoots[i%shoots.length];
    const angle=2*Math.PI*random(),dx=Math.cos(angle),dz=Math.sin(angle);
    const radius=spread*.22*Math.sqrt(random()),around=random()*2*Math.PI;
    const x=shoot.x+Math.cos(around)*radius,z=shoot.z+Math.sin(around)*radius;
    const h=.082*(1+.66*random())*shoot.size;
    const half=.016*(.74+random()*.65),lean=h*(.30+.65*random());
    const rootTone=dark.clone().lerp(green,random()*.32);
    const tipTone=green.clone().lerp(straw,random()*.43);
    const midTone=rootTone.clone().lerp(tipTone,.62);
    const start=positions.length/3;
    function pt(along,across,y,tone){
      positions.push(x+along*dx-across*dz,y,z+along*dz+across*dx);
      colors.push(tone.r,tone.g,tone.b);
    }
    pt(0,-half,0,rootTone);pt(0,half,0,rootTone);
    pt(lean*.35,-half*.66,h*.62,midTone);pt(lean*.35,half*.66,h*.62,midTone);
    pt(lean,0,h,tipTone);
    indices.push(start,start+2,start+1,start+1,start+2,start+3,start+2,start+4,start+3);
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

// Three silhouettes for mixed grassland. These are forms used across the
// mapped patches, with no implied survey of species or individual plants.
const hillForms=[
  {name:'低伏叶丛',leaves:14,spread:.37,height:.23,width:.027,bend:1.15,
    roots:'#728753',tips:'#a9b578',stalks:0},
  {name:'直立细叶',leaves:15,spread:.28,height:.36,width:.018,bend:.60,
    roots:'#758358',tips:'#a8ae76',stalks:3},
  {name:'枯黄草茎',leaves:10,spread:.43,height:.22,width:.018,bend:1.27,
    roots:'#8c8b5a',tips:'#c5b581',stalks:2}
];

function hillBlades(form,index){
  const random=seededRandom(879221+index*4291);
  const positions=[],colors=[],indices=[];
  const base=new T.Color(form.roots),tip=new T.Color(form.tips);
  const crown=[{x:0,z:0},...Array.from({length:3},(_,i)=>{
    const a=i*2.1+random()*.45,r=form.spread*(.54+.32*random());
    return {x:r*Math.cos(a),z:r*Math.sin(a)};
  })];
  function ribbon(x,z,angle,height,width,bend,rootTone,leafTone){
    const dx=Math.cos(angle),dz=Math.sin(angle),start=positions.length/3;
    function point(t,across,tone){
      const along=bend*t*t,y=height*t*(1-.16*t*t);
      positions.push(x+along*dx-across*dz,y,z+along*dz+across*dx);
      colors.push(tone.r,tone.g,tone.b);
    }
    const middle=rootTone.clone().lerp(leafTone,.60);
    point(0,-width,rootTone);point(0,width,rootTone);
    point(.46,-width*.78,middle);point(.46,width*.78,middle);
    point(.79,-width*.40,leafTone);point(.79,width*.39,leafTone);point(1,0,leafTone);
    indices.push(start,start+2,start+1,start+1,start+2,start+3,start+2,start+4,start+3,
      start+3,start+4,start+5,start+4,start+6,start+5);
  }
  for(let i=0;i<form.leaves;i++){
    const shoot=crown[i%4],angle=i*2.4+(random()-.5)*1.6;
    const x=shoot.x+(random()-.5)*form.spread*.38,z=shoot.z+(random()-.5)*form.spread*.38;
    const height=form.height*(.55+random()*.65);
    const tone=tip.clone().lerp(base,random()*.47);
    ribbon(x,z,angle,height,form.width*(.61+random()*.75),height*form.bend*(.58+.49*random()),base,tone);
  }
  const buff=new T.Color('#baad7b');
  for(let i=0;i<form.stalks;i++){
    const head=crown[i%4],a=i*2.3+random()*.8,height=form.height*(1.15+.24*random());
    ribbon(head.x,head.z,a,height,.009,height*.30,base,buff);
  }
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  g.setIndex(indices);g.computeVertexNormals();
  return g;
}

function* lawnSites(gate,random){
  if(!gate)return [];
  const sites=[],c=Math.cos(gate.angle),s=Math.sin(gate.angle),step=1.49;
  function add(a,b){
    if(containsPlazaTurf(a,b,.46))sites.push([gate.x+a*c-b*s,gate.z+a*s+b*c]);
  }
  for(let u=-38;u<65;u+=step){
    for(let v=2;v<135;v+=step){
      const a=u+step*random(),b=v+step*random();
      add(a,b);
      if(random()<.58){
        const angle=random()*2*Math.PI,reach=.22+random()*.65;
        add(a+Math.cos(angle)*reach,b+Math.sin(angle)*reach);
      }
    }
    yield;
  }
  return sites;
}

function* meadowSites(meadow){
  const sites=hillForms.map(()=>[]);
  if(!meadow?.clearGrass)return sites;
  const [west,north,east,south]=meadow.bounds,step=4.6;
  function add(x,z,kind){
    if(meadow.clearGrass(x,z))sites[kind].push([x,z]);
  }
  for(let row=Math.floor(north/step);row*step<south;row++){
    for(let col=Math.floor(west/step);col*step<east;col++){
      const random=seededRandom(Math.imul(row,19349663)^Math.imul(col,73856093)^21983);
      const x=(col+random())*step,z=(row+random())*step;
      if(!meadow.clearGrass(x,z))continue;
      const {dry,cover}=meadowPatch(x,z);
      if(random()>.036+.34*cover*(1-.51*dry))continue;
      const choice=random();
      const kind=choice<.54*dry?2:choice<.60+.22*cover?0:1;
      sites[kind].push([x,z]);
      // The dense patches also contain small colonies. Vary the spacing
      // and give some shoots a different silhouette from their neighbours.
      if(random()<.08+.40*cover){
        const count=cover>.67&&random()<.53?4:1;
        for(let k=0;k<count;k++){
          const a=random()*Math.PI*2,reach=.40+1.08*random();
          const neighbour=random()<.23?(kind+1+Math.floor(random()*2))%hillForms.length:kind;
          add(x+reach*Math.cos(a),z+reach*Math.sin(a),neighbour);
        }
      }
    }
    yield;
  }
  return sites;
}

function* sectorMeshes(group,sites,heightAt,random,material,sectors,form=null,formIndex=0){
  if(!sites.length)return;
  const lawn=!form,geometry=lawn?lawnGeometry():hillBlades(form,formIndex);
  const name=form?group.name+' '+form.name:group.name;
  const batches=new Map(),span=lawn?180:240;
  let n=0;
  for(const site of sites){
    const key=Math.floor(site[0]/span)+','+Math.floor(site[1]/span);
    if(!batches.has(key))batches.set(key,[]);
    batches.get(key).push(site);
    if(++n%128===0)yield;
  }
  const matrix=new T.Matrix4(),position=new T.Vector3(),scale=new T.Vector3();
  const normal=new T.Vector3(),up=new T.Vector3(0,1,0),tilt=new T.Quaternion(),twist=new T.Quaternion();
  geometry.computeBoundingSphere();
  const instanceBounds=new T.Sphere(),bound=geometry.boundingSphere;
  for(const [key,points] of batches){
    // A prefix must sample the entire sector as zoom brings the tufts in.
    for(let i=points.length-1;i>0;i--){
      const j=Math.floor(random()*(i+1));
      [points[i],points[j]]=[points[j],points[i]];
      if(i%128===0)yield;
    }
    const mesh=new T.InstancedMesh(geometry,material,points.length);
    mesh.name=name+' '+key;mesh.receiveShadow=true;
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    mesh.boundingSphere=new T.Sphere().makeEmpty();
    let maxScale=0;
    for(let i=0;i<points.length;i++){
      const [x,z]=points[i],delta=.12;
      normal.set(heightAt(x-delta,z)-heightAt(x+delta,z),2*delta,heightAt(x,z-delta)-heightAt(x,z+delta)).normalize();
      tilt.setFromUnitVectors(up,normal);twist.setFromAxisAngle(up,random()*Math.PI*2);tilt.multiply(twist);
      const breadth=.72+random()*.52;
      scale.set(breadth,(lawn?.48:.60)+.64*random(),breadth);position.set(x,heightAt(x,z),z);
      maxScale=Math.max(maxScale,breadth,scale.y);
      mesh.setMatrixAt(i,matrix.compose(position,tilt,scale));
      // Retain Three's bounds from the stored float32 transform, while sharing
      // the same small CPU slices as instance generation.
      mesh.getMatrixAt(i,matrix);
      mesh.boundingSphere.union(instanceBounds.copy(bound).applyMatrix4(matrix));
      if(i%64===63)yield;
    }
    group.add(mesh);
    sectors.set(mesh.name,{mesh,radius:(bound.radius+bound.center.length())*maxScale+.001,original:null,order:null});
    yield;
  }
}

// Compact in the published order, including at intermediate zoom levels. An
// anchor sphere contains every rotated leaf, including tips at a screen edge.
function drawVisible(sector,limit,frustum,ids){
  const {mesh,radius}=sector;
  if(!limit||(frustum&&!frustum.intersectsSphere(mesh.boundingSphere))){
    mesh.count=0;mesh.visible=false;return;
  }
  const attr=mesh.instanceMatrix,target=attr.array,source=sector.original||target;
  let count=0,first=-1,last=-1;
  for(let i=0;i<limit;i++){
    const k=i*16;
    if(frustum){
      const x=source[k+12],y=source[k+13],z=source[k+14];
      let outside=false;
      for(const plane of frustum.planes){
        const n=plane.normal;
        if(n.x*x+n.y*y+n.z*z+plane.constant< -radius){outside=true;break}
      }
      if(outside)continue;
    }
    ids[count]=i;
    if((sector.order?sector.order[count]:count)!==i){
      if(first<0)first=count;
      last=count;
    }
    count++;
  }
  mesh.count=count;mesh.visible=count>0;
  if(first<0)return;
  // Untouched sectors share their sole CPU matrix buffer with the export path.
  // Make a backup only when an actual visible instance moves into a new slot.
  if(!sector.original){
    sector.original=target.slice();
    sector.order=Uint32Array.from({length:attr.count},(_,i)=>i);
  }
  for(let n=first;n<=last;n++){
    const id=ids[n];
    if(sector.order[n]===id)continue;
    sector.order[n]=id;
    for(let j=0;j<16;j++)target[n*16+j]=sector.original[id*16+j];
  }
  attr.addUpdateRange(first*16,(last-first+1)*16);attr.needsUpdate=true;
}

function* buildGrassTufts(gate,meadow,heightAt,root){
  root.name='立体草簇';
  root.userData={appearance:'Illustrative grass clumps inside the mapped turf. Species, height and density are not surveyed.'};
  const lawnRandom=seededRandom(92179);
  // A little fill approximates diffuse transmission through thin leaves.
  const material=new T.MeshStandardMaterial({vertexColors:true,emissive:0x333c24,roughness:1,side:T.DoubleSide});
  const sectors=new Map();
  const lawn=new T.Group(),hill=new T.Group();
  lawn.name='广场短草';hill.name='坡地草丛';
  const lawnPoints=yield* lawnSites(gate,lawnRandom);
  yield* sectorMeshes(lawn,lawnPoints,heightAt,lawnRandom,material,sectors);
  const sites=yield* meadowSites(meadow);
  for(const [i,form] of hillForms.entries()){
    yield* sectorMeshes(hill,sites[i],heightAt,seededRandom(21983+i*1891),material,sectors,form,i);
  }
  root.add(lawn,hill);root.visible=false;
  const ids=new Uint32Array(Math.max(0,...Array.from(sectors.values(),s=>s.mesh.instanceMatrix.count)));
  const clip=new T.Matrix4(),previousClip=new T.Matrix4(),frustum=new T.Frustum();
  let previousScale=-1,wasCamera=false;
  function density(group,amount,view){
    group.visible=amount>0;
    if(!group.visible)return;
    for(const mesh of group.children){
      drawVisible(sectors.get(mesh.name),Math.round(mesh.instanceMatrix.count*amount),view,ids);
    }
  }
  function update(pixelsPerMetre,satellite,camera){
    root.visible=!satellite&&pixelsPerMetre>tuftStartScale;
    if(!root.visible)return;
    if(camera){
      camera.updateWorldMatrix(true,false);root.updateWorldMatrix(true,false);
      clip.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(root.matrixWorld);
    }
    if(previousScale===pixelsPerMetre&&wasCamera===!!camera&&(!camera||clip.equals(previousClip)))return;
    previousScale=pixelsPerMetre;wasCamera=!!camera;
    if(camera){previousClip.copy(clip);frustum.setFromProjectionMatrix(clip,camera.coordinateSystem,camera.reversedDepth)}
    density(lawn,T.MathUtils.smoothstep(pixelsPerMetre,4,13),camera?frustum:null);
    density(hill,T.MathUtils.smoothstep(pixelsPerMetre,tuftStartScale,9),camera?frustum:null);
  }
  function prepareExport(snapshot){
    snapshot.getObjectByName(root.name).traverse(node=>{
      node.visible=true;
      if(node.isInstancedMesh){
        const original=sectors.get(node.name).original;
        if(original)node.instanceMatrix.array.set(original);
        node.count=node.instanceMatrix.count;
      }
    });
  }
  return {root,update,prepareExport};
}

export function createGrassTufts(gate,meadow,heightAt,root=new T.Group()){
  const build=buildGrassTufts(gate,meadow,heightAt,root);
  return new Promise((resolve,reject)=>{
    function schedule(){
      if(typeof requestIdleCallback==='function')requestIdleCallback(slice,{timeout:120});
      else setTimeout(slice,0);
    }
    function slice(deadline){
      const end=performance.now()+(deadline?.didTimeout?1.5:3);
      try{
        do{
          const step=build.next();
          if(step.done){resolve(step.value);return}
        }while(performance.now()<end&&(!deadline||deadline.timeRemaining()>1));
        schedule();
      }catch(error){reject(error)}
    }
    schedule();
  });
}
