#!/usr/bin/env python3
"""v2.3.3833: mp-npccast's photographs of the 21 townsfolk, one sheet a kind.

    python3 tools/qa/npccast_sheet.py        -> tools/qa/mp/out/npccast-<kind>-sheet.png

Each townsperson's photograph at his spot (npccast-<kind>-NN-<name>.png),
seven to a row, his name under it.
"""
import glob
import os

from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mp', 'out')
for kind in ('computer', 'phone'):
    files = sorted(glob.glob(os.path.join(OUT, 'npccast-%s-[0-9][0-9]-*.png' % kind)))
    if not files:
        continue
    ims = [Image.open(f).convert('RGB') for f in files]
    w, h = ims[0].size
    if kind == 'phone':      # dpr 3: a third the size, as the eye sees it
        ims = [im.resize((im.width // 3, im.height // 3), Image.LANCZOS) for im in ims]
        w, h = ims[0].size
    cols, gap, label = 7, 6, 16
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * (w + gap) + gap, rows * (h + label + gap) + gap), (16, 18, 22))
    d = ImageDraw.Draw(sheet)
    for i, (im, f) in enumerate(zip(ims, files)):
        x, y = gap + (i % cols) * (w + gap), gap + (i // cols) * (h + label + gap)
        sheet.paste(im, (x, y))
        name = os.path.basename(f)[len('npccast-%s-00-' % kind):-4].replace('-', ' ').title()
        d.text((x + 4, y + h + 2), name, fill=(230, 230, 230))
    path = os.path.join(OUT, 'npccast-%s-sheet.png' % kind)
    sheet.save(path)
    print('wrote', path, sheet.size)
