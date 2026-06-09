"""Despeckle an extracted gear sheet: drop tiny disconnected stray pixels (extraction
noise) per frame, keeping the armour.  Conservative -- only removes blobs smaller
than <minpx> (default 6); real plate details are connected to the main piece and
far larger, so they're never touched.

Usage: python tools/despeckle_gear.py <slot> <item> <pose> <dir> [minpx]
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

FRAME = 256
slot, item, pose, d = sys.argv[1:5]
minpx = int(sys.argv[5]) if len(sys.argv) > 5 else 6
p = f'public/sprites/gear/{slot}/{item}/{pose}-{d}.png'
g = np.array(Image.open(p).convert('RGBA'))
n = g.shape[1] // FRAME
removed = 0
for i in range(n):
    cell = g[:, i * FRAME:(i + 1) * FRAME]
    op = cell[:, :, 3] > 30
    lbl, nn = ndimage.label(op)
    if nn <= 1:
        continue
    sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, nn + 1))
    small = np.nonzero(sizes < minpx)[0] + 1
    if len(small):
        m = np.isin(lbl, small)
        cell[m] = 0
        removed += int(m.sum())
Image.fromarray(g).save(p)
print(f'{pose}-{d} {slot}/{item}: removed {removed}px of stray specks ({n} frames, <{minpx}px)')
