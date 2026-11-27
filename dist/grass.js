import * as T from './vendor/three.module.js';
import {drawAthletics} from './sports.js';
import {meadowPatch,shadeMeadowRows} from './meadow-colours.js';

export {meadowPatch};

const tileMetres=11;
const bucketMetres=120;

function canvas(width,height){
  const result=document.createElement('canvas');
  result.width=width;result.height=height;
  return result;
}

function maskRings(ctx,item,buffer=0){
  if(!item.ring?.length)return;
  ctx.beginPath();
  for(const ring of [item.ring,...(item.holes||[])]){
    ctx.moveTo(...ring[0]);for(const pt of ring.slice(1))ctx.lineTo(...pt);
    ctx.closePath();
  }
  ctx.fill('evenodd');
  if(buffer){ctx.lineWidth=buffer*2;ctx.stroke()}
}
function landMask(bounds,cls,data,region,roadData,pads){
  const [l,t,r,b]=bounds,w=r-l,d=b-t;
  const width=Math.ceil(w/2),height=Math.ceil(d/2),sx=width/w,sz=height/d;
  const layer=canvas(width,height),ctx=layer.getContext('2d',{willReadFrequently:true});
  const marks=ctx.createImageData(width,height);
  // Interpolate the four 10 m pixel centres on the original WorldCover grid.
  // The containing cell must itself be grass, keeping the feathered edge inside.
  const cols=Math.ceil(w/10)+3,rows=Math.ceil(d/10)+3;
  const gx0=Math.floor((l-5)/10)*10+5,gz0=Math.floor((t-5)/10)*10+5;
  const cover=new Uint8Array(cols*rows);
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++)cover[j*cols+i]=cls(gx0+i*10,gz0+j*10)===30?1:0;
  const westCol=new Int32Array(width), nearestCol=new Int32Array(width), eastWeight=new Float64Array(width);
  for(let i=0;i<width;i++){
    const gx=(l+(i+.5)/sx-gx0)/10;
    westCol[i]=Math.floor(gx);
    nearestCol[i]=Math.round(gx);
    eastWeight[i]=gx-westCol[i];
  }
  const alphaChannel=marks.data;
  for(let j=0;j<height;j++){
    const gz=(t+(j+.5)/sz-gz0)/10,j0=Math.floor(gz),v=gz-j0,top=j0*cols,bot=top+cols;
    const nearestRow=Math.round(gz)*cols, output=j*width*4+3;
    for(let i=0;i<width;i++){
      if(!cover[nearestRow+nearestCol[i]])continue;
      const i0=westCol[i],u=eastWeight[i];
      const f=(1-v)*((1-u)*cover[top+i0]+u*cover[top+i0+1])+v*((1-u)*cover[bot+i0]+u*cover[bot+i0+1]);
      const weight=Math.max(0,Math.min(1,(f-.51)/.40));
      alphaChannel[output+i*4]=255*weight*weight*(3-2*weight);
    }
  }
  ctx.putImageData(marks,0,0);
  ctx.setTransform(sx,0,0,sz,-l*sx,-t*sz);ctx.globalCompositeOperation='destination-out';ctx.lineJoin='round';ctx.lineCap='round';
  for(const item of [...data.buildings,...(region?.buildings||[])])maskRings(ctx,item,1.5);
  for(const item of [...(region?.water||[]),...data.areas.filter(a=>a.kind==='water')])maskRings(ctx,item,1.5);
  for(const item of roadData?.polygons||[])maskRings(ctx,item,1);
  for(const item of roadData?.areas||[])maskRings(ctx,item,1);
  for(const pad of pads){
    const corners=[[-pad.half,-pad.back],[pad.half,-pad.back],[pad.half,pad.front],[-pad.half,pad.front]];
    const ring=corners.map(([side,front])=>[pad.x+front*pad.nx-side*pad.nz,pad.z+front*pad.nz+side*pad.nx]);
    maskRings(ctx,{ring},1.5);
  }
  if(!roadData)for(const road of region?.roads||data.roads){
    if(!road.ring.length)continue;
    ctx.beginPath();ctx.moveTo(...road.ring[0]);for(const p of road.ring.slice(1))ctx.lineTo(...p);
    ctx.lineWidth=road.width+2;ctx.stroke();
  }
  for(const court of data.courts){
    maskRings(ctx,court,2);
    if(court.verifiedPlatform)continue;
    const wide=court.id==='B057'?76:52,deep=court.id==='B057'?36:34;
    ctx.save();ctx.translate(...court.center);ctx.rotate(-.27);ctx.fillRect(-wide/2-2,-deep/2-2,wide+4,deep+4);ctx.restore();
  }
  drawAthletics(ctx,data.pitch);
  if(data.gate){
    // The photographed entrance garden has its own detailed planting and paths.
    const g=data.gate;ctx.save();ctx.translate(g.x,g.z);ctx.rotate(g.angle);ctx.fillRect(-58,-12,125,150);ctx.restore();
  }
  const pixels=ctx.getImageData(0,0,width,height).data,alpha=new Uint8Array(width*height);
  for(let i=0;i<alpha.length;i++)alpha[i]=pixels[4*i+3];
  return {alpha,width,height,sx,sz,l,t};
}

