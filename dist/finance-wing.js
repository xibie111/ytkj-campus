function westTower(g, tower, mainEaveY, {makeEdge, face, projection, drawFinanceTowerWest}) {
  const eave = tower.eaveAboveBaseMetres, roof = eave + tower.riseMetres;
  const rim = '#dedbd0';
  const base = tower.ring.map(([x,z]) => [x,eave,z]);
  for (let i=0; i<tower.ring.length; i++) {
    const edge = makeEdge(tower.ring[i], tower.ring[(i+1)%tower.ring.length]);
    if (i===tower.westEdge) drawFinanceTowerWest(g,edge,mainEaveY,eave,{face,projection});
    else face(g,edge,0,edge.length,mainEaveY,eave,0,tower.wallColor);
    // The west view shows a recessed dark strip between two light ledges under the cap.
    if (i===tower.westEdge) face(g,edge,.2,edge.length-.2,eave-2.1,eave-1.4,.02,'#575c59');
    for (const offset of [2.2,1.35,.18]) {
      projection(g,edge,0,edge.length,eave-offset,eave-offset+.16,.17,rim);
    }
  }
  const mid = (a,b) => [(a[0]+b[0])/2,roof,(a[2]+b[2])/2];
  const north = mid(base[1],base[2]), south = mid(base[0],base[3]);
  const ridge = t => [north[0]+(south[0]-north[0])*t,roof,north[2]+(south[2]-north[2])*t];
  const n = ridge(.45), s = ridge(.55);
  const triangles = [[base[0],n,base[1]],[base[0],s,n],[base[1],n,base[2]],
    [base[2],n,s],[base[2],s,base[3]],[base[3],s,base[0]]];
  for (const triangle of triangles) {
    for (const point of triangle) g.indices.push(g.vertex(point,tower.roofColor));
  }
}

export function financeWingRoof(geometry, item, eaveY, tools) {
  const {vertices, slopes, caps, riseMetres, slopeColor, capColor} = item.financeWingRoof;
  for (const [triangles, color] of [[slopes, slopeColor], [caps, capColor]]) {
    for (const triangle of triangles) {
      for (const index of triangle) {
        const [x, z, fraction] = vertices[index];
        geometry.indices.push(geometry.vertex([x, eaveY + fraction * riseMetres, z], color));
      }
    }
  }
  const profile = item.financeWingRoof;
  const high = eaveY + riseMetres, low = high - (profile.capDropMetres || 0);
  for (const line of profile.capEdges || []) {
    for (let i=1; i<line.length; i++) {
      const a=line[i-1], b=line[i];
      // GEOS returns exterior offsets clockwise. The reveal looks into the lower roof.
      geometry.quad([a[0],low,a[1]],[a[0],high,a[1]],[b[0],high,b[1]],[b[0],low,b[1]],'#a7a398');
    }
  }
  if (profile.tower) westTower(geometry,profile.tower,eaveY,tools);
}
