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

Run from the repo root:
    python3 tools/preview_headwear.py --ids wizard-hat,mickey-ears --out sheet.png
    [--pose stand|jog]  which pose's bodies to stand the hat on (default both)
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


def place(hat, meta, tops, pose, d, frame):
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

    s = meta.get('scale', {}).get(d, 1)
    s *= meta.get('scaleByPose', {}).get(pose, {}).get(d, 1)
    ax, ay = meta['anchors'][d]
    nx, ny = meta.get('crownNudge', {}).get(d, [0, 0])
    px, py = meta.get('poseNudge', {}).get(pose, {}).get(d, [0, 0])
    cx, cy = tops[key]

    h = hat[d]
    if s != 1:
        w2, h2 = max(1, round(FRAME * s)), max(1, round(FRAME * s))
        h = h.resize((w2, h2), Image.NEAREST)
        ax, ay = ax * s, ay * s
    out = body.copy()
    # anchor pixel of the hat lands on the body crown + nudges
    ox, oy = int(round(cx + nx + px - ax)), int(round(cy + ny + py - ay))
    layer = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
    layer.paste(h, (ox, oy), h)
    out.alpha_composite(layer)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ids', required=True, help='comma-separated hat ids')
    ap.add_argument('--out', default='headwear-preview.png')
    ap.add_argument('--pose', default='stand,jog')
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
            fr = place(hat, meta, tops, pose, d, 0)
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
