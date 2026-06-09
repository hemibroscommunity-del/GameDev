#!/usr/bin/env python3
"""Remove background-white left inside a keyed sprite's interior gaps, while
keeping near-white that belongs to a metal tool (folded into the metal instead
of punched into a hole).

Edge flood-fill keying (build_skill_sheet.py) only removes background connected
to the frame border; near-white trapped inside the character (e.g. between the
legs) survives. This cleans that up:
  - near-white pixels adjacent to tool metal/wood  -> recolored to gunmetal
  - all other near-white pixels                    -> made transparent

  python tools/clean_interior_white.py in.png out.png

See docs/skill-animation-pipeline.md (processing path, keying cleanup).
"""

import argparse
import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inp"); ap.add_argument("out")
    ap.add_argument("--white", type=int, default=225, help="min channel for 'near white'")
    ap.add_argument("--sat", type=int, default=22, help="max channel spread for 'near white'")
    ap.add_argument("--grow", type=int, default=3, help="tool-adjacency dilation (px)")
    a = ap.parse_args()

    im = np.asarray(Image.open(a.inp).convert("RGBA")).copy()
    r, g, b, al = (im[..., i].astype(int) for i in range(4))
    opaque = al > 0
    mn = np.minimum(np.minimum(r, g), b)
    mx = np.maximum(np.maximum(r, g), b)
    sat = mx - mn
    nw = opaque & (mn > a.white) & (sat < a.sat)

    # tool = low-saturation metal OR brown-ish wood handle
    gun = opaque & (sat < 34) & (mx >= 45) & (mx <= 205) & ~nw
    brown = opaque & (r > g) & (g >= b) & (r >= 70) & (r <= 185) & ((r - b) > 18)
    tool_near = binary_dilation(gun | brown, iterations=a.grow)

    fill = nw & tool_near        # tool highlights -> solid metal
    drop = nw & ~tool_near       # gap background  -> transparent
    im[fill, 0], im[fill, 1], im[fill, 2] = 150, 158, 172
    im[drop] = 0

    Image.fromarray(im, "RGBA").save(a.out)
    print(f"filled {int(fill.sum())} tool-white px, dropped {int(drop.sum())} gap-white px -> {a.out}")


if __name__ == "__main__":
    main()
