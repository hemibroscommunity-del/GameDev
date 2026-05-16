"""
Composite each frame of slime-death-v10 over magenta and lay them out
in a grid so we can visually scan for whitish residue.  Frames are
128x128; sheet is 1920x128 = 15 frames.  Grid: 5 cols x 3 rows so
the whole thing fits in a viewer.
"""
from PIL import Image

SRC = 'public/sprites/monsters/slime-death-v10.png'
DST = 'tools/slime-death-v10-magenta-grid.png'
FW, FH = 128, 128
COLS = 5

im = Image.open(SRC).convert('RGBA')
n = im.width // FW
rows = (n + COLS - 1) // COLS
grid = Image.new('RGBA', (COLS * FW, rows * FH), (255, 0, 255, 255))
for i in range(n):
    frame = im.crop((i * FW, 0, (i + 1) * FW, FH))
    bg = Image.new('RGBA', (FW, FH), (255, 0, 255, 255))
    bg.alpha_composite(frame)
    r, c = i // COLS, i % COLS
    grid.paste(bg, (c * FW, r * FH))
grid.save(DST)
print(f'wrote {DST}  ({grid.size[0]}x{grid.size[1]}, {n} frames)')