let pendingMeadowWorker;
function createMeadowWorker(){
  return new Worker(new URL('./meadow-colour-worker.js',import.meta.url),{type:'module'});
}
export function preloadMeadowColour(){
  if(pendingMeadowWorker||typeof Worker!=='function')return;
  try{
    const worker=createMeadowWorker();
    pendingMeadowWorker=worker;
    worker.onerror=event=>{
      event.preventDefault();worker.terminate();pendingMeadowWorker=undefined;
    };
  }catch{}
}
function shadeInWorker(surface,mask,bounds){
  return new Promise((resolve,reject)=>{
    const worker=pendingMeadowWorker??createMeadowWorker();
    pendingMeadowWorker=undefined;
    const {data:pixels,width,height}=surface;
    const alpha=mask.alpha.slice();
    function fail(error){worker.terminate();reject(error)}
    worker.onmessage=({data})=>{
      try{
        const image=new ImageData(data,width,height);
        worker.terminate();resolve(image);
      }catch(error){fail(error)}
    };
    worker.onerror=event=>{event.preventDefault();fail(event.error||new Error(event.message))};
    worker.onmessageerror=()=>fail(new Error('Could not read the terrain colour buffer'));
    try{worker.postMessage({pixels,width,height,mask:{...mask,alpha},bounds},[pixels.buffer,alpha.buffer])}
    catch(error){fail(error)}
  });
}

function shadeInSlices(surface,mask,bounds){
  return new Promise((resolve,reject)=>{
    const {data,width,height}=surface;
    let row=0;
    function step(){
      const deadline=performance.now()+4;
      try{
        do{
          const end=Math.min(row+4,height);
          shadeMeadowRows(data,width,height,mask,bounds,row,end);
          row=end;
        }while(row<height&&performance.now()<deadline);
        if(row===height)resolve(surface);
        else setTimeout(step,0);
      }catch(error){reject(error)}
    }
    setTimeout(step,0);
  });
}

