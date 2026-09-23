#!/usr/bin/env python3
"""v2.3.2681: cut the picker tiles for the SPECIES slot -- the monkey's FACE.

The importer's thumb is the piece cropped on its own (two ears and a muzzle
floating on transparency), which does not read as "monkey" at tile size.  Same
argument as tools/ui/make_eyestyle_thumbs.py: a player picking a species is
picking a face, so the tile composites the piece onto the game's own head.

It uses tools/species_contact_sheet.composite(), which is _placeTrait's maths
plus the fur recolour speciesArt.js does at runtime, so the tile is what the
game draws -- on the species' own preset skin (Monkey Brown), the colour a
fresh pick starts on.  The head is framed from body-anchors.json like every
other head-trait tile, padded wider than the eye-style tiles because the ears
stand off the sides of the head.

Writes thumb-sw.png (what the picker asks for first) and thumb.png (its
fallback), both 128x128.

Run from the repo root:
    python3 tools/ui/make_species_thumbs.py [--ids monkey]
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(REPO, 'tools'))
import species_frames as SF            # noqa: E402
import species_contact_sheet as CS     # noqa: E402

ANCHORS = os.path.join(REPO, 'public/sprites/player/body-anchors.json')
TILE = 128
PAD_X = 20       # 256-space px either side of the head -- the ears stand off it
PAD_TOP = 4
PAD_BOT = 4


def head_crop(d):
    h = json.load(open(ANCHORS))[f'stand-{d}-0']['head']
    cx, w = h['center'][0], h['width']
    top, bot = h['top'][1], h['bottom'][1]
    half = w // 2 + PAD_X
    return (max(0, cx - half), max(0, top - PAD_TOP), min(256, cx + half), min(256, bot + PAD_BOT))


def tile_for(sid, d, skin):
    tdir, meta, tops, tex, fixes = SF.load(sid)
    strips = {k: np.array(Image.open(f'{tdir}/frames/{k}.png').convert('RGBA')).astype(int)
              for k in meta.get('frameOverlays', {})}
    img = CS.composite('stand', d, 0, meta, tops, tex, SF.TONES[sid], strips, skin, SF.load_fur(tdir, meta))
    full = Image.fromarray(img.astype(np.uint8), 'RGBA')
    crop = full.crop(head_crop(d))
    s = min(TILE / crop.width, TILE / crop.height)
    w2, h2 = max(1, round(crop.width * s)), max(1, round(crop.height * s))
    out = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    out.paste(crop.resize((w2, h2), Image.NEAREST), ((TILE - w2) // 2, (TILE - h2) // 2))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ids', default='monkey')
    args = ap.parse_args()
    os.chdir(REPO)
    for sid in [x.strip() for x in args.ids.split(',') if x.strip()]:
        skin = SF.TONES[sid]
        for d, name in (('southwest', 'thumb-sw.png'), ('south', 'thumb.png')):
            path = os.path.join(SF.TRAIT.format(id=sid), name)
            tile_for(sid, d, skin).save(path)
            print(f'{sid:<8} {name:<13} wrote {path}')


if __name__ == '__main__':
    main()
