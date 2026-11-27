"""Colour only observed seasonal differences inside existing Huang-Bohai field polygons.

The input archive contains four 10 m Sentinel-2 NDVI observations sampled on the
existing 8 m comparison grid and four QA-masked native 30 m Landsat observations.
The 1 m output pixels follow the board's established texture coordinates.
"""
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image
from rasterio.features import rasterize
from rasterio.transform import Affine, from_bounds
from rasterio.warp import reproject, Resampling
from scipy.ndimage import distance_transform_edt, gaussian_filter, label
from shapely.geometry import Polygon


OBSERVATIONS = Path(__file__).parent / "data/huangbohai-field-observations.npz"
TEXTURE = "huangbohai-field-season.webp"
SENTINEL_LICENSE = "https://cds.climate.copernicus.eu/licences/ec-sentinel"
LANDSAT_LICENSE = "https://www.usgs.gov/faqs/are-there-any-restrictions-use-or-redistribution-landsat-data"


def indices(raw, scale, nodata):
    values = raw.astype("float64") / scale
    values[raw == nodata] = np.nan
    return values


def build_field_season(polygons, bounds):
    fields = [p for p in polygons if p["style"] == "cropland"]
    rings = [(Polygon(p["ring"], p["holes"]), i) for i, p in enumerate(fields, 1)]
    w, n, e, s = bounds
    size = (s-n, e-w)
    origin = Affine.translation(w, n)
    parcel = rasterize(rings, size, transform=origin, fill=0, dtype="uint8")
    parcel8 = rasterize(rings, (size[0]//8, size[1]//8), transform=origin*Affine.scale(8), fill=0, dtype="uint8")
    with np.load(OBSERVATIONS) as obs:
        spring, summer, spring_again, summer_again = indices(obs["sentinelNDVI"], 100, -128)
        l_spring, l_spring_again, l_summer, l_summer_again = indices(obs["landsatNDVI"], 1000, -32768)
        lf = l_spring.size
        ids = np.arange(1, lf+1, dtype="int32").reshape(l_spring.shape)
        pixel_id = np.zeros(size, dtype="int32")
        reproject(ids, pixel_id, src_transform=Affine(*obs["landsatAffine"]), src_crs=int(obs["landsatEPSG"]),
                  dst_transform=from_bounds(*obs["boundsWGS84"], size[1], size[0]), dst_crs="EPSG:4326",
                  resampling=Resampling.nearest)
        sentinel_scenes = obs["sentinelScenes"].tolist()
        landsat_scenes = obs["landsatScenes"].tolist()
    assert np.all(pixel_id > 0) and spring.shape == parcel8.shape
    native = pixel_id[4::8, 4::8] - 1
    # The uncovered part of a native edge pixel counts as unknown, never as farmland.
    total = np.maximum(900, np.bincount(pixel_id.ravel(), minlength=lf+1))
    delta = summer-spring
    repeat = summer_again-spring_again
    landsat = (l_summer-l_spring).ravel()[native]
    landsat_again = (l_summer_again-l_spring_again).ravel()[native]
    eligible = (np.maximum(spring, summer) >= .48) & (np.minimum(spring, summer) >= .12)
    rgba = np.zeros((*size, 4), dtype="uint8")
    noted_fields = []
    supported_pixels = set()
    for number, p in enumerate(fields, 1):
        match = parcel8 == number
        fraction = np.bincount(pixel_id[parcel == number], minlength=lf+1) / total
        pure = fraction[native+1] >= 2/3
        for sign, colour in ((1, (91,129,68)), (-1, (178,156,100))):
            paired = match & eligible & (sign*delta >= .22) & (sign*repeat >= .12)
            groups, _ = label(paired)
            counts = np.bincount(groups.ravel())
            paired &= counts[groups] >= 5
            confirmed = paired & pure & (sign*landsat >= .10) & (sign*landsat_again >= .10)
            if not confirmed.any():
                continue
            supported_pixels.update(native[confirmed].tolist())
            weight = np.clip((sign*delta-.18)/.30, 0, 1)*np.clip((sign*repeat-.10)/.23, 0, 1)
            smooth = gaussian_filter(np.where(paired, weight, 0), .65)
            full = np.asarray(Image.fromarray(smooth.astype("float32")).resize((size[1],size[0]), Image.Resampling.BILINEAR))
            footprint = (parcel == number) & confirmed.repeat(8, axis=0).repeat(8, axis=1)
            clipped = footprint & (full >= .125)
            opacity = np.rint(full*175)*np.minimum(1, distance_transform_edt(footprint)/6)
            rgba[clipped, :3] = colour
            rgba[clipped, 3] = np.rint(opacity[clipped]).astype("uint8")
        area = int(((rgba[:, :, 3] >= 32) & (parcel == number)).sum())
        if area:
            noted_fields.append(dict(id=p["id"], colourAreaM2=area))
    assert not rgba[parcel == 0, 3].any()
    rgba[rgba[:, :, 3] == 0, :3] = 0
    encoded = BytesIO()
    Image.fromarray(rgba).save(encoded, format="WEBP", lossless=True)
    metadata = dict(texture="data/"+TEXTURE, boundsXZ=bounds, fields=noted_fields,
                    colourAreaM2=int((rgba[:, :, 3] >= 32).sum()), areaAlphaThreshold=32,
                    supportingLandsatCells=len(supported_pixels), nativeResolutionM=dict(sentinel=10, landsat=30),
                    sentinelScenes=sentinel_scenes, landsatScenes=landsat_scenes,
                    attribution="Contains modified Copernicus Sentinel data (2026). Data available from the U.S. Geological Survey.",
                    licenses=[SENTINEL_LICENSE, LANDSAT_LICENSE],
                    limit="春夏两对Sentinel-2及两对Landsat观测共同支持的相对色差。种植作物种类和田埂位置未实测。")
    return metadata, encoded.getvalue()
