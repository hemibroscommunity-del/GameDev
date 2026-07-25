#!/usr/bin/env python3
"""Remove the gray-matte fringe baked into anti-aliased sprite/icon edges.

v2.3.1452 (owner: "the pickup animation has noticeable grayish outlines
around the frames ... some inventory icons have gray near the edges").
Root cause: the affected art was anti-aliased against a GRAY background,
so its semi-transparent edge ring blends toward gray instead of the
sprite's own edge color — on screen that ring composites as a gray halo
around every frame/icon, whatever it's drawn over.  The v2.3.1325 icon
batch (/icons/items/*.webp) and the loot-pickup player sheets all carry
it (measured: 25-38%% of each icon's AA pixels are "foreign gray" —
grayish AND far from the color of the nearest opaque pixel; the pickup
body sheet has ~13k gray semi pixels at mean RGB ~117 over skin/pants
colors it doesn't match).

Fix (standard de-matte): every semi-transparent pixel keeps its ALPHA
(the edge stays smooth) but takes the RGB of the nearest opaque pixel,
so the ramp blends sprite-color -> transparent instead of
gray -> transparent.  Fully-transparent pixels within BLEED px of the
silhouette get the same color (defensive: bilinear sampling can touch
them; alpha stays 0 so nothing becomes visible).  Geometry, alpha and
frame anchors are untouched — safe for the masked-body/retint pipelines.

Usage:
  python3 tools/defringe_gray.py file.png file.webp ...     (in place)
  python3 tools/defringe_gray.py --dry-run ...              (report only)

.webp saves are LOSSLESS (flat-color art; avoids recompression loss).
"""
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt, binary_dilation

BLEED = 2          # px of color bleed into fully-transparent neighbors
OPAQUE_MIN = 200   # alpha floor for "trust this pixel's color"


def defringe(path, dry):
    im = Image.open(path)
    fmt = (im.format or '').upper()
    im = im.convert('RGBA')
    a = np.asarray(im).copy()
    al = a[:, :, 3]
    solid = al >= OPAQUE_MIN
    semi = (al > 0) & (al < 255) & ~solid
    if not solid.any() or not semi.any():
        print(f"skip  {path}  (no solid/semi pixels)")
        return False
    # Nearest solid pixel for every position (EDT indices).
    _, idx = distance_transform_edt(~solid, return_indices=True)
    near_rgb = a[idx[0], idx[1], :3]
    changed = semi.copy()
    # Color bleed ring: transparent pixels near the silhouette.
    ring = (al == 0) & binary_dilation(al > 0, iterations=BLEED)
    changed |= ring
    diff = np.abs(a[:, :, :3].astype(int) - near_rgb.astype(int)).mean(2)
    n_semi, n_ring = int(semi.sum()), int(ring.sum())
    n_moved = int((changed & (diff > 8)).sum())
    if dry:
        print(f"dry   {path}  semi={n_semi} ring={n_ring} would-recolor={n_moved}")
        return False
    a[:, :, :3] = np.where(changed[:, :, None], near_rgb, a[:, :, :3])
    out = Image.fromarray(a, 'RGBA')
    if fmt == 'WEBP' or path.lower().endswith('.webp'):
        out.save(path, 'WEBP', lossless=True, method=6)
    else:
        out.save(path, optimize=True)
    print(f"fixed {path}  semi={n_semi} ring={n_ring} recolored(diff>8)={n_moved}")
    return True


def main():
    args = [x for x in sys.argv[1:] if x != '--dry-run']
    dry = '--dry-run' in sys.argv
    if not args:
        print(__doc__)
        sys.exit(1)
    n = 0
    for p in args:
        try:
            if defringe(p, dry):
                n += 1
        except Exception as e:
            print(f"ERROR {p}: {e}")
            sys.exit(1)
    print(f"{n} file(s) rewritten")


if __name__ == '__main__':
    main()
