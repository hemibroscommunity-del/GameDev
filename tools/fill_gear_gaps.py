"""Close the armour's gaps for the body-hidden render: lay the user's CHAIN BELT
sprite over the waist + black-fill any other enclosed hole (neck).

The renderer hides the body under the full armour set (so AI-drift can't make
the body peek past the plate edge).  That leaves the chest->legs WAIST gap (and
sometimes a neck gap) as a background hole.  Baked into the chest sheet (renders
over the legs):

  * Waist: black-fill a fixed figure-relative band (covers the hole, no flicker)
    then overlay the chain belt art (tools/posesheets/chainbelt.png), sized once
    per direction so it doesn't pulse and positioned to track the figure's bob.
  * Any other enclosed transparent region (neck): pure black.

Usage: python tools/fill_gear_gaps.py <pose> <dir>
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

FRAME = 256
BAND_FRAC = 0.12          # belt height as fraction of figure height
BAND_CY = 0.555           # belt centre as fraction of figure height (from crown)
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

# Pre-pass: belt height from median figure height (so the chain never pulses),
# and a STABLE seam offset = median distance from the crown to the central
# chest-plate bottom.  The waist sits a fixed length below the crown (torso
# length is constant); the per-frame chest-bottom is noisy and the bbox-bottom
# moves with the running feet -- the crown + median offset avoids both.
heights, offsets = [], []
for i in range(n):
    b = np.array(base.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME)))[:, :, 3] > 20
    ys = np.where(b.any(1))[0]
    if not len(ys):
        continue
    y0 = int(ys.min())
    heights.append(ys.max() - y0)
    cx = int(np.median(np.where(b)[1]))
    cb = ca[:, i * FRAME + max(0, cx - 4):i * FRAME + cx + 5, 3] > 20
    cyr = np.where(cb.any(1))[0]
    if len(cyr):
        offsets.append(int(cyr.max()) - y0)
medH = float(np.median(heights)) if heights else 150
band_h = max(6, int(BAND_FRAC * medH))
seam_off = int(np.median(offsets)) if offsets else int(0.55 * medH)
chain_s = CHAIN.resize((int(706 * band_h / 96), band_h), Image.LANCZOS)
chain_a = np.array(chain_s)

for i in range(n):
    cs = ca[:, i * FRAME:(i + 1) * FRAME]
    ls = la[:, (i % ln) * FRAME:(i % ln + 1) * FRAME]
    G = (cs[:, :, 3] > 20) | (ls[:, :, 3] > 20)
    # Overlay ONLY the chain belt at the waist; the black body (rendered under
    # the armour) fills the actual gap with its natural contour.
    bop = np.array(base.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME)))[:, :, 3] > 20
    yy = np.where(bop.any(1))[0]
    if not len(yy):
        ca[:, i * FRAME:(i + 1) * FRAME] = cs
        continue
    y0 = int(yy.min())
    # ANCHOR: crown (y0) + stable median torso offset -> tracks the body's
    # vertical bob but ignores the leg-spread and per-frame chest-edge noise.
    seam_y = y0 + seam_off
    by0 = seam_y - band_h // 3                      # mostly below the seam
    by1 = by0 + band_h
    Gd = ndimage.binary_dilation(G, iterations=1)
    band = np.zeros_like(bop)
    band[max(0, by0):min(FRAME, by1), :] = True
    region = band & bop & Gd                       # waist region this frame
    if not region.any():
        ca[:, i * FRAME:(i + 1) * FRAME] = cs
        continue
    # overlay chain, centred on the region's x-extent, clipped to the region
    xs = np.where(region.any(0))[0]
    rx0, rx1 = int(xs.min()), int(xs.max())
    rw = rx1 - rx0 + 1
    cw = chain_a.shape[1]
    sx = max(0, (cw - rw) // 2)
    crop = chain_a[:, sx:sx + rw]
    if crop.shape[1] < rw:                          # waist wider than chain: pad by tiling
        reps = int(np.ceil(rw / cw))
        crop = np.tile(chain_a, (1, reps, 1))[:, :rw]
    ch_op = crop[:, :, 3] > 30
    for dy in range(crop.shape[0]):
        ry = max(0, by0) + dy
        if ry < 0 or ry >= FRAME:
            continue
        row_mask = ch_op[dy] & region[ry, rx0:rx0 + crop.shape[1]]
        xs_row = np.where(row_mask)[0] + rx0
        cs[ry, xs_row, :3] = crop[dy, np.where(row_mask)[0], :3]
        cs[ry, xs_row, 3] = 255
    ca[:, i * FRAME:(i + 1) * FRAME] = cs

Image.fromarray(ca, 'RGBA').save(chest_p)
print(f'{pose}-{dir_}: chain belt + holes baked ({n} frames, belt {band_h}px)')
