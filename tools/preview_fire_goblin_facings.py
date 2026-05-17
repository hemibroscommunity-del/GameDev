"""Render compass-layout previews of the fire goblin's facing maps so
the user can see which direction each rendered facing actually points.

For each of WALK / HIT / ATTACK, samples frame 0 from the mapped source
sheet, applies the mirror flag as the renderer would (negative scale.x),
and arranges the 8 facings around the compass with N at top.

Output: tools/fire-goblin-facings-{walk,hit,attack}.png
"""
import os
from PIL import Image, ImageDraw, ImageFont

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES = os.path.join(REPO, 'public', 'sprites', 'monsters', 'fire-goblin')
OUT_DIR = os.path.join(REPO, 'tools')
FRAME_W = 256

# Mirror of the WALK_MAP / HIT_MAP / ATTACK_MAP in fireGoblinSprites.js
WALK_MAP = {
    'south':     ('s',  False),
    'southwest': ('sw', False),
    'west':      ('e',  True),
    'northwest': ('n',  False),
    'north':     ('n',  False),
    'northeast': ('e',  False),
    'east':      ('e',  False),
    'southeast': ('sw', True),
}
HIT_MAP = {
    'south':     ('s',  False),
    'southwest': ('sw', False),
    'west':      ('sw', False),
    'northwest': ('nw', False),
    'north':     ('n',  False),
    'northeast': ('nw', True),
    'east':      ('sw', True),
    'southeast': ('sw', True),
}
ATTACK_MAP = {
    'south':     ('s',  False),
    'southwest': ('sw', False),
    'west':      ('w',  False),
    'northwest': ('nw', False),
    'north':     ('n',  False),
    'northeast': ('nw', True),
    'east':      ('w',  True),
    'southeast': ('sw', True),
}

# 3x3 compass grid: (col, row) for each facing.  Center empty.
GRID = {
    'northwest': (0, 0), 'north':    (1, 0), 'northeast': (2, 0),
    'west':      (0, 1),                     'east':      (2, 1),
    'southwest': (0, 2), 'south':    (1, 2), 'southeast': (2, 2),
}

CELL = 192      # rendered sprite size per cell
PAD = 12        # padding inside each cell for label
LABEL_H = 28    # height reserved for the text label

def load_frame0(action, src):
    """Returns the first 256x256 frame of the source sheet, or a
    placeholder if the sheet doesn't exist."""
    path = os.path.join(SPRITES, f'{action}-{src}.png')
    if not os.path.exists(path):
        ph = Image.new('RGBA', (FRAME_W, FRAME_W), (60, 60, 60, 255))
        d = ImageDraw.Draw(ph)
        d.text((10, FRAME_W // 2 - 10), f'MISSING\n{action}-{src}.png', fill='white')
        return ph
    img = Image.open(path).convert('RGBA')
    return img.crop((0, 0, FRAME_W, FRAME_W))

def render_preview(map_, action):
    cw = CELL + PAD * 2
    ch = CELL + PAD * 2 + LABEL_H
    canvas = Image.new('RGBA', (cw * 3, ch * 3), (20, 22, 32, 255))
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype('arial.ttf', 16)
        font_small = ImageFont.truetype('arial.ttf', 11)
    except Exception:
        font = ImageFont.load_default()
        font_small = ImageFont.load_default()
    # Title at top center
    title = f'fire goblin -- {action.upper()} -- frame 0 of each mapped source'
    draw.text((10, 4), title, fill='#cfd2e0', font=font_small)
    for facing, (col, row) in GRID.items():
        src, mirror = map_[facing]
        frame = load_frame0(action, src)
        # Apply mirror as the renderer would
        if mirror:
            frame = frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        frame = frame.resize((CELL, CELL), Image.Resampling.LANCZOS)
        x = col * cw + PAD
        y = row * ch + PAD + LABEL_H
        canvas.paste(frame, (x, y), frame)
        # Label with facing + source
        label = f'{facing}  ({src}{" + mirror" if mirror else ""})'
        draw.text((col * cw + PAD, row * ch + 4), label, fill='#E8EAF8', font=font)
    return canvas

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for action, map_ in [('walk', WALK_MAP), ('hit', HIT_MAP), ('attack', ATTACK_MAP)]:
        out = os.path.join(OUT_DIR, f'fire-goblin-facings-{action}.png')
        render_preview(map_, action).save(out)
        print(f'WROTE {out}')

if __name__ == '__main__':
    main()
