"""Close the armour's gaps for the body-hidden render: a chainmail BELT over the
waist + a black fill for any other enclosed hole (neck).

The renderer hides the body under the full armour set (so AI-drift can't make
the body peek past the plate edge).  That leaves the chest->legs WAIST gap (and
sometimes a neck gap) as a background hole.  Fill them, baked into the chest
sheet (which renders over the legs):

  * Waist: a chainmail belt across a fixed figure-relative band -- present every
    frame regardless of leg motion (no gap-size flicker), reads as an
    intentional belt bridging chest and greaves.
  * Any other fully-enclosed transparent region (neck): pure black (shadowed gap).

Usage: python tools/fill_gear_gaps.py <pose> <dir>
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

FRAME = 256
BAND0, BAND1 = 0.54, 0.67          # waist belt band as fraction of figure height


def mail_tex(h, w):
    """Procedural chainmail band: iron base + staggered ring-dots + top hilite +
    downward shade, so at game scale it reads as a 3D belt, not a flat gap."""
    t = np.empty((h, w, 3), float)
    t[:] = (58, 58, 66)
    yy, xx = np.mgrid[0:h, 0:w]
    ring = ((np.cos(xx * 2.0 + (yy // 2) * 3.14159) + 1) * 0.5) * ((np.cos(yy * 2.0) + 1) * 0.5)
    t += ring[..., None] * np.array([30, 30, 36])
    shade = np.linspace(1.25, 0.72, h)[:, None, None]    # lit at top, dark at bottom
    t = (t * shade)
    t[:2] += 48                                          # bright top edge highlight
    return t.clip(0, 255)


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
TEX = mail_tex(FRAME, FRAME)
for i in range(n):
    cs = ca[:, i * FRAME:(i + 1) * FRAME]
    ls = la[:, (i % ln) * FRAME:(i % ln + 1) * FRAME]
    G = (cs[:, :, 3] > 20) | (ls[:, :, 3] > 20)
    # 1) black-fill any enclosed transparent hole (neck, etc.)
    free = ~G
    lbl, num = ndimage.label(free)
    if num:
        border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
        border.discard(0)
        interior = free & ~np.isin(lbl, list(border))
        if interior.any():
            cs[interior] = [0, 0, 0, 255]
    # 2) chainmail belt over the waist band
    bop = np.array(base.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME)))[:, :, 3] > 20
    yy = np.where(bop.any(1))[0]
    if len(yy):
        y0, H = int(yy.min()), int(yy.max()) - int(yy.min())
        band = np.zeros_like(bop)
        band[y0 + int(BAND0 * H):y0 + int(BAND1 * H), :] = True
        belt = band & bop & ndimage.binary_dilation(G, iterations=1)
        cs[belt, :3] = TEX[belt].astype(np.uint8)
        cs[belt, 3] = 255
    ca[:, i * FRAME:(i + 1) * FRAME] = cs

Image.fromarray(ca, 'RGBA').save(chest_p)
print(f'{pose}-{dir_}: belt + holes baked into chest ({n} frames)')
