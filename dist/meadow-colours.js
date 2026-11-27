// Fixed world-space noise keeps both the terrain colour and tuft distribution
// reproducible when they run on different threads.
const noise=new Float32Array(256*256);
let seed=74139;
for(let i=0;i<noise.length;i++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  noise[i]=seed/4294967296-.5;
}

function sampleNoise(x,z){
  const i=Math.floor(x),j=Math.floor(z),u=x-i,v=z-j;
  const a=u*u*(3-2*u),b=v*v*(3-2*v),row=(j&255)*256,next=((j+1)&255)*256;
  return (1-b)*(noise[row+(i&255)]*(1-a)+noise[row+((i+1)&255)]*a)
    +b*(noise[next+(i&255)]*(1-a)+noise[next+((i+1)&255)]*a);
}

function smoothstep(x,min,max){
  if(x<=min)return 0;
  if(x>=max)return 1;
  x=(x-min)/(max-min);
  return x*x*(3-2*x);
}

export function meadowPatch(x,z){
  const broad=sampleNoise(x*.031+51,z*.033-38);
  const sx=x+sampleNoise(x*.087+7,z*.092)*5.4;
  const sz=z+sampleNoise(x*.085,z*.091-9)*5.8;
  const tuft=sampleNoise(sx*.19+11,sz*.19-3);
  const dry=smoothstep(broad+.38*tuft,-.18,.36);
  const cover=smoothstep(tuft-.28*broad,-.24,.33);
  return {dry,cover};
}

export function shadeMeadowRows(rgba,width,height,mask,bounds,start=0,end=height){
  const [l,t,r,b]=bounds,mx=(r-l)/width,mz=(b-t)/height;
  for(let j=start;j<end;j++){
    const z=t+(j+.5)*mz,row=Math.floor((z-t)*mask.sz)*mask.width;
    for(let i=0;i<width;i++){
      const x=l+(i+.5)*mx,alpha=mask.alpha[row+Math.floor((x-l)*mask.sx)]/255;
      if(!alpha)continue;
      const {dry,cover}=meadowPatch(x,z);
      const grain=sampleNoise(x*.59-z*.14,z*.63+x*.18);
      const sage=13*cover-6+grain*9;
      const straw=31*dry-11;
      const k=(j*width+i)*4;
      rgba[k]+=alpha*(-5+straw-.45*sage);
      rgba[k+1]+=alpha*(4+.25*straw+.62*sage);
      rgba[k+2]+=alpha*(-12-.15*straw+.17*sage);
    }
  }
}
