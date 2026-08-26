#!/usr/bin/env python3
"""v2.3.1955: put a helmet's FAR ear flap behind the head, where it belongs.
   v2.3.1958: ...and it was picking the WRONG flap.  Read that section first.

WRITTEN IN PARALLEL WITH v2.3.1963, WHICH REACHED THE SAME PLACE
----------------------------------------------------------------
Two sessions were handed the owner's "you went the wrong direction" report at
the same time.  v2.3.1963 (branch claude/dodge-roll-grok-prompt-xb24zn) landed
first and reached the SAME discriminator from the same evidence -- the body
sprite paints the character's ear on the side that faces the camera, so that
side is near -- which is worth knowing on its own: it was derived twice,
independently, off the same stand sheets.  Take that as the settled part.

This file differs from v2.3.1963 in exactly two places, and both differences
come from RENDERING the proposed erase on the head rather than from a further
argument:

  1. EAST IS NOT A TURNED FACING.  v2.3.1963 carries NEAR_SIDE['east'] =
     'left' -- the ear is drawn on the viewer's left in profile, so the
     viewer's right is treated as far.  But a profile has no far side in the
     frame at all: the far half of the head is behind the skull and is not
     drawn, so every piece of hat in an east frame is on the near side by
     construction.  Run it over the catalogue and it offers up two erases,
     both of which were rendered and both of which are damage: shark-hat east
     loses 38px of the shark's lower JAW, spartan-helmet east loses 28px off
     the bottom of the near CHEEK GUARD, leaving the helmet cut off square
     above the jaw.  (These are the same two erases v2.3.1955 proposed, at the
     same pixel counts -- on a profile the old rule and the new one happen to
     agree, so flipping the polarity did not rescue them.)  east is therefore
     absent from NEAR_SIDE here and refused by name.
  2. ERASE WHAT THE HEAD COVERS, NOT THE WHOLE FLAP -- see below.

If these are not wanted, the two lines to change are NEAR_SIDE and the
`covered` intersection in judge(); nothing else here depends on them.

Owner, with a screenshot of the Barbarian Helmet on a three-quarter view:
"Barbarian ears need to be hidden based on correct layering. Left ear (my
left) should be layered behind the head not in front."

What is wrong
-------------
Headwear is ONE sprite drawn over the head, so every part of it is in front of
the face by construction. That is right for a brow band and right for the ear
flap on the near side. It is wrong for the flap on the FAR side: on a
three-quarter view that flap is on the other side of the skull, so the head
should hide it -- and instead it is painted on the cheek, which reads as a
sticker rather than as a helmet.

Why the art and not a z-order
-----------------------------
Drawing part of a hat under the head would need the two-clone trick the slung
shield uses (v2.3.1782: a LOW copy before the body and a HIGH copy after), in
three renderers -- the world, the portrait, and the attack stand-ins. That is
three places to keep in step for one hat detail, so this tool bakes the same
result into the art instead: erase exactly the pixels the head would have
covered, which is by definition what the LOW copy would have had hidden.

v2.3.1958 corrected the measurement this paragraph used to lean on. It read
"the far flap lands ENTIRELY inside the head's silhouette (southwest: flap x
131..158 against a head spanning 96..163), so a lower layer would have nothing
to show" -- but x 131..158 is the viewer-RIGHT flap, which is the NEAR ear (see
below), and the actual far flap is 83% covered, not 100%. The 17% that hangs
past the outline is precisely the sliver you are supposed to see of a flap
behind a head, so it stays.

Which flap is the far one -- v2.3.1955's answer, and why it was backwards
------------------------------------------------------------------------
v2.3.1955 reasoned it out per flap: "a facing that draws TWO flaps under the
brow band is a three-quarter view, and the NEAR flap is the one that reaches
the head's silhouette edge -- it is on the side turned toward the camera, so
it hangs off the outline."  That shipped, and the owner came straight back:
"for the barbarian hat you went the wrong direction.  It was supposed to be
the other way around (my left)."

The heuristic is not merely unlucky, it is inverted BY CONSTRUCTION for this
art, and the stand sheet says so.  On southwest, barbarian-helmet's two flaps
place at x 96..110 and x 137..156 against a head spanning 96..163.  The rule
read "the left one touches 96, so the left one is near" -- but the head's own
outline is not symmetric about the face: on a three-quarter the SKULL bulges
out on the near side, past the ear, to x 163, while the near ear guard stops
at 156.  The near flap therefore sits INBOARD and the far flap, drawn as a
sliver peeking round the far cheek, is the one flush with the outline.  Every
three-quarter hat in the catalogue is drawn that way.

Which side is near -- measured, not reasoned
--------------------------------------------
The body sheet already answers it, and it is a FIXED PER-FACING FACT rather
than anything to measure per flap:

  * stand-southwest paints exactly ONE ear, a "C" on the VIEWER'S RIGHT at
    x 148..151.  A sprite draws the near ear and lets the skull hide the far
    one -- so on southwest the near side is the viewer's right.
  * the same sheet's eye whites sit 8.3px LEFT of the head's centre (x 121.2
    against a mid of 129.5): the face is turned toward the viewer's left,
    which is the same statement.  A head turned to its own right presents its
    LEFT side, and that side lands on the viewer's right.
  * stand-northeast likewise paints its one ear on the viewer's RIGHT.
  * stand-south paints an ear on BOTH sides and centres the eyes (-2.0px):
    dead-on, both ear pieces belong, there is no far side.
  * stand-east/west are profiles: the eyes sit 9.5px to the nose's side and
    only ONE side of the head exists in the frame at all.  Everything drawn
    is near.

So the far flap is the one on the VIEWER'S LEFT, on southwest and northeast,
and on no other stored facing.  The three mirrored views (southeast, west,
northwest) come out right for free because mirroring flips head and hat
together.  NEAR_SIDE below is that table; it is the whole discriminator.

The artist's own convention corroborates it: on every three-quarter frame the
near flap is drawn full and the far one as a sliver.  barbarian-helmet
southwest 86px right vs 69px left, old-school-helmet 107 vs 30, russian-hat
201 vs 53.  v2.3.1955 erased the big one each time.

Erase what the head COVERS, not the whole flap
----------------------------------------------
v2.3.1955 removed a far flap outright, and v2.3.1963 kept that part.  It is
right only when the flap lands entirely inside the head, and whether it does
is a property of the HAT, not of the rule.  Measured against the placed head
silhouette on southwest: barbarian-helmet's far flap is 83% covered
(264 of 318 placed px), old-school-helmet's 53% (64 of 120), and russian-hat's
only 13% (28 of 212) -- russian-hat's far flap hangs down past the jaw, beside
the neck, where nothing occludes it.  Rendered three ways, deleting it whole
takes that visible sliver with it and the ushanka comes out with a flap on one
side and a bare temple on the other; clipping to the head changes 28px and is
indistinguishable from the shipped frame.

So the erase is intersected with the head mask: exactly the pixels the LOW
copy of a z-order would have had hidden, and not one more.  The part of a far
flap that clears the outline is not a mistake -- it is the sliver you are
supposed to see of something behind a head.

A facing with no far side (south, east, north) is refused outright, by NAME.
v2.3.1955 inferred "profile" from the flap COUNT, and that misfires on any
hat whose art happens to leave two disconnected pieces below the band:
shark-hat east offers up the shark's tail fin and its lower JAW, spartan-
helmet east its neck guard and the near cheek guard (100% inside the head, so
the old rule was maximally confident about it), and golden-bucket south the
two lower corners of the bucket rim.  All four were rendered on the head and
all four came out damaged -- a bucket with a corner bitten off, a shark with
no chin.  Counting pieces cannot tell you where the camera is; the facing can.

What this does NOT touch
------------------------
The hat's hair-clip mask is left exactly as it is on disk, deliberately. The
mask is derived from the art, so the obvious follow-up is to re-run
make_hairmask.py -- and MEASURED, that would not be a re-derivation, it would
be a rewrite: barbarian-helmet's shipped masks are ~4,100px per frame and the
current generator produces ~13,000px, because the ones on disk predate the
v2.3.1529 "everything below the hat, full width" rule. Regenerating would let
three times as much hair through, which is a look change nobody asked for and
has nothing to do with an ear flap. (The flap that was erased sat inside the
head, so the mask barely wants to change anyway: 15px on southwest.) That
staleness is worth knowing about on its own and is written down here rather
than fixed in passing.

RENDER IT BEFORE YOU APPLY IT -- the report is not the acceptance test
----------------------------------------------------------------------
What NEAR_SIDE settles is which SIDE is hidden.  What nothing here settles is
whether the piece hanging below the band is an ear flap at all: "connected
component under the widest row" also catches a bucket's rim corners, a shark's
tail fin and a spartan neck guard, and it flags all three with the same
confidence it flags a real ear cup.  v2.3.1958 caught four such false
positives only by drawing the hat on the head and looking at it -- the numbers
said nothing was wrong.  Render the hat on the body at every facing the player
can see (the five stored ones plus the mirrored southeast and west), before
and after, and compare, every time.

Run from the repo root:
    python3 tools/ui/hide-far-earflap.py --ids barbarian-helmet          # report
    python3 tools/ui/hide-far-earflap.py --ids barbarian-helmet --apply
    python3 tools/ui/hide-far-earflap.py --all                           # report on every hat
"""
import argparse
import json
import os
from collections import deque

