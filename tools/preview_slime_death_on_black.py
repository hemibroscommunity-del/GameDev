"""
Composite v10 over a black bg (closer to in-game) at 4x zoom so we can
see what visually reads as bright/whitish.  Also: 2-tier heatmap with
lum >= 100 in cyan and 80 <= lum < 100 in yellow.
"""
from PIL import Image, ImageDraw

SRC = 'public/sprites/monsters/slime-death-v10.png'
FW, FH = 128, 128
COLS = 5
ZOOM = 4

im = Image.open(SRC).convert('RGBA')
n = im.width // FW
rows = (n + COLS - 1) // COLS

# Black-bg zoom
gz = Image.new('RGBA', (COLS * FW * ZOOM, rows * FH * ZOOM), (0, 0, 0, 255))
for i in range(n):
    frame = im.crop((i * FW, 0, (i + 1) * FW, FH))
    bg = Image.new('RGBA', (FW, FH), (0, 0, 0, 255))
    bg.alpha_composite(frame)
    bg = bg.resize((FW * ZOOM, FH * ZOOM), Image.NEAREST)
    r, c = i // COLS, i % COLS
    gz.paste(bg, (c * FW * ZOOM, r * FH * ZOOM))
d = ImageDraw.Draw(gz)
for i in range(n):
    r, c = i // COLS, i % COLS
    d.text((c * FW * ZOOM + 4, r * FH * ZOOM + 4), f'#{i}', fill=(255, 255, 0))
gz.save('tools/slime-death-v10-on-black.png')
print('wrote tools/slime-death-v10-on-black.png')

# Two-tier heatmap
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
            if lum >= 100:
                tpx[x, y] = (0, 255, 255, 255)
            elif lum >= 80:
                tpx[x, y] = (255, 255, 0, 255)
            else:
                tpx[x, y] = (40, 40, 40, 255)
    r, c = i // COLS, i % COLS
    hm.paste(tile, (c * FW, r * FH))
hm = hm.resize((COLS * FW * ZOOM, rows * FH * ZOOM), Image.NEAREST)
hm.save('tools/slime-death-v10-heatmap2.png')
print('wrote tools/slime-death-v10-heatmap2.png')
