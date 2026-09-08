#!/usr/bin/env python3
"""v2.3.1502: import a hat from a GREEN-SILHOUETTE sheet.

Supersedes the diff-based path in import_headwear.py, which is kept only for
reference.  That one had to *infer* which pixels were hat, by subtracting a
rebuilt mannequin and then rescuing the result with colour tests, connectivity
rules and size filters.  Every one of those is a guess, and they failed the way
guesses do: the whole batch shipped with the drawn head still inside each hat
frame, and the erase written to remove it tore holes in the hats instead.

Here the generator is asked to paint the person flat #00FF00 and leave the hat
alone.  That turns the hard question into a trivial one:

    hat  = every pixel that is neither the magenta backdrop nor the green person
    head = the green, which IS the body silhouette, at the size and position it
           was drawn at

No diff, no rebuilt mannequin to line up against, no colour heuristics, nothing
to tear.  A hat may be any colour it likes -- a skin tone, black, the same grey
as the body outline -- and it still comes out whole.

The green also makes registration better rather than merely possible.  The diff
path had to fit on the TORSO alone, because the head was the thing being
measured and could not be used to measure itself.  A flat silhouette has no such
conflict, so the fit runs against the whole body: far more constrained, and
immune to the "redrawn at 73% and re-laid-out" sheets that forced registration
into existence in the first place.

What makes a good sheet (measured, v2.3.1506)
--------------------------------------------
Every cell is fitted by matching its green silhouette against the real body, so
the fit score doubles as a fidelity check on how faithfully the generator
redrew that figure.  Across 15 sheets:

  * ONE AT A TIME BEATS BATCHING.  Ten sheets processed in one go all came back
    with east fits of 0.767-0.880.  Sent individually, three of four landed at
    0.947-0.967.  Not a guarantee -- Russian Hat still came back 0.809 -- but
    clearly worth the extra effort.
  * EAST IS ALWAYS THE WEAKEST CELL, on every sheet, however it was produced.
  * A SECOND EDITING PASS IS NOT MEASURABLY WORSE.  Safety Helmet was sent
    through twice (its outline was incomplete the first time) and came back at
    the same drift as single-pass Russian Hat -- east 12% off that sheet's own
    mean scale, 0.25 scale spread, against 0.02-0.16 for the well-behaved ones.
    Two samples is not proof either way; recorded so the next person does not
    assume re-editing is free OR that it is ruinous.

  Correction: v2.3.1506's commit message called Safety Helmet the batched
  control.  It was not -- it was a re-edit.  The case for one-at-a-time rests
  on the four singles against the earlier ten-sheet batch, not on it.
  * WHAT A BAD FIT ACTUALLY DOES TO THE HAT (v2.3.1510).  A poor sheet is one
    drawn NARROW AND TALL: the fitter scales it up to match the shoulders, and
    the extra height, with everything bottom-anchored, lifts the hat clear off
    the head.  Four of the five sheets in the 2026-07-27 batch did this, all
    five cells of the Axe On Head among them.  Sheets scoring 0.95+ land within
    2px of where a hat should sit; sheets in the 0.78-0.92 band land 7-9px high.
    tools/seat_headwear.py now measures and repairs that at the end of every
    import, so a soft sheet is no longer a wasted one -- but a soft sheet is
    still a soft sheet, and re-cutting it is still better.

Run from the repo root:
    python3 tools/import_headwear_green.py --art sheet.png --id fez --name "Fez"
    [--category headwear|hair|eyewear]
    [--omit north,...]  directions the piece is not visible from (see below)
    [--clips-hair]  also emit hairmask/*.png
    [--debug DIR]   per-direction previews of what was keyed

EYEWEAR (v2.3.2361)
-------------------
The same sheet, the same green person, the same keying: a pair of glasses is
everything that is neither magenta nor green, and it lands in the 256 frame at
its true position on the face -- so `crownNudge` comes out as the drop from the
crown to the eye line, exactly as the beard's is the drop to the chin.
hat_of() takes any ink near the figure that reaches down toward the head, which
frames on a face do.

PLACED BY THE HEAD, NOT THE SHOULDERS.  The hat registration fits each cell on
the bottom 45% of the figure with ONE uniform scale, bottom-anchored, because a
hat may cover the whole head.  That is wrong for a piece on the face, and it
was measured wrong before it was fixed: generators return sheets resized
NON-uniformly (0.66 across by 0.75 down on a real cape sheet; 0.71 by 0.76 on
the eyewear test sheet), so a width-matched scale carries an aspect error that
grows from the shoulders up to the eye line -- 5-6px of lift at the eyes on
every facing, which reads as glasses on the forehead.  A hat gets that error
taken out by the seat pass (it measures contact with the skull); glasses touch
nothing, so nothing caught it.

So for a FACE_WORN category the vertical axis is calibrated on two landmarks
that are both vertical: the crown of the drawn green (the scalp is visible when
the piece is on the face, which is exactly the case where it is NOT visible
under a hat) and the flat cut line at the bottom of the bust, mapped onto the
same two rows of the mannequin.  A squashed or stretched return is then exact
by construction.  The horizontal axis and the width keep the shoulder fit; the
height is resampled by the vertical scale so the aspect comes out right too.
The seat pass is skipped.  The piece search starts at the drawn crown rather
than at the sheet's edge (hat_of), because the reach a tall hat needs is
exactly what let the sheet's title into the tallest cell.  And every facing
that paints eyes is CHECKED: the piece's centre is printed against the centre
row of the eyes the game actually draws on that facing, and against the
midpoint between the two eyes where both are painted -- the WHOLE eye, its
black top edge to its pupil (eye_centres below), not the pupil, which sits
2.5px toward one side of the eye -- so an import that puts glasses on the
forehead or beside the eyes says so in numbers before anyone looks at a
screenshot.  A piece taller than most of the head is flagged as well.

THE PERSON'S OWN OUTLINE (v2.3.2362)
------------------------------------
The first real sheet came back with the green person OUTLINED IN BLACK -- which
is how pixel art is drawn, and which the prompt asking for a flat silhouette
did not prevent.  That outline is neither magenta nor green, so the keying
above took the whole head-and-shoulders outline as part of the glasses: the
"piece" measured 97-101% of the figure's height and its centre landed 14-26px
below the eyes.  Both numbers were printed by the checks below, which is the
only reason it did not ship.

An outline is separated from a piece by two facts, and it takes both:

  * IT IS THIN.  The outline is one art pixel; a lens, a frame, a brim is a
    blob.  So the piece is SEEDED on local thickness (OUTLINE_CORE) and grown
    back a bounded distance (OUTLINE_REACH) to recover its own thin parts --
    the nose bridge, a temple arm.  Bounded, because the outline TOUCHES the
    glasses where they cross the silhouette, so an unbounded flood would walk
    straight out of the piece and around the whole head.
  * IT HUGS THE SILHOUETTE.  The outline is the black BETWEEN the green and
    the backdrop; the piece's own outline is between the piece and the green.
    So near-black within OUTLINE_EDGE of BOTH keys is dropped, which also
    clears the stubs the bounded regrowth leaves where the two meet.

Both run only when an outline is actually THERE -- measured as the share of the
green silhouette's perimeter that near-black ink traces (OUTLINE_PERIM).  A
sheet whose person really is flat green has nothing to strip and takes exactly
the path it always did, which is what keeps this from re-cutting the 39 hats
and 8 hairstyles already imported.

A piece drawn ENTIRELY in near-black, at the very edge of the silhouette, is
the case this trims: its blobs survive on thickness, its outermost edge does
not.  No such piece has come through yet; the numbers below will say so if one
does.

The other addition is --omit.  Glasses are invisible from behind, and a cell with
nothing drawn on it used to abort the import ("no hat found beside the
silhouette") -- rightly, for a hat.  --omit names the directions the piece
ships WITHOUT: no png and no meta.anchors entry, which is the beard precedent
(v2.3.1530) the renderer already honours -- _placeTrait hides the piece on
that facing and the loader treats the 404 as designed.  A cell that is NOT
omitted and has nothing drawn still aborts, so a generator that forgot a cell
is still caught.  South cannot be omitted; it is the picker thumbnail.
"""
import argparse
import importlib.util
import json
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

