"""Strip the residual magenta/purple AA fringe from an extracted gear sheet.

The magenta-key in the importer (_key_region) only drops STRONG purple
(R-G>32 & B-G>32); a faint purple edge survives along the armour's antialiased
border.  At scale_mul=1 it's ~1px and invisible, but a scaled-up piece (e.g. a
stand chest at scale_mul 1.3) enlarges it into a thick purple outline that reads
as 'eating' the adjacent pants.  Steel armour is grey (R~=G~=B), so any pixel
where R and B both exceed G is fringe -> drop it (alpha only; colours untouched).

Usage: python tools/strip_purple_fringe.py <slot> <item> <pose> <dir>
"""
import sys
import numpy as np
from PIL import Image

slot, item, pose, d = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
p = f'public/sprites/gear/{slot}/{item}/{pose}-{d}.png'
g = np.array(Image.open(p).convert('RGBA'))
R, G, B, A = g[:, :, 0].astype(int), g[:, :, 1].astype(int), g[:, :, 2].astype(int), g[:, :, 3].astype(int)
purple = (A > 0) & ((R - G) > 10) & ((B - G) > 10)
g[purple] = [0, 0, 0, 0]
Image.fromarray(g).save(p)
print(f'{pose}-{d} {slot}/{item}: stripped {int(purple.sum())}px purple AA fringe')
