#!/usr/bin/env python3
"""v2.3.3696: THE MINER'S SEE-THROUGH LOOPS, GONE.

The owner, 2026-10-28: "I think the pickaxe during mining is transparent for
some reason".  It was not the pickaxe.  public/sprites/player/mine-south.png
was cut off its picture's background by colour, and two pieces of that
background are ENCLOSED by the figure: the gap between the raised arm, the
pickaxe's handle and the head (on the six frames the pick is over his head),
and the gap between his legs (on almost every frame).  Their middles were cut
out, but their edges were left:
  - THE RING: one flat light grey, (150, 158, 172), round a see-through hole,
    beside his head and between his knees, which in the game reads as a
    hollow pickaxe blade (mp-ghostaudit's mining frames).  That grey is also
    the sheet's boot-and-steel key, so nothing in the game's recolour could
    tell it from a boot;
  - THE PALE EDGE between the ring and the figure's outline: one or two
    pixels of near-white and pale grey where the background was smoothed into
    the outline.  With the ring gone they were a dotted line beside his face
    and along his arm and his legs.

This takes both away, from the sheet AS IT WAS CUT (SOURCE, kept beside the
other skill-animation sources), so a second run makes the same sheet:
  - the ring: a pixel of that grey (within TOL of it, summed over the three
    channels) joined, through others like it (8-connected), to a hole -- a
    see-through pixel its frame's edge cannot reach through other see-through
    pixels (4-connected);
  - the pale edge: a pixel that touches the ring, or touches one that does
    (EDGE_DEPTH steps, 8-connected), and is PALE -- near-neutral (its
    channels within SAT_MAX of each other, as a share of the brightest) and
    lighter than DARK_MAX.  The figure's own colours are none of these: the
    skin, the trousers and the pickaxe's handle are strongly coloured, the
    outline and the boots dark, and the blade's steel bluish; and a pixel
    that never touched the ring is never looked at, so the rock under him,
    its chips and the blade are left alone.
Both become see-through, so the hole and its edges are the background they
were.  Nothing else is touched:
  - the pickaxe's blade is a darker, bluer grey (about 129, 136, 150);
  - the eyes' whites share the ring's grey but touch no hole;
  - the frame where the pick strikes between his legs (frame 4) has no hole
    there, so the grey of the blade going into the rock stays.

Run from the repo root (needs Pillow, numpy):
    python3 tools/art/clear-mine-fringe.py            # write the sheet
    python3 tools/art/clear-mine-fringe.py --check    # exit 1 unless the
                                                      # shipped sheet is it
server/test/mine-look.test.mjs asks the same questions of the shipped sheet.
Bump playerSprites.js VERSION with it: the sheet is cached by its address.
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE = os.path.join(ROOT, 'assets', 'skill-anim-src', 'mine-south.as-cut.png')
SHEET = os.path.join(ROOT, 'public', 'sprites', 'player', 'mine-south.png')
FRAME = 128
KEY = (150, 158, 172)
TOL = 24
EDGE_DEPTH = 2     # the pale edge is one or two pixels deep
SAT_MAX = 0.12     # pale: (brightest - darkest) / brightest under this ...
DARK_MAX = 95      # ... and the channels' mean over this
N4 = [(1, 0), (-1, 0), (0, 1), (0, -1)]
N8 = N4 + [(1, 1), (1, -1), (-1, 1), (-1, -1)]


def holes_of(alpha):
    """A frame's see-through pixels its edge cannot reach (4-connected)."""
    h, w = alpha.shape
    see = alpha == 0
    reach = np.zeros_like(see)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if see[y, x] and not reach[y, x]:
                reach[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if see[y, x] and not reach[y, x]:
                reach[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in N4:
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and see[ny, nx] and not reach[ny, nx]:
                reach[ny, nx] = True
                q.append((ny, nx))
    return see & ~reach


def rings_of(fr):
    """The grey ring pixels joined to a hole, in one frame (RGBA uint8)."""
    alpha = fr[..., 3]
    hole = holes_of(alpha)
    grey = (np.abs(fr[..., :3].astype(int) - np.array(KEY)).sum(2) <= TOL) & (alpha > 0)
    h, w = alpha.shape
    ring = np.zeros_like(grey)
    q = deque()
    ys, xs = np.nonzero(hole)
    for y, x in zip(ys, xs):
        for dy, dx in N8:
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and grey[ny, nx] and not ring[ny, nx]:
                ring[ny, nx] = True
                q.append((ny, nx))
    while q:
        y, x = q.popleft()
        for dy, dx in N8:
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and grey[ny, nx] and not ring[ny, nx]:
                ring[ny, nx] = True
                q.append((ny, nx))
    return ring, hole


def pale_of(fr):
    """Near-neutral pixels lighter than the outline, in one frame."""
    rgb = fr[..., :3].astype(int)
    hi, lo = rgb.max(2), rgb.min(2)
    return (fr[..., 3] > 0) & ((hi - lo) <= SAT_MAX * np.maximum(1, hi)) & (rgb.sum(2) > DARK_MAX * 3)


def edge_of(fr, ring):
    """The pale pixels within EDGE_DEPTH steps of the ring (8-connected)."""
    pale = pale_of(fr) & ~ring
    h, w = ring.shape
    edge = np.zeros_like(ring)
    front = list(zip(*np.nonzero(ring)))
    for _ in range(EDGE_DEPTH):
        nxt = []
        for y, x in front:
            for dy, dx in N8:
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and pale[ny, nx] and not edge[ny, nx]:
                    edge[ny, nx] = True
                    nxt.append((ny, nx))
        front = nxt
    return edge


def mended():
    """The sheet the tool makes from SOURCE, and what it took from each frame."""
    im = np.array(Image.open(SOURCE).convert('RGBA'))
    took = []
    for f in range(im.shape[1] // FRAME):
        fr = im[:, f * FRAME:(f + 1) * FRAME]
        ring, hole = rings_of(fr)
        edge = edge_of(fr, ring)
        took.append((f, int(ring.sum()), int(edge.sum()), int(hole.sum())))
        fr[ring | edge] = 0
    return im, took


def main():
    im, took = mended()
    for f, ring, edge, hole in took:
        if ring or edge:
            print(f'  frame {f:2d}: {ring:4d} ring px and {edge:3d} pale edge px round {hole} hole px')
    rings = sum(t[1] for t in took)
    edges = sum(t[2] for t in took)
    if '--check' in sys.argv:
        shipped = np.array(Image.open(SHEET).convert('RGBA'))
        same = shipped.shape == im.shape and bool((shipped == im).all())
        diff = 0 if same else int((shipped != im).any(2).sum()) if shipped.shape == im.shape else -1
        print(f'{diff} px differ from the tool\'s sheet ({rings} ring px and {edges} pale edge px taken from the source)')
        sys.exit(0 if same else 1)
    Image.fromarray(im, 'RGBA').save(SHEET, optimize=True)
    print(f'took {rings} ring px and {edges} pale edge px from {os.path.relpath(SOURCE, ROOT)} '
          f'into {os.path.relpath(SHEET, ROOT)}')


if __name__ == '__main__':
    main()
