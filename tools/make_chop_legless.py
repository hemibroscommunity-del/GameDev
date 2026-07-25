#!/usr/bin/env python3
"""v2.3.1468: build chop-strip-legless.webp — the lumberjack body with
its legs HOLLOWED OUT (fill erased, silhouette outline kept), swapped
in while leg armor is equipped.  Mirrors cook-strip-legless.webp
(v2.3.1114).

Why: the regenerated leg-armor art's stances don't pixel-match the
body's, so the body's own legs peeked out around the armor.  The
v2.3.1466 fix layered the previous covering steel underneath, which
the owner read as "duplicating another body beneath the legs".  With a
hollow body the armor legs ARE the legs — nothing can peek.

Owner follow-up on the first cut ("the body outline is also stripped
out and needs to be kept in"): erasing every below-waist pixel also
took the figure's dark silhouette line, so the torso ended in a raw
cut.  Now only the INTERIOR fill is erased; the 1px outline rim
survives, so the legs still read as drawn legs wherever armor doesn't
reach, and the torso keeps a finished edge.

Kept below WAIST: the silhouette rim (any pixel touching transparency),
the magenta axe (it is the weapon recolor key), and skin (the hands
cross the waist on the down-swing).  Rows above WAIST are untouched.
WAIST sits BELOW the armor's chain-band top (body row ~112) so the
band always covers the cut — no slit at the hips.

The rim is CLIPPED to the armor's own footprint (dilated REACH px):
kept where the greaves are, so the body's edge finishes into the
plate, dropped where they aren't — an unclipped rim left a
free-floating wireframe leg trailing outside the armor on the
wide-stance frames.
"""
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = 'public/sprites/skills/chop-strip.webp'
DST = 'public/sprites/skills/chop-strip-legless.webp'
GEAR = 'public/sprites/gear/legs/steelgreaves/chop-west.png'
FW, FH = 240, 220
GW, GH = 480, 440
CHOP_BASE = 12
WAIST = 118
REACH = 5          # px of body-space slack around the armor footprint


def main():
    sheet = np.array(Image.open(SRC).convert('RGBA'))
    gear = np.array(Image.open(GEAR).convert('RGBA'))
    gn = gear.shape[1] // GW
    n = sheet.shape[1] // FW
    out = []
    for i in range(n):
        f = sheet[:, i * FW:(i + 1) * FW].copy()
        r = f[:, :, 0].astype(int); g = f[:, :, 1].astype(int)
        b = f[:, :, 2].astype(int); a = f[:, :, 3]
        alive = a > 0
        axe = (r > 150) & (b > 80) & (g < 100) & (r - g > 80) & (b - g > 20)
        skin = (r > 170) & (g > 80) & (g < 160) & (b < 110) & (r - b > 90)
        # silhouette rim: opaque pixels that touch transparency (the
        # figure's own dark outline, plus the axe/hand edges)
        rim = alive & ~ndimage.binary_erosion(alive, np.ones((3, 3), bool))
        # ...clipped to where the greaves actually are, so the rim reads
        # as the armor's own finished edge instead of a ghost leg
        k = i - CHOP_BASE
        if 0 <= k < gn:
            ga = np.array(Image.fromarray(
                gear[:, k * GW:(k + 1) * GW]).resize((FW, FH),
                                                     Image.NEAREST))[:, :, 3] > 40
            rim &= ndimage.binary_dilation(ga, iterations=REACH)
        # erase by exclusion (per-class masks left bright AA speckles)
        kill = alive & ~axe & ~skin & ~rim
        kill[:WAIST] = False
        f[kill] = 0
        out.append(f)
        print(f'f{i:2d}: erased {int(kill.sum())}px  (rim kept '
              f'{int((rim[WAIST:]).sum())}px)')
    Image.fromarray(np.concatenate(out, axis=1)).save(DST, lossless=True)
    print('wrote', DST)


if __name__ == '__main__':
    main()
