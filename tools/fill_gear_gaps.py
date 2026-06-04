"""Close ENCLOSED holes in the armour so the body can be hidden under it without
leaving see-through gaps.

The renderer hides the body wherever the full armour set is worn (so the
AI-drift body silhouette never peeks past the plate).  Anywhere the chest+greaves
silhouette has a fully-enclosed transparent region (the waist between plates,
the neck, a joint gap), hiding the body turns it into a background hole -- and
because the gap shape wobbles frame to frame, into a flicker.

Fix: find the truly enclosed transparent regions and fill them PURE BLACK (reads
as a shadowed gap, never flickers).  "Enclosed" = transparent pixels NOT
connected to the image border through free space (flood-fill from the border).
This is exact: the open space BETWEEN the running legs and below the feet
touches the border, so it's never filled (no black stick-legs); only true
interior holes are.  Baked into the chest sheet.

Usage: python tools/fill_gear_gaps.py <pose> <dir>
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

FRAME = 256
pose, dir_ = sys.argv[1], sys.argv[2]
chest_p = f'public/sprites/gear/chest/steelplate/{pose}-{dir_}.png'
legs_p = f'public/sprites/gear/legs/steelgreaves/{pose}-{dir_}.png'
chest = Image.open(chest_p).convert('RGBA')
legs = Image.open(legs_p).convert('RGBA')
n = chest.width // FRAME
ca = np.array(chest)
la = np.array(legs)
ln = legs.width // FRAME
filled_total = 0
for i in range(n):
    cs = ca[:, i * FRAME:(i + 1) * FRAME]
    ls = la[:, (i % ln) * FRAME:(i % ln + 1) * FRAME]
    G = (cs[:, :, 3] > 20) | (ls[:, :, 3] > 20)
    free = ~G
    lbl, num = ndimage.label(free)
    if num == 0:
        continue
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    interior = free & ~np.isin(lbl, list(border))
    if not interior.any():
        continue
    cs[interior] = [0, 0, 0, 255]
    filled_total += int(interior.sum())
    ca[:, i * FRAME:(i + 1) * FRAME] = cs

Image.fromarray(ca, 'RGBA').save(chest_p)
print(f'{pose}-{dir_}: filled {filled_total} enclosed-hole px into chest')
