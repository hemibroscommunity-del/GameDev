#!/usr/bin/env python3
"""v2.3.3576: lay the townsfolk's photographs into their 256 px cells.

tools/qa/npc-looks.mjs --bake photographs each townsperson (a bro in his
character-creator look, drawn by the game) and calls this with
    raw/      the frames, meta.json saying what each is and where the
              figure's own origin (its body cell's middle) lies in it
    out/      public/sprites/npc/, where the pictures go
    preview/  where a contact sheet of everything written goes

Every frame goes into a 256 x 256 cell the way the townsfolk's pictures have
always been laid out (entityRenderer NPC_FRAME_FEET_Y): the standing figure's
soles on row 222 (its paint's bottom edge at y = 223), the figure's origin on
the cell's middle column.  A walker's jog frames sit at the SAME origin as his
stand that way, so his stride bobs as a player's does.

A standing townsperson: <still>.webp, his stand facing south.
A walker: <walk><dir>.webp for the eight ways, nine cells each -- his jog's
cycle in eight cells evenly over its time, then his stand (NPC_DATA `walk`:
frames 9, cycle 8, stand 8).
Every one: <head>.webp, 192 x 192, his face up close for the dialogue window
(the owner: "an up close of their face of their Southwest portrait"): his
stand turned southwest, photographed at FACE_K picture px a body px, cut
square about his face (FACE_CENTRE, FACE_SIDE).  --faces bakes these alone.

Lossless WebP: these are pixel art, and a lossy pass smears the outline.
Fails (writes nothing) if any frame's paint would leave its cell.
"""
import json
import os
import sys

from PIL import Image

CELL = 256
FEET_ROW = 222          # the soles' bottom row; the paint ends at y = 223
MID_X = 128
CYCLE = 8               # jog cells in a walker's strip; his stand is cell 8
ALPHA = 8
# The face: where it sits in the southwest stand, in body-sheet px from the
# figure's own origin (its body cell's middle), and how much of him the
# square takes in -- measured off the photographs, the same for every bro
# (one body); the picture is FACE_SIDE x FACE_K px.
FACE_CENTRE = (-2, -72)
FACE_SIDE = 64
HEAD_PX = 192


def lowest_row(im):
    a = im.getchannel('A').point(lambda v: 255 if v > ALPHA else 0)
    box = a.getbbox()
    return None if not box else box[3] - 1


def place(frame, origin, ox, oy):
    """frame pasted so its figure origin lands at (ox, oy) of a fresh cell;
    returns (cell, clipped?)"""
    cell = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    dx = int(round(ox - origin[0]))
    dy = int(round(oy - origin[1]))
    sx, sy = max(0, -dx), max(0, -dy)
    tx, ty = max(0, dx), max(0, dy)
    w = min(frame.width - sx, CELL - tx)
    h = min(frame.height - sy, CELL - ty)
    if w > 0 and h > 0:
        cell.alpha_composite(frame, (tx, ty), (sx, sy, sx + w, sy + h))
    # what of the frame's paint fell outside the cell
    a = frame.getchannel('A').point(lambda v: 255 if v > ALPHA else 0)
    box = a.getbbox()
    clipped = False
    if box:
        x0, y0, x1, y1 = box[0] + dx, box[1] + dy, box[2] + dx, box[3] + dy
        clipped = x0 < 0 or y0 < 0 or x1 > CELL or y1 > CELL
    return cell, clipped


def main(raw, out, preview):
    meta = json.load(open(os.path.join(raw, 'meta.json')))
    written = []      # (path, Image)
    problems = []
    sheet_rows = []
    for nid, m in meta.items():
        row = []
        for d, poses in m['dirs'].items():
            st = poses.get('stand')
            if not st:
                problems.append(f'{nid} {d}: no stand')
                continue
            sim = Image.open(os.path.join(raw, st['files'][0])).convert('RGBA')
            low = lowest_row(sim)
            if low is None:
                problems.append(f'{nid} {d}: empty stand')
                continue
            # the figure origin's place in the cell: soles on FEET_ROW
            oy = FEET_ROW - (low - st['origin'][1])
            ox = MID_X
            stand_cell, clip = place(sim, st['origin'], ox, oy)
            if clip:
                problems.append(f'{nid} {d}: stand leaves its cell')
            if not m.get('walk'):
                written.append((os.path.join(out, m['still'] + '.webp'), stand_cell))
                row.append(stand_cell)
                continue
            jg = poses.get('jog')
            if not jg:
                problems.append(f'{nid} {d}: no jog')
                continue
            n = len(jg['files'])
            cells = []
            for k in range(CYCLE):
                i = (k * n) // CYCLE
                fim = Image.open(os.path.join(raw, jg['files'][i])).convert('RGBA')
                c, clip = place(fim, jg['origin'], ox, oy)
                if clip:
                    problems.append(f'{nid} {d}: jog frame {i} leaves its cell')
                cells.append(c)
            cells.append(stand_cell)
            strip = Image.new('RGBA', (CELL * len(cells), CELL), (0, 0, 0, 0))
            for k, c in enumerate(cells):
                strip.alpha_composite(c, (k * CELL, 0))
            written.append((os.path.join(out, m['walk'] + d + '.webp'), strip))
            row.extend(cells if d == 'south' else [cells[0], cells[CYCLE // 2], stand_cell])
        fc = m.get('face')
        if fc:
            k = fc.get('k', 3)
            fim = Image.open(os.path.join(raw, fc['file'])).convert('RGBA')
            side = FACE_SIDE * k
            cx = fc['origin'][0] + FACE_CENTRE[0] * k
            cy = fc['origin'][1] + FACE_CENTRE[1] * k
            head = Image.new('RGBA', (side, side), (0, 0, 0, 0))
            # the square's corner in the photograph; whatever of it lies off
            # the photograph (over a bare head) stays see-through
            x0, y0 = int(round(cx - side / 2)), int(round(cy - side / 2))
            sx, sy = max(0, x0), max(0, y0)
            ex, ey = min(fim.width, x0 + side), min(fim.height, y0 + side)
            if ex > sx and ey > sy:
                head.alpha_composite(fim, (sx - x0, sy - y0), (sx, sy, ex, ey))
            if lowest_row(head) is None:
                problems.append(f'{nid}: the face crop is empty')
            if head.width != HEAD_PX:
                head = head.resize((HEAD_PX, HEAD_PX), Image.NEAREST)
            written.append((os.path.join(out, m['head'] + '.webp'), head))
            row.append(head.resize((CELL, CELL), Image.NEAREST))
        else:
            problems.append(f'{nid}: no face')
        sheet_rows.append(row)
    if problems:
        print('NOT WRITTEN:\n  ' + '\n  '.join(problems))
        sys.exit(1)
    for path, im in written:
        im.save(path, 'WEBP', lossless=True, quality=100, method=6)
        print('wrote', os.path.relpath(path), im.size, os.path.getsize(path) // 1024, 'KB')
    # a contact sheet of every cell written (the walkers' south strips whole,
    # two jog cells and the stand for their other ways)
    if sheet_rows:
        cols = max(len(r) for r in sheet_rows)
        s = 128
        sheet = Image.new('RGBA', (cols * s, len(sheet_rows) * s), (52, 56, 64, 255))
        for y, r in enumerate(sheet_rows):
            for x, c in enumerate(r):
                sheet.alpha_composite(c.resize((s, s), Image.NEAREST), (x * s, y * s))
        os.makedirs(preview, exist_ok=True)
        sheet.save(os.path.join(preview, 'baked.png'))
        print('contact sheet', os.path.join(preview, 'baked.png'))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3])
