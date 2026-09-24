#!/usr/bin/env python3
"""Town's rock ring, as one outline you cannot walk past.  (v2.3.2896)

Owner: "can you make it so the player can't walk over the giant gray rocks
surrounding the town?  Watch the borders for detecting walkability since there
have been issues before with that."

THE ISSUES BEFORE, and why this is not them.  v2.3.1777 gave town a mask
derived from the art by hue, PER PIXEL, at runtime-grid resolution, and every
pixel it misread became a wall or a hole where you stood: shadowed cobble read
as not-ground, the stairs read as rock, a 32 px slot trapped the player.  The
owner's verdict (v2.3.1794): "the areas you detected for the map are too
unreliable" -- and town went back to blocking on props alone, which is why you
can walk out over the cliffs today.

This does something narrower.  The colour pass below runs ONCE, offline, and
only to find where one thing ends: the gray rock ring.  Its answer is not
shipped as a mask.  It is reduced to a single closed outline of a few hundred
points (plus the one rock outcrop that stands inside the ring), written into
src/data/townRim.js as plain numbers, checked by eye against the art (the
overlay this writes), and checked by tools/dev/check-town-rim.mjs for the
things that matter -- that the spawn, every NPC, every building door, the World
View arrival and the exit stairs are all inside it and reachable from each
other.  Nothing is classified at runtime, and nothing inside the ring can be
misread as a wall: the plaza, the grass, the flower beds, the fences and the
pine groves are all walkable, exactly as they are today.

WHAT COUNTS AS ROCK
  * gray stone faces            saturation <= 60, value >= 60
  * the dark gaps between them  value < 70        (south of YCUT only, see below)
  * the mossy column CAPS        pale: saturation < 115 on the south rim, where
                                 you look down onto the tops of the columns --
                                 without this the outline ran out over the caps
                                 and you could stand on top of the cliff
NORTH OF YCUT the dark term is left out on purpose: up there the dark pixels
are the pine groves and the fences between the plaza and the rock face, and
the owner asked for the ROCKS, not for the trees or the fences.  South of it
the dark term is what seals the ring -- the gaps between the south columns
open straight onto the forest below, and without it the flood leaks out.

THE STAIRS are gray stone and would read as rock, so a corridor down them is
carved by hand: the town's only exit (TOWN_EXITS, effects.js) is at the top of
them and has to stay reachable.

  python3 tools/maps/build_town_rim.py            measure, write the overlay only
  python3 tools/maps/build_town_rim.py --write    also write src/data/townRim.js

Needs numpy + opencv (pip install numpy opencv-python-headless).
"""
import json
import os
import sys

import cv2
import numpy as np

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ART = os.path.join(REPO, 'public', 'maps', 'town_v17.webp')
OUT_JS = os.path.join(REPO, 'src', 'data', 'townRim.js')
OUT_PNG = os.path.join(REPO, 'tools', 'qa', 'mp', 'out', 'town-rim-overlay.png')

MAP_V = 17                    # TOWN_MAP_V in src/data/worldProps.js
WW, WH = 68 * 32, 72 * 32     # town is 68x72 tiles (zones.js v2.3.2628)
FEET_DY = 52                  # playerGroundDy('town'): body centre -> boots
SPAWN = (1190, 1479)          # TOWN_SPAWN (a body CENTRE), constants.js
YCUT = 1400                   # see "NORTH OF YCUT" above
CAPS_S = 115                  # the pale column caps on the south rim
EPS = 6.0                     # outline simplification, world px
HOLE_MIN_AREA = 20000         # only the rock outcrop east of the mayor's alcove
# The corridor down the painted stairs, world px.  Clipped at y 2200 below:
# the foot clamp keeps the body centre above ZONE_H - 80 (BroTown), so feet
# never get lower than ~2276 anyway, and the exit fires long before that.
STAIRS = np.array([[930, 1960], [1110, 1960], [1080, 2300], [820, 2300]], np.int32)
STAIRS_FLOOR = 2200


def load():
    img = cv2.imread(ART, cv2.IMREAD_COLOR)
    if img is None:
        sys.exit('cannot read ' + ART)
    return cv2.resize(img, (WW, WH), interpolation=cv2.INTER_AREA)


