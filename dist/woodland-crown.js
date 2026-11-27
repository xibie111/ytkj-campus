import * as T from './vendor/three.module.js';

// One shared lobe mesh for the indicated woodland. The placement, height and
// extent of each canopy come from the existing approximate forest symbols.
const lobes = [
  [.18, .97, -.16, .17], [.80, .45, .40, .23], [-.63, .43, .65, .20],
  [-.76, .42, -.49, .23], [.55, .55, -.63, .22], [.04, -.12, .99, .09]
].map(([x, y, z, swell]) => ({axis: new T.Vector3(x, y, z).normalize(), swell}));

export function woodlandCrown() {
  const crown = new T.IcosahedronGeometry(1, 2);
  const {position, normal} = crown.attributes;
  const p = new T.Vector3(), gradient = new T.Vector3();
  const tones = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; ++i) {
    p.fromBufferAttribute(position, i).normalize();
    gradient.set(0, 0, 0);
    let radius = .82;
    for (const {axis, swell} of lobes) {
      const alignment = Math.max(0, p.dot(axis));
      const power = alignment ** 8;
      radius += swell * power * alignment;
      gradient.addScaledVector(axis, 9 * swell * power);
    }
    // Differentiate the radial lobes for cohesive shading across faces.
    gradient.addScaledVector(p, -gradient.dot(p));
    gradient.multiplyScalar(-1 / radius).add(p).normalize();
    position.setXYZ(i, p.x * radius, p.y * radius, p.z * radius);
    normal.setXYZ(i, gradient.x, gradient.y, gradient.z);
    const shade = T.MathUtils.clamp(.91 + .12 * p.y + .13 * (radius - .9), .77, 1);
    tones[i * 3] = shade;
    tones[i * 3 + 1] = shade;
    tones[i * 3 + 2] = shade;
  }
  crown.setAttribute('color', new T.BufferAttribute(tones, 3));
  return crown;
}

// Sample in 3D on a sphere so both ends of the longitude wrap match and the
// polar caps remain continuous. Mipmaps average the leaf clusters at distance.
export function woodlandMaterial() {
  const width=384,height=192;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(width,height);
  const hash=(x,y,z)=>{
    let n=Math.imul(x,73856093)^Math.imul(y,19349663)^Math.imul(z,83492791);
    n=Math.imul(n^(n>>>16),2246822519);
    return ((n^(n>>>13))>>>0)/4294967295;
  };
  const mix=T.MathUtils.lerp,fade=t=>t*t*(3-2*t);
  function noise(x,y,z,scale) {
    x=x*scale+11.25;y=y*scale+7.6;z=z*scale+15.43;
    const a=Math.floor(x),b=Math.floor(y),c=Math.floor(z);
    const u=fade(x-a),v=fade(y-b),w=fade(z-c);
    const plane=k=>mix(mix(hash(a,b,k),hash(a+1,b,k),u),mix(hash(a,b+1,k),hash(a+1,b+1,k),u),v);
    return mix(plane(c),plane(c+1),w);
  }
  for(let row=0;row<height;row++){
    const phi=Math.PI*(row+.5)/height, y=Math.cos(phi),radius=Math.sin(phi);
    for(let col=0;col<width;col++){
      const theta=2*Math.PI*(col+.5)/width,x=radius*Math.cos(theta),z=radius*Math.sin(theta);
      const cluster=noise(x,y,z,5.5),leaves=noise(x,y,z,21),fine=noise(x,y,z,57);
      const shade=Math.round(T.MathUtils.clamp(215+67*(cluster-.5)+43*(leaves-.5)+23*(fine-.5),159,254));
      const k=4*(row*width+col);
      pixels.data[k]=shade;pixels.data[k+1]=Math.min(255,shade+3);pixels.data[k+2]=shade-5;pixels.data[k+3]=255;
    }
  }
  ctx.putImageData(pixels,0,0);
  const map=new T.CanvasTexture(canvas);map.name='林冠叶簇明暗示意';
  map.wrapS=T.RepeatWrapping;map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  return new T.MeshStandardMaterial({map,vertexColors:true,roughness:1});
}
