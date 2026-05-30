#!/usr/bin/env python3
"""Inspect topmost rows of a single jog frame to understand X anchor."""
import sys
from PIL import Image
import numpy as np

path = "public/sprites/player/jog-southwest.png"
frame = int(sys.argv[1]) if len(sys.argv) > 1 else 27
FRAME_W = 256
THRESHOLD = 32

im = Image.open(path).convert("RGBA")
arr = np.array(im)
sub = arr[:, frame * FRAME_W : (frame + 1) * FRAME_W]
alpha = sub[..., 3] > THRESHOLD
print(f"--- jog-southwest frame {frame} ---")
print(f"row  width  xmin  xmax  center")
for r in range(20, 50):
    cols = np.where(alpha[r])[0]
    if len(cols) == 0:
        continue
    w = int(cols.max() - cols.min() + 1)
    c = (int(cols.min()) + int(cols.max())) // 2
    print(f"{r:3d}  {w:5d}  {int(cols.min()):4d}  {int(cols.max()):4d}  {c:5d}   n_opaque={len(cols)}")
