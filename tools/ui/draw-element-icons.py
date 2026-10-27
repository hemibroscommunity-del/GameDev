#!/usr/bin/env python3
"""v2.3.3609: three element icons drawn as the element itself.

The owner, 2026-10-26: "each zone represents an element.  Some zones (like
wind) have a strange rune representing the element.  It should just be a pure
icon of the element (like wind lines or something)."

Of the ten element icons ChatGPT drew for sheet F (v2.3.1223,
tools/process_icon_sheets.py), seven are the element itself or the element in
a frame -- a snowflake, a flame, a wave, a drop, a leaf -- and three are not:
wind was a spiral rune on a grey triangle, storm a purple star, stone a
cracked floor tile.  This draws those three again, in code, in the sheet's
own manner (a thick near-black outline, flat colour lit from the top left, a
gloss), as the element alone:

  elem-wind.webp   three gusts of wind, curling at their ends
  elem-storm.webp  a lightning bolt
  elem-stone.webp  a boulder, its faces lit from above

256 x 256, see-through, the drawing ~170 px across like the others; drawn at
4x and brought down, so the edges are smooth.  process_icon_sheets.py no
longer writes these three (its DRAWN_IN_CODE).

Usage: python3 tools/ui/draw-element-icons.py [--out DIR]
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_DIR = os.path.join(ROOT, 'public', 'icons', 'ui')

SIZE = 256
SS = 4                      # drawn at 4x, brought down at the end
N = SIZE * SS
OUTLINE = 12                # the sheet's outline, ~3 px at 256 (in 4x px)


def canvas():
    return Image.new('L', (N, N), 0)


def to_mask(im):
    return np.asarray(im, dtype=np.uint8) > 127


def shifted(m, dx, dy):
    """m moved by (dx, dy): out[y, x] = m[y - dy, x - dx], off the edge empty."""
    out = np.zeros_like(m)
    h, w = m.shape
    ys = slice(max(0, dy), min(h, h + dy))
    xs = slice(max(0, dx), min(w, w + dx))
    ys0 = slice(max(0, -dy), min(h, h - dy))
    xs0 = slice(max(0, -dx), min(w, w - dx))
    out[ys, xs] = m[ys0, xs0]
    return out


def paint(rgba, mask, colour, alpha=255):
    """Colour `mask` into the float RGBA array (straight alpha, over)."""
    a = (alpha / 255.0)
    m = mask.astype(np.float32) * a
    for c in range(3):
        rgba[..., c] = rgba[..., c] * (1 - m) + colour[c] * m
    rgba[..., 3] = np.maximum(rgba[..., 3], m * 255.0)


def paint_grad(rgba, mask, top, bottom, y0, y1):
    """A vertical gradient from `top` at y0 to `bottom` at y1, inside mask."""
    ys = np.clip((np.arange(N, dtype=np.float32) - y0) / max(1, (y1 - y0)), 0, 1)[:, None]
    m = mask.astype(np.float32)
    for c in range(3):
        col = top[c] * (1 - ys) + bottom[c] * ys
        rgba[..., c] = rgba[..., c] * (1 - m) + col * m
    rgba[..., 3] = np.maximum(rgba[..., 3], m * 255.0)


def finish(rgba):
    """Bring the 4x drawing down to 256, premultiplied so the edges never
    take the colour of the see-through pixels round them."""
    arr = np.clip(rgba, 0, 255).astype(np.uint8)
    im = Image.fromarray(arr, 'RGBA').convert('RGBa')
    im = im.resize((SIZE, SIZE), Image.LANCZOS).convert('RGBA')
    return im


def rims(fill, k):
    """The fill's top-left rim (lit) and bottom-right rim (shaded), k px deep."""
    lit = fill & ~shifted(fill, k, k)
    shade = fill & ~shifted(fill, -k, -k)
    return lit, shade


# ═══ WIND ═══════════════════════════════════════════════════════════════

