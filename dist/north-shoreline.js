// Visible land-water edge shared by the two dated orthophotos, in scene metres.
export const northShoreLine = [
  [-844,-734.45],[-840,-735.65],[-836,-736.95],[-832,-738.15],[-828,-739.45],[-824,-740.75],
  [-820,-742.15],[-816,-743.45],[-812,-744.75],[-808,-746.25],[-804,-747.15],[-800,-748.65],
  [-796,-750.35],[-792,-752.05],[-788,-753.75],[-784,-754.45],[-780,-755.85],[-776,-757.75],
  [-772,-759.65],[-768,-761.05],[-764,-762.25],[-760,-764.55],[-756,-765.85],[-752,-767.65],
  [-748,-769.35],[-744,-771.05],[-740,-772.55],[-736,-774.35],[-732,-776.15],[-728,-777.95],
  [-724,-779.75],[-720,-780.85],[-716,-782.71],[-712,-785.08],[-708,-787.46],[-704,-789.69],
  [-700,-792.03],[-696,-794.68],[-692,-797.13],
  [-687.65,-799.47],[-683.88,-801.82],[-680.11,-803.23],[-676.33,-804.64],[-672.56,-807.0],[-668.78,-808.88],
  [-665.01,-811.23],[-661.23,-813.11],[-657.46,-814.99],[-653.68,-818.28],[-649.91,-820.17],[-646.13,-821.58],
  [-642.36,-823.93],[-638.59,-826.28],[-634.81,-827.69],[-631.04,-828.63],[-627.26,-830.51],[-623.49,-834.28],
  [-619.71,-836.63],[-615.94,-839.45],[-612.16,-842.27],[-608.39,-844.63],[-604.62,-847.45],[-600.84,-849.33],
  [-597.07,-851.68],[-593.29,-854.97],[-589.52,-856.86],[-585.74,-859.68],[-581.97,-862.5],[-578.19,-865.32],
  [-574.42,-867.2],[-570.64,-870.03],[-566.87,-872.85],[-563.1,-875.2],[-559.32,-877.55],[-555.55,-880.85],
  [-551.77,-883.2],[-548.0,-886.02],[-544.22,-888.37],[-540.45,-891.19],[-536.67,-894.96],[-532.9,-898.25],
  [-529.12,-900.6],[-525.35,-903.42],[-521.58,-906.72],[-517.8,-910.01],[-514.03,-912.83],[-510.25,-916.12],
  [-506.48,-919.42],[-502.7,-922.71],[-498.93,-926.0],[-495.15,-928.82],[-491.38,-932.12],[-487.6,-936.82],
  [-483.83,-938.7],[-480.06,-942.46],[-476.28,-945.76],[-472.51,-949.99],[-468.73,-952.81],[-464.96,-956.58],
  [-461.18,-959.87],[-457.41,-964.1],[-453.63,-967.39],[-449.86,-969.75],[-446.08,-970.22],[-442.31,-969.28],
  [-438.54,-967.39],[-434.76,-964.57],[-430.99,-960.81],[-427.21,-957.52],[-423.44,-956.58],[-419.66,-959.4],
  [-415.89,-963.63],[-412.11,-968.34],[-408.34,-971.63],[-404.56,-974.45],[-400.79,-978.68],[-397.02,-983.86],
  [-393.24,-987.15],[-389.47,-990.91],[-385.69,-995.15],[-381.92,-999.85],[-378.14,-1003.61],[-374.37,-1007.38],
  [-370.59,-1012.08]
];

export const northShoreEvidence = {
  dates:['2024-03-09','2025-06-02'],
  archives:['13192','3692'],
  sourceSamplingMetres:[.31,.34],
  mapSamplingMetres:.6,
  westernExtension:{
    measuredRangeXZ:[[-844,-734.45],[-687.65,-799.47]],
    sharedBoundaryMaxDifferenceMetres:2.6,
    joinBlendMetres:24,
    method:'Visible seaward edge of the revetment, with three ambiguous edge sections bridged between adjacent measurements.',
    spectralSupport:{
      dates:['2025-06-11','2026-10-14'],
      waterMedianNDWI:[.759,.871],
      uplandMedianNDWI:[-.219,-.289]
    }
  },
  method:'Mean of paired visible water boundaries. Used for cover and map colour. No change to terrain elevation.',
};

const firstX=northShoreLine[0][0];
const lastX=northShoreLine.at(-1)[0];
const fadeMargin=27;
const minZ=Math.min(...northShoreLine.map(([,z])=>z))-64;
const maxZ=Math.max(...northShoreLine.map(([,z])=>z))+65;

function coastAt(x) {
  let lo=0, hi=northShoreLine.length-1;
  while(hi-lo>1){
    const m=(lo+hi)>>1;
    if(x<northShoreLine[m][0])hi=m;
    else lo=m;
  }
  const [ax,az]=northShoreLine[lo], [bx,bz]=northShoreLine[hi];
  return az+(bz-az)*(x-ax)/(bx-ax);
}

function smooth(a,b,v) {
  const x=Math.max(0,Math.min(1,(v-a)/(b-a)));
  return x*x*(3-2*x);
}

