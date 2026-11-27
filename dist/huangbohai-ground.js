import * as T from './vendor/three.module.js';
import {createTerrainSurface, groundPolygonDistance} from './terrain-surface.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {makeCampusRoads} from './huangbohai-roads.js';
import {drawLand,drawTrackTrees,makeLandMeshes,makeLandPlanDetail,makeRegionalTerrain,makeTrackTrees} from './huangbohai-land.js';

function makeRaisedKerb(apron,heightAt){
  const outer=apron.ring,inner=apron.holes[0],positions=[];
  const lift=apron.heightM,points=(ring,y)=>ring.map(([x,z])=>[x,heightAt(x,z)+y,z]);
  const outerTop=points(outer,lift),innerTop=points(inner,lift);
  const outerFoot=points(outer,.018),innerFoot=points(inner,.018);
  const face=(a,b,c,d)=>positions.push(...a,...b,...c,...a,...c,...d);
  for(let i=0;i<outer.length;i++){
    const j=(i+1)%outer.length;
    face(outerTop[i],outerTop[j],innerTop[j],innerTop[i]);
    face(outerFoot[i],outerFoot[j],outerTop[j],outerTop[i]);
    face(innerTop[i],innerTop[j],innerFoot[j],innerFoot[i]);
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.computeVertexNormals();
  const curb=new T.Mesh(geometry,new T.MeshStandardMaterial({side:T.DoubleSide,color:0xdad7c8,roughness:1}));
  curb.name='文化中心廊前绿岛缘石';
  curb.userData={relativeHeightM:lift,limits:'按近照估计缘石截面，沿实际模型地形贴地。'};
  curb.receiveShadow=true;
  return curb;
}

export function inside(point, ring) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, az] = ring[i], [bx, bz] = ring[j];
    if ((az > point[1]) !== (bz > point[1]) &&
        point[0] < (bx - ax) * (point[1] - az) / (bz - az) + ax) hit = !hit;
  }
  return hit;
}

export function extent(points) {
  return [Math.min(...points.map(p=>p[0])), Math.min(...points.map(p=>p[1])),
    Math.max(...points.map(p=>p[0])), Math.max(...points.map(p=>p[1]))];
}

function sampleGrid(dem) {
  const [w,n,e,s] = dem.boundsCellCentres;
  const values = dem.metres.flat(), width = dem.width, height = dem.height;
  return (x,z) => {
    const col = T.MathUtils.clamp((x-w)/(e-w)*(width-1),0,width-1);
    const row = T.MathUtils.clamp((z-n)/(s-n)*(height-1),0,height-1);
    const i = Math.min(width-2,Math.floor(col)), j = Math.min(height-2,Math.floor(row));
    const a = j*width+i;
    return T.MathUtils.lerp(T.MathUtils.lerp(values[a],values[a+1],col-i),
      T.MathUtils.lerp(values[a+width],values[a+width+1],col-i),row-j);
  };
}

export function drawRing(ctx, ring, close = true) {
  if (!ring?.length) return;
  ctx.moveTo(...ring[0]);
  for (const point of ring.slice(1)) ctx.lineTo(...point);
  if (close) ctx.closePath();
}

function makeRaster(ground, bounds, image, fullColour, hasAtlas, land, fieldSeason) {
  const [w,n,e,s] = bounds, factor = Math.min(2.5,2048/Math.max(e-w,s-n));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round((e-w)*factor);
  canvas.height = Math.round((s-n)*factor);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(canvas.width/(e-w),0,0,canvas.height/(s-n),-w*canvas.width/(e-w),-n*canvas.height/(s-n));
  ctx.fillStyle = '#bdc3a4';
  ctx.fillRect(w,n,e-w,s-n);
  if (image) {
    const [l,t,r,b] = ground.texture.bounds;
    ctx.save();
    if (!fullColour&&!hasAtlas) { ctx.filter = 'saturate(0.83) contrast(0.87) brightness(1.05)'; ctx.globalAlpha = .85; }
    ctx.drawImage(image,l,t,r-l,b-t);
    ctx.restore();
  }
  if(land)drawLand(ctx,land,fullColour,fieldSeason);
  ctx.lineCap = ctx.lineJoin = 'round';
  for (const road of ground.roadSurfaces ? [] : ground.roads || []) {
    const width = Number(road.width) || 4;
    ctx.beginPath(); drawRing(ctx,road.ring,false);
    ctx.lineWidth = width+1.6; ctx.strokeStyle = fullColour?'#b9b6a7':'#c8c7b3'; ctx.stroke();
    ctx.lineWidth = width; ctx.strokeStyle = fullColour?'#96958b':'#a29e8e'; ctx.stroke();
  }
  return canvas;
}

