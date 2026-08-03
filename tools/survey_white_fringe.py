#!/usr/bin/env python3
"""Measure leftover MATTE RESIDUE on keyed sprite art, and estimate the
background colour each image was originally composited over.

v2.3.1606 (owner: "revisit all trait images and sprite sheets for edge pixels
that should've been removed (usually whiteish).  Reference their original
background color to get a sense of whether it's removable").

THE MEASUREMENT
Art drawn over a solid background and then keyed to alpha leaves anti-aliased
edge pixels holding a blend of the sprite and that background:

    P = a*C + (1-a)*M          P observed, C true colour, M background

C is unknown per pixel, but the nearest OPAQUE pixel is a good estimate of it
(the same assumption defringe_gray.py already relies on).  Rearranged:

    M = (P - a*C) / (1-a)

Solved per semi-transparent pixel and taken as a MEDIAN over the image, that
recovers the background the art was keyed from — the thing the owner asked to
reference.  A median (not a mean) because a minority of edge pixels sit against
real internal detail and would otherwise drag the estimate.

Low-alpha pixels carry the most background and estimate M most reliably
(dividing by 1-a is best conditioned there), so only a <= 0.6 is used.

WHAT IT REPORTS, per file
  matte        estimated M, and how confident (spread of the per-pixel solves)
  semi         count of semi-transparent pixels
  foreignWhite opaque rim pixels that are near-white while the sprite just
               inside them is NOT — a hard white ring the alpha key missed
               entirely, which un-matting cannot fix because a=1 there
  legitWhite   near-white rim whose interior is ALSO near-white (a white hat,
               the snowman) — reported separately so it is never counted as
               damage, and never touched by the repair pass

Run:
  python3 tools/survey_white_fringe.py public/sprites            # whole tree
  python3 tools/survey_white_fringe.py --json out.json <paths>
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt, binary_erosion

OPAQUE_MIN = 250       # a >= this is "trust the colour"
SEMI_MAX_A = 0.6       # only well-conditioned pixels estimate the matte
NEAR_WHITE = 205       # min channel to call a pixel near-white
LOW_SAT = 34           # max channel spread for "achromatic"


def load(path):
    im = Image.open(path)
    if im.mode != 'RGBA':
        im = im.convert('RGBA')
    return np.asarray(im).astype(np.float64)


def nearest_opaque_rgb(arr):
    """RGB of the nearest fully-opaque pixel, for every pixel."""
    a = arr[..., 3]
    opaque = a >= OPAQUE_MIN
    if not opaque.any():
        return None
    # distance_transform_edt on the INVERSE gives, for each pixel, the index of
    # the nearest True (opaque) cell.
    _, (iy, ix) = distance_transform_edt(~opaque, return_indices=True)
    return arr[iy, ix, :3], opaque


def analyse(path):
    arr = load(path)
    if arr.ndim != 3 or arr.shape[2] != 4:
        return None
    a = arr[..., 3] / 255.0
    rgb = arr[..., :3]
    got = nearest_opaque_rgb(arr)
    if got is None:
        return None
    C, opaque = got

    out = {
        'path': path,
        'px': int(arr.shape[0] * arr.shape[1]),
        'opaque': int(opaque.sum()),
    }

    # ── estimate the background this art was keyed from ──
    semi = (a > 0.02) & (a <= SEMI_MAX_A)
    out['semi'] = int(semi.sum())
    if semi.sum() >= 40:
        aa = a[semi][:, None]
        M = (rgb[semi] - aa * C[semi]) / (1.0 - aa)
        M = np.clip(M, 0, 255)
        med = np.median(M, axis=0)
        # spread: how tightly the per-pixel solves agree (low = a real,
        # uniform background; high = no single matte, i.e. already clean)
        spread = float(np.median(np.abs(M - med)))
        out['matte'] = [round(float(v), 1) for v in med]
        out['matteSpread'] = round(spread, 1)
        out['matteIsWhitish'] = bool(med.min() >= NEAR_WHITE and (med.max() - med.min()) <= LOW_SAT)
        out['matteIsLight'] = bool(med.mean() >= 150)
    else:
        out['matte'] = None
        out['matteSpread'] = None
        out['matteIsWhitish'] = False
        out['matteIsLight'] = False

    # ── opaque rim that the key missed entirely ──
    solid = a >= (OPAQUE_MIN / 255.0)
    interior = binary_erosion(solid, np.ones((3, 3), bool), border_value=0)
    rim = solid & ~interior                      # opaque pixels touching an edge
    out['rim'] = int(rim.sum())
    if rim.any():
        rr = rgb[rim]
        mn = rr.min(axis=1)
        sat = rr.max(axis=1) - mn
        white_rim = (mn >= NEAR_WHITE) & (sat <= LOW_SAT)
        # what does the sprite look like JUST INSIDE this rim pixel?
        inner = C[rim]
        inner_mn = inner.min(axis=1)
        inner_sat = inner.max(axis=1) - inner_mn
        inner_white = (inner_mn >= NEAR_WHITE) & (inner_sat <= LOW_SAT)
        out['foreignWhite'] = int((white_rim & ~inner_white).sum())
        out['legitWhite'] = int((white_rim & inner_white).sum())
    else:
        out['foreignWhite'] = 0
        out['legitWhite'] = 0

    # ── how much would a de-fringe ACTUALLY change? ──
    # This is the honest selector: the median distance between an edge pixel
    # and the sprite colour behind it.  Art with a black keyline keyed on black
    # scores ~0 here — its edges already ARE the sprite's own colour, so there
    # is nothing foreign to remove, however confident the matte estimate looks.
    if semi.sum():
        d = np.abs(rgb[semi] - C[semi]).mean(axis=1)
        out['edgeDelta'] = round(float(np.median(d)), 1)
        out['wouldRecolor'] = int((d > 8).sum())
    else:
        out['edgeDelta'] = 0.0
        out['wouldRecolor'] = 0

    # ── semi-transparent pixels carrying a foreign light colour ──
    if semi.sum():
        sr = rgb[semi]
        sc = C[semi]
        # how much LIGHTER is the edge than the sprite colour behind it?
        lift = sr.mean(axis=1) - sc.mean(axis=1)
        out['semiLightLift'] = round(float(np.median(lift)), 1)
        out['semiLifted'] = int((lift > 40).sum())
    else:
        out['semiLightLift'] = 0.0
        out['semiLifted'] = 0
    return out


def walk(paths):
    files = []
    for p in paths:
        if os.path.isdir(p):
            for root, _, names in os.walk(p):
                for n in sorted(names):
                    if n.lower().endswith('.png'):
                        files.append(os.path.join(root, n))
        elif p.lower().endswith('.png'):
            files.append(p)
    return files


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('paths', nargs='+')
    ap.add_argument('--json')
    ap.add_argument('--top', type=int, default=40)
    args = ap.parse_args()

    files = walk(args.paths)
    print(f'scanning {len(files)} png(s)…', file=sys.stderr)
    rows = []
    for i, f in enumerate(files):
        try:
            r = analyse(f)
        except Exception as e:                     # noqa: BLE001
            print(f'  !! {f}: {e}', file=sys.stderr)
            continue
        if r:
            rows.append(r)
        if (i + 1) % 100 == 0:
            print(f'  {i+1}/{len(files)}', file=sys.stderr)

    if args.json:
        with open(args.json, 'w') as fh:
            json.dump(rows, fh)

    # rank by the damage that un-matting can actually repair
    def score(r):
        s = r['semiLifted']
        if r.get('matteIsLight'):
            s *= 2
        return s + r['foreignWhite'] * 3

    rows.sort(key=score, reverse=True)
    print(f'\n{"file":<62} {"matte":>18} {"spr":>5} {"semiLift":>9} {"fgnWhite":>9} {"legit":>6}')
    for r in rows[:args.top]:
        m = r['matte']
        ms = f'({m[0]:.0f},{m[1]:.0f},{m[2]:.0f})' if m else '-'
        print(f'{r["path"][-62:]:<62} {ms:>18} {str(r["matteSpread"]):>5} '
              f'{r["semiLifted"]:>9} {r["foreignWhite"]:>9} {r["legitWhite"]:>6}')

    tot_semi = sum(r['semiLifted'] for r in rows)
    tot_fw = sum(r['foreignWhite'] for r in rows)
    whitish = [r for r in rows if r.get('matteIsWhitish')]
    lightish = [r for r in rows if r.get('matteIsLight')]
    print(f'\n{len(rows)} analysed | {len(whitish)} keyed from a WHITISH background'
          f' | {len(lightish)} from any LIGHT background')
    print(f'total lifted semi px {tot_semi} | total foreign-white rim px {tot_fw}')


if __name__ == '__main__':
    main()
