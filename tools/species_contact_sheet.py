#!/usr/bin/env python3
"""v2.3.2651: every animation frame of a species trait on the bro, one sheet
per animation.

The stand preview only proves one frame per facing.  A species piece rides the
head through every pose the game draws traits on (stand, jog, hit, pickup,
mine, fish -- dodge hides traits, _placeTrait's pose === 'dodge' branch), and
the head moves, tilts and changes size across those strips, so a piece that
looks right standing can come loose mid-stride.  This draws all of them so a
bad frame can be found by eye instead of by a player.

Placement is _placeTrait's arithmetic (src/rendering/systems/entityRenderer.js),
in the body's 256-space frame:
    the trait's anchor pixel lands on  bodyTop[pose-dir-frame] + crownNudge
                                       + poseNudge[pose]
    and the trait is scaled about that anchor by
        scale[dir] * scaleByPose[pose][dir] * poseTraitMul * tune.mul
    poseTraitMul: mine 1.21, fish 0.88, jog-east 0.67, else 1 (1 if poseFit)
    tune.mul:     jog-east 1.40 (JOG_EW_HAIR_TUNE -- the face-worn eyewear
                  path passes hairPoseTune; assumed for species too) unless
                  poseFit
Body scale (bodyScale, BODY_DIR_SCALE) multiplies body and trait alike, so it
cancels out here.  Body skin is recoloured with playerSkins' _isSkin/_retint
to the species tone.  West-side facings are mirrors of these and are not drawn.
NOT drawn: the pickup/fish head overlays (same head, redrawn above gear), iris
colour, gear.

Run from the repo root:
    python3 tools/species_contact_sheet.py --id monkey --out /tmp/sheets
writes <out>/<id>-<pose>[-<dir>].png, frames tiled 8 across, each labelled.
"""
import argparse
import json
import os
import numpy as np
from PIL import Image, ImageDraw

BODY = 'public/sprites/player/{pose}-{dir}.png'
TOPS = 'public/sprites/player/body-tops.json'
TRAIT = 'public/sprites/traits/species/{id}'
SKIN_REF = 149
TONES = {'monkey': (85, 56, 23)}
FRAME = 256
CROP = 96            # 256-space box around the head
Z = 3                # zoom
COLS = 8
BG = (40, 44, 52)

# sheets the game draws traits over, in the order a reviewer wants them
ANIMS = [('stand', ['south', 'southwest', 'east', 'northeast', 'north']),
         ('jog', ['south']), ('jog', ['southwest']), ('jog', ['east']),
         ('jog', ['northeast']), ('jog', ['north']),
         ('hit', ['south', 'southwest', 'east', 'northeast', 'north']),
         ('pickup', ['south']), ('mine', ['south']), ('fish', ['south'])]


def retint(body, tone):
    r, g, b, a = [body[:, :, i].astype(int) for i in range(4)]
    skin = (a > 40) & (r > g) & (g >= b) & ((r - b) > 30) & (r > 90) & ((r - g) > 25)
    k = (0.299 * r + 0.587 * g + 0.114 * b) / SKIN_REF
    out = body.copy()
    for i, c in enumerate(tone):
        out[:, :, i] = np.where(skin, np.minimum(255, np.round(c * k)), body[:, :, i])
    return out


def frame(pose, d, f, trait_dir, meta, tops, tone):
    sheet = Image.open(BODY.format(pose=pose, dir=d)).convert('RGBA')
    fw = sheet.height
    body = np.array(sheet.crop((f * fw, 0, (f + 1) * fw, fw))
                    .resize((FRAME, FRAME), Image.NEAREST)).astype(int)
    body = retint(body, tone)
    fit = meta.get('poseFit')
    mul = (meta.get('scale', {}).get(d, 1)
           * meta.get('scaleByPose', {}).get(pose, {}).get(d, 1)
           * (1 if fit else {'mine': 1.21, 'fish': 0.88}.get(pose, 0.67 if (pose, d) == ('jog', 'east') else 1))
           * (1 if fit or (pose, d) != ('jog', 'east') else 1.40))
    a = meta['anchors'][d]
    n = meta.get('crownNudge', {}).get(d, [0, 0])
    pn = meta.get('poseNudge', {}).get(pose, {}).get(d, [0, 0])
    top = tops.get(f'{pose}-{d}-{f}') or tops[f'stand-{d}-0']
    tr = Image.open(trait_dir + f'/{d}.png').convert('RGBA')
    # meta is 256-space whatever size the texture is stored at (v2.3.1526 norm)
    sz = max(1, round(FRAME * mul))
    tr = np.array(tr.resize((sz, sz), Image.NEAREST)).astype(int)
    ax, ay = a[0] * mul, a[1] * mul
    ox = round(top[0] + n[0] + pn[0] - ax)
    oy = round(top[1] + n[1] + pn[1] - ay)
    out = body.copy()
    ys, xs = np.nonzero(tr[:, :, 3] > 16)
    X, Y = xs + ox, ys + oy
    ok = (X >= 0) & (Y >= 0) & (X < FRAME) & (Y < FRAME)
    out[Y[ok], X[ok], :3] = tr[ys[ok], xs[ok], :3]
    out[Y[ok], X[ok], 3] = 255
    cx0 = int(top[0]) - CROP // 2
    cy0 = int(top[1]) - 8
    tile = np.zeros((CROP, CROP, 4), int)
    for yy in range(CROP):
        sy = cy0 + yy
        if not 0 <= sy < FRAME:
            continue
        for_x = slice(max(0, cx0), min(FRAME, cx0 + CROP))
        tile[yy, for_x.start - cx0:for_x.stop - cx0] = out[sy, for_x]
    img = Image.new('RGB', (CROP, CROP), BG)
    img.paste(Image.fromarray(tile.astype(np.uint8), 'RGBA'), (0, 0), Image.fromarray(tile.astype(np.uint8), 'RGBA'))
    return img.resize((CROP * Z, CROP * Z), Image.NEAREST)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--id', default='monkey')
    ap.add_argument('--out', required=True)
    ap.add_argument('--tone', default=None, help='r,g,b skin tone (default: the species tone)')
    args = ap.parse_args()
    tone = tuple(map(int, args.tone.split(','))) if args.tone else TONES[args.id]
    tdir = TRAIT.format(id=args.id)
    meta = json.load(open(tdir + '/meta.json'))
    tops = json.load(open(TOPS))
    os.makedirs(args.out, exist_ok=True)
    cell, lab, gap = CROP * Z, 22, 6
    for pose, dirs in ANIMS:
        tiles = []
        for d in dirs:
            n = sum(1 for k in tops if k.startswith(f'{pose}-{d}-'))
            n = n or 1
            for f in range(n):
                tiles.append((f'{pose}-{d} #{f}', frame(pose, d, f, tdir, meta, tops, tone)))
        cols = min(COLS, len(tiles))
        rows = -(-len(tiles) // cols)
        sheet = Image.new('RGB', (gap + cols * (cell + gap), gap + rows * (cell + lab + gap)), BG)
        dr = ImageDraw.Draw(sheet)
        for i, (name, im) in enumerate(tiles):
            x = gap + (i % cols) * (cell + gap)
            y = gap + (i // cols) * (cell + lab + gap)
            dr.text((x + 4, y + 4), name, fill=(235, 235, 235))
            sheet.paste(im, (x, y + lab))
        name = f'{args.id}-{pose}' + ('' if len(dirs) > 1 else f'-{dirs[0]}')
        path = os.path.join(args.out, name + '.png')
        sheet.save(path)
        print(f'{path}  {len(tiles)} frames')


if __name__ == '__main__':
    main()
