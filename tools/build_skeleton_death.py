"""Extract the skeleton death animation from the uploaded mp4, chroma-key
the magenta (#FF00FF) background, and tile into a single horizontal
sprite sheet at public/sprites/monsters/skeleton/death.png.

Source is 545x544, 145 frames, 6.04 s.  Down-sampled to 16 frames so
the renderer's existing death playback maths (elapsed/deathMs * fc)
gives ~75 ms per frame at deathMs=1200 -- snappier than the source's
24 fps so the death reads quickly without losing the bones-crumble +
dust + bone-pile arc.

Chroma-key uses the same two-stage approach as build_mummy_transform
(solid distance + magenta-dominant channel test) which handles h.264
spill into dark areas of the figure without eating tan bone tones.
"""
import os
import subprocess
import tempfile
from PIL import Image
import numpy as np

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(
    REPO,
    '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_f840de52-97a8-434c-bb05-ddb5909aef85_generated_video.mp4',
)
OUT = os.path.join(REPO, 'public', 'sprites', 'monsters', 'skeleton', 'death.png')

N_FRAMES = 16
FRAME = 256
KEY = np.array([255, 0, 255], dtype=np.int16)
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
        # Decode the whole source first; ffprobe nb_frames is unreliable
        # on these h.264 clips so we count what actually decodes.
        subprocess.run([
            'ffmpeg', '-y', '-i', SRC,
            '-vf', f'scale={FRAME}:{FRAME}',
            '-vsync', '0',
            os.path.join(tmp, 'frame-%03d.png'),
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        all_frames = sorted(p for p in os.listdir(tmp) if p.startswith('frame-'))
        total = len(all_frames)
        positions = [round(i * (total - 1) / (N_FRAMES - 1)) for i in range(N_FRAMES)]
        sheet = Image.new('RGBA', (FRAME * N_FRAMES, FRAME), (0, 0, 0, 0))
        for i, p in enumerate(positions):
            fp = os.path.join(tmp, all_frames[p])
            f = chroma_key(Image.open(fp))
            sheet.paste(f, (i * FRAME, 0), f)
        sheet.save(OUT)
        print(f'wrote {os.path.relpath(OUT, REPO)}  ({FRAME * N_FRAMES}x{FRAME})  total={total}  positions={positions}')


if __name__ == '__main__':
    main()
