#!/usr/bin/env python3
"""
Plain alpha-preserving Lanczos downscale for trait PNGs.

Use this instead of lanczos_downscale.py for trait sources -- the
fancier tool runs a background-detection pass that can zero out
near-white pixels INSIDE the trait (creating holes).  Trait sources
arrive on a fully transparent background, so no bg keying is needed.

Also reports the trait's exact opaque-pixel bounds in BOTH the source
canvas coords AND the downscaled output coords -- helps you verify
where the AI actually placed the trait vs where you asked for it.

Both bbox sets get written to meta.json alongside the output PNG:
  bboxes_source: where it landed in your original canvas
  bboxes      : where it landed after downscale (renderer uses this)

Usage:
  python tools/downscale_trait.py source.png out.png [--size 256]
"""

import argparse
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow required: pip install Pillow")


def opaque_bbox(im):
    """Return [x, y, w, h] of opaque pixels (alpha > 16), or None."""
    try:
        import numpy as np
    except ImportError:
        return None
    arr = np.array(im)
    if arr.ndim < 3 or arr.shape[2] < 4:
        return None
    alpha = arr[..., 3]
    ys, xs = np.where(alpha > 16)
    if len(xs) == 0:
        return None
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())
    return [x0, y0, x1 - x0 + 1, y1 - y0 + 1]


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("source")
    p.add_argument("out")
    p.add_argument("--size", type=int, default=256,
                   help="Target square size (default 256, matches body frame).")
    args = p.parse_args()

    src = Image.open(args.source).convert("RGBA")
    print(f"\n=== {args.source} ===")
    print(f"  source canvas: {src.size[0]}x{src.size[1]}")

    # Bbox in source coords (before any resizing).
    src_bbox = opaque_bbox(src)
    if src_bbox is not None:
        x, y, w, h = src_bbox
        cx, cy = x + w // 2, y + h // 2
        print(f"  source opaque bbox: x={x}..{x + w - 1} y={y}..{y + h - 1}")
        print(f"  source bbox size:   {w}x{h}")
        print(f"  source bbox center: ({cx}, {cy})")

    # Downscale.
    if src.size != (args.size, args.size):
        out = src.resize((args.size, args.size), Image.LANCZOS)
    else:
        out = src
    out.save(args.out)
    print(f"\n  -> {args.out}: {out.size[0]}x{out.size[1]}")

    # Bbox in output coords (what the renderer sees).
    out_bbox = opaque_bbox(out)
    if out_bbox is not None:
        x, y, w, h = out_bbox
        cx, cy = x + w // 2, y + h // 2
        print(f"  output opaque bbox: x={x}..{x + w - 1} y={y}..{y + h - 1}")
        print(f"  output bbox size:   {w}x{h}")
        print(f"  output bbox center: ({cx}, {cy})")

    # Write both bboxes to meta.json for the renderer + any other tools.
    try:
        import json
        import os
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
        if src_bbox is not None:
            meta.setdefault("bboxes_source", {})[base] = src_bbox
        if out_bbox is not None:
            meta.setdefault("bboxes", {})[base] = out_bbox
        with open(meta_path, "w") as f:
            json.dump(meta, f, indent=2)
        print(f"\n  bboxes saved to {meta_path}")
    except Exception as e:
        print(f"  could not update meta: {e}")


if __name__ == "__main__":
    main()