import numpy as np
from PIL import Image

HEADWEAR = 'public/sprites/traits/headwear'
BODY = 'public/sprites/player/stand-{dir}.png'
BODY_TOPS = 'public/sprites/player/body-tops.json'
DIRS = ['south', 'southwest', 'east', 'northeast', 'north']
ALPHA_T = 16
FRAME = 256
# v2.3.1958: which side of the head faces the camera on each STORED facing,
# and therefore which side a far ear flap is on.  None means the facing has no
# far side and is refused outright.  Measured off the stand sheets themselves
# -- see "Which side is near" in the docstring -- because a per-flap heuristic
# is what got v2.3.1955 the wrong ear.  The three mirrored views inherit their
# answer from the frame they mirror, so they are not listed.
#   south      dead-on, an ear painted on each side, eyes centred to -2.0px
#   southwest  one painted ear on the VIEWER'S RIGHT, eyes 8.3px left of mid
#   east       profile: the far half of the head is not in the frame at all,
#              so nothing drawn in an east frame can be on the far side.
#              v2.3.1963 lists east as 'left'; rendering its two candidates
#              showed a bitten-off shark jaw and a cut-off cheek guard
#   northeast  one painted ear on the VIEWER'S RIGHT, face turned away
#   north      dead-behind, symmetric
NEAR_SIDE = {'south': None, 'southwest': 'right', 'east': None,
             'northeast': 'right', 'north': None}
