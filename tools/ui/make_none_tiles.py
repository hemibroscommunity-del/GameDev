#!/usr/bin/env python3
"""v2.3.3592: THE CREATOR'S "NONE" TILES SHOW WHAT NONE MEANS.

The owner: "In the trait picker the 'None' option should show a thumbnail of
what that means - for example human should just show a hemi bro head (maybe
the one without the eyes to focus on just the shape)."

Two pictures, cut from the Hemi Bros collection's own bust (the 32 x 32 grid
the townsfolk's portraits are built on, assets/portrait-source/hemi-bros/,
extracted by tools/qa/nft_portraits.py):

  cc-none-bro.png   the collection's plain "bro": a bald head, nose, mouth and
                    ear, no eyes -- the Species strip's Human, and None on
                    every strip that puts something ON the bro (hair, hats,
                    beards, shirts, capes)
  cc-none-eyes.png  the same head wearing the collection's Normal Eyes -- the
                    Eyes strip's Normal, and None on the eyewear strip (no
                    glasses: the bro's own eyes)

Each is the bust's head and neck, cropped square, enlarged by a whole number
(nearest neighbour, so every collection pixel stays a sharp square) into a
128 px picture with a see-through background.  BroTown.jsx `_thumbTile`
draws them pixelated.

Run from the repo root:
    python3 tools/ui/make_none_tiles.py
"""
import os

from PIL import Image

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(REPO, 'assets', 'portrait-source', 'hemi-bros')
OUT = os.path.join(REPO, 'public', 'ui', 'welcome', 'cc')
TILE = 128
# the head and neck on the 32 x 32 bust (x0, y0, x1, y1): the crown is row 8,
# the neck ends at row 26 (the shoulders start at 27), the head spans columns
# 7-22 -- a 20 x 20 square round it, drawn 6x (120 px) in the 128 px tile
CROP = (5, 7, 25, 27)


def tile(layers):
    bust = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    for name in layers:
        im = Image.open(os.path.join(SRC, name + '.png')).convert('RGBA')
        bust.alpha_composite(im)
    head = bust.crop(CROP)
    k = TILE // max(head.size)
    big = head.resize((head.width * k, head.height * k), Image.NEAREST)
    out = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    out.alpha_composite(big, ((TILE - big.width) // 2, (TILE - big.height) // 2))
    return out


def main():
    for name, layers in (('cc-none-bro', ['bro']), ('cc-none-eyes', ['bro', 'normaleyes'])):
        p = os.path.join(OUT, name + '.png')
        tile(layers).save(p, optimize=True)
        print('wrote', os.path.relpath(p, REPO), os.path.getsize(p), 'bytes')


if __name__ == '__main__':
    main()
