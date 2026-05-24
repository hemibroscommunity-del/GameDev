"""
High-quality LANCZOS downscale + explicit outline overlay.

Lanczos alone gives smooth anti-aliased figures but a thin native
outline (2-3 px) gets averaged away during 8x downscale.  This tool
runs Lanczos AND a parallel outline-preservation pass, then composites
them so the figure body is smoothly rendered AND the outline is
guaranteed visible.

Pipeline:
  1. Detect bg pixels (whitish/gray) -> alpha 0.
  2. Detect outline pixels (dark + opaque) at native res -> save mask.
  3. Premultiplied LANCZOS downscale of the alpha-keyed image.
  4. Outline mask downscale: for each output cell, True if ANY native
     pixel in its source block is outline.  Where True, draw a pixel
     at the AVERAGE outline color from the block (preserves dark-brown
     outlines).  Where False, the Lanczos pixel is used as-is.
  5. Save.

Usage:
  python tools/lanczos_with_outline.py IN.png OUT.png --height 64
"""

import argparse
import numpy as np
from PIL import Image


def lum_arr(arr):
    r = arr[..., 0].astype(np.int32)
    g = arr[..., 1].astype(np.int32)
    b = arr[..., 2].astype(np.int32)
    return (299 * r + 587 * g + 114 * b) // 1000


def lanczos_premul(arr_rgba, new_h, new_w):
    """LANCZOS resize with premultiplied alpha."""
    f = arr_rgba.astype(np.float32) / 255.0
    a = f[..., 3:4]
    pre = np.empty_like(f)
    pre[..., :3] = f[..., :3] * a
    pre[..., 3:4] = a
    pre_u8 = (pre * 255).clip(0, 255).astype(np.uint8)
    img = Image.fromarray(pre_u8, mode="RGBA")
    img = img.resize((new_w, new_h), Image.LANCZOS)
    r = np.array(img).astype(np.float32) / 255.0
    ar = r[..., 3:4]
    safe = np.where(ar > 0, ar, 1.0)
    out = np.empty_like(r)
    out[..., :3] = r[..., :3] / safe
    out[..., 3:4] = ar
    return (np.clip(out, 0, 1) * 255).astype(np.uint8)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("in_path")
    p.add_argument("out_path")
    p.add_argument("--height", type=int, required=True)
    p.add_argument("--bg-lum", type=int, default=200)
    p.add_argument("--bg-sat", type=int, default=30)
    p.add_argument("--outline-lum", type=int, default=100,
                   help="pixels darker than this (and opaque, non-bg) "
                        "are outline; force-preserved through downscale")
    args = p.parse_args()

    img = Image.open(args.in_path).convert("RGBA")
    arr = np.array(img)
    H, W = arr.shape[:2]

    # 1. Detect bg, set alpha=0.
    r = arr[..., 0].astype(np.int32)
    g = arr[..., 1].astype(np.int32)
    b = arr[..., 2].astype(np.int32)
    max_ch = np.maximum(np.maximum(r, g), b)
    min_ch = np.minimum(np.minimum(r, g), b)
    is_bg = (max_ch >= args.bg_lum) & ((max_ch - min_ch) <= args.bg_sat)
    arr[..., 3] = np.where(is_bg, 0, arr[..., 3])

    # 2. Detect outline at native res.
    lum = lum_arr(arr)
    is_outline = (arr[..., 3] > 0) & (lum < args.outline_lum)
    outline_count_native = int(is_outline.sum())

    # 3. LANCZOS downscale (premultiplied).
    new_H = args.height
    new_W = max(1, round(W * new_H / H))
    out = lanczos_premul(arr, new_H, new_W)

    # 4. Outline overlay.  Per output cell, if any source pixel was
    # outline, replace the lanczos result with the average outline
    # color from the block (and full alpha).
    overlay_count = 0
    for ny in range(new_H):
        y0 = (ny * H) // new_H
        y1 = max(y0 + 1, ((ny + 1) * H) // new_H)
        for nx in range(new_W):
            x0 = (nx * W) // new_W
            x1 = max(x0 + 1, ((nx + 1) * W) // new_W)
            block_out = is_outline[y0:y1, x0:x1]
            if block_out.any():
                ys, xs = np.where(block_out)
                colors = arr[y0:y1, x0:x1][ys, xs, :3].astype(np.int32)
                avg = colors.mean(axis=0).astype(np.uint8)
                out[ny, nx, :3] = avg
                out[ny, nx, 3] = 255
                overlay_count += 1

    Image.fromarray(out).save(args.out_path)
    print(f"{args.in_path} -> {args.out_path}: "
          f"{W}x{H} -> {new_W}x{new_H}, "
          f"lanczos+outline (native outline px={outline_count_native}, "
          f"output outline cells={overlay_count})")


if __name__ == "__main__":
    main()
