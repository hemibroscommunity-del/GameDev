#!/usr/bin/env python3
"""The golden ticket's bag icon, from the owner's artwork.

Owner, sending the art: "Is this the icon for it? That's what I wanted."

v2.3.2103 gave the ticket an EMOJI glyph because no art file existed -- the
honest placeholder, and better than borrowing a coin's picture, but a
placeholder. This is the real thing.

THE SOURCE IS GOLD ON BLACK, 1254x1254 RGB, with a soft glow and sparkles
around the ticket. Every other bag icon is 256x256 RGBA on transparency
(public/icons/items/), so the black has to become alpha or the ticket ships as
a black tile in a bag that has none.

KEYED ON LUMINANCE, WITH A RAMP, and both halves matter:

  - a hard threshold leaves a black fringe on every antialiased edge of a
    shape this ornate -- the filigree is one pixel wide in places -- so alpha
    ramps across a band rather than switching at a line.
  - the ramp's floor is well above pure black so the glow and the sparkle
    field go fully transparent instead of surviving as a grey haze in the
    tile. The ticket's own dark inner lines sit far above it and are kept.

CROPPED TO THE INK FIRST, then padded square, so the ticket fills the tile
rather than floating in the source's generous margin -- the same reason
tools/dev/npc-sizes.py crops before it measures.

    python3 tools/import_ticket_icon.py <source.png>
"""
from PIL import Image
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'icons', 'items', 'golden-ticket.webp')
SIZE = 256

# Below LO the pixel is background; above HI it is fully the ticket. Between,
# alpha ramps. Read off the source: the glow peaks around 40 and the ticket's
# darkest kept ink sits near 90.
LO, HI = 34, 96


def main(src):
    im = Image.open(src).convert('RGB')
    px = im.load()
    w, h = im.size
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            if lum <= LO:
                continue
            a = 255 if lum >= HI else int(round(255 * (lum - LO) / (HI - LO)))
            op[x, y] = (r, g, b, a)

    bb = out.getbbox()
    if not bb:
        raise SystemExit('FAIL: the key removed everything -- check LO/HI')
    cropped = out.crop(bb)
    side = max(cropped.size)
    square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    square.paste(cropped, ((side - cropped.width) // 2, (side - cropped.height) // 2))
    icon = square.resize((SIZE, SIZE), Image.LANCZOS)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    icon.save(OUT, 'WEBP', quality=92, method=6)

    opaque = sum(1 for p in icon.getdata() if p[3] > 200)
    clear = sum(1 for p in icon.getdata() if p[3] < 16)
    print('wrote', OUT, icon.size)
    print('  source        %dx%d, cropped to ink %dx%d' % (w, h, cropped.width, cropped.height))
    print('  fully opaque  %d px (%.0f%% of the tile)' % (opaque, 100 * opaque / (SIZE * SIZE)))
    print('  transparent   %d px (%.0f%%)' % (clear, 100 * clear / (SIZE * SIZE)))
    if clear < SIZE * SIZE * 0.15:
        print('  WARN: very little transparency -- the black may not have keyed out')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else None)
