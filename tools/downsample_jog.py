"""Downsample the high-frame-count jog directions to a uniform TARGET frame
count (east is already 25) so gear pose-sheets are a manageable, consistent
size and the run plays at the same cadence in every direction.  Evenly samples
the cycle.  Run derive_body_tops.py afterwards to refresh crown anchors."""
from PIL import Image
import sys
TARGET = 25
DIRS = ['south', 'southwest', 'northeast', 'north']
for d in DIRS:
    p = f'public/sprites/player/jog-{d}.png'
    im = Image.open(p).convert('RGBA'); n = im.width // 256
    if n <= TARGET:
        print(f'jog-{d}: {n} (unchanged)'); continue
    idx = [min(n - 1, round(i * n / TARGET)) for i in range(TARGET)]
    out = Image.new('RGBA', (TARGET * 256, 256), (0, 0, 0, 0))
    for k, j in enumerate(idx):
        out.paste(im.crop((j * 256, 0, (j + 1) * 256, 256)), (k * 256, 0))
    out.save(p)
    print(f'jog-{d}: {n} -> {TARGET}  (sampled {idx[:4]}...{idx[-2:]})')
