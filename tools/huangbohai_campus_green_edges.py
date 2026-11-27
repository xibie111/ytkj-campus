"""Apply two dated planting-edge observations to the existing Huang-Bohai land cover."""

import argparse
import json
from pathlib import Path

from shapely import set_precision, union_all
from shapely.geometry import Polygon


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "dist/data"
CONTROL = ROOT / "tools/data/huangbohai-campus-green-edges.json"
OUTPUT = DATA / "huangbohai-landcover.json"
PREFIX = "observed-campus-green-edge-"
STYLE = "campusVegetation"
PRECISION = 0.00001


def read(path):
    return json.loads(path.read_bytes())


def shape(record):
    return Polygon(record["ring"], record.get("holes", [])).buffer(0)


def loop(coords):
    return [[round(x, 5), round(z, 5)] for x, z in coords[:-1]]


def polygons(geometry):
    if geometry.geom_type == "Polygon":
        return [geometry]
    return [part for part in geometry.geoms if part.geom_type == "Polygon"]


def update(data, controls, ground, model, sports, courts):
    existing = [p for p in data["polygons"] if not p["id"].startswith(PREFIX)]
    gate = data.get("gatePlanting", {}).get("patches", [])
    campus = Polygon(model["phase1BoundaryXZ"])
    buildings = union_all([shape(p) for b in model["buildings"] for p in b["polygons"]])
    roads = union_all([shape(p) for p in ground["roadSurfaces"]])
    sport = union_all([shape(sports["support"]), *[shape(p) for p in courts["supports"]]])
    protected = union_all([buildings.buffer(.12), roads.buffer(.12), sport.buffer(.12)])
    occupied = union_all([shape(p) for p in existing + gate])
    changed = []
    areas = {}
    for region in controls["regions"]:
        rings = [Polygon(ring) for ring in region["ringsXZ"]]
        assert all(ring.is_valid for ring in rings), region["id"]
        observed = union_all(rings)
        if continuation := region.get("continuationOf"):
            older = next(p for p in existing if p["id"] == continuation and p["style"] == STYLE)
            assert observed.crosses(campus.boundary), region["id"]
            assert observed.intersection(shape(older)).area >= 3, region["id"]
        else:
            assert campus.covers(observed), region["id"]
        candidate = set_precision(observed.difference(protected).difference(occupied), PRECISION)
        parts = sorted([part for part in polygons(candidate) if part.area >= 3], key=lambda part: part.bounds)
        for number, part in enumerate(parts, 1):
            assert part.intersection(protected).area < .0001
            assert part.intersection(occupied).area < .0001
            changed.append(dict(id=f'{PREFIX}{region["id"]}-{number}', style=STYLE,
                                ring=loop(part.exterior.coords), holes=[loop(h.coords) for h in part.interiors]))
        accepted = union_all(parts)
        areas[region["id"]] = round(accepted.area, 2)
        occupied = occupied.union(accepted)
    data["polygons"] = existing + changed
    grass = [shape(p) for p in data["polygons"] if p["style"] == STYLE]
    data["metrics"][STYLE] = dict(patches=len(grass), areaM2=round(union_all(grass).area))
    data["campusGreenEdgesEvidence"] = dict(controls["evidence"], addedAreaM2=areas)
    return areas


def main(check):
    data = read(OUTPUT)
    areas = update(data, read(CONTROL), read(DATA / "huangbohai-ground.json"),
                   read(DATA / "huangbohai-models.json"), read(DATA / "huangbohai-sports.json"),
                   read(DATA / "huangbohai-courts.json"))
    if check:
        published = read(OUTPUT)
        by_id = lambda row: row["id"]
        data["polygons"].sort(key=by_id)
        published["polygons"].sort(key=by_id)
        assert data == published, "Published local green edges are stale"
    else:
        OUTPUT.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(areas))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    main(parser.parse_args().check)