def gust_path(x0, x1, y, cr, turn_to, up=True, steps=420):
    """A gust: a straight stroke from (x0, y) to (x1, y), then a curl about a
    centre `cr` above (or below) its end, round to angle `turn_to` degrees,
    tightening as it goes.  Returns [(x, y, t)] with t 0..1 along it."""
    straight = x1 - x0
    sweep = abs(turn_to - (90 if up else -90))
    curl_len = math.radians(sweep) * cr * 0.85
    total = straight + curl_len
    pts = []
    for i in range(steps + 1):
        s = total * i / steps
        if s <= straight:
            pts.append((x0 + s, y, s / total))
        else:
            u = (s - straight) / curl_len          # 0..1 round the curl
            rad = cr * (1 - 0.32 * u)               # tightening
            if up:
                th = math.radians(90 - sweep * u)   # bottom of the circle, round over the top
                cx, cy = x1, y - cr
            else:
                th = math.radians(-90 + sweep * u)  # top of the circle, round under the bottom
                cx, cy = x1, y + cr
            pts.append((cx + rad * math.cos(th), cy + rad * math.sin(th), s / total))
    return pts


def stroke_mask(pts, width_at, extra=0):
    im = canvas()
    d = ImageDraw.Draw(im)
    for x, y, t in pts:
        r = width_at(t) + extra
        d.ellipse((x - r, y - r, x + r, y + r), fill=255)
    return to_mask(im)


