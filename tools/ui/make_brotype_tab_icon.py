#!/usr/bin/env python3
"""v2.3.3772: draw the creator's BRO TYPE tab icon -- three small heads.

The owner, 2026-10-28: "Change species to bro type", then "Also for bro type
just include 3 small heads of each type instead of just the weird shaped alien
one".  So the wide tab (NameModal.jsx _TABS 'species') shows the three bro
types side by side, Human, Monkey and Alien, in the order its strip offers
them -- the same heads its tiles show, so the tab says what is behind it:

  - Monkey and Alien are their picker tiles as they are
    (public/sprites/traits/species/<id>/thumb.png, tools/ui/make_species_thumbs.py:
    the game's own stand-south frame with the species composited on, its head
    framed from body-anchors.json);
  - Human is the same frame with nothing on it, in the art's own tan, framed
    by the very same crop (make_species_thumbs.head_crop), so the three heads
    stand at one size on one baseline.

Three 128 px tiles, GAP px apart, into one strip (the tab icons' height class
draws it 30 CSS px tall at most; game.css .bt-cc-tab-icon--trio keeps its
width from the picture).

    python3 tools/ui/make_brotype_tab_icon.py

Writes public/ui/welcome/cc/cc-tab-brotype.png.
"""
import importlib.util
import os
import sys

import numpy as np
from PIL import Image

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(REPO, 'tools'))
import species_frames as SF            # noqa: E402

OUT = os.path.join(REPO, 'public', 'ui', 'welcome', 'cc', 'cc-tab-brotype.png')
TILE = 128
GAP = 8


def _module(name, path):
    spec = importlib.util.spec_from_file_location(name, os.path.join(REPO, path))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def human_tile():
    """the plain bro's head, framed exactly as make_species_thumbs frames a species"""
    st = _module('make_species_thumbs', 'tools/ui/make_species_thumbs.py')
    full = Image.fromarray(SF.body_frame('stand', 'south', 0).astype(np.uint8), 'RGBA')
    crop = full.crop(st.head_crop('south'))
    s = min(TILE / crop.width, TILE / crop.height)
    w2, h2 = max(1, round(crop.width * s)), max(1, round(crop.height * s))
    out = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    out.paste(crop.resize((w2, h2), Image.NEAREST), ((TILE - w2) // 2, (TILE - h2) // 2))
    return out


def main():
    os.chdir(REPO)
    tiles = [human_tile()] + [
        Image.open(os.path.join(REPO, 'public/sprites/traits/species', sid, 'thumb.png')).convert('RGBA')
        for sid in ('monkey', 'alien')]
    strip = Image.new('RGBA', (3 * TILE + 2 * GAP, TILE), (0, 0, 0, 0))
    for i, t in enumerate(tiles):
        strip.paste(t, (i * (TILE + GAP), 0), t)
    # trim the empty rows above and below the heads, so the icon's height is all head
    bbox = strip.getbbox()
    if bbox:
        strip = strip.crop((0, bbox[1], strip.width, bbox[3]))
    # 256 colours at most, as all new art (CLAUDE.md section 7, the owner's "I
    # won't notice at all from anything at 256"): the tiles' soft edges carry
    # ~1,400; no dither, so the pixel art stays flat
    strip = strip.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert('RGBA')
    strip.save(OUT, optimize=True)
    print(f'wrote {OUT} {strip.size}')


if __name__ == '__main__':
    main()
