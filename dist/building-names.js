const campusPlan = 'https://zwc.ytkj.edu.cn/info/1090/1684.htm';
const mainApartments = '这栋学生公寓在创意大道西侧，沿路往南可到田径场。';

// Directory spellings only. Several Baidu pins fall outside their roof, so they
// must not change the model's geometry or its label anchor.
export const mapNames = {
  library:'烟台科技学院西区-图文楼',
  B023:'烟台科技学院西区-1号教学楼',
  B024:'烟台科技学院(东山校区)-东山4号教学楼',
  B019:'烟台科技学院(东山校区)-东山7号宿舍楼',
  B036:'烟台科技学院(东山校区)-12号楼',
  B044:'烟台科技学院西区-学生公寓1号楼',
  B048:'烟台科技学院西区-学生公寓2号楼',
  B062:'烟台科技学院西区-5号公寓楼',
  'apartment-6':'烟台科技学院西区-学生公寓6号楼',
  'west-arc':'烟台科技学院西区-专家公寓'
};

// IDs refer to the roof footprints in campus.json. Keep shared roof fragments
// with their main building once the split has been checked against imagery.
const planNames = {
  B007: {name:'国际学术报告厅', aliases:'学术报告厅', source:'https://www.ytkj.edu.cn/info/1081/7663.htm', sourceLabel:'校方活动报道'},
  B009: {name:'东山15号宿舍楼', aliases:'15号楼 东山15号楼 15号宿舍楼 东山15号宿舍',
    text:'校方后勤指南把东山 15 号宿舍楼列为校园巡游车终点。', sourceLabel:'校方导览与巡游车路线'},
  B005: {name:'东山16号宿舍楼', aliases:'东山16号楼 东山16号宿舍 16号宿舍楼', parts:['B008'],
    sourceLabel:'校方楼号图与两期影像对照', text:'位于东山宿舍外排、15号楼北侧。'},
  B013: {name:'东山6号宿舍楼', aliases:'东山6号楼 东山6号宿舍 东山六号宿舍 六号宿舍楼', parts:['B016'],
    sourceLabel:'校方楼号图与两期影像对照', text:'位于东山宿舍外排、15号楼与7号楼之间。东北端的实际地坪和可见层数待核。'},
  B032: {name:'东山11号宿舍楼', aliases:'东山11号楼 东山11号宿舍 11号宿舍楼',
    source:'https://www.ytkj.edu.cn/info/1049/8478.htm', sourceLabel:'校方航拍', text:'位于东山宿舍内排中段。西南端墙有一列窄窗，西北长墙可见竖窗和浅色竖带。'},
  B036: {name:'东山12号宿舍楼', aliases:'东山12号楼 东山12号宿舍 12号宿舍楼',
    source:'https://www.ytkj.edu.cn/info/1049/8478.htm', sourceLabel:'校方航拍', text:'位于东山宿舍内排南端。西端可见一列窄竖窗和赭色墙基。'},
  B017: {name:'学府宿舍', text:'学府宿舍在学府路东侧，从第一教学楼附近沿路就能找到。'},
  B019: {name:'东山7号宿舍楼', aliases:'7号楼 东山7号楼 7号宿舍楼 东山7号宿舍',
    text:'校方后勤指南把东山 7 号宿舍楼列为校园巡游车停靠点。', sourceLabel:'校方导览与巡游车路线'},
  B023: {name:'第一教学楼', aliases:'一教', parts:['B029'],
    source:'https://www.ytkj.edu.cn/info/1115/6342.htm', sourceLabel:'校方航拍'},
  B024: {name:'财经学院（第四教学楼）', aliases:'财经学院 第四教学楼 4号教学楼 四教 东山财经学院',
    parts:['B015','east-finance-bridge'],
    text:'六教西侧的教学楼由南、北两翼组成。西端连廊的底层通向两翼之间的庭院。',
    source:'https://www.ytkj.edu.cn/info/1083/8716.htm', sourceLabel:'校方四教活动记录'},
  B026: {name:'东山10号宿舍楼', aliases:'东山10号楼 东山10号宿舍 10号宿舍楼', parts:['B027'],
    source:'https://www.ytkj.edu.cn/info/1049/8478.htm', sourceLabel:'校方航拍', text:'位于东山宿舍内排北端。西北长墙可见五排窗与三条浅色竖带。'},
  B030: {name:'东山8号宿舍楼', aliases:'8号楼 东山8号楼 8号宿舍楼 东山8号宿舍',
    labelPoint:[453.86,-166.38], sourceLabel:'校方导览与航拍'},
  B034: {name:'东山9号宿舍楼', aliases:'东山9号楼 东山9号宿舍 东山九号宿舍 九号宿舍楼', parts:['B035'],
    labelPoint:[441.94,-119.22], sourceLabel:'校方导览与航拍'},
  G043: {name:'第二教学楼', aliases:'二教'},
  'east-building-17': {name:'17号楼', aliases:'东山17号楼 东山十七号楼',
    sourceLabel:'校方导览与影像对照'},
  'east-teaching-5': {name:'5号教学楼', aliases:'五教 第五教学楼 东山5号教学楼',
    source:'https://shangxy.ytkj.edu.cn/info/1007/2053.htm', sourceLabel:'校方五教记录'},
  'east-south': {name:'第三教学楼', aliases:'三教 三教艺术楼 艺术楼 艺术学院 原工程训练中心 工训中心',
    text:'也称艺术楼。原工程训练中心曾在临观海广场的一侧挂牌。',
    source:'https://jwc.ytkj.edu.cn/info/1310/3800.htm', sourceLabel:'校方三教房间记录'},
  G018: {name:'6号教学楼', aliases:'六教 第六教学楼 东山6号教学楼 6号楼',
    labelPoint:[307,-271], text:'东山六教围绕内院展开。西面临坡，屋顶凸部上方的开放梁架可在两幅校方航拍中辨认。校方活动记录提到六教 401 教室。',
    source:'https://whcmxy.ytkj.edu.cn/info/1026/2553.htm', sourceLabel:'校方六教记录'},
  'east-teaching-9': {name:'第九教学楼', aliases:'九教 东山9号教学楼 东山九教 人工智能学院',
    parts:['east-teaching-9-south','east-teaching-9-bridge'], source:'https://ai.ytkj.edu.cn/info/1022/1337.htm', sourceLabel:'校方九教记录'},
  'east-teaching-10': {name:'第十教学楼', aliases:'十教 10号教学楼 东山十教 国际葡萄酒学院 国际葡萄酒商学院',
    labelPoint:[67,-269], parts:['east-teaching-10-south','east-teaching-10-portico'],
    text:'位于东山教学组团西侧。校方照片可辨主楼的六排窗带、临路一侧的红色门厅和「国际葡萄酒商学院」字牌。',
    source:'https://ptjxy.ytkj.edu.cn/info/1090/4054.htm', sourceLabel:'校方十教记录'},
  B044: {name:'1 号公寓', aliases:'1号公寓 1号宿舍 一号公寓', parts:['B045'], text:mainApartments},
  B048: {name:'2 号公寓', aliases:'2号公寓 2号宿舍 二号公寓', parts:['B049'], text:mainApartments},
  B050: {name:'3 号公寓', aliases:'3号公寓 3号宿舍 三号公寓', text:mainApartments},
  B052: {name:'4 号公寓', aliases:'4号公寓 4号宿舍 四号公寓', parts:['B054','B060'], text:mainApartments},
  B062: {name:'5 号公寓', aliases:'5号公寓 5号宿舍 五号公寓', text:mainApartments},
  'apartment-6': {name:'6 号公寓', aliases:'6号公寓 6号宿舍 六号公寓'},
  'bowen-20': {name:'博文苑 20 号楼', aliases:'博文苑20号楼 20号楼'},
  'west-arc': {name:'专家公寓', aliases:'厚德餐厅'},
};

