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

Shipped at 1.4583 = 1.75 / 1.2: the renderer draws the sheets 1.2x larger
(weaponSprites GREATSWORD_LEN_MUL, "a little longer too"), so the width on
screen is still 1.75x the original.

Run from the repo root ONCE against the original art (git show the pre-2895
files if you need to re-run):  python3 tools/art/widen_greatsword.py [factor]
Rewrites the five webps and their grips in handles.json in place.
"""
import json, sys
import numpy as np
from PIL import Image, ImageFilter

K = float(sys.argv[1]) if len(sys.argv) > 1 else 1.75
DIRS = ['south', 'southwest', 'east', 'northeast', 'north']
HANDLES = 'public/sprites/weapons/handles.json'
SS = 4  # supersample for the resample, then downsample

def smooth(big):
    """Straighten the art's 1px stair-steps BEFORE stretching them.

    Owner, on the first cut: "Southwest and northeast sword look like there's
    grouped pixel ridges on it."  A diagonal edge in the source is a staircase
    of 1px steps; stretched 1.46x across the blade those became uneven 1-2px
    steps -- visible ridges along both edges and the fuller.  So at the
    supersampled size the alpha is blurred by ~0.6 SOURCE px and the colour by ~0.3
    (premultiplied, so the edge does not darken), which turns each staircase
    into a straight ramp, and the alpha is then pulled back to a crisp edge
    with a contrast curve.  The colours keep a slight softening, below what
    the in-game scale (~0.3x) can show."""
    a = np.asarray(big).astype(np.float64) / 255.0
    rgb, al = a[..., :3], a[..., 3:4]
    pm = np.concatenate([rgb * al, al], axis=2)
    pm_img = Image.fromarray((pm * 255).round().astype(np.uint8), 'RGBA')
    def blur(sig):
        return np.asarray(pm_img.filter(ImageFilter.GaussianBlur(SS * sig))).astype(np.float64) / 255.0
    # the OUTLINE gets the stronger smoothing (that is where the steps
    # were); the colours inside -- keyline, fuller, shading -- only enough
    # to round a step off, or the detail washes out (the second cut did)
    ba, bc = blur(0.6), blur(0.3)
    al2 = ba[..., 3:4]
    alc = bc[..., 3:4]
    rgb2 = np.where(alc > 1e-4, bc[..., :3] / np.maximum(alc, 1e-4), 0)
    al3 = np.clip((al2 - 0.5) * 2.6 + 0.5, 0, 1)   # re-sharpen the outline
    out = np.concatenate([np.clip(rgb2, 0, 1), al3], axis=2)
    return Image.fromarray((out * 255).round().astype(np.uint8), 'RGBA')

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
    big = smooth(im.resize((W * SS, H * SS), Image.LANCZOS))
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
