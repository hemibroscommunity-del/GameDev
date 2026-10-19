#!/usr/bin/env python3
"""v2.3.3481: THE OWNER'S CHOSEN ICONS, CUT FROM THEIR THIRTEEN SHEETS.

The owner, 2026-10-19, uploaded thirteen ChatGPT sheets of game UI art, now in
assets/icons-source/owner-2026-10-19/.  Most of what is on them is ChatGPT
redrawing pictures the game already shows (it drew from the review
screenshots), so a review page set the nine places where one of them fills an
empty spot or replaces a wrong picture beside what the game shows today, at the
size it would be drawn, and the owner answered: "Icon picks: 1b, 2a, 3, 4, 5,
6, 8, 9".  This tool cuts those, and nothing else:

  1b  THE EIGHT LANDS' SCENES (brotown-pixel-ui-asset-sheet-2.png, its 2 x 4
      vignettes, each a scene standing on a painted name plate), shown above
      the game's own name plate when you cross into a land of the Wheel -- for
      every land, the four with the owner's earlier animated art too, so all
      eight match ("pick 1b and I'll use the sheet's eight for every land").
      The painted plate is NOT kept: the game's plate writes the name.
  2a  the gladiator helmet (fantasy-rpg-ui-asset-sheet-2.png), the Gladiator
      Arena window's header, where the Saloon's beer mug was.
  3   the handshake (brotown-pixel-ui-asset-sheet-2.png), on the trade request
      card, as the duel challenge card shows its swords.
  4   the three quest pins over a townsperson (brotown-rpg-ui-icon-sheet-2.png):
      a gold "!" (a quest to take), a "?" (taken, waiting on you) and a gold
      ring with a green check (ready to hand in).  The "?" is also written
      GREY, its own file (-grey): the owner decided a waiting quest wears a
      grey "?" so it never looks ready, and the review page showed it greyed.
      The canvas never filters a picture (TRAPS §42), so the grey is baked.
  5   the sack of gold (overflowing-sack-of-gold-coins-3.png, a picture on its
      own) beside the Gambling Den's weekly jackpot.
  6   the pet house (colorful-rpg-game-ui-asset-sheet.png) at the start of the
      Pets page's "Pet House: 10 more places" row.
  8   the prize wheel (fantasy-game-ui-icon-collection.png) on the Daily
      Rewards window's free daily spin row.
  9   the treasure map (colorful-rpg-game-ui-asset-sheet.png) on the empty
      Journey page.
Not 7 (the compass): the owner kept today's.  Not 10 (leg armour and the chest
to match): not answered yet -- a new entry in PIECES is all it would take.
v2.3.3488: and the HAMMER (fantasy-rpg-crafting-ui-asset-sheet-1.png, the one
on its gold "Craft" button) for the Blacksmith's Upgrade tab -- the owner's
playtest note: "Make the upgrade tab icon different for smithing.  Like a
hammer" (it wore the currency strip's gold gem).  Its button is painted in a
gradient, so it is cut by `card` below, not `key`.

HOW: the review page's own cuts, which the owner approved by eye.
  alpha  a free-standing piece on a transparent ground: its solid core (alpha
         over `amin`) grown `grow` px is its own region, which keeps its soft
         edge and drops a neighbour's glow that only reaches in faintly; the
         alpha lifted from the background remover's ~250 to solid
         (a' = min(255, a * 255 / 250), as cut-small-icons.py), and anything
         under 40 dropped (the faint halo round every piece).
  key    an icon painted on a flat card (the helmet, the handshake): the fill
         is the median of a ring of points 4 px inside the box (a card's border
         shading at its very corner is lighter than its fill), and a px within
         `tol` of it is see-through, fully solid past tol + `ramp`.
  card   (v2.3.3488) an icon on a card painted top-to-bottom in a GRADIENT (the
         gold "Craft" button runs 249,208,77 at its top to 192,133,47 at its
         foot, so one fill keyed a band of it out and left the rest): `key`
         row by row, each row's fill the median of its four px at either end
         (the piece must keep 5 px clear of the box's sides); then, within 3 px
         of what was keyed out, a px on the line from black to the row's fill
         (c = t x fill, within 24) is the piece's dark outline mixed with the
         card -- black at alpha 1 - t, or nothing where t is 0.97 or more (the
         card's own light rim round the piece); a px of the card's own hue
         (saturated, within 0.04) is its shading, gone where t is 0.6 or more
         -- so no edge keeps a rim of gold; anything under 40 alpha is dropped (the halo rule), and all
         but the biggest island of solid px, grown 2 px (specks of the card's
         shading, some hanging off the piece by a faint px).
  The boxes are the review's (its spec2 for the handshake), but for the
  helmet's: the review's [498, 522, 562, 580] took two px of the card's rounded
  corner (a speck at the cut's top left) and cut the helmet's chin off five
  rows short of the bracket line under it, so it is [502, 528, 562, 585] here.

THE LANDS' PLATE: each vignette is cut whole, then only the SCENE above its
painted plate is kept, crop (0, 0, w, plate_top - 3) as the review page did.
plate_top is the first row of the plate's parchment under its dark top edge:
the first run of rows at least 85% dark (of the row's solid px) is the edge,
and the first row after it that is 75% parchment is the plate.  The review
measured four by eye (hollows 104, mist 89, thunder 101, tidal 98) and this
tool refuses to write anything unless it measures the same four the same.

SIZES: a DOM picture at three times the CSS px it is DRAWN at (a 3x phone),
never upscaled (a picture is held decoded at its own size, so a bigger file is
memory for nothing, and a smaller source is not made sharper by stretching
it); each is the piece's own tight box, the CSS sizing it to that shape:
  helmet 26 x 28 CSS          handshake 40 x 26 (it is wider than tall)
  sack 64 x 69                pet house 40 x 33
  wheel 34 x 37               treasure map 120 x 69
  hammer 22 x 22 (v2.3.3488: the Upgrade tab's icon)
  land scenes: drawn about 180-215 CSS px wide (half the banner's width), so
               written at the sheet's own ~200 px -- the most it holds.
The quest pins are drawn on the CANVAS, 32 x 38 world px each (today's badge
was a 32 px disc), and written into one 72 x 86 frame, centred (2.25x their
world size, as the 64 px talk bubble is for 28 world px: a much bigger texture
only shimmers as the view slides, cut-small-icons.py's note).  All WebP 90.

Writes a CONTACT SHEET (--contact out.png), each piece on the game's slate and
on a light ground, to check by eye.  Refuses to overwrite an existing file
without --force; --dry cuts and reports, writes nothing; --only a,b cuts those.

  python3 tools/ui/cut-owner-icons.py [--force] [--dry] [--only name,..] [--contact out.png]
"""
import colorsys
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets', 'icons-source', 'owner-2026-10-19')
PUB = os.path.join(ROOT, 'public')
QUALITY = 90
DPR = 3                      # a DOM picture is written at 3x its CSS size...
UPSCALE_MAX = 1.0            # ...never past the source's own px
PIN_FRAME = (72, 86)         # the quest pins' frame: 2.25 x 32 x 38 world px

