#!/usr/bin/env python3
"""v2.3.1433: pan-flip gesture sheet round 2 (owner art, food-agnostic).

The owner's new 4x2 green-screen sheet paints a salmon fillet flipping
in the cast-iron pan.  Their ask: "anchor whatever food item sprite is
being cooked over the food that [was] drawn with the sprite sheet" —
so the game overlays the REAL raw-fish bag icon of the fish being
cooked.  To avoid two foods showing, this script:

  1. green-keys the sheet (same key as process_gesture_sheets.py);
  2. ERASES the painted food from every frame — orange/tan pixels are
     detected (warm hue mask), then filled: transparent where they sat
     over the removed green, pan-coloured (local dark median) where
     they sat over the pan;
  3. prints each frame's painted-food CENTROID (in 256-cell coords) —
     pasted into GESTURE_TOOLS.cooking.food in effectsRenderer.js as
     the per-frame anchor the live item icon rides.

Output: public/sprites/tools/pan-gesture-v2.webp (2048x256, 8 frames).
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.environ.get('PAN_SHEET', '/root/.claude/uploads/85dab866-0f38-5e59-9ced-da9eaeb2cf4b/d5a7b687-512EF43D3E3448B1960E61C8173C9288.png')
OUT = os.path.join(ROOT, 'public', 'sprites', 'tools', 'pan-gesture-v2.webp')
CELL = 256


def green_key(cell):
    a = cell.astype(int)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    excess = np.clip(g - np.maximum(r, b), 0, 255)
    alpha = np.clip(255 - excess * 2, 0, 255)
    out = np.zeros((*a.shape[:2], 4), dtype=np.uint8)
    out[:, :, 0] = r
    out[:, :, 1] = np.minimum(g, np.maximum(r, b) + 24)
    out[:, :, 2] = b
    out[:, :, 3] = alpha
    out[alpha < 24] = 0
    return out


def food_mask(rgba):
    """Warm (orange/tan) opaque pixels = the painted fillet.  The pan is
    near-black/grey (low saturation), the droplets are small; a hue window
    on R>G>B with real saturation isolates the food."""
    a = rgba.astype(int)
    r, g, b, al = a[:, :, 0], a[:, :, 1], a[:, :, 2], a[:, :, 3]
    warm = (r > 110) & (r > g + 25) & (g > b - 10) & (r - b > 45) & (al > 60)
    # grow the mask a touch so anti-aliased fringes go with it
    m = warm.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            m |= np.roll(np.roll(warm, dy, 0), dx, 1)
    return m


def erase_food(rgba, m):
    """Erase each connected food blob independently: transparent if ITS
    surrounding is transparent (airborne over keyed green), else fill
    with the local pan-dark median.  Per-component so the airborne
    fillet and in-pan oil warm-pixels don't share one decision."""
    from scipy import ndimage
    out = rgba.copy()
    labels, n = ndimage.label(m)
    for li in range(1, n + 1):
        comp = labels == li
        if comp.sum() < 40:   # stray warm speck (droplet edge): leave it
            continue
        ys, xs = np.where(comp)
        pad = 8
        y0, y1 = max(0, ys.min() - pad), min(rgba.shape[0], ys.max() + pad)
        x0, x1 = max(0, xs.min() - pad), min(rgba.shape[1], xs.max() + pad)
        ring = out[y0:y1, x0:x1]
        ring_mask = comp[y0:y1, x0:x1]
        border = ring[~ring_mask]
        transparent_frac = (border[:, 3] < 24).mean() if len(border) else 1.0
        if transparent_frac > 0.35:
            # airborne blob: erase the body FIRST, then take its dark
            # OUTLINE fringe (not warm, so the mask missed it) — the pan
            # protection is computed AFTER the body erase, otherwise a
            # fillet touching the rim merges into the pan's opaque region
            # and dodges the erase entirely (frame 5).
            out[comp] = 0
            alpha_big = out[:, :, 3] > 128
            pan_labels, pn = ndimage.label(alpha_big)
            if pn:
                p_sizes = ndimage.sum(alpha_big, pan_labels, range(1, pn + 1))
                pan_region = pan_labels == (int(np.argmax(p_sizes)) + 1)
            else:
                pan_region = np.zeros_like(comp)
            dil = ndimage.binary_dilation(comp, iterations=6)
            out[dil & ~pan_region] = 0
        else:
            opaque = border[border[:, 3] > 200]
            fill = np.median(opaque, axis=0).astype(np.uint8) if len(opaque) else np.array([30, 26, 24, 255], np.uint8)
            out[comp] = fill
    return out


def main():
    img = Image.open(SRC).convert('RGB')
    w, h = img.size
    cw, ch = w // 4, h // 2
    strip = Image.new('RGBA', (CELL * 8, CELL), (0, 0, 0, 0))
    anchors = []
    for i in range(8):
        r, c = divmod(i, 4)
        cell = np.array(img.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)))
        rgba = green_key(cell)
        m = food_mask(rgba)
        # centroid of the LARGEST warm blob = the fillet (droplets skew a
        # whole-mask mean).
        from scipy import ndimage
        labels, n = ndimage.label(m)
        if n:
            sizes = ndimage.sum(m, labels, range(1, n + 1))
            big = labels == (int(np.argmax(sizes)) + 1)
            ys, xs = np.where(big)
            cx, cy = xs.mean() / cw * CELL, ys.mean() / ch * CELL
        else:
            cx, cy = CELL / 2, CELL / 2
        anchors.append((round(cx, 1), round(cy, 1), int(m.sum())))
        rgba = erase_food(rgba, m)
        fr = Image.fromarray(rgba).resize((CELL, CELL), Image.LANCZOS)
        strip.paste(fr, (i * CELL, 0))
    strip.save(OUT, 'WEBP', quality=90)
    print(OUT, os.path.getsize(OUT) // 1024, 'KB')
    for i, (x, y, n) in enumerate(anchors):
        print(f'frame {i}: food centroid ({x}, {y})  mask px {n}')


if __name__ == '__main__':
    main()
