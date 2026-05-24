"""
Zero the RGB channels on fully-transparent (alpha=0) pixels.

ffmpeg's colorkey filter only modifies the alpha channel; the
original RGB stays in place.  Some renderers (and some image
viewers) leak that RGB through transparent pixels, producing
visible ghosting along sprite edges.  This script cleans the output
by writing (0, 0, 0, 0) wherever alpha == 0.

Usage:  python tools/zero_transparent_rgb.py IN.png OUT.png
"""

import sys
import numpy as np
from PIL import Image


def main():
    in_path = sys.argv[1]
    out_path = sys.argv[2]
    img = Image.open(in_path).convert("RGBA")
    arr = np.array(img)
    trans = arr[..., 3] == 0
    arr[trans] = [0, 0, 0, 0]
    Image.fromarray(arr).save(out_path)
    print(f"  zeroed {int(trans.sum())} transparent RGBs")


if __name__ == "__main__":
    main()
