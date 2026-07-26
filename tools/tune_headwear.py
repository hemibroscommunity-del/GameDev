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

META = 'public/sprites/traits/headwear/{id}/meta.json'
DIRS = ['south', 'southwest', 'east', 'northeast', 'north']


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--id', required=True)
    ap.add_argument('--scale', required=True,
                    help='comma list, e.g. "southwest=0.85,east=1.30" '
                         '(absolute multiplier, not relative to the current one)')
    args = ap.parse_args()

    path = META.format(id=args.id)
    if not os.path.exists(path):
        raise SystemExit(f'no such hat: {path}')
    meta = json.load(open(path))

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
