"""Hit-reaction sprite sheets for the fire goblin.  Same pipeline as
build_fire_goblin_walks.py / build_fire_goblin_attacks.py.

User uploaded 4 .mov videos.  Per the chat note, the SW source is a
near-side profile and doubles for both SW and W (and mirrors to E /
SE).  4 source directions: N / S / SW / NW.
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
    'n':  '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_31262197-a918-4fbd-a405-5a0deeb0c74d_generated_video.mov',
    's':  '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_60d4052d-5198-4a9e-8137-0d7c1f5b72cd_generated_video.mov',
    'sw': '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_68f92515-855c-49d7-8b3a-c5d273120274_generated_video.mov',
    'nw': '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_c38897a5-0fef-47f3-b6e5-3a24e3c55041_generated_video.mov',
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
            out = os.path.join(OUT_DIR, f'hit-{direction}.png')
            sheet.save(out, optimize=True)
            print(f'WROTE {out} ({N_FRAMES} frames @ {FRAME}px from {len(frames)})')

if __name__ == '__main__':
    main()
