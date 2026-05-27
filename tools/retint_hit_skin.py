"""Recolor hit-react sprite skin to match the stand/jog skin tone.

The hit-south and hit-north sheets shipped with a peach/washed-out
skin (mean ≈ [195, 134, 87] / [193, 136, 84]) that reads as a
different character than the stand/jog sheets (mean ≈ [192, 124, 70]).
This script computes a per-file delta from each hit sheet's mean
skin color to the canonical stand/jog mean, then applies that delta
to every skin-classified pixel in the sheet.

Only RGB is touched; outline and clothing pixels are excluded by the
skin classifier (R > G > B, R in 120..240, G in 70..180).
"""
import os
from PIL import Image
import numpy as np

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET_DIR = os.path.join(REPO, 'public', 'sprites', 'player')
TARGET = np.array([192, 124, 70], dtype=float)  # stand/jog mean
SHEETS = ['hit-east', 'hit-north', 'hit-northeast', 'hit-south', 'hit-southwest']


def skin_mask(rgb, alpha):
    R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return (
        (alpha > 200)
        & (R > G) & (G > B)
        & (R > 120) & (R < 240)
        & (G > 70) & (G < 180)
    )


def retint(path):
    """Per-frame retint: each 256-wide horizontal frame gets its own
    skin-mean → TARGET delta so an outlier frame (e.g. hit-north's
    first which was much lighter than the rest) is fully normalised
    instead of only partially corrected by a sheet-wide mean."""
    img = Image.open(path).convert('RGBA')
    arr = np.array(img)
    h, w = arr.shape[:2]
    frame_w = h  # frames are square (256 each)
    n_frames = max(1, w // frame_w)
    rgb = arr[..., :3].astype(float)
    alpha = arr[..., 3]
    summary = []
    for i in range(n_frames):
        x0, x1 = i * frame_w, (i + 1) * frame_w
        sub_rgb = rgb[:, x0:x1]
        sub_alpha = alpha[:, x0:x1]
        mask = skin_mask(sub_rgb.astype(int), sub_alpha)
        if mask.sum() < 50:
            continue
        cur_mean = sub_rgb[mask].mean(axis=0)
        delta = TARGET - cur_mean
        sub_rgb[mask] += delta
        np.clip(sub_rgb, 0, 255, out=sub_rgb)
        rgb[:, x0:x1] = sub_rgb
        summary.append((i, cur_mean.astype(int).tolist()))
    arr[..., :3] = rgb.astype(np.uint8)
    Image.fromarray(arr, 'RGBA').save(path, optimize=True)
    print(f'{os.path.basename(path)}: ' + ', '.join(f'f{i}{m}' for i, m in summary))


def main():
    for name in SHEETS:
        retint(os.path.join(SHEET_DIR, name + '.png'))


if __name__ == '__main__':
    main()
