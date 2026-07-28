#!/usr/bin/env python3
"""v2.3.1512: contact sheets you can actually take measurements off.

headwear_contact_sheet.py crops each hat to its own content, which is the right
thing for spotting a hat that is broken and the wrong thing for deciding one is
2px too high.  Every tile is framed differently, so there is nothing to compare
against and no way to say HOW far off something is.

Here every tile is framed identically instead: the same window around the
body's crown, at the same zoom, with the same ruled grid drawn over it.  The
red crosshair is the crown itself -- the exact point _placeTrait pins a hat to
-- so a reading off the grid IS the nudge.  Positive down and positive right,
matching crownNudge, so a note like "cowboy hat, down 3" turns straight into

    python3 tools/nudge_headwear.py --id cowboy-hat --dy 3

Each tile shows the same hat from the front and from the side, because the two
answer different questions: the front shows height and centring, the side shows
how far forward or back it sits.

Run from the repo root:
    python3 tools/headwear_nudge_sheet.py --out-dir /tmp/nudge
    [--ids a,b,c] [--dirs south,east] [--per-sheet 12] [--zoom 3]
"""
import argparse
import json
import os
import re
import numpy as np
from PIL import Image, ImageDraw

BODY_POSE = 'public/sprites/player/{pose}-{dir}.png'
BODY_TOPS = 'public/sprites/player/body-tops.json'
TRAITS = 'public/sprites/traits'
CATALOGS = ['src/rendering/traits/headwearCatalog.js',
            'src/rendering/traits/hairCatalog.js']
FRAME = 256
ALPHA_T = 16
# window around the crown, in 256-space pixels
UP, DOWN, SIDE = 62, 56, 58
STEP = 5             # fine grid
MAJOR = 20           # labelled grid
BG = (30, 27, 38, 255)
GRID = (255, 255, 255, 28)
GRID2 = (255, 255, 255, 60)
AXIS = (232, 74, 74, 190)


def catalog_ids():
    out = []
    for path in CATALOGS:
        if not os.path.isfile(path):
            continue
        src = open(path).read()
        key = 'HEADWEAR_CATALOG' if 'headwear' in path else 'HAIR_CATALOG'
        if key not in src:
            key = re.search(r'export const (\w*CATALOG)', src).group(1)
        body = src.split(key, 1)[1].split('];', 1)[0]
        out += [i for i in re.findall(r"id:\s*'([^']+)'", body) if i != 'none']
    seen, uniq = set(), []
    for i in out:
        if i not in seen:
            seen.add(i)
            uniq.append(i)
    return uniq


def trait_dir(tid):
    for cat in ('headwear', 'hair'):
        p = f'{TRAITS}/{cat}/{tid}'
        if os.path.isfile(f'{p}/meta.json'):
            return p
    return None


