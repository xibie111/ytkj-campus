// West elevation reconstructed from the university's 2025-04-08 aerial view.
// Heights are in metres above the west entrance datum. Only the visible face
// receives these window counts; the other elevations have separate evidence.
const plaster = '#e4dfd2', ochre = '#c9a879';
const sill = '#e6e0d2', lining = '#77786d';
const panes = ['#617170', '#758485', '#657978'];

function layOut(edge, bottom, top, g, {face, projection}) {
  const start = edge.point(0, 0), end = edge.point(edge.length, 0);
  // Image left is the northern end. An outward-facing west wall normally
  // runs in the opposite direction in the counterclockwise footprint.
  const forward = start[2] < end[2];
  const along = u => edge.length * (forward ? u : 1 - u);
  function panel(left, right, low, high, out, color, raised = false) {
    low = Math.max(bottom, low);
    high = Math.min(top, high);
    if (high <= low) return;
    const a = along(left), b = along(right);
    (raised ? projection : face)(g, edge, Math.min(a,b), Math.max(a,b), low, high, out, color);
  }
  function window(left, right, low, high, lights) {
    if (high <= bottom || low >= top) return;
    const inset = .075 / edge.length, mullion = .045 / edge.length;
    panel(left,right,low,high,.021,lining);
    const first = left + inset, last = right - inset;
    const light = (last - first) / lights;
    for (let i = 0; i < lights; ++i) {
      panel(first+i*light,first+(i+1)*light-mullion,low+.09,high-.08,.035,panes[i%panes.length]);
    }
    panel(first,last,high-.56,high-.50,.043,lining);
    panel(left,right,low-.09,low,.07,sill,true);
  }
  return {panel,window};
}

export function drawFinanceNorthFront(g, edge, bottom, top, tools) {
  const a = edge.point(0,0), b = edge.point(edge.length,0);
  const matches = (p,x,z) => Math.hypot(p[0]-x,p[2]-z)<.20;
  if (!(matches(a,221.34,-195.14) && matches(b,209.60,-217.30)) &&
      !(matches(b,221.34,-195.14) && matches(a,209.60,-217.30))) return false;

  const {panel,window} = layOut(edge,bottom,top,g,tools);
  panel(0,1,bottom,4.38,0,ochre);
  panel(0,1,4.38,top,0,plaster);
  panel(0,1,4.05,4.30,.20,sill,true);
  panel(0,1,4.44,4.63,.13,sill,true);
  // Native photo X ranges preserve the wide northern bay and the paired
  // width of the lowest panes, both missing from the generic teaching facade.
  const u = px => (px-2920)/279;
  const ground = [[2938,2966],[2995,3033],[3044,3081],[3092,3130],[3139,3176]];
  for (const [left,right] of ground) window(u(left),u(right),1.10,3.40,3);
  for (const [sillY,headY] of [[5.87,8.24],[10.16,12.52],[14.69,16.95]]) {
    window(u(2938),u(2967),sillY,headY,3);
    for (const center of [3006,3030,3054,3078,3102,3126,3150,3174]) {
      window(u(center-7.4),u(center+7.4),sillY,headY,1);
    }
  }
  panel(0,1,17.86,18.10,.12,sill,true);
  window(u(2936),u(2969),18.75,21.26,3);
  for (const center of [2985,3009,3033,3057,3081,3106,3131,3154,3177]) {
    window(u(center-8),u(center+8),18.75,21.26,1);
  }
  return true;
}

export function drawFinanceTowerWest(g, edge, bottom, top, tools) {
  const {panel,window} = layOut(edge,bottom,top,g,tools);
  panel(0,1,bottom,4.38,0,ochre);
  panel(0,1,4.38,top,0,plaster);
  panel(0,1,4.02,4.28,.19,sill,true);
  panel(0,1,4.48,4.68,.13,sill,true);
  window(.24,.79,1.15,3.44,3);
  for (const [sillY,headY] of [[5.72,7.91],[9.45,12.44],[13.79,16.95],
    [18.11,21.43],[22.68,25.88]]) {
    for (const left of [.20,.40,.60]) window(left,left+.16,sillY,headY,1);
  }
  panel(0,1,26.42,26.67,.16,sill,true);
  window(.40,.58,26.95,28.54,1);
}
