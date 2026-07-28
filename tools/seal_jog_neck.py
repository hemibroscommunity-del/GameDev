#!/usr/bin/env python3
"""v2.3.1537: seal the neck seam between the jog head overlay and the armour.

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


def _grow(m):
    """4-neighbour dilation by one pixel."""
    out = m.copy()
    out[1:, :] |= m[:-1, :]
    out[:-1, :] |= m[1:, :]
    out[:, 1:] |= m[:, :-1]
    out[:, :-1] |= m[:, 1:]
    return out


def _seam_only(gap, head, armour):
    """Keep only connected components of `gap` that touch BOTH sheets.

    That is the definition of the seam this tool exists to close: a run of
    pixels with the head above it and the armour below it.  Anything touching
    only one (or neither) is unrelated body the band happened to cover, and
    filling it would paste a slab of arm or shoulder next to the head.
    Labelling is a tiny iterative flood so the tool needs no scipy.
    """
    hgrow, agrow = _grow(head), _grow(armour)
    keep = np.zeros_like(gap)
    seen = np.zeros_like(gap)
    ys, xs = np.nonzero(gap)
    for y0, x0 in zip(ys, xs):
        if seen[y0, x0]:
            continue
        stack = [(y0, x0)]
        comp = []
        seen[y0, x0] = True
        touch_h = touch_a = False
        while stack:
            y, x = stack.pop()
            comp.append((y, x))
            if hgrow[y, x]:
                touch_h = True
            if agrow[y, x]:
                touch_a = True
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < gap.shape[0] and 0 <= nx < gap.shape[1] \
                        and gap[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        if touch_h and touch_a:
            for y, x in comp:
                keep[y, x] = True
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
        # v2.3.1537: keep only holes that are genuinely a SEAM -- bounded by
        # the head on one side and the armour on the other.  Without this the
        # band is just a rectangle, and on east (a profile, where the head's
        # column span reaches past the shoulder) it swallowed a block of the
        # raised arm and pasted it beside the jaw as a skin slab.  A real seam
        # touches both sheets; a blob of unrelated body touches neither.
        gap = _seam_only(gap, h, f)
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
