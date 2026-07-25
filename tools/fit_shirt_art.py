#!/usr/bin/env python3
"""v2.3.1480: fit the owner's generated T-SHIRT art onto the hit-react and
mining poses and emit the shirt/tshirt gear sheets.

Why
---
v2.3.1477/1478 gave the hit react and the pickaxe swing their steel plate, but
the SHIRT slot still had no sheet for either pose -- and the shirt is what most
players are actually wearing, so an unarmoured bro still flashed bare-chested
every time he took a hit or swung at an ore node.

Differences from the two armour fitters
---------------------------------------
1.  CELLS BY GEOMETRY, NOT BY BLOB.  The generated grids come back at the exact
    pixel size of the reference grids they were drawn from, so the cell rects
    are recomputed from the same formula tools/dev made them with (see
    CELL/PAD/HEAD/CAP) and the frame order is exact by construction.  The
    armour fitters had to hunt for blobs, which cost a round when connectivity
    amputated every raised arm; there is nothing to hunt for here.

2.  THE TARGET IS THE TRUNK, NOT THE WHOLE BODY.  A tee covers the torso and
    the tops of the arms; matching it against every lit body pixel would drag
    it out over the forearms.  The trunk is isolated by eroding the skin mask
    until the thrown-out arms vanish, keeping the core that MEETS THE TROUSERS
    (on the doubled-over frames the raised arm is the fatter blob, so "largest"
    picks the shoulder), then growing that core back geodesically inside the
    skin so an internal shading line cannot split it.

3.  NO SEAL.  The armour sheets fill whatever the art misses, because a full
    harness must leave no skin showing.  A tee legitimately leaves the
    forearms, hands and belly bare, so there is nothing to seal -- what the art
    draws is what gets drawn.

The sheet ships as the artist's near-white pixels: the runtime multiplies this
layer by the player's chosen shirt colour, so it is a tint base and must stay
bright and lightly shaded.

Run from the repo root:
    python3 tools/fit_shirt_art.py <art-dir>
where <art-dir> holds south.png / southwest.png / east.png / northeast.png /
north.png / mine.png as exported from the generator.
"""
import importlib.util
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

TOOLS = os.path.dirname(os.path.abspath(__file__))


