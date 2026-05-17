"""
Build the player death sprite sheet from extracted video frames.

Workflow:
  1. Load tools/death-frames/frame_001.png .. frame_NNN.png (already
     extracted at 128x128 by ffmpeg).
  2. Key out the magenta background.  Sample threshold: any pixel
     where the green channel is low AND red+blue dominate becomes
     transparent.
  3. Concatenate horizontally into a single sprite sheet PNG at
     public/sprites/players/death-v1.png.
"""
import os
import sys
from PIL import Image

FRAMES_DIR = 'tools/death-frames'
OUT_PATH = 'public/sprites/players/death-v1.png'
FW, FH = 128, 128


def is_magenta(r, g, b):
    """True if the pixel reads as part of the magenta background.

    Real magenta is around (255, 0, 255).  Anti-aliased fringes
    cluster as pink-purple-ish: low green, similar red+blue both
    high.  Rule:
      g < 100  (real magenta has zero green; AA fringe creeps up)
      AND r > 120 AND b > 120
      AND (r - g) > 60 AND (b - g) > 60  (red+blue both dominate
      green by a clear margin — ensures we don't kill warm skin
      tones that happen to be reddish).
    """
    if g >= 100:
        return False
    if r <= 120 or b <= 120:
        return False
    return (r - g) > 60 and (b - g) > 60


def key_frame(im):
    px = im.load()
    w, h = im.size
    killed = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if is_magenta(r, g, b):
                px[x, y] = (0, 0, 0, 0)
                killed += 1
    return killed


def main():
    files = sorted(f for f in os.listdir(FRAMES_DIR) if f.endswith('.png'))
    if not files:
        print('no frames in ' + FRAMES_DIR, file=sys.stderr)
        sys.exit(1)
    n = len(files)
    sheet = Image.new('RGBA', (n * FW, FH), (0, 0, 0, 0))
    total_killed = 0
    for i, fname in enumerate(files):
        im = Image.open(os.path.join(FRAMES_DIR, fname)).convert('RGBA')
        if im.size != (FW, FH):
            im = im.resize((FW, FH), Image.NEAREST)
        killed = key_frame(im)
        total_killed += killed
        sheet.paste(im, (i * FW, 0))
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    sheet.save(OUT_PATH)
    print(f'{n} frames -> {OUT_PATH}  ({sheet.size[0]}x{sheet.size[1]}, {total_killed} magenta pixels keyed)')


if __name__ == '__main__':
    main()
