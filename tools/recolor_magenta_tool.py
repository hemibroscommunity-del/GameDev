#!/usr/bin/env python3
"""Recolor a flat-magenta placeholder tool in a sprite strip into a real
two-material tool: a metal head + a wooden handle.

The magenta stand-in (#FF00FF-ish) carries Grok's internal shading, which we
preserve. We split head vs handle by *thickness* (distance transform of the
magenta mask) — the head/blade is the chunky part, the handle is the thin
shaft — so it works frame-to-frame even as the tool rotates through a swing.

  python tools/recolor_magenta_tool.py in.png out.png [--head-pct 0.45]

See docs/skill-animation-pipeline.md (per-tier recolor step).
"""

import argparse
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt


def ramp(t, lo, hi):
    """t in [0,1] -> rgb interpolated lo..hi (each a 3-tuple)."""
    lo, hi = np.array(lo, float), np.array(hi, float)
    return lo + (hi - lo) * t[..., None]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inp"); ap.add_argument("out")
    ap.add_argument("--head-pct", type=float, default=0.45,
                    help="fraction of tool thickness treated as metal head")
    a = ap.parse_args()

    im = np.asarray(Image.open(a.inp).convert("RGBA")).copy()
    r, g, b, al = (im[..., 0].astype(int), im[..., 1].astype(int),
                   im[..., 2].astype(int), im[..., 3])
    mag = (r > 120) & (b > 120) & (g < np.minimum(r, b) - 30) & (al > 0)

    # shading: per-pixel intensity from the magenta channels, normalized
    inten = np.maximum(r, b).astype(float)
    lo, hi = np.percentile(inten[mag], 5), np.percentile(inten[mag], 95)
    t = np.clip((inten - lo) / max(1, hi - lo), 0, 1)

    # thickness split head vs handle
    dist = distance_transform_edt(mag)
    dmax = dist[mag].max() if mag.any() else 1
    is_head = mag & (dist >= a.head_pct * dmax)
    is_handle = mag & ~is_head

    # palettes (shadow -> highlight)
    WOOD = ((70, 45, 24), (165, 116, 70))      # brown handle
    IRON = ((42, 46, 54), (138, 146, 160))     # gunmetal head (clearly gray, not white)

    out = im.copy()
    if is_handle.any():
        out[is_handle, :3] = ramp(t[is_handle], *WOOD).astype(np.uint8)
    if is_head.any():
        out[is_head, :3] = ramp(t[is_head], *IRON).astype(np.uint8)

    Image.fromarray(out, "RGBA").save(a.out)
    print(f"recolored {int(mag.sum())} px "
          f"({int(is_head.sum())} head / {int(is_handle.sum())} handle) -> {a.out}")


if __name__ == "__main__":
    main()
