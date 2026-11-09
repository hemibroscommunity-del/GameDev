#!/usr/bin/env python3
"""v2.3.4357: THE ROTCAP, CUT FROM THE OWNER'S SHEET.

    python3 tools/art/cut_rotcap.py            # into public/sprites/monsters/rotcap/
    python3 tools/art/cut_rotcap.py --preview  # and docs/art/rotcap-strips.png to look at

The owner, 2026-11-09: "Also this for poison land" -- and, asked which of the
Poison Forest's two stand-in monsters it replaces: "Both".

WHAT WAS UPLOADED (assets/monster animations/rotcap/rotcap-sheet.png): one
picture, 2172 x 724, see-through behind, with a name plate down its left side
(x < 240: never cut in):

    five rows of four frames   the mushroom shuffling, one row a side: facing
                               you, side on (right), front-left, from behind,
                               back-right
    a row of twelve            its death: it sags, folds and rots down flat

WHAT IT DOES
  1. finds each frame by the gaps between them in its row (the rows and the
     frames in them are laid out evenly but not on a grid);
  2. hardens the edge (a pixel is there or it is not) and keeps the mushroom
     and nothing loose beside it: the sheet has stray specks, and the name
     plate touches the first frame of the first row;
  3. stands every frame of a row on that row's own ground line, its middle on
     the cell's, at ONE scale for the whole sheet (never per frame: its
     shuffle still rises and sinks, its death still shrinks);
  4. writes three strips of 256 px cells on at most 256 colours
     (tools/art/strip256.mjs): walk.png (20 cells: the five sides in SIDES'
     order, four frames each), death.png (12) and codex-walk.png (the
     front-left row alone, for the codex page).
"""
import os
import subprocess
import sys

import numpy as np
from PIL import Image

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SHEET = os.path.join(REPO, 'assets', 'monster animations', 'rotcap', 'rotcap-sheet.png')
OUT = os.path.join(REPO, 'public', 'sprites', 'monsters', 'rotcap')
TMP = os.path.join(REPO, 'tools', 'art', '.rotcap-tmp')

CELL = 256
GROUND = 232          # the row its base stands on
REST_W = 176          # the facing-you mushroom's width in its cell, px
PLATE_X = 240         # the name plates are left of this
# the five sides, in the order the sheet's rows draw them (rotcapSprites.js SIDES)
SIDES = ['s', 'e', 'sw', 'n', 'ne']
FRAMES = 4
DEATH_FRAMES = 12


def runs(ix, gap):
    out, s, p = [], ix[0], ix[0]
    for c in ix[1:]:
        if c - p > gap:
            out.append((int(s), int(p))); s = c
        p = c
    out.append((int(s), int(p)))
    return out


def biggest(mask):
    """the biggest joined-up piece of a mask (8-way)"""
    left = mask.copy()
    best = None
    while left.any():
        ys, xs = np.nonzero(left)
        part = np.zeros_like(mask)
        part[ys[0], xs[0]] = True
        while True:
            g = part.copy()
            g[1:] |= part[:-1]; g[:-1] |= part[1:]
            g[:, 1:] |= g[:, :-1].copy(); g[:, :-1] |= g[:, 1:].copy()
            g &= mask
            if (g == part).all():
                break
            part = g
        if best is None or part.sum() > best.sum():
            best = part
        left &= ~part
        if best.sum() >= left.sum():
            break
    return best


def main():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(TMP, exist_ok=True)
    sheet = np.array(Image.open(SHEET).convert('RGBA'))
    solid = sheet[..., 3] >= 128
    solid[:, :PLATE_X] = False
    bands = runs(np.where(solid.sum(1) > 2)[0], 6)
    assert len(bands) == len(SIDES) + 1, f'{len(bands)} rows found'
    rows = []
    for (y0, y1) in bands:
        cols = runs(np.where(solid[y0:y1 + 1].sum(0) > 0)[0], 10)
        frames = []
        for (x0, x1) in cols:
            m = biggest(solid[y0:y1 + 1, x0:x1 + 1])
            ys, xs = np.nonzero(m)
            frames.append({'x0': x0, 'y0': y0, 'mask': m, 'box': (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)})
        rows.append(frames)
    assert all(len(r) == FRAMES for r in rows[:-1]) and len(rows[-1]) == DEATH_FRAMES, [len(r) for r in rows]
    first = rows[0][0]['box']
    k = REST_W / float(first[2] - first[0])

    def cell_of(fr, ground_row):
        m = fr['mask']
        h, w = m.shape
        px = sheet[fr['y0']:fr['y0'] + h, fr['x0']:fr['x0'] + w].astype(np.float32).copy()
        px[..., 3] = np.where(m, 255, 0)
        px[..., :3] *= px[..., 3:4] / 255.0
        nw, nh = max(1, round(w * k)), max(1, round(h * k))
        small = np.array(Image.fromarray(px.astype(np.uint8), 'RGBA').resize((nw, nh), Image.LANCZOS)).astype(np.float32)
        al = small[..., 3:4]
        small[..., :3] = np.where(al > 0, small[..., :3] * 255.0 / np.maximum(al, 1), 0)
        small[..., 3] = np.where(small[..., 3] >= 128, 255, 0)
        small[..., :3] *= (small[..., 3:4] > 0)
        b = fr['box']
        cx = (b[0] + b[2]) / 2.0
        cell = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        cell.paste(Image.fromarray(np.clip(small, 0, 255).astype(np.uint8), 'RGBA'),
                   (round(CELL / 2 - cx * k), round(GROUND - (ground_row - fr['y0']) * k)))
        return cell

    def row_cells(frames, ground=None):
        # one ground line a row: the lowest any of its frames reaches
        if ground is None:
            ground = max(f['y0'] + f['box'][3] for f in frames)
        return [cell_of(f, ground) for f in frames]

    walk = []
    for r in rows[:-1]:
        walk += row_cells(r)
    # the death stands where the living one stood: its FIRST frame's base on
    # the ground line (as it folds it spreads a little below it)
    death = row_cells(rows[-1], rows[-1][0]['y0'] + rows[-1][0]['box'][3])
    sw = SIDES.index('sw') * FRAMES
    made = {'walk': walk, 'death': death, 'codex-walk': walk[sw:sw + FRAMES]}
    for name, cells in made.items():
        s = Image.new('RGBA', (CELL * len(cells), CELL), (0, 0, 0, 0))
        for i, c in enumerate(cells):
            s.paste(c, (i * CELL, 0))
        s.save(os.path.join(TMP, name + '.png'))
    subprocess.check_call(['node', os.path.join(REPO, 'tools', 'art', 'strip256.mjs'), TMP, OUT] + sorted(made))
    for name in made:
        os.remove(os.path.join(TMP, name + '.png'))
    os.rmdir(TMP)
    print(f'  scale {k:.3f}; the facing-you frames:', [c.getbbox() for c in walk[:4]])
    if '--preview' in sys.argv:
        rowsn = ['walk', 'death']
        sheet2 = Image.new('RGB', (CELL * 20 // 2, CELL), (46, 52, 64))
        for y, n in enumerate(rowsn):
            s = Image.open(os.path.join(OUT, n + '.png')).convert('RGBA')
            s = s.resize((s.width // 2, CELL // 2), Image.LANCZOS)
            sheet2.paste(s, (0, y * CELL // 2), s)
        p = os.path.join(REPO, 'docs', 'art', 'rotcap-strips.png')
        sheet2.quantize(255, method=Image.MEDIANCUT, dither=Image.NONE).save(p, optimize=True)
        print('  preview:', os.path.relpath(p, REPO))


if __name__ == '__main__':
    main()
