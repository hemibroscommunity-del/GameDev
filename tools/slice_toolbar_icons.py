"""
Slice the dashboard mockup screenshot into seven separate toolbar-icon
PNGs. Run once after dropping a new mockup file at
public/icons/ui/dashboard-mockup.png — outputs bag.png / stats.png /
skills.png / codex.png / journey.png / map.png / more.png in the same
directory.

Tuning constants below were measured against the user's 1504x688
mockup. If the source image's dimensions change significantly, eyeball
TOOLBAR_TOP / TOOLBAR_BOTTOM and re-run.
"""

import os
from pathlib import Path
from PIL import Image

SRC = Path('public/icons/ui/dashboard-mockup.png')

# Toolbar strip vertical bounds in source pixels.  Source is 1504x688;
# the toolbar starts roughly halfway down the lower third and the icon
# glyphs (not the captions) end about 80% of the way down.
TOOLBAR_TOP    = 460   # top of the icon glyph band
TOOLBAR_BOTTOM = 660   # just above the text caption row (688 - ~28)

NAMES = ['bag', 'stats', 'skills', 'codex', 'journey', 'map', 'more']

def main():
    if not SRC.exists():
        raise SystemExit(f'No source image at {SRC}.  Save the mockup first.')
    img = Image.open(SRC).convert('RGBA')
    w, h = img.size
    print(f'Source: {w}x{h}')

    col_w = w / len(NAMES)
    out_dir = SRC.parent
    for i, name in enumerate(NAMES):
        left  = int(round(i * col_w))
        right = int(round((i + 1) * col_w))
        crop = img.crop((left, TOOLBAR_TOP, right, TOOLBAR_BOTTOM))
        # Square it up to a 256-px tile so each icon has uniform footprint
        # at the dashboard's display size.  Pad with transparency rather
        # than warp.
        side = max(crop.size)
        sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        sq.paste(crop, ((side - crop.width) // 2, (side - crop.height) // 2))
        sq = sq.resize((256, 256), Image.LANCZOS)
        out = out_dir / f'{name}.png'
        sq.save(out, 'PNG', optimize=True)
        print(f'  {name:8s} -> {out.name}')

if __name__ == '__main__':
    main()
