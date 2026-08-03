#!/usr/bin/env python3
"""Select and de-fringe every sprite that still carries a UNIFORM matte residue.

v2.3.1606 (owner: "revisit all trait images and sprite sheets for edge pixels
that should've been removed (usually whiteish).  Reference their original
background color to get a sense of whether it's removable").

SELECTION IS THE WHOLE PROBLEM.  Anti-aliased art always has semi-transparent
edge pixels; only some of them carry a foreign background colour.  Repairing
the rest would flatten legitimate edge shading.  The discriminator is
survey_white_fringe.py's matte solve:

    M = (P - a*C) / (1-a)      per semi-transparent pixel

If the per-pixel answers AGREE (low spread), the art really was composited over
one solid background and the residue is that background — removable.  If they
disagree (spread 30-120), there is no single background; the "estimate" is
noise and the edges are honest anti-aliasing against the sprite's own colours.
Measured across public/sprites: 227 files sit at spread 0-3 (many at EXACTLY
0.0, a perfect key), and 76 sit above 25.  The gap is wide, so the threshold is
not a fine judgement call.

REPAIR is delegated to tools/defringe_gray.py, unchanged.  Despite the name it
is colour-agnostic — it replaces every semi-transparent pixel's RGB with the
nearest OPAQUE pixel's RGB and keeps alpha exactly, so it removes a matte of
any colour (this sweep finds white, cyan and pale-blue ones) while leaving the
silhouette, the geometry and every frame anchor untouched.  That matters: these
sheets feed the masked-body and retint pipelines, which key off alpha.  Reusing
it rather than writing a second implementation keeps one reviewed definition of
"de-fringe" in the repo.

Verified on the v2.3.1606 batch: across all 48 rewritten files, zero changed
their dimensions, zero changed a single alpha value, and zero changed the RGB of
any fully-opaque pixel.  Only the semi-transparent ring moved.

Run:
  python3 tools/defringe_matte_sweep.py --dry-run public/sprites
  python3 tools/defringe_matte_sweep.py public/sprites
"""
import argparse
import subprocess
import sys

sys.path.insert(0, __file__.rsplit('/', 1)[0])
from survey_white_fringe import analyse, walk          # noqa: E402

SPREAD_MAX = 12.0      # below this the background estimate is trustworthy
MIN_PX = 20            # fewer changed pixels than this is not worth a rewrite
MIN_DELTA = 12.0       # edges must genuinely differ from the sprite behind them

# LIGHT MATTES ONLY, deliberately.
# The solve cannot tell a dark BACKGROUND from the sprite's own dark KEYLINE:
# both leave an outer ring that is darker than the art inside it.  Measured on
# monsters/mummy/walk-n.png (estimated matte (26,17,12)) a de-fringe moves
# 23,079 clearly-visible semi pixels by a median of 48 — a large change to art
# whose residue may be its own outline, with no way to tell from the numbers.
# A white, cyan or blue matte has no such ambiguity: no one outlines a sprite in
# cyan.  So this sweep repairs only foreign LIGHT mattes, which is also exactly
# what was asked for ("usually whiteish").  Dark-matte candidates are listed by
# survey_white_fringe.py and left for a human call.


def select(paths):
    picked, skipped = [], 0
    for f in walk(paths):
        try:
            r = analyse(f)
        except Exception as e:                          # noqa: BLE001
            print(f'  !! {f}: {e}', file=sys.stderr)
            continue
        if not r or r['matteSpread'] is None:
            continue
        # semiLifted only counts LIGHTER-than-sprite edges; a dark matte lifts
        # negative, so fall back to raw semi count when the matte is dark.
        px = r['wouldRecolor']
        if (r['matteSpread'] <= SPREAD_MAX and r['matteIsLight']
                and px >= MIN_PX and r['edgeDelta'] >= MIN_DELTA):
            picked.append((r, px))
        else:
            skipped += 1
    picked.sort(key=lambda t: -t[1])
    return picked, skipped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('paths', nargs='+')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--limit', type=int, default=0)
    args = ap.parse_args()

    picked, skipped = select(args.paths)
    if args.limit:
        picked = picked[:args.limit]

    print(f'selected {len(picked)} file(s); {skipped} left alone\n')
    for r, px in picked:
        m = r['matte']
        print(f'  {px:>6}px  spread {r["matteSpread"]:>5}  '
              f'({m[0]:.0f},{m[1]:.0f},{m[2]:.0f})  {r["path"]}')
    if args.dry_run:
        print('\n[dry-run] nothing written')
        return
    if not picked:
        return
    files = [r['path'] for r, _ in picked]
    print(f'\nde-fringing {len(files)} file(s) via tools/defringe_gray.py…')
    for i in range(0, len(files), 60):                  # keep argv sane
        subprocess.run([sys.executable, 'tools/defringe_gray.py', *files[i:i + 60]],
                       check=True, stdout=subprocess.DEVNULL)
    print('done')


if __name__ == '__main__':
    main()
