"""Offline preview of the player as the GAME composites it -- body + layered gear,
with the same body-hide rule (a full helmeted-chest + legs set hides the body).
Lets us SEE a sprite/gear change before shipping it.

Mirrors entityRenderer.js: uniform BODY_DIR_SCALE[pose][dir] * LOCAL_SCALE, gear
copies the body transform, body hidden under a full covering set.

Usage:
  python tools/render_player.py <pose> <dir> [--armor on|off] [--cols N] [--scale F] [--out PATH]
    pose: stand | jog        dir: south|east|north|northeast|southwest
    --armor on (default): gear shown, body hidden (full set).  off: body only.
"""
import argparse
import numpy as np
from PIL import Image, ImageDraw

FRAME = 256
LOCAL = 0.3515625
# keep in sync with src/rendering/systems/entityRenderer.js BODY_DIR_SCALE
SCALE = {
    'stand': {'south': 1.136, 'east': 0.983, 'north': 1.039, 'northeast': 1.003, 'southwest': 0.983},
    'jog':   {'south': 1.000, 'east': 1.181, 'north': 1.050, 'northeast': 1.126, 'southwest': 1.000},
}

ap = argparse.ArgumentParser()
ap.add_argument('pose'); ap.add_argument('dir')
ap.add_argument('--armor', default='on', choices=['on', 'off'])
ap.add_argument('--cols', type=int, default=0, help='montage every Nth frame; 0=all')
ap.add_argument('--scale', type=float, default=2.0, help='preview zoom on top of game scale')
ap.add_argument('--bg', default='60,64,72')
ap.add_argument('--out', default='tools/_render.png')
a = ap.parse_args()
pose, d = a.pose, a.dir


def sheet(path):
    try:
        im = Image.open(path).convert('RGBA'); return im, im.width // FRAME
    except FileNotFoundError:
        return None, 0


body, bn = sheet(f'public/sprites/player/{pose}-{d}.png')
ch, cn = sheet(f'public/sprites/gear/chest/steelplate/{pose}-{d}.png')
lg, ln = sheet(f'public/sprites/gear/legs/steelgreaves/{pose}-{d}.png')
armor = a.armor == 'on' and cn and ln
nframes = max(bn, cn, ln) if armor else bn

gscale = SCALE.get(pose, {}).get(d, 1.0) * LOCAL * a.scale
bgc = tuple(int(x) for x in a.bg.split(','))


def crop(im):
    arr = np.array(im); ys, xs = np.where(arr[:, :, 3] > 8)
    return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)) if len(ys) else im


def compose(i):
    o = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
    if armor:
        # full set -> body HIDDEN; draw legs then chest (the visible armor)
        o.alpha_composite(lg.crop(((i % ln) * FRAME, 0, (i % ln + 1) * FRAME, FRAME)))
        o.alpha_composite(ch.crop(((i % cn) * FRAME, 0, (i % cn + 1) * FRAME, FRAME)))
    else:
        o.alpha_composite(body.crop(((i % bn) * FRAME, 0, (i % bn + 1) * FRAME, FRAME)))
    return o


idxs = list(range(nframes)) if a.cols == 0 else list(range(0, nframes, max(1, nframes // a.cols)))
cell = int(FRAME * gscale) + 8
H = cell + 18
out = Image.new('RGBA', (cell * len(idxs), H), bgc + (255,))
dr = ImageDraw.Draw(out)
for k, i in enumerate(idxs):
    c = crop(compose(i))
    c = c.resize((max(1, int(c.width * gscale)), max(1, int(c.height * gscale))), Image.NEAREST)
    out.alpha_composite(c, (k * cell + (cell - c.width) // 2, 14 + (cell - 8 - c.height)))
    dr.text((k * cell + 2, 2), f'{i}', fill=(255, 255, 0, 255))
out.save(a.out)
print(f'{pose}-{d} armor={a.armor}: {nframes} frames, {len(idxs)} shown -> {a.out}')
