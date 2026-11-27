import * as T from './vendor/three.module.js';
import {buildRoadGeometry} from './road-geometry.js';
import {pavingFill,pavingMetres,pavingNormal,pavingTexture} from './paving-materials.js';

// Drape observed ground-cover polygons on the same indexed terrain used by roads.
const lift=.030;
const defaultTile='grit';

export function createGroundCoverPatch(terrain,bounds,{name,polygons,sources,materials,coverKey}) {
  const profiles=Object.fromEntries(Object.entries(materials).map(([style,{tile=defaultTile}])=>
    [style,{lift,period:pavingMetres(tile),angle:0}]));
  const batches=buildRoadGeometry({bounds,polygons,profiles,
    positions:terrain.attributes.position.array,normals:terrain.attributes.normal.array,indices:terrain.index.array});
  const group=new T.Group();
  group.name=name;
  group.userData={source:sources};
  for(const {style,position,normal,index,uv,tangent} of batches){
    const geometry=new T.BufferGeometry(),{label,colour,opacity=1,tile=defaultTile}=materials[style];
    geometry.setAttribute('position',new T.BufferAttribute(position,3));
    geometry.setAttribute('normal',new T.BufferAttribute(normal,3));
    geometry.setAttribute('uv',new T.BufferAttribute(uv,2));
    geometry.setAttribute('tangent',new T.BufferAttribute(tangent,4));
    geometry.setIndex(new T.BufferAttribute(index,1));
    const material=new T.MeshStandardMaterial({
      map:pavingTexture(tile,colour),normalMap:pavingNormal(tile),roughness:1,
      opacity,transparent:opacity<1,depthWrite:opacity===1
    });
    const mesh=new T.Mesh(geometry,material);
    mesh.name=label;
    mesh.userData={groundCover:true,[coverKey]:style,displayOffsetMetres:lift};
    mesh.receiveShadow=true;
    group.add(mesh);
  }

  const paths=new Map();
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(const {style,ring,holes} of polygons){
    if(!paths.has(style))paths.set(style,new Path2D());
    const path=paths.get(style);
    for(const loop of [ring,...holes]){
      path.moveTo(...loop[0]);
      for(const [x,z] of loop){
        path.lineTo(x,z);
        minX=Math.min(minX,x);maxX=Math.max(maxX,x);
        minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
      }
      path.closePath();
    }
  }
  function drawPlan(ctx,[west,north,east,south]){
    if(maxX<west||minX>east||maxZ<north||minZ>south)return;
    ctx.save();
    for(const [style,path] of paths){
      const {colour,opacity=1,tile=defaultTile}=materials[style];
      ctx.globalAlpha=opacity;
      ctx.fillStyle=pavingFill(ctx,tile,colour);
      ctx.fill(path,'evenodd');
    }
    ctx.restore();
  }
  return {group,drawPlan};
}
