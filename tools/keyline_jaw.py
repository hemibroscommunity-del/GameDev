#!/usr/bin/env python3
"""v2.3.1540: keyline the armour where it meets the jaw, so a chin never reads
as turning into steel.

Owner, on the 3/4 front view: "southwest/southeast the head looks a little
receded inside the armor" and then, on the fix preview, "his chin turning into
metal armor.  The method of removing the head is best but I don't know if that
works on jog."

WHY NOT REMOVE THE ARMOUR
-------------------------
Removing it is the right instinct and it does clear the jaw -- but on jog it
opens holes.  Rendered on magenta, cutting a 1px ring of armour from around the
head leaves a gap under the chin on frames like f0, because the armour that was
touching the jaw is the ONLY thing drawn there: the fullset REPLACES the body,
so behind it is nothing.  (In the poses where the head-removal method works,
the art it cuts sits over a body that still draws underneath.)

WHAT THIS DOES INSTEAD
----------------------
It removes nothing.  It recolours the armour pixels that touch the head, in the
jaw half of the head only, to the sheet's OWN darkest opaque value -- the
keyline the armour is already drawn with everywhere else.  The chin then has a
clean dark edge against the collar instead of blending into grey, which is what
"turning into metal" actually was: two mid-grey-to-skin boundaries with no line
between them.

It cannot open a hole (no pixel loses alpha), it cannot cover the head (the
head overlay draws on top of the armour), and it cannot invent a colour (the
value is sampled from the sheet).

Run from the repo root:
    python3 tools/keyline_jaw.py            # report only
    python3 tools/keyline_jaw.py --apply
    [--dirs southwest] [--seat -1,-1]  the render-time head seat, in sheet px
"""
import argparse
import numpy as np
from PIL import Image

FW = 128
HEAD = 'public/sprites/player/jog-{dir}-head.png'
FULL = 'public/sprites/gear/fullset/steel/jog-{dir}.png'
ALPHA_T = 16
# the jaw half: the fraction DOWN the head's own height at which the jaw starts.
# Above this the head is forehead/eyes and the armour is nowhere near it.
JAW_FROM = 0.45


def _grow(m):
    o = m.copy()
    o[1:, :] |= m[:-1, :]
    o[:-1, :] |= m[1:, :]
    o[:, 1:] |= m[:, :-1]
    o[:, :-1] |= m[:, 1:]
    return o


def _shift(m, dx, dy):
    o = np.zeros_like(m)
    h, w = m.shape
    o[max(0, dy):h + min(0, dy), max(0, dx):w + min(0, dx)] = \
        m[max(0, -dy):h - max(0, dy), max(0, -dx):w - max(0, dx)]
    return o


def keyline_dir(d, seat, apply_it):
    head = np.array(Image.open(HEAD.format(dir=d)).convert('RGBA'))
    full = np.array(Image.open(FULL.format(dir=d)).convert('RGBA'))
    n = min(head.shape[1], full.shape[1]) // FW
    touched = 0
    frames = 0
    for i in range(n):
        sl = slice(i * FW, (i + 1) * FW)
        f = full[:, sl]
        ha = head[:, sl, 3] > ALPHA_T
        if seat != (0, 0):
            ha = _shift(ha, seat[0], seat[1])   # measure where the head LANDS
        rows = np.nonzero(ha.any(axis=1))[0]
        if not len(rows):
            continue
        top, bot = rows.min(), rows.max()
        jaw = np.zeros_like(ha)
        jaw[int(top + (bot - top) * JAW_FROM):bot + 2, :] = True
        fa = f[:, :, 3] > ALPHA_T
        ring = _grow(ha) & (~ha) & fa & jaw
        if not ring.any():
            continue
        # the sheet's own keyline = its darkest opaque value
        lum = f[:, :, :3].astype(int).sum(axis=2)
        key = f[fa][np.argmin(lum[fa])][:3].copy()
        frames += 1
        touched += int(ring.sum())
        if apply_it:
            f[ring, 0], f[ring, 1], f[ring, 2] = key[0], key[1], key[2]
            full[:, sl] = f
    if apply_it and touched:
        Image.fromarray(full).save(FULL.format(dir=d))
    print(f'  {d:<11} {frames}/{n} frame(s), {touched} px '
          f'{"keylined" if apply_it else "would be keylined"}')
    return touched


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dirs', default='southwest')
    ap.add_argument('--seat', default='-1,-1')
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()
    sx, sy = (int(v) for v in args.seat.split(','))
    total = sum(keyline_dir(d, (sx, sy), args.apply) for d in args.dirs.split(','))
    print(f'{total} px total')


if __name__ == '__main__':
    main()
