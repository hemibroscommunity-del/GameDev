#!/usr/bin/env python3
"""v2.3.2064: slice a magenta 4x8 NPC walk sheet into eight direction strips.

Generalised from tools/import_shopkeeper.py, which is kept as the record of
THAT import (its comments carry the reasoning for his row order). Everything
here is the same pipeline with the sheet-specific parts moved to arguments, so
the next walking NPC needs a command line rather than a third copy of a chroma
key that has now been tuned twice.

    python3 tools/import_npc_walk.py <source.png> <out-prefix> [--no-portrait]

WHAT IT DOES, and why each part is not optional:

ONE SHARED BOUNDING BOX across all 32 frames. Cropping each frame to its own
content re-centres the figure on its own silhouette, so a walk cycle jitters
around a fixed point instead of walking. Same reason the fountain's water
needed it (v2.3.2061).

THE FRAME CONVENTION IS THE GAME'S. entityRenderer places every NPC at anchor
(0.5, NPC_FRAME_FEET_Y/256) and derives label headroom from FEET_Y - TOP_Y --
it assumes a 256px frame with the feet on y=223. Emitting to that convention
means a walking NPC needs no renderer special case.

THE KEY IS WIDER THAN "IS IT MAGENTA". These sheets arrive resampled (887x1774,
so cells land on 221.75px) and the key colour is a noisy spread, not #FF00FF.
Worse, where the artist's white grid lines cross the magenta the blend runs
pale pink -- (254,204,255) is a real pixel from this sheet -- which is neither
magenta enough for a ratio test nor white enough for a white test, and survives
as a hairline down the edge of every frame. Stated as "red and blue both high
and green clearly below both" it catches the whole family and cannot catch the
art: the skin is warm (blue is the LOW channel) and the shirt is neutral white.
The cell border is then blanked outright, because the grid lines' anti-aliased
shoulders spread either side of the boundary and widening a colour test until
it swallows them is how a key starts eating the art.
"""
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COLS, ROWS = 4, 8
FRAME = 256
FEET_Y = 223           # must match entityRenderer NPC_FRAME_FEET_Y
TOP_Y = 23             # must match entityRenderer NPC_FRAME_TOP_Y
EDGE_BLANK = 5         # see the module note: the grid lines live on the border

# ── ROW -> DIRECTION, PER SHEET ──
# NOT a constant, and that is the point. The shopkeeper's sheet is standard
# clockwise from south; THIS one is not -- its rows 3 and 5 are swapped, which
# was found by measuring and would never have been found by reading code.
#
# How row 3 was pinned: in the head band it carries 733 skin pixels to the
# RIGHT of the head's centre and 10 to the left (the ear and a sliver of jaw),
# and its head silhouette is twice as close to the EAST profile as to the WEST
# one (6.6 vs 14.3). A row that shows the right side of the face is turned
# away-and-right, which is north-EAST. Rows 4 and 5 are both near-pure back
# views; row 4 is the symmetric one (150 left / 145 right, both ears) so it is
# north, which leaves row 5 as north-west by elimination.
#
# Getting this wrong makes an NPC face the wrong way on the diagonals -- the
# same class of bug as the moonwalk, and just as invisible in review. Pass
# --dirs to override for a sheet that is ordered differently again.
DIRS_CLOCKWISE = ['south', 'southwest', 'west', 'northwest',
                  'north', 'northeast', 'east', 'southeast']
DIRS = ['south', 'southwest', 'west', 'northeast',
        'north', 'northwest', 'east', 'southeast']


def is_key(px):
    r, g, b = px[0], px[1], px[2]
    if r > 232 and g > 232 and b > 232:
        return True                       # the artist's white grid lines
    return r > 150 and b > 150 and g < min(r, b) - 20


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


def key_out(im):
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            px[x, y] = (0, 0, 0, 0) if is_key(p) else despill(p)
    return im


def clear_border(cell, n):
    px = cell.load()
    w, h = cell.size
    for y in range(h):
        for x in range(w):
            if x < n or y < n or x >= w - n or y >= h - n:
                px[x, y] = (0, 0, 0, 0)
    return cell


