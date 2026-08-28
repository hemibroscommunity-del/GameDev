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

Everyone stands on ONE baseline, because that is how they stand in the town.
"""
from PIL import Image, ImageDraw, ImageFont
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
NPC = os.path.join(ROOT, 'public', 'sprites', 'npc')
PL  = os.path.join(ROOT, 'public', 'sprites', 'player')

NPC_SPRITE_SCALE = 120 / 256
PLAYER_SIZE_MULT = 1.25

FIGURES = [
    ('You',              os.path.join(PL,  'stand-south.png'),                 PLAYER_SIZE_MULT, True),
    ('Mayor Bro',        os.path.join(NPC, 'mayor-bro.webp'),                  1.10, False),
    ('Blacksmith Bro',   os.path.join(NPC, 'blacksmith-bro.webp'),             1.00, False),
    ('Storekeeper Bro',  os.path.join(NPC, 'storekeeper-bro.webp'),            1.00, False),
    ('Diego',            os.path.join(NPC, 'shopkeeper-bro-walk-south.webp'),  1.30, False),
    ('Lil Bro',          os.path.join(NPC, 'lil-bro-walk-south.webp'),         0.78, False),
]

def figure(path, mult, is_player):
    im = Image.open(path).convert('RGBA')
    W, H = im.size
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
    # the same scale the renderer applies, at 4x so the picture is legible
    k = NPC_SPRITE_SCALE * mult * 4
    if is_player:
        k = NPC_SPRITE_SCALE * mult * 4        # player uses the same 256 frame
    w = max(1, int(round(crop.width * k)))
    h = max(1, int(round(crop.height * k)))
    return crop.resize((w, h), Image.NEAREST), h, (bot - top + 1) * NPC_SPRITE_SCALE * mult

GAP, PAD, BASE = 34, 30, 120
figs = [(n,) + figure(p, m, ip) for n, p, m, ip in FIGURES]
Wtot = PAD * 2 + sum(f[1].width for f in figs) + GAP * (len(figs) - 1)
Htot = PAD + max(f[2] for f in figs) + BASE
img = Image.new('RGB', (Wtot, Htot), (26, 38, 43))
d = ImageDraw.Draw(img)
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 17)
    small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
except Exception:
    font = small = ImageFont.load_default()

ground = Htot - BASE
d.line([(0, ground), (Wtot, ground)], fill=(90, 112, 120), width=2)

x = PAD
tallest = max(f[3] for f in figs)
for name, im2, h, drawn in figs:
    img.paste(im2, (x, ground - h), im2)
    d.text((x, ground + 10), name, font=font, fill=(244, 240, 231))
    d.text((x, ground + 32), '%.0f px tall in game' % drawn, font=small, fill=(160, 176, 182))
    d.text((x, ground + 52), '%d%% of the tallest' % round(100 * drawn / tallest),
           font=small, fill=(160, 176, 182))
    x += im2.width + GAP

d.text((PAD, 8), 'Townsfolk beside the player, at the size the game draws them',
       font=font, fill=(244, 240, 231))
out = os.path.join(ROOT, 'tools', 'maps', 'out', 'npc-sizes.png')
os.makedirs(os.path.dirname(out), exist_ok=True)
img.save(out)
print('wrote', out, img.size)
for name, im2, h, drawn in figs:
    print('  %-18s %6.1f px' % (name, drawn))
