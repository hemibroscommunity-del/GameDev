#!/usr/bin/env python3
"""The World View's walkability, traced from the owner's own line.  (v2.3.2076)

Owner, over a screenshot of the overworld with magenta drawn across it:
"Actually just use this for walkability. Can't walk through pinkish lines."

An earlier pass (v2.3.2075) took the same treatment applied to the town ring
alone; this drawing is the whole playable boundary -- the mountain feet, the
volcano's skirt, the canyon rim, the cave mouth, the dead wood, the shore --
and it supersedes it. Ten times the ink (74,901 magenta pixels against 7,015)
and the same rule: the line is where you stop.

THE OWNER'S LINE IS THE MASK. It is lifted straight out of the annotated image
rather than derived from the art by hue -- the approach this repo already tried
and the owner already rejected ("the areas you detected for the map are too
unreliable", v2.3.1794). A hand-drawn boundary classifies by intent, so there
is nothing to tune and nothing to re-tune when the art changes.

  python3 tools/maps/build_worldview_walk.py            measure, write nothing
  python3 tools/maps/build_worldview_walk.py --write    write the mask
"""
import json
import os
import subprocess
import sys
from collections import deque

import numpy as np
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(REPO, 'assets', 'map-source', 'worldview-v4-walk-drawn.jpg')
OUT = os.path.join(REPO, 'public', 'maps', 'worldview_v4.walk.json')

ZONE_PX = 48 * 32            # the World View is 48x48 tiles
GRID = 192                   # 8 world px per cell
CELL = ZONE_PX / GRID

# THICKEN BY ONE CELL EACH WAY -> a 24 px band, and both halves of that number
# are load-bearing.
#
# The floor is TUNNELLING. isSolid tests the player's four corners at the
# CANDIDATE position, and movement is a fixed step per frame -- 7.6 px normally
# and 11.4 px under the Swift Draught (v2.3.2062). A band thinner than a step
# can be crossed in one frame with the old and new corners both outside it: a
# wall that stops you only when you are walking slowly.
#
# The ceiling is the drawing itself. A hand-drawn stroke has thin places, and
# the flood test below shows exactly where that matters: at an 18 px band the
# walkable region LEAKS through a gap into the sky and the snow peaks and 61%
# of the map opens up; at 24 px it is sealed and the playable area is the 35%
# the owner outlined. That is not a tuned number, it is a threshold with a
# right answer on each side, and check_containment() is what holds it.
DILATE = 1

# Mirrors WORLDVIEW_ARRIVAL in src/data/effects.js. Checked against the mask
# this file generates, so the two cannot drift apart.
# v2.3.2094: moved OUTSIDE the ring, south of the gate. See the note on
# WORLDVIEW_ARRIVAL in effects.js -- the old point was inside the walls with
# the town portal between it and the only opening, so the walk out sent you
# home and there was no way onto the map on foot.
ARRIVAL = (752, 1072)
ARRIVAL_CLEARANCE = 40       # px of open ground the arrival must have around it
# v2.3.2094: and it must not land inside a trail-head's own trigger radius.
# TOWN_EXIT_R in zoneTransitions.js is 2 tiles, Manhattan; a margin of 2 on top
# means the first step in any direction cannot arm a portal. This is the check
# that the trap above would have failed -- the old arrival was 2.25 tiles from
# the town marker, so it passed "not on a line, 84px clear" while being
# unplayable.
EXIT_TRIGGER_R = 2           # must match TOWN_EXIT_R (src/game/zoneTransitions.js)
ARRIVAL_MARKER_MARGIN = 2    # tiles of slack on top of it
# Well outside the outline on all four sides: sky at the top, sea at the
# bottom. If the flood reaches any of them the boundary has a hole in it.
CORNERS = [('NW sky', 40, 40), ('NE sky', 1490, 40),
           ('SW sea', 40, 1490), ('SE sea', 1490, 1490)]


def line_mask():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # Vivid magenta: bright in red AND blue, with green well below both. The
    # source is a JPEG, so the stroke has haloes; requiring green 50-60 below
    # both other channels keeps the halo out without eroding the line.
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


