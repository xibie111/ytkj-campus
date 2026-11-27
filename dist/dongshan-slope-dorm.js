import * as THREE from './vendor/three.module.js';

const between=(a,b,t)=>a.map((x,i)=>x+t*(b[i]-x));
const middle=section=>between(section[0],section[1],.5);
const at=(p,h)=>[p[0],h,p[1]];
const length=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);

export function slopeDormWings(item) {
  const model=item.slopeDorm;
  return model.wings.map(wing=>{
    const cross=wing.sectionIndices.map(i=>model.sections[i]);
    const roofCross=model.roofSections?wing.sectionIndices.map(i=>model.roofSections[i]):cross;
    return {wing,cross,roofCross,ring:[...cross.map(t=>t[0]),...cross.map(t=>t[1]).reverse()]};
  });
}

// Split a roof face by the four plan edges of the photographed finish band.
function addRoofFinish(g, triangle, slopeColor, finishColor, limits) {
  function emit(vertices, color) {
    if(vertices.length < 3) return;
    const first=g.vertex(vertices[0],color);
    for(let i=1;i<vertices.length-1;i++){
      const [a,b,c]=[vertices[0],vertices[i],vertices[i+1]];
      const area=(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]);
      if(Math.abs(area)>1e-8) g.indices.push(first,g.vertex(b,color),g.vertex(c,color));
    }
  }

  let current=triangle;
  for(const distance of limits){
    const inside=[], outside=[];
    for(let i=0;i<current.length;i++){
      const p=current[i],q=current[(i+1)%current.length];
      const a=distance(p),b=distance(q);
      if(a>=0) inside.push(p);
      if(a<=0) outside.push(p);
      if((a>0&&b<0)||(a<0&&b>0)){
        const cut=between(p,q,a/(a-b));
        inside.push(cut);outside.push(cut);
      }
    }
    emit(outside,slopeColor);
    if(inside.length<3) return;
    current=inside;
  }
  emit(current,finishColor);
}

function addHipFace(g, corners, color, finish, limits) {
  if(!finish){
    const ids=corners.map(v=>g.vertex(v,color));
    g.indices.push(ids[0],ids[1],ids[2]);
    if(ids.length===4)g.indices.push(ids[0],ids[2],ids[3]);
    return;
  }
  addRoofFinish(g,corners.slice(0,3),color,finish.color,limits);
  if(corners.length===4) addRoofFinish(g,[corners[0],corners[2],corners[3]],color,finish.color,limits);
}

function hip(g,cross,eave,rise,finish) {
  const near=cross[0],far=cross.at(-1),start=middle(near),end=middle(far);
  const distance=length(start,end),nearInset=Math.min(.32,length(...near)*.45/distance);
  const farInset=Math.min(.32,length(...far)*.45/distance);
  const ridgeA=at(between(start,end,nearInset),eave+rise),ridgeB=at(between(start,end,1-farInset),eave+rise);
  let limits;
  if(finish){
    const dx=(end[0]-start[0])/distance,dz=(end[1]-start[1])/distance;
    const along=([x,,z])=>(x-start[0])*dx+(z-start[1])*dz;
    const across=([x,,z])=>(z-start[1])*dx-(x-start[0])*dz;
    const low=distance*finish.along[0],high=distance*finish.along[1];
    const halfWidth=(length(...near)+length(...far))*finish.widthFraction/4;
    limits=[point=>along(point)-low,point=>high-along(point),
      point=>across(point)+halfWidth,point=>halfWidth-across(point)];
  }
  // Follow each mapped long edge, including the short transition in No. 9.
  const facets=(side,reverse)=>{
    const points=cross.map(t=>at(t[side],eave));
    for(let i=0;i<points.length-1;i++){
      const a=i===0?ridgeA:at(middle(cross[i]),eave+rise);
      const b=i===points.length-2?ridgeB:at(middle(cross[i+1]),eave+rise);
      const corners=length([a[0],a[2]],[b[0],b[2]])<.001?[points[i],a,points[i+1]]:[points[i],a,b,points[i+1]];
      if(reverse)corners.reverse();
      addHipFace(g,corners,side===0?'#787c79':'#80817c',finish,limits);
    }
  };
  facets(0,false);facets(1,true);
  for(const pts of [[at(near[0],eave),at(near[1],eave),ridgeA],[at(far[0],eave),ridgeB,at(far[1],eave)]])
    addHipFace(g,pts,'#777b77',finish,limits);
}

