"""
Slice the dashboard mockup screenshot into individual UI assets:
- 7 toolbar icons (bag/stats/skills/codex/journey/map/more)
- 4 stat bars (bar-hp/bar-mp/bar-stam/bar-xp)

Run after dropping a new mockup at public/icons/ui/dashboard-mockup.png.
Outputs land in the same directory.

Tuning constants below were measured against the user's 1504x688
mockup.  If the source image's dimensions change significantly, eyeball
the band coordinates and re-run.
"""

from pathlib import Path
from PIL import Image

SRC = Path('public/icons/ui/dashboard-mockup.png')

# Toolbar strip vertical bounds in source pixels.  Source is 1504x688;
# the toolbar starts roughly halfway down the lower third and the icon
# glyphs (not the captions) end about 80% of the way down.
TOOLBAR_TOP    = 460
TOOLBAR_BOTTOM = 660

ICON_NAMES = ['bag', 'stats', 'skills', 'codex', 'journey', 'map', 'more']

# Bar bands.  Each (top, bottom) is the y-range of one bar in source px.
# The bars in the mockup span almost the full width — we trim the gutter
# so the image is just the rounded bar capsule with no surrounding navy.
BAR_LEFT  = 30
BAR_RIGHT_MARGIN = 30   # subtracted from source width for the right edge
BARS = [
    ('bar-hp',   60,  120),
    ('bar-mp',   165, 225),
    ('bar-stam', 265, 325),
    ('bar-xp',   365, 425),
]

def slice_icons(img, out_dir):
    w, _ = img.size
    col_w = w / len(ICON_NAMES)
    for i, name in enumerate(ICON_NAMES):
        left  = int(round(i * col_w))
        right = int(round((i + 1) * col_w))
        crop = img.crop((left, TOOLBAR_TOP, right, TOOLBAR_BOTTOM))
        side = max(crop.size)
        sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        sq.paste(crop, ((side - crop.width) // 2, (side - crop.height) // 2))
        sq = sq.resize((256, 256), Image.LANCZOS)
        out = out_dir / f'{name}.png'
        sq.save(out, 'PNG', optimize=True)
        print(f'  {name:8s} -> {out.name}')

def slice_bars(img, out_dir):
    w, _ = img.size
    right_x = w - BAR_RIGHT_MARGIN
    for name, top, bottom in BARS:
        crop = img.crop((BAR_LEFT, top, right_x, bottom))
        out = out_dir / f'{name}.png'
        crop.save(out, 'PNG', optimize=True)
        print(f'  {name:8s} -> {out.name}  ({crop.width}x{crop.height})')

def main():
    if not SRC.exists():
        raise SystemExit(f'No source image at {SRC}.  Save the mockup first.')
    img = Image.open(SRC).convert('RGBA')
    w, h = img.size
    print(f'Source: {w}x{h}')
    slice_icons(img, SRC.parent)
    slice_bars(img, SRC.parent)

if __name__ == '__main__':
    main()
