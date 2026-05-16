"""
Surgical dekey for slime body sheets (idle/shoot/hit).

The body sheets carry a near-white specular highlight on top of the
slime — this is what reads as a "weapon flash" during the hit anim.
We want to remove the highlight without nuking the body fill (which
is brighter green than the death-anim chunks).

Rule:
  KILL only when (lum >= LUM_KILL AND sat < SAT_KILL).

  Defaults retuned after a first pass at 180/0.30 ate some bright
  green body pixels (e.g. (175, 213, 154) at sat 0.28 — clearly
  green, user wanted it back).  Pure specular pixels sit at sat
  0.0-0.15; the green body's brightest fill sits at sat 0.20+, so
  sat < 0.20 separates them cleanly.
"""
import sys
from PIL import Image

LUM_KILL = 180
SAT_KILL = 0.20


def kill(r, g, b):
    lum = (r + g + b) / 3
    if lum < LUM_KILL:
        return False
    mx = max(r, g, b)
    mn = min(r, g, b)
    sat = 0 if mx == 0 else (mx - mn) / mx
    return sat < SAT_KILL


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
    print(f'{killed} specular pixels zeroed -> {dst_path}')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('usage: dekey_slime_specular.py SRC.png DST.png', file=sys.stderr)
        sys.exit(2)
    main(sys.argv[1], sys.argv[2])
