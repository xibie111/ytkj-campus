"""Apply the image-checked details to the Huangbohai northwest entrance lawns."""
import argparse
import json
from pathlib import Path

from shapely.geometry import Polygon
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "dist/data"
CONTROL = ROOT / "tools/data/huangbohai-gate-planting.json"


def read(path):
    return json.loads(path.read_bytes())


def ring(row):
    return Polygon(row["ring"], row.get("holes", []))


def gate_planting():
    control = read(CONTROL)
    patches = [ring(row) for row in control["patches"]]
    ground = read(DATA / "huangbohai-ground.json")
    model = read(DATA / "huangbohai-models.json")
    sports = read(DATA / "huangbohai-sports.json")
    reserved = unary_union([*[ring(road) for road in ground["roadSurfaces"]],
                            *[ring(poly) for b in model["buildings"] for poly in b["polygons"]],
                            ring(sports["support"])])
    assert all(polygon.is_valid and polygon.distance(reserved) > .5 for polygon in patches)
    assert sum(p.area for p in patches) - unary_union(patches).area < .0001
    return control


def main(check):
    path = DATA / "huangbohai-landcover.json"
    land = read(path)
    expected = gate_planting()
    if check:
        assert land.get("gatePlanting") == expected, "Published entrance vegetation is stale"
    elif land.get("gatePlanting") != expected:
        land["gatePlanting"] = expected
        path.write_bytes(json.dumps(land, ensure_ascii=False, separators=(",", ":")).encode("utf8"))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    main(parser.parse_args().check)
