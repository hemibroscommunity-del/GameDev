#!/usr/bin/env python3
"""v2.3.2290: slice the owner's trade-window UI kit.

Input:  assets/icons-source/sheet-trade-ui.png  (1448x1086 RGBA, one kit on
        transparent: ornate panel frames, lane wells, row slots, the gold
        denomination chips in lit AND dimmed states, buttons, steppers,
        item plates, ornaments)
Output: public/icons/ui/trade/<name>.webp

WHY COMPONENT LABELLING AND NOT A GRID: the kit is a hand-laid board, not a
sprite sheet -- pieces are different sizes, unevenly spaced, and several rows
mix widths (the chip ladder is 4 + 3, the row slots are one column beside a
three-column button block).  Any grid maths would need re-deriving the moment
the owner sends a v2 board.  A flood fill over alpha finds the pieces wherever
they sit, and the NAMES below are bound to sorted position, which is stable as
long as the board keeps its reading order.

WHY alpha > 80 FOR THE MASK AND alpha < 24 -> 0 FOR THE OUTPUT: the board
carries a soft halo, and around the gold buttons it is a RED halo (visible in
the source at the button edges).  Kept, it would fringe every button with a
pink rim on a dark panel.  The high mask threshold keeps the halo from welding
neighbouring pieces into one component; the low output threshold drops it from
the art.  Anything between the two is kept, so real soft edges survive.
"""
import os
from collections import deque
from PIL import Image
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'icons-source', 'sheet-trade-ui.png')
OUT = os.path.join(ROOT, 'public', 'icons', 'ui', 'trade')
MASK_A, KEEP_A, MIN_PX = 80, 24, 400

# Reading order (top-left to bottom-right, banded by y//40 then x) -> name.
# None = deliberately not shipped; see the note at the bottom of this file.
NAMES = [
    'panel-tall', 'banner-header', 'panel-narrow', 'lane-buyer',
    'btn-close', 'btn-close-danger', 'icon-check', 'icon-warn', 'icon-info',
    'lane-you', 'icon-swap', 'row-slot', 'btn-minus-lg', 'field-num',
    'btn-plus-lg', 'row-slot-gold', 'btn-minus', 'btn-plus', 'btn-x',
    'btn-minus-off', 'btn-plus-off', 'btn-x-off', 'row-slot-active',
    'chip-1', 'chip-5', 'chip-25', 'chip-50', 'row-slot-alt',
    'chip-100', 'chip-500', 'chip-1000', 'btn-primary', 'btn-secondary',
    'chip-1-off', 'chip-5-off', 'chip-25-off', 'chip-50-off',
    'chip-100-off', 'chip-500-off', 'chip-1000-off',
    'slot-item', 'slot-item-alt', 'slot-coins', 'slot-log', 'coin-lg',
    'btn-primary-hot', 'field-gold', 'corner-l', 'corner-r',
    'rule-diamond', 'diamond-sm', 'rule-thin',
    'diamond-gold', 'diamond-blue', 'diamond-silver',
]


