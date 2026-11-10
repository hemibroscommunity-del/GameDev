#!/usr/bin/env python3
"""v2.3.4358: THE ROCK GOLEM, CUT FROM THE OWNER'S SHEET.

    python3 tools/art/cut_rock_golem.py            # into public/sprites/monsters/rock-golem/
    python3 tools/art/cut_rock_golem.py --preview  # and docs/art/rock-golem-strips.png to look at

The owner, 2026-11-09: "Also this to replace the rock monster that's there
now."

WHAT WAS UPLOADED (assets/monster animations/rock-golem/rock-golem-sheet.png):
one picture, 2172 x 724, see-through behind, with name plates down its left
side (never cut in: left of x 245 beside the walk rows, of x 172 beside the
death row, which starts further left):

    five rows of four frames   the golem grinding along, one row a side:
                               facing you, side on (right), front-left, from
                               behind, back-right
    a row of thirteen          its death: its eyes go out, it cracks and
                               falls to rubble (the plate says twelve; there
                               are thirteen, and all are used)

WHAT IT DOES: tools/art/sheet_rows.py's cutting, told what is where on this
sheet (two of its rows are two lines apart: ROW_GAP).  It writes three strips of
256 px cells on at most 256 colours: walk.png (20 cells: the five sides in
SIDES' order, four frames each), death.png (13) and codex-walk.png (the
front-left row alone, for the codex page).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sheet_rows import REPO, cut_sheet  # noqa: E402

SHEET = os.path.join(REPO, 'assets', 'monster animations', 'rock-golem', 'rock-golem-sheet.png')
OUT = os.path.join(REPO, 'public', 'sprites', 'monsters', 'rock-golem')

GROUND = 232          # the row its base stands on
REST_W = 196          # the facing-you golem's width in its cell, px
PLATE_X = 245         # the name plates are left of this, beside the walk rows
DEATH_PLATE_X = 172   # ...and of this beside the death row
DEATH_FROM_Y = 540    # the death row is below this
ROW_GAP = 1           # two empty lines part two rows (the front-left and back rows are only that far apart)
# the five sides, in the order the sheet's rows draw them (rockGolemSprites.js SIDES)
SIDES = ['s', 'e', 'sw', 'n', 'ne']
FRAMES = 4
DEATH_FRAMES = 13


def main():
    cut_sheet(SHEET, OUT, SIDES, FRAMES, DEATH_FRAMES, PLATE_X, REST_W, GROUND,
              death_plate_x=DEATH_PLATE_X, death_from_y=DEATH_FROM_Y, row_gap=ROW_GAP, death_pieces=True,
              preview=os.path.join(REPO, 'docs', 'art', 'rock-golem-strips.png') if '--preview' in sys.argv else None)


if __name__ == '__main__':
    main()
