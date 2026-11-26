#!/usr/bin/env python3
# v2.3.6787: the character HUD's pictures beside the owner's sheet (card UI3 PR 8).
#
#   python3 tools/art/hud-shots.py
#
# tools/qa/mp/mp-ui3hudart.mjs leaves the top-left corner of the real game in
# each state (deviceScaleFactor 2) in docs/shots/ui3-hudart-raw/<state>.png;
# this sets each beside the owner's sheet (assets/icons-source/owner-2026-11-26-hud/
# sheet.png, scaled to the same height) as docs/shots/ui3-hudart-<state>.png,
# so the owner sees their picture and the game side by side.  The raw corners
# are working files: they are not kept.
import os
import sys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
RAW = os.path.join(ROOT, 'docs', 'shots', 'ui3-hudart-raw')
SHEET = os.path.join(ROOT, 'assets', 'icons-source', 'owner-2026-11-26-hud', 'sheet.png')
GAP = 24


def main():
    sheet = Image.open(SHEET).convert('RGBA')
    names = sorted(f[:-4] for f in os.listdir(RAW) if f.endswith('.png'))
    if not names:
        print('no corners in', RAW)
        return 1
    for name in names:
        shot = Image.open(os.path.join(RAW, name + '.png')).convert('RGBA')
        h = shot.height
        sw = round(sheet.width * h / sheet.height)
        sc = sheet.resize((sw, h), Image.LANCZOS)
        out = Image.new('RGBA', (shot.width + GAP + sw, h), (16, 24, 32, 255))
        out.alpha_composite(shot, (0, 0))
        out.alpha_composite(sc, (shot.width + GAP, 0))
        dest = os.path.join(ROOT, 'docs', 'shots', 'ui3-hudart-' + name + '.png')
        out.convert('RGB').save(dest, optimize=True)
        print(dest, out.size)
    return 0


if __name__ == '__main__':
    sys.exit(main())
