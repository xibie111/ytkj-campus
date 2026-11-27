import {createGroundCoverPatch} from './ground-cover-patch.js';
import {groundPolygonDistance} from './terrain-surface.js';

const polygons=[
  // Shared core of the mountain ridge's southern mixed grass and exposed soil.
  {style:'southRidgeFace',ring:[
    [-579.871,204.103],[-571.008,209.996],[-567.0,215.0],[-565.153,218.693],[-564.879,219.1],
    [-558.728,224.0],[-554.885,223.962],[-545.865,220.842],[-535.821,207.314],[-536.54,206.171],
    [-544.0,207.0],[-550.0,204.0],[-549.153,199.068],[-554.127,195.975],[-568.635,193.636],
    [-575.0,193.0],[-585.0,191.0],[-590.0,187.0],[-588.248,181.743],[-588.753,180.785],
    [-595.232,179.087],[-602.795,181.923],[-605.662,185.55],[-603.425,189.115],[-595.01,190.0],
    [-589.0,192.0],[-583.0,198.0]
  ],holes:[]},
  {style:"worn",ring:[
    [-514.29,-316.73],[-513.89,-309.52],[-512.53,-302.6],[-511.2,-298.98],[-506.79,-290.0],[-502.59,-278.17],[-500.69,-269.0],
    [-499.56,-259.68],[-498.91,-223.53],[-499.16,-217.37],[-502.72,-187.7],[-504.96,-164.82],[-506.05,-158.21],[-507.61,-152.89],
    [-509.57,-151.64],[-511.84,-150.76],[-518.67,-149.95],[-520.52,-150.25],[-528.42,-152.79],[-529.34,-154.21],[-530.61,-158.26],
    [-529.54,-170.89],[-529.75,-178.53],[-533.66,-195.26],[-535.96,-208.58],[-538.33,-218.79],[-540.59,-225.85],[-544.11,-232.65],
    [-546.65,-235.91],[-549.66,-238.97],[-553.13,-241.69],[-559.88,-245.67],[-563.96,-247.47],[-568.84,-248.51],[-574.05,-247.9],
    [-578.14,-246.13],[-582.31,-243.57],[-585.73,-239.99],[-588.25,-236.19],[-589.99,-232.43],[-595.46,-211.89],[-595.8,-207.97],
    [-595.84,-187.9],[-595.32,-183.85],[-591.21,-171.11],[-588.36,-158.36],[-586.68,-148.39],[-586.63,-143.07],[-588.04,-129.95],
    [-587.8,-125.21],[-586.48,-120.83],[-576.66,-99.89],[-570.83,-85.34],[-568.1,-76.05],[-566.02,-66.6],[-555.98,-68.4],
    [-561.27,-95.03],[-563.11,-101.68],[-565.76,-108.31],[-571.34,-120.45],[-575.69,-128.04],[-575.93,-129.61],[-575.38,-142.92],
    [-575.83,-146.93],[-579.17,-157.02],[-582.24,-173.17],[-585.56,-183.12],[-586.65,-188.19],[-585.92,-210.29],[-581.26,-225.68],
    [-579.01,-229.98],[-577.19,-231.39],[-575.18,-232.18],[-573.6,-232.16],[-565.73,-231.45],[-560.8,-229.6],[-558.98,-228.32],
    [-555.39,-224.54],[-552.53,-220.23],[-549.76,-214.8],[-547.45,-208.94],[-544.7,-199.79],[-541.53,-183.54],[-541.06,-174.82],
    [-543.38,-158.43],[-543.01,-153.53],[-541.74,-148.99],[-539.74,-144.94],[-535.44,-140.85],[-531.23,-138.66],[-527.74,-137.39],
    [-523.92,-136.26],[-519.23,-135.56],[-514.61,-135.94],[-510.69,-136.95],[-506.67,-138.48],[-502.49,-141.07],[-498.82,-144.65],
    [-496.61,-149.18],[-495.4,-156.65],[-494.87,-163.81],[-493.23,-203.49],[-491.18,-220.05],[-490.52,-256.56],[-491.07,-267.06],
    [-492.61,-277.15],[-494.35,-284.06],[-497.76,-293.9],[-502.94,-305.42],[-505.71,-317.27]
  ], holes:[]},
  {style:"fringe",ring:[
    [-523.92,-174.68],[-524.75,-183.01],[-527.7,-196.42],[-531.16,-217.3],[-534.68,-228.63],[-538.84,-236.44],[-545.41,-243.82],
    [-549.68,-247.11],[-557.46,-251.58],[-562.31,-253.61],[-568.47,-254.84],[-575.19,-254.11],[-580.09,-252.11],[-585.64,-248.89],
    [-590.13,-244.43],[-593.42,-239.66],[-595.7,-234.85],[-597.04,-230.6],[-601.46,-212.9],[-601.86,-208.13],[-601.77,-187.71],
    [-601.09,-182.59],[-596.68,-169.85],[-592.05,-150.21],[-591.48,-144.96],[-592.63,-130.08],[-592.19,-124.19],[-590.49,-118.96],
    [-580.22,-98.39],[-574.19,-84.43],[-571.26,-75.33],[-568.97,-66.07],[-561.0,-67.5],[-566.02,-66.6],[-568.1,-76.05],
    [-570.83,-85.34],[-576.66,-99.89],[-586.48,-120.83],[-587.8,-125.21],[-588.04,-129.95],[-586.63,-143.07],[-586.68,-148.39],
    [-588.36,-158.36],[-591.21,-171.11],[-595.32,-183.85],[-595.84,-187.9],[-595.8,-207.97],[-595.46,-211.89],[-589.99,-232.43],
    [-588.25,-236.19],[-585.73,-239.99],[-582.31,-243.57],[-578.14,-246.13],[-574.05,-247.9],[-568.84,-248.51],[-563.96,-247.47],
    [-559.88,-245.67],[-553.13,-241.69],[-549.66,-238.97],[-546.65,-235.91],[-544.11,-232.65],[-540.59,-225.85],[-538.33,-218.79],
    [-535.96,-208.58],[-533.66,-195.26],[-529.75,-178.53],[-529.54,-170.89],[-530.61,-158.26],[-529.34,-154.21],[-528.42,-152.79],
    [-520.52,-150.25],[-518.67,-149.95],[-511.84,-150.76],[-509.57,-151.64],[-507.61,-152.89],[-506.05,-158.21],[-504.96,-164.82],
    [-502.72,-187.7],[-499.16,-217.37],[-498.91,-223.53],[-499.56,-259.68],[-500.69,-269.0],[-502.59,-278.17],[-506.79,-290.0],
    [-511.2,-298.98],[-512.53,-302.6],[-513.89,-309.52],[-514.29,-316.73],[-515.69,-316.64],[-515.31,-309.26],[-513.96,-302.19],
    [-508.22,-289.38],[-504.18,-277.74],[-502.38,-268.73],[-501.33,-259.62],[-501.25,-220.56],[-508.04,-168.27],[-509.71,-158.74],
    [-511.25,-154.12],[-510.98,-155.09],[-518.51,-154.28],[-525.06,-156.65],[-525.4,-157.52]
  ], holes:[]},
  {style:"fringe",ring:[
    [-553.03,-68.93],[-557.8,-96.11],[-559.54,-102.98],[-567.5,-122.31],[-571.3,-129.06],[-570.47,-142.85],[-570.88,-147.55],
    [-574.71,-161.05],[-576.77,-174.44],[-580.56,-187.08],[-579.92,-209.29],[-575.35,-223.83],[-573.84,-226.51],[-571.86,-226.86],
    [-571.65,-226.17],[-570.15,-225.62],[-565.89,-224.88],[-564.24,-224.18],[-561.88,-222.19],[-557.19,-215.18],[-552.71,-204.41],
    [-549.99,-195.42],[-546.82,-179.61],[-546.74,-172.62],[-548.44,-158.49],[-547.86,-152.44],[-546.23,-147.1],[-543.68,-142.21],
    [-537.87,-136.84],[-532.93,-134.38],[-524.97,-131.96],[-519.39,-131.24],[-513.99,-131.75],[-505.09,-134.73],[-500.27,-137.75],
    [-495.85,-142.09],[-492.97,-147.95],[-491.5,-159.96],[-490.73,-199.99],[-488.87,-219.93],[-488.96,-263.73],[-491.8,-281.09],
    [-496.32,-294.52],[-501.52,-305.84],[-504.31,-317.36],[-511.19,-316.92],[-505.71,-317.27],[-502.94,-305.42],[-497.76,-293.9],
    [-494.35,-284.06],[-492.61,-277.15],[-491.07,-267.06],[-490.52,-256.56],[-491.18,-220.05],[-493.23,-203.49],[-494.87,-163.81],
    [-495.4,-156.65],[-496.61,-149.18],[-498.82,-144.65],[-502.49,-141.07],[-506.67,-138.48],[-510.69,-136.95],[-514.61,-135.94],
    [-519.23,-135.56],[-523.92,-136.26],[-531.23,-138.66],[-535.44,-140.85],[-539.74,-144.94],[-541.74,-148.99],[-543.01,-153.53],
    [-543.38,-158.43],[-541.06,-174.82],[-541.53,-183.54],[-544.7,-199.79],[-547.45,-208.94],[-549.76,-214.8],[-552.53,-220.23],
    [-555.39,-224.54],[-558.98,-228.32],[-560.8,-229.6],[-565.73,-231.45],[-575.18,-232.18],[-577.19,-231.39],[-579.01,-229.98],
    [-581.26,-225.68],[-585.92,-210.29],[-586.65,-188.19],[-585.56,-183.12],[-582.24,-173.17],[-579.17,-157.02],[-575.83,-146.93],
    [-575.38,-142.92],[-575.93,-129.61],[-575.69,-128.04],[-571.34,-120.45],[-565.76,-108.31],[-563.11,-101.68],[-561.27,-95.03],
    [-555.98,-68.4]
  ], holes:[]},
  // Shared exposed ground between the shoulder and the hillside woodland.
  {style:'inlandVerge',ring:[
    [-755.183,-67.736],[-753.9,-66.0],[-752.8,-64.4],[-750.581,-58.674],[-749.285,-57.409],
    [-749.443,-58.683],[-749.9,-60.6],[-749.979,-62.975],[-750.272,-65.326],[-752.295,-66.298],
    [-752.7,-68.4],[-752.1,-70.5],[-751.454,-71.737],[-752.087,-73.749],[-753.047,-74.045],
    [-756.159,-70.311],[-755.613,-68.338]
  ],holes:[]},
];