TOOLS = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location(
    'make_headwear_mannequin', os.path.join(TOOLS, 'make_headwear_mannequin.py'))
_man = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_man)
_sspec = importlib.util.spec_from_file_location(
    'seat_headwear', os.path.join(TOOLS, 'seat_headwear.py'))
_seat = importlib.util.module_from_spec(_sspec)
_sspec.loader.exec_module(_seat)

BODY_TOPS = 'public/sprites/player/body-tops.json'
OUTDIR = 'public/sprites/traits/{cat}/{id}'
FRAME = 256
ALPHA_T = 16
TOP_MARGIN = 6       # where the hat's top sits inside its own frame
OVERSHOOT = 60       # 256-space rows sampled ABOVE the cell, for tall hats
KEY_TOL = 60         # how far a green region may sit from the key and still be head
TEXT_DROP = 0.30     # a real hat reaches at least this far down toward the crown
# v2.3.2362: the person's own outline (see the header).  Sheet px, at the ~5x
# the mannequin is drawn at, so one art pixel of outline is ~5 of these.
OUTLINE_CORE = 6     # local half-thickness at or above which ink SEEDS the piece
OUTLINE_REACH = 14   # how far the piece may grow back from a seed, along the ink
OUTLINE_EDGE = 5     # within this of BOTH keys, near-black is the silhouette edge
OUTLINE_PERIM = 0.25 # strip only when near-black traces this much of the perimeter
OUTLINE_SPECK = 0.03 # after stripping, drop piece parts under this share of the biggest
LENS_PAD = 4         # v2.3.2363: 256-space px the eye box grows by before the lens is flattened
SEAT_EYES_MAX = 8    # v2.3.2365: 256-space px a face-worn piece may be moved to sit on the eyes
DARK = 90            # per-channel ceiling for "near-black"
# v2.3.2361: categories worn ON THE FACE, placed by the head rather than the
# shoulders (see the EYEWEAR section of the header).  A future facial-hair
# import through this tool belongs here too: the crown is visible under a beard.
FACE_WORN = ('eyewear',)
EYE_MASK = 'src/rendering/eyeMask.json'


def eye_boxes(d):
    """The game's own eyes in stand-<d> frame 0 (256-space), as a list of
    (x0, x1, y0, y1) left to right, each the WHOLE eye; None where the facing
    paints no eyes (northeast, north).

    THE WHOLE EYE, NOT THE PUPIL.  An eye on these sheets is a 7-column box:
    a solid near-black TOP EDGE three rows deep, then rows of white, a blend
    column and the pupil (WWW+###).  The white sits on ONE side of the pupil
    only, so the pupil is not the middle of the eye -- it is 2.5px toward one
    side of it.  eyeMask.json records the PUPILS, because that is what the eye
    colour recolours (tools/eyes/extract-eye-mask.mjs), and the first cut of
    this check centred on them: every lens came out 2.5px toward the pupil
    side, which the owner saw at once ("too far to the right ... they should
    be centered on the width of each eye. The top of the eye is all black").
    So this walks UP from each pupil over the black top edge and takes that
    edge's run as the eye's width, and the top edge to the last pupil row as
    its height."""
    try:
        runs = json.load(open(EYE_MASK)).get(f'stand-{d}', [[]])[0]
        im = np.array(Image.open(_man.BODY.format(dir=d)).convert('RGBA')).astype(int)
    except (OSError, ValueError):
        return None
    if not runs:
        return None
    fw = im.shape[0]
    fr = im[:, :fw]                                   # frame 0; stand is a 256 frame
    dark = (fr[:, :, 3] > 40) & (fr[:, :, 0] < 70) & (fr[:, :, 1] < 70) & (fr[:, :, 2] < 70)
    runs = sorted(runs)
    eyes, cur = [], [runs[0]]
    for q in runs[1:]:
        if q[0] - cur[-1][0] > 4:                     # a gap in x: the other eye
            eyes.append(cur)
            cur = [q]
        else:
            cur.append(q)
    eyes.append(cur)
    out = []
    for e in eyes:
        xa, xb = min(q[0] for q in e), max(q[0] + q[2] for q in e)     # pupil cols [xa, xb)
        ya, yb = min(q[1] for q in e), max(q[1] + q[3] for q in e)     # pupil rows [ya, yb)
        top = ya
        while top - 1 >= 0 and dark[top - 1, xa:xb].all():             # up over the black top edge
            top -= 1
        x0, x1 = xa, xb
        while x0 - 1 >= 0 and dark[top, x0 - 1]:                       # the edge's full run = the eye's width
            x0 -= 1
        while x1 < fw and dark[top, x1]:
            x1 += 1
        out.append((x0, x1, top, yb))
    return out


def keys(rgb):
    """(magenta backdrop, green-ish, everything else).

    Green is keyed on DOMINANCE -- how much greener than either other channel --
    rather than on absolute values, because a hat is allowed to be green too.
    The Kermit cap is mint: its shadow reads (98,184,100), only 84 greener,
    against the key's 230.  A loose "is it greenish" test ate 4857px of that hat.

    Both keys stay loose at the edges on purpose; dekey_fringe below cleans up
    the blend band they leave behind, which is a job that needs the hat mask and
    cannot be done here."""
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    mag = (r > 150) & (b > 150) & (g < 90) & (np.abs(r - b) < 60)
    grn = (g > 150) & ((g - np.maximum(r, b)) > 120)
    return mag, grn, ~(mag | grn)


