#!/usr/bin/env python3
"""v2.3.1362: import a ChatGPT-textured FULL-SET board into the game.

The owner repaints the mannequin-armored boards (green triangle -> chain) in
ChatGPT and sends back a magenta-background grid of finished armored knights.
This tool magenta-keys each cell, scrubs the purple fringe, scales the figure
to the matching game body frame's bbox height, registers it by silhouette
overlap (import_gear_from_sheet's aligned transform), and ships the result as
public/sprites/gear/fullset/steel/jog-<dir>.png — the sheet entityRenderer's
_fullsetFrame draws INSTEAD of the masked-body bake + chest/legs layers when
the full steel set is worn (v2.3.1361).

The board's frame count must equal the game body cycle's; frames are read
row-major from a uniform grid (cols x rows given or guessed from count).

Usage: python3 tools/import_fullset_board.py <board.png> <dir> <cols>
Do NOT pipe through `head` — SIGPIPE can kill the run before the save.
"""
import os
import sys
import numpy as np
from scipy import ndimage
from PIL import Image

FRAME = 256
MAGENTA = np.array([255, 0, 255])
MAG_TOL = 60


def key_region(reg):
    rgb = reg.astype(int)
    dist = np.sqrt(((rgb - MAGENTA) ** 2).sum(2))
    nonmag = dist > MAG_TOL
    R, G, B = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    purple = (R - G > 32) & (B - G > 32) & (R > 105) & (B > 105)
    return nonmag & ~purple


def overlap(sm, bop, px, py):
    H, W = bop.shape
    sh, sw = sm.shape
    x0, y0 = max(0, px), max(0, py)
    x1, y1 = min(W, px + sw), min(H, py + sh)
    if x1 <= x0 or y1 <= y0:
        return 0
    return int((bop[y0:y1, x0:x1] & sm[y0 - py:y1 - py, x0 - px:x1 - px]).sum())


def main():
    src, d, cols = sys.argv[1], sys.argv[2], int(sys.argv[3])
    im = Image.open(src).convert('RGB')
    a = np.array(im)
    base128 = Image.open(f'public/sprites/player/jog-{d}.png').convert('RGBA')
    n = base128.width // base128.height
    rows = (n + cols - 1) // cols
    cw, ch = im.width // cols, im.height // rows
    base = base128.resize((base128.width * 2, 256), Image.NEAREST)
    out = Image.new('RGBA', (n * 128, 128), (0, 0, 0, 0))
    for i in range(n):
        r, c = divmod(i, cols)
        sub = a[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw]
        mask = ndimage.binary_opening(key_region(sub), iterations=1)
        lbl, num = ndimage.label(mask)
        best, bs = None, 0
        for k in range(1, num + 1):
            s = (lbl == k).sum()
            if s > bs:
                bs, best = s, k
        if best is None or bs < 2000:
            raise SystemExit(f'{d} f{i}: no figure found in cell')
        ys, xs = np.where(lbl == best)
        t, l = ys.min(), xs.min()
        h, w = ys.max() - t + 1, xs.max() - l + 1
        content = np.zeros((h, w, 4), np.uint8)
        content[:, :, :3] = sub[t:t + h, l:l + w]
        content[:, :, 3] = ((lbl[t:t + h, l:l + w] == best) * 255).astype(np.uint8)
        # fringe scrub: desaturate magenta-leaning pixels to their luminance
        cr = content[:, :, 0].astype(int); cg = content[:, :, 1].astype(int); cb = content[:, :, 2].astype(int)
        fr = (content[:, :, 3] > 0) & (cr > cg + 18) & (cb > cg + 18)
        lum = (0.30 * cr + 0.45 * cg + 0.25 * cb).astype(np.uint8)
        for chan in range(3):
            content[:, :, chan][fr] = lum[fr]
        bfr = np.array(base.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME)))
        bop = bfr[:, :, 3] > 40
        byy, bxx = np.where(bop)
        by0, by1 = byy.min(), byy.max()
        s = (by1 - by0) / h
        nw, nh = max(1, round(w * s)), max(1, round(h * s))
        smm = np.array(Image.fromarray(((content[:, :, 3] > 40) * 255).astype(np.uint8), 'L')
                       .resize((nw, nh), Image.NEAREST)) > 40
        sy, sx = np.where(smm)
        px0 = bxx.mean() - sx.mean(); py0 = byy.mean() - sy.mean()
        bestp, bestov = (px0, py0), -1
        for dy in range(-8, 9):
            for dx in range(-8, 9):
                ov = overlap(smm, bop, int(round(px0 + dx)), int(round(py0 + dy)))
                if ov > bestov:
                    bestov, bestp = ov, (px0 + dx, py0 + dy)
        placed = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
        placed.alpha_composite(Image.fromarray(content, 'RGBA').resize((nw, nh), Image.LANCZOS),
                               (int(round(bestp[0])), int(round(bestp[1]))))
        parr = np.array(placed)
        # ship 128: LANCZOS RGB + binary alpha (the belt-sheet hardening lesson)
        cell_rgb = Image.fromarray(parr).resize((128, 128), Image.LANCZOS)
        cell_a = Image.fromarray(parr[:, :, 3], 'L').resize((128, 128), Image.NEAREST)
        cell = np.array(cell_rgb)
        cell[:, :, 3] = np.array(cell_a)
        out.paste(Image.fromarray(cell), (i * 128, 0))
    os.makedirs('public/sprites/gear/fullset/steel', exist_ok=True)
    path = f'public/sprites/gear/fullset/steel/jog-{d}.png'
    out.save(path)
    print(f'{d}: {n} frames imported -> {path}')


if __name__ == '__main__':
    main()
