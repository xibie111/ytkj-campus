import {createGroundCoverPatch} from './ground-cover-patch.js';

const apron={style:'bare',ring:[[-505.8,459.7],[-497.1,459.7],[-492.8,456.0],[-487.5,427.8],[-478.1,414.6],[-476.3,409.3],[-478.7,403.7],[-483.7,400.3],[-490.6,399.8],[-492.731,404.89],[-498.963,422.853],[-506.496,453.138]],holes:[]};
const sources={
  "archive": [
    {
      "date": "2024-03-09",
      "sensor": "WV03",
      "nativePixelMetres": 0.31,
      "mapSampleMetres": 0.6,
      "nominalPositionAccuracyMetres": 5,
      "horizontalReference": "EPSG:3857",
      "source": "https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.69964875%2C37.80211581&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSRC_DESC%2CSAMP_RES&returnGeometry=false"
    },
    {
      "date": "2025-06-02",
      "sensor": "LG02",
      "nativePixelMetres": 0.34,
      "mapSampleMetres": 0.6,
      "nominalPositionAccuracyMetres": 5,
      "horizontalReference": "EPSG:3857",
      "source": "https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.69964875%2C37.80211581&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSRC_DESC%2CSAMP_RES&returnGeometry=false"
    }
  ],
  "recentColourCheck": [
    {
      "date": "2026-11-10",
      "source": "https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_51STB_20261110_0_L2A",
      "pixelMetres": 10,
      "paleGroundMedianLuma": 193.52,
      "vegetationMedianLuma": 64.45
    },
    {
      "date": "2026-10-14",
      "source": "https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_51STB_20261014_0_L2A",
      "pixelMetres": 10,
      "paleGroundMedianLuma": 194.51,
      "vegetationMedianLuma": 46.7
    }
  ],
  "originalAreaM2": 846.663,
  "nearestRoadM": 0.57,
  "basis": "两期影像可辨道路之间的浅色裸地。按共同边界贴合现有地面。地面材料的分区依据可见色差，实际材质、地面标高和通行用途未经现场核实。"
};

// A shared outline below the running apron. The soil plane follows the terrain
// and depicts woodland coverage without assigning individual trees or heights.
const southWoodbelt={style:'southWoodbelt',ring:[
  [-410.0,535.0],[-415.0,535.8],[-415.0,534.045],[-454.348,546.453],[-457.74,546.633],
  [-459.97,545.083],[-460.514,542.555],[-459.667,535.989],[-456.413,533.111],[-450.979,530.146],
  [-445.508,528.578],[-437.543,527.805],[-435.696,532.725],[-434.185,533.603],[-415.0,527.707],
  [-415.0,526.777],[-391.7,519.538],[-388.0,520.5],[-385.581,520.288],[-385.13,521.47],
  [-384.69,521.79],[-384.06,521.85],[-367.918,516.845],[-351.0,514.2],[-344.0,512.8],
  [-338.0,505.5],[-332.783,501.24],[-303.12,492.024],[-296.0,490.7],[-296.0,501.955],
  [-299.558,503.545],[-308.0,506.0],[-332.0,513.6],[-338.0,515.0],[-351.0,518.6],
  [-365.0,521.9],[-380.0,525.9],[-389.25,528.75],[-393.0,529.5]
],holes:[]};
const southWoodbeltSources={
  orthos:[
    {date:'2024-03-09',sensor:'WorldView-3',sourcePixelMetres:0.31,
      mapSampleMetres:0.6,nominalPositionAccuracyMetres:5,source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.70030417297427%2C37.80106077085942&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false'},
    {date:'2025-06-02',sensor:'WorldView Legion 2',sourcePixelMetres:0.34,
      mapSampleMetres:0.6,nominalPositionAccuracyMetres:5,source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.70030417297427%2C37.80106077085942&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false'}
  ],
  extension:{
    source:'https://www.sdmap.gov.cn/map.html',
    layer:'BJ3 2026年二季度主影像',
    timelineLabel:'20260501',
    archiveDates:['2024-03-09','2025-06-02'],
    areaSquareMetres:1014.79,
    roadClearanceMetres:.65,
    westernTerraceClearanceMetres:.79
  },
  basis:'两期影像共同可辨的南看台外林带，天地图近景确认同一延伸。沿用原坡面，避开看台和重新对齐后的田径场外路。'
};

// Persistent low cover on the north side of the quarry haul track.
const haulVergeCore=[
  [-508.901,657.633],[-492.629,657.57],[-480.601,655.575],[-446.152,652.869],[-454.305,649.906],
  [-482.57,650.883],[-489.336,653.777],[-500.608,654.872]
];
const haulTrackVerge=[
  {style:'haulVergeFringe',holes:[haulVergeCore],ring:[
  [-454.138,648.85],[-482.802,649.84],[-489.749,652.812],[-500.825,653.838],[-512.809,657.828],
  [-525.726,660.809],[-538.591,667.082],[-533.659,666.634],[-508.551,658.624],[-492.542,658.62],
  [-480.519,656.622],[-441.24,653.536]
  ]},
  {style:'haulTrackVerge',holes:[],ring:haulVergeCore}
];
const haulTrackVergeSources={
  orthos:[
    {"date":"2024-03-09","sensor":"WV03","nativePixelMetres":0.31,"mapSampleMetres":0.6,"nominalPositionAccuracyMetres":5,"source":"https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.70053156732027%2C37.80016882271855&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"},
    {"date":"2025-06-02","sensor":"LG02","nativePixelMetres":0.34,"mapSampleMetres":0.6,"nominalPositionAccuracyMetres":5,"source":"https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.70053156732027%2C37.80016882271855&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"}
  ],
  shandongReference:{
    source:'https://www.sdmap.gov.cn/map.html',layer:'BJ3 2026年二季度主影像',timelineLabel:'20260501'
  },
  sharedCoreAreaM2:417.065,
  basis:'田径场南侧旧土路北缘持续可辨的灌草地。取两期影像内部共同范围，天地图近景复核地物位置。'
};

export function createTrackWestCover(terrain,bounds) {
  return createGroundCoverPatch(terrain,bounds,{
    name:'田径场西侧与南侧地表',
    polygons:[apron,southWoodbelt,...haulTrackVerge],
    sources:{...sources,southWoodbelt:southWoodbeltSources,haulTrackVerge:haulTrackVergeSources},
    materials:{
      bare:{tile:'drySoil',label:'田径场西北浅色裸地',colour:'#bcb098',opacity:.84},
      southWoodbelt:{tile:'meadow',label:'田径场西南林带地表',colour:'#687e61',opacity:.65},
      haulTrackVerge:{tile:'meadow',label:'田径场南侧土路边灌草地表',colour:'#68795a',opacity:.54},
      haulVergeFringe:{tile:'meadow',label:'田径场南侧灌草边缘',colour:'#68795a',opacity:.29}
    },
    coverKey:'trackWestCover'
  });
}
