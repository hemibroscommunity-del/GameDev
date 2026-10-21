#!/usr/bin/env python3
"""v2.3.3539: the Well Rested buff badge -- the owner's bed, made small.

Well Rested (a rest at the Hotel or on your farm's bed, server/src/rest.js)
is a chip with the other timed effects at the top left of the HUD
(BroTown.jsx, `data-buff-chip="Rested"`), and every chip there is one of the
owner's pictures at the small marks' 64 x 64 (src/data/smallIcons.js
BUFF_ICON; server/test/small-icons.test.mjs holds the size).  There is no
buff sheet picture for it, so it is the picture the game already shows for
sleeping: the right stick's sleep picture, the owner's bed
(public/ui/controls/sleep.webp, 160 x 160, cut by tools/ui/cut-owner-icons.py),
made 64 x 64 as cut-owner-icons.py resizes -- Lanczos on premultiplied
colour, so a see-through pixel's colour never bleeds into the edge -- and
saved as cut-small-icons.py saves (WebP, quality 92, method 6).

    python3 tools/ui/make-rested-badge.py          # writes public/icons/ui/buff-rested.webp
    python3 tools/ui/make-rested-badge.py --check  # says whether the file is what it would write

Re-run it after the sleep picture changes (and bump smallIcons.js's V).
"""
import io
import os
import sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'public', 'ui', 'controls', 'sleep.webp')
OUT = os.path.join(ROOT, 'public', 'icons', 'ui', 'buff-rested.webp')
SIZE, QUALITY = 64, 92


def badge():
    im = Image.open(SRC).convert('RGBA')
    if im.size != (160, 160):
        raise SystemExit(f'ABORT: {SRC} is {im.size}, not the 160 x 160 the stick draws')
    small = im.convert('RGBa').resize((SIZE, SIZE), Image.LANCZOS).convert('RGBA')
    buf = io.BytesIO()
    small.save(buf, 'WEBP', quality=QUALITY, method=6)
    return buf.getvalue()


def main():
    data = badge()
    if '--check' in sys.argv:
        same = os.path.exists(OUT) and open(OUT, 'rb').read() == data
        print('buff-rested.webp is current' if same else 'buff-rested.webp differs from the sleep picture made small: re-run')
        return 0 if same else 1
    with open(OUT, 'wb') as f:
        f.write(data)
    print(f'wrote {os.path.relpath(OUT, ROOT)}  {len(data) / 1024:.1f} KB')
    return 0


if __name__ == '__main__':
    sys.exit(main())