def fill(wall, k, seed):
    """The open region connected to `seed`, with the wall closed by a k-px disc
    (bridging the hairline gaps between columns) and the result opened by 15 px
    (dropping tendrils that squeeze between them)."""
    wall = wall.astype(np.uint8) * 255
    cv2.fillPoly(wall, [STAIRS], 0)
    closed = cv2.morphologyEx(wall, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    cv2.fillPoly(closed, [STAIRS], 0)
    free = (closed == 0).astype(np.uint8)
    _, lab = cv2.connectedComponents(free, connectivity=4)
    reg = (lab == lab[seed[1], seed[0]]).astype(np.uint8)
    reg = cv2.morphologyEx(reg, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    _, lab2 = cv2.connectedComponents(reg, connectivity=4)
    return (lab2 == lab2[seed[1], seed[0]]).astype(np.uint8)


def trace(img):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    h, s, v = (hsv[..., i].astype(int) for i in range(3))
    seed = (SPAWN[0], SPAWN[1] + FEET_DY)          # the spawn's FEET
    stone = (s <= 60) & (v >= 60)
    caps = (s < CAPS_S) & (v > 140) & (h >= 10) & (h <= 40)
    south = fill(stone | (v < 70) | caps, 21, seed)
    north = fill(stone, 31, seed)
    north[YCUT:, :] = 0
    reg = np.maximum(south, north)
    disc = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25))
    reg = cv2.morphologyEx(reg, cv2.MORPH_CLOSE, disc)
    reg = cv2.morphologyEx(reg, cv2.MORPH_OPEN, disc)
    _, lab = cv2.connectedComponents(reg, connectivity=4)
    reg = (lab == lab[seed[1], seed[0]]).astype(np.uint8)
    reg[STAIRS_FLOOR:, :] = 0
    cnts, hier = cv2.findContours(reg, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    hier = hier[0]
    outer_i = max((i for i in range(len(cnts)) if hier[i][3] < 0), key=lambda i: cv2.contourArea(cnts[i]))
    outer = cv2.approxPolyDP(cnts[outer_i], EPS, True).reshape(-1, 2)
    holes = [cv2.approxPolyDP(cnts[i], EPS, True).reshape(-1, 2)
             for i in range(len(cnts))
             if hier[i][3] == outer_i and cv2.contourArea(cnts[i]) >= HOLE_MIN_AREA]
    return outer, holes


def overlay(img, outer, holes):
    vis = img.copy()
    cv2.polylines(vis, [outer.reshape(-1, 1, 2)], True, (0, 0, 255), 3)
    for hl in holes:
        cv2.polylines(vis, [hl.reshape(-1, 1, 2)], True, (255, 0, 0), 3)
    cv2.circle(vis, (SPAWN[0], SPAWN[1] + FEET_DY), 10, (0, 255, 0), -1)
    os.makedirs(os.path.dirname(OUT_PNG), exist_ok=True)
    cv2.imwrite(OUT_PNG, cv2.resize(vis, (WW // 2, WH // 2), interpolation=cv2.INTER_AREA))
    return OUT_PNG


def fmt(pts):
    rows, line = [], []
    for x, y in pts.tolist():
        line.append('[%d, %d]' % (x, y))
        if len(line) == 8:
            rows.append('  ' + ', '.join(line) + ',')
            line = []
    if line:
        rows.append('  ' + ', '.join(line) + ',')
    return '\n'.join(rows)


def write_js(outer, holes):
    with open(OUT_JS) as f:
        src = f.read()
    start = src.index('/* @generated:begin')
    end = src.index('/* @generated:end */')
    body = ['/* @generated:begin -- tools/maps/build_town_rim.py --write; do not hand-edit */',
            'export const TOWN_RIM_MAP_V = %d;' % MAP_V,
            'export const TOWN_RIM_WORLD = { w: %d, h: %d };' % (WW, WH),
            'export const TOWN_RIM = [', fmt(outer), '];',
            'export const TOWN_RIM_HOLES = [']
    for hl in holes:
        body += ['  [', fmt(hl).replace('\n  ', '\n    ').replace('  [', '    [', 1), '  ],']
    body += ['];', '']
    with open(OUT_JS, 'w') as f:
        f.write(src[:start] + '\n'.join(body) + src[end:])


def main():
    img = load()
    outer, holes = trace(img)
    print('outline: %d points, %d hole(s) %s' % (len(outer), len(holes), [len(h) for h in holes]))
    print('overlay:', overlay(img, outer, holes))
    if '--write' in sys.argv:
        write_js(outer, holes)
        print('wrote', OUT_JS, '-- now run: node tools/dev/check-town-rim.mjs')


if __name__ == '__main__':
    main()