# Rows of the helmet that count as the BAND: any row at least this share of the
# helmet's widest row.  Below the band there is nothing but flaps.
BAND_SHARE = 0.55
# Below this a piece under the band is a stray pixel, not an ear flap.  Without
# it --all reports one- and two-pixel "flaps" on half the catalogue, which
# makes the report useless as a shopping list.
MIN_FLAP = 12
# The version tag stamped into a hat's meta.json note when a flap is erased.
# v2.3.1958: this was the string literal 'v2.3.1955' inside main(), which was
# right on the day the tool was written and wrong on the second run -- the
# five hats judged in v2.3.1958 would have claimed to have been edited in
# v2.3.1955, and the note is the only record on disk of WHEN a frame lost
# pixels.  Bump it when you run the tool; it is the run's tag, not the tool's.
RUN_TAG = 'v2.3.1958'


def _load256(path):
    im = Image.open(path).convert('RGBA')
    if im.width != FRAME:
        im = im.resize((FRAME, round(im.height * FRAME / im.width)), Image.NEAREST)
    return np.array(im)


def _place(art256, meta, d, tops):
    """Where _placeTrait puts this frame on the standing body, in the 256 frame."""
    a = meta['anchors'][d]
    n = meta.get('crownNudge', {}).get(d, [0, 0])
    sc = meta.get('scale', {}).get(d, 1)
    art = art256
    if sc != 1:
        art = np.array(Image.fromarray(art).resize((max(1, round(FRAME * sc)),) * 2, Image.NEAREST))
        a = [a[0] * sc, a[1] * sc]
        n = [n[0] * sc, n[1] * sc]
    bx, by = tops[f'stand-{d}-0']
    dx, dy = round(bx - (a[0] - n[0])), round(by - (a[1] - n[1]))
    out = np.zeros((FRAME, FRAME, 4), np.uint8)
    hh, hw = art.shape[:2]
    ys, xs = slice(max(0, dy), min(FRAME, hh + dy)), slice(max(0, dx), min(FRAME, hw + dx))
    sy, sx = slice(max(0, -dy), min(hh, FRAME - dy)), slice(max(0, -dx), min(hw, FRAME - dx))
    out[ys, xs] = art[sy, sx]
    return out


