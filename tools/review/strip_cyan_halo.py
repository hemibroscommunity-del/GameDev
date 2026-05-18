"""One-off: strip the cyan halo from frame 3 of hit-sw.png.

The frame ships with a magic-cast orb that's surrounded by a cyan
glow ring -- it reads as bright white in-game and doesn't match the
recoil pose the other hit frames use.  This script masks out the
teal/cyan-dominant pixels in just that one frame (columns 512..767)
and writes the result back to the same file.  Bright yellow / orange
/ red pixels (the orb core and the goblin) are kept intact.

Run with: python tools/review/strip_cyan_halo.py
"""
from PIL import Image

SRC = "public/sprites/monsters/fire-goblin/hit-sw.png"
FRAME_W = 256
TARGET_FRAME = 2  # zero-indexed -> the third frame

img = Image.open(SRC).convert("RGBA")
px = img.load()

x0 = TARGET_FRAME * FRAME_W
x1 = x0 + FRAME_W
h = img.height

cleared = 0
for y in range(h):
    for x in range(x0, x1):
        r, g, b, a = px[x, y]
        if a == 0:
            continue
        # Teal/cyan = blue & green high, red low.  Threshold caught
        # the halo without nibbling the yellow orb core or the
        # orange goblin (verified against the standalone crop).
        if b > r + 35 and g > r + 25 and b > 110:
            px[x, y] = (r, g, b, 0)
            cleared += 1

img.save(SRC)
print(f"cleared {cleared} cyan pixels in frame {TARGET_FRAME + 1}")
