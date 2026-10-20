#!/usr/bin/env python3
"""v2.3.3514: THE SMITH'S ANVIL, THE OWNER'S PAINTED ONE.

The owner's playtest note: "make a more realistic anvil for the animation when
the character does smithing work".  The anvil under the smith's hammer was
drawn in code (rectangles and a curve, effectsRenderer _updateSmithing); the
game already has a painted one, the town prop by the Blacksmith's door
(public/sprites/props/anvil.png, 256 x 221, horn to the left).

This writes the smith's OWN copy, public/sprites/fx/smith-anvil.webp:
  - its own file, so freeing today's town's art (the prop is in its bundle)
    never destroys the picture the smith is drawing (TRAPS: v2.3.2651's
    "a hidden sprite keeps a destroyed source");
  - 180 x 155: it is drawn about 73 world px wide, at most ~130 device px on a
    3x phone at the Wheel's scale -- the prop's 256 would be memory for nothing;
  - the alpha lifted from the background remover's ~250 to solid
    (a' = min(255, a * 255 / 250), as tools/ui/cut-owner-icons.py does), so
    the rock painted under the mining pose never shows faintly through it;
  - resized Lanczos on premultiplied colour (no dark fringe), WebP 90.

  python3 tools/make_smith_anvil.py [--force]
"""
import os
import sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'public', 'sprites', 'props', 'anvil.png')
OUT = os.path.join(ROOT, 'public', 'sprites', 'fx', 'smith-anvil.webp')
SIZE = (180, 155)


def main():
    if os.path.exists(OUT) and '--force' not in sys.argv:
        print('refusing to overwrite ' + os.path.relpath(OUT, ROOT) + ' (pass --force)')
        return 1
    im = Image.open(SRC).convert('RGBA')
    im.putalpha(im.getchannel('A').point(lambda v: min(255, int(v * 255 / 250))))
    small = im.convert('RGBa').resize(SIZE, Image.LANCZOS).convert('RGBA')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    small.save(OUT, 'WEBP', quality=90, method=6)
    print('wrote ' + os.path.relpath(OUT, ROOT) + '  %dx%d  %d bytes  (%d KB decoded)'
          % (SIZE[0], SIZE[1], os.path.getsize(OUT), SIZE[0] * SIZE[1] * 4 // 1024))
    return 0


if __name__ == '__main__':
    sys.exit(main())