def _components(mask):
    h, w = mask.shape
    seen = np.zeros_like(mask)
    out = []
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not seen[y, x]:
                q = deque([(y, x)])
                seen[y, x] = True
                px = []
                while q:
                    cy, cx = q.popleft()
                    px.append((cy, cx))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                                seen[ny, nx] = True
                                q.append((ny, nx))
                out.append(px)
    return out


def flaps(art_mask):
    """The connected pieces hanging BELOW the helmet's brow band."""
    rows = np.nonzero(art_mask.any(axis=1))[0]
    if not len(rows):
        return None, []
    widths = {y: int(art_mask[y, :].sum()) for y in range(rows.min(), rows.max() + 1)}
    maxw = max(widths.values())
    band = [y for y, wv in widths.items() if wv >= BAND_SHARE * maxw]
    if not band:
        return None, []
    band_bot = max(band)
    below = art_mask.copy()
    below[:band_bot + 1, :] = False
    comps = [c for c in _components(below) if len(c) >= MIN_FLAP]
    comps.sort(key=lambda c: min(x for _, x in c))
    return band_bot, comps


def judge(hid, d, meta, tops, verbose):
    """-> (list of art-space pixels to erase, note).

       v2.3.1958: the far flap is the one on the side the camera CANNOT see,
       which NEAR_SIDE states per facing, and the pixels erased are only the
       ones the head would have covered.  The previous per-flap "which one
       reaches the silhouette edge" test lives on in the docstring as the
       thing that shipped the wrong ear on barbarian-helmet."""
    near = NEAR_SIDE.get(d)
    if near is None:
        return [], f'{d} has no far side (dead-on, profile or dead-behind) - refusing'
    p = f'{HEADWEAR}/{hid}/{d}.png'
    if not os.path.isfile(p) or d not in meta.get('anchors', {}):
        return [], 'no frame'
    art = np.array(Image.open(p).convert('RGBA'))
    band_bot, comps = flaps(art[:, :, 3] > ALPHA_T)
    if not comps:
        return [], 'nothing hangs below the band'

    body = _load256(BODY.format(dir=d))
    head = body[:, :, 3] > ALPHA_T
    by = tops[f'stand-{d}-0'][1]
    head[:by, :] = False
    head[by + 70:, :] = False
    hcols = np.nonzero(head.any(axis=0))[0]
    mid = (int(hcols.min()) + int(hcols.max())) / 2

    px = []
    for i, c in enumerate(comps):
        # ONE placement per flap, with each of its art pixels carrying its own
        # index in R/G, so the pixels that land inside the head can be mapped
        # straight back to art space.  Placing them one at a time would be the
        # obvious way and is 300x the work for the same answer.
        probe = np.zeros_like(art)
        for k, (y, x) in enumerate(c):
            probe[y, x] = (k & 255, (k >> 8) & 255, 0, 255)
        pl = _place(_load256_from(probe), meta, d, tops)
        hit = pl[:, :, 3] > ALPHA_T
        if not hit.any():
            if verbose:
                print(f'      flap {i} places off-frame, ignored')
            continue
        cx = float(np.nonzero(hit)[1].mean())
        side = 'left' if cx < mid else 'right'
        covered = hit & head
        # A NEAREST downscale can drop source pixels, so an index that never
        # appears is simply not erased.  That errs toward leaving art alone,
        # which is the safe direction for an operation with no undo.
        idx = sorted(set((pl[:, :, 0][covered].astype(int)
                          | (pl[:, :, 1][covered].astype(int) << 8)).tolist()))
        far = side != near
        if verbose:
            print(f'      flap {i} ({side:<5}) {len(c):4d}px art, placed centre '
                  f'{cx:5.1f} vs head mid {mid:5.1f}, {int(covered.sum())}/{int(hit.sum())} '
                  f'px behind the head'
                  f'{"   <- FAR side, hiding what the head covers" if far else ""}')
        if far:
            px += [c[k] for k in idx if k < len(c)]
    if not px:
        return [], 'nothing on the far side that the head covers'
    return px, f'far flap on the viewer-{"left" if near == "right" else "right"}, {len(px)}px covered'


