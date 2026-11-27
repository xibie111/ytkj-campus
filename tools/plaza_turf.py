"""Make the non-repeating, illustrative short turf used in the plaza's local UVs."""
from pathlib import Path

import numpy as np
from PIL import Image


def make_turf():
    rng = np.random.default_rng(379126)
    # Rectangular atlas spans 104 x 134 metres in gate-local coordinates.
    width, height = 1248, 1608

    def field(columns, rows):
        samples = rng.standard_normal((rows, columns)).astype('float32')
        image = Image.fromarray(samples).resize((width, height), Image.Resampling.BICUBIC)
        return np.asarray(image)

    broad = field(12, 15)
    clumps = field(150, 190)
    dry = np.clip((.7 * field(25, 33) + .3 * clumps - .4) / 2, 0, 1)
    # Several orientations of short clippings break up the grain at close range.
    fibres = rng.standard_normal((height, width)).astype('float32')
    fibres = .63 * fibres + .25 * np.roll(fibres, (1, -1), (0, 1)) + .12 * np.roll(fibres, 1, axis=0)
    tone = 5.8 * broad + 5.0 * clumps + 12.0 * fibres
    rgb = np.empty((height, width, 3), dtype='uint8')
    for channel, (base, light, straw, island) in enumerate([
        (145, .96, 17, -11), (165, .88, 6, -7), (111, .70, 9, -10)
    ]):
        values = base + light * tone + dry * straw
        values[:240] += island
        rgb[:, :, channel] = np.clip(values, 0, 255)
    return Image.fromarray(rgb)


if __name__ == '__main__':
    dest = Path(__file__).resolve().parents[1] / 'dist' / 'plaza-turf.jpg'
    make_turf().save(dest, quality=90, subsampling=0, optimize=True)