def panel(tid, d, tops, zoom):
    """One direction of one trait, drawn on the body inside the ruled window."""
    root = trait_dir(tid)
    meta = json.load(open(f'{root}/meta.json'))
    sheet = Image.open(BODY_POSE.format(pose='stand', dir=d)).convert('RGBA')
    fw = sheet.height
    out = np.array(sheet.crop((0, 0, fw, fw)).resize((FRAME, FRAME), Image.NEAREST)).astype(int)

    hat = Image.open(f'{root}/{d}.png').convert('RGBA')
    a = list(meta['anchors'][d])
    n = list(meta.get('crownNudge', {}).get(d, [0, 0]))
    sc = meta.get('scale', {}).get(d, 1)
    if sc != 1:
        s = max(1, round(FRAME * sc))
        hat = hat.resize((s, s), Image.NEAREST)
        a = [round(a[0] * sc), round(a[1] * sc)]
        n = [round(n[0] * sc), round(n[1] * sc)]
    hat = np.array(hat).astype(int)
    hh = hat.shape[0]
    bx, by = tops[f'stand-{d}-0']
    dx, dy = bx - (a[0] - n[0]), by - (a[1] - n[1])
    ys, xs = slice(max(0, dy), min(FRAME, hh + dy)), slice(max(0, dx), min(FRAME, hh + dx))
    sy, sx = slice(max(0, -dy), min(hh, FRAME - dy)), slice(max(0, -dx), min(hh, FRAME - dx))
    sub, dst = hat[sy, sx], out[ys, xs]
    m = sub[:, :, 3] > ALPHA_T
    dst[m] = sub[m]
    out[ys, xs] = dst

    x0, y0 = bx - SIDE, by - UP
    win = np.zeros((UP + DOWN, SIDE * 2, 4), np.uint8)
    r0, r1 = max(0, -y0), min(UP + DOWN, FRAME - y0)
    c0, c1 = max(0, -x0), min(SIDE * 2, FRAME - x0)
    win[r0:r1, c0:c1] = out[y0 + r0:y0 + r1, x0 + c0:x0 + c1].astype(np.uint8)

    img = Image.new('RGBA', (SIDE * 2 * zoom, (UP + DOWN) * zoom), BG)
    tile = Image.fromarray(win).resize(img.size, Image.NEAREST)
    img.alpha_composite(tile)

    rule = Image.new('RGBA', img.size, (0, 0, 0, 0))
    dr = ImageDraw.Draw(rule)
    for v in range(-UP, DOWN + 1, STEP):
        y = (UP + v) * zoom
        dr.line([(0, y), (img.width, y)], fill=GRID2 if v % MAJOR == 0 else GRID)
    for u in range(-SIDE, SIDE + 1, STEP):
        x = (SIDE + u) * zoom
        dr.line([(x, 0), (x, img.height)], fill=GRID2 if u % MAJOR == 0 else GRID)
    dr.line([(0, UP * zoom), (img.width, UP * zoom)], fill=AXIS)
    dr.line([(SIDE * zoom, 0), (SIDE * zoom, img.height)], fill=AXIS)
    for v in range(-UP + UP % MAJOR, DOWN + 1, MAJOR):
        dr.text((2, (UP + v) * zoom + 1), f'{v:+d}', fill=(210, 210, 220, 190))
    for u in range(-SIDE + SIDE % MAJOR, SIDE + 1, MAJOR):
        if u:
            dr.text(((SIDE + u) * zoom + 2, img.height - 12), f'{u:+d}',
                    fill=(210, 210, 220, 190))
    img.alpha_composite(rule)
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ids', default=None)
    ap.add_argument('--dirs', default='south,east')
    ap.add_argument('--out-dir', default='nudge-sheets')
    ap.add_argument('--per-sheet', type=int, default=12)
    ap.add_argument('--cols', type=int, default=3)
    ap.add_argument('--zoom', type=int, default=3)
    args = ap.parse_args()

    ids = args.ids.split(',') if args.ids else catalog_ids()
    ids = [i for i in ids if trait_dir(i)]
    dirs = args.dirs.split(',')
    tops = json.load(open(BODY_TOPS))
    os.makedirs(args.out_dir, exist_ok=True)

    sheets = [ids[i:i + args.per_sheet] for i in range(0, len(ids), args.per_sheet)]
    for s, chunk in enumerate(sheets, 1):
        tiles = []
        for tid in chunk:
            parts = [panel(tid, d, tops, args.zoom) for d in dirs]
            w = sum(p.width for p in parts) + 6 * (len(parts) - 1)
            t = Image.new('RGBA', (w, parts[0].height + 15), BG)
            x = 0
            for p in parts:
                t.paste(p, (x, 15))
                x += p.width + 6
            ImageDraw.Draw(t).text((3, 2), tid, fill=(236, 236, 242, 255))
            tiles.append(t)
        cw, ch = tiles[0].width + 10, tiles[0].height + 10
        rows = (len(tiles) + args.cols - 1) // args.cols
        sheet = Image.new('RGBA', (args.cols * cw, rows * ch + 20), BG)
        for i, t in enumerate(tiles):
            sheet.paste(t, ((i % args.cols) * cw + 5, (i // args.cols) * ch + 5))
        ImageDraw.Draw(sheet).text(
            (6, rows * ch + 4),
            f'sheet {s} of {len(sheets)}   /   {" then ".join(dirs)}   /   the red crosshair '
            f'is the head anchor.  Fine grid {STEP}px, numbers every {MAJOR}px.  '
            f'Plus is DOWN and RIGHT.',
            fill=(190, 190, 200, 255))
        p = os.path.join(args.out_dir, f'nudge-{s}.png')
        sheet.save(p)
        print('wrote', p, sheet.size, f'({len(chunk)} traits)')


if __name__ == '__main__':
    main()
