#!/usr/bin/env python3
"""v2.3.3500: THE TOUR'S TWO NEW TOWNSFOLK, AND ZOOM JUICE'S BOTTLE, until the
owner's own pictures arrive.

The tour (server/src/data.js QUEST_REWARDS tut_1's header) hands a new player
from Mayor Bro to the townsfolk, and two of its givers had nobody to stand in:
the Woodworker and the Feed & Seed.  docs/ART-WISHLIST.md "The keepers, sheet 1
of 2" already names them -- Woodworker Bro ("a lean man with a short beard and
sawdust in his hair, a canvas apron full of chisels") and Farmer Bro ("a
sunburnt farmer with a wide straw hat, blue denim overalls over a red plaid
shirt") -- so these are made under those names, the way tools/make_beastmaster.py
made Beastmaster Bro: from art the game already has, so they cost nothing new
to load and read as what they are at a glance:

  - Woodworker Bro: the unused shopkeeper figure (storekeeper-bro.webp, the
    Auction House's clerk, retired from the street in v2.3.2091), lean, in a
    cap and an apron: the apron recoloured canvas tan with its crowns taken
    out, the cap forest green, the jeans brown work trousers.  Mirrored, so he
    is plainly not the clerk in the Auction House's room.
  - Farmer Bro: Diego's figure (shopkeeper-bro-walk-south.webp, his first
    south frame), whose wide hat is the farmer's straw hat once it is straw:
    the hat straw yellow, the coat denim blue, the scarf red.  NOT mirrored
    (Beastmaster Bro is Diego mirrored), so the two do not stand alike.
  - Zoom Juice: the stamina bottle (potion-stamina.webp) in carrot orange.

The frame follows the NPC convention (src/rendering/systems/entityRenderer.js,
NPC_FRAME_FEET_Y): 256 x 256, the figure ~200 px tall, feet on y = 223, centred
on the frame by the head; the portrait is the head crop the dialogue shows
(96 x 96), from the same picture so the two never drift.

Run from the repo root (needs Pillow):
    python3 tools/make_tour_townsfolk.py
Writes public/sprites/npc/{woodworker,farmer}-bro{,-head}.webp and
public/icons/items/potion-zoom.webp.  Delete a figure's part when the owner's
own picture replaces it.
"""
import colorsys
import os

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
NPC = os.path.join(ROOT, 'public', 'sprites', 'npc')
ITEMS = os.path.join(ROOT, 'public', 'icons', 'items')
FRAME = 256


def hsv(px):
    r, g, b, a = px
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return h * 360, s, v, a


def rgb(hd, s, v, a):
    r, g, b = colorsys.hsv_to_rgb((hd % 360) / 360, max(0.0, min(1.0, s)), max(0.0, min(1.0, v)))
    return (int(round(r * 255)), int(round(g * 255)), int(round(b * 255)), a)


def centred(fig, rows):
    """Shift the figure so its head (rows) is in the frame's middle."""
    xs = [x for y in range(rows[0], rows[1]) for x in range(FRAME) if fig.getpixel((x, y))[3] > 128]
    shift = int(round(FRAME / 2 - (min(xs) + max(xs)) / 2)) if xs else 0
    out = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
    out.alpha_composite(fig, (shift, 0))
    return out, shift


def save_pair(out, name, head_box):
    path = os.path.join(NPC, name + '.webp')
    head_path = os.path.join(NPC, name + '-head.webp')
    out.save(path, 'WEBP', lossless=True, quality=100, method=6)
    head = out.crop(head_box).resize((96, 96), Image.LANCZOS)
    head.save(head_path, 'WEBP', lossless=True, quality=100, method=6)
    print('wrote', os.path.relpath(path, ROOT), os.path.getsize(path), 'bytes;',
          os.path.relpath(head_path, ROOT), os.path.getsize(head_path), 'bytes')


# ── Woodworker Bro ──────────────────────────────────────────────────────────
APRON_TOP = 98      # the apron's bib starts here (the shirt is above it)
APRON_BOTTOM = 166  # ...and its skirt ends here (the jeans are below it)
CAP_BOTTOM = 47     # the cap's crown is above this row
FEET_DROP = 23      # his boots end on row 199; the townsfolk's on 222


