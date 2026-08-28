#!/usr/bin/env python3
"""v2.3.2044: slice the owner's magenta shopkeeper walk sheet.

WHY NOT process_magenta_sheet.py.  That slicer normalises every cell to its
OWN content box with a margin, which is right for icons and fatally wrong for
a walk cycle: each frame would be re-centred on its own silhouette, so the
figure would jitter around a fixed point instead of walking.  The frames here
are cropped to ONE bounding box shared by all 32, so whatever alignment the
artist drew is the alignment that ships.

The magenta key and despill are the same idea as that script (a global chroma
key, then a pass that pulls the magenta cast out of the edge pixels the key
kept).  This sheet needs the despill more than an icon does: it arrives
resampled -- 887x1774, so cells land on 221.75px -- and the key colour is not
a clean #FF00FF but a spread around (249,2,249), which is exactly the profile
that leaves a magenta rim on every outline if you threshold and stop.

Cell edges are computed with round(i*W/cols) rather than a fixed cell width,
so the columns tile the sheet exactly instead of accumulating a 0.75px error
across four frames and clipping the last one.

Output: one horizontal 4-frame strip per direction row, which is the shape
playerSprites already loads for the player's own poses.
"""
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'npc-source', 'shopkeeper-walk.png')
OUT_DIR = os.path.join(ROOT, 'public', 'sprites', 'npc')
COLS, ROWS = 4, 8
# ── THE FRAME CONVENTION IS THE GAME'S, NOT THIS SCRIPT'S ──
# entityRenderer places every NPC with anchor (0.5, NPC_FRAME_FEET_Y/256) and
# derives the label headroom from (FEET_Y - TOP_Y), i.e. it assumes a 256px
# frame with the figure's feet on y=223 and its hat on y=23. Emitting to that
# same convention means a walking NPC needs NO renderer special case: the
# anchor, the scale, the figure height and the name/marker placement all work
# out unchanged. The first cut of this script wrote 128px frames with the
# figure filling them, which would have forced a per-NPC scale multiplier and a
# second anchor rule -- carrying an art decision into the renderer forever.
FRAME = 256
FEET_Y = 223           # must match entityRenderer NPC_FRAME_FEET_Y
TOP_Y = 23             # must match entityRenderer NPC_FRAME_TOP_Y

# ── ROW -> DIRECTION, READ OFF THE ART RATHER THAN ASSUMED ──
# Guessing this wrong is a bug nobody spots in code review and everybody spots
# in play (the shopkeeper moonwalks), so it was measured three ways and all
# three agree on the standard clockwise-from-south ordering:
#
#   1. Row 0 and row 4 are each their OWN mirror image (12.5 and 9.5 mean
#      absolute difference against themselves flipped, versus 14-16 for the
#      rows that are not symmetric). Only the toward-camera and away-camera
#      poses can be symmetric, so those two are south and north.
#   2. Rows 2 and 6 are each other's best mirror match (11.3, agreeing in both
#      directions), which makes them the west/east pair.
#   3. Skin pixels in the head band sit LEFT of the head centre on rows 1 and 2
#      and RIGHT on rows 5, 6 and 7 -- so rows 1-2 face left (SW, W) and rows
#      5-7 face right (NE, E, SE), which is the same ordering again.
#
# All eight are emitted rather than mirroring three of them at render time:
# the art exists, and a mirrored coat hangs off the wrong shoulder.
DIRS = ['south', 'southwest', 'west', 'northwest',
        'north', 'northeast', 'east', 'southeast']


def is_magenta(px):
    r, g, b = px[0], px[1], px[2]
    return r > 120 and b > 120 and g < min(r, b) * 0.62


def despill(px):
    """Pull the magenta cast out of a kept pixel: clamp red and blue toward
    green, which is what the key left behind on every anti-aliased edge."""
    r, g, b = px[0], px[1], px[2], 
    if r > g and b > g:
        cast = min(r, b) - g
        if cast > 0:
            k = min(1.0, cast / 90.0)
            r = int(r - cast * 0.85 * k)
            b = int(b - cast * 0.85 * k)
    return (max(0, r), g, max(0, b), px[3])


def key_out(im):
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            if is_magenta(p):
                px[x, y] = (0, 0, 0, 0)
            else:
                px[x, y] = despill(p)
    return im


