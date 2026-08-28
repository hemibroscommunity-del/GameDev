#!/usr/bin/env python3
"""Every townsperson beside the player, at the size the game draws them.

Owner: "Check sizes of NPCs."

An NPC's on-screen height is NPC_SPRITE_SCALE (120/256) times a per-sprite
NPC_SCALE_MULT (entityRenderer.js).  The player's is PLAYER_SIZE_MULT (1.25)
times whatever its build scale says, so a default character is the reference
everyone else should read against.

The import convention normalises EVERY npc figure to the same 200px band
between hat and feet (tools/import_npc_walk.py), which is why the mult is a
pure height scale -- and why a character with a TALL HAT gets a shorter body
at the same nominal height.  That is the thing this picture is for: the
numbers alone say Diego is 27% taller than the blacksmith, and only a picture
says whether that is a broad man in a coat or a giant.

Everyone stands on ONE baseline, because that is how they stand in the town,
and each figure carries a red SHOULDER line -- the landmark that survives a
hat, and the one the v2.3.2081 size pass was levelled against.

    node/python3 tools/dev/npc-sizes.py            # what ships now
    python3 tools/dev/npc-sizes.py before          # what shipped before it
"""
from PIL import Image, ImageDraw, ImageFont
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
NPC = os.path.join(ROOT, 'public', 'sprites', 'npc')
PL  = os.path.join(ROOT, 'public', 'sprites', 'player')

NPC_SPRITE_SCALE = 120 / 256
PLAYER_SIZE_MULT = 1.25

# The mults MUST match NPC_SCALE_MULT in src/rendering/systems/entityRenderer.js;
# `before` is what shipped ahead of the v2.3.2081 size pass, so one run draws
# both halves of the comparison.  SHOULDER is the fraction of the figure's
# height that sits BELOW the shoulder line, read off tools/maps/out/
# npc-hatruler.png (every figure at a common height under a percent ruler).
# It is the landmark that matters: the import convention normalises everyone
# hat-to-feet into one 200px band, so a tall hat is paid for out of the body
# and total height flatters whoever is wearing the biggest one.
FIGURES = [
    #  name              sprite                                    before  now   shoulder player
    ('You',              os.path.join(PL,  'stand-south.png'),      1.25,  1.25,  0.72,  True),
    ('Mayor Bro',        os.path.join(NPC, 'mayor-bro.webp'),       1.10,  1.254, 0.63,  False),
    ('Blacksmith Bro',   os.path.join(NPC, 'blacksmith-bro.webp'),  1.00,  1.14,  0.68,  False),
    ('Storekeeper Bro',  os.path.join(NPC, 'storekeeper-bro.webp'), 1.00,  1.22,  0.64,  False),
    ('Diego',            os.path.join(NPC, 'shopkeeper-bro-walk-south.webp'),
                                                                   1.30,  1.30,  0.58,  False),
    ('Lil Bro',          os.path.join(NPC, 'lil-bro-walk-south.webp'),
                                                                   0.78,  0.78,  0.66,  False),
]

def figure(path, mult):
    """The figure as the game draws it, cropped to its ink, at 4x for legibility."""
    im = Image.open(path).convert('RGBA')
    H = im.size[1]
    im = im.crop((0, 0, H, H))                 # first frame of a strip
    a = im.getchannel('A').load()
    rows = []
    for y in range(H):
        xs = [x for x in range(H) if a[x, y] > 24]
        rows.append((min(xs), max(xs)) if xs else None)
    ys = [y for y, r in enumerate(rows) if r]
    top, bot = ys[0], ys[-1]
    xs0 = min(r[0] for r in rows if r); xs1 = max(r[1] for r in rows if r)
    crop = im.crop((xs0, top, xs1 + 1, bot + 1))
    k = NPC_SPRITE_SCALE * mult * 4            # player and NPCs share the 256 frame
    tile = crop.resize((max(1, round(crop.width * k)), max(1, round(crop.height * k))),
                       Image.NEAREST)
    return tile, (bot - top + 1) * NPC_SPRITE_SCALE * mult


WHICH = 2 if (len(sys.argv) > 1 and sys.argv[1] == 'before') else 3
TITLE = ('Townsfolk beside the player, BEFORE the v2.3.2081 size pass'
         if WHICH == 2 else
         'Townsfolk beside the player, at the size the game draws them')
OUT = 'npc-sizes-before.png' if WHICH == 2 else 'npc-sizes.png'

figs = []
for name, path, before, now, shoulder, _is_player in FIGURES:
    tile, drawn = figure(path, (before, now)[WHICH - 2])
    figs.append((name, tile, drawn, drawn * shoulder))

GAP, PAD, BASE = 34, 30, 150
Wtot = PAD * 2 + sum(f[1].width for f in figs) + GAP * (len(figs) - 1)
Htot = PAD + max(f[1].height for f in figs) + BASE
img = Image.new('RGB', (Wtot, Htot), (26, 38, 43))
d = ImageDraw.Draw(img)
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 17)
    small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
except Exception:
    font = small = ImageFont.load_default()

ground = Htot - BASE
d.line([(0, ground), (Wtot, ground)], fill=(90, 112, 120), width=2)

# The shoulder line across the whole picture is the point: it is the landmark
# a player reads, and hats are what the totals get wrong.
for _n, _t, _dh, sh in figs:
    pass
x = PAD
tallest = max(f[2] for f in figs)
for name, tile, drawn, sh in figs:
    img.paste(tile, (x, ground - tile.height), tile)
    y = ground - int(round(sh * 4))
    d.line([(x - 6, y), (x + tile.width + 6, y)], fill=(214, 96, 88), width=2)
    d.text((x, ground + 10), name, font=font, fill=(244, 240, 231))
    d.text((x, ground + 32), '%.0f px tall' % drawn, font=small, fill=(160, 176, 182))
    d.text((x, ground + 52), 'shoulder %.0f px' % sh, font=small, fill=(214, 148, 142))
    d.text((x, ground + 72), '%d%% of the tallest' % round(100 * drawn / tallest),
           font=small, fill=(160, 176, 182))
    x += tile.width + GAP

d.text((PAD, 8), TITLE, font=font, fill=(244, 240, 231))
d.text((Wtot - 330, 8), 'red line = the shoulder', font=small, fill=(214, 148, 142))
out = os.path.join(ROOT, 'tools', 'maps', 'out', OUT)
os.makedirs(os.path.dirname(out), exist_ok=True)
img.save(out)
print('wrote', out, img.size)
for name, tile, drawn, sh in figs:
    print('  %-18s %6.1f px tall   shoulder %5.1f px' % (name, drawn, sh))
