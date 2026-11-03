#!/usr/bin/env python3
"""v2.3.4081: the Gear tab's doc pictures (mp-gearshots.mjs) at 256 colours.

Each PNG is cut to 256 colours (the memory law's ceiling, CLAUDE.md section 7)
and saved as LOSSLESS webp beside the other docs pictures: the webp encoder
keeps a picture of 256 colours or fewer as colour numbers, so it stays small.

    python3 tools/qa/mp/gear_shots.py <out dir> <png> [<png> ...]
"""
import os
import sys

from PIL import Image


def main(argv):
    if len(argv) < 3:
        print(__doc__)
        return 2
    out_dir = argv[1]
    os.makedirs(out_dir, exist_ok=True)
    n = 0
    for src in argv[2:]:
        im = Image.open(src).convert('RGB')
        q = im.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        colours = len(q.getcolors(256) or [])
        name = os.path.splitext(os.path.basename(src))[0] + '.webp'
        dst = os.path.join(out_dir, name)
        q.convert('RGB').save(dst, 'WEBP', lossless=True, quality=100, method=6)
        print(f'{dst}: {q.size[0]}x{q.size[1]}, {colours} colours, {os.path.getsize(dst) // 1024} KB')
        n += 1
    print(f'saved {n}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