def main():
    im = Image.open(SRC).convert('RGBA')
    im = key_out(im)
    W, H = im.size
    xs = [round(i * W / COLS) for i in range(COLS + 1)]
    ys = [round(i * H / ROWS) for i in range(ROWS + 1)]

    cells = []
    for r in range(ROWS):
        row = []
        for c in range(COLS):
            row.append(im.crop((xs[c], ys[r], xs[c + 1], ys[r + 1])))
        cells.append(row)

    # ONE bounding box across every frame -- see the module note.
    box = None
    for row in cells:
        for cell in row:
            b = cell.getbbox()
            if not b:
                continue
            box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]),
                                         max(box[2], b[2]), max(box[3], b[3]))
    if box is None:
        print('nothing survived the key -- check is_magenta()', file=sys.stderr)
        return 1
    print('shared bbox', box, 'of cell', cells[0][0].size)

    os.makedirs(OUT_DIR, exist_ok=True)
    bw, bh = box[2] - box[0], box[3] - box[1]
    # Fit the figure to the 200px the convention allows between hat and feet,
    # then place it so the feet land exactly on FEET_Y. Height drives the scale
    # (a wide walk frame must not be squashed to fit); width is centred.
    fig_h = FEET_Y - TOP_Y
    scale = fig_h / bh
    tw, th = max(1, int(round(bw * scale))), max(1, int(round(bh * scale)))
    ox, oy = (FRAME - tw) // 2, FEET_Y - th

    # A labelled contact sheet, so the row -> direction mapping is READ off the
    # art rather than guessed. Written first and on every run.
    print(f'figure {tw}x{th} placed at x={ox} y={oy} in a {FRAME}px frame '
          f'(feet on {FEET_Y})')
    contact = Image.new('RGBA', (FRAME * COLS, FRAME * ROWS), (30, 40, 46, 255))
    strips = []
    for r, row in enumerate(cells):
        strip = Image.new('RGBA', (FRAME * COLS, FRAME), (0, 0, 0, 0))
        for c, cell in enumerate(row):
            fr = cell.crop(box).resize((tw, th), Image.LANCZOS)
            strip.alpha_composite(fr, (c * FRAME + ox, oy))
            contact.alpha_composite(fr, (c * FRAME + ox, r * FRAME + oy))
        strips.append(strip)
    contact.convert('RGB').save(os.path.join(ROOT, 'tools', 'npc-contact.png'))
    print('contact sheet -> tools/npc-contact.png (rows top to bottom = 0..7)')

    # ── THE DIALOGUE PORTRAIT, CROPPED FROM HIS OWN SOUTH FRAME ──
    # Same reasoning as Mayor Bro's (gameDisplay.js NPC_DATA): a portrait drawn
    # from the same art as the figure cannot drift from the man walking around
    # the street. There is a shipped storekeeper-bro-head.webp, but it is a
    # DIFFERENT character -- using it would put one face in the dialogue and
    # another in the town.
    head_src = strips[0].crop((0, 0, FRAME, FRAME))          # south, frame 0
    hb = head_src.getbbox()
    fig_top, fig_bot = hb[1], hb[3]
    # CENTRED ON THE FACE, not on a fixed fraction of the figure. A band from
    # the top produced a portrait that was almost entirely HAT -- his brim is
    # as wide as his shoulders, so it dominates any crop anchored to the
    # silhouette. The skin pixels are where his face actually is, so the box is
    # placed on their centroid and sized to the head rather than to the figure.
    px = head_src.load()
    sx, sy, n = 0, 0, 0
    for y in range(fig_top, fig_top + int((fig_bot - fig_top) * 0.55)):
        for x in range(hb[0], hb[2]):
            r, g, b, a = px[x, y]
            if a > 128 and r > 150 and 90 < g < 200 and b < 160 and r - b > 45:
                sx += x; sy += y; n += 1
    if n:
        cx, cy = sx / n, sy / n
    else:                       # no skin found: fall back to the old band
        cx, cy = (hb[0] + hb[2]) / 2, fig_top + (fig_bot - fig_top) * 0.2
    side = int((fig_bot - fig_top) * 0.42)
    # Lifted slightly above the face centroid so the hat still reads -- he is a
    # man in a very large hat and cropping it off loses the character.
    top = max(0, int(cy - side * 0.62))
    left = max(0, int(cx - side / 2))
    sq = head_src.crop((left, top, left + side, top + side))
    sq = sq.resize((96, 96), Image.LANCZOS)                   # chip size, as Mayor Bro's
    hp = os.path.join(OUT_DIR, 'shopkeeper-bro-head.webp')
    sq.save(hp, 'WEBP', lossless=True, quality=100)
    print('wrote', os.path.relpath(hp, ROOT))

    for d, strip in zip(DIRS, strips):
        out = os.path.join(OUT_DIR, f'shopkeeper-bro-walk-{d}.webp')
        strip.save(out, 'WEBP', lossless=True, quality=100)
        print('wrote', os.path.relpath(out, ROOT))
    return strips, (tw, th)


if __name__ == '__main__':
    r = main()
    sys.exit(0 if r else 1)