def _load(name):
    spec = importlib.util.spec_from_file_location(
        name, os.path.join(TOOLS, name + '.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_hit = _load('fit_hit_armor_art')
_mine = _load('fit_mine_armor_art')

FW = FH = 128
# the reference-grid layout the art was drawn over (tools/dev grid builder)
PAD, HEAD, CAP = 14, 58, 34
HIT_CELL, HIT_COLS = 256, 3
MINE_CELL, MINE_COLS = 232, 5

OUT = 'public/sprites/gear/shirt/tshirt/{pose}-{dir}.png'


def cells(path, n, cols, cell):
    """Cell rects by the grid's own geometry, checked against the image size."""
    img = Image.open(path).convert('RGB')
    rows = (n + cols - 1) // cols
    exp_h = HEAD + PAD + rows * (cell + CAP + PAD)
    if img.height != exp_h:
        raise SystemExit(f'{path}: height {img.height}, expected {exp_h} — '
                         'the grid was resized, so the cells cannot be trusted')
    a = np.array(img).astype(int)
    out = []
    for i in range(n):
        r, c = divmod(i, cols)
        x = PAD + c * (cell + PAD)
        y = HEAD + PAD + r * (cell + CAP + PAD)
        out.append(a[y:y + cell, x:x + cell])
    return out


def key(cell_rgb):
    """Chroma-key the magenta backdrop, despill, and crop to the shirt.

    The cell border is drawn ON the magenta, so anything touching the cell edge
    is border, not garment -- dropping edge-connected components is what keeps
    a 2px frame line out of the fit."""
    r, g, b = cell_rgb[:, :, 0], cell_rgb[:, :, 1], cell_rgb[:, :, 2]
    mag = (r > 150) & (b > 150) & (r - g > 60) & (b - g > 60)
    keep = ~mag
    lbl, n = ndimage.label(ndimage.binary_closing(keep, np.ones((3, 3), bool)))
    edge = set(lbl[0].tolist()) | set(lbl[-1].tolist()) | \
        set(lbl[:, 0].tolist()) | set(lbl[:, -1].tolist())
    best, area = None, 0
    for k in range(1, n + 1):
        if k in edge:
            continue
        m = lbl == k
        if m.sum() > area:
            best, area = m, int(m.sum())
    if best is None or area < 200:
        return None
    px = cell_rgb[best]
    m2 = np.minimum(px[:, 0], px[:, 2])
    spill = np.clip(m2 - px[:, 1], 0, None)
    px = np.clip(np.stack([px[:, 0] - spill, px[:, 1], px[:, 2] - spill],
                          axis=1), 0, 255)
    out = np.zeros(best.shape + (4,), np.uint8)
    out[best] = np.concatenate([px, np.full((len(px), 1), 255)], axis=1)
    yy, xx = np.nonzero(best)
    return out[yy.min():yy.max() + 1, xx.min():xx.max() + 1]


def trunk_of(skin, pants):
    """The torso: erode away the arms, keep the core that meets the trousers,
    grow it back inside the skin."""
    E = 4
    core = ndimage.binary_erosion(skin, _hit._disk(E))
    lbl, n = ndimage.label(core)
    if not n:
        return skin
    waist = ndimage.binary_dilation(pants, _hit._disk(E + 3))
    best, score = None, None
    for k in range(1, n + 1):
        c = lbl == k
        grown = ndimage.binary_dilation(c, _hit._disk(E))
        s = (int((grown & waist).sum()), int(c.sum()))
        if score is None or s > score:
            best, score = c, s
    return ndimage.binary_dilation(best, np.ones((3, 3), bool),
                                   iterations=E + 4, mask=skin)


SCALES = np.arange(0.15, 0.85, 0.005)   # the tee art is drawn small in its cell; 0.55 clipped the optimum on four of the six sheets


def fit(art, targets):
    """One constant scale for the whole sheet, offsets solved per frame."""
    best = []
    for a, t in zip(art, targets):
        sm = _hit._score_map(t)
        top = (0.0, -1e18)
        for s in SCALES:
            p = _hit._scaled(a, s)
            m = p[:, :, 3] > 0
            if not m.any() or m.shape[0] > FH + 40 or m.shape[1] > FW + 40:
                continue
            _off, sc = _hit._corr_peak(sm, m)
            if sc > top[1]:
                top = (float(s), sc)
        best.append(top[0])
    s = float(np.median(best))
    return s, [_hit._place(a, t, s) for a, t in zip(art, targets)]


def cuts_hit(d):
    """What the tee must never cover on the hit frames: the head."""
    body = np.array(Image.open(f'public/sprites/player/hit-{d}.png')
                    .convert('RGBA'))
    frames = [body[:, i * FW:(i + 1) * FW] for i in range(6)]
    return _hit.head_masks([f[:, :, 3] > 40 for f in frames],
                           [_hit.is_face(f) for f in frames],
                           {fi: b for (dd, fi), b in _hit.HEAD_BOX.items()
                            if dd == d})


def cuts_mine():
    """Head, plus the pickaxe and the ore boulder -- both are baked into the
    body sheet and draw in FRONT of the character, so the tee has to be cut
    back out of them exactly as the plate was (v2.3.1478)."""
    body = np.array(Image.open('public/sprites/player/mine-south.png')
                    .convert('RGBA'))
    frames = [body[:, i * FW:(i + 1) * FW] for i in range(14)]
    cls = [_mine.classify(f) for f in frames]
    heads = _mine.head_masks([sk | lp for sk, lp, _p in cls])
    return [h | prop for h, (_sk, _lp, prop) in zip(heads, cls)]


def targets_hit(d):
    body = np.array(Image.open(f'public/sprites/player/hit-{d}.png')
                    .convert('RGBA'))
    frames = [body[:, i * FW:(i + 1) * FW] for i in range(6)]
    heads = _hit.head_masks([f[:, :, 3] > 40 for f in frames],
                            [_hit.is_face(f) for f in frames],
                            {fi: b for (dd, fi), b in _hit.HEAD_BOX.items()
                             if dd == d})
    out = []
    for f, head in zip(frames, heads):
        r, g, b, a = (f[:, :, k] for k in range(4))
        skin = _hit.clean(_hit.is_skin(r, g, b, a) & ~head)
        pants = _hit.clean(_hit.is_pants(r, g, b, a) & ~head)
        out.append(trunk_of(skin, pants))
    return out


def targets_mine():
    body = np.array(Image.open('public/sprites/player/mine-south.png')
                    .convert('RGBA'))
    frames = [body[:, i * FW:(i + 1) * FW] for i in range(14)]
    cls = [_mine.classify(f) for f in frames]
    heads = _mine.head_masks([sk | lp for sk, lp, _p in cls])
    out = []
    for (skin, legpx, _prop), head in zip(cls, heads):
        r, g, b, a = (frames[0][:, :, k] for k in range(4))  # shape only
        pants = legpx & ~ndimage.binary_dilation(skin, _hit._disk(1))
        out.append(trunk_of(skin & ~head, pants))
    return out


def emit(art, targets, path, cut=None):
    s, placed = fit(art, targets)
    if cut is not None:
        for p, c in zip(placed, cut):
            p[c] = 0
    sheet = np.concatenate(placed, axis=1)
    Image.fromarray(sheet).save(path)
    print(f'wrote {path} {sheet.shape} scale {s:.3f} '
          f'px/frame {[int((p[:, :, 3] > 0).sum()) for p in placed]}')


def main():
    art_dir = sys.argv[1] if len(sys.argv) > 1 else '.'
    for d in ['south', 'southwest', 'east', 'northeast', 'north']:
        p = f'{art_dir}/{d}.png'
        if not os.path.exists(p):
            print('skip (no art yet):', p)
            continue
        art = [key(c) for c in cells(p, 6, HIT_COLS, HIT_CELL)]
        if any(a is None for a in art):
            raise SystemExit(f'{p}: a cell held no garment')
        emit(art, targets_hit(d), OUT.format(pose='hit', dir=d), cuts_hit(d))

    p = f'{art_dir}/mine.png'
    if os.path.exists(p):
        art = [key(c) for c in cells(p, 14, MINE_COLS, MINE_CELL)]
        if any(a is None for a in art):
            raise SystemExit(f'{p}: a cell held no garment')
        emit(art, targets_mine(), OUT.format(pose='mine', dir='south'), cuts_mine())
    else:
        print('skip (no art yet):', p)


if __name__ == '__main__':
    main()
