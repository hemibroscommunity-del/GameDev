"""Chroma-key the three uploaded joystick PNGs and emit:

  public/sprites/joystick/base.png   -- joystick base (ring + center hole)
  public/sprites/joystick/stick.png  -- joystick shaft (PRE-ROTATED 90 CW
                                        so the smooth top end lands on the
                                        right and the rough bottom on the
                                        left, matching the renderer's
                                        horizontal stick geometry where
                                        transformOrigin is '0% 50%' and
                                        width grows from the joystick
                                        center toward the knob)
  public/sprites/joystick/knob.png   -- spherical knob

All three saved at 256 x 256 with the figure centered + chroma-keyed
to transparent.  Uses the same two-stage magenta filter as
build_skeleton_remnants.py (solid distance + magenta-dominant channel
test) so any spill into the figure body gets cleaned up.
"""
import os
from PIL import Image
import numpy as np

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(REPO, 'public', 'sprites', 'joystick')

# UUIDs from upload commit dbce3d7.  Verified visually: 52311F3D = base,
# 6622F049 = stick (vertical orientation), 50DDDCE5 = knob.
SRC_BASE  = os.path.join(REPO, '52311F3D-E717-4B92-89AF-1E981EAE94F2.png')
SRC_STICK = os.path.join(REPO, '6622F049-991E-40C0-9C5B-A0144CA0E043.png')
SRC_KNOB  = os.path.join(REPO, '50DDDCE5-7477-4C2C-95BD-C99453F4AC12.png')

CELL = 256
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


def bbox_of(img):
    arr = np.asarray(img.convert('RGBA'))
    a = arr[..., 3]
    rows = np.any(a > 0, axis=1)
    cols = np.any(a > 0, axis=0)
    if not rows.any() or not cols.any():
        return None
    t = int(np.argmax(rows))
    bot = len(rows) - int(np.argmax(rows[::-1]))
    l = int(np.argmax(cols))
    r = len(cols) - int(np.argmax(cols[::-1]))
    return (l, t, r, bot)


def fit_in_cell(keyed, size=CELL, margin_px=4):
    """Crop to figure bbox, scale uniformly to fit (margin on all sides),
       center in the size x size cell."""
    bb = bbox_of(keyed)
    if bb is None:
        return Image.new('RGBA', (size, size), (0, 0, 0, 0))
    l, t, r, b = bb
    cropped = keyed.crop((l, t, r, b))
    fw, fh = cropped.size
    target = size - 2 * margin_px
    scale = min(target / fw, target / fh)
    new_w = max(1, int(round(fw * scale)))
    new_h = max(1, int(round(fh * scale)))
    resized = cropped.resize((new_w, new_h), Image.LANCZOS)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    pad_x = (size - new_w) // 2
    pad_y = (size - new_h) // 2
    out.paste(resized, (pad_x, pad_y), resized)
    return out


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    # base + knob: chroma-key + fit centered, no rotation
    for src, name in [(SRC_BASE, 'base.png'), (SRC_KNOB, 'knob.png')]:
        keyed = chroma_key(Image.open(src))
        out = fit_in_cell(keyed)
        out_path = os.path.join(OUT_DIR, name)
        out.save(out_path)
        print(f'wrote {os.path.relpath(out_path, REPO)}')

    # stick: chroma-key, then rotate 90 CW so the vertical cylinder becomes
    # horizontal with the smooth top end on the right (where the knob
    # attaches) and the rough bottom on the left (hidden inside the base).
    keyed = chroma_key(Image.open(SRC_STICK))
    rotated = keyed.rotate(-90, expand=True)
    out = fit_in_cell(rotated)
    out_path = os.path.join(OUT_DIR, 'stick.png')
    out.save(out_path)
    print(f'wrote {os.path.relpath(out_path, REPO)} (rotated 90 CW)')


if __name__ == '__main__':
    main()
