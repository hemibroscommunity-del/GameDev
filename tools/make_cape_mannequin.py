#!/usr/bin/env python3
"""v2.3.2022: build the CAPE MANNEQUIN sheet — the reference grid a cape is
generated ON TOP OF, so its metadata can be derived instead of eyeballed.

This is the full-body sibling of tools/make_headwear_mannequin.py, and it
exists for the same reason that one does: a garment needs numbers that no
amount of good art supplies (where it pins to the body, how big it is relative
to THIS direction's figure), and the only way to get them without a tuning
round is to have the generator draw the garment ON the figure, so the
relationship is IN the picture.

WHY A CAPE IS NOT A SHIRT.  The t-shirt is 41 sheets and 512 frames, because it
deforms with every pose.  Nothing can draw that coherently.  A cape is built
like headwear and the sheathed shield instead: FIVE STILLS, one per base
direction, placed by an anchor and scaled by the engine.  The engine already
scales the whole player container for the height builds
(_applyBuildScale, entityRenderer.js), so ONE size is drawn and every build
gets it for free.

FIVE DIRECTIONS, NOT EIGHT.  west / northwest / southeast are mirrored at
runtime (resolveDirection, playerSprites.js) and must NOT be drawn.

WHAT THE GENERATOR IS ASKED FOR.  The person flat #00FF00 on the magenta
backdrop, the cape drawn normally.  Then the import is trivial and involves no
colour heuristics: the cape is every pixel that is neither the magenta backdrop
nor the green person.  import_headwear_green.py's header records what happened
when a tool tried to INFER which pixels were the garment instead -- the whole
batch shipped with the head still inside every hat frame.

MEASURED ADVICE, carried over from 15 headwear sheets (v2.3.1506) because it is
about the generator, not about hats:
  * ONE AT A TIME BEATS BATCHING.  Ten sheets in one go came back with east
    fits of 0.767-0.880; sent individually, three of four landed 0.947-0.967.
  * EAST IS ALWAYS THE WEAKEST CELL, however the sheet was produced.
  * A SHEET DRAWN NARROW AND TALL is the failure that matters: the fitter
    scales it up to match the shoulders and everything bottom-anchored lifts
    off. For hats that put them 7-9px above the skull; for a cape it will float
    the collar off the shoulders.

Run from the repo root:
    python3 tools/make_cape_mannequin.py [--out PATH] [--upscale N]

Emits the sheet plus a .json sidecar giving, per cell, the 256-space rect it
shows and the upscale -- so a cape importer maps a pixel straight back with
    p256 = box[:2] + p_cell / upscale
exactly as the headwear importer does.
"""
import argparse
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

DIRS = ['south', 'southwest', 'east', 'northeast', 'north']
LABEL = {
    'south': 'SOUTH  (facing you)',
    'southwest': 'SOUTHWEST',
    'east': 'EAST  (weakest cell - check it)',
    'northeast': 'NORTHEAST',
    'north': 'NORTH  (back to you)',
}
BODY = 'public/sprites/player/stand-{dir}.png'
FRAME = 256
BG = (255, 0, 255)
INK = (18, 18, 22)
PAD_SIDE = 26     # 256-space cols kept either side: a cape is wider than the body
PAD_BELOW = 10    # rows below the feet, so a long cape has somewhere to fall
PAD_ABOVE = 6

FT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 34)
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 24)
FS = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 20)


def figure_box(d):
    """The 256-space rect of stand-<dir> frame 0 this cell shows.

    Derived from the figure's own alpha bounds rather than a hand-picked
    rectangle, so it follows the art if the art is ever redrawn."""
    im = np.array(Image.open(BODY.format(dir=d)).convert('RGBA').crop((0, 0, FRAME, FRAME)))
    ys, xs = np.where(im[:, :, 3] > 16)
    if not len(ys):
        return (0, 0, FRAME, FRAME)
    return (max(0, int(xs.min()) - PAD_SIDE), max(0, int(ys.min()) - PAD_ABOVE),
            min(FRAME, int(xs.max()) + 1 + PAD_SIDE), min(FRAME, int(ys.max()) + 1 + PAD_BELOW))


def cell(d, upscale):
    im = Image.open(BODY.format(dir=d)).convert('RGBA').crop((0, 0, FRAME, FRAME))
    c = im.crop(figure_box(d))
    return c.resize((c.width * upscale, c.height * upscale), Image.NEAREST)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='cape-mannequin.png')
    ap.add_argument('--upscale', type=int, default=4)
    args = ap.parse_args()
    U = args.upscale

    cells = [cell(d, U) for d in DIRS]
    cw = max(c.width for c in cells) + 34
    chh = max(c.height for c in cells) + 20
    pad, head_h, cap = 18, 128, 44
    W = pad + len(DIRS) * (cw + pad)
    H = head_h + chh + cap + pad

    sheet = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(sheet)
    d.text((pad, 20), 'CAPE REFERENCE  -  draw the cape on each figure', font=FT, fill=INK)
    d.text((pad, 62), 'Paint the PERSON flat #00FF00. Leave the cape in full colour. Keep the magenta background.',
           font=FS, fill=INK)
    d.text((pad, 88), 'Do NOT add west / northwest / southeast - the game mirrors those. Do not move, resize or re-pose the figures.',
           font=FS, fill=INK)

    meta = {'upscale': U, 'frame': FRAME, 'dirs': [], 'bg': list(BG), 'key': [0, 255, 0]}
    for i, (dd, c) in enumerate(zip(DIRS, cells)):
        x = pad + i * (cw + pad)
        px, py = x + (cw - c.width) // 2, head_h + (chh - c.height) // 2
        sheet.paste(c, (px, py), c)
        d.rectangle([x, head_h - 4, x + cw, head_h + chh + 4], outline=(120, 0, 120))
        d.text((x + 8, head_h + chh + 12), LABEL[dd], font=F, fill=INK)
        meta['dirs'].append({'dir': dd, 'paste': [px, py],
                             'size': [c.width, c.height], 'box': list(figure_box(dd))})

    sheet.save(args.out)
    with open(args.out.rsplit('.', 1)[0] + '.json', 'w') as f:
        json.dump(meta, f, indent=1)
    print(f'{args.out}  {sheet.size}  upscale x{U}')
    for e in meta['dirs']:
        print(f"  {e['dir']:10} box {e['box']}  cell {e['size']}")


if __name__ == '__main__':
    main()
