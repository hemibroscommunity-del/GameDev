#!/usr/bin/env python3
"""
Plain alpha-preserving Lanczos downscale for trait PNGs.

Use this instead of lanczos_downscale.py for trait sources -- the
fancier tool runs a background-detection pass that can zero out
near-white pixels INSIDE the trait (creating holes).  Trait sources
arrive on a fully transparent background, so no bg keying is needed.

Usage:
  python tools/downscale_trait.py source.png out.png [--size 256]
"""

import argparse
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow required: pip install Pillow")


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("source")
    p.add_argument("out")
    p.add_argument("--size", type=int, default=256,
                   help="Target square size (default 256, matches body frame).")
    args = p.parse_args()

    im = Image.open(args.source).convert("RGBA")
    if im.size != (args.size, args.size):
        im = im.resize((args.size, args.size), Image.LANCZOS)
    im.save(args.out)
    print(f"{args.source} -> {args.out}: {im.size[0]}x{im.size[1]}")


if __name__ == "__main__":
    main()