export function createSlopeDorm(item,material,g,{makeEdge,face,projection},ground) {
  const model=item.slopeDorm,wings=slopeDormWings(item),base=item.baseY??item.modelBaseMetres;
  const foot=Math.min(-.35,...item.ring.map(([x,z])=>(ground?.(x,z)??base)-base-.4));
  const cap=(edge,eave)=>{
    projection(g,edge,0,edge.length,eave-.65,eave-.38,.23,'#66686a');
    projection(g,edge,0,edge.length,eave-.38,eave,.32,'#c9c7bc');
  };
  function front(edge,wing,photoFacing) {
    const top=wing.eave;
    const skirt=top-wing.fiveRowDepth;
    const bays=Math.max(2,Math.round(edge.length/3.1)),count=5;
    face(g,edge,0,edge.length,foot,skirt,0,'#a58470');
    // A distinct row of recessed openings is visible below the five upper rows.
    if(photoFacing&&wing.podiumOpenings){
      const lower=Math.max(foot+.15,skirt-2.75);
      for(let i=0;i<bays;i++){
        const x0=(i+.18)*edge.length/bays,x1=(i+.82)*edge.length/bays;
        face(g,edge,x0,x1,lower,skirt-.5,.025,'#535450');
      }
    }
    const uv=[[0,0],[0,count],[bays/3,count],[bays/3,0]];
    face(g,edge,0,edge.length,skirt,top-.65,0,'#dbd4c8',uv);
    for(let i=1;i<bays;i++){
      if(i%5!==1&&i%5!==3)continue;
      const x=i*edge.length/bays;
      projection(g,edge,x-.2,x+.2,skirt,top-3.6,.15,'#aa826a');
    }
    cap(edge,top);
  }
  for(const {cross,roofCross,wing} of wings){
    for(let i=0;i<cross.length-1;i++){
      front(makeEdge(cross[i][0],cross[i+1][0]),wing,true);
      front(makeEdge(cross[i+1][1],cross[i][1]),wing,false);
    }
    if(roofCross!==cross) {
      // The imagery resolves the west eave. Keep the existing mapped wall
      // feet, and close the underside between that wall and the roof edge.
      for(let i=0;i<cross.length-1;i++)for(let side=0;side<2;side++){
        const j=side?i+1:i,k=side?i:i+1;
        const a=cross[j][side],b=cross[k][side],u=roofCross[j][side],v=roofCross[k][side];
        if(Math.max(length(a,u),length(b,v))<.008)continue;
        face(g,makeEdge(u,v),0,length(u,v),wing.eave-.25,wing.eave,0,'#b5b5aa');
        const vertices=[at(a,wing.eave-.25),at(u,wing.eave-.25),at(v,wing.eave-.25),at(b,wing.eave-.25)];
        for(const [x,y,z] of [[0,1,2],[0,2,3]]){
          const [e,f,h]=[vertices[x],vertices[y],vertices[z]];
          const crossXZ=(f[0]-e[0])*(h[2]-e[2])-(f[2]-e[2])*(h[0]-e[0]);
          if(Math.abs(crossXZ)>.001)g.indices.push(...(crossXZ>0?[e,f,h]:[e,h,f]).map(pt=>g.vertex(pt,'#aea99c')));
        }
      }
    }
    hip(g,roofCross,wing.eave,wing.rise,wing.roofFinish);
  }
  const west=wings[0],east=wings[1],first=west.cross[0],joint=east.cross[0],last=east.cross.at(-1);
  function endWall(edge,low,top,plinth) {
    if(plinth>low)face(g,edge,0,edge.length,low,plinth,0,'#a58570');
    face(g,edge,0,edge.length,Math.max(low,plinth),top,0,'#e3ded1');cap(edge,top);
  }
  endWall(makeEdge(first[1],first[0]),foot,west.wing.eave,west.wing.eave-west.wing.fiveRowDepth);
  endWall(makeEdge(last[0],last[1]),foot,east.wing.eave,east.wing.eave-east.wing.fiveRowDepth);
  endWall(makeEdge(joint[1],joint[0]),west.wing.eave,east.wing.eave,west.wing.eave);
  for(let i=0;i<model.sections.length-1;i++){
    const a=model.sections[i],b=model.sections[i+1];
    g.quad(at(a[0],foot),at(b[0],foot),at(b[1],foot),at(a[1],foot),'#a7a397');
  }
  const mesh=new THREE.Mesh(g.build(),material);
  mesh.name=item.name;mesh.position.y=base;mesh.castShadow=mesh.receiveShadow=true;
  mesh.userData.buildingId=item.id;
  mesh.userData.slopeDormProfile={sources:model.sources,sections:model.sections,wings:model.wings};
  return mesh;
}