def draw_wind():
    R = 38
    def width_at(t):
        if t < 0.22:
            return R * (0.42 + 0.58 * (t / 0.22))  # a thin tail swelling in
        if t > 0.9:
            return R * (1 - 0.3 * (t - 0.9) / 0.1)  # the curl's tip eases off
        return R
    gusts = [
        gust_path(250, 560, 352, 74, -160, up=True),
        gust_path(178, 690, 512, 80, -160, up=True),
        gust_path(286, 590, 672, 74, 160, up=False),
    ]
    rgba = np.zeros((N, N, 4), np.float32)
    outer = np.zeros((N, N), bool)
    fills = []
    for g in gusts:
        outer |= stroke_mask(g, width_at, OUTLINE)
        fills.append(stroke_mask(g, width_at))
    paint(rgba, outer, (14, 28, 46))
    for g, f in zip(gusts, fills):
        # each gust over the one before: its own outline first, so where two
        # meet the line between them stays drawn
        paint(rgba, stroke_mask(g, width_at, OUTLINE) & ~f, (14, 28, 46))
        paint_grad(rgba, f, (246, 252, 255), (196, 228, 246), 300, 720)
        lit, shade = rims(f, 9 * SS // 4)
        _, deep = rims(f, 22 * SS // 4)
        paint(rgba, deep & ~shade, (150, 196, 226), 170)
        paint(rgba, shade, (118, 168, 206))
        paint(rgba, lit, (255, 255, 255), 230)
    # a gloss on the long gust
    gl = canvas()
    ImageDraw.Draw(gl).rounded_rectangle((260, 494, 470, 506), radius=6, fill=255)
    paint(rgba, to_mask(gl) & fills[1], (255, 255, 255), 200)
    return finish(rgba)


# ═══ STORM: a lightning bolt ═══════════════════════════════════════════

def draw_storm():
    bolt = [(566, 128), (316, 560), (494, 560), (382, 902), (742, 404), (556, 404), (690, 128)]
    rgba = np.zeros((N, N, 4), np.float32)
    o = canvas()
    d = ImageDraw.Draw(o)
    d.polygon(bolt, fill=255)
    d.line(bolt + [bolt[0], bolt[1]], fill=255, width=OUTLINE * 2, joint='curve')
    for x, y in bolt:
        d.ellipse((x - OUTLINE, y - OUTLINE, x + OUTLINE, y + OUTLINE), fill=255)
    outer = to_mask(o)
    f = canvas()
    ImageDraw.Draw(f).polygon(bolt, fill=255)
    fill = to_mask(f)
    paint(rgba, outer, (34, 18, 58))
    paint_grad(rgba, fill, (255, 248, 150), (255, 176, 34), 140, 880)
    lit, shade = rims(fill, 12 * SS // 4)
    _, deep = rims(fill, 30 * SS // 4)
    paint(rgba, deep & ~shade, (255, 150, 30), 150)
    paint(rgba, shade, (226, 112, 18))
    paint(rgba, lit, (255, 255, 228), 240)
    # a gloss down the upper arm
    gl = canvas()
    ImageDraw.Draw(gl).polygon([(586, 170), (626, 170), (440, 500), (414, 500)], fill=255)
    paint(rgba, to_mask(gl) & fill & ~lit, (255, 255, 236), 210)
    return finish(rgba)


# ═══ STONE: a boulder ══════════════════════════════════════════════════

def draw_stone():
    # the boulder's outline, round the clock from its lower left
    rock = [(214, 716), (190, 586), (246, 450), (360, 330), (520, 268), (676, 288),
            (792, 380), (850, 520), (838, 680), (744, 790), (560, 830), (352, 812)]
    # its faces: the top lit, the left in the light's half, the right in shade
    top = [(246, 450), (360, 330), (520, 268), (676, 288), (792, 380), (708, 476),
           (522, 506), (360, 484)]
    left = [(190, 586), (246, 450), (360, 484), (522, 506), (500, 820), (352, 812),
            (214, 716)]
    right = [(522, 506), (708, 476), (792, 380), (850, 520), (838, 680), (744, 790),
             (560, 830), (500, 820)]
    rgba = np.zeros((N, N, 4), np.float32)
    o = canvas()
    d = ImageDraw.Draw(o)
    d.polygon(rock, fill=255)
    d.line(rock + [rock[0], rock[1]], fill=255, width=OUTLINE * 2, joint='curve')
    for x, y in rock:
        d.ellipse((x - OUTLINE, y - OUTLINE, x + OUTLINE, y + OUTLINE), fill=255)
    paint(rgba, to_mask(o), (36, 27, 21))
    fill = canvas()
    ImageDraw.Draw(fill).polygon(rock, fill=255)
    rockm = to_mask(fill)
    for face, a, b in ((top, (204, 194, 176), (176, 164, 146)),
                       (left, (160, 146, 126), (136, 122, 104)),
                       (right, (122, 108, 92), (98, 86, 72))):
        fm = canvas()
        ImageDraw.Draw(fm).polygon(face, fill=255)
        paint_grad(rgba, to_mask(fm) & rockm, a, b, 260, 830)
    lit, shade = rims(rockm, 10 * SS // 4)
    paint(rgba, shade, (78, 66, 54))
    paint(rgba, lit, (226, 218, 202), 220)
    # the ridges between the faces and two cracks, thinner than the outline
    ln = canvas()
    dl = ImageDraw.Draw(ln)
    dl.line([(246, 450), (360, 484), (522, 506), (708, 476), (792, 380)], fill=255, width=14, joint='curve')
    dl.line([(522, 506), (500, 820)], fill=255, width=14)
    dl.line([(632, 560), (690, 620), (676, 700)], fill=255, width=9, joint='curve')
    dl.line([(330, 600), (390, 660)], fill=255, width=9)
    paint(rgba, to_mask(ln) & rockm, (58, 46, 36))
    # a few lit specks on the top face
    sp = canvas()
    ds = ImageDraw.Draw(sp)
    for x, y, r in ((430, 380, 12), (560, 336, 9), (640, 410, 8), (300, 560, 7)):
        ds.ellipse((x - r, y - r, x + r, y + r), fill=255)
    paint(rgba, to_mask(sp) & rockm, (236, 230, 216), 230)
    return finish(rgba)


def main(argv):
    out = OUT_DIR
    if '--out' in argv:
        out = argv[argv.index('--out') + 1]
    os.makedirs(out, exist_ok=True)
    for name, fn in (('elem-wind', draw_wind), ('elem-storm', draw_storm), ('elem-stone', draw_stone)):
        im = fn()
        path = os.path.join(out, name + '.webp')
        im.save(path, 'WEBP', lossless=True)
        bb = im.getchannel('A').getbbox()
        print('%-12s %s  drawing %s' % (name, path, bb))


if __name__ == '__main__':
    main(sys.argv[1:])
