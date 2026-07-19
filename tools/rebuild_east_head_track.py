#!/usr/bin/env python3
"""v2.3.1389: armor-synced east jog head sheet (owner: "Still flickering
because the head doesn't bob with the armor").

The east fullset armor plays its NATIVE 25 frames by cycle phase
(getGearFramePhased, v2.3.1367) while jog-east-head.png shipped 28 frames
indexed by the 28-frame BODY clock — so the drawn head bobbed on the
body's cadence while the armor under it bobbed on its own, and the neck
seam breathed open/closed through the cycle.

This rebuilds the head sheet at the armor's 25 frames:
  - frame i sources its head pixels from the old head frame
    j = floor(((i+0.5)/25)*28)  (the body frame on screen at the same
    cycle phase, so the face pose still matches the legs), then
  - shifts them vertically so the head-bottom sits a CONSTANT gap from
    that armor frame's measured top edge (the pauldron dome) — the head
    now rides the armor's bob exactly.  The gap constant is the median
    of the existing gaps, so the overall approved placement is kept.

Also prints the per-frame crown [x, y] (topmost opaque pixel, 256-space)
of the rebuilt sheet — pasted into FULLSET_CROWN in entityRenderer.js so
hats/hair/beards anchor to the DRAWN head (inheriting its left shift and
armor bob) instead of the body sheet's crown.
"""
import numpy as np
from PIL import Image

ARMOR = 'public/sprites/gear/fullset/steel/jog-east.png'
HEAD = 'public/sprites/player/jog-east-head.png'
A_TH = 40   # alpha threshold for "opaque"


def frames(img, fw):
    a = np.array(img.convert('RGBA'))
    n = a.shape[1] // fw
    return [a[:, i * fw:(i + 1) * fw] for i in range(n)], n


def armor_top(fr):
    """Bob track: median column-top over the central half of the armor's
    columns — the pauldron/collar dome.  Median resists stray AA pixels."""
    al = fr[:, :, 3] > A_TH
    cols = np.where(al.any(axis=0))[0]
    x0, x1 = cols[0], cols[-1]
    lo = x0 + (x1 - x0) // 4
    hi = x1 - (x1 - x0) // 4
    tops = [np.argmax(al[:, x]) for x in range(lo, hi + 1) if al[:, x].any()]
    return int(np.median(tops))


def head_bottom(fr):
    al = fr[:, :, 3] > A_TH
    rows = np.where(al.any(axis=1))[0]
    return int(rows[-1]) if len(rows) else None


def main():
    aimg = Image.open(ARMOR)
    himg = Image.open(HEAD)
    fh = aimg.size[1]
    af, an = frames(aimg, fh)
    hf, hn = frames(himg, fh)
    print(f'armor {an} frames, head {hn} frames, frame {fh}px')

    ay = [armor_top(f) for f in af]
    jmap = [min(hn - 1, int(((i + 0.5) / an) * hn)) for i in range(an)]
    hb = [head_bottom(hf[j]) for j in jmap]
    gaps = [hb[i] - ay[i] for i in range(an)]
    G = int(round(np.median(gaps)))
    print('armor tops :', ay)
    print('head bots  :', hb)
    print('gaps       :', gaps, ' -> constant G =', G)

    out = np.zeros((fh, an * fh, 4), dtype=np.uint8)
    crowns = []
    for i in range(an):
        src = hf[jmap[i]]
        dy = (ay[i] + G) - hb[i]
        dst = np.zeros_like(src)
        if dy >= 0:
            dst[dy:fh, :] = src[0:fh - dy, :]
        else:
            dst[0:fh + dy, :] = src[-dy:fh, :]
        out[:, i * fh:(i + 1) * fh] = dst
        al = dst[:, :, 3] > A_TH
        ys, xs = np.where(al)
        ty = ys.min()
        # x from the mean over the top 3 rows — the single topmost pixel's
        # x is tuft-shape noise (body-tops holds x within ±1.5px; the same
        # head pixels should too)
        tx = int(round(xs[ys <= ty + 2].mean()))
        crowns.append([int(tx) * 2, int(ty) * 2])   # 256-space
        print(f'f{i:2d} <- old f{jmap[i]:2d}  dy {dy:+d}  crown256 {crowns[-1]}')

    Image.fromarray(out).save(HEAD)
    print(f'\nwrote {HEAD} ({an} frames)')
    print('\nFULLSET_CROWN east table (256-space [x,y] per armor frame):')
    print('  east: ' + repr(crowns) + ',')


if __name__ == '__main__':
    main()
