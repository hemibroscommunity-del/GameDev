#!/usr/bin/env python3
"""v2.3.1526: halve every trait frame to a 128 box. A 4x texture saving.

Why this is the right lever
---------------------------
preloadTraits() loads every catalog entry x 5 directions onto the startup gate,
and a trait frame is 256x256 RGBA -- 256KB of GPU texture each, whatever the
PNG weighs on disk (they compress to 1.8MB total, which is why this never
looked like a problem in the repo). 244 frames today is ~62MB resident before
a single hat is worn, and releasing the 28 re-cut ones was going to add to it.

Halving to 128 quarters that to ~15MB. The headwear catalog's own note has
called for exactly this since v2.3.1489, in preference to trimming the list.

Why 128 is enough, measured rather than assumed
-----------------------------------------------
Nothing draws a trait at 1:1 anywhere in the game.

  * In the world, _placeTrait scales by absBodyScale, which maps the 256-space
    frame onto a player sprite of roughly 90-100 screen px. A 256 texture is
    already being MINIFIED ~2.7x there; at 128 it is still minified.
  * On the login screen the portrait canvas is a fixed 256 and is displayed at
    94px at rest and ~158px zoomed, inside a 172px stage. Minified again.

So the detail being thrown away was never reaching a pixel on either surface.

The downscale is a BOX filter -- a straight 2x2 average -- which is the exact
inverse of the upscale it will get, rather than a resampling kernel that would
invent edge tones the art does not have.

Run from the repo root:
    python3 tools/downscale_traits.py            # report only
    python3 tools/downscale_traits.py --apply
    [--to 128]        target edge, default 128
    [--cats headwear,hair,facialhair,shirt]
"""
import argparse
import os
from PIL import Image

TRAITS = 'public/sprites/traits'
DIRS = ['south', 'southwest', 'east', 'northeast', 'north']


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--to', type=int, default=128)
    ap.add_argument('--cats', default='headwear,hair,facialhair,shirt')
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()

    before = after = 0
    frames = skipped = 0
    for cat in args.cats.split(','):
        base = f'{TRAITS}/{cat}'
        if not os.path.isdir(base):
            continue
        for tid in sorted(os.listdir(base)):
            root = f'{base}/{tid}'
            if not os.path.isfile(f'{root}/meta.json'):
                continue
            # the hairmask is placed by the SAME _placeTrait call as the hat it
            # clips, so it has to travel with it or the clip lands at half size
            todo = [f'{root}/{d}.png' for d in DIRS]
            todo += [f'{root}/hairmask/{d}.png' for d in DIRS]
            for p in todo:
                if not os.path.isfile(p):
                    continue
                im = Image.open(p).convert('RGBA')
                w, h = im.size
                before += w * h * 4
                if w <= args.to and h <= args.to:
                    after += w * h * 4
                    skipped += 1
                    continue
                nw, nh = args.to, round(h * args.to / w)
                after += nw * nh * 4
                frames += 1
                if args.apply:
                    im.resize((nw, nh), Image.BOX).save(p)

    print(f'{frames} frame(s) {"resized" if args.apply else "would resize"} to '
          f'{args.to}px, {skipped} already at or under it')
    print(f'texture memory {before / 1e6:.1f}MB -> {after / 1e6:.1f}MB '
          f'({before / max(after, 1):.1f}x saving)')


if __name__ == '__main__':
    main()
