#!/usr/bin/env python3
"""v2.3.2645: put each drawn eye of an eye style over the eye the game paints.

Owner, on the WTF eyes: "The wtf eyes are spaced a bit too far apart."

WHAT THE IMPORTER CAN AND CANNOT DO
-----------------------------------
import_headwear_green.seat_eyes() already seats each facing onto the eye row —
but it moves the WHOLE PIECE, because that is all a `crownNudge` can do.  A
sheet whose two eyes were drawn further apart than the mannequin's is a
different fault: no translation of the piece fixes it, because the two halves
need to move in OPPOSITE directions.  That is this tool.

It is therefore deliberately blind to the half of the error the importer owns.
For each facing it measures both drawn eyes against both painted ones and
splits the two deltas into

    common  = (dl + dr) / 2     the piece is off-centre   -> crownNudge's job
    spread  = (dl - dr) / 2     the eyes are mis-spaced   -> THIS tool's job

and applies only `spread`, left +g and right -g.  So it cannot quietly undo a
seating the importer chose, and re-running it on a piece it has already seated
is a no-op.  On the four styles shipped today it moves exactly one thing —
WTF's south cell, 2px in either side — and reports 0 for everything else,
including WTF's own southwest, which measured correct.

WHY THE SHIFT IS ALWAYS EVEN
----------------------------
The 256px `hi/` art is the master and the shipped 128px frame is a BOX halving
of it (downscale_traits.py).  An odd 256-space shift is half a pixel in the
frame the world actually draws, which the halving would resolve as a smear of
half-lit columns down both edges of the eye — the anti-aliased remnant the
whole eyestyle erase exists to get rid of.  So the measured spread is rounded
to a whole 128-space pixel and doubled, and a fault under 1px at 128 is
reported and left alone rather than smeared away.  The 128 frame is then
re-derived from the shifted master with the same BOX filter, never edited
directly, so the two stay exactly in step.

WHY IT DOES NOT TOUCH anchors/crownNudge
----------------------------------------
_placeTrait maps art to body as `x_body = x_art - anchor + crown + crownNudge`,
so moving art pixels moves them on the face one for one, which is the whole
point.  `meta.bboxes` is descriptive (hatHairFit reads it) and IS rewritten to
match the new art.  `anchors` is the bbox top-CENTRE, and a spread-only shift is
symmetric, so it does not move — asserted rather than assumed below.

    python3 tools/eyes/seat_eye_halves.py --id wtf            # measure only
    python3 tools/eyes/seat_eye_halves.py --id wtf --apply
    python3 tools/eyes/seat_eye_halves.py                     # every style

Re-cut the picker tiles afterwards (tools/ui/make_eyestyle_thumbs.py) — they
composite this art.
"""
import argparse
import json
import os

import numpy as np
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TRAITS = os.path.join(REPO, 'public/sprites/traits/eyestyle')
TOPS = os.path.join(REPO, 'public/sprites/player/body-tops.json')
EYE_BLANK = os.path.join(REPO, 'src/rendering/eyeBlankMask.json')
DIRS = ['south', 'southwest', 'east']
LO = 128


def col_runs(im):
    """The art's columns, grouped into contiguous runs — one per drawn eye."""
    a = np.array(im)[:, :, 3] > 20
    cols = np.nonzero(a.any(axis=0))[0].tolist()
    if not cols:
        return []
    runs, cur = [], [cols[0]]
    for c in cols[1:]:
        if c - cur[-1] > 1:
            runs.append((cur[0], cur[-1]))
            cur = []
        cur.append(c)
    runs.append((cur[0], cur[-1]))
    return runs


