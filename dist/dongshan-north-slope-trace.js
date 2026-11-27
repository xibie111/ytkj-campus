// Observed pale trace on the slope north of Dongshan's teaching buildings.
const core=[
  [236.522,-377.413],[243.767,-381.308],[252.791,-384.722],[260.701,-388.657],
  [268.973,-391.572],[273.226,-394.319],[275.215,-399.816],[276.105,-399.584],
  [274.974,-393.121],[269.867,-389.628],[261.499,-386.823],[253.809,-382.438],
  [244.633,-379.092],[236.798,-376.747]
];
const fringe=[
  [236.351,-377.461],[243.621,-381.681],[252.652,-385.032],[260.557,-388.987],
  [268.806,-391.935],[272.958,-394.503],[275.139,-399.981],[276.252,-399.69],
  [275.242,-392.937],[270.034,-389.265],[261.643,-386.493],[253.948,-382.128],
  [244.779,-378.719],[236.71,-376.592]
];

export const dongshanNorthSlopeTrace={
  name:'东山北坡浅色路迹',
  polygons:[
    {style:'trace',ring:core,holes:[]},
    {style:'fringe',ring:fringe,holes:[core]}
  ],
  materials:{
    trace:{label:'东山北坡浅色路迹内带',colour:'#c6b69a',opacity:.92},
    fringe:{label:'东山北坡路迹自然边缘',colour:'#c6b69a',opacity:.36}
  },
  sources:{
    imagery:[{"date":"2024-03-09","sensor":"WorldView-3","nativeMetres":0.31,"mapSampleMetres":0.6,"url":"https://livingatlas.arcgis.com/wayback/#active=13192&mapCenter=120.70818%2C37.80948%2C19"},{"date":"2025-06-02","sensor":"WorldView Legion-2","nativeMetres":0.34,"mapSampleMetres":0.6,"url":"https://livingatlas.arcgis.com/wayback/#active=3692&mapCenter=120.70818%2C37.80948%2C19"},{"timeAxisDates":["2026-02-14","2026-05-01"],"sensor":"BJ3","url":"https://www.sdmap.gov.cn/map.html"}],
    basis:"北坡独立钩形浅色路迹。几何沿2025年可见线，2024与2026影像复核形状。宽度为影像读数估计，沿用模型地形。"
  },
  coverKey:'dongshanNorthSlopeTrace'
};
