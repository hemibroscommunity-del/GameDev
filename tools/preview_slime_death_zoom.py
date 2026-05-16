"""
Two preview artifacts for visual residue hunting:

1) Zoom: 4x nearest-neighbor scale of each frame on magenta, laid out
   in a 5x3 grid.  Lets us see each pixel clearly.

2) Heatmap: same grid but every pixel with lum >= LUM_FLAG is painted
   bright cyan, everything else painted dark grey, transparent stays
   magenta.  Highlights exactly where any "pale" pixels survive.
"""
from PIL import Image, ImageDraw

SRC = 'public/sprites/monsters/slime-death-v10.png'
FW, FH = 128, 128
COLS = 5
ZOOM = 4
LUM_FLAG = 100  # any opaque pixel with lum >= this gets flagged in heatmap

im = Image.open(SRC).convert('RGBA')
n = im.width // FW
rows = (n + COLS - 1) // COLS

# 1) Zoomed magenta grid
gz = Image.new('RGBA', (COLS * FW * ZOOM, rows * FH * ZOOM), (255, 0, 255, 255))
for i in range(n):
    frame = im.crop((i * FW, 0, (i + 1) * FW, FH))
    bg = Image.new('RGBA', (FW, FH), (255, 0, 255, 255))
    bg.alpha_composite(frame)
    bg = bg.resize((FW * ZOOM, FH * ZOOM), Image.NEAREST)
    r, c = i // COLS, i % COLS
    gz.paste(bg, (c * FW * ZOOM, r * FH * ZOOM))
# Frame index labels
d = ImageDraw.Draw(gz)
for i in range(n):
    r, c = i // COLS, i % COLS
    d.text((c * FW * ZOOM + 4, r * FH * ZOOM + 4), f'#{i}', fill=(0, 0, 0))
gz.save('tools/slime-death-v10-zoom.png')
print(f'wrote tools/slime-death-v10-zoom.png ({gz.size[0]}x{gz.size[1]})')

# 2) Heatmap: pale pixels in cyan, dark in grey, transparent in magenta
hm = Image.new('RGBA', (COLS * FW, rows * FH), (255, 0, 255, 255))
for i in range(n):
    src = im.crop((i * FW, 0, (i + 1) * FW, FH))
    tile = Image.new('RGBA', (FW, FH), (255, 0, 255, 255))
    px = src.load()
    tpx = tile.load()
    for y in range(FH):
        for x in range(FW):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            lum = (r + g + b) / 3
            if lum >= LUM_FLAG:
                tpx[x, y] = (0, 255, 255, 255)
            else:
                tpx[x, y] = (40, 40, 40, 255)
    r, c = i // COLS, i % COLS
    hm.paste(tile, (c * FW, r * FH))
hm = hm.resize((COLS * FW * ZOOM, rows * FH * ZOOM), Image.NEAREST)
d2 = ImageDraw.Draw(hm)
for i in range(n):
    r, c = i // COLS, i % COLS
    d2.text((c * FW * ZOOM + 4, r * FH * ZOOM + 4), f'#{i}', fill=(255, 255, 255))
hm.save('tools/slime-death-v10-heatmap.png')
print(f'wrote tools/slime-death-v10-heatmap.png ({hm.size[0]}x{hm.size[1]})')