const lowerSlope = [
  {style:"clearing",ring:[
    [-667.92,-105.18],[-666.79,-103.33],[-660.74,-97.48],[-647.61,-87.69],[-641.98,-82.15],[-634.54,-72.85],[-619.15,-48.41],
    [-617.51,-47.04],[-615.11,-46.43],[-625.62,-39.65],[-636.62,-34.0],[-645.71,-27.69],[-648.93,-24.36],[-650.21,-22.44],
    [-651.97,-18.48],[-653.51,-13.09],[-654.41,-15.69],[-656.04,-17.2],[-677.34,-27.27],[-680.47,-29.25],[-689.37,-38.22],
    [-692.99,-41.14],[-698.86,-44.32],[-701.12,-44.82],[-703.71,-44.59],[-704.29,-43.41],[-703.04,-41.21],[-701.52,-39.64],
    [-695.08,-34.86],[-685.87,-26.05],[-682.14,-23.22],[-659.45,-10.9],[-657.33,-10.37],[-654.54,-11.03],[-653.59,-12.74],
    [-655.8,-4.37],[-660.11,6.83],[-663.36,14.05],[-669.04,23.99],[-670.7,22.33],[-681.86,18.14],[-689.22,12.9],
    [-706.3,9.37],[-710.83,9.5],[-711.17,10.5],[-709.47,12.22],[-707.54,13.35],[-701.26,15.41],[-691.33,17.65],
    [-684.59,22.56],[-676.19,26.08],[-674.0,26.76],[-671.65,26.9],[-670.35,26.36],[-677.41,43.26],[-683.53,53.8],
    [-689.3,60.75],[-696.86,66.2],[-698.31,67.7],[-699.42,70.1],[-698.58,71.9],[-695.87,72.43],[-693.6,71.92],
    [-686.44,66.85],[-683.4,63.9],[-679.65,58.64],[-657.07,14.82],[-649.96,-2.28],[-645.51,-16.07],[-643.39,-20.09],
    [-639.69,-23.67],[-633.03,-28.22],[-622.18,-33.33],[-613.38,-39.13],[-610.08,-41.76],[-608.89,-43.64],[-608.38,-46.27],
    [-609.62,-47.73],[-612.25,-47.74],[-613.64,-47.26],[-613.12,-47.63],[-612.87,-50.32],[-613.6,-52.3],[-622.08,-63.85],
    [-631.04,-77.8],[-636.38,-84.39],[-640.8,-89.05],[-645.68,-93.32],[-654.2,-99.02],[-663.42,-106.75],[-665.21,-107.83],
    [-667.51,-108.46],[-668.49,-107.54]
  ], holes:[]},
  {style:"clearing",ring:[
    [-682.83,-87.45],[-676.28,-79.6],[-667.61,-67.85],[-663.17,-63.05],[-650.1,-52.84],[-637.05,-40.04],[-635.27,-38.9],
    [-632.71,-38.39],[-631.29,-39.61],[-631.47,-42.25],[-632.46,-44.21],[-636.83,-48.83],[-647.62,-58.89],[-660.58,-68.72],
    [-672.39,-82.82],[-679.54,-90.47],[-681.29,-91.69],[-683.54,-92.43],[-684.46,-91.57],[-683.89,-89.28]
  ], holes:[]},
  {style:"clearing",ring:[
    [-695.88,-63.2],[-689.82,-57.0],[-678.4,-47.54],[-667.98,-37.38],[-661.4,-31.79],[-654.51,-26.7],[-652.38,-25.98],
    [-649.58,-26.2],[-648.42,-27.8],[-649.03,-30.52],[-650.28,-32.31],[-674.26,-52.67],[-686.19,-61.26],[-692.33,-66.64],
    [-694.13,-67.8],[-696.49,-68.46],[-697.51,-67.54],[-697.0,-65.1]
  ], holes:[]},
  {style:"clearing",ring:[
    [-695.3,-10.11],[-683.99,-3.93],[-673.96,0.32],[-665.78,3.18],[-663.61,3.46],[-661.19,2.76],[-660.81,1.24],
    [-662.51,-0.55],[-678.32,-6.05],[-693.31,-13.66],[-695.36,-14.32],[-697.73,-14.47],[-698.27,-13.53],[-696.95,-11.54]
  ], holes:[]}
];

