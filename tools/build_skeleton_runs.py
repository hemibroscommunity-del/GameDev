"""Skeleton form run-cycle sprite sheets — mirror of build_mummy_walks
with the skeleton .movs and run-<dir>.png output names.

Direction map (after the user's two-pass visual confirmation -- initial
guesses for se/e/ne/n were corrected, then 'w-2' relabeled to 'nw'):
  s   = front, red eye sockets facing camera
  w   = left profile, sprint with speed lines   (was guessed 'se')
  nw  = 3/4 back-left, cleaner stride           (was guessed 'e',
        relabeled 'w-2' on the first pass, finally 'nw')
  n   = back, body angled away                  (was guessed 'ne')
  sw  = facing toward viewer-left-down          (was guessed 'n')
"""
import os
import subprocess
import tempfile
from PIL import Image
import numpy as np

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(REPO, 'public', 'sprites', 'monsters', 'skeleton')
N_FRAMES = 8
FRAME = 256
KEY = np.array([255, 0, 255], dtype=np.int16)
SIM = 95

VIDS = {
    's':  '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_2e5d3dc8-b40d-414c-b465-204318ed5ff4_generated_video.mov',
    'w':  '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_e52613e7-a66a-4ba1-9d10-cefcc87ece88_generated_video.mov',
    'nw': '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_be7b0f4f-f44a-4cb0-a19c-02bfb057d798_generated_video.mov',
    'n':  '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_46cb19f4-42c1-4f37-bd13-207d760a2e0d_generated_video.mov',
    'sw': '_users_1c1c79a0-6a1d-45f8-b7cb-5dde29783305_generated_2224b8a7-2fa8-49dd-829e-f11891ef3b0a_generated_video.mov',
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
    out = os.path.join(OUT_DIR, f'run-{direction}.png')
    # ffprobe nb_frames is unreliable on these h.264 .movs -- decode the
    # full sequence to /tmp first and count real frames (see
    # build_mummy_walks.py for the rationale).
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run([
            'ffmpeg', '-y', '-i', src,
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
        sheet.save(out)
        print(f'  wrote {os.path.relpath(out, REPO)}  ({FRAME * N_FRAMES}x{FRAME})  total={total}  positions={positions}')


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for d, v in VIDS.items():
        build_one(d, v)


if __name__ == '__main__':
    main()
