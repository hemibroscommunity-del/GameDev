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

v2.3.3907: and the six that sat on a shape (flame, frost, water, dark, light,
flora: see "THE OTHER SIX" below), and every one put on 256 colours or fewer.
Venom is kept as drawn, only put on 256 colours.  Then the owner sent their
own hand-made set of all ten, which the game wears (tools/ui/cut-element-
sheet.mjs): these drawings are the FALLBACK, written only with --out or --force.

Usage: python3 tools/ui/draw-element-icons.py --out DIR [--only elem-a,elem-b] | --force
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


# ═══ v2.3.3907: THE OTHER SIX, AS THE ELEMENT ALONE ════════════════════
# The owner, 2026-11-02: "None of the elements should have shapes behind them.
# Just the element itself."  Six of sheet F's icons sat on a shape -- the flame
# in a gold-framed diamond, frost on a hexagon, water on a disc, dark a
# three-lobed blob, light an 8-point star badge, flora a vine drawn on a big
# leaf.  Drawn here again in v2.3.3609's manner (a thick outline in a darker
# shade of the icon's own colour, flat tones lit from the top left, a gloss):
#
#   elem-flame.webp  a single tall flame, a side lick on its left
#   elem-frost.webp  a six-armed snowflake
#   elem-water.webp  one curling wave, its crest white
#   elem-dark.webp   a swirl of purple-black smoke
#   elem-light.webp  a golden burst of rays round a small sun
#   elem-flora.webp  a sprig of three leaves on a short stem
#
# Every one of the ten is then put on 256 colours or fewer (the memory law,
# owner 2026-10-28) by the game's own quant256.js (public/tools/style/), the
# picture pipeline's colour step -- see reduce_256 below.

def dilate(m, r):
    """m grown by r px (alternate 4- and 8-neighbour steps: near-round)."""
    out = m.copy()
    for i in range(r):
        g = out.copy()
        g |= shifted(out, 1, 0) | shifted(out, -1, 0) | shifted(out, 0, 1) | shifted(out, 0, -1)
        if i % 2:
            g |= shifted(out, 1, 1) | shifted(out, -1, -1) | shifted(out, 1, -1) | shifted(out, -1, 1)
        out = g
    return out


def poly_mask(pts):
    im = canvas()
    ImageDraw.Draw(im).polygon([(float(x), float(y)) for x, y in pts], fill=255)
    return to_mask(im)


def spline(pts, corners=(), closed=True, per=24):
    """A Catmull-Rom curve through pts; a point whose index is in `corners`
    stays a sharp point (a flame's tip, a leaf's)."""
    n = len(pts)
    out = []
    rng = range(n) if closed else range(n - 1)
    for i in rng:
        p1, p2 = pts[i], pts[(i + 1) % n]
        p0 = p1 if (i in corners or (not closed and i == 0)) else pts[(i - 1) % n]
        j = (i + 1) % n
        p3 = p2 if (j in corners or (not closed and j == n - 1)) else pts[(i + 2) % n]
        for k in range(per):
            t = k / per
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * t +
                                    (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 +
                                    (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3) for c in range(2)))
    if not closed:
        out.append(pts[-1])
    return out


def scaled(pts, cx, cy, k, ky=None):
    ky = k if ky is None else ky
    return [(cx + (x - cx) * k, cy + (y - cy) * ky) for x, y in pts]