function edgesOfBoard(bounds, heightAt, bottom) {
  const corners = [[bounds[0],bounds[1]],[bounds[2],bounds[1]],[bounds[2],bounds[3]],[bounds[0],bounds[3]]];
  const positions = [];
  for (let edge=0;edge<4;edge++) {
    const a=corners[edge], b=corners[(edge+1)%4], steps=Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/9);
    for (let i=0;i<steps;i++) {
      const pts=[i,i+1].map(k=>[T.MathUtils.lerp(a[0],b[0],k/steps),T.MathUtils.lerp(a[1],b[1],k/steps)]);
      const [ca,cb]=pts.map(([x,z])=>[x,heightAt(x,z),z]);
      positions.push(...ca,...cb,cb[0],bottom,cb[2],...ca,cb[0],bottom,cb[2],ca[0],bottom,ca[2]);
    }
  }
  const geom = new T.BufferGeometry();
  geom.setAttribute('position',new T.Float32BufferAttribute(positions,3)); geom.computeVertexNormals();
  return new T.Mesh(geom,new T.MeshStandardMaterial({color:'#b4ab96',side:T.DoubleSide,roughness:1}));
}

function fittedGround(dem, model, sports, courts) {
  const sample=sampleGrid(dem), patches=[];
  function pad(ring,level) {
    patches.push({level,distance:groundPolygonDistance(ring,20)});
  }
  for (const building of model.buildings) {
    // The freestanding elevated walkway keeps its clearance above the ground.
    if (building.kind==='link'||!Number.isFinite(building.baseM)) continue;
    for (const polygon of building.polygons) pad(polygon.ring,building.baseM);
  }
  pad(sports.support.ring,sports.support.levelM);
  for(const support of courts?.supports||[])pad(support.ring,support.levelM);
  const groupLevel=model.supportLevelsM?.['teaching-west'];
  if(Number.isFinite(groupLevel))for(const ring of model.courtyardsXZ || [])pad(ring,groupLevel);
  return (x,z)=>{
    const baseline=sample(x,z);
    let nearest=Infinity, levelSum=0, weightSum=0;
    for(const patch of patches){
      const d=patch.distance(x,z);
      if(d>=18) continue;
      if(d===0) return patch.level;
      const weight=1/(d*d*d);
      levelSum+=patch.level*weight;weightSum+=weight;nearest=Math.min(nearest,d);
    }
    return weightSum?T.MathUtils.lerp(levelSum/weightSum,baseline,T.MathUtils.smoothstep(nearest,5,18)):baseline;
  };
}

function makeSportsDriveTerrain(bounds, fittedHeight, roads, buildings) {
  const base=createTerrainSurface(bounds,fittedHeight,3.7);
  const route=roads.find(road=>road.id==='hbh-gate-sports-drive');
  if(!route) return base;
  const [west,north,east,south]=bounds;
  const dx=(east-west)/base.columns,dz=(south-north)/base.rows;
  const [firstCol,firstRow,lastCol,lastRow]=[
    Math.floor((-146-west)/dx),Math.floor((-60-north)/dz),
    Math.ceil((-118-west)/dx),Math.ceil((94-north)/dz),
  ];
  const window=[west+firstCol*dx,north+firstRow*dz,west+lastCol*dx,north+lastRow*dz];

  // The dated image shows one continuous pavement here. Its approach levels are
  // model controls; the ground and drainage grades still require survey checks.
  const start=-54,end=89.71;
  const centerX=z=>{
    const i=route.ring.findIndex(([,pz])=>pz>=z);
    const [ax,az]=route.ring[i-1],[bx,bz]=route.ring[i];
    return T.MathUtils.lerp(ax,bx,(z-az)/(bz-az));
  };
  const near=base.heightAt(centerX(start),start),far=base.heightAt(centerX(end),end);
  const walls=buildings.filter(b=>b.code==='stand-2'||b.code==='stadium')
    .flatMap(b=>b.polygons.map(({ring})=>groundPolygonDistance(ring,10)));
  const half=route.width/2;
  const detail=createTerrainSurface(window,(x,z)=>{
    const y=base.heightAt(x,z);
    if(z<=start||z>=end) return y;
    const side=Math.abs(x-centerX(z));
    const across=1-T.MathUtils.smoothstep(side,half+.65,half+3.3);
    const along=T.MathUtils.smoothstep(z,start,-36)*(1-T.MathUtils.smoothstep(z,84,end));
    const margin=Math.min(...walls.map(distance=>distance(x,z)));
    const shoulder=T.MathUtils.smoothstep(margin,1,2.3);
    const roadY=T.MathUtils.lerp(near,far,(z-start)/(end-start));
    return T.MathUtils.lerp(y,roadY,across*along*shoulder);
  },dx/4);

  const {position,uv}=detail.geometry.attributes;
  for(let i=0;i<position.count;i++){
    uv.setXY(i,(position.getX(i)-west)/(east-west),(south-position.getZ(i))/(south-north));
  }
  // The detail window meets untouched base-cell edges, sharing their elevations.
  const keep=[],indices=base.geometry.index.array;
  for(let row=0;row<base.rows;row++){
    for(let col=0;col<base.columns;col++){
      if(row>=firstRow&&row<lastRow&&col>=firstCol&&col<lastCol) continue;
      const face=(row*base.columns+col)*6;
      for(let j=0;j<6;j++)keep.push(indices[face+j]);
    }
  }
  base.geometry.setIndex(keep);
  const geometry=mergeGeometries([base.geometry,detail.geometry]);
  const [x0,z0,x1,z1]=window;
  const heightAt=(x,z)=>x>=x0&&x<=x1&&z>=z0&&z<=z1?detail.heightAt(x,z):base.heightAt(x,z);
  return {geometry,heightAt};
}

