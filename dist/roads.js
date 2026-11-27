import * as THREE from './vendor/three.module.js';
import {pavingTexture,pavingNormal,pavingMetres,pavingFill} from './paving-materials.js';
import {plazaIslandRing} from './plaza-grass.js';
import {buildRoadGeometry} from './road-geometry.js';
import {gateBrickPavingColor,gateBrickPavingRings} from './entrance.js';

// Lift in metres prevents depth fighting with the terrain in exported viewers.
// The edge is a schematic shoulder, not a surveyed kerb height.
const surfaces = {
  edge:      { name:'路肩与铺装边缘', color:'#cec8b7', lift:.035, tile:'grit' },
  arterial:  { name:'城市干道', color:'#798281', lift:.035, tile:'asphalt' },
  collector: { name:'城市支路', color:'#8b938e', lift:.035, tile:'asphalt' },
  local:     { name:'街巷', color:'#a1a69b', lift:.035, tile:'asphalt' },
  service:   { name:'服务道路', color:'#afafa0', lift:.035, tile:'asphalt' },
  constructionGround: { name:'施工裸土地面', color:'#b89c7e', lift:.035, tile:'grit' },
  yardTrack:  { name:'厚德餐厅北侧便道', color:'#bca68b', lift:.035, tile:'grit' },
  villageLane: { name:'邹于村内巷道', color:'#b9aa90', lift:.035, tile:'grit' },
  walk:      { name:'步行道', color:'#c9b99e', lift:.035, tile:'stone', angle:-.28 },
  estimatedWalk: { name:'宿舍步行示意', color:'#bc8f52', lift:.055 },
  libraryApron: { name:'图文楼南入口铺地', color:'#b98d77', lift:.035, tile:'brick', angle:-.28 },
  libraryPlant: { name:'图文楼南入口种植地表', color:'#81916a', lift:.018, tile:'grit' },
  brickWalk: { name:'东山坡道人行铺装', color:'#b88879', lift:.035, tile:'brick', angle:-.12 },
  forecourt: { name:'入口前场', color:'#c4bfb0', lift:.035, tile:'stone', angle:-.28 },
  parcelYard: { name:'东山快递驿站院坪', color:'#aaa591', lift:.035, tile:'asphalt' },
  gateBrickWalk: { name:'北门门房铺地', color:gateBrickPavingColor, lift:.035, tile:'brick' },
  gateApron: { name:'北门车行前场', color:'#999e98', lift:.035, tile:'asphalt' },
  walkCrossing: { name:'过路铺带', color:'#bab8ab', lift:.050, tile:'stone', angle:-.28 },
  pavingSeam: { name:'路面浅灰带', color:'#c4c1b3', lift:.050 },
  terraceEdge: { name:'弧形平台铺边', color:'#938d80', lift:.050 },
  marking:   { name:'路面标记', color:'#ede6ce', lift:.052 },
  markingYellow:{ name:'黄色分道线', color:'#d8b557', lift:.052 },
};
const planCache = new WeakMap();

function prepareRoadPlan(data) {
  const grid = new Map(), tileSize = 240;
  const planAreas = data.planAreas || [];
  for (const {style, ring, holes = []} of [...data.polygons, ...planAreas]) {
    const [x,z] = ring[0];
    const key = Math.floor(x / tileSize) + ',' + Math.floor(z / tileSize);
    if (!grid.has(key)) grid.set(key, {west: Infinity, north: Infinity, east: -Infinity, south: -Infinity, paths: new Map()});
    const tile = grid.get(key);
    if (!tile.paths.has(style)) tile.paths.set(style, new Path2D());
    const path = tile.paths.get(style);
    for (const [px,pz] of ring) {
      tile.west = Math.min(tile.west, px);
      tile.north = Math.min(tile.north, pz);
      tile.east = Math.max(tile.east, px);
      tile.south = Math.max(tile.south, pz);
    }
    for (const loop of [ring,...holes]) {
      path.moveTo(...loop[0]);
      for (let i=1; i<loop.length; i++) path.lineTo(...loop[i]);
      path.closePath();
    }
  }
  return {tiles: [...grid.values()], visible: null, paths: null};
}

export function drawRoadPlan(ctx, data, [west,north,east,south]) {
  if (!planCache.has(data)) planCache.set(data, prepareRoadPlan(data));
  const plan = planCache.get(data);
  const visible = plan.tiles.filter(tile => tile.east >= west && tile.west <= east && tile.south >= north && tile.north <= south);
  if (!plan.visible || plan.visible.length !== visible.length || visible.some((tile,i) => tile !== plan.visible[i])) {
    const paths = new Map();
    // Combine each style before filling, so shared edges and holes remain seamless.
    for (const tile of visible) {
      for (const [style,path] of tile.paths) {
        if (!paths.has(style)) paths.set(style,new Path2D());
        paths.get(style).addPath(path);
      }
    }
    plan.visible = visible;
    plan.paths = paths;
  }
  ctx.save();
  for (const [style,{tile,color,angle}] of Object.entries(surfaces)) {
    if (!plan.paths.has(style)) continue;
    ctx.fillStyle=tile?pavingFill(ctx,tile,color,angle):color;
    ctx.fill(plan.paths.get(style),'evenodd');
  }
  ctx.restore();
}

