"""Preview the keyed death sprite sheet over a dark background at 3x."""
from PIL import Image, ImageDraw

SRC = 'public/sprites/players/death-v1.png'
DST = 'tools/death-v1-preview.png'
FW, FH = 128, 128
COLS = 7
ZOOM = 3

im = Image.open(SRC).convert('RGBA')
n = im.width // FW
rows = (n + COLS - 1) // COLS
out = Image.new('RGBA', (COLS * FW * ZOOM, rows * FH * ZOOM), (24, 28, 40, 255))
for i in range(n):
    frame = im.crop((i * FW, 0, (i + 1) * FW, FH))
    bg = Image.new('RGBA', (FW, FH), (24, 28, 40, 255))
    bg.alpha_composite(frame)
    bg = bg.resize((FW * ZOOM, FH * ZOOM), Image.NEAREST)
    r, c = i // COLS, i % COLS
    out.paste(bg, (c * FW * ZOOM, r * FH * ZOOM))
d = ImageDraw.Draw(out)
for i in range(n):
    r, c = i // COLS, i % COLS
    d.text((c * FW * ZOOM + 4, r * FH * ZOOM + 4), f'#{i}', fill=(255, 255, 0))
out.save(DST)
print(f'wrote {DST}')
