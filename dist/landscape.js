import {terrainRelief} from './terrain-relief.js';
import {createTerrainSurface,groundPolygonDistance} from './terrain-surface.js';
import {villageHousePads} from './village-roofs.js';
import {createZouyuFieldEdge,zouyuNortheastCropGround} from './zouyu-field-edge.js';
import {createSouthQuarryCover} from './south-quarry-cover.js';
import {createWestHillGround,westHillBareGround} from './west-hill-ground.js';
import {createEastRidgeGround,eastRidgeWornGround} from './east-ridge-ground.js';
import {createTrackWestCover} from './track-west-cover.js';
import {athleticsSoutheastPaleGround} from './athletics-southeast-pale-ground.js';
import {northShoreGroundClass,northShoreEvidence} from './north-shoreline.js';
import {outerWestGroundClass} from './outer-west-revetment.js';
import {northwestRevetment,northwestRevetmentClass} from './northwest-revetment-shape.js';
import {westPierPaleSurface} from './west-pier-pale-surface.js';
import {dongshanNorthSlopeTrace} from './dongshan-north-slope-trace.js';
import {dongshanDormPlanting} from './dongshan-dorm-ground.js';
import {createGroundCoverPatch} from './ground-cover-patch.js';
import {villageBankGrade,bankSoil,paintBankSoil} from './village-bank.js';
import {createPlazaTerrace} from './plaza-terrace.js';
import {prepareWaterTerrain} from './water-terrain.js';
import {teachingFrontageGrade,xuefuParallelRoadGrade} from './teaching-frontage.js';
import {dongshanBoundaryRoadGrade} from './dongshan-road-grade.js';
import {teachingCourtIsland} from './teaching-court-island.js';
import {prepareRoadMesh} from './roads.js';
import {createGroundSurface} from './ground-materials.js';
import {fitGroundAtlas,paintGroundAtlas,polygonPath,prepareGroundAtlas} from './ground-atlas.js';
import {createCourtSurfaces} from './court-surfaces.js';
import {prepareCourtPlatform} from './court-platform.js';
import {createMeadow,createPlantedMedian,preloadMeadowColour} from './grass.js';
import {createGrassTufts,tuftStartScale} from './grass-tufts.js';
import {applyPlazaAtlas,createPlazaGrass,createPlazaKerb,loadPlazaGrass,preloadPlazaTurf,preservePlazaPlan} from './plaza-grass.js';
import {drawEntranceGround, entranceTreeSites, inEntranceGarden} from './entrance.js';
import {plazaTreeDetail} from './tree-detail.js';
import {woodlandCrown,woodlandMaterial} from './woodland-crown.js';
import {lowVegetationIndex,filterTreeSites} from './dongshan-vegetation.js';
import {northBankGrade} from './athletics-north-bank.js';
import {athleticsGround, athleticsEdgeDistance, createAthleticsOverlay, drawAthletics} from './sports.js';
import * as T from './vendor/three.module.js';
import {eighthDormWings} from './dongshan-eighth-dorm.js';
import {slopeDormWings} from './dongshan-slope-dorm.js';

export function inside(p, ring) {
  let result=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [x,z]=ring[i], [a,b]=ring[j];
    if((z>p[1])!==(b>p[1]) && p[0]<(a-x)*(p[1]-z)/(b-z)+x) result=!result;
  }
  return result;
}
export function sampler(d){
  return (x,z)=>{
    let u=T.MathUtils.clamp((x-d.min)/d.step,0,d.n-1.001),v=T.MathUtils.clamp((z-d.min)/d.step,0,d.n-1.001);
    const i=Math.floor(u),j=Math.floor(v),k=j*d.n+i;u-=i;v-=j;
    return (1-v)*((1-u)*d.values[k]+u*d.values[k+1])+v*((1-u)*d.values[k+d.n]+u*d.values[k+d.n+1]);
  };
}
function applyElevationPatch(grid, patch) {
  if (!patch) return grid;
  if (patch.version !== 1 || patch.min !== grid.min || patch.step !== grid.step || patch.n !== grid.n) {
    throw new Error('高程补丁与基础网格不一致');
  }
  const values = Float64Array.from(grid.values);
  for (const [start, changes] of patch.runs) {
    if (!Number.isInteger(start) || start < 0 || start + changes.length > values.length) {
      throw new Error('高程补丁超出基础网格');
    }
    changes.forEach((centimetres, offset) => { values[start + offset] += centimetres / 100; });
  }
  return {...grid, values};
}

function makeCanvas(width,height) {
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(width));
  canvas.height=Math.max(1,Math.round(height));
  return canvas;
}

async function loadRaster(url, priority='auto') {
  const image=new Image();
  image.fetchPriority=priority;
  image.src=url;
  await image.decode();
  return image;
}

export function preloadLandscapeDetails(){
  preloadPlazaTurf();
  preloadMeadowColour();
}

export function loadLandscapeImages() {
  async function optionalLayer(load) {
    try { return await load(); }
    catch {
      try { return await load(); }
      catch { return null; }
    }
  }
  return Promise.all([loadRaster('cover.png'),loadRaster('sentinel.jpg'),loadRaster('ground-tone.webp'),
    optionalLayer(()=>loadRaster('data/penglai-surface-cover.webp')),
    optionalLayer(async()=>{
      const response=await fetch('data/dongshan-low-vegetation.json');
      if(!response.ok)throw Error('东山植被数据 '+response.status);
      return response.json();
    })]);
}

