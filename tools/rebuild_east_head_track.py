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


def smooth(vals, w=(1, 2, 3, 2, 1)):
    """Circular weighted moving average — the jog loops, so the window
    wraps.  v2.3.1390 (owner: "really jittery"): v2.3.1389 pinned the
    head to the RAW per-frame armor-top measure, which carries ±2px
    quantization noise (and the head-bottom its own), so the composed
    shifts stepped 3-4px between adjacent frames and the crown table
    snapped up to 10px — worse than the ±3px the body's own crown track
    (body-tops.json) ever moves.  Track the armor's MOTION, not its
    measurement noise."""
    n = len(vals)
    h = len(w) // 2
    return [sum(vals[(i + k - h) % n] * w[k] for k in range(len(w))) / sum(w)
            for i in range(n)]


def main():
    aimg = Image.open(ARMOR)
    himg = Image.open(HEAD)
    fh = aimg.size[1]
    af, an = frames(aimg, fh)
    hf, hn = frames(himg, fh)
    print(f'armor {an} frames, head {hn} frames, frame {fh}px')
    if hn == an:
        raise SystemExit('head sheet already rebuilt (25f) — restore the '
                         '28-frame source first: git show cdcbada:public/'
                         'sprites/player/jog-east-head.png')

    ay = [armor_top(f) for f in af]
    jmap = [min(hn - 1, int(((i + 0.5) / an) * hn)) for i in range(an)]
    hb = [head_bottom(hf[j]) for j in jmap]
    ay_s = smooth(ay)
    hb_s = smooth(hb)
    gaps = [hb_s[i] - ay_s[i] for i in range(an)]
    G = float(np.median(gaps))
    print('armor tops raw   :', ay)
    print('armor tops smooth:', [round(v, 1) for v in ay_s])
    print('head bots  smooth:', [round(v, 1) for v in hb_s])
    print('gap G =', round(G, 2))

    out = np.zeros((fh, an * fh, 4), dtype=np.uint8)
    crowns = []
    dys = []
    for i in range(an):
        src = hf[jmap[i]]
        # smoothed target minus RAW head bottom would re-inject the head's
        # own measurement noise — shift by the smooth-curve delta instead
        dy = int(round((ay_s[i] + G) - hb_s[i]))
        dys.append(dy)
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
        tx = xs[ys <= ty + 2].mean()
        crowns.append((tx, float(ty)))
        print(f'f{i:2d} <- old f{jmap[i]:2d}  dy {dy:+d}')

    # crown table: smooth the measured track the same way (the hat must
    # GLIDE with the head; per-frame pixel tops carry shape noise)
    cx_s = smooth([c[0] for c in crowns], (1, 2, 1))
    cy_s = smooth([c[1] for c in crowns], (1, 2, 1))
    table = [[int(round(x)) * 2, int(round(y)) * 2] for x, y in zip(cx_s, cy_s)]

    d = lambda a: max(abs(a[(i + 1) % len(a)] - a[i]) for i in range(len(a)))
    print('max adjacent-frame delta: dy-shift', d(dys),
          ' crown-y', d([t[1] for t in table]))

    Image.fromarray(out).save(HEAD)
    print(f'\nwrote {HEAD} ({an} frames)')
    print('\nFULLSET_CROWN east table (256-space [x,y] per armor frame):')
    print('  east: ' + repr(table) + ',')


if __name__ == '__main__':
    main()