def panel_of(mag):
    """The magenta panel's bbox — crops off the page margin the generator adds."""
    lab, k = ndi.label(mag)
    if not k:
        raise SystemExit('no magenta panel found — is this a mannequin sheet?')
    sizes = np.array(ndi.sum(mag, lab, range(1, k + 1)))
    sl = ndi.find_objects(lab)[int(np.argmax(sizes))]
    return sl[1].start, sl[0].start, sl[1].stop, sl[0].stop


def dekey_fringe(rgb, hat, mag, grn):
    """Drop the blend band where the hat meets a key colour.

    A regenerated sheet has soft edges, so along every boundary sits a band that
    is part key and part hat.  It matches neither key test, falls into the hat,
    and survives the downscale as a coloured rim.

    The threshold has to be PER HAT, which took two goes to get right.  A fixed
    "tinted toward the key" test is wrong because a hat may legitimately be that
    colour -- 1134 of the Kermit cap's pixels read as green-tinted.  A brightness
    test is wrong too, and that is the one that shipped: it assumed the blend is
    the key mixed with the near-black OUTLINE, so it only caught dark ones, and
    the Dirty Blonde's blends are the key mixed with pale hair -- bright, and
    left a scatter of green speckles along every hair edge.

    So the hat sets its own threshold.  Pixels far from the key show what this
    hat's colour actually does (blonde hair sits at -60 green dominance, mint at
    +58); anything hugging the key that exceeds that by a clear margin is a
    blend, whatever the hat is made of."""
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    out = hat.copy()
    st = ndi.generate_binary_structure(2, 2)
    for key, tint in ((grn, g - np.maximum(r, b)), (mag, np.minimum(r, b) - g)):
        if not key.any():
            continue
        # Reach is in ART pixels, and the art is ~3.5 art px per game pixel, so
        # a one-game-pixel blend band is ~3.5 wide.  Searching 3 covered less
        # than a game pixel of it and left the rest to survive the downscale.
        near = ndi.binary_dilation(key, st, iterations=9)
        far = hat & ~ndi.binary_dilation(key, st, iterations=16)
        if far.sum() < 200:
            continue
        thresh = max(np.median(tint[far]) + 30, 15)
        out &= ~(hat & near & (tint > thresh))
    return out


def split_green(rgb, grn):
    """The head mask, and the five cells' body slices.

    Green regions come in three kinds and all three have bitten:

      * the five bodies;
      * SPLITS of a body -- a hat that crosses the head cuts the scalp off as
        its own region (Blue Bandana, Naruto Headband), and gaps between spiky
        hair leave a scatter of small ones (Dirty Blonde, 1209px across 5 cells);
      * a green HAT's own shading, which keys as green but is not head (the
        Kermit cap threw off 121 regions).

    Sorting them by SIZE fails: a hair gap and a shading blob are both small.
    Sorting by COLOUR works, because the first two kinds are the literal key
    colour the generator painted, while a green hat is some other green.  Every
    region is therefore compared against the colour of the five bodies: within
    KEY_TOL it is head, beyond it is hat.  Kermit's mint sits ~150 away, hair
    gaps sit at ~0.

    Sizing was tried first and shipped the Dirty Blonde with green speckles
    along every hair edge -- the final key guard could not catch them because a
    5x5 block averaging gap-green with hair no longer matches the key."""
    lab, k = ndi.label(grn, np.ones((3, 3)))
    if k < 5:
        raise SystemExit(f'found {k} green regions, expected at least 5 — did the '
                         'generator paint the person flat #00FF00?')
    sizes = np.array(ndi.sum(grn, lab, range(1, k + 1)))
    objs = ndi.find_objects(lab)
    bodies = sorted(np.argsort(sizes)[::-1][:5], key=lambda i: objs[i][1].start)
    key_rgb = rgb[np.isin(lab, [i + 1 for i in bodies]) & grn].mean(axis=0)

    keep, rejected = [], 0
    for i in range(k):
        m = (lab == i + 1)
        # CLOSEST pixel to the key, not the average.  A gap between hair strands
        # is only a few pixels and its edges blend into the hair, so its MEAN
        # drifts far enough off-key to be mistaken for hat -- which is exactly
        # how the Dirty Blonde kept green in its east and northeast frames after
        # the mean-based test went in.  Any region that is really head contains
        # at least one untouched key pixel; a green hat's shading contains none.
        if np.abs(rgb[m] - key_rgb).max(axis=1).min() <= KEY_TOL:
            keep.append(i)
        else:
            rejected += int(sizes[i])
    heads = np.isin(lab, [i + 1 for i in keep]) & grn
    return heads, [((lab == i + 1), objs[i]) for i in bodies], len(keep) - 5, rejected


def strip_figure_outline(ink, rgb, mag, grn):
    """Drop the PERSON'S drawn outline from the keyed ink (v2.3.2362).

    Returns (ink, stripped_px, traced) -- `traced` is the share of the green
    silhouette's perimeter that near-black ink follows, and it is 0 for the
    flat-green sheets every earlier import was cut from, where this is a no-op.
    The header says why it takes both a thickness test and an edge test."""
    dark = ink & (rgb[:, :, 0] < DARK) & (rgb[:, :, 1] < DARK) & (rgb[:, :, 2] < DARK)
    if not dark.any():
        return ink, 0, 0.0
    d_grn = ndi.distance_transform_edt(~grn)
    d_mag = ndi.distance_transform_edt(~mag)
    edge = dark & (d_grn <= OUTLINE_EDGE) & (d_mag <= OUTLINE_EDGE)
    # the silhouette's perimeter: green pixels with a non-green neighbour
    perim = grn & ~ndi.binary_erosion(grn, np.ones((3, 3)))
    traced = float(edge.sum()) / max(1, int(perim.sum()))
    if traced < OUTLINE_PERIM:
        return ink, 0, traced          # no outline drawn: leave the keying alone
    thick = ndi.distance_transform_edt(ink) >= OUTLINE_CORE
    kept = ink & (ndi.distance_transform_edt(~thick) <= OUTLINE_REACH) if thick.any() else ink
    kept = kept & ~edge
    return kept, int(ink.sum() - kept.sum()), traced


def despeckle(piece):
    """Drop the outline stubs left where the piece crossed the silhouette
    (v2.3.2362).  Only ever called on a sheet whose outline was stripped."""
    lab, k = ndi.label(piece, np.ones((3, 3)))
    if k <= 1:
        return piece
    sizes = np.array(ndi.sum(piece, lab, range(1, k + 1)))
    return np.isin(lab, 1 + np.nonzero(sizes >= OUTLINE_SPECK * sizes.max())[0])