def components(alpha):
    mask = alpha > MASK_A
    seen = np.zeros_like(mask, dtype=bool)
    H, W = mask.shape
    out = []
    for y0 in range(H):
        row = mask[y0]
        for x0 in range(W):
            if not row[x0] or seen[y0, x0]:
                continue
            q = deque([(y0, x0)])
            seen[y0, x0] = True
            miny = maxy = y0
            minx = maxx = x0
            n = 0
            while q:
                y, x = q.popleft()
                n += 1
                if y < miny: miny = y
                if y > maxy: maxy = y
                if x < minx: minx = x
                if x > maxx: maxx = x
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
            if n >= MIN_PX:
                out.append((minx, miny, maxx, maxy))
    out.sort(key=lambda b: (b[1] // 40, b[0]))
    return out


def main():
    im = Image.open(SRC).convert('RGBA')
    arr = np.array(im)
    boxes = components(arr[:, :, 3])
    if len(boxes) != len(NAMES):
        raise SystemExit('sheet changed: %d components, %d names' % (len(boxes), len(NAMES)))
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for (x0, y0, x1, y1), name in zip(boxes, NAMES):
        if not name:
            continue
        tile = arr[y0:y1 + 1, x0:x1 + 1].copy()
        a = tile[:, :, 3]
        faint = a < KEEP_A
        tile[faint] = 0                      # drop the halo, colour and all
        out = Image.fromarray(tile, 'RGBA')
        path = os.path.join(OUT, name + '.webp')
        out.save(path, 'WEBP', lossless=True, quality=100, method=6)
        # alpha must survive the encode bit-for-bit (tools/webp_icons.py rule)
        back = np.array(Image.open(path).convert('RGBA'))
        if not np.array_equal(back[:, :, 3], tile[:, :, 3]):
            raise SystemExit('alpha moved on encode: ' + name)
        total += os.path.getsize(path)
        print('%-20s %4dx%-4d  %6d B' % (name, out.width, out.height, os.path.getsize(path)))
    derive(arr, boxes)
    derive_panel()
    print('%d files, %.1f kB total' % (len(NAMES), total / 1024.0))


# ── DERIVED 9-SLICE SOURCES ────────────────────────────────────────────────
# The kit's chips and lanes carry BAKED TEXT ("+1000", "BUYER OFFERS") and the
# row slots carry a baked thumbnail plate.  The panel needs none of those fixed:
# a chip reads "-25" in subtract mode, the lanes are relabelled on the review
# and receipt screens ("YOU RECEIVE" / "You sent"), and a row's thumbnail is
# whatever item is in it.  Stretching the baked art would smear the words.
#
# So each is rebuilt as a NARROW STRETCHABLE FRAME: left cap + a couple of
# columns of clean interior + right cap.  CSS border-image then repeats that
# middle to any width, and the label is real text drawn on top -- which also
# means it stays sharp at any size and can be translated.  The clean columns
# are the ones measured off the art (there is a 163px text-free run in the lane
# and a 2px gap inside each chip's border before the "+").
DERIVED = [
    # (source, out, left_cap, clean_x, right_cap)
    ('chip-1000',      'chip-frame',        16, 16, 17),
    ('chip-1000-off',  'chip-frame-off',    16, 16, 17),
    # clean_x 70 is the gap between the frame edge and the baked coin icon: the
    # only full-height column with NEITHER the header text NOR the hairline rule
    # in it.  Sampling at 300 (to the right of the words) looked clean but caught
    # the rule, and a rule inside the STRETCHED middle slice smears down the lane
    # and parks its end diamond at half height -- which is what the first cut did.
    # The rule is drawn in HTML instead, where it can sit under a header whose
    # words change per screen.
    # rcap 30, not 50: the wider cap swallowed the hairline rule's END DIAMOND,
    # which then floated at half height on the right edge of every lane.
    ('lane-buyer',     'lane-frame',        28, 70, 30),
    ('row-slot',       'row-frame',         14, 150, 15),
    ('row-slot-gold',  'row-frame-gold',    14, 150, 15),
    ('row-slot-active', 'row-frame-active', 14, 150, 15),
]


def derive(arr, boxes):
    by_name = {n: b for n, b in zip(NAMES, boxes) if n}
    for src, out_name, lcap, clean_x, rcap in DERIVED:
        x0, y0, x1, y1 = by_name[src]
        tile = arr[y0:y1 + 1, x0:x1 + 1].copy()
        tile[tile[:, :, 3] < KEEP_A] = 0
        h, w = tile.shape[:2]
        mid = tile[:, clean_x:clean_x + 2]
        strip = np.concatenate([tile[:, :lcap], mid, tile[:, w - rcap:]], axis=1)
        img = Image.fromarray(strip, 'RGBA')
        path = os.path.join(OUT, out_name + '.webp')
        img.save(path, 'WEBP', lossless=True, quality=100, method=6)
        print('%-20s %4dx%-4d  %6d B  (derived from %s)'
              % (out_name, img.width, img.height, os.path.getsize(path), src))




# ── THE DRAWER SHELL ───────────────────────────────────────────────────────
# panel-tall is one painting: an ornate crown (drapes + the handshake medallion)
# over a plain body over a footed base.  A 9-slice cannot centre art, so the
# crown cannot be part of the frame -- stretched, the medallion would smear
# across the whole top edge.  It is lifted out as its own image and placed over
# the drawer's top edge in CSS, which is also what lets it stay centred at any
# width.
# What is left -- body sides plus the footed base -- IS sliceable, so the frame
# is derived from y=100 down.
def derive_panel():
    src = os.path.join(OUT, 'panel-tall.webp')
    a = np.array(Image.open(src).convert('RGBA'))
    H, W = a.shape[:2]

    body = a[100:H].copy()                    # drop the crown
    lcap, rcap, clean_x = 34, 34, W // 2      # the body's midline is plain
    strip = np.concatenate(
        [body[:, :lcap], body[:, clean_x:clean_x + 2], body[:, W - rcap:]], axis=1)
    img = Image.fromarray(strip, 'RGBA')
    img.save(os.path.join(OUT, 'panel-frame.webp'), 'WEBP', lossless=True, method=6)
    print('%-20s %4dx%-4d  (derived from panel-tall, crown removed)'
          % ('panel-frame', img.width, img.height))

    # the medallion: the brightest blob in the crown band, squared off around it
    crown = a[0:104]
    lum = crown[:, :, :3].astype(float).mean(axis=2)
    hot = (crown[:, :, 3] > 128) & (lum > 120)
    mid = W // 2
    cols = np.where(hot[:, mid - 70:mid + 70].any(axis=0))[0]
    rows = np.where(hot[:, mid - 70:mid + 70].any(axis=1))[0]
    x0, x1 = mid - 70 + int(cols.min()), mid - 70 + int(cols.max())
    y0, y1 = int(rows.min()), int(rows.max())
    med = a[y0:y1 + 1, x0:x1 + 1].copy()
    med[med[:, :, 3] < KEEP_A] = 0
    mi = Image.fromarray(med, 'RGBA')
    mi.save(os.path.join(OUT, 'medallion.webp'), 'WEBP', lossless=True, method=6)
    print('%-20s %4dx%-4d  (lifted from the crown)' % ('medallion', mi.width, mi.height))


if __name__ == '__main__':
    main()
