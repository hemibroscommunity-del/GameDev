"""Fill spurious interior transparency in the opaque player/armour jog sheets.

The jog gear sheets (derived from video via the pose-sheet diff + edge-flood bg
removal) occasionally leave a fully-ENCLOSED transparent gash inside the solid
figure -- e.g. a see-through slit in the steel forearm on a few south frames
(f11/f14/f22).  In motion this reads as "hands flickering transparent".

A hole is "interior" only if its transparent region does NOT connect to the
frame border (4-connectivity).  Real arm/torso gaps open to the silhouette edge
and are therefore excluded automatically.  As a second safeguard we skip any
enclosed region larger than --max-hole px (a genuinely large enclosed pocket is
more likely real geometry than an artifact).

Filled pixels get alpha=255 and RGB copied from the nearest opaque pixel
(distance-transform inpaint), so the patch matches the surrounding metal.

Usage: python tools/fill_interior_holes.py <sheet.png> [more.png ...] [--max-hole N] [--dry-run]
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

FRAME = 256


def fill_frame(arr, max_hole):
    """arr: HxWx4 uint8 for ONE frame. Returns (arr, filled_px)."""
    a = arr[:, :, 3]
    op = a > 128
    bg = ~op
    lbl, nlab = ndimage.label(bg)
    if nlab == 0:
        return arr, 0
    border = set(np.unique(np.concatenate([lbl[0], lbl[-1], lbl[:, 0], lbl[:, -1]])))
    fill_mask = np.zeros_like(bg)
    for comp in range(1, nlab + 1):
        if comp in border:
            continue
        region = lbl == comp
        if region.sum() > max_hole:
            continue  # too big -> likely real, leave it
        fill_mask |= region
    n = int(fill_mask.sum())
    if n == 0:
        return arr, 0
    # inpaint RGB from nearest opaque pixel
    idx = ndimage.distance_transform_edt(~op, return_distances=False, return_indices=True)
    src = arr[idx[0], idx[1]]
    arr[fill_mask] = src[fill_mask]
    arr[fill_mask, 3] = 255
    return arr, n


def process(path, max_hole, dry):
    im = np.array(Image.open(path).convert('RGBA'))
    n = im.shape[1] // FRAME
    total = 0
    hits = []
    for i in range(n):
        sl = im[:, i * FRAME:(i + 1) * FRAME]
        _, f = fill_frame(sl, max_hole)
        if f:
            hits.append((i, f)); total += f
    tag = '(dry-run) ' if dry else ''
    print(f"{tag}{path}: {n} frames, filled {total}px across {len(hits)} frames {hits}")
    if total and not dry:
        Image.fromarray(im).save(path)


if __name__ == '__main__':
    args = sys.argv[1:]
    max_hole = 400
    dry = False
    paths = []
    i = 0
    while i < len(args):
        if args[i] == '--max-hole':
            max_hole = int(args[i + 1]); i += 2
        elif args[i] == '--dry-run':
            dry = True; i += 1
        else:
            paths.append(args[i]); i += 1
    for p in paths:
        process(p, max_hole, dry)
