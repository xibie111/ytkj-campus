// Resolve clicks on rendered pavement before consulting the source centreline.
const classes={
  primary:'arterial',secondary:'arterial',tertiary:'collector',
  residential:'local',living_street:'local',unclassified:'local',
  service:'service',track:'service',pedestrian:'walk',footway:'walk',
  path:'walk',steps:'walk',cycleway:'walk'
};
const order=['arterial','collector','local','service','brickWalk','walk','forecourt','gateApron','estimatedWalk'];
const minimumScale={arterial:.19,collector:.38,local:.65,service:.65,walk:1.12,estimatedWalk:1.12};
const boundaryEpsilon=.0001; // metres; resolves shared float32 triangle/tile edges
const roadPickMargin=.57;
const maximumBookmarkShift=12; // metres along the old road cross-section

function pointBounds(points, pad=0) {
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  for(const [x,z] of points){
    left=Math.min(left,x);top=Math.min(top,z);right=Math.max(right,x);bottom=Math.max(bottom,z);
  }
  return [left-pad,top-pad,right+pad,bottom+pad];
}
function inBox([x,z],b){return x>=b[0]&&x<=b[2]&&z>=b[1]&&z<=b[3]}
function edgeDistanceSq([x,z],[ax,az],[bx,bz]){
  const dx=bx-ax,dz=bz-az,d=dx*dx+dz*dz;
  const t=d?Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/d)):0;
  return (x-ax-t*dx)**2+(z-az-t*dz)**2;
}
function ringSide(p,ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[j],b=ring[i];
    if(edgeDistanceSq(p,a,b)<=boundaryEpsilon**2)return 0;
    if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<a[0]+(p[1]-a[1])*(b[0]-a[0])/(b[1]-a[1]))inside=!inside;
  }
  return inside?1:-1;
}
function covers(p,shape){
  return inBox(p,shape.bounds)&&ringSide(p,shape.ring)>=0&&!(shape.holes||[]).some(r=>ringSide(p,r)===1);
}

