import * as T from './vendor/three.module.js';
import {buildRoadGeometry} from './road-geometry.js';
import {pavingFill,pavingMetres,pavingNormal,pavingTexture} from './paving-materials.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

const classes = {
  courtyard: {name:'教学庭院铺地', colour:'#c9bd9e', alpha:.90, finish:'courtyardSetts'},
  courtPlanting: {name:'教学庭院种植区', colour:'#859563', alpha:.85, finish:'meadow'},
  gateTurf: {name:'西北门门房前草地', colour:'#849761', alpha:1, detail:true, finish:'meadow'},
  gatePlanting: {name:'西北门临街种植床', colour:'#72814d', alpha:1, detail:true, finish:'plantedSoil'},
  campusVegetation: {name:'校园植被', colour:'#889764', alpha:.77, finish:'meadow'},
  cropland: {name:'校外耕地', colour:'#93955d', alpha:.62, finish:'fieldSoil'},
  openVegetation: {name:'校外开阔植被', colour:'#a0a170', alpha:.60, finish:'openGrass'}
};

function materialTile(style) {
  const canvas=document.createElement('canvas'), size=192;
  canvas.width=canvas.height=size;
  const brush=canvas.getContext('2d');
  brush.fillStyle=classes[style].colour; brush.fillRect(0,0,size,size);
  let seed=8609;
  function random() {
    seed=(Math.imul(1664525,seed)+1013904223)>>>0;
    return seed/4294967296;
  }
  for(let i=0;i<2400;i++) {
    const x=random()*size, y=random()*size;
    const light=random()>.5;
    brush.fillStyle=light?'rgba(255,244,201,.22)':'rgba(46,58,30,.15)';
    if(style==='gatePlanting'&&i%5===0)brush.fillStyle=light?'rgba(215,181,111,.32)':'rgba(99,114,54,.28)';
    brush.fillRect(x,y, .7+random()*2, .7+random()*2.8);
  }
  if(style==='courtyard') {
    brush.strokeStyle='rgba(82,77,61,.23)'; brush.lineWidth=1;
    for(let y=0;y<size;y+=16) {
      brush.beginPath(); brush.moveTo(0,y); brush.lineTo(size,y); brush.stroke();
      for(let x=((y/16)%2)*16;x<size;x+=32) {
        brush.beginPath(); brush.moveTo(x,y); brush.lineTo(x,y+16); brush.stroke();
      }
    }
  }
  return canvas;
}

function materialPattern(ctx, style, satellite) {
  const {colour}=classes[style];
  const originalGrain=style==='campusVegetation'||style==='courtPlanting';
  const finish=satellite&&!originalGrain?null:classes[style].finish;
  const tile=finish?pavingTexture(finish,colour).image:materialTile(style);
  const pattern=ctx.createPattern(tile,'repeat');
  pattern.setTransform(new DOMMatrix().scale(finish?pavingMetres(finish)/tile.width:.038));
  return pattern;
}

function pathFor(polygon) {
  const path=new Path2D();
  for(const loop of [polygon.ring,...polygon.holes]) {
    path.moveTo(...loop[0]);
    for(let i=1;i<loop.length;i++)path.lineTo(...loop[i]);
    path.closePath();
  }
  return path;
}

const regionalFinishes = [
  {finish:'drySoil', strength:.55, name:'未分类地表'},
  {finish:'fieldSoil', strength:.90, name:'外围耕地表土'},
  {finish:'openGrass', strength:.74, name:'外围开阔植被'}
];