const geometryProfiles=Object.fromEntries(Object.entries(surfaces).map(([style,{lift,tile,angle=0}])=>
  [style,{lift,period:tile?pavingMetres(tile):0,angle}]));

function coordinates(attribute) {
  if(attribute.isBufferAttribute&&attribute.itemSize===3&&!attribute.normalized)return attribute.array;
  const values=new Float64Array(attribute.count*3);
  for(let i=0;i<attribute.count;i++){
    values[3*i]=attribute.getX(i);
    values[3*i+1]=attribute.getY(i);
    values[3*i+2]=attribute.getZ(i);
  }
  return values;
}

function roadGeometryInput(data,terrainGeometry,gate,median) {
  const gateApron=data.areas?.find(a=>a.id==='north-gate-vehicle-apron');
  let polygons=data.polygons;
  if(gateApron&&gate){
    const bricks=gateBrickPavingRings(gate);
    polygons=[
      ...polygons,
      {...gateApron,holes:[plazaIslandRing(gate),...bricks]},
      ...bricks.map(ring=>({style:'gateBrickWalk',ring}))
    ];
  }
  return {
    bounds:data.bounds,
    polygons:median?[...polygons,median.polygon]:polygons,
    profiles:median?{...geometryProfiles,plantedMedian:median.profile}:geometryProfiles,
    positions:coordinates(terrainGeometry.getAttribute('position')),
    normals:coordinates(terrainGeometry.getAttribute('normal')),
    indices:terrainGeometry.index.array
  };
}

function assembleRoadMesh(data,batches,median) {
  const group=new THREE.Group();
  group.name='道路与步道';
  group.userData={source:data.source, ...data.stats, roadNames:data.roadNames||[]};
  for (const {style,position,normal,index,uv,tangent} of batches) {
    const geometry=new THREE.BufferGeometry(),surface=surfaces[style];
    geometry.setAttribute('position',new THREE.BufferAttribute(position,3));
    geometry.setAttribute('normal',new THREE.BufferAttribute(normal,3));
    geometry.setIndex(new THREE.BufferAttribute(index,1));
    if(style==='plantedMedian'){
      geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
      group.add(median.createMesh(geometry));
      continue;
    }
    let map=null,normalMap=null;
    if(surface.tile){
      map=pavingTexture(surface.tile,surface.color);
      normalMap=pavingNormal(surface.tile);
      geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
      geometry.setAttribute('tangent',new THREE.BufferAttribute(tangent,4));
    }
    const material=new THREE.MeshStandardMaterial({
      color:map?0xffffff:surface.color,map,normalMap,roughness:1,polygonOffset:true,
      polygonOffsetFactor:-1,polygonOffsetUnits:surface.lift>.04?-2:-1,
    });
    const mesh=new THREE.Mesh(geometry,material);
    mesh.name=surface.name;
    mesh.userData={surfaceStyle:style,displayOffsetMetres:surface.lift};
    mesh.receiveShadow=true;
    group.add(mesh);
  }
  return group;
}

export function createRoadMesh(data,terrainGeometry,gate) {
  return assembleRoadMesh(data,buildRoadGeometry(roadGeometryInput(data,terrainGeometry,gate)));
}

function createRoadWorker() {
  return new Worker(new URL('./road-mesh-worker.js',import.meta.url),{type:'module'});
}

export function warmRoadMeshWorker() {
  let worker;
  try{worker=createRoadWorker()}catch{}
  function cancel(error) {
    error?.preventDefault();
    worker?.terminate();
    worker=undefined;
  }
  worker?.addEventListener('error',cancel);
  return {
    take(){
      const ready=worker;
      ready?.removeEventListener('error',cancel);
      worker=undefined;
      return ready;
    },
    cancel
  };
}

function buildInWorker(input,worker) {
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>finish(reject,new Error('Road mesh worker timed out')),15000);
    function finish(complete,value){
      clearTimeout(timer);
      worker.terminate();
      complete(value);
    }
    worker.onmessage=({data})=>finish(resolve,data);
    worker.onerror=event=>{
      event.preventDefault();
      finish(reject,event.error||new Error(event.message));
    };
    worker.onmessageerror=()=>finish(reject,new Error('Could not read road mesh buffers'));
    try{
      // Keep the live terrain available for picking, rendering and fallback.
      const positions=input.positions.slice(),normals=input.normals.slice(),indices=input.indices.slice();
      worker.postMessage({...input,positions,normals,indices},[positions.buffer,normals.buffer,indices.buffer]);
    }catch(error){finish(reject,error)}
  });
}

export async function prepareRoadMesh(data,terrainGeometry,gate,median,warmedWorker) {
  const input=roadGeometryInput(data,terrainGeometry,gate,median);
  let batches;
  try{
    const worker=warmedWorker?warmedWorker.take():createRoadWorker();
    if(worker)batches=await buildInWorker(input,worker);
  }catch{}
  return assembleRoadMesh(data,batches??buildRoadGeometry(input),median);
}
