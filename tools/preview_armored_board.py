"""Side-by-side board of the ARMORED player for every facing, idle vs jog,
rendered EXACTLY as entityRenderer.js composites it -- per-axis scale
(scale.x = sizeMul * STAND_WIDTH * JOG_WIDTH, scale.y = sizeMul * STAND_HEIGHT),
full helmeted-chest + greaves set so the body is hidden, mirror facings flipped
from their source dir.  All cells share ONE baseline so heights/widths are
directly comparable.  Keep constants in sync with entityRenderer.js.

Usage: python tools/preview_armored_board.py [--zoom F] [--out PATH]
"""
import argparse
import numpy as np
from PIL import Image, ImageDraw

FRAME = 256
LOCAL = 0.3515625

# --- keep in sync with src/rendering/systems/entityRenderer.js (v2.3.585) ---
BODY_DIR_SCALE = {
    'stand': {'south': 1.136, 'east': 0.983, 'north': 1.039, 'northeast': 1.003, 'southwest': 0.983},
    'jog':   {'south': 1.000, 'east': 1.157, 'north': 1.050, 'northeast': 1.126, 'southwest': 1.000},
}
STAND_WIDTH  = {'south': 1.060, 'east': 1.7325, 'north': 1.326, 'northeast': 1.654, 'southwest': 1.232}
STAND_HEIGHT = {'south': 0.975, 'east': 0.945, 'north': 0.964, 'northeast': 0.946, 'southwest': 0.949}
JOG_WIDTH    = {'northeast': 0.95, 'southwest': 0.95}
JOG_HEIGHT   = {'south': 1.052, 'east': 0.985, 'north': 0.926, 'northeast': 1.059, 'southwest': 1.028}

# display order (compass-ish), with each facing's source dir + whether it mirrors
FACINGS = [
    ('south',     'south',     False),
    ('southeast', 'southwest', True),
    ('east',      'east',      True),
    ('northeast', 'northeast', False),
    ('north',     'north',     False),
    ('northwest', 'northeast', True),
    ('west',      'east',      True),
    ('southwest', 'southwest', False),
]

ap = argparse.ArgumentParser()
ap.add_argument('--zoom', type=float, default=2.2)
ap.add_argument('--bg', default='60,64,72')
ap.add_argument('--out', default='tools/armored-board-v2.3.585.png')
a = ap.parse_args()


def sheet(path):
    try:
        im = Image.open(path).convert('RGBA'); return im, im.width // FRAME
    except FileNotFoundError:
        return None, 0


def compose(pose, srcdir):
    """Full 256 frame: legs then chest (armored, body hidden). Mid stride frame."""
    ch, cn = sheet(f'public/sprites/gear/chest/steelplate/{pose}-{srcdir}.png')
    lg, ln = sheet(f'public/sprites/gear/legs/steelgreaves/{pose}-{srcdir}.png')
    if not (cn and ln):
        return None
    i = (max(cn, ln) // 2)
    o = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
    o.alpha_composite(lg.crop(((i % ln) * FRAME, 0, (i % ln + 1) * FRAME, FRAME)))
    o.alpha_composite(ch.crop(((i % cn) * FRAME, 0, (i % cn + 1) * FRAME, FRAME)))
    return o


def render_cell(pose, srcdir, mirror, zoom):
    base = compose(pose, srcdir)
    if base is None:
        return None
    sw = STAND_WIDTH[srcdir] if pose == 'stand' else 1.0
    jw = JOG_WIDTH.get(srcdir, 1.0) if pose == 'jog' else 1.0
    sh = STAND_HEIGHT[srcdir] if pose == 'stand' else 1.0
    jh = JOG_HEIGHT.get(srcdir, 1.0) if pose == 'jog' else 1.0
    size_mul = BODY_DIR_SCALE[pose][srcdir] * LOCAL
    sx = size_mul * sw * jw * zoom
    sy = size_mul * sh * jh * zoom
    img = base.resize((max(1, int(FRAME * sx)), max(1, int(FRAME * sy))), Image.NEAREST)
    if mirror:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    # crop to opaque bbox so we can baseline-align
    arr = np.array(img); ys, xs = np.where(arr[:, :, 3] > 8)
    if len(ys):
        img = img.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    return img


bgc = tuple(int(x) for x in a.bg.split(','))
zoom = a.zoom

# render all cells first to size the grid on a shared baseline
poses = ['stand', 'jog']
cells = {(p, name): render_cell(p, src, mir, zoom) for name, src, mir in FACINGS for p in poses}
maxh = max(c.height for c in cells.values() if c)
maxw = max(c.width for c in cells.values() if c)
cellw = maxw + 20
cellh = maxh + 26          # room for baseline + label
ncol = len(FACINGS)
labelw = 60

W = labelw + cellw * ncol
H = cellh * len(poses) + 24
out = Image.new('RGBA', (W, H), bgc + (255,))
dr = ImageDraw.Draw(out)
dr.text((6, 6), 'v2.3.585', fill=(255, 255, 0, 255))

# column headers
for col, (name, _src, _mir) in enumerate(FACINGS):
    cx = labelw + col * cellw + cellw // 2
    dr.text((cx - len(name) * 3, 12), name, fill=(220, 220, 220, 255))

for row, pose in enumerate(poses):
    row_top = 24 + row * cellh
    baseline = row_top + cellh - 10
    dr.text((8, row_top + cellh // 2), 'IDLE' if pose == 'stand' else 'JOG', fill=(255, 210, 90, 255))
    # baseline guide
    dr.line([(labelw, baseline), (W, baseline)], fill=(110, 116, 126, 255))
    for col, (name, _src, _mir) in enumerate(FACINGS):
        c = cells[(pose, name)]
        if not c:
            continue
        x = labelw + col * cellw + (cellw - c.width) // 2
        out.alpha_composite(c, (x, baseline - c.height))

out.save(a.out)
print(f'-> {a.out}  ({W}x{H}, zoom {zoom})')