def reachable_from(wall, wx, wy):
    """Every cell you could walk to from a world point, wall respected."""
    free = ~wall
    sy, sx = int(wy / CELL), int(wx / CELL)
    seen = np.zeros_like(free)
    if not (0 <= sy < GRID and 0 <= sx < GRID) or not free[sy, sx]:
        return seen
    q = deque([(sy, sx)]); seen[sy, sx] = True
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < GRID and 0 <= nx < GRID and free[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    return seen


def exits():
    r = subprocess.run(['node', '-e',
        "import('%s/src/data/effects.js').then(m=>console.log(JSON.stringify(m.WORLDVIEW_EXITS)))" % REPO],
        capture_output=True, text=True, cwd=REPO)
    return json.loads(r.stdout)


def build():
    raw, px, size = line_mask()
    return raw, dilate(raw, DILATE), px, size


def report(raw, wall, px, size):
    print(f'source {size[0]}x{size[1]}: {px} magenta pixels drawn')
    print(f'boundary: {int(raw.sum())} cells traced -> {int(wall.sum())} after dilating '
          f'{DILATE} ({CELL * (2 * DILATE + 1):.0f} world px thick)')
    ax, ay = ARRIVAL
    gx, gy = int(ax / CELL), int(ay / CELL)
    ok = True

    # 1. You do not start standing in it (the owner's v2.3.2075 sentence).
    if wall[gy, gx]:
        ok = False
        print(f'FAIL: the arrival {ARRIVAL} is ON a line')
    else:
        d = min((np.hypot(xx - gx, yy - gy) * CELL
                 for yy in range(max(0, gy - 20), min(GRID, gy + 21))
                 for xx in range(max(0, gx - 20), min(GRID, gx + 21)) if wall[yy, xx]),
                default=1e9)
        if d < ARRIVAL_CLEARANCE:
            ok = False
            print(f'FAIL: the arrival {ARRIVAL} is only {d:.0f}px clear (needs {ARRIVAL_CLEARANCE})')
        else:
            print(f'OK: the arrival {ARRIVAL} is off the line, {d:.0f}px clear of it')

    # 1b. v2.3.2094: AND YOU DO NOT LAND ON A PORTAL. An arrival inside a
    #     trail-head's trigger radius is a zone you bounce out of; an arrival
    #     with a trail-head between it and the only gate is worse, because you
    #     bounce on the way OUT and cannot tell why.
    need = EXIT_TRIGGER_R + ARRIVAL_MARKER_MARGIN
    atx, aty = ax / 32, ay / 32
    close = [(e['zoneId'], abs(atx - e['tx']) + abs(aty - e['ty'])) for e in exits()]
    close = [c for c in close if c[1] < need]
    if close:
        ok = False
        for zid, d in close:
            print(f'FAIL: the arrival {ARRIVAL} is {d:.2f} tiles from the '
                  f'{zid} trail-head (needs {need}) -- you would be bounced')
    else:
        nearest = min((abs(atx - e['tx']) + abs(aty - e['ty']), e['zoneId']) for e in exits())
        print(f'OK: the arrival is clear of every trail-head '
              f'(nearest is {nearest[1]} at {nearest[0]:.2f} tiles, needs {need})')

    seen = reachable_from(wall, ax, ay)
    pct = seen.sum() * 100 / (GRID * GRID)

    # 2. EVERY LIVE SPOKE IS STILL WALKABLE TO. This is the check that matters:
    #    a boundary that closes a trail is a zone you can never enter again, and
    #    nothing else in the game would notice.
    bad = []
    for e in exits():
        ex, ey = e['tx'] * 32 + 16, e['ty'] * 32 + 16
        if not seen[int(ey / CELL), int(ex / CELL)]:
            bad.append(e['zoneId'])
    if bad:
        ok = False
        print(f'FAIL: cut off from the arrival — {", ".join(bad)}')
    else:
        print(f'OK: every trail-head is reachable on foot from the arrival '
              f'({", ".join(e["zoneId"] for e in exits())})')

    # 3. ...AND THE BOUNDARY HOLDS. The lines are the edge of the world, so the
    #    sky and the open sea have to be on the far side of them.
    leaks = [n for n, x, y in CORNERS
             if seen[min(GRID - 1, int(y / CELL)), min(GRID - 1, int(x / CELL))]]
    if leaks:
        ok = False
        print(f'FAIL: the walkable area leaks out into {", ".join(leaks)} — '
              f'the outline has a hole in it')
    else:
        print(f'OK: the boundary holds on all four sides; the playable area is '
              f'{pct:.0f}% of the map')
    return ok


if __name__ == '__main__':
    raw, wall, px, size = build()
    ok = report(raw, wall, px, size)
    if '--write' in sys.argv:
        if not ok:
            sys.exit('refusing to write: a walkability check failed')
        json.dump({'width': GRID, 'height': GRID, 'grid': (~wall).tolist()},
                  open(OUT, 'w'), separators=(',', ':'))
        print(f'wrote {OUT}  ({GRID}x{GRID}, {os.path.getsize(OUT)/1024:.0f} KB)')
    sys.exit(0 if ok else 1)
