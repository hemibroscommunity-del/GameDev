#!/usr/bin/env python3
"""v2.3.1484: resize a headwear item per direction without it sliding off the head.

    python3 tools/tune_headwear.py --id crown --scale southwest=0.85,east=1.30

Why this is not just editing `scale`
------------------------------------
_placeTrait pins `anchors[dir]` — the hat's bbox TOP-centre — to the body's
crown, and the sprite's anchor is also its scaling pivot.  So `scale` grows the
hat DOWNWARD from its top edge: the band, which is what actually rests on the
skull, slides further down the face the bigger you make it.  Measured on the
crown, taking east from 1.0 to 1.30 would drop its band 12px — straight over
his eyes.

So every scale change is paired with the crownNudge that cancels it.  With B
the distance from the anchor down to the hat's bottom edge (the band, for
anything hat-shaped):

    band lands at   crown + nudge_y + B * scale
    hold it still:  nudge_y' = nudge_y + B * (1 - scale)

X needs no correction — the anchor is the bbox centre, so width grows
symmetrically about it.

Scales compose, so this is safe to run twice; the tool reads the current scale
and rebases the nudge from the ORIGINAL geometry each time.
"""
import argparse
import json
import os
import numpy as np
from PIL import Image
from scipy import ndimage

META = 'public/sprites/traits/headwear/{id}/meta.json'
BODY = 'public/sprites/player/{pose}-{dir}.png'
DIRS = ['south', 'southwest', 'east', 'northeast', 'north']

# the blanket per-pose multiplier _placeTrait applies to EVERY head trait
# (entityRenderer poseTraitMul).  A per-hat fit has to divide it back out.
POSE_TRAIT_MUL = {('mine', None): 1.21, ('fish', None): 0.88, ('jog', 'east'): 0.67}


def pose_trait_mul(pose, d):
    if pose == 'mine':
        return 1.21
    if pose == 'fish':
        return 0.88
    if pose == 'jog' and d == 'east':
        return 0.67
    return 1.0


def head_width(alive):
    """Widest row of the head, found by the neck pinch in the width profile.

    Reliable on the upright sheets this is used for.  The erosion-based finder
    in fit_hit_armor_art needs a population of frames to calibrate its target
    size, so it degenerates on the single-frame stand sheets."""
    w = alive.sum(axis=1)
    rows = np.nonzero(w)[0]
    wide = np.nonzero(w >= 10)[0]
    if not len(rows) or not len(wide):
        return None
    h0 = int(wide[0])
    lo, hi = h0 + 10, min(int(rows[-1]) - 1, h0 + 34)
    if hi <= lo:
        return None
    band = w[lo:hi + 1]
    neck = lo + int(np.max(np.nonzero(band == band.min())[0])) + 1
    above = alive.copy()
    above[neck:] = False
    lbl, n = ndimage.label(ndimage.binary_fill_holes(above))
    if not n:
        return None
    sizes = [int((lbl == k).sum()) for k in range(1, n + 1)]
    ys, xs = np.nonzero(lbl == (int(np.argmax(sizes)) + 1))
    return xs.max() - xs.min() + 1


