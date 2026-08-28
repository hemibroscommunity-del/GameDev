#!/usr/bin/env python3
"""v2.3.2065: cut the owner's town-dressing sheet into individual props.

The sheet already carries alpha (unlike the magenta NPC/fountain sheets), so
there is no chroma key here -- the whole job is FINDING each sprite and cropping
it to its own bounds. Sprites are laid out in four ragged bands with uneven
gaps, not on a grid, so a fixed cell size would slice several of them in half:
the bands and the columns within them are detected from where opaque pixels
actually are.

Each prop is cropped to its OWN tight box, which is right here and wrong for a
walk cycle -- these are separate objects, not frames of one animation, so there
is nothing to keep aligned between them.

Only the picks below are written. The full sheet is tracked in assets/ so more
can be cut later by adding a line; slicing all 22 up front would put a dozen
unused images in the repo for a layout that uses six.
"""
import os
import sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'prop-source', 'town-props-sheet.png')
OUT = os.path.join(ROOT, 'public', 'sprites', 'props')

# (band, column) -> filename.  Read off the sheet; the contact sheet this
# writes is how you check a pick before wiring it.
PICKS = {
    (0, 0): 'lamp-post',        # plain iron lamp on a stone base
    (1, 0): 'bench',            # wooden bench, iron legs
    (3, 1): 'fence-banner',     # rail carrying the town's purple banner
}


def runs(mask1d, gap, minlen):
    idx = np.where(mask1d)[0]
    if not len(idx):
        return []
    out, s, p = [], idx[0], idx[0]
    for i in idx[1:]:
        if i - p > gap:
            if p - s + 1 >= minlen:
                out.append((s, p))
            s = i
        p = i
    if p - s + 1 >= minlen:
        out.append((s, p))
    return out


def main():
    im = Image.open(SRC).convert('RGBA')
    A = np.asarray(im)[:, :, 3] > 40
    bands = runs(A.any(axis=1), gap=10, minlen=20)
    os.makedirs(OUT, exist_ok=True)
    written = []
    for bi, (y0, y1) in enumerate(bands):
        cols = runs(A[y0:y1 + 1].any(axis=0), gap=10, minlen=16)
        for ci, (x0, x1) in enumerate(cols):
            name = PICKS.get((bi, ci))
            if not name:
                continue
            cell = im.crop((x0, y0, x1 + 1, y1 + 1))
            bb = cell.getbbox()          # tighten vertically within the band
            cell = cell.crop(bb)
            cell.save(os.path.join(OUT, f'{name}.webp'), 'WEBP',
                      lossless=True, quality=100)
            written.append((name, cell.size))
    for n, s in written:
        print(f'  {n:14s} {s[0]}x{s[1]}')
    missing = set(PICKS.values()) - {n for n, _ in written}
    if missing:
        print('MISSING (band/column not found):', missing, file=sys.stderr)
        return 1
    print(f'{len(written)} props -> {OUT}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
