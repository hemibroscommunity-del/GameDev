"""Extract walk-cycle sprite sheets for the fire goblin from the
4 .mov videos uploaded to the repo root.  For each direction:
  - extract N evenly-spaced frames
  - chroma-key the cyan background to transparent
  - resize each frame to FRAME px square
  - tile horizontally into a single sprite sheet
  - save to public/sprites/monsters/fire-goblin/walk-<dir>.png

Direction map is by visual inspection of frame[0] of each .mov
(see commit message for which UUID is which).
"""
import os
import subprocess
import tempfile
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(REPO, 'public', 'sprites', 'monsters', 'fire-goblin')
N_FRAMES = 8          # frames per walk cycle
FRAME = 256           # px per frame (square)
# Cyan background ~ (0-7, 228-238, 250-254).  Use a moderately wide
# similarity so semi-transparent edges flatten to alpha 0.
KEY = (3, 233, 253)
SIM = 60              # rgb euclidean dist threshold

VIDS = {
    's':  '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_289ca436-7a3b-4906-ab27-3d4e13f0c023_generated_video.mov',
    'sw': '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_9d6c2e6a-4d17-4274-be28-cac87940cc89_generated_video.mov',
    'e':  '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_a514acfd-e8b3-49bc-8710-5b5b21fe059d_generated_video.mov',
    'n':  '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_e8550fdd-7bc2-407a-ad38-ab749b809012_generated_video.mov',
}

def chroma_key(img: Image.Image) -> Image.Image:
    """RGB pixel-by-pixel distance test against KEY; below SIM -> alpha 0."""
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
            # Evenly subsample N_FRAMES out of len(frames)
            step = len(frames) / N_FRAMES
            picks = [frames[min(len(frames) - 1, int(i * step))] for i in range(N_FRAMES)]
            sheet = Image.new('RGBA', (FRAME * N_FRAMES, FRAME), (0, 0, 0, 0))
            for i, name in enumerate(picks):
                f = Image.open(os.path.join(tmp, name))
                f = chroma_key(f).resize((FRAME, FRAME), Image.Resampling.LANCZOS)
                sheet.paste(f, (i * FRAME, 0), f)
            out = os.path.join(OUT_DIR, f'walk-{direction}.png')
            sheet.save(out, optimize=True)
            print(f'WROTE {out} ({N_FRAMES} frames @ {FRAME}px from {len(frames)})')

if __name__ == '__main__':
    main()
