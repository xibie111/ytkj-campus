// Penglai library, university film "烟科主校区云彩天空", 00:04.3 and 00:23.
// The ten structural bays set the relative widths. Depths and elevations are estimated.
export const libraryFrontEvidence = {
  source: 'https://www.ytkj.edu.cn/info/1115/6342.htm',
  seconds: [4.3, 23],
  basis: '两组采光带、三跨门洞、扇形拉杆和两段台阶依据校方视频。尺寸与阶数为目视估计。'
};

function forecourt(g,edge,mid,width,ground,tools) {
  const {cuboid,steel}=tools, p=edge.point;
  const half=width/2, steps=19, lower=11, rise=.154, tread=.33, rest=1.16;
  const terrace=ground+.42, door=terrace+steps*rise, back=-2.85;
  const topEnd=.84, toe=topEnd+steps*tread+rest;
  // Three shallow, continuous arc steps precede the narrower two-flight stair.
  const slices=28, radius=half*.98;
  const arc=(j,i,y)=>{
    const angle=Math.PI*i/slices;
    return p(mid+(radius-j*.35)*Math.cos(angle),y,
      (toe+1.54-j*.35)*Math.sin(angle));
  };
  for(let j=0;j<3;j++)for(let i=0;i<slices;i++) {
    const lo=ground+j*.14, hi=lo+.14;
    const a=arc(j,i,hi), b=arc(j,i+1,hi);
    g.quad(arc(j,i,lo),arc(j,i+1,lo),b,a,'#a6a8a3');
    if(j<2)g.quad(a,b,arc(j+1,i+1,hi),arc(j+1,i,hi),'#d6d3c9');
    else {
      const v=g.vertex(p(mid,hi,0),'#d2cfc5'), v2=g.vertex(a,'#d2cfc5'), v3=g.vertex(b,'#d2cfc5');
      g.indices.push(v,v2,v3);
    }
  }
  const stairHalf=width*.214, l=mid-stairHalf, r=mid+stairHalf;
  cuboid(g,edge,mid-half+.36,mid+half-.36,terrace-.06,door,back,.85,'#a8afae');
  const corners=[];
  let z=toe;
  for(let i=0;i<steps;i++) {
    const h=terrace+(i+1)*rise, t=tread+(i===lower-1?rest:0);
    cuboid(g,edge,l,r,terrace-.04,h,z-t,z,i%3===1?'#c2c4be':'#bcbfb9');
    if(i===0 || i===lower-1 || i===steps-1) corners.push([z,h]);
    if(i===lower-1)corners.push([z-rest,h]);
    z-=t;
  }
  for(const x of [l+.12,r-.12]) {
    const rail=corners.map(([out,y])=>p(x,y+.86,out));
    for(let i=1;i<rail.length;i++)steel(g,rail[i-1],rail[i],.053,'#84908d');
    for(const [out,y] of corners)steel(g,p(x,y,out),p(x,y+.86,out),.045,'#84908d');
    const side=x<mid?-1:1, a=x+side*.22,b=mid+side*(half-.5);
    steel(g,p(a,door+.82,.65),p(b,door+.82,.65),.05,'#87938f');
    for(let j=0;j<5;j++){
      const pos=a+(b-a)*j/4;
      steel(g,p(pos,door,.65),p(pos,door+.82,.65),.042,'#87938f');
    }
  }
  return door;
}

function canopy(g,edge,mid,width,level,soffit,tools) {
  const {steel}=tools,p=edge.point, radius=width*.344, depth=width*.133;
  const segments=18, sill=-.66, front=(t)=>sill+.48+depth*Math.sqrt(Math.max(0,1-t*t));
  for(let i=0;i<segments;i++) {
    const a=2*i/segments-1,b=2*(i+1)/segments-1;
    const x=mid+a*radius,y=mid+b*radius, za=front(a),zb=front(b);
    g.quad(p(x,level,za),p(x,level,sill),p(y,level,sill),p(y,level,zb),
      i%3?'#92a9ac':'#9aafb0');
    g.quad(p(x,level-.19,za),p(x,level,za),p(y,level,zb),p(y,level-.19,zb),
      Math.abs((a+b)/2)<.72?'#96444a':'#536367');
    if(i%2===0)steel(g,p(x,level+.016,sill),p(x,level+.016,za),.034,'#66797c');
  }
  for(const side of [-1,1]){
    const anchor=p(mid+side*width*.166,soffit-.20,-1.02);
    for(const magnitude of [.015,.37,.72,.96]){
      const t=side*magnitude;
      steel(g,anchor,p(mid+radius*t,level+.08,front(t)-.16),.086,'#dde5de');
    }
  }
}

