import {buildRoadGeometry} from './road-geometry.js';

self.addEventListener('message',({data})=>{
  const batches=buildRoadGeometry(data);
  const transfer=batches.flatMap(({position,normal,index,uv,tangent})=>
    (uv?[position,normal,index,uv,tangent]:[position,normal,index]).map(attribute=>attribute.buffer));
  self.postMessage(batches,transfer);
});
