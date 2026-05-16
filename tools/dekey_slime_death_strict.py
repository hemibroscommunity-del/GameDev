"""
Strict slime-death dekey: erase any pixel that isn't a believable green.

The v9 sheet (produced by dekey_slime_death.py) still has pale residue
showing through around the burst — near-white pixels with only a faint
green tint. This pass enforces "must look green" instead of "must not
look white", which is the right framing for a green sprite.

Rule, applied frame by frame:
  - KEEP dark pixels (lum < 50) unconditionally — preserves outline.
  - Anywhere lum >= 50, require BOTH saturation >= 0.35 AND green
    dominance (g > max(r,b)).  Pixels failing either test read as
    grey/muddy to the eye and are zeroed.

  Empirical pass on v9 showed real chunks sit at sat 0.45-0.80 while
  the "white residue" the user complained about clustered at sat
  0.20-0.34 (e.g. 97,128,96 — technically green-dominant but
  desaturated enough to read as off-white).  This pass kills ~1.6k
  such pixels.

Usage:
  python tools/dekey_slime_death_strict.py SRC.png DST.png
"""
import sys
from PIL import Image


def kill(r, g, b):
    lum = (r + g + b) / 3
    # Brightness ceiling: anything brighter than mid-green reads as a
    # bright/whitish dot against the dark in-game background — kill it.
    # Threshold picked after black-bg visual inspection of v10 frames.
    if lum >= 90:
        return True
    if lum < 50:
        return False
    mx = max(r, g, b)
    mn = min(r, g, b)
    sat = 0 if mx == 0 else (mx - mn) / mx
    if sat < 0.35:
        return True
    if g <= max(r, b):
        return True
    return False


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
