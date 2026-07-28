#!/usr/bin/env python3
"""v2.3.1538: seal the neck seam between the jog head overlay and the armour.

THE HOLE
--------
A jogging player in the fullset is composited from two sheets: the fullset
figure REPLACES the body, and jog-<dir>-head.png is drawn on top so the head
is never swallowed by a helmet the player isn't wearing.

The head sheet is cut at the jaw.  The fullset's collar was cut to the armour
(v2.3.1377-1381, "armor-anchored neck cuts", which is what stopped the armour
eating the chin).  Nobody owns the rows BETWEEN them -- the neck.  So on most
jog frames there is a 1-2px wedge beside the neck where NEITHER sheet draws
and the ground shows straight through the character (owner: "almost all jog
directions still have slivering around the neck area").  East is the worst at
up to 7 rows, because the profile's back-of-neck sits well above its gorget.

Raising the armour would put steel back over the jaw -- the bug those three
rebuilds were fixing.  So the fix goes the other way: the HEAD sheet grows
down over the neck, using the body sheet's own neck pixels.

WHY THIS IS SAFE
----------------
  * It only fills pixels where the armour is ABSENT, so no armour is ever
    covered and the collar's shape is untouched.
  * It only fills where the BODY sheet has a pixel, so it can only ever draw
    the character's own neck -- it cannot invent silhouette.
  * It is bounded to a band just under the head and to the head's own column
    span, so it cannot run down the chest.
  * Unarmoured jog is unaffected in appearance: the pixels it adds are the
    same body pixels the body sheet already draws underneath.
  * The head sheet is skin-recoloured at runtime, so the added neck recolours
    with the rest of the head instead of staying default-tan.

Run from the repo root:
    python3 tools/seal_jog_neck.py            # report only
    python3 tools/seal_jog_neck.py --apply
    [--band 10]   rows below the head bottom to consider (default 10)
"""
import argparse
import numpy as np
from PIL import Image

FW = 128
DIRS = ['south', 'southwest', 'east', 'north']
HEAD = 'public/sprites/player/jog-{dir}-head.png'
BODY = 'public/sprites/player/jog-{dir}.png'
FULL = 'public/sprites/gear/fullset/steel/jog-{dir}.png'
ALPHA_T = 16
# v2.3.1538: the tallest vertical run of empty pixels that still counts as a
# seam rather than genuinely exposed neck.  3 covers every real sliver measured
# (south 2, southwest 2, north 1) and excludes the east chin voids (10+).
MAX_GAP = 3


def _grow(m):
    """4-neighbour dilation by one pixel."""
    out = m.copy()
    out[1:, :] |= m[:-1, :]
    out[:-1, :] |= m[1:, :]
    out[:, 1:] |= m[:, :-1]
    out[:, :-1] |= m[:, 1:]
    return out


def _short_gaps_only(gap, head, armour, max_gap):
    """Keep only gap pixels in a SHORT vertical run bridging head -> armour.

    Walk each column.  A run of candidate pixels counts only if the pixel
    directly above the run is head, the pixel directly below it is armour, and
    the run is at most `max_gap` tall.  That is the precise shape of the
    sliver this tool exists to close, and it structurally cannot produce a
    blob: anything taller than a few pixels is left alone.
    """
    keep = np.zeros_like(gap)
    hgt, wid = gap.shape
    for x in range(wid):
        y = 0
        while y < hgt:
            if not gap[y, x]:
                y += 1
                continue
            y0 = y
            while y < hgt and gap[y, x]:
                y += 1
            run = y - y0
            above_head = y0 > 0 and head[y0 - 1, x]
            below_armour = y < hgt and armour[y, x]
            if run <= max_gap and above_head and below_armour:
                keep[y0:y, x] = True
    return keep


def seal_dir(d, band, apply_it):
    head = np.array(Image.open(HEAD.format(dir=d)).convert('RGBA'))
    body = np.array(Image.open(BODY.format(dir=d)).convert('RGBA'))
    full = np.array(Image.open(FULL.format(dir=d)).convert('RGBA'))
    n = head.shape[1] // FW
    filled_total = 0
    frames_touched = 0
    for i in range(n):
        sl = slice(i * FW, (i + 1) * FW)
        h = head[:, sl, 3] > ALPHA_T
        b = body[:, sl, 3] > ALPHA_T
        f = full[:, sl, 3] > ALPHA_T
        rows = np.nonzero(h.any(axis=1))[0]
        if not len(rows):
            continue
        hb = rows.max()
        cols = np.nonzero(h.any(axis=0))[0]
        # the seam band: just under the head, within the head's own columns
        region = np.zeros_like(h)
        region[max(0, hb - 3):min(hb + 1 + band, FW), cols.min():cols.max() + 1] = True
        gap = region & (~h) & (~f) & b
        if not gap.any():
            continue
        # v2.3.1538: a SLIVER is a SHORT vertical gap -- head directly above,
        # armour directly below, a pixel or three apart.  Fill only those.
        #
        # The v2.3.1537 rule filled any void between the two sheets, however
        # deep.  On the east profile the armour's collar sits well below and
        # behind the chin, so that void is 10+ rows tall, and packing it with
        # skin produced a blocky tab in front of the mouth -- owner: "east jog
        # now has tan pixels on some frames that stick out around the mouth
        # like a tongue".  It was 16-29px on six frames, which is a slab, not
        # a seam.  A deep void is exposed neck, not a seam artefact; covering
        # it is an art decision, and guessing it with a rectangle of body
        # pixels looks worse than the hole did.
        gap = _short_gaps_only(gap, h, f, MAX_GAP)
        if not gap.any():
            continue
        frames_touched += 1
        filled_total += int(gap.sum())
        if apply_it:
            sub_h = head[:, sl]
            sub_b = body[:, sl]
            sub_h[gap] = sub_b[gap]
            head[:, sl] = sub_h
    if apply_it and filled_total:
        Image.fromarray(head).save(HEAD.format(dir=d))
    print(f'  {d:<11} {frames_touched:>3}/{n} frame(s) had a neck hole, '
          f'{filled_total:>5} px {"sealed" if apply_it else "would be sealed"}')
    return filled_total


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--band', type=int, default=10)
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()
    total = sum(seal_dir(d, args.band, args.apply) for d in DIRS)
    print(f'{total} px total')


if __name__ == '__main__':
    main()
