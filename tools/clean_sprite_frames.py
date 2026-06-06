"""Despeckle (remove floating pixel islands) + fill enclosed transparent holes,
per frame, for the armour sheets.

Floaters: pixels detached from the main body silhouette -- the stray chunks
near the waist and the specks that "clip" around the hands.  Detected by
connected-component labelling on alpha>0 (8-connectivity); the largest component
is the body.  A detached component is removed (alpha->0, fringe included) when
its size is below --island-max, or always when --remove-all-islands.

Holes: transparent regions fully ENCLOSED by opaque armour (a region of
alpha<128 not connected to the frame border).  Filled up to --max-hole px,
RGB inpainted from the nearest opaque pixel.

--protect-top FRAC shields the top FRAC of the silhouette height from BOTH
operations -- used on the legs so the legitimate waist gap and hip plates
(covered by the chest+belt in the composite) are never touched.

Usage:
  python tools/clean_sprite_frames.py [opts] sheet.png ...
    --remove-all-islands | --island-max N   (default island-max 0 = no despeckle)
    --max-hole N        fill enclosed holes up to N px (default 0 = no fill)
    --protect-top F     protect top F of silhouette (default 0)
    --dry-run
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

FRAME = 256


def clean_frame(arr, island_max, remove_all, max_hole, protect_top):
    a = arr[:, :, 3]
    any_op = a > 0
    rows = np.where(any_op.any(axis=1))[0]
    if not len(rows):
        return 0, 0
    y0, y1 = int(rows.min()), int(rows.max())
    waist = y0 + protect_top * (y1 - y0 + 1)
    removed = filled = 0

    # --- despeckle ---
    if remove_all or island_max > 0:
        lbl, nl = ndimage.label(any_op, structure=np.ones((3, 3)))
        if nl > 1:
            sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, nl + 1))
            main = int(np.argmax(sizes)) + 1
            ys = ndimage.center_of_mass(any_op, lbl, range(1, nl + 1))
            for k in range(1, nl + 1):
                if k == main:
                    continue
                cy = ys[k - 1][0]
                if protect_top and cy < waist:
                    continue
                sz = int(sizes[k - 1])
                if remove_all or sz <= island_max:
                    arr[lbl == k] = [0, 0, 0, 0]
                    removed += sz

    # --- hole fill ---
    if max_hole > 0:
        op = arr[:, :, 3] > 128
        bg = ~op
        hl, hn = ndimage.label(bg)
        border = set(np.unique(np.concatenate([hl[0], hl[-1], hl[:, 0], hl[:, -1]])))
        fill_mask = np.zeros_like(bg)
        if hn:
            com = ndimage.center_of_mass(bg, hl, range(1, hn + 1))
        for c in range(1, hn + 1):
            if c in border:
                continue
            region = hl == c
            if region.sum() > max_hole:
                continue
            if protect_top and com[c - 1][0] < waist:
                continue
            fill_mask |= region
        if fill_mask.any():
            idx = ndimage.distance_transform_edt(~op, return_distances=False, return_indices=True)
            src = arr[idx[0], idx[1]]
            arr[fill_mask] = src[fill_mask]
            arr[fill_mask, 3] = 255
            filled = int(fill_mask.sum())
    return removed, filled


def process(path, island_max, remove_all, max_hole, protect_top, dry):
    im = np.array(Image.open(path).convert('RGBA'))
    n = im.shape[1] // FRAME
    R = F = 0
    fr = []
    for i in range(n):
        sl = im[:, i * FRAME:(i + 1) * FRAME]
        r, f = clean_frame(sl, island_max, remove_all, max_hole, protect_top)
        if r or f:
            fr.append((i, r, f)); R += r; F += f
    print(f"{'(dry) ' if dry else ''}{path}: removed {R}px floaters, filled {F}px holes  {fr}")
    if (R or F) and not dry:
        Image.fromarray(im).save(path)


if __name__ == '__main__':
    a = sys.argv[1:]
    island_max = 0; remove_all = False; max_hole = 0; protect_top = 0.0; dry = False; paths = []
    i = 0
    while i < len(a):
        t = a[i]
        if t == '--island-max': island_max = int(a[i + 1]); i += 2
        elif t == '--remove-all-islands': remove_all = True; i += 1
        elif t == '--max-hole': max_hole = int(a[i + 1]); i += 2
        elif t == '--protect-top': protect_top = float(a[i + 1]); i += 2
        elif t == '--dry-run': dry = True; i += 1
        else: paths.append(t); i += 1
    for p in paths:
        process(p, island_max, remove_all, max_hole, protect_top, dry)
