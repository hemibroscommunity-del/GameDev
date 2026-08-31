#!/usr/bin/env python3
"""CUT THE HOOD OFF THE CAPE, SO THE BODY CAN STAND IN FRONT OF THE REST
(v2.3.2179).

Owner, with two screenshots: "The cape needs adjustments ... The left side of
the cape should be occluded by characters body. Then mirrored for the other
side."

═══ WHY THE CAPE READS AS A PLANK ═══

v2.3.2023 put the cape ABOVE the body and gear, and said why: the art is a
whole-mannequin drawing whose front panels were painted over the chest, so
"the picture states its own z-order". That is true of the PICTURE and false of
the CHARACTER. Drawn entirely in front, the panels cover the torso and arms, so
the cape has no depth: it is a red slab glued to the front of a person rather
than cloth hanging off their shoulders. In the owner's east screenshot the
inner edge cuts straight across the chest and the whole thing reads as a board.

═══ THE SPLIT ═══

A cape is two things at once, and they sit on opposite sides of the body:

    the HOOD    is over the skull        -> must draw IN FRONT
    the PANELS  hang from the shoulders  -> must draw BEHIND

So the renderer draws the cape TWICE -- the full art behind the body, and the
hood alone in front of it. This tool writes that second texture.

Both are full 256 frames at the identical fitted position, which is the whole
reason this is a separate PNG and not a mask: `_placeCape` positions a cape by
the BODY SPRITE'S transform (see capeSprites.js -- there is no anchor maths),
so two full frames need no second placement path, no anchor compensation, and
no mask that would have to be kept in step with the jog tilt and pivot.

═══ WHERE THE CUT GOES ═══

At the CLASP, which is the garment's own seam between hood and panels, found
by measuring the gold: its pixel count per row spikes across the clasp and
collapses to a thin cord below it.

    south      gold/row 9..14 to y81, spikes y82-88 (peak 34 at y86), 6-8 from y91
    southwest  gold/row 5..12 to y78, spikes y79-87 (peak 35 at y84), 7-9 from y90
    east       gold/row 2..7  to y77, spikes y78-81 (peak 23),        3-7 from y86

so the cut sits just below each spike. Rows at or below it are erased from the
hood frame; the full frame keeps everything.

═══ WHY ONLY THREE FACINGS ═══

north and northeast are the character's BACK. There the cape is between the
viewer and the person and correctly covers them -- there is nothing to occlude
and no hood to separate, so those two keep the single in-front sprite they
already had. Cutting them would put the cape behind the body it is supposed to
be draped over. The renderer decides this by whether a hood frame exists.

  python3 tools/cape/split-cape-hood.py            # writes hood/<dir>.png
  python3 tools/cape/split-cape-hood.py --check    # measure only
"""
import argparse, json, os
from collections import deque
from PIL import Image
import numpy as np

CAPE_DIR = 'public/sprites/traits/cape'

# The clasp row per facing: rows >= this are panels, not hood. Measured above.
# north / northeast are absent ON PURPOSE -- see the header.
SPLIT = {'south': 89, 'southwest': 89, 'east': 83}


def fill_holes(mask):
    """The hood silhouette with its FACE OPENING filled in.

    v2.3.2179, the hair half of the owner's report ("Hair sticking out").  Hair
    draws under the hood, so anything inside the hood is already covered -- what
    shows is hair reaching PAST the hood's outline, which no z-order can fix.
    Clipping the hair to this shape is what cuts it.

    The opening has to be filled or the mask would also cut the forehead hair
    that is supposed to show through it.  A hole is transparency the border
    cannot reach, so this floods inward from the edge and fills whatever the
    flood never touched."""
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if not mask[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if not mask[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not mask[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    return mask | ~seen          # solid + every hole the flood could not reach


def gold_profile(a):
    """Rows of the clasp's gold, for the --check receipt."""
    vis = a[:, :, 3] > 40
    r = a[:, :, 0].astype(int); g = a[:, :, 1].astype(int); b = a[:, :, 2].astype(int)
    gold = vis & (r > 190) & (g > 130) & (b < 120)
    return gold.sum(axis=1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    args = ap.parse_args()

    if not os.path.isdir(CAPE_DIR):
        raise SystemExit(f'no {CAPE_DIR} — run from the repo root')

    for cape in sorted(os.listdir(CAPE_DIR)):
        base = os.path.join(CAPE_DIR, cape)
        if not os.path.isdir(base):
            continue
        hood_dir = os.path.join(base, 'hood')
        for d, cut in SPLIT.items():
            src = os.path.join(base, f'{d}.png')
            if not os.path.exists(src):
                print(f'  MISSING {src}')
                continue
            a = np.array(Image.open(src).convert('RGBA'))
            prof = gold_profile(a)
            kept = int((a[:cut, :, 3] > 8).sum())
            dropped = int((a[cut:, :, 3] > 8).sum())
            if args.check:
                peak = int(prof[max(0, cut - 12):cut].max()) if cut else 0
                print(f'  {cape}/{d:10} cut y={cut:3d}  hood {kept:5d}px  panels {dropped:5d}px  '
                      f'clasp gold peak above cut = {peak}')
                continue
            if kept == 0:
                print(f'  REFUSED {cape}/{d}: the cut leaves an empty hood')
                continue
            if dropped == 0:
                print(f'  REFUSED {cape}/{d}: the cut drops nothing — hood would equal the cape')
                continue
            out = a.copy()
            out[cut:, :, :] = 0          # full frame, panels erased
            os.makedirs(hood_dir, exist_ok=True)
            dst = os.path.join(hood_dir, f'{d}.png')
            Image.fromarray(out, 'RGBA').save(dst, 'PNG', optimize=True)
            print(f'  wrote {os.path.relpath(dst)}  ({kept} hood px, {dropped} px left to the back layer)')

            # The hair clip: the hood's silhouette with the face opening filled.
            solid = out[:, :, 3] > 40
            filled = fill_holes(solid)
            m = np.zeros_like(out)
            m[filled] = (255, 255, 255, 255)
            mdst = os.path.join(hood_dir, f'hairmask-{d}.png')
            Image.fromarray(m, 'RGBA').save(mdst, 'PNG', optimize=True)
            print(f'         + {os.path.relpath(mdst)}  ({int(filled.sum())} px, '
                  f'{int(filled.sum() - solid.sum())} of them the filled face opening)')

        # Record the cut in the cape's own meta, where the fits already live.
        if not args.check:
            mp = os.path.join(base, 'meta.json')
            if os.path.exists(mp):
                meta = json.load(open(mp))
                meta['hoodSplitY'] = dict(SPLIT)
                meta['hoodNote'] = (
                    'v2.3.2179: hood/<dir>.png is the cape above the clasp, drawn IN FRONT of '
                    'the body while the full frame draws BEHIND it, so the torso occludes the '
                    'panels instead of the panels covering the torso. north/northeast have no '
                    'hood frame on purpose: they are the back view, where the cape correctly '
                    'covers the character and there is nothing to occlude. '
                    'Regenerate with tools/cape/split-cape-hood.py.')
                json.dump(meta, open(mp, 'w'), indent=1)
                print(f'  meta.json updated with hoodSplitY')


if __name__ == '__main__':
    main()
