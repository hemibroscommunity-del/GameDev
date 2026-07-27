#!/usr/bin/env python3
"""v2.3.1510: catch and fix a hat that ended up FLOATING above the head.

What this is for
----------------
import_headwear_green.py places a hat by fitting the cell's green silhouette
against the real body and scoring the shoulders.  When the generator draws the
figure off-model -- narrower and taller than the mannequin, which four of the
re-cut sheets were -- the fitter enlarges the figure to match the shoulder
width and overshoots its height.  Everything is bottom-anchored, so that height
error accumulates all the way up to the head and lifts the hat clear off it.

The fit score mostly predicts this, but not always: the Axe On Head's northeast
cell scored 0.951 ("good") and still floated 8px.  So this measures the thing
that actually matters instead of a proxy for it.

The measurement
---------------
Over the middle half of the body's width, the median of

    (top row of the body)  -  (bottom row of the hat)

NEGATIVE means the hat overlaps the skull, which is what wearing a hat looks
like.  POSITIVE means there is clear air between them.

Positive is provably wrong, and the proof does not need a judgement call: on
every cell of every green sheet measured, the hat is drawn RESTING on the
silhouette (the same statistic taken on the source art is 0-2 art pixels, i.e.
under one game pixel, because the green is what the hat is covering).  A hat
that rests on the head in the art cannot be hovering above it in the game.

Where it gets seated to
-----------------------
Not to zero.  A correctly-registered hat does not balance on the crown, it cuts
into it, because the game's head is rounder than the flat scalp the generator
draws.  Measured across the 23 hats already imported this way, the well-seated
cells cluster tightly -- south -9.5..-6, southwest -15..-10, east -15..-9,
northeast -25..-19, north -20..-15.5 (interquartile) -- and the two sheets in
this batch that registered cleanly (Barbarian Helmet at 0.95-0.99, Evil Crown
at 0.95-0.99) land within 2px of those medians in all five directions.  So the
median is where a correctly-placed hat lands, and it is what a floating one is
moved to.

One correction for the whole hat, not five
------------------------------------------
Seating each direction independently was tried first and is wrong.  A hat whose
south cell floats but whose north cell merely sits shallow would have south
dropped 13px and north left alone, and the hat would visibly jump down the
moment the player turned to face the camera.

The error is not per-direction anyway.  Every cell on a sheet is registered
against the same off-model figure, so all five inherit ONE scale error, and the
numbers say so plainly: the Army Helmet's five cells sit 13, 9, 7.5, 10 and 9px
shallower than their reference, and the Golden Bucket's 16, 19, 15.5, 15, 19.
So the whole hat is moved by the MEDIAN of those five, which puts every
direction back within a few pixels of where a well-registered hat lands while
keeping the hat's own shape from direction to direction exactly as drawn.

The move is never upward and never less than it takes to close the largest
float, so a hat that already touches the head in every direction is left
completely alone.

A pixel or two of air is not a float (v2.3.1511)
------------------------------------------------
The first cut of this fired on ANY positive gap, and it was wrong.  The New
Idea -- a lightbulb standing on the scalp -- registered at 0.971-0.993, as good
as anything here, measured a gap of 0, +2, +1, 0, 0, and got driven 15px down
into the skull for it.

At this size the hat is downscaled 5:1 out of the art, so a gap of one or two
pixels is the rounding, not a finding.  Only a gap of FLOAT_T or more counts,
which is where the two populations actually separate: everything genuinely
lifted off the head sits at 6-9px (Golden Bucket 9, Axe On Head 9, Cat Ears 7,
Blonde Hair 7, Army Helmet 6) and everything correctly placed sits at 0-2
(New Idea 2, Flat Top 1, Devil Horns 1, Spartan Helmet 1, Afro 2, Slick Back 2,
Headphones 2).  Nothing lands in between.

Run from the repo root:
    python3 tools/seat_headwear.py                 # report only, every hat
    python3 tools/seat_headwear.py --apply
    python3 tools/seat_headwear.py --ids a,b --apply
"""
import argparse
import json
import os
import numpy as np
from PIL import Image

DIRS = ['south', 'southwest', 'east', 'northeast', 'north']
BODY = 'public/sprites/player/stand-{dir}.png'
BODY_TOPS = 'public/sprites/player/body-tops.json'
TRAITS = 'public/sprites/traits'
FRAME = 256
ALPHA_T = 16
CENTRE = 0.25        # the middle half of the body's width is what "on the head" means
FLOAT_T = 4          # px of air below which the gap is 5:1 downscale rounding
# Median seating depth of the well-registered population, per direction.
REF = {'south': -7, 'southwest': -13, 'east': -12, 'northeast': -23, 'north': -18}

_bodies = {}