def woodworker():
    src = Image.open(os.path.join(NPC, 'storekeeper-bro.webp')).convert('RGBA')
    px = src.load()
    out = src.copy()
    op = out.load()
    for y in range(FRAME):
        for x in range(FRAME):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            hd, s, v, _ = hsv(px[x, y])
            dark = v < 0.16
            # the cap: its light crown and its blue side panels, above the hair
            if y < CAP_BOTTOM and not dark:
                if s < 0.25 and v > 0.55:            # the white crown
                    op[x, y] = rgb(118, 0.42, v * 0.72, a)
                elif 190 <= hd <= 260:               # the blue panels
                    op[x, y] = rgb(118, min(1, s * 0.9), v * 0.85, a)
                continue
            # the apron, bib to skirt: browns, and the gold crowns on it
            if APRON_TOP <= y <= APRON_BOTTOM and 76 <= x <= 160 and not dark:
                if (5 <= hd <= 62 and s >= 0.25) and v < 0.9:
                    # canvas: tan, with the leather's own light and shade kept;
                    # the gold crowns (the brightest of it) flattened into the
                    # cloth, so the clerk's shop mark is gone
                    vv = min(v, 0.5)
                    op[x, y] = rgb(36, 0.30 + (1 - vv) * 0.15, min(1, 0.42 + vv * 0.62), a)
                    continue
            # the jeans: blue -> brown work trousers
            if y >= 148 and 190 <= hd <= 260 and not dark:
                op[x, y] = rgb(26, min(1, s * 0.85 + 0.1), v * 0.82, a)
    # the clerk's picture ends at his boots (row 199) with a scrap of shadow
    # below them; the townsfolk stand on row 222 (NPC_FRAME_FEET_Y), so the
    # scrap goes and he is set down onto that line
    for y in range(205, FRAME):
        for x in range(FRAME):
            op[x, y] = (0, 0, 0, 0)
    out = out.transpose(Image.FLIP_LEFT_RIGHT)
    down = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
    down.alpha_composite(out, (0, FEET_DROP))
    out, shift = centred(down, (26 + FEET_DROP, 60 + FEET_DROP))
    save_pair(out, 'woodworker-bro', (73, 18 + FEET_DROP, 183, 128 + FEET_DROP))
    return shift


# ── Farmer Bro ──────────────────────────────────────────────────────────────
STRAW = 47      # the hat
DENIM = 214     # the coat
RED = 2         # the scarf


def farmer():
    src = Image.open(os.path.join(NPC, 'shopkeeper-bro-walk-south.webp')).convert('RGBA').crop((0, 0, FRAME, FRAME))
    px = src.load()
    out = src.copy()
    op = out.load()
    for y in range(FRAME):
        for x in range(FRAME):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            hd, s, v, _ = hsv(px[x, y])
            # the scarf: Diego's violet, under the chin
            if 250 <= hd <= 330 and s >= 0.45 and v > 0.15 and y < 175:
                op[x, y] = rgb(RED, min(1, s * 1.05), min(1, v * 1.2), a)
                continue
            # the wide hat: the browns above the face
            if y < 76 and (hd <= 45 or hd >= 345) and v > 0.08:
                op[x, y] = rgb(STRAW, min(1, 0.50 + s * 0.30), min(1, 0.36 + v * 1.30), a)
                continue
            # the coat: dark blue-violets and near-greys -> denim
            legs = y >= 165 and 76 <= x <= 150
            if (200 <= hd <= 345 or (legs and (hd >= 330 or hd <= 12))) and v < 0.55:
                op[x, y] = rgb(DENIM, 0.38 + s * 0.4, min(1, v * 1.55 + 0.08), a)
                continue
            if s < 0.18 and v < 0.45 and y >= 76:
                op[x, y] = rgb(DENIM, 0.34, min(1, v * 1.45 + 0.06), a)
    out, shift = centred(out, (30, 62))
    save_pair(out, 'farmer-bro', (73, 22, 183, 132))
    return shift


# ── Zoom Juice ──────────────────────────────────────────────────────────────
CARROT = 24     # the juice's orange


def zoom_juice():
    src = Image.open(os.path.join(ITEMS, 'potion-stamina.webp')).convert('RGBA')
    px = src.load()
    out = src.copy()
    op = out.load()
    W, H = src.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            hd, s, v, _ = hsv(px[x, y])
            # the yellow juice and its sparkles (the cork and the gold band are
            # browner and darker, and stay)
            if 40 <= hd <= 66 and s >= 0.35 and v >= 0.55:
                op[x, y] = rgb(CARROT, min(1, s * 1.08), v, a)
    path = os.path.join(ITEMS, 'potion-zoom.webp')
    out.save(path, 'WEBP', lossless=True, quality=100, method=6)
    print('wrote', os.path.relpath(path, ROOT), os.path.getsize(path), 'bytes')


if __name__ == '__main__':
    print('woodworker centred by', woodworker(), 'px')
    print('farmer centred by', farmer(), 'px')
    zoom_juice()