LANDS_SHEET = 'brotown-pixel-ui-asset-sheet-2.png'
# the review's boxes, the sheet's 2 x 4 vignettes (the plan's region ids)
LANDS = [
    ('ember', (24, 712, 232, 860)), ('frost', (230, 712, 434, 860)),
    ('sky', (434, 712, 640, 860)), ('verdant', (640, 708, 858, 860)),
    ('hollows', (24, 856, 232, 1000)), ('mist', (230, 862, 434, 1000)),
    ('thunder', (434, 856, 640, 1000)), ('tidal', (640, 862, 858, 1000)),
]
# what the review page measured, in the cut's own px (see THE LANDS' PLATE)
REVIEW_PLATE_TOP = {'hollows': 104, 'mist': 89, 'thunder': 101, 'tidal': 98}

# name: the file under public/ without .webp.  css: the size it is drawn at
# (DOM, CSS px); pin: a canvas quest pin (PIN_FRAME); scene: a land's scene.
PIECES = [
    *[dict(name='ui/banners/land-' + land, src=LANDS_SHEET, mode='alpha', box=box, grow=2, scene=land)
      for land, box in LANDS],
    dict(name='icons/ui/arena-helmet', src='fantasy-rpg-ui-asset-sheet-2.png', mode='key',
         box=(502, 528, 562, 585), css=(26, 28)),
    dict(name='icons/ui/trade-handshake', src=LANDS_SHEET, mode='key',
         box=(930, 640, 1052, 706), css=(40, 26)),
    dict(name='ui/quest/pin-offer', src='brotown-rpg-ui-icon-sheet-2.png', mode='alpha',
         box=(1128, 676, 1240, 812), grow=4, pin=True),
    dict(name='ui/quest/pin-ready', src='brotown-rpg-ui-icon-sheet-2.png', mode='alpha',
         box=(1252, 672, 1368, 812), grow=4, pin=True),
    dict(name='ui/quest/pin-waiting', src='brotown-rpg-ui-icon-sheet-2.png', mode='alpha',
         box=(1380, 668, 1492, 804), grow=4, pin=True, grey=True),
    dict(name='icons/ui/jackpot-sack', src='overflowing-sack-of-gold-coins-3.png', mode='alpha',
         box=(0, 0, 1024, 1536), grow=6, amin=200, css=(64, 69)),
    dict(name='icons/ui/pet-house', src='colorful-rpg-game-ui-asset-sheet.png', mode='alpha',
         box=(204, 788, 368, 924), grow=4, css=(40, 33)),
    dict(name='icons/ui/prize-wheel', src='fantasy-game-ui-icon-collection.png', mode='alpha',
         box=(68, 4, 456, 424), grow=4, css=(34, 37)),
    dict(name='icons/ui/journey-map', src='colorful-rpg-game-ui-asset-sheet.png', mode='alpha',
         box=(1208, 552, 1476, 708), grow=4, css=(120, 69)),
    # v2.3.3488: the Blacksmith's Upgrade tab, drawn 22 x 22 CSS px
    dict(name='icons/ui/smith-hammer', src='fantasy-rpg-crafting-ui-asset-sheet-1.png', mode='card',
         box=(84, 309, 176, 387), css=(22, 22)),
]

