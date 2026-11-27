"""Reconcile locally observed apron outlines with the published planting layer."""
import argparse
import json
from pathlib import Path

from shapely import set_precision, union_all
from shapely.geometry import Polygon


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "dist/data"
STYLES = ("campusVegetation", "courtPlanting")
PRECISION = .0001
APRONS = (
    ("boya-court-north-paving", "boyaCourtNorthPavingEvidence", "boya-north"),
    ("link-north-gray-paving", "linkNorthGrayPavingEvidence", "link-north-gray"),
)


def read(path):
    return json.loads(path.read_bytes())


def geometry(row):
    return Polygon(row["ring"], row.get("holes", [])).buffer(0)


def coordinates(geometry):
    def ring(points):
        return [[round(x, 4), round(z, 4)] for x, z in list(points.coords)[:-1]]
    return dict(ring=ring(geometry.exterior), holes=[ring(item) for item in geometry.interiors])


def parts(geometry):
    if geometry.geom_type == "Polygon":
        return [geometry] if geometry.area > .003 else []
    return [part for child in getattr(geometry, "geoms", []) for part in parts(child)]


def reconcile(ground, rows, name, evidence, apron_id):
    control = read(ROOT / f"tools/data/huangbohai-{name}.json")
    outline = geometry(control)
    assert ground.get(evidence) == control["evidence"]
    published = next(row for row in ground["roadAprons"] if row["id"] == f"hbh-central-east-walk-{apron_id}")
    assert geometry(published).equals(outline)
    mask = set_precision(outline.buffer(.06), PRECISION)
    changed = []
    removed = 0.0
    result = []
    for row in rows:
        old = geometry(row)
        if row["style"] not in STYLES or old.intersection(mask).area < .0003:
            result.append(row)
            continue
        sections = sorted(parts(set_precision(old, PRECISION).difference(mask)), key=lambda part: -part.area)
        suffix = "boya-north" if apron_id == "boya-north" else "link-north"
        for i, section in enumerate(sections):
            identifier = row["id"] if i == 0 else f'{row["id"]}-{suffix}-split-{i}'
            result.append(dict(row, id=identifier, **coordinates(section)))
        removed += old.area - sum(part.area for part in sections)
        changed.append(row["id"])
    assert sum(geometry(row).intersection(outline).area for row in result) < .0001
    print(json.dumps(dict(apron=apron_id, affectedPatches=changed, pavedOverlapRemovedM2=round(removed, 3)),
                     ensure_ascii=False))
    return result


def main(check):
    ground = read(DATA / "huangbohai-ground.json")
    path = DATA / "huangbohai-landcover.json"
    cover = read(path)
    rows = cover["polygons"]
    for control in APRONS:
        rows = reconcile(ground, rows, *control)
    metrics = dict(cover["metrics"])
    for style in STYLES:
        surfaces = [geometry(row) for row in rows if row["style"] == style]
        metrics[style] = dict(patches=len(surfaces), areaM2=round(union_all(surfaces).area))
    updated = dict(cover, polygons=rows, metrics=metrics)
    if check:
        assert updated == cover, "Published planting differs from the observed apron outlines."
    elif updated != cover:
        path.write_text(json.dumps(updated, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    main(parser.parse_args().check)
