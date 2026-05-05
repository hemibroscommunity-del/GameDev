"""Stabilize the head across frames of a horizontal sprite strip.

AI-generated run cycles sometimes have a visibly different head
silhouette shape per frame — the outline gains/loses a pixel here or
there, so the head looks "wavy" or "bumpy" during playback even
though the head should only translate vertically with the body bob.

This tool locks every frame's head region to one reference frame:
  1. For each frame, find the topmost opaque row (alignment anchor).
  2. Pick a reference frame — the one whose top row is closest to
     the median top across all frames (i.e. the most "typical" pose).
  3. Crop the reference's top `head_h` rows.  This is the canonical
     head, used as-is.  Outline thickness is whatever the reference
     frame happens to have — NOT thickened.
  4. Paste the canonical head into every frame at its own top row.

Why "use ref as-is" instead of per-pixel median across frames:
  Per-channel median causes outline thickening.  At the silhouette
  edge, a pixel that's opaque in 50%+ of frames becomes opaque in
  ALL frames after median, growing the silhouette by ~1px around
  the head.  Reference-frame-as-canonical preserves the outline
  exactly as drawn.

The result: head outline + interior byte-identical across frames,
just translated vertically with the bob.  Body / arms / legs below
the head region are untouched.

CLI:
  python stabilize_head.py SRC.png DST.png --head-h 20
"""
import argparse
from pathlib import Path
from PIL import Image

FRAME_W = 64
FRAME_H = 64


def find_top_row(img: Image.Image) -> int:
    """Topmost y where any pixel has alpha > 0.  Returns img.size[1]
    if the frame is fully transparent (shouldn't happen in practice)."""
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > 0:
                return y
    return h


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("src")
    p.add_argument("dst")
    p.add_argument("--frame-w", type=int, default=FRAME_W)
    p.add_argument("--frame-h", type=int, default=FRAME_H)
    p.add_argument("--head-h", type=int, default=20,
                   help="head region height in pixels from the topmost "
                        "opaque row (default 20)")
    args = p.parse_args()

    src = Path(args.src)
    dst = Path(args.dst)
    fw, fh = args.frame_w, args.frame_h
    head_h = args.head_h

    img = Image.open(src).convert("RGBA")
    w_total, _ = img.size
    if w_total % fw != 0:
        raise RuntimeError(f"strip width {w_total} not a multiple of frame width {fw}")
    n = w_total // fw

    frames = [img.crop((i * fw, 0, (i + 1) * fw, fh)) for i in range(n)]
    tops = [find_top_row(f) for f in frames]
    if not tops or min(tops) >= fh:
        raise RuntimeError("all frames appear fully transparent")

    # Reference frame: the one whose top row is closest to the median.
    sorted_tops = sorted(tops)
    median_top = sorted_tops[len(sorted_tops) // 2]
    ref_idx = min(range(n), key=lambda i: abs(tops[i] - median_top))
    ref = frames[ref_idx]
    ref_top = tops[ref_idx]

    # Crop the reference's head region as the canonical head.
    can_h = min(head_h, fh - ref_top)
    canonical = ref.crop((0, ref_top, fw, ref_top + can_h))
    can_px = canonical.load()

    # Paste canonical head into each frame at its own top row.
    out = img.copy()
    out_px = out.load()
    for i in range(n):
        x0 = i * fw
        for hy in range(can_h):
            dst_y = tops[i] + hy
            if dst_y >= fh:
                continue
            for x in range(fw):
                out_px[x0 + x, dst_y] = can_px[x, hy]

    out.save(dst, "PNG", optimize=True)
    print(f"{src.name} -> {dst.name}: stabilized {n} heads, "
          f"head_h={can_h}, ref_frame={ref_idx} (top={ref_top}), "
          f"top range {min(tops)}-{max(tops)}")


if __name__ == "__main__":
    main()
