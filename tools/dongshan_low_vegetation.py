"""Rebuild Dongshan's low-vegetation cells from individually dated observations.

The offline input contains two annual class grids, the 90th percentile and
maximum of a canopy-height estimate, and dated Sentinel-2 scene observations.
One bit marks an uncontaminated SCL 4/5 observation, the other SCL 4 with
NDVI > 0.60. The source scene IDs and raster URLs are stored in the NPZ.
"""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage
import shapely


TOOLS = Path(__file__).resolve().parent
DIST = TOOLS.parent / "dist"


def read(name):
    return json.loads((DIST / name).read_bytes())


def geometry(rows):
    return shapely.union_all([
        shapely.Polygon(row["ring"], row.get("holes", [])).buffer(0)
        for row in rows
    ])


def build(obs):
    x, z = np.meshgrid(obs["x"], obs["z"])
    pts = shapely.points(x, z)
    campus = read("campus.json")
    surroundings = read("data/surroundings.json")
    roads = read("data/roads.json")
    buildings = geometry(campus["buildings"] + surroundings["buildings"])
    paved = geometry(roads["polygons"] + campus["courts"])
    safe = (shapely.contains_xy(shapely.Polygon(obs["researchWindowXZ"]), x, z)
            & (shapely.distance(pts, buildings) > 16) & (shapely.distance(pts, paved) > 15)
            & (shapely.distance(pts, geometry(surroundings["water"])) > 20))
    baseline = np.asarray(Image.open(DIST / "cover.png"))[(z + 1600) // 10, (x + 1600) // 10]
    annual = (obs["annual2023"] == 11) & (obs["annual2024"] == 11)
    selected = (safe & (baseline == 10) & ndimage.binary_erosion(annual, np.ones((3, 3), bool))
                & (obs["canopy90dm"] <= 20) & (obs["canopyMaxM"] <= 4))
    dates = obs["summer"]
    clear = np.unpackbits(obs["clear"], axis=0)[:len(dates)]
    vegetated = np.unpackbits(obs["vegetated"], axis=0)[:len(dates)]
    for year, minimum in [("2024", 2), ("2025", 3), ("2026", 4)]:
        days = np.char.startswith(dates, year)
        usable_count = clear[days].sum(axis=0)
        selected &= (usable_count >= minimum) & (vegetated[days].sum(axis=0) >= 0.74 * usable_count)

    components, count = ndimage.label(selected)
    clusters = []
    mask = np.zeros_like(selected)
    for index in range(1, count + 1):
        region = components == index
        cell_count = int(region.sum())
        if cell_count < 4:
            continue
        mask |= region
        clusters.append({"cellCount": cell_count,
                         "centreXZ": [round(float(values[region].mean()), 1) for values in (x, z)]})
    # Convert to int32 before multiplying. An int16 grid would overflow near its centre.
    ids = np.sort(((z[mask].astype("int32") + 1600) // 10) * 320 + (x[mask] + 1600) // 10)
    runs = []
    for index in ids:
        if runs and index == sum(runs[-1]):
            runs[-1][1] += 1
        else:
            runs.append([int(index), 1])
    return {
        "version": 1, "grid": {"size": 320, "minLocalMetres": -1600,
                                "stepMetres": 10, "indexOrder": "rowMajorZThenX"},
        "runs": runs, "fromClass": 10, "toClass": 20,
        "classDescription": "东山校界附近低矮草灌，10米混合像元。草与灌木比例未实测。",
        "clusters": clusters,
        "sourceDates": {"canopyBaseImage": "2018-03-12", "annualCover": [2023, 2024],
                        "calibration": "2024、2025年夏", "heldOut": "2026年夏"},
        "sources": [
            {"name": "High Resolution Canopy Height Maps v2 by WRI and Meta",
             "url": "https://registry.opendata.aws/dataforgood-fb-forestsv2/", "license": "CC BY 4.0"},
            {"name": "10 m Annual Land Use/Land Cover by Impact Observatory, Microsoft and Esri",
             "url": "https://registry.opendata.aws/io-lulc/", "license": "CC BY 4.0"},
            {"name": "Contains modified Copernicus Sentinel data (2024–2026)",
             "url": "https://dataspace.copernicus.eu/terms-and-conditions"}],
        "limits": ("10米像元位置。排除建筑及道路边缘。各格内约1米冠层估计的P90不超过2米，最高不超过4米；"
                   "仅指2018年参考影像的模型估高。2023、2024年两年度产品均为草灌类，2026年夏季光谱独立核对植被持续存在。")
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--observations", type=Path, default=TOOLS / "data/dongshan-vegetation-observations.npz")
    parser.add_argument("--out", type=Path, default=DIST / "data/dongshan-low-vegetation.json")
    args = parser.parse_args()
    with np.load(args.observations, allow_pickle=False) as evidence:
        result = build(evidence)
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
