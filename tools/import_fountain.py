#!/usr/bin/env python3
"""v2.3.2061: slice the owner's magenta fountain sheet into one animation strip.

The sheet is 4x2 cells read LEFT TO RIGHT, TOP ROW FIRST -- eight frames of one
looping fountain, not eight fountains. Output is a single horizontal 8-frame
strip, which is the shape _sliceStrip() in rendering/npcSprites.js already
consumes for the shopkeeper's walk rows; reusing it means the fountain needs no
new loader and rides the existing preload manifest (CLAUDE.md: animation
preloading is LAW).

ONE SHARED BOUNDING BOX across all eight frames, for the same reason the walk
sheet needs one: the water jet is a different height in every frame, so
cropping each frame to its own content would re-centre the whole fountain on
the spray and the stonework would bob up and down while the water animated --
the exact artefact a per-frame bbox produces, and it looks like a physics bug
rather than a cropping bug.

The magenta key is the same idea as import_shopkeeper.py and needs the same
despill: this sheet arrives resampled (1774x887, so cells land on 443.5px) and
the key colour is a noisy spread around (245,5,247) rather than a clean
#FF00FF, which leaves a magenta rim on every outline if you threshold and stop.
It also carries WHITE GRID LINES between the cells, which the key alone keeps --
they are removed explicitly, because a stray white seam down the edge of a
frame reads as a rendering artefact in-game.
"""
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'prop-source', 'fountain-sheet.png')
OUT = os.path.join(ROOT, 'public', 'sprites', 'props', 'fountain.webp')
COLS, ROWS = 4, 2
FRAMES = COLS * ROWS


def is_magenta(px):
    """Magenta, or any blend of it. The key colour is a noisy spread rather
    than a clean #FF00FF, and where the artist's white grid lines cross it the
    blend runs pale pink -- (254,178,255) is a real pixel from this sheet, and
    it is neither magenta enough for a ratio test nor white enough for the grid
    test, which is how a hairline of pink survived the first pass down the edge
    of every frame. Stated as "red and blue both high and green clearly below
    both" it catches the whole family, and it cannot catch the art: the
    stonework is warm (blue is the LOW channel) and the water is blue-white
    (green is high)."""
    r, g, b = px[0], px[1], px[2]
    return r > 150 and b > 150 and g < min(r, b) - 20


def is_gridline(px):
    """The white rules the artist left between cells. Tested BEFORE the key
    because white is not magenta and would otherwise survive as a bright seam
    along a frame edge."""
    r, g, b = px[0], px[1], px[2]
    return r > 232 and g > 232 and b > 232


def despill(px):
    """Pull the magenta cast out of a kept pixel: clamp red and blue toward
    green, which is what the key left behind on every anti-aliased edge."""
    r, g, b = px[0], px[1], px[2]
    if r > g and b > g:
        cast = min(r, b) - g
        if cast > 0:
            k = min(1.0, cast / 90.0)
            r = int(r - cast * 0.85 * k)
            b = int(b - cast * 0.85 * k)
    return (max(0, r), g, max(0, b), px[3])


# The grid lines sit ON the cell boundaries, and their anti-aliased shoulders
# spread a pixel or two either side. Rather than keep widening a colour test
# until it swallows them -- which is how a key starts eating the art -- the
# border is blanked outright. It is safe by measurement, not by hope: the
# drawn fountain occupies x 53..389 and y 64..393 inside a 444px cell, so the
# nearest art is more than fifty pixels from any edge this touches. Without it
# ONE frame of the eight kept a stray pixel at its corner, which -- because the
# crop box is shared across all eight -- would have shifted every frame.
EDGE_BLANK = 6


def _clear_border(cell, n):
    px = cell.load()
    w, h = cell.size
    for y in range(h):
        for x in range(w):
            if x < n or y < n or x >= w - n or y >= h - n:
                px[x, y] = (0, 0, 0, 0)
    return cell


def key_out(im):
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            if is_magenta(p) or is_gridline(p):
                px[x, y] = (0, 0, 0, 0)
            else:
                px[x, y] = despill(p)
    return im


def main():
    im = Image.open(SRC).convert('RGBA')
    im = key_out(im)
    W, H = im.size
    # round(i*W/cols) rather than a fixed cell width, so the columns tile the
    # sheet exactly instead of accumulating a 0.5px error across four frames.
    xs = [round(i * W / COLS) for i in range(COLS + 1)]
    ys = [round(i * H / ROWS) for i in range(ROWS + 1)]

    cells = []
    for r in range(ROWS):
        for c in range(COLS):
            cell = im.crop((xs[c], ys[r], xs[c + 1], ys[r + 1]))
            cells.append(_clear_border(cell, EDGE_BLANK))

    box = None
    for cell in cells:
        b = cell.getbbox()
        if not b:
            continue
        box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]),
                                     max(box[2], b[2]), max(box[3], b[3]))
    if box is None:
        print('nothing survived the key -- check is_magenta()', file=sys.stderr)
        return 1
    bw, bh = box[2] - box[0], box[3] - box[1]
    print(f'shared bbox {box} -> {bw}x{bh} of a {cells[0].size} cell')

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    strip = Image.new('RGBA', (bw * FRAMES, bh), (0, 0, 0, 0))
    for i, cell in enumerate(cells):
        strip.alpha_composite(cell.crop(box), (i * bw, 0))
    # LOSSY q90, measured rather than assumed. Lossless came out at 936KB for
    # one prop -- twice the biggest building in this folder, on the STARTUP
    # gate, for a thing 170 world px tall. At q90 it is 227KB and the damage
    # is: zero alpha leak (all 356,013 fully-transparent pixels stay fully
    # transparent, so no magenta-era halo comes back through the encoder) and
    # a mean RGB error of 3.6/255 on opaque pixels, which is under a level of
    # the palette's own banding.
    strip.save(OUT, 'WEBP', quality=90, method=6)
    print(f'{FRAMES} frames -> {OUT}  ({strip.width}x{strip.height}, '
          f'frame {bw}x{bh}, aspect {bw / bh:.3f})')

    # A contact sheet so the frame ORDER can be read off the art rather than
    # trusted -- a fountain whose water plays backwards is a thing you only
    # notice in motion.
    contact = Image.new('RGB', (bw * FRAMES, bh), (30, 40, 46))
    contact.paste(strip, (0, 0), strip)
    contact.save(os.path.join(ROOT, 'tools', 'fountain-contact.png'))
    print('contact sheet -> tools/fountain-contact.png')
    return 0


if __name__ == '__main__':
    sys.exit(main())
