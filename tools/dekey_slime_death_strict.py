"""
Strict slime-death dekey: erase any pixel that isn't a believable green.

The v9 sheet (produced by dekey_slime_death.py) still has pale residue
showing through around the burst — near-white pixels with only a faint
green tint. This pass enforces "must look green" instead of "must not
look white", which is the right framing for a green sprite.

Rule, applied frame by frame:
  - KEEP dark pixels (lum < 50) unconditionally — preserves AA edges
    on outlines and dark green shadow tones.
  - Anywhere lum >= 50, require green-dominance margin (g - max(r,b))
    >= 20.  Empirical pass on v9 showed real chunks sit at delta 30+
    while residue clusters at delta 5-15 with lum 70-100 — that's
    the muddy grey-green the user reads as "white".

Usage:
  python tools/dekey_slime_death_strict.py SRC.png DST.png
"""
import sys
from PIL import Image


def kill(r, g, b):
    lum = (r + g + b) / 3
    if lum < 50:
        return False
    delta = g - max(r, b)
    return delta < 20


def main(src_path, dst_path):
    im = Image.open(src_path).convert('RGBA')
    px = im.load()
    w, h = im.size
    killed = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if kill(r, g, b):
                px[x, y] = (0, 0, 0, 0)
                killed += 1
    im.save(dst_path)
    print(f'{killed} pixels zeroed -> {dst_path}')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('usage: dekey_slime_death_strict.py SRC.png DST.png', file=sys.stderr)
        sys.exit(2)
    main(sys.argv[1], sys.argv[2])
