#!/usr/bin/env python3
"""v2.3.1541: rebuild the jog head overlay as THE NAKED BODY ABOVE THE ARMOUR.

Owner: "the head needs to be a round shape in all of the frames because the
head always fully sticks out of the armor" ... "the armor is drawn over the
naked body so use the naked body head jog."

THE INSIGHT
-----------
Every previous attempt tried to find where the head ENDS -- a neck detector,
then a pinch search, then registering a template.  All of them fail on the
same frames, because on a raised-fist frame there is no neck to find and no
clean head to copy.

But the compositing order already answers it.  jog-<dir>.png IS the naked
body, and the fullset is drawn OVER it, and the head overlay is drawn over
THAT.  So the overlay is not "the head" -- it is simply everything of the
naked body that sits ABOVE THE ARMOUR.  The armour's own top edge is the cut.

That gives, for free and without a single threshold:
  * a whole round head on every frame, because it is the naked body's own
    head, never re-cut;
  * no skin over plate, because nothing below the collar is drawn;
  * no neck seam, because the overlay ends exactly where the armour begins
    (with ONE row of overlap so a rounding difference cannot open a line);
  * nothing to tune per direction or per frame.

The only judgement left is WHICH COLUMNS are head.  A raised fist can reach
crown height, so "everything above the armour" over the full width would make
a hand into a head -- the failure southwest f16 produced twice already.  The
head columns are the WIDEST CONTIGUOUS RUN of the crown projection, which is
the generator's own hard-won rule (make_jog_head_sheets.py v2.3.1369d: "the
head is always the widest thing up there").

Run from the repo root, BEFORE seal_jog_neck.py:
    python3 tools/head_above_armour.py --dirs southwest
    python3 tools/head_above_armour.py --dirs southwest --apply
"""
import argparse
import numpy as np
from PIL import Image

FW = 128
HEAD = 'public/sprites/player/jog-{dir}-head.png'
BODY = 'public/sprites/player/jog-{dir}.png'
FULL = 'public/sprites/gear/fullset/steel/jog-{dir}.png'
ALPHA_T = 16
CROWN_FRAC = 0.18   # top slice of the figure used to find the head's columns
OVERLAP = 1         # rows of the overlay kept BELOW the armour's top edge


def head_columns(b):
    """Widest contiguous run of columns in the figure's crown slice."""
    ys = np.nonzero(b.any(axis=1))[0]
    if not len(ys):
        return None
    top, bot = ys[0], ys[-1]
    crown = b[top:top + max(1, int(CROWN_FRAC * max(1, bot - top)))]
    cols = crown.any(axis=0)
    runs, x = [], 0
    while x < len(cols):
        if cols[x]:
            x2 = x
            while x2 + 1 < len(cols) and cols[x2 + 1]:
                x2 += 1
            runs.append((x2 - x + 1, x, x2))
            x = x2 + 1
        else:
            x += 1
    if not runs:
        return None
    _, x0, x1 = max(runs)
    return top, x0, x1


def build_dir(d, apply_it):
    head = np.array(Image.open(HEAD.format(dir=d)).convert('RGBA'))
    body = np.array(Image.open(BODY.format(dir=d)).convert('RGBA'))
    full = np.array(Image.open(FULL.format(dir=d)).convert('RGBA'))
    n = min(head.shape[1], body.shape[1], full.shape[1]) // FW
    added = removed = changed = 0
    for i in range(n):
        sl = slice(i * FW, (i + 1) * FW)
        bf = body[:, sl]
        b = bf[:, :, 3] > ALPHA_T
        f = full[:, sl, 3] > ALPHA_T
        hc = head_columns(b)
        if hc is None:
            continue
        top, x0, x1 = hc
        new = np.zeros_like(b)
        for x in range(x0, x1 + 1):
            col = np.nonzero(f[:, x])[0]
            # no armour in this column -> fall back to the armour's overall top,
            # so a gap between pauldrons can't let the overlay run down the chest
            cut = (col.min() if len(col)
                   else (np.nonzero(f.any(axis=1))[0].min() if f.any() else FW))
            new[:min(FW, cut + OVERLAP), x] = b[:min(FW, cut + OVERLAP), x]
        old = head[:, sl, 3] > ALPHA_T
        if not np.array_equal(new, old):
            changed += 1
        added += int((new & ~old).sum())
        removed += int((old & ~new).sum())
        if apply_it:
            out = np.zeros_like(bf)
            out[new] = bf[new]
            head[:, sl] = out
    if apply_it:
        Image.fromarray(head).save(HEAD.format(dir=d))
    print(f'  {d:<11} {changed}/{n} frame(s) changed, +{added} / -{removed} px '
          f'{"applied" if apply_it else "(dry run)"}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dirs', default='southwest')
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()
    for d in args.dirs.split(','):
        build_dir(d, args.apply)


if __name__ == '__main__':
    main()
