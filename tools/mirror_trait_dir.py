#!/usr/bin/env python3
"""v2.3.1522: flip one direction of a trait left-to-right.

The Barbarian Helmet's northeast frame came back facing the wrong way — the
horns and the noseguard lean the opposite side from every other angle, so the
helmet appears to spin on the head as the player turns. Nothing is wrong with
the art itself; it is simply mirrored.

Flipping the pixels is the easy half. The half that matters is that the FRAME
is a coordinate system, not just a picture: _placeTrait pins the hat by an
anchor and reads the head's position from crownNudge, and both are measured in
frame columns. Mirroring the picture without mirroring those leaves the art
correct and the placement wrong by twice its offset from the centre.

Under a flip about the frame's own centre, column x becomes (FRAME-1-x). So:

    crown_in_frame_x  ->  FRAME-1 - crown_in_frame_x
    bbox              ->  its mirrored span
    anchor            ->  re-derived from the new bbox, as the importer does
    crownNudge        ->  anchor minus the new crown_in_frame

crown_in_frame is the fixed point of the whole exercise — it is where the
BODY's crown sits inside this frame, so it is the one thing that must survive
the flip unchanged in meaning, and everything else is re-derived from it.

Run from the repo root:
    python3 tools/mirror_trait_dir.py --id barbarian-helmet --dir northeast [--apply]
"""
import argparse
import json
import os
import numpy as np
from PIL import Image

DIRS = ['south', 'southwest', 'east', 'northeast', 'north']
TRAITS = 'public/sprites/traits'
FRAME = 256
ALPHA_T = 16


def trait_root(tid):
    for cat in ('headwear', 'hair'):
        p = f'{TRAITS}/{cat}/{tid}'
        if os.path.isfile(f'{p}/meta.json'):
            return p
    raise SystemExit(f'no trait called {tid} under {TRAITS}/headwear or /hair')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--id', required=True)
    ap.add_argument('--dir', required=True, choices=DIRS)
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()

    root = trait_root(args.id)
    d = args.dir
    meta = json.load(open(f'{root}/meta.json'))
    a = np.array(Image.open(f'{root}/{d}.png').convert('RGBA'))
    if a.shape[1] != FRAME:
        raise SystemExit(f'{args.id}/{d}: frame is {a.shape[1]} wide, expected {FRAME}')

    anchor = meta['anchors'][d]
    nudge = meta['crownNudge'][d]
    crown_x = anchor[0] - nudge[0]

    flipped = a[:, ::-1]
    m = flipped[:, :, 3] > ALPHA_T
    ys, xs = np.nonzero(m)
    bb = [int(xs.min()), int(ys.min()),
          int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)]
    new_anchor = [int(bb[0] + round(bb[2] / 2)), int(bb[1])]
    new_crown_x = FRAME - 1 - crown_x
    new_nudge = [int(new_anchor[0] - new_crown_x), int(nudge[1])]

    print(f'{args.id}/{d}:')
    print(f'  bbox       {meta["bboxes"][d]} -> {bb}')
    print(f'  anchor     {anchor} -> {new_anchor}')
    print(f'  crown x    {crown_x} -> {new_crown_x}')
    print(f'  crownNudge {nudge} -> {new_nudge}')

    if not args.apply:
        print('(dry run)')
        return

    Image.fromarray(flipped).save(f'{root}/{d}.png')
    meta['bboxes'][d] = bb
    meta['anchors'][d] = new_anchor
    meta['crownNudge'][d] = new_nudge
    meta['note'] = (meta.get('note', '') + f' v2.3.1522: the {d} frame was mirrored '
                    'left-to-right by tools/mirror_trait_dir.py; bbox, anchor and '
                    'crownNudge were re-derived from the flipped art around the same '
                    'crown point.')
    if meta.get('clipsHair') and os.path.isfile(f'{root}/hairmask/{d}.png'):
        hm = np.array(Image.open(f'{root}/hairmask/{d}.png').convert('RGBA'))
        Image.fromarray(hm[:, ::-1]).save(f'{root}/hairmask/{d}.png')
        print('  hairmask flipped to match')
    with open(f'{root}/meta.json', 'w') as fh:
        json.dump(meta, fh, indent=2)
        fh.write('\n')
    print('  applied')


if __name__ == '__main__':
    main()
