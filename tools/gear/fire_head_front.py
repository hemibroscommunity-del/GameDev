#!/usr/bin/env python3
"""v2.3.3684: the fire-lighter's head in front of his plate and his T-shirt.

The owner, 2026-10-27: "For fire starting animation head needs to be removed
and pasted on top of armor torso layer (you're done this before)".  The
fire-lighter is drawn as a body strip with the armour's own strips over it
(effectsRenderer _updateFiremaking: the greaves, the T-shirt, the plate, at
FIRE_GEAR_REG's per-frame places), so wherever the plate's picture lies over
the body's head, it covers the face: on frame 2, where he leans to the log,
the plate's collar ran across his mouth (1,512 of the plate's pixels on his
face); on frames 1, 3, 5 and 6 it clipped the chin's outline.  The T-shirt's
collar did the same on frames 1 and 3-5.  "Done before" is the pickup crouch
and the jog (playerSkins getPickupHeadFrame, v2.3.1055/1368): a head of its
own drawn over the gear.  Here the head never moves against the art -- the
body strip is the same picture for every player, recoloured -- so the same
result is had for nothing at run time: the plate and the T-shirt simply have
no picture where the head is.

THE HEAD.  Per frame, the face's own piece of skin (4-connected, the bake's
skin test with the fire-lighter's window, FIRE_SKIN_OPTS), found from a point
in the face (SEED); every hole in it filled (the eyes, the mouth, the ear's
lines); then the outline round it, the drawn pixels that are not skin within
RING px; and filled again.  The face's piece of skin is the whole head and
nothing else on every frame: his head is outlined apart from his neck and
shoulders (measured: 5,634-6,504 px, 90-95 rows tall, on each frame).

THE CUT.  A pixel of the plate's (or the T-shirt's) strip goes see-through when
the place it is drawn at -- its cell scaled by the layer's `scale` about the
cell's bottom middle, moved by the frame's `off` (both read from FIRE_GEAR_REG
in effectsRenderer.js, so they cannot drift) -- lies on the head, grown by one
pixel for the game's smooth scaling.  Nothing else changes.

--check writes nothing and fails if a cut would change either strip: after a
change to FIRE_GEAR_REG's chest or shirt rows, or a re-cut of the owner's art
(tools/build_fire_8f.mjs), run this again.

PNG ONLY: each strip's .webp twin is deleted (the fire-lighter's loader draws
the PNG, effectsRenderer _gearStripFrame; CI mints the twins).  Bump
GEARLAYER_VER in src/rendering/gearVersion.js.

  python3 tools/gear/fire_head_front.py [--check]
"""
import os
import re
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BODY = os.path.join(REPO, 'public/sprites/skills/firemaking-strip.webp')
LAYERS = {
    'chest': os.path.join(REPO, 'public/sprites/gear/chest/steelplate/fire-south.png'),
    'shirt': os.path.join(REPO, 'public/sprites/gear/shirt/tshirt/fire-south.png'),
}
FX = os.path.join(REPO, 'src/rendering/systems/effectsRenderer.js')
FW, FH = 384, 512
# a point in each frame's face (frame px); the nearest skin pixel is taken
SEED = [(230, 80), (240, 215), (225, 240), (235, 220), (245, 190), (250, 190), (240, 170), (240, 50)]
RING = 3
# FIRE_SKIN_OPTS (effectsRenderer.js): the window that tells his skin from the fire's
MAX_BR, MIN_GR, MAX_GR = 0.50, 0.45, 0.80


def reg_rows():
    src = open(FX, encoding='utf-8').read()
    block = src[src.index('const FIRE_GEAR_REG = {'):]
    block = block[:block.index('\n};')]
    out = {}
    for slot in ('chest', 'shirt'):
        m = re.search(slot + r':\s*\{\s*scale:\s*([0-9.]+),\s*off:\s*(\[\[.*?\]\]),?\s*\}', block, re.S)
        if not m:
            raise SystemExit('FIRE_GEAR_REG.' + slot + ' not found in effectsRenderer.js')
        offs = [[int(v) for v in p] for p in re.findall(r'\[(-?\d+),\s*(-?\d+)\]', m.group(2))]
        if len(offs) != 8:
            raise SystemExit('FIRE_GEAR_REG.' + slot + ': ' + str(len(offs)) + ' offsets, not 8')
        out[slot] = (float(m.group(1)), offs)
    return out


def head_mask(fr, f):
    r, g, b, a = (fr[..., i].astype(int) for i in range(4))
    skin = (a > 40) & (r > g) & (g >= b) & ((r - b) > 30) & (r > 90) & ((r - g) > 25)
    rr = np.maximum(r, 1)
    skin &= (b / rr <= MAX_BR) & (g / rr >= MIN_GR) & (g / rr <= MAX_GR)
    lab, n = ndimage.label(skin)
    sx, sy = SEED[f]
    if not skin[sy, sx]:
        ys, xs = np.nonzero(skin)
        i = int(np.argmin((ys - sy) ** 2 + (xs - sx) ** 2))
        sy, sx = int(ys[i]), int(xs[i])
    head = ndimage.binary_fill_holes(lab == lab[sy, sx])
    ring = ndimage.binary_dilation(head, structure=np.ones((3, 3), bool), iterations=RING)
    head |= ring & (a > 40) & ~skin
    return ndimage.binary_fill_holes(head)


def main():
    check = '--check' in sys.argv
    body = np.array(Image.open(BODY).convert('RGBA'))
    if body.shape[1] != FW * 8 or body.shape[0] != FH:
        raise SystemExit('firemaking-strip.webp is not 8 frames of 384 x 512')
    heads = [head_mask(body[:, f * FW:(f + 1) * FW], f) for f in range(8)]
    grown = [ndimage.binary_dilation(h, structure=np.ones((3, 3), bool)) for h in heads]
    reg = reg_rows()
    v, u = np.mgrid[0:FH, 0:FW]
    changed = []
    for slot, path in LAYERS.items():
        im = np.array(Image.open(path).convert('RGBA'))
        if im.shape[1] != FW * 8 or im.shape[0] != FH:
            raise SystemExit(path + ' is not 8 frames of 384 x 512')
        k, offs = reg[slot]
        counts = []
        for f in range(8):
            ox, oy = offs[f]
            bx = np.floor(FW / 2 + ox + (u + 0.5 - FW / 2) * k).astype(int)
            by = np.floor(FH + oy + (v + 0.5 - FH) * k).astype(int)
            inside = (bx >= 0) & (bx < FW) & (by >= 0) & (by < FH)
            over = np.zeros((FH, FW), bool)
            over[inside] = grown[f][by[inside], bx[inside]]
            cell = im[:, f * FW:(f + 1) * FW]
            cut = over & (cell[..., 3] > 0)
            counts.append(int(cut.sum()))
            cell[cut] = 0
        print(slot, 'pixels over the head, by frame:', counts)
        if sum(counts):
            changed.append((slot, path, im))
    if check:
        if changed:
            print('CHANGED: run python3 tools/gear/fire_head_front.py (' + ', '.join(c[0] for c in changed) + ')')
            sys.exit(1)
        print('ok: no plate or T-shirt pixel lies over the fire-lighter\'s head')
        return
    for slot, path, im in changed:
        Image.fromarray(im).save(path, optimize=True)
        twin = path[:-4] + '.webp'
        if os.path.exists(twin):
            os.remove(twin)
        print('wrote', os.path.relpath(path, REPO))


if __name__ == '__main__':
    main()
