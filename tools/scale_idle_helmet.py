"""Scale up the IDLE helmet (top of the chest gear) for one direction so it
matches the jog helmet size -- the idle helmets were drawn smaller in the source
art.  Only the head region is touched; body/breastplate untouched.

Method: isolate the helmet (top HEAD_FRAC of the figure, central blob), scale by
the given ratio, re-anchor its bottom-centre to the original neck point (so it
grows up/out from the neck and stays on the head), composite back.

Usage: python tools/scale_idle_helmet.py <dir> <ratio>
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

FRAME = 256
HEAD_FRAC = 0.21
d = sys.argv[1]
R = float(sys.argv[2])
p = f'public/sprites/gear/chest/steelplate/stand-{d}.png'
arr = np.array(Image.open(p).convert('RGBA'))[:, :FRAME]   # stand = 1 frame
op = arr[:, :, 3] > 20
ys = np.where(op.any(1))[0]
crown = int(ys.min()); figH = int(ys.max()) - crown
neck = crown + int(HEAD_FRAC * figH)

# helmet = central connected blob in [crown, neck]
top = op.copy(); top[neck:] = False
lbl, num = ndimage.label(top)
cx = int(np.median(np.where(op)[1]))
# pick the blob nearest the crown centre
best, bd = 0, 1e18
for k in range(1, num + 1):
    yy, xx = np.where(lbl == k)
    dd = (xx.mean() - cx) ** 2 + (yy.min() - crown) ** 2
    if dd < bd:
        bd, best = dd, k
helmet_mask = lbl == best
hys, hxs = np.where(helmet_mask)
hy0, hy1, hx0, hx1 = hys.min(), hys.max() + 1, hxs.min(), hxs.max() + 1
# crop helmet RGBA (masked)
crop = arr[hy0:hy1, hx0:hx1].copy()
m = helmet_mask[hy0:hy1, hx0:hx1]
crop[~m] = 0
hcx = int(np.median(hxs))                                # helmet centre x
bottom_y = hy1                                           # neck row

# scale
ch, cw = crop.shape[:2]
nh, nw = max(1, int(round(ch * R))), max(1, int(round(cw * R)))
scaled = Image.fromarray(crop, 'RGBA').resize((nw, nh), Image.LANCZOS)

# composite the bigger helmet OVER the original (original fills any gap -> no
# seam), centred on the helmet centre-x with its bottom at the neck.
px = hcx - nw // 2
py = bottom_y - nh
canvas = Image.fromarray(arr.copy(), 'RGBA')
canvas.alpha_composite(scaled, (max(0, px), max(0, py)))
Image.fromarray(np.array(canvas), 'RGBA').save(p)
print(f'stand-{d}: helmet scaled x{R:.2f} ({cw}x{ch} -> {nw}x{nh})')
