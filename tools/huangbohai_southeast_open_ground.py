"""Apply the observed open-ground center south-east of Huang-Bohai campus."""

import argparse
import json
from pathlib import Path

from shapely import set_precision, union_all
from shapely.geometry import Polygon


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "dist/data"
OUT = DATA / "huangbohai-landcover.json"
CONTROL = ROOT / "tools/data/huangbohai-southeast-open-ground.json"


def read(path):
    return json.loads(path.read_bytes())


def shape(entry):
    return Polygon(entry["ring"], entry.get("holes", [])).buffer(0)


def ring(coordinates):
    return [[round(x, 5), round(z, 5)] for x, z in list(coordinates)[:-1]]


def update(land, control, ground, model):
    source = Polygon(control["ring"])
    assert source.is_valid
    prefix = control["id"] + "-"
    style = control["style"]
    existing = [entry for entry in land["polygons"] if not entry["id"].startswith(prefix)]
    occupied = union_all([shape(entry) for entry in existing])
    new_cover = set_precision(source.difference(occupied), .00001)
    paved = union_all([shape(entry) for entry in ground["roadSurfaces"]])
    buildings = union_all([shape(entry) for b in model["buildings"] for entry in b["polygons"]])
    campus = Polygon(model["phase1BoundaryXZ"])
    assert source.distance(campus) > 10
    assert source.distance(paved) > 10
    assert source.distance(buildings) > 10
    assert new_cover.intersection(occupied).area < .0001
    parts = [new_cover] if new_cover.geom_type == "Polygon" else new_cover.geoms
    parts = sorted((part for part in parts if part.geom_type == "Polygon" and part.area > 1),
                   key=lambda part: part.bounds)
    for number, part in enumerate(parts, 1):
        existing.append(dict(id=f"{prefix}{number}", style=style, ring=ring(part.exterior.coords),
                             holes=[ring(h.coords) for h in part.interiors]))
    new_area = round(sum(part.area for part in parts), 2)
    land["polygons"] = existing
    cover = [shape(entry) for entry in existing if entry["style"] == style]
    land["metrics"][style] = dict(patches=len(cover), areaM2=round(union_all(cover).area))
    land["southeastOpenGroundEvidence"] = dict(control["evidence"], addedAreaM2=new_area)
    return new_area


def main(check):
    output = read(OUT)
    area = update(output, read(CONTROL), read(DATA / "huangbohai-ground.json"),
                  read(DATA / "huangbohai-models.json"))
    if check:
        published = read(OUT)
        by_id = lambda row: row["id"]
        output["polygons"].sort(key=by_id)
        published["polygons"].sort(key=by_id)
        assert output == published, "Published south-east open ground is stale"
    else:
        OUT.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Open-ground extension: {area} square metres")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    main(parser.parse_args().check)
