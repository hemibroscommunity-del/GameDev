#!/usr/bin/env python3
"""v2.3.1955: put a helmet's FAR ear flap behind the head, where it belongs.

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
three renderers -- the world, the portrait, and the attack stand-ins. MEASURED
first: the far flap, placed, lands entirely inside the head's silhouette
(southwest: flap x 131..158 against a head spanning 96..163). Entirely hidden
means there is nothing for a lower layer to show, so the layer would be
machinery with no visible output. Erasing the flap is the same picture.

Which flap is the far one
-------------------------
Not hard-coded: a facing that draws TWO flaps under the brow band is a
three-quarter view, and the NEAR flap is the one that reaches the head's
silhouette edge -- it is on the side turned toward the camera, so it hangs off
the outline. The far flap is the one that reaches neither edge. Measured
per facing against the actual stand sheet, so a re-cut hat is re-judged rather
than re-broken.

A facing with ONE flap is a profile (east/west) and is left alone: the single
flap IS the near ear, and in profile the near ear does sit over the side of
the head.

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
# A flap counts as reaching the silhouette when it comes within this many
# 256-frame pixels of the head's outline on that side.  2px, because the head
# outline is a hard pixel edge and the flap is drawn to overlap it, not to
# touch it exactly.
EDGE_SLOP = 2
# Rows of the helmet that count as the BAND: any row at least this share of the
# helmet's widest row.  Below the band there is nothing but flaps.
BAND_SHARE = 0.55
# Below this a piece under the band is a stray pixel, not an ear flap.  Without
# it --all reports one- and two-pixel "flaps" on half the catalogue, which
# makes the report useless as a shopping list.
MIN_FLAP = 12


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
    """-> (list of art-space pixels to erase, note)."""
    p = f'{HEADWEAR}/{hid}/{d}.png'
    if not os.path.isfile(p) or d not in meta.get('anchors', {}):
        return [], 'no frame'
    art = np.array(Image.open(p).convert('RGBA'))
    m = art[:, :, 3] > ALPHA_T
    band_bot, comps = flaps(m)
    if len(comps) < 2:
        return [], f'{len(comps)} flap(s) — profile or none, left alone'

    body = _load256(BODY.format(dir=d))
    head = body[:, :, 3] > ALPHA_T
    by = tops[f'stand-{d}-0'][1]
    head[:by, :] = False
    head[by + 70:, :] = False
    hcols = np.nonzero(head.any(axis=0))[0]
    hl, hr = int(hcols.min()), int(hcols.max())

    reach = []
    for c in comps:
        probe = np.zeros_like(art)
        for (y, x) in c:
            probe[y, x] = art[y, x]
        pl = _place(_load256_from(probe), meta, d, tops)
        cols = np.nonzero((pl[:, :, 3] > ALPHA_T).any(axis=0))[0]
        if not len(cols):
            reach.append(None)
            continue
        reach.append((int(cols.min()) - hl, hr - int(cols.max())))

    far = [i for i, r in enumerate(reach)
           if r is not None and r[0] > EDGE_SLOP and r[1] > EDGE_SLOP]
    if verbose:
        for i, r in enumerate(reach):
            side = 'left ' if i == 0 else 'right'
            gap = 'off-frame' if r is None else f'{r[0]:+3d} from left edge, {r[1]:+3d} from right edge'
            print(f'      flap {i} ({side}) {gap}{"   <- FAR, behind the head" if i in far else ""}')
    if len(far) == len(comps):
        return [], 'every flap is inboard — refusing (that is not a three-quarter view)'
    px = [q for i in far for q in comps[i]]
    return px, (f'{len(far)} far flap(s), {len(px)}px' if far else 'both flaps reach an edge')


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
            meta['note'] = (meta.get('note', '') + ' v2.3.1955: the FAR ear flap was erased from the '
                            'three-quarter frames by tools/ui/hide-far-earflap.py -- it sits on the '
                            'other side of the skull, so the head hides it; drawn over the cheek it '
                            'read as a sticker (owner report).')
            with open(mp, 'w') as fh:
                json.dump(meta, fh, indent=2)
                fh.write('\n')
    print('done' + ('' if args.apply else '  (dry run — pass --apply)'))


if __name__ == '__main__':
    main()
