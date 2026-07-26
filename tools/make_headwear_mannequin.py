#!/usr/bin/env python3
"""v2.3.1482: build the HEADWEAR MANNEQUIN sheet — the reference grid a hat is
generated ON TOP OF, so its metadata can be derived instead of eyeballed.

Why draw the hat on a head at all
---------------------------------
A hat needs three numbers per direction that no amount of good art supplies:

    anchors[dir]      the pixel of the hat pinned to the body's crown
    crownNudge[dir]   how far to shift it so the BAND, not the hat's top,
                      lands on the skull
    scale[dir]        size relative to that direction's head

Every hat in the repo was tuned by eye — all ten notes end with some variant of
"crownNudge/scale start at defaults, tune per direction after on-device
review".  There is no import tool.

Generating the hat ON a head removes the guesswork entirely.  If the art shows
the hat sitting on a head, then the relationship between hat and skull is IN
the picture, and the importer can read all three numbers off it:

    scale       = game head width / drawn head width
    crownNudge  = (hat anchor - drawn crown) * that scale
    anchors     = the hat's own bbox top-centre

No eyeballing, no tuning round.  That is what this sheet exists to enable.

What it emits
-------------
A labelled 5-cell grid (one per base direction) of the bare head and shoulders,
lifted straight from stand-<dir>.png frame 0 so the proportions are the game's
own, drawn at UPSCALE on flat magenta.  The five directions are the five the
game stores; west / northwest / southeast are mirrored at runtime and must NOT
be drawn (see resolveDirection in playerSprites.js).

Pass --rows N to stack N copies, one row per hat, for generating several hats
on one sheet.

Run from the repo root:
    python3 tools/make_headwear_mannequin.py [--rows N] [--out PATH]
"""
import argparse
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

DIRS = ['south', 'southwest', 'east', 'northeast', 'north']
BODY = 'public/sprites/player/stand-{dir}.png'
ANCHORS = 'public/sprites/player/body-anchors.json'
UPSCALE = 5          # the head is ~60px in a 256 frame; 5x gives it room to be drawn
PAD_ABOVE = 34       # 256-space rows kept above the crown, so tall hats have somewhere to go
PAD_BELOW = 26       # rows below the jaw: shoulders, for context

BG = (255, 0, 255)
INK = (20, 20, 24)
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26)
FT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 34)
FS = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)


def crop_box(d, heads):
    """The 256-space rect of stand-<dir> frame 0 that this cell shows.

    Deterministic, and the whole reason the importer can be exact: it maps a
    pixel in the generated cell straight back to 256-space with
    p256 = box[:2] + p_cell / UPSCALE."""
    h = heads[f'stand-{d}-0']['head']
    top, bot = h['top'][1], h['bottom'][1]
    cx, w = h['center'][0], h['width']
    half = max(w, 56) // 2 + 18
    return (max(0, cx - half), max(0, top - PAD_ABOVE),
            min(256, cx + half), min(256, bot + PAD_BELOW))


def head_cell(d, heads):
    """Head + shoulders for one direction, cropped in 256-space and upscaled."""
    im = Image.open(BODY.format(dir=d)).convert('RGBA').crop((0, 0, 256, 256))
    cell = im.crop(crop_box(d, heads))
    return cell.resize((cell.width * UPSCALE, cell.height * UPSCALE), Image.NEAREST)


def layout(rows=1):
    """Where every cell sits in the sheet, and what 256-space rect it shows.

    Shared with tools/import_headwear.py so the importer never has to guess at
    the grid it is reading back."""
    heads = json.load(open(ANCHORS))
    cells = [head_cell(d, heads) for d in DIRS]
    cw = max(c.width for c in cells) + 24
    chh = max(c.height for c in cells) + 16
    pad, head_h, cap, rowlab = 16, 62, 36, 34
    out = []
    for r in range(rows):
        y = head_h + r * (chh + cap + pad + (rowlab if rows > 1 else 0))
        if rows > 1:
            y += rowlab
        for i, (d, c) in enumerate(zip(DIRS, cells)):
            x = pad + i * (cw + pad)
            out.append({
                'row': r, 'dir': d,
                # top-left of the pasted head art inside the sheet
                'paste': (x + (cw - c.width) // 2, y + (chh - c.height) // 2),
                'size': (c.width, c.height),
                'box': crop_box(d, heads),
                'upscale': UPSCALE,
            })
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--rows', type=int, default=1,
                    help='one row per hat you want generated on this sheet')
    ap.add_argument('--out', default='headwear-mannequin.png')
    args = ap.parse_args()

    heads = json.load(open(ANCHORS))
    cells = [head_cell(d, heads) for d in DIRS]
    cw = max(c.width for c in cells) + 24
    chh = max(c.height for c in cells) + 16
    pad, head_h, cap, rowlab = 16, 62, 36, 34

    W = pad + len(DIRS) * (cw + pad)
    H = head_h + args.rows * (chh + cap + pad + (rowlab if args.rows > 1 else 0)) + pad
    title = 'HEADWEAR REFERENCE  -  draw the hat ON each head'
    probe = ImageDraw.Draw(Image.new('RGB', (8, 8)))
    W = max(W, int(probe.textlength(title, font=FT)) + 2 * pad)

    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)
    d.text((pad, 12), title, font=FT, fill=INK)

    for r in range(args.rows):
        y = head_h + r * (chh + cap + pad + (rowlab if args.rows > 1 else 0))
        if args.rows > 1:
            d.text((pad, y), f'HAT {r + 1}  —  name it here', font=FS, fill=(90, 0, 90))
            y += rowlab
        for i, (dd, c) in enumerate(zip(DIRS, cells)):
            x = pad + i * (cw + pad)
            img.paste(c, (x + (cw - c.width) // 2, y + (chh - c.height) // 2), c)
            lab = dd.upper()
            img_d = d.textlength(lab, font=F)
            d.text((x + (cw - img_d) / 2, y + chh + 6), lab, font=F, fill=INK)

    img.save(args.out)
    print('wrote', args.out, img.size, f'({args.rows} row(s), {len(DIRS)} directions)')
    print('cell size', cw, 'x', chh, '| upscale', UPSCALE)


if __name__ == '__main__':
    main()
