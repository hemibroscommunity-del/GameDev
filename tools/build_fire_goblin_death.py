"""Death animation sheet + remnants asset for the fire goblin.

Inputs at repo root:
  - 1 .mov (death cycle, 24 fps, ~1.7 s)
  - 1 .png (single-frame remnants on cyan bg)

Outputs:
  - public/sprites/monsters/fire-goblin/death.png    (16 frames x 256 px)
  - public/sprites/monsters/fire-goblin/remnants.png (single frame)

Same chroma-key recipe as build_fire_goblin_walks.py.
"""
import os
import subprocess
import tempfile
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(REPO, 'public', 'sprites', 'monsters', 'fire-goblin')
DEATH_FRAMES = 16
FRAME = 256
KEY = (3, 233, 253)
SIM = 60

DEATH_VID = '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_643b2630-04c9-46ec-b38e-7673aa7dacd3_generated_video.mov'
REMNANTS_PNG = '57EE8CD5-3821-487B-A2A4-F7F6BDC27619.png'

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

def build_death():
    if not os.path.exists(DEATH_VID):
        print(f'SKIP death: {DEATH_VID} not found')
        return
    with tempfile.TemporaryDirectory() as tmp:
        raw = os.path.join(tmp, 'f_%03d.png')
        subprocess.run(
            ['ffmpeg', '-y', '-i', DEATH_VID, '-vsync', '0', raw],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        frames = sorted(os.listdir(tmp))
        if not frames:
            print('SKIP death: no frames extracted')
            return
        step = len(frames) / DEATH_FRAMES
        picks = [frames[min(len(frames) - 1, int(i * step))] for i in range(DEATH_FRAMES)]
        sheet = Image.new('RGBA', (FRAME * DEATH_FRAMES, FRAME), (0, 0, 0, 0))
        for i, name in enumerate(picks):
            f = Image.open(os.path.join(tmp, name))
            f = chroma_key(f).resize((FRAME, FRAME), Image.Resampling.LANCZOS)
            sheet.paste(f, (i * FRAME, 0), f)
        out = os.path.join(OUT_DIR, 'death.png')
        sheet.save(out, optimize=True)
        print(f'WROTE {out} ({DEATH_FRAMES} frames @ {FRAME}px from {len(frames)})')

def build_remnants():
    if not os.path.exists(REMNANTS_PNG):
        print(f'SKIP remnants: {REMNANTS_PNG} not found')
        return
    img = Image.open(REMNANTS_PNG)
    img = chroma_key(img)
    if img.size[0] > FRAME or img.size[1] > FRAME:
        img.thumbnail((FRAME, FRAME), Image.Resampling.LANCZOS)
    out = os.path.join(OUT_DIR, 'remnants.png')
    img.save(out, optimize=True)
    print(f'WROTE {out} ({img.size[0]}x{img.size[1]})')

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    build_death()
    build_remnants()

if __name__ == '__main__':
    main()
