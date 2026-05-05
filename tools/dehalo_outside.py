"""
Per-frame flood-fill dehalo: for each FRAME_W x FRAME_H cell of a
horizontal strip, flood-fill near-white from the four edges only.
Whites inside the silhouette (stripes, eye highlights) survive because
the fill never reaches them. Whites outside the silhouette (cropping
artifacts, anti-aliased halo from colorkey) become transparent.

CLI:
  python dehalo_outside.py SRC.png DST.png                 # default 64x72
  python dehalo_outside.py SRC.png DST.png --frame-h 64    # 64x64 frames
"""
import argparse
from collections import deque
from pathlib import Path
from PIL import Image

FRAME_W = 64
FRAME_H = 72              # default, overridable via --frame-h
WHITE_THRESH = 235   # >= this on r AND g AND b counts as white-ish background


def is_bg(r, g, b):
    return r >= WHITE_THRESH and g >= WHITE_THRESH and b >= WHITE_THRESH


def flood_clear_frame(img, x0, y0, w, h):
    px = img.load()
    visited = [[False] * h for _ in range(w)]
    q = deque()
    for fx in range(w):
        for fy in (0, h - 1):
            r, g, b, a = px[x0 + fx, y0 + fy]
            if a > 0 and is_bg(r, g, b):
                q.append((fx, fy))
                visited[fx][fy] = True
    for fy in range(h):
        for fx in (0, w - 1):
            r, g, b, a = px[x0 + fx, y0 + fy]
            if a > 0 and is_bg(r, g, b):
                q.append((fx, fy))
                visited[fx][fy] = True
    while q:
        fx, fy = q.popleft()
        px[x0 + fx, y0 + fy] = (0, 0, 0, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = fx + dx, fy + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[nx][ny]:
                visited[nx][ny] = True
                r, g, b, a = px[x0 + nx, y0 + ny]
                if a > 0 and is_bg(r, g, b):
                    q.append((nx, ny))


def zero_rgb_on_transparent(img: Image.Image) -> int:
    """Set RGB to (0,0,0) on any alpha=0 pixel. Without this, the
    leftover bright RGB on transparent pixels bleeds into the visible
    silhouette when the canvas filters/scales the sprite, producing
    a white halo even though those pixels were "transparent". Also
    helps with any non-zero alpha pixel <= a small alpha threshold
    where the white bleed is most visible."""
    px = img.load()
    w, h = img.size
    n = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0 and (r != 0 or g != 0 or b != 0):
                px[x, y] = (0, 0, 0, 0)
                n += 1
    return n


def process(src: Path, dst: Path, frame_h: int) -> None:
    img = Image.open(src).convert("RGBA")
    w, h = img.size
    if h != frame_h or w % FRAME_W != 0:
        raise RuntimeError(f"unexpected size {w}x{h}; expected width%{FRAME_W}==0 and height=={frame_h}")
    frames = w // FRAME_W
    for i in range(frames):
        flood_clear_frame(img, i * FRAME_W, 0, FRAME_W, frame_h)
    zeroed = zero_rgb_on_transparent(img)
    img.save(dst, "PNG", optimize=True)
    print(f"{src.name} -> {dst.name}: {frames} frames keyed, {zeroed} alpha=0 pixels zeroed (no more white bleed)")


if __name__ == "__main__":
    p = argparse.ArgumentParser(description="Flood-fill dehalo a horizontal sprite strip.")
    p.add_argument("src")
    p.add_argument("dst")
    p.add_argument("--frame-h", type=int, default=FRAME_H,
                   help=f"frame height in pixels (default {FRAME_H})")
    args = p.parse_args()
    process(Path(args.src), Path(args.dst), args.frame_h)
