"""Rebuild land-cover/courtyard polygons from clipped, licensed observation grids."""
import argparse
import json
import math
from pathlib import Path
from urllib.request import urlopen

import numpy as np
import rasterio
from affine import Affine
from PIL import Image
from rasterio.features import shapes
from rasterio.transform import from_bounds as target_transform
from rasterio.warp import Resampling, reproject, transform_bounds
from rasterio.windows import Window, from_bounds
from shapely import set_precision
from shapely.geometry import Point, Polygon, box, shape
from shapely.ops import unary_union
from huangbohai_fields import build_field_season, TEXTURE
from huangbohai_gate_planting import gate_planting
from huangbohai_roads import CULTURE_FORECOURT, SOUTH_FORECOURT, paving

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "dist/data"
SOURCE = ROOT / "tools/data/huangbohai-land-observations.npz"
OUT = DATA / "huangbohai-landcover.json"
BOUNDS = [-484, -440, 460, 504]
STYLES = ["courtyard", "courtPlanting", "campusVegetation", "cropland", "openVegetation"]
ANNUAL_URL = "https://lulctimeseries.blob.core.windows.net/lulctimeseriesv003/lc2025/51S_20250101-20251231.tif"


def read(file):
    return json.loads((DATA / file).read_bytes())


def ring_polygon(row):
    return Polygon(row["ring"], row.get("holes")).buffer(0)


def large_parts(area, min_area):
    if area.geom_type == "Polygon":
        return [area] if area.area >= min_area else []
    return [p for child in getattr(area, "geoms", []) for p in large_parts(child, min_area)]


def contours(mask, min_area, tolerance):
    transform = Affine.translation(*BOUNDS[:2])
    polys = []
    for mapping, _ in shapes(mask.astype("uint8"), mask=mask, transform=transform):
        polygon = shape(mapping).buffer(0)
        if polygon.area >= min_area:
            # Large classes are confidence regions. Their broad outlines must
            # not suggest cadastral boundaries or one-metre Sentinel imagery.
            polys.append(polygon.simplify(tolerance, preserve_topology=True))
    return unary_union(polys)


def at_one_metre(grid):
    return np.asarray(Image.fromarray(grid.astype("float32")).resize((944, 944), Image.Resampling.BILINEAR))


def track_trees(reserved, observations):
    control = json.loads((ROOT/"tools/data/huangbohai-track-trees.json").read_bytes())
    cx, cy, cz, yaw, pitch, roll, focal = control["camera"]
    yaw, pitch, roll = np.radians([yaw, pitch, roll])
    forward = np.array([np.cos(yaw)*np.cos(pitch), np.sin(pitch), np.sin(yaw)*np.cos(pitch)])
    right = np.cross(forward, [0, 1, 0]); right /= np.linalg.norm(right)
    up = np.cross(right, forward)
    right, up = right*np.cos(roll)+up*np.sin(roll), up*np.cos(roll)-right*np.sin(roll)
    px, py = control["principal"]
    def ray(u, v):
        return forward+right*(u-px)/focal-up*(v-py)/focal
    trees = []
    roots = control.get("rootCorrectionsXZ", {})
    for u, base, top, width in control["picks"]:
        axis = ray(u, base)
        depth = -cy/axis[1]
        x, _, z = np.array([cx, cy, cz])+depth*axis
        if str(u) in roots:
            x, z = roots[str(u)]
            direction = axis[[0, 2]]
            depth = np.dot([x-cx, z-cz], direction)/np.dot(direction, direction)
        height = depth*(ray(u, top)[1]-axis[1])
        radius = width*depth/(2*focal)
        assert reserved.distance(Point(x, z)) > radius
        # Independent red/NIR observations support vegetation here at area scale.
        cell = observations[:, int((z-BOUNDS[1])/8), int((x-BOUNDS[0])/8)]
        assert np.count_nonzero(cell >= 24) >= 2
        trees.append(dict(x=round(x,2), z=round(z,2), h=round(height,1), r=round(radius,1)))
    return dict(name="田径场北端树带", groups=trees, source=control["photo"],
                article=control["article"], limits=control["limits"])