def shade_body(rgba, fill, top, bottom, y0, y1, deep_col, shade_col, lit_col,
               k_lit=10, k_deep=26, lit_a=230):
    paint_grad(rgba, fill, top, bottom, y0, y1)
    lit, shade = rims(fill, k_lit * SS // 4)
    _, deep = rims(fill, k_deep * SS // 4)
    paint(rgba, deep & ~shade, deep_col, 150)
    paint(rgba, shade, shade_col)
    paint(rgba, lit & ~shade, lit_col, lit_a)


# ═══ FLAME ═════════════════════════════════════════════════════════════

FLAME = [(560, 104), (612, 236), (700, 360), (768, 500), (782, 642), (730, 784),
         (622, 872), (512, 896), (398, 872), (294, 784), (246, 646), (262, 500),
         (318, 352), (380, 456), (440, 300)]
FLAME_TIPS = (0, 12)


def draw_flame():
    rgba = np.zeros((N, N, 4), np.float32)
    outer = poly_mask(spline(FLAME, FLAME_TIPS))
    paint(rgba, dilate(outer, OUTLINE), (92, 22, 10))
    shade_body(rgba, outer, (255, 132, 44), (214, 50, 26), 110, 890,
               (196, 40, 22), (150, 26, 14), (255, 196, 120))
    inner_pts = scaled(FLAME, 515, 860, 0.64, 0.62)
    inner = poly_mask(spline(inner_pts, FLAME_TIPS)) & outer
    paint(rgba, dilate(inner, 4) & outer & ~inner, (226, 92, 30))
    shade_body(rgba, inner, (255, 226, 96), (255, 156, 40), 380, 880,
               (255, 150, 36), (240, 120, 30), (255, 246, 190), k_lit=8, k_deep=18)
    core = poly_mask(spline(scaled(FLAME, 515, 860, 0.30, 0.28), FLAME_TIPS)) & inner
    paint(rgba, core, (255, 250, 214))
    # a gloss up the left of the body
    gl = canvas()
    ImageDraw.Draw(gl).line(spline([(330, 700), (322, 600), (348, 520)], closed=False),
                            fill=255, width=22, joint='curve')
    paint(rgba, to_mask(gl) & outer & ~inner, (255, 214, 160), 200)
    return finish(rgba)


# ═══ FROST: a six-armed snowflake ══════════════════════════════════════

def draw_frost():
    cx, cy, L, W = 512, 512, 380, 24
    im = canvas()
    d = ImageDraw.Draw(im)

    def bar(x0, y0, x1, y1, w):
        d.line((x0, y0, x1, y1), fill=255, width=w * 2)
        for x, y in ((x0, y0), (x1, y1)):
            d.ellipse((x - w, y - w, x + w, y + w), fill=255)

    for a in range(6):
        th = math.radians(90 + a * 60)
        ux, uy = math.cos(th), -math.sin(th)
        ex, ey = cx + ux * L, cy + uy * L
        bar(cx, cy, ex, ey, W)
        for at, bl, bw in ((0.42, 140, 19), (0.70, 104, 16)):
            bx, by = cx + ux * L * at, cy + uy * L * at
            for side in (-1, 1):
                ph = th + side * math.radians(52)
                bar(bx, by, bx + math.cos(ph) * bl, by - math.sin(ph) * bl, bw)
        # a small diamond at the arm's tip
        tx, ty = cx + ux * (L - 8), cy + uy * (L - 8)
        px, py = -uy, ux
        d.polygon([(tx + ux * 40, ty + uy * 40), (tx + px * 30, ty + py * 30),
                   (tx - ux * 30, ty - uy * 30), (tx - px * 30, ty - py * 30)], fill=255)
    hexr = 70
    d.polygon([(cx + hexr * math.cos(math.radians(30 + 60 * i)),
                cy + hexr * math.sin(math.radians(30 + 60 * i))) for i in range(6)], fill=255)
    flake = to_mask(im)
    rgba = np.zeros((N, N, 4), np.float32)
    paint(rgba, dilate(flake, OUTLINE), (20, 52, 104))
    shade_body(rgba, flake, (252, 255, 255), (176, 218, 248), 130, 900,
               (150, 196, 236), (104, 156, 214), (255, 255, 255), k_lit=8, k_deep=16)
    # the centre's hollow: a little darker ring, lit
    ring = canvas()
    ImageDraw.Draw(ring).ellipse((cx - 30, cy - 30, cx + 30, cy + 30), fill=255)
    paint(rgba, to_mask(ring), (126, 180, 228))
    return finish(rgba)


# ═══ WATER: one curling wave ═══════════════════════════════════════════

def wave_path(steps=600):
    """From the trough's far right, left along the bottom, up the wave's
    face, over its top and curling down inside -- (x, y, t)."""
    cx, cy = 480, 520
    x0, xb, yb = 850, cx, 800
    straight = x0 - xb
    sweep = 330.0                                   # degrees round the curl
    r0, r1 = yb - cy, 96
    curl_len = math.radians(sweep) * (r0 + r1) / 2
    total = straight + curl_len
    pts = []
    for i in range(steps + 1):
        s = total * i / steps
        if s <= straight:
            # the trough lifts a little to the right, as the sea beyond
            u = s / straight
            pts.append((x0 - s, yb - 60 * (1 - u) ** 2, s / total))
        else:
            u = (s - straight) / curl_len
            th = math.radians(90 + sweep * u)
            r = r0 + (r1 - r0) * u
            pts.append((cx + r * math.cos(th), cy + r * math.sin(th), s / total))
    return pts


def draw_water():
    pts = wave_path()

    def width_at(t):
        if t < 0.18:
            return 56 + 60 * (t / 0.18)
        if t < 0.55:
            return 116
        return 116 - 86 * ((t - 0.55) / 0.45)

    body = stroke_mask(pts, width_at)
    rgba = np.zeros((N, N, 4), np.float32)
    paint(rgba, dilate(body, OUTLINE), (10, 36, 94))
    shade_body(rgba, body, (96, 186, 246), (28, 98, 196), 200, 900,
               (34, 104, 196), (20, 70, 160), (190, 232, 255), k_lit=10, k_deep=34)
    # the crest: white foam along the top of the wave, from its face round
    # the curl -- the outer edge of the stroke where it runs over the top
    crest_pts = [p for p in pts if 0.36 < p[2] < 0.86]
    crest = stroke_mask(crest_pts, lambda t: width_at(t) * 0.42) & body
    outer_edge = body & ~stroke_mask(crest_pts, lambda t: width_at(t) * 0.42)
    foam = body & dilate(crest & ~shifted(crest, 0, 0), 0)
    edge = body & ~shifted(body, 0, 26) & ~shifted(body, 22, 0) | (body & ~shifted(body, -18, 14))
    foam = edge & stroke_mask(crest_pts, lambda t: width_at(t) * 1.02)
    paint(rgba, dilate(foam, 6) & body, (236, 248, 255))
    paint(rgba, foam, (255, 255, 255))
    # three foam drops thrown off the curl's lip
    dr = canvas()
    dd = ImageDraw.Draw(dr)
    for x, y, r in ((700, 360, 26), (760, 300, 18), (720, 252, 12)):
        dd.ellipse((x - r, y - r, x + r, y + r), fill=255)
    drops = to_mask(dr)
    paint(rgba, dilate(drops, OUTLINE - 2) & ~body, (10, 36, 94))
    paint(rgba, drops, (246, 252, 255))
    return finish(rgba)


# ═══ DARK: a swirl of purple-black smoke ═══════════════════════════════

def draw_dark():
    cx, cy = 520, 500
    sweep, steps = 560.0, 700
    pts = []
    for i in range(steps + 1):
        u = i / steps
        th = math.radians(200 + sweep * u)
        r = 340 * (1 - u) ** 0.85 + 30
        pts.append((cx + r * math.cos(th), cy + r * math.sin(th), u))

    def width_at(t):
        swell = 1 + 0.16 * math.sin(t * 46)          # the smoke's puffs
        if t < 0.16:
            base = 20 + 54 * (t / 0.16)                # a thin wisp swelling in
        elif t > 0.86:
            base = 74 - 30 * ((t - 0.86) / 0.14)
        else:
            base = 74
        return base * swell

    body = stroke_mask(pts, width_at)
    # a loose puff off the tail
    pf = canvas()
    dp = ImageDraw.Draw(pf)
    for x, y, r in ((236, 696, 40), (190, 770, 26)):
        dp.ellipse((x - r, y - r, x + r, y + r), fill=255)
    puffs = to_mask(pf) & ~dilate(body, OUTLINE + 6)
    rgba = np.zeros((N, N, 4), np.float32)
    paint(rgba, dilate(body | puffs, OUTLINE), (16, 8, 26))
    for m in (puffs, body):
        shade_body(rgba, m, (122, 82, 168), (52, 30, 80), 160, 860,
                   (60, 36, 92), (36, 20, 58), (176, 140, 214), k_lit=10, k_deep=28)
    # a gloss on the outer arc
    gl = canvas()
    arc = [(cx + 300 * math.cos(math.radians(a)), cy + 300 * math.sin(math.radians(a)))
           for a in range(220, 262, 2)]
    ImageDraw.Draw(gl).line(arc, fill=255, width=16, joint='curve')
    paint(rgba, to_mask(gl) & body, (214, 190, 240), 200)
    return finish(rgba)


# ═══ LIGHT: a golden burst of rays ═════════════════════════════════════

def draw_light():
    cx, cy = 512, 512
    core_r = 118
    rays = np.zeros((N, N), bool)
    for i in range(12):
        th = math.radians(-90 + i * 30)
        long_ = i % 2 == 0
        R, r0, half = (410, 166, 13.0) if long_ else (320, 168, 10.0)
        a0, a1 = th - math.radians(half), th + math.radians(half)
        rays |= poly_mask([(cx + r0 * math.cos(a0), cy + r0 * math.sin(a0)),
                           (cx + R * math.cos(th), cy + R * math.sin(th)),
                           (cx + r0 * math.cos(a1), cy + r0 * math.sin(a1))])
    cm = canvas()
    ImageDraw.Draw(cm).ellipse((cx - core_r, cy - core_r, cx + core_r, cy + core_r), fill=255)
    core = to_mask(cm)
    rgba = np.zeros((N, N, 4), np.float32)
    paint(rgba, dilate(rays | core, OUTLINE), (112, 58, 8))
    shade_body(rgba, rays, (255, 238, 140), (240, 160, 28), 100, 920,
               (238, 150, 24), (206, 118, 14), (255, 252, 214), k_lit=7, k_deep=14)
    shade_body(rgba, core, (255, 252, 210), (255, 190, 50), cy - core_r, cy + core_r,
               (250, 176, 40), (224, 136, 20), (255, 255, 240), k_lit=10, k_deep=30)
    gl = canvas()
    ImageDraw.Draw(gl).ellipse((cx - 76, cy - 84, cx - 26, cy - 44), fill=255)
    paint(rgba, to_mask(gl) & core, (255, 255, 250), 230)
    return finish(rgba)


# ═══ FLORA: a sprig of three leaves ════════════════════════════════════

def leaf(bx, by, ang, L, W):
    """A leaf from its base (bx, by) pointing at `ang` degrees (0 = right,
    -90 = up), L long and W wide: (outline points, midrib points)."""
    a = math.radians(ang)
    ux, uy = math.cos(a), math.sin(a)
    px, py = -uy, ux
    side1, side2 = [], []
    for i in range(41):
        s = i / 40
        hw = W * 0.5 * (math.sin(math.pi * s ** 0.8)) ** 0.9
        ax, ay = bx + ux * L * s, by + uy * L * s
        side1.append((ax + px * hw, ay + py * hw))
        side2.append((ax - px * hw, ay - py * hw))
    pts = side1 + side2[::-1]
    rib = [(bx + ux * L * s, by + uy * L * s) for s in (0.06, 0.8)]
    return pts, rib


def draw_flora():
    stem_pts = spline([(452, 900), (476, 760), (506, 620), (530, 470)], closed=False)
    leaves = [leaf(530, 476, -84, 380, 176),      # the top leaf
              leaf(500, 650, -152, 320, 150),     # the left
              leaf(512, 566, -24, 320, 150)]      # the right
    sm = canvas()
    ImageDraw.Draw(sm).line(stem_pts, fill=255, width=34, joint='curve')
    stem = to_mask(sm)
    lms = [poly_mask(p) for p, _ in leaves]
    allm = stem.copy()
    for m in lms:
        allm |= m
    rgba = np.zeros((N, N, 4), np.float32)
    paint(rgba, dilate(allm, OUTLINE), (18, 58, 20))
    shade_body(rgba, stem, (140, 190, 70), (92, 140, 44), 470, 900,
               (90, 138, 40), (62, 104, 30), (190, 226, 130), k_lit=6, k_deep=10)
    for m, (_, rib) in zip(lms, leaves):
        # each leaf over what is behind it: its own outline first
        paint(rgba, dilate(m, OUTLINE) & ~m, (18, 58, 20))
        shade_body(rgba, m, (164, 230, 90), (62, 156, 44), 100, 900,
                   (70, 158, 48), (40, 118, 34), (216, 250, 170), k_lit=10, k_deep=26)
        rb = canvas()
        ImageDraw.Draw(rb).line(rib, fill=255, width=12)
        paint(rgba, to_mask(rb) & m, (44, 116, 34))
    return finish(rgba)


def reduce_256(im):
    """The picture on 256 colours or fewer by the game's own quant256.js
    (OKLab, solid kept solid and soft kept soft, no dithering): the step
    public/tools/style/process.js reduceColours runs on every picture the
    studio makes.  Node does the counting; the RGBA goes there and back raw."""
    import subprocess
    w, h = im.size
    js = ("import { reduce256, toRgba } from '%s';"
          "const ch=[];process.stdin.on('data',c=>ch.push(c));process.stdin.on('end',()=>{"
          "const d=new Uint8Array(Buffer.concat(ch));const r=reduce256(d,%d,%d);"
          "process.stderr.write(String(r.n));process.stdout.write(Buffer.from(toRgba(r.idx,r.pal).buffer));});"
          % (os.path.join(ROOT, 'public', 'tools', 'style', 'quant256.js'), w, h))
    p = subprocess.run(['node', '--input-type=module', '-e', js], input=im.tobytes(),
                       capture_output=True, check=True)
    return Image.frombytes('RGBA', (w, h), p.stdout), int(p.stderr or 0)


DRAWN = (('elem-wind', draw_wind), ('elem-storm', draw_storm), ('elem-stone', draw_stone),
         ('elem-flame', draw_flame), ('elem-frost', draw_frost), ('elem-water', draw_water),   # v2.3.3907
         ('elem-dark', draw_dark), ('elem-light', draw_light), ('elem-flora', draw_flora))
KEPT = ('elem-venom',)


def main(argv):
    out = OUT_DIR
    if '--out' in argv:
        out = argv[argv.index('--out') + 1]
    # v2.3.3907: the game's ten are the owner's own hand-made set now
    # (tools/ui/cut-element-sheet.mjs); these drawings are the fallback, and
    # never written over the owner's without --force
    if os.path.abspath(out) == os.path.abspath(OUT_DIR) and '--force' not in argv:
        sys.exit('draw-element-icons: public/icons/ui/ holds the owner\'s cut set; pass --out DIR, or --force')
    os.makedirs(out, exist_ok=True)
    only = argv[argv.index('--only') + 1].split(',') if '--only' in argv else None
    for name, fn in DRAWN:
        if only and name not in only:
            continue
        im, n = reduce_256(fn())
        path = os.path.join(out, name + '.webp')
        im.save(path, 'WEBP', lossless=True)
        bb = im.getchannel('A').getbbox()
        print('%-12s %s  drawing %s  %d colours' % (name, path, bb, n))
    # v2.3.3907: venom (sheet F's drop) was already the element alone: kept as
    # drawn, only put on 256 colours (re-running leaves it exactly as it is)
    for name in KEPT:
        if only and name not in only:
            continue
        path = os.path.join(out, name + '.webp')
        src = path if os.path.exists(path) else os.path.join(OUT_DIR, name + '.webp')
        im, n = reduce_256(Image.open(src).convert('RGBA'))
        im.save(path, 'WEBP', lossless=True)
        print('%-12s %s  kept, %d colours' % (name, path, n))


if __name__ == '__main__':
    main(sys.argv[1:])