// Common visible red-soil face on both orthophotos. The patch follows the existing slope.
const northwestSlope={style:'exposedSoil',ring:[
  [-374.94,-49.92],[-386.46,-41.21],[-402.57,-18.38],[-408.17,1.43],[-406.67,6.18],
  [-392.6,5.39],[-371.54,-4.8],[-353.38,-7.98],[-330.79,-23.56],[-314.35,-31.29],
  [-309.97,-36.57],[-309.08,-40.53],[-310.87,-48.8],[-314.91,-53.33],[-315.91,-58.34],
  [-330.28,-70.96],[-343.99,-67.05],[-348.5,-61.71],[-371.93,-57.63]
],holes:[]};

// Shared opening in both dated scenes. Trace the cover on the existing hillside.
const centralMeadowGap={style:'meadowGap',ring:[
  [-788.883,163.815],[-788.489,164.289],[-787.939,164.141],[-784.716,159.083],[-782.017,153.666],
  [-780.492,147.112],[-778.461,142.723],[-775.578,136.974],[-771.992,132.172],[-770.431,127.933],
  [-773.261,125.281],[-777.335,126.757],[-780.83,131.568],[-782.863,135.792],[-788.952,156.35]
],holes:[]};

const southwestRoadTreeBelt={style:'southwestRoadTreeBelt',holes:[],ring:[
    [-1348.099,824.84],[-1311.054,796.215],[-1306.496,791.691],[-1306.905,790.161],[-1308.599,788.979],
    [-1310.484,789.449],[-1313.436,791.481],[-1316.719,794.602],[-1332.866,806.18],[-1344.572,815.859],
    [-1351.205,822.69],[-1357.984,827.675],[-1356.398,829.248],[-1354.857,828.991]
]};