function rasterMap(bounds, relief, cover, image, isLow) {
  const [l,t,r,b]=bounds, w=r-l, d=b-t;
  const rawCanvas=makeCanvas(cover.width,cover.height);
  const rawCtx=rawCanvas.getContext('2d',{willReadFrequently:true});rawCtx.drawImage(cover,0,0);
  const raw=rawCtx.getImageData(0,0,cover.width,cover.height).data;
  // Both public rasters cover the same 3.2 km square on a 10 m grid.
  const baseCls=(x,z)=>{
    const col=T.MathUtils.clamp(Math.floor((x+1600)/10),0,cover.width-1);
    const row=T.MathUtils.clamp(Math.floor((z+1600)/10),0,cover.height-1);
    return raw[4*(row*cover.width+col)];
  };
  const cls=(x,z)=>{
    const coast=outerWestGroundClass(x,z,northShoreGroundClass(x,z,baseCls(x,z)));
    const code=northwestRevetmentClass(x,z,coast);
    return code===10&&isLow(x,z)?20:code;
  };
  const satellite=makeCanvas(w/10,d/10);
  const satCtx=satellite.getContext('2d',{willReadFrequently:true});
  satCtx.drawImage(image,(l+1600)/10,(t+1600)/10,w/10,d/10,0,0,satellite.width,satellite.height);
  const sat=satCtx.getImageData(0,0,satellite.width,satellite.height).data;
  const small=makeCanvas(satellite.width,satellite.height);
  const sc=small.getContext('2d'), coverPixels=sc.createImageData(small.width,small.height);
  const warmthBias=[.8,.18,-.7];
  const palette={
    10:[137,159,126],20:[158,177,144],30:[185,197,159],40:[186,188,144],
    50:[201,197,184],60:[200,182,155],80:[132,174,178],90:[151,178,157]
  };
  for(let j=0;j<small.height;j++)for(let i=0;i<small.width;i++){
    const x=l+(i+.5)*w/small.width,z=t+(j+.5)*d/small.height,k=4*(j*small.width+i),type=cls(x,z);
    const base=palette[type]||[179,184,159];
    const {shade, warmth}=type===80?{shade:1,warmth:0}:relief(x,z);
    const lum=.2126*sat[k]+.7152*sat[k+1]+.0722*sat[k+2], mix=type===80?.46:.38;
    for(let ch=0;ch<3;ch++){
      const remote=15+lum+(sat[k+ch]-lum)*.70;
      coverPixels.data[k+ch]=shade*((1-mix)*base[ch]+mix*remote)+warmthBias[ch]*warmth;
    }
    coverPixels.data[k+3]=255;
  }
  sc.putImageData(coverPixels,0,0);
  return {small,satellite,cls,baseCls};
}

// The GLO-30 surface smooths over the stairs and excavated landings. Preserve
// its triangles away from the three photographed doors and blend each local
// landing back into the surrounding slope. All offsets are display estimates.
function diningAprons(buildings, heightAt, roadData) {
  const forms={
    cultureDining:{half:16,back:4,front:8.5,blend:16,threshold:.02},
    xianjingDining:{half:15,back:4,front:9.0,blend:17,threshold:.02},
    westArcade:{half:7.5,back:3.5,front:3.2,blend:11,threshold:.60}
  };
  return buildings.filter(b=>b.diningEntrance && forms[b.kind]).map(b=>{
    const [x,z]=b.diningApronCenter ?? b.diningEntrance;
    const normal=b.entranceNormal, len=Math.hypot(...normal);
    const nx=normal[0]/len, nz=normal[1]/len, form=forms[b.kind];
    const level=heightAt(...b.center)+form.threshold;
    const distance=(px,pz)=>{
      const dx=px-x,dz=pz-z, depth=dx*nx+dz*nz, along=Math.abs(-dx*nz+dz*nx);
      return Math.hypot(Math.max(0,along-form.half),Math.max(0,-depth-form.back,depth-form.front));
    };
    // Keep the Xianjing landing's broad terrain blend out of its through lane.
    // A fine face can reach beyond a guard, so protection starts 3.4 m away.
    const limit=7;
    const guardRange=Math.hypot(form.half,Math.max(form.front,form.back))+form.blend+limit;
    const guards=b.id==='B031'?(roadData?.polygons||[]).filter(({style,ring})=>
      style==='service' && !ring.every(([px])=>px<x-guardRange) &&
      !ring.every(([px])=>px>x+guardRange) && !ring.every(([,pz])=>pz<z-guardRange) &&
      !ring.every(([,pz])=>pz>z+guardRange)).map(({ring})=>groundPolygonDistance(ring,limit)):[];
    const roadWeight=guards.length?(px,pz)=>{
      let d=limit;
      for(const guard of guards)d=Math.min(d,guard(px,pz));
      return T.MathUtils.smoothstep(d,3.4,limit);
    }:null;
    return {...form,id:b.id,x,z,nx,nz,level,distance,roadWeight,center:b.center};
  });
}

