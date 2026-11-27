import {shadeMeadowRows} from './meadow-colours.js';

self.addEventListener('message',({data:{pixels,width,height,mask,bounds}})=>{
  shadeMeadowRows(pixels,width,height,mask,bounds);
  self.postMessage(pixels,[pixels.buffer]);
});
