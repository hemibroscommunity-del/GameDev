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

    # Compute opaque bbox so the renderer can auto-fit the trait to the
    # body's head regardless of where the AI placed it in the canvas.
    try:
        import numpy as np
        import json
        import os
        arr = np.array(im)
        alpha = arr[..., 3]
        ys, xs = np.where(alpha > 16)
        if len(xs):
            x0, x1 = int(xs.min()), int(xs.max())
            y0, y1 = int(ys.min()), int(ys.max())
            bbox = [x0, y0, x1 - x0 + 1, y1 - y0 + 1]
            print(f"  bbox: x={x0}..{x1} y={y0}..{y1} ({bbox[2]}x{bbox[3]})")
            # Write/update meta.json alongside the output PNG.
            out_dir = os.path.dirname(args.out)
            meta_path = os.path.join(out_dir, "meta.json")
            meta = {}
            if os.path.exists(meta_path):
                try:
                    with open(meta_path) as f:
                        meta = json.load(f)
                except Exception:
                    meta = {}
            base = os.path.splitext(os.path.basename(args.out))[0]
            if "bboxes" not in meta:
                meta["bboxes"] = {}
            meta["bboxes"][base] = bbox
            with open(meta_path, "w") as f:
                json.dump(meta, f, indent=2)
            print(f"  bbox saved to {meta_path}")
    except ImportError:
        pass  # numpy optional; bbox just won't be written


if __name__ == "__main__":
    main()
