import * as T from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {captureDetailHeight, focusDetail, hideDetail, mapIcon, menu, restoreDetailFocus, restorePlaceFromHistory, setupDirectory, showDetail} from './campus-ui.js';
import {bindMapScale, createMapTransition, finishMapLoad, setMapNotice, showLoadError} from './map-motion.js';
import {bindExhibitMotion} from './exhibit-motion.js';
import {motionTiming} from './motion-timing.js';
import {bindPlanGestures} from './plan-gestures.js';
import {drawRing, extent, inside, makeGround} from './huangbohai-ground.js';
import {makeSports} from './huangbohai-sports.js';

const $=id=>document.getElementById(id);
document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=mapIcon(el.dataset.icon);});
const json=async path=>{const r=await fetch(path);if(!r.ok)throw Error(path+' '+r.status);return r.json();};
const surfaces={teaching:'#d4c5a1',teachingBlock:'#d4c5a1',teachingLink:'#c0b8a1',dorm:'#cab596',exchange:'#b7c1b6',cultural:'#b5b9a8',stadium:'#9badac',diningPodium:'#bead91',stand:'#a5a79c',link:'#bbb8aa',entranceGarden:'#91a678'};
const overviewPlaces=['J1','J5','stadium','service-G2','dining','track','culture','northwest-gate'];
const directions=new T.Vector3(.83,.94,1.18).normalize();
const clamp=T.MathUtils.clamp;