def eye_cover(drawn, boxes, crown, anchor, nudge, ddx=0, ddy=0):
    """Per-eye share of the eye box that the piece covers, at a trial nudge."""
    dx = crown[0] + nudge[0] + ddx - anchor[0]
    dy = crown[1] + nudge[1] + ddy - anchor[1]
    out = []
    for (x0, x1, y0, y1) in boxes:
        sy0, sy1, sx0, sx1 = y0 - dy, y1 - dy, x0 - dx, x1 - dx
        if sy0 < 0 or sx0 < 0 or sy1 > FRAME or sx1 > FRAME:
            out.append(0.0)
            continue
        box = drawn[sy0:sy1, sx0:sx1]
        out.append(float(box.mean()) if box.size else 0.0)
    return out


def seat_eyes(frame, d, crown, anchor, nudge):
    """Move a face-worn piece onto the eyes (v2.3.2365).

    tools/seat_headwear.py exists because generators draw a HAT at inconsistent
    heights and the fit score does not predict it; this is the same job for a
    piece whose landmark is better.  Measured across the first four eyewear
    sheets, every one of them drew the SOUTHWEST cell low -- +2.5%, +2.5%,
    +2.6% and +6.1% of the crown-to-shoulder span -- so it is a bias of the
    generator, not a bad sheet.  The first three absorbed it because their
    lenses are deep (19-22px in the 256 frame); the Thug Life lenses are 13,
    and the same offset dropped their eye coverage to 25%.

    PER FACING, and that is a real difference from the hat pass, which insists
    on ONE correction for the whole hat because seating each direction
    separately would make it jump as you turn.  A hat's reference is contact
    with the skull, a proxy that genuinely varies with perspective, so a
    per-direction fix would encode perspective as error.  The reference here is
    the EYES -- an exact landmark the game paints on each facing -- so aligning
    every facing to its own eyes is the definition of consistent, not a source
    of jitter.

    The search maximises the WORST eye's coverage rather than the total, so a
    pair cannot buy one eye by abandoning the other, and ties go to the
    smallest move -- a piece already on the eyes is left exactly where it is.
    """
    boxes = eye_boxes(d)
    if not boxes:
        return (0, 0), None, None
    drawn = frame[:, :, 3] > ALPHA_T
    before = eye_cover(drawn, boxes, crown, anchor, nudge)
    best = None
    for ddy in range(-SEAT_EYES_MAX, SEAT_EYES_MAX + 1):
        for ddx in range(-SEAT_EYES_MAX, SEAT_EYES_MAX + 1):
            cov = eye_cover(drawn, boxes, crown, anchor, nudge, ddx, ddy)
            key = (-min(cov), abs(ddx) + abs(ddy), abs(ddx))
            if best is None or key < best[0]:
                best = (key, (ddx, ddy), cov)
    return best[1], before, best[2]


def flatten_lens(frame, d, crown, anchor, nudge):
    """Repaint the piece where it covers the EYES, to one flat tint (v2.3.2363).

    Owner, on the first goggles sheet: "These are goggles but kept their old eye
    effect in the glasses. These should be removed."  The generator drew the
    character's eyes showing THROUGH the tinted pane -- two pale blocks inside
    the lens -- and a piece that renders semi-transparent (see `alpha`) must not
    carry a painted-on eye as well as the real one behind it.

    Why this is targeted at the eye boxes rather than at the colours: the pale
    blocks are neither a separable cluster nor an enclosed island once the
    generator's resampling has blurred every edge (measured on this sheet: 132
    colour clusters in one 50x22 piece, and a 2-means split that separates
    antialiasing from everything else rather than pane from rim).  What IS known
    exactly is where the game paints the eyes, and the piece is over them by
    construction -- the coverage check above says 100%.  So the region to flatten
    is the eye boxes, padded, and the tint to flatten it to is that region's own
    MEDIAN, which is the pane: the drawn-on eye is a minority of it.

    Near-black is left alone, so the piece's own outline survives -- UNLESS the
    lens is itself that dark (v2.3.2365).  The Thug Life sunglasses are near-
    black by the same test that finds an outline, so protecting near-black left
    only the drawn-on eye whites in the region and their median was WHITE: the
    flatten repainted white with white and reported success.  So the protection
    is decided by what the region actually holds -- if the piece there is
    predominantly near-black there is no outline to tell apart from the lens,
    and everything is flattened.
    """
    boxes = eye_boxes(d)
    if not boxes:
        return 0, None
    dx, dy = crown[0] + nudge[0] - anchor[0], crown[1] + nudge[1] - anchor[1]
    region = np.zeros(frame.shape[:2], bool)
    for (x0, x1, y0, y1) in boxes:
        region[max(0, y0 - dy - LENS_PAD):y1 - dy + LENS_PAD,
               max(0, x0 - dx - LENS_PAD):x1 - dx + LENS_PAD] = True
    rgb = frame[:, :, :3].astype(int)
    drawn = region & (frame[:, :, 3] > ALPHA_T)
    if drawn.sum() < 8:
        return 0, None
    near_black = ((rgb[:, :, 0] < DARK) & (rgb[:, :, 1] < DARK) & (rgb[:, :, 2] < DARK))
    whole = np.median(rgb[drawn], axis=0).round().astype(int)
    # A lens that is itself near-black leaves no outline to protect (see above).
    sel = drawn if (whole < DARK).all() else (drawn & ~near_black)
    if sel.sum() < 8:
        return 0, None
    tint = np.median(rgb[sel], axis=0).round().astype(np.uint8)
    changed = int((np.abs(rgb[sel] - tint).max(axis=1) > 3).sum())
    frame[sel, 0], frame[sel, 1], frame[sel, 2] = tint
    return changed, tuple(int(v) for v in tint)


def hat_of(ink, sl, top=None):
    """The hat belonging to one figure: ink near this cell that reaches down
    toward the head.  That last test is what drops the sheet's own title and
    direction labels, which are ink too but float clear of every head.

    v2.3.2361: `top` (a row) starts the search at that row instead of at the
    sheet's edge.  The reach test is relative to the figure -- a component
    counts if its bottom comes within TEXT_DROP of the figure's height above
    the figure's top -- and on the eyewear test sheet the southwest figure,
    the tallest of the five, stood close enough to the title that its letters
    (rows 15-38) cleared a threshold row of 32: a 94x66 "pair of glasses"
    placed 28px too high.  A face-worn piece cannot be above the drawn crown,
    so a FACE_WORN import passes the crown here; a hat keeps the whole reach,
    because a wizard hat really does stand that far above the head."""
    y0, y1 = sl[0].start, sl[0].stop
    x0, x1 = sl[1].start, sl[1].stop
    gh = y1 - y0
    pad = int((x1 - x0) * 0.55)              # wide brims overhang the silhouette
    lo, hi = max(0, x0 - pad), min(ink.shape[1], x1 + pad)
    region = np.zeros_like(ink)
    r0 = 0 if top is None else max(0, int(top))
    region[r0:y1, lo:hi] = ink[r0:y1, lo:hi]
    lab, k = ndi.label(region, np.ones((3, 3)))
    out = np.zeros_like(ink)
    for i, o in enumerate(ndi.find_objects(lab)):
        if o is not None and o[0].stop >= y0 - TEXT_DROP * gh:
            out |= (lab == i + 1)
    return out


