#!/usr/bin/env python3
"""v2.3.1479: head-overlay sheets for the HIT-REACT and MINING poses.

Why
---
Gear draws ABOVE the body sprite, so a plate whose collar or pauldron reaches
past the jaw hides part of the face -- and the masked-body bake
(`_maskedBodyFrame`) makes it worse, because it erases the body under the gear
silhouette dilated by 6 and only restores a HORIZONTAL band down to
`figTop + 0.33 * figHeight`.  A head thrown low by the recoil falls below that
band and is erased outright.  Measured on the shipped v2.3.1477 sheets:

    under the plate   3-59 px per frame (up to 12% of the head)
    erased outright   13-67 px on southwest f1, northeast f3-f5, north f3-f4

which is the owner's report: "the head ... disappears behind the armor due to
AI drift".

The engine already has the cure, built for the loot-pickup crouch (v2.3.1055)
and reused for the fullset knight (v2.3.1368): a head-only sheet
`<pose>-<dir>-head.png`, recoloured to the player's skin by
`playerSkins.getPickupHeadFrame` and lifted ABOVE the worn gear in
`_orderTraitsAndWeapon`.  Nothing can cover or erase it.  This writes those
sheets for the two poses that now ship armour and did not have one.

The head masks come from the fitters that carved the neck holes
(fit_hit_armor_art / fit_mine_armor_art), so the overlay lands exactly in the
hole its own plate was cut around.  It is dilated by GROW px first: the head's
black keyline is not skin and sits just outside the mask, and a couple of extra
pixels of neck under the jaw hides the seam against the collar.

Run from the repo root:  python3 tools/make_pose_head_sheets.py
"""
import importlib.util
import os
import numpy as np
from PIL import Image
from scipy import ndimage

TOOLS = os.path.dirname(os.path.abspath(__file__))


def _load(name):
    spec = importlib.util.spec_from_file_location(name,
                                                  os.path.join(TOOLS, name + '.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_hit = _load('fit_hit_armor_art')
_mine = _load('fit_mine_armor_art')

FW = FH = 128
GROW = 2


def write(body_path, out_path, masks):
    body = np.array(Image.open(body_path).convert('RGBA'))
    n = body.shape[1] // FW
    out = np.zeros_like(body)
    kept = []
    for i in range(n):
        f = body[:, i * FW:(i + 1) * FW]
        m = ndimage.binary_dilation(masks[i], _hit._disk(GROW)) & (f[:, :, 3] > 40)
        sub = out[:, i * FW:(i + 1) * FW]
        sub[m] = f[m]
        kept.append(int(m.sum()))
    Image.fromarray(out).save(out_path)
    print('wrote', out_path, out.shape, 'head px/frame', kept)


def main():
    for d in ['south', 'southwest', 'east', 'northeast', 'north']:
        p = f'public/sprites/player/hit-{d}.png'
        body = np.array(Image.open(p).convert('RGBA'))
        frames = [body[:, i * FW:(i + 1) * FW] for i in range(6)]
        masks = _hit.head_masks([f[:, :, 3] > 40 for f in frames],
                                [_hit.is_face(f) for f in frames],
                                {fi: b for (dd, fi), b in _hit.HEAD_BOX.items()
                                 if dd == d})
        write(p, f'public/sprites/player/hit-{d}-head.png', masks)

    p = 'public/sprites/player/mine-south.png'
    body = np.array(Image.open(p).convert('RGBA'))
    frames = [body[:, i * FW:(i + 1) * FW] for i in range(14)]
    cls = [_mine.classify(f) for f in frames]
    masks = _mine.head_masks([sk | lp for sk, lp, _pr in cls])
    write(p, 'public/sprites/player/mine-south-head.png', masks)


if __name__ == '__main__':
    main()
