"""
High-quality LANCZOS downscale with proper alpha handling.

Pipeline:
  1. Detect bg pixels (near-grayscale, high luminance) and set their
     alpha to 0.  Figure pixels (saturated) and outline pixels (dark)
     stay at alpha=255.
  2. Premultiply alpha so the LANCZOS resize doesn't bleed bg color
     into figure edges.  (Straight per-channel resize on un-premul
     RGBA mixes bg-RGB with figure-RGB at the boundary, producing
     washed-out edges.)
  3. LANCZOS resize to target height (width scales proportionally).
  4. Un-premultiply alpha.
  5. Save.

This replaces the nearest-neighbor cascade with a proper sinc-based
filter, which is the standard high-quality answer for an 8x or
greater downscale.  Output has smooth anti-aliased edges instead of
sparse-sampled outline gaps.

Usage:
  python tools/lanczos_downscale.py IN.png OUT.png --height 64
"""

import argparse
import numpy as np
from PIL import Image


def main():
    p = argparse.ArgumentParser()
    p.add_argument("in_path")
    p.add_argument("out_path")
    p.add_argument("--height", type=int, required=True)
    p.add_argument("--bg-lum", type=int, default=200,
                   help="min max-channel for bg detection")
    p.add_argument("--bg-sat", type=int, default=30,
                   help="max channel range for bg detection")
    p.add_argument("--scrub-floor", action="store_true",
                   help="zero medium-gray low-sat pixels in the bottom "
                        "40%% of each frame (use for sources with an AI-"
                        "drawn ground-shadow under the figure's feet "
                        "that the bg-detect threshold misses)")
    args = p.parse_args()

    img = Image.open(args.in_path).convert("RGBA")
    arr = np.array(img)
    H, W = arr.shape[:2]

    # 1. Detect bg + set alpha to 0.
    r = arr[..., 0].astype(np.int32)
    g = arr[..., 1].astype(np.int32)
    b = arr[..., 2].astype(np.int32)
    max_ch = np.maximum(np.maximum(r, g), b)
    min_ch = np.minimum(np.minimum(r, g), b)
    is_bg = (max_ch >= args.bg_lum) & ((max_ch - min_ch) <= args.bg_sat)
    arr[..., 3] = np.where(is_bg, 0, arr[..., 3])
    bg_count = int(is_bg.sum())

    # 1b. Optional floor-shadow scrub.  Targets medium-gray (lum 80-200),
    # very-low-saturation pixels in the bottom 40% of the image only.
    # Skin (high R, lower G/B = saturated) and dark outline (lum < 80)
    # are NOT touched.  Strip layout is N frames tiled horizontally;
    # bottom 40% of the strip == bottom 40% of every frame since they
    # share the same y-axis.
    floor_count = 0
    if args.scrub_floor:
        floor_y0 = int(H * 0.6)
        lum = (299 * r + 587 * g + 114 * b) // 1000
        sat = max_ch - min_ch
        # Construct a row mask so we only act on the bottom portion.
        row_mask = np.zeros((H, W), dtype=bool)
        row_mask[floor_y0:, :] = True
        is_floor = row_mask & (lum >= 80) & (lum <= 200) & (sat <= 15)
        arr[..., 3] = np.where(is_floor, 0, arr[..., 3])
        floor_count = int(is_floor.sum())

    # 2. Premultiply alpha (float math for precision).
    arr_f = arr.astype(np.float32) / 255.0
    alpha_f = arr_f[..., 3:4]
    premul = np.empty_like(arr_f)
    premul[..., :3] = arr_f[..., :3] * alpha_f
    premul[..., 3:4] = alpha_f
    premul_u8 = (premul * 255).clip(0, 255).astype(np.uint8)

    # 3. LANCZOS resize.
    new_H = args.height
    new_W = max(1, round(W * new_H / H))
    img_premul = Image.fromarray(premul_u8, mode="RGBA")
    img_resized = img_premul.resize((new_W, new_H), Image.LANCZOS)

    # 4. Un-premultiply.
    resized = np.array(img_resized).astype(np.float32) / 255.0
    alpha_r = resized[..., 3:4]
    safe_alpha = np.where(alpha_r > 0, alpha_r, 1.0)
    unpremul = np.empty_like(resized)
    unpremul[..., :3] = resized[..., :3] / safe_alpha
    unpremul[..., 3:4] = alpha_r
    unpremul = np.clip(unpremul, 0.0, 1.0)
    out_arr = (unpremul * 255).astype(np.uint8)

    Image.fromarray(out_arr).save(args.out_path)
    extra = f", {floor_count} floor-shadow pixels scrubbed" if args.scrub_floor else ""
    print(f"{args.in_path} -> {args.out_path}: "
          f"{W}x{H} -> {new_W}x{new_H} (LANCZOS premul), "
          f"{bg_count} native bg pixels alpha-zeroed{extra}")


if __name__ == "__main__":
    main()