def _load256_from(art):
    if art.shape[0] == FRAME:
        return art
    return np.array(Image.fromarray(art).resize((FRAME, FRAME), Image.NEAREST))


def erase(hid, d, art_px, apply_it):
    """Erase the same flap from the base frame AND its hi/ twin, which the
       portrait prefers (v2.3.1579) -- editing one and not the other would fix
       the world and leave the creator wrong, or the reverse."""
    wrote = []
    for rel in [f'{d}.png', f'hi/{d}.png']:
        p = f'{HEADWEAR}/{hid}/{rel}'
        if not os.path.isfile(p):
            continue
        im = Image.open(p).convert('RGBA')
        a = np.array(im)
        k = a.shape[0] // 128        # the hi/ twin is an exact 2x of the base
        cleared = 0
        for (y, x) in art_px:
            for dy in range(k):
                for dx in range(k):
                    yy, xx = y * k + dy, x * k + dx
                    if 0 <= yy < a.shape[0] and 0 <= xx < a.shape[1] and a[yy, xx, 3] > 0:
                        a[yy, xx] = (0, 0, 0, 0)
                        cleared += 1
        if apply_it:
            Image.fromarray(a).save(p)
        wrote.append((rel, cleared))
    return wrote


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ids', default=None)
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()
    tops = json.load(open(BODY_TOPS))
    ids = (sorted(os.listdir(HEADWEAR)) if args.all
           else (args.ids.split(',') if args.ids else None))
    if not ids:
        raise SystemExit('pass --ids or --all')
    for hid in ids:
        mp = f'{HEADWEAR}/{hid}/meta.json'
        if not os.path.isfile(mp):
            continue
        meta = json.load(open(mp))
        touched = False
        for d in DIRS:
            px, note = judge(hid, d, meta, tops, verbose=bool(args.ids))
            if px:
                touched = True
                print(f'  {hid:<20} {d:<10} {note}')
                for rel, n in erase(hid, d, px, args.apply):
                    print(f'      {"erased" if args.apply else "would erase"} {n:5d}px from {rel}')
            elif args.ids:
                print(f'  {hid:<20} {d:<10} {note}')
        if touched and args.apply:
            meta['note'] = (meta.get('note', '') + f' {RUN_TAG}: the part of the FAR ear flap '
                            'that the head covers was erased from the three-quarter frames by '
                            'tools/ui/hide-far-earflap.py -- the flap is on the other side of the '
                            'skull, so the head hides it; drawn over the cheek it read as a sticker '
                            '(owner report).  FAR means the viewer-LEFT flap on southwest and '
                            'northeast, which is what the stand sheet\'s own single painted ear '
                            'says; v2.3.1955 took the viewer-RIGHT one and had it backwards.')
            with open(mp, 'w') as fh:
                json.dump(meta, fh, indent=2)
                fh.write('\n')
    print('done' + ('' if args.apply else '  (dry run — pass --apply)'))


if __name__ == '__main__':
    main()
