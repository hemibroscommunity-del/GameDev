"""Match an extracted gear sheet's STEEL brightness to a reference sheet.

The ChatGPT separations come back at different exposures, so the same steel
plate reads brighter in one pose/dir than another (e.g. stand-north vs jog-north).
Remap the source's brightness with a linear map anchored at the SHADOWS (dark
outlines stay put) and matched to the reference's bright end, preserving hue
(steel is near-neutral, so the slight warmth is kept by scaling RGB uniformly).

  python tools/match_steel_color.py <slot> <item> <pose> <dir> <ref_pose> <ref_dir>
"""
import sys
import numpy as np
from PIL import Image


def steel_pcts(path):
    g = np.array(Image.open(path).convert('RGBA'))
    g = g[:, :g.shape[1] // 256 * 256]                 # all frames
    a = g[:, :, 3] > 60
    rgb = g[:, :, :3].astype(int); mx = rgb.max(2); mn = rgb.min(2)
    steel = a & (mx - mn < 35) & (mx > 60)
    b = rgb[steel].mean(1)
    return np.percentile(b, 8), np.percentile(b, 92)


slot, item, pose, d, rpose, rdir = sys.argv[1:7]
src = f'public/sprites/gear/{slot}/{item}/{pose}-{d}.png'
ref = f'public/sprites/gear/{slot}/{item}/{rpose}-{rdir}.png'
s_lo, s_hi = steel_pcts(src)
r_lo, r_hi = steel_pcts(ref)
slope = (r_hi - r_lo) / max(1.0, (s_hi - s_lo))

g = np.array(Image.open(src).convert('RGBA')).astype(float)
rgb = g[:, :, :3]; a = g[:, :, 3] > 0
b = rgb.mean(2)
nb = r_lo + (b - s_lo) * slope                          # target brightness
nb = np.clip(nb, 0, 255)
factor = np.where(b > 1, nb / np.maximum(b, 1), 1.0)
for c in range(3):
    rgb[:, :, c] = np.where(a, np.clip(rgb[:, :, c] * factor, 0, 255), rgb[:, :, c])
g[:, :, :3] = rgb
Image.fromarray(g.astype('uint8')).save(src)
print(f'{pose}-{d}: matched steel to {rpose}-{rdir}  (src {s_lo:.0f}-{s_hi:.0f} -> ref {r_lo:.0f}-{r_hi:.0f}, slope {slope:.3f})')
