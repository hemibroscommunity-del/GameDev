"""Lower the chest cuirass COLLAR so it stops at the neck base instead of riding
up over the jaw (the head was "sinking" into the torso on the 3/4 / front views).

Per frame, remove chest-gear pixels that sit OVER the body's head silhouette
above the neck-base line.  Pauldrons/spikes at the sides aren't over the (narrow,
central) head silhouette, so they're untouched.  Frames where a raised gauntlet
is correctly in front of the face are SKIPPED (gear-over-head coverage above
GAUNTLET_COV) so the arm is never cut.

Run AFTER the chest is ingested (before the belt).  Usage:
  python tools/lower_collar.py <pose> <dir> [neck_frac=0.27] [gauntlet_cov=0.45]
"""
import sys
import numpy as np
from PIL import Image

FRAME = 256
pose, d = sys.argv[1], sys.argv[2]
neck_frac = float(sys.argv[3]) if len(sys.argv) > 3 else 0.27
gauntlet_cov = float(sys.argv[4]) if len(sys.argv) > 4 else 0.45

base = Image.open(f'public/sprites/player/{pose}-{d}.png').convert('RGBA')
bn = base.width // FRAME
cp = f'public/sprites/gear/chest/steelplate/{pose}-{d}.png'
ca = np.array(Image.open(cp).convert('RGBA'))
n = ca.shape[1] // FRAME

trimmed = 0
for i in range(n):
    cs = ca[:, i * FRAME:(i + 1) * FRAME]
    bop = np.array(base.crop(((i % bn) * FRAME, 0, (i % bn + 1) * FRAME, FRAME)))[:, :, 3] > 40
    ys = np.where(bop.any(1))[0]
    if not len(ys):
        continue
    top, bot = int(ys.min()), int(ys.max())
    fh = bot - top
    head = bop.copy(); head[top + int(0.30 * fh):] = False    # body head+neck silhouette
    gop = cs[:, :, 3] > 40
    if head.sum() == 0:
        continue
    cov = (gop & head).sum() / head.sum()
    if cov > gauntlet_cov:
        continue                                              # raised gauntlet in front of face -> leave it
    # x-range of the NARROW head (sampled from the upper head rows) so we trim the
    # collar only across the head/neck, never the wider shoulders (which would
    # expose shoulder skin).
    htop = bop.copy(); htop[:top] = False; htop[top + int(0.18 * fh):] = False
    hx = np.where(htop.any(0))[0]
    if len(hx) == 0:
        continue
    hx0, hx1 = max(0, int(hx.min()) - 2), min(FRAME, int(hx.max()) + 3)
    collar = gop & head.copy()
    collar[top + int(neck_frac * fh):] = False                # only the part above the neck base
    collar[:, :hx0] = False                                   # ... and only across the head width
    collar[:, hx1:] = False
    cs[collar] = [0, 0, 0, 0]
    trimmed += int(collar.sum())
    ca[:, i * FRAME:(i + 1) * FRAME] = cs

Image.fromarray(ca).save(cp)
print(f'{pose}-{d}: lowered collar -- trimmed {trimmed}px of gear over the head (neck_frac={neck_frac}, skip cov>{gauntlet_cov})')
