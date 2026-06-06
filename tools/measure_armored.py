"""Measure the rendered armored figure (opaque bbox) for every facing, idle vs
jog, using the EXACT entityRenderer.js scale math, and report the % bump each
needs per axis to hit a common target.  Measures the full-res composite bbox
then multiplies by the real scale factors -> no resampling error.

Keep constants in sync with src/rendering/systems/entityRenderer.js (v2.3.585).
"""
import numpy as np
from PIL import Image

FRAME = 256
LOCAL = 0.3515625

BODY_DIR_SCALE = {
    'stand': {'south': 1.136, 'east': 0.983, 'north': 1.039, 'northeast': 1.003, 'southwest': 0.983},
    'jog':   {'south': 1.000, 'east': 1.157, 'north': 1.050, 'northeast': 1.126, 'southwest': 1.000},
}
STAND_WIDTH  = {'south': 1.060, 'east': 1.7325, 'north': 1.326, 'northeast': 1.654, 'southwest': 1.232}
STAND_HEIGHT = {'south': 0.975, 'east': 0.945, 'north': 0.964, 'northeast': 0.946, 'southwest': 0.949}
JOG_WIDTH    = {'northeast': 0.95, 'southwest': 0.95}
JOG_HEIGHT   = {'south': 1.052, 'east': 0.985, 'north': 0.926, 'northeast': 1.059, 'southwest': 1.028}

DIRS = ['south', 'east', 'north', 'northeast', 'southwest']


def sheet(path):
    im = Image.open(path).convert('RGBA'); return im, im.width // FRAME


def base_bbox(pose, d):
    """Opaque bbox (w,h) of the armored composite at FULL res, mid stride frame."""
    ch, cn = sheet(f'public/sprites/gear/chest/steelplate/{pose}-{d}.png')
    lg, ln = sheet(f'public/sprites/gear/legs/steelgreaves/{pose}-{d}.png')
    i = max(cn, ln) // 2
    o = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
    o.alpha_composite(lg.crop(((i % ln) * FRAME, 0, (i % ln + 1) * FRAME, FRAME)))
    o.alpha_composite(ch.crop(((i % cn) * FRAME, 0, (i % cn + 1) * FRAME, FRAME)))
    arr = np.array(o); ys, xs = np.where(arr[:, :, 3] > 8)
    return (xs.max() - xs.min() + 1), (ys.max() - ys.min() + 1)


rows = {}
for pose in ['stand', 'jog']:
    for d in DIRS:
        bw, bh = base_bbox(pose, d)
        size_mul = BODY_DIR_SCALE[pose][d] * LOCAL
        sw = STAND_WIDTH[d] if pose == 'stand' else 1.0
        sh = STAND_HEIGHT[d] if pose == 'stand' else 1.0
        jw = JOG_WIDTH.get(d, 1.0) if pose == 'jog' else 1.0
        jh = JOG_HEIGHT.get(d, 1.0) if pose == 'jog' else 1.0
        W = bw * size_mul * sw * jw
        H = bh * size_mul * sh * jh
        rows[(pose, d)] = (W, H)

Ws = [v[0] for v in rows.values()]
Hs = [v[1] for v in rows.values()]
tW = float(np.median(Ws))
tH = float(np.median(Hs))

print(f'Rendered game-px (armored). Targets = median: W={tW:.1f}px  H={tH:.1f}px\n')
hdr = f"{'pose':5} {'dir':10} {'W':>6} {'H':>6}   {'dW%':>6} {'dH%':>6}"
print(hdr); print('-' * len(hdr))
for pose in ['stand', 'jog']:
    for d in DIRS:
        W, H = rows[(pose, d)]
        dW = (tW / W - 1) * 100
        dH = (tH / H - 1) * 100
        print(f"{pose:5} {d:10} {W:6.1f} {H:6.1f}   {dW:+6.1f} {dH:+6.1f}")
    print()

# also report the resulting NEW constant values if bumps applied
print('=== resulting constants (apply bump to current) ===')
print('STAND_WIDTH :', {d: round(STAND_WIDTH[d] * (tW / rows[("stand", d)][0]), 3) for d in DIRS})
print('STAND_HEIGHT:', {d: round(STAND_HEIGHT[d] * (tH / rows[("stand", d)][1]), 3) for d in DIRS})
print('JOG_WIDTH   :', {d: round(JOG_WIDTH.get(d, 1.0) * (tW / rows[("jog", d)][0]), 3) for d in DIRS})
print('JOG_HEIGHT  :', {d: round((tH / rows[("jog", d)][1]), 3) for d in DIRS}, '(new control)')
