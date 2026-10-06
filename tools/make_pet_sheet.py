#!/usr/bin/env python3
"""v2.3.3111: THE PET SHEET -- every pet's small walking frames, on one picture.

Plan: docs/PET-TRAPPING-PLAN.md, "Art and memory".  A pet is the monster it was
caught from, tamed and drawn small.  It goes everywhere you go, so it cannot
wear the monster's own art (a fire goblin's full look is 30-35 MB decoded, a
mummy's 36 MB); it wears this: a few frames of each monster's FRONT and SIDE
walk, cropped to the art and shrunk into 64 px cells (2 px per game px, the
Wheel's HD rule, so a pet stands at most 32 game px -- half the bro), one row
per base look, every cell's art standing on the middle of its bottom edge.

Only the blue slime's colour is baked: it is a luminance RETINT
(src/rendering/monsterRecolor.js retintToCanvas, done the same way here),
which a multiplying tint cannot reach.  Every other colour -- the Poison
Forest's violet slime and murky fishman, the second stage's recolours, the
golden look -- is a sprite tint at draw time, as the Wheel's stage looks are
(src/data/wheelStageLooks.js), so it costs no memory.

Run from the repo root (needs Pillow):
    python3 tools/make_pet_sheet.py
Writes public/sprites/pets/pet-sheet.png and src/data/petSheet.js (GENERATED,
the cells' layout).  Re-run when a monster's walk art changes.
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MON = os.path.join(ROOT, 'public', 'sprites', 'monsters')
OUT_PNG = os.path.join(ROOT, 'public', 'sprites', 'pets', 'pet-sheet.png')
OUT_JS = os.path.join(ROOT, 'src', 'data', 'petSheet.js')

CELL = 64          # px a side; 2 px a game px
FRAMES = 6         # at most this many frames a direction, evenly spaced
PAD = 2            # px left clear round the art in its cell

# base -> its front strip and frame size, its side strip (None: the front
# again) and frame size, which way the side strip faces, a recolour [r,g,b] or
# None, and which frames to take (None: FRAMES spread evenly over the strip).
# The slime's 24-frame idle is three bounces of eight (measured: its height
# peaks at frames 2, 12 and 21), so a pet takes one whole bounce, 0-7, where
# evenly spaced frames would jump between tall and flat.
SLIME_BOUNCE = list(range(8))
BASES = [
    dict(name='snowman', front='snowman/snowman-s.png', ffw=128, side='snowman/snowman-e.png', sfw=128, faces='e'),
    dict(name='fireGoblin', front='fire-goblin/walk-s.png', ffw=256, side='fire-goblin/walk-e.png', sfw=256, faces='e'),
    dict(name='mummy', front='mummy/walk-s.png', ffw=256, side='mummy/walk-w.png', sfw=256, faces='w'),
    dict(name='rockmonster', front='rockmonster/walk-south.png', ffw=256, side='rockmonster/walk-west.png', sfw=256, faces='w'),
    dict(name='fishman', front='fishman/walk-south.png', ffw=256, side='fishman/walk-west.png', sfw=256, faces='w'),
    dict(name='slime', front='slime-idle-v5.png', ffw=128, side=None, sfw=128, faces=None, pick=SLIME_BOUNCE),
    dict(name='blueSlime', front='slime-idle-v5.png', ffw=128, side=None, sfw=128, faces=None, pick=SLIME_BOUNCE, recolor=(58, 122, 208)),
]


def load_rgba(rel):
    im = Image.open(os.path.join(MON, rel))
    return im.convert('RGBA')


def frames_of(strip, fw, n_want, pick=None):
    n = max(1, strip.width // fw)
    if pick:
        idx = [i for i in pick if i < n]
    elif n <= n_want:
        idx = list(range(n))
    else:
        idx = [round(i * n / n_want) % n for i in range(n_want)]
    return [strip.crop((i * fw, 0, i * fw + fw, min(strip.height, fw))) for i in idx]


def retint(frames, rgb):
    """monsterRecolor.js retintToCanvas: every opaque pixel becomes the target
    colour scaled by its luminance over the set's mean opaque luminance x1.15
    -- one reference for all the frames, so the colour cannot drift."""
    total, count = 0.0, 0
    for f in frames:
        for r, g, b, a in (f.get_flattened_data() if hasattr(f, 'get_flattened_data') else f.getdata()):
            if a > 30:
                total += 0.299 * r + 0.587 * g + 0.114 * b
                count += 1
    ref = max(1.0, (total / count) * 1.15 if count else 255.0)
    out = []
    for f in frames:
        px = []
        for r, g, b, a in (f.get_flattened_data() if hasattr(f, 'get_flattened_data') else f.getdata()):
            if a > 30:
                k = (0.299 * r + 0.587 * g + 0.114 * b) / ref
                px.append((min(255, round(rgb[0] * k)), min(255, round(rgb[1] * k)), min(255, round(rgb[2] * k)), a))
            else:
                px.append((r, g, b, a))
        g2 = Image.new('RGBA', f.size)
        g2.putdata(px)
        out.append(g2)
    return out


def union_box(frames):
    box = None
    for f in frames:
        b = f.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
        if not b:
            continue
        box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    return box


def place(frames, box, scale):
    """Each frame's art box shrunk by `scale`, standing on the middle of the
    cell's bottom edge."""
    cells = []
    for f in frames:
        art = f.crop(box)
        w = max(1, round(art.width * scale))
        h = max(1, round(art.height * scale))
        art = art.resize((w, h), Image.LANCZOS)
        cell = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        cell.paste(art, ((CELL - w) // 2, CELL - PAD - h), art)
        cells.append(cell)
    return cells


def main():
    rows = []
    meta = {}
    for b in BASES:
        name, faces, recolor = b['name'], b['faces'], b.get('recolor')
        front = frames_of(load_rgba(b['front']), b['ffw'], FRAMES, b.get('pick'))
        side = frames_of(load_rgba(b['side']), b['sfw'], FRAMES, b.get('pick')) if b['side'] else []
        if recolor:
            both = retint(front + side, recolor)
            front, side = both[:len(front)], both[len(front):]
        fb = union_box(front)
        sb = union_box(side) if side else None
        # one scale for both directions, so a pet does not change size as it turns
        big = max(fb[2] - fb[0], fb[3] - fb[1], *(([sb[2] - sb[0], sb[3] - sb[1]]) if sb else []))
        scale = (CELL - 2 * PAD) / float(big)
        cells_f = place(front, fb, scale)
        cells_s = place(side, sb, scale) if side else []
        rows.append(cells_f + cells_s)
        meta[name] = {
            'row': len(rows) - 1,
            'front': len(cells_f),
            'side': len(cells_s),
            'sideFaces': faces,
            # the art's height in the cell, game px (half a cell px): the pet's
            # name and shadow are placed off it
            'h': round(max(fb[3] - fb[1], (sb[3] - sb[1]) if sb else 0) * scale / 2, 1),
            'w': round(max(fb[2] - fb[0], (sb[2] - sb[0]) if sb else 0) * scale / 2, 1),
        }
    cols = max(len(r) for r in rows)
    sheet = Image.new('RGBA', (cols * CELL, len(rows) * CELL), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            sheet.paste(c, (x * CELL, y * CELL))
    os.makedirs(os.path.dirname(OUT_PNG), exist_ok=True)
    sheet.save(OUT_PNG, optimize=True)
    size = os.path.getsize(OUT_PNG)
    js = (
        "/* GENERATED by tools/make_pet_sheet.py -- do not edit by hand.\n"
        " * v2.3.3111: the pet sheet's layout (docs/PET-TRAPPING-PLAN.md, \"Art and\n"
        " * memory\").  One row per base look: `front` frames of its front walk, then\n"
        " * `side` frames of its side walk (facing `sideFaces`); every cell CELL px a\n"
        " * side, 2 px a game px, its art standing on the middle of the bottom edge.\n"
        " * `w`/`h`: the art's size in game px. */\n"
        "export const PET_SHEET = Object.freeze(" + json.dumps({
            'url': '/sprites/pets/pet-sheet.png',
            'cell': CELL,
            'cols': cols,
            'rows': len(rows),
            'bytes': size,
            'decodedBytes': cols * CELL * len(rows) * CELL * 4,
            'bases': meta,
        }, indent=2) + ");\n"
    )
    with open(OUT_JS, 'w') as fh:
        fh.write(js)
    print('pet sheet: %dx%d, %d KB on disk, %.2f MB decoded' % (cols * CELL, len(rows) * CELL, size // 1024, cols * CELL * len(rows) * CELL * 4 / 1048576.0))
    for k, v in meta.items():
        print('  %-12s front %d side %d faces %s  %sx%s game px' % (k, v['front'], v['side'], v['sideFaces'], v['w'], v['h']))


if __name__ == '__main__':
    sys.exit(main())
