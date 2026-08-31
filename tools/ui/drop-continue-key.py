#!/usr/bin/env python3
"""TAKE THE KEY OFF THE CONTINUE PLATE (v2.3.2188).

Owner: "The continue label is still not centered on the button it looks slightly
offset left."

═══ THE WORD WAS ALREADY CENTRED ═══

Measured on the owner's own screenshot (1290x2796, the shipped build), not on
the art:

    plate field      x182-1110      centre 646.0
    CONTINUE         x449- 841      centre 645.0      <-- 1px off centre
    key roundel      x213- 344      centre 278.5

So the label sits on the plate's centre line to within a pixel, and every
earlier attempt to "centre the word" was correcting something already correct
(v2.3.2151's recut-continue-plate.py re-centred it on the field beside the key;
the report came back unchanged, which is the tell).

What is actually wrong is the BALANCE AROUND it:

    space before the key    31px
    space after the word   269px

The key hangs off the left with nothing opposite it, so the key+word cluster's
centre of mass lands at 527 against the plate's 646 -- 119px left -- and the eye
reads that as the label being off even while the label is dead centre.

═══ WHY THE KEY GOES RATHER THAN MOVES ═══

The two goals are mutually exclusive: the word can be centred, or the key+word
group can be centred, but not both, because the key's width has to come out of
one side.  Three ways out were rendered and put to the owner:

  A  centre the group          -> balanced, but the word then sits right of centre
  B  mirror the key on the right -> perfectly symmetric, and the arrow points
                                  LEFT, which reads "go back" on the button that
                                  goes forward.  Worse than the original.
  C  drop the key              -> the word stays exactly centred and the plate
                                  goes symmetric, matching CREATE CHARACTER
                                  directly below it.

The owner picked C.  Nothing is lost by it: "Your Login Key lets you access your
character on any device" is already written under both buttons (LoginScreen's
bt-login-note), which is where that idea was always explained.

═══ WHY THE WIPE IS EXACT AND NOT A PATCH ═══

The plate's field is COLUMN-UNIFORM: measured, any two empty columns of the
field differ by 0.00 across the mid-band.  So replacing the key's columns with a
copy of an empty one reproduces the field exactly -- the vertical gradient and
its texture come across intact, and there is no seam to blend.  This is why the
tool copies a column rather than in-painting or flood-filling a flat colour.

The key's extent is found the same way, by asking which columns DIFFER from an
empty one rather than by thresholding gold (the frame is gold too):

    x0-113     left frame
    x156-355   the key, glow included
    x501-1097  the word
    x1486-1597 right frame

so the wipe spans WIPE, comfortably clear of both the frame and the word.

  python3 tools/ui/drop-continue-key.py --check
  python3 tools/ui/drop-continue-key.py
"""
import argparse, os
from PIL import Image
import numpy as np

PLATE = 'public/ui/welcome/title/btn-continue.png'
CLEAN_X = 1300          # an empty field column, right of the word
WIPE = (140, 380)       # clear of the frame (ends 113) and the word (starts 501)
BAND = slice(120, 300)  # rows through the field, clear of the top/bottom frame


def regions(a):
    """Columns whose field differs from an empty one — frame, key, word."""
    ref = a[:, CLEAN_X, :3].astype(float)
    dev = np.abs(a[BAND, :, :3].astype(float) - ref[BAND][:, None, :]).mean(axis=(0, 2))
    xs = np.nonzero(dev > 6)[0]
    out, s, p = [], xs[0], xs[0]
    for i in xs[1:]:
        if i - p > 12:
            out.append((int(s), int(p))); s = i
        p = i
    out.append((int(s), int(p)))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    args = ap.parse_args()
    if not os.path.exists(PLATE):
        raise SystemExit(f'no {PLATE} — run from the repo root')

    a = np.array(Image.open(PLATE).convert('RGBA'))
    before = regions(a)
    print('  regions before:', before)

    # The field must be column-uniform or the copy below would leave a seam.
    ref = a[:, CLEAN_X, :3].astype(float)
    worst = max(np.abs(a[BAND, x, :3].astype(float) - ref[BAND]).mean()
                for x in (1200, 1250, 1350, 1400, 1450))
    print(f'  field uniformity: worst empty-column deviation {worst:.2f}')
    if worst > 1.0:
        raise SystemExit('  REFUSED: the field is not column-uniform, so a column '
                         'copy would seam — this tool no longer suits the art')

    key = [r for r in before if WIPE[0] <= r[0] and r[1] <= WIPE[1]]
    if not key:
        print('  nothing inside the wipe span — the key is already gone; no change')
        return
    print(f'  key found at {key[0]}, inside the wipe span {WIPE}')

    if args.check:
        return

    b = a.copy()
    col = a[:, CLEAN_X:CLEAN_X + 1, :]
    b[:, WIPE[0]:WIPE[1], :] = np.repeat(col, WIPE[1] - WIPE[0], axis=1)
    Image.fromarray(b, 'RGBA').save(PLATE, 'PNG', optimize=True)

    after = regions(np.array(Image.open(PLATE).convert('RGBA')))
    print('  regions after :', after)
    word = [r for r in after if 400 < r[0] < 1200]
    if word:
        c = (word[0][0] + word[0][1]) / 2
        ys, xs = np.nonzero(np.array(Image.open(PLATE).convert('RGBA'))[..., 3] > 16)
        pc = (xs.min() + xs.max()) / 2
        print(f'  word centre {c:.1f} vs plate centre {pc:.1f} '
              f'(off by {abs(c - pc):.1f}px of {xs.max() - xs.min()})')


if __name__ == '__main__':
    main()