def source_clips(city_tif):
    """Read just the board from the SinoLC-1 Shandong/Yantai TIFF and current public COGs."""
    model = read("huangbohai-models.json")
    lon, lat = model["originWGS84"]
    x_scale, z_scale = model["xMetresPerLongitudeDegree"], model["zMetresPerLatitudeDegree"]
    w, n, e, s = BOUNDS
    geographic = (lon+w/x_scale, lat-s/z_scale, lon+e/x_scale, lat-n/z_scale)

    def clip(url, metres):
        width, height = round((e-w)/metres), round((s-n)/metres)
        dst = np.zeros((height, width), dtype="float32")
        with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", GDAL_HTTP_TIMEOUT="45"), rasterio.open(url) as src:
            raw = from_bounds(*transform_bounds("EPSG:4326", src.crs, *geographic), src.transform)
            window = Window(math.floor(raw.col_off)-2, math.floor(raw.row_off)-2,
                            math.ceil(raw.width)+5, math.ceil(raw.height)+5)
            reproject(src.read(1, window=window), dst, src_transform=src.window_transform(window), src_crs=src.crs,
                      dst_transform=target_transform(*geographic, width, height), dst_crs="EPSG:4326",
                      src_nodata=src.nodata, dst_nodata=0, resampling=Resampling.nearest)
        return dst

    observations = []
    for url in sorted(model["sources"]["sentinelScenes"]):
        with urlopen(url, timeout=45) as response:
            scene = json.load(response)
        def reflectance(band):
            asset = scene["assets"][band]
            values = clip(asset["href"], 8)
            calibration = asset["raster:bands"][0]
            # Earth Search legacy COG values already account for the processing
            # offset when this flag is true, even if the STAC band lists -.1.
            offset = 0 if scene["properties"]["earthsearch:boa_offset_applied"] else calibration.get("offset", 0)
            return np.where(values != 0, values*calibration["scale"]+offset, np.nan)
        red, nir = reflectance("red"), reflectance("nir")
        quality = clip(scene["assets"]["scl"]["href"], 8)
        valid = (red >= 0) & (nir >= 0) & ((red+nir) > .015) & np.isin(quality, [4, 5, 6])
        ndvi = np.divide(nir-red, nir+red, out=np.zeros_like(nir), where=valid)
        observations.append(np.where(valid, np.rint(np.clip(ndvi, -1, 1)*100), -128).astype("int8"))
    return dict(sino=clip(city_tif, 1).astype("uint8"), annual=clip(ANNUAL_URL, 8).astype("uint8"),
                ndvi=np.stack(observations))


