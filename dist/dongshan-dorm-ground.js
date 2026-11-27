// Shared planted areas visible in both June satellite scenes.
const dormMedianEdge=[
  [425.58,-216.71],[428.0,-215.44],[433.33,-219.13],[436.41,-219.87],
  [438.83,-221.63],[445.78,-223.51],[460.57,-230.91],[474.92,-236.09],
  [483.21,-240.84],[483.51,-241.95],[482.37,-244.56],[479.08,-244.65],
  [472.65,-242.9],[460.35,-235.7],[447.27,-230.41],[435.03,-224.54],
  [429.39,-220.28],[425.08,-219.46]
];
const dormMedianCore=[
  [426.21,-217.18],[427.95,-216.26],[432.93,-219.71],[436.11,-220.52],
  [438.65,-222.3],[445.53,-224.17],[460.26,-231.53],[474.63,-236.73],
  [482.61,-241.3],[482.77,-241.9],[481.91,-243.87],[479.16,-243.95],
  [472.93,-242.24],[460.61,-235.05],[447.55,-229.77],[435.4,-223.94],
  [429.81,-219.72],[425.89,-218.9]
];
const northStripEdge=[
  [424.31,-227.37],[427.53,-227.73],[435.5,-231.28],[437.07,-232.18],
  [437.49,-234.79],[432.26,-232.9],[427.19,-230.28],[423.47,-229.13],
  [422.59,-228.2]
];
const northStripCore=[
  [424.43,-228.09],[427.34,-228.42],[435.19,-231.9],[436.43,-232.62],
  [436.61,-233.73],[432.54,-232.26],[427.51,-229.66],[423.75,-228.41]
];

export const dongshanDormPlanting={
  name:'东山宿舍绿带',
  polygons:[
    {style:'planted',ring:dormMedianCore,holes:[]},
    {style:'planted',ring:northStripCore,holes:[]},
    {style:'edge',ring:dormMedianEdge,holes:[dormMedianCore]},
    {style:'edge',ring:northStripEdge,holes:[northStripCore]}
  ],
  materials:{
    planted:{label:'东山宿舍绿带内层',colour:'#78865d',tile:'meadow'},
    edge:{label:'东山宿舍绿带边缘',colour:'#839065',tile:'meadow',opacity:.48}
  },
  sources:{
    imagery:[
      {date:'2023-06-05',sensor:'WorldView-2',nativeMetres:.50,mapSampleMetres:.6,
        url:'https://livingatlas.arcgis.com/wayback/#active=16453&mapCenter=120.71040%2C37.80805%2C18'},
      {date:'2025-06-02',sensor:'WorldView Legion-2',nativeMetres:.34,mapSampleMetres:.6,
        url:'https://livingatlas.arcgis.com/wayback/#active=3692&mapCenter=120.71040%2C37.80805%2C18'}
    ],
    basis:'取两期六月影像共同可辨的宿舍间种植带，避开既有建筑和交通面，依附模型地形。'
  },
  coverKey:'dongshanDormPlanting'
};