// The north gate's two straight-sided groups of lanes are baked into the
// ground image. Each is bounded by its own outer stripes and stop bar. The
// apron also contains a sign, near-side forecourt and island outside the lanes.
function paintHull(points){
  const sorted=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  function half(sequence){
    const chain=[];
    for(const p of sequence){
      while(chain.length>=2){
        const a=chain.at(-2),b=chain.at(-1);
        if((b[0]-a[0])*(p[1]-a[1])>(b[1]-a[1])*(p[0]-a[0]))break;
        chain.pop();
      }
      chain.push(p);
    }
    chain.pop();return chain;
  }
  return [...half(sorted),...half(sorted.reverse())];
}
export function createRoadIndex(data,gate){
  const segments=data.segments.map(segment=>({
    segment,style:segment.source==='dormAccessApproximation'?'estimatedWalk':classes[segment.kind],
    bounds:pointBounds(segment.ring,segment.width/2+roadPickMargin)
  }));
  const polygons=[];
  for(const p of data.polygons){
    if(p.style==='edge')continue;
    const style=p.style==='marking'||p.style==='markingYellow'?'gateApron':p.style;
    if(order.includes(style))polygons.push({...p,style,bounds:pointBounds(p.ring,boundaryEpsilon)});
  }
  polygons.sort((a,b)=>order.indexOf(a.style)-order.indexOf(b.style));
  const areas=data.areas.map(area=>({...area,area,bounds:pointBounds(area.ring,boundaryEpsilon)}));
  const replacements=areas.flatMap(pavement=>{
    if(pavement.replacesPavementOf==null)return [];
    const matching=segments.filter(({segment,style})=>segment.id===pavement.replacesPavementOf&&style===pavement.style);
    // A way split into named ranges needs an explicit association to one range.
    return matching.length===1?[{pavement,...matching[0]}]:[];
  });
  const apron=areas.find(a=>a.id==='north-gate-vehicle-apron');
  if(gate&&apron){
    const sides=[[],[]],c=Math.cos(gate.angle),s=Math.sin(gate.angle);
    for(const p of polygons){
      if(p.style!=='gateApron')continue;
      for(const v of p.ring){
        if(!inBox(v,apron.bounds))continue;
        const across=(v[0]-gate.x)*c+(v[1]-gate.z)*s;
        sides[across<0?0:1].push(v);
      }
    }
    for(const points of sides){
      if(points.length<3)continue;
      const ring=paintHull(points);
      if(ring.length>=3)polygons.push({style:'gateApron',ring,bounds:pointBounds(ring,boundaryEpsilon)});
    }
  }
  function hit(point){
    const style=polygons.find(p=>covers(point,p))?.style;
    if(!style)return null;
    if(style==='brickWalk'||style==='forecourt'||style==='gateApron'){
      const found=areas.find(a=>a.style===style&&covers(point,a));
      return found?{area:found.area,style}:null;
    }
    let best=null,min=Infinity;
    for(const row of segments){
      if(row.style!==style||!inBox(point,row.bounds))continue;
      const road=row.segment,ring=road.ring;
      let dist=Infinity;
      for(let i=1;i<ring.length;i++)dist=Math.min(dist,edgeDistanceSq(point,ring[i-1],ring[i]));
      if(dist>(road.width/2+roadPickMargin)**2)continue;
      const tie=Math.abs(dist-min)<=boundaryEpsilon**2;
      // At the endpoint shared by a partially verified way, retain the unnamed
      // side when its distance ties. A name never extends past its source range.
      const sameWay=best&&best.id===road.id;
      const winsTie=sameWay?(!road.name&&best.name):(road.name&&!best?.name);
      if(dist<min-boundaryEpsilon**2||(tie&&winsTie)){best=road;min=dist}
    }
    if(best)return {segment:best,style};
    // Keep the original way identity on confirmed replacement pavement when
    // the source line is too far away. Existing junction selections take priority.
    const replacement=replacements.find(row=>row.style===style&&covers(point,row.pavement));
    return replacement?{segment:replacement.segment,style,pavement:replacement.pavement.area}:null;
  }
  function restore(id,point){
    const current=hit(point);
    if(current&&String((current.segment||current.area).id)===id)return {point,hit:current};
    // Old coordinate links may point to removed asphalt. Check that the old
    // anchor belongs to this way, then recover onto its nearby real pavement.
    for(const {segment,bounds,pavement} of replacements){
      if(String(segment.id)!==id||!inBox(point,bounds))continue;
      let nearest=(segment.width/2+roadPickMargin)**2,normal=null;
      const ring=segment.ring;
      for(let i=1;i<ring.length;i++){
        const [a,b]=[ring[i-1],ring[i]],distance=edgeDistanceSq(point,a,b);
        if(distance>nearest)continue;
        const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
        if(length){normal=[-dz/length,dx/length];nearest=distance}
      }
      if(!normal)continue;
      function at(offset){
        const moved=point.map((value,i)=>value+offset*normal[i]);
        if(!covers(moved,pavement))return null;
        const found=hit(moved);
        return found?.segment===segment?{point:moved,hit:found}:null;
      }
      for(let distance=.5;distance<=maximumBookmarkShift;distance+=.5){
        for(const side of [-1,1]){
          const first=at(distance*side);
          if(!first)continue;
          let end=distance;
          while(end+.5<=maximumBookmarkShift&&at((end+.5)*side))end+=.5;
          return at((distance+end)*side/2)||first;
        }
      }
    }
    return null;
  }
  return {hit,restore,named:segments.filter(row=>row.segment.name)};
}

// Clip first so a road crossing the whole viewport can carry a name even when
// both source vertices are offscreen. Keep world coordinates for pavement tests.
function visibleRuns(ring,project,width,height){
  const runs=[];let run=null;
  for(let i=1;i<ring.length;i++){
    const a=ring[i-1],b=ring[i],[x,y]=project(a),[bx,by]=project(b);
    const dx=bx-x,dy=by-y;
    let start=0,end=1;
    for(const [v,offset] of [[-dx,x],[dx,width-x],[-dy,y],[dy,height-y]]){
      if(!v){if(offset<0)end=-1;continue}
      if(v<0)start=Math.max(start,offset/v);
      else end=Math.min(end,offset/v);
    }
    if(end<=start||(!dx&&!dy)){run=null;continue}
    function at(t){
      return {x:x+t*dx,y:y+t*dy,world:[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])],s:0};
    }
    const p=at(start),q=at(end);
    if(!run||start>0){run=[p];runs.push(run)}
    q.s=run.at(-1).s+Math.hypot(q.x-p.x,q.y-p.y);run.push(q);
    if(end<1)run=null;
  }
  return runs;
}
function along(run,s){
  let i=1;
  while(i<run.length-1&&run[i].s<s)i++;
  const a=run[i-1],b=run[i],f=Math.max(0,Math.min(1,(s-a.s)/(b.s-a.s)));
  return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,world:[a.world[0]+(b.world[0]-a.world[0])*f,a.world[1]+(b.world[1]-a.world[1])*f]};
}
function overlaps(a,b){return a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1]}

