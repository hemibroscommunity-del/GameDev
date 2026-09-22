#!/usr/bin/env python3
"""v2.3.2643: turn a sheet drawn ON THE REAL MANNEQUIN into the flat-keyed sheet
import_headwear_green.py requires.

WHY THIS EXISTS
---------------
docs/specs/eyewear.md step 2 asks the generator for a sheet whose person is
painted flat #00FF00 with only the new piece in colour, and the importer is
built on that promise: `keys()` splits the sheet into backdrop / person / piece
by colour, `split_green()` finds the five bodies as flat regions, and
`register()` lays each green silhouette onto the mannequin's.

The EYES sheets did not come back that way.  The owner drew the four eye styles
straight onto the mannequin as it is generated -- tan skin, black outline, the
nose, mouth and ear marks all still on the face -- which is the natural thing to
do when the piece you are drawing IS a facial feature: you cannot draw an eye
onto a head that has no face.  Fed to the importer directly, such a sheet fails
twice:

  * `person_key()` picks the modal non-backdrop colour, and on the two
    letterboxed sheets that is the WHITE PAGE MARGIN, not the skin -- the
    import aborts with "could not register ANY cell".
  * even keyed on the skin, the face's own nose, mouth and ear marks are
    near-black ink that is nowhere near the silhouette's edge, so
    `strip_figure_outline()` correctly leaves them alone -- and they land in the
    piece.  An "eyes" sprite with a mouth baked into it draws a second mouth
    over the real one.

So this runs FIRST and hands the importer the sheet it was promised.  It is a
pure re-key: no geometry is touched, no pixel of the art is moved or resized,
and the importer downstream does exactly what it does for every other trait.

WHAT IT KEEPS
-------------
The art is what the owner ADDED to the face, and the face is everything else.
Three colour classes describe an untouched mannequin cell completely -- the
magenta backdrop, one flat skin tone, and near-black ink -- plus the blends
between them that the generator's resampling leaves along every edge.  A pixel
that sits off all three of those segments was painted by hand, and that is the
whole test.  Blobs under --min-blob are dropped (resampling speckle), then each
surviving blob is grown by --grow into adjacent ink so a drawn eye keeps its own
outline, and its holes are filled so a pupil inside a white eye survives.

Run from the repo root:

    python3 tools/flatkey_drawn_mannequin.py --art sleepy.png --out sleepy-keyed.png

then feed --out to import_headwear_green.py exactly as if the generator had
returned it flat.  Pass --debug DIR to write the per-cell keying for review;
the per-cell art pixel counts it prints are what tells you which facings to
`--omit` (a cell that keyed 0px is a facing the piece is not drawn on).
"""
import argparse
import os

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

GREEN = (0, 255, 0)
MAGENTA = (255, 0, 255)
# Distance (RGB, euclidean) a pixel may sit off a base colour or off the blend
# segment between two of them and still be read as the mannequin rather than as
# art.  40 is comfortably below the nearest real art colour: the Sleepy navy is
# the darkest thing drawn on these sheets and still sits 63 off the black->skin
# segment (measured), while the widest blend band the resampling leaves reads
# under 12.
BASE_TOL = 40
WHITE_MIN = 235      # the page margin the generator letterboxes two sheets with
MIN_BLOB = 200       # sheet px; ~3x3 game px at the ~4x these cells are drawn at
GROW = 3             # sheet px an art blob reaches into adjacent ink for its own outline


def _seg_dist(px, a, b):
    """Distance from each pixel to the segment between colours a and b.

    The blend band along every edge of a resampled sheet lies ON that segment,
    which is why testing the segment rather than the two endpoints is what lets
    BASE_TOL stay tight enough to keep the Sleepy navy."""
    a = np.asarray(a, float)
    b = np.asarray(b, float)
    ab = b - a
    denom = float(ab @ ab) or 1.0
    t = np.clip(((px - a) @ ab) / denom, 0.0, 1.0)
    proj = a + t[..., None] * ab
    return np.sqrt(((px - proj) ** 2).sum(-1))


def _background(rgb):
    """Backdrop = magenta, plus any near-white page margin reachable from the
    image border.

    Reachable-from-the-border matters: the White Glass and WTF eyes are drawn in
    near-white too, and a flat "white is background" test would erase them."""
    mag = (rgb[:, :, 0] > 150) & (rgb[:, :, 2] > 150) & (rgb[:, :, 1] < 90) & (np.abs(rgb[:, :, 0] - rgb[:, :, 2]) < 60)
    white = rgb.min(2) > WHITE_MIN
    seed = np.zeros(white.shape, bool)
    seed[0, :] = seed[-1, :] = seed[:, 0] = seed[:, -1] = True
    margin = ndi.binary_propagation(seed & white, mask=white)
    return mag | margin