export async function makeGround(ground, model, sports, courts) {
  const buildings=model.buildings,boundary=model.phase1BoundaryXZ;
  const roofPoints=buildings.flatMap(b=>b.polygons.flatMap(poly=>poly.ring));
  const frame=extent([...roofPoints,...boundary]);
  const limit=ground.bounds || ground.dem.boundsCellCentres;
  const bounds=ground.displayBounds||frame.map((v,i)=>i<2?Math.max(limit[i],Math.floor((v-56)/10)*10):Math.min(limit[i],Math.ceil((v+56)/10)*10));
  async function readImage(path) {
    if(!path)return null;
    const image=new Image();image.src=new URL(path,document.baseURI).href;
    try { await image.decode();return image; } catch { return null; }
  }
  const landUrl=new URL('./data/huangbohai-landcover.json',import.meta.url);
  const landReady=fetch(landUrl).then(response=>response.ok?response.json():null).catch(()=>null);
  const [image,atlas,land,fieldSeason]=await Promise.all([
    readImage(ground.texture?.url),readImage(ground.texture?.atlasUrl),landReady,
    landReady.then(land=>readImage(land?.fieldSeason?.texture))
  ]);
  const terrain=makeSportsDriveTerrain(bounds,fittedGround(ground.dem,model,sports,courts),ground.roads,buildings);
  const maps=[false,true].map(fullColour=>makeRaster(ground,bounds,fullColour?image:atlas||image,fullColour,Boolean(atlas),land,fieldSeason));
  const material=new T.MeshStandardMaterial({roughness:1,metalness:0});
  const textures=maps.map(canvas=>{
    const tex=new T.CanvasTexture(canvas); tex.colorSpace=T.SRGBColorSpace; tex.anisotropy=4; return tex;
  });
  material.map=textures[0];
  // Detailed meshes drape against the original triangle grid before its
  // rendering groups are assigned a surface finish.
  const landMeshes=land&&makeLandMeshes(land,terrain.geometry,bounds,material);
  const roads=makeCampusRoads(ground.roadSurfaces||[],terrain.geometry,bounds);
  const regional=makeRegionalTerrain(terrain.geometry,bounds,land?.polygons||[],material);
  const drawPlanDetail=makeLandPlanDetail([...(land?.polygons||[]),...(land?.gatePlanting?.patches||[])],bounds);
  const mesh=new T.Mesh(terrain.geometry,regional.materials); mesh.name='黄渤海校区地形';
  mesh.receiveShadow=true;
  terrain.geometry.computeBoundingBox();
  const bottom=terrain.geometry.boundingBox.min.y-5;
  const group=new T.Group(); group.add(mesh,edgesOfBoard(bounds,terrain.heightAt,bottom));
  if(landMeshes)group.add(landMeshes.group);
  const entrancePlanting=landMeshes?.group.getObjectByName(land?.gatePlanting?.name);
  const treeGroups=[land?.trackTrees,land?.forecourtTrees].filter(Boolean);
  for(const trees of treeGroups)group.add(makeTrackTrees(trees,terrain.heightAt));
  group.add(roads.group);
  for(const apron of ground.roadAprons||[]){
    if(apron.heightM>0&&apron.holes?.[0]?.length===apron.ring.length){
      group.add(makeRaisedKerb(apron,terrain.heightAt));
    }
  }
  const groundNotice=!land||(!atlas&&!image)||(land.fieldSeason&&!fieldSeason)?'部分地表资料未载入，刷新可重试。':'';
  return {group, maps, bounds, bottom, h:terrain.heightAt, imageryAvailable:Boolean(image),groundNotice,drawPlanDetail,
    drawRoadPlan(ctx){roads.drawPlan(ctx);for(const trees of treeGroups)drawTrackTrees(ctx,trees);},
    setSatellite(on) {
      if(entrancePlanting)entrancePlanting.visible=!on;
      material.map=textures[Number(on)];material.needsUpdate=true;
      regional.setMap(material.map,!on);
      landMeshes?.setMap(material.map,!on);
    }};
}
