"""Generic preview: composite a sprite sheet over black at 4x zoom."""
import sys
from PIL import Image, ImageDraw

if len(sys.argv) != 3:
    print('usage: preview_slime_sheet.py SRC.png DST.png', file=sys.stderr)
    sys.exit(2)
src, dst = sys.argv[1], sys.argv[2]
FW, FH = 128, 128
COLS = 8
ZOOM = 3

im = Image.open(src).convert('RGBA')
n = im.width // FW
rows = (n + COLS - 1) // COLS
out = Image.new('RGBA', (COLS * FW * ZOOM, rows * FH * ZOOM), (0, 0, 0, 255))
for i in range(n):
    frame = im.crop((i * FW, 0, (i + 1) * FW, FH))
    bg = Image.new('RGBA', (FW, FH), (0, 0, 0, 255))
    bg.alpha_composite(frame)
    bg = bg.resize((FW * ZOOM, FH * ZOOM), Image.NEAREST)
    r, c = i // COLS, i % COLS
    out.paste(bg, (c * FW * ZOOM, r * FH * ZOOM))
d = ImageDraw.Draw(out)
for i in range(n):
    r, c = i // COLS, i % COLS
    d.text((c * FW * ZOOM + 4, r * FH * ZOOM + 4), f'#{i}', fill=(255, 255, 0))
out.save(dst)
print(f'wrote {dst} ({out.size[0]}x{out.size[1]}, {n} frames)')
