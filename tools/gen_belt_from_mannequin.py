#!/usr/bin/env python3
"""v2.3.1348: regenerate the jog belt sheets from the ORIGINAL fully-armored
mannequin boards (owner: "The original sprite sheet per direction fully armored
had a green midsection. Go retrieve all of those per direction").

tools/posesheets/jog-<dir>-mannequin-armored.png is the fully-armored figure
with the flat-green mannequin (#00AA46) showing through EXACTLY where the
waist is exposed — and the artist drew the arm OVER the green wherever it
crosses, so the green mask carries the hand-drawn depth the last three
approaches tried to reconstruct.  This tool maps each board cell back onto the
256 body frame with import_gear_from_sheet's ALIGNED transform (detect the
magenta-keyed figure, scale to the body bbox height, register by silhouette
overlap), takes the green pixels in the waist window, fills them with the
chain texture, and writes the belt sheet the masked-body bake paints from
(public/sprites/gear/belt/chainbelt/jog-<dir>.png).

Only directions whose board frame count matches the CURRENT body cycle are
regenerated (south 26 / north 23 / southwest 20).  East (board 25 vs body 28)
and northeast (16 vs 24) are older cycles — their belt sheets stay as-is
(northeast is the owner-approved reference).

Usage: python3 tools/gen_belt_from_mannequin.py [dir ...]
Do NOT pipe through `head` — SIGPIPE can kill the run before the save.
"""
import json
import sys
import numpy as np
from scipy import ndimage
from PIL import Image

FRAME = 256
MAGENTA = np.array([255, 0, 255])
MAG_TOL = 60
ALPHA = 20
DIRS = ['south', 'north', 'southwest']


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


