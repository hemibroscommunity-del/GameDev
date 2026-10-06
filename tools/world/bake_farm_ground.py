#!/usr/bin/env python3
"""v2.3.3124: your farm's ground, laid from the owner's own Ground Studio pictures.

    python3 tools/world/bake_farm_ground.py            # writes public/maps/farm_v2.webp
    python3 tools/world/bake_farm_ground.py --out x.webp --preview x.png

The owner, 2026-10-06, of the old cave map: "This map isn't suited for a farm.
It was an early idea of having it be in a cave."  The new farm is drawn like
the Wheel it is reached from -- the same grass, the same yards, the same dirt,
at the same 2 picture px a game px (docs/WORLD-BIBLE.md §6, the art law) --
so no picture had to be made for it: this lays the owner's swatches
(public/world/ground/, each a seamless 1024 px tile of 512 game px) over the
plan in src/data/farmLayout.js FARM_GROUND, read through node so there is one
copy of the farm:

  - the commons' grass everywhere, its two versions (A and B) in big patches,
    as the Wheel's alike grounds mix (WORLD-PIPELINE "Alike grounds mix");
  - a yard of packed earth before the barn (the town's yards), and a dirt
    path from the gate (Main Street's), their edges WANDERING -- never a ruler
    line (the owner, v2.3.2977: "the lines between dirt and grass are razor
    straight") -- by noise at three sizes, down to the picture's own px;
  - every pixel a pixel of the owner's pictures, never a blend of two (TRAPS
    §122: averaging two textures is mush).

Deterministic: the same plan gives the same picture, every run.  Written as
lossless WebP (the maps' format, tiledMaps.js IMAGE_ZONE_MAPS; build_ground_
colors.py reads it for the dust).  docs/specs/farm-walk.md.
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PX = 2   # picture px a game px


def layout():
    js = ("import('" + os.path.join(REPO, 'src/data/farmLayout.js').replace('\\', '/') + "')"
          ".then(m => process.stdout.write(JSON.stringify({ zone: m.FARM_ZONE, ground: m.FARM_GROUND })))")
    out = subprocess.run(['node', '--input-type=module', '-e', js], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def swatch(name):
    im = Image.open(os.path.join(REPO, 'public/world/ground', name + '.png')).convert('RGB')
    return np.asarray(im, dtype=np.uint8)


def hash2(ix, iy, seed):
    """a value in [0, 1) for each integer lattice point -- the same everywhere, every run"""
    h = (ix.astype(np.int64) * 374761393 + iy.astype(np.int64) * 668265263 + seed * 2147483647) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    h = h ^ (h >> 16)
    return (h & 0xFFFFFF) / float(0x1000000)


def value_noise(xs, ys, cell, seed):
    """smooth value noise in [0, 1) at `cell` px a lattice step"""
    fx, fy = xs / cell, ys / cell
    ix, iy = np.floor(fx).astype(np.int64), np.floor(fy).astype(np.int64)
    tx, ty = fx - ix, fy - iy
    sx, sy = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
    a, b = hash2(ix, iy, seed), hash2(ix + 1, iy, seed)
    c, d = hash2(ix, iy + 1, seed), hash2(ix + 1, iy + 1, seed)
    return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy


def wander(xs, ys, seed, amp):
    """game px of wander at each point: three sizes of noise, the last one a
    picture px or two, so an edge is never a smooth curve either"""
    n = (value_noise(xs, ys, 150.0, seed) - 0.5) * 1.0 \
        + (value_noise(xs, ys, 46.0, seed + 7) - 0.5) * 0.55 \
        + (value_noise(xs, ys, 9.0, seed + 13) - 0.5) * 0.28
    return n * 2 * amp


def seg_dist(px, py, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    L = vx * vx + vy * vy
    t = np.clip(((px - ax) * vx + (py - ay) * vy) / (L if L else 1.0), 0, 1)
    dx, dy = px - (ax + t * vx), py - (ay + t * vy)
    return np.sqrt(dx * dx + dy * dy)


def bake(plan):
    W, H = plan['zone']['w'], plan['zone']['h']
    G = plan['ground']
    seed = int(G.get('seed', 1))
    OW, OH = W * PX, H * PX
    # game px of every picture px's centre
    ys, xs = np.mgrid[0:OH, 0:OW].astype(np.float64)
    gx, gy = (xs + 0.5) / PX, (ys + 0.5) / PX

    grass = [swatch(n) for n in G['grass']]
    yard = swatch(G['yard']['swatch'])
    path = swatch(G['path']['swatch'])

    def sample(tile):
        th, tw = tile.shape[:2]
        return tile[(ys.astype(np.int64)) % th, (xs.astype(np.int64)) % tw]

    # grass: A and B in big patches
    mix = value_noise(gx, gy, 260.0, seed + 101) + (value_noise(gx, gy, 70.0, seed + 103) - 0.5) * 0.35
    out = np.where((mix < 0.5)[..., None], sample(grass[0]), sample(grass[-1]))

    # the yard: an ellipse whose edge wanders
    Y = G['yard']
    r = np.sqrt(((gx - Y['cx']) / Y['rx']) ** 2 + ((gy - Y['cy']) / Y['ry']) ** 2)
    edge_px = (r - 1.0) * min(Y['rx'], Y['ry'])           # ~game px outside the edge
    in_yard = edge_px < wander(gx, gy, seed + 201, Y['wander'])

    # the path: a band along its line, its edges wandering
    P = G['path']
    d = np.full(gx.shape, 1e9)
    pts = P['points']
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        d = np.minimum(d, seg_dist(gx, gy, ax, ay, bx, by))
    in_path = d < P['width'] / 2 + wander(gx, gy, seed + 301, P['wander'])

    out = np.where(in_yard[..., None], sample(yard), out)
    out = np.where(in_path[..., None], sample(path), out)
    return Image.fromarray(out.astype(np.uint8), 'RGB'), {
        'size': (OW, OH), 'yard': float(in_yard.mean()), 'path': float(in_path.mean()),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=None)
    ap.add_argument('--preview', default=None, help='also a quarter-size PNG to look at')
    a = ap.parse_args()
    plan = layout()
    out = a.out or os.path.join(REPO, 'public' + plan['ground']['picture'])
    im, st = bake(plan)
    im.save(out, 'WEBP', lossless=True, method=6, quality=100)
    print('wrote', os.path.relpath(out, REPO), st['size'], '%.1f%% yard, %.1f%% path' % (st['yard'] * 100, st['path'] * 100),
          '%d KB' % (os.path.getsize(out) // 1024))
    if a.preview:
        im.resize((im.width // 4, im.height // 4), Image.LANCZOS).save(a.preview)


if __name__ == '__main__':
    sys.exit(main())
