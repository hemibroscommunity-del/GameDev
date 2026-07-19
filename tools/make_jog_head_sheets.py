#!/usr/bin/env python3
"""v2.3.1368 (owner: "remove just the helmet so I can see the player's head
normally in each new jog frame"): generate jog head-overlay sheets AND erase
the helmets from the fullset sheets — both from the SAME neck detector, so
the cut and the overlay always agree.

Per fullset base dir and frame:
  - jog-<dir>-head.png gets the body sheet's HEAD (the blob above the neck),
    the head-only strip format the pickup pose ships (pickup-south-head.png).
    The renderer's existing overlay path (playerSkins.getPickupHeadFrame +
    entityRenderer._placePickupHead + the _orderTraitsAndWeapon z-lift)
    draws it recolored to the player's skin, above the fullset figure.
  - gear/fullset/steel/jog-<dir>.png loses its helmet: pixels above the neck
    within the head's column range (pauldron spikes outside survive).

Neck detector (v2.3.1369): the first row below the head's WIDEST row where
the blob narrows to <55% of the head width, capped at 0.40 of the figure.
The v2.3.1368 global-minimum-in-window version latched onto narrow TORSO
rows on three southwest frames (arm positions), gutting the chest into the
"head" and erasing the armor ("a frame when the armor comes off").

Usage: python3 tools/make_jog_head_sheets.py [dir ...]
Do NOT pipe through `head` — SIGPIPE can kill the run before the save.
"""
import sys
import numpy as np
from scipy import ndimage
from PIL import Image

DIRS = ['south', 'southwest', 'north', 'east']
# fullset frame -> body frame is nearest-in-phase (east ships 25 native
# frames vs the 28-frame body cycle; the others are 1:1)


def neck_row(op):
    """(neck row, head col range) for one body frame's alpha mask.

    v2.3.1369b: the width profile is measured WITHIN THE HEAD'S COLUMNS
    only — the full-row profile counted the arms, so on southwest (fists
    at neck height, shoulders nearly head-wide) the pinch never fired and
    the cut landed under the shoulders (bare shoulder bars in the overlay,
    chest holes in the erase)."""
    ys = np.where(op.any(axis=1))[0]
    if not len(ys):
        return None, None, None
    top, bot = ys[0], ys[-1]
    figh = max(1, bot - top)
    crown = op[top:top + max(1, int(0.18 * figh))]
    colmask = crown.any(axis=0)
    if not colmask.any():
        return None, None, None
    # v2.3.1369d: the head columns are the WIDEST run of the crown
    # projection — on two southwest frames the raised fist reaches crown
    # height and a min..max span pulled the whole bare arm into the
    # "head".  The head is always the widest thing up there.
    runs = []
    x = 0
    while x < len(colmask):
        if colmask[x]:
            x2 = x
            while x2 + 1 < len(colmask) and colmask[x2 + 1]:
                x2 += 1
            runs.append((x2 - x + 1, x, x2))
            x = x2 + 1
        else:
            x += 1
    _, hx0, hx1 = max(runs)
    cx = (hx0 + hx1) // 2
    # v2.3.1369c: width of the connected RUN through the head's center
    # column, per row — the far arm shares these rows (and even these
    # columns) on southwest, so any row-sum profile stays wide and the
    # pinch never fires.  A swinging arm is a separate run; the center
    # run is head -> neck -> torso, and its pinch IS the neck.
    def runw(y):
        row = op[y]
        if not row[cx]:
            return 0
        lo = cx
        while lo > 0 and row[lo - 1]:
            lo -= 1
        hi = cx
        while hi < len(row) - 1 and row[hi + 1]:
            hi += 1
        return hi - lo + 1
    # v2.3.1369e (owner: SW f1/f2/f11/f12 "helmet's thick black outline
    # beneath the face"; SW f4-9/f14-18 + east f0/f14 "bare shoulders";
    # east f1 "chestplate invisible"): every shape-based detector (row
    # sum, column-limited sum, center-run pinch, shoulder flare) wobbled
    # between cutting at the chin (helmet remnant survives below the
    # face) and at the shoulders (bare skin in the overlay + armor top
    # erased).  The cut is now a FIXED fraction of the figure — necks
    # live in a narrow band, the per-frame figure top already tracks the
    # run-cycle bob, and one constant is tunable by eye.
    _ = runw  # (kept for potential diagnostics)
    return top + int(round(0.27 * figh)), hx0, hx1


def gen(d):
    b = Image.open(f'public/sprites/player/jog-{d}.png').convert('RGBA')
    fw = b.height
    n = b.width // fw
    a = np.array(b)
    heads = np.zeros_like(a)
    necks = []
    headcols = []
    for i in range(n):
        f = a[:, i * fw:(i + 1) * fw]
        op = f[:, :, 3] > 40
        neck, hx0, hx1 = neck_row(op)
        necks.append(neck)
        if neck is None:
            headcols.append(None)
            continue
        band = op.copy()
        band[neck:] = False
        # v2.3.1369b: clip to the head's columns (+6 slack) — a raised bare
        # arm at head height stays out even when it touches the head blob.
        band[:, :max(0, hx0 - 6)] = False
        band[:, min(fw, hx1 + 7):] = False
        lbl, num = ndimage.label(band)
        if not num:
            headcols.append(None)
            continue
        sizes = ndimage.sum(band, lbl, range(1, num + 1))
        head = lbl == (int(np.argmax(sizes)) + 1)
        headcols.append((hx0, hx1))
        hf = heads[:, i * fw:(i + 1) * fw]
        hf[head] = f[head]
    path = f'public/sprites/player/jog-{d}-head.png'
    Image.fromarray(heads).save(path)

    # helmet erase on the fullset sheet, same detector
    p = f'public/sprites/gear/fullset/steel/jog-{d}.png'
    fs = np.array(Image.open(p).convert('RGBA'))
    ffw = fs.shape[0]
    fn = fs.shape[1] // ffw
    tot = 0
    for i in range(fn):
        bi = min(n - 1, round(i * n / fn))
        if necks[bi] is None or headcols[bi] is None:
            continue
        neck = necks[bi]
        x0, x1 = headcols[bi]
        x0 = max(0, x0 - 4); x1 = min(ffw, x1 + 5)
        ff = fs[:, i * ffw:(i + 1) * ffw]
        cut = np.zeros(ff.shape[:2], bool)
        cut[:neck, x0:x1] = True
        cut &= ff[:, :, 3] > 0
        ff[:, :, 3][cut] = 0
        tot += int(cut.sum())
    Image.fromarray(fs).save(p)
    print(f'{d}: head sheet ({n}f) -> {path}; helmet erased ({tot} px) -> {p}')


def main():
    for d in (sys.argv[1:] or DIRS):
        gen(d)


if __name__ == '__main__':
    main()
