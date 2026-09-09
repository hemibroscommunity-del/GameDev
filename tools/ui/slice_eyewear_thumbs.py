"""=== v2.3.2377: CUT THE EYEWEAR PICKER ICONS FROM THE OWNER'S SHEET ===

Owner: "the eyewear icons look pretty bad. Use these instead", with one
1254x1254 sheet holding nine hand-drawn icons in a 3x3 arrangement.  Then, on
the first cut of them: "the monocle got cut off and is in the square above it
a bit."

    python3 tools/ui/slice_eyewear_thumbs.py            # write the thumbs
    python3 tools/ui/slice_eyewear_thumbs.py --check    # verify, write nothing

-- WHY THIS EXISTS AT ALL, AND WHY IT IS NOT make-southwest-thumbs.mjs --
Every other trait's picker tile is CUT FROM its worn southwest frame by
tools/ui/make-southwest-thumbs.mjs.  Eyewear cannot be: a three-quarter view of
a small object drawn to sit on a face is off-axis, unoutlined, and only a few
dozen pixels of actual lens at the 44px the tile paints.  These are the owner's
own front-facing outlined drawings instead, and `eyewear` is deliberately absent
from that generator's CATS list so a routine run cannot overwrite them.

That leaves the drawings with no tool of their own, which is how the bug below
happened -- the first cut was done by hand, in a throwaway script, with a
number in it that nobody could check afterwards.

-- THE BUG THIS TOOL IS SHAPED AROUND: NEVER ASSUME THE GRID --
The sheet LOOKS like an even 3x3, so the first cut sliced it at even thirds:
y = 0, 418, 836, 1254.  Eight of the nine cells came out right, which is
exactly what makes this class of mistake ship.

The ninth is the monocle.  It is the tallest drawing on the sheet by a wide
margin -- 371px against 175 and 199 for the two icons beside it -- because it
alone has a hanging bead chain under the lens.  Its art runs y 818..1188, so
the "even" boundary at y=836 falls 18 rows INSIDE it:

    laser-glasses (r1c0)  true y 534..691   sliced y 536..835  <- +144 rows of
                                                                  nothing, then
                                                                  the monocle's
                                                                  gold top edge
    golden-monocle (r2c0) true y 818..1188  sliced y 836..1186 <- top 18 rows
                                                                  amputated

Shipped, that read as the owner described it: a monocle missing the top of its
ring, and a stray gold crumb floating at the bottom of the tile above.

So the grid is DERIVED from the sheet's own transparent gutters, never assumed:
fully-empty columns split the sheet into vertical strips, and then each strip is
split into rows by ITS OWN empty rows.  Per-strip is the part that matters --
a global row scan would union all three columns and merge r1 into r2 the moment
one tall icon reaches across the gutter's y-range, which is precisely the
monocle's situation.  A cell can now be any height at all and the cut follows it.

-- THE OTHER NUMBERS, AND WHY THEY ARE WHAT THEY ARE --
* Alpha > 8, not > 0: the sheet's PNG carries all 256 alpha values and its
  drawings have soft outer pixels, so a >0 test finds "content" in gutters that
  are visually empty and collapses the grid to one cell.
* Longest side 128px, LANCZOS: 128 is the size the other 41 trait thumbnails
  already are, and the tile paints at 44 CSS px -- so the browser always
  DOWNSCALES, which is the direction that stays sharp.
* Both thumb.png and thumb-sw.png get the same bytes.  The picker requests
  thumb-sw.png and falls back to thumb.png on error, and traitThumbs.js
  preloads thumb.png; identical files mean the fallback cannot swap one look
  for another mid-session.
* 'none' (r0c0, the red slash) is NOT written.  That tile renders the shared
  /ui/welcome/cc/cc-no-hair.webp for every category, so cutting it would add a
  ninth copy of a picture the picker already has.
"""
import sys, os, io
from PIL import Image
import numpy as np

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SHEET = os.path.join(REPO, 'assets/icons-source/sheet-eyewear-icons.png')
OUT = os.path.join(REPO, 'public/sprites/traits/eyewear')
LONGEST = 128
ALPHA = 8          # see the header: >0 finds soft gutter pixels and merges cells
MIN_SPAN = 20      # a content run thinner than this is speckle, not an icon

