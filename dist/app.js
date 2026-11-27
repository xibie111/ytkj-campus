import {captureDetailHeight, focusDetail, hideDetail, mapIcon as icon, menu, restoreDetailFocus, restorePlaceFromHistory, setupDirectory, showDetail} from './campus-ui.js';
import {buildingDescriptions,placeDescriptions} from './building-descriptions.js';
import {buildingNames,buildingLocations,buildingLabelPoint,mapNames,preferredBuildingSearch} from './building-names.js';
import {createStudioModel} from './studio-model.js';
import {createEntrance,drawEntranceGround,toWorld} from './entrance.js';
import {drawRoadPlan,warmRoadMeshWorker} from './roads.js';
import {createRoadIndex,drawRoadLabels} from './road-labels.js';
import {indexedRoads,roadSpot} from './wayfinding.js';
import {bindPlanGestures} from './plan-gestures.js';
import {createRouteMotion} from './route-motion.js';
import {bindMapScale, createMapTransition, finishMapLoad, setMapNotice, showLoadError} from './map-motion.js';
import {motionTiming} from './motion-timing.js';
import {bindExhibitMotion} from './exhibit-motion.js';
import {createRenderBudget} from './render-budget.js';
import {createTreePlan} from './tree-plan.js';
import {athleticsHalfExtent,athleticsPlanBounds,createGrandstand,drawAthletics,drawAthleticsPlanMarks} from './sports.js';
import * as T from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {createCampusBuildings} from './architecture.js';
import {createEastParcelBuildings} from './east-parcel-buildings.js';
import {landscape,inside,loadLandscapeImages,preloadLandscapeDetails} from './landscape.js';
import {createNeighbourhood,footprintOutline} from './neighbourhood.js';

const hillViews={
  'east-ridge':{offset:[24,7],direction:[-1,.40,.48],height:290,width:300},
  'west-slope':{offset:[-175,-157],direction:[-1,.47,-.60],height:225,width:280},
  'south-ridge':{offset:[0,0],direction:[-.25,.68,-1],height:410,width:425}
};

// Fixed close-ups share a target and vertical span with the plan view.
const groundViews={
  'dongshan':{at:[277,-220],span:390,width:575,dir:[.54,1.52,.56],group:'campus'},
  'sixth-teaching-west':{at:[293,-232],targetElevation:71,span:55,width:85,dir:[-.91,.38,.32],group:'campus'},
  'track-terraces':{at:[-400,458],targetElevation:55.5,span:125,width:205,dir:[.83,1.01,.79],group:'campus'},
  'track-north-bank':{at:[-424.82,379.83],targetElevation:63.5,span:75,width:127,dir:[.38,.27,.94],group:'campus'},
  'north-road-crossings':{at:[-247.4,-490.2],span:96,width:150,dir:[.46,1.38,.55],group:'campus'},
  'dongshan-boundary-road':{at:[113,-173],targetElevation:39,span:98,width:133,dir:[-.35,1.05,.64],group:'campus'},
  'second-teaching-west':{at:[-139.7,-74.3],span:52,width:68,dir:[-.65,1.25,-.38],group:'campus'},
  'teaching-10-entrance':{at:[49,-247.5],span:47,width:65,dir:[-1,.76,.3],group:'campus'},
  'east-finance-court':{at:[255.97,-209.17],span:80,width:97,dir:[-.42,1.1,.78],group:'campus'},
  'east-finance-passage':{at:[240,-184],targetElevation:54,span:49,width:65,dir:[-.90,.43,.42],group:'campus'},
  'south-quarry-east':{at:[200,550],targetElevation:48,span:265,width:360,dir:[-.48,.65,-.84],group:'surroundings'},
  'east-dorm-median':{at:[394.2,-112],span:43,width:60,dir:[-.51,.93,.42],group:'campus'},
  'east-17-garden':{at:[189.8,-240.5],span:45,width:52,dir:[.34,1.32,.84],group:'campus'},
  'north-gate-stonework':{gateLocal:[0,-4],span:54,width:125,dir:[.05,.52,-1],group:'campus'},
  'gate-junction':{gateLocal:[0,17.3],span:27,width:45,dir:[.08,.87,-.18],group:'campus'},
  'art-teaching-north-west':{at:[-120.5,-384.4],span:47,width:63,dir:[-.61,1.29,-.49],group:'campus'},
  'houde-north-path':{at:[-291,-413],span:82,width:112,dir:[-.31,1.25,-.59],group:'campus'},
  'plaza-terrace':{gateLocal:[0,87],span:25,dir:[.25,.37,-1],group:'campus'},
  'plaza-flagstand':{gateLocal:[.85,103.9],span:33,width:35,dir:[.18,.72,1],group:'campus'},
  'plaza-paving':{gateLocal:[0,92],span:96,width:116,dir:[.22,1.30,-.64],group:'campus'},
  'ground-basketball':{at:[-139,342],span:93,planSpan:124,width:138,dir:[.15,.98,.30],group:'campus'},
  'ground-tennis':{at:[-255.05,399.76],span:42,dir:[.15,.98,.30],group:'campus'},
  'ground-road':{at:[304,-96.5],span:24,dir:[.43,1.10,.22],group:'campus'},
  'hillside-meadow':{at:[642,-751],span:140,dir:[1,.47,-.5],group:'surroundings'},
  'west-hillside-bends':{at:[-544,-193],span:304,planSpan:306,width:167,dir:[-.31,1.35,-.43],group:'surroundings'},
  'west-hill-clearing':{at:[-654,-31],span:219,width:184,dir:[-.24,1.34,-.48],group:'surroundings'},
  'north-coastal-track':{at:[-470,-760],span:604,width:458,dir:[.10,1.38,.53],group:'surroundings'},
  'west-quarry-apron':{at:[-476,787],span:320,width:360,dir:[-.52,.68,-.61],group:'surroundings'},
  'south-quarry':{at:[-175,1110],span:410,dir:[-.25,.68,-1],group:'surroundings'},
  'south-low-slope':{at:[-130,570],span:190,width:230,dir:[.80,.56,-.35],group:'surroundings'},
  'quarry-water':{at:[-108,941],span:53,width:60,dir:[-.22,.88,.35],group:'surroundings'},
  'south-quarry-verge':{at:[300,738],span:135,width:225,dir:[-.25,1.22,-.67],group:'surroundings'},
  'south-bare-slope':{at:[318,675],span:155,width:205,dir:[-.22,.88,.35],group:'surroundings'},
  'ground-village':{at:[999.08,897.83],span:64,dir:[-.17,1,.41],group:'surroundings'},
  'zouyu-fields':{at:[147,273],span:119,width:218,dir:[-.43,1.26,.85],group:'surroundings'},
  'west-coastal-flat':{at:[-1205,10],span:225,width:278,dir:[-.75,.36,.57],group:'surroundings'},
  'ground-shore':{at:[1321,535],span:26,dir:[.23,.85,.4],group:'surroundings'},
  'ground-track':{at:[-368,491],span:32,dir:[8,85,14],group:'campus'},
  'ground-soil':{at:[1075,35],span:16,dir:[-.34,.70,-.85],group:'surroundings'}
};

