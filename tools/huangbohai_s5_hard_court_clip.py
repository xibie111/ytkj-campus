"""Clip generalized campus grass below the observed S5 hard court."""

import argparse
import json
from pathlib import Path

from shapely import set_precision, union_all
from shapely.geometry import Polygon


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "dist/data"
OUT = DATA / "huangbohai-landcover.json"
CONTROL = ROOT / "tools/data/huangbohai-residence-court.json"
S5_STYLES = {"courtLine", "courtSurfaceBlue", "courtSurfaceTeal"}
GRASS = "campusVegetation"
PRECISION = .0000001


def read(path):
    return json.loads(path.read_bytes())


def polygon(record):
    return Polygon(record["ring"], record.get("holes", [])).buffer(0)


def ring(coords):
    return [[round(x, 7), round(z, 7)] for x, z in coords[:-1]]


def clip(land, ground, control):
    outline = Polygon(control["edgeXZ"])
    visible = union_all([polygon(row) for row in ground["roadSurfaces"]
                         if row["style"] in S5_STYLES])
    assert outline.is_valid and outline.difference(visible).area < .001
    mask = outline.intersection(visible)
    result = []
    touched = []
    removed = 0
    for row in land["polygons"]:
        if row["style"] != GRASS:
            result.append(row)
            continue
        grass = polygon(row)
        area = grass.intersection(mask).area
        if area < .00001:
            result.append(row)
            continue
        remainder = set_precision(grass.difference(outline), PRECISION)
        pieces = [remainder] if remainder.geom_type == "Polygon" else list(remainder.geoms)
        pieces = sorted((p for p in pieces if p.geom_type == "Polygon" and not p.is_empty),
                        key=lambda p: (-p.area, p.bounds))
        for index, piece in enumerate(pieces):
            assert piece.intersection(mask).area < .00001
            result.append(dict(row, id=row["id"] if not index else f'{row["id"]}-s5-edge-{index}',
                               ring=ring(piece.exterior.coords), holes=[ring(h.coords) for h in piece.interiors]))
        touched.append(row["id"])
        removed += area
    if touched:
        land["polygons"] = result
        total = [polygon(row) for row in result if row["style"] == GRASS]
        land["metrics"][GRASS] = dict(patches=len(total), areaM2=round(union_all(total).area))
        evidence = control["evidence"]
        land["s5HardCourtClip"] = dict(
            name=evidence["name"], captureDate=evidence["reference"]["captureDate"],
            basis="Use the confirmed S5 hard-court limits to clip the older generalized grass underlay.",
            originalGrassIDs=touched, removedGrassM2=round(removed, 2))
    return removed


def main(check):
    land = read(OUT)
    removed = clip(land, read(DATA / "huangbohai-ground.json"), read(CONTROL))
    if check:
        assert land == read(OUT), "S5 grass still intersects its confirmed hard court"
    elif removed:
        OUT.write_text(json.dumps(land, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"S5: {removed:.2f} square metres of overlapping grass removed this run")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    main(parser.parse_args().check)
