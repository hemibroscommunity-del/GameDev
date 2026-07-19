#!/usr/bin/env python3
"""v2.3.1396: slice the owner's painted sword-slash special sheet.

Input:  assets/icons-source/sheet-sword-slash.png — 1x4 WHITE-BACKGROUND
        strip, four frames of a golden crescent slash (born -> full ->
        dissolving -> wisps).  Crescent opens RIGHT (convex bulge LEFT).
Output: public/sprites/effects/sword-slash-v1.webp — one horizontal
        4-frame strip with real transparency, 128 px frame height.

The art is bright glow painted OVER WHITE, so a green-screen key
(process_magic_bolt_sheet.py) doesn't apply.  Instead un-mix from
white: treat each pixel as C_obs = C_true*a + 255*(1-a), estimate
a = 1 - min(R,G,B)/255 (gold has a near-zero blue core, so the
darkest channel carries the alpha), then unpremultiply.  All four
frames crop to the UNION content bbox so the crescent stays put
across frames (per-frame bboxes would jitter the arc).
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'icons-source', 'sheet-sword-slash.png')
OUT = os.path.join(ROOT, 'public', 'sprites', 'effects', 'sword-slash-v1.webp')
FRAME_H = 128
CELLS = 4


def main():
    im = Image.open(SRC).convert('RGB')
    W, H = im.size
    cw = W // CELLS
    pix = im.load()

    # Union content bbox across cells (alpha threshold on the white key).
    minx, miny, maxx, maxy = cw, H, -1, -1
    for ci in range(CELLS):
        x0 = ci * cw
        for y in range(0, H, 2):
            for x in range(0, cw, 2):
                r, g, b = pix[x0 + x, y]
                if 255 - min(r, g, b) > 18:  # visibly non-white
                    if x < minx: minx = x
                    if x > maxx: maxx = x
                    if y < miny: miny = y
                    if y > maxy: maxy = y
    pad = 8
    minx = max(0, minx - pad); miny = max(0, miny - pad)
    maxx = min(cw - 1, maxx + pad); maxy = min(H - 1, maxy + pad)
    bw, bh = maxx - minx + 1, maxy - miny + 1

    scale = FRAME_H / bh
    fw = round(bw * scale)
    strip = Image.new('RGBA', (fw * CELLS, FRAME_H), (0, 0, 0, 0))
    for ci in range(CELLS):
        cell = im.crop((ci * cw + minx, miny, ci * cw + maxx + 1, maxy + 1))
        rgba = Image.new('RGBA', cell.size)
        cp, rp = cell.load(), rgba.load()
        for y in range(cell.size[1]):
            for x in range(cell.size[0]):
                r, g, b = cp[x, y]
                a = 255 - min(r, g, b)
                if a <= 6:
                    rp[x, y] = (0, 0, 0, 0)
                    continue
                # Unpremultiply from white so edges keep their gold, not gray.
                inv = 255 - a
                ur = max(0, min(255, round((r - inv) * 255 / a)))
                ug = max(0, min(255, round((g - inv) * 255 / a)))
                ub = max(0, min(255, round((b - inv) * 255 / a)))
                rp[x, y] = (ur, ug, ub, a)
        rgba = rgba.resize((fw, FRAME_H), Image.LANCZOS)
        strip.paste(rgba, (ci * fw, 0))

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    strip.save(OUT, 'WEBP', quality=90)
    kb = os.path.getsize(OUT) / 1024
    print(f'wrote {OUT}  strip {strip.size[0]}x{strip.size[1]}  frame {fw}x{FRAME_H}  {kb:.0f}KB')
    print('anchor: frame center (0.5, 0.5) — the crescent is centered by the union crop')


if __name__ == '__main__':
    main()
