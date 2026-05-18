"""Normalize mummy walk sheets so the figure renders at a consistent
on-screen height across all directions.

Same approach as tools/normalize_skeleton_sheets.py -- union-bbox the
8 frames per direction, rescale to a target height, anchor at the
bottom of the 256x256 frame.

Run after build_mummy_walks.py.
"""
import os
from PIL import Image
import numpy as np

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(REPO, 'public', 'sprites', 'monsters', 'mummy')

FRAME_W = 256
FRAME_H = 256
N_FRAMES = 16
TARGET_H = 220

DIRS = ['s', 'se', 'w', 'nw', 'n']


def bbox_of(arr_alpha):
    rows = np.any(arr_alpha > 0, axis=1)
    cols = np.any(arr_alpha > 0, axis=0)
    if not rows.any() or not cols.any():
        return None
    t = int(np.argmax(rows))
    b = len(rows) - int(np.argmax(rows[::-1]))
    l = int(np.argmax(cols))
    r = len(cols) - int(np.argmax(cols[::-1]))
    return (l, t, r, b)


def normalize(direction):
    path = os.path.join(OUT_DIR, f'walk-{direction}.png')
    sheet = Image.open(path).convert('RGBA')
    if sheet.width != FRAME_W * N_FRAMES or sheet.height != FRAME_H:
        print(f'  skip {direction}: unexpected size {sheet.size}')
        return
    frames = [sheet.crop((i * FRAME_W, 0, (i + 1) * FRAME_W, FRAME_H)) for i in range(N_FRAMES)]
    arrs = [np.asarray(f) for f in frames]
    union = None
    for a in arrs:
        bb = bbox_of(a[..., 3])
        if bb is None: continue
        if union is None:
            union = list(bb)
        else:
            union[0] = min(union[0], bb[0])
            union[1] = min(union[1], bb[1])
            union[2] = max(union[2], bb[2])
            union[3] = max(union[3], bb[3])
    if union is None:
        print(f'  skip {direction}: all frames empty')
        return
    l, t, r, b = union
    bbox_h = b - t
    bbox_w = r - l
    scale = TARGET_H / bbox_h
    # Cap the scale so the figure's WIDTH stays inside the 256-frame
    # cell -- walk-n's arms-out stance was wider than tall after the
    # height-based scale, so arms spilled into adjacent frames.
    max_w_scale = (FRAME_W - 8) / bbox_w
    scale = min(scale, max_w_scale)
    new_w = int(round(bbox_w * scale))
    new_h = int(round(bbox_h * scale))
    out_sheet = Image.new('RGBA', (FRAME_W * N_FRAMES, FRAME_H), (0, 0, 0, 0))
    pad_x = (FRAME_W - new_w) // 2
    pad_y = FRAME_H - new_h - 8
    for i, f in enumerate(frames):
        cropped = f.crop((l, t, r, b))
        resized = cropped.resize((new_w, new_h), Image.LANCZOS)
        out_sheet.paste(resized, (i * FRAME_W + pad_x, pad_y), resized)
    out_sheet.save(path)
    print(f'  wrote {os.path.relpath(path, REPO)}  bbox={union}  scale={scale:.3f}  -> figure {new_w}x{new_h}')


def main():
    for d in DIRS:
        normalize(d)


if __name__ == '__main__':
    main()
