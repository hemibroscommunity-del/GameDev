#!/usr/bin/env python3
"""v2.3.4100: the jump and sprint buttons' pictures, and the weapon pill's
greyed weapons, drawn here.

The owner, 2026-11-03: "I uploaded ... different pill shape weapon swap type
bar. Put it centered bottom of screen area. Also different icons for jump,
sprint, and reticle."  The owner's references (on the repository's root, not
shipped) are a cream winged foot in a ring, a white figure leaping, a thin
broken-ring reticle, and a pill of three wells with the weapon in hand in
colour and the others grey.  The foot and the jumper are someone else's
pictures (one a well-known game's class logo, one a stock silhouette), so the
game wears its OWN drawings of the same ideas, in the controls' manner: a
light figure on the dark button, a near-black outline, lit from the upper left.

  ctl-jump.webp      a figure at the top of a leap, arms flung up, one knee
                     tucked, the other leg trailing
  ctl-sprint.webp    a running foot, toes forward to the right, the heel
                     lifted, a three-feather wing sweeping up and back from
                     the back of its ankle, two speed lines behind the heel
  wpn-melee.webp, wpn-ranged.webp, wpn-staff.webp
                     the Character sheet's own sword, bow and staff
                     (public/icons/ui/hero/), small, for the pill's lit well
  wpn-melee-grey.webp, wpn-ranged-grey.webp, wpn-staff-grey.webp
                     the same, grey, for the wells you are not holding: the
                     game never filters a picture on screen (TRAPS §42), so
                     the grey is baked

112 x 112 (the weapons 96 x 96: MEMORY-MAP's UI icon, each under ~50 KB
decoded), see-through, drawn at 4x and brought
down, then put on 256 colours or fewer by the game's own quant256.js (the
memory law; public/tools/style/process.js reduceColours runs the same).

Usage: python3 tools/ui/draw-control-icons.py [--out DIR]
"""
import math
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_DIR = os.path.join(ROOT, 'public', 'ui', 'controls')
HERO = os.path.join(ROOT, 'public', 'icons', 'ui', 'hero')

SIZE = 112                   # ~49 KB decoded: MEMORY-MAP's UI icon, under ~50 KB
SS = 4
N = SIZE * SS
INK = (244, 228, 188)        # the controls' parchment (controlSkin JUMP_INK)
LIGHT = (255, 248, 226)      # its lit side
SHADE = (214, 192, 146)      # its shaded side
EDGE = (27, 23, 18)          # the controls' outline (controlSkin JUMP_EDGE)
OUTLINE = 20                 # in 4x px: ~5 px at 160


def mask():
    return Image.new('L', (N, N), 0)


def arr(im):
    return np.asarray(im, dtype=np.uint8) > 127


