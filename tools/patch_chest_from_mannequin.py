#!/usr/bin/env python3
"""v2.3.1348b: restore the LOWER PLATE / hip skirt from the original
fully-armored mannequin boards.

The boards (tools/posesheets/jog-<dir>-mannequin-armored.png) show the armor
reaching down to the green waist trunks; the ChatGPT slot separation lost that
lower section, so the shipped chest sheets end higher and the seam between
plate and greaves is taller than the source art intended (the baked chain
band used to hide the difference).  This tool maps each board frame onto the
256 body grid (same aligned transform as gen_belt_from_mannequin /
import_gear_from_sheet), takes the ARMOR pixels (figure minus the green
trunks) in the waist region, and merges them into the chest sheet ONLY where
it is currently transparent — existing art is never touched.

Directions: south / north / southwest (the boards that match today's frame
cycles).  Run BEFORE gen_belt_from_mannequin (v2.3.1349b): the belt tool
reads the FINAL chest sheet to chain-fill exactly what stays exposed.

Usage: python3 tools/patch_chest_from_mannequin.py [dir ...]
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


def patch(d):
    meta = json.load(open(f'tools/posesheets/jog-{d}.json'))
    cols, ch_, cw = meta['cols'], meta['cell_h'], meta['cell_w']
    n = meta['n']
    arm = Image.open(f'tools/posesheets/jog-{d}-mannequin-armored.png').convert('RGB')
    arm = np.array(arm.resize((cols * cw, meta['rows'] * ch_), Image.LANCZOS))

    base128 = Image.open(f'public/sprites/player/jog-{d}.png').convert('RGBA')
    if base128.width // base128.height != n:
        raise SystemExit(f'{d}: board frame count mismatch')
    base = base128.resize((base128.width * 2, base128.height * 2), Image.NEAREST)

    chest_p = f'public/sprites/gear/chest/steelplate/jog-{d}.png'
    chest128 = Image.open(chest_p).convert('RGBA')
    chest = np.array(chest128.resize((chest128.width * 2, 256), Image.NEAREST))
    merge_mask = np.zeros(chest.shape[:2], bool)

    added_tot = 0
    for i in range(n):
        r, c = divmod(i, cols)
        ry0 = max(0, r * ch_ - ch_ // 3); ry1 = min(arm.shape[0], (r + 1) * ch_ + ch_ // 3)
        rx0 = max(0, c * cw - cw // 3); rx1 = min(arm.shape[1], (c + 1) * cw + cw // 3)
        sub = arm[ry0:ry1, rx0:rx1]
        mask = ndimage.binary_opening(key_region(sub), iterations=1)
        lbl, num = ndimage.label(mask)
        if num == 0:
            continue
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
            continue
        ys, xs = np.where(lbl == best)
        t, l = int(ys.min()), int(xs.min())
        h, w = int(ys.max()) - t + 1, int(xs.max()) - l + 1
        content = np.zeros((h, w, 4), np.uint8)
        content[:, :, :3] = sub[t:t + h, l:l + w]
        content[:, :, 3] = (lbl[t:t + h, l:l + w] == best).astype(np.uint8) * 255

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
        placed = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
        placed.alpha_composite(
            Image.fromarray(content, 'RGBA').resize((nw, nh), Image.LANCZOS),
            (int(round(bestp[0])), int(round(bestp[1]))))
        parr = np.array(placed)

        # armor = figure minus the green trunks.  v2.3.1348c: NO dilation on
        # the exclusion — dilating by 2 left a 2px unfilled ring between the
        # skirt and the trunks, which the game's erase turned into a hole
        # ring around the chain on every frame ("bad holes while jogging").
        # The trunks' own dark outline pixels count as armor and form the
        # boundary, as drawn.
        R = parr[:, :, 0].astype(int); G = parr[:, :, 1].astype(int); B = parr[:, :, 2].astype(int)
        green = (parr[:, :, 3] > 40) & (G > 80) & (G > R + 25) & (G > B + 20)
        green = ndimage.binary_closing(green, iterations=2)
        armor = (parr[:, :, 3] > 40) & ~green
        # v2.3.1349b (owner: "black superhero underwear"): the boards draw a
        # big DARK shadow region around/under the trunks (50-65 warm gray).
        # Merging it as armor put black bars in the CHEST layer, drawn over
        # everything — no belt/bake change could remove them.  Merge BRIGHT
        # armor only; gen_belt_from_mannequin (run AFTER this tool) chain-
        # fills whatever the final chest+greaves leave exposed, so the
        # dropped shadow renders as mail, never as a flat dark band.
        armor &= np.maximum(np.maximum(R, G), B) >= 70

        # waist region only: from a bit above the current plate bottom down to
        # the greaves top area — we're restoring the hip skirt, nothing else
        figh = by1 - by0
        wlo = by0 + int(0.38 * figh)
        whi = by0 + int(0.72 * figh)
        cfr = chest[:, i * FRAME:(i + 1) * FRAME]
        fill = armor.copy()
        fill[:wlo] = False
        fill[whi:] = False
        fill &= (cfr[:, :, 3] <= ALPHA)     # only where the chest sheet is empty
        fill &= bop                          # stay on the figure
        # despeckle the merge so isolated drift pixels don't ghost
        lbl2, num2 = ndimage.label(fill)
        for k in range(1, num2 + 1):
            m2 = lbl2 == k
            if m2.sum() < 12:
                fill[m2] = False
        cfr[:, :, 0][fill] = parr[:, :, 0][fill]
        cfr[:, :, 1][fill] = parr[:, :, 1][fill]
        cfr[:, :, 2][fill] = parr[:, :, 2][fill]
        cfr[:, :, 3][fill] = 255
        merge_mask[:, i * FRAME:(i + 1) * FRAME] |= ndimage.binary_dilation(fill, iterations=1)
        added_tot += int(fill.sum())

    # v2.3.1348c: the trunks' anti-aliased edges fall below the green test and
    # merged as "armor" — a green rim around the chain in-game.  Desaturate
    # any greenish merged pixel to its own luminance (steel gray).
    # v2.3.1349b: generalized to ANY high-chroma merged pixel — the magenta
    # key's purple fringe and the mannequin's yellow-green AA both leaked
    # through as colored flecks on the thigh edges (SW f10/f11).  Steel is
    # desaturated by nature, so chroma in the merge is always board bleed.
    mr, mg, mb = (chest[:, :, 0].astype(int), chest[:, :, 1].astype(int),
                  chest[:, :, 2].astype(int))
    chroma = np.maximum(np.maximum(np.abs(mr - mg), np.abs(mg - mb)), np.abs(mr - mb))
    tinted = merge_mask & (chest[:, :, 3] > 0) & (((mg > mr + 8) & (mg > mb + 4)) | (chroma > 24))
    lum = (0.30 * mr + 0.45 * mg + 0.25 * mb).astype(np.uint8)
    for ch2 in range(3):
        chest[:, :, ch2][tinted] = lum[tinted]

    # v2.3.1348c: HARDEN the ship-size downscale IN THE MERGED REGION ONLY.
    # A plain LANCZOS resize left the merged skirt with semi-transparent
    # alpha — the game alpha-blends those with the erased body behind =
    # see-through patches (the v2.3.1344 belt-hardening lesson; northeast's
    # binary alpha is the reference).  RGB downscales LANCZOS for quality;
    # alpha inside the merge zone is thresholded to binary; the original
    # plate's soft edges elsewhere are untouched.
    small = Image.fromarray(chest).resize((chest128.width, chest128.height), Image.LANCZOS)
    sa = np.array(small)
    mm = np.array(Image.fromarray((merge_mask * 255).astype(np.uint8), 'L')
                  .resize((chest128.width, chest128.height), Image.NEAREST)) > 0
    hard = np.where(sa[:, :, 3] >= 100, 255, 0).astype(np.uint8)
    sa[:, :, 3] = np.where(mm, hard, sa[:, :, 3])
    Image.fromarray(sa).save(chest_p)
    print(f'{d}: {added_tot}px lower-plate restored (256-space) -> {chest_p}')


def main():
    for d in (sys.argv[1:] or DIRS):
        patch(d)


if __name__ == '__main__':
    main()
