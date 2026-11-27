const campusGuide = 'https://zwc.ytkj.edu.cn/info/1090/1684.htm';

export const buildingDescriptions = {
  library: {
    text: '蓬莱校区图书馆位于图文楼一至四层，社科图书借阅室在三层 305。中国日记资料馆在一层，参观需预约。',
    aliases: '蓬莱校区图书馆 图文信息楼 社会科学图书借阅室 社科图书借阅室 社科借阅室 图文楼305 中国日记资料馆 日记资料馆',
    source: 'https://lib.ytkj.edu.cn/info/1082/3662.htm',
    sourceLabel: '校方新生入馆指南'
  },
  B023: {
    text: '图文楼南侧。南门上方是浅青色玻璃雨篷，屋顶有两组采光带。',
    modelNote: '主楼轮廓据三期影像，墙脚与檐高待测。',
    source: 'https://www.ytkj.edu.cn/info/1115/6342.htm',
    sourceLabel: '校方航拍'
  },
  G043: {
    text: '一教和体育馆之间，那座沿路展开的浅色长楼就是二教。从沙盘上往下看，可以看到几段平屋顶连在一起。',
    modelNote: '楼体参考公开的屋顶轮廓。',
    source: campusGuide
  },
  B007: {
    text: '观海广场旁，图文楼东北侧有一座弧形玻璃楼。正门两边的坡道朝外弯开，和旁边图文楼直直的白色竖条很好区分。校内讲座和活动常在这里举行。',
    source: 'https://www.ytkj.edu.cn/info/1081/8550.htm',
    sourceLabel: '校方活动报道',
    aliases: '国际学术报告厅 讲座'
  },
  B037: {
    text: '从二教继续向南，一整片蓝色大屋顶很好认。它盖住的就是校园体育馆。从沙盘上往下看，屋顶像一块展开的蓝色长方布。',
    source: 'https://sport.ytkj.edu.cn/info/1023/1907.htm',
    sourceLabel: '校方体育馆位置资料'
  },
  B040: {
    text: '沿创意大道走，西侧那座带弧形门面的楼就是文化餐厅。门前是一片停车区，楼里有三层学生餐厅。',
    source: campusGuide
  },
  'west-arc': {
    text: '从北门进来，西侧那栋弯弯的楼就是专家公寓。它上面是一排排玻璃窗，下面是浅色石材。厚德餐厅就在一楼。',
    source: campusGuide,
    aliases: '专家公寓'
  },
  B031: {
    text: '仙境食府是东山片区的三层学生餐厅。从门前的停车空地往楼看，几级宽台阶通向正门。',
    source: campusGuide,
    aliases: '东山食堂 东山餐厅'
  },
  'xuefu-east-building-27': {aliases: '学府路东侧27号楼 学府路27号楼'},
  B082: {
    text: '面向田径场南侧，五顶白色棚罩一字排开，远看像五张撑起来的帆。棚下是一级一级的看台，正对红色跑道和绿茵场。',
    aliases: '看台 膜顶'
  },
  'east-north': {
    text: '靠近北门的这段商业街，屋顶顺着学府路排成一长列。从沙盘上看，可以跟着这排屋顶找到商业街。',
    modelNote: '北段是地图上的定位叫法，楼体范围为近似。',
    source: campusGuide,
    aliases: '商铺 商业街'
  }
};

export const placeDescriptions = {
  gate: {
    text: '从仙境西路来，先看见白色校名墙。进门就是观海广场，两排树夹着中央步道，顺着缓坡一路通到图文楼。',
    source: campusGuide
  },
  field: {
    text: '红色跑道绕着一整块绿茵场。往场地南边看，五个白色棚顶并排盖在看台上，从跑道对面也能认出来。',
    modelNote: '跑道外缘参考三期卫星影像。'
  },
  'plaza-trees': {text: '观海广场的中央步道两旁，树一棵接一棵排开。从北门往里看，两排树一路把视线引向图文楼。'},
  'place-10931818885': {text: '邹于村在校园东南方向。从沙盘上看，可以顺着屋顶辨认村落的街巷和一组组院子。'},
  'east-ridge': {text: '把沙盘转向校园东边，可以看到山坡往上收成一条山脊。沿着最高处的起伏看，像是一道横在坡顶的线。'},
  'west-slope': {text: '仙境西路南侧的山坡有两道连续急弯，裸土外侧可见疏草和灌丛。'},
  'south-ridge': {text: '校园南边的山坡上有一片开挖地。把沙盘转到侧面，可以看到坡面中间落下去，和旁边连绵的山坡形成对照。'}
};