export function makeRegionalTerrain(geometry,bounds,polygons,baseMaterial) {
  const [west,north,east,south]=bounds;
  const mask=document.createElement('canvas');
  mask.width=Math.ceil(east-west);
  mask.height=Math.ceil(south-north);
  const ctx=mask.getContext('2d',{willReadFrequently:true});
  const sx=mask.width/(east-west),sz=mask.height/(south-north);
  ctx.setTransform(sx,0,0,sz,-west*sx,-north*sz);
  // The mask samples published model regions. Its pixel spacing is not
  // the source imagery resolution and adds no newly inferred boundaries.
  for(const [style,colour] of [['cropland','#ff0000'],['openVegetation','#00ff00']]){
    ctx.fillStyle=colour;
    for(const polygon of polygons){
      if(polygon.style===style)ctx.fill(pathFor(polygon),'evenodd');
    }
  }
  const pixels=ctx.getImageData(0,0,mask.width,mask.height).data;
  const {position,normal}=geometry.attributes;
  const metres=pavingMetres('drySoil');
  const uv1=new Float32Array(position.count*2),tangents=new Float32Array(position.count*4);
  for(let i=0;i<position.count;i++){
    uv1[2*i]=position.getX(i)/metres;
    uv1[2*i+1]=-position.getZ(i)/metres;
    const nx=normal.getX(i),ny=normal.getY(i),length=Math.hypot(nx,ny);
    tangents[4*i]=ny/length;
    tangents[4*i+1]=-nx/length;
    tangents[4*i+3]=1;
  }
  geometry.setAttribute('uv1',new T.BufferAttribute(uv1,2));
  geometry.setAttribute('tangent',new T.BufferAttribute(tangents,4));
  const source=geometry.index.array;
  const groups=regionalFinishes.map(()=>[]);
  for(let i=0;i<source.length;i+=3){
    const a=source[i],b=source[i+1],c=source[i+2];
    const x=(position.getX(a)+position.getX(b)+position.getX(c))/3;
    const z=(position.getZ(a)+position.getZ(b)+position.getZ(c))/3;
    const u=Math.min(mask.width-1,Math.max(0,Math.floor((x-west)*sx)));
    const v=Math.min(mask.height-1,Math.max(0,Math.floor((z-north)*sz)));
    const offset=4*(u+v*mask.width);
    const type=pixels[offset+3]<192?0:pixels[offset+1]>pixels[offset]?2:1;
    groups[type].push(a,b,c);
  }
  const indices=new source.constructor(source.length);
  geometry.clearGroups();
  let offset=0;
  for(const [i,group] of groups.entries()){
    if(!group.length)continue;
    indices.set(group,offset);
    geometry.addGroup(offset,group.length,i);
    offset+=group.length;
  }
  geometry.setIndex(new T.BufferAttribute(indices,1));
  const materials=regionalFinishes.map(({finish,strength,name})=>{
    const surface=baseMaterial.clone();
    const normalMap=pavingNormal(finish).clone();
    normalMap.channel=1;
    normalMap.repeat.setScalar(metres/pavingMetres(finish));
    normalMap.needsUpdate=true;
    surface.name=name;
    surface.normalMap=normalMap;
    surface.normalScale.setScalar(strength);
    return surface;
  });
  return {materials,setMap(map,showGrain){
    materials.forEach((surface,i)=>{
      surface.map=map;
      surface.normalScale.setScalar(showGrain?regionalFinishes[i].strength:0);
      surface.needsUpdate=true;
    });
  }};
}

export function makeLandPlanDetail(polygons,siteBounds) {
  const regions=polygons.filter(({style})=>classes[style]?.finish).map(polygon=>{
    const [x,z]=polygon.ring[0];
    const bounds=[x,z,x,z];
    for(const [px,pz] of polygon.ring){
      bounds[0]=Math.min(bounds[0],px);
      bounds[1]=Math.min(bounds[1],pz);
      bounds[2]=Math.max(bounds[2],px);
      bounds[3]=Math.max(bounds[3],pz);
    }
    return {finish:classes[polygon.style].finish,path:pathFor(polygon),bounds};
  });
  return function draw(ctx,[west,north,east,south],scale){
    if(scale<5)return;
    const [left,top,right,bottom]=siteBounds;
    const x=Math.max(left,west),z=Math.max(top,north);
    const width=Math.min(right,east)-x,height=Math.min(bottom,south)-z;
    if(width<=0||height<=0)return;
    ctx.save();
    ctx.globalCompositeOperation='soft-light';
    // A low-contrast grain carries across the board at close range. Only
    // the mapped regions below receive a land-class-specific pattern.
    ctx.globalAlpha=Math.min(.34,(scale-4)/15);
    ctx.fillStyle=pavingFill(ctx,'drySoil','#808080');
    ctx.fillRect(x,z,width,height);
    ctx.globalAlpha=Math.min(.66,(scale-4)/7);
    for(const {finish,path,bounds:[l,t,r,b]} of regions){
      if(r<west||b<north||l>east||t>south)continue;
      ctx.fillStyle=pavingFill(ctx,finish,'#808080');
      ctx.fill(path,'evenodd');
    }
    ctx.restore();
  };
}

