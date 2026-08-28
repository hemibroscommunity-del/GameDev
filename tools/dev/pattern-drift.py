#!/usr/bin/env python3
"""How far the figure moves INSIDE its own frame, pose by pose.

Owner: "Check tattoo and pattern placements on all animations for
consistency."

A TATTOO is fitted to the body every frame -- stampRegion measures the region
and gridFit centres the drawing in it -- so it rides the character wherever
the animation puts him.  A garment PATTERN is not fitted at all.
stampPattern (src/rendering/playerDecal.js) phases its tile on the frame's own
coordinates:

    const fx = x % frameW;                    // horizontal: per frame
    const ty = floor(((y % th) + th) % th / cell);   // vertical: per sheet

so the tile is nailed to the cel while the figure moves through it.  Whatever
distance the figure travels inside its frame between two frames is exactly how
far the stripes slide across the fabric.

The shipped tiles repeat every 12-16px in 256-space (traits/patternCatalog.js:
stripe-v is 4 cells at cell 3 = 12px, chevron 8 at cell 2 = 16px), so a drift
of 12px is one whole repeat -- every stripe standing where its neighbour was.

    python3 tools/dev/pattern-drift.py

`dxLeft`/`dyTop` are the spread of the figure's own bounding box across the
frames of the sheet, in 256-space pixels.  They are the number that matters:
the tile's phase is fixed, so the fabric under it moves by this much.
`dxCtr`/`dyCtr` are the centre's spread, reported alongside because a swinging
arm moves an edge without moving the body.
"""
from PIL import Image
import glob
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
POSES = ('stand', 'jog', 'hit', 'attack', 'bow', 'sword', 'dodge', 'fish')
TILE_MIN = 12      # stripe-v / check / dots / grid / diag: 4 cells at cell 3
TILE_MAX = 16      # chevron / camo / diamond: 8 cells at cell 2

rows = []
for path in sorted(glob.glob(os.path.join(ROOT, 'public', 'sprites', 'player', '*.png'))):
    name = os.path.basename(path)[:-4]
    parts = name.split('-')
    if len(parts) != 2 or parts[0] not in POSES:
        continue
    im = Image.open(path).convert('RGBA')
    W, H = im.size
    frames = max(1, W // H)
    if frames < 2:
        continue
    a = im.getchannel('A').load()
    lefts, tops, cxs, cys = [], [], [], []
    for f in range(frames):
        x0 = f * H
        xs = [x - x0 for x in range(x0, x0 + H) for y in range(H) if a[x, y] > 24]
        ys = [y for y in range(H) for x in range(x0, x0 + H) if a[x, y] > 24]
        if not xs:
            continue
        lefts.append(min(xs)); tops.append(min(ys))
        cxs.append((min(xs) + max(xs)) / 2); cys.append((min(ys) + max(ys)) / 2)
    if len(lefts) < 2:
        continue
    sp = lambda v: max(v) - min(v)
    rows.append((name, frames, sp(lefts), sp(tops), sp(cxs), sp(cys)))

rows.sort(key=lambda r: -max(r[2], r[3]))
print('%-22s %7s %8s %8s %8s %8s  %s' %
      ('sheet', 'frames', 'dxLeft', 'dyTop', 'dxCtr', 'dyCtr', 'tile repeats slid'))
for name, n, dx, dy, cx, cy in rows:
    worst = max(dx, dy)
    print('%-22s %7d %8d %8d %8.1f %8.1f  %.1f-%.1f' %
          (name, n, dx, dy, cx, cy, worst / TILE_MAX, worst / TILE_MIN))
print()
print('A garment pattern slides by dxLeft/dyTop across the fabric over the cycle,')
print('against a tile that repeats every %d-%dpx.  Anything at or over 1.0 repeat' % (TILE_MIN, TILE_MAX))
print('has moved every stripe into where its neighbour was.')
