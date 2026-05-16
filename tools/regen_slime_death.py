"""
Regenerate the slime-death sprite sheet from the source video with
aggressive near-white keying.

Pipeline:
  1. Pull frames 98..140 (every 3rd, 15 frames) from
     assets/monster animations/slime-death.mp4 via ffmpeg.
     These are the burst frames; pre-burst sit+grow (0..95) is dropped.
  2. Centre-crop each 640x1408 frame to 640x640 (vertical y 384..1024,
     where the slime sits) and scale to 128x128.
  3. Tile horizontally into a 1920x128 strip.
  4. Key out near-white pixels with an aggressive ruleset (see KEY_*).
     Kept pixels are forced fully opaque so no soft halo bleeds through.
  5. Write public/sprites/monsters/slime-death-v9.png.

Run from repo root:
  python tools/regen_slime_death.py

Tunables (all in 0..255 luminance space):
  KEY_LUM_HARD   any opaque pixel brighter than this dies, period.
                 No green-leniency here -- pale-green highlights read
                 as "white" to the eye, so they go.
  KEY_LUM_SAT    pixels brighter than this die if low-saturation.
                 Catches mid-luminance greys/whites.
  KEY_SAT_MIN    saturation threshold for the desaturated branch.
"""
import os
import shutil
import subprocess
import sys
from PIL import Image

SRC_VIDEO = os.path.join('assets', 'monster animations', 'slime-death.mp4')
DST_SHEET = os.path.join('public', 'sprites', 'monsters', 'slime-death-v9.png')
WORK_DIR = os.path.join('.build', 'slime-death-regen')

FRAME_START = 98
FRAME_END = 140
FRAME_STEP = 3
FRAME_SIZE = 128
SRC_CROP_TOP = 384      # 640x1408 -> centred 640x640
SRC_CROP_HEIGHT = 640

# Strict "anything white" key. Slime body sits in lum 50-125 (saturated
# green, g >> r,b). Above 125 the pixels are pale-green-cream highlights
# from the source video that read as white -- so kill them flat.
KEY_LUM_HARD = 125      # anything brighter than this -> alpha 0, no exceptions
KEY_LUM_SAT  = 90       # plus low-saturation pixels above this lum
KEY_SAT_MIN  = 0.20     # saturation cutoff for the desaturated branch


def extract_frames():
    if os.path.isdir(WORK_DIR):
        shutil.rmtree(WORK_DIR)
    os.makedirs(WORK_DIR, exist_ok=True)
    select = f"between(n,{FRAME_START},{FRAME_END})*not(mod(n-{FRAME_START},{FRAME_STEP}))"
    cmd = [
        'ffmpeg', '-y', '-loglevel', 'error',
        '-i', SRC_VIDEO,
        '-vf', f"select='{select}',setpts=N/24/TB",
        '-vsync', '0',
        os.path.join(WORK_DIR, 'raw_%03d.png'),
    ]
    subprocess.run(cmd, check=True)
    frames = sorted(f for f in os.listdir(WORK_DIR) if f.startswith('raw_'))
    expected = ((FRAME_END - FRAME_START) // FRAME_STEP) + 1
    if len(frames) != expected:
        raise RuntimeError(f'expected {expected} frames, got {len(frames)}')
    return [os.path.join(WORK_DIR, f) for f in frames]


def key_frame(im: Image.Image) -> Image.Image:
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size
    killed = 0
    for y in range(h):
        for x in range(w):
            r, g, b, _a = px[x, y]
            lum = (r + g + b) / 3
            mx = max(r, g, b)
            mn = min(r, g, b)
            sat = 0 if mx == 0 else (mx - mn) / mx
            kill = (
                lum > KEY_LUM_HARD
                or (lum > KEY_LUM_SAT and sat < KEY_SAT_MIN)
            )
            if kill:
                px[x, y] = (0, 0, 0, 0)
                killed += 1
            else:
                px[x, y] = (r, g, b, 255)
    return im, killed


def main():
    frame_paths = extract_frames()
    print(f'extracted {len(frame_paths)} frames from {SRC_VIDEO}')

    sheet = Image.new('RGBA', (FRAME_SIZE * len(frame_paths), FRAME_SIZE), (0, 0, 0, 0))
    total_killed = 0
    for i, fp in enumerate(frame_paths):
        raw = Image.open(fp).convert('RGBA')
        cropped = raw.crop((0, SRC_CROP_TOP, raw.width, SRC_CROP_TOP + SRC_CROP_HEIGHT))
        scaled = cropped.resize((FRAME_SIZE, FRAME_SIZE), Image.LANCZOS)
        keyed, killed = key_frame(scaled)
        total_killed += killed
        sheet.paste(keyed, (i * FRAME_SIZE, 0))

    os.makedirs(os.path.dirname(DST_SHEET), exist_ok=True)
    sheet.save(DST_SHEET)
    print(f'wrote {DST_SHEET}: {sheet.size}, total near-white pixels keyed: {total_killed}')


if __name__ == '__main__':
    main()