function refineGround(terrain,bounds,pads,refinements) {
  const patchesToRefine=[...pads,...refinements];
  if(!patchesToRefine.length)return terrain;
  const {geometry:original,columns,rows}=terrain,[l,t,r,b]=bounds;
  const dx=(r-l)/columns,dz=(b-t)/rows;
  const defaultDivisions=6;
  // All patch subdivisions share this integer grid (currently 6 or 18).
  const fineDivisions=Math.max(defaultDivisions,...refinements.map(p=>p.subdivisions??defaultDivisions));
  const position=original.attributes.position, uv=original.attributes.uv;
  // The original vertex order remains intact for outer skirts and unchanged cells.
  const positions=Array.from(position.array), uvs=Array.from(uv.array), indices=[];
  const patches=new Map(), appended=new Map(), fineColumns=columns*fineDivisions;
  const planned=new Map(), affected=new Uint8Array(position.count);
  const margin=Math.hypot(dx,dz)*.51;
  // The diagonal margin covers every corner and fine vertex of the cell.
  // Any patch outside that margin can be skipped when grading those vertices.
  for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
    const cx=l+(i+.5)*dx,cz=t+(j+.5)*dz;
    let plan;
    for(let p=0;p<patchesToRefine.length;p++){
      const patch=patchesToRefine[p];
      if(patch.distance(cx,cz)<patch.blend+margin){
        plan??={pads:[],refinements:[],subdivisions:1};
        plan.subdivisions=Math.max(plan.subdivisions,patch.subdivisions??defaultDivisions);
        (p<pads.length?plan.pads:plan.refinements).push(patch);
      }
    }
    if(plan){
      planned.set(j*columns+i,plan);
      const a=j*(columns+1)+i, low=a+columns+1;
      affected[a]=affected[a+1]=affected[low]=affected[low+1]=1;
    }
  }
  function adjusted(x,z,baseline,localPads=pads,localRefinements=refinements){
    for(const pad of localPads){
      const distance=pad.distance(x,z);
      if(distance>=pad.blend)continue;
      // A narrow no-adjustment zone at the original centroid keeps the roof
      // elevation reference identical to that of the unmodified terrain.
      const centreDistance=Math.hypot(x-pad.center[0],z-pad.center[1]);
      const protect=T.MathUtils.smoothstep(centreDistance,2.8,5.5);
      const weight=(1-T.MathUtils.smoothstep(distance,0,pad.blend))*protect*(pad.roadWeight?.(x,z)??1);
      return baseline+(pad.level-baseline)*weight;
    }
    for(const patch of localRefinements)baseline=patch.adjust(x,z,baseline);
    return baseline;
  }
  for(let i=0;i<position.count;i++){
    if(!affected[i])continue;
    const x=position.getX(i),z=position.getZ(i);
    positions[i*3+1]=adjusted(x,z,position.getY(i));
  }
  function vertex(gx,gz,plan){
    if(gx%fineDivisions===0 && gz%fineDivisions===0) return (gz/fineDivisions)*(columns+1)+gx/fineDivisions;
    const k=gz*(fineColumns+1)+gx;
    if(appended.has(k))return appended.get(k);
    const x=l+gx*dx/fineDivisions,z=t+gz*dz/fineDivisions;
    const id=positions.length/3;
    positions.push(x,adjusted(x,z,terrain.heightAt(x,z),plan.pads,plan.refinements),z);
    uvs.push((x-l)/(r-l),(b-z)/(b-t));appended.set(k,id);return id;
  }
  for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
    const plan=planned.get(j*columns+i), subdivisions=plan?.subdivisions??1;
    if(subdivisions===1){
      const a=j*(columns+1)+i, low=a+columns+1;
      indices.push(a,low,a+1,low,low+1,a+1);
      continue;
    }
    // Pre-existing triangles and the refined grid share the same diagonals.
    // On the outer rim all inserted edge vertices interpolate the original
    // planar edge, so the interface meets without a vertical gap.
    const ids=[],offset=fineDivisions/subdivisions;
    for(let v=0;v<=subdivisions;v++)for(let u=0;u<=subdivisions;u++)ids.push(vertex(i*fineDivisions+u*offset,j*fineDivisions+v*offset,plan));
    patches.set(j*columns+i,{ids,subdivisions});
    for(let v=0;v<subdivisions;v++)for(let u=0;u<subdivisions;u++){
      const a=v*(subdivisions+1)+u,low=a+subdivisions+1;
      indices.push(ids[a],ids[low],ids[a+1],ids[low],ids[low+1],ids[a+1]);
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const pos=geometry.attributes.position, normal=geometry.attributes.normal;
  const startNormal=new T.Vector3(), endNormal=new T.Vector3(), interpolated=new T.Vector3();

  // Each hanging vertex lies on a longer neighbouring edge. Match the
  // normal interpolated by that coarse triangle so light crosses the seam.
  function matchCoarseEdge(ids,start,stride,subdivisions,neighbour,component){
    const coarse=patches.get(neighbour)?.subdivisions??1;
    const finePerCoarse=subdivisions/coarse;
    if(finePerCoarse<=1)return;
    for(let offset=0;offset<subdivisions;offset+=finePerCoarse){
      const a=ids[start+offset*stride], b=ids[start+(offset+finePerCoarse)*stride];
      const startPosition=pos.getComponent(a,component);
      const length=pos.getComponent(b,component)-startPosition;
      startNormal.fromBufferAttribute(normal,a);
      endNormal.fromBufferAttribute(normal,b);
      for(let k=1;k<finePerCoarse;k++){
        const vertex=ids[start+(offset+k)*stride];
        const t=(pos.getComponent(vertex,component)-startPosition)/length;
        interpolated.copy(startNormal).lerp(endNormal,t).normalize();
        normal.setXYZ(vertex,interpolated.x,interpolated.y,interpolated.z);
      }
    }
  }
  for(const [index,{ids,subdivisions}] of patches){
    const column=index%columns, row=Math.floor(index/columns);
    const side=subdivisions+1;
    if(column>0)matchCoarseEdge(ids,0,side,subdivisions,index-1,2);
    if(column<columns-1)matchCoarseEdge(ids,subdivisions,side,subdivisions,index+1,2);
    if(row>0)matchCoarseEdge(ids,0,1,subdivisions,index-columns,0);
    if(row<rows-1)matchCoarseEdge(ids,subdivisions*side,1,subdivisions,index+columns,0);
  }

  function heightAt(x,z){
    const u=T.MathUtils.clamp((x-l)/dx,0,columns),v=T.MathUtils.clamp((z-t)/dz,0,rows);
    const i=Math.min(Math.floor(u),columns-1),j=Math.min(Math.floor(v),rows-1);
    const patch=patches.get(j*columns+i);if(!patch)return terrain.heightAt(x,z);
    const {ids,subdivisions}=patch;
    const fineX=(u-i)*subdivisions, fineZ=(v-j)*subdivisions;
    const col=Math.min(Math.floor(fineX),subdivisions-1),row=Math.min(Math.floor(fineZ),subdivisions-1);
    const fx=fineX-col,fz=fineZ-row,a=row*(subdivisions+1)+col,low=a+subdivisions+1;
    if(fx+fz<=1)return (1-fx-fz)*pos.getY(ids[a])+fx*pos.getY(ids[a+1])+fz*pos.getY(ids[low]);
    return (fx+fz-1)*pos.getY(ids[low+1])+(1-fx)*pos.getY(ids[low])+(1-fz)*pos.getY(ids[a+1]);
  }
  return {geometry,heightAt,columns,rows};
}

function drawContours(c, terrain, bounds) {
  const {geometry}=terrain;
  const pos=geometry.attributes.position, triangles=geometry.index.array;
  const minor=new Path2D(), major=new Path2D();
  const contourTriangle=(ax,az,ay,bx,bz,by,cx,cz,cy)=>{
    const first=Math.max(5,Math.ceil(Math.min(ay,by,cy)/5)*5),last=Math.max(ay,by,cy);
    for(let level=first;level<=last;level+=5){
      const intersections=[];
      function cross(x0,z0,y0,x1,z1,y1){
        if((y0>level)===(y1>level))return;
        const f=(level-y0)/(y1-y0);intersections.push(x0+f*(x1-x0),z0+f*(z1-z0));
      }
      cross(ax,az,ay,bx,bz,by);cross(bx,bz,by,cx,cz,cy);cross(cx,cz,cy,ax,az,ay);
      if(intersections.length!==4)continue;
      const target=level%25===0?major:minor;
      target.moveTo(intersections[0],intersections[1]);target.lineTo(intersections[2],intersections[3]);
    }
  };
  for(let i=0;i<triangles.length;i+=3){
    const a=triangles[i],b=triangles[i+1],c1=triangles[i+2];
    contourTriangle(pos.getX(a),pos.getZ(a),pos.getY(a),pos.getX(b),pos.getZ(b),pos.getY(b),pos.getX(c1),pos.getZ(c1),pos.getY(c1));
  }
  c.lineWidth=.64;c.strokeStyle='rgba(76,88,68,.22)';c.stroke(minor);
  c.lineWidth=1.08;c.strokeStyle='rgba(70,83,65,.32)';c.stroke(major);
}

