"""Stop the JOG chain belt from reading too WIDE at full stride.

fill_gear_gaps lays the belt across the whole waist GAP; when the legs spread
mid-stride the gap widens, so the belt TILES more links across it (each link is
the same size -- not stretched -- but the BAND gets wide, which reads as a
stretching belt).  User wants: a fixed-width belt centered on the waist, with the
rest of the spread-leg gap left as flat BLACK (shadow).

This is an in-place post-process on the already-baked jog chest sheet -- it does
NOT touch the jog body armor, only the belt band:
  * The belt band is found per frame from the BLACK gap-fill pixels the original
    bake laid down (pure [0,0,0]).
  * Belt center = the body's upper-torso centre (stable; not the gap centre,
    which shifts when one leg leads).
  * Fixed width W = a low percentile of the per-frame gap widths (the
    legs-together "narrow waist" frame -- the user's reference).
  * Everything in the band, inside the gap x-range but OUTSIDE the centered
    window, is set to flat black -> narrow chain + black shadow.

Usage: python tools/refit_jog_belt.py <dir>
"""
import sys
import numpy as np
from PIL import Image

FRAME = 256
d = sys.argv[1]
chest_p = f'public/sprites/gear/chest/steelplate/jog-{d}.png'
chest = Image.open(chest_p).convert('RGBA')
legs = Image.open(f'public/sprites/gear/legs/steelgreaves/jog-{d}.png').convert('RGBA')
base = Image.open(f'public/sprites/player/jog-{d}.png').convert('RGBA')
ca = np.array(chest)
n = chest.width // FRAME
ln = legs.width // FRAME
bn = base.width // FRAME


def waist_yband(i):
    """(wy0, wy1): waist row range from the base body, so belt detection ignores
    armor shadow-blacks elsewhere (helmet/arm joints) that aren't the belt."""
    bop = np.array(base.crop(((i % bn) * FRAME, 0, (i % bn + 1) * FRAME, FRAME)))[:, :, 3] > 20
    ys = np.where(bop.any(1))[0]
    if not len(ys):
        return 0, FRAME
    y0, H = int(ys.min()), int(ys.max()) - int(ys.min())
    return y0 + int(0.48 * H), y0 + int(0.74 * H)


def black_band(cs, wy0, wy1):
    """(y0,y1,x0,x1) of the pure-black gap fill WITHIN the waist y-band, or None."""
    blk = (cs[:, :, 0] == 0) & (cs[:, :, 1] == 0) & (cs[:, :, 2] == 0) & (cs[:, :, 3] > 0)
    blk[:wy0] = False
    blk[wy1:] = False
    if not blk.any():
        return None
    ys, xs = np.where(blk)
    return int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())


def body_cx(i):
    """Upper-torso centre x from the base body (stable belt centre)."""
    bop = np.array(base.crop(((i % bn) * FRAME, 0, (i % bn + 1) * FRAME, FRAME)))[:, :, 3] > 20
    ys = np.where(bop.any(1))[0]
    if not len(ys):
        return FRAME // 2
    y0, H = int(ys.min()), int(ys.max()) - int(ys.min())
    rb = bop.copy(); rb[:y0 + int(0.28 * H)] = False; rb[y0 + int(0.46 * H):] = False
    xs = np.where(rb)[1]
    return int(np.median(xs)) if len(xs) else FRAME // 2


# Pre-pass: gap widths -> fixed belt width W (20th pct = a narrow legs-together frame).
gaps = []
for i in range(n):
    wy0, wy1 = waist_yband(i)
    bb = black_band(ca[:, i * FRAME:(i + 1) * FRAME], wy0, wy1)
    if bb:
        gaps.append(bb[3] - bb[2] + 1)
if not gaps:
    print(f'jog-{d}: no black gap fill found -- nothing to refit')
    sys.exit(0)
W = int(np.percentile(gaps, 20))
half = W // 2

# Apply: reblack the belt outside the centered window.
changed = 0
for i in range(n):
    cs = ca[:, i * FRAME:(i + 1) * FRAME]
    wy0, wy1 = waist_yband(i)
    bb = black_band(cs, wy0, wy1)
    if not bb:
        continue
    y0, y1, x0, x1 = bb
    cxb = body_cx(i)
    win0, win1 = cxb - half, cxb + half
    if (x1 - x0 + 1) <= W:
        continue                                   # already narrow enough
    band = np.zeros((FRAME, FRAME), bool)
    band[y0:y1 + 1, max(0, x0 - 2):min(FRAME, x1 + 3)] = True
    band[:, max(0, win0):min(FRAME, win1)] = False   # keep the centered belt
    mask = band & (cs[:, :, 3] > 0)
    cs[mask] = [0, 0, 0, 255]
    changed += 1

Image.fromarray(ca, 'RGBA').save(chest_p)
print(f'jog-{d}: belt width fixed to {W}px (gaps {min(gaps)}-{max(gaps)}), {changed}/{n} frames reblacked')
