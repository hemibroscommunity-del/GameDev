"""
Strip near-white residue from the slime-death sprite sheet.

The v7 sheet was produced by a Python keying pass that only zeroed:
  - min(rgb) > 170 AND max-min < 60  (cool off-whites)
  - min(rgb) > 200                    (near-pure white)
  - r,g > 200 AND b > 170             (warm whites)

Pixels just under those thresholds survived — a few hundred opaque
near-white grayscale pixels (lum 160-195, sat < 0.2) still showed
through as faint white speckle around the bursting chunks.  This
pass catches them.

Rule:
  alpha = 0 when (lum > 160 AND sat < 0.20) OR (lum > 195).
Saturated greens (real chunk highlights at lum 160-180, sat 0.2-0.4)
are PRESERVED so the slime body stays intact.

Usage:
  python tools/dekey_slime_death.py
    public/sprites/monsters/slime-death-v7.png
    public/sprites/monsters/slime-death-v8.png
"""
import sys
from PIL import Image

LUM_KILL = 195            # any opaque pixel brighter than this dies regardless of sat
LUM_NEAR = 160            # plus low-sat between this and LUM_KILL
SAT_NEAR = 0.20


def main(src_path: str, dst_path: str) -> None:
    im = Image.open(src_path).convert('RGBA')
    px = im.load()
    w, h = im.size
    killed = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            lum = (r + g + b) / 3
            mx = max(r, g, b)
            mn = min(r, g, b)
            sat = 0 if mx == 0 else (mx - mn) / mx
            if (lum > LUM_NEAR and sat < SAT_NEAR) or lum > LUM_KILL:
                px[x, y] = (0, 0, 0, 0)
                killed += 1
    im.save(dst_path)
    print(f'{killed} near-white pixels zeroed -> {dst_path}')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('usage: dekey_slime_death.py SRC.png DST.png', file=sys.stderr)
        sys.exit(2)
    main(sys.argv[1], sys.argv[2])
