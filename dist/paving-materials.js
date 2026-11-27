import * as T from './vendor/three.module.js';

// Dimensions are illustrative material-scale dimensions in metres.
// Each square repeats exactly, including stone tone, joints and aggregate.
// Relief amplitudes are illustrative, in metres.
const tiles = {
  asphalt: {metres:8, aggregateRise:.003},
  grit: {metres:2, aggregateRise:.006},
  sportsGrit: {metres:2.8, aggregateRise:.003},
  // Natural cover spans several scales so it reads at both slope and close-up distances.
  meadow: {metres:7.4, patch:33, grain:19, relief:.048, aggregateRise:.018},
  drySoil: {metres:6.2, patch:29, grain:22, relief:.054, aggregateRise:.024},
  fieldSoil: {metres:22.4, cells:[9,24,49], patch:32, grain:18, relief:.078, aggregateRise:.019},
  openGrass: {metres:21.3, cells:[8,21,47], patch:27, grain:18, relief:.055, aggregateRise:.018},
  plantedSoil: {metres:6.8, cells:[5,13,27], patch:28, grain:28, relief:.052, aggregateRise:.021},
  courtyardSetts: {metres:7.296, columns:6, rows:12, joint:.024, jointDepth:.006},
  scree: {metres:5.6, patch:30, grain:29, relief:.067, aggregateRise:.038},
  stone: {metres:6, columns:5, rows:8, joint:.034, jointDepth:.008},
  brick: {metres:3.84, columns:12, rows:24, joint:.015, jointDepth:.006},
};
const size=256, samples=new Map(), canvases=new Map(), textures=new Map(), normals=new Map(), patterns=new WeakMap();

function noise(x,y,seed){
  let n=Math.imul(x+71,374761393)^Math.imul(y+seed,668265263);
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/4294967296;
}

// Periodic low-frequency variation keeps the road surface visible at middle
// distances without introducing artificial road markings or joints.
function octave(x,y,n){
  const fx=x*n/size,fy=y*n/size,ix=Math.floor(fx),iy=Math.floor(fy);
  let a=fx-ix,b=fy-iy;a*=a*(3-2*a);b*=b*(3-2*b);
  const cell=(dx,dy)=>noise((ix+dx)%n,(iy+dy)%n,19);
  return (cell(0,0)*(1-a)+cell(1,0)*a)*(1-b)+(cell(0,1)*(1-a)+cell(1,1)*a)*b-.5;
}

function tileSamples(kind){
  if(samples.has(kind))return samples.get(kind);
  const tile=tiles[kind],grain=new Float32Array(size*size),height=new Float32Array(size*size);
  const [wideCells,midCells,fineCells]=tile.cells??[5,13,29];
  let sum=0;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=(x+.5)/size,v=(y+.5)/size;
    const speck=noise(x,y,83)-.5;
    let value, relief;
    if(tile.rows){
      const fy=v*tile.rows,row=Math.floor(fy),fx=u*tile.columns+(row%2)*.5,col=Math.floor(fx);
      const dx=Math.min(fx-col,1-fx+col)*tile.metres/tile.columns;
      const dy=Math.min(fy-row,1-fy+row)*tile.metres/tile.rows;
      const dist=Math.min(dx,dy),pixel=tile.metres/size;
      const mortar=Math.max(0,Math.min(1,(tile.joint/2+pixel/2-dist)/pixel));
      const tone=noise(col%tile.columns,row,37)-.5, broad=octave(x,y,16);
      value=tone*(kind==='brick'?22:15)+speck*9+broad*7-36*mortar;
      if(dist>=tile.joint/2&&dist<tile.joint/2+pixel)value+=3;
      relief=.0015*speck+.001*broad-tile.jointDepth*mortar;
    }else if(tile.relief){
      const broad=octave(x,y,wideCells), clusters=octave(x,y,midCells), fine=octave(x,y,fineCells);
      const grains=noise(Math.floor(x/2),Math.floor(y/2),47)-.5;
      const pieces=Math.max(0, fine+.27*grains-.14);
      value=tile.patch*(.58*broad+.77*clusters)+tile.grain*(.42*fine+.35*grains)+pieces*32+speck*5;
      relief=tile.relief*(.38*broad+.62*clusters+.35*fine)+tile.aggregateRise*(.55*grains+pieces);
    }else{
      const aggregate=noise(Math.floor(x/2),Math.floor(y/2),47);
      const fleck=aggregate>.90?9:aggregate<.14?-8:0;
      value=octave(x,y,4)*7+octave(x,y,16)*6+speck*(kind==='grit'?23:16)+fleck;
      relief=tile.aggregateRise*(.55*(aggregate-.5)+.45*speck);
    }
    grain[y*size+x]=value;
    height[y*size+x]=relief;
    sum+=value;
  }
  const mean=sum/grain.length;
  for(let i=0;i<grain.length;i++)grain[i]-=mean;
  const result={grain,height};
  samples.set(kind,result);
  return result;
}