def register(fig, mcell):
    """Uniform scale + offset laying the green silhouette onto the mannequin's
    body, scored on the SHOULDERS ONLY.

    The obvious thing -- fit the whole silhouette -- does not work, and the
    reason is worth writing down: the hat COVERS part of the head, so the green
    is the body minus whatever the hat hides.  Matching that against a complete
    body is matching against a shape the sheet cannot contain, and it showed:
    whole-figure fits landed at 0.87-0.89 IoU and drifted 18% in scale trying to
    make up the missing crown.

    The bottom 45% of the figure is below the jaw in every direction, so no hat
    -- however tall or wide-brimmed -- has any pixels there.  Both figures are
    bust crops cut at the same line, so bottom-anchoring is exact rather than a
    convenience."""
    mys = np.nonzero(mcell.any(axis=1))[0]
    my0, my1 = mys.min(), mys.max() + 1
    band = mcell[int(my1 - 0.45 * (my1 - my0)):my1]
    bh, Mw = band.shape
    mcx = np.nonzero(band.any(axis=0))[0].mean()

    ah, aw = fig.shape
    src = Image.fromarray((fig * 255).astype(np.uint8))
    best = None
    for s in np.arange(0.9, 2.6, 0.01):
        th, tw = int(round(ah * s)), int(round(aw * s))
        if th < bh + 12 or tw < 8 or th > 4000 or tw > 4000:
            continue
        am = np.array(src.resize((tw, th), Image.BOX)) > 110
        # v2.3.1509: compare only the overlap that EXISTS IN BOTH.  A hat that
        # covers the whole head leaves a green silhouette shorter than the
        # mannequin's comparison band -- the Arabian Robe's north cell is just
        # shoulders plus two ear slivers -- and scoring a short figure against a
        # tall band never matched, so that cell aborted the whole import.
        use = min(bh, th - 4)
        if use < 12:
            continue
        band_u = band[bh - use:]
        for dy in range(-8, 9, 2):
            top = am.shape[0] - use + dy
            if top < 0 or top + use > am.shape[0]:
                continue
            ba = am[top:top + use]
            xs = np.nonzero(ba.any(axis=0))[0]
            if not len(xs):
                continue
            d0 = int(round(mcx - xs.mean()))
            for dx in range(d0 - 10, d0 + 11):
                sh = np.zeros_like(band_u)
                lo, hi = max(0, dx), min(Mw, ba.shape[1] + dx)
                if hi <= lo:
                    continue
                sh[:, lo:hi] = ba[:, lo - dx:hi - dx]
                iou = int((sh & band_u).sum()) / max(1, int((sh | band_u).sum()))
                if best is None or iou > best[0]:
                    best = (iou, float(s), int(dx), int(my1 - th + dy))
    return best      # (iou, scale, dx, oy) or None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--art', required=True)
    ap.add_argument('--id', required=True)
    ap.add_argument('--name', required=True)
    ap.add_argument('--clips-hair', action='store_true')
    # v2.3.1504: some of these sheets are hairstyles, not hats.  They are drawn
    # on the same mannequin and share _placeTrait, so the only differences are
    # which folder they land in and the category recorded in meta -- and hair is
    # the thing that gets CLIPPED by a hat, so it never sets clipsHair.
    ap.add_argument('--category', default='headwear', choices=['headwear', 'hair', 'eyewear'])   # v2.3.2361: + eyewear
    ap.add_argument('--flatten-lens', action='store_true',
                    help='repaint the piece over the eyes to one flat tint, removing an '
                         'eye the generator drew through the lens (v2.3.2363)')
    ap.add_argument('--alpha', type=float, default=None,
                    help='render the piece at this opacity, 0-1 (v2.3.2363): a tinted '
                         'pane you see the real eyes through')
    ap.add_argument('--omit', default='',
                    help='comma list of directions the piece is not visible from, '
                         'e.g. north for glasses (v2.3.2361): no png, no anchor')
    ap.add_argument('--debug', default=None)
    args = ap.parse_args()

    rgb = np.array(Image.open(args.art).convert('RGB')).astype(int)
    mag, grn, ink = keys(rgb)
    px0, py0, px1, py1 = panel_of(mag)
    rgb, grn = (a[py0:py1, px0:px1] for a in (rgb, grn))
    heads, figs, extra, reclaimed = split_green(rgb, grn)
    if extra:
        print(f'note: the silhouette is split into {extra} extra region(s) — kept as '
              f'head (a scalp above a band, or gaps between hair spikes)')
    pmag = mag[py0:py1, px0:px1]
    ink = dekey_fringe(rgb, ~(pmag | heads), pmag, heads)
    # v2.3.2362: the person may be drawn WITH an outline, which keys as piece.
    ink, _stripped, _traced = strip_figure_outline(ink, rgb, pmag, heads)
    outlined = _stripped > 0
    if outlined:
        print(f'note: the person is drawn with an outline (near-black traces {_traced * 100:.0f}% '
              f'of the silhouette); {_stripped}px of it stripped off the piece')
    if reclaimed:
        print(f'note: {reclaimed}px of green did not match the key colour — '
              f'returned to the hat (the hat itself is green)')

    tmp = os.path.join(TOOLS, '.mannequin-rebuild.png')
    os.system(f'python3 {TOOLS}/make_headwear_mannequin.py --out {tmp} >/dev/null')
    man = np.array(Image.open(tmp).convert('RGB')).astype(int)
    os.remove(tmp)
    mmag, _mg, mink = keys(man)

    # v2.3.2361: the directions this piece ships without.
    omit = {x.strip() for x in args.omit.split(',') if x.strip()}
    bad = omit - set(_man.DIRS)
    if bad:
        raise SystemExit(f'--omit: unknown direction(s) {sorted(bad)}; expected from {_man.DIRS}')
    if 'south' in omit:
        raise SystemExit('--omit: south cannot be omitted -- it is the picker thumbnail')

    cells = _man.layout(1)
    tops = json.load(open(BODY_TOPS))
    head_boxes = json.load(open(_man.ANCHORS))   # v2.3.2361: head boxes, for the tall-piece warning
    outdir = OUTDIR.format(cat=args.category, id=args.id)
    os.makedirs(outdir, exist_ok=True)
    if args.clips_hair:
        os.makedirs(os.path.join(outdir, 'hairmask'), exist_ok=True)
    if args.debug:
        os.makedirs(args.debug, exist_ok=True)

    # v2.3.1509: register every cell FIRST, so a cell that cannot be fitted can
    # borrow the scale from the ones that could.  A hat covering the whole head
    # leaves too little silhouette to fit -- the Arabian Robe's north cell is a
    # strip of shoulder the robe drapes over -- and that used to abort the whole
    # import.  Every cell on a sheet shares one scale (measured within 3% across
    # 20 sheets), so the median of the successes is a sound stand-in, and the
    # position still comes from that cell's own green.
    fits = []
    for c, (fg, sl) in zip(cells, figs):
        px, py = c['paste']
        cw, ch = c['size']
        fy0, fy1, fx0, fx1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        r = register(fg[fy0:fy1, fx0:fx1], mink[py:py + ch, px:px + cw])
        fits.append(r if (r and r[0] >= 0.70) else None)
    ok = [f[1] for f in fits if f]
    if not ok:
        raise SystemExit('could not register ANY cell — is the green flat?')
    borrow = float(np.median(ok))
    for i, (c, (fg, sl)) in enumerate(zip(cells, figs)):
        if fits[i] is None:
            # place it by its own green: bottom-aligned, centred on the mannequin
            px, py = c['paste']
            cw, ch = c['size']
            M = mink[py:py + ch, px:px + cw]
            mys = np.nonzero(M.any(axis=1))[0]
            mxs = np.nonzero(M.any(axis=0))[0]
            fy0, fy1, fx0, fx1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
            th = int(round((fy1 - fy0) * borrow))
            tw = int(round((fx1 - fx0) * borrow))
            fits[i] = (0.0, borrow, int((mxs.min() + mxs.max()) // 2 - tw // 2),
                       int(mys.max() + 1 - th))
            print(f'{c["dir"]:<10} could not be fitted — using the sheet\'s own '
                  f'scale {borrow:.3f} and this cell\'s green for position')

    bboxes, anchors, nudges, scales, _flat, _seated = {}, {}, {}, {}, {}, {}
    for (c, (fg, sl)), fit in zip(zip(cells, figs), fits):
        d = c['dir']
        if d in omit:
            # v2.3.2361: no png and no anchor for this facing, on purpose.
            print(f'{d:<10} omitted -- the piece is not visible from here; no png, no '
                  f'anchor, and the renderer hides it on this facing')
            continue
        cx, cy = c['paste']
        cw, ch = c['size']
        up = c['upscale']
        bx0, by0 = c['box'][0], c['box'][1]
        fy0, fy1, fx0, fx1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop

        iou, scale, ox, oy = fit
        # v2.3.2361: the drawn crown -- ALL the green above the cut line in this
        # figure's columns (the frames may split the scalp off the face as its
        # own region, so this is not the body region's own bbox).  Used twice
        # for a face-worn category: to start the piece search at the head, and
        # to place the piece by the head below.
        gys = np.nonzero(heads[:fy1, fx0:fx1].any(axis=1))[0]
        gy0 = int(gys.min()) if len(gys) else int(fy0)
        face_worn = args.category in FACE_WORN
        hat = hat_of(ink, sl, top=(gy0 - max(2, int(0.02 * (fy1 - gy0)))) if face_worn else None)
        if outlined:
            hat = despeckle(hat)   # v2.3.2362: the stubs where the piece met the outline
        ys, xs = np.nonzero(hat)
        if not len(ys):
            raise SystemExit(f'{d}: no hat found beside the silhouette')
        hy0, hy1, hx0, hx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1

        # v2.3.2361: A FACE-WORN PIECE IS PLACED BY THE HEAD.  Two vertical
        # landmarks in the drawn cell -- the crown (gy0 above) and the cut line
        # at the bottom of the bust -- mapped onto the mannequin's crown and
        # cut line.  `sy` is the vertical scale that mapping implies; `scale`
        # stays the horizontal one from the shoulder fit.
        sy = scale
        head_map = None
        if face_worn:
            Mc = mink[cy:cy + ch, cx:cx + cw]
            mys = np.nonzero(Mc.any(axis=1))[0]
            if len(mys):
                my0, my1 = int(mys.min()), int(mys.max()) + 1
                sy = (my1 - my0) / max(1, (fy1 - gy0))
                head_map = (my0, gy0)

        # map the hat into the mannequin cell, then down to 256-space
        sub = Image.fromarray((hat[hy0:hy1, hx0:hx1] * 255).astype(np.uint8))
        col = Image.fromarray(rgb[hy0:hy1, hx0:hx1].astype(np.uint8))
        tw, th = max(1, int(round((hx1 - hx0) * scale))), max(1, int(round((hy1 - hy0) * sy)))
        m2 = np.array(sub.resize((tw, th), Image.BOX)) > 110
        c2 = np.array(col.resize((tw, th), Image.BOX)).astype(int)

        over = OVERSHOOT * up
        H, W = over + ch, cw
        canvas = np.zeros((H, W, 3), int)
        cmask = np.zeros((H, W), bool)
        if head_map is not None:
            ty = over + head_map[0] + int(round((hy0 - head_map[1]) * sy))   # v2.3.2361: crown -> crown
        else:
            ty = over + oy + int(round((hy0 - fy0) * scale))
        tx = ox + int(round((hx0 - fx0) * scale))
        sy0, sx0 = max(0, -ty), max(0, -tx)
        sy1, sx1 = min(th, H - ty), min(tw, W - tx)
        if sy1 <= sy0 or sx1 <= sx0:
            raise SystemExit(f'{d}: the hat landed outside the cell')
        canvas[ty + sy0:ty + sy1, tx + sx0:tx + sx1] = c2[sy0:sy1, sx0:sx1]
        cmask[ty + sy0:ty + sy1, tx + sx0:tx + sx1] = m2[sy0:sy1, sx0:sx1]

        rows, cols = H // up, W // up
        art256 = np.zeros((rows, cols, 4), np.uint8)
        for v in range(rows):
            for u in range(cols):
                blk = cmask[v * up:(v + 1) * up, u * up:(u + 1) * up]
                if int(blk.sum()) * 2 <= up * up:
                    continue
                px = canvas[v * up:(v + 1) * up, u * up:(u + 1) * up][blk].mean(axis=0)
                art256[v, u] = (*np.round(px).astype(int), 255)

        # v2.3.1506: speckle guard on the FINISHED frame.  dekey_fringe works in
        # ART space, but a 5x5 block can average several mildly-green art pixels
        # into one clearly-green game pixel that no single art pixel would have
        # tripped -- which is how the Dirty Blonde kept its green edge speckles
        # through two earlier fixes.  Threshold is the hat's own 99th percentile
        # so a green hat keeps its colour, and only SMALL clusters are dropped so
        # a deliberate green accent (a gem, a band) survives.
        _m0 = art256[:, :, 3] > ALPHA_T
        if _m0.sum() > 40:
            _rr, _gg, _bb = (art256[:, :, i].astype(int) for i in range(3))
            _dom = _gg - np.maximum(_rr, _bb)
            # MEDIAN, not a high percentile: speckles sit inside the top 1% and
            # would set their own threshold, which is why a p99 cut removed none
            # of them.  The median is the hat's bulk colour and cannot be moved
            # by a scatter of edge pixels.
            _t = max(np.median(_dom[_m0]) + 30, 15)
            _cand = _m0 & (_dom > _t)
            if _cand.any():
                _lb, _nk = ndi.label(_cand, np.ones((3, 3)))
                _sz = np.array(ndi.sum(_cand, _lb, range(1, _nk + 1)))
                art256[np.concatenate([[False], _sz < 6])[_lb]] = 0

        # v2.3.1505: last-ditch guard.  Nothing that survives to a finished frame
        # should still BE the key colour -- no real hat is #00FF00 or the
        # backdrop magenta.  A handful slip through per sheet (3 on the blonde
        # hair) where a block's majority vote lands on blend pixels; drop them
        # here rather than hope the earlier stages caught everything.
        _r, _g, _b = art256[:, :, 0].astype(int), art256[:, :, 1].astype(int), art256[:, :, 2].astype(int)
        _key = ((_g > 150) & ((_g - np.maximum(_r, _b)) > 120)) | \
               ((_r > 150) & (_b > 150) & (_g < 90) & (np.abs(_r - _b) < 60))
        art256[_key] = 0

        m = art256[:, :, 3] > ALPHA_T
        ys2, xs2 = np.nonzero(m)
        ay0, ay1, ax0, ax1 = ys2.min(), ys2.max() + 1, xs2.min(), xs2.max() + 1
        if ay1 - ay0 > FRAME or ax1 - ax0 > FRAME:
            raise SystemExit(f'{d}: hat is {ax1 - ax0}x{ay1 - ay0} in 256-space — too big')
        off_y = TOP_MARGIN - ay0
        off_x = FRAME // 2 - (ax0 + ax1) // 2
        out = np.zeros((FRAME, FRAME, 4), np.uint8)
        for v in range(rows):
            t2 = v + off_y
            if not (0 <= t2 < FRAME):
                continue
            for u in range(cols):
                x2 = u + off_x
                if 0 <= x2 < FRAME and art256[v, u, 3] > ALPHA_T:
                    out[t2, x2] = art256[v, u]

        crown = tops[f'stand-{d}-0']
        crown_in_frame = [int(crown[0] - bx0 + off_x),
                          int(crown[1] - by0 + OVERSHOOT + off_y)]
        bb = [int(ax0 + off_x), int(ay0 + off_y), int(ax1 - ax0), int(ay1 - ay0)]
        anchor = [int(bb[0] + round(bb[2] / 2)), int(bb[1])]
        bboxes[d] = bb
        anchors[d] = anchor
        nudges[d] = [int(anchor[0] - crown_in_frame[0]), int(anchor[1] - crown_in_frame[1])]
        scales[d] = 1
        # v2.3.2365: seat the piece on the eyes before anything downstream reads
        # the placement -- the lens flattening below and the coverage report
        # further down both have to describe the frame as it will SHIP.
        if face_worn:
            (_sx, _sy), _cov0, _cov1 = seat_eyes(out, d, crown, anchor, nudges[d])
            if (_sx or _sy):
                nudges[d] = [nudges[d][0] + _sx, nudges[d][1] + _sy]
                _seated[d] = (_sx, _sy, _cov0, _cov1)
        # v2.3.2363: flatten what the generator drew THROUGH the lens, before the
        # frame is written -- it needs the placement above to know where the eyes
        # are.  Only with --flatten-lens; see flatten_lens().
        if args.flatten_lens:
            _n, _tint = flatten_lens(out, d, crown, anchor, nudges[d])
            _flat[d] = (_n, _tint)
        Image.fromarray(out).save(f'{outdir}/{d}.png')
        # A low fit is a SHEET problem, not a tool problem: the generator
        # redrew that figure's torso off-model, so nothing lines up against the
        # real body.  Reported per cell so the owner can see which directions
        # are trustworthy and regenerate only those.
        grade = ('borrowed scale' if iou == 0 else 'good' if iou >= 0.95
                 else 'soft' if iou >= 0.90 else 'POOR — regenerate this direction')
        print(f'{d:<10} fit {iou:.3f} @ {scale:.3f}x  {grade:<32} '
              f'bbox {bb}  crownNudge {nudges[d]}')
        if args.category in FACE_WORN:
            # v2.3.2361: the check that would have caught the 5-6px lift.
            if d in _seated:
                _sx, _sy, _c0, _c1 = _seated[d]
                _lim = ' (AT THE LIMIT -- regenerate this cell)' if max(abs(_sx), abs(_sy)) >= SEAT_EYES_MAX else ''
                print(f'{"":<10} seated onto the eyes by ({_sx:+d}, {_sy:+d})px{_lim}: coverage '
                      + ' / '.join(f'{c * 100:.0f}%' for c in _c0) + ' -> '
                      + ' / '.join(f'{c * 100:.0f}%' for c in _c1))
            _eyes = eye_boxes(d)
            # a face-worn piece is a fraction of the head; a "pair of glasses"
            # taller than most of it means something else was keyed with it
            # (a label, a stray outline) -- say so, loudly, next to the numbers.
            _hb = head_boxes.get(f'stand-{d}-0', {}).get('head')
            if _hb and bb[3] > 0.6 * (_hb['bottom'][1] - _hb['top'][1]):
                print(f'{"":<10} WARNING: the piece is {bb[3]}px tall against a {_hb["bottom"][1] - _hb["top"][1]}px '
                      f'head -- more than glasses; check --debug for what else was keyed')
            if head_map is not None and abs(sy / scale - 1) > 0.03:
                print(f'{"":<10} the sheet came back at a different aspect (vertical scale '
                      f'{sy:.3f}x vs horizontal {scale:.3f}x); placed by the head, so fine')
            if _eyes:
                # ═══ v2.3.2362: DOES THE PIECE COVER THE EYES? ═══
                # The first cut compared the piece's bbox centre with the
                # midpoint between the eyes, and that is only meaningful for a
                # SYMMETRIC piece: the southwest 3D glasses carry a temple arm
                # down one side, which drags the bbox centre 5px toward it and
                # reads as a placement error that is not there.  So ask the
                # question the eye asks -- how much of each eye is behind the
                # piece -- by walking the finished frame through _placeTrait's
                # own arithmetic (anchor pixel onto crown + crownNudge).
                _dx = crown[0] + nudges[d][0] - anchor[0]
                _dy = crown[1] + nudges[d][1] - anchor[1]
                _drawn = out[:, :, 3] > ALPHA_T
                cov = []
                for (x0, x1, y0, y1) in _eyes:
                    sy0, sy1 = int(y0 - _dy), int(y1 - _dy)
                    sx0, sx1 = int(x0 - _dx), int(x1 - _dx)
                    if sy0 < 0 or sx0 < 0 or sy1 > FRAME or sx1 > FRAME:
                        cov.append(0.0)
                        continue
                    box = _drawn[sy0:sy1, sx0:sx1]
                    cov.append(float(box.mean()) if box.size else 0.0)
                _rows = ', '.join(f'{c * 100:.0f}%' for c in cov)
                _worst = min(cov) if cov else 0.0
                print(f'{"":<10} eyes: the piece covers {_rows} of {"each eye" if len(cov) > 1 else "the eye"} '
                      f'(whole eye, black top edge to pupil)'
                      + ('' if _worst >= 0.9 else '   <-- LOW: the lenses are not over the eyes'))

        if args.clips_hair:
            mm = out[:, :, 3] > ALPHA_T
            mask = np.zeros((FRAME, FRAME, 4), np.uint8)
            for x in range(FRAME):
                colys = np.nonzero(mm[:, x])[0]
                if len(colys):
                    mask[colys.min():, x] = (255, 255, 255, 255)
            Image.fromarray(mask).save(f'{outdir}/hairmask/{d}.png')

        if args.debug:
            dbg = np.zeros((H, W, 3), np.uint8)
            dbg[cmask] = canvas[cmask].astype(np.uint8)
            Image.fromarray(dbg).save(f'{args.debug}/{args.id}-{d}.png')

    south = np.array(Image.open(f'{outdir}/south.png').convert('RGBA'))
    bb = bboxes['south']
    th_img = Image.fromarray(south[bb[1]:bb[1] + bb[3], bb[0]:bb[0] + bb[2]])
    th_img = th_img.resize((128, max(1, round(128 * bb[3] / bb[2]))), Image.LANCZOS)
    th_img.save(f'{outdir}/thumb.png')

    meta = {
        'category': args.category,
        'fullFrame': True,
        'note': ('Imported by tools/import_headwear_green.py from a sheet whose '
                 'person was painted flat #00FF00. The hat is simply everything '
                 'that is neither the magenta backdrop nor the green person, so '
                 'no head can leak into the frame and no colour heuristic can '
                 'eat a hat pixel. The green silhouette also registers the cell '
                 'against the mannequin on the WHOLE body rather than the torso '
                 'alone. anchors are the hat bbox top-centre, crownNudge is '
                 'anchor minus body-tops stand-<dir>-0, scale is 1.'),
        'bboxes': bboxes,
        'anchors': anchors,
        'crownNudge': nudges,
        'scale': scales,
    }
    if args.clips_hair and args.category == 'headwear':
        meta['clipsHair'] = True
    if args.alpha is not None:
        if not 0 < args.alpha <= 1:
            raise SystemExit('--alpha must be greater than 0 and at most 1')
        meta['alpha'] = round(float(args.alpha), 3)
        meta['note'] += (f' v2.3.2363: renders at alpha {meta["alpha"]} -- a tinted pane the '
                         f'real eyes show through, applied by the renderer (both placement '
                         f'paths) and the portrait rather than baked into the art, so the '
                         f'picker thumbnail stays readable and the level can be re-tuned '
                         f'without re-importing.')
    if _seated:
        meta['note'] += (' v2.3.2365: seated onto the eyes ('
                         + ', '.join(f'{k} {v[0]:+d},{v[1]:+d}px' for k, v in _seated.items())
                         + ') -- every eyewear sheet so far has drawn the southwest cell low, '
                         'and this moves each facing onto the eye row the game actually paints; '
                         'bounded and reported by seat_eyes().')
    if args.flatten_lens:
        _done = {k: v for k, v in _flat.items() if v[0]}
        meta['note'] += (' v2.3.2363: the lens is flattened over the eyes ('
                         + ', '.join(f'{k} {v[0]}px -> rgb{v[1]}' for k, v in _done.items())
                         + ') -- the generator drew the eyes through the pane and a '
                         'semi-transparent piece must not carry a painted-on eye behind '
                         'the real one.')
    if args.category in FACE_WORN:
        meta['note'] += (' v2.3.2361: placed BY THE HEAD -- the vertical axis is calibrated on the '
                         'drawn crown and cut line against the mannequin\'s, so a sheet returned '
                         'at a different aspect still lands the piece where it was drawn on the '
                         'face; the horizontal axis and the width come from the shoulder fit. '
                         'Checked against the iris row the game paints (eyeMask.json).')
    if omit:
        meta['note'] += (f' v2.3.2361: {", ".join(sorted(omit))} omitted on purpose -- the '
                         f'{args.category} is not visible from there. No png and no '
                         f'anchor for that facing, so the renderer hides the piece on '
                         f'it (the beard precedent, v2.3.1530).')

    # v2.3.1510: the fit score does not catch every bad placement.  A sheet
    # drawn narrow-and-tall gets scaled up to match the shoulders, overshoots in
    # height, and -- because everything here is bottom-anchored -- lifts the hat
    # clear off the head.  seat_headwear measures whether the hat is actually
    # touching the skull and drops the whole hat back onto it if not; it is a
    # no-op for a cell that registered properly.  See that file for why a hat
    # resting on the art can never be hovering in the game.
    # v2.3.2361: not for a face-worn piece.  The seat pass exists to drop a hat
    # that registered high back onto the skull; a piece inside the head never
    # floats, and it was placed by the head above, so there is nothing to seat.
    drop = 0 if args.category in FACE_WORN else _seat.reseat(args.id, meta)
    if drop:
        meta['note'] += (f' v2.3.1510: the hat floated clear of the head, so it was '
                         f'seated {drop}px lower by tools/seat_headwear.py.')

    with open(f'{outdir}/meta.json', 'w') as fh:
        json.dump(meta, fh, indent=2)
        fh.write('\n')

    print(f'\nwrote {outdir}/  ({len(anchors)} dirs + thumb + meta'
          f'{" + hairmask" if args.clips_hair else ""})')


if __name__ == '__main__':
    main()