def gen(d):
    meta = json.load(open(f'tools/posesheets/jog-{d}.json'))
    cols, ch_, cw = meta['cols'], meta['cell_h'], meta['cell_w']
    n = meta['n']
    arm = Image.open(f'tools/posesheets/jog-{d}-mannequin-armored.png').convert('RGB')
    arm = np.array(arm.resize((cols * cw, meta['rows'] * ch_), Image.LANCZOS))

    base128 = Image.open(f'public/sprites/player/jog-{d}.png').convert('RGBA')
    bn = base128.width // base128.height
    if bn != n:
        raise SystemExit(f'{d}: board has {n} frames but body sheet has {bn} — '
                         f'older cycle, cannot map (skip this direction)')
    base = base128.resize((base128.width * 2, base128.height * 2), Image.NEAREST)

    chain = Image.open('tools/posesheets/chainbelt.png').convert('RGBA')

    out = Image.new('RGBA', (n * 128, 128), (0, 0, 0, 0))
    stats = []
    for i in range(n):
        r, c = divmod(i, cols)
        ry0 = max(0, r * ch_ - ch_ // 3); ry1 = min(arm.shape[0], (r + 1) * ch_ + ch_ // 3)
        rx0 = max(0, c * cw - cw // 3); rx1 = min(arm.shape[1], (c + 1) * cw + cw // 3)
        sub = arm[ry0:ry1, rx0:rx1]
        mask = ndimage.binary_opening(key_region(sub), iterations=1)
        lbl, num = ndimage.label(mask)
        if num == 0:
            stats.append(0); continue
        ccx = (c + 0.5) * cw - rx0; ccy = (r + 0.5) * ch_ - ry0
        best, bd = None, 1e18
        for k in range(1, num + 1):
            ys, xs = np.where(lbl == k)
            if len(ys) < 300:
                continue
            dd = (xs.mean() - ccx) ** 2 + (ys.mean() - ccy) ** 2
            if dd < bd:
                bd, best = dd, k
        if best is None:
            stats.append(0); continue
        ys, xs = np.where(lbl == best)
        t, l = int(ys.min()), int(xs.min())
        h, w = int(ys.max()) - t + 1, int(xs.max()) - l + 1
        content = np.zeros((h, w, 4), np.uint8)
        content[:, :, :3] = sub[t:t + h, l:l + w]
        content[:, :, 3] = (lbl[t:t + h, l:l + w] == best).astype(np.uint8) * 255

        # aligned placement: scale to the body bbox height, register by overlap
        bfr = np.array(base.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME)))
        bop = bfr[:, :, 3] > 40
        byy, bxx = np.where(bop)
        by0, by1 = int(byy.min()), int(byy.max())
        s = (by1 - by0) / h if h else 1.0
        nw, nh = max(1, round(w * s)), max(1, round(h * s))
        sm = np.array(Image.fromarray(((content[:, :, 3] > 40) * 255).astype(np.uint8), 'L')
                      .resize((nw, nh), Image.NEAREST)) > 40
        sy, sx = np.where(sm)
        px0 = bxx.mean() - sx.mean(); py0 = byy.mean() - sy.mean()
        bestp, bestov = (px0, py0), -1
        for dy in range(-8, 9):
            for dx in range(-8, 9):
                ov = overlap(sm, bop, int(round(px0 + dx)), int(round(py0 + dy)))
                if ov > bestov:
                    bestov, bestp = ov, (px0 + dx, py0 + dy)
        px_, py_ = int(round(bestp[0])), int(round(bestp[1]))
        placed = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
        placed.alpha_composite(
            Image.fromarray(content, 'RGBA').resize((nw, nh), Image.LANCZOS), (px_, py_))
        parr = np.array(placed)

        # THE GREEN MIDSECTION: mannequin #00AA46 showing through the armor,
        # restricted to the waist window (excludes the green neck/face) and
        # clipped to the current body silhouette
        R = parr[:, :, 0].astype(int); G = parr[:, :, 1].astype(int); B = parr[:, :, 2].astype(int)
        green = (parr[:, :, 3] > 40) & (G > 90) & (G > R * 1.6) & (G > B * 1.5)
        figh = by1 - by0
        wlo, whi = by0 + int(0.30 * figh), by0 + int(0.80 * figh)
        green[:wlo] = False
        green[whi:] = False
        green &= bop
        # close pinholes so the chain reads solid across the band
        green = ndimage.binary_closing(green, iterations=1)
        stats.append(int(green.sum()))
        if not green.any():
            continue

        # chain fill: tile at the green band's height, anchored to its bbox
        gys, gxs = np.where(green)
        g0, g1 = int(gys.min()), int(gys.max()) + 1
        gx0 = int(gxs.min())
        bh = max(6, g1 - g0)
        tw = max(1, round(chain.width * bh / chain.height))
        tile = np.array(chain.resize((tw, bh), Image.LANCZOS))
        frame_out = np.zeros((FRAME, FRAME, 4), np.uint8)
        for y, x in zip(gys, gxs):
            sp = tile[(y - g0) % bh, (x - gx0) % tw]
            if sp[3] > 30:
                frame_out[y, x] = (sp[0], sp[1], sp[2], 255)
            else:
                frame_out[y, x] = (20, 22, 26, 255)   # backing: chain reads solid
        # 1px darkened rim so the band has the game's outline style
        op_ = frame_out[:, :, 3] > 0
        rim = op_ & ~ndimage.binary_erosion(op_, iterations=1)
        for ch2 in range(3):
            frame_out[:, :, ch2][rim] = (frame_out[:, :, ch2][rim] * 0.45).astype(np.uint8)

        cell = Image.fromarray(frame_out).resize((128, 128), Image.NEAREST)
        out.paste(cell, (i * 128, 0))

    path = f'public/sprites/gear/belt/chainbelt/jog-{d}.png'
    out.save(path)
    print(f'{d}: green px per frame (256-space) {stats[:8]}... -> {path}')


def main():
    for d in (sys.argv[1:] or DIRS):
        gen(d)


if __name__ == '__main__':
    main()