export function drawLand(ctx, data, satellite, fieldSeason) {
  const fills={};
  ctx.save();
  for(const polygon of [...data.polygons,...(data.gatePlanting?.patches||[])]) {
    const style=polygon.style, path=pathFor(polygon);
    fills[style]??=materialPattern(ctx,style,satellite);
    ctx.fillStyle=fills[style];
    ctx.globalAlpha=classes[style].alpha*(satellite ? .12 : 1);
    ctx.fill(path,'evenodd');
  }
  ctx.restore();
  if(!satellite&&fieldSeason){
    const [w,n,e,s]=data.fieldSeason.boundsXZ;
    ctx.drawImage(fieldSeason,w,n,e-w,s-n);
  }
}

const leafColours=['#71845d','#798e60','#899a6a'];

export function drawTrackTrees(ctx, trees){
  if(!trees)return;
  ctx.save();
  for(const [i,t] of trees.groups.entries()){
    ctx.beginPath();ctx.ellipse(t.x,t.z,t.r*.92,t.r,.47*i,0,Math.PI*2);
    ctx.fillStyle=leafColours[i%3];ctx.globalAlpha=t.h>10?.55:.85;ctx.fill();
  }
  ctx.restore();
}

export function makeTrackTrees(data,heightAt){
  const group=new T.Group(),wood=[],foliage=leafColours.map(()=>[]);
  group.name=data.name; group.userData={groupsXZ:data.groups,source:data.source,limits:data.limits};
  const vertical=new T.Vector3(0,1,0), rotation=new T.Quaternion();
  function branch(a,b,r1,r2){
    const axis=b.clone().sub(a), length=axis.length();
    const geo=new T.CylinderGeometry(r2,r1,length,6);
    geo.applyQuaternion(rotation.setFromUnitVectors(vertical,axis.normalize()));
    geo.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);wood.push(geo);
  }
  for(const [i,{x,z,h,r}] of data.groups.entries()){
    const y=heightAt(x,z),root=new T.Vector3(x,y,z),sparse=h>10;
    branch(root,new T.Vector3(x,y+h*.96,z),r*.075,.015);
    for(let j=0;j<8;j++){
      const az=2.39996*j+i*.91, fraction=j/8;
      const reach=r*(1-.52*fraction);
      const a=new T.Vector3(x,y+h*(.29+.45*fraction),z);
      const b=new T.Vector3(x+Math.cos(az)*reach*.8,y+h*(.53+.42*fraction),z+Math.sin(az)*reach*.8);
      branch(a,b,.055*(1-.48*fraction),.012);
      if(sparse){
        const twig=b.clone().add(new T.Vector3(Math.sin(az)*r*.22,h*.05,-Math.cos(az)*r*.22));
        branch(a.clone().lerp(b,.55),twig,.025,.006);
      }
      const radius=r*(sparse?.28:.58)*(1-.33*fraction);
      const geo=new T.IcosahedronGeometry(1,1).scale(radius,radius*(sparse?1.38:1.76),radius*.9);
      const top=Math.min(b.y,y+h-radius*(sparse?1.38:1.76));
      geo.rotateY(az).translate(b.x,top,b.z);foliage[(i+j)%3].push(geo);
    }
  }
  function mesh(parts,name,colour){
    const surface=new T.Mesh(mergeGeometries(parts),new T.MeshStandardMaterial({color:colour,roughness:1}));
    surface.name=name;surface.castShadow=true;surface.receiveShadow=true;group.add(surface);
    for(const part of parts)part.dispose();
  }
  mesh(wood,'树干与分枝','#777363');
  foliage.forEach((parts,i)=>mesh(parts,'北端树冠 '+(i+1),leafColours[i]));
  return group;
}

