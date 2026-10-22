#!/usr/bin/env python3
"""v2.3.3559: THE POINTS TAB'S TWO HEADS, CUT FROM THE OWNER'S SHEETS.

The owner, 2026-10-21, sent a sheet of art for the Points tab
(assets/icons-source/sheet-points-heads.png) and a mockup of how it is put
together (assets/icons-source/mock-points-heads.png): "On the character points
screen swap out the old style icons with these.  It should look similar to the
second screenshot mockup but it won't have the shaped backgrounds behind the
icons.  Also the character icon should have the up arrow instead of the 4
point star."

Then, of the first cut's weapon icons on the phone, a second sheet
(assets/icons-source/sheet-points-weapons.png): "Actually swap out just the
icons for these slightly thicker ones I think these will look better at that
tiny scale for sword, staff, and bow".  The weapons are cut from that sheet;
everything else is still the first sheet's.

Both sheets are on a transparent ground (the background remover's: solid art
at alpha ~250, ~253 on the weapons' sheet, a faint glow round every piece
under 40).  What is cut, each piece by its OWN outline -- the pixels of the
parts that make it, never a box, as the first sheet's word labels sit 0-4 px
under its icons:

  sword, staff, bow   the three weapon icons, thick-outlined, one piece each
                      (the weapons' sheet: no labels on it)
  character           the gold bust with the up arrow (CHARACTER (UNIVERSAL))
  frame-weapons       the WEAPON ALLOCATION PANEL BRACKET (top, 3 rows)
  frame-character     the CHARACTER ALLOCATION PANEL BRACKET (bottom, 1 row)
  grey-0 .. grey-9    the numerals for a pool with nothing to spend
  gold-0 .. gold-9    the numerals for a pool with points waiting ("NUMBER
                      COLOR RULES: 0 = Gray (no points), 3 = Light Yellow/
                      Green (points available)")

Not cut: the first sheet's own sword, staff and bow (the thinner ones the
second sheet replaced), its two panels put together on the right (the game
puts them together itself), its labels and the colour rules' box.

SIZES, at the size each is DRAWN (a browser keeps a shown picture decoded at
its own size): the icons 96 px on their longer side (drawn 11-30 CSS px, 3x
on an iPhone), the numerals 64 px tall (drawn 8-21 CSS px), every numeral of a
row cut to the row's own top and foot, so a "63" stands on one line.  The
frames at FRAME_K of the sheet: they are drawn as a CSS border-image, nine
slices, the corners whole and the sides stretched, so one frame fits any cell;
`slice` is how far in from each edge the corner's curve ends (its outer
radius, measured here, and a margin), and the code reads it from the
GENERATED src/data/pointsHeadArt.js this tool writes beside the pictures.

Run:  python3 tools/ui/cut-points-heads.py
"""
import json
import os
import sys
from PIL import Image

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(REPO, 'assets/icons-source/sheet-points-heads.png')
WEAPONS_SRC = os.path.join(REPO, 'assets/icons-source/sheet-points-weapons.png')
OUT = os.path.join(REPO, 'public/icons/ui/points')
DATA = os.path.join(REPO, 'src/data/pointsHeadArt.js')
VERSION = '2.3.3559'

ALPHA_MIN = 40      # the faint glow round every piece is under this
OPAQUE = 250        # the background remover's solid
WEAPONS_OPAQUE = 253  # ...and on the weapons' sheet
ICON_PX = 96
DIGIT_H = 64
FRAME_K = 0.4

# Where each piece is on the first sheet (x0, y0, x1, y1), with room round
# it, and the row its word label starts at: a part whose top is at or below
# `label` is the label's, never the icon's.  (The first sheet's sword, staff
# and bow were at (640, 4, 850, 210), (648, 204, 856, 414) and (648, 414, 872,
# 606), labels at 178, 384 and 583: the thinner weapons the owner swapped.)
ICONS = {
    'character': ((676, 608, 856, 806), 778),
}
# The weapons' sheet (2172 x 724) in thirds, split in the gaps between them:
# each third holds one piece.
WEAPONS = {
    'sword': (0, 0, 731, 724),
    'staff': (731, 0, 1449, 724),
    'bow':   (1449, 0, 2172, 724),
}
FRAMES = {
    'frame-weapons':   (70, 26, 530, 488),
    'frame-character': (66, 550, 536, 798),
}
DIGIT_ROWS = {
    'grey': (380, 842, 1152, 932),
    'gold': (380, 930, 1152, 1016),
}


