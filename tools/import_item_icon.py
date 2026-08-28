#!/usr/bin/env python3
"""An owner-supplied artwork, turned into a bag icon.

Owner, sending the golden ticket: "Is this the icon for it? That's what I
wanted."  Then, sending the cape: "Use this for the inventory art for cape."
Two arts, one job, so one tool -- v2.3.2104 shipped this as
import_ticket_icon.py and it is renamed rather than copied, because the second
copy is where the two drift.

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

    python3 tools/import_item_icon.py <source.png> <icon-name>
"""
from PIL import Image
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIZE = 256

# Below LO the pixel is background; above HI it is fully the subject. Between,
# alpha ramps. Read off the ticket source: its glow peaks around 40 and its
# darkest kept ink sits near 90.
#
# ONLY USED WHEN THE SOURCE HAS NO ALPHA OF ITS OWN.  The ticket arrived as
# RGB gold on black and had to be keyed; the cape arrived already cut out.
# Keying an image that is already transparent would be worse than useless --
# the cape's own dark red folds and its black outline sit well under HI, so a
# luminance key would eat the shading and leave a hole where the garment is
# darkest.  So the alpha channel, when the artist supplied one, wins.
LO, HI = 34, 96


def main(src, name):
    src_im = Image.open(src)
    if src_im.mode in ('RGBA', 'LA') and src_im.getchannel('A').getextrema()[0] < 250:
        print('source carries its own alpha -- using it, not keying')
        out = src_im.convert('RGBA')
        w, h = out.size
        return finish(out, name, w, h)
    print('source is opaque -- keying the background on luminance')
    im = src_im.convert('RGB')
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

    return finish(out, name, w, h)


def finish(out, name, w, h):
    OUT = os.path.join(ROOT, 'public', 'icons', 'items', name + '.webp')
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
    if len(sys.argv) < 3:
        raise SystemExit('usage: import_item_icon.py <source.png> <icon-name>')
    main(sys.argv[1], sys.argv[2])
