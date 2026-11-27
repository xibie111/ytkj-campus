// A university map may name only part of an OSM way. Keep adjoining unnamed
// sections selectable without extending that name to the whole source line.
export function indexedRoads(data) {
  const ranges=new Map();
  for(const road of data.roadNames||[]){
    if(road.source!=='university')continue;
    for(const section of road.segments){
      const list=ranges.get(section.wayId)||[];
      list.push({...section,name:road.name,extentNote:road.extentNote,sourceLabel:road.sourceLabel});
      ranges.set(section.wayId,list);
    }
  }
  const segments=data.segments.flatMap(road=>{
    const sections=ranges.get(road.id);
    if(!sections)return [road];
    const out=[];let start=0;
    for(const s of sections.slice().sort((a,b)=>a.fromIndex-b.fromIndex)){
      if(s.fromIndex>start)out.push({...road,ring:road.ring.slice(start,s.fromIndex+1)});
      out.push({...road,name:s.name,nameSource:'university',extentNote:s.extentNote,nameSourceLabel:s.sourceLabel,ring:road.ring.slice(s.fromIndex,s.toIndex+1)});
      start=s.toIndex;
    }
    if(start<road.ring.length-1)out.push({...road,ring:road.ring.slice(start)});
    return out;
  });
  return {...data,segments};
}

const areas={
  'xianjing-entry-court':'仙境食府前场','wenhua-entry-court':'文化餐厅前场',
  'east-outer-footway':'东山坡道人行道','north-gate-vehicle-apron':'北门车道'
};
const roadTypes={primary:'城市主路',secondary:'城市道路',tertiary:'城市支路',residential:'街巷',unclassified:'支路',service:'服务道路',pedestrian:'步行道',footway:'步行道',path:'步道'};
const dormRoadNames = {
  1073365608: '主校区宿舍主路',
  1073365600: '博文苑环路',
  1073365610: '博文苑北侧道路'
};
const roadDescriptions={
  '创意大道':'从文化餐厅门前沿路走，能走到图文楼西北侧的路口。这段路把餐厅和观海广场一带连了起来。',
  '学府路':'从图文楼南侧横路沿观海广场东边往北，可接仙境西路。',
  '仙境西路':'北门外的这条路叫仙境西路。沿着这条路找到白色校名墙，就到了蓬莱校区北门。',
  '仙境食府前场':'仙境食府台阶前的这片空地与旁边道路相接。从这里往楼看，可以认出食府的主入口。',
  '文化餐厅前场':'这片铺地紧挨文化餐厅的弧形门面，另一边是创意大道。',
  '东山坡道人行道':'这条窄路贴着东山坡道的外侧。把沙盘转到侧面，可以看到步道跟着坡面起伏。',
  '北门车道':'这段车道在白色校名墙旁，从仙境西路转进校门。墙后就是观海广场。',
  '主校区宿舍主路':'这条路把 1–5 号公寓一带接到田径场，校方的校园巴士也经过这片宿舍区。',
  '博文苑环路':'这条路绕过一排排公寓。从 20 号楼附近沿环路可以认出通往球场的方向。',
  '博文苑北侧道路':'这条路从博文苑北侧接上环路。'
};

export function roadSpot(hit,point,group,index){
  const record=hit.segment||hit.area;
  const road=hit.segment;
  const approximate=record.source==='dormAccessApproximation';
  const name=record.name||dormRoadNames[record.id]||areas[record.id]||roadTypes[record.kind]||'道路';
  const precision=road?.widthSource==='osmWidth'?'资料路宽':'模型估宽';
  const observedSource=hit.pavement?.sourceLabel;
  const width=!observedSource&&road&&Number.isFinite(road.width)?precision+'约 '+road.width+' 米':'';
  const source=observedSource||(approximate?'虚线为步行示意，走线与入口待核':
    record.nameSource==='university'?'路名据'+(record.nameSourceLabel||'校方导览'):
    record.source==='osm'?'OpenStreetMap':
    record.source==='gatePhoto'?'校方北门照片':record.sourceLabel||'校方实景近似重建');
  // Keep short links where centimetre rounding still identifies this exact section.
  const rounded=point.map(value=>Number(value.toFixed(2)));
  const check=index.hit(rounded);
  const [x,z]=check&&(check.segment||check.area)===record?rounded:point;
  return {id:['road',record.id,x,z].join('~'),roadPoint:[x,z],x,z,group,name,span:150,
    guideRing:approximate?road.ring:undefined,
    note:approximate?record.basis:roadDescriptions[name]||(record.nameSource==='university'?record.extentNote||'':''),
    meta:[width,record.surface==='asphalt'?'沥青':null,source].filter(Boolean).join(' · ')};
}
