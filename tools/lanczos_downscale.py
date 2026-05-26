"""
High-quality LANCZOS downscale with proper alpha handling.

Pipeline:
  1. Detect bg pixels (near-grayscale, high luminance) and set their
     alpha to 0.  Figure pixels (saturated) and outline pixels (dark)
     stay at alpha=255.
  2. Premultiply alpha so the LANCZOS resize doesn't bleed bg color
     into figure edges.  (Straight per-channel resize on un-premul
     RGBA mixes bg-RGB with figure-RGB at the boundary, producing
     washed-out edges.)
  3. LANCZOS resize to target height (width scales proportionally).
  4. Un-premultiply alpha.
  5. Save.

This replaces the nearest-neighbor cascade with a proper sinc-based
filter, which is the standard high-quality answer for an 8x or
greater downscale.  Output has smooth anti-aliased edges instead of
sparse-sampled outline gaps.

Usage:
  python tools/lanczos_downscale.py IN.png OUT.png --height 64
"""

import argparse
import numpy as np
from PIL import Image


def flood_from_edges(passable):
    """Return a boolean mask: True where `passable` AND reachable from
    any image edge via 4-connected flood-fill through other passable
    pixels.  Interior passable islands (surrounded by non-passable)
    return False -- they get preserved by the caller."""
    H, W = passable.shape
    reached = np.zeros_like(passable, dtype=bool)
    # BFS seed = passable edge pixels
    from collections import deque
    q = deque()
    for x in range(W):
        if passable[0, x]:
            reached[0, x] = True
            q.append((0, x))
        if passable[H - 1, x]:
            reached[H - 1, x] = True
            q.append((H - 1, x))
    for y in range(H):
        if passable[y, 0]:
            reached[y, 0] = True
            q.append((y, 0))
        if passable[y, W - 1]:
            reached[y, W - 1] = True
            q.append((y, W - 1))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and passable[ny, nx] and not reached[ny, nx]:
                reached[ny, nx] = True
                q.append((ny, nx))
    return reached


def main():
    p = argparse.ArgumentParser()
    p.add_argument("in_path")
    p.add_argument("out_path")
    p.add_argument("--height", type=int, required=True)
    p.add_argument("--bg-lum", type=int, default=200,
                   help="min max-channel for bg detection")
    p.add_argument("--bg-sat", type=int, default=30,
                   help="max channel range for bg detection")
    p.add_argument("--scrub-floor", action="store_true",
                   help="zero medium-gray low-sat pixels in the bottom "
                        "40%% of each frame (use for sources with an AI-"
                        "drawn ground-shadow under the figure's feet "
                        "that the bg-detect threshold misses)")
    p.add_argument("--bg-flood-from-edge", action="store_true",
                   help="restrict bg removal to pixels reachable from "
                        "the frame edge via 4-connected flood-fill "
                        "through bg-passable pixels.  Interior bg-"
                        "colored islands (eye whites, etc.) survive.")
    p.add_argument("--frame-w", type=int, default=0,
                   help="if --bg-flood-from-edge is set on a tiled "
                        "strip, run flood per-frame so bg doesn't leak "
                        "across frame boundaries.  Defaults to whole "
                        "image (one frame).")
    args = p.parse_args()

    img = Image.open(args.in_path).convert("RGBA")
    arr = np.array(img)
    H, W = arr.shape[:2]

    # 1. Detect bg + set alpha to 0.
    r = arr[..., 0].astype(np.int32)
    g = arr[..., 1].astype(np.int32)
    b = arr[..., 2].astype(np.int32)
    max_ch = np.maximum(np.maximum(r, g), b)
    min_ch = np.minimum(np.minimum(r, g), b)
    bg_passable = (max_ch >= args.bg_lum) & ((max_ch - min_ch) <= args.bg_sat)

    if args.bg_flood_from_edge:
        # Flood per-frame.  Each frame's slice is processed independently
        # so frame-N bg cannot reach frame-N+1 interior pockets via the
        # shared border column.  Default frame width = image height
        # (square frames) when caller doesn't pass --frame-w.
        fw = args.frame_w if args.frame_w > 0 else H
        is_bg = np.zeros_like(bg_passable)
        for x0 in range(0, W, fw):
            x1 = min(x0 + fw, W)
            frame_passable = bg_passable[:, x0:x1]
            is_bg[:, x0:x1] = flood_from_edges(frame_passable)
    else:
        is_bg = bg_passable

    arr[..., 3] = np.where(is_bg, 0, arr[..., 3])
    bg_count = int(is_bg.sum())

    # 1b. Optional floor-shadow scrub.  Targets medium-gray (lum 80-200),
    # very-low-saturation pixels in the bottom 40% of the image only.
    # Skin (high R, lower G/B = saturated) and dark outline (lum < 80)
    # are NOT touched.  Strip layout is N frames tiled horizontally;
    # bottom 40% of the strip == bottom 40% of every frame since they
    # share the same y-axis.
    floor_count = 0
    if args.scrub_floor:
        floor_y0 = int(H * 0.6)
        lum = (299 * r + 587 * g + 114 * b) // 1000
        sat = max_ch - min_ch
        # Construct a row mask so we only act on the bottom portion.
        row_mask = np.zeros((H, W), dtype=bool)
        row_mask[floor_y0:, :] = True
        is_floor = row_mask & (lum >= 80) & (lum <= 200) & (sat <= 15)
        arr[..., 3] = np.where(is_floor, 0, arr[..., 3])
        floor_count = int(is_floor.sum())

    # 2. Premultiply alpha (float math for precision).
    arr_f = arr.astype(np.float32) / 255.0
    alpha_f = arr_f[..., 3:4]
    premul = np.empty_like(arr_f)
    premul[..., :3] = arr_f[..., :3] * alpha_f
    premul[..., 3:4] = alpha_f
    premul_u8 = (premul * 255).clip(0, 255).astype(np.uint8)

    # 3. LANCZOS resize.
    new_H = args.height
    new_W = max(1, round(W * new_H / H))
    img_premul = Image.fromarray(premul_u8, mode="RGBA")
    img_resized = img_premul.resize((new_W, new_H), Image.LANCZOS)

    # 4. Un-premultiply.
    resized = np.array(img_resized).astype(np.float32) / 255.0
    alpha_r = resized[..., 3:4]
    safe_alpha = np.where(alpha_r > 0, alpha_r, 1.0)
    unpremul = np.empty_like(resized)
    unpremul[..., :3] = resized[..., :3] / safe_alpha
    unpremul[..., 3:4] = alpha_r
    unpremul = np.clip(unpremul, 0.0, 1.0)
    out_arr = (unpremul * 255).astype(np.uint8)

    Image.fromarray(out_arr).save(args.out_path)
    extra = f", {floor_count} floor-shadow pixels scrubbed" if args.scrub_floor else ""
    print(f"{args.in_path} -> {args.out_path}: "
          f"{W}x{H} -> {new_W}x{new_H} (LANCZOS premul), "
          f"{bg_count} native bg pixels alpha-zeroed{extra}")


if __name__ == "__main__":
    main()
