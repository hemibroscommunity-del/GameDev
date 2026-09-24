#!/usr/bin/env python3
"""v2.3.2822: the metal-bar bag icons, one per metal, from ONE grey bar.

Owner, 2026-09-24: "Add this for the metal bar (that you can recolor for
different metal tiers).  You can recolor this one to copper."

The source (assets/items/metal-bar.png) is a painted silver-grey ingot.  Each
metal is a GRADIENT MAP of that painting: every pixel's brightness is looked up
on the metal's own ramp (shadow -> mid -> light), so the painter's shading,
chips and highlights survive exactly and only the hue changes.  The dark
outline stays dark because it sits at the bottom of every ramp.

    python3 tools/make_bar_icons.py

writes public/icons/items/bar-<metal>.webp at 256x256 (the size of every other
item icon, e.g. ore-copper.webp).  A new metal is one line in METALS.
"""
from PIL import Image

SRC = 'assets/items/metal-bar.png'
OUT = 'public/icons/items/bar-{}.webp'
SIZE = 256
PAD = 0.06  # breathing room around the ingot, as a fraction of the icon

# Ramp stops: (brightness 0..1, (r, g, b)).  Brightness is the source's own
# luminance, so 0 is the outline and 1 is the specular glint.
METALS = {
    'copper': [
        (0.00, (38, 16, 8)),
        (0.30, (110, 48, 22)),
        (0.55, (178, 92, 48)),
        (0.78, (226, 146, 92)),
        (1.00, (255, 226, 190)),
    ],
}


def ramp(stops, t):
    t = max(0.0, min(1.0, t))
    for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
        if t <= t1:
            k = 0.0 if t1 == t0 else (t - t0) / (t1 - t0)
            return tuple(round(a + (b - a) * k) for a, b in zip(c0, c1))
    return stops[-1][1]


def main():
    src = Image.open(SRC).convert('RGBA')
    src = src.crop(src.getbbox())
    # Normalise brightness to the painting's own range so every ramp is used
    # end to end whatever the source's exposure.
    px = list(src.getdata())
    lums = [(0.299 * r + 0.587 * g + 0.114 * b) for r, g, b, a in px if a > 32]
    lo, hi = min(lums), max(lums)
    for name, stops in METALS.items():
        out = [(*ramp(stops, ((0.299 * r + 0.587 * g + 0.114 * b) - lo) / (hi - lo)), a) for r, g, b, a in px]
        im = Image.new('RGBA', src.size)
        im.putdata(out)
        side = round(max(im.size) / (1 - 2 * PAD))
        canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        canvas.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
        canvas = canvas.resize((SIZE, SIZE), Image.LANCZOS)
        canvas.save(OUT.format(name), 'WEBP', quality=90, method=6)
        print('wrote', OUT.format(name))


if __name__ == '__main__':
    main()