def sheet_head(pose, d):
    """Median head width across a sheet, normalised to 256-space."""
    im = np.array(Image.open(BODY.format(pose=pose, dir=d)).convert('RGBA'))
    fw = im.shape[0]
    sc = 256 / fw
    got = [head_width(im[:, i * fw:(i + 1) * fw, 3] > 40)
           for i in range(im.shape[1] // fw)]
    got = [g * sc for g in got if g]
    return float(np.median(got)) if got else None


def fit_pose(meta, pose, path):
    """Make the hat sit on `pose`'s head the way it sits on the idle head.

    bodyDirScale drops out of this: it scales the hat and the body by the same
    factor, so the only thing that matters is how big the head is DRAWN in each
    sheet.  Required total multiplier is therefore just headWidth(pose) /
    headWidth(stand), and scaleByPose has to carry whatever the renderer's
    blanket poseTraitMul does not.

    The placement is scaled about the crown too (poseNudge = crownNudge * (r-1)),
    so the hat grows around the point it is pinned at instead of sliding down
    the face.  X is left at 0 deliberately: nudge X is multiplied by the mirror
    sign, so a non-zero value needs opposite entries per screen side."""
    print(f'{pose} vs stand — head width drawn in each sheet (256-space)\n')
    sbp = meta.setdefault('scaleByPose', {}).setdefault(pose, {})
    pn = meta.setdefault('poseNudge', {}).setdefault(pose, {})
    for d in DIRS:
        try:
            ws, wp = sheet_head('stand', d), sheet_head(pose, d)
        except FileNotFoundError:
            print(f'  {d:<11} no {pose} sheet — skipped')
            continue
        if not ws or not wp:
            print(f'  {d:<11} measurement failed — skipped')
            continue
        r = wp / ws
        mul = pose_trait_mul(pose, d)
        sbp[d] = round(r / mul, 3)
        cn = meta['crownNudge'][d]
        pn[d] = [0, int(round(cn[1] * (r - 1)))]
        print(f'  {d:<11} stand {ws:5.1f}  {pose} {wp:5.1f}   ratio {r:.3f}'
              f'   poseTraitMul {mul:g}   -> scaleByPose {sbp[d]:g}, '
              f'poseNudge {pn[d]}')
    note = meta.get('note', '')
    tag = (f' {pose} fitted by tools/tune_headwear.py --fit-pose {pose}: the '
           f'{pose} sheets draw the head at a different size from the idle '
           f'sheets, so scaleByPose carries headWidth({pose})/headWidth(stand) '
           f'with the renderer\'s blanket poseTraitMul divided back out, and '
           f'poseNudge scales the placement about the crown so the band does '
           f'not slide down the face.')
    if f'{pose} fitted by' not in note:
        meta['note'] = note + tag
    with open(path, 'w') as fh:
        json.dump(meta, fh, indent=2)
        fh.write('\n')
    print('\nwrote', path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--id', required=True)
    ap.add_argument('--scale',
                    help='comma list, e.g. "southwest=0.85,east=1.30" '
                         '(absolute multiplier, not relative to the current one)')
    ap.add_argument('--fit-pose',
                    help='measure a pose\'s head against stand and write '
                         'scaleByPose + poseNudge so the hat fits it the same '
                         'way it fits the idle (e.g. --fit-pose jog)')
    args = ap.parse_args()
    if not args.scale and not args.fit_pose:
        raise SystemExit('give --scale or --fit-pose')

    path = META.format(id=args.id)
    if not os.path.exists(path):
        raise SystemExit(f'no such hat: {path}')
    meta = json.load(open(path))

    if args.fit_pose:
        fit_pose(meta, args.fit_pose, path)
        return

    want = {}
    for part in args.scale.split(','):
        d, _, v = part.partition('=')
        d = d.strip()
        if d not in DIRS:
            raise SystemExit(f'unknown direction {d!r}; expected one of {DIRS}')
        want[d] = float(v)

    for d, s in want.items():
        bb = meta['bboxes'][d]
        anchor = meta['anchors'][d]
        old_s = float(meta.get('scale', {}).get(d, 1))
        # B: anchor -> bottom edge, in the hat's own unscaled pixels
        B = (bb[1] + bb[3]) - anchor[1]
        ny = meta['crownNudge'][d][1]
        # undo whatever the current scale was holding, then apply the new one
        base = ny - B * (1 - old_s)
        meta['crownNudge'][d][1] = int(round(base + B * (1 - s)))
        meta.setdefault('scale', {})[d] = round(s, 3)
        print(f'{d:<10} scale {old_s:g} -> {s:g}   band offset {B}px   '
              f'crownNudge y {ny} -> {meta["crownNudge"][d][1]}')

    note = meta.get('note', '')
    tag = ' Per-direction scale tuned on device (' + \
        ', '.join(f'{d} {s:g}x' for d, s in sorted(want.items())) + \
        '); crownNudge y re-derived each time so the band stays on the skull ' \
        'instead of sliding down as the hat grows.'
    if 'Per-direction scale tuned' not in note:
        meta['note'] = note + tag
    with open(path, 'w') as fh:
        json.dump(meta, fh, indent=2)
        fh.write('\n')
    print('\nwrote', path)


if __name__ == '__main__':
    main()