def main(argv):
    if len(argv) < 3:
        print(__doc__, file=sys.stderr)
        return 2
    src, prefix = argv[1], argv[2]
    want_portrait = '--no-portrait' not in argv
    dirs = DIRS
    if '--dirs' in argv:
        dirs = argv[argv.index('--dirs') + 1].split(',')
        if len(dirs) != ROWS:
            print(f'--dirs needs {ROWS} comma-separated names', file=sys.stderr)
            return 2
    if '--clockwise' in argv:
        dirs = DIRS_CLOCKWISE
    out_dir = os.path.join(ROOT, 'public', 'sprites', 'npc')

    im = key_out(Image.open(src).convert('RGBA'))
    W, H = im.size
    # round(i*W/cols) rather than a fixed width, so the cells tile the sheet
    # exactly instead of accumulating an error across the row.
    xs = [round(i * W / COLS) for i in range(COLS + 1)]
    ys = [round(i * H / ROWS) for i in range(ROWS + 1)]

    cells = [[clear_border(im.crop((xs[c], ys[r], xs[c + 1], ys[r + 1])), EDGE_BLANK)
              for c in range(COLS)] for r in range(ROWS)]

    box = None
    for row in cells:
        for cell in row:
            b = cell.getbbox()
            if not b:
                continue
            box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]),
                                         max(box[2], b[2]), max(box[3], b[3]))
    if box is None:
        print('nothing survived the key -- check is_key()', file=sys.stderr)
        return 1
    bw, bh = box[2] - box[0], box[3] - box[1]
    print(f'shared bbox {box} -> {bw}x{bh} of a {cells[0][0].size} cell')

    os.makedirs(out_dir, exist_ok=True)
    # Fit the figure to the 200px the convention allows between hat and feet,
    # then place it so the feet land exactly on FEET_Y. Height drives the scale
    # (a wide walk frame must not be squashed); width is centred.
    scale = (FEET_Y - TOP_Y) / bh
    tw, th = max(1, round(bw * scale)), max(1, round(bh * scale))
    ox, oy = (FRAME - tw) // 2, FEET_Y - th
    print(f'figure {tw}x{th} at x={ox} y={oy} in a {FRAME}px frame (feet on {FEET_Y})')

    contact = Image.new('RGBA', (FRAME * COLS, FRAME * ROWS), (30, 40, 46, 255))
    strips = []
    for r, row in enumerate(cells):
        strip = Image.new('RGBA', (FRAME * COLS, FRAME), (0, 0, 0, 0))
        for c, cell in enumerate(row):
            fr = cell.crop(box).resize((tw, th), Image.LANCZOS)
            strip.alpha_composite(fr, (c * FRAME + ox, oy))
            contact.alpha_composite(fr, (c * FRAME + ox, r * FRAME + oy))
        strips.append(strip)
        strip.save(os.path.join(out_dir, f'{prefix}-walk-{dirs[r]}.webp'),
                   'WEBP', quality=92, method=6)
    contact.convert('RGB').save(os.path.join(ROOT, 'tools', f'{prefix}-contact.png'))
    print(f'8 strips -> {out_dir}/{prefix}-walk-*.webp')
    print(f'contact sheet -> tools/{prefix}-contact.png (rows top to bottom = {dirs})')

    if want_portrait:
        # ── THE DIALOGUE PORTRAIT, CROPPED FROM HIS OWN SOUTH FRAME ──
        # Same reasoning as Mayor Bro's: a portrait drawn from the same art as
        # the figure cannot drift from the character walking around the street.
        head_src = strips[0].crop((0, 0, FRAME, FRAME))
        hb = head_src.getbbox()
        top, bot = hb[1], hb[3]
        # CENTRED ON THE FACE, not on a fixed fraction of the figure: a band
        # taken from the top is mostly hair on a character with a big mop, and
        # the skin pixels are where the face actually is.
        px = head_src.load()
        sx = sy = n = 0
        for y in range(top, top + int((bot - top) * 0.55)):
            for x in range(hb[0], hb[2]):
                r_, g_, b_, a_ = px[x, y]
                if a_ > 128 and r_ > 150 and 90 < g_ < 200 and b_ < 170 and r_ - b_ > 45:
                    sx += x; sy += y; n += 1
        if n:
            cx, cy = sx / n, sy / n
        else:
            cx, cy = (hb[0] + hb[2]) / 2, top + (bot - top) * 0.22
        half = max(24, int((bot - top) * 0.20))
        bx0, by0 = int(cx - half), int(cy - half)
        head = head_src.crop((bx0, by0, bx0 + half * 2, by0 + half * 2)).resize((96, 96), Image.LANCZOS)
        head.save(os.path.join(out_dir, f'{prefix}-head.webp'), 'WEBP', quality=92, method=6)
        print(f'portrait -> {out_dir}/{prefix}-head.webp (96px, {n} skin px found)')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
