// Paired water-facing straight slopes and the three edges of the inlet recess.
const landFootprint = [[-859.069,-708],[-877.755,-651.932],[-859.981,-647.095],[-862.774,-638.715],[-880.477,-643.765],[-899.728,-586],[-815,-586],[-815,-708]];
const revetmentTop = [[[-859.069,-708],[-877.755,-651.932],[-870.255,-649.891],[-851.569,-708]],[[-880.477,-643.765],[-899.728,-586],[-892.228,-586],[-872.977,-641.625]]];
const [north,south]=[-708,-586];
const [slope,offset]=[-0.33326851983607325,-1095.023315669644];
const referenceX=z=>slope*z+offset;

export const northwestRevetment = {
  name:'校园西北直护岸',
  polygons:revetmentTop.map(ring=>({style:'revetmentTop',ring,holes:[]})),
  sources:{
  "imagery": [
    {
      "date": "2021-12-07",
      "sensor": "GeoEye-1",
      "sourcePixelMetres": 0.46,
      "mapSampleMetres": 0.6,
      "nominalPositionAccuracyMetres": 5,
      "source": "https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2023_r11/MapServer/5/query?f=json&geometry=120.695324%2C37.811989&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"
    },
    {
      "date": "2023-06-05",
      "sensor": "WorldView-2",
      "sourcePixelMetres": 0.5,
      "mapSampleMetres": 0.6,
      "nominalPositionAccuracyMetres": 5,
      "source": "https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2024_r13/MapServer/5/query?f=json&geometry=120.695324%2C37.811989&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"
    },
    {
      "date": "2024-03-09",
      "sensor": "WorldView-3",
      "sourcePixelMetres": 0.31,
      "mapSampleMetres": 0.6,
      "nominalPositionAccuracyMetres": 5,
      "source": "https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.695324%2C37.811989&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"
    },
    {
      "date": "2025-06-02",
      "sensor": "WorldView Legion 2",
      "sourcePixelMetres": 0.34,
      "mapSampleMetres": 0.6,
      "nominalPositionAccuracyMetres": 5,
      "source": "https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.695324%2C37.811989&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"
    }
  ],
  "scope": "四期影像共同可辨的直护岸边和入水凹口。堤顶仅表现清楚的内带，高程沿用地形。",
  "shoreSpanMetres": 128.6,
  "recessMouthMetres": 8.61,
  "recessDepthMetres": 18.39
},
  materials:{revetmentTop:{label:'护岸可见堤顶',colour:'#bbb2a0',opacity:.94}},
  coverKey:'coastalCover',
};

function onLand(x,z) {
  let land=false;
  for(let i=0,j=landFootprint.length-1;i<landFootprint.length;j=i++) {
    const [a,b]=landFootprint[j], [c,d]=landFootprint[i];
    if((b>z)!==(d>z) && x<a+(c-a)*(z-b)/(d-b))land=!land;
  }
  return land;
}

function weightAt(x,z) {
  const run=Math.max(0,Math.min(1,(z-north)/8,(south-z)/8));
  const across=x-referenceX(z);
  const lateral=Math.max(0,Math.min(1,(across+20)/7,(29-across)/6,(-844-x)/4));
  const amount=run*lateral;
  return amount*amount*(3-2*amount);
}

export function northwestRevetmentClass(x,z,baseline) {
  if(weightAt(x,z)<=.6)return baseline;
  return onLand(x,z)?(baseline===80?60:baseline):80;
}

export function paintNorthwestRevetment(ctx) {
  const {a:scaleX,d:scaleZ,e:dx,f:dz}=ctx.getTransform();
  const left=Math.max(0,Math.floor((referenceX(south)-23)*scaleX+dx));
  const right=Math.min(ctx.canvas.width,Math.ceil((referenceX(north)+44)*scaleX+dx));
  const top=Math.max(0,Math.floor(north*scaleZ+dz));
  const bottom=Math.min(ctx.canvas.height,Math.ceil(south*scaleZ+dz));
  const width=right-left,height=bottom-top;
  if(width<=0||height<=0)return;
  const image=ctx.getImageData(left,top,width,height), pixels=image.data;
  const colourAt=(x,row)=>{
    const i=Math.max(1,Math.min(width-2,Math.floor(x*scaleX+dx-left)));
    const byte=(row*width+i)*4;
    return [0,1,2].map(c=>(pixels[byte+c-4]+pixels[byte+c]+pixels[byte+c+4])/3);
  };
  for(let row=0;row<height;row++) {
    const z=(top+row+.5-dz)/scaleZ;
    const edge=referenceX(z);
    const water=colourAt(edge-23,row), inland=colourAt(edge+36,row);
    for(let col=0;col<width;col++) {
      const x=(left+col+.5-dx)/scaleX, weight=weightAt(x,z);
      if(weight<=0)continue;
      const colour=onLand(x,z)?inland:water, byte=(row*width+col)*4;
      for(let ch=0;ch<3;ch++)pixels[byte+ch]+=(colour[ch]-pixels[byte+ch])*weight;
    }
  }
  ctx.putImageData(image,left,top);
}
