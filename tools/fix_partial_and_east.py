#!/usr/bin/env python3
"""v2.3.1373: two owner reports from the v2.3.1372 preview.

1. "South Jog torso only has a few frames where it might be showing tan
   belly" — chest-only wear shows the shirtless body's midriff between the
   cuirass hem belt and the trouser waist on frames where the run-cycle bob
   raises the hem.  Fix in the ART (the renderer's chain paint is full-set-
   only by design since v2.3.1372): extend each frame's hem-belt bottom edge
   downward a few px, clipped to the body silhouette, so the belt always
   meets the trousers.  Central columns only — gauntlets/arms at the figure's
   edges are untouched.  Applied to the non-profile dirs (south/southwest/
   north); east keeps its approved look (the crossing arm makes any hem
   extension risky there).

2. "East jog fully armored still looks like too thick of black outlines" —
   the east board's line art circles every armor segment in near-black, and
   on the narrow profile figure those seams read as thick outlines.  Lift
   INTERIOR dark pixels toward the soft gray the south/north boards use;
   the 1px silhouette rim (approved in v2.3.1371) is left alone.

Usage: python3 tools/fix_partial_and_east.py
Do NOT pipe through `head` — SIGPIPE can kill the run before the save.
"""
import numpy as np
from PIL import Image

HEM_DIRS = ['south', 'southwest', 'north']
HEM_EXT = 9          # px (128-space) the hem belt may extend down
CENTER_BAND = 0.85   # central fraction of the figure's columns eligible


def extend_hem(d):
    """Fill the belly gap by extending each column's hem-belt bottom pixel
    down over SKIN-classified body pixels only — the fill stops at the
    trousers by itself, and gauntlet columns stop immediately (below a fist
    is background or pants, never a skin run)."""
    p = f'public/sprites/gear/chest/steelplate/jog-{d}.png'
    g = np.array(Image.open(p).convert('RGBA'))
    b = np.array(Image.open(f'public/sprites/player/jog-{d}.png').convert('RGBA'))
    fw = g.shape[0]
    n = g.shape[1] // fw
    bn = b.shape[1] // b.shape[0]
    tot = 0
    for i in range(min(n, bn)):
        gf = g[:, i * fw:(i + 1) * fw]
        bf = b[:, i * fw:(i + 1) * fw]
        gop = gf[:, :, 3] > 40
        if not gop.any():
            continue
        R = bf[:, :, 0].astype(int)
        G = bf[:, :, 1].astype(int)
        B = bf[:, :, 2].astype(int)
        A = bf[:, :, 3] > 40
        # relaxed skin + the body's own dark waistband — both read as a
        # "tan belly" / "sudden black" flash between hem and trousers
        skin = (A & (R > 100) & (R > G + 18) & (G > B + 5)) \
            | (A & (np.maximum(np.maximum(R, G), B) < 80) & (R >= G))
        xs = np.where(gop.any(axis=0))[0]
        x0, x1 = xs.min(), xs.max()
        cx0 = int(x0 + (x1 - x0) * (0.5 - CENTER_BAND / 2))
        cx1 = int(x0 + (x1 - x0) * (0.5 + CENTER_BAND / 2))
        bot = np.where(gop.any(axis=1))[0].max()
        for x in range(cx0, cx1 + 1):
            col = np.where(gop[:, x])[0]
            if not len(col):
                continue
            y0 = col.max()
            # only columns whose art reaches the hem region (skip pauldrons
            # whose lowest pixel is far above the belt line)
            if y0 < bot - 8:
                continue
            src = gf[y0, x].copy()
            for k in range(1, HEM_EXT + 1):
                y = y0 + k
                if y >= fw or gf[y, x, 3] > 40 or not skin[y, x]:
                    break
                gf[y, x] = src
                gf[y, x, 3] = 255
                tot += 1
    Image.fromarray(g).save(p)
    print(f'{d}: hem extended over skin gap ({tot} px) -> {p}')


def soften_east():
    p = 'public/sprites/gear/fullset/steel/jog-east.png'
    a = np.array(Image.open(p).convert('RGBA'))
    op = a[:, :, 3] > 40
    pad = np.pad(op, 1)
    nb = pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:]
    interior = op & nb                     # silhouette rim excluded
    f = a[:, :, :3].astype(float)
    lum = 0.3 * f[:, :, 0] + 0.45 * f[:, :, 1] + 0.25 * f[:, :, 2]
    dark = interior & (lum < 75)
    # lift toward steel gray (90,94,102); deeper darks lift hardest so the
    # near-black seams soften while already-soft shading barely moves.
    # 0.30 = "just a tad" (owner dialed the first 0.55 pass back)
    k = np.clip((75 - lum) / 75, 0, 1) * 0.30
    target = np.array([90.0, 94.0, 102.0])
    for c in range(3):
        ch = f[:, :, c]
        ch[dark] = ch[dark] + (target[c] - ch[dark]) * k[dark]
    a[:, :, :3] = np.clip(f, 0, 255).astype(np.uint8)
    Image.fromarray(a).save(p)
    print(f'east: {int(dark.sum())} interior dark px softened -> {p}')


def neutralize_stand_greaves():
    """v2.3.1373 (owner: legs-only idle south "a strip of line appears above
    the waist and through the shirt"): the STAND greaves sheets carry reddish
    pixels in their top rows that draw OVER the tee hem (the legs layer sits
    above the shirt layer) and read as a red strip.  Recolor them to the
    quiet under-armor steel.  WEBP-TWIN TRAP: the loader prefers the .webp
    twin, so regen it (tools/webp_convert.mjs --format webp --q 80) after
    ANY stand-sheet edit or the PNG change silently never renders."""
    from scipy import ndimage  # noqa: F401  (parity with sibling tools)
    for d in ['south', 'east', 'north', 'northeast', 'southwest']:
        p = f'public/sprites/gear/legs/steelgreaves/stand-{d}.png'
        a = np.array(Image.open(p).convert('RGBA'))
        fw = a.shape[0]
        n = a.shape[1] // fw
        tot = 0
        for i in range(n):
            f = a[:, i * fw:(i + 1) * fw]
            op = f[:, :, 3] > 40
            if not op.any():
                continue
            top = np.where(op.any(axis=1))[0].min()
            band = slice(top, min(fw, top + 5))
            R = f[band, :, 0].astype(int)
            G = f[band, :, 1].astype(int)
            B = f[band, :, 2].astype(int)
            red = (f[band, :, 3] > 40) & (R > G + 10) & (G < 70) & (B < 70)
            for ch, v in zip(range(3), (44, 47, 54)):
                f[band, :, ch][red] = v
            tot += int(red.sum())
        Image.fromarray(a).save(p)
        print(f'{d}: {tot} red top-edge px neutralized -> {p}')


if __name__ == '__main__':
    for d in HEM_DIRS:
        extend_hem(d)
    soften_east()
    neutralize_stand_greaves()
