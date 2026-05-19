"""Chroma-key the uploaded bone-pile image and emit two artifacts:

  public/sprites/monsters/skeleton/remnants.png  -- world remnants
    (anchored at center, scaled to ~256 px so the
    entityRenderer's remnants render scales it down via
    MONSTER_VARIANTS.skeleton.remnantsScalePx = 48).

  public/icons/monsters/skeleton-remnants.png    -- inventory thumb
    (~64 px square, miniaturized for the InventoryPanel's
    thumbFor('skeleton-remnants') lookup).

Source is the magenta-background bone pile uploaded by the user
(6B1FC528...png, 1254 x 1254).  Re-uses the same two-stage chroma-key
filter as build_skeleton_death.py.
"""
import os
from PIL import Image
import numpy as np

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(REPO, '6B1FC528-8196-453F-80CF-01033C0D1F23.png')
OUT_WORLD = os.path.join(REPO, 'public', 'sprites', 'monsters', 'skeleton', 'remnants.png')
OUT_ICON  = os.path.join(REPO, 'public', 'icons', 'monsters', 'skeleton-remnants.png')

WORLD_SIZE = 256       # matches the variant-sprite frame convention
ICON_SIZE = 64         # matches inventory thumbnail size

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


def fit_in_cell(keyed, size, margin_px=4):
    """Crop to figure bbox, then place anchored bottom-center inside
       a size x size cell with the given margin."""
    bb = bbox_of(keyed)
    if bb is None:
        return Image.new('RGBA', (size, size), (0, 0, 0, 0))
    l, t, r, b = bb
    cropped = keyed.crop((l, t, r, b))
    fig_w, fig_h = cropped.size
    target = size - 2 * margin_px
    scale = min(target / fig_w, target / fig_h)
    new_w = max(1, int(round(fig_w * scale)))
    new_h = max(1, int(round(fig_h * scale)))
    resized = cropped.resize((new_w, new_h), Image.LANCZOS)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    pad_x = (size - new_w) // 2
    pad_y = size - new_h - margin_px  # bottom-anchored
    out.paste(resized, (pad_x, pad_y), resized)
    return out


def main():
    os.makedirs(os.path.dirname(OUT_WORLD), exist_ok=True)
    os.makedirs(os.path.dirname(OUT_ICON), exist_ok=True)
    src = Image.open(SRC)
    keyed = chroma_key(src)
    world = fit_in_cell(keyed, WORLD_SIZE, margin_px=4)
    world.save(OUT_WORLD)
    icon = fit_in_cell(keyed, ICON_SIZE, margin_px=2)
    icon.save(OUT_ICON)
    print(f'wrote {os.path.relpath(OUT_WORLD, REPO)} ({WORLD_SIZE}x{WORLD_SIZE})')
    print(f'wrote {os.path.relpath(OUT_ICON, REPO)} ({ICON_SIZE}x{ICON_SIZE})')


if __name__ == '__main__':
    main()
