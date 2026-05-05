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


def force_binary_alpha(img: Image.Image, threshold: int = 128) -> int:
    """Snap every alpha value to 0 or 255 (cutoff at threshold).
    Kills the frame-to-frame "wobble" caused by anti-aliased edges
    sampling slightly different in each source frame — a 92-alpha
    pixel in frame N becomes a 184-alpha pixel in frame N+1, and the
    eye reads the boundary as shifting.  Forcing binary alpha matches
    the visual style of the older hand-edited east sheet."""
    px = img.load()
    w, h = img.size
    n = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0 or a == 255:
                continue
            if a >= threshold:
                px[x, y] = (r, g, b, 255)
            else:
                px[x, y] = (0, 0, 0, 0)
            n += 1
    return n


def kill_light_halo(img: Image.Image, lum_thresh: int = 180) -> int:
    """Drop any partial-alpha pixel whose color is light (RGB mean
    > lum_thresh) to alpha=0.  This is the visible "white pixels
    coming through" — leftover anti-aliased background from the
    colorkey blend.  Dark partial-alpha pixels are PRESERVED because
    they're the character's own outline (which we want to keep, like
    on the hand-keyed jog-east.png)."""
    px = img.load()
    w, h = img.size
    n = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0 or a == 255:
                continue
            if (r + g + b) / 3 > lum_thresh:
                px[x, y] = (0, 0, 0, 0)
                n += 1
    return n


def process(src: Path, dst: Path, frame_h: int, binary_alpha: bool, no_flood: bool, kill_halo: bool) -> None:
    img = Image.open(src).convert("RGBA")
    w, h = img.size
    if h != frame_h or w % FRAME_W != 0:
        raise RuntimeError(f"unexpected size {w}x{h}; expected width%{FRAME_W}==0 and height=={frame_h}")
    frames = w // FRAME_W
    if not no_flood:
        for i in range(frames):
            flood_clear_frame(img, i * FRAME_W, 0, FRAME_W, frame_h)
    halo_n = kill_light_halo(img) if kill_halo else 0
    zeroed = zero_rgb_on_transparent(img)
    binary_n = force_binary_alpha(img) if binary_alpha else 0
    img.save(dst, "PNG", optimize=True)
    flood_note = "no-flood" if no_flood else f"{frames} frames keyed"
    msg = f"{src.name} -> {dst.name}: {flood_note}, {zeroed} alpha=0 zeroed"
    if kill_halo:
        msg += f", {halo_n} light-halo killed"
    if binary_alpha:
        msg += f", {binary_n} alpha snapped to 0/255"
    print(msg)


if __name__ == "__main__":
    p = argparse.ArgumentParser(description="Flood-fill dehalo a horizontal sprite strip.")
    p.add_argument("src")
    p.add_argument("dst")
    p.add_argument("--frame-h", type=int, default=FRAME_H,
                   help=f"frame height in pixels (default {FRAME_H})")
    p.add_argument("--binary-alpha", action="store_true",
                   help="force every pixel to alpha 0 or 255 (NOT recommended for "
                        "player jog sprites — strips the anti-aliased outline and "
                        "produces frame-to-frame edge wobble)")
    p.add_argument("--no-flood", action="store_true",
                   help="skip the edge-flood-fill pass (only zero RGB on alpha=0). "
                        "Use this for AI-generated jog sources where the soft "
                        "colorkey already gave a clean silhouette and you want "
                        "to PRESERVE the anti-aliased outline like jog-east.png")
    p.add_argument("--kill-halo", action="store_true",
                   help="zero alpha on partial-alpha pixels whose color is light. "
                        "Removes the leftover white-halo bleed from a soft colorkey "
                        "while preserving DARK partial-alpha pixels (the character's "
                        "anti-aliased outline). Pairs well with --no-flood.")
    args = p.parse_args()
    process(Path(args.src), Path(args.dst), args.frame_h, args.binary_alpha, args.no_flood, args.kill_halo)
