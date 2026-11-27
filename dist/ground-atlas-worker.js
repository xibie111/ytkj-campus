import {paintGroundAtlas} from './ground-atlas.js';

self.onmessage=({data:{width,height,bounds,source,woods,tone,cover}})=>{
  const canvas=new OffscreenCanvas(width,height);
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  paintGroundAtlas(ctx,bounds,source,woods,tone,cover);
  source.close();
  tone.close();
  cover?.close();
  const pixels=ctx.getImageData(0,0,width,height);
  self.postMessage(pixels,[pixels.data.buffer]);
};
