"""Slice the owner's 5-block stamina/mana sheet into two horizontal strips.

v2.3.2298. Source: the owner's supplied sheet -- two rows of six frames, amber
over blue, each frame a rounded rectangle holding five block segments and
counting DOWN (5/5, 4/5, 3/5, 2/5, 1/5, 0/5).

Two decisions worth recording, because both are the kind a later reader would
otherwise have to reverse-engineer from the art:

  1. THE FRAMES ARE REVERSED on the way out, so the strip reads 0..5 and the
     index IS the number of filled blocks. The sheet counts down; a strip that
     kept that order would need `5 - filled` at every call site, which is one
     subtraction away from an off-by-one that shows a full bar at zero stamina.

  2. EVERY FRAME IS PADDED TO ONE CELL. The source frames differ by a pixel or
     two in width (272..274), which is nothing on a sheet and everything in a
     CSS sprite: background-position steps by a fixed cell, so a 2px drift
     accumulates to 10px of misalignment by the last frame. The cell is the max
     width, each frame centred in it.

Run: python3 tools/slice_block_bars.py <source.png>
Writes public/icons/ui/blocks-stam.webp and blocks-mp.webp.
"""
import sys
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else 'sheet.png'
OUT = 'public/icons/ui/'
ROWS = ((273, 370, 'blocks-stam'), (464, 562, 'blocks-mp'))

im = Image.open(SRC).convert('RGBA')
W, H = im.size
px = im.load()


def inked(x, y):
    r, g, b, a = px[x, y]
    return a > 12 and not (r > 240 and g > 240 and b > 240)


for y0, y1, name in ROWS:
    cols, run = [], None
    for x in range(W):
        hit = any(inked(x, y) for y in range(y0, y1 + 1, 2))
        if hit and run is None:
            run = x
        elif not hit and run is not None:
            if x - run >= 20:          # a lone stray pixel is not a frame
                cols.append((run, x - 1))
            run = None
    if run is not None and W - run >= 20:
        cols.append((run, W - 1))
    assert len(cols) == 6, (name, len(cols))

    cw = max(b - a + 1 for a, b in cols)
    ch = y1 - y0 + 1
    strip = Image.new('RGBA', (cw * 6, ch), (0, 0, 0, 0))
    for i, (a, b) in enumerate(reversed(cols)):          # 0 filled .. 5 filled
        cell = im.crop((a, y0, b + 1, y1 + 1))
        strip.paste(cell, (i * cw + (cw - cell.width) // 2, 0), cell)
    strip.save(OUT + name + '.webp', 'WEBP', quality=95, method=6)
    print(name, strip.size, 'cell', cw, 'x', ch)
