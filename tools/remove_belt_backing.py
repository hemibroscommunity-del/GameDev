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


def leg_gap_xrange(bop, wy0, wy1, margin=6):
    """X-range of the transparent inter-leg GAP in the waist band, from the base
    body.  The belt lives in this central gap between the two legs; the HANDS
    swing LATERALLY (over or beyond the legs), so confining belt ops to this gap
    guarantees they never touch a hand.  Returns (gx0, gx1) or None if the legs
    are together (no gap -> no belt backing to strip).  This guard exists because
    earlier the waist-band op ran full-width and ate the low-swinging hands.

    The gap is the interior-transparent RUN nearest the body centre -- not the
    union of all interior transparent columns, which could otherwise stretch to a
    lateral notch beside a hand."""
    ys = np.where(bop.any(1))[0]
    if not len(ys):
        return None
    y0, H = int(ys.min()), int(ys.max()) - int(ys.min())
    tb = bop.copy(); tb[:y0 + int(0.28 * H)] = False; tb[y0 + int(0.46 * H):] = False
    txs = np.where(tb)[1]
    cx = int(np.median(txs)) if len(txs) else FRAME // 2
    col = bop[wy0:wy1, :].any(axis=0)          # opaque columns = the two legs
    xs = np.where(col)[0]
    if len(xs) == 0:
        return None
    xmin, xmax = int(xs.min()), int(xs.max())
    interior = ~col
    interior[:xmin] = False
    interior[xmax + 1:] = False                 # transparent ONLY between the legs
    xi = np.where(interior)[0]
    if len(xi) == 0:
        return None
    runs, s, p = [], int(xi[0]), int(xi[0])     # contiguous transparent runs
    for x in xi[1:]:
        if x == p + 1:
            p = int(x)
        else:
            runs.append((s, p)); s = p = int(x)
    runs.append((s, p))
    g0, g1 = min(runs, key=lambda r: abs((r[0] + r[1]) / 2 - cx))   # nearest centre
    return max(0, g0 - margin), min(FRAME - 1, g1 + margin)

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
        # Confine to the inter-leg gap ONLY: never strip black outside it (that is
        # where the swinging hands live -- stripping there ate them, v2.3.575).
        gap = leg_gap_xrange(bop, wy0, wy1)
        if gap is None:
            continue
        band = np.zeros_like(blk); band[wy0:wy1, gap[0]:gap[1] + 1] = True
        backing = solid & blk & band
        cs[backing] = [0, 0, 0, 0]
        removed += int(backing.sum())
    Image.fromarray(ca).save(cp)
    print(f'{pose}-{d} {slot}: removed {removed}px solid black belt-backing (chain + outlines kept)')
