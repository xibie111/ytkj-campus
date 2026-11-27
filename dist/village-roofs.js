import {groundPolygonDistance} from './terrain-surface.js';

// The front gable anchors each pad to the existing hillside. Limit changes
// to the building and its immediate verge so adjacent lanes keep their grade.
export function villageHousePads(buildings, heightAt) {
  const blend = 2;
  return buildings.filter(building => building.villageRoof && !building.villageRoof.keepTerrain).map(building => {
    const {ridgeXZ} = building.villageRoof;
    const level = heightAt(...ridgeXZ[0]);
    const distance = groundPolygonDistance(building.ring, blend + 12);
    return {
      blend,
      subdivisions: 18,
      distance,
      adjust(x, z, original) {
        const d = distance(x, z);
        if (d >= blend) return original;
        const t = Math.max(0, Math.min(1, d / blend));
        const weight = t * t * (3 - 2 * t);
        return level + (original - level) * weight;
      }
    };
  });
}

export function drawVillageRoof(record, ground, tri) {
  const {villageRoof} = record;
  const ring = villageRoof.eavesXZ || record.ring;
  const {ridgeXZ, eaveHeight, rise} = villageRoof;
  // A footprint-derived roof can anchor to the centre of a sloped site.
  const level = ground(...(villageRoof.eaveAnchorXZ || ridgeXZ[0])) + eaveHeight;
  const xyz = ([x,z], y) => [x, y, z];
  const quad = (a,b,c,d,colour) => { tri(a,b,c,colour); tri(a,c,d,colour); };
  // Ring order follows the photograph: front-left, rear-left, rear-right, front-right.
  const eaves = ring.map(p => xyz(p, level));
  const ridge = ridgeXZ.map(p => xyz(p, level + rise));
  const along = [ring[1][0]-ring[0][0], ring[1][1]-ring[0][1]];
  const across = [ring[3][0]-ring[0][0], ring[3][1]-ring[0][1]];
  const unit = a => a.map(v => v / Math.hypot(...a));
  const u = unit(along), v = unit(across);
  const shift = (p, du, dv, dy) => [p[0]+u[0]*du+v[0]*dv,p[1]+dy,p[2]+u[1]*du+v[1]*dv];
  const h = Math.hypot(...across);
  const pitch = 2 * rise / h;
  const inset = .18;
  const signs = [[1,1],[-1,1],[-1,-1],[1,-1]];
  const wall = eaves.map((p,i) => shift(p, signs[i][0]*inset, signs[i][1]*inset, -.14));
  const foot = wall.map(p => [p[0], ground(p[0],p[2])-.16, p[2]]);
  for (let i=0;i<4;i++) {
    const j=(i+1)%4;
    quad(foot[i],wall[i],wall[j],foot[j],'#d8d2c3');
  }
  const upper = ridge.map((p,i) => shift(p,i===0?inset:-inset,0,-.14));
  tri(wall[0],wall[3],upper[0],'#e4ddd0');
  tri(wall[2],wall[1],upper[1],'#e4ddd0');

  // Two tiled planes, with a narrow cap and a pale fascia matching the visible gables.
  if (villageRoof.leftCourseMetres) {
    const count=Math.max(1,Math.round(Math.hypot(h/2,rise)/villageRoof.leftCourseMetres));
    const point=(end,t,lip)=>eaves[end].map((value,i)=>value+(ridge[end][i]-value)*t+(i===1?lip:0));
    for(let i=0;i<count;i++) {
      const lower=i/count, higher=(i+1)/count, lip=i===0?0:.022;
      quad(point(0,lower,lip),point(0,higher,0),point(1,higher,0),point(1,lower,lip),'#b66e53');
      if(lip)quad(point(0,lower,0),point(0,lower,lip),point(1,lower,lip),point(1,lower,0),'#9f6550');
    }
  } else {
    quad(eaves[0],ridge[0],ridge[1],eaves[1],'#b66e53');
  }
  quad(ridge[0],eaves[3],eaves[2],ridge[1],'#c98462');
  for (const [a,b] of [[eaves[0],eaves[1]],[eaves[2],eaves[3]],
    [eaves[3],ridge[0]],[ridge[0],eaves[0]],[eaves[1],ridge[1]],[ridge[1],eaves[2]]]) {
    quad(a,b,shift(b,0,0,-.15),shift(a,0,0,-.15),'#d4bdab');
  }
  const crown = ridge.map(p => shift(p,0,0,.095));
  for (const side of [-1,1]) {
    const lip = ridge.map(p => shift(p,0,.12*side,-.12*pitch+.012));
    quad(lip[0],crown[0],crown[1],lip[1],'#b77c65');
  }
  for(const flank of villageRoof.flanks||[])drawFlank(flank,level,ground,quad);
}

function drawFlank(flank, eave, ground, addQuad) {
  const [front,back,,outside]=flank.ringXZ;
  const gridded=flank.finish==='cool-grid';
  // The left and right rings follow opposite windings at their common wall.
  const quad=flank.side==='left'?addQuad:(a,b,c,d,colour)=>addQuad(a,d,c,b,colour);
  const point=(along,across,y)=>[front[0]+along*(back[0]-front[0])+across*(outside[0]-front[0]),
    y,front[1]+along*(back[1]-front[1])+across*(outside[1]-front[1])];
  const top=(along,across,offset=0)=>point(along,across,eave-.055+across*(.055-flank.outerDrop)+offset);
  const corners=[[0,0],[1,0],[1,1],[0,1]];
  const upper=corners.map(([a,b])=>top(a,b));
  const lower=upper.map(([x,,z])=>[x,ground(x,z)-.15,z]);
  // The inner edge meets the main wall; only the three exposed sides need faces.
  for(const i of [1,2,3]) {
    const j=(i+1)%4;
    const lip=upper[i].map((v,k)=>v-(k===1?.15:0));
    const nextLip=upper[j].map((v,k)=>v-(k===1?.15:0));
    quad(lower[i],lower[j],nextLip,lip,'#d5cfc0');
    quad(lip,nextLip,upper[j],upper[i],'#c7b9a7');
    if(gridded){
      const at=(u,t)=>lower[i].map((v,k)=>{
        const bottom=v+u*(lower[j][k]-v), upper=lip[k]+u*(nextLip[k]-lip[k]);
        // Keep glazing clear of the wall at grazing angles.
        const outward=k===0?(outside[0]-front[0]):k===2?(outside[1]-front[1]):0;
        const end=k===0?(back[0]-front[0]):k===2?(back[1]-front[1]):0;
        const displacement=i===2?outward/flank.widthMetres:(i===1?1:-1)*end/Math.hypot(back[0]-front[0],back[1]-front[1]);
        return bottom+(upper-bottom)*t+.025*displacement;
      });
      quad(at(.04,.39),at(.96,.39),at(.96,.91),at(.04,.91),'#839492');
    }
  }
  quad(...upper,gridded?'#a7b1ae':'#c9c6b8');
  if(!gridded)return;
  const n=Math.round(Math.hypot(back[0]-front[0],back[1]-front[1])/.82);
  const m=Math.max(1,Math.round(flank.widthMetres/.63));
  for(let i=0;i<n;i++)for(let j=0;j<m;j++){
    const a=(i+.022)/n,b=(i+.978)/n,c=(j+.026)/m,d=(j+.974)/m;
    quad(top(a,c,.012),top(b,c,.012),top(b,d,.012),top(a,d,.012),'#8d9d99');
  }
}