function drawRoads(c,roads) {
  const valid=roads.filter(rd=>rd.ring?.length>1 && rd.width>0);
  for(let pass=0;pass<2;pass++)for(const rd of valid){
    const foot=rd.kind==='pedestrian',wide=rd.width>12;
    polygonPath(c,rd.ring,false);
    c.lineWidth=rd.width+(pass===0 ? foot?1.3:2.9 : 0);
    c.strokeStyle=pass===0?'#d1cbb9':foot?'#c8bdab':wide?'#91958d':'#adae9e';
    c.stroke();
  }
  c.setLineDash([6,5]);c.strokeStyle='#dfdab8';c.lineWidth=.62;
  for(const rd of valid){if(rd.width>12){polygonPath(c,rd.ring,false);c.stroke()}}
  c.setLineDash([]);
}

function treeMask(buildings,water,roads,courts) {
  const cellWidth=50, cells=new Map();
  const key=(i,j)=>i+':'+j;
  function insert(box,item) {
    for(let j=Math.floor(box[1]/cellWidth);j<=Math.floor(box[3]/cellWidth);j++){
      for(let i=Math.floor(box[0]/cellWidth);i<=Math.floor(box[2]/cellWidth);i++){
        const k=key(i,j);
        if(!cells.has(k))cells.set(k,[]);
        cells.get(k).push(item);
      }
    }
  }
  function distance2(x,z,a,b){
    const dx=b[0]-a[0],dz=b[1]-a[1],u=T.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);
    return (x-a[0]-dx*u)**2+(z-a[1]-dz*u)**2;
  }
  for(const item of [...buildings,...water,...courts]){
    const ring=item.ring;
    if(!ring || ring.length<3)continue;
    const xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1]),pad=5.6;
    insert([Math.min(...xs)-pad,Math.min(...zs)-pad,Math.max(...xs)+pad,Math.max(...zs)+pad], {ring,pad});
  }
  for(const rd of roads){
    const pad=rd.width*.5+4.4;
    for(let i=1;i<rd.ring.length;i++){
      const a=rd.ring[i-1],b=rd.ring[i];
      insert([Math.min(a[0],b[0])-pad,Math.min(a[1],b[1])-pad,Math.max(a[0],b[0])+pad,Math.max(a[1],b[1])+pad],{a,b,pad});
    }
  }
  return (x,z)=>{
    for(const o of cells.get(key(Math.floor(x/cellWidth),Math.floor(z/cellWidth)))||[]){
      if(o.ring){
        if(inside([x,z],o.ring))return true;
        for(let i=0,j=o.ring.length-1;i<o.ring.length;j=i++){
          if(distance2(x,z,o.ring[j],o.ring[i])<o.pad*o.pad)return true;
        }
      }else if(distance2(x,z,o.a,o.b)<o.pad*o.pad)return true;
    }
    return false;
  };
}
function ridgeCanopyScale(x,z,profile){
  if(!profile)return 1;
  const {stations,coreOffsetMetres,maximumOffsetMetres,endFadeMetres,comparisonBaselineMetres,interpolationWeight}=profile;
  const first=stations[0],last=stations.at(-1);
  if(z<=first[1]||z>=last[1])return 1;
  const index=stations.findIndex(point=>z<point[1]);
  const [x0,z0,h0]=stations[index-1],[x1,z1,h1]=stations[index];
  const dz=z1-z0,dx=x1-x0,t=(z-z0)/dz;
  const trackX=T.MathUtils.lerp(x0,x1,t);
  const offset=Math.abs(x-trackX)*dz/Math.hypot(dx,dz);
  if(offset>=maximumOffsetMetres)return 1;
  const sideWeight=1-T.MathUtils.smoothstep(offset,coreOffsetMetres,maximumOffsetMetres);
  const endWeight=T.MathUtils.smoothstep(Math.min(z-first[1],last[1]-z),0,endFadeMetres);
  const observedScale=T.MathUtils.lerp(h0,h1,t)/comparisonBaselineMetres;
  return T.MathUtils.lerp(1,observedScale,interpolationWeight*sideWeight*endWeight);
}
function teachingForecourtGrade(profile, buildings = [], adjoiningPaving, protectedSurfaces = [], protectedPath) {
  if (!profile) return null;
  const {ringXZ, anchorXZ, levelMetres, slopeXZ, blendMetres} = profile;
  const distance = groundPolygonDistance(ringXZ, blendMetres + 10);
  const pavingTransition = profile.pavingTransitionMetres;
  const distanceToPaving = adjoiningPaving && pavingTransition
    ? groundPolygonDistance(adjoiningPaving, pavingTransition + 10) : null;
  const guards = buildings.filter(b => profile.protectedBuildingIds?.includes(b.id))
    .map(b => b.ring).concat(protectedSurfaces.filter(Boolean))
    .map(ring => groundPolygonDistance(ring, blendMetres));
  if (protectedPath) {
    for (let i=1; i<protectedPath.ring.length; i++) {
      const centerDistance=groundPolygonDistance(protectedPath.ring.slice(i-1,i+1),blendMetres);
      guards.push((x,z)=>Math.max(0,centerDistance(x,z)-protectedPath.width/2));
    }
  }
  return {
    distance, blend: blendMetres, subdivisions: profile.subdivisions,
    adjust(x, z, baseline) {
      const margin = distance(x, z);
      if (margin >= blendMetres) return baseline;
      const level = levelMetres + slopeXZ[0] * (x - anchorXZ[0]) + slopeXZ[1] * (z - anchorXZ[1]);
      const weight = 1 - T.MathUtils.smoothstep(margin, 0, blendMetres);
      if (!profile.allowFill) return T.MathUtils.lerp(baseline, Math.min(baseline, level), weight);
      let adjustment = T.MathUtils.clamp(level - baseline, -(profile.maximumCutMetres ?? Infinity),
        profile.maximumFillMetres ?? Infinity) * weight;
      if (profile.southFadeZ) adjustment *= 1 - T.MathUtils.smoothstep(z, ...profile.southFadeZ);
      if (distanceToPaving) {
        // Leave a full fine-grid cell beside the existing courtyard unchanged.
        // The entrance datum gradually loses influence toward that paving.
        adjustment *= T.MathUtils.clamp((distanceToPaving(x, z) - .8) / pavingTransition, 0, 1);
      }
      for (const guard of guards) {
        // Keep the existing wall feet and taper the terrace on the adjoining bank.
        const limit = 0.54 * Math.max(0, guard(x, z) - 1.6);
        adjustment = T.MathUtils.clamp(adjustment, -limit, limit);
      }
      return baseline + adjustment;
    }
  };
}