function roofLantern(g,edge,mid,width,height,tools) {
  const {cuboid}=tools, p=edge.point, half=width*.315;
  const front=-5.8, back=-12.1, eave=height+2.35, crest=eave+1.25;
  cuboid(g,edge,mid-half,mid+half,height-.7,eave,back,front,'#c5cbc7');
  const slope=(x,t)=>p(x,eave+(crest-eave)*t,front+(back-front)*t);
  for(const side of [-1,1]){
    const a=mid+(side<0?-half+.23:.34), b=mid+(side<0?-.34:half-.23);
    g.quad(slope(a,0),slope(a,1),slope(b,1),slope(b,0),'#8daca9');
    const bar=(x,y)=>[x[0],x[1]+y,x[2]];
    for(let j=0;j<=5;j++) {
      const x=a+(b-a)*j/5;
      g.quad(bar(slope(x-.045,0),.025),bar(slope(x-.045,1),.025),
        bar(slope(x+.045,1),.025),bar(slope(x+.045,0),.025),'#e0e1d4');
    }
    for(let j=1;j<=3;j++){
      const t=j/4;
      g.quad(bar(slope(a,t-.008),.024),bar(slope(a,t+.008),.024),
        bar(slope(b,t+.008),.024),bar(slope(b,t-.008),.024),'#d0d8cb');
    }
  }
  // Solid returns close the ends and back of the sloped roof glazing.
  for(const x of [mid-half+.10,mid,mid+half-.10]) {
    const a=x-.13,b=x+.13;
    g.quad(slope(a,0),slope(a,1),slope(b,1),slope(b,0),'#d7dad0');
    for(const s of [a,b]) {
      const vs=[slope(s,0),slope(s,1),p(s,eave,back)].map(pt=>g.vertex(pt,'#b8c1b9'));
      g.indices.push(...(s===a?vs.reverse():vs));
    }
  }
  cuboid(g,edge,mid-half,mid+half,eave-.02,crest,back-.10,back,'#c1c9be');
}

