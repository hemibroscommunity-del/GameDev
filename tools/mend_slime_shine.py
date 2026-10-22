#!/usr/bin/env python3
"""v2.3.3558: THE SLIME'S SHINE, WHOLE AGAIN.

The owner, looking at the Goo Grotto's giant slime: "There's actually a
transparent hole on the slime i don't think that came with the original art."
They were right.  The slime was cut off the near-white background of its
videos (assets/monster animations/slime-*.mp4) by COLOUR, and the pale mint
shine on its top-left -- about (221, 235, 202) in the video, solid -- was near
enough to white to go with it: its core became see-through (the palette's
background entry, index 0, (254, 254, 254) at alpha 0) and its rim partly
see-through (alpha 150-240).  A few pixels in a 128 px frame, unseen at a
slime's own size; drawn x4.6 as the boss, a hole you see the floor through.
The blue slime is the green one's picture recoloured (monsterRecolor.js keeps
every alpha), so both had it.

This fills it in the three LIVING sheets -- idle, shoot, hit.  The death burst
is left alone: it is cut by a strict key, and its gaps are a splash's.
  - A pixel that is not fully opaque, and is NOT reached from its frame's edge
    through other such pixels (8-connected), is inside the slime.  Every one
    of those on these sheets is in the shine (the outline's soft edge and the
    gaps round the drips all reach the edge).
  - One with some opacity keeps its own colour, made solid: the shine's rim.
  - A see-through one has no colour of its own (index 0 is the background's),
    so it takes the colour of its brightest solid neighbour, filled from the
    rim inward in rounds -- the shine is the brightest thing round it.
The sheets stay palette PNGs: a colour needed solid is added to the palette.
Nothing outside the slime changes, so its outline, its anchor rows
(slimeSprites.js SLIME_BASE_ROW / SLIME_TOP_ROW) and its hit box do not move.
A second run changes nothing.

Run from the repo root (needs Pillow):
    python3 tools/mend_slime_shine.py            # mend in place
    python3 tools/mend_slime_shine.py --check    # exit 1 if a hole is left
server/test/slime-boss.test.mjs section 9 asks the same question of the
shipped sheets, so a re-cut that brings the hole back fails CI.
"""
import os
import sys
from collections import deque

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MON = os.path.join(ROOT, 'public', 'sprites', 'monsters')
SHEETS = ['slime-idle-v5.png', 'slime-shoot-v2.png', 'slime-hit-v1.png']
FRAME = 128
NEAR8 = [(-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (0, 1), (1, 1)]


def lum(rgb):
    return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]


def inside_pixels(alpha, w, x0):
    """(x, y) of every not-fully-opaque pixel of the frame starting at column
    x0 that its edge cannot reach through other such pixels (8-connected)."""
    seen = set()
    q = deque()
    for i in range(FRAME):
        for (x, y) in ((i, 0), (i, FRAME - 1), (0, i), (FRAME - 1, i)):
            if alpha(x0 + x, y) < 255 and (x, y) not in seen:
                seen.add((x, y))
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in NEAR8:
            nx, ny = x + dx, y + dy
            if 0 <= nx < FRAME and 0 <= ny < FRAME and (nx, ny) not in seen and alpha(x0 + nx, ny) < 255:
                seen.add((nx, ny))
                q.append((nx, ny))
    return [(x, y) for y in range(FRAME) for x in range(FRAME)
            if alpha(x0 + x, y) < 255 and (x, y) not in seen]


def mend(path, write):
    im = Image.open(path)
    if im.mode != 'P':
        raise SystemExit(f'{path}: expected a palette PNG, got {im.mode}')
    w, h = im.size
    if h != FRAME or w % FRAME:
        raise SystemExit(f'{path}: expected a strip of {FRAME} px frames, got {w}x{h}')
    idx = bytearray(im.tobytes())
    # Pillow pads the palette to 256 entries; the picture uses the first n
    n = max(idx) + 1
    pal = im.getpalette()[:n * 3]
    trns = im.info.get('transparency', b'')
    if isinstance(trns, int):
        trns = bytes(255 if i != trns else 0 for i in range(n))
    trns = list(trns[:n]) + [255] * max(0, n - len(trns))

    def alpha(x, y):
        return trns[idx[y * w + x]]

    def rgb_of(k):
        return (pal[k * 3], pal[k * 3 + 1], pal[k * 3 + 2])

    solid = {}   # rgb -> an opaque palette index holding it
    for k in range(n):
        if trns[k] == 255:
            solid.setdefault(rgb_of(k), k)

    def solid_index(rgb):
        if rgb not in solid:
            if len(trns) >= 256:
                raise SystemExit(f'{path}: no room left in the palette for {rgb}')
            pal.extend(rgb)
            trns.append(255)
            solid[rgb] = len(trns) - 1
        return solid[rgb]

    total = 0
    for f in range(w // FRAME):
        x0 = f * FRAME
        holes = inside_pixels(alpha, w, x0)
        total += len(holes)
        if not write or not holes:
            continue
        clear = []
        for (x, y) in holes:
            k = idx[y * w + x0 + x]
            if trns[k] > 0:
                idx[y * w + x0 + x] = solid_index(rgb_of(k))   # the rim: its own colour, solid
            else:
                clear.append((x, y))
        # the see-through core, from the rim inward: each round, every hole
        # pixel with a solid neighbour takes its brightest one's colour
        left = set(clear)
        while left:
            round_ = []
            for (x, y) in sorted(left):
                best = None
                for dx, dy in NEAR8:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < FRAME and 0 <= ny < FRAME and (nx, ny) not in left and alpha(x0 + nx, ny) == 255:
                        c = rgb_of(idx[ny * w + x0 + nx])
                        if best is None or lum(c) > lum(best):
                            best = c
                if best is not None:
                    round_.append((x, y, best))
            if not round_:
                raise SystemExit(f'{path} frame {f}: a hole with no solid pixel round it')
            for (x, y, c) in round_:
                idx[y * w + x0 + x] = solid_index(c)
                left.discard((x, y))

    if write and total:
        out = Image.frombytes('P', (w, h), bytes(idx))
        out.putpalette(pal)
        out.save(path, transparency=bytes(trns), optimize=True)
    return total


def main():
    check = '--check' in sys.argv[1:]
    left = 0
    for name in SHEETS:
        path = os.path.join(MON, name)
        n = mend(path, write=not check)
        left += n if check else 0
        print(f'{name}: {n} pixel(s) inside the slime were see-through' + ('' if check else (' -- filled' if n else '')))
    if check and left:
        sys.exit(1)


if __name__ == '__main__':
    main()
