#!/usr/bin/env python3
"""v2.3.4356: THE STORM EYE, CUT FROM THE OWNER'S SHEET.

    python3 tools/art/cut_storm_eye.py            # into public/sprites/monsters/storm-eye/
    python3 tools/art/cut_storm_eye.py --preview  # and docs/art/storm-eye-strips.png to look at

The owner, 2026-11-09: "Also add this electric eyeball monster instead of the
stand-in electric slime. You'll use code to make the electric effects".

WHAT WAS UPLOADED (assets/monster animations/storm-eye/storm-eye-sheet.png):
one picture, 1774 x 887, see-through behind, laid out on a grid of 6 x 3
square cells (295.67 px):

    row 1   the eye from five sides, still: facing you, side on (right),
            front-left, from behind, back-right
    rows 2-3  its death, twelve frames: it cracks, tips over and breaks up

It has no walk, no idle and no attack of its own: it is one still picture a
side, and it FLOATS.  The game hovers it and draws its electricity in code
(src/rendering/stormSparksFx.js; MONSTER_VARIANTS.stormEye).

WHAT IT DOES
  1. cuts the grid's cells (never by the art's own edges: the death's pieces
     must stay where they are from frame to frame);
  2. hardens the edge: the sheet's pixels are 244-253 solid with a faint
     ghost of 1-6 round them -- a pixel is there or it is not;
  3. for the five views keeps the eye and nothing loose beside it; for the
     death drops only specks under SPECK px (its pieces are the picture);
  4. scales each cell to 256 px and writes two strips on at most 256
     colours (tools/art/strip256.mjs): views.png (five cells, in VIEWS'
     order) and death.png (twelve); and codex-idle.png, the front-left view
     alone, for the codex page.
"""
import os
import subprocess
import sys

import numpy as np
from PIL import Image

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SHEET = os.path.join(REPO, 'assets', 'monster animations', 'storm-eye', 'storm-eye-sheet.png')
OUT = os.path.join(REPO, 'public', 'sprites', 'monsters', 'storm-eye')
TMP = os.path.join(REPO, 'tools', 'art', '.storm-eye-tmp')

CELL = 256
COLS, ROWS = 6, 3
# the five views, in the order the sheet draws them (stormEyeSprites.js VIEWS)
VIEWS = ['s', 'e', 'sw', 'n', 'ne']
DEATH_FRAMES = 12
SPECK = 8


def parts_of(mask):
    """the joined-up pieces of a mask (8-way), biggest first"""
    left = mask.copy()
    out = []
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
        out.append(part)
        left &= ~part
    out.sort(key=lambda p: -int(p.sum()))
    return out


def cell_of(sheet, col, row, view):
    w, h = sheet.size
    cw, ch = w / COLS, h / ROWS
    box = (round(col * cw), round(row * ch), round((col + 1) * cw), round((row + 1) * ch))
    a = np.array(sheet.crop(box)).astype(np.float32)
    # premultiplied, so the faint ghost's colour does not bleed into the edge
    a[..., 3] = np.where(a[..., 3] >= 128, 255, 0)
    a[..., :3] *= a[..., 3:4] / 255.0
    small = np.array(Image.fromarray(a.astype(np.uint8), 'RGBA').resize((CELL, CELL), Image.LANCZOS)).astype(np.float32)
    al = small[..., 3:4]
    small[..., :3] = np.where(al > 0, small[..., :3] * 255.0 / np.maximum(al, 1), 0)
    small[..., 3] = np.where(small[..., 3] >= 128, 255, 0)
    small[..., :3] *= (small[..., 3:4] > 0)
    out = np.clip(small, 0, 255).astype(np.uint8)
    mask = out[..., 3] > 0
    if mask.any():
        parts = parts_of(mask)
        keep = parts[0].copy() if view else np.zeros_like(mask)
        if not view:
            for p in parts:
                if p.sum() >= SPECK:
                    keep |= p
        out[~keep] = 0
    return Image.fromarray(out, 'RGBA')


def strip_of(cells):
    s = Image.new('RGBA', (CELL * len(cells), CELL), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        s.paste(c, (i * CELL, 0))
    return s


def main():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(TMP, exist_ok=True)
    sheet = Image.open(SHEET).convert('RGBA')
    views = [cell_of(sheet, i, 0, True) for i in range(len(VIEWS))]
    death = [cell_of(sheet, i % COLS, 1 + i // COLS, False) for i in range(DEATH_FRAMES)]
    # (and the front-left view alone, a strip of one cell: the codex page's
    # stage plays whole strips -- src/data/codexStage.js CODEX_LOOKS.stormEye)
    made = {'views': views, 'death': death, 'codex-idle': [views[VIEWS.index('sw')]]}
    for name, cells in made.items():
        strip_of(cells).save(os.path.join(TMP, name + '.png'))
    subprocess.check_call(['node', os.path.join(REPO, 'tools', 'art', 'strip256.mjs'), TMP, OUT] + sorted(made))
    for name in made:
        os.remove(os.path.join(TMP, name + '.png'))
    os.rmdir(TMP)
    for name, cells in made.items():
        for i, c in enumerate(cells):
            b = c.getbbox()
            print(f'  {name}[{i}]: art {b}')
    if '--preview' in sys.argv:
        sheet2 = Image.new('RGB', (CELL * DEATH_FRAMES // 2, CELL), (46, 52, 64))
        for y, n in enumerate(['views', 'death']):
            s = Image.open(os.path.join(OUT, n + '.png')).convert('RGBA')
            s = s.resize((s.width // 2, CELL // 2), Image.LANCZOS)
            sheet2.paste(s, (0, y * CELL // 2), s)
        p = os.path.join(REPO, 'docs', 'art', 'storm-eye-strips.png')
        sheet2.quantize(255, method=Image.MEDIANCUT, dither=Image.NONE).save(p, optimize=True)
        print('  preview:', os.path.relpath(p, REPO))


if __name__ == '__main__':
    main()
