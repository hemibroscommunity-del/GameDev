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
    ('bar-mp',   180, 244),
    ('bar-stam', 287, 342),
    ('bar-xp',   378, 435),
]

# Text-erasure pass left over from the previous (text-bearing) mockup.
# The user's new clean mockup has no baked numbers, so erasing is a
# no-op now — but we leave the constants in place at very-permissive
# values so a future re-baked image still gets cleaned.
TEXT_ERASE_ENABLED = False
TEXT_CLEAN_X       = 500
TEXT_BRIGHT_DIFF   = 22

# The XP bar in the source mockup is shown almost fully depleted (just
# a small green sliver on the left).  To get a usable FULL green
# capsule for the dashboard, we take the HP bar's shape + gloss and
# hue-shift it from red to green.  See build_xp_from_hp().

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

def build_xp_from_hp(hp_crop):
    """Hue-shift the HP capsule from red → green to synthesize a fully
    filled XP bar.  We rotate hue by ~140° (red 0° → emerald green 140°)
    and pull saturation down a touch so the result reads as 'XP green'
    rather than 'fluorescent toxic'."""
    from colorsys import rgb_to_hsv, hsv_to_rgb
    out = hp_crop.copy()
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            cur = px[x, y]
            r, g, b = (c / 255 for c in cur[:3])
            hh, ss, vv = rgb_to_hsv(r, g, b)
            # Only shift saturated red pixels — leave nearly-grey
            # pixels (background navy, gloss specular) alone.
            if ss > 0.15 and (hh < 0.08 or hh > 0.92):
                hh = 0.39          # ~140° emerald green
                ss = max(0.55, ss * 0.95)
            nr, ng, nb = hsv_to_rgb(hh, ss, vv)
            new = (int(nr * 255), int(ng * 255), int(nb * 255))
            if len(cur) == 4:
                px[x, y] = (*new, cur[3])
            else:
                px[x, y] = new
    return out

def slice_bars(img, out_dir):
    w, _ = img.size
    right_x = w - BAR_RIGHT_MARGIN
    hp_crop = None
    for name, top, bottom in BARS:
        if name == 'bar-xp' and hp_crop is not None:
            crop = build_xp_from_hp(hp_crop)
        else:
            crop = img.crop((BAR_LEFT, top, right_x, bottom))
            if TEXT_ERASE_ENABLED:
                erase_baked_text(crop)
            if name == 'bar-hp':
                hp_crop = crop
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
