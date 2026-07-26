#!/usr/bin/env python3
"""v2.3.1491: erase the body that came through with a generated hat.

The problem
-----------
v2.3.1488-1490 imported 34 hats off sheets that came back REDRAWN rather than
composited onto the mannequin.  The importer isolated the hat with two tests:
anything drawn outside the body's silhouette, plus anything drawn INSIDE it in
a changed colour.  The second test is what failed.  A regenerated sheet repaints
the whole figure, so the face came back a shade off everywhere at once — enough
to pass a per-pixel difference test — and because the face touches the hat, the
connectivity filter that was supposed to discard stray noise adopted it instead.

The result shipped: most of the 34 hats carry a complete second head — face,
eyes, ears, neck, shoulder outline.  In game that draws a duplicate head over
the real one, and since a hat is scaled per pose, the copy stretches with it.
That is the "double head", the "stretched face" and the "outline" all at once.

Why this can be fixed without the sheets
----------------------------------------
It does not need the source art, which is fortunate, because it is gone.  A
stored hat frame keeps the hat at its TRUE position relative to the body — that
is the whole point of the mannequin — and meta records where the body's crown
falls inside the frame:

    crown_in_frame = anchors[dir] - crownNudge[dir]

Line that up with body-tops["stand-<dir>-0"] and the game's own stand frame
drops onto the hat frame at 1:1, in exactly the place the artist drew over.  So
the body that contaminated the hat is not merely similar to a known sprite, it
IS that sprite, and it can be subtracted rather than guessed at.

What is erased, and what is deliberately kept
---------------------------------------------
Not simply "everything overlapping the body" — that would delete every hat that
legitimately covers the skull: a bandana across the forehead, a helmet's cheek
guards, a visor.  A pixel is erased only where it overlaps the body AND still
carries the body's own colour there, which is what a leaked face looks like and
what a hat drawn on top never is.  Measured across the batch, that separates
them cleanly: of the pixels sitting over the body, 56% of the cowboy hat's and
47% of the red bandana's match the skin beneath (the leak), against 8% of the
Naruto headband's and 6% of the wizard hat's (real hats, drawn in their own
colours).

Small matches are left alone — a hat's own outline is near-black and the body's
is too, so isolated coincidences would otherwise punch holes along its edges.
Only a sizeable connected patch of body-coloured pixels is a leaked face.

Run from the repo root:
    python3 tools/strip_body_from_headwear.py --ids a,b,c   [--debug DIR]
    python3 tools/strip_body_from_headwear.py --all-generated
"""
import argparse
import json
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

DIRS = ['south', 'southwest', 'east', 'northeast', 'north']
BODY = 'public/sprites/player/stand-{dir}.png'
BODY_TOPS = 'public/sprites/player/body-tops.json'
HAT = 'public/sprites/traits/headwear/{id}'
FRAME = 256
ALPHA_T = 16
COLOUR_T = 45        # per-channel distance below which a pixel still reads as the body
GROW = 2             # ring outside the silhouette a redrawn outline wanders into
DRIFT = 3            # how far a redrawn feature may have moved and still be the body
MIN_LEAK = 12        # a body-coloured patch smaller than this is coincidence, not a leak
MIN_KEEP = 6         # speckle left behind after the erase
KEEP_FRAC = 0.10     # a surviving piece must be this share of the hat's largest
ENCLOSE = 6          # rows of hat above AND below that make a pixel the hat's own underside


def body_in_frame(d, crown, tops):
    """The game's own stand frame, shifted so its crown sits where the hat frame
    says the body's crown was — i.e. exactly where the artist drew over it."""
    body = np.array(Image.open(BODY.format(dir=d)).convert('RGBA')
                    .crop((0, 0, FRAME, FRAME))).astype(int)
    bx, by = tops[f'stand-{d}-0']
    dx, dy = crown[0] - bx, crown[1] - by
    out = np.zeros_like(body)
    ys = slice(max(0, dy), min(FRAME, FRAME + dy))
    xs = slice(max(0, dx), min(FRAME, FRAME + dx))
    sy = slice(max(0, -dy), min(FRAME, FRAME - dy))
    sx = slice(max(0, -dx), min(FRAME, FRAME - dx))
    out[ys, xs] = body[sy, sx]
    return out


