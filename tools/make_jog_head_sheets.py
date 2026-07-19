#!/usr/bin/env python3
"""v2.3.1368 (owner: "remove just the helmet so I can see the player's head
normally in each new jog frame"): generate jog head-overlay sheets.

For each fullset base dir, extract the body sheet's HEAD (the big connected
blob above the neckline) per frame into jog-<dir>-head.png — the same
head-only strip format the pickup pose ships (pickup-south-head.png).  The
renderer's existing head-overlay path (playerSkins.getPickupHeadFrame +
entityRenderer._placePickupHead + the _orderTraitsAndWeapon z-lift) draws it
recolored to the player's skin, above the fullset figure, whose helmet is
erased separately (see the fullset-helmet step in the same change).

Usage: python3 tools/make_jog_head_sheets.py [dir ...]
Do NOT pipe through `head` — SIGPIPE can kill the run before the save.
"""
import sys
import numpy as np
from scipy import ndimage
from PIL import Image

DIRS = ['south', 'southwest', 'north', 'east']
NECK_FRAC = 0.33   # == entityRenderer neckY / preview NECK_RESTORE_FRAC


def gen(d):
    b = Image.open(f'public/sprites/player/jog-{d}.png').convert('RGBA')
    fw = b.height
    n = b.width // fw
    a = np.array(b)
    out = np.zeros_like(a)
    for i in range(n):
        f = a[:, i * fw:(i + 1) * fw]
        op = f[:, :, 3] > 40
        ys = np.where(op.any(axis=1))[0]
        if not len(ys):
            continue
        top, bot = ys[0], ys[-1]
        figh = bot - top
        # v2.3.1368b: cut at the NECK PINCH, not a fixed fraction — the bare
        # shoulders connect to the head above the 0.33 line and leaked into
        # the overlay (bare orange shoulders floating over the armor).  The
        # neck is the narrowest blob row in the chin window; everything
        # below it (shoulder flare) stays out, like pickup-south-head.
        w = op.sum(axis=1)
        w0, w1 = top + int(0.20 * figh), top + int(0.42 * figh)
        yn = w0 + int(np.argmin(w[w0:w1]))
        neck = yn + 3
        band = op.copy()
        band[neck:] = False
        lbl, num = ndimage.label(band)
        if not num:
            continue
        sizes = ndimage.sum(band, lbl, range(1, num + 1))
        head = lbl == (int(np.argmax(sizes)) + 1)
        of = out[:, i * fw:(i + 1) * fw]
        of[head] = f[head]
    path = f'public/sprites/player/jog-{d}-head.png'
    Image.fromarray(out).save(path)
    print(f'{d}: {n}-frame head sheet -> {path}')


def main():
    for d in (sys.argv[1:] or DIRS):
        gen(d)


if __name__ == '__main__':
    main()
