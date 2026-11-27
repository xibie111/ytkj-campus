"""Apply the image-mapped teaching-road outline to the published campus vegetation.

The surrounding vegetation remains the published layer. The regional land-cover
generator can be updated independently once the small planted margins are mapped.
"""
import argparse
import json
from pathlib import Path

from shapely.geometry import Polygon, box
from shapely.ops import unary_union

from huangbohai_roads import TEACHING_DRIVE, paving


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "dist/data"


def polygon(item):
    return Polygon(item["ring"], item["holes"])


def ring(coords):
    return [[round(x, 7), round(z, 7)] for x, z in list(coords)[:-1]]


def parts(geometry):
    if geometry.geom_type == "Polygon":
        return [geometry] if not geometry.is_empty else []
    return [p for part in geometry.geoms for p in parts(part)]


def main(check):
    cover_path = DATA / "huangbohai-landcover.json"
    cover = json.loads(cover_path.read_bytes())
    ground = json.loads((DATA / "huangbohai-ground.json").read_bytes())
    controls = json.loads((ROOT / "tools/data/huangbohai-central-east-walk.json").read_bytes())
    hedge = Polygon(controls["protectionRing"])
    prefix = TEACHING_DRIVE + "-"
    aprons = [item for item in ground["roadAprons"] if item["kind"] == "drive" and item["id"].startswith(prefix)]
    previous_aprons = [item for item in ground["roadAprons"] if not item["id"].startswith(prefix)]
    previous_surfaces = paving(ground["roads"], previous_aprons, box(*ground["displayBounds"]))
    previous_pavement = unary_union([polygon(item) for item in previous_surfaces])
    new_hardscape = unary_union([polygon(item) for item in ground["roadSurfaces"] if item["style"] in ("drive", "crossing")])
    road_outline = unary_union([polygon(apron) for apron in aprons])
    added_pavement = new_hardscape.intersection(road_outline).difference(previous_pavement)
    assert added_pavement.area > 1 and added_pavement.disjoint(hedge)

    vegetation = "campusVegetation"
    existing = [polygon(p) for p in cover["polygons"] if p["style"] == vegetation]
    original = unary_union(existing)
    kept = []
    for item in cover["polygons"]:
        p = polygon(item)
        if item["style"] != vegetation or p.intersection(added_pavement).area < .000002:
            kept.append(item)
            continue
        edited = sorted(parts(p.difference(added_pavement)), key=lambda part: (-part.area, part.bounds))
        for index, part in enumerate(edited):
            kept.append(dict(item, id=item["id"] if index == 0 else f'{item["id"]}-teaching-drive-{index + 1}',
                             ring=ring(part.exterior.coords), holes=[ring(h.coords) for h in part.interiors]))
    updated = unary_union([polygon(p) for p in kept if p["style"] == vegetation])
    assert all(polygon(p).is_valid for p in kept)
    assert updated.intersection(added_pavement).area < .00001
    assert original.symmetric_difference(updated).difference(added_pavement.buffer(.000002)).area < .00001
    assert original.intersection(hedge).symmetric_difference(updated.intersection(hedge)).area < .000001
    assert len({p["id"] for p in kept}) == len(kept)
    print(json.dumps(dict(clippedVegetationM2=round(original.difference(updated).area, 5),
                          hedgeVegetationM2=round(updated.intersection(hedge).area, 5)),
                     ensure_ascii=False))

    if check:
        assert cover["polygons"] == kept, "Published teaching-road vegetation is stale"
    elif cover["polygons"] != kept:
        cover["polygons"] = kept
        cover["metrics"][vegetation] = dict(patches=sum(p["style"] == vegetation for p in kept),
                                             areaM2=round(updated.area))
        cover["teachingDriveClipping"] = dict(
            roadSource="tools/data/huangbohai-j1-j4-drive.json",
            approachSource="tools/data/huangbohai-j1-j4-south-markings.json",
            protectedPlantingSource="tools/data/huangbohai-central-east-walk.json#protectionRing",
            scope="只按新增车行硬面裁去其覆盖的旧植被，实际种植边缘与标高待测。",
        )
        cover_path.write_text(json.dumps(cover, ensure_ascii=False, separators=(",", ":")), encoding="utf8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    main(parser.parse_args().check)
