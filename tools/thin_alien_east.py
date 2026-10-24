#!/usr/bin/env python3
"""v2.3.3603: THE ALIEN'S EAST EAR, A ONE-PIXEL OUTLINE.

The owner: "The alien species has some problems with the east ear (black
outline too thick and a little jagged)."  The ear species_alien.py draws from
the monkey's is outlined two pixels deep on its east facing (a west facing is
the east one mirrored).  This runs AFTER species_alien.py and
species_frames.py bake: on the east pieces it takes the INNER layer of the
outline -- a dark pixel with no see-through pixel beside it (4 ways) but a
dark one that has -- and paints it the colour of the opaque, not-dark pixel
beside it, so one pixel of outline is left on the outside.  A dark pixel that
stands alone (a single-pixel corner, the inner fold line) is left, which also
clips the jagged stair-steps by one.  Run it again after any re-bake.

    python3 tools/thin_alien_east.py
"""
import glob
import os
import numpy as np
from PIL import Image

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
D = os.path.join(REPO, 'public/sprites/traits/species/alien')
DARK = 60


def thin(path):
    a = np.array(Image.open(path).convert('RGBA'))
    al = a[:, :, 3] > 0
    dark = al & (a[:, :, :3].max(axis=2) < DARK)
    H, W = al.shape
    def nb(m, dy, dx):
        out = np.zeros_like(m)
        ys = slice(max(0, dy), H + min(0, dy)); yd = slice(max(0, -dy), H + min(0, -dy))
        xs = slice(max(0, dx), W + min(0, dx)); xd = slice(max(0, -dx), W + min(0, -dx))
        out[yd, xd] = m[ys, xs]
        return out
    D4 = [(-1, 0), (1, 0), (0, -1), (0, 1)]
    clear = ~al
    edge = dark & np.logical_or.reduce([nb(clear, dy, dx) for dy, dx in D4])
    fill = al & ~dark
    inner = dark & ~edge & np.logical_or.reduce([nb(edge, dy, dx) for dy, dx in D4]) \
        & np.logical_or.reduce([nb(fill, dy, dx) for dy, dx in D4])
    fp = path[:-4] + '.fur.png'   # the skin layer the game recolours: it takes the pixel too
    f = np.array(Image.open(fp).convert('RGBA')) if os.path.exists(fp) else None
    n = 0
    for y, x in zip(*np.nonzero(inner)):
        for dy, dx in D4:
            yy, xx = y + dy, x + dx
            if 0 <= yy < H and 0 <= xx < W and fill[yy, xx]:
                a[y, x] = a[yy, xx]
                if f is not None: f[y, x] = f[yy, xx]
                n += 1
                break
    Image.fromarray(a).save(path)
    if f is not None: Image.fromarray(f).save(fp)
    return n


paths = [os.path.join(D, 'east.png')] + sorted(p for p in glob.glob(os.path.join(D, 'frames', '*-east.png')))
for p in paths:
    print(os.path.relpath(p, REPO), thin(p))
