# 建模依据与技术说明

在 Windows 双击「打开校园.cmd」可启动网页，需要本机安装 Python 3。也可以在此目录运行 `python serve.py`。网页、三维引擎、模型和底图都随包提供，可离线浏览。部署到普通静态网站时上传 dist 目录的内容。

首页打开蓬莱校区。点页面顶部居中的「切换校区」，可进入芝樱路 10 号的黄渤海校区。「查找地点」支持正式楼名、编号、房号和服务名称，例如博雅楼（J5）、J5-120、观海阅读空间和快递驿站。同一栋内的服务各有独立链接。地图标注落在所属楼栋，详情列出校方公开的房号或楼层。[黄渤海校区网页](dist/huangbohai.html) · [黄渤海校区完整三维模型](dist/huangbohai-campus.glb) · [校方后勤指南](https://zwc.ytkj.edu.cn/info/1090/1684.htm)

黄渤海模型的局部原点为东经 120.9875°、北纬 37.7322°。一期工程总图用 5 个地物与 Sentinel-2 影像配准，逐点留一检查的偏差为 3–9 米，独立检查点 J4 南翼的偏差约 19 米。模型的屋顶高度和立面窗格以估算为主。沙盘采用 Copernicus GLO-30 地形和 2026 年 10 月的 Sentinel-2 影像，植被色阶参考三期红光与近红外观测。2025 年 4 月 13 日的 WorldView-3 影像用于核对建筑和地物位置。[工程总图](https://www.aiib.org/en/projects/details/2024/_download/China/ES-Impact-Assesment.pdf#page=15) · [建筑依据和配准记录](dist/data/huangbohai-models.json) · [地表数据](dist/data/huangbohai-ground.json) · [高清影像参考](https://livingatlas.arcgis.com/wayback/#active=3692&mapCenter=120.9875%2C37.7322%2C18)

西北门的六段校名景墙依据校方迎新照片，尺寸按照片比例估算。芝樱路在沙盘内显示约 598 米，门前铺面与绿岛共用边界。中央篮球场外围两段弧形步道合计约 488 米，球场间横向步道约 146 米。上述长度为模型值。[校门实景](https://www.ytkj.edu.cn/info/1081/6842.htm) · [中央球场控制资料](tools/data/huangbohai-sports-walks.json)

风雨操场朝田径场的长立面和东看台的两块座席依据校方照片。跑道、半场线和球门用于校核主馆檐口与运动场的相对高度。S3、S4 之间的 1 号配套用房在工程总图和施工记录中均可辨认，模型恢复约 26 × 14 米的中央屋体，3.6 米为示意高度。[田径场实景](https://www.ytkj.edu.cn/info/1081/8367.htm) · [一期施工记录](https://www.aiib.org/en/projects/details/2024/_download/China/ES-Impact-Assesment.pdf#page=16)

烟台市已建成全市域 2 米格网数字高程模型，市级公告还记录了多期 0.5 米影像。两校区的原始图幅、拍摄日期和网页分发条件仍待取得。本站继续采用上文所列公开数据，黄渤海校区的道路纵坡、门区铺面和运动场标高仍是近似值。[市政府实景三维建设资料](https://www.yantai.gov.cn/art/2023/12/24/art_41950_3168076.html)

## 蓬莱校区

[三维模型](dist/penglai-campus.glb) 使用 glTF 2.0，单位为米。模型包含地形、建筑、树木、校门和运动区。X 向东、Y 向上、Z 向南，局部坐标原点为东经 120.70525°、北纬 37.80598°。浏览器可旋转、缩放、平移，点选建筑查看依据。在不支持 WebGL 2 的设备上可使用平面模式。

在平面图中拖动可平移，滚轮和双指捏合围绕指针或两指中点缩放。手动移动后切换三维与平面，会保留当前查看位置。点击路面可查看有依据的名称、道路类型或估算宽度。图层中的「地图名称」控制地标与平面路名。可用 `?view=plan#chuangyi` 与 `?view=plan#xuefu` 直达两处已核名的校内路段。

## 资料和精度

### 三个片区的地面与名称

蓬莱主校区、东山片区同属蓬莱校区。顶部菜单切换两个校区，「查找地点」中的「东山片区」可直接进入东山。下面的链接可在部署后的网页或离线服务中打开。

| 网页近景 | 建模依据与精度 |
| --- | --- |
| [蓬莱北门及仙境西路](dist/index.html#north-road-crossings) · [田径场露天看台](dist/index.html#track-terraces) | 高德截图和历史影像校核北门前的斜纹、两处横向标线和北侧连续人行铺装。看台沿直道和西弯道展开，座阶数量与高度依据校方照片估算。[校方实拍](https://www.ytkj.edu.cn/info/1081/8367.htm) |
| [东山全景](dist/index.html#dongshan) · [6号教学楼内院](dist/index.html#G018) · [校界道路](dist/index.html#dongshan-boundary-road) | 庭院草坪沿现有建筑内环布局。校界车道约 113 米，人行道约 66 米。路线两端接上原有铺装，中段线位与横坡仍缺地面控制点。 |
| [黄渤海校区](dist/huangbohai.html) · [G228 与芝樱路](dist/huangbohai.html#hbh-g228) | 一期总图约束三个教学庭院的铺装外缘。校界外保留跨期均可辨认的约 38 公顷田地和开阔植被。G228 两幅车行道采用 OpenStreetMap 中心线，每条车道显示宽度估为 3.5 米。[工程总图](https://www.aiib.org/en/projects/details/2024/_download/China/ES-Impact-Assesment.pdf#page=15) · [道路命名公告](https://mzj.yantai.gov.cn/art/2024/12/20/art_2383_2874550.html) |

蓬莱和东山的林缘、草地、田块与硬化地边缘采用李卓鸿等人的 SinoLC-1 烟台市约 1 米土地覆盖分类（CC BY 4.0）。数据集于 2023 年发布，烟台图幅各处的原始拍摄日期未注明。用 2025-05-20、2025-06-11、2026-07-04 的 Sentinel-2 原生 10 米红光、近红外和场景分类核对覆盖类型，按经纬度配准至校园局部坐标后重新着色。运行 `python tools/penglai_surface_cover.py Yantai.tif band-cache` 可重建叠图。卫星图层保留原始影像的清晰度。[SinoLC-1 数据与许可](https://doi.org/10.5281/zenodo.7709370) · [Sentinel-2 Collection 1](https://sentinels.copernicus.eu/-/collection-1-level-2a)

2026-11-25 复核楼名。用户的高德截图支持东山 5、6 号教学楼、厚德餐厅、观海广场和图文楼的相对位置。百度地点记录补充了西区 1 号教学楼、东山 7 号宿舍楼、黄渤海 S2 栋等检索名。百度的「18号楼」与东山 5 号教学楼附近的标注存在冲突，校方把黄渤海快递物流中心列在 G2，百度的菜鸟点位距此约 151 米。Google Maps 本次未检出能独立确认这些楼栋的结果。商业地图仅用于核对，网页随包提供开放数据制作的底图。[高德校区地点](https://www.amap.com/place/B02170RBN9) · [百度东山7号宿舍](https://map.baidu.com/mobile/webapp/place/detail/uid=587b1206b7fd446ef02d8377/) · [百度黄渤海S2栋](https://map.baidu.com/mobile/webapp/place/detail/uid=e5cfe5f05515f6d57369d308/) · [校方后勤指南](https://zwc.ytkj.edu.cn/info/1090/1684.htm)

### 建筑近景

厚德餐厅位于专家公寓一层。门前近景按校方北门全景与近照重新配准，入口移向图文楼一侧约 21.5 米。弧形凸窗、米白楼层带、旋转门及两段屋面构架均依照片估建，沿街门位的不同拟合结果相差约 7.5 米。[餐厅近景](dist/index.html#houde) · [北门实景](https://eng.ytkj.edu.cn/static/images/xyfg2.png)

东山六教西立面的五排窗、屋顶凸部和开放梁架可在 2024-11-30 与 2025-04-08 的校方航拍中相互核对。模型沿用原主檐标高，凸部高约 4.4 米，上方梁架约 2.55 米。六教详情中的「看六教西立面」可直接转到临坡一侧。[西立面近景](dist/index.html#sixth-teaching-west) · [校方航拍一](https://www.ytkj.edu.cn/info/1049/8478.htm) · [校方航拍二](https://www.ytkj.edu.cn/info/1049/8465.htm)

黄渤海博雅楼 J5 的西南面采用内收玻璃幕墙，东南面有竖向格栅。屋顶的女儿墙、两处附房与深色屋面分区参考 2026 年校方立体导览和 2025-04-13 影像。工程总图约束建筑外轮廓，立面构件深度与屋面附房高度为显示近似。[博雅楼近景](dist/huangbohai.html#J5) · [校方导览](https://zwc.ytkj.edu.cn/info/1090/1684.htm)

### 蓬莱建筑与地形

- 校内部分覆盖蓬莱主教学区、东山片区与博文苑。部分建筑由多个屋顶分片组成，同栋附属部分可能独立计数。北门包含校名墙、门房和立柱。
- Overture 发布的 85 个屋顶候选，结合 3D-GloBFP 补充的 9 个多边形，经过球场误识排除、屋顶分片去重和局部体量补建，生成展示模型。第二教学楼采用 G043 多边形。图文楼、专家公寓、学府路商业街北段和第三教学楼根据公开资料近似建模。第三教学楼（艺术楼）以两期高清影像和用户提供的高德截图核对屋顶连续性，按 CBRA 2021 开放轮廓补建北端约 284 平方米。校方记录有三教 415 房间，模型绘四排窗。ICESat-2 ATL03 支撑主屋面显示标高约 25.45 米（EGM2008）。东侧相邻车道两期回波约 11.1 米，用作楼体展示基准。另有约 22.55 米的较低屋面回波，分区边界、各侧地坪和现场层高待测。当前东侧地形偏高，三教默认从西北侧观看。[三教轮廓与高程记录](dist/data/arts-building.json) · [NASA ATL03](https://nsidc.org/data/atl03/versions/7) 医务室与大学生科技创新创业园按到访区域标注。东山财经学院（第四教学楼）位于六教西侧。高德截图核对名称和相邻楼号，校方场区图和两期影像用于复核南翼轮廓。2024-11-30 和 2025-04-08 两张校方航拍可辨西侧连廊的三层窗带、首层通道和窄柱。北翼西端方塔的塔冠比连廊压顶约高 15 米。临路的窗列按可辨立面建模，北侧与内院仍有航拍遮挡。普通屋面有激光回波可供核对，西塔塔冠海拔按航拍估算。南北翼与连廊在地图中共用一个建筑标签。窗带与檐口采用航拍相对高度，入口高程沿用附近激光点估计。可在沙盘打开[连廊西入口](dist/index.html#east-finance-passage)。[场区总图，第 9 页](https://www.ytkj.edu.cn/__local/3/F6/32/5241A8114C0D15B821962C7CB32_2114B07F_7811D.pdf#page=9) · [校方航拍一](https://www.ytkj.edu.cn/info/1049/8478.htm) · [校方航拍二](https://www.ytkj.edu.cn/info/1049/8465.htm) [校方四教记录](https://www.ytkj.edu.cn/info/1083/8716.htm) [校方三教记录](https://jwc.ytkj.edu.cn/info/1310/3800.htm) · [医务室位置](https://zwc.ytkj.edu.cn/info/1090/1613.htm)商业街北段中轴长采光带和北端斜向采光带由高德及 2024-03-09、2025-06-02 两期高清影像互校，形态尺寸为模型近似。东山 5 号教学楼和 17 号楼的位置与朝向按三期 10 米 Sentinel-2 红波段拟合，楼号由高德和校方导览核对。东山 7、15 号楼与现有屋面配对，结合校方巡游车站名补标。东山 6、11、12、16 号宿舍楼和博文苑 28–33 号楼对照校方楼号图、屋面及相邻道路挂标。图文楼可按社科图书借阅室搜索，房间位于三层 305。中国日记资料馆位于图文楼一层，按入馆指南预约参观，可在网页搜索馆名。[校方楼号图](https://zwc.ytkj.edu.cn/info/1090/1684.htm) · [校方入馆指南](https://lib.ytkj.edu.cn/info/1082/3662.htm) 8 号楼沿既有东端屋顶向西南补建约 23 米。东山 9 号宿舍楼的东西两翼按开放轮廓连接并合用标注，两期高分辨率影像核对连续性。东山 10 号把原两个屋顶分片合为约 555 平方米的连续主楼，保留较高旧屋面的展示标高。11 号用 2023 年校方总平、CBRA 2021 和两期影像校核，补绘约 30×24 米的主楼，沿用已有展示屋顶标高。东山 6–7 号、7–8 号宿舍之间各移除一块误检屋面，两期影像与 CBRA 2021 支持原位置为步道和绿带。完整檐线、连接处的局部高差和楼高待测。[东山宿舍重建依据](dist/data/dorm-buildings.json)模型楼高、窗列与屋顶构筑物为影像估算。[东山楼栋重建依据](dist/data/east-teaching-buildings.json)
- CNBH-10m 与 3D-GloBFP 均为 2020 年遥感估高。同一栋有多源结果时，保留匹配记录、样本数和差异。一教、二教根据校方六字头房号绘制六层，暂按 3.8 米层高估算；专家公寓按一层基座加五排窗带展示。单体数据与 GLB 的节点属性保留了楼高依据。门窗分格、屋顶构件、跑道细节及个体树木均含示意建模。
- 校方列出三家蓬莱校区学生餐厅。主校区文化餐厅在创意大道西侧，共三层，厚德餐厅在北门西侧专家公寓一层。东山仙境食府共三层，门前有停车空地。三处按导览图、门面实拍与相邻地物定位，厚德餐厅具体门位按公寓临广场的一侧估放。[后勤指南及门面照片](https://zwc.ytkj.edu.cn/info/1090/1684.htm) · [迎新开放记录](https://www.ytkj.edu.cn/info/1081/8208.htm) · [东山航拍](https://www.ytkj.edu.cn/info/1049/8478.htm) · [餐厅定位数据](dist/data/dining-models.json)
- 周边覆盖约 3.00 × 2.66 千米。校界外采用 546 条 3D-GloBFP 屋顶轮廓及遥感估高；北门车道的两个误检记录和五教旧屋顶残片保存在 surroundings.json 的 excludedBuildings 中，屋顶色调取自 Sentinel-2 像元。部分低层建筑的屋脊依长边方向与屋面宽度生成，门窗、坡度和用途未经逐栋调查。道路、水体、林地和邹于村地名来自 OpenStreetMap，缺失的道路宽度根据道路类型估算。[3D-GloBFP](https://doi.org/10.6084/m9.figshare.28906499) · [邹于村地名点](https://www.openstreetmap.org/node/10931818885) · [OSM 署名与许可](https://www.openstreetmap.org/copyright) · [周边地物数据](dist/data/surroundings.json)
- 道路覆盖 75 个 OSM way 的 76 个裁剪片段。合并与校内提取重复的 31 段，在平交口接合铺面；保留原始中心线及建筑冲突记录的来源。三段东山校园道路、坡外侧人行铺装和文化餐厅、仙境食府门前硬地参考校方实景建模。东山南侧绕行路的东端转弯与回转段按三期原生 10 米 Sentinel-2 硬质带调整，保留西接点，并将宿舍东侧车道北续约 92 米至分岔前。另按校方总平面图与高清影像补绘约 33 米的宿舍组团内侧接入。9 号和 12 号宿舍间按校方总平、两期影像与高德截图补接约 41 米绿岛西侧步道，与南侧道路和原内侧步道接合。现场宽度和坡度待核。宽度与坡度为展示近似。东山口袋广场按校方活动照片定位，从校方航拍近似补绘约 444 平方米铺装，沿东侧增绘约 34 米步行接入，台阶尺寸与平台标高待测。商业街北侧停车区以三期开放原生 10 米影像核对并补绘约 1,185 平方米核心铺面，实地边界、坡度、车位线待核。停车区东侧接入由两期高清影像和用户提供的高德截图核对，模型沿斜向硬地接至相邻街巷（OSM 1073365585），轴长约 10.4 米、展示宽度约 4.4 米。铺面随既有地形，现场标高和通行方向待核。[相邻街巷](https://www.openstreetmap.org/way/1073365585) [广场活动报道](https://www.ytkj.edu.cn/info/1083/7991.htm)北门门外有六枚远端方向箭头，并按 2022、2025 年校方照片补绘两枚靠西门岗的左右分流与向西转弯箭头。门内绘有两枚出校直行箭头与两枚进校转向箭头，绿岛石路缘按现有轮廓做成立体。路宽、铺装边界及箭头尺寸取模型估值。创意大道和学府路按校方平面图与屋顶、路口对位。学府路北端经高德图核对，名称覆盖至仙境西路。六教院落按现有开源屋面凹口补绘约 385 平方米贴地铺装，中央留出约 57 平方米绿地，院落标高与通往邻楼的坡道待测。GLB 的「道路与步道」节点属性 roadNames 记录名称、来源和局部中心线。三维网格贴合地形三角面；平面图复用矢量，卫星图层可单独对照原始影像。[北门实景](https://eng.ytkj.edu.cn/static/images/xyfg2.png) · [东山航拍](https://www.ytkj.edu.cn/info/1049/8478.htm) · [道路几何](dist/data/roads.json) · [校园道路补绘](dist/data/campus-road-details.json)
- 北门由正面照片校正构架、门房间距和校名墙宽高比，绝对尺度仍以校名墙宽 20 米为假设。田径场外围采用三期 Sentinel-2 影像拟合，内圈以名义 400 米为约束，南侧主席台依校方照片绘制五个膜顶。场坪取七个 Copernicus GLO-30 场内样本的中位数 54.4 米。场地精确标高、排水坡和划线尺寸待测。
- 仙境食府侧通道的车行面恢复按基础地形贴合。配合路缘的局部高程过渡约束餐厅入口整平的覆盖范围，门槛与门前核心平台保留原高程。新旧前场边坡属于模型重建，实际道路纵坡和挡墙仍待实测。
- 地面近景在网页三维、平面图和 GLB 中按米制比例显示。道路骨料、路肩、红砖坡道和石板铺装沿现有路面布置。运动面层覆盖田径场、篮球主铺装和网球场。篮球场按两期影像布置八片。平面显示全部八片，三维绘制得到场坪高程支持的部分。田径场分道和网球场边线按常规场地规格近似绘制。林地、草地、耕地、建成区、裸地、水域和湿地各用独立近景纹理。模型沿用既有道路与高程，材质、缝宽、田间土块与水纹为示意。可用 `#ground-road`、`#ground-basketball`、`#ground-tennis`、`#ground-track`、`#ground-village`、`#ground-shore`、`#ground-soil` 打开近景。
- 观海广场两侧的草坪和北门椭圆绿岛沿校方照片所示的绿化及铺装布局细化。周边草地采用 ESA WorldCover 2021 草地类别，结合模型原有影像色调。草叶、疏密和黄绿色差为材质示意，斑块的实际植被待现场核对。近景可见贴地的立体短草和较高的坡地草簇，草高与密度为示意。广场步道、原有石缝与草坪共用高分辨率局部贴图。打开 `#plaza-turf` 或 `#slope-turf` 可直达两处近景。GLB 内嵌草地材质，并以实例化网格保存草叶。
- 观海广场中央步道两排窄冠常绿树与外侧草坪的阔叶树参照校方实景区分树形。目录里的“广场树阵”或 `#plaza-trees` 可直达近景。平面图使用相同的冠块投影，GLB 包含分枝与树冠。单株位置、树高、冠幅及枝叶形态为估算。[北门与广场实景](https://www.ytkj.edu.cn/info/1049/8476.htm) · [ESA WorldCover](https://esa-worldcover.org/en/data-access)
- 校内地形以 Mapzen Terrain Tiles 为基础，校外坡地与山脊采用约 30 米分辨率的 Copernicus GLO-30 地表高程，校界外约 100 米范围内与校内数据平滑衔接。高程数据按 20 米间距重采样，网页与 GLB 的地形显示网格间距约 12 米。次等高线间距为 5 米，每 25 米绘一条主等高线。三处食堂门前局部加密并按模型台阶和门槛整平，平台边界及标高仍待实测。山脊、林冠、建筑附近的绝对标高及细小坡坎仍受原栅格限制。林地参考 ESA WorldCover 2021。卫星影像使用 2026-10-14 Copernicus Sentinel-2 L2A 的真彩色波段，原始分辨率约 10 米。[Mapzen 来源](https://github.com/tilezen/joerd/blob/master/docs/attribution.md) · [Copernicus GLO-30](https://doi.org/10.5270/ESA-c5d3d65) · [高程许可与署名](dist/data/athletics-sources.txt) · [周边高程网格](dist/data/surrounding-dem.json)
- 篮球场主铺装边界取自三期开放 Sentinel‑2 的 10 米原生色带，长边约 102 米。九个日期、两条轨道的 352 个 ICESat‑2 ATL03 场内主簇返回约束台面，模型标高为 43.8 米（EGM2008）。逐日留出沿轨高程对照的均方根误差由 7.659 米降至 0.083 米。2024-03-09 和 2025-06-02 影像均能辨认北排六片和南排转向的两片，2025 年可见全部 16 个红色禁区。端线和三分线按常规场地规格近似绘制。模型在靠坡且缺高程控制的边缘截断部分三维划线，平面保留完整布局。排水坡和边坡待现场测量。[球场范围与激光样本](dist/data/basketball-platform.json) · [NASA ATL03 v007](https://doi.org/10.5067/ATLAS/ATL03.007) · [FIBA 场地规则](https://assets.fiba.basketball/image/upload/documents-corporate-fiba-official-rules-2026-v1-1.pdf)
- 观海广场的中央踏步和上平台接入局部地形网格。台阶前后各自接入对应平台，校名墙北侧的矩形种植带按校方照片补建。踏步数量和尺寸、平台绝对标高及花池尺寸采用模型估计。[广场与北门反向实景](https://www.ytkj.edu.cn/info/1049/1752.htm) · [校名墙正面](https://www.ytkj.edu.cn/info/1049/8476.htm)
- 周边山体在既有高程上计算山脊、沟谷和坡向晕渲，近邻与宽邻域分别约为 16 米和 52 米。三维和平面图共享地表色调，山坡林缘沿用已有位置并细化树冠形状。东侧山脊用同日 ICESat-2 ATL08 的七个连续林冠高样本校准沿测线约 600 米的林冠高度。距测线 30 米起向两侧逐步减弱，50 米处回归原展示值。同一测线内五次逐站留出，均方根误差从 3.56 米降为 2.43 米。该结果只验证沿线估计，单株高度与测线外林高待实测。[东侧林冠样本和方法](dist/data/east-ridge-canopy.json) GLB 将晕渲嵌入地表颜色图。打开 `#east-ridge`、`#west-slope`、`#south-ridge` 可查看各段山体侧视及南侧开挖地，`#hillside-meadow` 可查看东坡林缘草甸。坡地草簇以世界坐标和地表覆盖遮罩确定位置，草带、叶形和枯梢为示意。
- 仙境西路南侧的西坡裸土弯道和植被边缘依据 2024-03-09、2025-06-02 两期影像绘制，沿弯道约 500 米。地表覆盖贴合已有地形，坡高与排水形态待测。打开 [西侧山坡近景](dist/index.html#west-hillside-bends) 查看。
- 西坡下段按 2025-06-02 影像补齐六条植被开口和相连的疏草地带，约 2,981 平方米。两期影像用于核对周边地物，坡地台阶和地面用途待核。 [植被开口近景](dist/index.html#west-hill-clearing)
- 东山快递驿站在平面中显示接入短路、院坪和两排坡屋顶。现有激光记录早于影像中出现的两排建筑，地坪和入口仍待核。打开 [东山快递驿站平面](dist/index.html?view=plan#parcel-east) 查看。 [校方后勤指南](https://zwc.ytkj.edu.cn/info/1090/1684.htm)
- 仙境西路以北的回填地，按 2024-03-09 和 2025-06-02 两期影像补绘约 590 米土色施工便道。激光仅覆盖三个断面，全段地坪和通行状态待核，便道在平面中显示。 [北岸平面近景](dist/index.html?view=plan#north-coastal-track)
- 同一段北岸核对两期影像的 85 个沿岸控制点，校正约 405 米的水陆交界。显示边线以两期的共同位置为准，实际潮位与堤岸高程待测。 [北岸平面近景](dist/index.html?view=plan#north-coastal-track)
- 厚德餐厅北侧按两期影像补约 91 米的便道及其与服务路的接入。三维绕过现有模型基座，平面显示完整的影像轮廓。基座位置与现场净宽待核。 [餐厅北侧近景](dist/index.html#houde-north-path)
- 未获得控制点、竣工 CAD、点云或实测楼高，平面及高度误差尚不能给出现场校核值。

各来源及许可链接位于网页「资料与精度」和 tools/credits.html。原始摘录在 dist/data，转换后的几何、逐对象高度依据及参数在 dist/campus.json。Three.js 的 MIT 许可见 dist/vendor/LICENSE.txt。三处餐厅门额采用 Noto Sans SC 字形，许可见 [SIL OFL](dist/vendor/Noto-Sans-SC-OFL.txt)。数据包内保留数据库来源、上游 ID 和署名。

## 重建

运行网页与浏览 GLB 无需安装建模依赖。重新生成地理数据时，使用 Python 及 rasterio、numpy、Pillow、requests。周边提取脚本还使用 pyshp 和 Shapely。组装校园数据后，运行 python tools/roads.py，用 Shapely 2 在离线状态下从内附的几何数据生成路面。tools/assemble.py 从 dist/data 中的现有资料重新生成模型参数。四教南翼的凹多边形坡顶三角化使用 Shapely 2.1 或更高版本和 GEOS 3.10 或更高版本。tools/terrain.py、tools/landcover.py 和 tools/satellite.py 分别重建校内地形、地表覆盖和卫星底图。tools/surroundings.py 提取周边建筑与 OSM 地物，并重建校内外衔接的高程网格。运行 `python tools/plaza_turf.py` 可用固定种子重新生成广场的短草色图。运行 `python tools/ground_materials.py`（需 NumPy、SciPy 与 Pillow）可重新生成分类地表的区域色调图与四米平铺纹理。几何模型由 dist/architecture.js 和 dist/landscape.js 生成。网页加载完成后，浏览器内调用 `await window.campusExport()` 可取得当前场景的 GLB ArrayBuffer。



## 高清影像与地物校核

图层中的「看高清卫星图」按当前浏览位置打开 Esri Wayback。覆盖全图的 Vantor WorldView Legion-2 影像拍摄于 2025-06-02，归档于 2026-11-18。源像元 0.34 米，底图采样 0.60 米，元数据位置精度 5 米。商业影像保留在提供方，离线包内置可分发的 Copernicus Sentinel-2 10 米真彩影像。[校区高清对照](https://livingatlas.arcgis.com/wayback/#active=3692&mapCenter=120.70525%2C37.80598%2C18) · [对位数据与许可入口](dist/data/imagery-control.json)

Airbus OneAtlas 目录核实了覆盖完整图幅的 2025-09-17 Pléiades Neo 3（标称 0.30 米）和 2026-07-30 Pléiades 1B（标称 0.50 米）。商业预览和站内 10 米 Sentinel-2 底图各自对应资料来源。东山六教北翼和两处快递驿站可按名称搜索。[Airbus 预览](https://access.foundation.api.oneatlas.airbus.com/api/v1/items/9b390675-3489-436b-9bf5-63005201849d/quicklook) · [卫星影像记录](dist/data/imagery-control.json)

第十教学楼按校方总平和航拍改到东山教学组团的西端。主楼、低翼和红色门厅分别建模。主楼檐顶展示标高约 56.2 米（EGM2008），依据 ICESat-2 近屋缘回波。学府路东侧 27 号楼的楼号来自高德截图，红瓦主屋参考 CBRA 2021 和两期影像。屋角、门槛和外墙尺寸为近似。[新增楼体和高程依据](dist/data/named-building-models.json) · [校方东山总平](https://www.ytkj.edu.cn/__local/3/F6/32/5241A8114C0D15B821962C7CB32_2114B07F_7811D.pdf#page=9) · [NASA ATL03](https://nsidc.org/data/atl03/versions/7)

田径场内场模型中心距影像上红绿交界拟合的中心约 1.7 米。北门模型墙轴线与中央绿岛北缘的可见浅色横带相差约 1°，墙身位置仍需地面控制。一教的原公开轮廓只覆盖部分屋顶，中心距整块可见主屋顶中心约 18 米。新版按三期影像补齐西端约 604 平方米屋面，并用校方影像核对采光带。墙脚和檐高仍待实测。入口门框、玻璃雨篷和上方窗带按学校游览照片解释，门厅位置和尺寸为估算。

东南两处 OSM 水体内侧的 45 个与 29 个十米网格采样位置，三个日期的 Sentinel-2 B03/B08 及场景分类均不支持画成开阔水面。网页与 GLB 保留该处的地表覆盖和地形，原始 OSM 轮廓仍在周边数据中。运行 `python tools/water_observations.py` 重新提取影像样本，再运行 `python tools/assemble.py` 更新网页数据。[水面逐期结果](dist/data/water-observations.json)

东侧现有水塘沿 OpenStreetMap 岸界生成水平水面，标高估计为 67.97 米，取岸界内四个原生 Copernicus GLO-30 像元中心的中值。岸边用局部细分衔接到原地形。像元混有岸土的可能性较高，水位、深度和季节性岸界仍待实测。[像元与水位估算记录](dist/data/water-levels.json)


东山南侧估绘弯道的西端落入绿地。经三期开放影像与校方航拍校核，舍去缺少定位依据的 75.39 米，从原教学楼前路交点接入，保留 309.55 米车道和 152.25 米外侧红色步道。路面纵坡仍随模型地形。

西侧海岸低台地采用 2023-04-16 ICESat-2 ATL03 和 2024-12-29 GEDI L2A 的 16 组开阔陆地测点校正。按整套观测轮流留出，12 组 ICESat-2 点均方根误差从 3.68 米降至 1.22 米，4 个 GEDI 光斑从 3.86 米降至 1.11 米。影响约 3.91 公顷，最大抬高约 3.61 米。两期 Sentinel-2 与 WorldCover 联合筛选的 8,600 个水面位置复核无改量。测线外围形状与坡坎待实测。浏览 `#west-coastal-flat` 直达。[西侧低台地高程补丁](dist/data/west-coastal-flat-elevation.json) · [NASA ATL03 v007](https://nsidc.org/data/atl03/versions/7) · [GFZ GEDI 数据](https://gedidb.readthedocs.io/en/latest/user/tiledb_database.html)

西南采挖区西侧裸岩平台用 ICESat-2 ATL03 的两条轨道与 GEDI L2A 多次过境确认低位地面。现有 20 米格上追加 256 个校正节点。完整留出整套观测时，ATL03 的 43 组样本均方根误差由 27.29 米降至 0.48 米，GEDI 的 11 组由 26.05 米降至 0.84 米。样本分布外的断坎、边线和实际坡度待测。五期清晰 Sentinel-2 影像核对改动范围为陆面。浏览 `#west-quarry-apron` 直达。[西南采挖区地形补丁](dist/data/west-quarry-apron-elevation.json) · [NASA ATL03](https://nsidc.org/data/atl03/versions/7) · [NASA GEDI L2A V003](https://doi.org/10.5067/GEDI/GEDI02_A.003)

南侧开挖区在既有 20 米格网上用 NASA ICESat-2 ATL08 的实测高程局部重建，按 EGM2008 高程比较。以轨道和采集年份分别留出验证，2025–2026 年留出的 22 个强束点均方根误差由 34.84 米降至 13.47 米。局部形态仍受轨道间距限制，坡坎与未覆盖的边缘待更密的测绘数据。浏览 `#south-quarry` 直达。用 `python tools/south_quarry_elevation.py` 可从基础高程网格及随附控制点重算补丁。[NASA ATL08 v007](https://doi.org/10.5067/ATLAS/ATL08.007) · [南侧地形高程补丁](dist/data/south-quarry-elevation.json) · [控制点与验证记录](tools/data/south-quarry-controls.json)

南侧采挖地东段的地面按 42 组 ICESat-2 ATL03 和 17 个 GEDI L2A 光斑校正。模型在原有 20 米网格上调整了 243 个节点。整套保留 GEDI 作为检验时，13 个边缘光斑的均方根误差仍约 27 米，坡坎位置待测。[查看采挖地东段](dist/index.html#south-quarry-east) · [控制点与验证记录](tools/data/south-eastern-cut-controls.json)

南侧环道外的低坡在高德图上与田径场、球场及采挖北缘的相对位置吻合。使用两条 ICESat-2 ATL03 轨道约束同一高程网格。46 组跨日期留出样本的均方根误差由 15.11 米降至 13.93 米。浏览 `#south-low-slope` 查看。[低坡控制点](tools/data/south-low-slope-controls.json) · [NASA ATL03 v007](https://nsidc.org/data/atl03/versions/7)

南侧开挖地的积水核心由多期 Sentinel-2 Collection 1 影像核对。三格 10 米原生像元经向内圆角后，沙盘绘制约 295 平方米的水平水面。2023 年 3 月 12 日和 2024 年 1 月 13 日，同日影像确认这三格有水，ICESat-2 ATL03 回波中位高程为 40.630 米和 40.652 米（EGM2008）。水面显示标高取 40.63 米，外围岸线、水深和实时水位待测。浏览 `#quarry-water` 查看模型。[Sentinel-2 Collection 1](https://sentinels.copernicus.eu/-/collection-1-level-2a) · [NASA ATL03 v007](https://nsidc.org/data/atl03/versions/7) · [积水核心记录](dist/data/water-levels.json)

南侧坡地按 2024、2025 年年度地表覆盖和 2025、2026 年 Sentinel-2 多期观测，把连续 38 格旧草地更正为裸地，约 3,800 平方米。使用独立的 2026 年 10 月影像检查后，38 格均满足裸露光谱条件。边缘保留原生 10 米格网精度。打开 `#south-bare-slope` 查看。运行 `python tools/landcover.py` 重建分类栅格。[年度地表覆盖](https://livingatlas.arcgis.com/landcover/) · [裸地复核记录](dist/data/landcover-refinement.json)

东侧山脊定位采用 2026-03-06 ICESat-2 ATL08 轨道 1253 强波束 gt1l 沿线最高采样点。沿北至南约 1.00 千米的 11 个样本，与 GLB 地形三角网在相同经纬度逐点比较。两组各以北端为零，到最高采样点的高差为 91.1 米和 91.7 米；南坡一个采样处相差约 20 米。单条约 100 米间隔的剖面只能校核沿线起伏。[高差剖面](dist/data/ridge-profile.png) · [源数据、单位与每站高程](dist/data/ridge-profile.json) · [NASA NSIDC 产品](https://doi.org/10.5067/ATLAS/ATL08.007)