def build():
    obs = np.load(SOURCE)
    # 8 m is the common sampling of these 10 m products. Keep the median
    # reflectance contrast only where two separate clear observations agree.
    dates = obs["ndvi"].astype(float)
    dates[dates == -128] = np.nan
    valid = np.isfinite(dates).sum(axis=0) >= 2
    vegetation = np.sort(np.where(np.isfinite(dates), dates, -128), axis=0)[-2] / 100
    vegetation = at_one_metre(np.where(valid, vegetation, -.5))
    sino, annual = obs["sino"], obs["annual"]
    assert sino.shape == (944, 944) and annual.shape == (118, 118) and dates.shape == (3, 118, 118)
    historic_crop = sino == 5
    historic_green = np.isin(sino, [2, 3, 4, 5])
    recent_crop = at_one_metre(annual == 5) >= .50
    recent_open = at_one_metre(annual == 11) >= .50
    model = read("huangbohai-models.json")
    ground = read("huangbohai-ground.json")
    sports = read("huangbohai-sports.json")
    courts = read("huangbohai-courts.json")
    assert ground["displayBounds"] == BOUNDS
    board = box(*BOUNDS)
    campus = Polygon(model["phase1BoundaryXZ"])
    roofs = unary_union([ring_polygon(p) for b in model["buildings"] for p in b["polygons"]])
    pavement = unary_union([ring_polygon(p) for p in ground["roadSurfaces"]])
    recreation = unary_union([ring_polygon(sports["support"]), *[ring_polygon(p) for p in courts["supports"]]])
    reserved = unary_union([roofs.buffer(.3), pavement.buffer(.4), recreation.buffer(.4)])
    yard_rings = [Polygon(r).difference(reserved) for r in model["courtyardsXZ"]]
    yards = unary_union(yard_rings)
    polygons = []

    def add(style, region, min_area, context):
        region = set_precision(region, .02)
        for i, part in enumerate(sorted(large_parts(region, min_area), key=lambda p:p.bounds)):
            def xy(coords):
                return [[round(x, 2), round(z, 2)] for x, z in coords[:-1]]
            record = dict(id=f"{context}-{style}-{i+1}", style=style, ring=xy(part.exterior.coords),
                          holes=[xy(h.coords) for h in part.interiors])
            polygons.append(record)

    # Campus open courts are independent plan polygons. Mixed Sentinel cells
    # cannot identify a tree, species, individual bed or a measured path.
    yard_green = contours(vegetation >= .235, 20, 1.15)
    for i, yard in enumerate(yard_rings):
        greenery = yard.intersection(yard_green)
        add("courtPlanting", greenery, 12, f"yard-{i+1}")
        add("courtyard", yard.difference(greenery), 12, f"yard-{i+1}")
    # The school guide depicts planted areas at the teaching and sports
    # precincts. Current spectral evidence selects the sustained green portions.
    inside_green = contours(vegetation >= .33, 75, 1.45)
    forecourts = [name for name in (SOUTH_FORECOURT, CULTURE_FORECOURT)
                  if any(a["id"] == name + "-drive" for a in ground["roadAprons"])]
    apron_ids = {a["id"]: a for a in ground["roadAprons"]}
    vegetation_reserve = reserved
    if forecourts:
        # Qualify the original broad vegetation patches before this small,
        # image-mapped junction divides them into narrower roadside pieces.
        mapped_ids = tuple(name + "-" for name in forecourts)
        original_aprons = [a for a in ground["roadAprons"] if not a["id"].startswith(mapped_ids)]
        original_pavement = unary_union([ring_polygon(p) for p in paving(ground["roads"], original_aprons, board)])
        vegetation_reserve = unary_union([roofs.buffer(.3), original_pavement.buffer(.4), recreation.buffer(.4)])
    inner = campus.buffer(-2).difference(unary_union([vegetation_reserve.buffer(2), yards.buffer(.6)]))
    green = inner.intersection(inside_green)
    minimum_patch_area = 70
    if forecourts:
        green = unary_union(large_parts(set_precision(green, .02), minimum_patch_area))
        for name in forecourts:
            drive, kerb = apron_ids[name + "-drive"], apron_ids[name + "-kerb"]
            island = Polygon(kerb["holes"][0]).buffer(-.43)
            green = green.difference(Polygon(drive["ring"]).buffer(2.4)).union(island)
        minimum_patch_area = .25
    add("campusVegetation", green, minimum_patch_area, "campus")
    outside = board.difference(unary_union([campus.buffer(8), reserved.buffer(2)]))
    crop = contours(historic_crop & recent_crop & (vegetation >= .22), 110, 1.15)
    rough = contours(historic_green & recent_open & (vegetation >= .26), 110, 1.35)
    add("cropland", outside.intersection(crop), 100, "outside")
    add("openVegetation", outside.intersection(rough).difference(crop), 100, "outside")

    geometries = {k:unary_union([ring_polygon(p) for p in polygons if p["style"] == k]) for k in STYLES}
    for i, k in enumerate(STYLES):
        assert not geometries[k].is_empty, k
        assert geometries[k].intersection(reserved).area < 3, k
        for other in STYLES[:i]:
            assert geometries[k].intersection(geometries[other]).area < 1
    metrics = {k:dict(patches=sum(p["style"] == k for p in polygons), areaM2=round(geometries[k].area)) for k in STYLES}
    sources = [
        dict(name="SinoLC-1 · Li et al.", licence="CC BY 4.0", url="https://zenodo.org/records/7709370",
             description="烟台市历史土地覆盖分类，原生约1米，EPSG:4326。当地源影像的具体拍摄日期未公布。"),
        dict(name="Impact Observatory, Microsoft & Esri", licence="CC BY 4.0", url="https://livingatlas.arcgis.com/landcoverexplorer/",
             asset=ANNUAL_URL,
             description="2025年1月至12月，Sentinel-2年度土地覆盖，10米，UTM 51N。"),
        dict(name="Copernicus Sentinel-2", licence="Copernicus Sentinel data", scenes=model["sources"]["sentinelScenes"],
             description="2026年10月2、7、14日红光及近红外波段10米。筛除无效和云影像元后，至少两期植被指数达标。"),
        dict(name="一期工程总图（图3-2）", url=model["sources"]["plan"], use="reference"),
        dict(name="烟台科技学院黄渤海校区平面图", url=model["sources"]["guideDiagram"], use="reference"),
    ]
    if SOUTH_FORECOURT in forecourts:
        junction = json.loads((ROOT / "tools/data/huangbohai-south-junction.json").read_bytes())["sources"]
        sources.append(dict(name="黄渤海校区南侧草岛 · WorldView-3", url=junction["orthophotoAtSite"],
                            use="reference", description="2025年4月13日正射影像控制草岛轮廓。道路和路缘尺寸采用影像估算。"))
    local_details = {}
    if CULTURE_FORECOURT in forecourts:
        control = json.loads((ROOT / "tools/data/huangbohai-culture-forecourt.json").read_bytes())
        sources.append(dict(name="文化中心西侧绿岛 · WorldView-3", url=control["sources"]["orthophotoAtSite"],
                            use="reference", description=control["sources"]["limit"]))
        x, z = control["centreXZ"]
        tree = control["tree"]
        local_details["forecourtTrees"] = dict(name="文化中心廊前绿岛树",
            groups=[dict(x=x, z=z, h=tree["h"], r=tree["r"])],
            source=control["sources"]["streetCloseup"], limits=tree["basis"] + "树种未核。")
    return dict(schema=1, bounds=BOUNDS, styles=STYLES, metrics=metrics, sources=sources, **local_details,
                trackTrees=track_trees(reserved, obs["ndvi"]),
                limits="庭院外缘来自总图。院内铺地与种植区分按多期10米观测概化，铺装材质未实测。校外只保留历史分类与2025年度分类、2026年10月观测相符的植被区，边缘受10米数据及配准误差影响。",
                polygons=polygons)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--track-trees-only", action="store_true", help="Update only the north stand planting controls.")
    parser.add_argument("--source-tif", type=Path, help="Refresh source clips from SinoLC-1 Yantai.tif and public COGs; with --check, compare without writing.")
    args = parser.parse_args()
    if args.source_tif:
        clips = source_clips(args.source_tif)
        if args.check:
            with np.load(SOURCE) as saved:
                assert all(np.array_equal(saved[k], v) for k, v in clips.items()), "Stored observation clip differs"
        else:
            np.savez_compressed(SOURCE, **clips)
    data = build()
    if args.track_trees_only:
        saved = read(OUT.name)
        if args.check:
            assert saved["trackTrees"] == data["trackTrees"], "Published track trees are stale"
        elif saved["trackTrees"] != data["trackTrees"]:
            saved["trackTrees"] = data["trackTrees"]
            OUT.write_text(json.dumps(saved, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
        print(json.dumps(data["trackTrees"], ensure_ascii=False))
        raise SystemExit
    data["gatePlanting"] = gate_planting()
    data["fieldSeason"], field_texture = build_field_season(data["polygons"], BOUNDS)
    encoded = json.dumps(data, separators=(",", ":"), ensure_ascii=False).encode()
    if args.check:
        assert OUT.read_bytes() == encoded, "Published land cover is stale"
        assert (DATA / TEXTURE).read_bytes() == field_texture, "Published seasonal field texture is stale"
    else:
        OUT.write_bytes(encoded)
        (DATA / TEXTURE).write_bytes(field_texture)
    print(json.dumps(data["metrics"], ensure_ascii=False))