let cachedBlades;
function bladeTile(){
  if(cachedBlades)return cachedBlades;
  // The texture is a top view of blades and litter; the relief remains in the
  // leaf meshes. Most strokes sit in small crowns rather than an even grid.
  const size=256,tile=canvas(size,size),c=tile.getContext('2d');
  let state=931752;
  const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  const green=['rgba(81,103,61,.34)','rgba(115,133,76,.51)','rgba(158,168,98,.53)','rgba(189,192,125,.45)'];
  const cured=['rgba(121,120,70,.36)','rgba(173,151,92,.46)','rgba(207,189,127,.52)','rgba(219,205,153,.40)'];
  function blade(x,y,angle,length,half,lean,tone){
    x=(x+size)%size;y=(y+size)%size;
    c.fillStyle=tone;
    for(const dx of (x<8?[0,size]:x>size-8?[0,-size]:[0]))for(const dy of (y<8?[0,size]:y>size-8?[0,-size]:[0])){
      c.save();c.translate(x+dx,y+dy);c.rotate(angle);c.beginPath();
      c.moveTo(-half,0);
      c.quadraticCurveTo(-half*.8,-length*.6,lean,-length);
      c.quadraticCurveTo(half*.7,-length*.39,half,0);
      c.closePath();c.fill();c.restore();
    }
  }
  for(let i=0;i<1040;i++){
    const x=random()*size,y=random()*size,heading=random()*Math.PI*2;
    const colours=random()<.24?cured:green;
    for(let j=0;j<7;j++){
      blade(x+(random()-.5)*2.7,y+(random()-.5)*2.7,heading+(random()-.5)*5.1,
        1.3+random()*3.5,.22+random()*.43,(random()-.5)*1.35,colours[Math.floor(random()*colours.length)]);
    }
  }
  for(let i=0;i<860;i++){
    blade(random()*size,random()*size,random()*Math.PI*2,1.8+random()*2.8,.17+random()*.25,
      (random()-.5)*1.5,cured[Math.floor(random()*cured.length)]);
  }
  cachedBlades=tile;
  return tile;
}

export function createPlantedMedian(median){
  if(!median)return null;
  const {ring,name,basis,lift=.025,source='data/dorm-buildings.json'}=median;
  const blades=bladeTile(),tile=canvas(blades.width,blades.height),brush=tile.getContext('2d');
  brush.fillStyle='#8e9e76';
  brush.fillRect(0,0,tile.width,tile.height);
  brush.drawImage(blades,0,0);
  const map=new T.CanvasTexture(tile);
  map.colorSpace=T.SRGBColorSpace;
  map.wrapS=map.wrapT=T.RepeatWrapping;
  map.anisotropy=8;
  function createMesh(geometry){
    const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({map,roughness:1}));
    mesh.name=name;
    mesh.receiveShadow=true;
    mesh.userData={groundCover:median.id,displayOffsetMetres:lift,basis,source};
    return mesh;
  }

  const path=new Path2D();
  path.moveTo(...ring[0]);
  for(const point of ring.slice(1))path.lineTo(...point);
  path.closePath();
  const patterns=new WeakMap();
  function drawPlan(ctx){
    if(!patterns.has(ctx)){
      const pattern=ctx.createPattern(tile,'repeat');
      pattern.setTransform(new DOMMatrix().scale(tileMetres/tile.width));
      patterns.set(ctx,pattern);
    }
    ctx.save();ctx.fillStyle=patterns.get(ctx);ctx.fill(path);ctx.restore();
  }
  return {polygon:{ring,style:'plantedMedian'},profile:{lift,period:tileMetres,angle:0},createMesh,drawPlan};
}

