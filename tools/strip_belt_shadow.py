"""Strip the chain belt's solid black BACKING that pokes into the inter-leg gap
below the belt (a black void between the legs at full stride), keeping the chain
itself and all armor outlines.

`fill_gear_gaps` lays [black backing] + [chain on top] and also black-fills the
small enclosed triangle between the belt and the spread thighs.  On the new
body-aligned sheets `remove_belt_backing`'s erosion-2 opening eroded that small
block away (removed nothing), so the void survived.  This is a gentler, targeted
pass:

  * Band = BELOW the chain (0.55H) down to mid-shin (0.85H) -- never touches the
    chain (which sits ~0.42-0.54H) or the upper-body hands.
  * Confined to the inter-leg GAP x-range (central transparent run between the
    legs) so a low-swinging hand is never touched.
  * Opening with erosion=1 isolates solid black BLOCKS from thin (<=2px) armor
    outlines, which are kept.

Run AFTER fill_gear_gaps (+ refit_jog_belt).  Usage: python tools/strip_belt_shadow.py <pose> <dir>
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

FRAME = 256
pose, d = sys.argv[1], sys.argv[2]
base = Image.open(f'public/sprites/player/{pose}-{d}.png').convert('RGBA')
bn = base.width // FRAME


def leg_gap_xrange(bop, wy0, wy1, margin=8):
    """Central inter-leg transparent run in [wy0,wy1), or None. The belt void
    lives here; hands swing laterally outside it, so confining the strip to this
    run guarantees a low hand is never erased."""
    ys = np.where(bop.any(1))[0]
    if not len(ys):
        return None
    y0, H = int(ys.min()), int(ys.max()) - int(ys.min())
    tb = bop.copy(); tb[:y0 + int(0.28 * H)] = False; tb[y0 + int(0.46 * H):] = False
    txs = np.where(tb)[1]
    cx = int(np.median(txs)) if len(txs) else FRAME // 2
    col = bop[wy0:wy1, :].any(0)
    xs = np.where(col)[0]
    if len(xs) == 0:
        return max(0, cx - 30), min(FRAME - 1, cx + 30)
    xmin, xmax = int(xs.min()), int(xs.max())
    interior = ~col; interior[:xmin] = False; interior[xmax + 1:] = False
    xi = np.where(interior)[0]
    if len(xi) == 0:
        return max(0, cx - 30), min(FRAME - 1, cx + 30)
    runs, s, p = [], int(xi[0]), int(xi[0])
    for x in xi[1:]:
        if x == p + 1:
            p = int(x)
        else:
            runs.append((s, p)); s = p = int(x)
    runs.append((s, p))
    g0, g1 = min(runs, key=lambda r: abs((r[0] + r[1]) / 2 - cx))
    return max(0, g0 - margin), min(FRAME - 1, g1 + margin)


cp = f'public/sprites/gear/chest/steelplate/{pose}-{d}.png'
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
    wy0, wy1 = y0 + int(0.55 * H), y0 + int(0.85 * H)         # below the chain, above the boots
    blk = (cs[:, :, 0] == 0) & (cs[:, :, 1] == 0) & (cs[:, :, 2] == 0) & (cs[:, :, 3] > 0)
    solid = ndimage.binary_dilation(ndimage.binary_erosion(blk, iterations=1), iterations=1)
    gap = leg_gap_xrange(bop, y0 + int(0.48 * H), y0 + int(0.70 * H))
    if gap is None:
        continue
    band = np.zeros_like(blk); band[wy0:wy1, gap[0]:gap[1] + 1] = True
    strip = solid & blk & band
    cs[strip] = [0, 0, 0, 0]
    removed += int(strip.sum())

Image.fromarray(ca).save(cp)
print(f'{pose}-{d}: stripped {removed}px belt backing-shadow from the inter-leg gap (chain + outlines kept)')