export function libraryPlazaFront(g,edge,north,frontage,axisMin,foundation,baseTop,roof,height,tools) {
  if(edge.nz>-.72 || edge.length<8)return false;
  const {face,cuboid,glazing,steel,podium}=tools,p=edge.point,L=edge.length;
  const u=(s)=>{const [x,,z]=p(s,0);return -x*north.nz+z*north.nx-axisMin};
  const start=u(0),end=u(L), s=(axis)=>(axis-start)*L/(end-start);
  const central=edge===north, module=frontage/10, mid=central?s(frontage*.46):0;
  const width=frontage*.305;
  const left=central?Math.max(.28,mid-width/2):0, right=central?Math.min(L-.28,mid+width/2):0;
  const eave=roof-1.14, pitch=(eave-baseTop)/6, level=n=>baseTop+n*pitch;
  const soffit=level(4)-.12;
  const pieces=central?[[0,left,true],[left,right,null],[right,L,false]]:[[0,L,(start+end)/2<frontage*.46]];
  for(const [a,b,west] of pieces){
    const lowest=west===null?4:west?2:3;
    const low=west===null?soffit:level(lowest);
    if(west!==null)podium(g,edge,a,b,baseTop,low,west,.035);
    face(g,edge,a,b,low,height,0,'#c3caca');
    for(let row=lowest;row<6;row++){
      const y=level(row)+.30, hi=level(row+1)-.48;
      face(g,edge,a,b,y,hi,.045,'#4d6166');
      for(let cell=Math.max(0,Math.floor(u(a)*6/module));cell<Math.ceil(u(b)*6/module);cell++){
        const x=Math.max(a,s(cell*module/6)), xx=Math.min(b,s((cell+1)*module/6));
        if(xx-x<.24)continue;
        glazing(g,edge,x+.10,xx-.10,y+.035,hi-.035,.070,cell%3);
        face(g,edge,x+.09,xx-.09,hi-.54,hi-.48,.095,'#9daaa8');
        const mullion=(x+xx)/2;
        face(g,edge,mullion-.033,mullion+.033,y+.035,hi-.035,.10,'#9ca9a6');
      }
      cuboid(g,edge,a,b,y-.11,y+.06,.002,.20,'#c1cbc8');
    }
  }
  for(let i=0;i<=60;i++){
    const x=s(i*module/6),major=i%6===0,half=major?.31:.095;
    if(x+half<=0||x-half>=L)continue;
    const portal=central && x>left+.32 && x<right-.32;
    const west=i<28, low=portal?soffit:major?baseTop:level(west?2:3);
    cuboid(g,edge,Math.max(0,x-half),Math.min(L,x+half),low,
      height+(major?.43:.04),-.025,major?.74:.54,major?'#d7dcd6':'#e3e6dc');
  }
  if(!central)return true;
  const center=(left+right)/2, opening=right-left, rear=-3.02;
  const ground=tools.ground(center,8.7);
  const door=forecourt(g,edge,center,opening,ground,tools);
  cuboid(g,edge,left,left+.30,foundation,soffit,rear,0,'#c4cecc');
  cuboid(g,edge,right-.30,right,foundation,soffit,rear,0,'#c4cecc');
  cuboid(g,edge,left,right,soffit-.23,soffit,rear,.26,'#bcc8c6');
  face(g,edge,left,right,foundation,soffit,rear,'#a8b8b8');
  const head=door+(soffit-door)*.51, canopyLevel=head+.26;
  for(let j=-3;j<=3;j++){
    const x=center+j*opening*.084;
    glazing(g,edge,x-opening*.040,x+opening*.040,door+.08,head-.07,rear+.12,j+3);
    glazing(g,edge,x-opening*.040,x+opening*.040,head+.08,soffit-.10,rear+.12,j+4);
    face(g,edge,x-opening*.040,x+opening*.040,door+2.08,door+2.18,rear+.15,'#c2cbc5');
  }
  for(let j=0;j<4;j++){
    const a=center+opening*(j-2)*.057,b=a+opening*.057,doorTop=door+2.27;
    cuboid(g,edge,a+.025,b-.025,door+.015,doorTop,rear+.13,rear+.23,'#bfcbc7');
    glazing(g,edge,a+.11,b-.11,door+.16,doorTop-.12,rear+.245,j);
    const handle=j%2?a+.22:b-.22;
    steel(g,p(handle,door+.88,rear+.30),p(handle,door+1.42,rear+.30),.035,'#e1e5de');
  }
  for(const side of [-1,1]){
    const a=side<0?left+.4:center+opening*.318, b=side<0?center-opening*.318:right-.4;
    for(let y=door+.7;y<soffit;y+=1.2)
      face(g,edge,a,b,y,y+.031,rear+.035,'#839594');
    for(let x=a+.65;x<b;x+=1.2)
      face(g,edge,x,x+.032,door,soffit-.02,rear+.037,'#839594');
  }
  for(const side of [-1,1]){
    const x=center+side*opening*.166;
    cuboid(g,edge,x-.67,x+.67,door,soffit-.10,rear+.14,-.94,'#c3ccca');
    for(let y=door+.9;y<soffit-.22;y+=.95)
      face(g,edge,x-.67,x+.67,y,y+.035,-.92,'#93a1a0');
  }
  canopy(g,edge,center,opening,canopyLevel,soffit,tools);
  roofLantern(g,edge,center,opening,height,tools);
  return true;
}
