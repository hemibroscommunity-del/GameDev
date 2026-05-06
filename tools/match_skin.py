"""Shift skin pixels in a sprite sheet toward a target RGB.

Computes the current skin-pixel median in the input, then applies a
per-channel multiplier so the new median lands at the target.  Other
pixels (outline, pants, transparent) are untouched.

Used to bring the jog sheets in line with the idle / stand sprites,
which have a more muted tan skin.

CLI:
  python tools/match_skin.py SRC.png DST.png --target 208 135 76
"""
import argparse
from pathlib import Path
from PIL import Image


def is_skin(r, g, b, a):
    """Same skin filter as tools/recolor_east.py — tan, opaque, R>G>B."""
    if a < 240:
        return False
    if not (r > g and g > b):
        return False
    if r < 120:
        return False
    if r > 235 and g > 220 and b > 200:
        return False
    sat = (max(r, g, b) - min(r, g, b)) / max(max(r, g, b), 1)
    return sat >= 0.15


def median(values):
    s = sorted(values)
    return s[len(s) // 2] if s else 0


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("src")
    p.add_argument("dst")
    p.add_argument("--target", nargs=3, type=int, required=True,
                   metavar=("R", "G", "B"),
                   help="target skin median (e.g. 208 135 76)")
    args = p.parse_args()

    src = Path(args.src)
    dst = Path(args.dst)
    img = Image.open(src).convert("RGBA")
    w, h = img.size
    px = img.load()

    rs, gs, bs = [], [], []
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_skin(r, g, b, a):
                rs.append(r); gs.append(g); bs.append(b)

    if not rs:
        print(f"{src.name}: no skin pixels found, no change")
        return

    cur = (median(rs), median(gs), median(bs))
    tr, tg, tb = args.target
    rm = tr / cur[0]
    gm = tg / cur[1]
    bm = tb / cur[2]

    n = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if not is_skin(r, g, b, a):
                continue
            nr = min(255, max(0, round(r * rm)))
            ng = min(255, max(0, round(g * gm)))
            nb = min(255, max(0, round(b * bm)))
            px[x, y] = (nr, ng, nb, a)
            n += 1

    img.save(dst, "PNG", optimize=True)
    print(f"{src.name} -> {dst.name}: cur skin {cur}, "
          f"target ({tr},{tg},{tb}), mul ({rm:.3f},{gm:.3f},{bm:.3f}), "
          f"recolored {n} pixels")


if __name__ == "__main__":
    main()
