#!/usr/bin/env python3
"""v2.3.3586: draw the creator's SPECIES tab icon, an alien's head.

The owner: "Yes make species it's own button.  And add alien."  The new tab
needs an icon beside the painted ones (cc-tab-hair, -skin, -eyes ...).  Those
are pixel art on a 17 x 18 grid at 8 px a pixel (136 x 144), outlined in the
same near-black, and this one is drawn on that grid so it sits among them: the
Skin tab's bald head made the alien the creator now offers -- an egg-shaped
head in Alien Cyan (playerSkins.js `aliencyan`), pointed ears with a shaded
inside, and the Alien Eyes' black almonds, outer corners raised, a glint in
each (the eye style 'alien').  Drawn in code so it can be drawn again: every
shape below is a few numbers, each picked by eye at the tab's real size
(30 CSS px) against the other icons.

    python3 tools/ui/make_species_tab_icon.py

Writes public/ui/welcome/cc/cc-tab-species.png.
"""
import math
import os

import numpy as np
from PIL import Image, ImageDraw

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(REPO, 'public', 'ui', 'welcome', 'cc', 'cc-tab-species.png')

R, C = 18, 17                    # the tab icons' grid (cc-tab-skin.png: 136 x 144 at 8 px)
PX = 8
SS = 16                          # supersampling, per grid pixel, for the shapes
OUTLINE = (4, 11, 17)            # the tab icons' outline
SKIN = np.array([191, 231, 231], float)   # Alien Cyan
EYE = (10, 10, 16)               # the Alien Eyes' black (tools/species_alien.py EYE_BLACK)
GLINT = (236, 246, 250)          # ...and their glint (EYE_GLINT)

# The head, an egg: from TOP to BOTTOM (grid px), half-width HW_TOP over the
# cranium, its widest at BELLY of the way down, narrowing to HW_CHIN.
TOP, BOTTOM, HW_TOP, HW_CHIN, BELLY = 0.2, 17.8, 6.2, 2.8, 0.6
CHIN_POW = 1.6
# The left ear, a polygon (x, y in grid px); the right is its mirror.  Its
# point rises above the head's side, its inside is the skin a shade darker.
EAR = [(0.0, 1.5), (4.5, 4.2), (4.0, 11.5), (1.4, 9.0)]
EAR_K = 0.93
EAR_MARK = [(6, 2)]              # (row, col): the ear's inner shadow, as the game's ears have
# The left eye: centre x, centre y, half-width, half-height, tilt (degrees;
# negative raises the outer corner).  The right is its mirror.
EYE_AT = (5.6, 9.8, 2.0, 2.0, -32)
EYE_POW = 1.5                    # the almond's taper: 2 is pointed, 1 a diamond
GLINTS = [(9, 6)]                # (row, col) on the left eye, mirrored


def _cells(mask, cut):
    return mask.reshape(R, SS, C, SS).mean(axis=(1, 3)) > cut


def _poly(pts):
    im = Image.new('L', (C * SS, R * SS), 0)
    ImageDraw.Draw(im).polygon([(x * SS, y * SS) for x, y in pts], fill=255)
    return np.array(im) > 127


def draw():
    yy, xx = np.mgrid[0:R * SS, 0:C * SS]
    X = (xx + 0.5) / SS
    Y = (yy + 0.5) / SS
    cx = C / 2.0
    t = np.clip((Y - TOP) / (BOTTOM - TOP), 0, 1)
    up = HW_TOP * np.sqrt(np.clip(1 - ((BELLY - t) / BELLY) ** 2, 0, 1))
    down = HW_TOP + (HW_CHIN - HW_TOP) * (np.clip(t - BELLY, 0, None) / (1 - BELLY)) ** CHIN_POW
    head = (Y >= TOP) & (Y <= BOTTOM) & (np.abs(X - cx) <= np.where(t < BELLY, up, down))
    H = _cells(head, 0.5)
    E = _cells(_poly(EAR) | _poly([(C - x, y) for x, y in EAR]), 0.45) & ~H
    U = H | E

    def outside(r, c, allow):
        return r < 0 or c < 0 or r >= R or c >= C or not allow[r, c]

    out = np.zeros((R, C, 4), int)
    for r in range(R):
        for c in range(C):
            if not U[r, c]:
                continue
            # the head is outlined against everything, the ears against the
            # air only: the head's own outline is the line between them
            allow = H if H[r, c] else U
            if any(outside(r + dr, c + dc, allow) for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                out[r, c] = (*OUTLINE, 255)
                continue
            if H[r, c]:
                # the other icons' shading: a darker band under the chin, a
                # lighter one down the sides
                if outside(r + 1, c, H) or (r > 12 and outside(r + 2, c, H)):
                    k = 0.82
                elif outside(r, c + 1, H) or outside(r, c - 1, H):
                    k = 0.92
                else:
                    k = 1.0
            else:
                k = EAR_K
            out[r, c, :3] = np.clip(np.round(SKIN * k), 0, 255)
            out[r, c, 3] = 255
    for r, c in EAR_MARK:
        for cc in (c, C - 1 - c):
            out[r, cc, :3] = np.clip(np.round(SKIN * 0.6), 0, 255)
    ex, ey, ehw, ehh, tilt = EYE_AT
    for sx, sg in ((ex, 1), (C - ex, -1)):
        tt = math.radians(tilt * sg)
        x = X - sx
        y = Y - ey
        xr = x * math.cos(tt) + y * math.sin(tt)
        yr = -x * math.sin(tt) + y * math.cos(tt)
        almond = (np.abs(xr) <= ehw) & (np.abs(yr) <= ehh * (1 - (np.abs(xr) / ehw) ** EYE_POW))
        out[_cells(almond, 0.4)] = (*EYE, 255)
    for r, c in GLINTS:
        out[r, c] = (*GLINT, 255)
        out[r, C - 1 - c] = (*GLINT, 255)
    return np.repeat(np.repeat(out, PX, 0), PX, 1).astype(np.uint8)


def main():
    Image.fromarray(draw(), 'RGBA').save(OUT, optimize=True)
    print('wrote', os.path.relpath(OUT, REPO))


if __name__ == '__main__':
    main()
