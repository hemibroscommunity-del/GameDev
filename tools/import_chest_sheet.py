"""Cut the owner's daily-chest sheet into the claim window's frame strip (v2.3.2820).

Source: assets/ui/daily-chest-sheet.png -- a 3x3 grid, read left-to-right,
top-to-bottom: idle, two shakes, then six opening frames.

Output:
  public/ui/chest/daily-chest-strip.webp   9 cells x 256, one row
  public/icons/items/daily-chest.webp      frame 0, the bag icon

Two fixes over a naive slice, both visible in the source:
  * The generator's matte left pure-red (255,0,0) semi-transparent pixels along
    the glow's edge -- a red rim on a gold glow.  They are recoloured to the
    glow's gold, keeping their alpha.
  * The chest does not sit in the same place in every cell (the bottom row is
    ~35px higher), so a single global crop made it jump mid-animation.  Every
    cell is anchored on the chest's BASE -- the bottom of its solid pixels and
    the centre of the lowest fifth -- before one shared crop and scale.

Run: python3 tools/import_chest_sheet.py   (needs Pillow)
"""
from PIL import Image

SRC = 'assets/ui/daily-chest-sheet.png'
STRIP = 'public/ui/chest/daily-chest-strip.webp'
ICON = 'public/icons/items/daily-chest.webp'
CELL = 256
N = 9

src = Image.open(SRC).convert('RGBA')
px = src.load()
W, H = src.size
for y in range(H):
    for x in range(W):
        r, g, b, a = px[x, y]
        if 0 < a < 200 and r > 120 and g < 70 and b < 70:
            px[x, y] = (255, 190, 70, a)

side = W // 3
cells = [src.crop((round(c * W / 3), round(r * H / 3), round(c * W / 3) + side, round(r * H / 3) + side))
         for r in range(3) for c in range(3)]

anchored = []
for cell in cells:
    solid = cell.split()[3].point(lambda v: 255 if v > 200 else 0)
    bb = solid.getbbox()
    bot = bb[3]
    band = solid.crop((0, int(bot - (bb[3] - bb[1]) * 0.2), side, bot)).getbbox()
    cx = (band[0] + band[2]) / 2
    c = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    c.alpha_composite(cell, (round(side / 2 - cx), round(side * 0.91 - bot)))
    anchored.append(c)

x0, y0, x1, y1 = side, side, 0, 0
for c in anchored:
    bb = c.split()[3].point(lambda v: 255 if v > 16 else 0).getbbox()
    x0, y0, x1, y1 = min(x0, bb[0]), min(y0, bb[1]), max(x1, bb[2]), max(y1, bb[3])
pad = 6
x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(side, x1 + pad), min(side, y1 + pad)
w, h = x1 - x0, y1 - y0
s = CELL / max(w, h)

strip = Image.new('RGBA', (CELL * N, CELL), (0, 0, 0, 0))
for i, c in enumerate(anchored):
    f = c.crop((x0, y0, x1, y1)).resize((round(w * s), round(h * s)), Image.LANCZOS)
    strip.alpha_composite(f, (i * CELL + (CELL - f.size[0]) // 2, (CELL - f.size[1]) // 2))
strip.save(STRIP, 'WEBP', quality=88, method=6)
strip.crop((0, 0, CELL, CELL)).save(ICON, 'WEBP', quality=90, method=6)
print('wrote', STRIP, ICON)