// The caller has set the canvas transform to CSS pixels (including device pixel
// ratio) and supplies UI/landmark rectangles in that same local coordinate space.
// Optional viewport bounds in world metres skip offscreen centrelines before projection.
export function drawRoadLabels(ctx,index,{project,width,height,pixelsPerMetre,worldBounds,reserved=[],enabled=true,fontFamily='sans-serif'}){
  const drawn=[];
  if(!enabled||pixelsPerMetre<minimumScale.arterial)return drawn;
  const small=width<550,size=small?12:13,margin=6;
  const limit=(small?2:3)+(pixelsPerMetre>=.65?2:0);
  ctx.save();ctx.font='500 '+size+'px '+fontFamily;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
  ctx.strokeStyle='rgba(250,248,234,.91)';ctx.lineWidth=3;
  ctx.fillStyle='#34443b';
  const candidates=[];
  for(const {segment,style,bounds} of index.named){
    if(worldBounds&&bounds&&!overlaps(bounds,worldBounds))continue;
    const university=segment.nameSource==='university';
    const threshold=university ? .38 : (minimumScale[style]??Infinity);
    if(pixelsPerMetre<threshold)continue;
    const name=segment.name,length=ctx.measureText(name).width;
    for(const run of visibleRuns(segment.ring,project,width,height)){
      const total=run.at(-1).s,half=(length+6)/2;
      if(total<half*2+4)continue;
      const offsets=[total/2];
      if(total>2*(half+margin+2))offsets.push(half+margin+2,total-half-margin-2);
      for(let off=half+2;off<=total-half-2;off+=Math.max(34,length*.8))offsets.push(off);
      for(const off of offsets){
        const mid=along(run,off),a=along(run,off-half),b=along(run,off+half);
        const dx=b.x-a.x,dy=b.y-a.y,chord=Math.hypot(dx,dy);
        if(chord<half*2*.96)continue;
        let angle=Math.atan2(dy,dx);
        if(angle>Math.PI/2)angle-=Math.PI;
        if(angle< -Math.PI/2)angle+=Math.PI;
        const vertical=Math.abs(angle)>Math.PI/3&&/^[\p{Script=Han}]+$/u.test(name);
        const c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));
        // At a steep angle, Chinese glyphs stand upright in a top-to-bottom column.
        const rx=vertical?(length-size)*c/2+size/2:(length*c+size*s)/2;
        const ry=vertical?(length-size)*s/2+size/2:(length*s+size*c)/2;
        const box=[mid.x-rx-4,mid.y-ry-4,mid.x+rx+4,mid.y+ry+4];
        if(box[0]<margin||box[1]<margin||box[2]>width-margin||box[3]>height-margin||reserved.some(r=>overlaps(r,box)))continue;
        const centreDistance=Math.hypot((mid.x-width/2)/width,(mid.y-height/2)/height);
        candidates.push({name,priority:university?-1:order.indexOf(style),mid,a,b,angle,vertical,box,score:centreDistance+(1-chord/(2*half))*4});
      }
    }
  }
  candidates.sort((a,b)=>a.priority-b.priority||a.score-b.score);
  const names=new Set();
  function glyph(text,x,y){ctx.strokeText(text,x,y);ctx.fillText(text,x,y)}
  for(const cand of candidates){
    const {name,mid,a,b,angle,vertical,box}=cand;
    if(names.has(name)||drawn.some(d=>overlaps(d.box,box)))continue;
    if(![mid,a,b].every(p=>index.hit(p.world)?.segment?.name===name))continue;
    if(vertical){
      const letters=Array.from(name),step=ctx.measureText(name).width/letters.length,sign=angle<0?-1:1;
      letters.forEach((ch,i)=>{const d=(i-(letters.length-1)/2)*step*sign;glyph(ch,mid.x+d*Math.cos(angle),mid.y+d*Math.sin(angle))});
    }else{
      ctx.save();ctx.translate(mid.x,mid.y);ctx.rotate(angle);glyph(name,0,0);ctx.restore();
    }
    names.add(name);drawn.push({name,box,angle});
    if(drawn.length>=limit)break;
  }
  ctx.restore();return drawn;
}