_sheets = {}


def sheet(name):
    if name not in _sheets:
        _sheets[name] = Image.open(os.path.join(SRC, name)).convert('RGBA')
    return _sheets[name]


def lift_alpha(im):
    """The background remover's ~250 is solid: a' = min(255, a * 255 / 250)."""
    im.putalpha(im.getchannel('A').point(lambda v: min(255, int(v * 255 / 250))))
    return im


def cut_alpha(src, box, amin=230, grow=6):
    c = sheet(src).crop(box)
    a = c.getchannel('A')
    core = a.point(lambda v: 255 if v > amin else 0)
    region = core.filter(ImageFilter.MaxFilter(grow * 2 + 1))
    c.putalpha(Image.composite(a, Image.new('L', a.size, 0), region))
    c = lift_alpha(c)
    c.putalpha(c.getchannel('A').point(lambda v: 0 if v < 40 else v))
    return c.crop(c.getbbox())


def cut_key(src, box, tol=16, ramp=18):
    c = sheet(src).crop(box)
    px = c.load()
    w, h = c.size
    ring = []
    for t in range(20):
        u = t / 19
        for (x, y) in ((int(4 + u * (w - 9)), 4), (int(4 + u * (w - 9)), h - 5),
                       (4, int(4 + u * (h - 9))), (w - 5, int(4 + u * (h - 9)))):
            ring.append(px[x, y])
    f = tuple(sorted(p[i] for p in ring)[len(ring) // 2] for i in range(3))
    out = Image.new('RGBA', c.size)
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            d = math.sqrt((r - f[0]) ** 2 + (g - f[1]) ** 2 + (b - f[2]) ** 2)
            k = 0 if d <= tol else (1 if d >= tol + ramp else (d - tol) / ramp)
            op[x, y] = (r, g, b, int(min(255, a * 255 / 250) * k))
    bb = out.getbbox()
    return out.crop(bb) if bb else out


def cut_card(src, box, tol=16, ramp=18):
    """v2.3.3488: `key` on a gradient card, row by row (see the header)."""
    c = sheet(src).crop(box)
    px = c.load()
    w, h = c.size
    fills = []
    for y in range(h):
        ends = [px[x, y] for x in (1, 2, 3, 4, w - 5, w - 4, w - 3, w - 2)]
        fills.append(tuple(sorted(q[i] for q in ends)[len(ends) // 2] for i in range(3)))
    out = Image.new('RGBA', c.size)
    op = out.load()
    gone = Image.new('L', c.size, 0)
    gp = gone.load()
    for y in range(h):
        f = fills[y]
        for x in range(w):
            r, g, b, a = px[x, y]
            d = math.sqrt((r - f[0]) ** 2 + (g - f[1]) ** 2 + (b - f[2]) ** 2)
            k = 0 if d <= tol else (1 if d >= tol + ramp else (d - tol) / ramp)
            op[x, y] = (r, g, b, int(min(255, a * 255 / 250) * k))
            if k == 0:
                gp[x, y] = 255
    band = gone.filter(ImageFilter.MaxFilter(7)).load()
    for y in range(h):
        f = fills[y]
        ff = sum(v * v for v in f) or 1
        fh = colorsys.rgb_to_hsv(f[0] / 255, f[1] / 255, f[2] / 255)[0]
        for x in range(w):
            if not band[x, y] or op[x, y][3] == 0:
                continue
            r, g, b, a = px[x, y]
            t = (r * f[0] + g * f[1] + b * f[2]) / ff
            on_line = math.sqrt((r - t * f[0]) ** 2 + (g - t * f[1]) ** 2 + (b - t * f[2]) ** 2) <= 24
            ph, ps, _ = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            card = ps > 0.5 and min(abs(ph - fh), 1 - abs(ph - fh)) < 0.04   # the card's own hue: its shading
            if on_line:
                op[x, y] = (0, 0, 0, 0) if t >= 0.97 else (6, 4, 3, int(255 * (1 - max(0.0, t))))
            elif card:
                op[x, y] = (0, 0, 0, 0) if t >= 0.6 else (6, 4, 3, int(255 * (1 - max(0.0, t))))
    out.putalpha(out.getchannel('A').point(lambda v: 0 if v < 40 else v))
    # specks the key left on the card (bits of its shading, apart from the
    # piece or hanging off it by a faint px): the biggest island of SOLID px
    # (alpha over 160) is the piece, and only what lies within 2 px of it is kept
    al = out.load()
    seen = set()
    best = []
    for y in range(h):
        for x in range(w):
            if al[x, y][3] <= 160 or (x, y) in seen:
                continue
            todo, isl = [(x, y)], []
            seen.add((x, y))
            while todo:
                cx, cy = todo.pop()
                isl.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and al[nx, ny][3] > 160:
                        seen.add((nx, ny))
                        todo.append((nx, ny))
            if len(isl) > len(best):
                best = isl
    core = Image.new('L', out.size, 0)
    cpx = core.load()
    for (x, y) in best:
        cpx[x, y] = 255
    keep = core.filter(ImageFilter.MaxFilter(5))
    out.putalpha(Image.composite(out.getchannel('A'), Image.new('L', out.size, 0), keep))
    bb = out.getbbox()
    return out.crop(bb) if bb else out


def plate_top(im):
    """The first row of a land vignette's painted plate (see the header)."""
    w, h = im.size
    px = im.load()
    rows = []
    for y in range(h):
        op = tan = dark = 0
        for x in range(w):
            r, g, b, a = px[x, y]
            if a <= 128:
                continue
            op += 1
            if r > 170 and g > 120 and b < 140 and r - b > 50:
                tan += 1
            if max(r, g, b) < 70:
                dark += 1
        rows.append((op, tan, dark))
    y = h // 3
    while y < h and not (rows[y][0] and rows[y][2] >= 0.85 * rows[y][0]):
        y += 1
    while y < h and rows[y][0] and rows[y][2] >= 0.85 * rows[y][0]:
        y += 1
    while y < h and not (rows[y][0] and rows[y][1] >= 0.75 * rows[y][0]):
        y += 1
    if y >= h - 8:
        raise SystemExit('ABORT plate_top: no painted plate found')
    return y


def resize(im, size):
    """Lanczos on premultiplied colour, so a see-through px's colour never
    bleeds into the edge (cut-bag-icons.py fit)."""
    if im.size == size:
        return im
    return im.convert('RGBa').resize(size, Image.LANCZOS).convert('RGBA')


def to_css(im, css):
    w, h = im.size
    k = min(UPSCALE_MAX, DPR * css[0] / w, DPR * css[1] / h)
    return resize(im, (max(1, round(w * k)), max(1, round(h * k))))


def to_pin(im):
    fw, fh = PIN_FRAME
    w, h = im.size
    k = min(fw / w, fh / h)
    small = resize(im, (max(1, round(w * k)), max(1, round(h * k))))
    out = Image.new('RGBA', PIN_FRAME, (0, 0, 0, 0))
    out.alpha_composite(small, ((fw - small.width) // 2, (fh - small.height) // 2))
    return out


def grey(im):
    """Plain luminance, the alpha kept: the review page's greyed "?"."""
    g = ImageOps.grayscale(im.convert('RGB')).convert('RGBA')
    g.putalpha(im.getchannel('A'))
    return g


def contact_sheet(cuts, path):
    cell = 172
    cols = 6
    rows_n = (len(cuts) + cols - 1) // cols
    cs = Image.new('RGBA', (cols * cell, rows_n * cell * 2), (0, 0, 0, 255))
    d = ImageDraw.Draw(cs)
    for i, (name, im) in enumerate(cuts):
        x, y = (i % cols) * cell, (i // cols) * cell * 2
        for j, ground in enumerate(((26, 37, 44, 255), (226, 220, 206, 255))):
            tile = Image.new('RGBA', (cell, cell), ground)
            k = min(1.0, (cell - 24) / im.width, (cell - 24) / im.height)
            t = resize(im, (max(1, round(im.width * k)), max(1, round(im.height * k))))
            tile.alpha_composite(t, ((cell - t.width) // 2, 18 + (cell - 18 - t.height) // 2))
            cs.alpha_composite(tile, (x, y + j * cell))
        d.text((x + 4, y + 3), name.split('/')[-1], fill=(220, 220, 220, 255))
    cs.convert('RGB').save(path)
    print('contact sheet:', path)


def main():
    force = '--force' in sys.argv
    dry = '--dry' in sys.argv
    contact = sys.argv[sys.argv.index('--contact') + 1] if '--contact' in sys.argv else None
    only = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
    writes, cuts = [], []
    for p in PIECES:
        short = p['name'].split('/')[-1]
        if only and short not in only and p['name'] not in only:
            continue
        if p['mode'] == 'alpha':
            im = cut_alpha(p['src'], p['box'], p.get('amin', 230), p.get('grow', 6))
        elif p['mode'] == 'card':
            im = cut_card(p['src'], p['box'], p.get('tol', 16), p.get('ramp', 18))
        else:
            im = cut_key(p['src'], p['box'], p.get('tol', 16), p.get('ramp', 18))
        raw = im.size
        if p.get('scene'):
            top = plate_top(im)
            want = REVIEW_PLATE_TOP.get(p['scene'])
            if want is not None and top != want:
                print(f'ABORT {short}: plate top measured {top}, the review measured {want}')
                return 1
            im = im.crop((0, 0, im.width, top - 3))
            im = im.crop(im.getbbox())
            print(f'  {short:16s} vignette {raw[0]}x{raw[1]}, plate from row {top}'
                  f'{" (the review: " + str(want) + ")" if want is not None else ""}, scene {im.width}x{im.height}')
            out = im
        elif p.get('pin'):
            out = to_pin(im)
            print(f'  {short:16s} cut {raw[0]}x{raw[1]} -> {out.width}x{out.height} frame')
        else:
            out = to_css(im, p['css'])
            print(f'  {short:16s} cut {raw[0]}x{raw[1]} -> {out.width}x{out.height}'
                  f' (drawn {p["css"][0]}x{p["css"][1]} CSS px)')
        cuts.append((p['name'], out))
        writes.append((p['name'], out))
        if p.get('grey'):
            g = grey(out)
            cuts.append((p['name'] + '-grey', g))
            writes.append((p['name'] + '-grey', g))
    if contact:
        contact_sheet(cuts, contact)
    if dry:
        return 0
    clash = [n for n, _ in writes if os.path.exists(os.path.join(PUB, n + '.webp'))]
    if clash and not force:
        print('refusing to overwrite (pass --force to re-cut):\n  ' + '\n  '.join(clash))
        return 1
    total = decoded = 0
    for name, im in writes:
        path = os.path.join(PUB, name + '.webp')
        os.makedirs(os.path.dirname(path), exist_ok=True)
        im.save(path, 'WEBP', quality=QUALITY, method=6)
        n = os.path.getsize(path)
        total += n
        decoded += im.width * im.height * 4
        print(f'  wrote {os.path.relpath(path, ROOT)}  {im.width}x{im.height}  {n} bytes'
              f'  ({im.width * im.height * 4 / 1024:.0f} KB decoded)')
    print(f'{len(writes)} files, {total / 1024:.0f} KB, {decoded / 1024:.0f} KB decoded')
    return 0


if __name__ == '__main__':
    sys.exit(main())
