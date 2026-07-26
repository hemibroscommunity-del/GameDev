#!/usr/bin/env python3
"""v2.3.1491: one compact sheet of every hat sitting on the head.

preview_headwear.py renders full figures, which is the right thing when you are
checking one hat and want to see it in context.  It is the wrong thing when you
are auditing thirty-four at once: the sheet comes out seven thousand pixels tall
and almost all of it is trouser.

This crops to the head, where every headwear defect actually lives, and tiles
them.  It composites the same way _placeTrait does -- the hat's anchor pixel
goes to the body's crown plus crownNudge -- so what it shows is what the game
draws, not an approximation of it.

Run from the repo root:
    python3 tools/headwear_contact_sheet.py --out sheet.png [--dir south]
    [--ids a,b,c]  default: every hat in the catalog
"""
import argparse
import json
import os
import re
import numpy as np
from PIL import Image, ImageDraw

BODY = 'public/sprites/player/stand-{dir}.png'
BODY_TOPS = 'public/sprites/player/body-tops.json'
HAT = 'public/sprites/traits/headwear/{id}'
CATALOG = 'src/rendering/traits/headwearCatalog.js'
FRAME = 256
ALPHA_T = 16
PAD = 30             # 256-space rows kept above the crown and below the jaw


def catalog_ids():
    src = open(CATALOG).read()
    body = src.split('HEADWEAR_CATALOG', 1)[1].split('];', 1)[0]
    return [i for i in re.findall(r"id:\s*'([^']+)'", body) if i != 'none']


def composite(hid, d, tops):
    meta = json.load(open(f'{HAT.format(id=hid)}/meta.json'))
    hat = np.array(Image.open(f'{HAT.format(id=hid)}/{d}.png').convert('RGBA')).astype(int)
    body = np.array(Image.open(BODY.format(dir=d)).convert('RGBA')
                    .crop((0, 0, FRAME, FRAME))).astype(int)
    a = meta['anchors'][d]
    n = meta.get('crownNudge', {}).get(d, [0, 0])
    crown_in_frame = (a[0] - n[0], a[1] - n[1])
    bx, by = tops[f'stand-{d}-0']
    dx, dy = bx - crown_in_frame[0], by - crown_in_frame[1]

    out = body.copy()
    ys = slice(max(0, dy), min(FRAME, FRAME + dy))
    xs = slice(max(0, dx), min(FRAME, FRAME + dx))
    sy = slice(max(0, -dy), min(FRAME, FRAME - dy))
    sx = slice(max(0, -dx), min(FRAME, FRAME - dx))
    sub, dst = hat[sy, sx], out[ys, xs]
    m = sub[:, :, 3] > ALPHA_T
    dst[m] = sub[m]
    out[ys, xs] = dst

    top = max(0, by - PAD)
    bot = min(FRAME, by + PAD * 3)
    vis = out[top:bot]
    cols = np.nonzero((vis[:, :, 3] > ALPHA_T).any(axis=0))[0]
    return Image.fromarray(vis[:, cols.min():cols.max() + 1].astype(np.uint8))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ids', default=None)
    ap.add_argument('--dir', default='south')
    ap.add_argument('--out', default='headwear-contact.png')
    ap.add_argument('--cols', type=int, default=8)
    ap.add_argument('--zoom', type=int, default=3)
    args = ap.parse_args()

    ids = args.ids.split(',') if args.ids else catalog_ids()
    ids = [i for i in ids if os.path.isdir(HAT.format(id=i))]
    tops = json.load(open(BODY_TOPS))
    tiles = [(i, composite(i, args.dir, tops)) for i in ids]

    cw = max(t.width for _, t in tiles) * args.zoom + 12
    ch = max(t.height for _, t in tiles) * args.zoom + 22
    rows = (len(tiles) + args.cols - 1) // args.cols
    sheet = Image.new('RGBA', (args.cols * cw, rows * ch), (38, 34, 46, 255))
    dr = ImageDraw.Draw(sheet)
    for i, (hid, t) in enumerate(tiles):
        t = t.resize((t.width * args.zoom, t.height * args.zoom), Image.NEAREST)
        x, y = (i % args.cols) * cw, (i // args.cols) * ch
        sheet.paste(t, (x + (cw - t.width) // 2, y + 4), t)
        dr.text((x + 5, y + ch - 16), hid[:22], fill=(228, 228, 232, 255))
    sheet.save(args.out)
    print('wrote', args.out, sheet.size, f'({len(tiles)} hats, {args.dir})')


if __name__ == '__main__':
    main()
