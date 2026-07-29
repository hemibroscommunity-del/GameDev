#!/usr/bin/env python3
"""v2.3.1488: composite a hat onto the game's own body sprites, the way
_placeTrait does, so a generated hat can be checked before it is shipped.

This is the only honest check on an imported hat.  The mannequin sheet shows
the hat on a head, but what the player sees is _placeTrait's arithmetic:

    anchor pixel of the hat  ->  body crown + crownNudge + poseNudge
    size                     ->  scale * scaleByPose

so a preview that re-implements THAT is the thing that catches a bad import.
Two hats have already shipped wrong from being eyeballed on the art instead
(v2.3.1484 tuned a pose that was already correct; v2.3.1486 shipped a jog
scale off a measurement with the wrong sign), which is why this exists.

v2.3.1542: it now also applies the two RUNTIME factors it used to omit --
`poseTraitMul` (the blanket 0.67 on jog east, 1.21 mine, 0.88 fish) and
JOG_EW_HAT_TUNE.  Without them this preview drew jog east a THIRD bigger than
the game does, so a hat could preview seated and hover in play: exactly how the
wizard hat shipped flying above the head.  A preview that does not reproduce
every term of _placeTrait is not a check, it is a second opinion from a
different function.  Keep the two tables below in step with entityRenderer.js.

Run from the repo root:
    python3 tools/preview_headwear.py --ids wizard-hat,mickey-ears --out sheet.png
    [--pose stand|jog]  which pose's bodies to stand the hat on (default both)
    [--frame N]         which frame of that pose (default 0)
"""
import argparse
import json
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

DIRS = ['south', 'southwest', 'east', 'northeast', 'north']
BODY = 'public/sprites/player/{pose}-{dir}.png'
TOPS = 'public/sprites/player/body-tops.json'
HAT = 'public/sprites/traits/headwear/{id}'
FRAME = 256
UP = 3
PAD = 8
LAB = 26

F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)

# v2.3.1542: mirrors of entityRenderer.js -- JOG_EW_HAT_TUNE {id: (mul, dy)} and
# BODY_DIR_SCALE.jog.east.  `dy` is a SCREEN-pixel nudge in the renderer, so it
# is divided by the body scale to land in this 256-space frame.
JOG_EW_HAT_TUNE = {
    'old-school-helmet': (1.15, 2), 'top-hat': (1.10, 3), 'purple-hat': (1.10, 1),
    'beanie': (1.25, 2), 'red-cap': (1.10, 0), 'shark-hat': (1.00, 2),
    'bandana': (1.10, 0), 'sombrero': (1.20, 6), 'bucket-hat': (1.20, 6),
    'fedora': (1.20, 6), 'wizard-hat': (1.40, 3),
}
JOG_EAST_BODY_SCALE = 1.25


def pose_trait_mul(meta, pose, d):
    """The blanket per-pose multiplier _placeTrait applies (v2.3.1487)."""
    if meta.get('poseFit'):
        return 1.0
    if pose == 'mine':
        return 1.21
    if pose == 'fish':
        return 0.88
    return 0.67 if (pose == 'jog' and d == 'east') else 1.0


def place(hat, meta, tops, pose, d, frame, hid=None):
    """One composited 256 frame: the hat over the body, by _placeTrait's rules."""
    key = f'{pose}-{d}-{frame}'
    if key not in tops:
        return None
    strip = Image.open(BODY.format(pose=pose, dir=d)).convert('RGBA')
    # v2.3.1408 stores the walk/action poses at 128 (DISPLAY_DS=2) while stand
    # is still 256; body-tops.json is in 256-space for BOTH, so the small
    # frames are blown back up rather than the tops being scaled down.
    fw = strip.height
    body = strip.crop((frame * fw, 0, (frame + 1) * fw, fw))
    if fw != FRAME:
        body = body.resize((FRAME, FRAME), Image.NEAREST)

    tune_mul, tune_dy = JOG_EW_HAT_TUNE.get(hid, (1.0, 0.0)) \
        if (pose == 'jog' and d == 'east') else (1.0, 0.0)
    s = meta.get('scale', {}).get(d, 1)
    s *= meta.get('scaleByPose', {}).get(pose, {}).get(d, 1)
    s *= pose_trait_mul(meta, pose, d) * tune_mul
    ax, ay = meta['anchors'][d]
    nx, ny = meta.get('crownNudge', {}).get(d, [0, 0])
    px, py = meta.get('poseNudge', {}).get(pose, {}).get(d, [0, 0])
    cx, cy = tops[key]

    h = hat[d]
    # v2.3.1542: ALWAYS resize to FRAME*s, never "only when s != 1".  Trait art
    # is stored at 128 since v2.3.1526 and the renderer normalises it back to
    # 256 (`norm = 256 / texWidth`); this resize is what does the same here, so
    # skipping it at s == 1 drew every stand preview at half size against a
    # 256-space anchor.  s is almost never exactly 1 now that poseTraitMul is
    # applied, which is precisely why the hole went unnoticed.
    w2 = max(1, round(FRAME * s))
    h = h.resize((w2, w2), Image.NEAREST)
    ax, ay = ax * s, ay * s
    out = body.copy()
    # anchor pixel of the hat lands on the body crown + nudges
    dy256 = tune_dy / (JOG_EAST_BODY_SCALE if (pose == 'jog' and d == 'east') else 1.0)
    ox, oy = int(round(cx + nx + px - ax)), int(round(cy + ny + py - ay + dy256))
    layer = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
    layer.paste(h, (ox, oy), h)
    out.alpha_composite(layer)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ids', required=True, help='comma-separated hat ids')
    ap.add_argument('--out', default='headwear-preview.png')
    ap.add_argument('--pose', default='stand,jog')
    ap.add_argument('--frame', type=int, default=0)
    args = ap.parse_args()

    ids = [i.strip() for i in args.ids.split(',') if i.strip()]
    poses = [p.strip() for p in args.pose.split(',') if p.strip()]
    tops = json.load(open(TOPS))

    cw, chh = FRAME * UP // 2, FRAME * UP // 2
    rows = [(i, p) for i in ids for p in poses]
    W = PAD + len(DIRS) * (cw + PAD)
    H = PAD + len(rows) * (chh + LAB + PAD)
    img = Image.new('RGB', (W, H), (26, 24, 30))
    dr = ImageDraw.Draw(img)

    for r, (hid, pose) in enumerate(rows):
        folder = HAT.format(id=hid)
        meta = json.load(open(f'{folder}/meta.json'))
        hat = {d: Image.open(f'{folder}/{d}.png').convert('RGBA') for d in DIRS}
        y = PAD + r * (chh + LAB + PAD)
        dr.text((PAD, y), f'{hid}  —  {pose}', font=F, fill=(235, 226, 210))
        for c, d in enumerate(DIRS):
            fr = place(hat, meta, tops, pose, d, args.frame, hid)
            if fr is None:
                continue
            fr = fr.resize((cw, chh), Image.NEAREST)
            bg = Image.new('RGBA', (cw, chh), (58, 52, 66, 255))
            bg.alpha_composite(fr)
            img.paste(bg.convert('RGB'), (PAD + c * (cw + PAD), y + LAB))

    img.save(args.out)
    print('wrote', args.out, img.size)


if __name__ == '__main__':
    main()
