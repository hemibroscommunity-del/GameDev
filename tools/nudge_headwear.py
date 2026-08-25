#!/usr/bin/env python3
"""v2.3.1512: move a hat by hand, in the units the nudge sheet is ruled in.

headwear_nudge_sheet.py draws a grid over every hat with the head anchor marked.
This is the other half: it takes a reading off that grid and writes it into the
trait's meta, so "the cowboy hat wants to come down 3 and left 1" is one command
rather than an editing session in a JSON file.

    python3 tools/nudge_headwear.py --id cowboy-hat --dy 3 --dx -1

Positive dy is DOWN and positive dx is RIGHT, matching the sheet's labels and
crownNudge's own sign.  By default the whole hat moves, which is nearly always
what is wanted -- a hat that sits low sits low from every angle.  Pass --dirs to
move only some of them, for the case where one direction alone is off.

Only crownNudge changes.  The artwork, the bbox and the anchor are untouched:
this is telling _placeTrait where the head is, not redrawing anything.

    [--dirs south,east]   default: all five
    [--scale 1.5]         resize instead of move -- multiplies that direction's
                          existing scale, about the anchor, which is the pivot
                          _placeTrait scales around
    [--show]              print the current values and change nothing
    --tag v2.3.NNNN       required on a write; recorded in the trait's note
    [--reason "..."]      why, recorded next to the numbers
"""
import argparse
import json
import os

DIRS = ['south', 'southwest', 'east', 'northeast', 'north']
TRAITS = 'public/sprites/traits'


def trait_meta(tid):
    for cat in ('headwear', 'hair'):
        p = f'{TRAITS}/{cat}/{tid}/meta.json'
        if os.path.isfile(p):
            return p
    raise SystemExit(f'no trait called {tid} under {TRAITS}/headwear or /hair')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--id', required=True)
    ap.add_argument('--dx', type=int, default=0)
    ap.add_argument('--dy', type=int, default=0)
    ap.add_argument('--dirs', default=','.join(DIRS))
    ap.add_argument('--scale', type=float, default=None)
    ap.add_argument('--show', action='store_true')
    # v2.3.1925: the version tag used to be HARDCODED into the note this writes,
    # so every nudge since v2.3.1514 has been stamping that tag onto work from a
    # different version -- the note is this repo's institutional memory and a
    # wrong tag in it points a future reader at the wrong incident.  Required on
    # a write; --show still needs nothing.
    ap.add_argument('--tag', help='version tag to record in the note, e.g. v2.3.1925')
    ap.add_argument('--reason', help='why, recorded in the note alongside the numbers')
    args = ap.parse_args()

    path = trait_meta(args.id)
    meta = json.load(open(path))
    want = [d for d in args.dirs.split(',') if d]
    bad = [d for d in want if d not in DIRS]
    if bad:
        raise SystemExit(f'not a direction: {",".join(bad)} (have {",".join(DIRS)})')

    if args.show or (not args.dx and not args.dy and args.scale is None):
        for d in DIRS:
            print(f'  {d:<10} crownNudge {meta["crownNudge"][d]}  '
                  f'scale {meta.get("scale", {}).get(d, 1)}')
        return

    for d in want:
        x, y = meta['crownNudge'][d]
        # the hat moves DOWN/RIGHT relative to the body when the point the frame
        # calls the crown moves UP/LEFT inside the frame
        meta['crownNudge'][d] = [int(x + args.dx), int(y + args.dy)]
        if args.scale is not None:
            meta.setdefault('scale', {})
            meta['scale'][d] = round(meta['scale'].get(d, 1) * args.scale, 4)
    what = f'dx {args.dx:+d} dy {args.dy:+d}'
    if args.scale is not None:
        what += f' scale x{args.scale}'
    if not args.tag:
        raise SystemExit('--tag is required for a write (e.g. --tag v2.3.1925); '
                         'it is recorded in the trait note')
    reason = f' ({args.reason})' if args.reason else ''
    meta['note'] = (meta.get('note', '') + f' {args.tag}: nudged by hand '
                    f'{what} on {",".join(want)}{reason}.')
    with open(path, 'w') as fh:
        json.dump(meta, fh, indent=2)
        fh.write('\n')
    print(f'{args.id}: {what} on {", ".join(want)}')


if __name__ == '__main__':
    main()
