#!/usr/bin/env python3
"""v2.3.1520: take one accent colour out of a trait and heal the hole.

The Evil Crown was drawn with two accents on it: red gems and amber inlays.
The owner wants the amber gone, leaving the crown black-ish and red-ish only.

Deleting the pixels is wrong -- it would punch see-through holes in solid
metal. Flooding them with one flat colour is nearly as bad, because the crown
is shaded and a flat patch reads as a sticker. So each removed pixel is healed
from the art AROUND it: the median of the nearby pixels that are already the
body colour. Metal next to metal, highlight next to highlight, and the shading
carries straight through where the inlay used to be.

Selecting the accent
--------------------
By g/r ratio, which separates the crown's two accents cleanly and by a wide
margin -- the gems sit at 0.30 and below (183,57,44), the inlays at 0.62 and
above (209,144,55). Nothing lands between them. The band is given on the
command line rather than guessed, for the same reason the de-green threshold
is: a warm palette with two colours in it cannot be split by a rule that does
not know which one is wanted.

The cores alone are not enough, which the first attempt proved. Selecting only
solidly-warm pixels (r-b over 40) took the inlays out and left a mustard
residue behind: their own shadows and the blend ring where they meet the
metal, 43 pixels of it on the north frame alone. Those blends cannot be split
by colour -- a metal/amber blend and a metal/red blend both land in the same
g/r range, and the crown's r-b histogram has no gap to cut at, just a
continuous tail from the metal at 0-10 out to the accents past 40.

So they are split by POSITION instead. A halfway-warm pixel joins the removal
if it touches the accent being removed, and never if it touches the accent
being kept. The ring around an inlay goes; the identical-looking ring around a
gem stays.

Run from the repo root:
    python3 tools/remove_accent_color.py --id evil-crown --min-ratio 0.35 [--apply]
    [--max-ratio 1.0]  upper edge of the band
    [--dirs south,east]
"""
import argparse
import json
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

DIRS = ['south', 'southwest', 'east', 'northeast', 'north']
TRAITS = 'public/sprites/traits'
ALPHA_T = 16
CORE_RB = 40         # r minus b at which a pixel is solidly an accent
BLEND_RB = 15        # ...and at which it is part of an accent's blend ring
REACH = 4            # how far to look for body pixels to heal from, in frame px


def trait_root(tid):
    for cat in ('headwear', 'hair'):
        p = f'{TRAITS}/{cat}/{tid}'
        if os.path.isfile(f'{p}/meta.json'):
            return p
    raise SystemExit(f'no trait called {tid} under {TRAITS}/headwear or /hair')


def heal(a, kill, body):
    """Median of the body pixels within REACH of each killed pixel.

    Widened one ring at a time so a thick inlay heals from its own rim inward
    rather than from whatever happens to be REACH away in one direction."""
    out = a.copy()
    todo = kill.copy()
    src = body.copy()
    for _ in range(6):
        if not todo.any():
            break
        filled = np.zeros_like(todo)
        ys, xs = np.nonzero(todo)
        for y, x in zip(ys, xs):
            y0, y1 = max(0, y - REACH), min(a.shape[0], y + REACH + 1)
            x0, x1 = max(0, x - REACH), min(a.shape[1], x + REACH + 1)
            n = src[y0:y1, x0:x1]
            if not n.any():
                continue
            out[y, x, :3] = np.median(out[y0:y1, x0:x1][n][:, :3], axis=0).round()
            filled[y, x] = True
        if not filled.any():
            break
        todo &= ~filled
        src |= filled          # healed pixels become sources for the next ring
    return out, int((kill & ~todo).sum()), int(todo.sum())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--id', required=True)
    ap.add_argument('--min-ratio', type=float, required=True)
    ap.add_argument('--max-ratio', type=float, default=1.0)
    ap.add_argument('--dirs', default=','.join(DIRS))
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()

    root = trait_root(args.id)
    dirs = [d for d in args.dirs.split(',') if d]
    total = 0
    print(f'{args.id}:')
    for d in dirs:
        p = f'{root}/{d}.png'
        if not os.path.isfile(p):
            continue
        a = np.array(Image.open(p).convert('RGBA')).astype(int)
        r, g, b, al = (a[:, :, i] for i in range(4))
        m = al > ALPHA_T
        core = m & ((r - b) > CORE_RB)
        ratio = np.where(core, g / np.maximum(r, 1), -1)
        kill = core & (ratio >= args.min_ratio) & (ratio <= args.max_ratio)
        keep = core & ~kill                      # the accent that stays
        if not kill.any():
            print(f'  {d:<10} nothing in that band')
            continue
        # the blend ring: halfway-warm, claimed by whichever accent it touches
        st = np.ones((3, 3), bool)
        blend = m & ~core & ((r - b) > BLEND_RB)
        bratio = np.where(blend, g / np.maximum(r, 1), -1)
        # Position first, colour second. A blend pixel that touches only the
        # accent being removed is its ring and goes. One that touches the accent
        # being KEPT is protected -- unless its own hue is in the removal band
        # anyway, which happens where an inlay sits directly against a gem and
        # position alone cannot say whose ring it is. A gem's own ring never
        # qualifies: it runs from the gem's 0.30 up toward the metal, and a
        # pixel that far toward the metal is metal for practical purposes.
        safe = blend & (~ndi.binary_dilation(keep, st)
                        | ((bratio >= args.min_ratio) & (bratio <= args.max_ratio)))
        grown = kill.copy()
        for _ in range(6):
            add = ndi.binary_dilation(grown, st) & safe & ~grown
            if not add.any():
                break
            grown |= add
        kill = grown
        # the body is everything solid that is NOT an accent or a blend, so a
        # removed inlay never heals from the gems it sits between
        body = m & ~core & ~blend
        out, done, left = heal(a, kill, body)
        total += done
        print(f'  {d:<10} {done:3d} px removed and healed'
              + (f', {left} could not be reached' if left else ''))
        if args.apply:
            Image.fromarray(out.astype(np.uint8)).save(p)

    if total and args.apply:
        mp = f'{root}/meta.json'
        meta = json.load(open(mp))
        meta['note'] = (meta.get('note', '') + f' v2.3.1520: the accent band '
                        f'g/r {args.min_ratio}-{args.max_ratio} ({total} px) was removed '
                        'and healed from the surrounding body by '
                        'tools/remove_accent_color.py.')
        with open(mp, 'w') as fh:
            json.dump(meta, fh, indent=2)
            fh.write('\n')
        south = np.array(Image.open(f'{root}/south.png').convert('RGBA'))
        bb = meta['bboxes']['south']
        th = Image.fromarray(south[bb[1]:bb[1] + bb[3], bb[0]:bb[0] + bb[2]])
        th.resize((128, max(1, round(128 * bb[3] / bb[2]))), Image.LANCZOS).save(f'{root}/thumb.png')
    print(f'{total} pixel(s) {"removed" if args.apply else "would be removed"}')


if __name__ == '__main__':
    main()
