#!/usr/bin/env python3
"""v2.3.1443: slice the owner's harvest EFFECT sheets (gather-feel round 3).

Four 4x2 green-screen grids -> 8-frame 256px strips, same key/despill as
process_gesture_sheets.py.  These are one-shot bursts effectsRenderer
plays at the MARKER-HIT moments (owner chose marker movements over the
passive wind-up): rock debris on each pickaxe slam, wood chips on each
axe strike, a grease pop on the pan flip, a water splash while reeling
and at the catch.

Outputs: public/sprites/effects/<name>-burst-v1.webp
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UP = '/root/.claude/uploads/85dab866-0f38-5e59-9ced-da9eaeb2cf4b'
OUT = os.path.join(ROOT, 'public', 'sprites', 'effects')
CELL = 256

SHEETS = {
    'woodchips': f'{UP}/91787665-BD82A85567CC4CACAEFC0D55B9982005.png',
    'grease':    f'{UP}/fddf7ccd-3EC6A9CC81F442E5BD1EEECC0CBA9E2E.png',
    'rocks':     f'{UP}/0c41a93e-F27D1C4BD592424A8462CD4EBE0A1DFA.png',
    'splash':    f'{UP}/6e5ead60-AA8E95784DD940F4A9881CE34AE1C7B0.png',
}


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


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, src in SHEETS.items():
        img = Image.open(src).convert('RGB')
        w, h = img.size
        cw, ch = w // 4, h // 2
        strip = Image.new('RGBA', (CELL * 8, CELL), (0, 0, 0, 0))
        for i in range(8):
            r, c = divmod(i, 4)
            cell = np.array(img.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)))
            fr = Image.fromarray(green_key(cell)).resize((CELL, CELL), Image.LANCZOS)
            strip.paste(fr, (i * CELL, 0))
        dst = os.path.join(OUT, f'{name}-burst-v1.webp')
        strip.save(dst, 'WEBP', quality=88)
        print(dst, os.path.getsize(dst) // 1024, 'KB')


if __name__ == '__main__':
    main()
