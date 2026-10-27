#!/usr/bin/env python3
"""v2.3.3640: TAKE THE GREY FILL OUT OF THE SWORD SWING'S BODY SHEETS.

The owner, 2026-10-27: "check all the animations for ghost remnants of either a
body beneath or areas for cleanup".  mp-ghostaudit photographed every frame of
a bro in colours nothing else wears (blue boots among them), and the sword's
swing showed blue shapes no other pose had: a triangle between the legs, a
wedge behind the arms, a bar at the hip.

WHERE THEY CAME FROM.  The swing is a stand-in drawn in layers (effectsRenderer
_updateSwordSwing): the recoloured BODY sheet (sword-<dir>-body.png, or
-torso.png while running), the armour and shirt, then the WEAPON strip.  The
body sheets were made from the original art (sword-<dir>.png, the sword in key
colours) -- and somewhere along the way the gaps the original leaves EMPTY, the
space between the legs and round the blade, were filled with flat mid-grey.
v2.3.2988 (clean-sword-ghosts.py) scrubbed what the erased sword left INSIDE
its own footprint; this fill lies outside it, where the original drew nothing.

Mid-grey is exactly what the recolour takes for a boot (playerSkins
recolorBodyToCanvas: a flat grey 45-139), so the fill is painted the player's
BOOT colour: a white, red or blue shape between the legs of anyone who picked
those boots, and a dark grey one in the default -- 900 to 2,700 px a sheet.

WHICH PIXELS GO.  Every pixel of a body or torso sheet that the original
leaves empty (alpha 40 or less) AND that lies outside the figure: reached from
the frame's edge through pixels the original leaves empty or fills with the
key-coloured sword (the sword is not the figure).  An empty pixel the figure
closes in is a pinhole that v2.3.2144's pinhole fill deliberately filled, and
it stays.  A pixel is either kept exactly or made fully transparent, so the
recolour sees exactly the pixels it saw before, minus the fill (the rule
clean-sword-ghosts.py set).  The bow's sheets were checked the same way: they
match their originals, nothing to take.

  python3 tools/art/clean-sword-fill.py           write the cleaned PNGs
  python3 tools/art/clean-sword-fill.py --check   report only

Writes IHDR/IDAT/IEND only (no gAMA: a browser could shift the exact RGB the
recolour reads).  Commit only the .png: the client prefers the .webp twin, and
CI's optimize-assets mints it from the new PNG on the push and proves it pixel
for pixel (precheck refuses a hand-made one) -- merge once its commit lands.
"""
import sys
from collections import deque

from PIL import Image

REPO = 'public/sprites/player/'
FRAMES = {'south': 14, 'east': 11, 'north': 9}   # frames per strip
SHEETS = ('body', 'torso')
EMPTY_A = 40


def is_key(r, g, b, a):
    """the original's sword: a magenta blade, a cyan guard, and their blends"""
    return a > EMPTY_A and ((r > 150 and b > 150 and g < 110) or (g > 150 and b > 150 and r < 110))


def outside(full, n):
    """per frame, the pixels reached from the frame's edge through the
    original's empty or key-coloured pixels"""
    W, H = full.size
    fp = full.load()
    passable = bytearray(W * H)
    for y in range(H):
        for x in range(W):
            r, g, b, a = fp[x, y]
            if a <= EMPTY_A or is_key(r, g, b, a):
                passable[y * W + x] = 1
    out = bytearray(W * H)
    fw = W // n
    for f in range(n):
        x0, x1 = f * fw, min(W, f * fw + fw)
        q = deque()

        def seed(x, y):
            p = y * W + x
            if passable[p] and not out[p]:
                out[p] = 1
                q.append(p)
        for x in range(x0, x1):
            seed(x, 0)
            seed(x, H - 1)
        for y in range(H):
            seed(x0, y)
            seed(x1 - 1, y)
        while q:
            p = q.popleft()
            x, y = p % W, p // W
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if x0 <= nx < x1 and 0 <= ny < H:
                    t = ny * W + nx
                    if passable[t] and not out[t]:
                        out[t] = 1
                        q.append(t)
    return out


def main():
    check = '--check' in sys.argv
    total = 0
    for d, n in FRAMES.items():
        full = Image.open(f'{REPO}sword-{d}.png').convert('RGBA')
        W, H = full.size
        fp = full.load()
        out = outside(full, n)
        for sheet in SHEETS:
            path = f'{REPO}sword-{d}-{sheet}.png'
            img = Image.open(path)
            assert img.mode == 'RGBA' and img.size == (W, H), (path, img.mode, img.size)
            px = img.load()
            gone = kept = 0
            for y in range(H):
                for x in range(W):
                    if px[x, y][3] == 0 or fp[x, y][3] > EMPTY_A:
                        continue
                    if out[y * W + x]:
                        px[x, y] = (0, 0, 0, 0)
                        gone += 1
                    else:
                        kept += 1
            total += gone
            print(f'{path}: {gone} px of fill go, {kept} enclosed (pinhole fills) stay')
            if gone and not check:
                img.save(path, format='PNG', optimize=False)
    print(('would take ' if check else 'took ') + f'{total} px')


if __name__ == '__main__':
    main()
