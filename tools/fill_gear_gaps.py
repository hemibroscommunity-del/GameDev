"""Close the armour's waist for the body-hidden render and lay the chain belt on
a STABLE waist anchor.

The renderer hides the body under the full armour set (no drift peek).  The
chest->legs WAIST becomes an enclosed hole that must be covered, and a chain
belt laid over it -- consistently, every frame:

  * Anchor (no per-frame jump/flicker): crown + the median crown->chest-bottom
    offset for this direction.  The waist is a fixed length below the crown;
    using a per-frame centroid made the belt jump to the feet and vanish on
    side views.
  * Band height covers the MAX waist gap across the cycle, so the black gap
    fill is always WITHIN the chain band -> chain always on top of black,
    never black above the chain.
  * Black-fill the band (and any other enclosed hole, e.g. neck) first, then
    lay the chain over it -> chain holes read as shadow, no background hole.

Usage: python tools/fill_gear_gaps.py <pose> <dir>
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

FRAME = 256
BAND_FRAC = 0.13          # belt height as fraction of figure height (fixed)
CHAIN = Image.open('tools/posesheets/chainbelt.png').convert('RGBA')   # 706x96 strip

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


def enclosed(G):
    free = ~G
    lbl, num = ndimage.label(free)
    if num == 0:
        return np.zeros_like(G)
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    return free & ~np.isin(lbl, list(border))


# Pre-pass: median height + stable chest-bottom offset (the waist anchor).
heights, offsets = [], []
for i in range(n):
    bop = np.array(base.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME)))[:, :, 3] > 20
    ys = np.where(bop.any(1))[0]
    if not len(ys):
        continue
    y0 = int(ys.min())
    heights.append(int(ys.max()) - y0)
    cx = int(np.median(np.where(bop)[1]))
    cb = ca[:, i * FRAME + max(0, cx - 4):i * FRAME + cx + 5, 3] > 20
    cyr = np.where(cb.any(1))[0]
    if len(cyr):
        offsets.append(int(cyr.max()) - y0)
medH = float(np.median(heights)) if heights else 150
seam_off = int(np.median(offsets)) if offsets else int(0.55 * medH)
band_h = int(BAND_FRAC * medH)
chain_s = np.array(CHAIN.resize((int(706 * band_h / 96), band_h), Image.LANCZOS))

for i in range(n):
    cs = ca[:, i * FRAME:(i + 1) * FRAME]
    ls = la[:, (i % ln) * FRAME:(i % ln + 1) * FRAME]
    G = (cs[:, :, 3] > 20) | (ls[:, :, 3] > 20)
    bop = np.array(base.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME)))[:, :, 3] > 20
    yy = np.where(bop.any(1))[0]
    if not len(yy):
        ca[:, i * FRAME:(i + 1) * FRAME] = cs
        continue
    y0 = int(yy.min())
    interior = enclosed(G)
    if interior.any():
        cs[interior] = [0, 0, 0, 255]               # close every hole (neck etc.)
    by0 = y0 + seam_off - 12                         # chain top ~ chest bottom, nudged up 10px
    Gd = ndimage.binary_dilation(G, iterations=1)
    band = np.zeros_like(bop)
    band[max(0, by0):min(FRAME, by0 + band_h), :] = True
    region = band & bop & Gd
    if not region.any():
        ca[:, i * FRAME:(i + 1) * FRAME] = cs
        continue
    cs[region] = [0, 0, 0, 255]                      # black under the chain band
    xs = np.where(region.any(0))[0]
    rx0, rw = int(xs.min()), int(xs.max()) - int(xs.min()) + 1
    cw = chain_s.shape[1]
    if rw <= cw:
        sx = max(0, (cw - rw) // 2)
        crop = chain_s[:, sx:sx + rw]
    else:
        crop = np.tile(chain_s, (1, int(np.ceil(rw / cw)), 1))[:, :rw]
    for dy in range(crop.shape[0]):
        ry = max(0, by0) + dy
        if ry < 0 or ry >= FRAME:
            continue
        cols = np.where((crop[dy, :, 3] > 30) & region[ry, rx0:rx0 + crop.shape[1]])[0]
        cs[ry, rx0 + cols, :3] = crop[dy, cols, :3]
        cs[ry, rx0 + cols, 3] = 255
    ca[:, i * FRAME:(i + 1) * FRAME] = cs

Image.fromarray(ca, 'RGBA').save(chest_p)
print(f'{pose}-{dir_}: belt baked (off {seam_off}, band {band_h}, {n} frames)')
