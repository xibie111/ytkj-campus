import * as THREE from './vendor/three.module.js';

// Chainage zero is where the north straight enters the west bend. The
// university photograph shows a detached straight bank, a wide access break,
// then stepped concrete banks separated by stair aisles on the bend.
const sections = [
  [-59, -9, 'bank'],
  [-4, -2, 'aisle'], [-2, 12, 'bank'], [12, 15.5, 'aisle'],
  [15.5, 26, 'bank'], [26, 30, 'aisle'],
  [34, 38.5, 'aisle'], [38.5, 65, 'bank'], [65, 68.5, 'aisle'],
  [68.5, 93, 'bank'], [93, 96, 'aisle'],
];
const landing = 1.5, depth = 6.0, rows = 7, rise = .29;
const foot = '#c6bba7', tread = '#c3b9a7', stair = '#d8cebb', riser = '#a79a89';
const source = 'https://www.ytkj.edu.cn/info/1081/8367.htm';

// The sports renderer supplies the existing model's track axes.
// All surfaces here share its local frame, apron radius and ground datum.
export function createTerraceLayout(straight, radius, offset, turn) {
  const co = Math.cos(turn), si = Math.sin(turn), half = straight / 2;
  const quads = [], plan = [];

  function point(station, outward, height) {
    const t = Math.max(station, 0) / radius;
    const x = half + Math.min(station, 0) + (radius + outward) * Math.sin(t);
    const z = (radius + outward) * Math.cos(t);
    return [co*x-si*z, height, offset+si*x+co*z];
  }

  function addQuad(a, b, c, d, color) { quads.push([a, b, c, d, color]); }

  function row(stations, inside, outside, base, top, fill, rear) {
    const near = stations.map(s => point(s, inside, top));
    const far = stations.map(s => point(s, outside, top));
    plan.push({ring: [...near, ...far.slice().reverse()], fill, edge: near});
    for (let i = 0; i < stations.length-1; i++) {
      const a = stations[i], b = stations[i+1];
      addQuad(near[i], far[i], far[i+1], near[i+1], fill);
      addQuad(point(a,inside,base), near[i], near[i+1], point(b,inside,base), riser);
      if (rear) addQuad(point(b,outside,-.12), far[i+1], far[i], point(a,outside,-.12), riser);
    }
    const first = stations[0], last = stations.at(-1);
    addQuad(point(first,outside,-.12), far[0], near[0], point(first,inside,-.12), riser);
    addQuad(point(last,inside,-.12), near.at(-1), far.at(-1), point(last,outside,-.12), riser);
  }

  for (const [start, end, kind] of sections) {
    const pieces = Math.max(1,Math.ceil((end-start)/2.5));
    const stations = Array.from({length: pieces+1}, (_,i) => start+(end-start)*i/pieces);
    // Include the tangent point exactly so the straight joins the bend.
    if (start < 0 && end > 0 && !stations.includes(0)) stations.push(0);
    stations.sort((a,b) => a-b);
    // The curved inner edge is tessellated into straight chords. A 2 cm
    // joint keeps these chords entirely outside the rubber apron's curve.
    row(stations, .02, landing, -.12, .075, foot, false);
    const count = kind === 'aisle' ? rows*2 : rows;
    for (let i=0; i<count; i++) {
      row(stations, landing+depth*i/count, landing+depth*(i+1)/count,
        .075+rows*rise*i/count, .075+rows*rise*(i+1)/count, kind==='aisle' ? stair : tread, i===count-1);
    }
  }

  function drawPlan(ctx) {
    ctx.save();
    for (const {ring, fill, edge} of plan) {
      ctx.fillStyle=fill;
      ctx.beginPath(); ctx.moveTo(ring[0][0],ring[0][2]);
      for (const p of ring.slice(1)) ctx.lineTo(p[0],p[2]);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle=riser; ctx.lineWidth=.12;
      ctx.beginPath(); ctx.moveTo(edge[0][0],edge[0][2]);
      for (const p of edge.slice(1)) ctx.lineTo(p[0],p[2]);
      ctx.stroke();
    }
    ctx.restore();
  }

  function mesh(overlayHeight) {
    const positions=[], colors=[], color=new THREE.Color();
    for (const [a,b,c,d,fill] of quads) {
      color.set(fill);
      for (const v of [a,b,c,a,c,d]) {
        positions.push(v[0],v[1],v[2]); colors.push(color.r,color.g,color.b);
      }
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors,3));
    g.computeVertexNormals();
    const item=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.96}));
    item.name='田径场北侧与西弯道露天看台';
    item.position.y=-overlayHeight;
    item.castShadow=item.receiveShadow=true;
    item.userData={source, publicationDate:'2026-09-20',
      photograph:'https://www.ytkj.edu.cn/__local/4/AE/F4/EC39BD46E57E35DA7C935115075_9F33D088_C604F.jpg',
      basis:'学校运动场航拍可辨露天台阶、分区与横向走道。段长、级数、宽高和端部按现有跑道近似。'};
    return item;
  }

  function excludesTree(u, v) {
    let station=u-half, distance=v-radius;
    if (u>half) {
      station=Math.atan2(u-half,v)*radius;
      distance=Math.hypot(u-half,v)-radius;
    }
    if (distance < -1 || distance > landing+depth+1.2) return false;
    return sections.some(([start,end]) => station>=start-1 && station<=end+1);
  }

  return {drawPlan, mesh, excludesTree};
}
