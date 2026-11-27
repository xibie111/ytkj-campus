import {createGroundCoverPatch} from './ground-cover-patch.js';

const westQuarryField={style:'westQuarryField',holes:[],ring:[
    [-1004.898,871.945],[-1002.746,868.358],[-1002.654,863.115],[-1005.626,857.822],[-1015.208,852.169],
    [-1019.734,852.531],[-1024.421,855.344],[-1028.137,860.268],[-1027.764,868.765],[-1024.577,872.407],
    [-1019.422,874.844],[-1011.327,874.588],[-1009.634,874.231]
]};

const polygons=[
  westQuarryField,
  {style:'vegetation',holes:[],ring:[[198,783],[209,777],[225,768],[246,758],[262,749],[280,740],[299,729],[315,720],[329,711],[331,720],[334,728],[337.2,735],[326,741],[310,747],[292,754],[276,762],[256,771],[238,779],[218,788],[207,792]]},
  {style:'vegetation',holes:[],ring:[[338.6,706.9],[353,699],[367,691],[382,682],[390,678.9],[395,683],[397.2,690],[396,700],[386,709],[376,716],[362,724],[352,730],[346.1,732.7],[342.7,723.8],[340.7,715.4]]},
  {style:'grayBench',holes:[],ring:[
    [353.353,649.805],[347.041,655.215],[346.93,655.302],[340.414,659.957],[340.016,660.268],
    [333.204,668.054],[333.131,668.131],[326.63,674.633],[326.209,675.085],[324.502,677.975],
    [323.688,686.005],[325.335,690.945],[328.682,694.42],[334.783,696.205],[341.15,692.631],
    [345.896,688.793],[354.531,676.32],[354.669,676.112],[354.763,675.986],[354.835,675.906],
    [361.644,668.141],[364.567,663.239],[366.123,658.339],[363.637,653.899],[362.647,652.91],
    [359.586,649.849]
  ]},
];

const sources={
  westQuarryField:{
    orthos:[
      {"date":"2023-06-05","sensor":"WorldView-2","nativePixelMetres":0.5,"mapSampleMetres":0.6,"nominalPositionAccuracyMetres":5,"source":"https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2024_r13/MapServer/5/query?f=json&geometry=120.693702%2C37.798194&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"},
      {"date":"2024-03-09","sensor":"WorldView-3","nativePixelMetres":0.31,"mapSampleMetres":0.6,"nominalPositionAccuracyMetres":5,"source":"https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.693702%2C37.798194&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"},
      {"date":"2025-06-02","sensor":"WorldView Legion 2","nativePixelMetres":0.34,"mapSampleMetres":0.6,"nominalPositionAccuracyMetres":5,"source":"https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.693702%2C37.798194&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"}
    ],
    scope:'2024、2025年正射影像共同可辨的坡田内核。2023年较小开口作为历史佐证，林带与既有地形保留。',
    displayedAreaM2:451.29
  },
  grayBench:{
    orthos:[
      {date:'2024-03-09',sensor:'WorldView-3',nativePixelMetres:0.31,mapSampleMetres:0.6,
        nominalPositionAccuracyMetres:5,horizontalReference:'EPSG:3857',source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.7091725524687%2C37.79991655455749&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false'},
      {date:'2025-06-02',sensor:'WorldView Legion 2',nativePixelMetres:0.34,mapSampleMetres:0.6,
        nominalPositionAccuracyMetres:5,horizontalReference:'EPSG:3857',source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.7091725524687%2C37.79991655455749&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false'}
    ],
    overlapCoreSqM:1049.9,
    inwardBoundaryMetres:1.6,
    sentinel2:{clearDates:19,interiorSamples:114,unvegetatedSamples:110,waterSamples:0},
    scope:'两期影像共同可见的灰色台面。边界向内收敛，地表贴合运行时地形。'
  },
  "imagery": [
    {
      "date": "2024-03-09",
      "sensor": "WV03",
      "nativePixelMetres": 0.31,
      "mapSampleMetres": 0.6,
      "horizontalReference": "EPSG:3857",
      "source": "https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.70886557010158%2C37.79989853540313&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSRC_DESC%2CSAMP_RES%2CNICE_NAME&returnGeometry=False"
    },
    {
      "date": "2025-06-02",
      "sensor": "LG02",
      "nativePixelMetres": 0.34,
      "mapSampleMetres": 0.6,
      "horizontalReference": "EPSG:3857",
      "source": "https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.70886557010158%2C37.79989853540313&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSRC_DESC%2CSAMP_RES%2CNICE_NAME&returnGeometry=False"
    }
  ],
  "currentVegetation": {
    "source": "https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1-l2a/items/S2C_T51STB_20260704T025425_L2A",
    "horizontalReference": "EPSG:32651",
    "date": "2026-07-04",
    "nativeBandPixelMetres": 10,
    "insideMedianNDVI": 0.403,
    "barePlateauMedianNDVI": 0.084,
    "insideSamples": 29,
    "abovePointThree": 27
  },
  "basis": "The 2024 and 2025 scenes establish the slope edge. The polygons follow the visible 2025 vegetated strip; 2026 Sentinel-2 confirms a broad contrast with the bare plateau. Cover is draped on the existing terrain. Species, slope profile and ground elevations are unmeasured."
};

export function createSouthQuarryCover(terrain,bounds){
  return createGroundCoverPatch(terrain,bounds,{
    name:'南侧开挖地边坡地表',
    polygons,
    sources,
    materials:{
      westQuarryField:{tile:'drySoil',label:'南侧采场西缘坡田',colour:'#b19a74',opacity:.78},
      vegetation:{tile:'meadow',label:'开挖地边坡植被带',colour:'#778567',opacity:.54},
      grayBench:{tile:'scree',label:'邹于村西侧采挖区灰色台面',colour:'#9c9c91',opacity:.60}
    },
    coverKey:'southQuarryCover'
  });
}