def parts(alpha, box):
    """The 8-connected parts of alpha >= ALPHA_MIN inside box, each as
    (x0, y0, x1, y1, pixels) in sheet px; pixels a set of (x, y)."""
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    on = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            if alpha[x0 + x, y0 + y] >= ALPHA_MIN:
                on[y * w + x] = 1
    seen = bytearray(w * h)
    out = []
    for i in range(w * h):
        if not on[i] or seen[i]:
            continue
        seen[i] = 1
        stack, px = [i], []
        while stack:
            k = stack.pop()
            x, y = k % w, k // w
            px.append((x0 + x, y0 + y))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        kk = ny * w + nx
                        if on[kk] and not seen[kk]:
                            seen[kk] = 1
                            stack.append(kk)
        xs = [p[0] for p in px]
        ys = [p[1] for p in px]
        out.append((min(xs), min(ys), max(xs) + 1, max(ys) + 1, px))
    return out


def lift(sheet, pieces, box=None, opaque=OPAQUE):
    """The pieces' own pixels on a transparent ground, cropped to `box` (or to
    the pieces), the alpha lifted from `opaque` to solid."""
    if box is None:
        box = (min(p[0] for p in pieces), min(p[1] for p in pieces),
               max(p[2] for p in pieces), max(p[3] for p in pieces))
    x0, y0, x1, y1 = box
    out = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 0))
    src = sheet.load()
    dst = out.load()
    for p in pieces:
        for (x, y) in p[4]:
            r, g, b, a = src[x, y]
            dst[x - x0, y - y0] = (r, g, b, min(255, round(a * 255 / opaque)))
    return out


def scaled(img, w, h):
    """Resized with its colour weighted by its alpha (premultiplied), so the
    see-through px round the edge never bleed their colour in."""
    return img.convert('RGBa').resize((max(1, w), max(1, h)), Image.LANCZOS).convert('RGBA')


