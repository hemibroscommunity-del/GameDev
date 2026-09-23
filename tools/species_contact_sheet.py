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

v2.3.2652: frames that carry a baked per-frame fix (meta.frameOverlays, made
by tools/species_frames.py) are drawn FROM the baked strip, so the sheet shows
the shipped data, and are labelled with a "*".  --zoom renders chosen frames big
with a 10px coordinate grid, for writing the fixes.

Run from the repo root:
    python3 tools/species_contact_sheet.py --id monkey --out /tmp/sheets
writes <out>/<id>-<pose>[-<dir>].png, frames tiled 8 across, each labelled.
    python3 tools/species_contact_sheet.py --id monkey --out /tmp/z --zoom hit-east:1-5
"""
import argparse
import os
import re
import sys
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import species_frames as SF  # noqa: E402

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


def skin_target(arg, tone):
    """--skin: a SKIN_CATALOG id (read from playerSkins.js) or r,g,b; None = the species tone"""
    if not arg:
        return tone
    if ',' in arg:
        return tuple(int(v) for v in arg.split(','))
    src = open('src/rendering/playerSkins.js').read()
    m = re.search(r"id:\s*'" + re.escape(arg) + r"'[^}]*?target:\s*(null|\[([^\]]+)\])", src)
    if not m:
        raise SystemExit(f'no skin {arg!r} in SKIN_CATALOG')
    return None if m.group(1) == 'null' else tuple(int(v) for v in m.group(2).split(','))


def composite(pose, d, f, meta, tops, tex, tone, strips, skin=None, fur=({}, {})):
    """skin: the player's skin target (None = 'default', the art's own tan);
    the body is retinted to it and the piece's fur layer tinted with it, as the
    game does -- the muzzle and ears are never recoloured.  fur = load_fur()'s
    (textures, strips)."""
    skin = tone if skin == 'species' else skin
    raw = SF.body_frame(pose, d, f)
    body = SF.retint(raw, skin) if skin else raw
    layer = SF.layer_for(pose, d, f, meta, tops, tex, tone, strips)
    layer = SF.draw_fur(layer, SF.layer_for(pose, d, f, meta, tops, fur[0], tone, fur[1]), skin)
    m = layer[:, :, 3] > 0
    body[m, :3] = layer[m, :3]
    body[m, 3] = 255
    return body


def tile(img256, top, zoom, grid=False):
    cx0 = int(top[0]) - CROP // 2
    cy0 = int(top[1]) - 8
    t = np.zeros((CROP, CROP, 4), np.uint8)
    for yy in range(CROP):
        sy = cy0 + yy
        if 0 <= sy < 256:
            xs = slice(max(0, cx0), min(256, cx0 + CROP))
            t[yy, xs.start - cx0:xs.stop - cx0] = img256[sy, xs]
    im = Image.new('RGB', (CROP, CROP), BG)
    rgba = Image.fromarray(t, 'RGBA')
    im.paste(rgba, (0, 0), rgba)
    im = im.resize((CROP * zoom, CROP * zoom), Image.NEAREST)
    if grid:
        dr = ImageDraw.Draw(im)
        for v in range(CROP):
            X, Y = cx0 + v, cy0 + v
            if X % 10 == 0:
                dr.line([(v * zoom, 0), (v * zoom, CROP * zoom)], fill=(90, 200, 255) if X % 50 else (255, 90, 90))
                dr.text((v * zoom + 2, 2), str(X), fill=(150, 230, 255))
            if Y % 10 == 0:
                dr.line([(0, v * zoom), (CROP * zoom, v * zoom)], fill=(90, 200, 255) if Y % 50 else (255, 90, 90))
                dr.text((2, v * zoom + 2), str(Y), fill=(150, 230, 255))
    return im


def grid_sheet(tiles, cell, path):
    lab, gap = 22, 6
    cols = min(COLS, len(tiles))
    rows = -(-len(tiles) // cols)
    sheet = Image.new('RGB', (gap + cols * (cell + gap), gap + rows * (cell + lab + gap)), BG)
    dr = ImageDraw.Draw(sheet)
    for i, (name, im) in enumerate(tiles):
        x = gap + (i % cols) * (cell + gap)
        y = gap + (i // cols) * (cell + lab + gap)
        dr.text((x + 4, y + 4), name, fill=(235, 235, 235))
        sheet.paste(im, (x, y + lab))
    sheet.save(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--id', default='monkey')
    ap.add_argument('--out', required=True)
    ap.add_argument('--skin', default=None, help="skin catalog id or r,g,b (default: the species tone)")
    ap.add_argument('--zoom', default=None, help='pose-dir:a-b[,pose-dir:c] -- big frames with a coordinate grid')
    args = ap.parse_args()
    tdir, meta, tops, tex, fixes = SF.load(args.id)
    tone = SF.TONES[args.id]
    skin = skin_target(args.skin, tone) if args.skin else 'species'
    fur = SF.load_fur(tdir, meta)
    strips = {}
    for key in meta.get('frameOverlays', {}):
        strips[key] = np.array(Image.open(f'{tdir}/frames/{key}.png').convert('RGBA')).astype(int)
    os.makedirs(args.out, exist_ok=True)
    fixed = lambda pose, d, f: str(f) in meta.get('frameOverlays', {}).get(f'{pose}-{d}', {})
    if args.zoom:
        tiles = []
        for item in args.zoom.split(','):
            key, rng = item.split(':')
            pose, d = key.split('-', 1)
            m = re.fullmatch(r'(\d+)(?:-(\d+))?', rng)
            for f in range(int(m.group(1)), int(m.group(2) or m.group(1)) + 1):
                top = SF.crown_of(pose, d, f, tops, fixes)
                img = composite(pose, d, f, meta, tops, tex, tone, strips, skin, fur)
                tiles.append((f'{pose}-{d} #{f}' + (' *' if fixed(pose, d, f) else ''), tile(img, top, 6, True)))
        path = os.path.join(args.out, 'zoom.png')
        grid_sheet(tiles, CROP * 6, path)
        print(path)
        return
    for pose, dirs in ANIMS:
        tiles = []
        for d in dirs:
            n = sum(1 for k in tops if k.startswith(f'{pose}-{d}-')) or 1
            for f in range(n):
                top = SF.crown_of(pose, d, f, tops, fixes)
                img = composite(pose, d, f, meta, tops, tex, tone, strips, skin, fur)
                tiles.append((f'{pose}-{d} #{f}' + (' *' if fixed(pose, d, f) else ''), tile(img, top, Z)))
        name = f'{args.id}-{pose}' + ('' if len(dirs) > 1 else f'-{dirs[0]}')
        path = os.path.join(args.out, name + '.png')
        grid_sheet(tiles, CROP * Z, path)
        print(f'{path}  {len(tiles)} frames')


if __name__ == '__main__':
    main()