// Exposed western face between the coastal roadside woods and the slope rows.
const westernRockOpening={style:'westernRockOpening',holes:[],ring:[
  [-1039.989,352.853],[-1033.73,343.018],[-1037.422,337.284],[-1038.403,331.633],[-1028.866,319.185],
  [-1033.601,314.45],[-1037.535,314.45],[-1040.831,316.882],[-1049.352,334.297],[-1064.076,343.127],
  [-1069.975,349.025],[-1078.541,350.404],[-1090.729,357.859],[-1091.476,365.331],[-1075.998,367.921],
  [-1069.284,366.578],[-1064.97,368.394],[-1054.892,363.813],[-1048.589,356.675]
]};

const westernFootSoilCore=[
  [-1093.869,432.565],[-1101.375,442.069],[-1100.75,451.3],[-1104.415,460.461],[-1103.629,466.746],
  [-1098.506,474.431],[-1094.077,477.199],[-1066.862,485.384],[-1059.314,483.707],[-1050.425,478.373],
  [-1046.909,473.45],[-1052.482,457.643],[-1050.986,454.81],[-1050.984,452.322],[-1044.808,445.859],
  [-1034.677,427.461],[-1036.136,420.167],[-1039.052,418.345],[-1042.451,417.495],[-1053.762,417.282],
  [-1060.691,413.08],[-1066.239,410.813],[-1082.022,416.972],[-1090.124,425.073]
];
const westernFootSoil=[
  {style:'westernFootSoilFringe',holes:[westernFootSoilCore],ring:[
  [-1095.837,431.581],[-1103.648,441.392],[-1102.793,450.483],[-1106.668,460.171],[-1105.748,467.534],
  [-1100.074,476.046],[-1094.993,479.221],[-1066.946,487.656],[-1058.488,485.777],[-1048.901,480.024],
  [-1044.443,473.783],[-1050.293,457.866],[-1048.735,455.354],[-1048.919,453.081],[-1043.032,447.194],
  [-1032.362,427.818],[-1034.165,418.805],[-1038.181,416.295],[-1042.16,415.3],[-1053.721,415.082],
  [-1059.654,411.127],[-1066.22,408.444],[-1083.251,415.09],[-1091.932,423.77]
  ]},
  {style:'westernFootSoil',ring:westernFootSoilCore,holes:[]}
];

