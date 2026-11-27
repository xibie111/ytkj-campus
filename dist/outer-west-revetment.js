// Hard northeast corner of the opposite bank. The March 2024 and June 2025
// images resolve the wall. The west limit excludes the variable wet-edge samples.
const bounds=[-1407,-815,-1355,-735];
const northNormal=Math.hypot(1,.139);
const eastNormal=Math.hypot(1,.023);

function signedOffset(x,z) {
  const north=(z+790.9-.139*(x+1378.4))/northNormal;
  const east=(-x-1378.4+.023*(z+790.9))/eastNormal;
  return Math.min(north,east);
}

function smooth(a,b,value) {
  const t=Math.max(0,Math.min(1,(value-a)/(b-a)));
  return t*t*(3-2*t);
}

function strengthAt(x,z) {
  const [west,north,east,south]=bounds;
  if(x<west||x>east||z<north||z>south)return 0;
  const corner=smooth(-1386.5,-1382.5,x);
  // Fade onto the dry bank only south of the unstable wet-edge transect.
  const dryBank=smooth(-783,-775,z)*smooth(0,10,x-west);
  return Math.max(corner,dryBank)*smooth(0,9,south-z);
}

export function outerWestGroundClass(x,z,baseline) {
  if(strengthAt(x,z)<=.6)return baseline;
  const offset=signedOffset(x,z);
  return Math.abs(offset)<=14?(offset>0?60:80):baseline;
}

export function paintOuterWestRevetment(ctx) {
  const {a:scaleX,d:scaleZ,e:dx,f:dz}=ctx.getTransform();
  const [west,north,east,south]=bounds;
  const left=Math.max(0,Math.floor(west*scaleX+dx));
  const top=Math.max(0,Math.floor(north*scaleZ+dz));
  const width=Math.min(ctx.canvas.width,Math.ceil(east*scaleX+dx))-left;
  const height=Math.min(ctx.canvas.height,Math.ceil(south*scaleZ+dz))-top;
  if(width<=0||height<=0)return;
  const patch=ctx.getImageData(left,top,width,height);
  const rgba=patch.data;
  function colourAt(x,z) {
    const col=Math.floor(x*scaleX+dx)-1,row=Math.floor(z*scaleZ+dz)-1;
    const data=ctx.getImageData(col,row,3,3).data;
    return [0,1,2].map(channel=>{
      let total=0;
      for(let i=channel;i<data.length;i+=4)total+=data[i];
      return total/9;
    });
  }
  const land=colourAt(-1402,-759),water=colourAt(-1353,-765);
  for(let row=0;row<height;row++)for(let col=0;col<width;col++){
    const x=(left+col+.5-dx)/scaleX,z=(top+row+.5-dz)/scaleZ;
    const offset=signedOffset(x,z);
    const weight=.97*strengthAt(x,z)*(1-smooth(9,23,Math.abs(offset)));
    if(weight<=0)continue;
    const mix=smooth(-.75,.75,offset);
    const k=(row*width+col)*4;
    for(let ch=0;ch<3;ch++){
      const colour=water[ch]+(land[ch]-water[ch])*mix;
      rgba[k+ch]+=(colour-rgba[k+ch])*weight;
    }
  }
  ctx.putImageData(patch,left,top);
}
