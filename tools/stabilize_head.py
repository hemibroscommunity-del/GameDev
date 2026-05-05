"""Stabilize the head across frames of a horizontal sprite strip.

AI-generated run cycles sometimes have a visibly different head
silhouette shape per frame — the outline gains/loses a pixel here or
there, so the head looks "wavy" or "bumpy" during playback even
though the head should only translate vertically with the body bob.

This tool locks the head region to a single canonical version:
  1. For each frame, find the topmost opaque row (alignment anchor).
  2. Sample the top `head_h` rows from each frame, aligned to its top.
  3. Per (head-relative-y, x) take the median RGBA across all frames.
  4. Paste the canonical head back into each frame at its own top row.

The result: head outline + interior are byte-identical across frames,
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


def median_pixel(samples):
    """Per-channel median of (r,g,b,a) tuples.  Channel-independent
    median is a slight cheat for color but fine for the flat tan +
    dark outline palette here.  Empty -> fully transparent."""
    if not samples:
        return (0, 0, 0, 0)
    n = len(samples)
    rs = sorted(s[0] for s in samples)
    gs = sorted(s[1] for s in samples)
    bs = sorted(s[2] for s in samples)
    aa = sorted(s[3] for s in samples)
    return (rs[n // 2], gs[n // 2], bs[n // 2], aa[n // 2])


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

    # Build the canonical head: median of head-aligned samples.
    canonical = Image.new("RGBA", (fw, head_h), (0, 0, 0, 0))
    can_px = canonical.load()
    frame_pxs = [f.load() for f in frames]
    for hy in range(head_h):
        for x in range(fw):
            samples = []
            for i in range(n):
                src_y = tops[i] + hy
                if src_y >= fh:
                    continue
                samples.append(frame_pxs[i][x, src_y])
            can_px[x, hy] = median_pixel(samples)

    # Paste canonical head into each frame at its own top row.
    out = img.copy()
    out_px = out.load()
    for i in range(n):
        x0 = i * fw
        for hy in range(head_h):
            dst_y = tops[i] + hy
            if dst_y >= fh:
                continue
            for x in range(fw):
                out_px[x0 + x, dst_y] = can_px[x, hy]

    out.save(dst, "PNG", optimize=True)
    print(f"{src.name} -> {dst.name}: stabilized {n} heads, "
          f"head_h={head_h}, top range {min(tops)}-{max(tops)}")


if __name__ == "__main__":
    main()
