#!/usr/bin/env python3
"""RECUT THE SPLASH PLATE'S LABEL (v2.3.2151).

Owner: "fix the 'continue' button on splash page. The lettering looks off and
it's still not centered."

Two separate defects, both real, both measurable off the PNG:

1. THE C IS AN E WITH ITS MIDDLE BAR TAKEN OUT.  That is how v2.3.1954 built
   it (tools/ui/relabel-login-plate.mjs: "a C is an E with the middle bar
   removed"), and the pixel map proves it -- rows 119-153 of the C are byte
   for byte the E's, minus rows 133-139.  It is a legal blocky C and it does
   not read as one: the face gives every round letter chamfered corners (see
   the O), so a C with the E's flat, square-ended arms reads as a bracket.
   At a glance the word says EONTINUE.  This recuts the C from the plate's own
   O instead -- the O with its right stem opened for the middle rows -- so the
   terminals are the face's own curves and nothing is invented.

2. IT IS CENTRED ON THE WRONG THING.  The word is dead-centre on the PLATE
   (word centre 406.5, plate centre 406.5, and v2.3.2005 moved it 205px left
   to get there).  But the plate is not empty: a painted key sits in the left
   third, so the field the label actually occupies runs from the key's right
   edge (x~192) to the inner frame (x~759) and its centre is 475.  Centred on
   the plate the word is 69px left of that, which is why it looks shoved into
   the key with a void after it.  Centring on the field is what the eye reads
   as centred.

HOW THE MOVE IS DONE WITHOUT A SEAM.  Not by cutting a rectangle and pasting
it: the label has a soft drop shadow, so any rectangular tile carries a patch
of background whose edge shows against the interior gradient.  Instead the
background under the label is reconstructed (per-COLUMN vertical interpolation
between a clean row above and a clean row below -- the interior gradient runs
vertically and varies slowly, so a per-column ramp keeps the horizontal sheen),
the label is taken as the DIFFERENCE from that reconstruction, and the
difference is added back at the new x.  Where there was no ink the difference
is zero, so the shadow fades out exactly as it did and there is no edge to see.

PIL, not a headless Chromium canvas.  relabel-login-plate.mjs went through a
browser because it recorded "there is no image library in this sandbox"; there
is (Pillow), and every other sprite tool in tools/ uses it.

  python3 tools/ui/recut-continue-plate.py [--check]
"""
import sys
from PIL import Image
import numpy as np

SRC = 'public/ui/welcome/title/btn-continue.png'
CHECK = '--check' in sys.argv

# ── measured geometry, all in source pixels ───────────────────────────────
BAND = (114, 161)        # rows the label + its shadow occupy
ABOVE, BELOW = 111, 164  # clean interior rows to ramp between
XLO, XHI = 296, 600      # columns to rebuild: the word, plus the empty run it moves into
SHIFT = 69               # word centre 406.5 -> 475.5, the field's centre
# the O, and the C it replaces (bright runs plus their outline)
O_X0, O_X1 = 328, 356
C_X0, C_X1 = 302, 330
OPEN_ROWS = (128, 146)   # rows where the C's right side is open

im = Image.open(SRC).convert('RGBA')
a = np.array(im).astype(np.float64)
h, w, _ = a.shape

# ── 1. reconstruct the interior under the label ───────────────────────────
bg = a.copy()
y0, y1 = BAND
top = a[ABOVE, XLO:XHI, :]
bot = a[BELOW, XLO:XHI, :]
for y in range(y0, y1):
    t = (y - ABOVE) / float(BELOW - ABOVE)
    bg[y, XLO:XHI, :] = top * (1 - t) + bot * t

# ── 2. the label, as ink over that reconstruction ─────────────────────────
ink = a[y0:y1, XLO:XHI, :] - bg[y0:y1, XLO:XHI, :]

def col(x):
    """A column index inside `ink`."""
    return x - XLO

# ── 3. recut the C from the O ─────────────────────────────────────────────
newC = ink[:, col(O_X0):col(O_X1), :].copy()
# Open the right side: the O's right stem becomes the C's mouth.  The pixels
# used are the EXISTING C's own opening, so the mouth's shading and its fade
# into the plate are the plate's, not invented.
src0 = C_X0 + (O_X0 - O_X0)          # keep the arithmetic explicit
mouth_src = 313                       # first column of the old C's opening
for r in range(OPEN_ROWS[0] - y0, OPEN_ROWS[1] - y0):
    for i, x in enumerate(range(O_X0 + 18, O_X1)):
        newC[r, x - O_X0, :] = ink[r, col(mouth_src + i), :]
ink[:, col(C_X0):col(C_X0) + newC.shape[1], :] = newC

# ── 4. put it back, moved ─────────────────────────────────────────────────
out = bg.copy()
dst = ink
out[y0:y1, XLO + SHIFT: XLO + SHIFT + dst.shape[1], :] += dst
out[:, :, 3] = a[:, :, 3]            # the plate's own alpha is untouched
out = np.clip(out, 0, 255).astype(np.uint8)

# ── report ────────────────────────────────────────────────────────────────
lum = out[:, :, 0] * 0.5 + out[:, :, 1] * 0.4 + out[:, :, 2] * 0.1
m = (lum > 120) & (out[:, :, 2] < 120)
xs = np.nonzero(m[100:175, 200:700].sum(axis=0))[0] + 200
print(f'label now spans x {xs.min()}..{xs.max()}  centre {(xs.min()+xs.max())/2:.1f}'
      f'  (field centre 475.5, plate centre 406.5)')

if CHECK:
    print('--check: nothing written')
else:
    Image.fromarray(out).save(SRC)
    print(f'wrote {SRC}')
