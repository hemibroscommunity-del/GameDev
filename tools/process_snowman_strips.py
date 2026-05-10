"""Build the snowman idle-loop sprite strips from the source MP4s.

Why this script exists: ffmpeg's `colorkey` filter is global — it
turns *any* pixel matching the background color transparent, which
ate the black hat and bright snow highlights of the painted snowman
art.  We instead flood-fill from the image border so only
border-connected bg pixels become transparent; interior pixels that
happen to match the bg stay opaque.

Pipeline per direction:
  1. ffmpeg samples the MP4 at 4 fps for 6 s -> 24 frames at 128x128
  2. Pillow flood-fills each frame's bg from the border
  3. Pillow combines the 24 RGBA frames into one horizontal strip
  4. Strip lands at public/sprites/monsters/snowman/snowman-{dir}.png

Run from project root:  python tools/process_snowman_strips.py
"""

import os
import subprocess
import sys
import tempfile
from collections import deque
from PIL import Image

DIRS_BG = {
    's': 'white',
    'sw': 'black',
    'e': 'black',
    'n': 'white',
    'ne': 'black',
}

SRC_DIR = 'assets/monster animations/snowman'
DEST_DIR = 'public/sprites/monsters/snowman'
FPS = 4
DURATION = 6
FRAME_SIZE = 128
NUM_FRAMES = FPS * DURATION  # 24
RGB_TOLERANCE = 8   # per-channel ± window for "matches bg"


def floodfill_bg_to_alpha(img, bg_rgb, tol):
    """Make every bg-colored pixel reachable from the border transparent.
       Interior bg-colored pixels stay opaque (this is the whole point —
       a hat shadow that happens to be near-black is preserved)."""
    w, h = img.size
    px = img.load()
    bgr, bgg, bgb = bg_rgb
    visited = bytearray(w * h)
    q = deque()

    def is_bg(x, y):
        r, g, b, _a = px[x, y]
        return (abs(r - bgr) <= tol
                and abs(g - bgg) <= tol
                and abs(b - bgb) <= tol)

    # Seed every border pixel that matches bg
    for x in range(w):
        for y in (0, h - 1):
            if not visited[y * w + x] and is_bg(x, y):
                visited[y * w + x] = 1
                q.append((x, y))
    for y in range(1, h - 1):
        for x in (0, w - 1):
            if not visited[y * w + x] and is_bg(x, y):
                visited[y * w + x] = 1
                q.append((x, y))

    while q:
        x, y = q.popleft()
        r, g, b, _a = px[x, y]
        px[x, y] = (r, g, b, 0)
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny * w + nx]:
                if is_bg(nx, ny):
                    visited[ny * w + nx] = 1
                    q.append((nx, ny))

    return img


def process_direction(dir_short, bg_kind):
    src = os.path.join(SRC_DIR, f'snowman-idle-{dir_short}.mp4')
    dst = os.path.join(DEST_DIR, f'snowman-{dir_short}.png')
    bg_rgb = (255, 255, 255) if bg_kind == 'white' else (0, 0, 0)
    pad_color = 'white' if bg_kind == 'white' else 'black'

    with tempfile.TemporaryDirectory() as tmp:
        # Extract scaled frames; pad in matching bg color so the floodfill
        # cleanly removes the padding in the same pass.
        cmd = [
            'ffmpeg', '-y', '-t', str(DURATION), '-i', src,
            '-vf',
            (f'fps={FPS},'
             f'scale={FRAME_SIZE}:{FRAME_SIZE}:force_original_aspect_ratio=decrease,'
             f'pad={FRAME_SIZE}:{FRAME_SIZE}:(ow-iw)/2:(oh-ih)/2:color={pad_color}'),
            '-loglevel', 'error',
            os.path.join(tmp, 'frame_%04d.png'),
        ]
        subprocess.run(cmd, check=True)

        strip = Image.new('RGBA', (FRAME_SIZE * NUM_FRAMES, FRAME_SIZE), (0, 0, 0, 0))
        for i in range(NUM_FRAMES):
            frame_path = os.path.join(tmp, f'frame_{i + 1:04d}.png')
            if not os.path.exists(frame_path):
                continue
            img = Image.open(frame_path).convert('RGBA')
            img = floodfill_bg_to_alpha(img, bg_rgb, RGB_TOLERANCE)
            strip.paste(img, (FRAME_SIZE * i, 0))

        os.makedirs(DEST_DIR, exist_ok=True)
        strip.save(dst)
        print(f'wrote {dst}  ({strip.size[0]}x{strip.size[1]} rgba)')


def main():
    for d, bg in DIRS_BG.items():
        process_direction(d, bg)


if __name__ == '__main__':
    main()
