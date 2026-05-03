"""
Build a hit-reaction sprite sheet from a generative-video MOV.

Flow:
1. ffmpeg samples N frames over the first 0.25 s of the video (24 fps source
   gives 6 frames at exactly 0.25 s).
2. PIL loads each frame, removes the white-ish background via flood-fill from
   edges, and computes the alpha bbox.
3. Take the union bbox across all frames so the character stays anchored
   (no per-frame pop) and crop each frame to it.
4. Center-fit each crop into a SIZE×SIZE canvas.
5. Composite the 6 canvases horizontally into a (N*SIZE)×SIZE sprite sheet.
"""
import sys
import subprocess
import tempfile
from collections import deque
from pathlib import Path
from PIL import Image

FRAMES = 6
SIZE = 64
SAT_THRESH = 25
PAD = 3
CHAR_HEIGHT_FRAC = 0.78  # match jog/stand character height as fraction of canvas
FOOT_PAD_FRAC = 0.09     # leave a few px of empty ground under feet so shadow lines up
BG_BRIGHTNESS_MIN = 230  # only key low-sat pixels brighter than this (preserves dark/gray outlines, not just pure black)


def extract_frames(src: Path, n: int, start_s: float, end_s: float, tmpdir: Path) -> list[Path]:
    """Sample n frames evenly distributed across [start_s, end_s] of the video.
    Extracts at a slightly higher rate than n/duration to dodge ffmpeg's
    fps-filter rounding (which can drop the last sample), then keeps only the
    first n outputs."""
    duration = max(0.001, end_s - start_s)
    fps = (n + 0.5) / duration  # over-sample ~0.5 frame
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-ss", f"{start_s:.4f}",
        "-i", str(src),
        "-t", f"{duration + 0.2:.4f}",
        "-vf", f"fps={fps}",
        "-vsync", "0",
        str(tmpdir / "frame_%03d.png"),
    ]
    subprocess.run(cmd, check=True)
    out = sorted(tmpdir.glob("frame_*.png"))
    if len(out) < n:
        raise RuntimeError(f"expected >= {n} frames, got {len(out)}")
    return out[:n]


def is_background(r: int, g: int, b: int) -> bool:
    """Background = low saturation AND bright. The brightness floor
    preserves dark/black outlines (low-sat but dark) on the character,
    which the previous saturation-only check was wiping along with
    the white background."""
    sat = max(r, g, b) - min(r, g, b)
    if sat > SAT_THRESH:
        return False
    return max(r, g, b) >= BG_BRIGHTNESS_MIN


def remove_background(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    visited = [[False] * h for _ in range(w)]
    q: deque = deque()
    for x in range(w):
        for y in (0, h - 1):
            r, g, b, _ = px[x, y]
            if is_background(r, g, b):
                q.append((x, y))
                visited[x][y] = True
    for y in range(h):
        for x in (0, w - 1):
            r, g, b, _ = px[x, y]
            if is_background(r, g, b):
                q.append((x, y))
                visited[x][y] = True
    while q:
        x, y = q.popleft()
        px[x, y] = (255, 255, 255, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[nx][ny]:
                visited[nx][ny] = True
                r, g, b, _ = px[nx, ny]
                if is_background(r, g, b):
                    q.append((nx, ny))
    return img


def union_bbox(boxes: list[tuple[int, int, int, int]]) -> tuple[int, int, int, int]:
    x0 = min(b[0] for b in boxes)
    y0 = min(b[1] for b in boxes)
    x1 = max(b[2] for b in boxes)
    y1 = max(b[3] for b in boxes)
    return (x0, y0, x1, y1)


def fit_to_canvas(img: Image.Image, size: int) -> Image.Image:
    """Scale to CHAR_HEIGHT_FRAC of canvas height and anchor at the bottom
    (with FOOT_PAD_FRAC under the feet) so the character has proportions
    similar to the existing jog/stand sheets — full-canvas-fit was making
    hit sprites visibly oversized vs jog/stand."""
    w, h = img.size
    target_h = int(round(size * CHAR_HEIGHT_FRAC))
    scale = target_h / h
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))
    if new_w > size:
        scale *= size / new_w
        new_w = size
        new_h = max(1, int(round(h * scale)))
    resized = img.resize((new_w, new_h), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    foot_y = size - int(round(size * FOOT_PAD_FRAC))
    paste_x = (size - new_w) // 2
    paste_y = foot_y - new_h
    canvas.paste(resized, (paste_x, paste_y), resized)
    return canvas


def process(src: Path, dst: Path, start_s: float, end_s: float) -> None:
    with tempfile.TemporaryDirectory() as td:
        tmpdir = Path(td)
        frame_paths = extract_frames(src, FRAMES, start_s, end_s, tmpdir)
        keyed = [remove_background(Image.open(p)) for p in frame_paths]
        bboxes = []
        for img in keyed:
            bb = img.getchannel("A").getbbox()
            if bb is None:
                raise RuntimeError(f"frame fully transparent: {src}")
            bboxes.append(bb)
        ux0, uy0, ux1, uy1 = union_bbox(bboxes)
        w0, h0 = keyed[0].size
        ux0 = max(0, ux0 - PAD)
        uy0 = max(0, uy0 - PAD)
        ux1 = min(w0, ux1 + PAD)
        uy1 = min(h0, uy1 + PAD)
        sheet = Image.new("RGBA", (FRAMES * SIZE, SIZE), (0, 0, 0, 0))
        for i, img in enumerate(keyed):
            cropped = img.crop((ux0, uy0, ux1, uy1))
            fitted = fit_to_canvas(cropped, SIZE)
            sheet.paste(fitted, (i * SIZE, 0), fitted)
        sheet.save(dst, "PNG", optimize=True)
        print(f"{src.name} -> {dst} (bbox {ux1 - ux0}x{uy1 - uy0})")


if __name__ == "__main__":
    if len(sys.argv) not in (3, 5):
        sys.exit("usage: process_hit_react_video.py <src.mov> <dst.png> [start_s end_s]")
    start_s = float(sys.argv[3]) if len(sys.argv) == 5 else 0.0
    end_s = float(sys.argv[4]) if len(sys.argv) == 5 else 0.25
    process(Path(sys.argv[1]), Path(sys.argv[2]), start_s, end_s)
