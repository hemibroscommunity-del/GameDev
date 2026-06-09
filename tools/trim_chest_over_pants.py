"""Trim CHEST gear that overlaps the body's PANTS (leg) region.

When a chest piece is scaled up to fill the torso (scale_mul), the cuirass bottom
and the down-hanging gauntlet/arm edges can dip over the top of the pants and the
upper leg, 'eating' the pants.  The chest gear should never cover the legs, so
remove any chest-gear pixel that sits over the DEFAULT body's pants pixels.  This
is position-baked from the default (olive) body, so it is correct for every
colour-picker pants choice (the body geometry is identical, only the colour
changes).

Run AFTER ingesting the chest.  Usage: python tools/trim_chest_over_pants.py <pose> <dir>
"""
import sys
import numpy as np
from PIL import Image

FRAME = 256
pose, d = sys.argv[1], sys.argv[2]
base = Image.open(f'public/sprites/player/{pose}-{d}.png').convert('RGBA')
bn = base.width // FRAME
cp = f'public/sprites/gear/chest/steelplate/{pose}-{d}.png'
ca = np.array(Image.open(cp).convert('RGBA'))
n = ca.shape[1] // FRAME

removed = 0
for i in range(n):
    cs = ca[:, i * FRAME:(i + 1) * FRAME]
    bf = np.array(base.crop(((i % bn) * FRAME, 0, (i % bn + 1) * FRAME, FRAME))).astype(int)
    R, G, B, A = bf[:, :, 0], bf[:, :, 1], bf[:, :, 2], bf[:, :, 3]
    pants = (A > 40) & (G >= R - 5) & (G > B + 10) & (G > 55) & (G < 170)   # olive default pants
    hit = pants & (cs[:, :, 3] > 40)
    cs[hit] = [0, 0, 0, 0]
    removed += int(hit.sum())
    ca[:, i * FRAME:(i + 1) * FRAME] = cs

Image.fromarray(ca).save(cp)
print(f'{pose}-{d}: trimmed {removed}px of chest gear over the pants region')