def dilate(m, r):
    """m grown by a disc of radius r (4x px)."""
    out = m.copy()
    h, w = m.shape
    rr = int(r)
    for dy in range(-rr, rr + 1):
        for dx in range(-rr, rr + 1):
            if dx * dx + dy * dy > r * r:
                continue
            ys0, ys1 = max(0, dy), min(h, h + dy)
            xs0, xs1 = max(0, dx), min(w, w + dx)
            out[ys0:ys1, xs0:xs1] |= m[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
    return out


def shifted(m, dx, dy):
    out = np.zeros_like(m)
    h, w = m.shape
    out[max(0, dy):min(h, h + dy), max(0, dx):min(w, w + dx)] = \
        m[max(0, -dy):min(h, h - dy), max(0, -dx):min(w, w - dx)]
    return out


def finish(body, extra_edges=None):
    """The body in parchment, lit up-left and shaded down-right, inside a
    near-black outline; `extra_edges`: inner dark lines (a mask) drawn over."""
    rgba = np.zeros((N, N, 4), dtype=np.uint8)
    edge = dilate(body, OUTLINE)
    rgba[edge] = EDGE + (255,)
    rgba[body] = INK + (255,)
    k = 14
    lit = body & ~shifted(body, k, k)        # the up-left rim of the body
    shade = body & ~shifted(body, -k, -k)    # the down-right rim
    rgba[shade] = SHADE + (255,)
    rgba[lit] = LIGHT + (255,)
    if extra_edges is not None:
        rgba[extra_edges & body] = EDGE + (255,)
    im = Image.fromarray(rgba, 'RGBA')
    return im.resize((SIZE, SIZE), Image.LANCZOS)


def limb(d, pts, w):
    """A rounded limb through the points (4x px), w wide."""
    d.line(pts, fill=255, width=int(w), joint='curve')
    r = w / 2
    for (x, y) in (pts[0], pts[-1]):
        d.ellipse((x - r, y - r, x + r, y + r), fill=255)


def P(x, y):
    """A point given on a 100-unit square, in 4x px (with a margin)."""
    m = 0.08 * N
    return (m + x / 100.0 * (N - 2 * m), m + y / 100.0 * (N - 2 * m))


def draw_jump():
    """A figure at the top of its leap: arms flung up in a V, the head between
    them, the body leaning a little, the near knee tucked up in front, the far
    leg trailing down behind -- chunky, the bro's proportions, not a stock
    silhouette's."""
    im = mask()
    d = ImageDraw.Draw(im)
    u = (N - 0.16 * N) / 100.0
    # the head
    hx, hy = P(52, 14)
    r = 9.5 * u
    d.ellipse((hx - r, hy - r, hx + r, hy + r), fill=255)
    # the body: a rounded trunk, shoulders to hips
    limb(d, [P(51, 33), P(48, 56)], 19 * u)
    # the arms, up and out
    limb(d, [P(44, 36), P(33, 25), P(26, 10)], 9 * u)
    limb(d, [P(58, 36), P(69, 25), P(78, 11)], 9 * u)
    # the near leg: thigh forward, knee up, shin back down
    limb(d, [P(52, 58), P(66, 64), P(62, 80)], 11 * u)
    # the far leg: trailing down and back, its foot pointed
    limb(d, [P(45, 59), P(37, 74), P(27, 86)], 11 * u)
    body = arr(im)
    return finish(body)


def feather(d, base, tip, bend, w):
    """A tapered, curved feather from base to tip (100-unit points), bowed by
    `bend` (units, to the left of the base->tip direction), w wide at the
    base."""
    (bx, by), (tx, ty) = base, tip
    mx, my = (bx + tx) / 2.0, (by + ty) / 2.0
    dx, dy = tx - bx, ty - by
    ln = math.hypot(dx, dy) or 1.0
    nx, ny = -dy / ln, dx / ln
    cx, cy = mx + nx * bend, my + ny * bend
    left, right = [], []
    steps = 24
    for i in range(steps + 1):
        t = i / float(steps)
        x = (1 - t) ** 2 * bx + 2 * (1 - t) * t * cx + t * t * tx
        y = (1 - t) ** 2 * by + 2 * (1 - t) * t * cy + t * t * ty
        # the tangent, for the width's direction
        gx = 2 * (1 - t) * (cx - bx) + 2 * t * (tx - cx)
        gy = 2 * (1 - t) * (cy - by) + 2 * t * (ty - cy)
        gl = math.hypot(gx, gy) or 1.0
        px, py = -gy / gl, gx / gl
        half = w / 2.0 * (1 - t) ** 0.7 + 0.6
        left.append(P(x + px * half, y + py * half))
        right.append(P(x - px * half, y - py * half))
    d.polygon(left + right[::-1], fill=255)


def draw_sprint():
    """A running foot seen from the side, toes forward to the right and the
    heel lifted off the ground, the arch hollow under it; a three-feather wing
    sweeping up and BACK (to the left) from the back of the ankle; two speed
    lines behind the heel.  Our own drawing of the winged-foot idea: the
    reference's foot points down-left with its wing up the front."""
    im = mask()
    d = ImageDraw.Draw(im)
    u = (N - 0.16 * N) / 100.0
    foot = [P(48, 22), P(58, 22), P(60, 46), P(70, 54), P(84, 59), P(92, 62), P(95, 67),
            P(91, 72), P(78, 72), P(68, 70), P(60, 69), P(52, 72), P(45, 72), P(42, 64),
            P(45, 44)]
    d.polygon(foot, fill=255)
    hx, hy = P(46.5, 67)
    r = 5.5 * u
    d.ellipse((hx - r, hy - r, hx + r, hy + r), fill=255)               # the heel, round
    tx, ty = P(91, 67)
    r = 5 * u
    d.ellipse((tx - r, ty - r, tx + r, ty + r), fill=255)               # the toe, round
    # the wing: three curved feathers fanning up and back from the ankle
    feather(d, (47, 44), (8, 40), -6, 11)
    feather(d, (47, 37), (12, 20), -6, 11)
    feather(d, (49, 30), (24, 4), -5, 11)
    body = arr(im)
    lines = mask()
    dl = ImageDraw.Draw(lines)
    dl.line([P(44, 50), P(61, 48)], fill=255, width=int(4 * u))         # the ankle band
    speed = mask()
    ds = ImageDraw.Draw(speed)
    limb(ds, [P(10, 60), P(30, 60)], 5.5 * u)
    limb(ds, [P(16, 72), P(32, 72)], 5.5 * u)
    return finish(body | arr(speed), arr(lines))


WPN = 96                     # the pill's weapons: 28 px on screen, 84 at 3x; 36 KB decoded


def colour_weapon(name):
    """The Character sheet's picture of that weapon, small: the pill shows
    one always, so not the 256 px original (256 KB decoded each)."""
    return Image.open(os.path.join(HERO, name + '.webp')).convert('RGBA').resize((WPN, WPN), Image.LANCZOS)


def grey_weapon(name):
    """The Character sheet's picture of that weapon, grey: plain luminance
    lifted a little (it sits on the pill's dark well), the alpha kept."""
    im = colour_weapon(name)
    g = ImageOps.grayscale(im.convert('RGB'))
    g = g.point(lambda v: int(70 + v * 0.62))
    out = Image.merge('RGBA', (g, g, g, im.getchannel('A')))
    return out


def reduce_256(im):
    """The picture on 256 colours or fewer by the game's own quant256.js
    (draw-element-icons.py's own step)."""
    w, h = im.size
    js = ("import { reduce256, toRgba } from '%s';"
          "const ch=[];process.stdin.on('data',c=>ch.push(c));process.stdin.on('end',()=>{"
          "const d=new Uint8Array(Buffer.concat(ch));const r=reduce256(d,%d,%d);"
          "process.stderr.write(String(r.n));process.stdout.write(Buffer.from(toRgba(r.idx,r.pal).buffer));});"
          % (os.path.join(ROOT, 'public', 'tools', 'style', 'quant256.js'), w, h))
    p = subprocess.run(['node', '--input-type=module', '-e', js], input=im.tobytes(),
                       capture_output=True, check=True)
    return Image.frombytes('RGBA', (w, h), p.stdout), int(p.stderr or 0)


DRAWN = (('ctl-jump', draw_jump), ('ctl-sprint', draw_sprint),
         ('wpn-melee', lambda: colour_weapon('melee')),
         ('wpn-ranged', lambda: colour_weapon('bow')),
         ('wpn-staff', lambda: colour_weapon('magic')),
         ('wpn-melee-grey', lambda: grey_weapon('melee')),
         ('wpn-ranged-grey', lambda: grey_weapon('bow')),
         ('wpn-staff-grey', lambda: grey_weapon('magic')))


def main(argv):
    out = argv[argv.index('--out') + 1] if '--out' in argv else OUT_DIR
    os.makedirs(out, exist_ok=True)
    for name, fn in DRAWN:
        im, n = reduce_256(fn())
        path = os.path.join(out, name + '.webp')
        im.save(path, 'WEBP', lossless=True)
        print('%-16s %s  %dx%d  %d colours  %d bytes' % (name, path, im.width, im.height, n, os.path.getsize(path)))


if __name__ == '__main__':
    main(sys.argv[1:])
