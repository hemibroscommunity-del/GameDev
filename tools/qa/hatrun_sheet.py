#!/usr/bin/env python3
"""Stack the per-hat head shots from tools/qa/mp/shot-hatrun.mjs into sheets.  (v2.3.2896)

One row per hat: standing facing west, two frames of the jog west, two of the
jog east, standing facing east -- so the hat's size against the head can be
compared across the whole catalog at a glance.

    python3 tools/qa/hatrun_sheet.py [tag]      # tag names the output, e.g. before / after

Writes tools/qa/mp/out/hatrun-sheet-<tag>-<n>.png, a dozen hats per sheet.
"""
import glob
import os
import sys

from PIL import Image, ImageDraw

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(REPO, 'tools', 'qa', 'mp', 'out')
COLS = ['W0', 'W1', 'W2', 'E1', 'E2', 'E0']
HEAD = ['stand W', 'jog W', 'jog W', 'jog E', 'jog E', 'stand E']
PER_SHEET = 13


def main():
    tag = sys.argv[1] if len(sys.argv) > 1 else 'sheet'
    ids = sorted({os.path.basename(p)[len('hatrun-'):-len('-W0.png')]
                  for p in glob.glob(os.path.join(OUT, 'hatrun-*-W0.png'))})
    if not ids:
        sys.exit('no hatrun-*.png shots in ' + OUT)
    cw = ch = 0
    for p in glob.glob(os.path.join(OUT, 'hatrun-*-*.png')):
        if 'sheet' in p:
            continue
        w, h = Image.open(p).size
        cw, ch = max(cw, w), max(ch, h)
    label_w, head_h = 170, 22
    for n in range(0, len(ids), PER_SHEET):
        chunk = ids[n:n + PER_SHEET]
        sheet = Image.new('RGB', (label_w + cw * len(COLS), head_h + ch * len(chunk)), (24, 30, 34))
        d = ImageDraw.Draw(sheet)
        for i, h in enumerate(HEAD):
            d.text((label_w + i * cw + 6, 5), h, fill=(230, 230, 230))
        for r, hid in enumerate(chunk):
            y = head_h + r * ch
            d.text((6, y + ch // 2 - 6), hid, fill=(240, 220, 160))
            for c, col in enumerate(COLS):
                p = os.path.join(OUT, f'hatrun-{hid}-{col}.png')
                if os.path.exists(p):
                    sheet.paste(Image.open(p).convert('RGB'), (label_w + c * cw, y))
        path = os.path.join(OUT, f'hatrun-sheet-{tag}-{n // PER_SHEET + 1}.png')
        sheet.save(path)
        print('wrote', path, sheet.size)


if __name__ == '__main__':
    main()
