#!/usr/bin/env python3
"""v2.3.3124: the mound of dug earth the farmer kneels behind.

    python3 tools/make_farm_mound.py public/sprites/skills/farm-mound.png

The owner (2026-10-06): "you can use the firemaking animation for all of that"
-- dig, plant, water, fertilize and harvest on the farm.  The fire-lighter's
strip (public/sprites/skills/firemaking-strip.webp) paints a log, and on three
frames the fire, in front of the kneeling figure; its first three frames
(standing, kneeling, leaning in) are the farmer's, with THIS drawn over the
log: the game lays it onto its own copy of those frames after it has baked
your skin in (effectsRenderer FARM_MOUND_AT), so its browns are never taken
for skin.  It covers the log's whole box (x 99..277, y 387..461 of a 384x512
cell) and the hands resting on it go into the earth.

Drawn in the figure's own style -- flat tones, a soft ~5 px black outline --
in the owner's dug bed's own browns (public/world/farm/bed-dug.png, its five
commonest).  Deterministic: no randomness, the same picture every run.
docs/specs/farm-walk.md."""
import math, sys
import numpy as np
from PIL import Image, ImageFilter
OUT = sys.argv[1]
W, H = 210, 100          # the mound's own canvas; placed at (86, 366) in a cell
X0, Y0 = 86, 366
yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
# the heap: a wide low dome plus lumps, base flat at y=93
def lump(cx, cy, rx, ry):
    return ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1.0
base = 93
inside = np.zeros((H, W), bool)
# body of the heap: top edge as a function of x
u = xx / W
top = 34 - 22 * np.sin(np.clip((xx - 6) / (W - 12), 0, 1) * math.pi) ** 0.7 \
      + 3.5 * np.sin(xx / 7.3) + 2.5 * np.sin(xx / 3.1 + 1.7)
# rounded ends: the heap narrows toward its top
half = (W / 2 - 8) * np.sqrt(np.clip((yy - 8) / (base - 8), 0, 1)) ** 0.5 + 4
inside |= (yy >= top) & (yy <= base) & (np.abs(xx - W / 2) <= half)
for (cx, cy, rx, ry) in [(40, 30, 22, 14), (78, 18, 26, 15), (118, 16, 28, 16), (156, 24, 24, 15), (188, 40, 17, 13)]:
    inside |= lump(cx, cy, rx, ry)
inside &= yy <= base
# tones: light from the upper left
LIGHT = np.array([192, 128, 63]); MID = np.array([171, 113, 50]); DARK = np.array([146, 90, 43]); CLOD = np.array([118, 74, 39])
img = np.zeros((H, W, 4), np.uint8)
d_top = np.zeros((H, W))
# distance from the heap's top edge, column by column
for x in range(W):
    col = np.where(inside[:, x])[0]
    if len(col): d_top[col, x] = col - col.min()
shade = d_top + (xx / W) * 14 - 6 * np.sin(xx / 17.0)
col = np.where(shade[..., None] < 9, LIGHT, np.where(shade[..., None] < 30, MID, DARK))
# clods: little darker blocks, chunky like the figure's pixels
hashv = (np.sin(np.floor(xx / 6) * 12.9898 + np.floor(yy / 6) * 78.233) * 43758.5453) % 1.0
clod = (hashv > 0.86) & (d_top > 7)
col = np.where(clod[..., None], CLOD, col)
lite = (hashv < 0.05) & (d_top > 4)
col = np.where(lite[..., None], np.array([200, 141, 70]), col)
img[..., :3] = np.clip(col, 0, 255)
img[..., 3] = np.where(inside, 255, 0)
fill = Image.fromarray(img, 'RGBA')
# the outline: the shape grown by 5 px, black, under the fill
mask = Image.fromarray((inside * 255).astype(np.uint8), 'L')
grown = mask.filter(ImageFilter.MaxFilter(11))
outline = Image.new('RGBA', (W, H), (4, 2, 1, 0))
outline.putalpha(grown)
outline = outline.filter(ImageFilter.GaussianBlur(0.6))
out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
out.alpha_composite(outline)
out.alpha_composite(fill)
out.save(OUT)
print('mound', out.size, 'at', (X0, Y0))