// North face and outer end of the same hard pier in both dated archives.
// The paired fits meet at X -1158, Z -427.5; current 10 m imagery confirms the feature.
const pierBounds=[-1210,-452,-1056,-359];
const northPierOffset=(x,z)=>(z+427.5-.325*(x+1158))/Math.hypot(1,.325);
const endPierOffset=(x,z)=>(x+1158+.378*(z+427.5))/Math.hypot(1,.378);

function pierStrength(x,z) {
  const [west,north,east,south]=pierBounds;
  if(x<west||x>east||z<north||z>south)return 0;
  return smooth(0,10,Math.min(east-x,south-z));
}

export function northShoreGroundClass(x,z,baseline) {
  if(pierStrength(x,z)>.6){
    const offset=Math.min(northPierOffset(x,z),endPierOffset(x,z));
    if(Math.abs(offset)<=16)return offset>0?60:80;
  }
  if(x<firstX+fadeMargin||x>lastX-fadeMargin||z<minZ||z>maxZ)return baseline;
  const offset=z-coastAt(x);
  if(Math.abs(offset)>37)return baseline;
  return offset>0?60:80;
}

export function paintNorthShore(ctx) {
  paintOldPier(ctx);
  const {a:scaleX,d:scaleZ,e:dx,f:dz}=ctx.getTransform();
  const left=Math.max(0,Math.floor(firstX*scaleX+dx));
  const right=Math.min(ctx.canvas.width,Math.ceil(lastX*scaleX+dx));
  const top=Math.max(0,Math.floor(minZ*scaleZ+dz));
  const bottom=Math.min(ctx.canvas.height,Math.ceil(maxZ*scaleZ+dz));
  const width=right-left,height=bottom-top;
  if(width<=0||height<=0)return;
  const patch=ctx.getImageData(left,top,width,height);
  const rgba=patch.data;
  for(let col=0;col<width;col++){
    const x=(left+col+.5-dx)/scaleX;
    const strength=smooth(0,fadeMargin,Math.min(x-firstX,lastX-x));
    if(strength<=0)continue;
    const z=coastAt(x);
    const rowAt=offset=>Math.min(height-1,Math.max(0,Math.round((z+offset)*scaleZ+dz-top)));
    const average=offset=>{
      const a=(rowAt(offset-6)*width+col)*4;
      const b=(rowAt(offset)*width+col)*4;
      const c=(rowAt(offset+6)*width+col)*4;
      return [0,1,2].map(ch=>(rgba[a+ch]+rgba[b+ch]+rgba[c+ch])/3);
    };
    const water=average(-53), land=average(54);
    const endRow=rowAt(51);
    for(let row=rowAt(-43);row<=endRow;row++){
      const shift=(top+row+.5-dz)/scaleZ-z;
      const mix=smooth(-.8,.8,shift);
      const weight=.97*strength*(1-smooth(17,shift<0?43:51,Math.abs(shift)));
      const k=(row*width+col)*4;
      for(let ch=0;ch<3;ch++){
        const toned=water[ch]+(land[ch]-water[ch])*mix;
        rgba[k+ch]+=(toned-rgba[k+ch])*weight;
      }
    }
  }
  ctx.putImageData(patch,left,top);
}

function paintOldPier(ctx) {
  const {a:scaleX,d:scaleZ,e:dx,f:dz}=ctx.getTransform();
  const [west,north,east,south]=pierBounds;
  const left=Math.max(0,Math.floor(west*scaleX+dx));
  const top=Math.max(0,Math.floor(north*scaleZ+dz));
  const width=Math.min(ctx.canvas.width,Math.ceil(east*scaleX+dx))-left;
  const height=Math.min(ctx.canvas.height,Math.ceil(south*scaleZ+dz))-top;
  if(width<=0||height<=0)return;

  const patch=ctx.getImageData(left,top,width,height);
  const rgba=patch.data;
  function colourAt(x,z) {
    const u=Math.floor(x*scaleX+dx)-1,v=Math.floor(z*scaleZ+dz)-1;
    const samples=ctx.getImageData(u,v,3,3).data;
    return [0,1,2].map(channel=>{
      let sum=0;
      for(let i=channel;i<samples.length;i+=4)sum+=samples[i];
      return sum/9;
    });
  }
  const northWater=colourAt(-1128,-449), northLand=colourAt(-1090,-386);
  const endWater=colourAt(-1200,-384), endLand=colourAt(-1146,-385);

  for(let row=0;row<height;row++)for(let col=0;col<width;col++){
    const x=(left+col+.5-dx)/scaleX,z=(top+row+.5-dz)/scaleZ;
    const northOffset=northPierOffset(x,z),endOffset=endPierOffset(x,z);
    const offset=Math.min(northOffset,endOffset);
    const weight=.98*pierStrength(x,z)*(1-smooth(11,23,Math.abs(offset)));
    if(weight<=0)continue;
    const landMix=smooth(-.85,.85,offset);
    const northMix=smooth(-6,6,endOffset-northOffset);
    const k=(row*width+col)*4;
    for(let ch=0;ch<3;ch++){
      const water=endWater[ch]+(northWater[ch]-endWater[ch])*northMix;
      const land=endLand[ch]+(northLand[ch]-endLand[ch])*northMix;
      const colour=water+(land-water)*landMix;
      rgba[k+ch]+=(colour-rgba[k+ch])*weight;
    }
  }
  ctx.putImageData(patch,left,top);
}