// The western laser pass constrains the roof. At the eastern end the coarse
// ground rises above it. Limit the trim and its gradient next to other uses.
function dormRoofClearance(profile, buildings, roads) {
  if (!profile) return null;
  const {ringXZ, ceilingMetres, blendMetres, buildingId} = profile;
  const distance = groundPolygonDistance(ringXZ, blendMetres + 10);
  const xs = ringXZ.map(([x]) => x), zs = ringXZ.map(([,z]) => z);
  const range = blendMetres + 10;
  const west = Math.min(...xs) - range, east = Math.max(...xs) + range;
  const north = Math.min(...zs) - range, south = Math.max(...zs) + range;
  const neighbours = [...(roads?.polygons || []), ...(roads?.areas || []), ...buildings.filter(b => b.id !== buildingId)];
  const guards = neighbours.filter(({ring}) => ring &&
    !ring.every(([x]) => x < west) && !ring.every(([x]) => x > east) &&
    !ring.every(([,z]) => z < north) && !ring.every(([,z]) => z > south)
  ).map(({ring}) => groundPolygonDistance(ring, 10));
  return {
    distance, blend: blendMetres, subdivisions: 18,
    adjust(x, z, baseline) {
      const offset = distance(x, z);
      if (offset >= blendMetres) return baseline;
      const cut = baseline - (ceilingMetres + .72 * offset);
      if (cut <= 0) return baseline;
      let clearance = 10;
      for (const guard of guards) clearance = Math.min(clearance, guard(x, z));
      const allowable = .64 * Math.min(blendMetres - offset, Math.max(0, clearance - 1.8));
      return baseline - Math.min(cut, allowable);
    }
  };
}

