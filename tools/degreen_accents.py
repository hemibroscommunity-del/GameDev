#!/usr/bin/env python3
"""v2.3.1518: pull the key green back out of a hat's warm accents.

The defect
----------
The Evil Crown's amber inlays came out yellow-green in three of its five
frames. Not stray key pixels -- those the importer already removes -- but real
hat pixels that the 5:1 downscale averaged together with the green showing
through the gaps between the crown's spikes. A block that is mostly gold and
partly key averages to something with far too much green in it, and by then it
is a single pixel of the finished frame with no seam left to detect.

It is measurable because the SAME accent is drawn in all five directions. The
crown's north and northeast inlays sit at g/r 0.63-0.65, honest amber. Its
south frame has pixels at (188,194,50) -- g/r 1.03, greener than red, which no
amber is. The clean frames say what the colour should be and the dirty ones
say which pixels missed it.

The correction
--------------
Green contamination raises g and barely moves r or b (the key is nearly pure
green), so r and b still carry the true hue and only g has to be rebuilt:

    g = r * (the ratio of the nearest clean accent population)

Nearest, not average. The first cut of this took the low 60% of the frame's
warm pixels as "clean" and it was wrong, because a warm palette is usually
more than one colour: the crown has red gems at g/r 0.20 as well as amber at
0.65, the low tail is all gems, and every real amber pixel got flagged and
repainted red. The replacement ratio is therefore taken from the band just
BELOW the threshold -- the clean members of the same colour that went bad --
rather than from every warm pixel in the frame.

Why the threshold is an argument and not a measurement
------------------------------------------------------
Because a detector for this does not work. The tell -- "warm pixels greener
than this hat's other warm pixels" -- cannot tell contamination from a palette
that simply has two colours in it: it flagged 193px of the Red Bandana, which
is its white dots, and 327px of the Headphones for the same reason, while a
uniformly yellow hat like the Safety Helmet would hide real contamination
inside its own hue. So a person looks at the hat, and the default threshold
(g/r above 0.9) encodes the one thing that is safe to assume: no amber, no
orange and no red has as much green in it as red. A hat that is genuinely
yellow needs a higher --above, or should be left alone.

Run from the repo root:
    python3 tools/degreen_accents.py --id evil-crown [--apply]
    [--dirs south,east]   default: all five
    [--above 0.9]         g/r over which a warm pixel counts as contaminated
"""
import argparse
import json
import os
import numpy as np
from PIL import Image

DIRS = ['south', 'southwest', 'east', 'northeast', 'north']
TRAITS = 'public/sprites/traits'
ALPHA_T = 16
WARM_R = 110         # an accent is bright...
WARM_RB = 50         # ...and clearly warmer than it is blue
BAND = 0.30          # how far below the threshold the clean same-colour band reaches


def trait_root(tid):
    for cat in ('headwear', 'hair'):
        p = f'{TRAITS}/{cat}/{tid}'
        if os.path.isfile(f'{p}/meta.json'):
            return p
    raise SystemExit(f'no trait called {tid} under {TRAITS}/headwear or /hair')


def degreen(tid, dirs, above, apply_it):
    """Rebuild g on warm pixels whose g/r exceeds `above`.

    The replacement ratio is the median of the clean band immediately below the
    threshold, pooled ACROSS the five frames -- a frame can be contaminated
    badly enough to have no clean examples of its own left (the crown's south
    inlays are nearly all bad), and the same accent is drawn in every
    direction, so its neighbours can speak for it."""
    root = trait_root(tid)
    frames, band = {}, []
    for d in DIRS:
        p = f'{root}/{d}.png'
        if not os.path.isfile(p):
            continue
        a = np.array(Image.open(p).convert('RGBA')).astype(int)
        r, g, b, al = (a[:, :, i] for i in range(4))
        warm = (al > ALPHA_T) & (r > WARM_R) & ((r - b) > WARM_RB)
        ratio = g / np.maximum(r, 1)
        frames[d] = (a, warm, ratio)
        sel = warm & (ratio > above - BAND) & (ratio <= above)
        if sel.any():
            band.append(ratio[sel])
    if not band:
        raise SystemExit(f'{tid}: no clean accent sits within {BAND} below {above} — '
                         'nothing to match the repaint against, pick a different --above')
    clean = float(np.median(np.concatenate(band)))

    total = 0
    for d in dirs:
        if d not in frames:
            continue
        # the path is rebuilt here on purpose: reusing the loop variable from
        # the scan above wrote all five frames over the last one it had read
        p = f'{root}/{d}.png'
        a, warm, ratio = frames[d]
        r, g = a[:, :, 0], a[:, :, 1]
        bad = warm & (ratio > above)
        n = int(bad.sum())
        total += n
        if not n:
            print(f'  {d:<10} clean')
            continue
        before = [tuple(int(v) for v in a[y, x, :3]) for y, x in list(zip(*np.nonzero(bad)))[:3]]
        a[:, :, 1] = np.where(bad, np.round(r * clean).astype(int), g)
        after = [tuple(int(v) for v in a[y, x, :3]) for y, x in list(zip(*np.nonzero(bad)))[:3]]
        print(f'  {d:<10} {n:3d} px de-greened to ratio {clean:.2f}   '
              f'{before[0]} -> {after[0]}')
        if apply_it:
            Image.fromarray(a.astype(np.uint8)).save(p)
    return total, root


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--id', required=True)
    ap.add_argument('--dirs', default=','.join(DIRS))
    ap.add_argument('--above', type=float, default=0.9)
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()

    dirs = [d for d in args.dirs.split(',') if d]
    bad = [d for d in dirs if d not in DIRS]
    if bad:
        raise SystemExit(f'not a direction: {",".join(bad)}')

    print(f'{args.id}:')
    total, root = degreen(args.id, dirs, args.above, args.apply)
    if total and args.apply:
        mp = f'{root}/meta.json'
        meta = json.load(open(mp))
        meta['note'] = (meta.get('note', '') + f' v2.3.1518: {total} accent pixel(s) '
                        'had the key green averaged into them by the downscale and were '
                        'rebuilt by tools/degreen_accents.py.')
        with open(mp, 'w') as fh:
            json.dump(meta, fh, indent=2)
            fh.write('\n')
        # the thumbnail is cut from the south frame, so it carries the fix too
        south = np.array(Image.open(f'{root}/south.png').convert('RGBA'))
        bb = meta['bboxes']['south']
        th = Image.fromarray(south[bb[1]:bb[1] + bb[3], bb[0]:bb[0] + bb[2]])
        th.resize((128, max(1, round(128 * bb[3] / bb[2]))), Image.LANCZOS).save(f'{root}/thumb.png')
    print(f'{total} pixel(s) {"rewritten" if args.apply else "would be rewritten"}')


if __name__ == '__main__':
    main()
