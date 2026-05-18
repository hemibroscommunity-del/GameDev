"""Extract mummy walk-cycle sprite sheets from the 5 uploaded .movs.
Mirrors tools/build_fire_goblin_walks.py but with the mummy chroma-key
recipe (two-stage magenta key — see build_mummy_transform.py for the
'magenta dominates the channels' filter that wipes h.264 spill inside
the bandage cracks).

For each direction:
  - extract N evenly-spaced frames across the full clip (walk cycles
    loop, so we sample uniformly rather than from a sub-range)
  - chroma-key the magenta background to transparent
  - resize each frame to FRAME px square
  - tile horizontally into a single sprite sheet
  - save to public/sprites/monsters/mummy/walk-<dir>.png

Direction map (after the user's visual-confirmation pass — initial
guesses for 'e' and 'ne' were corrected to 'w' and 'nw'):
  s   = front, red eyes facing camera, mid-stride
  se  = 3/4 front, body angled toward viewer-right
  w   = left profile  (was guessed as 'e' from the frame[0] thumbnail)
  nw  = 3/4 back-left (was guessed as 'ne')
  n   = back, no face features, arms spread
"""
import os
import subprocess
import tempfile
from PIL import Image
import numpy as np

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(REPO, 'public', 'sprites', 'monsters', 'mummy')
N_FRAMES = 8
FRAME = 256
KEY = np.array([255, 0, 255], dtype=np.int16)
SIM = 95

VIDS = {
    's':  '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_8853cd40-fb83-42b5-b617-ea4cbfe299bc_generated_video.mov',
    'se': '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_dabb3f54-61ad-425f-81b5-f65e010d38da_generated_video.mov',
    'w':  '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_f4985290-f33b-46d3-933a-6beb30cafd3c_generated_video.mov',
    'nw': '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_f6d60268-0109-49a0-9a5e-b3284d671312_generated_video.mov',
    'n':  '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_50b4efbe-e7f6-4456-afe1-1cae21fb4565_generated_video.mov',
}


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


def build_one(direction, vid):
    src = os.path.join(REPO, vid)
    out = os.path.join(OUT_DIR, f'walk-{direction}.png')
    # ffprobe nb_frames is unreliable on these h.264 .movs (it reports
    # B-frame-inflated counts that don't decode -- e.g. one clip says
    # nb_frames=82 but ffmpeg only extracts 24 real frames).  So we
    # extract the full sequence FIRST and count what's actually there.
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run([
            'ffmpeg', '-y', '-i', src,
            '-vf', f'scale={FRAME}:{FRAME}',
            '-vsync', '0',
            os.path.join(tmp, 'frame-%03d.png'),
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        all_frames = sorted(p for p in os.listdir(tmp) if p.startswith('frame-'))
        total = len(all_frames)
        # Evenly sample N_FRAMES across what actually decoded.
        positions = [round(i * (total - 1) / (N_FRAMES - 1)) for i in range(N_FRAMES)]
        sheet = Image.new('RGBA', (FRAME * N_FRAMES, FRAME), (0, 0, 0, 0))
        for i, p in enumerate(positions):
            fp = os.path.join(tmp, all_frames[p])
            f = chroma_key(Image.open(fp))
            sheet.paste(f, (i * FRAME, 0), f)
        sheet.save(out)
        print(f'  wrote {os.path.relpath(out, REPO)}  ({FRAME * N_FRAMES}x{FRAME})  total={total}  positions={positions}')


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for d, v in VIDS.items():
        build_one(d, v)


if __name__ == '__main__':
    main()
