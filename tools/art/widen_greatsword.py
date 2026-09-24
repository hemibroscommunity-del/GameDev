"""v2.3.2895: widen the held greatsword art (owner: "make the great sword the
player holds wider, maybe 1.5 to 2x as wide").

Each per-facing sheet is drawn at a baked diagonal, so a plain x-stretch would
change the blade's ANGLE, not its thickness.  This stretches every sheet
PERPENDICULAR to its blade axis (found by PCA of the opaque pixels) about the
grip point in handles.json, so the hilt stays in the hand and only the blade
fattens.

The renderer sizes weapons by texture HEIGHT (fitScale = targetH / th), and a
fatter diagonal blade needs a taller canvas -- which would shrink the sword on
screen and cancel most of the widening.  So the ORIGINAL height (200) is kept
as the sheet's `fitH` in weaponSprites.js SHEETS and every sizing site divides
by that (weaponFitH) instead of the new, taller canvas.  Length on screen is
unchanged; only the width grows.

Run from the repo root ONCE against the original art (git show the pre-2895
files if you need to re-run):  python3 tools/art/widen_greatsword.py [factor]
Rewrites the five webps and their grips in handles.json in place.
"""
import json, sys
import numpy as np
from PIL import Image

K = float(sys.argv[1]) if len(sys.argv) > 1 else 1.75
DIRS = ['south', 'southwest', 'east', 'northeast', 'north']
HANDLES = 'public/sprites/weapons/handles.json'
SS = 4  # supersample for the resample, then downsample

handles = json.load(open(HANDLES))
for d in DIRS:
    path = f'public/sprites/weapons/swords/greatsword-{d}.webp'
    im = Image.open(path).convert('RGBA')
    W, H = im.size
    a = np.asarray(im)[..., 3].astype(float)
    ys, xs = np.nonzero(a > 32)
    pts = np.stack([xs, ys], 1).astype(float)
    pts -= pts.mean(0)
    _, vecs = np.linalg.eigh(pts.T @ pts)
    u = vecs[:, 1]; n = np.array([-u[1], u[0]])
    gx, gy = handles[f'greatsword-{d}']
    B = np.stack([u, n], 1)               # columns: axis, normal

    def fwd(al):
        return B @ np.diag([al, K]) @ B.T  # maps old offset -> new offset

    corners = np.array([[0, 0], [W, 0], [0, H], [W, H]], float) - [gx, gy]
    # opaque-pixel extents decide the canvas, not the (mostly empty) corners
    opq = np.stack([xs, ys], 1).astype(float) - [gx, gy]
    al = 1.0
    M = fwd(al)
    q = opq @ M.T
    x0, y0 = np.floor(q.min(0)) - 1
    x1, y1 = np.ceil(q.max(0)) + 2
    nW, nH = int(x1 - x0), int(y1 - y0)
    # PIL wants inverse map: out(px) -> in(px).  Work at SS x.
    Mi = np.linalg.inv(M)
    # out pixel (X,Y) at SS -> new offset = (X/SS + x0, Y/SS + y0) -> old = Mi @ off + g
    A = Mi / SS
    c = Mi @ np.array([x0, y0]) + [gx, gy]
    big = im.resize((W * SS, H * SS), Image.LANCZOS)
    A2 = A * SS
    c2 = c * SS
    out = big.transform((nW * SS, nH * SS), Image.AFFINE,
                        (A2[0, 0], A2[0, 1], c2[0], A2[1, 0], A2[1, 1], c2[1]),
                        resample=Image.BICUBIC)
    out = out.resize((nW, nH), Image.LANCZOS)
    bb = out.getbbox()
    out = out.crop(bb)
    ngx = round(-x0 - bb[0]); ngy = round(-y0 - bb[1])
    out.save(path, 'WEBP', lossless=True)
    handles[f'greatsword-{d}'] = [ngx, ngy]
    print(d, (W, H), '->', out.size, 'grip', (gx, gy), '->', (ngx, ngy))

json.dump(handles, open(HANDLES, 'w'), indent=2)
open(HANDLES, 'a').write('\n')
