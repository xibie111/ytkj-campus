"""Generate illustrative terrain finishes in metres; WorldCover supplies only the class mask."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter

DIST = Path(__file__).resolve().parents[1] / 'dist'
CLASSES = [10, 30, 40, 50, 60, 80, 90, 20]
SIZE = 256
TILE_METRES = 4


def smooth(field, sigma):
    return gaussian_filter(field, sigma, mode='wrap')


def unit(field):
    return (field - field.mean()) / max(field.std(), 1e-6)


def band(rng, size, sigma):
    return unit(smooth(rng.normal(size=(size, size)).astype('float32'), sigma))


def flecks(rng, count, length, width, slant=None):
    # Wrap each feature crossing the edge, including its blurred shoulders.
    layer = Image.new('L', (SIZE, SIZE))
    draw = ImageDraw.Draw(layer)
    for _ in range(count):
        x, y = rng.uniform(0, SIZE, 2)
        a = rng.uniform(0, np.pi * 2) if slant is None else rng.normal(slant, .27)
        span = rng.uniform(*length)
        dx, dy = span * np.cos(a), span * np.sin(a)
        stroke = int(rng.integers(1, width + 1))
        tone = int(rng.integers(60, 236))
        for ox in (-SIZE, 0, SIZE):
            for oy in (-SIZE, 0, SIZE):
                draw.line((x+ox, y+oy, x+dx+ox, y+dy+oy), fill=tone, width=stroke)
    return smooth(np.asarray(layer, dtype='float32') / 255, .65)


def detail(code):
    rng = np.random.default_rng(2411 + code)
    broad = band(rng, SIZE, 9)
    medium = band(rng, SIZE, 2.1)
    grit = band(rng, SIZE, .62)
    # Heights in metres on a 4 m tile. A separate reflectance term describes
    # dry leaf fragments, loose grains and small depressions under diffuse light.
    if code == 10:
        fragments = flecks(rng, 1150, (2, 8), 4)
        twigs = flecks(rng, 60, (6, 22), 2)
        height = .010*broad + .005*medium + .009*fragments + .016*twigs
        reflect = .23*medium + .55*fragments + .55*twigs
    elif code == 20:
        shrubs = np.maximum(0, .75*broad + .48*medium - .25)
        litter = flecks(rng, 460, (3, 11), 3)
        height = .010*broad + .015*shrubs + .004*grit + .010*litter
        reflect = .21*medium + .34*shrubs + .45*litter - .18*np.maximum(0, -broad)
    elif code == 30:
        blades = flecks(rng, 1400, (2, 8), 2, -.9)
        height = .006*broad + .003*medium + .013*blades
        reflect = .15*medium + .9*blades
    elif code == 40:
        clods = np.maximum(0, medium + .22*grit)
        height = .015*broad + .010*clods + .0025*grit
        reflect = .20*broad + .38*clods
    elif code == 50:
        aggregate = np.maximum(0, grit - .70)
        height = .0035*broad + .0012*medium + .0035*aggregate
        reflect = .32*aggregate + .18*medium
    elif code == 60:
        chips = flecks(rng, 445, (1, 7), 4)
        height = .013*broad + .006*medium + .0025*grit + .015*chips
        reflect = .25*medium + .78*chips
    elif code == 80:
        # Several independent wave packets meeting at shallow angles.
        y, x = np.mgrid[:SIZE, :SIZE] * (2*np.pi/SIZE)
        phase = .65*broad
        height = .005*np.sin(4*x+13*y+phase) + .0022*np.sin(8*x-21*y+.35*phase)
        reflect = .10 * broad
    else:
        silt = band(rng, SIZE, (1.7, 5))
        height = .006*broad + .005*silt + .0012*grit
        reflect = .26*silt + .12*medium
    # With UV increasing northwards, image rows increase in the -V direction.
    slope_x = (np.roll(height, -1, 1) - np.roll(height, 1, 1)) * SIZE / (2*TILE_METRES)
    slope_south = (np.roll(height, -1, 0) - np.roll(height, 1, 0)) * SIZE / (2*TILE_METRES)
    normal = np.stack((-slope_x, slope_south, np.ones_like(height)), axis=-1)
    normal /= np.linalg.norm(normal, axis=-1, keepdims=True)
    encode = lambda a: Image.fromarray(np.uint8(np.clip(a, 0, 255))).convert('RGB')
    plan = 128 + 61*np.clip(reflect-reflect.mean(), -1, 1) + 106*(slope_x + .75*slope_south)
    if code == 80:
        occlusion = np.full_like(height, 255)
    else:
        pits = np.maximum(0, smooth(height, 3)-height)
        occlusion = 252 - np.clip(5200*pits+25*np.maximum(0, -reflect), 0, 65)
    return [encode(normal * 127.5 + 127.5), encode(plan), encode(occlusion)]


def regional_tone():
    # Continuous 2 m illustrative variation, feathered at WorldCover boundaries.
    # Water keeps its source colour. Slopes and field edges are never displaced.
    size = 1600
    rng = np.random.default_rng(3107)
    regional = band(rng, size, 9)
    patch = band(rng, size, 2.5)
    soil = band(rng, size, .75)
    cover = np.array(Image.open(DIST/'cover.png').convert('L'))
    cover[cover == 20] = 30
    variations = {
        10: (8*regional + 8*patch + 6*soil, (1.0, .91, .74)),
        30: (5*regional + 7*patch + 4*soil, (1.03, .88, .56)),
        40: (10*regional + 5*patch + 4*soil, (1.12, .91, .66)),
        50: (3*regional + 3*patch + 3*soil, (.96, .96, .91)),
        60: (7*regional + 7*patch + 7*soil, (1.10, .96, .81)),
        90: (4*regional + 4*patch + 2*soil, (.83, .95, .91)),
    }
    rgb = np.full((size, size, 3), 128, dtype='float32')
    for code, (tone, tint) in variations.items():
        mask = Image.fromarray(np.uint8(cover == code)*255).resize((size, size), Image.Resampling.BILINEAR)
        weight = np.asarray(mask, dtype='float32') / 255
        rgb += (weight * tone)[:, :, None] * np.array(tint, dtype='float32')
    Image.fromarray(np.uint8(np.clip(rgb, 0, 255))).save(DIST/'ground-tone.webp', quality=86, method=6)


if __name__ == '__main__':
    atlas = Image.new('RGB', (SIZE * len(CLASSES), SIZE * 3))
    for i, code in enumerate(CLASSES):
        for row, tile in enumerate(detail(code)):
            atlas.paste(tile, (i * SIZE, row * SIZE))
    atlas.save(DIST/'ground-grain.webp', lossless=True, method=6, exact=True)
    regional_tone()
