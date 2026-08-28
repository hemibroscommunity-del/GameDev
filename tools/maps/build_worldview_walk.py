#!/usr/bin/env python3
"""The World View's town wall, traced from the owner's own line.  (v2.3.2075)

Owner, over a screenshot with a magenta line drawn round the ring: "Use the
pinkish line around the world view rock wall for blocked walkability and make
sure the player doesn't spawn on the line or outside of it."

The line IS the mask.  It is lifted straight out of the annotated image rather
than re-derived from the art, which matters: hue-derived collision is the thing
this repo already tried and the owner already rejected ("the areas you detected
for the map are too unreliable", v2.3.1794).  A hand-drawn boundary classifies
by intent instead of by what a pixel looks like, so there is nothing to tune.

  python3 tools/maps/build_worldview_walk.py            measure, write nothing
  python3 tools/maps/build_worldview_walk.py --write    write the mask
"""
import json
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(REPO, 'assets', 'map-source', 'worldview-v4-wall-drawn.jpg')
OUT = os.path.join(REPO, 'public', 'maps', 'worldview_v4.walk.json')

ZONE_PX = 48 * 32            # the World View is 48x48 tiles
GRID = 192                   # 8 world px per cell
CELL = ZONE_PX / GRID

# THICKEN BY ONE CELL EACH WAY -> a 24 px wall.  Not cosmetic: isSolid tests
# the player's four corners at the CANDIDATE position, and movement is a fixed
# step per frame -- 7.6 px normally and 11.4 px under the Swift Draught
# (v2.3.2062).  A wall thinner than one step can be crossed in a single frame
# with both the old and new corners outside it, which is a wall that stops you
# only when you are walking slowly.
DILATE = 1

# Where the player lands arriving from town.  See report(): it is measured
# against this very mask, so it cannot drift away from the wall it has to sit
# inside.  Mirrors WORLDVIEW_ARRIVAL in src/data/effects.js.
ARRIVAL = (744, 848)
ARRIVAL_CLEARANCE = 48       # px of open ground the arrival must have around it


def line_mask():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # Vivid magenta: bright in red AND blue, with green well below both.  The
    # source is a JPEG, so the stroke has haloes; requiring green to be 50-60
    # below both other channels keeps the halo out without eroding the line.
    mag = (r > 140) & (b > 160) & (g < r - 50) & (g < b - 60)
    h, w = mag.shape
    ys, xs = np.where(mag)
    grid = np.zeros((GRID, GRID), bool)
    gx = np.clip((xs * ZONE_PX / w / CELL).astype(int), 0, GRID - 1)
    gy = np.clip((ys * ZONE_PX / h / CELL).astype(int), 0, GRID - 1)
    grid[gy, gx] = True
    return grid, int(mag.sum()), (w, h)


def dilate(m, n):
    o = m.copy()
    for _ in range(n):
        p = o.copy()
        p[1:, :] |= o[:-1, :]; p[:-1, :] |= o[1:, :]
        p[:, 1:] |= o[:, :-1]; p[:, :-1] |= o[:, 1:]
        o = p
    return o


def flood(blocked, seed):
    free = ~blocked
    seen = np.zeros_like(free)
    if not free[seed]:
        return seen
    q = deque([seed]); seen[seed] = True
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < GRID and 0 <= nx < GRID and free[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    return seen


def build():
    raw, px, size = line_mask()
    wall = dilate(raw, DILATE)
    return raw, wall, px, size


def interior_of(wall):
    """The cells the wall encloses, found by sealing the gate and flooding."""
    iy, ix = np.where(wall)
    sealed = wall.copy()
    sealed[iy.max() - 10:iy.max() + 3, 84:106] = True      # the southern gate
    seed = ((iy.min() + iy.max()) // 2, (ix.min() + ix.max()) // 2)
    return flood(sealed, seed) & ~wall


def report(raw, wall, px, size):
    print(f'source {size[0]}x{size[1]}: {px} magenta pixels drawn')
    print(f'wall: {int(raw.sum())} cells traced -> {int(wall.sum())} after dilating '
          f'{DILATE} ({CELL * (2 * DILATE + 1):.0f} world px thick)')
    iy, ix = np.where(wall)
    interior = interior_of(wall)
    ok = True

    # 1. It has to be a WALL, not a cage: the gate must let you out.
    seed = ((iy.min() + iy.max()) // 2, (ix.min() + ix.max()) // 2)
    out = flood(wall, seed)
    if not out[0, 0]:
        ok = False
        print('FAIL: the ring is sealed — a player inside it could never leave')
    else:
        print(f'OK: the gate is open ({int(interior.sum())} cells enclosed, '
              f'and they reach the rest of the map)')

    # 2. ...and the gate must be the ONLY way through, or the wall is decoration.
    sealed = wall.copy()
    sealed[iy.max() - 10:iy.max() + 3, 84:106] = True
    if flood(sealed, seed)[0, 0]:
        ok = False
        print('FAIL: there is a second opening — the drawn line has a pinhole in it')
    else:
        print('OK: the southern gate is the only way through')

    # 3. The arrival point: inside, off the line, with room around it.  This is
    #    the owner's second sentence, and it is checked against the mask rather
    #    than eyeballed on the picture.
    ax, ay = ARRIVAL
    gx, gy = int(ax / CELL), int(ay / CELL)
    on_wall = bool(wall[gy, gx])
    inside = bool(interior[gy, gx])
    d = min((np.hypot(xx - gx, yy - gy) * CELL
             for yy in range(max(0, gy - 20), min(GRID, gy + 21))
             for xx in range(max(0, gx - 20), min(GRID, gx + 21)) if wall[yy, xx]),
            default=1e9)
    if on_wall or not inside or d < ARRIVAL_CLEARANCE:
        ok = False
        print(f'FAIL: the arrival {ARRIVAL} is '
              + ('ON the wall' if on_wall else ('OUTSIDE the ring' if not inside
                 else f'only {d:.0f}px clear (needs {ARRIVAL_CLEARANCE})')))
    else:
        print(f'OK: the arrival {ARRIVAL} is inside the ring, off the line, '
              f'{d:.0f}px clear of it')
    return ok


if __name__ == '__main__':
    raw, wall, px, size = build()
    ok = report(raw, wall, px, size)
    if '--write' in sys.argv:
        if not ok:
            sys.exit('refusing to write: the wall check failed')
        # grid[ty][tx] TRUE = walkable, which is the inverse of the wall.
        walkable = (~wall).tolist()
        json.dump({'width': GRID, 'height': GRID, 'grid': walkable},
                  open(OUT, 'w'), separators=(',', ':'))
        print(f'wrote {OUT}  ({GRID}x{GRID}, {os.path.getsize(OUT)/1024:.0f} KB)')
    sys.exit(0 if ok else 1)
