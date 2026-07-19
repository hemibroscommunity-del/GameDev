#!/usr/bin/env python3
"""v2.3.1374 (owner: "The north run looks like slivers are disappearing near
the head neck area"): the v2.3.1368-70 helmet erase removes EVERYTHING above
the fixed neck row inside the head's column slack — on the frames where the
run-cycle bob lifts the shoulders, that slack also caught the armor COLLAR
beside the neck, leaving per-frame notches that flicker as the cycle plays.

Repair, north only (the reported dir; the others are owner-approved):
 1. Collar notch in-paint on gear/fullset/steel/jog-north.png: within the
    collar band around each frame's neck row, short transparent gaps (<=5px)
    bounded by armor on BOTH sides in the same row are filled by
    interpolating the boundary pixels.  The neck opening itself is far wider
    than 5px and is never touched.
 2. Head-overlay side trim on player/jog-north-head.png: the head blob's
    bottom rows (jaw width) are wider than the neck, so where the collar
    dipped the skin poked out beside the neck.  The bottom 3 rows are
    clipped to the central 60% of the head width — back view, no face art
    lost.

Usage: python3 tools/repair_fullset_collar.py
Do NOT pipe through `head` — SIGPIPE can kill the run before the save.
"""
import numpy as np
from PIL import Image

# same fixed neck fraction as tools/make_jog_head_sheets.py (v2.3.1369e)
NECK_FRAC = 0.27
D = 'north'


def neck_rows():
    b = Image.open(f'public/sprites/player/jog-{D}.png').convert('RGBA')
    fw = b.height
    n = b.width // fw
    a = np.array(b)
    out = []
    for i in range(n):
        op = a[:, i * fw:(i + 1) * fw, 3] > 40
        ys = np.where(op.any(axis=1))[0]
        if not len(ys):
            out.append(None)
            continue
        top, bot = ys[0], ys[-1]
        out.append(top + int(round(NECK_FRAC * max(1, bot - top))))
    return out, n


def main():
    necks, n = neck_rows()

    p = f'public/sprites/gear/fullset/steel/jog-{D}.png'
    fs = np.array(Image.open(p).convert('RGBA'))
    ffw = fs.shape[0]
    fn = fs.shape[1] // ffw
    filled = 0
    for i in range(fn):
        bi = min(n - 1, round(i * n / fn))
        if necks[bi] is None:
            continue
        neck = necks[bi]
        ff = fs[:, i * ffw:(i + 1) * ffw]
        for y in range(max(0, neck - 8), min(ffw, neck + 7)):
            row = ff[y]
            x = 0
            while x < ffw:
                if row[x][3] > 40:
                    x += 1
                    continue
                x2 = x
                while x2 + 1 < ffw and row[x2 + 1][3] <= 40:
                    x2 += 1
                gapw = x2 - x + 1
                if 0 < x and x2 < ffw - 1 and gapw <= 5 \
                        and row[x - 1][3] > 40 and row[x2 + 1][3] > 40:
                    l = row[x - 1].astype(int)
                    r = row[x2 + 1].astype(int)
                    for k in range(gapw):
                        t = (k + 1) / (gapw + 1)
                        px = (l * (1 - t) + r * t).astype(np.uint8)
                        px[3] = 255
                        row[x + k] = px
                    filled += gapw
                x = x2 + 1
    Image.fromarray(fs).save(p)
    print(f'{D}: collar notches filled ({filled} px) -> {p}')

    hp = f'public/sprites/player/jog-{D}-head.png'
    hd = np.array(Image.open(hp).convert('RGBA'))
    hfw = hd.shape[0]
    hn = hd.shape[1] // hfw
    trimmed = 0
    for i in range(hn):
        hf = hd[:, i * hfw:(i + 1) * hfw]
        op = hf[:, :, 3] > 40
        if not op.any():
            continue
        ys = np.where(op.any(axis=1))[0]
        bot = ys.max()
        xs = np.where(op.any(axis=0))[0]
        x0, x1 = xs.min(), xs.max()
        w = x1 - x0
        keep0 = x0 + int(0.20 * w)
        keep1 = x1 - int(0.20 * w)
        for y in range(max(0, bot - 2), bot + 1):
            for x in range(hfw):
                if hf[y, x, 3] > 40 and not (keep0 <= x <= keep1):
                    hf[y, x, 3] = 0
                    trimmed += 1
    Image.fromarray(hd).save(hp)
    print(f'{D}: head-overlay jaw rows trimmed ({trimmed} px) -> {hp}')


if __name__ == '__main__':
    main()
