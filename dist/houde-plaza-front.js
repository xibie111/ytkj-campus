// The university's northern panorama shows five glazed storeys over a stone podium,
// a rounded end bay and two open roof canopies. The close-up in its dining guide
// resolves the projecting white spandrels and deep green frames. Widths are estimates.
const stone = '#d7d6cf';
const trim = '#e0dfd7';
const frame = '#416a68';

function bayWindow(g, edge, left, right, depth, podium, roofY, floors, bow, t) {
  const width = right - left;
  const panes = Math.max(3, Math.round(width / 1.06));
  const stepY = (roofY - podium) / floors;
  // Each pane and its spandrel follow the same rounded plan profile.
  for (let i = 0; i < panes; i++) {
    const point = u => {
      const offset = depth + bow * Math.sin(Math.PI * u);
      return edge.point(left + width * u, 0, offset);
    };
    const a = point(i / panes), b = point((i + 1) / panes);
    const panel = t.makeEdge([a[0], a[2]], [b[0], b[2]]);
    const w = panel.length, p = panel.point;
    t.face(g, panel, 0, w, podium, roofY, 0, frame);
    for (let j = 0; j < floors; j++) {
      const low = podium + j * stepY, sill = low + stepY * .14, top = low + stepY - .09;
      t.glazing(g, panel, .036, w - .036, sill + .035, top, .02, i + j);
      const rail = sill + (top - sill) * .76;
      t.face(g, panel, 0, w, rail - .036, rail + .036, .028, frame);
      t.face(g, panel, 0, w, low, sill, .065, trim);
      g.quad(p(0, sill, .065), p(0, sill), p(w, sill), p(w, sill, .065), trim);
      const s0 = left + width * i / panes, s1 = left + width * (i + 1) / panes;
      if (j === 0) {
        g.quad(edge.point(s0, low), p(0, low, .065), p(w, low, .065), edge.point(s1, low), '#b8bdb7');
      }
      if (j === floors - 1) {
        g.quad(p(0, roofY), edge.point(s0, roofY), edge.point(s1, roofY), p(w, roofY), trim);
      }
    }
    if (i === 0 || i === panes-1) {
      const s = i === 0 ? left : right, last = i === 0 ? 0 : w;
      const face = [edge.point(s, podium), edge.point(s, roofY), p(last, roofY), p(last, podium)];
      if (i !== 0) face.reverse();
      g.quad(...face, '#899999');
    }
  }
}

function podiumFront(g, e, base, podium, t) {
  const l = e.length, h = podium - base;
  t.face(g, e, 0, l, base, podium, 0, '#a4a59e');
  const across = Math.max(1, Math.round(l / 1.12)), rows = 4;
  for (let i = 0; i < across; i++) {
    for (let j = 0; j < rows; j++) {
      t.face(g, e, i*l/across+.014, (i+1)*l/across-.014,
        base+j*h/rows+.012, base+(j+1)*h/rows-.012, .012, stone);
    }
  }
  const bays = Math.max(1, Math.round(l / 5.5)), span = l / bays;
  for (let i = 0; i < bays; i++) {
    const left = (i+.10)*span, right = (i+.90)*span;
    t.face(g,e,left,right,base+.08,podium-.78,.04,frame);
    for (let k = 0; k < 3; k++) {
      t.glazing(g,e,left+(right-left)*k/3+.035,left+(right-left)*(k+1)/3-.035,
        base+.14,podium-.84,.052,i+k);
    }
  }
  t.cuboid(g,e,0,l,podium-.25,podium+.05,0,.36,trim);
}

function openCanopy(g, e, roofY, height, t, plazaPosts = 5) {
  const left = e.length * .06, right = e.length * .94;
  const cap = height + 2.0, near = -5.4, far = -1.65;
  for (const [row, posts] of [[near+.30,5],[far-.35,plazaPosts]]) {
    for (let i = 0; i < posts; i++) {
      const x = left+.46 + (right-left-.92)*i/(posts-1);
      t.cuboid(g,e,x-.125,x+.125,roofY,cap,row-.13,row+.13,'#c5c9c3');
    }
  }
  t.cuboid(g,e,left,right,cap,cap+.24,near,far,trim);
}

function roofHouse(g, e, roofY, height, t) {
  const mid = e.length * .65, half = 4.25, high = height + 3.0;
  t.cuboid(g,e,mid-half,mid+half,roofY,high,-9.2,-4.05,'#d3d5d0');
  t.cuboid(g,e,mid-half-.10,mid+half+.10,high,high+.13,-9.31,-3.94,trim);
  t.face(g,e,mid-2.75,mid-1.80,height+.48,height+1.94,-4.02,'#5a7477');
  t.face(g,e,mid+.70,mid+2.18,height+1.03,height+2.21,-4.02,'#365d62');
  t.face(g,e,mid+1.41,mid+1.47,height+1.03,height+2.21,-4.01,'#83928d');
}

export function houdePlazaFront(g, e, baseTop, roofY, height, floors, t) {
  if (e.nx < .2 || e.nz > .28) return false;
  const podium = baseTop + (roofY-baseTop)/floors, upper = floors-1;
  const length = e.length;
  podiumFront(g,e,baseTop,podium,t);
  t.face(g,e,0,length,podium,roofY,0,'#ba8273');
  if (e.nz < -.86) {
    // The end nearest the gate has a wider rounded stack beside a stone infill.
    const end = length * .65;
    bayWindow(g,e,.12,end,.17,podium,roofY,upper,1.04,t);
    t.face(g,e,end,length,podium,roofY,.06,'#c4cac5');
    for (let floor=0;floor<upper;floor++) {
      const base=podium+(roofY-podium)*floor/upper, step=(roofY-podium)/upper;
      t.glazing(g,e,end+.65,length-.76,base+.27*step,base+.78*step,.085,floor);
    }
    // The north-gate views show a closer outer column rhythm here.
    openCanopy(g,e,roofY,height,t,8);
  } else {
    const bays = Math.max(1,Math.round(length/5.7)), width = length/bays;
    for (let i=0;i<bays;i++) {
      const x=i*width;
      t.cuboid(g,e,x+.06,x+.32,podium,height-.18,0,.42,'#ab766a');
      t.face(g,e,x+.075,x+.115,podium,height-.18,.43,trim);
      for (let floor=0;floor<upper;floor++) {
        const step=(roofY-podium)/upper, base=podium+step*floor;
        t.glazing(g,e,x+.41,x+.91,base+step*.32,base+step*.78,.034,floor);
      }
      bayWindow(g,e,x+1.03,x+width-.18,.12,podium,roofY,upper,.57,t);
    }
    if (e.nz < -.78) roofHouse(g,e,roofY,height,t);
    if (e.nz < -.2 && e.nx > .9) openCanopy(g,e,roofY,height,t);
  }
  return true;
}