# Row-major, matching the sheet as the owner drew it.  None = don't write this
# cell (the shared "no selection" art already covers it).
GRID = [
    [None,             '3d-glasses',     'goggles'],
    ['laser-glasses',  'thug-life',      'white-glass'],
    ['golden-monocle', 'golden-glasses', 'eye-patch'],
]


def runs(counts):
    """Contiguous stretches where `counts` is non-zero, minus speckle."""
    out, start = [], None
    for i, n in enumerate(counts):
        if n and start is None:
            start = i
        elif not n and start is not None:
            out.append((start, i - 1))
            start = None
    if start is not None:
        out.append((start, len(counts) - 1))
    return [r for r in out if r[1] - r[0] >= MIN_SPAN]


def cells(alpha):
    """{(row, col): (x0, y0, x1, y1)} -- the tight box of every drawing.

    Columns first, then rows WITHIN each column.  Doing rows globally would
    union the three columns and merge any row a tall neighbour reaches into.
    """
    ink = alpha > ALPHA
    strips = runs(ink.sum(axis=0))
    if len(strips) != len(GRID[0]):
        raise SystemExit('sheet: expected %d columns, the gutters give %d %s'
                         % (len(GRID[0]), len(strips), strips))
    found = {}
    for ci, (c0, c1) in enumerate(strips):
        band = ink[:, c0:c1 + 1]
        rows = runs(band.sum(axis=1))
        if len(rows) != len(GRID):
            raise SystemExit('sheet column %d: expected %d rows, the gutters give %d %s'
                             % (ci, len(GRID), len(rows), rows))
        for ri, (r0, r1) in enumerate(rows):
            ys, xs = np.nonzero(band[r0:r1 + 1])
            found[(ri, ci)] = (c0 + int(xs.min()), r0 + int(ys.min()),
                               c0 + int(xs.max()), r0 + int(ys.max()))
    return found


def thumb(sheet, box):
    crop = sheet.crop((box[0], box[1], box[2] + 1, box[3] + 1))
    k = LONGEST / max(crop.width, crop.height)
    return crop.resize((max(1, round(crop.width * k)), max(1, round(crop.height * k))),
                       Image.LANCZOS)


def main():
    check = '--check' in sys.argv[1:]
    sheet = Image.open(SHEET).convert('RGBA')
    boxes = cells(np.array(sheet)[..., 3])
    wrote = same = differ = 0
    for ri, row in enumerate(GRID):
        for ci, name in enumerate(row):
            x0, y0, x1, y1 = boxes[(ri, ci)]
            if name is None:
                print('  r%dc%d  %3dx%-3d  (none -- shared cc-no-hair.webp, not written)'
                      % (ri, ci, x1 - x0 + 1, y1 - y0 + 1))
                continue
            img = thumb(sheet, boxes[(ri, ci)])
            buf = io.BytesIO()
            img.save(buf, 'PNG')
            data = buf.getvalue()
            note = ''
            for leaf in ('thumb.png', 'thumb-sw.png'):
                dest = os.path.join(OUT, name, leaf)
                old = open(dest, 'rb').read() if os.path.exists(dest) else None
                if old == data:
                    same += 1
                elif check:
                    differ += 1
                    note = '  STALE'
                else:
                    os.makedirs(os.path.dirname(dest), exist_ok=True)
                    open(dest, 'wb').write(data)
                    wrote += 1
                    note = '  written'
            print('  r%dc%d  %-15s sheet %3dx%-3d -> %3dx%-3d%s'
                  % (ri, ci, name, x1 - x0 + 1, y1 - y0 + 1, img.width, img.height, note))
    if check:
        print('check: %d file(s) match, %d stale' % (same, differ))
        sys.exit(1 if differ else 0)
    print('wrote %d file(s), %d already current' % (wrote, same))


if __name__ == '__main__':
    main()