def _figures(bg, want=5):
    """The `want` biggest non-background blobs, hole-filled: the five busts.

    Hole-filling is what puts a white eye or a bright flame back inside its own
    figure -- keyed on colour alone they are not skin, so they read as holes."""
    lab, k = ndi.label(~bg, np.ones((3, 3)))
    if k < want:
        raise SystemExit(f'found {k} figures on this sheet, expected {want} — is it a mannequin sheet?')
    sizes = np.array(ndi.sum(~bg, lab, range(1, k + 1)))
    keep = np.argsort(sizes)[::-1][:want]
    fig = np.isin(lab, [i + 1 for i in keep])
    return ndi.binary_fill_holes(fig), sorted(
        (o for i, o in enumerate(ndi.find_objects(lab)) if i in keep),
        key=lambda o: o[1].start)


def _skin_of(rgb, fig):
    """The flat tone the mannequin's skin is painted, found rather than assumed.

    Same reasoning as import_headwear_green.person_key: the skin is the largest
    flat thing inside the figure by a wide margin, and the sheets differ (the
    WTF sheet came back at rgb(227,152,79) against rgb(201,133,77) for the other
    three), so it cannot be a constant."""
    q = (rgb[fig] // 16).astype(np.int32)
    codes = q[:, 0] * 256 + q[:, 1] * 16 + q[:, 2]
    vals, cnt = np.unique(codes, return_counts=True)
    top = vals[np.argmax(cnt)]
    sel = fig.copy()
    sel[fig] = codes == top
    return np.median(rgb[sel], axis=0).round().astype(int)


def key_sheet(rgb, min_blob=MIN_BLOB, grow=GROW, tol=BASE_TOL):
    """(flat-keyed sheet, art mask, figure mask, figure slices, skin)."""
    bg = _background(rgb)
    fig, slices = _figures(bg)
    skin = _skin_of(rgb, fig)
    px = rgb.astype(float)

    # Off ALL THREE base segments = painted by hand.  Ink is tested as a colour
    # rather than as a threshold so a dark art pixel is not silently forgiven.
    ink = np.array([0, 0, 0])
    base = np.minimum.reduce([
        _seg_dist(px, ink, skin),
        _seg_dist(px, MAGENTA, skin),
        _seg_dist(px, MAGENTA, ink),
    ])
    art = fig & (base > tol)

    # Resampling speckle: single pixels off-segment along a hard edge.
    lab, k = ndi.label(art, np.ones((3, 3)))
    if k:
        sizes = np.array(ndi.sum(art, lab, range(1, k + 1)))
        art = np.isin(lab, [i + 1 for i in np.nonzero(sizes >= min_blob)[0]])

    # A drawn eye has its own outline, which IS near-black and so reads as base.
    # Reach into ink that touches the art, and fill what that encloses, so the
    # outline and the pupil come with the eye -- bounded by `grow`, which is
    # under one game pixel, so the face's own outline cannot be reached from
    # here unless the art is already touching it.
    if art.any():
        near = ndi.binary_dilation(art, np.ones((3, 3)), iterations=grow)
        dark = (rgb.max(2) < 110) & fig
        art = ndi.binary_fill_holes(art | (near & dark))

    out = np.empty_like(rgb)
    out[:] = MAGENTA
    out[fig] = GREEN
    out[art] = rgb[art]
    return out, art, fig, slices, skin


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--art', required=True, help='the sheet drawn on the real mannequin')
    ap.add_argument('--out', required=True, help='where to write the flat-keyed sheet')
    ap.add_argument('--min-blob', type=int, default=MIN_BLOB)
    ap.add_argument('--grow', type=int, default=GROW)
    ap.add_argument('--tol', type=int, default=BASE_TOL)
    ap.add_argument('--debug', default=None, help='directory for per-cell keying previews')
    args = ap.parse_args()

    rgb = np.array(Image.open(args.art).convert('RGB')).astype(int)
    out, art, fig, slices, skin = key_sheet(rgb, args.min_blob, args.grow, args.tol)
    Image.fromarray(out.astype(np.uint8)).save(args.out)

    DIRS = ['south', 'southwest', 'east', 'northeast', 'north']
    print(f'skin keyed on rgb{tuple(int(v) for v in skin)}; '
          f'{int(fig.sum())}px of person, {int(art.sum())}px of art')
    for d, sl in zip(DIRS, slices):
        cell = np.zeros_like(art)
        cell[sl] = art[sl]
        n = int(cell.sum())
        if n:
            ys, xs = np.nonzero(cell)
            fy0, fx0 = sl[0].start, sl[1].start
            print(f'  {d:<10} {n:>6}px  bbox x {xs.min() - fx0}..{xs.max() - fx0}, '
                  f'y {ys.min() - fy0}..{ys.max() - fy0} within the figure')
        else:
            print(f'  {d:<10}      0px  -- nothing drawn here; pass --omit {d} to the importer')
    print(f'wrote {args.out}')

    if args.debug:
        os.makedirs(args.debug, exist_ok=True)
        vis = np.where(art[:, :, None], rgb, np.where(fig[:, :, None], 40, 12)).astype(np.uint8)
        Image.fromarray(vis).save(os.path.join(args.debug, 'art.png'))
        print(f'wrote {args.debug}/art.png')


if __name__ == '__main__':
    main()
