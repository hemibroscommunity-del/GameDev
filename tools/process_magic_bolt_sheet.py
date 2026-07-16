#!/usr/bin/env python3
"""v2.3.1334: slice the owner's painted magic-bolt sheet.

Input:  assets/icons-source/sheet-magic-bolt.png — 2x2 GREEN-SCREEN
        grid, four flicker frames of the same bolt (bright orb head on
        the RIGHT, wisp tail trailing LEFT).
Output: public/sprites/projectiles/magic-bolt-v1.webp — one horizontal
        4-frame strip (slimeSprites.js-style), 128 px frame height.

All four frames are cropped to the SAME box (union of their content
bboxes) so the orb stays put across frames — per-frame bboxes would
make the head jitter.  Green key with despill: fringe pixels lose
their green excess and fade out by it.  Prints the orb-center anchor
fraction the renderer needs (the sprite must rotate around the ORB,
not the frame center, or the tail sweep drags the head around).
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'icons-source', 'sheet-magic-bolt.png')
OUT = os.path.join(ROOT, 'public', 'sprites', 'projectiles', 'magic-bolt-v1.webp')
FRAME_H = 128


def main():
    im = Image.open(SRC).convert('RGB')
    W, H = im.size
    cw, ch = W // 2, H // 2
    pix = im.load()

    def excess(p):
        return p[1] - max(p[0], p[2])

    cells = [(0, 0), (cw, 0), (0, ch), (cw, ch)]  # TL TR BL BR

    # Union content bbox across all four cells (relative to cell origin).
    minx, miny, maxx, maxy = cw, ch, -1, -1
    for (x0, y0) in cells:
        for y in range(0, ch, 2):
            for x in range(0, cw, 2):
                if excess(pix[x0 + x, y0 + y]) < 60:
                    if x < minx: minx = x
                    if x > maxx: maxx = x
                    if y < miny: miny = y
                    if y > maxy: maxy = y
    pad = 10
    minx = max(0, minx - pad); miny = max(0, miny - pad)
    maxx = min(cw - 1, maxx + pad); maxy = min(ch - 1, maxy + pad)
    bw, bh = maxx - minx + 1, maxy - miny + 1

    frames = []
    for (x0, y0) in cells:
        tile = Image.new('RGBA', (bw, bh), (0, 0, 0, 0))
        tp = tile.load()
        for y in range(bh):
            for x in range(bw):
                p = pix[x0 + minx + x, y0 + miny + y]
                ex = excess(p)
                if ex >= 100:
                    continue  # solid green background
                if ex > 0:
                    # Despill the fringe: clamp green to the other
                    # channels' max and fade alpha by the excess.
                    g = max(p[0], p[2])
                    a = max(0, min(255, int(255 * (1 - ex / 100))))
                    tp[x, y] = (p[0], g, p[2], a)
                else:
                    tp[x, y] = (p[0], p[1], p[2], 255)
        frames.append(tile)

    # Orb-center anchor from frame 0's bright core (near-white pixels).
    f0 = frames[0].load()
    sx = sy = n = 0
    for y in range(bh):
        for x in range(bw):
            p = f0[x, y]
            if p[3] > 200 and min(p[0], p[1], p[2]) > 225:
                sx += x; sy += y; n += 1
    ax, ay = (sx / n / bw, sy / n / bh) if n else (0.5, 0.5)

    fw = round(bw * (FRAME_H / bh))
    strip = Image.new('RGBA', (fw * 4, FRAME_H), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        strip.paste(f.resize((fw, FRAME_H), Image.LANCZOS), (i * fw, 0))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    strip.save(OUT, 'WEBP', lossless=True)
    print(f'box {bw}x{bh} -> 4 frames {fw}x{FRAME_H} -> {OUT}')
    print(f'orb anchor: ({ax:.3f}, {ay:.3f})  (bake into the renderer)')


if __name__ == '__main__':
    main()