function tileCanvas(kind,color){
  const key=kind+color;
  if(canvases.has(key))return canvases.get(key);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(size,size),data=pixels.data;
  const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)),{grain}=tileSamples(kind);
  for(let i=0;i<grain.length;i++){
    for(let k=0;k<3;k++)data[4*i+k]=rgb[k]+grain[i];
    data[4*i+3]=255;
  }
  ctx.putImageData(pixels,0,0);canvases.set(key,canvas);return canvas;
}

export function pavingTexture(kind,color){
  const key=kind+color;
  if(!textures.has(key)){
    const map=new T.CanvasTexture(tileCanvas(kind,color));
    map.name=kind+' '+color;map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
    map.wrapS=map.wrapT=T.RepeatWrapping;map.userData.mimeType='image/jpeg';
    textures.set(key,map);
  }
  return textures.get(key);
}

export function pavingNormal(kind){
  if(normals.has(kind))return normals.get(kind);
  const {height}=tileSamples(kind),scale=size/(2*tiles[kind].metres);
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(size,size);
  const at=(x,y)=>height[((y+size)%size)*size+(x+size)%size];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const nx=(at(x-1,y)-at(x+1,y))*scale;
    // The canvas rows increase towards negative texture V.
    const ny=(at(x,y+1)-at(x,y-1))*scale;
    const length=Math.hypot(nx,ny,1),offset=4*(y*size+x);
    pixels.data[offset]=Math.round(127.5*(1+nx/length));
    pixels.data[offset+1]=Math.round(127.5*(1+ny/length));
    pixels.data[offset+2]=Math.round(127.5*(1+1/length));
    pixels.data[offset+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  const normal=new T.CanvasTexture(canvas);
  normal.name=kind+' paving normal';
  normal.wrapS=normal.wrapT=T.RepeatWrapping;
  normal.anisotropy=8;
  normal.userData.mimeType='image/png';
  normals.set(kind,normal);
  return normal;
}

export function pavingMetres(kind){return tiles[kind].metres}

// CanvasPattern transforms are in the current drawing space (world metres
// for roads, gate-local metres for the entrance garden). At overview scale
// the original mean colour also avoids aliasing subpixel paving rows in 2D.
export function pavingFill(ctx,kind,color,angle=0){
  const matrix=ctx.getTransform();
  if(Math.hypot(matrix.a,matrix.b)<5)return color;
  if(!patterns.has(ctx))patterns.set(ctx,new Map());
  const cache=patterns.get(ctx),key=kind+color+' '+angle;
  if(!cache.has(key)){
    const pattern=ctx.createPattern(tileCanvas(kind,color),'repeat');
    const step=tiles[kind].metres/size,c=Math.cos(angle)*step,s=Math.sin(angle)*step;
    pattern.setTransform(new DOMMatrix([c,s,-s,c,0,0]));
    cache.set(key,pattern);
  }
  return cache.get(key);
}