def squared(art):
    """An icon ICON_PX square: the art ICON_PX on its longer side, centred."""
    w, h = art.size
    s = ICON_PX / max(w, h)
    art = scaled(art, round(w * s), round(h * s))
    out = Image.new('RGBA', (ICON_PX, ICON_PX), (0, 0, 0, 0))
    out.alpha_composite(art, ((ICON_PX - art.size[0]) // 2, (ICON_PX - art.size[1]) // 2))
    return out


def save(img, name):
    path = os.path.join(OUT, name + '.png')
    img.save(path, optimize=True)
    return os.path.relpath(path, REPO)


def big_parts(found, min_px):
    return [p for p in found if len(p[4]) >= min_px]


def main():
    sheet = Image.open(SRC).convert('RGBA')
    if sheet.size != (1536, 1024):
        sys.exit(f'unexpected sheet size {sheet.size}: the boxes here are for the 1536 x 1024 sheet')
    alpha = sheet.getchannel('A').load()
    os.makedirs(OUT, exist_ok=True)
    meta = {'v': VERSION, 'icons': {}, 'frames': {}, 'digits': {}}
    written = []

    weapons = Image.open(WEAPONS_SRC).convert('RGBA')
    if weapons.size != (2172, 724):
        sys.exit(f'unexpected weapons sheet size {weapons.size}: the thirds here are for the 2172 x 724 sheet')
    walpha = weapons.getchannel('A').load()
    for name, box in WEAPONS.items():
        found = big_parts(parts(walpha, box), 12)
        if len(found) != 1:
            sys.exit(f'{name}: expected one piece in its third of the weapons sheet, found {len(found)}')
        art = lift(weapons, found, opaque=WEAPONS_OPAQUE)
        written.append(save(squared(art), name))
        meta['icons'][name] = {'parts': 1, 'src': list(art.size), 'sheet': 'weapons'}

    for name, (box, label) in ICONS.items():
        found = big_parts(parts(alpha, box), 12)
        mine = [p for p in found if p[1] < label]
        theirs = [p for p in found if p[1] >= label]
        if not mine or not theirs:
            sys.exit(f'{name}: expected the icon above its label ({len(mine)} parts / {len(theirs)} label parts)')
        art = lift(sheet, mine)
        written.append(save(squared(art), name))
        meta['icons'][name] = {'parts': len(mine), 'src': list(art.size)}

    for name, box in FRAMES.items():
        found = big_parts(parts(alpha, box), 400)
        if len(found) != 1:
            sys.exit(f'{name}: expected one frame, found {len(found)}')
        art = lift(sheet, found)
        w, h = art.size
        a = art.getchannel('A').load()
        # The corner: walking in from the top-left corner along the diagonal,
        # the first solid px is the outer curve, 0.293 of its radius in.
        d = next(i for i in range(min(w, h)) if a[i, i] >= 128)
        radius = d / (1 - 0.5 ** 0.5)
        # The stroke: across the middle of the left side, solid px in a row.
        mid = h // 2
        xs = [x for x in range(w // 2) if a[x, mid] >= 128]
        stroke = xs[-1] - xs[0] + 1 if xs else 0
        fw, fh = round(w * FRAME_K), round(h * FRAME_K)
        art = scaled(art, fw, fh)
        # The slice takes the whole corner and a little more, never less than
        # the stroke and never half the frame.
        sl = min(min(fw, fh) // 2 - 1, round(max(radius, stroke) * 1.15 * FRAME_K))
        written.append(save(art, name))
        meta['frames'][name] = {'w': fw, 'h': fh, 'slice': sl,
                                'stroke': round(stroke * FRAME_K, 2), 'radius': round(radius * FRAME_K, 2)}

    for tone, box in DIGIT_ROWS.items():
        found = sorted(big_parts(parts(alpha, box), 300), key=lambda p: p[0])
        if len(found) != 10:
            sys.exit(f'{tone}: expected ten numerals, found {len(found)}')
        top = min(p[1] for p in found)
        foot = max(p[3] for p in found)
        widths = []
        for n, p in enumerate(found):
            art = lift(sheet, [p], (p[0], top, p[2], foot))
            w, h = art.size
            dw = round(w * DIGIT_H / h)
            written.append(save(scaled(art, dw, DIGIT_H), f'{tone}-{n}'))
            widths.append(dw)
        meta['digits'][tone] = widths

    # The game's copy: what the code needs to draw them (sizes, slices) --
    # GENERATED, so a re-cut can never leave the code drawing the old numbers.
    frames = meta['frames']
    body = [
        '/* GENERATED by tools/ui/cut-points-heads.py -- do not edit.',
        ' * v2.3.3559: the owner\'s Points-tab art (assets/icons-source/sheet-points-heads.png,',
        ' * the thicker sword, staff and bow from sheet-points-weapons.png): the weapons\'',
        ' * and the character\'s icons, the two gold frames, and the numerals, grey for',
        ' * a pool with nothing to spend, gold with points waiting. */',
        f"export const POINTS_ART_V = '{VERSION}';",
        "export const POINTS_ART_DIR = '/icons/ui/points/';",
        f'export const POINTS_ICON_PX = {ICON_PX};',
        f'export const POINTS_DIGIT_H = {DIGIT_H};',
        '/* each numeral\'s width at POINTS_DIGIT_H, 0-9 */',
        f"export const POINTS_DIGIT_W = Object.freeze({{ grey: Object.freeze({json.dumps(meta['digits']['grey'])}), gold: Object.freeze({json.dumps(meta['digits']['gold'])}) }});",
        '/* each frame\'s size, the border-image slice (px in from each edge: the',
        ' * whole corner), and its stroke and outer radius in the same px */',
        'export const POINTS_FRAMES = Object.freeze({',
    ]
    for name, f in frames.items():
        key = 'weapons' if name == 'frame-weapons' else 'character'
        body.append(f"  {key}: Object.freeze({{ file: '{name}.png', w: {f['w']}, h: {f['h']}, slice: {f['slice']}, stroke: {f['stroke']}, radius: {f['radius']} }}),")
    body.append('});')
    with open(DATA, 'w') as fh:
        fh.write('\n'.join(body) + '\n')
    written.append(os.path.relpath(DATA, REPO))

    for p in written:
        print('wrote', p)
    print(json.dumps(meta, indent=1))


if __name__ == '__main__':
    main()