def body_distance(hat, B):
    """How far each hat pixel is from ANY body colour within DRIFT px of it.

    Not a pixel-for-pixel comparison.  The regeneration moved the face features
    a pixel or two: the drawn eyes, nose, mouth and neck outline are the body's
    own near-black, but they no longer sit exactly where the game sprite's are,
    so comparing a pixel only against the body colour underneath it scores them
    as "a new colour the artist added" and keeps them.  That is what left the
    first pass with the skin erased and the facial features still drawn on.

    Searching a small neighbourhood absorbs that drift.  The body's colour is
    also carried outward first, so the blend fringe just outside the silhouette
    — the faint outline visible around the shipped hats — has something to match
    against instead of surviving by default."""
    m = B[:, :, 3] > ALPHA_T
    idx = ndi.distance_transform_edt(~m, return_distances=False, return_indices=True)
    near = B[:, :, :3][tuple(idx)]
    best = None
    for dy in range(-DRIFT, DRIFT + 1):
        for dx in range(-DRIFT, DRIFT + 1):
            shifted = np.roll(np.roll(near, dy, axis=0), dx, axis=1)
            d = np.abs(hat[:, :, :3] - shifted).max(axis=2)
            best = d if best is None else np.minimum(best, d)
    return best


def strip(hid, debug=None):
    meta = json.load(open(f'{HAT.format(id=hid)}/meta.json'))
    tops = json.load(open(BODY_TOPS))
    changed = {}
    for d in DIRS:
        p = f'{HAT.format(id=hid)}/{d}.png'
        hat = np.array(Image.open(p).convert('RGBA')).astype(int)
        a, n = meta['anchors'][d], meta['crownNudge'][d]
        crown = (a[0] - n[0], a[1] - n[1])
        B = body_in_frame(d, crown, tops)

        hm = hat[:, :, 3] > ALPHA_T
        bm = ndi.binary_dilation(B[:, :, 3] > ALPHA_T,
                                 ndi.generate_binary_structure(2, 2), iterations=GROW)
        leak = hm & bm & (body_distance(hat, B) < COLOUR_T)

        lab, k = ndi.label(leak, np.ones((3, 3)))
        if k:
            sizes = np.array(ndi.sum(leak, lab, range(1, k + 1)))
            keep = np.concatenate([[False], sizes >= MIN_LEAK])
            leak = keep[lab]

        # Do not erase a pixel the hat encloses.  A hat's own underside -- the
        # band beneath a crown, the rim inside a bucket -- is drawn in the same
        # near-black as the body's outline, so it matches and would be erased,
        # leaving the hat floating above the skull with a gap.  A leaked face
        # never has hat above AND below it (below the face is the neck, which is
        # leak too), so requiring both is enough to tell them apart.
        keepin = np.zeros_like(leak)
        surv = hm & ~leak
        for x in range(FRAME):
            col = np.nonzero(surv[:, x])[0]
            if len(col) < 2:
                continue
            for y in np.nonzero(leak[:, x])[0]:
                above, below = col[col < y], col[col > y]
                if len(above) and len(below) and \
                        y - above[-1] <= ENCLOSE and below[0] - y <= ENCLOSE:
                    keepin[y, x] = True
        leak &= ~keepin

        out = hat.copy()
        out[leak] = 0
        # What the erase strands: fragments of neck and shoulder outline below
        # the hat, and the drawn eyes inside a helmet's face opening.  Both are
        # tiny against the hat itself, so keep only pieces that are a real share
        # of the largest one -- which still keeps a genuinely two-part hat (a
        # pair of ears, a pair of horns), where the pieces are comparable.
        rest = out[:, :, 3] > ALPHA_T
        lab, k = ndi.label(rest, np.ones((3, 3)))
        if k:
            sizes = np.array(ndi.sum(rest, lab, range(1, k + 1)))
            floor = max(MIN_KEEP, KEEP_FRAC * sizes.max())
            out[np.concatenate([[False], sizes < floor])[lab]] = 0

        m = out[:, :, 3] > ALPHA_T
        if not m.any():
            raise SystemExit(f'{hid}/{d}: erasing the body left nothing — this hat '
                             'is entirely body leak, it needs regenerating')
        ys, xs = np.nonzero(m)
        bb = [int(xs.min()), int(ys.min()),
              int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)]
        anchor = [int(bb[0] + round(bb[2] / 2)), int(bb[1])]
        meta['bboxes'][d] = bb
        meta['anchors'][d] = anchor
        # crown_in_frame is a property of the frame and did not move, so the
        # nudge re-derives against the same point and placement is preserved
        meta['crownNudge'][d] = [int(anchor[0] - crown[0]), int(anchor[1] - crown[1])]
        Image.fromarray(out.astype(np.uint8)).save(p)
        changed[d] = (int(hm.sum()), int(leak.sum()))

        if meta.get('clipsHair'):
            mask = np.zeros((FRAME, FRAME, 4), np.uint8)
            for x in range(FRAME):
                col = np.nonzero(m[:, x])[0]
                if len(col):
                    mask[col.min():, x] = (255, 255, 255, 255)
            Image.fromarray(mask).save(f'{HAT.format(id=hid)}/hairmask/{d}.png')

        if debug:
            dbg = np.zeros((FRAME, FRAME, 3), np.uint8)
            dbg[B[:, :, 3] > ALPHA_T] = (60, 60, 90)
            dbg[hm] = hat[hm][:, :3].astype(np.uint8)
            dbg[leak] = (255, 0, 0)
            Image.fromarray(dbg).save(f'{debug}/{hid}-{d}.png')

    # thumbnail follows the new south bbox
    south = np.array(Image.open(f'{HAT.format(id=hid)}/south.png').convert('RGBA'))
    bb = meta['bboxes']['south']
    th = Image.fromarray(south[bb[1]:bb[1] + bb[3], bb[0]:bb[0] + bb[2]])
    th = th.resize((128, max(1, round(128 * bb[3] / bb[2]))), Image.LANCZOS)
    th.save(f'{HAT.format(id=hid)}/thumb.png')

    meta['note'] = (meta.get('note', '') + ' v2.3.1491: the body that leaked in '
                    'with the art was subtracted afterwards by '
                    'tools/strip_body_from_headwear.py, and bboxes/anchors/'
                    'crownNudge re-derived from what was left.')
    with open(f'{HAT.format(id=hid)}/meta.json', 'w') as fh:
        json.dump(meta, fh, indent=2)
        fh.write('\n')
    tot = sum(v[0] for v in changed.values())
    leaked = sum(v[1] for v in changed.values())
    print(f'{hid:<18} {leaked:5d} of {tot:5d} px were body ({100 * leaked / tot:3.0f}%)')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ids', default=None)
    ap.add_argument('--all-generated', action='store_true')
    ap.add_argument('--debug', default=None)
    args = ap.parse_args()
    if args.debug:
        os.makedirs(args.debug, exist_ok=True)
    if args.all_generated:
        ids = [d for d in sorted(os.listdir('public/sprites/traits/headwear'))
               if os.path.isfile(f'public/sprites/traits/headwear/{d}/meta.json')
               and 'import_headwear' in json.load(
                   open(f'public/sprites/traits/headwear/{d}/meta.json')).get('note', '')]
    else:
        ids = args.ids.split(',')
    for hid in ids:
        strip(hid, args.debug)


if __name__ == '__main__':
    main()
