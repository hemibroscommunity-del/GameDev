"""
2-stage background extraction for tiled sprite strips.

Replaces the dehalo_outside.py "kill near-white grayscale" approach
with a flood-from-edges approach that is robust to bg color drift
(yellow/blue tint near figure) and to outline AA gaps.

Stage 1 (identify what counts as "passable background"):
  A pixel is BG-passable if it is near-grayscale (max-min RGB below
  --bg-sat) AND high luminance (above --bg-lum).  This catches white,
  off-white, light gray, and color-drifted bg pixels.  The outline
  (dark pixels) is NOT bg-passable.  Saturated skin / clothes / hair
  inside the figure are NOT bg-passable.

Stage 2 (edge-flood):
  Starting from every frame-edge pixel that IS bg-passable, flood-fill
  4-connected through bg-passable pixels only.  The flood naturally
  cannot cross the outline (low luminance) or the figure interior
  (saturated).  Any pixel the flood reaches -> zero out (0,0,0,0).

Key properties:
  - Outline preserved byte-for-byte.
  - Figure interior preserved byte-for-byte (colored pixels block the
    flood; the flood can't cross them).
  - Bg residue of any color drift gets caught (low saturation alone
    qualifies, regardless of hue).
  - Gaps in the outline are tolerated -- the flood may enter the
    figure-interior space through a gap, but it stops at the first
    saturated interior pixel it hits.  In practice this leaves at
    most a sliver of bg-colored leak inside the figure, far less
    damage than the prior outline-as-barrier approach.

Strip-aware: --frame-w slices into per-frame columns so the flood
doesn't cross frame boundaries.

Usage:
  python tools/silhouette_extract.py IN.png OUT.png --frame-w 64
                                                     [--bg-lum 200]
                                                     [--bg-sat 30]
"""

import argparse
import sys
from collections import deque
from PIL import Image


def lum(r, g, b):
    return (299 * r + 587 * g + 114 * b) // 1000


def is_bg_passable(r, g, b, a, bg_lum_min, bg_sat_max):
    """A pixel the flood is allowed to cross.

    Already-transparent pixels (a == 0) qualify automatically -- the
    caller may pre-key with ffmpeg colorkey, leaving alpha=0 holes,
    and the flood should treat those as passable.
    """
    if a == 0:
        return True
    if lum(r, g, b) < bg_lum_min:
        return False
    sat = max(r, g, b) - min(r, g, b)
    return sat <= bg_sat_max


def extract_frame(pixels, x0, frame_w, frame_h, bg_lum_min, bg_sat_max):
    """Run Stage 1 + Stage 2 on a single frame at columns [x0, x0+frame_w).

    Returns the set of global (x, y) coords that are bg (to zero)."""
    # Stage 1: per-pixel bg-passable mask.
    passable = [[False] * frame_h for _ in range(frame_w)]
    for lx in range(frame_w):
        for y in range(frame_h):
            r, g, b, a = pixels[x0 + lx, y]
            passable[lx][y] = is_bg_passable(r, g, b, a, bg_lum_min, bg_sat_max)

    # Stage 2: flood from frame edges, only crossing passable pixels.
    visited = [[False] * frame_h for _ in range(frame_w)]
    q = deque()

    def seed(lx, y):
        if 0 <= lx < frame_w and 0 <= y < frame_h:
            if passable[lx][y] and not visited[lx][y]:
                visited[lx][y] = True
                q.append((lx, y))

    for lx in range(frame_w):
        seed(lx, 0)
        seed(lx, frame_h - 1)
    for y in range(frame_h):
        seed(0, y)
        seed(frame_w - 1, y)

    while q:
        lx, y = q.popleft()
        for dlx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nlx, ny = lx + dlx, y + dy
            if 0 <= nlx < frame_w and 0 <= ny < frame_h:
                if passable[nlx][ny] and not visited[nlx][ny]:
                    visited[nlx][ny] = True
                    q.append((nlx, ny))

    bg_coords = set()
    for lx in range(frame_w):
        for y in range(frame_h):
            if visited[lx][y]:
                bg_coords.add((x0 + lx, y))
    return bg_coords


def process(in_path, out_path, frame_w, bg_lum_min, bg_sat_max):
    img = Image.open(in_path).convert("RGBA")
    w, h = img.size
    if frame_w <= 0 or frame_w > w:
        frame_w = w
    if w % frame_w != 0:
        print(f"warn: strip width {w} not divisible by frame width {frame_w}",
              file=sys.stderr)

    pixels = img.load()
    out = img.copy()
    out_pixels = out.load()

    total_bg = 0
    frame_count = 0
    for x0 in range(0, w, frame_w):
        fw = min(frame_w, w - x0)
        bg = extract_frame(pixels, x0, fw, h, bg_lum_min, bg_sat_max)
        for (x, y) in bg:
            out_pixels[x, y] = (0, 0, 0, 0)
        total_bg += len(bg)
        frame_count += 1

    out.save(out_path)
    print(f"{in_path} -> {out_path}: {frame_count} frames, "
          f"{total_bg} bg zeroed (bg-lum>={bg_lum_min}, bg-sat<={bg_sat_max})")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("in_path")
    p.add_argument("out_path")
    p.add_argument("--frame-w", type=int, required=True)
    p.add_argument("--bg-lum", type=int, default=200,
                   help="min luminance for a pixel to count as bg-passable")
    p.add_argument("--bg-sat", type=int, default=30,
                   help="max (max-min RGB) for a pixel to count as "
                        "bg-passable. 30 catches off-white drift; raise "
                        "for more aggressive bg removal at risk of "
                        "trimming low-saturation figure pixels.")
    args = p.parse_args()
    process(args.in_path, args.out_path, args.frame_w, args.bg_lum, args.bg_sat)


if __name__ == "__main__":
    main()