const $=id=>document.getElementById(id);
document.querySelectorAll('[data-icon]').forEach(e=>e.innerHTML=icon(e.dataset.icon));
async function json(url){const r=await fetch(url);if(!r.ok)throw Error('缺少 '+url);return r.json()}
async function run(){
 // Wide-screen startup already paints the atlas faster on the main canvas.
 const useGroundAtlasWorker=window.innerWidth<=768;
 const roadWorker=warmRoadMeshWorker();
 const [data,dem,region,roadData,waterLevels,quarryElevation,basketballProfile,ridgeCanopy,coastalElevation,westQuarryElevation,images]=await Promise.all([
   json('campus.json'),json('data/surrounding-dem.json'),json('data/surroundings.json'),
   json('data/roads.json'),json('data/water-levels.json'),json('data/south-quarry-elevation.json'),
   json('data/basketball-platform.json'),json('data/east-ridge-canopy.json'),json('data/west-coastal-flat-elevation.json'),
   json('data/west-quarry-apron-elevation.json'),loadLandscapeImages()
 ]).catch(error=>{roadWorker.cancel();throw error});
 if(useGroundAtlasWorker)preloadLandscapeDetails();
 let land;
 try{land=landscape(data,dem,region,roadData,waterLevels,quarryElevation,basketballProfile,ridgeCanopy,coastalElevation,westQuarryElevation,images,roadWorker,useGroundAtlasWorker)}
 finally{roadWorker.cancel()}
 const stage=$('stage'),flat=$('flat'),canvas=$('view');
 const streetNames=$('plan-street-names');
 // Limit each optional backing bitmap to about 16 MB on high-density displays.
 const planPixelBudget=4_000_000;
 const drawPlanTrees=createTreePlan(land.treeSites);
 const roadIndex=createRoadIndex(indexedRoads(roadData),data.gate);
 const walkLinks=new Map(roadData.segments.filter(road=>road.destination).map(road=>[road.destination,road.id]));
 const [l,t,r,b]=land.bounds,w=r-l,d=b-t;
 const [wl,nt,er,sb]=data.bounds,center=[(wl+er)/2,(nt+sb)/2];
 const regionalSpots=region.places.map(place=>({
   id:'place-'+place.id,name:place.name,icon:'village',x:place.point[0],z:place.point[1],
   group:'surroundings',span:410,eye:3,tagHeight:10,note:'在沙盘上可以看到村里的街巷和屋顶。',meta:'村名据 OpenStreetMap · 村北屋顶据校方航拍 · 其余楼体据 3D-GloBFP'
 }));
 for(const [id,name,x,z] of [['east-ridge','东侧山脊',...(data.eastRidgeStation||[560,-540])],['west-slope','西侧山坡',-540,140],['south-ridge','南侧开挖地',-175,1110]]){
   const terrainSource=id==='south-ridge'?'ICESat-2 ATL08 沿轨激光观测':'Copernicus GLO-30';
   regionalSpots.push({id,name,x,z,icon:'hill',group:'surroundings',span:680,eye:2,tagHeight:4,
     meta:'海拔约 '+Math.round(land.h(x,z))+' 米 · '+terrainSource});
 }
 const campusAnchor={id:'campus-anchor',name:'蓬莱校区',group:'surroundings',x:-132,z:-190,tagHeight:26,overviewOnly:true};
 const byId=new Map(data.buildings.map(a=>[a.id,a]));
 const spots=[...data.landmarks,...buildingLocations.filter(place=>!byId.has(place.id)),...regionalSpots,campusAnchor];
 const plannedSites=spots.filter(spot=>spot.plan);
 const plannedRoofs=plannedSites.flatMap(spot=>spot.plan.roofs.map(ring=>({ring,spot,planColor:'#9b9d91'})));
 const sitePaving={polygons:plannedSites.flatMap(({plan,model})=>[
   {style:'service',ring:plan.accessRoad},{style:model?'parcelYard':'forecourt',ring:plan.yard}
 ])};
 const buildingParts=new Map();
 for(const [id,entry] of Object.entries(buildingNames)){
   if(!byId.has(id))continue;
   for(const part of entry.parts||[])buildingParts.set(part,id);
 }
 const roofPoints=new Map();
 const buildingPlaces=new Map();
 const roofSpots=[];
 for(const building of data.buildings){
   building.baseY=building.modelBaseMetres??land.h(...(building.groundAnchor||building.center));
   const primaryId=buildingParts.get(building.id)||building.id;
   const entry=buildingNames[primaryId];
   building.name=entry?.name||building.name||'未命名建筑';
   if(primaryId!==building.id)continue;
   const [x,z]=buildingLabelPoint(building,inside,entry?.labelPoint);
   roofPoints.set(building.id,[x,z]);
   const landmark=data.landmarks.find(s=>s.buildingId===building.id&&s.name===building.name);
   const unnamed=!entry&&/^(校园建筑|博文苑建筑|未命名建筑)/.test(building.name);
   const place=landmark||{
     id:building.id,buildingId:building.id,name:building.name,
     icon:building.kind==='dorm'?'cube':building.kind,group:building.labelGroup||'campus',
     x,z,tagHeight:building.baseY+building.height+2-land.h(x,z),span:building.labelSpan||160,eye:building.height*.45,
     viewDirection:building.viewDirection,viewWidth:building.viewWidth,viewCenter:building.viewCenter,
     note:building.note,meta:building.meta,roofLabel:true,unnamed
   };
   buildingPlaces.set(building.id,place);
   if(!landmark)roofSpots.push(place);
 }
 const labelSpots=[...spots,...roofSpots];
 const eastParcel=spots.find(spot=>spot.id==='parcel-east'&&spot.model);
 const surroundings=createNeighbourhood(region.buildings,land.h);
 land.root.add(surroundings.mesh);
 const grandstand=byId.get('B082');
 const buildings=createCampusBuildings(data.buildings.filter(a=>a!==grandstand),{terrainHeight:land.h});
 const firstTeachingEntrance=buildings.children.find(m=>m.userData.buildingId==='B023')?.userData.entrance;
 if(grandstand)buildings.add(createGrandstand(grandstand,data.pitch,land.h));
 for(const mesh of buildings.children){
   if(mesh.material.emissive)mesh.material=mesh.material.clone();
   const a=byId.get(mesh.userData.buildingId);
   if(a.modelPartName)mesh.name=a.modelPartName;
   if(mesh.userData.sixthTeachingRoof)a.roofTowerRing=mesh.userData.sixthTeachingRoof.ringXZ;
   if(mapNames[a.id])mesh.userData.mapAlias=mapNames[a.id];
   Object.assign(mesh.userData,{heightMetres:a.height,heightSource:a.heightSource});
   if(Number.isFinite(a.modelBaseMetres))mesh.userData.modelBaseElevationMetres=a.baseY;
   else mesh.userData.groundElevationMetres=a.baseY;
   if(a.roofSource)Object.assign(mesh.userData,{roofSource:a.roofSource,geometryBasis:a.geometryBasis});
   if(a.groundAnchor)mesh.userData.groundAnchorXZ=a.groundAnchor;
   if(a.sourceFragments)mesh.userData.sourceFragments=a.sourceFragments;
   if(a.floors)mesh.userData.displayedFloors=a.floors;
   if(a.floorSources)mesh.userData.floorSources=a.floorSources;
   if(a.roofDetailSources?.length)mesh.userData.roofDetailSources=a.roofDetailSources;
   if(a.facilities)mesh.userData.facilities=a.facilities;
   const dining=spots.find(s=>s.group==='dining'&&s.buildingId===a.id);
   if(dining)mesh.userData.dining={name:dining.name,floor:dining.id==='houde'?'1':'1–3',entranceMetres:[dining.x,dining.z],entranceNormal:dining.entranceNormal};
   if(a.heightChecks)mesh.userData.heightEvidence=a.heightChecks;
 }
 if(eastParcel)buildings.add(...createEastParcelBuildings(eastParcel,land.h));
 land.root.add(buildings);if(data.gate)land.root.add(createEntrance(data,land.h,land.terrace));
 land.root.userData={originWGS84:data.origin,axes:'X east, Y up, Z south. Units in metres.',attribution:data.attribution,nameplateLettering:'Noto Sans SC, SIL Open Font License 1.1',accuracy:'Public-data reconstruction. Heights, facades and vegetation include approximations.'};
 land.root.userData.boundsMetres=region.bounds;
 const [roadMesh]=await Promise.all([land.roadsReady,land.atlasReady]);
 const roadMeshes=roadMesh.children;
 const scene=new T.Scene();scene.add(land.root);
 const studio=createStudioModel({THREE:T,scene,land,bounds:data.bounds,buildings,surroundings});
 const nearbyOutline=new T.LineLoop(new T.BufferGeometry(),new T.LineBasicMaterial({color:0xe2b076}));
 nearbyOutline.visible=false;scene.add(nearbyOutline);
 const hemi=new T.HemisphereLight(0xf4f9ff,0xb3b9a9,1.55);scene.add(hemi);
 const sun=new T.DirectionalLight(0xfff9f1,1.85);sun.position.set(-650,1100,-530);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-1250,right:1250,top:1250,bottom:-1250,near:30,far:3300});sun.shadow.normalBias=.55;sun.shadow.bias=-.00018;scene.add(sun);
 const renderBudget=createRenderBudget({scene,trees:land.trees,forest:land.forest,sun,invalidate,
   invalidateModel:()=>{if(mode==='3d'&&!contextLost)invalidate()},
   surfaces:[land.root.getObjectByName('地形与地表'),...roadMeshes],pickOnly:[surroundings.mesh]});
 let userOrbit=false,manual3d=false,manualPlan=false,whiteModel=false,landscapeWhite=false;
 let coverOffset=0,appliedOffset=NaN,projectionTime,coverVisible=false;
 let controlBounds=null,planFontFamily='sans-serif';
 const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
 const mapTransition=createMapTransition(stage,reducedMotion);
 let renderer,pendingModel,modelUnavailable=false,contextLost=false;
 let mode=new URLSearchParams(location.search).get('view')==='plan'?'2d':'3d';
 let selected=null,anim=null,planFlight=null,dirty=true,overlayDirty=false,labels=true,trees=true,frameRequest=null;
 let planGesture=null,panRaster=null,panBuffer=null,releasePanTimer;
 const camera=new T.OrthographicCamera(-1,1,1,-1,1,14000);
 let stageWidth=Math.max(1,stage.clientWidth),stageHeight=Math.max(1,stage.clientHeight);
 const H=()=>stageHeight,W=()=>stageWidth,fspan=()=>Math.max((w*.456+d*.89)*.63+130,(w*.89+d*.456)*1.04/(W()/H()));
 function requestFrame(){if(frameRequest===null)frameRequest=requestAnimationFrame(tick)}
 function invalidate(){panRaster=null;dirty=true;requestFrame()}
 function releasePanBuffer(){
   clearTimeout(releasePanTimer);
   if(panBuffer){panBuffer.width=1;panBuffer.height=1;panBuffer=null;}
   panRaster=null;
 }
 window.addEventListener('pagehide',releasePanBuffer);
 // Camera zoom is relative to the regional fit, which changes with aspect ratio.
 // Keep the closest vertical field of view available on phones and desktops.
 const closestSpan=9;
 const maxModelZoom=()=>Math.max(96,fspan()/closestSpan);
 const planExtent=()=>Math.max(d*1.07,w*1.07/(W()/H()));
 const maxPlanZoom=()=>Math.max(96,planExtent()/closestSpan);
 const viewdir=new T.Vector3(-.54,.94,-1.05).normalize();
 // Fit the opening aerial view to the campus buildings and track in screen space.
 const rightAxis=new T.Vector3().crossVectors(camera.up,viewdir).normalize();
 const upAxis=new T.Vector3().crossVectors(viewdir,rightAxis);
 const campusExtent=new T.Box2();
 function includeCampusPoint(x,y,z){
   const point=new T.Vector3(x,y,z);
   campusExtent.expandByPoint(new T.Vector2(point.dot(rightAxis),point.dot(upAxis)));
 }
 for(const building of data.buildings){
   for(const [x,z] of building.ring){
     includeCampusPoint(x,building.baseY,z);
     includeCampusPoint(x,building.baseY+building.height,z);
   }
 }
 for(const spot of data.landmarks)includeCampusPoint(spot.x,land.h(spot.x,spot.z)+20,spot.z);
 if(data.pitch){
   const {x,z}=data.pitch;
   for(const dx of [-60,60])for(const dz of [-95,95])includeCampusPoint(x+dx,land.h(x+dx,z+dz),z+dz);
 }
 const campusSize=campusExtent.getSize(new T.Vector2());
 const projectedCenter=campusExtent.getCenter(new T.Vector2());
 const campusTarget=new T.Vector3(center[0],land.h(...center),center[1]);
 campusTarget.addScaledVector(rightAxis,projectedCenter.x-campusTarget.dot(rightAxis));
 campusTarget.addScaledVector(upAxis,projectedCenter.y-campusTarget.dot(upAxis));
 const modelButton=$('model'),mapNotice=$('map-notice');
 let groundNotice=land.groundNotice;
 function announceModel(message,disabled){
   modelButton.disabled=disabled;
   modelButton.title=disabled?message:'';
   setMapNotice(mapNotice,message||groundNotice);
 }
 function prepareModel(){
   if(renderer)return !contextLost;
   if(modelUnavailable)return false;
   try{
     const options={antialias:true,alpha:true,powerPreference:'high-performance'};
     const context=canvas.getContext('webgl2',options);
     if(!context)throw new Error('WebGL 2 is unavailable');
     renderer=new T.WebGLRenderer({canvas,context,...options});
     renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
     renderer.setSize(W(),H(),false);
     renderer.shadowMap.enabled=true;
     renderer.shadowMap.type=T.PCFSoftShadowMap;
     renderer.setClearColor(0,0);
     renderer.outputColorSpace=T.SRGBColorSpace;
     renderer.localClippingEnabled=true;
     return true;
   }catch{
     renderer=null;
     modelUnavailable=true;
     announceModel('当前设备无法显示三维模型，可以继续使用平面地图。',true);
     return false;
   }
 }
 const orbit=new OrbitControls(camera,canvas);
 orbit.enableDamping=false;
 orbit.minZoom=.30;
 orbit.maxZoom=maxModelZoom();
 orbit.maxPolarAngle=Math.PI*.465;
 orbit.screenSpacePanning=false;
 orbit.addEventListener('start',()=>{anim=null;userOrbit=true});
 orbit.addEventListener('end',()=>{userOrbit=false});
 orbit.addEventListener('change',()=>{if(userOrbit)manual3d=true;invalidate()});
 if(mode==='3d'&&!prepareModel())mode='2d';
 let flatCenter=[...center],fz=1;const flatSpan=()=>planExtent()/fz, ppm=()=>H()/flatSpan();
 const fpos=([x,z])=>[(x-flatCenter[0])*ppm()+W()/2,(z-flatCenter[1])*ppm()+H()/2];
 const turn=new T.Quaternion();
 function setCamera(target,dir,zoom,animate=true,zoomStep=false){
   if(!animate||mode==='2d'||reducedMotion.matches){
     anim=null;camera.position.copy(target).addScaledVector(dir,3000);orbit.target.copy(target);camera.zoom=zoom;
     camera.updateProjectionMatrix();orbit.update();invalidate();return;
   }
   const offset=camera.position.clone().sub(orbit.target);
   const distance=offset.length(), fromDirection=offset.normalize();
   const rotation=new T.Quaternion().setFromUnitVectors(fromDirection,dir);
   const visibleSpan=fspan()/Math.min(camera.zoom,zoom);
   const travel=orbit.target.distanceTo(target)/visibleSpan;
   const zoomChange=Math.log(zoom/camera.zoom);
   const facingChange=fromDirection.angleTo(dir)/Math.PI;
   // Aim follows an orbit arc, even when the next point is on the opposite side.
   anim={start:performance.now(),fromTarget:orbit.target.clone(),target,fromDirection,rotation,distance,
     fromZoom:Math.log(camera.zoom),zoom,zoomChange,zoomStep,pullback:T.MathUtils.clamp((travel-.35)*.28,0,.36),
     duration:Math.max(1,zoomStep?motionTiming.quick:T.MathUtils.lerp(motionTiming.enter,motionTiming.reveal,
       Math.min(1,travel+Math.abs(zoomChange)*.20+facingChange*.38)))};
   requestFrame();
 }
 function setPlan(target,zoom,animate,zoomStep=false){
   if(!animate||mode!=='2d'||reducedMotion.matches){
     planFlight=null;flatCenter=target;fz=zoom;invalidate();return;
   }
   const from=flatCenter, zoomChange=Math.log(zoom/fz);
   const travel=Math.hypot(target[0]-from[0],target[1]-from[1])/Math.max(flatSpan(),planExtent()/zoom);
   planFlight={start:performance.now(),from,target,fromZoom:Math.log(fz),zoom,zoomChange,zoomStep,
     duration:Math.max(1,zoomStep?motionTiming.quick:T.MathUtils.lerp(motionTiming.leave,motionTiming.enter,
       Math.min(1,travel+Math.abs(zoomChange)*.24)))};
   requestFrame();
 }
 const rowMap=new Map(),tagMap=new Map();let group='campus',activeTag;
 const paperFinish=()=>isLandscapeView(location.hash.slice(1))?landscapeWhite:whiteModel;
 function syncStudio(){
   const modelView=mode==='3d'&&!land.satellite;
   const white=modelView&&paperFinish();
   const night=document.documentElement.dataset.theme==='dark';
   stage.classList.toggle('satellite',land.satellite);
   whiteSwitch.setAttribute('aria-pressed',String(paperFinish()));
   whiteSwitch.hidden=!modelView;
   coverVisible=modelView&&group==='campus'&&!selected&&!manual3d&&!isLandscapeView(location.hash.slice(1));
   const exhibit=coverVisible?'overview':'browse';
   if(stage.dataset.exhibit!==exhibit){stage.dataset.exhibit=exhibit;controlBounds=null}
   if(studio.setView({white,board:coverVisible||(white&&group!=='surroundings')}))renderBudget.invalidateShadows();
   hemi.color.setHex(night?0xcad9ee:white?0xffffff:0xf4f9ff);
   hemi.groundColor.setHex(night?0x8b9499:white?0xc4c7ca:0xb3b9a9);
   hemi.intensity=night?1.36:white?1.30:1.55;
   sun.color.setHex(night?0xf1e9d9:white?0xfffefa:0xfff9f1);
   sun.intensity=night?1.73:white?2.08:1.85;
   sun.shadow.intensity=white?.54:1;
   nearbyOutline.material.color.setHex(white&&!night?0x8c5832:night?0xf1c894:0xe2b076);
 }
 function frameExhibit(animate){
   const height=H(),width=W();
   const portrait=width<700&&height>width;
   const direction=portrait?new T.Vector3(-.12,1.34,-.77).normalize():viewdir;
   const right=new T.Vector3().crossVectors(camera.up,direction).normalize();
   const up=new T.Vector3().crossVectors(direction,right);
   const box=new T.Box2();
   for(const corner of studio.corners){
     for(const y of [corner.y,studio.baseY]){
       const point=new T.Vector3(corner.x,y,corner.z);
       box.expandByPoint(new T.Vector2(point.dot(right),point.dot(up)));
     }
   }
   const size=box.getSize(new T.Vector2()),mid=box.getCenter(new T.Vector2());
   const target=campusTarget.clone();
   target.addScaledVector(right,mid.x-target.dot(right));
   target.addScaledVector(up,mid.y-target.dot(up));
   const title=stage.querySelector('.map-title');
   const titleEnd=title?.getBoundingClientRect().bottom-stage.getBoundingClientRect().top;
   const top=T.MathUtils.clamp(titleEnd||height*.34,height*.22,height*.50)+10;
   const bottom=height-(height<500?25:44);
   const verticalShare=Math.max(.33,(bottom-top)/height);
   const horizontalShare=portrait?.96:.80;
   const span=Math.max(size.y/(verticalShare*.95),size.x/(width/height*horizontalShare));
   const centerY=portrait?Math.min((top+bottom)/2,top+24+size.y*height/span/2):(top+bottom)/2;
   coverOffset=centerY/height-.5;
   setCamera(target,direction,fspan()/span,animate);
 }
 function updateProjectionOffset(now){
   const goal=coverVisible?coverOffset:0;
   if(appliedOffset===goal){projectionTime=undefined;return}
   const elapsed=Math.max(1,now-(projectionTime??now-16.7));
   projectionTime=now;
   if(!Number.isFinite(appliedOffset)||mode==='2d'||reducedMotion.matches||Math.abs(goal-appliedOffset)<.0005)appliedOffset=goal;
   else appliedOffset=T.MathUtils.lerp(appliedOffset,goal,1-Math.exp(-elapsed/48));
   if(appliedOffset===0)camera.clearViewOffset();
   else camera.setViewOffset(W(),H(),0,-appliedOffset*H(),W(),H());
   dirty=true;
 }
 const groupButtons=[...document.querySelectorAll('#categories button')];
 function row(id, name, category, key, action, aliases='', searchOnly=false) {
   const button=document.createElement('button');
   const categoryName=groupButtons.find(b=>b.dataset.group===category).textContent;
   button.className='item';
   button.dataset.group=category;
   button.dataset.search=[name,categoryName,aliases].join(' ').toLocaleLowerCase();
   if(searchOnly)button.dataset.searchOnly='';
   button.innerHTML='<i>'+icon(key)+'</i><span></span>';
   button.lastChild.textContent=name;
   button.onclick=action;
   $('landmarks').append(button);
   rowMap.set(id,button);
 }
 row('home','校园全景','campus','map',()=>reset(true));
 row('dongshan','东山片区','campus','map',()=>{menu(false);saveRoute('dongshan');focusLandscape('dongshan')},'东山校区 东山全景');
 for(const s of labelSpots){
   const nameRecord=buildingNames[s.buildingId];
   const aliases=[s.en,s.aliases,mapNames[s.buildingId],buildingDescriptions[s.buildingId]?.aliases,
     nameRecord?.aliases,s.buildingId,...(nameRecord?.parts||[])].filter(Boolean).join(' ');
   if(!s.overviewOnly)row(s.id,s.name,s.group||'campus',s.icon,()=>select(s),aliases,s.unnamed);
   if(s.id==='gate')row('plaza-trees','广场树阵','campus','plaza',()=>{
     saveRoute('plaza-trees');menu(false);focusLandscape('plaza-trees');
   },'plaza trees');
   const tag=document.createElement('button');tag.className='tag';tag.textContent=s.unnamed?s.buildingId:s.name;
   if(s.id==='field'||s.id==='tennis-courts'||s.id==='basketball-courts')tag.dataset.compactDetailLabel='';
   if(s.buildingId)tag.dataset.building=s.buildingId;
   if(s.locationOnly)tag.classList.add('location-only');
   if(s.unnamed){tag.classList.add('unnamed');tag.setAttribute('aria-label',s.name)}
   tag.onclick=s.overviewOnly?()=>reset(true):()=>select(s);
   $('labels').append(tag);
   tagMap.set(s.id,{tag,spot:s,plan:roofPoints.get(s.buildingId)||[s.x,s.z],
     world:new T.Vector3(s.x,land.h(s.x,s.z)+(s.tagHeight||12),s.z),
     halfWidth:tag.textContent.length*(s.unnamed?4:7)+9,order:s.unnamed?0:s.roofLabel?1:2});
 }
 const orderedTags=[...tagMap.values()].sort((a,b)=>b.order-a.order);

 function switcher(label,state,apply){const btn=document.createElement('button');btn.className='toggle';btn.setAttribute('aria-pressed',state);btn.innerHTML=label+'<span class="switch"></span>';btn.onclick=()=>{const next=btn.getAttribute('aria-pressed')!=='true';btn.setAttribute('aria-pressed',next);apply(next);invalidate()};$('switches').append(btn);return btn}
 function refitAppearance(){
   if(!selected&&group==='campus'&&!manual3d&&mode==='3d'&&!isLandscapeView(location.hash.slice(1)))frameGroup(group,false);
   else syncStudio();
 }
 switcher('显示地名',true,v=>labels=v);
 switcher('卫星照片',false,v=>{land.setSatellite(v);refitAppearance()});
 switcher('显示树木',true,v=>{land.trees.visible=trees=v});
 const whiteSwitch=switcher('白色沙盘',whiteModel,v=>{
   if(isLandscapeView(location.hash.slice(1)))landscapeWhite=v;
   else whiteModel=v;
   refitAppearance();
 });
 $('layers-button').disabled=false;
 const filterDirectory=setupDirectory(rowMap,groupButtons,preferredBuildingSearch,['home','library','field']);
 function showGroup(value) {
   group=value;
   filterDirectory(value);
 }
 let currentRoute=location.href;
 function saveRoute(id){const url=new URL(location.href);url.hash=id==='campus'?'':encodeURIComponent(id);if(location.hash!==url.hash){history.pushState(null,'',url);currentRoute=location.href}}
 function mark(){
   const footprint=selected?.nearbyRing;
   if(footprint&&nearbyOutline.userData.ring!==footprint){
     nearbyOutline.geometry.dispose();
     nearbyOutline.geometry=footprintOutline(footprint,land.h);
     nearbyOutline.userData.ring=footprint;
   }
   nearbyOutline.visible=Boolean(footprint);
   const route=location.hash.slice(1);
   const activeRow=selected?.id||(isLandscapeView(route)?route:group==='campus'?'home':null);
   rowMap.forEach((button,id)=>{
     const current=id===activeRow;
     button.classList.toggle('active',current);
     if(current)button.setAttribute('aria-current','location');
     else button.removeAttribute('aria-current');
   });
   const nextTag=tagMap.get(selected?.id);
   if(nextTag!==activeTag){
     activeTag?.tag.classList.remove('selected');
     nextTag?.tag.classList.add('selected');
     activeTag=nextTag;
   }
   controlBounds=null;
   buildings.children.forEach(m=>{
     const id=m.userData.buildingId;
     const primaryId=buildingParts.get(id)||id;
     const highlight=whiteModel?0x172a52:selected?.group==='dining'?0x2f2415:0x513416;
     const active=m.userData.landmarkId?selected?.id===m.userData.landmarkId:selected?.buildingId===primaryId;
     m.material.emissive?.setHex(active?highlight:0);
   });
   syncStudio();
 }
 const mapTitle=stage.querySelector('.map-title'),detailPanel=$('detail');
 const shortFramedPlaces=new Set(['field','G018','B013','parcel-east']);
 let fittedPlaceBand=null;
 function shortPlaceBand(){
   if(H()>640||W()>=H()||W()<=16||detailPanel.hidden||detailPanel.inert)return null;
   // Use the destination bounds even while the detail panel is animating.
   const top=mapTitle.offsetTop+mapTitle.offsetHeight+8;
   const bottom=detailPanel.offsetTop-8;
   return bottom-top>=72?{top,bottom,width:W(),height:H()}:null;
 }
 function updateShortPlaceFrame(){
   if(!shortFramedPlaces.has(selected?.id)||userOrbit||planGesture||(manualPlan&&manual3d))return;
   const band=shortPlaceBand(),previous=fittedPlaceBand;
   if(band?.top===previous?.top&&band?.bottom===previous?.bottom&&
     band?.width===previous?.width&&band?.height===previous?.height)return;
   focusLandmark(selected,false,{keepManual:true,band});
 }
 // Coordinates along this axis increase downwards on the screen in both views.
 function fitShortPlaceHeight(min,max,anchor,span,band){
   const tagClearance=33; // map tag box above its projected anchor
   const available=band.bottom-band.top,depth=max-min;
   span=Math.max(span,depth*H()/available,(max-anchor)*H()/(available-tagClearance));
   const pixelsPerMetre=H()/span;
   const highestTop=Math.max(band.top,band.top+tagClearance-(anchor-min)*pixelsPerMetre);
   const lowestTop=band.bottom-depth*pixelsPerMetre;
   const screenCenter=(highestTop+lowestTop+depth*pixelsPerMetre)/2;
   return {span,center:(min+max)/2+(H()/2-screenCenter)/pixelsPerMetre};
 }
 function shortPlaceModelPoints(spot,building){
   if(building){
     const levels=[building.baseY,building.baseY+building.height];
     return building.ring.flatMap(([x,z])=>levels.map(y=>new T.Vector3(x,y,z)));
   }
   if(spot.id!=='parcel-east'||!spot.model||!spot.plan)return [];
   const {roofs,yard}=spot.plan;
   const points=roofs.flat().flatMap(([x,z])=>{
     const y=land.h(x,z);
     return [new T.Vector3(x,y,z),new T.Vector3(x,y+4,z)];
   });
   // Frame the courtyard core with the buildings. The plan still shows the full approach.
   const northEdge=-69;
   for(let i=0,j=yard.length-1;i<yard.length;j=i++){
     const [x,z]=yard[i],[previousX,previousZ]=yard[j];
     if(z>=northEdge)points.push(new T.Vector3(x,land.h(x,z),z));
     if((z>=northEdge)===(previousZ>=northEdge))continue;
     const crossing=T.MathUtils.lerp(previousX,x,(northEdge-previousZ)/(z-previousZ));
     points.push(new T.Vector3(crossing,land.h(crossing,northEdge),northEdge));
   }
   return points;
 }
 function focusLandmark(s,animate,{keepManual=false,band=shortFramedPlaces.has(s.id)?shortPlaceBand():null}={}){
   if(!keepManual)manualPlan=manual3d=false;
   fittedPlaceBand=band;
   const direction=viewdir.clone();
   const viewCenter=s.viewCenter||[s.x,s.z];
   let [x,z]=viewCenter;
   let eye=s.eye||8,span=s.span||270;
   if(s.id==='gate'){
     const axis=data.gate.angle;
     x-=Math.sin(axis)*42;z+=Math.cos(axis)*42;
     direction.set(Math.sin(axis),.39,-Math.cos(axis)).normalize();
     eye=5;span=Math.max(111,148/(W()/H()));
   }else if(s.buildingId==='B023'&&firstTeachingEntrance){
     const {point,normal:[nx,nz]}=firstTeachingEntrance;
     x=(x+point[0])/2;z=(z+point[1])/2;eye=9;
     direction.set(nx-.47*nz,.62,nz+.47*nx).normalize();
     span=Math.max(64,108/(W()/H()));
   }else if(s.buildingId==='G018'){
     [x,z]=byId.get(s.buildingId).center;
     direction.set(.83,1.42,.32).normalize();
     span=Math.max(90,106/(W()/H()));
   }else if(s.buildingId==='east-south'){
     const building=byId.get(s.buildingId);
     [x,z]=building.center;
     eye=building.baseY+building.height*.52-land.h(x,z);
     direction.set(-1,.52,-.32).normalize();
     span=Math.max(91,110/(W()/H()));
   }else if(s.id==='field'){
     direction.set(-.35,.95,-1).normalize();
     span=Math.max(162,225/(W()/H()));
   }else if(s.entranceNormal){
     const [nx,nz]=s.entranceNormal;
     const front=s.id==='houde'?76:s.id==='wenhua'?74:52;
     direction.set(nx,s.id==='houde'?.55:.43,nz).normalize();
     eye=s.id==='houde'?8:5;
     span=Math.max(front,(s.id==='houde'?112:front*.89)/(W()/H()));
   }else if(s.group==='surroundings'){
     const view=hillViews[s.id];
     if(view){
       x+=view.offset[0];z+=view.offset[1];
       direction.set(...view.direction).normalize();
       span=Math.max(view.height,view.width/(W()/H()));
     }else{
       direction.set(-.69,.72,-1).normalize();
       span=Math.max(span*.64,Math.min(200,span*.70)/(W()/H()));
     }
   }
   if(s.viewDirection)direction.set(...s.viewDirection).normalize();
   if(s.viewWidth)span=Math.max(span,s.viewWidth/(W()/H()));
   let planTarget=[...viewCenter];
   let cameraTarget;
   let desired=Math.max(s.span||270,(s.viewWidth||0)/(W()/H()));
   if(s.viewWidth&&W()/H()<.72)planTarget[1]+=desired*.06;
   if(s.plan){
     desired=s.plan.span;
     const [px,pz]=s.plan.center;
     planTarget=[px,pz+(W()/H()<.72?desired*.10:0)];
   }
   if(s.id==='field'&&data.pitch){
     const [west,north,east,south]=athleticsPlanBounds(data.pitch);
     desired=Math.max(desired,south-north+24,(east-west+24)/(W()/H()));
     planTarget=[(west+east)/2,(north+south)/2];
     if(band){
       const visibleShare=(band.bottom-band.top)/H();
       const displayOffset=(band.top+band.bottom)/(2*H())-.5;
       const fieldMiddle=new T.Vector3(planTarget[0],land.h(data.pitch.x,data.pitch.z),planTarget[1]);
       desired=Math.max(desired,(south-north)/visibleShare);
       planTarget[1]-=displayOffset*desired;
       const right=new T.Vector3().crossVectors(camera.up,direction).normalize();
       const up=new T.Vector3().crossVectors(direction,right);
       const projectedHeight=2*athleticsHalfExtent(data.pitch,up.x,up.z);
       span=Math.max(span,projectedHeight/visibleShare);
       cameraTarget=new T.Vector3(x,land.h(x,z)+eye,z);
       cameraTarget.addScaledVector(up,fieldMiddle.sub(cameraTarget).dot(up)+displayOffset*span);
     }
   }
   if(s.guideRing){
     direction.set(.56,1.85,.48).normalize();
     const xs=s.guideRing.map(point=>point[0]), zs=s.guideRing.map(point=>point[1]);
     const west=Math.min(...xs), east=Math.max(...xs), north=Math.min(...zs), south=Math.max(...zs);
     x=(west+east)/2;z=(north+south)/2;
     planTarget=[x,z];
     desired=Math.max(98,south-north+86,(east-west+42)/(W()/H()));
     span=desired*1.12;
   }else if(s.group==='dining'){
     const ring=byId.get(s.buildingId).ring;
     const xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1]);
     const x0=Math.min(...xs),x1=Math.max(...xs),z0=Math.min(...zs),z1=Math.max(...zs);
     const size=Math.max(z1-z0+40,(x1-x0+32)/(W()/H()));
     planTarget=[(x0+x1)/2,(z0+z1)/2+size*.04];desired=size;
   }else if(s.icon==='hill'){desired=Math.max(430,500/(W()/H()))}
   if(band&&s.id!=='field'){
     const building=s.id==='parcel-east'?null:byId.get(s.buildingId),site=s.plan;
     const footprint=building?.ring??[...(site?.roofs??[]).flat(),...(site?.yard??[]),...(site?.accessRoad??[])];
     if(footprint.length){
       const tag=tagMap.get(s.id),outline=new T.Box2();
       for(const [east,south] of footprint)outline.expandByPoint(new T.Vector2(east,south));
       const widthSpan=(outline.max.x-outline.min.x)*H()/(W()-16);
       const plan=fitShortPlaceHeight(outline.min.y,outline.max.y,tag?.plan?.[1]??s.z,Math.max(desired,widthSpan),band);
       desired=plan.span;planTarget=[(outline.min.x+outline.max.x)/2,plan.center];
       const points=shortPlaceModelPoints(s,building);
       if(points.length){
         const right=new T.Vector3().crossVectors(camera.up,direction).normalize();
         const up=new T.Vector3().crossVectors(direction,right);
         const projected=new T.Box2();
         for(const point of points)projected.expandByPoint(new T.Vector2(point.dot(right),-point.dot(up)));
         const modelWidth=(projected.max.x-projected.min.x)*H()/(W()-16);
         cameraTarget=new T.Vector3(x,land.h(x,z)+eye,z);
         const anchor=-(tag?.world??cameraTarget).dot(up);
         const model=fitShortPlaceHeight(projected.min.y,projected.max.y,anchor,Math.max(span,modelWidth),band);
         span=model.span;
         cameraTarget.addScaledVector(up,-model.center-cameraTarget.dot(up));
         cameraTarget.addScaledVector(right,(projected.min.x+projected.max.x)/2-cameraTarget.dot(right));
       }
     }
   }
   const planZoom=T.MathUtils.clamp(planExtent()/desired,.5,96);
   const halfHeight=planExtent()/planZoom/2,halfWidth=halfHeight*W()/H();
   planTarget[0]=halfWidth*2>=w?(l+r)/2:T.MathUtils.clamp(planTarget[0],l+halfWidth,r-halfWidth);
   planTarget[1]=halfHeight*2>=d?(t+b)/2:T.MathUtils.clamp(planTarget[1],t+halfHeight,b-halfHeight);
   if(!keepManual||!manualPlan)setPlan(planTarget,planZoom,animate);
   if(!keepManual||!manual3d){
     setCamera(cameraTarget||new T.Vector3(x,land.h(x,z)+eye,z),direction,Math.min(96,fspan()/span),animate);
   }
 }
 const detailViews=new Map([
   ['gate',{id:'north-gate-stonework',label:'看北门构架'}],
   ['G018',{id:'sixth-teaching-west',label:'看六教西立面'}],
   ['field',{id:'track-north-bank',label:'看北侧护坡'}],
   ['west-slope',{id:'west-hillside-bends',label:'看坡地弯道'}],
   ['place-10931818885',{id:'external-zouyu-b1',label:'看村北民居'}]
 ]);
 function select(s,{focus=true,recordHistory=true,trigger=document.activeElement,animate=true}={}){
   planGestures.cancel();
   const previousHeight=captureDetailHeight(s.id,animate);
   showGroup(s.group||'campus');selected=s;if(recordHistory)saveRoute(s.id);menu(false,false);$('detail-name').textContent=s.name;
   const building=s.buildingId&&byId.get(s.buildingId);
   const nameRecord=buildingNames[s.buildingId];
   const description=buildingDescriptions[building?.id]||placeDescriptions[s.id];
   const unknownBuilding=building?.name.startsWith('博文苑建筑')
     ? '这是博文苑里的一栋楼。可从沙盘上看它和周围楼栋的位置。'
     : '从沙盘上可以看这栋楼的位置和屋顶形状。';
   const nameNote=nameRecord?'楼名已与校方资料对照。':unknownBuilding;
   $('detail-note').textContent=description?.text||nameRecord?.text||s.note||(building?nameNote:'');
   const identityNote=s.unnamed?'楼名与用途待核实。':'';
   const metadata=[s.meta,description?.modelNote||identityNote].filter(Boolean).join(' · ');
   const parts=metadata.split(/(\d+(?:\.\d+)?(?:[–-]\d+(?:\.\d+)?)?\s*(?:千米|米|m\b|层))/g);
   $('detail-data').replaceChildren(...parts.map((text,index)=>{
     if(index%2===0)return text;
     const number=document.createElement('strong');
     number.textContent=text;
     return number;
   }));
   const source=$('building-source');
   const reference=nameRecord||description||s;
   source.hidden=!reference?.source;
   if(reference?.source){
     source.href=reference.source;
     source.textContent=(reference.sourceLabel||'校方校园导览')+' ↗';
   }else{
     source.removeAttribute('href');
   }
   const walkLink=$('building-access');
   const detailView=detailViews.get(s.id)||detailViews.get(s.buildingId);
   const nearbyView=detailView?.id||walkLinks.get(s.buildingId);
   walkLink.hidden=!nearbyView;
   if(nearbyView){
     walkLink.href='#'+nearbyView;
     walkLink.textContent=detailView?.label||'看接入步道';
   }
   else walkLink.removeAttribute('href');
   $('ridge-profile').hidden=s.id!=='east-ridge';
   showDetail(s.id,animate,previousHeight);mark();if(focus)focusLandmark(s,animate);focusDetail(trigger);invalidate();
 }
 function pick(building,options){
   if(!building)return;
   const primaryId=buildingParts.get(building.id)||building.id;
   select(buildingPlaces.get(primaryId),options);
 }
 function frameGroup(value,animate,{preserveDirectory=false}={}){
   manualPlan=manual3d=false;
   if(!preserveDirectory){planGestures.cancel();showGroup(value)}
   selected=null;mark();hideDetail(animate);
   const regionView=value==='surroundings';
   let target=regionView?[(l+r)/2,(t+b)/2]:center;
   let vx=regionView?w:er-wl,vz=regionView?d:sb-nt;
   if(value==='dining'){
     const restaurants=spots.filter(s=>s.group==='dining'),xs=restaurants.map(s=>s.x),zs=restaurants.map(s=>s.z);
     const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
     target=[(minX+maxX)/2,(minZ+maxZ)/2];vx=maxX-minX+130;vz=maxZ-minZ+130;
   }
   const ratio=W()/H();
   const span=Math.max((vx*.456+vz*.89)*.63+130,(vx*.89+vz*.456)*1.04/ratio);
   setPlan(target,Math.max(d,w/ratio)/Math.max(vz,vx/ratio),animate);
   if(coverVisible){
     frameExhibit(animate);
   }else if(value==='campus'){
     const campusSpan=Math.max(campusSize.y,campusSize.x/ratio)*1.18;
     setCamera(campusTarget,viewdir,fspan()/campusSpan,animate);
   }else{
     setCamera(new T.Vector3(target[0],land.h(...target),target[1]),viewdir,fspan()/span,animate);
   }
   if(!coverVisible&&value==='campus'&&W()<640&&H()>W()*1.25)mobileFraming(animate);
   invalidate();
 }
 function reset(animate){menu(false);saveRoute('campus');frameGroup('campus',animate)}
 function showCategory(value,animate=true){saveRoute(value);frameGroup(value,animate)}
 groupButtons.forEach(b=>b.onclick=()=>showCategory(b.dataset.group));
 function pickNearby(a,options){
   if(!a)return;
   if(a.villageRoof){
     const flanks=a.villageRoof.flanks||[];
     let note='东山坡脚的单层民居，红瓦屋面向两侧放坡。';
     if(flanks.length===1)note='红瓦坡顶的一侧接着一条浅色窄屋面。';
     if(flanks.length===2)note='红瓦坡顶两侧各有一道窄屋面，一侧能看到灰蓝色格纹。';
     select({id:'external-'+a.fid,sourceRecord:a.fid,nearbyRing:a.ring,group:'surroundings',name:'邹于村民居',
       viewDirection:flanks.length?[-1,.78,.18]:undefined,
       x:a.center[0],z:a.center[1],span:flanks.length?68:112,eye:a.height/2,note,
       meta:'屋脊距屋前地面约 '+Math.round(a.height)+' 米 · '+(a.villageRoof.keepTerrain?'模型估算':'航拍估算'),
       source:'https://www.ytkj.edu.cn/info/1049/8478.htm',sourceLabel:'校方航拍'},options);
     return;
   }
   select({id:'external-'+a.fid,sourceRecord:a.fid,nearbyRing:a.ring,group:'surroundings',name:'周边建筑',x:a.center[0],z:a.center[1],
     span:120,eye:a.height/2,note:'这是校园外的一栋楼。转动沙盘，可以从不同方向看它的屋顶和周围街巷。',meta:'楼高约 '+Math.round(a.height)+' 米 · 3D-GloBFP 2020 遥感估高'},options);
 }
 $('close-detail').onclick=()=>{
   anim=planFlight=null;
   saveRoute(group);selected=null;manual3d=true;mark();hideDetail();restoreDetailFocus();invalidate();
 };
 function updateMode(){
   $('gesture-text').textContent=mode==='3d'?'拖动换角度 · 用滚轮放大或缩小':'拖动移地图 · 用滚轮放大或缩小';
   flat.inert=flat.hidden=mode!=='2d';canvas.inert=canvas.hidden=mode!=='3d';
   streetNames.hidden=flat.hidden||!labels||land.satellite;
   $('north').disabled=mode==='2d';
   modelButton.disabled=modelUnavailable||contextLost;
   $('plan').disabled=false;
   modelButton.setAttribute('aria-pressed',mode==='3d');$('plan').setAttribute('aria-pressed',mode==='2d');invalidate();
 }
 const ray=new T.Raycaster();
 const terrainMesh=land.root.getObjectByName('地形与地表');
 const walkSurface=roadMeshes.find(mesh=>mesh.userData.surfaceStyle==='estimatedWalk');
 const maxWalkLegs=roadData.segments.reduce((max,road)=>road.source==='dormAccessApproximation'
   ?Math.max(max,road.ring.length-1):max,0);
 const routeMotion=createRouteMotion({stage,canvas:$('route-motion'),walkSurface,maxWalkLegs,scene,W,H,project:fpos});
 const gateMeshes=[];
 land.root.getObjectByName('北门与观海广场')?.traverse(m=>{if(m.isMesh)gateMeshes.push(m)});
 const pickMeshes=[...buildings.children,surroundings.mesh,...gateMeshes];
 const planWorld=([x,y])=>[flatCenter[0]+(x-W()/2)/ppm(),flatCenter[1]+(y-H()/2)/ppm()];
 // Open the dated imagery at the camera target or the centre of the plan.
 // Local metres use east/south axes from the WGS84 origin in assemble.py.
 function syncReferenceLink(){
   const [ox,oy]=data.origin;
   const manual=mode==='2d'?manualPlan:manual3d;
   const [x,z]=selected&&!manual?[selected.x,selected.z]:mode==='2d'?flatCenter:[orbit.target.x,orbit.target.z];
   const lon=ox+x/(111320*Math.cos(oy*Math.PI/180)),lat=oy-z/110993;
   $('imagery-reference').href='https://livingatlas.arcgis.com/wayback/#active=3692&mapCenter='+lon.toFixed(6)+'%2C'+lat.toFixed(6)+'%2C18';
 }
 function placePlan(anchor,point,zoomValue,gesture=null){
   planFlight=null;
   if(gesture==='pan')clearTimeout(releasePanTimer);
   else if(planGesture==='pan'&&panBuffer)releasePanTimer=setTimeout(releasePanBuffer,750);
   planGesture=gesture;
   fz=T.MathUtils.clamp(zoomValue,.5,maxPlanZoom());
   const x=anchor[0]-(point[0]-W()/2)/ppm(),z=anchor[1]-(point[1]-H()/2)/ppm();
   flatCenter=[T.MathUtils.clamp(x,l,r),T.MathUtils.clamp(z,t,b)];
   manualPlan=true;dirty=true;requestFrame();
   if(gesture!=='pan')panRaster=null;
 }
 function changeMode(next,remember=true){
   if(pendingModel){
     pendingModel=null;
     modelButton.removeAttribute('aria-busy');
     announceModel('',false);
     layoutChanged();
   }
   if(next==='3d'&&!prepareModel())next='2d';
   if(next!==mode){
     planGestures.cancel();
     releasePanBuffer();
     planGesture=null;
     if(planFlight)setPlan(planFlight.target,planFlight.zoom,false);
     if(next==='2d'&&manual3d){
       ray.setFromCamera(new T.Vector2(0,0),camera);
       const ground=renderBudget.intersectSurface(ray,terrainMesh)[0]?.point||orbit.target;
       flatCenter=[ground.x,ground.z];fz=T.MathUtils.clamp(planExtent()/(fspan()/camera.zoom),.5,maxPlanZoom());
       manualPlan=true;
     }else if(next==='3d'&&manualPlan){
       const [x,z]=flatCenter,dir=camera.position.clone().sub(orbit.target).normalize();
       setCamera(new T.Vector3(x,land.h(x,z),z),dir,T.MathUtils.clamp(fspan()/flatSpan(),.45,maxModelZoom()),false);
       manual3d=true;
     }
     if(contextLost)mapTransition.finish();
     else mapTransition.hold(mode==='2d'?flat:canvas,next==='2d'?flat:canvas);
     mode=next;updateMode();syncStudio();
     if(mode==='3d')announceModel('',false);
     if(coverVisible)frameExhibit(false);
   }
   if(remember){
     const url=new URL(location.href);
     if(next==='2d')url.searchParams.set('view','plan');else url.searchParams.delete('view');
     history.replaceState(null,'',url);currentRoute=location.href;
   }
 }
 canvas.addEventListener('webglcontextlost',()=>{
   const wasFocused=document.activeElement===canvas;
   contextLost=true;
   anim=null;
   changeMode('2d',false);
   announceModel('三维画面中断了，已切到平面地图。',true);
   if(wasFocused)flat.focus({preventScroll:true});
 });
 canvas.addEventListener('webglcontextrestored',()=>{
   contextLost=false;
   announceModel('三维画面已恢复，可以切回三维模型。',false);
 });
 modelButton.onclick=()=>{
   if(renderer||mode==='3d'){changeMode('3d');return}
   if(pendingModel||modelUnavailable)return;
   const request={painted:false};
   pendingModel=request;
   modelButton.setAttribute('aria-busy','true');
   announceModel('正在准备三维模型…',false);
   layoutChanged();
   // Give the existing plan and status a browser paint before the cold GPU draw.
   requestAnimationFrame(()=>{
     if(pendingModel!==request)return;
     request.painted=true;
     requestFrame();
   });
 };
 $('plan').onclick=()=>changeMode('2d');$('home').onclick=()=>reset(true);
 function zoom(f){
   planGestures.cancel();
   if(mode==='2d'){
     manualPlan=true;
     const from=planFlight?.zoomStep?planFlight.zoom:fz;
     setPlan(flatCenter,T.MathUtils.clamp(from*f,.5,maxPlanZoom()),true,true);
   }else{
     manual3d=true;
     const from=anim?.zoomStep?anim.zoom:camera.zoom;
     const direction=camera.position.clone().sub(orbit.target).normalize();
     setCamera(orbit.target.clone(),direction,T.MathUtils.clamp(from*f,.45,maxModelZoom()),true,true);
   }
 }
 $('minus').onclick=()=>zoom(1/1.4);$('plus').onclick=()=>zoom(1.4);
 $('north').onclick=()=>{if(mode==='3d'){manual3d=true;setCamera(orbit.target.clone(),new T.Vector3(0,1,.83).normalize(),camera.zoom)}};
 const arrowDirections={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
 function keyboardMap(event){
   if(event.ctrlKey||event.metaKey||event.altKey)return;
   if(event.key==='+'||event.key==='='||event.key==='-'){
     event.preventDefault();
     zoom(event.key==='-'?1/1.4:1.4);
     return;
   }
   const direction=arrowDirections[event.key];
   if(!direction)return;
   const [dx,dy]=direction;
   if(mode==='2d'){
     event.preventDefault();
     const step=event.shiftKey?92:46;
     placePlan(flatCenter,[W()/2-dx*step,H()/2-dy*step],fz);
   }else{
     manual3d=true;
     anim=null;
     invalidate();
   }
 }
 flat.addEventListener('keydown',keyboardMap);
 canvas.addEventListener('keydown',keyboardMap);
 orbit.keyPanSpeed=46;
 orbit.listenToKeyEvents(canvas);
 function chooseRoad(hit,point){
   if(!hit)return;
   if(mode==='3d')manual3d=true;else manualPlan=true;
   const landmark=hit.area?.landmarkId&&spots.find(place=>place.id===hit.area.landmarkId);
   select(landmark||roadSpot(hit,point,group,roadIndex),{focus:false});
 }
 const modelPointers=new Set();
 let down=null;
 canvas.addEventListener('pointerdown',e=>{
   modelPointers.add(e.pointerId);
   down=modelPointers.size===1&&e.button===0?{id:e.pointerId,x:e.clientX,y:e.clientY}:null;
 });
 canvas.addEventListener('pointermove',e=>{
   if(down?.id===e.pointerId&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>4)down=null;
 });
 for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{
   modelPointers.delete(e.pointerId);if(down?.id===e.pointerId)down=null;
 });
 canvas.addEventListener('pointerup',e=>{
   modelPointers.delete(e.pointerId);
   const click=down;down=null;
   if(click?.id!==e.pointerId||Math.hypot(e.clientX-click.x,e.clientY-click.y)>4)return;
   const box=canvas.getBoundingClientRect();
   ray.setFromCamera(new T.Vector2((e.clientX-box.left)/W()*2-1,-(e.clientY-box.top)/H()*2+1),camera);
   const visibleHit=hit=>studio.contains(hit.point);
   let hit=renderBudget.intersectObjects(ray,pickMeshes).find(visibleHit);
   if(!land.satellite){
     for(const mesh of roadMeshes){
       const roadHit=renderBudget.intersectSurface(ray,mesh).find(visibleHit);
       if(roadHit&&(!hit||roadHit.distance<hit.distance))hit=roadHit;
     }
   }
   const ground=renderBudget.intersectSurface(ray,terrainMesh).find(visibleHit);
   if(hit&&(!ground||ground.distance+.10>=hit.distance)){
     if(hit.object===surroundings.mesh){pickNearby(surroundings.pick(hit.faceIndex));return}
     if(hit.object.userData.landmarkId==='parcel-east'){select(eastParcel);return}
     if(hit.object.userData.buildingId){pick(byId.get(hit.object.userData.buildingId));return}
     if(gateMeshes.includes(hit.object)){select(spots.find(s=>s.id==='gate'));return}
     const at=[hit.point.x,hit.point.z];chooseRoad(roadIndex.hit(at),at);return;
   }
   // The north gate lanes are painted into the ground texture.
   if(ground&&!land.satellite){const at=[ground.point.x,ground.point.z];chooseRoad(roadIndex.hit(at),at)}
 });
 function pickOnPlan(point){
   const contains=a=>inside(point,a.ring)&&!(a.holes||[]).some(r=>inside(point,r));
   const campusBuilding=data.buildings.find(contains);
   if(campusBuilding){pick(campusBuilding);return}
   const plannedRoof=plannedRoofs.find(contains);
   if(plannedRoof){select(plannedRoof.spot);return}
   const nearby=region.buildings.find(contains);
   if(nearby){pickNearby(nearby);return}
   if(!land.satellite)chooseRoad(roadIndex.hit(point),point);
 }
 const planGestures=bindPlanGestures(flat,{worldAt:planWorld,zoomLevel:()=>fz,place:placePlan,pick:pickOnPlan,
   interrupt:()=>{planFlight=null},
   end:()=>{if(planGesture){
     if(planGesture==='pan'&&panBuffer)releasePanTimer=setTimeout(releasePanBuffer,750);
     planGesture=null;invalidate();
   }}
 });
 let planBuildings;
 function planOutline(building,nearby){
   const path=new Path2D();
   for(const ring of [building.ring,...(building.holes||[])]){
     path.moveTo(...ring[0]);
     for(let i=1;i<ring.length;i++)path.lineTo(...ring[i]);
     path.closePath();
   }
   const xs=building.ring.map(p=>p[0]),zs=building.ring.map(p=>p[1]);
   const bounds=[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];
   const fill=nearby?(building.tint==='clay'?'#b89b82':'#99a29b'):(building.planColor||(building.kind==='unknown'?'#c3c2b8':'#d3b69d'));
   let roofCaps,tower;
   if(building.financeWingRoof){
     const {vertices,caps}=building.financeWingRoof;
     roofCaps=new Path2D();
     for(const [a,b,c] of caps){
       roofCaps.moveTo(vertices[a][0],vertices[a][1]);
       roofCaps.lineTo(vertices[b][0],vertices[b][1]);
       roofCaps.lineTo(vertices[c][0],vertices[c][1]);
       roofCaps.closePath();
     }
   }
   const towerRing=building.roofTowerRing||building.financeWingRoof?.tower?.ring;
   if(towerRing){
     tower=new Path2D();
     tower.moveTo(...towerRing[0]);
     for(const point of towerRing.slice(1))tower.lineTo(...point);
     tower.closePath();
   }
   return {building,nearby,path,bounds,fill,roofCaps,tower};
 }
 function drawFlat(){
   const ctx=flat.getContext('2d'),dpi=flat.width/W(),scale=ppm();
   const pad=Math.ceil(Math.min(112,W()/4,H()/4)*dpi);
   ctx.setTransform(1,0,0,1,0,0);
   ctx.clearRect(0,0,flat.width,flat.height);
   if(planGesture==='pan'&&(flat.width+2*pad)*(flat.height+2*pad)<=planPixelBudget){
     // A single-finger drag translates the same native-resolution geometry.
     // Rebuild when the visible region reaches the edge of the cached drawing.
     let sx=pad,sy=pad;
     if(panRaster&&scale===panRaster.scale){
       sx+=Math.round((flatCenter[0]-panRaster.center[0])*scale*dpi);
       sy+=Math.round((flatCenter[1]-panRaster.center[1])*scale*dpi);
     }
     if(!panRaster||scale!==panRaster.scale||sx<0||sy<0||sx+flat.width>panRaster.buffer.width||sy+flat.height>panRaster.buffer.height){
       const buffer=panBuffer??=document.createElement('canvas');
       const width=flat.width+2*pad,height=flat.height+2*pad;
       if(buffer.width!==width)buffer.width=width;
       if(buffer.height!==height)buffer.height=height;
       buffer.getContext('2d').clearRect(0,0,width,height);
       drawPlanGeography(buffer.getContext('2d'),scale,dpi,pad);
       panRaster={center:[...flatCenter],scale,buffer};
       sx=sy=pad;
     }
     ctx.drawImage(panRaster.buffer,sx,sy,flat.width,flat.height,0,0,flat.width,flat.height);
     return;
   }
   drawPlanGeography(ctx,scale,dpi,0);
 }
 function drawPlanGeography(ctx,scale,dpi,pad){
   const margin=pad/dpi;
   const bounds=[...planWorld([-margin,-margin]),...planWorld([W()+margin,H()+margin])];
   const [ox,oz]=fpos([0,0]);
   ctx.save();ctx.setTransform(dpi*scale,0,0,dpi*scale,dpi*ox+pad,dpi*oz+pad);
   ctx.drawImage(land.map,l,t,w,d);
   if(!land.satellite){
     land.drawGroundDetail(ctx,bounds,scale);
     land.drawGrassDetail(ctx,bounds,scale);
     if(scale>2){if(data.pitch)drawAthletics(ctx,data.pitch);drawEntranceGround(ctx,data,false,land.gateApron)}
     if(scale>=1.35)land.drawCourts(ctx,scale);
     drawAthleticsPlanMarks(ctx,data.pitch,scale,bounds);
     drawRoadPlan(ctx,roadData,bounds);
     drawRoadPlan(ctx,sitePaving,bounds);
     land.drawCourtIsland(ctx);
   }
   if(trees)drawPlanTrees(ctx,bounds,scale);

   planBuildings??=[...region.buildings.map(a=>planOutline(a,true)),
     ...[...data.buildings,...plannedRoofs].map(a=>planOutline(a,false))];
   const [west,north,east,south]=bounds,strokeMargin=1/scale;
   for(const {building:a,nearby,path,bounds:[left,top,right,bottom],fill,roofCaps,tower} of planBuildings){
     if(right<west-strokeMargin||left>east+strokeMargin||bottom<north-strokeMargin||top>south+strokeMargin)continue;
     const selectedBuilding=a.spot?selected===a.spot:
       nearby?selected?.sourceRecord===a.fid:selected?.buildingId===(buildingParts.get(a.id)||a.id);
     ctx.fillStyle=selectedBuilding&&!nearby?'#b87755':fill;
     const showPassage=a.passage&&!land.satellite&&scale>1.1;
     if(showPassage)ctx.globalAlpha=selectedBuilding ? .72 : .48;
     const showRoof=roofCaps&&!land.satellite&&scale>1.1;
     if(showRoof&&!selectedBuilding)ctx.fillStyle=a.financeWingRoof.slopeColor;
     ctx.fill(path,'evenodd');
     if(a.villageRoof&&!land.satellite&&scale>1.1){
       const [front,rear]=a.villageRoof.ridgeXZ;
       const eaves=a.villageRoof.eavesXZ||a.ring;
       ctx.beginPath();ctx.moveTo(...front);ctx.lineTo(...rear);
       ctx.lineTo(...eaves[2]);ctx.lineTo(...eaves[3]);ctx.closePath();
       ctx.fillStyle='#c28d6f';ctx.fill();
       ctx.beginPath();ctx.moveTo(...front);ctx.lineTo(...rear);
       ctx.strokeStyle='#955f49';ctx.lineWidth=.7/scale;ctx.stroke();
       for(const flank of a.villageRoof.flanks||[]){
         const [a,b,c,d]=flank.ringXZ;
         ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.lineTo(...c);ctx.lineTo(...d);ctx.closePath();
         ctx.fillStyle=flank.finish==='cool-grid'?'#99aaa6':'#bfbcb1';ctx.fill();
       }
     }
     if(showPassage){
       ctx.globalAlpha=1;
       const width=a.passage.pierWidthMetres;
       ctx.fillStyle='#716e61';
       for(const [x,z] of a.passage.pierCentersXZ)ctx.fillRect(x-width/2,z-width/2,width,width);
     }
     if(showRoof){
       ctx.fillStyle=selectedBuilding?'#ce9873':a.financeWingRoof.capColor;
       ctx.fill(roofCaps);
     }
     if(tower&&!land.satellite&&scale>1.1){
       ctx.fillStyle=selectedBuilding?'#965f43':'#77746b';
       ctx.fill(tower);
     }
     if(!nearby||scale>.55||selectedBuilding){
       ctx.strokeStyle=nearby&&selectedBuilding?'#9b582e':nearby?'#737c71':'#827e6f';
       ctx.lineWidth=(nearby&&selectedBuilding?1.8:nearby?.65:.8)/scale;
       ctx.stroke(path);
     }
     if(a.rooflights&&!land.satellite&&scale>1.1){
       ctx.strokeStyle='#5d878a';ctx.lineCap='butt';
       for(const rooflight of a.rooflights){
         ctx.beginPath();
         ctx.moveTo(...rooflight.axis[0]);
         ctx.lineTo(...rooflight.axis[1]);
         ctx.lineWidth=rooflight.width;ctx.stroke();
       }
     }
   }
   ctx.restore();
 }
 let lastPortrait=null,lastPlanExtent=null;
 function mobileFraming(animate){
   const item=spots.find(a=>a.buildingId==='B023');
   const target=new T.Vector3(item.x,land.h(item.x,item.z),item.z+65);
   setCamera(target,new T.Vector3(-.12,1.38,-.65).normalize(),fspan()/970,animate);
   setPlan([target.x,target.z],Math.max(1,planExtent()/970),animate);
 }
 function isLandscapeView(id){return id==='plaza-turf'||id==='slope-turf'||id==='plaza-trees'||Object.hasOwn(groundViews,id)}
 function focusLandscape(id){
   if(!isLandscapeView(id))return false;
   if(Object.hasOwn(groundViews,id)){
     const {at,gateLocal,targetElevation,span:minimumSpan,planSpan=minimumSpan,width=0,dir,group}=groundViews[id];
     const span=Math.max(minimumSpan,width/(W()/H()));
     if(gateLocal&&!data.gate)return false;
     const [x,z]=gateLocal?toWorld(data.gate,...gateLocal):at;
     const direction=new T.Vector3(...dir);
     if(gateLocal)direction.applyAxisAngle(camera.up,-data.gate.angle);
     landscapeWhite=false;frameGroup(group,false);
     setPlan([x,z],planExtent()/Math.max(planSpan,width/(W()/H())),false);
     setCamera(new T.Vector3(x,targetElevation??land.h(x,z),z),direction.normalize(),fspan()/span,false);
     return true;
   }
   const plaza=id!=='slope-turf',grove=id==='plaza-trees';
   const g=data.gate;
   if(plaza&&!g)return false;
   const [u,v]=grove?[23.6,53.5]:[33,60];
   // Place the grass close-up on the meadow beside the mapped bare trail.
   const [x,z]=plaza?toWorld(g,u,v):[-596.6,-84.6];
   const span=grove?18:plaza?14:9;
   landscapeWhite=false;
   frameGroup(plaza?'campus':'surroundings',false);
   setPlan(grove?toWorld(g,26,50):[x,z],planExtent()/span,false);
   const dir=grove?new T.Vector3(.53,.43,-.84):plaza?new T.Vector3(.34,.53,-.88):new T.Vector3(-.15,.60,.80);
   setCamera(new T.Vector3(x,land.h(x,z)+(grove?3.4:0),z),dir.normalize(),fspan()/span,false);
   if(grove)select({id,name:'广场树阵',x,z,group:'campus'},{focus:false,recordHistory:false});
   return true;
 }
 function resize(){
   mapTransition.finish();
   releasePanBuffer();
   controlBounds=null;
   stageWidth=Math.max(1,stage.clientWidth);
   stageHeight=Math.max(1,stage.clientHeight);
   const ratio=W()/H(),span=fspan(),extent=planExtent();
   const turf=lastPlanExtent!==null&&isLandscapeView(location.hash.slice(1));
   if(turf){
     camera.zoom=T.MathUtils.clamp(camera.zoom*span/(camera.top-camera.bottom),.45,maxModelZoom());
     fz=T.MathUtils.clamp(fz*extent/lastPlanExtent,.5,maxPlanZoom());
   }
   if(orbit)orbit.maxZoom=maxModelZoom();
   Object.assign(camera,{left:-span*ratio/2,right:span*ratio/2,top:span/2,bottom:-span/2});
   camera.updateProjectionMatrix();renderer?.setSize(W(),H(),false);
   flat.width=W()*Math.min(2,devicePixelRatio);flat.height=H()*Math.min(2,devicePixelRatio);
   if(flat.width*flat.height>planPixelBudget&&streetNames.width>1){streetNames.width=1;streetNames.height=1}
   const portrait=W()<640&&H()>W()*1.25;
   if(coverVisible&&!turf)frameExhibit(false);
   else if(!turf&&lastPortrait!==null&&portrait!==lastPortrait&&!selected)frameGroup(group,false,{preserveDirectory:true});
   appliedOffset=NaN;lastPortrait=portrait;lastPlanExtent=extent;
   planGestures.rebase();updateShortPlaceFrame();invalidate();
 }
 function restoreRoute(animate=false){
   const trigger=document.activeElement;
   // Bookmarks of the retired footprint retain their geographic destination.
   if(location.hash==='#B022')history.replaceState(history.state,'','#east-finance-court');
   const id=location.hash.slice(1),spot=spots.find(s=>!s.overviewOnly&&s.id===id);
   const modeQuery=new URL(location.href).searchParams.get('view');
   changeMode(modeQuery==='plan'?'2d':'3d',false);
   if(focusLandscape(id))return;
   const schoolRoad=roadData.roadNames.find(road=>road.id===id);
   let at=null,locationHit=null;
   if(schoolRoad){
     const line=schoolRoad.segments[0].ring;
     const fractions=schoolRoad.source==='dormAccessApproximation'?[.5,.25,.75,.125,.875]:[.5];
     const points=line.slice(1).flatMap((end,i)=>fractions.map(t=>({
       p:[T.MathUtils.lerp(line[i][0],end[0],t),T.MathUtils.lerp(line[i][1],end[1],t)],
       d:Math.abs(i+t-(line.length-1)/2)
     }))).sort((a,b)=>a.d-b.d);
     for(const {p} of points){const hit=roadIndex.hit(p);if(hit?.segment?.name===schoolRoad.name){at=p;locationHit=hit;break}}
   }else if(id.startsWith('road~')){
     const parts=id.split('~');
     if(parts.length===4&&parts[2]&&parts[3]){
       const point=parts.slice(2).map(Number);
       if(point.every(Number.isFinite)){
         const restored=roadIndex.restore(parts[1],point);
         if(restored){at=restored.point;locationHit=restored.hit}
       }
     }
   }
   if(locationHit){
     const local=data.areas.some(a=>a.kind.includes('boundary')&&inside(at,a.ring));
     const category=local?'campus':'surroundings';
     select(roadSpot(locationHit,at,category,roadIndex),{recordHistory:false,trigger,animate});return;
   }
   if(spot){select(spot,{trigger,animate});return}
   const building=byId.get(buildingParts.get(id)||id);
   if(building){pick(building,{trigger,animate});return}
   if(id.startsWith('external-')){
     const building=region.buildings.find(rec=>'external-'+rec.fid===id);
     if(building){pickNearby(building,{trigger,animate});return}
   }
   frameGroup(['dining','surroundings'].includes(id)?id:'campus',animate);
 }
 const overlaps=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
 const scale=$('scale'),updateScale=bindMapScale(scale);
 const needle=$('needle'), roadMarker=$('road-point');
 const controls=[document.querySelector('.masthead'),stage.querySelector('.map-title'),
   stage.querySelector('.nav-tools'),stage.querySelector('.gesture-hint'),$('layers-panel'),
   $('detail'),$('rail'),mapNotice];
 function layoutChanged(){
   controlBounds=null;
   updateShortPlaceFrame();
   // Other overlay movements only need to repaint controls and labels.
   overlayDirty=true;
   requestFrame();
 }
 const overlayObserver=new ResizeObserver(layoutChanged);
 for(const control of controls)overlayObserver.observe(control);
 function reservedLayout(){
   const origin=stage.getBoundingClientRect(), taken=[];
   for(const control of [...controls,scale]){
     if(control.inert||control.hidden)continue;
     // Reserve the destination bounds from the first frame of a panel animation.
     if(control.id==='detail'||control.id==='rail'){
       if(control.offsetWidth)taken.push([control.offsetLeft-4,control.offsetTop-4,
         control.offsetLeft+control.offsetWidth+4,control.offsetTop+control.offsetHeight+4]);
       continue;
     }
     const box=control.getBoundingClientRect();
     if(!box.width||!box.height)continue;
     const left=control===scale?box.right-Math.max(91,box.width):box.left;
     taken.push([left-origin.left-4,box.top-origin.top-4,box.right-origin.left+4,box.bottom-origin.top+4]);
   }
   return taken;
 }
 function moveLabel(element,x,y){
   const position=x.toFixed(1)+'px '+y.toFixed(1)+'px';
   if(element.style.translate!==position)element.style.translate=position;
 }
 new ResizeObserver(resize).observe(stage);resize();updateMode();restoreRoute();
 window.addEventListener('campusthemechange',()=>{syncStudio();layoutChanged();invalidate()});
 document.fonts?.addEventListener('loadingdone',()=>{
   planFontFamily=getComputedStyle(document.documentElement).fontFamily;
   if(coverVisible&&!anim)frameExhibit(false);
   layoutChanged();
 });
 function followHistory(){
   if(location.href===currentRoute)return;
   currentRoute=location.href;restorePlaceFromHistory(restoreRoute);
 }
 window.addEventListener('popstate',followHistory);
 window.addEventListener('hashchange',followHistory);
 stage.addEventListener('mapcontrolschange',layoutChanged);
 const v=new T.Vector3(), projection=new T.Matrix4();
 function paint(drawGeography){
   const plan=mode==='2d', width=W(),height=H();
   const showRoadNames=plan&&labels&&!land.satellite;
   const inlineNames=showRoadNames&&(planGesture==='pinch'||flat.width*flat.height>planPixelBudget);
   const pixelsPerMetre=plan?ppm():height*camera.zoom/fspan();
   if(!$('layers-panel').hidden)syncReferenceLink();
   if(plan&&(drawGeography||inlineNames))drawFlat();
   else if(!plan&&drawGeography){
     land.updateVegetationDetail(pixelsPerMetre,camera,paperFinish()&&!land.satellite,invalidate);
     renderBudget.render(renderer,camera,pixelsPerMetre);
     projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
   }
   const taken=labels?(controlBounds??=reservedLayout()).slice():[];
   if(activeTag)paintTag(activeTag);
   for(const entry of orderedTags)if(entry!==activeTag)paintTag(entry);

   function paintTag({tag,spot:s,plan:flatPoint,world,halfWidth}){
     const category=s.group||'campus';
     const nearby=(selected?.group==='dining'&&category==='campus')||(group==='campus'&&Boolean(s.buildingId));
     const overviewLabel=!coverVisible||s.id==='library'||s.id==='field';
     const readable=!s.roofLabel||s.id===selected?.id||(!s.unnamed&&pixelsPerMetre>=.50);
     const entranceCloseup=!plan&&s.group==='dining'&&s.id===selected?.id&&height/pixelsPerMetre<100;
     if(!labels||!overviewLabel||(category!==group&&!nearby)||(s.overviewOnly&&selected)||!readable||entranceCloseup){
       if(!tag.hidden)tag.hidden=true;
       return;
     }
     let x,y;
     if(plan){
       [x,y]=fpos(flatPoint);
       y-=6;
     }else{
       v.copy(world).applyMatrix4(projection);
       x=(v.x+1)*width/2;
       y=(1-v.y)*height/2-7;
     }
     const box=[x-halfWidth,y-26,x+halfWidth,y+3];
     const hidden=box[0]<2||box[2]>width-2||y<33||y>height-13||taken.some(bounds=>overlaps(box,bounds));
     if(tag.hidden!==hidden)tag.hidden=hidden;
     if(!hidden){
       taken.push(box);
       moveLabel(tag,x,y);
     }
   }

   if(selected?.roadPoint&&!selected.guideRing&&!land.satellite){
     let x,y;
     if(plan)[x,y]=fpos(selected.roadPoint);
     else{
       const {x:wx,z}=selected;
       v.set(wx,land.h(wx,z)+.4,z).applyMatrix4(projection);
       x=(v.x+1)*width/2;y=(1-v.y)*height/2;
     }
     const offscreen=x<0||x>width||y<0||y>height;
     if(roadMarker.hidden!==offscreen)roadMarker.hidden=offscreen;
     if(!offscreen){moveLabel(roadMarker,x,y);taken.push([x-8,y-8,x+8,y+8])}
   }else if(!roadMarker.hidden)roadMarker.hidden=true;
   const hideStreetNames=!showRoadNames||inlineNames;
   if(streetNames.hidden!==hideStreetNames)streetNames.hidden=hideStreetNames;
   if(showRoadNames){
     const layer=inlineNames?flat:streetNames;
     if(layer.width!==flat.width)layer.width=flat.width;
     if(layer.height!==flat.height)layer.height=flat.height;
     const ctx=layer.getContext('2d'),dpi=flat.width/width;
     ctx.setTransform(dpi,0,0,dpi,0,0);
     if(!inlineNames)ctx.clearRect(0,0,width,height);
     drawRoadLabels(ctx,roadIndex,{project:fpos,width,height,pixelsPerMetre,
       worldBounds:[...planWorld([0,0]),...planWorld([width,height])],
       reserved:taken,fontFamily:planFontFamily});
   }
   updateScale(pixelsPerMetre);
   const e=projection.elements;
   const angle=plan?0:Math.atan2(-e[8]*width,-e[9]*height);
   const bearing='rotate('+angle.toFixed(4)+'rad)';
   if(needle.style.transform!==bearing)needle.style.transform=bearing;
   mapTransition.painted();
   dirty=false;overlayDirty=false;
 }
 function tick(now){
   if(pendingModel?.painted)changeMode('3d');
   if(coverVisible&&manual3d)syncStudio();
   updateProjectionOffset(now);
   if(anim){
     const fraction=reducedMotion.matches||mode==='2d'?1:T.MathUtils.clamp((now-anim.start)/anim.duration,0,1);
     const ease=anim.zoomStep?1-(1-fraction)**3:fraction*fraction*(3-2*fraction);
     orbit.target.lerpVectors(anim.fromTarget,anim.target,ease);
     turn.identity().slerp(anim.rotation,ease);
     camera.position.copy(anim.fromDirection).applyQuaternion(turn)
       .multiplyScalar(T.MathUtils.lerp(anim.distance,3000,ease)).add(orbit.target);
     const pullback=Math.sin(Math.PI*fraction)**2*anim.pullback;
     camera.zoom=Math.exp(anim.fromZoom+anim.zoomChange*ease-pullback);
     camera.updateProjectionMatrix();
     orbit.update();
     dirty=true;
     if(fraction>=1)anim=null;
   }
   if(planFlight){
     const {start,duration,from,target,fromZoom,zoomChange}=planFlight;
     const fraction=reducedMotion.matches?1:T.MathUtils.clamp((now-start)/duration,0,1);
     const ease=1-(1-fraction)**3;
     flatCenter=[T.MathUtils.lerp(from[0],target[0],ease),T.MathUtils.lerp(from[1],target[1],ease)];
     fz=Math.exp(fromZoom+zoomChange*ease);
     dirty=true;
     if(fraction>=1)planFlight=null;
   }
   const routeChanged=routeMotion({ring:selected?.guideRing,now,redraw:dirty,inModel:mode==='3d',
     cameraMoving:Boolean(anim||planFlight),visible:!land.satellite,
     reduced:reducedMotion.matches,night:document.documentElement.dataset.theme==='dark'});
   if(dirty||overlayDirty){
     paint(dirty||routeChanged);
     if(!stage.classList.contains('map-ready')){
       stage.classList.add('map-ready');
       finishMapLoad(stage,reducedMotion);
       if(groundNotice&&mapNotice.hidden)setMapNotice(mapNotice,groundNotice);
       document.documentElement.classList.add('campus-fonts');
       bindExhibitMotion(stage,reducedMotion);
       const loadDetail=()=>land.loadDetails(invalidate).catch(()=>{
         // The landscape retains successful layers. Only failed requests run again.
         setTimeout(()=>land.loadDetails(invalidate).catch(error=>{
           console.warn('地表纹理未载入。',error);
           groundNotice='部分地表纹理未载入，刷新可重试。';
           if(mapNotice.hidden)setMapNotice(mapNotice,groundNotice);
         }),550);
       });
       if(window.requestIdleCallback)requestIdleCallback(loadDetail,{timeout:180});
       else setTimeout(loadDetail,32);
       if(mode==='2d')invalidate();
     }
   }else if(routeChanged&&mode==='3d')renderBudget.render(renderer,camera,H()*camera.zoom/fspan());
   frameRequest=null;
   if(dirty||anim||planFlight||appliedOffset!==(coverVisible?coverOffset:0)||stage.hasAttribute('data-route-animating'))requestFrame();
 }
 requestFrame();
 $('source-content').innerHTML=data.sources;
 window.campusExport=async()=>{
   const [{GLTFExporter},snapshot]=await Promise.all([import('./vendor/GLTFExporter.js'),land.exportSnapshot(invalidate)]);
   return new GLTFExporter().parseAsync(snapshot,{binary:true,onlyVisible:true});
 };
}
run().catch(showLoadError);
