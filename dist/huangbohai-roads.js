import * as T from './vendor/three.module.js';
import {buildRoadGeometry} from './road-geometry.js';
import {pavingFill,pavingMetres,pavingNormal,pavingTexture} from './paving-materials.js';

const styles={
  trafficMedian: {name:'芝樱路中央分隔带',colour:'#7a8860',tile:'grit'},
  crossing: {name:'人行横道标线',colour:'#deded2',tile:'asphalt'},
  yellowMarking: {name:'生活区黄色网格线',colour:'#d9bd71',tile:'asphalt'},
  trunk: {name:'G228 丹东线',colour:'#737b79',tile:'asphalt',ownerCode:'hbh-g228'},
  frontage: {name:'芝樱路',colour:'#858d8a',tile:'asphalt',ownerCode:'hbh-zhiying-road'},
  drive: {name:'校内车行道',colour:'#989b93',tile:'asphalt'},
  cultureWaveBlue: {name:'风雨操场波纹深蓝铺面',colour:'#596a9d',tile:'grit'},
  cultureWaveLight: {name:'风雨操场波纹浅蓝铺面',colour:'#789cc1',tile:'grit'},
  walk: {name:'人行铺装',colour:'#cebd9f',tile:'stone'},
  linkGrayApron: {name:'中央连廊北端灰色接铺',colour:'#b1b7ab',tile:'grit'},
  cultureNorthApron: {name:'文化中心北广场浅灰铺地',colour:'#b5beb7',tile:'stone'},
  courtWalk: {name:'中央球场环形步道',colour:'#6d929f',tile:'grit'},
  courtBlueWalk: {name:'中央球场西弧蓝色铺面',colour:'#5784af',tile:'grit'},
  courtLine: {name:'S5 西南场坪白色划线',colour:'#f2f1e3',tile:'asphalt'},
  practiceLine: {name:'中央西组绿色小场划线',colour:'#edeedf',tile:'asphalt'},
  practiceSurface: {name:'中央西组绿色小场',colour:'#57734f',tile:'grit'},
  courtSurfaceBlue: {name:'S5 西南场坪蓝色面层',colour:'#596a97',tile:'grit'},
  courtSurfaceTeal: {name:'S5 西南场坪青色面层',colour:'#4f8182',tile:'grit'},
  gardenWalk: {name:'博雅楼花园步道',colour:'#c7bca4',tile:'stone',ownerCode:'hbh-boya-garden'},
  boyaApron: {name:'博雅楼南角铺地',colour:'#b9bbb8',tile:'stone'},
  lightFarmLaneGround: {name:'西北田间浅色地表',colour:'#bcab8a',tile:'drySoil'},
};
// The material scale is illustrative. Road boundaries come from the site data.
const profiles=Object.fromEntries(Object.entries(styles).map(([key,style])=>
  [key,{lift:.035,period:pavingMetres(style.tile),angle:0}]));

export function makeCampusRoads(polygons,terrain,bounds) {
  const paths=new Map();
  for(const {style,ring,holes} of polygons){
    if(!paths.has(style))paths.set(style,new Path2D());
    const path=paths.get(style);
    for(const loop of [ring,...holes]){
      path.moveTo(...loop[0]);
      for(let i=1;i<loop.length;i++)path.lineTo(...loop[i]);
      path.closePath();
    }
  }
  const batches=buildRoadGeometry({bounds,polygons,profiles,
    positions:terrain.attributes.position.array,normals:terrain.attributes.normal.array,indices:terrain.index.array});
  const group=new T.Group();
  group.name='黄渤海校区道路与步道';
  for(const {style,position,normal,index,uv,tangent} of batches){
    const profile=styles[style],geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.BufferAttribute(position,3));
    geometry.setAttribute('normal',new T.BufferAttribute(normal,3));
    geometry.setAttribute('uv',new T.BufferAttribute(uv,2));
    geometry.setAttribute('tangent',new T.BufferAttribute(tangent,4));
    geometry.setIndex(new T.BufferAttribute(index,1));
    const material=new T.MeshStandardMaterial({map:pavingTexture(profile.tile,profile.colour),
      normalMap:pavingNormal(profile.tile),roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
    const mesh=new T.Mesh(geometry,material);
    mesh.name=profile.name;
    mesh.userData={surfaceStyle:style,displayOffsetMetres:profiles[style].lift,illustrativeMaterial:profile.tile};
    if(profile.ownerCode)mesh.userData.ownerCode=profile.ownerCode;
    mesh.receiveShadow=true;
    group.add(mesh);
  }
  function drawPlan(ctx) {
    ctx.save();
    for(const [style,path] of paths){
      const {tile,colour}=styles[style];
      ctx.fillStyle=pavingFill(ctx,tile,colour);
      ctx.fill(path,'evenodd');
    }
    ctx.restore();
  }
  return {group,drawPlan};
}
