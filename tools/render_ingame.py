"""Game-accurate player render: composites body+gear like preview_armor_frames,
then applies the SAME scale chain the renderer uses, so the offline preview
matches the real game.

Scale chain (mirror of entityRenderer.js):
  scale.x = BODY_DIR_SCALE[pose][dir] * STAND_WIDTH/JOG_WIDTH(armored)
  scale.y = BODY_DIR_SCALE[pose][dir] * STAND_HEIGHT/JOG_HEIGHT(armored)
BODY_DIR_SCALE is uniform (preserves proportions); the STAND_*/JOG_* per-axis
multipliers ('manual adjustments') apply ONLY when armored (chest AND legs).

  --no-manual  : drop the per-axis manual multipliers (show the proposed look).

Usage: python tools/render_ingame.py <pose> <dir> [--no-manual] [--zoom F] [--out P]
       python tools/render_ingame.py <pose> all [--no-manual] ...   (montage)
"""
import argparse, sys
sys.path.insert(0, '.')
import numpy as np
from PIL import Image, ImageDraw
import tools.preview_armor_frames as P

FRAME = 256
DIRS = ['south', 'east', 'north', 'northeast', 'southwest']

BODY_DIR_SCALE = {
    'stand': {'south': 1.136, 'east': 0.983, 'north': 1.039, 'northeast': 1.003, 'southwest': 0.983},
    'jog':   {'south': 1.000, 'east': 1.157, 'north': 1.050, 'northeast': 1.126, 'southwest': 1.000},
}
STAND_WIDTH  = {'south': 1.060, 'east': 1.7325, 'north': 1.326, 'northeast': 1.654, 'southwest': 1.232}
STAND_HEIGHT = {'south': 0.975, 'east': 0.945, 'north': 0.964, 'northeast': 0.946, 'southwest': 0.949}
JOG_HEIGHT   = {'south': 1.052, 'east': 0.985, 'north': 0.926, 'northeast': 0.977, 'southwest': 1.028}
JOG_WIDTH    = {'northeast': 0.903, 'southwest': 0.95}


def scales(pose, d, armored, manual):
    base = BODY_DIR_SCALE.get(pose, {}).get(d, 1.0)
    sx = sy = base
    if armored and manual:
        if pose == 'stand':
            sx *= STAND_WIDTH.get(d, 1.0); sy *= STAND_HEIGHT.get(d, 1.0)
        elif pose == 'jog':
            sx *= JOG_WIDTH.get(d, 1.0); sy *= JOG_HEIGHT.get(d, 1.0)
    return sx, sy


def render(pose, d, worn, manual, zoom):
    try:
        cim = Image.open(f'public/sprites/gear/chest/steelplate/{pose}-{d}.png')
        n = max(1, cim.width // FRAME)
    except FileNotFoundError:
        n = 1
    fi = n // 2                                   # representative mid frame
    N = {'head': (0, 0), 'chest': (0, 0), 'legs': (0, 0)}
    comp = P.composite(pose, d, fi, worn, N, 4)
    a = np.array(comp)[:, :, 3] > 8
    if a.any():
        ys, xs = np.where(a); comp = comp.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    armored = worn['chest'] and worn['legs']
    sx, sy = scales(pose, d, armored, manual)
    w = max(1, int(comp.width * sx * zoom)); h = max(1, int(comp.height * sy * zoom))
    return comp.resize((w, h), Image.NEAREST)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('pose'); ap.add_argument('dir')
    ap.add_argument('--no-manual', action='store_true')
    ap.add_argument('--legs', type=int, default=1)
    ap.add_argument('--zoom', type=float, default=1.6)
    ap.add_argument('--out', default='/tmp/ingame.png')
    a = ap.parse_args()
    worn = {'head': False, 'chest': True, 'legs': bool(a.legs)}
    dirs = DIRS if a.dir == 'all' else [a.dir]
    tiles = []
    for d in dirs:
        im = render(a.pose, d, worn, not a.no_manual, a.zoom)
        tiles.append((d, im))
    H = max(t.height for _, t in tiles) + 18
    W = sum(t.width for _, t in tiles) + 10 * len(tiles)
    cv = Image.new('RGBA', (W, H), (60, 64, 72, 255)); x = 5
    for d, im in tiles:
        cv.alpha_composite(im, (x, H - im.height)); ImageDraw.Draw(cv).text((x, 2), d, fill=(255, 255, 0, 255)); x += im.width + 10
    cv.convert('RGB').save(a.out)
    print('wrote', a.out, cv.size, 'manual=' + str(not a.no_manual))
