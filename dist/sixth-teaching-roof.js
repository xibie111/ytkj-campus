// The university views dated 2025-04-08 and 2024-11-30 show the same tower and
// open metal frame above the west wall. The other wings have a pale deck.
const wall = '#e3ded2';
const trim = '#d8d7cd';
const charcoal = '#596166';
const darkGlazing = '#475e65';

function westSpan(edge) {
  return [edge.length * .317, edge.length * .433];
}

function windowBay(g, edge, left, right, low, high, out, face) {
  face(g, edge, left, right, low, high, out, '#b3b9b5');
  face(g, edge, left + .07, right - .07, low + .08, high - .08, out + .012, darkGlazing);
  if (right - left > 1.6) {
    const mid = (left + right) / 2;
    face(g, edge, mid - .03, mid + .03, low, high, out + .02, trim);
  }
  face(g, edge, left, right, high - .61, high - .56, out + .024, trim);
}

// These positions come from the second visible row in the native 8478
// photograph. The end openings are wide and the tower bay has four lights.
const westWindows = [[2795,2816],[2828,2838],[2846,2854],[2863,2872],[2881,2888],
  [2901,2908],[2917,2926],[2934,2943],[2951,2960],[2971,2979],[2987,2996],
  [3013,3021],[3029,3037],[3044,3050],[3063,3070],[3081,3088],[3096,3104],
  [3120,3128],[3135,3143],[3156,3164],[3171,3179],[3194,3203],[3210,3219],
  [3230,3241],[3249,3258],[3266,3277],[3285,3295],[3306,3322]];

export function sixthTeachingWall(g, edge, west, north, foundation, roofY, floors, {face,projection}) {
  face(g,edge,0,edge.length,foundation,roofY,0,wall);
  if (edge === west) {
    const [left,right] = westSpan(edge);
    const station = pixel => {
      const u = (pixel - 2710) / (3408 - 2710);
      return edge.length * (1 - u / (1.07 - .07 * u));
    };
    const top = roofY - .32;
    face(g,edge,0,left,top-2.38,roofY,.012,charcoal);
    face(g,edge,right,edge.length,top-2.38,roofY,.012,charcoal);
    projection(g,edge,0,edge.length,top-2.63,top-2.36,.15,trim);
    // Five rows are visible on this downhill elevation. The lowest ones
    // continue into the existing foundation and disappear behind terrain.
    for (let row = 0; row < 5; row++) {
      const head = top - .32 - 3.73 * row;
      const sill = head - 2.04;
      if (sill < foundation) continue;
      for (const [x1,x2] of westWindows) {
        windowBay(g,edge,station(x2)-.04,station(x1)+.04,sill,head,.05,face);
      }
    }
    return;
  }
  if (edge === north) {
    // The end facing the higher street is largely blind with tall narrow
    // ribs. Both the street-facing wall and its charcoal band are visible.
    face(g,edge,0,edge.length,roofY-2.47,roofY,.01,charcoal);
    const start = Math.max(foundation + .12, roofY - 17.9);
    for (let i = 1; i < 28; i++) {
      const at = edge.length * i / 28;
      projection(g,edge,at-.10,at+.10,start,roofY-3.18,.19,'#d8d6c9');
    }
    projection(g,edge,0,edge.length,start-.22,start,.18,trim);
    return;
  }
  // Other elevations retain the existing estimate of four storeys. The
  // court-facing glazing is visibly finer than the generic teaching bays.
  if (edge.length <= 3.5) return;
  const bays = Math.max(2,Math.round(edge.length / 2.25));
  const uv = [[0,0],[0,floors],[bays/3,floors],[bays/3,0]];
  face(g,edge,0,edge.length,.58,roofY,.012,wall,uv);
}

export function sixthTeachingRoof(g, ring, edges, west, eaveY, deckY, {face,cuboid}) {
  // Miter the shallow sloped coping continuously around both wings and the
  // court returns. The narrowest return in the published footprint is 1.05 m.
  function corners(offset, y) {
    return ring.map(([x,z],i)=>{
      const next = edges[i], previous = edges[(i+edges.length-1)%edges.length];
      const miter = offset / (1 + previous.nx*next.nx + previous.nz*next.nz);
      return [x + (previous.nx+next.nx)*miter, y, z + (previous.nz+next.nz)*miter];
    });
  }
  const bands = [
    [corners(0,deckY),corners(.38,eaveY-.35),'#8e9290'],
    [corners(.38,eaveY-.35),corners(.38,eaveY-.09),trim],
    [corners(.38,eaveY-.09),corners(-.43,eaveY+.26),charcoal],
    [corners(-.43,eaveY+.26),corners(-.43,deckY),'#7e8380']
  ];
  const [left,right] = westSpan(west);
  for (const [lower,upper,color] of bands) {
    for (let i=0; i<edges.length; i++) {
      const j=(i+1)%edges.length;
      const along=(points,t)=>points[i].map((v,k)=>v+(points[j][k]-v)*t);
      const sections = edges[i]===west ? [[0,left/west.length],[right/west.length,1]] : [[0,1]];
      for (const [a,b] of sections) {
        g.quad(along(lower,a),along(upper,a),along(upper,b),along(lower,b),color);
      }
    }
  }
  // Relative section dimensions agree in the two photos. The deck is
  // visible through the beam frame. No roof cap closes its open cells.
  const depth = 6.8, front = .055, cap = eaveY + 4.4, crown = cap + 2.55;
  const span = right-left;
  cuboid(g,west,left,right,deckY,cap,-depth,front,wall);
  cuboid(g,west,left-.12,right+.12,cap-.22,cap,-depth-.12,front+.12,trim);
  for (const t of [.30,.70]) {
    const mid=left+t*span;
    windowBay(g,west,mid-.88,mid+.88,cap-3.5,cap-1.3,front+.025,face);
  }
  const frameLeft=left+.33, frameRight=right-.33;
  const frontRow=-.30, rearRow=-depth+.34;
  const ink='#505956', metal='#68706d', post=.24;
  for (let i=0;i<4;i++) {
    const x=frameLeft+(frameRight-frameLeft)*i/3;
    for (const z of [rearRow,frontRow]) {
      cuboid(g,west,x-post/2,x+post/2,cap,crown-.18,z-post/2,z+post/2,ink);
    }
    cuboid(g,west,x-.14,x+.14,crown-.20,crown,rearRow-.26,frontRow+.26,metal);
  }
  for (const z of [rearRow,frontRow]) {
    cuboid(g,west,frameLeft-.20,frameRight+.20,crown-.23,crown,z-.13,z+.13,metal);
    cuboid(g,west,frameLeft,frameRight,crown-.78,crown-.64,z-.08,z+.08,ink);
  }
  return [[left,front],[right,front],[right,-depth],[left,-depth]].map(([s,z])=>{
    const [x,,south]=west.point(s,0,z);
    return [x,south];
  });
}

export const sixthTeachingEvidence = {
  sources:['https://www.ytkj.edu.cn/info/1049/8478.htm','https://www.ytkj.edu.cn/info/1049/8465.htm'],
  basis:'两幅校方航拍校核西面五排窗、双窗屋顶凸部及开放梁架；主檐沿用已有显示高程，构件尺寸按照片估算。',
  roofBodyAboveEaveM:4.4,openFrameHeightM:2.55
};
