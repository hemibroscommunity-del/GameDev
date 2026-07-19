#!/usr/bin/env python3
"""v2.3.1377 (owner: SW f1/f4/f7-10/f12/f13/f18/f19 "too much neck shoulder
showing except 4 which just has a decapitated floating head"): the fixed
0.27-of-figure helmet cut (v2.3.1370) tracks the BODY's bob, but the knight
figure's collar — drawn by the artist and registered by silhouette — does
not bob identically.  Where the cut landed below the collar the erase
clipped the collar and the head overlay showed neck/shoulder skin over the
armor; where it landed above, the overlay stopped short of the collar and
the head floated.

The cut is now PER-FRAME, anchored to the KNIGHT's own shoulder line:
the topmost armor row measured just OUTSIDE the helmet's columns (the
pauldron/collar shelf, unobstructed by the helmet), plus a small overlap
so the neck always tucks into the collar.  Both the fullset-sheet helmet
erase and the head-overlay sheet derive from the SAME per-frame row, so
they can never disagree.

Rebuilds from the PRISTINE (pre-erase) fullset sheet — restore it from
git first:  git show f162e5e:public/sprites/gear/fullset/steel/jog-<dir>.png

Usage: python3 tools/rebuild_fullset_neck.py <dir> [overlap_px]
Do NOT pipe through `head` — SIGPIPE can kill the run before the save.
"""
import sys
import numpy as np
from scipy import ndimage
from PIL import Image

OVERLAP = 2   # px of skin allowed to tuck over the collar top
# v2.3.1377c: hand-tuned per-frame cut nudges (negative = cut higher =
# less neck skin, more helmet risk).  Applied after the min() rule.
# southwest f8/f18: the collar sits genuinely low there (leaning pose),
# so the body-line cut left a long bare throat (owner's frame list).
OFFSETS = {'southwest': {8: -3, 18: -3}}


def head_cols(op, top, figh):
    crown = op[top:top + max(1, int(0.18 * figh))]
    cm = crown.any(axis=0)
    runs = []
    x = 0
    while x < len(cm):
        if cm[x]:
            x2 = x
            while x2 + 1 < len(cm) and cm[x2 + 1]:
                x2 += 1
            runs.append((x2 - x + 1, x, x2))
            x = x2 + 1
        else:
            x += 1
    _, hx0, hx1 = max(runs)
    return hx0, hx1


def main():
    d = sys.argv[1]
    overlap = int(sys.argv[2]) if len(sys.argv) > 2 else OVERLAP
    b = Image.open(f'public/sprites/player/jog-{d}.png').convert('RGBA')
    fw = b.height
    n = b.width // fw
    ba = np.array(b)
    p = f'public/sprites/gear/fullset/steel/jog-{d}.png'
    fs = np.array(Image.open(p).convert('RGBA'))
    ffw = fs.shape[0]
    fn = fs.shape[1] // ffw
    heads = np.zeros_like(ba)
    cuts = []
    for i in range(n):
        bf = ba[:, i * fw:(i + 1) * fw]
        op = bf[:, :, 3] > 40
        ys = np.where(op.any(axis=1))[0]
        if not len(ys):
            cuts.append(None)
            continue
        top, bot = ys[0], ys[-1]
        hx0, hx1 = head_cols(op, top, max(1, bot - top))
        # knight shoulder line: topmost armor just outside the helmet cols
        fi = min(fn - 1, round(i * fn / n))
        ff = fs[:, fi * ffw:(fi + 1) * ffw]
        fop = ff[:, :, 3] > 40
        tops = []
        for x in list(range(max(0, hx0 - 9), max(0, hx0 - 1))) \
                + list(range(min(ffw, hx1 + 2), min(ffw, hx1 + 10))):
            col = np.where(fop[:, x])[0]
            if len(col):
                tops.append(col.min())
        if not tops:
            cuts.append(None)
            continue
        neck27 = top + int(round(0.27 * max(1, bot - top)))
        # v2.3.1377b: take the HIGHER of the two anchors.  The shoulder
        # measure alone went wild on frames where the swing vacates the
        # sample columns (median landed on the chest -> giant skin patch);
        # the body fraction alone ignored the knight's actual collar
        # (owner's frame list).  min() = never cut below the body line,
        # cut higher wherever the armor really sits higher.
        cut = min(int(np.median(tops)) + overlap, neck27)
        cut += OFFSETS.get(d, {}).get(i, 0)
        cuts.append((cut, hx0, hx1))
        # head overlay: body band above the cut, head cols only, largest blob
        band = op.copy()
        band[cut:] = False
        band[:, :max(0, hx0 - 6)] = False
        band[:, min(fw, hx1 + 7):] = False
        lbl, num = ndimage.label(band)
        if num:
            sizes = ndimage.sum(band, lbl, range(1, num + 1))
            headm = lbl == (int(np.argmax(sizes)) + 1)
            hf = heads[:, i * fw:(i + 1) * fw]
            hf[headm] = bf[headm]
    # helmet erase from the SAME cuts
    tot = 0
    for fi in range(fn):
        bi = min(n - 1, round(fi * n / fn))
        if cuts[bi] is None:
            continue
        cut, hx0, hx1 = cuts[bi]
        ff = fs[:, fi * ffw:(fi + 1) * ffw]
        zone = np.zeros(ff.shape[:2], bool)
        zone[:cut, max(0, hx0 - 4):min(ffw, hx1 + 5)] = True
        zone &= ff[:, :, 3] > 0
        ff[:, :, 3][zone] = 0
        tot += int(zone.sum())
    Image.fromarray(fs).save(p)
    hp = f'public/sprites/player/jog-{d}-head.png'
    # jaw side trim (bottom 2 rows to the central 60%) — the jaw is wider
    # than the neck and poked out beside the collar (v2.3.1374, north)
    trimmed = 0
    for i in range(n):
        hf = heads[:, i * fw:(i + 1) * fw]
        op2 = hf[:, :, 3] > 40
        if not op2.any():
            continue
        ys = np.where(op2.any(axis=1))[0]
        bot = ys.max()
        xs = np.where(op2.any(axis=0))[0]
        x0, x1 = xs.min(), xs.max()
        w = x1 - x0
        k0, k1 = x0 + int(0.20 * w), x1 - int(0.20 * w)
        for y in range(max(0, bot - 1), bot + 1):
            for x in range(fw):
                if hf[y, x, 3] > 40 and not (k0 <= x <= k1):
                    hf[y, x, 3] = 0
                    trimmed += 1
    Image.fromarray(heads).save(hp)
    print(f'{d}: per-frame cuts {[c[0] if c else None for c in cuts]}')
    print(f'{d}: helmet erased ({tot} px) -> {p}; head sheet -> {hp} (jaw trim {trimmed} px)')


if __name__ == '__main__':
    main()
