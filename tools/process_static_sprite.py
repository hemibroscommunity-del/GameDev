"""
Process a JPEG with white background into a transparent, tightly-cropped, 128x128 PNG.
Used for slime-projectile and slime-remnants stills.
"""
import sys
from collections import deque
from pathlib import Path
from PIL import Image

CANVAS = 128
PAD = 2
SAT_THRESH = 25


def is_background(r: int, g: int, b: int) -> bool:
    return (max(r, g, b) - min(r, g, b)) <= SAT_THRESH


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


def alpha_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    alpha = img.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        raise RuntimeError("image is fully transparent after keying")
    return bbox


def fit_to_canvas(img: Image.Image, size: int) -> Image.Image:
    w, h = img.size
    scale = min(size / w, size / h)
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))
    resized = img.resize((new_w, new_h), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(resized, ((size - new_w) // 2, (size - new_h) // 2), resized)
    return canvas


def process(src: Path, dst: Path) -> None:
    img = Image.open(src)
    keyed = remove_background(img)
    x0, y0, x1, y1 = alpha_bbox(keyed)
    x0 = max(0, x0 - PAD)
    y0 = max(0, y0 - PAD)
    x1 = min(keyed.width, x1 + PAD)
    y1 = min(keyed.height, y1 + PAD)
    cropped = keyed.crop((x0, y0, x1, y1))
    fitted = fit_to_canvas(cropped, CANVAS)
    fitted.save(dst, "PNG", optimize=True)
    print(f"{src.name} {img.size} -> bbox {(x1-x0, y1-y0)} -> {dst}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: process_static_sprite.py <src> <dst>")
    process(Path(sys.argv[1]), Path(sys.argv[2]))
