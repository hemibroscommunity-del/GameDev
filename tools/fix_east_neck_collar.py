#!/usr/bin/env python3
"""v2.3.1393: east jog collar sliver fill (owner: "still slivering and
razor blading where his head meets the armor").

East's helmet erase was the v2.3.1370 FIXED neck-fraction cut — it never
got the per-frame armor-anchored collar of v2.3.1386.  With the head now
frame-locked to the armor (v2.3.1389-90), narrow background slits open
between the jaw's bottom edge and the collar directly below it on the
bob extremes, and the straight cut edge reads as a razor line.

Fix — deliberately minimal after a first attempt over-restored helmet
chunks: per frame, per jaw column, measure the gap between the jaw's
bottom pixel and the first armor pixel below it.  ONLY when that gap is
a slit (1..MAXGAP px) fill it — pristine f162e5e pixels where they
exist, else the collar pixel color from just below — starting 2 rows
BEHIND the jaw so anti-alias fringes can't peek.  Wide openings are real
art (the head overhangs open space in a profile view) and are left
untouched, as is everything outside the jaw columns (the approved
1369/1371 outline thinning and 1388 top rounding survive byte-for-byte).

Usage: python3 tools/fix_east_neck_collar.py <pristine.png>
       (pristine = git show f162e5e:public/sprites/gear/fullset/steel/jog-east.png)
"""
import sys
import numpy as np
from PIL import Image

ARMOR = 'public/sprites/gear/fullset/steel/jog-east.png'
HEAD = 'public/sprites/player/jog-east-head.png'
PRISTINE = sys.argv[1] if len(sys.argv) > 1 else '/tmp/east-pristine.png'
A_TH = 40
MAXGAP = 6      # fill only slits up to this tall — wider is real art
BEHIND = 2      # start the fill this many rows behind (above) the jaw edge
JAW_BAND = 8    # a column is "jaw" if its head-bottom is within this of the max


def frames(img, fw):
    a = np.array(img.convert('RGBA'))
    return [a[:, i * fw:(i + 1) * fw] for i in range(a.shape[1] // fw)]


def jaw_cols(head_al):
    fh = head_al.shape[0]
    hb = np.full(fh, -1)
    for x in range(fh):
        ys = np.where(head_al[:, x])[0]
        if len(ys):
            hb[x] = ys[-1]
    hbm = hb.max()
    return hb, [x for x in range(fh) if hb[x] >= 0 and hb[x] >= hbm - JAW_BAND]


def main():
    fh = 128
    af = frames(Image.open(ARMOR), fh)
    hf = frames(Image.open(HEAD), fh)
    pf = frames(Image.open(PRISTINE), fh)
    assert len(af) == len(hf) == len(pf) == 25

    out = np.zeros((fh, 25 * fh, 4), dtype=np.uint8)
    total = 0
    for i in range(25):
        arm = af[i].copy()
        head_al = hf[i][:, :, 3] > A_TH
        prs = pf[i]
        hb, jcols = jaw_cols(head_al)
        filled = 0
        for x in jcols:
            arm_col = arm[:, x, 3] > A_TH
            below = np.where(arm_col[hb[x] + 1:])[0]
            if not len(below):
                continue                       # chin over open space — real art
            gap = below[0]                     # rows of background under the jaw
            if gap == 0 or gap > MAXGAP:
                continue                       # touching already / wide = real
            t_cur = hb[x] + 1 + gap            # first armor row below the jaw
            for y in range(max(0, hb[x] - BEHIND + 1), t_cur):
                if arm[y, x, 3] > A_TH:
                    continue
                if prs[y, x, 3] > A_TH:
                    arm[y, x] = prs[y, x]      # artist's own collar pixel
                else:
                    arm[y, x] = arm[t_cur, x]  # extend the collar color up
                arm[y, x, 3] = 255             # a translucent fill hides nothing
                filled += 1
        out[:, i * fh:(i + 1) * fh] = arm
        total += filled
        print(f'f{i:2d}: filled {filled} slit px')

    Image.fromarray(out).save(ARMOR)
    print(f'wrote {ARMOR}  ({total} px total)')

    # verify: no jaw column may retain a 1..MAXGAP background slit
    worst = 0
    for i in range(25):
        arm_al = out[:, i * fh:(i + 1) * fh, 3] > A_TH
        head_al = hf[i][:, :, 3] > A_TH
        hb, jcols = jaw_cols(head_al)
        holes = 0
        for x in jcols:
            below = np.where(arm_al[hb[x] + 1:, x])[0]
            if len(below) and 0 < below[0] <= MAXGAP:
                holes += below[0]
        worst = max(worst, holes)
        if holes:
            print(f'f{i:2d}: {holes} slit px REMAIN')
    print('worst remaining slit px in any frame:', worst)


if __name__ == '__main__':
    main()
