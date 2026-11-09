"""v2.3.4358: A MONSTER SHEET OF ROWS, CUT INTO STRIPS.

The owner's monster sheets since the rotcap are one picture each: a name
plate down the left, a row of frames for each side the monster is drawn from,
and a row for its death.  tools/art/cut_rotcap.py and cut_rock_golem.py say
what is where on theirs; this does the cutting, the same way for both:

  1. finds each row, and each frame in it, by the gaps round them (they are
     laid out evenly but not on a grid), left of nothing: the plates are cut
     off at `plate_x` (the walk rows) and `death_plate_x` (the death row);
  2. hardens the edge (a pixel is there or it is not) and keeps each frame's
     biggest joined-up piece: the sheets have stray specks, and a plate can
     touch a frame (a death that breaks up keeps all its pieces but specks:
     `death_pieces`);
  3. stands every frame of a row on that row's own ground line, its middle on
     the cell's, at ONE scale for the whole sheet (never per frame: a shuffle
     still rises and sinks, a death still shrinks).  The death stands where
     the living one stood: its FIRST frame's base is on the ground line;
  4. writes three strips of 256 px cells on at most 256 colours
     (tools/art/strip256.mjs): walk.png (the sides in order, `frames` each),
     death.png and codex-walk.png (the `codex_side` row alone).
"""
import os
import subprocess

import numpy as np
from PIL import Image

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CELL = 256


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


def pieces(mask, least):
    """every joined-up piece of a mask of at least `least` px"""
    left = mask.copy()
    keep = np.zeros_like(mask)
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
        if part.sum() >= least:
            keep |= part
        left &= ~part
    return keep


def cut_sheet(sheet_path, out_dir, sides, frames, death_frames, plate_x, rest_w, ground,
              death_plate_x=None, death_from_y=None, row_gap=6, codex_side='sw', preview=None,
              death_pieces=False):
    """Cut the sheet; returns {'walk': [cells], 'death': [cells], 'scale': k}."""
    tmp = os.path.join(REPO, 'tools', 'art', '.sheet-rows-tmp')
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(tmp, exist_ok=True)
    sheet = np.array(Image.open(sheet_path).convert('RGBA'))
    solid = sheet[..., 3] >= 128
    if death_from_y is None:
        solid[:, :plate_x] = False
    else:
        solid[:death_from_y, :plate_x] = False
        solid[death_from_y:, :(death_plate_x if death_plate_x is not None else plate_x)] = False
    bands = runs(np.where(solid.sum(1) > 2)[0], row_gap)
    assert len(bands) == len(sides) + 1, f'{len(bands)} rows found: {bands}'
    rows = []
    for bi, (y0, y1) in enumerate(bands):
        found = []
        cols = runs(np.where(solid[y0:y1 + 1].sum(0) > 0)[0], 10)
        # (a speck standing alone in a row is not a frame: under a third of
        # the row's usual frame width)
        usual = sorted(x1 - x0 for (x0, x1) in cols)[len(cols) // 2]
        for (x0, x1) in [c for c in cols if c[1] - c[0] >= usual / 3]:
            m = biggest(solid[y0:y1 + 1, x0:x1 + 1])
            if death_pieces and bi == len(bands) - 1:
                # a death that breaks up (`death_pieces`): its pieces ARE the
                # picture -- every one of them but specks under 8 px
                m = pieces(solid[y0:y1 + 1, x0:x1 + 1], 8)
            ys, xs = np.nonzero(m)
            found.append({'x0': x0, 'y0': y0, 'mask': m, 'box': (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)})
        rows.append(found)
    assert all(len(r) == frames for r in rows[:-1]) and len(rows[-1]) == death_frames, [len(r) for r in rows]
    first = rows[0][0]['box']
    k = rest_w / float(first[2] - first[0])

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
                   (round(CELL / 2 - cx * k), round(ground - (ground_row - fr['y0']) * k)))
        return cell

    def row_cells(found, ground_row=None):
        # one ground line a row: the lowest any of its frames reaches
        if ground_row is None:
            ground_row = max(f['y0'] + f['box'][3] for f in found)
        return [cell_of(f, ground_row) for f in found]

    walk = []
    for r in rows[:-1]:
        walk += row_cells(r)
    death = row_cells(rows[-1], rows[-1][0]['y0'] + rows[-1][0]['box'][3])
    at = sides.index(codex_side) * frames
    made = {'walk': walk, 'death': death, 'codex-walk': walk[at:at + frames]}
    for name, cells in made.items():
        s = Image.new('RGBA', (CELL * len(cells), CELL), (0, 0, 0, 0))
        for i, c in enumerate(cells):
            s.paste(c, (i * CELL, 0))
        s.save(os.path.join(tmp, name + '.png'))
    subprocess.check_call(['node', os.path.join(REPO, 'tools', 'art', 'strip256.mjs'), tmp, out_dir] + sorted(made))
    for name in made:
        os.remove(os.path.join(tmp, name + '.png'))
    os.rmdir(tmp)
    print(f'  scale {k:.3f}; the facing-you frames:', [c.getbbox() for c in walk[:frames]])
    if preview:
        wide = max(len(walk), len(death))
        sheet2 = Image.new('RGB', (CELL * wide // 2, CELL), (46, 52, 64))
        for y, n in enumerate(['walk', 'death']):
            s = Image.open(os.path.join(out_dir, n + '.png')).convert('RGBA')
            s = s.resize((s.width // 2, CELL // 2), Image.LANCZOS)
            sheet2.paste(s, (0, y * CELL // 2), s)
        sheet2.quantize(255, method=Image.MEDIANCUT, dither=Image.NONE).save(preview, optimize=True)
        print('  preview:', os.path.relpath(preview, REPO))
    return {'walk': walk, 'death': death, 'scale': k}
