import * as THREE from './vendor/three.module.js';

// Match the metre-based dashes in tools/roads.py in the plan view.
const dashLength=5;
const dashCycle=9;

function lerpPoint(a,b,t){
  return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
}

function pointOn(leg,distance){
  return lerpPoint(leg.a,leg.b,(distance-leg.start)/(leg.end-leg.start));
}

function measureWalk(ring){
  let total=0;
  const legs=[];
  for(let i=1;i<ring.length;i++){
    const a=ring[i-1],b=ring[i];
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(length===0)continue;
    legs.push({a,b,start:total,end:total+length});
    total+=length;
  }
  const dashes=[];
  for(let start=0;start<total;start+=dashCycle){
    const dash=[];
    const end=Math.min(total,start+dashLength);
    for(const leg of legs){
      const from=Math.max(leg.start,start),to=Math.min(leg.end,end);
      if(to<=from)continue;
      if(!dash.length)dash.push({distance:from,point:pointOn(leg,from)});
      dash.push({distance:to,point:pointOn(leg,to)});
    }
    dashes.push(dash);
  }
  return {total,legs,dashes};
}

function createModelHighlight(surface,maxLegs,scene){
  const uniforms={
    legs:{value:Array.from({length:maxLegs},()=>new THREE.Vector4())},
    starts:{value:new Float32Array(maxLegs)},
    count:{value:0}, distance:{value:0}, advancing:{value:false},
    ink:{value:new THREE.Color()}, edge:{value:new THREE.Color()}
  };
  const material=new THREE.ShaderMaterial({
    uniforms,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-8,
    vertexShader:`
      varying vec2 ground;
      void main(){
        ground=position.xz;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }`,
    fragmentShader:`
      varying vec2 ground;
      uniform vec4 legs[${maxLegs}];
      uniform float starts[${maxLegs}];
      uniform int count;
      uniform float distance;
      uniform bool advancing;
      uniform vec3 ink, edge;
      void main(){
        float nearest=2.0, along=0.0;
        for(int i=0;i<${maxLegs};i++){
          if(i>=count)break;
          vec2 a=legs[i].xy, delta=legs[i].zw-a;
          float t=clamp(dot(ground-a,delta)/dot(delta,delta),0.0,1.0);
          float side=length(ground-a-t*delta);
          if(side<nearest){
            nearest=side;
            along=starts[i]+t*length(delta);
          }
        }
        if(nearest>1.015||along>distance)discard;
        float band=smoothstep(0.54,0.86,nearest);
        if(advancing)band=max(band,0.8*(1.0-smoothstep(0.0,5.0,distance-along)));
        gl_FragColor=vec4(mix(ink,edge,band),1.0);
        #include <colorspace_fragment>
      }`
  });
  // Reuse road triangles clipped to terrain and buildings. Keep this overlay
  // outside the exportable scene root, with the regular scene depth test.
  const mesh=new THREE.Mesh(surface.geometry,material);
  mesh.visible=false;
  mesh.renderOrder=2;
  scene.add(mesh);
  return {
    mesh,
    select(legs){
      uniforms.count.value=legs.length;
      legs.forEach(({a,b,start},index)=>{
        uniforms.legs.value[index].set(a[0],a[1],b[0],b[1]);
        uniforms.starts.value[index]=start;
      });
    },
    draw(distance,finished,night){
      uniforms.distance.value=distance+.0001;
      uniforms.advancing.value=!finished;
      uniforms.ink.value.set(night?'#ffcf83':'#a45419');
      uniforms.edge.value.set(night?'#5d371d':'#fff0c5');
    }
  };
}

export function createRouteMotion({stage,canvas,walkSurface,maxWalkLegs,scene,W,H,project}){
  const ctx=canvas.getContext('2d');
  const model=walkSurface&&maxWalkLegs?createModelHighlight(walkSurface,maxWalkLegs,scene):null;
  let previousRing,walk,start,duration,finished=false;

  return ({ring,now,redraw,inModel,cameraMoving,visible,reduced,night})=>{
    if(!ring&&!previousRing)return false;
    const changed=previousRing!==ring;
    if(changed){
      previousRing=ring;
      walk=ring&&measureWalk(ring);
      start=now+(cameraMoving?(inModel?105:35):0);
      duration=Math.min(900,Math.max(530,480+(walk?.total||0)*1.95));
      finished=false;
      if(walk)model?.select(walk.legs);
    }
    const showing=Boolean(walk?.total)&&visible;
    const showModel=showing&&inModel&&Boolean(model);
    const showPlan=showing&&!inModel&&Boolean(ctx);
    const modelChanged=Boolean(model)&&model.mesh.visible!==showModel;
    const planChanged=canvas.hidden===showPlan;
    if(modelChanged)model.mesh.visible=showModel;
    if(planChanged)canvas.hidden=!showPlan;
    if(!showModel&&!showPlan){
      delete stage.dataset.routeAnimating;
      return modelChanged;
    }
    if(finished&&!redraw&&!modelChanged&&!planChanged)return false;

    const progress=finished||reduced?1:Math.max(0,Math.min(1,(now-start)/duration));
    finished=progress===1;
    if(finished)delete stage.dataset.routeAnimating;
    else if(!stage.hasAttribute('data-route-animating'))stage.dataset.routeAnimating='true';
    if(progress===0&&!redraw&&!changed&&!modelChanged&&!planChanged)return false;

    const distance=walk.total*progress*(2-progress);
    if(showModel){
      model.draw(distance,finished,night);
      return true;
    }

    const width=W(),height=H();
    const ratio=Math.min(2,devicePixelRatio);
    const pixelWidth=Math.round(width*ratio),pixelHeight=Math.round(height*ratio);
    if(canvas.width!==pixelWidth)canvas.width=pixelWidth;
    if(canvas.height!==pixelHeight)canvas.height=pixelHeight;
    ctx.setTransform(pixelWidth/width,0,0,pixelHeight/height,0,0);
    ctx.clearRect(0,0,width,height);
    if(progress===0)return modelChanged;

    ctx.beginPath();
    for(const dash of walk.dashes){
      const first=dash[0];
      if(first.distance>=distance)break;
      ctx.moveTo(...project(first.point));
      for(let i=1;i<dash.length;i++){
        const sample=dash[i];
        if(sample.distance<=distance){
          ctx.lineTo(...project(sample.point));
          continue;
        }
        const previous=dash[i-1];
        const t=(distance-previous.distance)/(sample.distance-previous.distance);
        ctx.lineTo(...project(lerpPoint(previous.point,sample.point,t)));
        break;
      }
    }
    ctx.lineJoin='round';
    ctx.strokeStyle=night?'#2b1c12d9':'#fff0c5e0';
    ctx.lineWidth=5;
    ctx.stroke();
    ctx.strokeStyle=night?'#ffcf83':'#a45419';
    ctx.lineWidth=2.6;
    ctx.stroke();

    if(!finished){
      const leg=walk.legs.find(part=>distance<=part.end);
      const [x,y]=project(pointOn(leg,distance));
      const radius=3+1.4*Math.sin(Math.PI*progress);
      ctx.beginPath();
      ctx.arc(x,y,radius,0,Math.PI*2);
      ctx.fillStyle=night?'#ffe4a5':'#a45419';
      ctx.fill();
      ctx.lineWidth=1.5;
      ctx.strokeStyle=night?'#2b1c12':'#fff2ca';
      ctx.stroke();
    }
    return modelChanged;
  };
}