async function run() {
  const buildingUrl=new URL('data/huangbohai-buildings.glb',document.baseURI);
  let initialBuildings;
  if(new URL(location.href).searchParams.get('view')!=='plan'&&typeof WebGL2RenderingContext!=='undefined'){
    const controller=new AbortController();
    const response=fetch(buildingUrl,{signal:controller.signal,priority:'low'}).then(result=>{
      if(!result.ok)throw Error('建筑文件 '+result.status);
      return result.arrayBuffer();
    }).then(bytes=>({bytes}),error=>({error}));
    initialBuildings={controller,response};
  }
  const [model,ground,sportsData,courtData]=await Promise.all([
    json('data/huangbohai-models.json'),json('data/huangbohai-ground.json'),
    json('data/huangbohai-sports.json'),json('data/huangbohai-courts.json')
  ]);
  const records=model.buildings, byCode=new Map(records.map(row=>[row.code,row]));
  const site=await makeGround(ground,model,sportsData,courtData);
  const facilities=[makeSports(sportsData),makeSports(courtData,{ownerCode:'courts'})];
  const areas=records.flatMap(b=>{
    const shapes=b.polygons.map(poly=>({...poly,building:b}));
    for(const key of ['southwestPavilion','northeastPavilion']){
      const pavilion=b.entryGarden?.[key];
      if(pavilion)shapes.push({ring:pavilion.roofRingXZ,holes:[],building:b,pavilion:true});
    }
    return shapes;
  });
  const points=areas.flatMap(a=>a.ring), frame=extent([...points,...model.phase1BoundaryXZ]);
  const center=[(frame[0]+frame[2])/2,(frame[1]+frame[3])/2];
  const stage=$('stage'), flat=$('flat'), canvas=$('view'), ctx=flat.getContext('2d');
  const places=new Map(), rows=new Map(), tags=new Map(), sourceContent=$('source-content');
  const aliases={stadium:'体育馆 体育与健康学院',J4:'马克思主义学院 马克思学院 J4-501',J5:'J5 教学楼 J5-807 会议室 教务处 J5-809 学工处 J5-810',
    S2:'S2栋 黄渤海校区-S2栋'};
  for (const b of records) {
    const garden=b.entryGarden;
    places.set(b.code,{id:b.code,name:b.name,targets:[b],at:b.labelXZ,
      keywords:[b.code,b.name,aliases[b.code],garden&&'校门 校名景墙'].filter(Boolean).join(' '),
      icon:garden?'gate':null,note:garden?'校名六字从左至右排在入口绿岛的浅色石屏上。':b.publicNote,
      source:garden?.photo.page||b.facadeEvidence?.page||model.sources[b.nameSource||b.identificationSource]||model.sources.plan});
  }
  const field={code:'track',name:'田径场',labelXZ:sportsData.centerXZ,baseM:sportsData.support.levelM,
    displayHeightM:0,polygons:[{ring:sportsData.support.ring,holes:[]}]};
  places.set(field.code,{id:field.code,name:field.name,targets:[field],at:field.labelXZ,keywords:'田径场 足球场 操场 跑道 运动场',
    source:sportsData.sources.photo,note:'跑道和足球场依据校方实拍及卫星影像定位，分道与足球区线按标准尺寸近似绘制。'});
  const courtPolygons=courtData.supports.map(s=>({ring:s.ring,holes:[]}));
  const [cw,cn,ce,cs]=extent(courtPolygons.flatMap(p=>p.ring));
  const basketball={code:'courts',name:'中央篮球场',labelXZ:[(cw+ce)/2,(cn+cs)/2],polygons:courtPolygons,
    baseM:courtData.supports.reduce((sum,s)=>sum+s.levelM,0)/courtData.supports.length,displayHeightM:0};
  const fullCount=courtData.courts.filter(c=>c.form==='full').length;
  const halfCount=courtData.courts.filter(c=>c.form==='half').length;
  places.set(basketball.code,{id:basketball.code,name:basketball.name,targets:[basketball],at:basketball.labelXZ,
    keywords:'中央篮球场 篮球场 全场 半场 运动场',source:courtData.sources.guide,
    note:fullCount+' 片全场，'+halfCount+' 片半场。划线和篮架按标准尺寸近似建模，场坪标高取自高程网格。'});
  for (const service of model.services || []) {
    // A named podium can be both a building and a service. Keep its own footprint and deep link.
    const existing=places.get(service.id);
    const targets=existing?.targets || service.buildings.map(code=>byCode.get(code));
    const at=existing?.at || targets.reduce(([x,z],b)=>[x+b.labelXZ[0]/targets.length,z+b.labelXZ[1]/targets.length],[0,0]);
    const groundLevelM=service.atGround?Math.max(site.h(...at),...targets.map(b=>b.baseM)):undefined;
    places.set(service.id,{id:service.id,name:service.name,targets,at,groundLevelM,viewFrom:service.viewFrom,icon:service.icon,
      keywords:[service.name,service.buildings.join(' '),service.keywords].join(' '),note:service.note,
      source:service.source || model.sources.guide});
  }
  const namedRoads=[];
  for(const road of ground.roads.filter(r=>r.name&&r.labelXZ)){
    const id=road.ownerCode||road.id;
    const polygons=ground.roadSurfaces.filter(p=>p.ownerCode===id);
    if(!polygons.length)continue;
    const target={code:id,labelXZ:road.labelXZ,baseM:site.h(...road.labelXZ),displayHeightM:0,polygons};
    const place={id,name:road.name,at:road.labelXZ,targets:[target],keywords:road.name,
      icon:'pin',source:road.source,sourceLabel:road.sourceLabel,note:road.publicNote||'沿校区西北侧经过，西北门在这条路上。',road:true};
    places.set(place.id,place);namedRoads.push(place);
  }
  function credit(text,href){
    const p=document.createElement('p');
    if(href){const a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=text+' ↗';p.append(a);}
    else p.textContent=text;
    sourceContent.append(p);
  }
  credit('建筑轮廓依据一期工程总图、校方导览和公开影像。部分楼高和立面采用近似尺寸。');
  credit('楼脚与教学楼内院采用同组模型的基座高程，与周围地形平滑衔接。场坪标高和台阶仍待实测。');
  credit('一期工程总平面图',model.sources.plan); credit('校园生活指南',model.sources.guide);
  credit('黄渤海校区教学部门办公地点','https://jwc.ytkj.edu.cn/info/1121/3827.htm');
  credit('田径场实景与校园航拍',sportsData.sources.photo);
  credit('SinoLC-1 地表分类 · Li 等 · CC BY 4.0','https://doi.org/10.5281/zenodo.7709370');
  credit('2025 年土地覆盖 · Impact Observatory、Microsoft、Esri · CC BY 4.0','https://livingatlas.arcgis.com/landcoverexplorer/');
  credit('校外田地季相 · Contains modified Copernicus Sentinel data (2026)','https://cds.climate.copernicus.eu/licences/ec-sentinel');
  credit('Data available from the U.S. Geological Survey · Landsat 8/9','https://www.usgs.gov/landsat-missions/landsat-collection-2-level-2-science-products');
  credit('道路数据 · © OpenStreetMap 贡献者 · ODbL','https://www.openstreetmap.org/copyright');
  for(const source of ground.sources || []) {
    if(typeof source==='string')credit(source);else credit(source.label,source.url);
  }
  for(const item of [ground.texture,ground.dem])if(item?.attribution)credit(item.attribution);
  const modelDownload=document.createElement('a');modelDownload.href='huangbohai-campus.glb';modelDownload.download='';
  modelDownload.textContent='下载校区三维模型';const downloadRow=document.createElement('p');downloadRow.append(modelDownload);sourceContent.append(downloadRow);
  const scene=new T.Scene();
  scene.add(site.group,...facilities.map(f=>f.group));
  scene.add(new T.HemisphereLight(0xfff8e8,0xb8beb0,1.9));
  const light=new T.DirectionalLight(0xfff1db,2.1);
  light.position.set(-440,780,-260); scene.add(light);
  light.castShadow=true;
  const shadowExtent=Math.hypot(site.bounds[2]-site.bounds[0],site.bounds[3]-site.bounds[1])*.59;
  Object.assign(light.shadow.camera,{left:-shadowExtent,right:shadowExtent,top:shadowExtent,bottom:-shadowExtent,near:10,far:1850});
  light.shadow.camera.updateProjectionMatrix();light.shadow.mapSize.set(1024,1024);
  light.shadow.normalBias=.43;light.shadow.bias=-.0001;light.shadow.intensity=.65;
  const camera=new T.OrthographicCamera(-500,500,500,-500,1,12000);
  let renderer,control,loadedScene,modelReady,modelFailed=false,modelFramed=false,contextLost=false;
  const pickable=facilities.flatMap(f=>f.picks),meshOwners=new Map();
  const roadMeshes=[];
  site.group.traverse(mesh=>{
    if(mesh.isMesh&&places.get(mesh.userData.ownerCode)?.road){
      pickable.push(mesh);roadMeshes.push([mesh.userData.ownerCode,[mesh]]);
    }
  });
  const facilityPickCount=pickable.length;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const mapTransition=createMapTransition(stage,reducedMotion);
  const updateScale=bindMapScale($('scale'));
  let modelRequest;
  let mode='plan',selected=null,satellite=false,names=true,queued=false,worldDirty=true,overview=true;
  let planAt=[...center],planScale=1,initialZoom=1,manualPosition=false;
  let viewSpan=850,glSpan=850,verticalOffset=.035;
  let lastWidth=0,lastHeight=0;
  const dims=()=>[lastWidth,lastHeight];
  const dark=()=>document.documentElement.dataset.theme==='dark';
  const mapNotice=$('map-notice');
  function notify(msg){setMapNotice(mapNotice,msg||site.groundNotice);}
  function updateURL(id,view,replace=false){
    const url=new URL(location.href);url.hash=id||'';
    if(view==='plan')url.searchParams.set('view','plan');else url.searchParams.delete('view');
    if(url.href!==location.href)history[replace?'replaceState':'pushState'](null,'',url);
    currentURL=location.href;
  }
  function requestFrame(){if(!queued){queued=true;requestAnimationFrame(draw);}}
  function invalidate(){worldDirty=true;requestFrame();}
  let flight=null,zoomGoal=null;
  function interrupt(){flight=null;zoomGoal=null;}
  function moveView(apply,animate,duration=motionTiming.enter){
    flight=null;
    if(!animate||reducedMotion.matches||!duration){apply(1);return;}
    flight={apply,start:performance.now(),duration};
    invalidate();
  }
  function aimPlan(at,scale,animate){
    const from=planAt,old=planScale;
    moveView(p=>{
      planAt=[T.MathUtils.lerp(from[0],at[0],p),T.MathUtils.lerp(from[1],at[1],p)];
      planScale=old*(scale/old)**p;
    },animate);
  }
  function setOverview(value){
    overview=value;
    const exhibit=value?'overview':'browse';
    if(stage.dataset.exhibit!==exhibit)stage.dataset.exhibit=exhibit;
  }
  function unitsForPlan(){return viewSpan/lastHeight/planScale;}
  function planPixel([x,z]){
    const [w,h]=dims(), units=unitsForPlan();
    return [w/2+(x-planAt[0])/units,h*(overview?.60:.53)+(z-planAt[1])/units];
  }
  function planWorld([x,y]){
    const [w,h]=dims(), units=unitsForPlan();
    return [planAt[0]+(x-w/2)*units,planAt[1]+(y-h*(overview?.60:.53))*units];
  }
  function proj([x,z],y){
    if(mode==='plan')return planPixel([x,z]);
    const v=new T.Vector3(x,y,z).project(camera);
    return [(v.x+1)*lastWidth/2,(1-v.y)*lastHeight/2];
  }
  function cameraBox(){
    const [w,h]=dims(),a=w/h;
    camera.left=-glSpan*a/2;camera.right=glSpan*a/2;camera.top=glSpan/2;camera.bottom=-glSpan/2;
    camera.setViewOffset(w,h,0,-h*verticalOffset,w,h);camera.updateProjectionMatrix();
  }
  function frameModel(at,height,span,resetDirection=false,animate=false,viewDirection=null){
    if(!control)return;
    modelFramed=true;
    const dir=viewDirection|| (resetDirection?directions.clone():camera.position.clone().sub(control.target).normalize());
    if(!dir.lengthSq())dir.copy(directions);
    const target=new T.Vector3(at[0],height,at[1]);
    function position(direction,spanNow){
      camera.position.copy(control.target).addScaledVector(direction,2800);
      camera.zoom=1;glSpan=spanNow;cameraBox();control.update();
    }
    if(!animate||mode!=='model'){
      control.target.copy(target);position(dir,span);return;
    }
    const from=control.target.clone(),old=glSpan/camera.zoom;
    const startDir=camera.position.clone().sub(control.target).normalize();
    const rotation=new T.Quaternion().setFromUnitVectors(startDir,dir);
    const offset=new T.Vector3(),turn=new T.Quaternion();
    moveView(p=>{
      control.target.lerpVectors(from,target,p);
      position(offset.copy(startDir).applyQuaternion(turn.identity().slerp(rotation,p)),old*(span/old)**p);
    },true);
  }
  function wholeCampus(animate=false,{preserveDirectory=false}={}){
    manualPosition=false;
    interrupt();if(!preserveDirectory)select(null,false);setOverview(true);
    aimPlan([...center],1,animate&&mode==='plan');
    const [w,h]=dims(),fw=frame[2]-frame[0],fh=frame[3]-frame[1];
    viewSpan=Math.max(fh/.76,fw/(w/h*.88));
    const right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),directions).normalize();
    const up=new T.Vector3().crossVectors(directions,right).normalize();
    const [west,north,east,south]=site.bounds;
    const corners=[[west,north],[west,south],[east,south],[east,north]];
    const block=corners.flatMap(([x,z])=>[site.bottom,site.h(x,z)].map(y=>new T.Vector3(x,y,z)));
    const projected=extent(block.map(p=>[right.dot(p),up.dot(p)]));
    const title=document.querySelector('.map-title').getBoundingClientRect();
    const top=title.bottom-stage.getBoundingClientRect().top+Math.max(10,h*.018);
    const bottom=h-Math.max(32,h*.055), side=Math.max(12,w*.035);
    initialZoom=Math.max((projected[2]-projected[0])*h/(w-2*side),(projected[3]-projected[1])*h/Math.max(90,bottom-top));
    const target=new T.Vector3(center[0],site.h(...center),center[1]);
    target.addScaledVector(right,(projected[0]+projected[2])/2-right.dot(target));
    target.addScaledVector(up,(projected[1]+projected[3])/2-up.dot(target));
    verticalOffset=(top+bottom)/(2*h)-.5;
    frameModel([target.x,target.z],target.y,initialZoom,true,animate);
    invalidate();
  }
  function highlight(){
    if(!loadedScene)return;
    const active=new Set((selected?.targets||[]).map(b=>b.code));
    for(const [owner,meshes] of [...meshOwners,...roadMeshes]){
      for(const mesh of meshes){
        if(!mesh.userData.baseMaterial)mesh.userData.baseMaterial=mesh.material;
        if(active.has(owner)){
          if(!mesh.userData.focusMaterial){
            mesh.userData.focusMaterial=mesh.userData.baseMaterial.clone();
            mesh.userData.focusMaterial.emissive?.setHex(0x393023);
          }
          mesh.material=mesh.userData.focusMaterial;
        }else mesh.material=mesh.userData.baseMaterial;
      }
    }
  }
  function select(place,focus=true,trigger=document.activeElement,animate=false){
    planGestures.cancel();
    const animateDetail=stage.classList.contains('map-ready');
    const previousHeight=place&&captureDetailHeight(place.id,animateDetail);
    selected=place;menu(false,false);highlight();
    for(const [id,row] of rows){row.classList.toggle('active',id===(place?.id||'home'));if(id===(place?.id||'home'))row.setAttribute('aria-current','location');else row.removeAttribute('aria-current');}
    if(!place){hideDetail();invalidate();return;}
    setOverview(false);$('detail-name').textContent=place.name;
    $('detail-note').textContent=place.note||'';
    $('detail-note').hidden=!place.note;
    const b=place.targets[0];
    const showHeight=byCode.has(place.id)&&Number.isFinite(b.displayHeightM)&&b.displayHeightM>0;
    let heightText='楼高约 '+b.displayHeightM+' 米'+(b.measuredHeight?'':'（估算）');
    if(b.entryGarden)heightText='景墙高约 '+b.displayHeightM.toFixed(1)+' 米（估算）';
    if(b.displayHeightOnly)heightText='示意高度 '+b.displayHeightM+' 米';
    $('detail-data').textContent=showHeight?heightText:'';
    $('detail-data').hidden=!showHeight;
    $('building-source').textContent=(place.sourceLabel||(place.road?'看道路命名公告':place.source===model.sources.ancillaryTable?'看工程清单':place.source===model.sources.plan?'看工程总图':place.source===model.sources.guide?'看校方后勤指南':'看校方资料'))+' ↗';
    $('building-source').href=place.source;$('building-source').hidden=!place.source;
    showDetail(place.id,animateDetail,previousHeight);
    if(focus){
      manualPosition=false;
      const box=extent(place.targets.flatMap(target=>target.polygons.flatMap(p=>p.ring)));
      const aspect=stage.clientWidth/stage.clientHeight;
      const garden=b.entryGarden;
      let span=Math.max(90,box[3]-box[1]+43,(box[2]-box[0]+45)/Math.min(1.3,aspect))*1.48;
      if(b.viewSpanM)span=Math.max(b.viewSpanM,b.viewSpanM/aspect);
      if(garden)span=Math.max(29,34/aspect);
      if(place.road)span=Math.max(125,90/aspect);
      let direction=null;
      if(garden)direction=new T.Vector3(-garden.inwardXZ[0],.52,-garden.inwardXZ[1]).normalize();
      else if(place.viewFrom||b.viewFrom)direction=new T.Vector3(...(place.viewFrom||b.viewFrom)).normalize();
      else if(b.facadeEvidence?.viewFromXZ){
        const [x,z]=b.facadeEvidence.viewFromXZ;
        direction=new T.Vector3(x,.46,z).normalize();
      }
      interrupt();
      aimPlan([...place.at],clamp(viewSpan/span,.15,60),animate&&mode==='plan');
      const targetLevel=place.groundLevelM===undefined?b.baseM+b.displayHeightM*.4:place.groundLevelM+2.4;
      verticalOffset=.035;frameModel(place.at,targetLevel,span,false,animate,direction);
    }
    focusDetail(trigger);invalidate();
  }
  function choose(place,trigger){updateURL(place.id,mode);select(place,true,trigger,true);}
  function directoryRow(id,name,keywords,key,chooseRow){
    const button=document.createElement('button');
    button.className='item';button.dataset.group='campus';button.dataset.search=keywords;
    const symbol=document.createElement('i');symbol.innerHTML=mapIcon(key);
    const title=document.createElement('span');title.textContent=name;
    button.append(symbol,title);button.onclick=()=>chooseRow(button);
    $('landmarks').append(button);rows.set(id,button);
  }
  directoryRow('home','校园全景','校园全景 总览','map',()=>{wholeCampus(true);updateURL(null,mode);});
  for(const place of places.values()){
    const kind=place.targets[0].kind;
    const key=place.icon || (place.name.includes('餐厅')?'dining':
      (/球场|田径场|体育|看台/.test(place.name)||kind==='stadium')?'sports':
      kind?.startsWith('teaching')?'teaching':
      !byCode.has(place.id)?'pin':'cube');
    directoryRow(place.id,place.name,place.keywords,key,button=>choose(place,button));
    const tag=document.createElement('button');tag.className='tag';tag.textContent=place.name;tag.hidden=true;tag.dataset.place=place.id;
    if(place.id==='track'||place.id==='courts')tag.dataset.compactDetailLabel='';
    tag.onclick=()=>choose(place,tag);$('labels').append(tag);tags.set(place.id,tag);
  }
  setupDirectory(rows,[])('campus');
  function addModels(){
    if(modelReady)return modelReady;
    const loader=new GLTFLoader();
    const prepared=initialBuildings?.response;
    initialBuildings=null;
    const loading=prepared?prepared.then(({bytes,error})=>{
      if(error)throw error;
      return loader.parseAsync(bytes,new URL('.',buildingUrl).href);
    }):loader.loadAsync(buildingUrl.href);
    modelReady=loading.then(gltf=>{
      loadedScene=gltf.scene;
      loadedScene.traverse(node=>{
        if(!node.isMesh)return;
        let parent=node;
        while(parent&&!parent.userData.buildingId)parent=parent.parent;
        const code=parent?.userData.buildingId;
        if(!code||!byCode.has(code))return;
        node.userData.ownerCode=code;node.castShadow=true;node.receiveShadow=true;pickable.push(node);
        if(!meshOwners.has(code))meshOwners.set(code,[]);
        meshOwners.get(code).push(node);
      });
      if(meshOwners.size!==byCode.size)throw Error('建筑目录与三维文件不一致');
      scene.add(loadedScene);renderer.shadowMap.needsUpdate=true;highlight();invalidate();
    }).catch(err=>{
      if(loadedScene)scene.remove(loadedScene);
      modelReady=null;loadedScene=null;meshOwners.clear();pickable.length=facilityPickCount;
      if(mode==='model'||modelRequest){
        setMode('plan');notify('三维模型没能载入。可以再点「三维模型」重试。');
      }
      console.error(err);
    });
    return modelReady;
  }
  function ensureRenderer(){
    if(modelFailed||contextLost)return false;
    if(renderer)return true;
    try {
      renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
      renderer.setClearColor(0,0);renderer.setPixelRatio(Math.min(devicePixelRatio,2));
      renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;
      renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.13;
      renderer.setSize(stage.clientWidth,stage.clientHeight,false);
      control=new OrbitControls(camera,canvas);control.enableDamping=false;control.minZoom=.32;control.maxZoom=35;
      control.maxPolarAngle=Math.PI*.469;
      let interacting=false;
      control.addEventListener('start',()=>{interrupt();interacting=true;});
      control.addEventListener('change',()=>{if(interacting){manualPosition=true;setOverview(false)}invalidate();});
      control.addEventListener('end',()=>{interacting=false;});
      canvas.addEventListener('webglcontextlost',e=>{
        const wasFocused=document.activeElement===canvas;
        e.preventDefault();contextLost=true;setMode('plan');$('model').disabled=true;
        notify('图形连接中断，已显示平面地图。');
        if(wasFocused)flat.focus({preventScroll:true});
      });
      canvas.addEventListener('webglcontextrestored',()=>{
        contextLost=false;renderer.shadowMap.needsUpdate=true;$('model').disabled=false;
        notify('三维画面已恢复，可以切回三维模型。');
      });
      return true;
    }catch{modelFailed=true;$('model').disabled=true;return false;}
  }
  function setMode(target){
    if(modelRequest){modelRequest=null;$('model').removeAttribute('aria-busy');notify('');}
    if(target==='model'&&!ensureRenderer()){target='plan';notify('当前浏览器使用平面地图。');}
    if(target==='plan'&&initialBuildings){
      initialBuildings.controller.abort();
      initialBuildings=null;
    }
    const oldMode=mode;
    if(oldMode!==target){
      planGestures.cancel();
      flight?.apply(1);interrupt();
      if(modelFailed||contextLost)mapTransition.finish();
      else mapTransition.hold(oldMode==='plan'?flat:canvas,target==='plan'?flat:canvas);
    }
    mode=target;
    if(oldMode!==mode&&control&&!overview&&(manualPosition||!selected)){
      if(mode==='plan'){planAt=[control.target.x,control.target.z];planScale=viewSpan/(glSpan/camera.zoom);}
      else frameModel(planAt,site.h(...planAt),viewSpan/planScale);
    }
    flat.inert=flat.hidden=mode!=='plan';canvas.inert=canvas.hidden=mode!=='model';$('north').disabled=mode==='plan';$('plan').setAttribute('aria-pressed',String(mode==='plan'));
    $('model').setAttribute('aria-pressed',String(mode==='model'));
    $('gesture-text').textContent=mode==='plan'?'拖动移地图 · 用滚轮放大或缩小':'拖动换角度 · 用滚轮放大或缩小';
    if(mode==='model')addModels();
    invalidate();
  }
  async function changeMode(target){
    if(target==='model'&&mode==='plan'&&!loadedScene&&!modelFailed){
      if(modelRequest)return;
      const request={};modelRequest=request;
      $('model').setAttribute('aria-busy','true');notify('正在准备三维模型…');
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      if(modelRequest!==request)return;
      if(ensureRenderer())await addModels();
      if(modelRequest!==request)return;
    }
    setMode(target);
    if(mode==='model'&&(!modelFramed||overview)){if(selected)select(selected);else wholeCampus();}
    if(mode==='model')notify('');
    updateURL(selected?.id,mode);
  }
  $('model').onclick=()=>changeMode('model');$('plan').onclick=()=>changeMode('plan');
  function planDraw(){
    const [w,h]=dims(),ratio=flat.width/w;
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);
    ctx.fillStyle=dark()?'#e7e4dc':'#f6f4ed';ctx.fillRect(0,0,w,h);
    const units=unitsForPlan(), origin=planPixel([0,0]);
    ctx.translate(origin[0],origin[1]);ctx.scale(1/units,1/units);
    const [l,t,r,b]=site.bounds;ctx.drawImage(site.maps[Number(satellite)],l,t,r-l,b-t);
    if(!satellite)site.drawPlanDetail(ctx,[
      -origin[0]*units,-origin[1]*units,(w-origin[0])*units,(h-origin[1])*units
    ],1/units);
    site.drawRoadPlan(ctx);
    if(selected?.road){
      ctx.beginPath();
      for(const polygon of selected.targets[0].polygons){
        drawRing(ctx,polygon.ring);for(const hole of polygon.holes)drawRing(ctx,hole);
      }
      ctx.fillStyle='#bb784e';ctx.fill('evenodd');
    }
    for(const facility of facilities)facility.draw(ctx,units,!satellite);
    const chosen=new Set(selected?.targets.map(t=>t.code));
    for(const area of areas){
      ctx.beginPath();drawRing(ctx,area.ring);for(const hole of area.holes||[])drawRing(ctx,hole);
      const colour=area.pavilion?'#d9d7c8':surfaces[area.building.kind]||'#b6b2a2';
      ctx.fillStyle=chosen.has(area.building.code)?'#bb784e':colour;
      ctx.fill('evenodd');ctx.lineWidth=clamp(.8*units,.35,2.4);ctx.strokeStyle='#575a4c';ctx.stroke();
      if(area.pavilion)continue;
      if(area.building.roofInset&&units<1.25){
        ctx.beginPath();drawRing(ctx,area.building.roofInset.ring);
        ctx.fillStyle='#858c88';ctx.fill();
        for(const part of area.building.facadeEvidence?.roofParts||[]){
          ctx.beginPath();drawRing(ctx,part.ring);
          ctx.fillStyle=part.kind==='field'?'#969b93':'#e2dfcf';ctx.fill();
          ctx.strokeStyle='#757b72';ctx.lineWidth=Math.min(units*.8,.3);ctx.stroke();
        }
      }
      if(units<1.25){
        for(const part of area.building.roofAccessories?.parts??[]){
          ctx.beginPath();drawRing(ctx,part.ring);
          ctx.fillStyle=part.kind==='housing'?'#dfd9c9':'#b4b6a8';ctx.fill();
          ctx.strokeStyle='#757b72';ctx.lineWidth=Math.min(units*.8,.3);ctx.stroke();
        }
      }
      const roofBands=area.building.roofFinishEvidence?.bandsXZ;
      if(roofBands?.length&&units<1.25){
        ctx.beginPath();
        for(const band of roofBands)drawRing(ctx,band);
        ctx.fillStyle=chosen.has(area.building.code)?'#925f48':'#777e70';
        ctx.fill();
      }
      const passage=area.building.facadeEvidence?.raisedPassage?.planRingXZ;
      if(passage&&units<1.25){
        ctx.beginPath();drawRing(ctx,passage);
        ctx.fillStyle='#858c88';ctx.fill();
        ctx.strokeStyle='#757b72';ctx.lineWidth=Math.min(units*.8,.3);ctx.stroke();
      }
      const garden=area.building.entryGarden;
      if(garden){
        ctx.beginPath();
        for(const ring of (units<.18&&garden.panelRingsXZ)||[garden.signRingXZ])drawRing(ctx,ring);
        ctx.fillStyle='#e4d6be';ctx.fill();
        ctx.lineWidth=Math.min(units,.16);ctx.strokeStyle='#766c55';ctx.stroke();
      }
    }
  }
  function placeTags(){
    const visible=[];
    if(selected)visible.push(selected.id);
    const close=mode==='plan'?unitsForPlan()<.85:glSpan/camera.zoom/lastHeight<.85;
    if(names)visible.push(...overviewPlaces,...(close?places.keys():[]));
    const shown=new Set(),boxes=[];
    const stageRect=stage.getBoundingClientRect();
    const occupied=['.map-title','.masthead','.nav-tools','#detail','#rail'].map(sel=>document.querySelector(sel))
      .filter(el=>el&&!el.hidden&&!el.inert).map(el=>{const r=el.getBoundingClientRect();return [r.left-stageRect.left-4,r.top-stageRect.top-4,r.right-stageRect.left+4,r.bottom-stageRect.top+4];});
    const overlaps=(a,b)=>a[0]<b[2]&&b[0]<a[2]&&a[1]<b[3]&&b[1]<a[3];
    for(const code of new Set(visible)){
      const btn=tags.get(code),place=places.get(code);if(!place)continue;
      const height=place.groundLevelM??Math.max(...place.targets.map(b=>b.baseM+b.displayHeightM));
      const [x,y]=proj(place.at,height+3);
      const tw=Math.max(46,btn.textContent.length*12+13),box=[x-tw/2-4,y-27,x+tw/2+4,y+5];
      if(box[0]<2||box[1]<5||box[2]>lastWidth-2||box[3]>lastHeight-5||boxes.some(b=>overlaps(b,box))||occupied.some(b=>overlaps(b,box)))continue;
      boxes.push(box);shown.add(code);
      if(btn.hidden)btn.hidden=false;
      const position=x.toFixed(2)+'px '+y.toFixed(2)+'px';
      if(btn.style.translate!==position)btn.style.translate=position;
      btn.classList.toggle('selected',selected?.id===code);
    }
    for(const [code,btn] of tags)if(!shown.has(code)&&!btn.hidden)btn.hidden=true;
  }
  function draw(now){
    queued=false;
    if(flight){
      worldDirty=true;
      const p=reducedMotion.matches?1:clamp((now-flight.start)/flight.duration,0,1);
      flight.apply(1-(1-p)**3);
      if(p===1)interrupt();else invalidate();
    }
    if(worldDirty){
      if(mode==='model'&&renderer){
        const metresPerPixel=glSpan/camera.zoom/stage.clientHeight;
        for(const facility of facilities)facility.worldPixel.value=metresPerPixel;
        camera.updateMatrixWorld();renderer.render(scene,camera);
      }else planDraw();
      worldDirty=false;
    }
    placeTags();
    updateScale(mode==='plan'?1/unitsForPlan():lastHeight*camera.zoom/glSpan);
    if(mode==='plan'||loadedScene)mapTransition.painted();
    $('needle').style.transform='rotate('+(mode==='model'?-control.getAzimuthalAngle():0)+'rad)';
  }
  const ray=new T.Raycaster();
  let tap=null;
  canvas.addEventListener('pointerdown',e=>{tap=e.isPrimary&&e.button===0?[e.clientX,e.clientY]:null;});
  canvas.addEventListener('pointercancel',()=>{tap=null;});
  canvas.addEventListener('pointerup',e=>{
    if(!tap||!e.isPrimary||Math.hypot(e.clientX-tap[0],e.clientY-tap[1])>5){tap=null;return;}
    tap=null;const rect=canvas.getBoundingClientRect();
    ray.setFromCamera(new T.Vector2(2*(e.clientX-rect.left)/rect.width-1,1-2*(e.clientY-rect.top)/rect.height),camera);
    const hit=ray.intersectObjects(pickable,false)[0];if(hit)choose(places.get(hit.object.userData.ownerCode),canvas);
  });
  const planGestures=bindPlanGestures(flat,{worldAt:planWorld,zoomLevel:()=>planScale,interrupt,
    place(anchor,pixel,zoom){manualPosition=true;setOverview(false);planScale=clamp(zoom,.32,60);const after=planWorld(pixel);
      planAt=[planAt[0]+anchor[0]-after[0],planAt[1]+anchor[1]-after[1]];invalidate();},
    pick(at){const hit=[...areas].reverse().find(a=>inside(at,a.ring)&&!(a.holes||[]).some(h=>inside(at,h)));
      if(hit){choose(places.get(hit.building.code),flat);return;}
      const facility=facilities.find(f=>f.supports.some(s=>inside(at,s.ring)));
      if(facility){choose(places.get(facility.ownerCode),flat);return;}
      const road=namedRoads.find(p=>p.targets[0].polygons.some(a=>inside(at,a.ring)&&!a.holes.some(h=>inside(at,h))));
      if(road)choose(road,flat);}
  });
  function zoom(factor){
    planGestures.cancel();
    manualPosition=true;
    setOverview(false);
    const plan=mode==='plan',old=plan?planScale:camera.zoom;
    const target=clamp((zoomGoal??old)*factor,.32,plan?60:35);
    zoomGoal=target;
    moveView(p=>{
      const value=old*(target/old)**p;
      if(plan)planScale=value;
      else{camera.zoom=value;cameraBox();}
    },true,motionTiming.quick);
    invalidate();
  }
  $('plus').onclick=()=>zoom(1.34);$('minus').onclick=()=>zoom(1/1.34);
  $('home').onclick=()=>{wholeCampus(true);updateURL(null,mode);};
  $('north').onclick=()=>{
    interrupt();manualPosition=true;
    if(mode==='model'){
      const from=camera.position.clone().sub(control.target),angle=Math.atan2(from.x,from.z),radius=Math.hypot(from.x,from.z);
      moveView(p=>{const a=angle*(1-p);camera.position.set(Math.sin(a)*radius,from.y,Math.cos(a)*radius).add(control.target);control.update();},true);
    }
    invalidate();
  };
  for(const element of [canvas,flat]) element.addEventListener('keydown',e=>{
    if(e.key==='+'||e.key==='=')zoom(1.34);else if(e.key==='-')zoom(1/1.34);
    else if(e.key.startsWith('Arrow')){
      interrupt();manualPosition=true;
      const x=Number(e.key==='ArrowRight')-Number(e.key==='ArrowLeft'),y=Number(e.key==='ArrowDown')-Number(e.key==='ArrowUp');
      setOverview(false);
      if(mode==='plan'){const step=unitsForPlan()*40;planAt=[planAt[0]+x*step,planAt[1]+y*step];}
      else{const step=glSpan/camera.zoom/stage.clientHeight*40,az=control.getAzimuthalAngle();
        const delta=new T.Vector3(Math.cos(az)*x+Math.sin(az)*y,0,-Math.sin(az)*x+Math.cos(az)*y).multiplyScalar(step);
        control.target.add(delta);camera.position.add(delta);control.update();}
      invalidate();
    }else return;e.preventDefault();
  });
  $('satellite').disabled=!site.imageryAvailable;
  $('satellite').onclick=()=>{
    satellite=!satellite;
    site.setSatellite(satellite);
    for(const facility of facilities)facility.setSatellite(satellite);
    stage.classList.toggle('satellite',satellite);
    $('satellite').setAttribute('aria-pressed',String(satellite));
    invalidate();
  };
  $('names').onclick=()=>{names=!names;$('names').setAttribute('aria-pressed',String(names));invalidate();};
  $('close-detail').onclick=()=>{select(null,false);updateURL(null,mode);restoreDetailFocus();};
  function size(){
    const w=stage.clientWidth,h=stage.clientHeight;if(w===lastWidth&&h===lastHeight)return;
    mapTransition.finish();lastWidth=w;lastHeight=h;const dpr=Math.min(devicePixelRatio,2);flat.width=Math.round(w*dpr);flat.height=Math.round(h*dpr);
    renderer?.setSize(w,h,false); if(overview)wholeCampus(false,{preserveDirectory:true});else{cameraBox();invalidate();}
    planGestures.rebase();
  }
  let currentURL=location.href;
  function restore(animate=false){
    setMode(new URL(location.href).searchParams.get('view')==='plan'?'plan':'model');
    let name='';try{name=decodeURIComponent(location.hash.slice(1));}catch{}
    const place=places.get(name);if(place)select(place,true,document.activeElement,animate);else wholeCampus(animate);
  }
  $('plan').disabled=false;$('model').disabled=false;$('layers-button').disabled=false;
  new ResizeObserver(size).observe(stage);stage.addEventListener('mapcontrolschange',requestFrame);
  window.addEventListener('campusthemechange',invalidate);
  function followHistory(){
    if(currentURL===location.href)return;
    currentURL=location.href;restorePlaceFromHistory(restore);
  }
  window.addEventListener('popstate',followHistory);window.addEventListener('hashchange',followHistory);
  size();restore();if(mode==='model')await modelReady;
  stage.classList.add('map-ready');finishMapLoad(stage,reducedMotion);
  if(mapNotice.hidden&&site.groundNotice)notify(site.groundNotice);
  document.documentElement.classList.add('campus-fonts');
  bindExhibitMotion(stage,reducedMotion);
  document.fonts?.ready.then(()=>{if(overview)wholeCampus(false,{preserveDirectory:true});invalidate();});
  invalidate();
}
run().catch(showLoadError);
