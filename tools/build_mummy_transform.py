"""Extract the mummy -> skeleton transform animation from the uploaded
.mov, chroma-key the magenta (#FF00FF) background to transparent, and
tile the result into a single horizontal sprite sheet.

Mirrors tools/build_fire_goblin_*.py but for one one-shot animation:
the source video runs ~4.7 s but the actual transformation arc finishes
within the first ~3 s (frames 0-70 of the 145-frame source).  The rest
is the skeleton standing idle, so we drop it.

Sampling positions [0, 10, 20, 30, 40, 50, 60, 70] capture mummy ->
mid-shred -> skeleton in 8 frames.  At ~60 ms/frame on playback that
totals 480 ms ~= 0.5 s, matching the user's "half second or less" ask.
"""
import os
import subprocess
import tempfile
from PIL import Image
import numpy as np

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(
    REPO,
    '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_24851095-2677-47cc-8065-f9b6309ec22d_generated_video.mov',
)
OUT = os.path.join(REPO, 'public', 'sprites', 'monsters', 'mummy', 'transform.png')

POSITIONS = [0, 10, 20, 30, 40, 50, 60, 70]
FRAME = 256
KEY = np.array([255, 0, 255], dtype=np.int16)
# Two-stage key.  The h.264 source has wide magenta spill: clean solid
# bg, but the figure outline gets compressed into a halo of pink/purple
# pixels, AND some weaker magenta sneaks into the dark cracks between
# the bandages (e.g. RGB(147, 24, 127) found inside the body).
#   Stage 1: kill anything close to pure magenta (RGB distance < SIM).
#   Stage 2: kill any pixel where MAGENTA DOMINATES the channels --
#            R and B both meaningfully above G.  Tan bandages have
#            G close to R (and B BELOW G), so they survive.  Red eyes
#            have B close to G (not above), so they survive too.
SIM = 95


def chroma_key(img):
    arr = np.asarray(img.convert('RGBA'), dtype=np.int16)
    rgb = arr[..., :3]
    dist = np.sqrt(((rgb - KEY) ** 2).sum(axis=-1))
    solid = dist < SIM
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    magenta_dom = (r > g + 30) & (b > g + 30) & ((r + b) > (2 * g + 80))
    alpha = arr[..., 3]
    alpha[solid | magenta_dom] = 0
    arr[..., 3] = alpha
    return Image.fromarray(arr.astype(np.uint8), 'RGBA')


def main():
    out_dir = os.path.dirname(OUT)
    os.makedirs(out_dir, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        select = '+'.join(f"eq(n\\,{p})" for p in POSITIONS)
        cmd = [
            'ffmpeg', '-y', '-i', SRC,
            '-vf', f"select='{select}',scale={FRAME}:{FRAME}",
            '-vsync', '0', os.path.join(tmp, 'frame-%d.png'),
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        frames = []
        for i in range(1, len(POSITIONS) + 1):
            fp = os.path.join(tmp, f'frame-{i}.png')
            frames.append(chroma_key(Image.open(fp)))
        sheet = Image.new('RGBA', (FRAME * len(POSITIONS), FRAME), (0, 0, 0, 0))
        for i, f in enumerate(frames):
            sheet.paste(f, (i * FRAME, 0), f)
        sheet.save(OUT)
        print(f'wrote {OUT}  ({FRAME * len(POSITIONS)}x{FRAME})')


if __name__ == '__main__':
    main()
