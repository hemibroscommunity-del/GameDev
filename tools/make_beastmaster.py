#!/usr/bin/env python3
"""v2.3.3121: BEASTMASTER BRO'S PICTURE, until the owner's own arrives.

Plan: docs/PET-TRAPPING-PLAN.md, Phase 2 -- "A Beastmaster beside the
Woodworker with a short quest line the server checks ... The NPC and his art."
Every townsperson's picture so far is the owner's (made with ChatGPT and sent
in chat); the prompt for his is in docs/ART-WISHLIST.md.  Until it comes he is
made here from art the game already has, so he costs nothing new to load and
reads as what he is at a glance:

  - Diego's figure (public/sprites/npc/shopkeeper-bro-walk-south.webp, his
    first south frame): the wide hat, long coat and satchel already say
    "trapper".  MIRRORED, so the satchel hangs on his other side, and
    recoloured -- the coat and trousers moss green, the scarf the Beastmaster's
    Lodge orange (src/data/gameSystems.js SKILL_GUILDS.trapping, #f97316) --
    so he is plainly not Diego standing at the wrong shop;
  - centred on the frame by his hat (Diego's art stands ~22 px right of the
    frame's middle, and an NPC is anchored at the middle: the name plate and
    the quest badge would sit off his head);
  - a Snowling at his side, from the pet sheet (public/sprites/pets/
    pet-sheet.png, the snowman row's first front frame), so the man who
    teaches trapping has a pet of his own.

The frame follows the NPC convention (src/rendering/systems/entityRenderer.js,
NPC_FRAME_FEET_Y): 256 x 256, the figure ~200 px tall, feet on y = 223.  The
portrait is the head crop the dialogue shows (96 x 96), like every other
townsperson's -- from the same picture, so the two can never drift.

Run from the repo root (needs Pillow):
    python3 tools/make_beastmaster.py
Writes public/sprites/npc/beastmaster-bro.webp and beastmaster-bro-head.webp.
Delete this tool when the owner's own picture replaces them.
"""
import colorsys
import os

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
NPC = os.path.join(ROOT, 'public', 'sprites', 'npc')
SRC = os.path.join(NPC, 'shopkeeper-bro-walk-south.webp')
PETS = os.path.join(ROOT, 'public', 'sprites', 'pets', 'pet-sheet.png')
OUT = os.path.join(NPC, 'beastmaster-bro.webp')
OUT_HEAD = os.path.join(NPC, 'beastmaster-bro-head.webp')

FRAME = 256
FEET_Y = 223          # NPC_FRAME_FEET_Y
GREEN = 105 / 360     # the coat
ORANGE = 22 / 360     # the scarf (the Lodge's orange, a little deeper)
PET_ROW = 0           # the pet sheet's snowman row (src/data/petSheet.js)
PET_CELL = 64
PET_K = 1.2           # the pet beside him: about half his height, as a pet beside a player
PET_X = 200           # where its feet stand, east of his


def hsv_rgb(h, s, v, a):
    r, g, b = colorsys.hsv_to_rgb(h, max(0.0, min(1.0, s)), max(0.0, min(1.0, v)))
    return (int(r * 255), int(g * 255), int(b * 255), a)


def recolour(im):
    """Diego's coat (dark blue-violets and near-greys) -> moss green, his
    violet scarf -> orange.  The browns (hat, satchel, boots) and the skin are
    untouched: their hues are 0-40 degrees, outside every band here, except
    the trousers' darkest reds, caught only below the belt and between the
    hands."""
    px = im.load()
    out = im.copy()
    op = out.load()
    for y in range(FRAME):
        for x in range(FRAME):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            hd = h * 360
            if 250 <= hd <= 330 and s >= 0.45 and v > 0.15 and y < 175:
                op[x, y] = hsv_rgb(ORANGE, s * 1.05, v * 1.25, a)
                continue
            legs = y >= 165 and 76 <= x <= 150
            if (200 <= hd <= 345 or (legs and (hd >= 330 or hd <= 12))) and v < 0.55:
                op[x, y] = hsv_rgb(GREEN, 0.30 + s * 0.6, v * 1.18 + 0.02, a)
                continue
            if s < 0.18 and v < 0.45:
                op[x, y] = hsv_rgb(GREEN, 0.28, v * 1.12 + 0.02, a)
    return out


def main():
    src = Image.open(SRC).convert('RGBA').crop((0, 0, FRAME, FRAME))
    src = src.transpose(Image.FLIP_LEFT_RIGHT)
    fig = recolour(src)
    # centre him on the frame by his hat (rows 30-61)
    xs = [x for y in range(30, 62) for x in range(FRAME) if fig.getpixel((x, y))[3] > 128]
    shift = int(round(FRAME / 2 - (min(xs) + max(xs)) / 2))
    out = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
    out.alpha_composite(fig, (shift, 0))
    # his Snowling, feet on his baseline
    sheet = Image.open(PETS).convert('RGBA')
    cell = sheet.crop((0, PET_ROW * PET_CELL, PET_CELL, PET_ROW * PET_CELL + PET_CELL))
    pet = cell.resize((int(PET_CELL * PET_K), int(PET_CELL * PET_K)), Image.LANCZOS)
    out.alpha_composite(pet, (PET_X - pet.width // 2, FEET_Y + 1 - pet.height))
    out.save(OUT, 'WEBP', lossless=True, quality=100, method=6)
    # the dialogue's head: the hat and face, square
    head = out.crop((73, 22, 183, 132)).resize((96, 96), Image.LANCZOS)
    head.save(OUT_HEAD, 'WEBP', lossless=True, quality=100, method=6)
    print('wrote', os.path.relpath(OUT, ROOT), os.path.getsize(OUT), 'bytes;',
          os.path.relpath(OUT_HEAD, ROOT), os.path.getsize(OUT_HEAD), 'bytes; centred by', shift, 'px')


if __name__ == '__main__':
    main()
