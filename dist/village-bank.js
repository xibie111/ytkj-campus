// Central face between the two rows of houses in the school's 2025-04-08 oblique.
// Stations are [south, lower edge east, upper edge east], in local metres.
// The 2025-06-02 0.34 m overhead confirms this corridor. Neither it nor
// the available laser profiles measures the height of this individual bank.
const stations = [
  [-99.04, 95.62, 100.38],
  [-96.05, 94.74, 101.15],
  [-94.82, 95.94, 102.60],
  [-93.37, 95.55, 102.42],
  [-92.08, 95.96, 102.38]
];
const shoulder = 7.4, shift = 4.5;
const north = stations[0][0], south = stations.at(-1)[0];
const west = Math.min(...stations.map(p => p[1])) - shoulder;
const east = Math.max(...stations.map(p => p[2])) + shoulder;
const smooth = value => {
  const t = Math.max(0, Math.min(1, value));
  return t*t*(3-2*t);
};
function section(x, z) {
  if (x<=west || x>=east || z<=north || z>=south) return null;
  const i = stations.findIndex(p => p[0]>=z);
  const a=stations[i-1], b=stations[i], t=(z-a[0])/(b[0]-a[0]);
  const toe=a[1]+t*(b[1]-a[1]), crest=a[2]+t*(b[2]-a[2]);
  if (x<toe-shoulder || x>crest+shoulder) return null;
  const endWeight=smooth(Math.min(z-north,south-z)/1.8);
  return {toe,crest,endWeight};
}
export function villageBankGrade(heightAt) {
  return {
    blend: 0, subdivisions: 18,
    distance: (x,z) => Math.max(west-x,x-east,north-z,z-south,0),
    adjust(x,z,previous) {
      const row=section(x,z);
      if (!row) return previous;
      const {toe,crest,endWeight}=row;
      // Move contours closer across the face and spread them through the
      // shoulders. The mapping increases monotonically from west to east.
      let offset;
      if (x<toe) offset=-shift*smooth((x-toe+shoulder)/shoulder);
      else if (x>crest) offset=shift*smooth((crest+shoulder-x)/shoulder);
      else offset=shift*(2*smooth((x-toe)/(crest-toe))-1);
      return previous+heightAt(x+offset*endWeight,z)-heightAt(x,z);
    }
  };
}
export function bankSoil(x,z) {
  const row=section(x,z);
  if (!row) return 0;
  // The lower part of the cut is exposed first. Farther south the pale
  // face reaches higher before disappearing into a shaded incision. Bounds
  // are fractions from the toe, estimated from 9-pixel photo samples.
  const samples=[
    [-99.04,.16,.34],[-98.61,.05,.55],[-97.52,.03,.37],
    [-96.05,.04,.49],[-94.82,.06,.54],[-93.76,.08,.77],
    [-92.93,.12,.82],[-92.08,.18,.36]
  ];
  const i=samples.findIndex(p=>p[0]>=z),a=samples[i-1],b=samples[i],t=(z-a[0])/(b[0]-a[0]);
  const lower=a[1]+t*(b[1]-a[1]),upper=a[2]+t*(b[2]-a[2]);
  const w=(x-row.toe)/(row.crest-row.toe);
  return row.endWeight*smooth((w-lower)/.17)*smooth((upper-w)/.19);
}
export function paintBankSoil(c) {
  // Paint only the exposed face into the existing terrain texture. The
  // small ends stay vegetated; no image pixels are embedded in the model.
  c.save();
  for(let z=Math.floor(north);z<south;z+=.5){
    for(let x=94;x<103;x+=.5){
      const w=bankSoil(x+.25,z+.25);
      if(!w)continue;
      c.fillStyle='rgba(171,147,116,'+(.58*w)+')';
      c.fillRect(x,z,.52,.52);
    }
  }
  c.restore();
}
