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
# the toolbar starts at ~y=460.  The icon-glyph band ends BEFORE the
# baked-in text captions ("Bag", "Stats", …) begin around y=618.
TOOLBAR_TOP    = 460
TOOLBAR_BOTTOM = 615

ICON_NAMES = ['bag', 'stats', 'skills', 'codex', 'journey', 'map', 'more']

# Bar bands — measured by inspect_mockup.py via colour-segmentation.
# Each (top, bottom) tightly brackets the colored capsule.
BAR_LEFT  = 30
BAR_RIGHT_MARGIN = 30
BARS = [
    ('bar-hp',   88,  148),
    ('bar-mp',   195, 244),
    ('bar-stam', 287, 342),
    ('bar-xp',   380, 435),
]

# After cropping each bar, this Pillow pass erases the baked-in text
# (white "100 HP" / "100 MP" / etc. near the right end of the capsule)
# by replacing each pixel that's significantly brighter than the
# capsule's own gloss highlight (sampled from a clean column at the
# same y) with that clean-column colour.  The bar's gradient is mostly
# vertical so a horizontal copy preserves highlight + shadow.
TEXT_CLEAN_X     = 500             # source-px column known to be text-free
TEXT_BRIGHT_DIFF = 22              # avg-brightness delta above clean → text

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

def erase_baked_text(crop):
    """Replace any pixel that's significantly brighter than the
    capsule's natural gloss (sampled from a clean column at same y)
    with that clean-column colour.  Catches anti-aliased text edges."""
    w, h = crop.size
    px = crop.load()
    clean_x = TEXT_CLEAN_X - BAR_LEFT
    if clean_x < 0 or clean_x >= w: return
    for y in range(h):
        ref = px[clean_x, y]
        ref_lum = (ref[0] + ref[1] + ref[2]) / 3
        for x in range(w):
            if x == clean_x: continue
            cur = px[x, y]
            cur_lum = (cur[0] + cur[1] + cur[2]) / 3
            if cur_lum > ref_lum + TEXT_BRIGHT_DIFF:
                if len(cur) == 4:
                    px[x, y] = (ref[0], ref[1], ref[2], cur[3])
                else:
                    px[x, y] = (ref[0], ref[1], ref[2])

def slice_bars(img, out_dir):
    w, _ = img.size
    right_x = w - BAR_RIGHT_MARGIN
    for name, top, bottom in BARS:
        crop = img.crop((BAR_LEFT, top, right_x, bottom))
        erase_baked_text(crop)
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
