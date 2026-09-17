#!/usr/bin/env python3
"""v2.3.2618: crop a supplied character portrait to the NPC dialogue chip.

    python3 tools/import_npc_portrait.py <source.png> <out-name> [--square N]

NPC_DATA's `portrait` is a 96px transparent square (see the shipped
shopkeeper-bro-head / lil-bro-head), drawn as a DOM <img> in the quest and
dialogue panels.  This fits owner-supplied portrait art to that contract.

THE BACKGROUND IS KEYED BY FLOOD FILL, AND THE TOLERANCE IS NARROW ON PURPOSE.
The card sharp's portrait arrives on a near-black field, and his art is drawn
with HEAVY PURE-BLACK OUTLINES -- the two are the same colour to the eye and
are not the same number: the field sits at (19,21,24) (max channel 20-22, one
flat 386k-pixel mode) and the outline at 0-2.  So the key takes a narrow,
desaturated band AROUND the field's own value and leaves everything darker
alone, and the fill starts at the border so nothing interior is eaten anyway.
A generous "is it dark" test would have dissolved every outline in the drawing
and left the character as floating colour patches.

THE CROP IS SQUARE AND TAKEN FROM THE TOP of the subject: portrait art is a
bust, the chip is a face.  Height is driven by the subject's WIDTH so the crop
is square without ever being wider than the art -- a bust is taller than it is
broad, and squaring by height would have pulled in background at the sides.
"""
import os
import sys

import numpy as np
import scipy.ndimage as ndi
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = 96
PAD = 0.04


def key_dark_field(img):
    a = np.asarray(img.convert('RGB')).astype(np.float64)
    mx, mn = a.max(axis=2), a.min(axis=2)
    corner = np.concatenate([a[0, :8].reshape(-1, 3), a[-1, :8].reshape(-1, 3),
                             a[:8, 0].reshape(-1, 3), a[:8, -1].reshape(-1, 3)])
    lvl = float(np.median(corner.max(axis=1)))
    field = (mx > lvl - 10) & (mx < lvl + 14) & ((mx - mn) < 14)
    lab, _ = ndi.label(field)
    border = set(lab[0, :]) | set(lab[-1, :]) | set(lab[:, 0]) | set(lab[:, -1])
    border.discard(0)
    bg = np.isin(lab, sorted(border))
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    print(f'field level {lvl:.0f}; keyed {bg.mean():.1%} of the image')
    return np.dstack([a.astype(np.uint8), alpha]), bg


def main(argv):
    if len(argv) < 3:
        print(__doc__, file=sys.stderr)
        return 2
    src, name = argv[1], argv[2]
    size = int(argv[argv.index('--square') + 1]) if '--square' in argv else OUT
    im = Image.open(src)
    rgba, bg = key_dark_field(im)
    keep = ~bg
    ys, xs = np.nonzero(keep)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    w = x1 - x0
    side = int(w * (1 + PAD * 2))
    cx = (x0 + x1) // 2
    bx0 = max(0, cx - side // 2)
    by0 = max(0, int(y0 - w * PAD))
    bx1, by1 = min(rgba.shape[1], bx0 + side), min(rgba.shape[0], by0 + side)
    head = Image.fromarray(rgba[by0:by1, bx0:bx1], 'RGBA').resize((size, size), Image.LANCZOS)
    out_dir = os.path.join(ROOT, 'public', 'sprites', 'npc')
    os.makedirs(out_dir, exist_ok=True)
    head.save(os.path.join(out_dir, f'{name}.webp'), 'WEBP', quality=94, method=6)
    print(f'subject {w}x{y1-y0} -> {side}px square at ({bx0},{by0}) -> '
          f'{size}px public/sprites/npc/{name}.webp')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
