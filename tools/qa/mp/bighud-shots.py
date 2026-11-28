"""v2.3.6847 (card UI4): the HUD and Attack, before and after, side by side.

  python3 tools/qa/mp/bighud-shots.py

Reads <temp>/bighud-raw/<size>-before.png and -after.png (mp-bighud's
own, deviceScaleFactor 2: the real game in BroTown's Wheel) and writes
docs/shots/bighud-before-after.png: 390 x 844 upright and 844 x 390
sideways, today's (?bighud=0) on the left, the bigger on the right, each
with its label.
"""
import os
import tempfile
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
RAW = os.environ.get('BT_BIGHUD_RAW') or os.path.join(tempfile.gettempdir(), 'bighud-raw')
OUT = os.path.join(ROOT, 'docs', 'shots', 'bighud-before-after.png')


def pair(size):
    a = Image.open(os.path.join(RAW, size + '-before.png')).convert('RGB')
    b = Image.open(os.path.join(RAW, size + '-after.png')).convert('RGB')
    gap, head = 24, 56
    w, h = a.width + b.width + gap, max(a.height, b.height) + head
    im = Image.new('RGB', (w, h), (16, 22, 30))
    im.paste(a, (0, head))
    im.paste(b, (a.width + gap, head))
    d = ImageDraw.Draw(im)
    d.text((12, 14), size + '  before (?bighud=0)', fill=(240, 240, 233))
    d.text((a.width + gap + 12, 14), size + '  after (the default)', fill=(240, 240, 233))
    return im


up, side = pair('390x844'), pair('844x390')
W = max(up.width, side.width)
out = Image.new('RGB', (W, up.height + side.height + 24), (16, 22, 30))
out.paste(up, (0, 0))
out.paste(side, (0, up.height + 24))
out = out.quantize(colors=256)
out.save(OUT, optimize=True)
print('wrote', os.path.relpath(OUT, ROOT), out.size)
