"""=== v2.3.2380: MIRROR ONE EYEWEAR FACING IN PLACE ===

Owner, on the Golden Monocle: *"Can you flip the golden monocle so the claw side
faces the other way?"*

    python3 tools/ui/flip_eyewear_piece.py --id golden-monocle --facings south,southwest
    python3 tools/ui/flip_eyewear_piece.py --id golden-monocle --facings south,southwest --check

-- WHY A TOOL, AND WHY IT MUST BE RE-RUN AFTER ANY RE-IMPORT --
The shipped art is derived from a sheet in assets/icons-source/eyewear-sheets/
by tools/import_headwear_green.py. This flip is NOT in that sheet, so the sheet
and the shipped frames disagree by exactly this operation: a re-import would
silently un-flip the monocle, in the same shape as the thumbnail hazard that
TRAPS 59 records. Running this again is the whole fix, and `--check` says
whether it is needed -- so it belongs in docs/specs/eyewear.md beside step 7,
not in somebody's memory.

-- IT MIRRORS ABOUT THE PIECE'S OWN BOX, NOT THE FRAME'S --
Mirroring the whole 256 frame about its centre would move the piece sideways by
twice its offset from that centre, and every number in meta.json that places it
-- `bboxes`, `anchors`, `crownNudge` -- would be wrong. Mirroring the pixels
INSIDE the piece's own alpha bounding box leaves that box exactly where it was,
so the ring stays over the same eye and the claw swaps sides. No meta edit, and
nothing downstream has to know.

-- WHICH FACINGS, AND WHY NOT ALL OF THEM --
"The other way" is not one direction. On south and southwest the claw hooked
INWARD, toward the nose; on east and northeast it already hooks backward, past
the eye toward the ear, which is the outer side on a profile. Flipping those two
as well would hang the claw off the front of the face. So the rule this
implements is "the claw is on the outer side of the face", which on the two
front views means flipping and on the two side views means leaving them alone.
The facings are an argument rather than a constant for that reason: the next
piece that needs this may need a different set.

Both the 128 world frame and its 256 hi/ original are flipped, because the login
portrait reads hi/ and the world reads the other, and a piece that disagrees
between them is the v2.3.2371 bug wearing a different hat.
"""
import argparse, os, sys
import numpy as np
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ROOT = os.path.join(REPO, 'public/sprites/traits/eyewear')


def flip_in_place(path, check):
    """Mirror the opaque content about its own alpha bbox. Returns a status word."""
    if not os.path.exists(path):
        return 'missing'
    im = Image.open(path).convert('RGBA')
    a = np.array(im)
    ys, xs = np.nonzero(a[..., 3] > 8)
    if not len(xs):
        return 'empty'
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    region = a[y0:y1, x0:x1]
    flipped = region[:, ::-1]
    if np.array_equal(region, flipped):
        return 'symmetric'          # already a mirror of itself: nothing to do
    if check:
        return 'would flip'
    a[y0:y1, x0:x1] = flipped
    Image.fromarray(a, 'RGBA').save(path)
    return 'flipped %dx%d' % (x1 - x0, y1 - y0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--id', required=True)
    ap.add_argument('--facings', required=True,
                    help='comma-separated: south,southwest,east,northeast,north')
    ap.add_argument('--check', action='store_true', help='report only, write nothing')
    args = ap.parse_args()

    item = os.path.join(ROOT, args.id)
    if not os.path.isdir(item):
        sys.exit('no such eyewear item: %s' % item)
    for f in [s.strip() for s in args.facings.split(',') if s.strip()]:
        for leaf in ('%s.png' % f, 'hi/%s.png' % f):
            p = os.path.join(item, leaf)
            print('  %-14s %-18s %s' % (args.id, leaf, flip_in_place(p, args.check)))


if __name__ == '__main__':
    main()
