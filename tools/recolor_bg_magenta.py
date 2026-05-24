"""
Recolor near-white/gray pixels to magenta (255, 0, 255) so a
subsequent ffmpeg colorkey step can kill the background with exact
single-color precision instead of a sloppy similarity match.

A pixel is "background" if (a > 0) AND (max(rgb) >= --lum) AND
(max(rgb) - min(rgb) <= --sat).  This catches white, off-white,
neutral grays, and slightly-tinted bg drift while leaving:
  - saturated pixels (skin tan, green pants, red, blue ...) alone
  - dark pixels (black outline, shadows) alone
  - already-transparent pixels alone

Pairs with:  ffmpeg colorkey=0xff00ff:0.01:0.0   (tight, binary)

Designed for the bg-removal pass on raw AI-generated sprite frames
at native resolution.  Numpy-vectorized; fast on multi-thousand-px
strips.

Usage:
  python tools/recolor_bg_magenta.py IN.png OUT.png [--lum 200] [--sat 30]
"""

import argparse
import sys
import numpy as np
from PIL import Image

MAGENTA_RGBA = (255, 0, 255, 255)


def process(in_path, out_path, lum_min, sat_max):
    img = Image.open(in_path).convert("RGBA")
    arr = np.array(img)
    r = arr[..., 0].astype(np.int16)
    g = arr[..., 1].astype(np.int16)
    b = arr[..., 2].astype(np.int16)
    a = arr[..., 3]
    max_ch = np.maximum(np.maximum(r, g), b)
    min_ch = np.minimum(np.minimum(r, g), b)
    is_bg = (a > 0) & (max_ch >= lum_min) & ((max_ch - min_ch) <= sat_max)
    arr[is_bg] = MAGENTA_RGBA
    Image.fromarray(arr).save(out_path)
    count = int(is_bg.sum())
    total = arr.shape[0] * arr.shape[1]
    print(f"{in_path} -> {out_path}: {count}/{total} px "
          f"({100.0*count/total:.1f}%) recolored magenta "
          f"(lum>={lum_min}, sat<={sat_max})")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("in_path")
    p.add_argument("out_path")
    p.add_argument("--lum", type=int, default=200,
                   help="min max-channel value to count as bg (default 200)")
    p.add_argument("--sat", type=int, default=30,
                   help="max (max-min) channel range to count as bg "
                        "(default 30)")
    args = p.parse_args()
    process(args.in_path, args.out_path, args.lum, args.sat)


if __name__ == "__main__":
    main()
