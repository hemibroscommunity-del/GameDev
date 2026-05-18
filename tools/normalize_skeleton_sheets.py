"""Normalize skeleton run sheets so the figure renders at a consistent
on-screen height across all directions.

Problem: each source .mov framed the skeleton differently relative to
its 544x544 frame (e.g. the sprint variant stretched horizontally; the
NW 3/4 pose floated higher).  After extraction + chroma-key, the
non-transparent figure occupies a different bounding box per
direction, so liveScalePx / 256 scaling produces visibly different
on-screen sizes per direction.

Fix per direction:
  1) Load the 8-frame strip
  2) Compute the UNION bbox of non-transparent pixels across all 8
     frames (so the figure stays anchored consistently within the
     animation -- using per-frame bboxes would cause the figure to
     jitter).
  3) Scale each frame so the union bbox HEIGHT lands on TARGET_H.
  4) Center the bbox horizontally; anchor to the bottom of the frame
     (entityRenderer paints these anchored at bottom-center, so this
     keeps the feet at the same y across directions).
  5) Re-tile into a 256x256-per-frame strip and save back.

Run after build_skeleton_runs.py.  Idempotent on its own output up
to ~1 px rounding.
"""
import os
from PIL import Image
import numpy as np

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(REPO, 'public', 'sprites', 'monsters', 'skeleton')

FRAME_W = 256
FRAME_H = 256
N_FRAMES = 8
TARGET_H = 220   # figure height in px (out of 256); leaves a small
                 # margin so limbs don't clip the frame edge.

DIRS = ['s', 'w', 'nw', 'n', 'sw']


def bbox_of(arr_alpha):
    """Return (l, t, r, b) of non-transparent pixels.  None if empty."""
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
    path = os.path.join(OUT_DIR, f'run-{direction}.png')
    sheet = Image.open(path).convert('RGBA')
    if sheet.width != FRAME_W * N_FRAMES or sheet.height != FRAME_H:
        print(f'  skip {direction}: unexpected size {sheet.size}')
        return
    frames = [sheet.crop((i * FRAME_W, 0, (i + 1) * FRAME_W, FRAME_H)) for i in range(N_FRAMES)]
    arrs = [np.asarray(f) for f in frames]
    # Union bbox across all 8 frames -- figure stays anchored.
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
    new_w = int(round(bbox_w * scale))
    new_h = int(round(bbox_h * scale))
    out_sheet = Image.new('RGBA', (FRAME_W * N_FRAMES, FRAME_H), (0, 0, 0, 0))
    pad_x = (FRAME_W - new_w) // 2
    pad_y = FRAME_H - new_h - 8   # keep feet ~8 px above the bottom
    for i, f in enumerate(frames):
        # Crop to union bbox, resize by scale, paste anchored.
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