def body_mask(d):
    if d not in _bodies:
        sh = Image.open(BODY.format(dir=d)).convert('RGBA')
        fw = sh.height
        _bodies[d] = np.array(sh.crop((0, 0, fw, fw))
                              .resize((FRAME, FRAME), Image.NEAREST))[:, :, 3] > ALPHA_T
    return _bodies[d]


def body_in_frame(d, crown, tops):
    """The game's stand frame, shifted so its crown sits on the point the hat
    frame calls the crown -- i.e. laid out exactly as the game will draw it."""
    bx, by = tops[f'stand-{d}-0']
    dy, dx = by - crown[1], bx - crown[0]
    src = body_mask(d)
    out = np.zeros((FRAME, FRAME), bool)
    r0, r1 = max(0, -dy), min(FRAME, FRAME - dy)
    c0, c1 = max(0, -dx), min(FRAME, FRAME - dx)
    if r1 > r0 and c1 > c0:
        out[r0:r1, c0:c1] = src[r0 + dy:r1 + dy, c0 + dx:c1 + dx]
    return out


def seat_gap(hat_mask, body):
    """(top of body) - (bottom of hat), over the middle half of the body."""
    xs = np.nonzero(body.any(axis=0))[0]
    if not len(xs):
        return None
    w = xs.max() - xs.min() + 1
    lo, hi = int(xs.min() + CENTRE * w), int(xs.min() + (1 - CENTRE) * w)
    v = []
    for x in range(lo, hi):
        h = np.nonzero(hat_mask[:, x])[0]
        b = np.nonzero(body[:, x])[0]
        if len(h) and len(b):
            v.append(b.min() - h.max())
    return float(np.median(v)) if v else None


def measure(hid, meta):
    """Seating depth of every direction of one hat."""
    tops = json.load(open(BODY_TOPS))
    root = f"{TRAITS}/{meta.get('category', 'headwear')}/{hid}"
    gaps = {}
    for d in DIRS:
        p = f'{root}/{d}.png'
        if not os.path.isfile(p):
            continue
        hm = np.array(Image.open(p).convert('RGBA'))[:, :, 3] > ALPHA_T
        a, n = meta['anchors'][d], meta['crownNudge'][d]
        g = seat_gap(hm, body_in_frame(d, (a[0] - n[0], a[1] - n[1]), tops))
        if g is not None:
            gaps[d] = g
    return gaps


def reseat(hid, meta, apply_it=True, quiet=False):
    """Seat one hat if any direction of it floats.  Returns the drop applied.

    Only crownNudge changes -- the artwork and its bbox are untouched, because
    the hat itself is correct, it is only being told where the head is."""
    gaps = measure(hid, meta)
    floating = {d: g for d, g in gaps.items() if g >= FLOAT_T}
    if not floating:
        return 0
    drop = int(round(max(np.median([g - REF[d] for d, g in gaps.items()]),
                         max(floating.values()))))
    if drop <= 0:
        return 0
    if apply_it:
        for d in gaps:
            # the hat moves DOWN relative to the body when the point the frame
            # calls the crown moves UP inside the frame
            n = meta['crownNudge'][d]
            meta['crownNudge'][d] = [n[0], int(n[1] + drop)]
    if not quiet:
        was = ' '.join(f'{d[:2]}{gaps[d]:+.0f}' for d in DIRS if d in gaps)
        now = ' '.join(f'{d[:2]}{gaps[d] - drop:+.0f}' for d in DIRS if d in gaps)
        print(f'  {hid:<20} floated in {len(floating)}/{len(gaps)} directions — '
              f'whole hat seated {drop:+d}px\n{"":<22}was {was}   now {now}')
    return drop


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ids', default=None)
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()

    total = 0
    for cat in ('headwear', 'hair'):
        base = f'{TRAITS}/{cat}'
        if not os.path.isdir(base):
            continue
        for hid in sorted(os.listdir(base)):
            mp = f'{base}/{hid}/meta.json'
            if not os.path.isfile(mp):
                continue
            if args.ids and hid not in args.ids.split(','):
                continue
            meta = json.load(open(mp))
            if 'import_headwear_green' not in meta.get('note', ''):
                continue          # only the green-sheet imports place this way
            drop = reseat(hid, meta, apply_it=args.apply)
            total += 1 if drop else 0
            if drop and args.apply:
                meta['note'] = (meta.get('note', '') + f' v2.3.1510: floated clear of '
                                f'the head, so the whole hat was seated {drop}px lower '
                                'by tools/seat_headwear.py.')
                with open(mp, 'w') as fh:
                    json.dump(meta, fh, indent=2)
                    fh.write('\n')
    print(f'{total} hat(s) {"seated" if args.apply else "would be seated"}')


if __name__ == '__main__':
    main()
