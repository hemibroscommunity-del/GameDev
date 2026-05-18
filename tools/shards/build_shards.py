"""Generate placeholder elemental-shard icons -- one per zone.

Each shard is a 128 x 128 hexagonal gem with the zone's accent color,
a darker outline for legibility against the loot-pile background,
and a lighter inner facet + corner spec dot for a crystalline look.
The colors are kept in lock-step with src/data/shards.js so the
canvas-rendered icon (inventory) and the texture-rendered icon (ground
overlay) read as the same shard.

Run: python tools/shards/build_shards.py
Output: public/icons/shards/shard_<zone>.png x 8

These are placeholders -- swap in art-team PNGs when ready, just
match the file names.
"""
import math
import os
from PIL import Image, ImageDraw

SIZE = 128
OUT_DIR = "public/icons/shards"

# Keep in sync with ZONE_SHARDS in src/data/shards.js.
SHARDS = [
    ("shard_meadow",  "#5a9a40"),
    ("shard_ember",   "#ff6633"),
    ("shard_mist",    "#6abb40"),
    ("shard_frost",   "#88ccff"),
    ("shard_thunder", "#9966ff"),
    ("shard_hollows", "#b09a82"),
    ("shard_sky",     "#cce6ff"),
    ("shard_tidal",   "#3a8acc"),
]


def hex_to_rgb(s):
    s = s.lstrip("#")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def lighten(rgb, f):
    return tuple(min(255, int(c + (255 - c) * f)) for c in rgb)


def darken(rgb, f):
    return tuple(max(0, int(c * (1 - f))) for c in rgb)


def hex_points(cx, cy, r):
    """Six-pointed hex with a point at the top."""
    pts = []
    for i in range(6):
        ang = math.pi / 2 + i * math.pi / 3
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    return pts


def build_one(key, hex_color):
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    color = hex_to_rgb(hex_color)
    cx, cy = SIZE / 2, SIZE / 2
    r_outer = SIZE * 0.42
    r_inner = SIZE * 0.22

    outline = darken(color, 0.55) + (255,)
    fill = color + (255,)
    highlight = lighten(color, 0.55) + (255,)
    spec = lighten(color, 0.85) + (255,)

    # Outer (acts as the outline since the inner hex is drawn smaller).
    d.polygon(hex_points(cx, cy, r_outer + 3), fill=outline)
    # Main facet.
    d.polygon(hex_points(cx, cy, r_outer), fill=fill)
    # Upper-left inner facet -- gives the gem a sense of light direction.
    d.polygon(hex_points(cx - 7, cy - 7, r_inner), fill=highlight)
    # Sharp spec dot.
    d.ellipse((cx - 18, cy - 24, cx - 6, cy - 12), fill=spec)
    img.save(os.path.join(OUT_DIR, key + ".png"))


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for key, color in SHARDS:
        build_one(key, color)
    print("Generated", len(SHARDS), "shard icons in", OUT_DIR)


if __name__ == "__main__":
    main()