const westernFootSoilSources={
  imagery:[
    {"date":"2024-03-09","sensor":"WorldView-3","nativePixelMetres":0.31,"mapSampleMetres":0.6,"nominalPositionAccuracyMetres":5,"source":"https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.69399397987246%2C37.80228607335597&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"},
    {"date":"2025-06-02","sensor":"WorldView Legion 2","nativePixelMetres":0.34,"mapSampleMetres":0.6,"nominalPositionAccuracyMetres":5,"source":"https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.69399397987246%2C37.80228607335597&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"}
  ],
  sharedCoreAreaM2:4030.06,
  basis:'两期影像共同可辨的低坡裸土和疏植被，保留北面已绘浅色裸坡与中间绿土过渡。'
};

// Connected woodland floor on the inland side of Xianjing West Road.
const westernRoadWoodlandCore=[
  [-1159.359,405.162],[-1148.999,399.119],[-1138.235,379.647],[-1130.235,368.647],[-1122.572,361.843],
  [-1120.01,348.366],[-1113.285,340.68],[-1101.721,320.44],[-1099.417,311.993],[-1102.59,308.292],
  [-1182.22,377.236],[-1174.868,390.935],[-1165.413,406.093]
];
const westernRoadWoodland=[
  {style:'westernRoadWoodlandFringe',holes:[westernRoadWoodlandCore],ring:[
  [-1158.544,407.465],[-1147.218,400.858],[-1136.294,381.059],[-1128.294,370.059],[-1120.342,363.079],
  [-1118.204,349.946],[-1111.32,342.079],[-1099.486,321.366],[-1096.767,311.397],[-1101.636,305.717],
  [-1103.978,306.077],[-1185.241,376.682],[-1176.946,392.139],[-1166.612,408.706]
  ]},
  {style:'westernRoadWoodland',holes:[],ring:westernRoadWoodlandCore}
];