export function landscape(data,dem,region,roadData,waterLevels,quarryElevation,basketballProfile,ridgeCanopy,coastalElevation,westQuarryElevation,[cover,satelliteImage,groundTone,surfaceCover,lowVegetation],roadWorker,useGroundAtlasWorker){
  const bounds=region?.bounds||data.bounds,[l,t,r,b]=bounds,w=r-l,d=b-t;
  const water=region?.water?.length?region.water:(data.areas||[]).filter(a=>a.kind==='water');
  const unconfirmedWater=new Set(data.unconfirmedWaterWays||[]);
  const {surfaces:confirmedWater,patches:waterPatches}=prepareWaterTerrain(water.filter(a=>!unconfirmedWater.has(a.id)),waterLevels,bounds);
  const observedWater=confirmedWater.filter(a=>a.surfaceId);
  const grid=[quarryElevation,coastalElevation,westQuarryElevation].reduce(applyElevationPatch,region?.dem||dem);
  // Limit the full mesh to 16-bit indices while preserving the 8 m campus view
  // when a surrounding region is absent. The source DSM is coarser than this.
  const spacing=region?Math.max(10,Math.ceil(Math.sqrt(w*d/62000))):8;
  const original=createTerrainSurface(bounds,athleticsGround(sampler(grid),data.pitch),spacing);
  const pads=diningAprons(data.buildings,original.heightAt,roadData);
  const terrace=createPlazaTerrace(data.gate,original.heightAt);
  const basketball=prepareCourtPlatform(data.courts||[],basketballProfile,[
    ...data.buildings,...(region?.buildings||[]),...(roadData?.polygons||[]),...(roadData?.areas||[])
  ]);
  const forecourt=teachingForecourtGrade(data.teaching10Grade);
  const parcelSite=data.landmarks.find(place=>place.id==='parcel-east')?.model;
  const parcelGrade=teachingForecourtGrade(parcelSite?.grade);
  const parcelPaving=parcelSite?.paving||[];
  // Keep the verified path polygons and surface styles in the existing road mesh.
  const modelRoads=parcelPaving.length?{
    ...roadData,polygons:[...roadData.polygons,...parcelPaving],areas:[...roadData.areas,...parcelPaving],
  }:roadData;
  const financeCourt=teachingForecourtGrade(data.financeCourt,data.buildings);
  const westApron=data.buildings.find(building=>building.westApronGrade)?.westApronGrade;
  const pocketPaving=roadData?.areas.find(area=>area.id==='east-pocket-square-paving')?.ring;
  const coveredWalk=roadData?.areas.find(area=>area.id==='east-finance-covered-walk')?.ring;
  const courtApproach=roadData?.segments.find(segment=>segment.id==='east-finance-court-access');
  const financeWest=teachingForecourtGrade(westApron,data.buildings,null,
    [data.financeCourt?.ringXZ,pocketPaving,coveredWalk],courtApproach);
  const passageGrade=data.buildings.find(building=>building.passage?.grade)?.passage.grade;
  const financePassage=teachingForecourtGrade(passageGrade,data.buildings,data.financeCourt?.pavingRingXZ);
  const dormTrim=dormRoofClearance(data.dormRoofClearance,data.buildings,roadData);
  const eighth=data.buildings.find(building=>building.dorm8Roof);
  const dormTerraces=eighth?eighthDormWings(eighth).map(({ring,level})=>dormRoofClearance({
    buildingId:eighth.id,ringXZ:ring,blendMetres:12,ceilingMetres:eighth.modelBaseMetres+level+1.2
  },data.buildings,roadData)):[];
  for(const building of data.buildings.filter(b=>b.slopeDorm)){
    for(const {wing,ring} of slopeDormWings(building)){
      dormTerraces.push(dormRoofClearance({buildingId:building.id,ringXZ:ring,blendMetres:12,
        ceilingMetres:building.modelBaseMetres+wing.groundLimit},data.buildings,roadData));
    }
  }
  for (const building of data.buildings.filter(item => item.roofGroundClearance)) {
    const {profileRingXZ, ceilingMetres, blendMetres} = building.roofGroundClearance;
    dormTerraces.push(dormRoofClearance({
      buildingId: building.id, ringXZ: profileRingXZ, ceilingMetres, blendMetres
    }, data.buildings, roadData));
  }
  // Neighbouring wing aprons share one cut limit at their junction.
  const dormGrade=dormTerraces.length?{
    blend:12,subdivisions:18,
    distance:(x,z)=>Math.min(...dormTerraces.map(p=>p.distance(x,z))),
    adjust:(x,z,height)=>Math.min(...dormTerraces.map(p=>p.adjust(x,z,height)))
  }:null;
  const lowerDrive=teachingFrontageGrade(roadData,data.buildings);
  const parallelDrive=xuefuParallelRoadGrade(roadData);
  const boundaryDrive=dongshanBoundaryRoadGrade(roadData,[...data.buildings,...(region?.buildings||[])]);
  const northBank=data.dongshanNorthBankGrade;
  const northBankGradePatch=teachingForecourtGrade(northBank,data.buildings,null,northBank?.opticalPathGuardsXZ);

  const housePads=villageHousePads(region?.buildings||[],original.heightAt);
  const bank=villageBankGrade(original.heightAt);
  const refinements=[bank,...housePads,...waterPatches,terrace,basketball?.patch,forecourt,parcelGrade,lowerDrive,parallelDrive,boundaryDrive,northBankGradePatch,financeWest,financeCourt,financePassage,dormTrim,dormGrade,
    data.pitch&&northBankGrade(data.pitch,original.heightAt(data.pitch.x,data.pitch.z),roadData)
  ].filter(Boolean);
  const terrain=refineGround(original,bounds,pads,refinements);
  const roadMesh=roadData?new T.Group():null;
  const median=roadData?createPlantedMedian(data.dormPlantedMedian):null;
  const roadsReady=roadMesh?prepareRoadMesh(modelRoads,terrain.geometry,data.gate,median,roadWorker).then(roads=>{
    roadMesh.name=roads.name;
    roadMesh.userData=roads.userData;
    for(const mesh of [...roads.children])roadMesh.add(mesh);
    return roadMesh;
  }):Promise.resolve(null);
  const surfaceData=basketball
    ? {...data,courts:data.courts.map(court=>court.id===basketball.court.id?basketball.court:court)}
    : data;
  const h=terrain.heightAt;
  const relief=terrainRelief(h,data.bounds);
  const isLow=lowVegetationIndex(lowVegetation);
  const {small,satellite,cls,baseCls}=rasterMap(bounds,relief,cover,satelliteImage,isLow);
  const px=3072/Math.max(w,d),map=makeCanvas(w*px,d*px),c=map.getContext('2d',{willReadFrequently:true});
  const woods=region?.land||[];
  const workerAtlas=useGroundAtlasWorker
    ?prepareGroundAtlas(map.width,map.height,bounds,small,woods,groundTone,surfaceCover):null;
  function paintBase(raster){
    paintGroundAtlas(raster,bounds,small,woods,groundTone,surfaceCover);
    return raster.getImageData(0,0,map.width,map.height);
  }
  let terrainBase=workerAtlas?null:paintBase(c);
  function restoreTerrainBase(){
    return paintBase(makeCanvas(map.width,map.height).getContext('2d',{willReadFrequently:true}));
  }
  const plantingRegion=observedWater.length?{...region,water:[...(region?.water||[]),...observedWater]}:region;
  const grassCover=(x,z)=>(westHillBareGround(x,z)||eastRidgeWornGround(x,z)||zouyuNortheastCropGround(x,z))?60:cls(x,z);
  const meadow=createMeadow(bounds,grassCover,surfaceData,plantingRegion,modelRoads,terrain.geometry,pads);
  const path=(ring,closed)=>polygonPath(c,ring,closed);
  const teachingCourt=roadData?.areas.find(area=>area.id==='g018-courtyard-paving');
  const courtIsland=teachingCourtIsland(teachingCourt,h);
  const roads=roadData?.segments||region?.roads||data.roads;
  let seed=3791;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  const field=data.pitch;
  const courts=createCourtSurfaces(surfaceData,terrain.geometry,roadData,basketball);
  const gateApron=roadData?.areas.find(area=>area.id==='north-gate-vehicle-apron');
  function drawGatePlan(){
    c.save();c.lineJoin=c.lineCap='round';
    drawEntranceGround(c,data,!roadData,gateApron);
    c.restore();
  }
  let repaintPlaza,plazaReady=false;
  function paintMapDetails(preserveForRetry=false){
    paintBankSoil(c);
    c.save();c.lineJoin=c.lineCap='round';
    for(const island of teachingCourt?.holes||[]){
      path(island,true);c.fillStyle='#8da36a';c.fill();
    }
    drawContours(c,terrain,bounds);
    for(const a of confirmedWater){
      path(a.ring,true);c.fillStyle='#88adab';c.fill();c.lineWidth=1.0;c.strokeStyle='#759997';c.stroke();
    }
    for(const a of data.areas){
      if(!a.kind.includes('boundary'))continue;
      path(a.ring,true);c.strokeStyle='#81927399';c.setLineDash([4,5]);c.lineWidth=1.15;c.stroke();c.setLineDash([]);
    }
    if(!roadData)drawRoads(c,roads);
    for(const a of data.buildings){path(a.ring,true);c.fillStyle='#a89f893b';c.fill();c.strokeStyle='#d6cdb4';c.lineWidth=3;c.stroke()}
    drawAthletics(c,field);
    courts.drawPlan(c);
    repaintPlaza=preserveForRetry&&data.gate&&!plazaReady?preservePlazaPlan(c,data.gate,gateApron,drawGatePlan):null;
    drawGatePlan();
    c.restore();
  }
  const atlasReady=workerAtlas?.then(pixels=>{
    if(pixels){
      terrainBase=pixels;
      c.putImageData(pixels,0,0);
      fitGroundAtlas(c,bounds);
    }else{
      terrainBase=paintBase(c);
    }
    paintMapDetails();
  });
  if(!atlasReady)paintMapDetails();
  const root=new T.Group();root.name='蓬莱校园';const tex=new T.CanvasTexture(map);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;tex.userData.mimeType='image/jpeg';
  const grd=terrain.geometry;
  if(courtIsland)root.add(courtIsland.group);
  const plazaGrass=createPlazaGrass(data,grd);
  if(plazaGrass)root.add(plazaGrass);
  const plazaKerb=createPlazaKerb(data.gate,h);
  if(plazaKerb)root.add(plazaKerb);
  if(meadow.mesh)root.add(meadow.mesh);
  const zouyuFieldEdge=createZouyuFieldEdge(grd,bounds);
  const westHillGround=createWestHillGround(grd,bounds);
  const southQuarryCover=createSouthQuarryCover(grd,bounds);
  const trackWestCover=createTrackWestCover(grd,bounds);
  const athleticsSoutheast=createGroundCoverPatch(grd,bounds,athleticsSoutheastPaleGround);
  const eastRidgeGround=createEastRidgeGround(grd,bounds);
  const coastalRevetment=createGroundCoverPatch(grd,bounds,northwestRevetment);
  const oldPierGround=createGroundCoverPatch(grd,bounds,westPierPaleSurface);
  const dongshanTrace=createGroundCoverPatch(grd,bounds,dongshanNorthSlopeTrace);
  const dormPlanting=createGroundCoverPatch(grd,bounds,dongshanDormPlanting);
  root.add(zouyuFieldEdge.group,westHillGround.group,southQuarryCover.group,trackWestCover.group,athleticsSoutheast.group,eastRidgeGround.group,coastalRevetment.group,oldPierGround.group,dongshanTrace.group,dormPlanting.group);
  const tuftRoot=new T.Group();tuftRoot.name='立体草簇';tuftRoot.visible=false;root.add(tuftRoot);
  let tufts,tuftRequest,tuftFailed=false;
  function prepareTufts(onUpdate){
    tuftRequest??=createGrassTufts(data.gate,meadow,h,tuftRoot).then(detail=>{
      tufts=detail;
      onUpdate();
    }).catch(error=>{tuftRequest=undefined;tuftFailed=true;throw error});
    return tuftRequest;
  }
  const trackOverlay=createAthleticsOverlay(field);if(trackOverlay)root.add(trackOverlay);
  if(courts.mesh)root.add(courts.mesh);
  const bankFinish=(x,z)=>bankSoil(x,z)>.42?60:cls(x,z);
  const ground=createGroundSurface(grd,tex,bankFinish,confirmedWater);
  root.add(ground.waterLayer);
  const surface=ground.mesh;
  surface.userData.northShoreObservation=northShoreEvidence;
  if(boundaryDrive)surface.userData.dongshanBoundaryGradeSource='data/dongshan-boundary-road.json';
  if(coastalElevation)surface.userData.westCoastalElevationSource='data/west-coastal-flat-elevation.json';
  if(westQuarryElevation)surface.userData.westQuarryApronElevationSource='data/west-quarry-apron-elevation.json';
  if(forecourt)surface.userData.teaching10ForecourtSource='data/named-building-models.json';
  if(parcelGrade)surface.userData.eastParcelCourtyardGrade='Locally level across the two rows per the university photo; absolute elevation and longitudinal drainage slope are model estimates.';
  if(lowerDrive)surface.userData.teaching10DriveSource='data/campus-road-details.json';
  if(financeCourt)surface.userData.financeCourtSource='data/named-building-models.json';
  if(financePassage)surface.userData.financePassageSource='data/finance-bridge.json';
  surface.userData.entranceLandings=pads.map(p=>({building:p.id,groundLevel:p.level,extentMetres:[p.half*2,p.back+p.front],transitionMetres:p.blend,method:'Local approximation from photographed landings; no surveyed spot heights.'}));root.add(surface);
  if(roadMesh)root.add(roadMesh);
  const edge=[];const floor=-7;for(const [a,bb] of [[[l,t],[r,t]],[[r,t],[r,b]],[[r,b],[l,b]],[[l,b],[l,t]]]){const steps=a[0]===bb[0]?terrain.rows:terrain.columns;for(let i=0;i<steps;i++){const p=[0,1].map(j=>[a[0]+(bb[0]-a[0])*(i+j)/steps,a[1]+(bb[1]-a[1])*(i+j)/steps]);const [[x,z],[u,v]]=p;edge.push(x,floor,z,u,floor,v,x,h(x,z),z,x,h(x,z),z,u,floor,v,u,h(u,v),v)}}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(edge,3));geo.computeVertexNormals();root.add(new T.Mesh(geo,new T.MeshStandardMaterial({color:'#b8b594',side:T.DoubleSide})));
  // Place individual trees as symbols within the mapped 2021 tree-cover class.
  const pavedAreas=roadData?.areas||[];
  const canopyFootprints=pavedAreas.filter(area=>area.preserveNearbyCanopy);
  const regionalBuildings=region?.buildings||[];
  const existingBuildings=regionalBuildings.filter(building=>!building.villageRoof?.keepTerrain);
  const observedRoofs=regionalBuildings.filter(building=>building.villageRoof?.keepTerrain);
  const terrainPaving=pavedAreas.filter(area=>!area.preserveNearbyCanopy);
  const blocked=treeMask([...data.buildings,...existingBuildings],[...water,...observedWater],roads,[...surfaceData.courts,...terrainPaving]);
  let sites=entranceTreeSites(data).filter(p=>!blocked(p.x,p.z));
  const gardenCount=sites.length;
  const [cl,ct,cr,cb]=data.bounds;
  // Keep the foreground tree density while using a sparser stand farther from
  // campus. Each instance is a symbol within the observed tree-cover class.
  for(let z=t+8;z<b-8;z+=16)for(let x=l+8;x<r-8;x+=16){
    const a=x+(rand()-.5)*12,bb=z+(rand()-.5)*12;
    const out=a<cl||a>cr||bb<ct||bb>cb;
    if(baseCls(a,bb)!==10||rand()<(out?.53:.20)||blocked(a,bb))continue;
    if(athleticsEdgeDistance(field,a,bb,true)<3||inEntranceGarden(data,a,bb)||pads.some(p=>p.distance(a,bb)<1.5))continue;
    sites.push({x:a,z:bb,kind:'forest'});
  }
  filterTreeSites(sites,isLow,rand);
  // Clear observed footprints after sampling so nearby trees keep their appearance.
  const blockedByObservedRoof=treeMask(observedRoofs,[],[],parcelPaving);
  sites=sites.filter(site=>site.kind!=='forest'||!(
    westHillBareGround(site.x,site.z)||eastRidgeWornGround(site.x,site.z)||
    zouyuNortheastCropGround(site.x,site.z)||blockedByObservedRoof(site.x,site.z)||
    canopyFootprints.some(area=>inside([site.x,site.z],area.ring)&&
      !(area.holes||[]).some(hole=>inside([site.x,site.z],hole)))
  ));
  const trees=new T.Group();trees.name='林地示意';root.add(trees);const trunk=new T.InstancedMesh(new T.CylinderGeometry(.43,.62,1,5,1,true),new T.MeshStandardMaterial({color:'#7e775b'}),sites.length);
  const canopy=new T.InstancedMesh(woodlandCrown(),woodlandMaterial(),sites.length);const dummy=new T.Object3D(),color=new T.Color();
  if(ridgeCanopy)Object.assign(trees.userData,{canopyProfile:'data/east-ridge-canopy.json',
    acquisition:ridgeCanopy.acquisition,source:ridgeCanopy.productDOI,
    track:ridgeCanopy.track,beam:ridgeCanopy.beam,maximumTrackOffsetMetres:ridgeCanopy.maximumOffsetMetres});
  const forestCount=sites.length-gardenCount;
  sites.forEach((site,i)=>{
    // Keep the published random sequence. Place the plaza proxies at the end
    // of each GPU buffer so switching to detailed trees only changes a count.
    const slot=i<gardenCount?forestCount+i:i-gardenCount;
    const {x,z}=site,y=h(x,z),size=site.sampledSize;
    const radius=site.radius??size*.8;
    const height=site.height??size*2.5*(site.kind==='forest'?ridgeCanopyScale(x,z,ridgeCanopy):1);
    const lower=site.kind==='cypress'?.07:.28;
    const crownY=height*(1-lower)/2;
    dummy.position.set(x,y+height*.28,z);dummy.scale.set(.8,height*.58,.8);
    dummy.rotation.set(0,0,0);dummy.updateMatrix();trunk.setMatrixAt(slot,dummy.matrix);
    dummy.position.y=y+height-crownY;dummy.scale.set(radius,crownY,radius);
    dummy.rotation.y=site.crownAngle;dummy.updateMatrix();canopy.setMatrixAt(slot,dummy.matrix);
    color.set(site.kind==='cypress'?'#53725b':['#749674','#89a37c','#829b6c','#97a978','#668b70'][site.paletteIndex]);
    canopy.setColorAt(slot,color);site.mapRadius=radius;
  });
  canopy.castShadow=true;canopy.receiveShadow=true;trees.add(trunk,canopy);
  const garden=plazaTreeDetail(sites.slice(0,gardenCount),h);trees.add(garden.root);
  const satTex=new T.CanvasTexture(satellite);satTex.colorSpace=T.SRGBColorSpace;satTex.anisotropy=8;satTex.userData.mimeType='image/jpeg';
  const satelliteMaterial=new T.MeshStandardMaterial({map:satTex,roughness:1});
  const overlays=[ground.waterLayer,roadMesh,trackOverlay,courts.mesh,plazaGrass,plazaKerb,meadow.mesh,
    zouyuFieldEdge.group,westHillGround.group,southQuarryCover.group,trackWestCover.group,athleticsSoutheast.group,eastRidgeGround.group,coastalRevetment.group,oldPierGround.group,dongshanTrace.group,dormPlanting.group,courtIsland?.group].filter(Boolean);
  let grainRequest,plazaRequest,colorRequest;
  const result={root,roadsReady,atlasReady,trees,forest:{trunk,canopy,forestCount},treeSites:sites,gardenMaterials:garden.materials,map,h,gateApron,terrace,bounds:[...bounds],satellite:false,drawGroundDetail:ground.drawPlan,drawCourts:courts.drawPlan,
    drawGrassDetail(ctx,view,scale){
      meadow.drawPlan(ctx,view,scale);
      zouyuFieldEdge.drawPlan(ctx,view);
      westHillGround.drawPlan(ctx,view);
      southQuarryCover.drawPlan(ctx,view);
      trackWestCover.drawPlan(ctx,view);
      athleticsSoutheast.drawPlan(ctx,view);
      eastRidgeGround.drawPlan(ctx,view);
      coastalRevetment.drawPlan(ctx,view);
      oldPierGround.drawPlan(ctx,view);
      dongshanTrace.drawPlan(ctx,view);
      dormPlanting.drawPlan(ctx,view);
      median?.drawPlan(ctx);
    },
    drawCourtIsland:ctx=>courtIsland?.drawPlan(ctx),
    groundNotice:surfaceCover&&lowVegetation?'':'部分地表细节未载入，刷新可重试。',
    loadDetails(onUpdate=()=>{}){
      // Let either independent surface settle while the other is still loading.
      grainRequest??=loadRaster('ground-grain.webp','low').then(image=>{
        ground.setGrain(image);
        onUpdate();
      }).catch(error=>{grainRequest=undefined;throw error});
      if(plazaGrass)plazaRequest??=loadPlazaGrass().then(atlas=>{
        applyPlazaAtlas(plazaGrass,atlas);
        plazaReady=true;
        if(repaintPlaza){
          repaintPlaza();repaintPlaza=null;
          tex.needsUpdate=true;
        }
        onUpdate();
      }).catch(error=>{plazaRequest=undefined;throw error});
      // The base atlas is large. Join the turf and meadow paint before its
      // GPU upload, even though their smaller layers can finish independently.
      colorRequest??=Promise.all([
        meadow.shadePlan(terrainBase||restoreTerrainBase(),restoreTerrainBase),plazaRequest?.catch(()=>{})
      ]).then(([image])=>{
        terrainBase=null;
        c.putImageData(image,0,0);
        paintMapDetails(true);
        tex.needsUpdate=true;
        onUpdate();
      }).catch(error=>{terrainBase=null;colorRequest=undefined;throw error});
      return Promise.all([grainRequest,plazaRequest,colorRequest]);
    },
    updateVegetationDetail(pixelsPerMetre,camera,paper=false,onUpdate=()=>{}){
      const detailed=garden.update(pixelsPerMetre,camera,onUpdate);
      trunk.count=canopy.count=detailed?forestCount:sites.length;
      const grassScale=paper?0:pixelsPerMetre;
      if(tufts)tufts.update(grassScale,result.satellite,camera);
      else if(!tuftRequest&&!tuftFailed&&!result.satellite&&grassScale>tuftStartScale){
        prepareTufts(onUpdate).catch(error=>console.warn('Grass detail could not be prepared',error));
      }
    },
    setSatellite(on){
      result.satellite=on;
      for(const layer of overlays)layer.visible=!on;
      if(on)tuftRoot.visible=false;
      surface.material=on?satelliteMaterial:ground.materials;result.map=on?satellite:map;
    },
    async exportSnapshot(onUpdate=()=>{}){
      await Promise.all([roadsReady,result.loadDetails(onUpdate),prepareTufts(onUpdate)]);
      garden.ensure();
      const snapshot=root.clone(true);
      for(const layer of [trees,...overlays])snapshot.getObjectByName(layer.name).visible=true;
      const [forestTrunks,forestCrowns]=snapshot.getObjectByName(trees.name).children;
      forestTrunks.count=forestCrowns.count=forestCount;garden.prepareExport(snapshot);
      // The exporter reads the entire color attribute, even for a reduced
      // instance count. Keep all GPU-instancing accessors the same length.
      if(gardenCount&&forestCrowns.instanceColor){
        forestCrowns.instanceColor=new T.InstancedBufferAttribute(forestCrowns.instanceColor.array.slice(0,forestCount*3),3);
      }
      forestTrunks.visible=forestCrowns.visible=Boolean(forestCount);
      tufts.prepareExport(snapshot);
      snapshot.getObjectByName(surface.name).material=ground.materials;
      const runningPaint=snapshot.getObjectByName('环道与短跑道白线');
      if(runningPaint)runningPaint.geometry=runningPaint.geometry.clone().deleteAttribute('strokeOffset');
      return snapshot;
    }
  };
  return result;
}

