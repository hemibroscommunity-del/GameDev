#!/usr/bin/env python3
"""v2.3.4357: THE ROTCAP, CUT FROM THE OWNER'S SHEET.

    python3 tools/art/cut_rotcap.py            # into public/sprites/monsters/rotcap/
    python3 tools/art/cut_rotcap.py --preview  # and docs/art/rotcap-strips.png to look at

The owner, 2026-11-09: "Also this for poison land" -- and, asked which of the
Poison Forest's two stand-in monsters it replaces: "Both".

WHAT WAS UPLOADED (assets/monster animations/rotcap/rotcap-sheet.png): one
picture, 2172 x 724, see-through behind, with a name plate down its left side
(x < 240: never cut in):

    five rows of four frames   the mushroom shuffling, one row a side: facing
                               you, side on (right), front-left, from behind,
                               back-right
    a row of twelve            its death: it sags, folds and rots down flat

WHAT IT DOES: tools/art/sheet_rows.py's cutting (v2.3.4358: shared with the
rock golem's sheet, which is laid out the same way), told what is where on
this one.  It writes three strips of 256 px cells on at most 256 colours:
walk.png (20 cells: the five sides in SIDES' order, four frames each),
death.png (12) and codex-walk.png (the front-left row alone, for the codex
page).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sheet_rows import REPO, cut_sheet  # noqa: E402

SHEET = os.path.join(REPO, 'assets', 'monster animations', 'rotcap', 'rotcap-sheet.png')
OUT = os.path.join(REPO, 'public', 'sprites', 'monsters', 'rotcap')

GROUND = 232          # the row its base stands on
REST_W = 176          # the facing-you mushroom's width in its cell, px
PLATE_X = 240         # the name plates are left of this
# the five sides, in the order the sheet's rows draw them (rotcapSprites.js SIDES)
SIDES = ['s', 'e', 'sw', 'n', 'ne']
FRAMES = 4
DEATH_FRAMES = 12


def main():
    cut_sheet(SHEET, OUT, SIDES, FRAMES, DEATH_FRAMES, PLATE_X, REST_W, GROUND,
              preview=os.path.join(REPO, 'docs', 'art', 'rotcap-strips.png') if '--preview' in sys.argv else None)


if __name__ == '__main__':
    main()
