"""
Outline-aware nearest-neighbor downscale + exact-magenta kill.

Why this exists:
  A 540x540 native frame downscaled to 64x64 by nearest-neighbor
  samples ~1 pixel per 8x8 source block.  A 2-3 px thick outline
  at native res occupies ~25-40% of a typical edge block, so the
  sampler frequently picks an INTERIOR pixel and the outline goes
  missing in the output.  User-reported "the black outline keeps
  getting eaten."

Approach:
  1. Detect outline pixels at native resolution (dark + opaque).
  2. For each output cell, look at the corresponding native block:
     - If ANY pixel in the block is outline -> output is the
       DARKEST pixel from that block (so the actual outline color
       is used, not pure black; preserves dark-brown / sepia
       outlines too).
     - Else -> use nearest-neighbor sampling as usual (top-left
       of block).
  3. After the per-block pass, exact-match (255, 0, 255) -> (0,0,0,0)
     to kill the magenta bg the upstream recolor step painted.

This guarantees every output cell that contained outline in the
native source contains outline in the output -- no gaps possible.

Usage:
  python tools/outline_aware_downscale.py IN.png OUT.png
      --height 64 [--outline-lum 100]
"""

import argparse
import numpy as np
from PIL import Image


def lum_arr(arr):
    r = arr[..., 0].astype(np.int32)
    g = arr[..., 1].astype(np.int32)
    b = arr[..., 2].astype(np.int32)
    return (299 * r + 587 * g + 114 * b) // 1000


def main():
    p = argparse.ArgumentParser()
    p.add_argument("in_path")
    p.add_argument("out_path")
    p.add_argument("--height", type=int, required=True)
    p.add_argument("--outline-lum", type=int, default=100,
                   help="pixels darker than this (and a>0) are outline; "
                        "raise if your outline isn't getting caught")
    args = p.parse_args()

    img = Image.open(args.in_path).convert("RGBA")
    arr = np.array(img)
    H, W = arr.shape[:2]

    new_H = args.height
    new_W = max(1, round(W * new_H / H))

    lum = lum_arr(arr)
    alpha = arr[..., 3]
    is_outline = (alpha > 0) & (lum < args.outline_lum)

    out_arr = np.zeros((new_H, new_W, 4), dtype=np.uint8)

    # Per-block sampling.  Integer slicing into the native array using
    # the proportional block ranges; small loops are fine at 64-tall.
    outline_cells = 0
    for ny in range(new_H):
        y0 = (ny * H) // new_H
        y1 = ((ny + 1) * H) // new_H
        if y1 <= y0:
            y1 = y0 + 1
        for nx in range(new_W):
            x0 = (nx * W) // new_W
            x1 = ((nx + 1) * W) // new_W
            if x1 <= x0:
                x1 = x0 + 1

            block_outline = is_outline[y0:y1, x0:x1]
            if block_outline.any():
                # Pick the DARKEST outline pixel in the block so the
                # output reflects the source's actual outline color.
                block_lum = lum[y0:y1, x0:x1]
                # Mask non-outline to a high value so argmin picks outline.
                masked = np.where(block_outline, block_lum, 10_000)
                idx = np.unravel_index(np.argmin(masked), masked.shape)
                px = arr[y0 + idx[0], x0 + idx[1]]
                out_arr[ny, nx] = px
                outline_cells += 1
            else:
                # Nearest-neighbor: top-left of block.
                out_arr[ny, nx] = arr[y0, x0]

    # Exact-magenta kill.
    r = out_arr[..., 0]
    g = out_arr[..., 1]
    b = out_arr[..., 2]
    mag = (r == 255) & (g == 0) & (b == 255)
    out_arr[mag] = [0, 0, 0, 0]

    Image.fromarray(out_arr).save(args.out_path)
    print(f"{args.in_path} -> {args.out_path}: {new_W}x{new_H}, "
          f"{outline_cells} outline-forced cells, "
          f"{int(mag.sum())} magenta cells keyed")


if __name__ == "__main__":
    main()
