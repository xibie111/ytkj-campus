// The common, visibly dry strip inside the southern side of the old pier.
const core=[
  [-1138.721,-349.327],[-1138.495,-341.756],[-1124.192,-336.727],[-1117.499,-335.018],
  [-1107.424,-330.321],[-1097.233,-327.517],[-1077.67,-319.314],[-1071.308,-317.25],
  [-1071.255,-324.077],[-1080.291,-324.635],[-1090.385,-328.011],[-1100.617,-335.007],
  [-1110.466,-340.13],[-1120.33,-342.944],[-1130.381,-346.906]
];
const outer=[
  [-1140.0,-350.268],[-1139.714,-340.686],[-1138.273,-340.455],[-1132.836,-338.312],
  [-1124.546,-335.527],[-1117.92,-333.841],[-1107.857,-329.143],[-1097.697,-326.357],
  [-1087.697,-322.357],[-1078.115,-318.144],[-1070.727,-315.747],[-1070.067,-316.004],
  [-1070.0,-324.779],[-1070.306,-325.272],[-1080.0,-325.851],[-1089.988,-329.196],
  [-1099.972,-336.081],[-1110.001,-341.297],[-1119.987,-344.146],[-1129.976,-348.091],
  [-1139.297,-350.796]
];

export const westPierPaleSurface={
  name:'西侧旧岸台浅色地表',
  polygons:[
    {style:'core',ring:core,holes:[]},
    {style:'edge',ring:outer,holes:[core]}
  ],
  materials:{
    core:{tile:'grit',label:'旧岸台浅色地表内带',colour:'#c8b79a',opacity:.86},
    edge:{tile:'grit',label:'旧岸台浅色地表边缘',colour:'#c8b79a',opacity:.33}
  },
  sources:{
    imagery:[
      {date:'2024-03-09',sourcePixelMetres:.31,url:'https://livingatlas.arcgis.com/wayback/#active=13192&mapCenter=120.69272%2C37.8090%2C18'},
      {date:'2025-06-02',sourcePixelMetres:.34,url:'https://livingatlas.arcgis.com/wayback/#active=3692&mapCenter=120.69272%2C37.8090%2C18'},
      {timeAxisDate:'2026-10-30',sensor:'ZY3',viewZoom:16,url:'https://www.sdmap.gov.cn/map.html'}
    ],
    basis:'两期高分共同可辨的岸台南侧浅色内带，离可见开水线约6米以上，仅补地表显示。'
  },
  coverKey:'westPierPaleSurface'
};