const materials={
  westernRoadWoodland:{tile:'openGrass',label:'仙境西路内侧连续林下地表',colour:'#667b5d',opacity:.52},
  westernRoadWoodlandFringe:{tile:'openGrass',label:'仙境西路内侧连续林下地表过渡',colour:'#667b5d',opacity:.24},
  westernFootSoil:{tile:'drySoil',label:'西山西坡脚疏草裸土',colour:'#ac987c',opacity:0.55},
  westernFootSoilFringe:{tile:'drySoil',label:'西山西坡脚疏草裸土过渡',colour:'#ac987c',opacity:.29},
  westernRockOpening:{tile:'scree',label:'西山西坡浅色裸地',colour:'#c4b798',opacity:.65},
  southwestRoadTreeBelt:{tile:'meadow',label:'西南坡下村路树带',colour:'#667a52',opacity:.82},
  southRidgeFace:{tile:'drySoil',label:'西山山脊南缘疏草与露土',colour:'#af937b',opacity:.61},
  worn:{tile:'drySoil',label:'山坡裸土弯道',colour:'#ad8467',opacity:.72},
  fringe:{tile:'meadow',label:'山坡疏草和灌丛边缘',colour:'#82906c',opacity:.43},
  inlandVerge:{tile:'drySoil',label:'仙境西路内侧疏草与露土',colour:'#b0a386',opacity:.65},
  clearing:{tile:'drySoil',label:'山脚植被开口',colour:'#ad9b79',opacity:.55},
  exposedSoil:{tile:'scree',label:'西北坡露土',colour:'#af886d',opacity:.72},
  meadowGap:{tile:'meadow',label:'西山林隙疏草地表',colour:'#a3a380',opacity:.64},
};

