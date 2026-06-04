"""Close INTERNAL gaps in the armour so the body can be hidden under it without
leaving see-through holes.

The renderer hides the body wherever the full armour set is worn (so the
AI-drift body silhouette never peeks out from under the plate).  But the armour
has body-showing gaps that are ENCLOSED by armour -- the waist (chest above,
greaves below) and the neck (helmet above, breastplate below).  If we hide the
body, those become background holes.  So fill them: any body pixel that has
armour both ABOVE and BELOW it in its column (i.e. a real enclosed gap, not the
open silhouette edge or the gap between the legs which has no body) gets painted
with the nearest armour colour and baked into the CHEST sheet.

Only enclosed BODY pixels are filled -> the armour's outer silhouette is
unchanged, and the open gap between the running legs (no body there) stays open.

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
base = Image.open(f'public/sprites/player/{pose}-{dir_}.png').convert('RGBA')
n = chest.width // FRAME
ca = np.array(chest)
la = np.array(legs)
ln = legs.width // FRAME
filled_total = 0
for i in range(n):
    cs = ca[:, i * FRAME:(i + 1) * FRAME]
    ls = la[:, (i % ln) * FRAME:(i % ln + 1) * FRAME]
    bop = np.array(base.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME)))[:, :, 3] > 40
    cop = cs[:, :, 3] > 0
    lop = ls[:, :, 3] > 0
    G = cop | lop
    # armour above / below in each column
    above = np.cumsum(G, axis=0) > 0
    below = np.cumsum(G[::-1], axis=0)[::-1] > 0
    enclosed = bop & ~G & above & below
    if not enclosed.any():
        continue
    # nearest armour colour (sample combined: legs under chest)
    combo = ls.copy()
    combo[cop] = cs[cop]
    idx = ndimage.distance_transform_edt(~G, return_indices=True)[1]
    nearest = combo[idx[0], idx[1]]
    cs[enclosed] = nearest[enclosed]
    filled_total += int(enclosed.sum())
    ca[:, i * FRAME:(i + 1) * FRAME] = cs

Image.fromarray(ca, 'RGBA').save(chest_p)
print(f'{pose}-{dir_}: filled {filled_total} enclosed px into chest')