// The guide is drawn looking south. These rows were matched to the sports
// field, the internal diagonal road, and the individual footprint rows.
const bowenBuildings = {
  B083:1, B084:2, B085:3, G107:5,
  B078:6, B079:7, B081:8, B080:9,
  B076:10, B075:11, B077:12, G097:15,
  B073:16, B072:17, B074:18, G090:19,
  B070:21, B069:22, G084:23,
  B065:25, B068:26,
  B063:28, B059:29, G064:30, B064:31, B055:32, G063:33,
};
for (const [id, number] of Object.entries(bowenBuildings)) {
  planNames[id] = {name:'博文苑 '+number+' 号楼', aliases:'博文苑'+number+'号楼 '+number+'号楼',
    text:'这栋楼位于田径场西边的博文苑。楼号来自校方导览图。'};
}

export const buildingNames = Object.fromEntries(
  Object.entries(planNames).map(([id, building]) => [id, {source:campusPlan, ...building}])
);

// The campus and nearby housing both use these short building names.
const sixthCampusBuildings = ['G018', 'B013'];
export const preferredBuildingSearch = new Map(
  ['6', '6号', '6号楼'].map(alias => [alias, sixthCampusBuildings])
);

export const buildingLocations = [
  {id:'apartment-6',name:'6 号公寓',aliases:'6号公寓 6号宿舍 六号公寓',x:-214,z:156,
    note:'校方导览把新 6 号公寓画在 1–5 号公寓西侧。标记指向这栋楼的大概位置。'},
  {id:'bowen-20',name:'博文苑 20 号楼',aliases:'博文苑20号楼 20号楼',x:-521,z:379,
    note:'从田径场往博文苑看，20 号楼在这一排靠田径场的一头。标记指向这栋楼的大概位置。'}
].map(place=>({...place,group:'campus',icon:'cube',roofLabel:true,locationOnly:true,span:165,
  meta:'位置参考校方导览和卫星照片 · 模型暂缺楼体',source:campusPlan}));

export function buildingLabelPoint(building, inside, labelPoint=building.labelPoint||building.center) {
  const hasRoof = point => inside(point, building.ring) && !(building.holes || []).some(hole => inside(point, hole));
  if (hasRoof(labelPoint)) return labelPoint;
  if (hasRoof(building.center)) return building.center;
  // A footprint's centroid can fall in its courtyard. Pick a point on the
  // roof by testing the centres of a small grid over that footprint.
  const xs = building.ring.map(([x]) => x), zs = building.ring.map(([,z]) => z);
  const left = Math.min(...xs), right = Math.max(...xs);
  const top = Math.min(...zs), bottom = Math.max(...zs);
  let best = building.center, distance = Infinity;
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const point = [left + (right - left) * (col + .5) / 8, top + (bottom - top) * (row + .5) / 8];
    const fromCenter = Math.hypot(point[0] - building.center[0], point[1] - building.center[1]);
    if (fromCenter < distance && hasRoof(point)) {
      best = point;
      distance = fromCenter;
    }
  }
  return best;
}
