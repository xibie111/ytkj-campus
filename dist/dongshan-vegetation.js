// Only these 10 m sites have a consistent low-canopy observation as well as
// multi-season vegetation. Ordinary forest sites still use their original seed.
export function lowVegetationIndex(record) {
  const cells = new Set();
  for (const [first, length] of record?.runs || []) {
    for (let i = 0; i < length; i++) cells.add(first + i);
  }
  return (x, z) => {
    const col = Math.floor((x + 1600) / 10);
    const row = Math.floor((z + 1600) / 10);
    return col >= 0 && col < 320 && row >= 0 && row < 320 && cells.has(row * 320 + col);
  };
}

export function filterTreeSites(sites, isLowVegetation, random) {
  // Site selection is complete before these three style draws begin. Reserve
  // each site's usual sequence, including the forest sites about to be removed.
  let kept = 0;
  for (const site of sites) {
    const size = 3.5 + random() * 2.6;
    const angle = random() * Math.PI;
    const paletteIndex = site.kind === 'cypress' ? 0 : Math.floor(random() * 5);
    if (site.kind === 'forest' && isLowVegetation(site.x, site.z)) continue;
    site.sampledSize = size;
    site.crownAngle = angle;
    site.paletteIndex = paletteIndex;
    sites[kept++] = site;
  }
  sites.length = kept;
}
