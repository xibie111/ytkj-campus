// Shared pale surface visible inside the athletics approach.
const core=[
  [-260.556,441.172],[-226.831,429.972],[-208.277,422.937],[-213.485,426.100],
  [-221.775,434.353],[-231.248,442.545],[-251.735,459.191],[-255.901,461.513]
];
const fringe=[
  [-227.351,428.406],[-208.281,420.999],[-207.399,421.200],[-206.380,422.886],
  [-206.693,423.907],[-212.468,427.399],[-220.651,435.562],[-230.188,443.809],
  [-250.806,460.562],[-256.128,463.528],[-257.390,462.401],[-262.385,440.578],
  [-261.844,439.861]
];

export const athleticsSoutheastPaleGround={
  name:'田径场东南浅色地表',
  polygons:[
    {style:'core',ring:core,holes:[]},
    {style:'edge',ring:fringe,holes:[core]}
  ],
  materials:{
    core:{tile:'drySoil',label:'田径场东南浅色地表内带',colour:'#c9baa1',opacity:.86},
    edge:{tile:'drySoil',label:'田径场东南浅色地表边缘',colour:'#c9baa1',opacity:.33}
  },
  sources:{
    imagery:[
      {date:'2024-03-09',url:'https://livingatlas.arcgis.com/wayback/#active=13192&mapCenter=120.70253%2C37.80192%2C19'},
      {date:'2025-06-02',url:'https://livingatlas.arcgis.com/wayback/#active=3692&mapCenter=120.70253%2C37.80192%2C19'},
      {timeAxisDate:'2026-05-01',sensor:'BJ3',url:'https://www.sdmap.gov.cn/map.html'}
    ],
    basis:'田径场东南台地可见浅色区的交集内带，沿用现模型地形。'
  },
  coverKey:'athleticsSoutheastPaleGround'
};
