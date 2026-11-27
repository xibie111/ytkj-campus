import {createGroundCoverPatch} from './ground-cover-patch.js';
import {groundPolygonDistance} from './terrain-surface.js';

const observation = {
  "polygons": [
    {
      "id":"zouyu-west-bend-verge","style":"bendVerge","ring":[
        [216.951,178.481],[217.014,178.333],[219.117,173.629],[219.202,173.439],[220.468,170.603],
        [220.906,163.541],[220.223,160.526],[219.425,158.714],[217.66,158.976],[217.111,160.237],
        [216.466,161.721],[214.727,170.397],[214.704,170.515],[214.6,170.73],[210.591,178.955],
        [208.947,183.77],[212.197,185.2],[214.367,184.267]
      ],"holes":[]
    },
    {
      "id": "north-field",
      "style": "crop",
      "ring": [
        [
          91.0,
          248.0
        ],
        [
          98.0,
          249.0
        ],
        [
          132.0,
          250.0
        ],
        [
          140.0,
          247.0
        ],
        [
          138.0,
          240.0
        ],
        [
          127.0,
          237.0
        ],
        [
          117.0,
          232.0
        ],
        [
          105.0,
          231.0
        ],
        [
          83.0,
          231.0
        ],
        [
          75.0,
          236.0
        ],
        [
          64.0,
          238.0
        ],
        [
          53.0,
          241.0
        ],
        [
          56.66,
          245.57
        ],
        [
          64.5,
          247.25
        ],
        [
          69.0,
          248.0
        ]
      ],
      "holes": []
    },
    {
      "id":"zouyu-campus-south-field","style":"southLinkField","ring":[
        [-10.168,268.732],[-8.193,259.846],[-7.731,258.553],[-7.202,255.093],[-7.167,254.958],
        [-6.887,254.369],[1.338,237.141],[1.646,236.28],[2.831,232.961],[2.885,232.845],
        [2.959,232.74],[6.131,229.024],[6.436,228.663],[9.901,223.219],[12.577,219.452],
        [14.462,215.593],[14.396,211.095],[12.362,208.188],[9.193,207.869],[4.469,213.432],
        [1.823,217.841],[0.339,220.315],[-2.668,227.515],[-2.655,228.209],[-2.49,233.98],
        [-2.5,234.121],[-2.539,234.259],[-5.215,239.447],[-5.661,240.312],[-8.249,246.282],
        [-10.45,251.286],[-14.862,258.319],[-17.001,263.175],[-17.751,267.814],[-16.218,270.975],
        [-15.446,271.29],[-11.58,271.29]
      ],"holes":[]
    },
    {
      "id": "south-field",
      "style": "crop",
      "ring": [
        [
          57.0,
          254.0
        ],
        [
          63.0,
          263.0
        ],
        [
          71.0,
          269.0
        ],
        [
          80.0,
          272.0
        ],
        [
          121.0,
          277.0
        ],
        [
          133.0,
          281.0
        ],
        [
          143.0,
          283.0
        ],
        [
          152.12,
          287.15
        ],
        [
          170.0,
          291.0
        ],
        [
          198.12,
          299.47
        ],
        [
          204.0,
          300.0
        ],
        [
          241.0,
          312.0
        ],
        [
          241.0,
          306.0
        ],
        [
          236.69,
          299.85
        ],
        [
          229.0,
          296.0
        ],
        [
          206.0,
          289.0
        ],
        [
          193.0,
          286.0
        ],
        [
          182.0,
          281.0
        ],
        [
          180.0,
          277.0
        ],
        [
          174.0,
          272.0
        ],
        [
          163.0,
          268.0
        ],
        [
          138.0,
          257.0
        ],
        [
          125.0,
          255.0
        ],
        [
          76.0,
          255.0
        ],
        [
          61.86,
          253.71
        ]
      ],
      "holes": []
    },
    {
      "id":"zouyu-northeast-upper-open-field","style":"northeastOpenField","ring":[
        [497.512,75.539],[510.816,73.538],[510.924,73.532],[537.969,72.933],[550.835,73.733],
        [562.708,74.731],[576.251,74.536],[579.408,72.284],[579.079,68.761],[575.963,67.593],
        [575.131,67.281],[555.965,67.097],[546.004,67.168],[534.995,67.068],[521.687,66.768],
        [509.241,65.465],[499.077,64.07],[488.004,64.068],[484.838,68.276],[484.069,77.628],
        [486.844,78.274]
      ],"holes":[]
    },
    {
      "id":"zouyu-northeast-lower-open-field","style":"northeastOpenField","ring":[
        [486.368,96.859],[487.153,98.068],[489.155,99.288],[493.512,99.432],[498.143,98.511],
        [500.862,97.071],[503.634,95.598],[503.744,95.554],[513.245,92.854],[513.346,92.835],
        [523.947,91.835],[536.2,91.832],[549.231,92.533],[549.983,92.626],[555.322,92.832],
        [561.444,93.439],[575.285,94.32],[577.339,91.398],[575.828,87.068],[567.509,85.462],
        [555.558,84.367],[516.926,83.368],[504.049,84.266],[492.957,85.799],[488.304,89.33],
        [486.389,93.478]
      ],"holes":[]
    },
    {
      "id": "southern-green-edge",
      "style": "hedgeProjection",
      "ring": [
        [
          69.29,
          271.53
        ],
        [
          69.91,
          273.68
        ],
        [
          81.0,
          281.0
        ],
        [
          87.02,
          283.19
        ],
        [
          110.0,
          285.0
        ],
        [
          133.0,
          289.0
        ],
        [
          146.0,
          293.0
        ],
        [
          161.0,
          296.0
        ],
        [
          174.0,
          300.0
        ],
        [
          205.0,
          307.0
        ],
        [
          218.0,
          311.0
        ],
        [
          232.0,
          314.0
        ],
        [
          241.0,
          319.0
        ],
        [
          244.0,
          316.0
        ],
        [
          234.0,
          312.0
        ],
        [
          191.33,
          299.42
        ],
        [
          188.0,
          299.0
        ],
        [
          183.62,
          297.12
        ],
        [
          156.0,
          289.0
        ],
        [
          143.0,
          287.0
        ],
        [
          117.0,
          280.0
        ],
        [
          82.0,
          273.0
        ],
        [
          80.97,
          272.57
        ],
        [
          79.95,
          272.45
        ],
        [
          79.9,
          272.44
        ],
        [
          79.86,
          272.43
        ],
        [
          70.86,
          269.43
        ],
        [
          70.81,
          269.41
        ],
        [
          70.77,
          269.39
        ],
        [
          70.73,
          269.36
        ],
        [
          69.86,
          268.71
        ]
      ],
      "holes": []
    },
    {
      "id":"zouyu-northeast-field-track","style":"northeastFieldTrack","ring":[
        [601.47,134.194],[596.971,138.193],[592.267,142.196],[588.19,144.997],[588.165,145.192],
        [590.557,145.214],[595.329,141.805],[595.492,141.655],[599.624,137.811],[603.62,134.179],
        [604.016,133.815],[606.885,129.854],[610.966,121.891],[612.226,119.871],[613.477,117.868],
        [615.367,113.889],[618.291,109.849],[620.88,106.801],[618.685,106.818],[616.21,110.151],
        [611.426,118.125],[605.475,129.27],[605.028,130.12]
      ],"holes":[]
    },
    {
      "id": "sparse-grass-verge",
      "style": "grass",
      "ring": [
        [
          129.33,
          302.67
        ],
        [
          132.0,
          306.0
        ],
        [
          135.26,
          307.96
        ],
        [
          147.0,
          306.0
        ],
        [
          157.0,
          307.0
        ],
        [
          165.0,
          307.0
        ],
        [
          169.0,
          305.0
        ],
        [
          167.0,
          301.0
        ],
        [
          163.27,
          299.07
        ],
        [
          155.0,
          301.0
        ],
        [
          147.0,
          299.0
        ],
        [
          138.0,
          298.29
        ],
        [
          132.8,
          299.2
        ]
      ],
      "holes": []
    },
    {
      "id":"zouyu-east-house-field","style":"eastHouseField","ring":[
        [524.51,366.643],[525.925,369.263],[525.977,369.386],[526.703,372.993],[527.092,374.927],
        [529.07,380.565],[530.294,386.251],[531.283,391.589],[531.911,393.019],[532.553,393.074],
        [535.458,389.641],[535.555,389.547],[535.67,389.471],[540.071,387.171],[540.198,387.119],
        [542.92,386.597],[544.403,386.307],[549.093,384.06],[549.227,384.012],[553.365,383.467],
        [553.89,383.398],[557.326,382.55],[557.868,379.753],[557.17,376.088],[556.71,373.674],
        [556.004,371.178],[554.817,366.994],[553.306,359.848],[552.398,353.805],[552.238,352.46],
        [551.626,348.224],[549.984,347.489],[546.595,347.955],[540.566,350.396],[540.167,350.558],
        [533.383,352.488],[532.013,352.878],[523.225,356.182],[520.647,357.854],[521.162,360.383]
      ],"holes":[]
    }
  ],
  "sources": {
    "westBendVerge":{
      "imagery":[
        {"date":"2024-03-09","sourcePixelMetres":0.31,"mapSampleMetres":0.6,"nominalPositionAccuracyMetres":5,"source":"https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.70769448921963%2C37.80443035272494&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"},
        {"date":"2025-06-02","sourcePixelMetres":0.34,"mapSampleMetres":0.6,"nominalPositionAccuracyMetres":5,"source":"https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.70769448921963%2C37.80443035272494&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"}
      ],
      "sharedAreaSquareMetres":136.745,
      "scope":"两期影像均可辨的村路内弯低植被带，沿用既有地形。"
    },
    "orthos": [
      {
        "date": "2024-03-09",
        "sensor": "WorldView-3",
        "sourcePixelMetres": 0.31,
        "mapSampleMetres": 0.6,
        "nominalPositionAccuracyMetres": 5,
        "source": "https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.70586396473423%2C37.80382671105385&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSRC_DESC%2CSAMP_RES%2CNICE_NAME&returnGeometry=False",
        "use": "outlineReference"
      },
      {
        "date": "2025-06-02",
        "sensor": "WorldView Legion 2",
        "sourcePixelMetres": 0.34,
        "mapSampleMetres": 0.6,
        "nominalPositionAccuracyMetres": 5,
        "source": "https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.70586396473423%2C37.80382671105385&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSRC_DESC%2CSAMP_RES%2CNICE_NAME&returnGeometry=False",
        "use": "outlineReference"
      }
    ],
    "southLinkField":{
      "imagery":[
        {"date":"2024-03-09","sourcePixelMetres":0.31,"mapSampleMetres":0.6,"nominalPositionAccuracyMetres":5,"source":"https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.70522726056541%2C37.80385373978539&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"},
        {"date":"2025-06-02","sourcePixelMetres":0.34,"mapSampleMetres":0.6,"nominalPositionAccuracyMetres":5,"source":"https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.70522726056541%2C37.80385373978539&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"}
      ],
      "sharedAreaSquareMetres":466.301,
      "scope":"两期影像共同可辨的坡田，2025年6月影像可见行列纹理，沿用既有坡面。"
    },
    "spectralSupport": [
      {
        "scene": "S2B_T51STB_20250611T024655_L2A",
        "nativeMetres": 10,
        "ndvi": [
          0.251,
          0.274,
          0.293,
          0.293,
          0.387
        ]
      },
      {
        "scene": "S2C_T51STB_20250520T025723_L2A",
        "nativeMetres": 10,
        "ndvi": [
          0.254,
          0.227,
          0.24,
          0.24,
          0.354
        ]
      },
      {
        "scene": "S2C_T51STB_20260704T025425_L2A",
        "nativeMetres": 10,
        "ndvi": [
          0.463,
          0.431,
          0.415,
          0.415,
          0.502
        ]
      }
    ],
    "northeastOpenFields":{
      "imagery":[
        {"date":"2024-03-09","sourcePixelMetres":0.31,"mapSampleMetres":0.6,"nominalPositionAccuracyMetres":5,"source":"https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.71161704168831%2C37.80518715720811&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"},
        {"date":"2025-06-02","sourcePixelMetres":0.34,"mapSampleMetres":0.6,"nominalPositionAccuracyMetres":5,"source":"https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.71161704168831%2C37.80518715720811&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"}
      ],
      "spectralSupport":[
        {"item":"S2A_T51STB_20240306T025601_L2A","nativePixelMetres":10,"ndviUpper":0.22,"ndviLower":0.193,"ndviSouthVegetation":0.234},
        {"item":"S2B_T51STB_20250604T025315_L2A","nativePixelMetres":10,"ndviUpper":0.31,"ndviLower":0.392,"ndviSouthVegetation":0.799}
      ],
      "sharedAreaSquareMetres":1579.688,
      "scope":"两期影像共同可辨的村东北外围两块田面。模型保留两田之间的植被带，沿用既有地形。"
    },
    "scope": "两期正射共同可辨的耕地、沿田缘植被投影和疏草边带。未推断树篱高度、树种、作物或田埂高程。",
    "schoolPhotoCoverage": "校方2025年4月8日航拍 8478 未覆盖该地块。",
    "eastHouseField":{
      "imagery":[
        {"date":"2024-03-09","sourcePixelMetres":0.31,"mapSampleMetres":0.6,"nominalPositionAccuracyMetres":5,"source":"https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.71138964734232%2C37.802655466020376&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"},
        {"date":"2025-06-02","sourcePixelMetres":0.34,"mapSampleMetres":0.6,"nominalPositionAccuracyMetres":5,"source":"https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.71138964734232%2C37.802655466020376&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"}
      ],
      "sharedAreaSquareMetres":1050.22,
      "scope":"两期影像共同可辨的村东屋后露土地，沿用既有地形。"
    }
  }
};
// Conservative common visible soil outline on the two registered reference dates.
const northeastTerraces=[
  {id:'zouyu-northeast-upper-long-field',style:'crop',ring:[
    [245.66,15.48],[247.71,20.79],[261.7,29.51],[262.27,35.43],[266.39,37.85],
    [284.16,60.0],[285.17,64.23],[291.29,75.67],[295.74,76.5],[300.71,74.26],
    [302.08,72.27],[300.49,69.43],[296.26,66.66],[287.37,54.83],[270.84,30.96],
    [268.38,25.38],[245.76,9.12],[241.78,8.56],[241.77,12.99]
  ],holes:[]},
  {id:'zouyu-northeast-central-open-field',style:'crop',ring:[
    [222.05,22.7],[217.79,28.39],[218.28,33.66],[221.2,38.79],[225.67,43.75],
    [235.79,50.67],[239.58,55.63],[243.92,58.53],[248.74,60.84],[252.13,59.24],
    [263.22,49.62],[260.94,44.73],[251.78,34.89],[245.72,31.5],[234.31,30.0],
    [227.69,24.13]
  ],holes:[]}
];
const northeastTerraceSources={
  imagery:[
    {date:'2024-03-09',sensor:'WorldView-3',sourcePixelMetres:0.31,mapSampleMetres:0.6,
      nominalPositionAccuracyMetres:5,source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.70822886593275%2C37.80534932959736&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false',use:'outlineReference'},
    {date:'2025-06-02',sensor:'WorldView Legion 2',sourcePixelMetres:0.34,mapSampleMetres:0.6,
      nominalPositionAccuracyMetres:5,source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.70822886593275%2C37.80534932959736&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false',use:'outlineReference'}
  ],
  localAxes:'EPSG:3857 converted to campus-local east/south metres',
  relativeControlRmsMetres:1.5,
  scope:'两期均可见的裸露田面，沿用现有坡面高程。'
};
const northeastTerraceDistance=northeastTerraces.map(({ring})=>groundPolygonDistance(ring,0));
export const zouyuNortheastCropGround=(x,z)=>northeastTerraceDistance.some(distance=>distance(x,z)===0);

// Both dates show this linear separation between the lower fields.
const foothillDivider={id:'zouyu-foothill-field-divider',style:'fieldDivider',ring:[
  [330.525,366.377],[342.279,390.831],[351.178,407.311],[359.32,423.42],[365.18,433.964],
  [370.664,444.898],[379.297,460.594],[380.101,460.191],[380.891,459.759],[372.242,444.033],
  [349.502,400.361],[343.706,389.876],[336.089,373.674],[331.96,365.679]
],holes:[]};
const foothillDividerSources={
  imagery:[
    {date:'2024-03-09',sensor:'WorldView-3',sourcePixelMetres:0.31,mapSampleMetres:0.6,
      nominalPositionAccuracyMetres:5,source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.70927487992441%2C37.80228607335597&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false'},
    {date:'2025-06-02',sensor:'WorldView Legion 2',sourcePixelMetres:0.34,mapSampleMetres:0.6,
      nominalPositionAccuracyMetres:5,source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.70927487992441%2C37.80228607335597&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false'}
  ],
  centerlineAgreementMetres:1.02,
  widthMetres:1.8,
  scope:'田间隔带的两期共同核心，沿用现有地形。植物类型和田埂断面待测。'
};

// Stable boundary of the low vegetation between the field and the pale slope.
const southernVerge={id:'zouyu-southern-foothill-verge',style:'southernVerge',ring:[
  [376.982,551.381],[377.218,554.983],[379.022,559.175],[381.967,571.229],[386.961,581.618],
  [388.872,583.998],[391.254,584.176],[392.672,581.23],[392.462,577.105],[387.489,558.928],
  [387.151,554.403],[387.377,550.142],[388.487,547.403],[388.097,544.664],[383.891,544.512],
  [378.996,543.156],[376.667,546.174],[375.908,548.409]
],holes:[]};
const northeastFieldTrackSources={
  imagery:[
    {date:'2024-03-09',sourcePixelMetres:0.31,mapSampleMetres:0.6,nominalPositionAccuracyMetres:5,source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.71218552755334%2C37.80488984116115&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false'},
    {date:'2025-06-02',sourcePixelMetres:0.34,mapSampleMetres:0.6,nominalPositionAccuracyMetres:5,source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.71218552755334%2C37.80488984116115&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false'}
  ],
  observedLengthMetres:50.72,
  scope:'两期影像均可辨的田边浅色土径南段，沿用既有地形，作为地表显示。'
};

const southernVergeSources={
  imagery:[
    {date:'2024-03-09',sensor:'WorldView-3',sourcePixelMetres:0.31,mapSampleMetres:0.6,
      nominalPositionAccuracyMetres:5,source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.70960801264131%2C37.80095085401782&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false'},
    {date:'2025-06-02',sensor:'WorldView Legion 2',sourcePixelMetres:0.34,mapSampleMetres:0.6,
      nominalPositionAccuracyMetres:5,source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.70960801264131%2C37.80095085401782&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false'}
  ],
  spectralSupport:[
    {date:'2025-06-11',nativeMetres:10,vergeMedianNDVI:.485,bareControlMedianNDVI:.114},
    {date:'2026-10-14',nativeMetres:10,vergeMedianNDVI:.511,bareControlMedianNDVI:.149}
  ],
  scope:'细化已有草地类像元中的田外植被边界，沿用现有坡面高程。'
};

// The west parcel lines remain visible beside the dividing vegetation in both archives.
const southwestField={id:'zouyu-southwest-quarry-field-edge',style:'southwestField',ring:[
  [324.312,367.538],[315.769,376.384],[314.467,380.911],[315.734,385.527],[319.509,394.168],
  [324.1,401.301],[332.236,416.26],[348.541,439.381],[351.849,448.771],[352.109,456.161],
  [353.374,461.703],[355.67,468.564],[359.931,476.062],[365.901,478.677],[373.946,475.939],
  [380.643,470.496],[382.094,466.283],[380.331,462.294],[378.092,461.4],[369.392,445.594],
  [341.002,391.517],[329.349,367.283]
],holes:[]};
const southwestFieldSources={
  imagery:[
    {date:'2024-03-09',sensor:'WorldView-3',sourcePixelMetres:0.31,mapSampleMetres:0.6,
      nominalPositionAccuracyMetres:5,source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.70919983979022%2C37.80214912778283&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false'},
    {date:'2025-06-02',sensor:'WorldView Legion 2',sourcePixelMetres:0.34,mapSampleMetres:0.6,
      nominalPositionAccuracyMetres:5,source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.70919983979022%2C37.80214912778283&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false'}
  ],
  scope:'两期影像共同可辨的西侧坡田，保留原坡面，植物种类与田埂断面待测。',
  sharedBoundaryAgreement:.943,
  nominalDisplayedAreaSquareMetres:2248
};

const northeastYard={id:'zouyu-northeast-yard',style:'yardApron',ring:[
  [309.516,173.767],[308.189,173.291],[305.332,172.271],[305.195,172.196],[303.134,170.237],
  [300.746,169.032],[298.715,170.207],[296.509,173.053],[296.739,175.286],[299.258,176.126],
  [302.476,177.296],[302.929,177.417],[306.517,178.727],[307.042,178.912],[311.451,179.27],
  [312.858,177.133],[312.489,175.348]
],holes:[]};
const northeastYardSources={
  imagery:[
    {date:'2024-03-09',sourcePixelMetres:0.31,mapSampleMetres:0.6,source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.70851310886526%2C37.804421343147766&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false'},
    {date:'2025-06-02',sourcePixelMetres:0.34,mapSampleMetres:0.6,source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.70851310886526%2C37.804421343147766&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false'}
  ],
  sharedAreaMetresSquared:92.231,
  scope:'两期影像中均可辨的屋间浅色地面。铺装种类和场坪高程未经测量。'
};

// The inner field stays distinct from the western dividing strip and the house-side vegetation.
const southwestFrontField={id:'zouyu-southwest-field-frontage',style:'southwestFrontField',ring:[
  [341.459,379.923],[350.46,398.89],[382.249,459.012],[382.329,460.337],[381.447,461.221],
  [383.564,465.791],[383.51,466.932],[386.917,471.069],[392.016,467.849],[400.739,454.515],
  [400.37,448.629],[395.855,439.233],[390.428,429.813],[384.806,417.0],[377.984,404.796],
  [362.616,370.961],[355.723,365.425],[346.778,362.65],[338.911,358.336],[332.935,358.641]
],holes:[]};
const southwestFrontFieldSources={
  imagery:[
    {date:'2024-03-09',sensor:'WorldView-3',sourcePixelMetres:0.31,mapSampleMetres:0.6,
      nominalPositionAccuracyMetres:5,source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.709450%2C37.802266&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false'},
    {date:'2025-06-02',sensor:'WorldView Legion 2',sourcePixelMetres:0.34,mapSampleMetres:0.6,
      nominalPositionAccuracyMetres:5,source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.709450%2C37.802266&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false'}
  ],
  scope:'补绘两期共同可辨的住屋外侧田面，保留西侧已有田埂与东侧院墙植被，沿用原地形。',
  sharedBoundaryAgreement:0.885,
  nominalDisplayedAreaSquareMetres:2444
};

const southernFootParcel={id:'zouyu-southern-foot-parcel',style:'southernFootParcel',holes:[],ring:[
  [405.418,613.126],[419.255,611.035],[420.892,606.943],[418.99,600.288],[417.966,591.204],
  [416.132,584.784],[413.61,583.775],[409.0,585.05],[402.279,585.05],[396.064,588.602],
  [394.415,593.077],[392.572,603.362],[393.039,611.77],[394.755,616.061],[399.763,616.896]
]};

const southernFootParcelSources={
  imagery:[
    {"date":"2024-03-09","sensor":"WorldView-3","nativePixelMetres":0.31,"mapSampleMetres":0.6,"nominalPositionAccuracyMetres":5,"source":"https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.71025267561225%2C37.80133105817484&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"},
    {"date":"2025-06-02","sensor":"WorldView Legion 2","nativePixelMetres":0.34,"mapSampleMetres":0.6,"nominalPositionAccuracyMetres":5,"source":"https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.7090247461438%2C37.802105881812366&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"}
  ],
  sharedCoreAreaM2:708.46,
  basis:'两期影像共同可辨的坡脚田面及其田埂边，保留上游绿带和东侧通行带。'
};

const materials={
  southernFootParcel:{tile:'drySoil',label:'邹于村南侧坡脚田块',colour:'#ad9573',opacity:0.72},
  bendVerge:{label:'邹于村西侧村路内弯绿带',colour:'#738764',opacity:.79},
  crop:{label:'邹于村田面',colour:'#b39b74'},
  northeastOpenField:{label:'邹于村东北外围田面',colour:'#b39a70',opacity:.76},
  hedgeProjection:{label:'南侧田缘植被投影',colour:'#67805d'},
  grass:{label:'邹于村疏草边带',colour:'#939a72'},
  eastHouseField:{label:'邹于村东侧屋后露土地',colour:'#a88c62',opacity:.73},
  fieldDivider:{label:'坡脚田间植被隔带',colour:'#748464',opacity:.77},
  northeastFieldTrack:{label:'邹于村东北田边土径',colour:'#bcaa90',opacity:.76},
  southernVerge:{label:'田外坡脚植被带',colour:'#778761',opacity:.68},
  southLinkField:{label:'校园与邹于村之间的南侧坡田',colour:'#b69c74',opacity:.76},
  southwestField:{label:'邹于村西侧坡田',colour:'#b09a75',opacity:.72},
  southwestFrontField:{label:'邹于村西南前沿坡田',colour:'#ac9b7c',opacity:.72},
  yardApron:{label:'邹于村东北屋间院坪',colour:'#c2bbac',opacity:.86},
};
export function createZouyuFieldEdge(terrain,bounds) {
  const polygons=[...observation.polygons,...northeastTerraces,foothillDivider,southernVerge,southwestField,northeastYard,southwestFrontField,southernFootParcel];
  const sources={...observation.sources,northeastFieldTrack:northeastFieldTrackSources,
    northeastTerraces:northeastTerraceSources,
    foothillDivider:foothillDividerSources,southernVerge:southernVergeSources,southwestField:southwestFieldSources,
    northeastYard:northeastYardSources,southwestFrontField:southwestFrontFieldSources,southernFootParcel:southernFootParcelSources};
  return createGroundCoverPatch(terrain,bounds,{
    name:'邹于村田缘与坡田',polygons,sources,materials,coverKey:'fieldCover'
  });
}
