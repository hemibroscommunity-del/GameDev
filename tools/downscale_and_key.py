"""
Nearest-neighbor downscale + exact-magenta kill, all in Python.

Replaces the ffmpeg `colorkey + scale + format=rgba` chain because
ffmpeg's filter pipeline can introduce sub-pixel color shifts when
chaining color and scale operations, leaving purplish AA fringe at
the figure edge that the chroma-key then fails to recognize as exact
magenta.

This script:
  1. PIL.Image.resize with Image.NEAREST -- pure nearest-neighbor,
     no blending, every output pixel is exactly one input pixel.
  2. Per-pixel exact match for (255, 0, 255) -> (0, 0, 0, 0).
     No similarity threshold, no fuzzy match.

Usage:
  python tools/downscale_and_key.py IN.png OUT.png --height 64
"""

import argparse
import numpy as np
from PIL import Image


def main():
    p = argparse.ArgumentParser()
    p.add_argument("in_path")
    p.add_argument("out_path")
    p.add_argument("--height", type=int, required=True,
                   help="output height in pixels; width scales proportionally")
    args = p.parse_args()

    img = Image.open(args.in_path).convert("RGBA")
    w, h = img.size
    new_h = args.height
    new_w = max(1, round(w * new_h / h))
    img = img.resize((new_w, new_h), Image.NEAREST)

    arr = np.array(img)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    mag = (r == 255) & (g == 0) & (b == 255)
    arr[mag] = [0, 0, 0, 0]

    Image.fromarray(arr).save(args.out_path)
    print(f"{args.in_path} -> {args.out_path}: {new_w}x{new_h}, "
          f"{int(mag.sum())} magenta pixels keyed")


if __name__ == "__main__":
    main()
