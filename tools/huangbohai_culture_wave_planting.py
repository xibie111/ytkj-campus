"""Trace the two-tone paving beside the Huang-Bohai gym and preserve its lawn island."""
import argparse
import json
from pathlib import Path

from shapely import set_precision
from shapely.geometry import LineString, Polygon
from shapely.ops import unary_union


ROOT = Path(__file__).resolve().parents[1]
CONTROL = ROOT / "tools/data/huangbohai-culture-wave-paving.json"
DATA = ROOT / "dist/data"
WAVE_PREFIX = "hbh-culture-wave-paving-"
STYLES = ("cultureWaveBlue", "cultureWaveLight")
PLANT_STYLES = ("campusVegetation", "courtPlanting")
ISLAND = "culture-wave-south-lawn"


def read(path):
    return json.loads(path.read_bytes())


def polygon(record):
    return Polygon(record["ring"], record.get("holes", []))


def parts(geometry, minimum_area=.005):
    if geometry.geom_type == "Polygon":
        return [geometry] if geometry.area >= minimum_area else []
    return [part for child in geometry.geoms for part in parts(child, minimum_area)]


def outline(geometry):
    def points(ring):
        return [[round(x, 7), round(z, 7)] for x, z in ring.coords[:-1]]
    return {"ring": points(geometry.exterior),
            "holes": [points(ring) for ring in geometry.interiors]}


def realign_culture_walk(roads):
    south = next(road for road in roads if road["id"] == "hbh-gym-south-walk")
    control = read(CONTROL)
    lawn = Polygon(control["southGreen"])
    route = control["southWalk"]
    assert south["ring"][0] == route[0] and south["ring"][-1] == route[-1]
    assert LineString(route).distance(lawn) > south["width"] / 2
    south["ring"] = route


def add_culture_wave(aprons, buildings, board):
    control = read(CONTROL)
    traced = Polygon(control["outline"])
    lawn = Polygon(control["southGreen"])
    stripes = [Polygon(ring) for ring in control["darkBands"]]
    assert traced.is_valid and lawn.is_valid and traced.disjoint(lawn)
    assert all(stripe.is_valid for stripe in stripes)
    assert board.covers(traced) and board.covers(lawn)

    # Keep the building envelope and the nearby ball-court paving independent.
    buildings = unary_union([polygon(part) for building in buildings for part in building["polygons"]])
    ties = unary_union([polygon(apron) for apron in aprons if apron["id"].startswith("hbh-court-west-paving-tie-")])
    surface = set_precision(traced.difference(buildings.buffer(.25)).difference(ties), .001)
    dark = surface.intersection(set_precision(unary_union(stripes), .001))
    assert surface.area > 2500 and dark.area > 900
    for style, area in zip(STYLES, (dark, surface.difference(dark))):
        for i, shape in enumerate(sorted(parts(area), key=lambda item: item.bounds), 1):
            aprons.append(dict(id=f"{WAVE_PREFIX}{style}-{i}", kind=style, **outline(shape)))
    return control["evidence"]


def update_planting(check):
    ground = read(DATA / "huangbohai-ground.json")
    path = DATA / "huangbohai-landcover.json"
    cover = read(path)
    control = read(CONTROL)
    assert ground["cultureWavePavingEvidence"] == control["evidence"]
    hardscape = unary_union([polygon(row) for row in ground["roadSurfaces"]])
    wave = unary_union([polygon(row) for row in ground["roadSurfaces"] if row["style"] in STYLES])
    mask = set_precision(wave.buffer(.06), .0001)
    records = []
    area_removed = 0
    for row in cover["polygons"]:
        if row["id"].startswith(ISLAND):
            continue
        before = polygon(row)
        if row["style"] not in PLANT_STYLES or before.intersection(wave).area < .000003:
            records.append(row)
            continue
        after = sorted(parts(set_precision(before, .0001).difference(mask)), key=lambda part: (-part.area, part.bounds))
        area_removed += before.area - sum(part.area for part in after)
        records.extend(dict(row, id=row["id"] if i == 0 else f'{row["id"]}-culture-wave-{i}',
                            **outline(part)) for i, part in enumerate(after))
    existing = unary_union([polygon(row) for row in records])
    lawn = Polygon(control["southGreen"]).difference(existing.union(hardscape.buffer(.06)))
    new_lawn = sorted(parts(set_precision(lawn, .0001), .02), key=lambda part: part.bounds)
    records.extend(dict(id=f"{ISLAND}-{i}", style="campusVegetation", **outline(part))
                   for i, part in enumerate(new_lawn, 1))
    assert len({row["id"] for row in records}) == len(records)
    assert all(polygon(row).is_valid for row in records)
    assert unary_union([polygon(row) for row in records if row["style"] in PLANT_STYLES]).intersection(wave).area < .0001
    assert sum(part.intersection(hardscape).area for part in new_lawn) < .0001

    metrics = dict(cover["metrics"])
    for style in PLANT_STYLES:
        shapes = [polygon(row) for row in records if row["style"] == style]
        metrics[style] = dict(patches=len(shapes), areaM2=round(unary_union(shapes).area))
    updated = dict(cover, polygons=records, metrics=metrics)
    if check:
        # Other independently surveyed surfaces can append their own rows.
        # Compare the geometry records by ID without moving their display order.
        expected = {row["id"]: row for row in records}
        actual = {row["id"]: row for row in cover["polygons"]}
        assert expected == actual and metrics == cover["metrics"], (
            "Published vegetation differs from the culture-centre paving."
        )
    elif updated != cover:
        path.write_text(json.dumps(updated, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps(dict(trimmedOverlapM2=round(area_removed, 2),
                          visibleLawnRestoredM2=round(sum(part.area for part in new_lawn), 2),
                          pavingM2=round(wave.area, 2))))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    update_planting(parser.parse_args().check)
