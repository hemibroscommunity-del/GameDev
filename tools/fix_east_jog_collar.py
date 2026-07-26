#!/usr/bin/env python3
"""v2.3.1481: drop the east-jog gorget off the bro's cheek on frames 3 and 15.

Owner: "there's a frame on armor east jog that looks like it rides too high up
into the characters face."

Measured across the 25-frame fullset figure (public/sprites/gear/fullset/steel/
jog-east.png), taking each frame's own crown as the datum so the run bob does
not confuse the reading.  The collar's top edge, column by column across the
head's width:

    f1  crown+20..22      f4  crown+20..22      f14 crown+20..22
    f2  crown+19..20      f5  crown+20..22      f16 crown+20..22
    f3  crown+17          <-- 16 columns, all of them
    f15 crown+18

So frames 3 and 15 carry the gorget 2-3px higher than every other frame in the
cycle, right where the jaw is, and it climbs past the ear.  Nothing else is
wrong: the sheet's collar never rises above the eye line, the head overlay is
drawn ON TOP of the figure, and the per-frame head residuals in
FULLSET_HEAD_RES are sub-pixel.  It is these two frames of art.

The fix trims the offending columns down to TARGET (crown+19) -- level with the
rest of the cycle, and exactly where the head sheet's chin ends on these frames,
so no transparent seam opens between chin and collar.  The new top row of each
trimmed column is re-darkened to the sheet's own outline value, or the cut would
read as a flat bright edge where a keyline used to be.

Frames 3 and 15 are the same drawing (the east cycle repeats), which is why both
carry the same defect and both are listed.

Run from the repo root:  python3 tools/fix_east_jog_collar.py
"""
import numpy as np
from PIL import Image

SHEET = 'public/sprites/gear/fullset/steel/jog-east.png'
HEAD = 'public/sprites/player/jog-east-head.png'
FW = 128
FRAMES = [3, 15]
TARGET = 19          # collar top, as an offset from that frame's crown
GUARD = 24           # refuse to trim more than this many px in one column


def main():
    sheet = np.array(Image.open(SHEET).convert('RGBA'))
    head = np.array(Image.open(HEAD).convert('RGBA'))
    n = sheet.shape[1] // FW

    # outline value = the darkest lit tone the sheet actually uses, sampled
    # from its own keyline rather than guessed
    lum = sheet[:, :, :3].astype(float) @ [0.299, 0.587, 0.114]
    lit = sheet[:, :, 3] > 200
    dark = float(np.percentile(lum[lit], 2))

    total = 0
    for i in FRAMES:
        if i >= n:
            raise SystemExit(f'{SHEET}: no frame {i}')
        f = sheet[:, i * FW:(i + 1) * FW]
        h = head[:, i * FW:(i + 1) * FW, 3] > 40
        hy, hx = np.nonzero(h)
        crown, hl, hr = int(hy.min()), int(hx.min()), int(hx.max())
        cut = crown + TARGET
        for x in range(hl, hr + 1):
            col = np.nonzero(f[:, x, 3] > 40)[0]
            if not len(col):
                continue
            top = int(col[0])
            if top >= cut:
                continue
            if cut - top > GUARD:
                raise SystemExit(f'frame {i} col {x}: would trim {cut - top}px '
                                 '— that is not a collar, refusing')
            f[top:cut, x] = 0
            total += cut - top
            # restore the keyline on the new top row
            below = np.nonzero(f[:, x, 3] > 40)[0]
            if len(below):
                y = int(below[0])
                f[y, x, :3] = int(round(dark))
        print(f'frame {i}: crown {crown}, trimmed columns {hl}..{hr} to row {cut}')

    Image.fromarray(sheet).save(SHEET)
    print(f'wrote {SHEET} — {total} px of gorget removed')


if __name__ == '__main__':
    main()
