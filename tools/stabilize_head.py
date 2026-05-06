"""Stabilize the head across frames of a horizontal sprite strip.

AI-generated run cycles sometimes have a visibly different head
silhouette shape per frame — the outline gains/loses a pixel here or
there, so the head looks "wavy" or "bumpy" during playback even
though the head should only translate vertically with the body bob.

This tool replaces every frame's head silhouette with one reference
frame's head, translated to match each frame's own top row:

  1. For each frame, find the head's connected component:
     - Start at the topmost opaque pixel.
     - Flood-fill 4-connected to neighboring opaque pixels.
     - Cap at `head_h` rows below the topmost row so the fill can't
       leak into the body / arms.

  2. Pick the reference frame: the one whose top row is closest to
     the median top across frames (most "typical" pose).

  3. For each non-reference frame:
     a. Clear the pixels in its own head mask that aren't in the
        ref's head mask (translated by the dy between top rows).
        This removes "extra" silhouette outside the canonical shape.
     b. Paste the ref's head pixels at their positions translated
        by dy.  This stamps the canonical silhouette + interior.

Body / arms / legs below the head's connected component are
untouched.  Body parts that happen to peek into the head_h band but
aren't connected to the head (e.g. raised arm tips) are also
preserved — only pixels reachable by flood-fill from the head are
modified.

CLI:
  python stabilize_head.py SRC.png DST.png --head-h 12
"""
import argparse
from pathlib import Path
from PIL import Image

FRAME_W = 64
FRAME_H = 64


def head_mask(img: Image.Image, max_h: int):
    """Returns (set of (x,y), top_y).  Connected component of opaque
    pixels reachable by flood-fill from the topmost opaque pixel,
    clipped to top_y..top_y+max_h rows.  Returns (empty set, -1) if
    the frame has no opaque pixels."""
    px = img.load()
    w, h = img.size
    top = None
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > 0:
                top = (x, y)
                break
        if top is not None:
            break
    if top is None:
        return set(), -1
    top_y = top[1]
    bottom_y = min(top_y + max_h, h)
    visited = {top}
    stack = [top]
    while stack:
        cx, cy = stack.pop()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = cx + dx, cy + dy
            if (nx, ny) in visited:
                continue
            if nx < 0 or nx >= w:
                continue
            if ny < top_y or ny >= bottom_y:
                continue
            if px[nx, ny][3] == 0:
                continue
            visited.add((nx, ny))
            stack.append((nx, ny))
    return visited, top_y


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("src")
    p.add_argument("dst")
    p.add_argument("--frame-w", type=int, default=FRAME_W)
    p.add_argument("--frame-h", type=int, default=FRAME_H)
    p.add_argument("--head-h", type=int, default=12,
                   help="max head height in rows below topmost opaque "
                        "pixel — also the flood-fill clip (default 12, "
                        "just the skull, no neck/shoulders)")
    p.add_argument("--y-offset", type=int, default=0,
                   help="shift the canonical head down by N rows when "
                        "pasting into each frame (default 0).  Use to "
                        "tweak the chin position on a per-direction "
                        "basis if the locked head looks too high/low.")
    args = p.parse_args()

    src = Path(args.src)
    dst = Path(args.dst)
    fw, fh = args.frame_w, args.frame_h
    max_h = args.head_h

    img = Image.open(src).convert("RGBA")
    w_total, _ = img.size
    if w_total % fw != 0:
        raise RuntimeError(f"strip width {w_total} not a multiple of frame width {fw}")
    n = w_total // fw

    frames = [img.crop((i * fw, 0, (i + 1) * fw, fh)) for i in range(n)]
    masks_tops = [head_mask(f, max_h) for f in frames]
    masks = [mt[0] for mt in masks_tops]
    tops = [mt[1] for mt in masks_tops]
    if any(t < 0 for t in tops):
        raise RuntimeError("at least one frame has no opaque pixels")

    sorted_tops = sorted(tops)
    median_top = sorted_tops[len(sorted_tops) // 2]
    ref_idx = min(range(n), key=lambda i: abs(tops[i] - median_top))
    ref_mask = masks[ref_idx]
    ref_top = tops[ref_idx]
    ref_px = frames[ref_idx].load()

    y_off = args.y_offset
    out = img.copy()
    out_px = out.load()
    # When y_off > 0 we also need to update the reference frame: clear
    # its top y_off head rows and shift its head down too, otherwise
    # the ref frame would look different from the rest.
    frames_to_process = list(range(n)) if y_off != 0 else [i for i in range(n) if i != ref_idx]
    for i in frames_to_process:
        x0 = i * fw
        dy = tops[i] - ref_top + y_off
        # Translated reference mask (where ref's head will land in this frame).
        new_mask = {(x, y + dy) for (x, y) in ref_mask}

        # Step 1: clear pixels in this frame's own head mask that
        # aren't in the translated ref mask — removes extra silhouette
        # the AI drew outside the canonical shape.
        for (x, y) in masks[i]:
            if (x, y) not in new_mask:
                out_px[x0 + x, y] = (0, 0, 0, 0)

        # Step 2: paste ref's head pixels at translated positions.
        for (rx, ry) in ref_mask:
            ny = ry + dy
            if 0 <= rx < fw and 0 <= ny < fh:
                out_px[x0 + rx, ny] = ref_px[rx, ry]

    out.save(dst, "PNG", optimize=True)
    print(f"{src.name} -> {dst.name}: stabilized {n} heads "
          f"(connected component, max head_h={max_h}), "
          f"ref={ref_idx} top={ref_top}, top range {min(tops)}-{max(tops)}, "
          f"ref mask size={len(ref_mask)}")


if __name__ == "__main__":
    main()