const sources={
  westernRoadWoodland:{
    orthos:[
      {"date":"2024-03-09","sensor":"WorldView-3","nativePixelMetres":0.31,"mapSampleMetres":0.6,"nominalPositionAccuracyMetres":5,"source":"https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.69399397987246%2C37.80228607335597&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"},
      {"date":"2025-06-02","sensor":"WorldView Legion 2","nativePixelMetres":0.34,"mapSampleMetres":0.6,"nominalPositionAccuracyMetres":5,"source":"https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.69399397987246%2C37.80228607335597&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"}
    ],
    shandongReference:{source:'https://www.sdmap.gov.cn/map.html',layer:'BJ3 2026年二季度主影像',timelineLabel:'20260501'},
    areaM2:3356.613,
    spectralSupport:[
      {date:'2025-05-20',nativeMetres:10,woodlandMedianNDVI:.748,exposedSlopeMedianNDVI:.260},
      {date:'2025-06-11',nativeMetres:10,woodlandMedianNDVI:.824,exposedSlopeMedianNDVI:.260},
      {date:'2026-07-04',nativeMetres:10,woodlandMedianNDVI:.848,exposedSlopeMedianNDVI:.428}
    ],
    scope:'两期影像可辨的公路东南连续林缘，保留公路、可见土径和相邻浅色坡面。林下材质为模型近似。'
  },
  westernFootSoil:westernFootSoilSources,
  westernRockOpening:{
    orthos:[
      {"date":"2024-03-09","sensor":"WorldView-3","nativePixelMetres":0.31,"mapSampleMetres":0.6,"nominalPositionAccuracyMetres":5,"source":"https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.69399397987246%2C37.80228607335597&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"},
      {"date":"2025-06-02","sensor":"WorldView Legion 2","nativePixelMetres":0.34,"mapSampleMetres":0.6,"nominalPositionAccuracyMetres":5,"source":"https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.69399397987246%2C37.80228607335597&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"}
    ],
    shandongReference:{
      source:'https://www.sdmap.gov.cn/map.html',layer:'BJ3 2026年二季度主影像',timelineLabel:'20260501'
    },
    sharedCoreAreaM2:1271.49,
    basis:'两期影像共同可辨的浅色裸坡，位于仙境西路东南侧林缘与条带坡地之间。'
  },
  southwestRoadTreeBelt:{
    "orthos": [
      {
        "date": "2023-06-05",
        "sensor": "WorldView-2",
        "sourcePixelMetres": 0.5,
        "mapSampleMetres": 0.6,
        "nominalPositionAccuracyMetres": 5,
        "source": "https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2024_r13/MapServer/5/query?f=json&geometry=120.690118%2C37.798696&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"
      },
      {
        "date": "2024-03-09",
        "sensor": "WorldView-3",
        "sourcePixelMetres": 0.31,
        "mapSampleMetres": 0.6,
        "nominalPositionAccuracyMetres": 5,
        "source": "https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.690118%2C37.798696&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"
      },
      {
        "date": "2025-06-02",
        "sensor": "WorldView Legion 2",
        "sourcePixelMetres": 0.34,
        "mapSampleMetres": 0.6,
        "nominalPositionAccuracyMetres": 5,
        "source": "https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.690118%2C37.798696&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false"
      }
    ],
    "scope": "2023年影像核对连续树带位置，采用2024及2025年共同可辨的树冠内带。地表贴合既有高程，树种、株数和树高待测。",
    "sourceRoadAdjacentTo": 1073365583,
    "displayedAreaSquareMetres": 293.17
  },
  inlandVerge:{
    orthos:[
      {date:'2024-03-09',sensor:'WorldView-3',sourcePixelMetres:0.31,mapSampleMetres:0.6,
        nominalPositionAccuracyMetres:5,source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.69668860287268%2C37.80660166082546&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false'},
      {date:'2025-06-02',sensor:'WorldView Legion 2',sourcePixelMetres:0.34,mapSampleMetres:0.6,
        nominalPositionAccuracyMetres:5,source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.69668860287268%2C37.80660166082546&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false'}
    ],
    sharedAreaSqM:38.12,
    scope:'两期均可辨的路内侧疏草与露土，距模型道路边缘至少两米，沿用既有地形。'
  },
  "orthos": [
    {
      "date": "2024-03-09",
      "sensor": "WorldView-3",
      "sourcePixelMetres": 0.31,
      "mapSampleMetres": 0.6,
      "nominalPositionAccuracyMetres": 5,
      "source": "https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.69886021887709%2C37.80872792104007&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSRC_DESC%2CSAMP_RES%2CNICE_NAME&returnGeometry=False"
    },
    {
      "date": "2025-06-02",
      "sensor": "WorldView Legion 2",
      "sourcePixelMetres": 0.34,
      "mapSampleMetres": 0.6,
      "nominalPositionAccuracyMetres": 5,
      "source": "https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.69886021887709%2C37.80872792104007&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSRC_DESC%2CSAMP_RES%2CNICE_NAME&returnGeometry=False"
    }
  ],
  "landscapeBasis": "Two dated orthophotos show the winding open ground along the hillside. The narrow bare strip and wider mixed cover follow the existing terrain. No cut height, path designation or species inferred.",
  "displayOffsetMetres": 0.03,
  "lowerSlopeOrthos": [
  {
    "date": "2024-03-09",
    "source": "https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.69721160986852%2C37.806286325624136&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSRC_DESC%2CSAMP_RES%2CNICE_NAME&returnGeometry=False",
    "sourcePixelMetres": 0.31,
    "mapSampleMetres": 0.6,
    "scope": "position context"
  },
  {
    "date": "2025-06-02",
    "source": "https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.69721160986852%2C37.806286325624136&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSRC_DESC%2CSAMP_RES%2CNICE_NAME&returnGeometry=False",
    "sourcePixelMetres": 0.34,
    "mapSampleMetres": 0.6,
    "scope": "cover outline"
  }
],
  "lowerSlopeBasis": "Six narrow openings and a wider connecting patch follow the visible cover in June 2025. March imagery provides local alignment and vegetation context. No terrace heights or use inferred.",
  southRidgeFace:{
    orthos:[
      {date:'2024-03-09',sensor:'WorldView-3',sourcePixelMetres:0.31,mapSampleMetres:0.6,
        nominalPositionAccuracyMetres:5,source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.69880337029059%2C37.80409699836927&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false'},
      {date:'2025-06-02',sensor:'WorldView Legion 2',sourcePixelMetres:0.34,mapSampleMetres:0.6,
        nominalPositionAccuracyMetres:5,source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.69880337029059%2C37.80409699836927&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false'}
    ],
    sharedAreaSqM:1005.72,
    scope:'两期影像中共同可见的山脊南缘疏草与露土交界，沿用既有高程。'
  },
  northwestSlope:{
    orthos:[
      {date:'2024-03-09',sensor:'WorldView-3',sourcePixelMetres:0.31,mapSampleMetres:0.6,
        nominalPositionAccuracyMetres:5,source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.70081581025279%2C37.80638543097312&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false'},
      {date:'2025-06-02',sensor:'WorldView Legion 2',sourcePixelMetres:0.34,mapSampleMetres:0.6,
        nominalPositionAccuracyMetres:5,source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.70081581025279%2C37.80638543097312&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false'}
    ],
    relativeControlRmsMetres:1.32,
    boundaryAgreement:0.892,
    scope:'两期影像均可见的红土坡面，沿用现有地形。'
  },
  centralMeadowGap:{
    orthos:[
      {date:'2024-03-09',sensor:'WorldView-3',sourcePixelMetres:0.31,mapSampleMetres:0.6,
        nominalPositionAccuracyMetres:5,source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r12/MapServer/5/query?f=json&geometry=120.69639299022288%2C37.80471865919472&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false'},
      {date:'2025-06-02',sensor:'WorldView Legion 2',sourcePixelMetres:0.34,mapSampleMetres:0.6,
        nominalPositionAccuracyMetres:5,source:'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r11/MapServer/5/query?f=json&geometry=120.69639299022288%2C37.80471865919472&inSR=4326&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE%2CSRC_RES%2CSRC_ACC%2CSAMP_RES%2CSRC_DESC%2CNICE_DESC&returnGeometry=false'}
    ],
    sharedAreaSqM:237.056,
    scope:'两期可辨林隙的共同核心，地表为疏草与露土过渡，沿用现有坡面。'
  }
};

const bareGround=[...polygons.filter(p=>p.style==='worn'),...lowerSlope,northwestSlope].map(({ring,holes})=>({
  distance:groundPolygonDistance(ring,0),
  holes:holes.map(hole=>groundPolygonDistance(hole,0))
}));

export const westHillBareGround=(x,z)=>bareGround.some(({distance,holes})=>
  distance(x,z)===0&&!holes.some(hole=>hole(x,z)===0));

export function createWestHillGround(terrain,bounds) {
  return createGroundCoverPatch(terrain,bounds,{
    name:'仙境西路南侧山坡弯道',polygons:[...polygons,...lowerSlope,northwestSlope,centralMeadowGap,southwestRoadTreeBelt,westernRockOpening,...westernFootSoil,...westernRoadWoodland],sources,materials,coverKey:'hillGroundCover'
  });
}
