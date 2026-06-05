"""Close the armour's waist for the body-hidden render and lay the chain belt on
the green-belt (waist gap) centre.

The renderer HIDES the body under the full armour set (so AI-drift can't make
any underbody peek past the plate edge -- the "black poking out everywhere").
That leaves the chest->legs WAIST as an enclosed hole.  Per frame, baked into
the chest sheet (renders over the legs):

  * Black-fill every fully-enclosed transparent region (waist + neck) so hiding
    the body leaves no background hole.
  * Lay the chain belt centred on the WAIST region's centroid -- i.e. the centre
    of the green belt the user drew (in the extracted frame that green belt IS
    the body-area not covered by either armour piece at the waist).

Usage: python tools/fill_gear_gaps.py <pose> <dir>
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

FRAME = 256
BAND_FRAC = 0.12          # belt height as fraction of figure height
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

heights = []
for i in range(n):
    b = np.array(base.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME)))[:, :, 3] > 20
    ys = np.where(b.any(1))[0]
    if len(ys):
        heights.append(ys.max() - ys.min())
medH = float(np.median(heights)) if heights else 150
band_h = max(6, int(BAND_FRAC * medH))
chain_s = np.array(CHAIN.resize((int(706 * band_h / 96), band_h), Image.LANCZOS))


def enclosed(G):
    free = ~G
    lbl, num = ndimage.label(free)
    if num == 0:
        return np.zeros_like(G)
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    return free & ~np.isin(lbl, list(border))


for i in range(n):
    cs = ca[:, i * FRAME:(i + 1) * FRAME]
    ls = la[:, (i % ln) * FRAME:(i % ln + 1) * FRAME]
    G = (cs[:, :, 3] > 20) | (ls[:, :, 3] > 20)
    bop = np.array(base.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME)))[:, :, 3] > 20
    yy = np.where(bop.any(1))[0]
    if not len(yy):
        ca[:, i * FRAME:(i + 1) * FRAME] = cs
        continue
    y0, H = int(yy.min()), int(yy.max()) - int(yy.min())
    interior = enclosed(G)
    if interior.any():
        cs[interior] = [0, 0, 0, 255]               # no background hole
    # green-belt centre = centroid of the enclosed WAIST region (drop the neck)
    waist = interior.copy()
    waist[:y0 + int(0.40 * H)] = False
    if waist.sum() > 15:
        wy, wx = np.where(waist)
        bx, byc = int(round(wx.mean())), int(round(wy.mean()))
    else:
        bx, byc = int(np.median(np.where(bop)[1])), y0 + int(0.56 * H)
    by0 = byc - band_h // 2
    Gd = ndimage.binary_dilation(G, iterations=1)
    band = np.zeros_like(bop)
    band[max(0, by0):min(FRAME, by0 + band_h), :] = True
    region = band & bop & Gd
    if not region.any():
        ca[:, i * FRAME:(i + 1) * FRAME] = cs
        continue
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
print(f'{pose}-{dir_}: belt on green-waist centroid + holes filled ({n} frames)')
