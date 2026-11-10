#!/usr/bin/env python3
"""v2.3.4393: THE OWNER'S RANK TROPHIES, CUT FROM THEIR SHEET.

The owner, 2026-11-09, of the Leaderboards' rows (v2.3.4393): "This is looking
good. Add these trophies to the left of the ranks. Add a cool code based
effect for shine or slight sparkling."  One sheet on a see-through ground,
now assets/icons-source/rank-trophies-2026-11-09/rank-trophies.png, five
pictures left to right: a gold cup with a crown (1), a silver cup (2), a
bronze cup (3), a yellow rosette (4), a pink rosette (5), each with its
number on it.

Each becomes public/icons/ui/rank-<n>.webp, drawn in a board row's rank
column for the first five places (src/ui/mobile/dash/BoardRow.jsx RankMark).

THE CUT is cut-achievement-badges.py's `alpha` cut: the sheet is already
see-through, so the background remover's ~250 is lifted to solid
(a' = min(255, a * 255 / 250)) and anything under 40 dropped (the faint grey
noise the remover left all over the ground, alpha 1-31, and the halo round
each picture).  The five pictures are the five largest 8-connected pieces,
read left to right; every smaller piece (a speck of the noise) is thrown
away.  Nothing is written unless there are exactly five.

THE FRAME: 120 x 120, three times the 40 CSS px a row draws one, never
upscaled (the smallest cup is ~290 px on the sheet).  The sheet draws first
place biggest and third smallest, and that is kept, gently: each picture's
longer side is SHARE[n] of the square (1.0, 0.94, 0.88, 0.9, 0.9), standing
on the square's foot, so a column of them reads as a podium.

THE MEMORY LAW: 256 colours a picture at most (owner, 2026-10-28) -- each is
quantised to 256 with its alpha and written lossless, so the file IS its
palette (about 6 KB each).

Run from the repo's root:  python3 tools/ui/cut-rank-trophies.py
"""
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SHEET = os.path.join(ROOT, 'assets', 'icons-source', 'rank-trophies-2026-11-09', 'rank-trophies.png')
OUT = os.path.join(ROOT, 'public', 'icons', 'ui')
SIZE = 120
SHARE = {1: 1.0, 2: 0.94, 3: 0.88, 4: 0.9, 5: 0.9}
DROP = 40      # alpha under this is the remover's noise and the halo
SOLID = 250    # the remover's "opaque"


def pieces(mask, w, h):
    """8-connected pieces of a flat 0/1 mask: [(area, x0, y0, x1, y1)]."""
    seen = bytearray(w * h)
    out = []
    for start in range(w * h):
        if not mask[start] or seen[start]:
            continue
        stack = [start]
        seen[start] = 1
        area, x0, y0, x1, y1 = 0, w, h, 0, 0
        while stack:
            p = stack.pop()
            y, x = divmod(p, w)
            area += 1
            if x < x0: x0 = x
            if x > x1: x1 = x
            if y < y0: y0 = y
            if y > y1: y1 = y
            for dy in (-1, 0, 1):
                yy = y + dy
                if yy < 0 or yy >= h:
                    continue
                for dx in (-1, 0, 1):
                    xx = x + dx
                    if xx < 0 or xx >= w:
                        continue
                    q = yy * w + xx
                    if mask[q] and not seen[q]:
                        seen[q] = 1
                        stack.append(q)
        out.append((area, x0, y0, x1 + 1, y1 + 1))
    return out


def main():
    im = Image.open(SHEET).convert('RGBA')
    w, h = im.size
    r, g, b, a = im.split()
    a = a.point(lambda v: 0 if v < DROP else min(255, v * 255 // SOLID))
    im = Image.merge('RGBA', (r, g, b, a))
    mask = a.point(lambda v: 1 if v else 0).tobytes()
    found = sorted(pieces(mask, w, h), reverse=True)[:5]
    if len(found) != 5 or found[4][0] < 20000:
        sys.exit('expected five pictures on the sheet, found %r' % (found,))
    found.sort(key=lambda p: p[1])   # left to right
    os.makedirs(OUT, exist_ok=True)
    for n, (area, x0, y0, x1, y1) in enumerate(found, 1):
        cut = im.crop((x0, y0, x1, y1))
        side = max(cut.size)
        k = SIZE * SHARE[n] / side
        dw, dh = max(1, round(cut.size[0] * k)), max(1, round(cut.size[1] * k))
        small = cut.convert('RGBa').resize((dw, dh), Image.LANCZOS).convert('RGBA')
        sq = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
        sq.alpha_composite(small, ((SIZE - dw) // 2, SIZE - dh))   # standing on the foot
        # a hard floor under the soft edge, so a 256-colour palette is not spent on near-nothing
        sa = sq.split()[3].point(lambda v: 0 if v < 24 else v)
        sq.putalpha(sa)
        pal = sq.quantize(colors=256, method=Image.FASTOCTREE, dither=Image.NONE).convert('RGBA')
        path = os.path.join(OUT, 'rank-%d.webp' % n)
        pal.save(path, 'WEBP', lossless=True, method=6)
        colours = len(pal.getcolors(SIZE * SIZE) or [])
        print('rank-%d.webp  %dx%d of the sheet -> %dx%d in %d, %d colours, %d bytes'
              % (n, x1 - x0, y1 - y0, dw, dh, SIZE, colours, os.path.getsize(path)))


if __name__ == '__main__':
    main()
