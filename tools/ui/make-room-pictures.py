#!/usr/bin/env python3
"""v2.3.3108: the building interiors' pictures, from the owner's ChatGPT PNGs.

  python3 tools/ui/make-room-pictures.py <folder of <plot id>.png> [plot id ...]

Each 1536 x 1024 picture of the inside of one building (docs/ART-WISHLIST.md,
"Inside the buildings") becomes public/world/interiors/<plot id>.webp: 1152 x
768, lossy WebP at quality 90 (~300 KB; q90 at 2x zoom is indistinguishable from
the lossless resize, 1.3 MB).  1152 is the size a 360 CSS px window wants on a 3x
phone (1080 device px), and it is 3.5 MB decoded where the raw 1536 is 6.3 MB --
the memory rule (CLAUDE.md, "Memory is budgeted") holds one room at a time.

The plot id is plan.js's (public/tools/world/plan.js town.lots): blacksmith,
store, bank, cookhouse, saloon, woodworker, gemcutter, gambling, feedseed,
landoffice, post, sheriff, hotel, auction, guildhall, townhall.  (v2.3.3144: the
Assay Office is gone; the Gem Works' two tabs share gemcutter's.)  Which window
shows which picture is src/data/buildingRooms.js; replacing a picture means
re-running this and bumping ROOMS_V there (the files are cached for a year,
public/_headers).

Needs Pillow (pip install pillow).  The raw PNGs are not kept in the repo.
"""
import os
import sys

from PIL import Image

W, H, QUALITY = 1152, 768, 90
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'world', 'interiors')


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    src = argv[0]
    only = set(argv[1:])
    os.makedirs(OUT, exist_ok=True)
    done = 0
    for name in sorted(os.listdir(src)):
        stem, ext = os.path.splitext(name)
        if ext.lower() != '.png' or (only and stem not in only):
            continue
        im = Image.open(os.path.join(src, name)).convert('RGB')
        if im.size != (1536, 1024):
            print('  %s is %dx%d, not 1536x1024 -- resized anyway' % (name, im.size[0], im.size[1]))
        im = im.resize((W, H), Image.LANCZOS)
        dest = os.path.join(OUT, stem + '.webp')
        im.save(dest, 'WEBP', quality=QUALITY, method=6)
        print('%-12s %4d KB' % (stem, os.path.getsize(dest) // 1024))
        done += 1
    print('%d pictures in %s' % (done, os.path.normpath(OUT)))
    return 0 if done else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
