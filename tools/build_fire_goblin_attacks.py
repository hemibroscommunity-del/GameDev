"""Extract attack-animation sprite sheets for the fire goblin from
5 .mov videos uploaded to the repo root.  Mirrors the walk-build
pipeline (build_fire_goblin_walks.py): extract N evenly-spaced
frames, chroma-key the cyan background, resize, tile horizontally.

Output: public/sprites/monsters/fire-goblin/attack-<dir>.png

Direction map by visual inspection of frame[0] of each .mov.
"""
import os
import subprocess
import tempfile
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(REPO, 'public', 'sprites', 'monsters', 'fire-goblin')
N_FRAMES = 8
FRAME = 256
KEY = (3, 233, 253)
SIM = 60

VIDS = {
    'n':  '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_e948070c-16db-46bd-8ef0-5c5e59d5769c_generated_video.mov',
    'nw': '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_06a23e1b-7efb-4bec-963d-3809e053c9f8_generated_video.mov',
    'w':  '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_f0fc4906-c111-479b-8e31-5a75d4439413_generated_video.mov',
    'sw': '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_4a084400-3cf3-4393-a2fb-0efaf9d8573c_generated_video.mov',
    's':  '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_ffe9e896-b8ac-4af7-bd1a-9c461fd59dc2_generated_video.mov',
}

def chroma_key(img: Image.Image) -> Image.Image:
    img = img.convert('RGBA')
    px = img.load()
    w, h = img.size
    kr, kg, kb = KEY
    sim2 = SIM * SIM
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            d = (r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2
            if d < sim2:
                px[x, y] = (0, 0, 0, 0)
    return img

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for direction, vid in VIDS.items():
        if not os.path.exists(vid):
            print(f'SKIP {direction}: {vid} not found')
            continue
        with tempfile.TemporaryDirectory() as tmp:
            raw = os.path.join(tmp, 'f_%03d.png')
            subprocess.run(
                ['ffmpeg', '-y', '-i', vid, '-vsync', '0', raw],
                check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
            frames = sorted(os.listdir(tmp))
            if not frames:
                print(f'SKIP {direction}: no frames extracted')
                continue
            step = len(frames) / N_FRAMES
            picks = [frames[min(len(frames) - 1, int(i * step))] for i in range(N_FRAMES)]
            sheet = Image.new('RGBA', (FRAME * N_FRAMES, FRAME), (0, 0, 0, 0))
            for i, name in enumerate(picks):
                f = Image.open(os.path.join(tmp, name))
                f = chroma_key(f).resize((FRAME, FRAME), Image.Resampling.LANCZOS)
                sheet.paste(f, (i * FRAME, 0), f)
            out = os.path.join(OUT_DIR, f'attack-{direction}.png')
            sheet.save(out, optimize=True)
            print(f'WROTE {out} ({N_FRAMES} frames @ {FRAME}px from {len(frames)})')

if __name__ == '__main__':
    main()
