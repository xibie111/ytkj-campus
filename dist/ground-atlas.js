import {paintNorthShore} from './north-shoreline.js';
import {paintOuterWestRevetment} from './outer-west-revetment.js';
import {paintNorthwestRevetment} from './northwest-revetment-shape.js';

export function polygonPath(ctx,ring,closed) {
  ctx.beginPath();
  ring.forEach(([x,z],i)=>i?ctx.lineTo(x,z):ctx.moveTo(x,z));
  if(closed)ctx.closePath();
}

// The grass and exposed soil on Dongshan's northern forest edge appear
// in the 2024 and 2025 source images. The November 2026 10 m data corroborates the sparse cover.
const dongshanNorthVerge=[
  [551.7,-428.4],[542.2,-416.3],[543.6,-409.9],[548.8,-407.0],[559.6,-407.0],[571.1,-409.9],
  [578.2,-412.7],[576.5,-417.2],[570.8,-421.9],[566.1,-428.5],[559.0,-430.8]
];

// Continuous open grass and soil on the campus-facing western slope.
// Both 2024/2025 images show the boundary above the separate red-soil face.
const westCampusWoodMargin=[
  [-348.9,-168.2],[-350.6,-152.4],[-354.5,-137.9],[-351.8,-122.3],[-344.9,-112.0],[-334.8,-109.7],
  [-328.9,-114.1],[-324.4,-128.4],[-325.3,-143.0],[-336.6,-165.6],[-343.5,-169.4]
];

// Shared core of the grass opening uphill from the north verge, across both dated scenes.
const eastUpperGrass=[
  [614.7,-530.4],[609.3,-522.6],[610.9,-516.8],[614.4,-510.8],[619.6,-509.3],[624.3,-512.4],
  [626.8,-518.3],[626.1,-522.9],[619.9,-528.2]
];

function paintFeatheredGround(ctx,ring,colour) {
  const {a:scaleX,d:scaleZ}=ctx.getTransform();
  const offset=ctx.canvas.width;
  ctx.save();
  // Draw the soft mask from the shadow of a path outside the atlas.
  ctx.translate(-offset/scaleX,0);
  ctx.shadowOffsetX=offset;
  ctx.shadowBlur=5*Math.max(scaleX,scaleZ);
  ctx.shadowColor=colour;
  ctx.fillStyle='#000';
  polygonPath(ctx,ring,true);
  ctx.fill();
  ctx.restore();
}

export function fitGroundAtlas(ctx,[left,top,right,bottom]) {
  const {width,height}=ctx.canvas,w=right-left,d=bottom-top;
  ctx.setTransform(width/w,0,0,height/d,-left*width/w,-top*height/d);
}

// Sparse scrub between the revetment and the inland track. The footprint
// follows 2024/2025 imagery; 10 m scenes corroborate the cover through November 2026.
const coastalScrub = [
  [-229,-1148],[-207,-1141],[-191,-1133],[-208,-1114],[-231,-1087],
  [-252,-1069],[-271,-1065],[-271,-1081],[-256,-1105],[-240,-1135]
];

function paintCoastalScrub(ctx) {
  ctx.save();
  ctx.shadowBlur=4;
  ctx.shadowColor='rgba(165,146,113,.14)';
  ctx.fillStyle='rgba(165,146,113,.38)';
  polygonPath(ctx,coastalScrub,true);
  ctx.fill();
  ctx.restore();
}

export function paintGroundAtlas(ctx,bounds,source,woods,tone,cover) {
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(source,0,0,ctx.canvas.width,ctx.canvas.height);
  fitGroundAtlas(ctx,bounds);
  for(const {ring} of woods){
    polygonPath(ctx,ring,true);
    ctx.fillStyle='rgba(89,122,87,.08)';
    ctx.fill();
  }
  if(cover)ctx.drawImage(cover,-1600,-1600,3200,3200);
  paintCoastalScrub(ctx);
  ctx.save();
  ctx.globalCompositeOperation='soft-light';
  ctx.drawImage(tone,-1600,-1600,3200,3200);
  ctx.restore();
  paintFeatheredGround(ctx,dongshanNorthVerge,'rgba(169,159,123,.53)');
  paintFeatheredGround(ctx,westCampusWoodMargin,'rgba(165,146,122,.51)');
  paintFeatheredGround(ctx,eastUpperGrass,'rgba(157,151,115,.49)');
  paintNorthShore(ctx);
  paintOuterWestRevetment(ctx);
  paintNorthwestRevetment(ctx);
}

export function prepareGroundAtlas(width,height,bounds,source,woods,tone,cover) {
  if(typeof Worker!=='function'||typeof OffscreenCanvas!=='function'||typeof createImageBitmap!=='function'){
    return null;
  }
  let worker;
  try{worker=new Worker(new URL('./ground-atlas-worker.js',import.meta.url),{type:'module'})}
  catch{return null}
  return new Promise(resolve=>{
    function finish(result) {
      if(!worker)return;
      clearTimeout(timer);
      worker.terminate();
      worker=null;
      resolve(result);
    }
    const timer=setTimeout(()=>finish(null),20000);
    worker.onmessage=({data})=>finish(data);
    worker.onerror=event=>{event.preventDefault();finish(null)};
    worker.onmessageerror=()=>finish(null);
    Promise.allSettled([source,tone,cover].map(image=>image?createImageBitmap(image):Promise.resolve(null))).then(results=>{
      const bitmaps=results.map(result=>result.value);
      if(!worker||results.some(result=>result.status==='rejected')){
        for(const bitmap of bitmaps)bitmap?.close();
        finish(null);
        return;
      }
      const [source,tone,cover]=bitmaps;
      try{worker.postMessage({width,height,bounds,source,woods,tone,cover},bitmaps.filter(Boolean))}
      catch{for(const bitmap of bitmaps)bitmap?.close();finish(null)}
    });
  });
}