def spread_for(tid, d, meta, tops, blank):
    """(g, note) — the 256-space shift to apply to the LEFT eye, -g to the right."""
    boxes = blank.get(f'stand-{d}', [[]])[0]
    hi = Image.open(os.path.join(TRAITS, tid, 'hi', f'{d}.png')).convert('RGBA')
    runs = col_runs(hi)
    if len(runs) != 2 or len(boxes) != 2:
        return 0, f'{len(runs)} drawn eye(s) against {len(boxes)} painted — nothing to spread'
    ax = meta['anchors'][d][0]
    nx = meta.get('crownNudge', {}).get(d, [0, 0])[0]
    off = tops[f'stand-{d}-0'][0] + nx - ax          # art x -> body x
    # Centres, in body space.  The pad eyeBlankMask carries is symmetric, so it
    # cancels here and the box needs no unpadding.
    drawn = sorted((r[0] + r[1]) / 2 + off for r in runs)
    painted = sorted(b[0] + b[2] / 2 - 0.5 for b in boxes)
    dl, dr = painted[0] - drawn[0], painted[1] - drawn[1]
    common, spread = (dl + dr) / 2, (dl - dr) / 2
    g = 2 * round(spread / 2)                        # whole 128-space pixels
    note = (f'drawn {drawn[0]:.1f}/{drawn[1]:.1f} vs painted {painted[0]:.1f}/{painted[1]:.1f}  '
            f'common {common:+.1f} (crownNudge\'s) spread {spread:+.1f} -> {g:+d}')
    if g:
        gap = (runs[1][0] + g) - (runs[0][1] - g)
        if gap < 2:
            return 0, note + '  REFUSED: the two eyes would touch'
    return g, note


def shift(im, runs, g):
    """Left run +g, right run -g, in this image's own pixels."""
    a = np.array(im)
    out = a.copy()
    for (x0, x1), dx in zip(runs, (g, -g)):
        out[:, x0:x1 + 1] = 0
    for (x0, x1), dx in zip(runs, (g, -g)):
        out[:, x0 + dx:x1 + 1 + dx] = a[:, x0:x1 + 1]
    return Image.fromarray(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--id', default=None, help='comma list; default every style present')
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()

    tops = json.load(open(TOPS))
    blank = json.load(open(EYE_BLANK))
    ids = ([x.strip() for x in args.id.split(',') if x.strip()] if args.id
           else sorted(d for d in os.listdir(TRAITS)
                       if os.path.isfile(os.path.join(TRAITS, d, 'meta.json'))))

    for tid in ids:
        folder = os.path.join(TRAITS, tid)
        mpath = os.path.join(folder, 'meta.json')
        meta = json.load(open(mpath))
        changed = False
        for d in DIRS:
            if d not in meta.get('anchors', {}) or not os.path.isfile(os.path.join(folder, 'hi', f'{d}.png')):
                continue
            g, note = spread_for(tid, d, meta, tops, blank)
            print(f'{tid:<10} {d:<10} {note}')
            if not g or not args.apply:
                continue
            hip = os.path.join(folder, 'hi', f'{d}.png')
            hi = Image.open(hip).convert('RGBA')
            hi2 = shift(hi, col_runs(hi), g)
            hi2.save(hip)
            # The 128 frame is DERIVED, never edited: same BOX halving
            # downscale_traits.py applies, so master and shipped frame agree.
            hi2.resize((LO, LO), Image.BOX).save(os.path.join(folder, f'{d}.png'))
            runs = col_runs(hi2)
            ys = np.nonzero((np.array(hi2)[:, :, 3] > 20).any(axis=1))[0]
            bx0, bx1 = runs[0][0], runs[-1][1]
            new_bbox = [int(bx0), int(ys.min()), int(bx1 - bx0 + 1), int(ys.max() - ys.min() + 1)]
            # A spread-only shift is symmetric, so the bbox top-centre — which
            # is what `anchors` records — must not have moved.  If it did, the
            # placement would silently slide and crownNudge would owe the
            # difference; refuse rather than ship that.
            old = meta['bboxes'][d]
            if (new_bbox[0] * 2 + new_bbox[2]) != (old[0] * 2 + old[2]):
                raise SystemExit(f'{tid}/{d}: bbox centre moved {old} -> {new_bbox}; '
                                 'this is not a spread-only shift')
            meta['bboxes'][d] = new_bbox
            changed = True
            print(f'{"":<10} {"":<10} -> shifted {g:+d}px either side; bbox {old} -> {new_bbox}')
        if changed:
            meta['note'] = (meta.get('note', '') + ' v2.3.2645: each eye seated on the eye the '
                            'game paints by tools/eyes/seat_eye_halves.py -- the drawn pair was '
                            'spaced wider than the mannequin\'s, which no crownNudge can fix '
                            'because the two halves have to move in opposite directions.').strip()
            json.dump(meta, open(mpath, 'w'), indent=1)
            open(mpath, 'a').write('\n')
            print(f'{tid:<10} wrote {os.path.relpath(mpath, REPO)}')

    if not args.apply:
        print('\n(measure only — pass --apply to write)')


if __name__ == '__main__':
    main()
