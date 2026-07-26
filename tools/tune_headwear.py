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


BODY_TOPS = 'public/sprites/player/body-tops.json'
DEPTHS = (6, 10, 14, 18, 22)     # 256-space rows below the crown to sample


def sheet_head(pose, d):
    """How wide the head is DRAWN, measured at fixed depths below the crown.

    Anchored on body-tops -- the exact point _placeTrait pins the hat to -- and
    sampled at several depths, whose answers agree within a few percent.  Two
    earlier methods were tried and both lied:

      * the erosion finder from fit_hit_armor_art needs a population of frames
        to calibrate its target size, so it degenerates on the single-frame
        stand sheets (returned nothing at all for stand-east);
      * a neck-pinch width profile truncated the stand-east head to 12 rows and
        measured the width of its top sliver, which put the jog/stand ratio at
        1.073 when it is really 0.927 -- the wrong SIGN, and the reason the
        first jog fit came out visibly too big (owner: "jog east is still a bit
        too large").

    Neither needs to be right about where the neck is.  This one does not ask.
    """
    tops = json.load(open(BODY_TOPS))
    im = np.array(Image.open(BODY.format(pose=pose, dir=d)).convert('RGBA'))
    fw = im.shape[0]
    sc = 256 / fw
    acc = []
    for i in range(im.shape[1] // fw):
        key = f'{pose}-{d}-{i}'
        if key not in tops:
            continue
        cy = tops[key][1] / sc
        a = im[:, i * fw:(i + 1) * fw, 3] > 40
        for depth in DEPTHS:
            r = int(round(cy + depth / sc))
            if 0 <= r < fw:
                xs = np.nonzero(a[r])[0]
                if len(xs):
                    acc.append((xs.max() - xs.min() + 1) * sc)
    return float(np.median(acc)) if acc else None


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
    meta['poseFit'] = True
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
        # v2.3.1487: with poseFit set, the renderer skips its blanket
        # poseTraitMul for this item, so scaleByPose is the measured head ratio
        # itself rather than that ratio with 1/0.67 baked in to cancel a
        # constant.  Same rendered size either way; this one is readable.
        mul = 1.0
        sbp[d] = round(r / mul, 3)
        cn = meta['crownNudge'][d]
        pn[d] = [0, int(round(cn[1] * (r - 1)))]
        print(f'  {d:<11} stand {ws:5.1f}  {pose} {wp:5.1f}   ratio {r:.3f}'
              f'   -> scaleByPose {sbp[d]:g}, poseNudge {pn[d]}')
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
