"""Remove the SOLID BLACK backing baked behind the waist chain belt, keeping the
chain itself (and all armor outlines).

The belt was baked as [black gap-fill] + [chain on top].  On the angled facings
the black backing pokes out past the chain at full stride and reads as a black
blob.  User wants the chain KEPT but the black gone (background shows behind the
chain instead).

Black can't be removed by color -- pure black [0,0,0] is also the armor OUTLINE
color all over the figure.  But the backing is a SOLID BLOCK while outlines are
thin LINES, so a morphological OPENING isolates the block.  We further restrict
removal to the WAIST Y-BAND (from the base body) so no solid-black armor detail
elsewhere is touched.

Usage: python tools/remove_belt_backing.py <pose> <dir>
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

FRAME = 256
pose, d = sys.argv[1], sys.argv[2]
base = Image.open(f'public/sprites/player/{pose}-{d}.png').convert('RGBA')
bn = base.width // FRAME

for slot, item in (('chest', 'steelplate'), ('legs', 'steelgreaves')):
    cp = f'public/sprites/gear/{slot}/{item}/{pose}-{d}.png'
    ca = np.array(Image.open(cp).convert('RGBA'))
    n = ca.shape[1] // FRAME
    removed = 0
    for i in range(n):
        cs = ca[:, i * FRAME:(i + 1) * FRAME]
        bop = np.array(base.crop(((i % bn) * FRAME, 0, (i % bn + 1) * FRAME, FRAME)))[:, :, 3] > 20
        ys = np.where(bop.any(1))[0]
        if not len(ys):
            continue
        y0, H = int(ys.min()), int(ys.max()) - int(ys.min())
        wy0, wy1 = y0 + int(0.44 * H), y0 + int(0.82 * H)   # waist band only
        blk = (cs[:, :, 0] == 0) & (cs[:, :, 1] == 0) & (cs[:, :, 2] == 0) & (cs[:, :, 3] > 0)
        # opening: solid blocks survive, thin (<=2px) outlines vanish
        solid = ndimage.binary_dilation(ndimage.binary_erosion(blk, iterations=2), iterations=2)
        band = np.zeros_like(blk); band[wy0:wy1, :] = True
        backing = solid & blk & band
        cs[backing] = [0, 0, 0, 0]
        removed += int(backing.sum())
    Image.fromarray(ca).save(cp)
    print(f'{pose}-{d} {slot}: removed {removed}px solid black belt-backing (chain + outlines kept)')