export function makeLandMeshes(data,terrain,bounds,material) {
  const group=new T.Group();
  group.name='黄渤海校区庭院与地表覆盖';
  // The complete export retains the field contours in metres alongside the
  // baked terrain map. The smaller on-campus precincts also get terrain faces.
  group.userData={sourceBoundsXZ:data.bounds,metrics:data.metrics,sources:data.sources,
    limits:data.limits,fieldPolygonsXZ:data.polygons.filter(p=>['cropland','openVegetation'].includes(p.style))};
  if(data.fieldSeason)group.userData.fieldSeason=data.fieldSeason;
  const gates=data.gatePlanting;
  const entrance=new T.Group();
  entrance.name=gates?.name||'西北门临街绿化';
  if(gates) {
    entrance.userData={sources:gates.sources,limits:gates.limits};
    group.add(entrance);
  }
  const polygons=data.polygons.filter(p=>['courtyard','courtPlanting','campusVegetation'].includes(p.style));
  polygons.push(...(gates?.patches||[]));
  const profiles=Object.fromEntries(Object.entries(classes).map(([style,info])=>
    [style,{lift:info.detail ? .027 : .018,period:info.finish?pavingMetres(info.finish):1,angle:0}]));
  const batches=buildRoadGeometry({bounds,profiles,polygons,positions:terrain.attributes.position.array,
    normals:terrain.attributes.normal.array,indices:terrain.index.array});
  const [w,n,e,s]=bounds;
  const detailedSurfaces=new Map();
  for(const {style,position,normal,index,uv:tileUV,tangent} of batches) {
    const geometry=new T.BufferGeometry(), uv=new Float32Array(position.length/3*2);
    for(let i=0;i<position.length/3;i++) {
      uv[2*i]=(position[3*i]-w)/(e-w);
      uv[2*i+1]=1-(position[3*i+2]-n)/(s-n);
    }
    geometry.setAttribute('position',new T.BufferAttribute(position,3));
    geometry.setAttribute('normal',new T.BufferAttribute(normal,3));
    const garden=classes[style].detail;
    geometry.setAttribute('uv',new T.BufferAttribute(garden?tileUV:uv,2));
    geometry.setIndex(new T.BufferAttribute(index,1));
    let surface=material;
    if(garden) {
      const {finish,colour}=classes[style];
      geometry.setAttribute('tangent',new T.BufferAttribute(tangent,4));
      surface=new T.MeshStandardMaterial({
        map:pavingTexture(finish,colour),normalMap:pavingNormal(finish),roughness:1
      });
    } else if(classes[style].finish) {
      geometry.setAttribute('uv1',new T.BufferAttribute(tileUV,2));
      geometry.setAttribute('tangent',new T.BufferAttribute(tangent,4));
      const finish=classes[style].finish;
      if(!detailedSurfaces.has(finish)) {
        const normalMap=pavingNormal(finish).clone();
        normalMap.channel=1;
        normalMap.needsUpdate=true;
        const detail=material.clone();
        detail.normalMap=normalMap;
        detailedSurfaces.set(finish,detail);
      }
      surface=detailedSurfaces.get(finish);
    }
    const mesh=new T.Mesh(geometry,surface);
    mesh.name=classes[style].name;
    mesh.receiveShadow=true;
    mesh.userData={landCoverClass:style,displayOffsetMetres:profiles[style].lift,...data.metrics[style]};
    (garden ? entrance : group).add(mesh);
  }
  return {group,setMap(map,showGrain){
    for(const surface of detailedSurfaces.values()){
      surface.map=map;
      surface.normalScale.setScalar(showGrain?1:0);
      surface.needsUpdate=true;
    }
  }};
}
