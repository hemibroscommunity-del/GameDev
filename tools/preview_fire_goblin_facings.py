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
    'southwest': ('e',  False),
    'west':      ('sw', False),
    'northwest': ('sw', False),
    'north':     ('n',  False),
    'northeast': ('sw', True),
    'east':      ('sw', True),
    'southeast': ('e',  True),
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

CELL = 240      # rendered sprite size per cell
PAD = 14        # padding inside each cell for label
LABEL_H = 34    # height reserved for the text label
TITLE_H = 40    # title row above the compass grid

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
    canvas_w = cw * 3
    canvas_h = TITLE_H + ch * 3
    canvas = Image.new('RGBA', (canvas_w, canvas_h), (20, 22, 32, 255))
    draw = ImageDraw.Draw(canvas)
    try:
        font_title = ImageFont.truetype('arial.ttf', 20)
        font = ImageFont.truetype('arial.ttf', 18)
    except Exception:
        font_title = ImageFont.load_default()
        font = ImageFont.load_default()
    # Title row above the grid
    title = f'Fire goblin facings -- {action.upper()} (frame 0 of each mapped source)'
    draw.text((PAD, 10), title, fill='#cfd2e0', font=font_title)
    for facing, (col, row) in GRID.items():
        src, mirror = map_[facing]
        frame = load_frame0(action, src)
        if mirror:
            frame = frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        frame = frame.resize((CELL, CELL), Image.Resampling.LANCZOS)
        cell_x = col * cw
        cell_y = TITLE_H + row * ch
        # Faint cell border so each direction visually separates
        draw.rectangle([cell_x + 2, cell_y + 2, cell_x + cw - 2, cell_y + ch - 2],
                       outline=(50, 55, 75), width=1)
        # Sprite
        canvas.paste(frame, (cell_x + PAD, cell_y + PAD + LABEL_H), frame)
        # Label centered above sprite
        label = f'{facing}  ({src}{" + mirror" if mirror else ""})'
        draw.text((cell_x + PAD, cell_y + PAD), label, fill='#E8EAF8', font=font)
    return canvas

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for action, map_ in [('walk', WALK_MAP), ('hit', HIT_MAP), ('attack', ATTACK_MAP)]:
        out = os.path.join(OUT_DIR, f'fire-goblin-facings-{action}.png')
        render_preview(map_, action).save(out)
        print(f'WROTE {out}')

if __name__ == '__main__':
    main()
