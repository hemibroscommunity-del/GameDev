#!/usr/bin/env python3
"""v2.3.1417: slice the owner's painted GESTURE-TOOL sheets.

Part 2 of the gather-feel redesign (v2.3.1416 removed the harvest
timeout): each life skill's touch cue becomes a painted tool sprite
whose FRAME is driven by the finger — pickaxe swings with the mining
drag, reel cranks with the fishing circles, axe follows the chop
swipe, pan flips with the cooking flick.

Inputs (assets/icons-source/, owner ChatGPT sheets, all 4x2 GREEN-
SCREEN grids of eight frames):
  sheet-gesture-pickaxe.png — pickaxe raised (f0) -> struck w/ sparks (f7)
  sheet-gesture-axe.png     — axe wound left (f0) -> chopped w/ chips (f7)
  sheet-gesture-reel.png    — crank at 12 o'clock rotating one full
                              clockwise turn in 45-degree steps
  sheet-gesture-pan.png     — fillet flat (f0) -> flipped + steam (f7)

Outputs (public/sprites/tools/): <name>-gesture-v1.webp — horizontal
8-frame strips, 256px square frames, green keyed + despilled (same
key as process_special_sheets.py).  No re-centering: the reel body and
pan must stay put frame-to-frame, and the swing tools' cell drift
reads as motion energy.
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'icons-source')
OUT = os.path.join(ROOT, 'public', 'sprites', 'tools')
CELL = 256

SHEETS = {
    'pickaxe': 'sheet-gesture-pickaxe.png',
    'axe': 'sheet-gesture-axe.png',
    'reel': 'sheet-gesture-reel.png',
    'pan': 'sheet-gesture-pan.png',
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
    for name, fname in SHEETS.items():
        img = Image.open(os.path.join(SRC, fname)).convert('RGB')
        w, h = img.size
        cw, ch = w // 4, h // 2
        strip = Image.new('RGBA', (CELL * 8, CELL), (0, 0, 0, 0))
        for i in range(8):
            cx, cy = (i % 4) * cw, (i // 4) * ch
            cell = np.array(img.crop((cx, cy, cx + cw, cy + ch)))
            keyed = Image.fromarray(green_key(cell), 'RGBA')
            keyed = keyed.resize((CELL, CELL), Image.LANCZOS)
            strip.paste(keyed, (i * CELL, 0))
        out_path = os.path.join(OUT, f'{name}-gesture-v1.webp')
        strip.save(out_path, 'WEBP', quality=92, method=6)
        kb = os.path.getsize(out_path) / 1024
        print(f'{out_path}  {strip.size[0]}x{strip.size[1]}  {kb:.0f}KB')


if __name__ == '__main__':
    main()
