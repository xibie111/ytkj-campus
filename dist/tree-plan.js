// x and z are east and south in metres, just like the model. Bake the small
// garden crowns on first close viewing. Woodland keeps its map-scale symbols.
function crownReach(lobes) {
  return lobes.reduce((radius,[x,z,rx,rz])=>
    Math.max(radius,Math.max(Math.abs(x),Math.abs(z))+1.15*Math.max(rx,rz)),0);
}
function crownStamp(site,detail) {
  const lobes=site.planCrown,size=2*crownReach(lobes);
  const stamp=document.createElement('canvas');
  stamp.width=stamp.height=detail?384:48;
  const ctx=stamp.getContext('2d');
  ctx.translate(stamp.width/2,stamp.height/2);ctx.scale(stamp.width/size,stamp.height/size);
  const evergreen=site.kind==='cypress';
  const treeSeed=(Math.round(site.x*100)*65537+Math.round(site.z*100))>>>0;
  let seed=treeSeed;
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
  for(const [index,[x,z,rx,rz,angle,light]] of lobes.entries()){
    seed=(treeSeed+Math.imul(index,2654435761))>>>0;
    ctx.save();ctx.translate(x,z);ctx.rotate(angle);ctx.scale(rx,rz);
    // Keep the light on the north-west side even as individual lobes turn.
    const litAngle=-2.3-angle,lx=Math.cos(litAngle),lz=Math.sin(litAngle);
    const gradient=ctx.createRadialGradient(lx*.45,lz*.45,.04,0,0,1.12);
    const hue=evergreen?129:99;
    const tone=(evergreen?31:44)+light*(evergreen?8:9);
    gradient.addColorStop(0,`hsl(${hue-3} 23% ${tone+3}%)`);
    gradient.addColorStop(.7,`hsl(${hue} 21% ${tone-1}%)`);
    gradient.addColorStop(1,`hsl(${hue+4} 19% ${tone-7}%)`);
    const phase=random()*Math.PI*2;
    ctx.beginPath();
    for(let i=0;i<80;i++){
      const a=i*Math.PI/40;
      const r=1+.072*Math.cos(3*a+phase)+.043*Math.sin(5*a-phase)+.021*Math.cos(13*a+phase);
      const px=r*Math.cos(a),pz=r*Math.sin(a);
      if(i)ctx.lineTo(px,pz);else ctx.moveTo(px,pz);
    }
    ctx.closePath();ctx.fillStyle=gradient;ctx.fill();ctx.clip();
    // Small groups follow the direction of the growing tips. Each stamp is
    // cached, so enlarging or panning the plan never redistributes the leaves.
    const tips=detail?(evergreen?250:185):0;
    for(let i=0;i<tips;i++){
      const a=random()*Math.PI*2,dist=Math.sqrt(random())*1.08;
      const px=dist*Math.cos(a),pz=dist*Math.sin(a);
      const sun=.5+.5*(px*lx+pz*lz);
      ctx.fillStyle=random()<.38
        ? `hsla(${hue+4} 24% ${tone-19}% / .32)`
        : `hsla(${hue-9} 31% ${tone+14+13*sun}% / .43)`;
      const length=(evergreen?.052:.066)+random()*.066,twig=a+(random()-.5)*1.4;
      for(const bend of [-.45,.45]){
        ctx.beginPath();
        ctx.ellipse(px+Math.cos(twig+bend)*length*.45,pz+Math.sin(twig+bend)*length*.45,
          length*.64,length*(evergreen?.13:.28),twig+bend,0,Math.PI*2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  return {stamp,size};
}

// A small shared outline reads as foliage when the plan resolves a crown.
function woodlandOutline() {
  const outline = new Path2D();
  for (let i = 0; i < 48; ++i) {
    const angle = i * Math.PI / 24;
    const radius = .91 + .075 * Math.cos(angle * 5) + .045 * Math.sin(angle * 3 + .4);
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    if (i) outline.lineTo(x, z); else outline.moveTo(x, z);
  }
  outline.closePath();
  return outline;
}

export function createTreePlan(sites) {
  const tiles=new Map(), tileMetres=128, smallCrowns=new WeakMap(), largeCrowns=new WeakMap();
  for(const site of sites){
    const x=Math.floor(site.x/tileMetres)*tileMetres,z=Math.floor(site.z/tileMetres)*tileMetres;
    const key=x+','+z;
    if(!tiles.has(key))tiles.set(key,{x,z,pad:0,sites:[]});
    const tile=tiles.get(key);
    const radius=site.planCrown?.length?crownReach(site.planCrown):site.mapRadius;
    tile.pad=Math.max(tile.pad,site.mapRadius,radius);
    tile.sites.push(site);
  }

  const crown=woodlandOutline();
  return function drawTrees(ctx,[left,top,right,bottom],scale) {
    ctx.fillStyle='#758e6c99';
    const minRadius=.6/scale;
    for(const tile of tiles.values()){
      const pad=Math.max(minRadius,tile.pad);
      if(tile.x-pad>right||tile.z-pad>bottom||tile.x+tileMetres+pad<left||tile.z+tileMetres+pad<top)continue;
      for(const site of tile.sites){
        const {x,z,mapRadius}=site;
        if(x+pad<left||z+pad<top||x-pad>right||z-pad>bottom)continue;
        const radiusPixels=mapRadius*scale;
        if(site.planCrown?.length && radiusPixels>=4){
          const detail=radiusPixels>=18,stamps=detail?largeCrowns:smallCrowns;
          if(!stamps.has(site))stamps.set(site,crownStamp(site,detail));
          const {stamp,size}=stamps.get(site);
          ctx.drawImage(stamp,x-size/2,z-size/2,size,size);
        }else if(site.crownAngle!==undefined && radiusPixels>=4){
          ctx.save();ctx.translate(x,z);ctx.rotate(-site.crownAngle);ctx.scale(mapRadius,mapRadius);
          ctx.fill(crown);ctx.restore();
        }else{
          ctx.beginPath();ctx.arc(x,z,Math.max(minRadius,mapRadius),0,Math.PI*2);ctx.fill();
        }
      }
    }
  };
}
