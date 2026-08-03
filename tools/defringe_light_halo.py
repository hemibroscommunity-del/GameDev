#!/usr/bin/env python3
"""Find and remove the LIGHT halo left on wearable art by the background key.

v2.3.1636 (owner: "some assets still have an outline like the south facing
backwards cap or top hat.  Try to remove any headwear or other wearable that
has outlines stuck during keying out removal from original background").

WHY THE EXISTING SWEEP MISSED THESE
-----------------------------------
tools/defringe_matte_sweep.py (v2.3.1606) already swept this tree, and it
selects on survey_white_fringe.py's matte solve:

    M = (P - a*C) / (1-a)      per semi-transparent pixel

keeping only files where the per-pixel answers AGREE (spread <= 12), on the
reasoning that agreement proves a single solid background.  That is a sound
test for "can I RECOVER the background colour", and a poor one for "is there
a halo".  red-cap/hi/south.png solves to a near-white matte at spread 38.3 and
top-hat's frames to a near-black one at 17.7 — both above the cut, both
skipped, and both are exactly the two the owner named.

Spread is high whenever the sprite has several distinct edge colours, which
is normal for art with a dark outline over a bright body.  But the REPAIR
(defringe_gray.py) never needed the background estimate: it replaces each
semi-transparent pixel's RGB with the nearest OPAQUE pixel's, so it removes a
halo of any colour without knowing what colour it was.  Selection was the only
thing coupled to the estimate, so this tool selects on the halo itself.

WHAT IT MEASURES
----------------
    haloScore = mean_luma(semi-transparent px) - mean_luma(opaque px touching them)

i.e. how much LIGHTER the anti-aliased ring is than the sprite edge it hugs.
Local by construction: a legitimately white sprite has a white edge too, so
its delta stays near zero and it is never flagged.  A sprite keyed off a light
background has a ring brighter than anything it borders — which is the halo the
owner sees, and it is most visible in-game because the world is dark.

SELECTION IS SELF-VALIDATING
----------------------------
A threshold on haloScore alone would still be a guess.  So every candidate is
REPAIRED INTO A TEMPORARY COPY and re-measured, and the file is only rewritten
when the repair actually drops the score by MIN_DROP.  Art whose bright ring is
genuine shading barely moves and is left alone — the tool cannot flatten
legitimate edge shading, because a file it would not improve is a file it does
not touch.  (shark-hat is the worked example: its white belly trips the raw
score, the repair changes almost nothing, and it is skipped.)

REPAIR is delegated to tools/defringe_gray.py, unchanged and by subprocess, so
there stays exactly ONE reviewed definition of "de-fringe" in the repo — the
same reasoning defringe_matte_sweep.py gives for reusing it.  That tool keeps
alpha EXACTLY and rewrites only semi-transparent RGB, so silhouettes, frame
anchors, geometry and every alpha-keyed pipeline (masked body, retint) are
untouched.

TIERS.  A trait ships up to three tiers of the same frame: <id>/<dir>.png (128,
the Pixi world path), <id>/hi/<dir>.png (256, the portrait — v2.3.1579), and
thumb.png.  They are keyed from the same source and generally carry the same
halo, so they are scanned and repaired independently rather than derived from
one another; fixing only one tier would leave the halo on the surface that
magnifies it most (TRAPS #17's lesson about which tier serves which surface).
hairmask/ frames are SKIPPED outright: they are pure clipping shapes whose
"white" is the mask itself, not a halo (TRAPS #14).

Run from the repo root:
    python3 tools/defringe_light_halo.py --dry-run public/sprites/traits
    python3 tools/defringe_light_halo.py public/sprites/traits public/sprites/gear
"""
import argparse
import os
import shutil
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation

HALO_MIN = 18.0     # raw score below this is ordinary anti-aliasing
MIN_DROP = 8.0      # the repair must remove at least this much of it
MIN_SEMI = 12       # too few edge pixels to judge, or to matter
REPAIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'defringe_gray.py')

EXT = ('.png', '.webp')
SKIP_DIRS = ('hairmask',)   # clipping shapes, not art -- TRAPS #14


def luma(rgb):
    return 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]


def halo_score(path):
    """How much lighter the AA ring is than the sprite edge it touches.

    Returns (score, n_semi) or None when the frame has too little edge to
    judge.  Deliberately compares against the LOCAL edge rather than the
    whole sprite, so genuinely light art is not flagged for being light."""
    try:
        im = Image.open(path).convert('RGBA')
    except Exception:
        return None
    a = np.asarray(im).astype(np.float64)
    rgb, al = a[..., :3], a[..., 3]
    opaque = al >= 250
    semi = (al > 8) & (al < 250)
    if opaque.sum() < 20 or semi.sum() < MIN_SEMI:
        return None
    edge = opaque & binary_dilation(semi, np.ones((3, 3), bool))
    if edge.sum() < 4:
        return None
    return float(luma(rgb[semi]).mean() - luma(rgb[edge]).mean()), int(semi.sum())


def repair(path):
    """Run the shared de-fringe on `path`, in place. Returns True on success."""
    r = subprocess.run([sys.executable, REPAIR, path],
                       capture_output=True, text=True)
    return r.returncode == 0


def walk(roots):
    for root in roots:
        if os.path.isfile(root):
            yield root
            continue
        for dirpath, dirnames, files in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for f in sorted(files):
                if f.lower().endswith(EXT):
                    yield os.path.join(dirpath, f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('roots', nargs='+')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--halo-min', type=float, default=HALO_MIN)
    ap.add_argument('--min-drop', type=float, default=MIN_DROP)
    args = ap.parse_args()

    files = list(walk(args.roots))
    print(f'scanning {len(files)} file(s)…\n')

    flagged, fixed, skipped = [], [], []
    tmpdir = tempfile.mkdtemp(prefix='halo_')
    try:
        for p in files:
            m = halo_score(p)
            if not m:
                continue
            score, nsemi = m
            if score < args.halo_min:
                continue
            # Prove the repair helps THIS file before touching the real one.
            tmp = os.path.join(tmpdir, 'probe' + os.path.splitext(p)[1])
            shutil.copyfile(p, tmp)
            if not repair(tmp):
                continue
            after = halo_score(tmp)
            if not after:
                continue
            drop = score - after[0]
            flagged.append((p, score, after[0], drop, nsemi))
            if drop >= args.min_drop:
                fixed.append(p)
            else:
                skipped.append((p, score, drop))
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

    flagged.sort(key=lambda r: -r[3])
    print(f"{'file':<64} {'before':>7} {'after':>7} {'drop':>7} {'semi':>5}  verdict")
    for p, b, a, d, n in flagged:
        verdict = 'REPAIR' if d >= args.min_drop else 'skip (not a halo)'
        print(f'{p[-64:]:<64} {b:>7.1f} {a:>7.1f} {d:>7.1f} {n:>5}  {verdict}')

    print(f'\n{len(flagged)} flagged | {len(fixed)} improve enough to rewrite '
          f'| {len(skipped)} left alone')

    if args.dry_run or not fixed:
        if not args.dry_run:
            print('nothing to do')
        return 0

    print(f'\nrepairing {len(fixed)} file(s)…')
    ok = sum(1 for p in fixed if repair(p))
    print(f'{ok}/{len(fixed)} rewritten')
    return 0 if ok == len(fixed) else 1


if __name__ == '__main__':
    sys.exit(main())
