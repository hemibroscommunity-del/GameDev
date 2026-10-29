#!/usr/bin/env python3
"""v2.3.3779: the Town Hall board's own tile pictures (public/icons/board/).

The owner, 2026-10-28: "use better icons for each one".  Each dungeon's tile
is its boss, the Arena's its gate, cut small from the game's own art
(src/data/townBoard.js names the rest, which the game already has):
  goo-grotto    the slime, recoloured blue as the Goo Grotto's are;
  great-cave    the rock monster in the Amethyst Golem's tint (0xc8a0ff);
  foundry-dome  the slime in the Storm Slime's tint (0x60c0ff);
  buried-city   the mummy in the Gilded Mummy's tint (0xffd27a);
  arena         lane E's arena gate (public/world/arena/gate.png).
96 px high (a 3x phone draws a 30 px tile), palette PNGs of 255 colours or
fewer (the memory law, CLAUDE.md §7).  Run from the repository's root:
  python3 tools/ui/bake-board-icons.py
"""
from PIL import Image

OUT = 'public/icons/board/'


def frame(path, fw, fh, idx=0):
    im = Image.open(path).convert('RGBA')
    cols = im.width // fw
    return im.crop(((idx % cols) * fw, (idx // cols) * fh, (idx % cols) * fw + fw, (idx // cols) * fh + fh))


def retint(im, rgb):
    """recolour by brightness (a slime's whole body one new colour)"""
    px = im.load()
    w, h = im.size
    s = n = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 30:
                s += 0.299 * r + 0.587 * g + 0.114 * b
                n += 1
    ref = max(1, (s / n) * 1.15)
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 30:
                k = (0.299 * r + 0.587 * g + 0.114 * b) / ref
                px[x, y] = (min(255, round(rgb[0] * k)), min(255, round(rgb[1] * k)), min(255, round(rgb[2] * k)), a)
    return im


def tint(im, hexc):
    """a stage tint, multiplied as the renderer's sprite tint is"""
    tr, tg, tb = (hexc >> 16) & 255, (hexc >> 8) & 255, hexc & 255
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            px[x, y] = (r * tr // 255, g * tg // 255, b * tb // 255, a)
    return im


def finish(im, name, size=96, square=True):
    im = im.crop(im.getbbox())
    if square:
        s = max(im.size)
        c = Image.new('RGBA', (s, s), (0, 0, 0, 0))
        c.paste(im, ((s - im.width) // 2, (s - im.height) // 2))
        c = c.resize((size, size), Image.LANCZOS)
    else:
        c = im.resize((round(im.width * size / im.height), size), Image.LANCZOS)
    q = c.quantize(colors=255, method=Image.Quantize.FASTOCTREE)
    q.save(OUT + name + '.png', optimize=True)
    print(name, q.size, len(q.getcolors(256) or []), 'colours')


finish(retint(frame('public/sprites/monsters/slime-idle-v5.png', 128, 128), (58, 122, 208)), 'goo-grotto')
finish(tint(frame('public/sprites/monsters/rockmonster/walk-south.png', 256, 256), 0xc8a0ff), 'great-cave')
finish(tint(frame('public/sprites/monsters/slime-idle-v5.png', 128, 128), 0x60c0ff), 'foundry-dome')
finish(tint(frame('public/sprites/monsters/mummy/walk-s.png', 256, 256), 0xffd27a), 'buried-city')
finish(Image.open('public/world/arena/gate.png').convert('RGBA'), 'arena', square=False)