export function createMeadow(bounds,cls,data,region,roadData,terrain,pads){
  const mask=landMask(bounds,cls,data,region,roadData,pads);
  // Work in the original 2 m protection mask. Requiring a protected ring
  // around the root keeps the geometry back from roofs, roads and water even
  // when the terrain tessellation changes.
  function maskWeight(x,z){
    const col=Math.floor((x-mask.l)*mask.sx),row=Math.floor((z-mask.t)*mask.sz);
    return col>=0&&col<mask.width&&row>=0&&row<mask.height?mask.alpha[row*mask.width+col]:0;
  }
  function clearGrass(x,z,radius=.85){
    return maskWeight(x,z)>=210&&maskWeight(x-radius,z-radius)>=210&&maskWeight(x+radius,z-radius)>=210
      &&maskWeight(x-radius,z+radius)>=210&&maskWeight(x+radius,z+radius)>=210;
  }
  const pos=terrain.getAttribute('position'),norm=terrain.getAttribute('normal'),faces=terrain.index.array;
  const xyz=[],normals=[],uv=[],indices=[],vertices=[],buckets=new Set();
  const boundary=new Uint8Array(pos.count);
  // Zero marks a vertex that has not been copied into the meadow mesh.
  const vertexIndex=new Uint32Array(pos.count), maskX=new Int32Array(pos.count), maskZ=new Int32Array(pos.count);
  for(let i=0;i<pos.count;i++){
    maskX[i]=Math.floor((pos.getX(i)-mask.l)*mask.sx);
    maskZ[i]=Math.floor((pos.getZ(i)-mask.t)*mask.sz);
  }
  const key=(i,j)=>i+','+j;
  function vertex(source){
    if(vertexIndex[source])return vertexIndex[source]-1;
    const index=vertices.length,x=pos.getX(source),z=pos.getZ(source);
    xyz.push(x,pos.getY(source)+.025,z);normals.push(norm.getX(source),norm.getY(source),norm.getZ(source));
    uv.push(x/tileMetres,-z/tileMetres);
    vertices.push(source);
    vertexIndex[source]=index+1;
    return index;
  }
  // Only fill complete triangles inside grass cover. Check every mask texel in
  // their extent so a narrow road or courtyard crossing the face stays clear.
  for(let f=0;f<faces.length;f+=3){
    const a=faces[f],b=faces[f+1],c=faces[f+2];
    const left=Math.max(0,Math.min(maskX[a],maskX[b],maskX[c])),top=Math.max(0,Math.min(maskZ[a],maskZ[b],maskZ[c]));
    const right=Math.min(mask.width-1,Math.max(maskX[a],maskX[b],maskX[c])),bottom=Math.min(mask.height-1,Math.max(maskZ[a],maskZ[b],maskZ[c]));
    let grass=true;
    for(let j=top;j<=bottom&&grass;j++)for(let i=left;i<=right;i++){
      if(mask.alpha[j*mask.width+i]<210){grass=false;break}
    }
    if(!grass){
      boundary[a]=boundary[b]=boundary[c]=1;continue;
    }
    indices.push(vertex(a),vertex(b),vertex(c));
    const x0=Math.min(pos.getX(a),pos.getX(b),pos.getX(c)),z0=Math.min(pos.getZ(a),pos.getZ(b),pos.getZ(c));
    const id=key(Math.floor(x0/bucketMetres),Math.floor(z0/bucketMetres));
    buckets.add(id);
  }
  if(!indices.length)return {mesh:null,clearGrass,bounds,drawPlan(){}};
  const tile=bladeTile(),mapTexture=new T.CanvasTexture(tile);
  mapTexture.wrapS=mapTexture.wrapT=T.RepeatWrapping;mapTexture.colorSpace=T.SRGBColorSpace;
  mapTexture.anisotropy=8;mapTexture.name='草地细纹';
  const geo=new T.BufferGeometry();
  const colors=new Uint8Array(vertices.length*4).fill(255);
  for(let i=0;i<vertices.length;i++){
    const source=vertices[i];
    if(boundary[source]){
      colors[i*4+3]=0;
    }else{
      const {cover}=meadowPatch(pos.getX(source),pos.getZ(source));
      colors[i*4+3]=Math.round(162+93*cover);
    }
  }
  geo.setAttribute('position',new T.Float32BufferAttribute(xyz,3));
  geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  geo.setAttribute('color',new T.Uint8BufferAttribute(colors,4,true));
  geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);
  const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({map:mapTexture,vertexColors:true,transparent:true,depthWrite:false,roughness:1}));
  mesh.name='草地近景纹理';mesh.receiveShadow=true;
  mesh.userData={basis:'ESA WorldCover 2021 grassland (class 30), 10 m',appearance:'Illustrative grass variation; vegetation height, species and individual blades are not surveyed.'};
  const mips=[tile];
  for(let side=tile.width/2;side>=16;side/=2){
    const level=canvas(side,side);level.getContext('2d').drawImage(mips.at(-1),0,0,side,side);mips.push(level);
  }
  // Rasterize the GLB's linearly interpolated vertex alpha once, so zooming
  // into the plan uses the same gradual edge as the terrain material.
  const feather=canvas(mask.width,mask.height),fc=feather.getContext('2d');
  const matte=fc.createImageData(mask.width,mask.height);
  for(let n=0;n<indices.length;n+=3){
    const a=indices[n],b=indices[n+1],c=indices[n+2];
    const ax=(xyz[a*3]-mask.l)*mask.sx,ay=(xyz[a*3+2]-mask.t)*mask.sz;
    const bx=(xyz[b*3]-mask.l)*mask.sx,by=(xyz[b*3+2]-mask.t)*mask.sz;
    const cx=(xyz[c*3]-mask.l)*mask.sx,cy=(xyz[c*3+2]-mask.t)*mask.sz;
    const det=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);
    if(!det)continue;
    const minX=Math.max(0,Math.ceil(Math.min(ax,bx,cx)-.5)),maxX=Math.min(mask.width-1,Math.floor(Math.max(ax,bx,cx)-.5));
    const minY=Math.max(0,Math.ceil(Math.min(ay,by,cy)-.5)),maxY=Math.min(mask.height-1,Math.floor(Math.max(ay,by,cy)-.5));
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
      const dx=x+.5-ax,dy=y+.5-ay,u=(dx*(cy-ay)-dy*(cx-ax))/det,v=((bx-ax)*dy-(by-ay)*dx)/det;
      if(u<0||v<0||u+v>1)continue;
      const alpha=(1-u-v)*colors[a*4+3]+u*colors[b*4+3]+v*colors[c*4+3];
      matte.data[(y*mask.width+x)*4+3]=alpha;
    }
  }
  fc.putImageData(matte,0,0);
  const patterns=new Map(),cell=bucketMetres,scratch=canvas(1,1),brush=scratch.getContext('2d');
  function drawPlan(ctx,view,ppm){
    if(ppm<2.5)return;
    let visible=false;
    for(let j=Math.floor(view[1]/cell)-1;j<=Math.floor(view[3]/cell)&&!visible;j++)for(let i=Math.floor(view[0]/cell)-1;i<=Math.floor(view[2]/cell);i++){
      if(buckets.has(key(i,j))){visible=true;break}
    }
    if(!visible)return;
    const dw=view[2]-view[0],dh=view[3]-view[1],scale=Math.abs(ctx.getTransform().a);
    const width=Math.max(1,Math.round(dw*scale)),height=Math.max(1,Math.round(dh*scale));
    if(scratch.width!==width||scratch.height!==height){scratch.width=width;scratch.height=height}
    brush.setTransform(width/dw,0,0,height/dh,-view[0]*width/dw,-view[1]*height/dh);
    brush.clearRect(view[0],view[1],dw,dh);
    brush.drawImage(feather,bounds[0],bounds[1],bounds[2]-bounds[0],bounds[3]-bounds[1]);
    const pixels=tileMetres*scale;
    const level=mips.findLast(m=>m.width>=pixels)||tile;
    let pat=patterns.get(level);
    if(!pat){pat=brush.createPattern(level,'repeat');pat.setTransform(new DOMMatrix().scale(tileMetres/level.width));patterns.set(level,pat)}
    brush.globalCompositeOperation='source-in';brush.fillStyle=pat;brush.fillRect(view[0],view[1],dw,dh);
    brush.globalCompositeOperation='source-over';
    ctx.drawImage(scratch,view[0],view[1],dw,dh);
  }
  async function shadePlan(initial,restoreBase){
    try{return await shadeInWorker(initial,mask,bounds)}
    catch{return shadeInSlices(initial.data.length?initial:restoreBase(),mask,bounds)}
  }
  return {mesh,clearGrass,bounds,drawPlan,shadePlan};
}
