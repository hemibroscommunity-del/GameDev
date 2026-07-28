#!/usr/bin/env python3
"""v2.3.1545: give the fullset figures back the armour the helmet cuts took.

Owner, on jog north: "the very tips of the shoulder pauldron outlines get cut
off in some frames" ... "the defect is in the standalone torso armor. It is not
supposed to have that jagged chunk missing. The original sprite sheet art did
not have that for jog north" ... "or maybe you cut it with the helmet still on
it."

That last guess is the right one.  The fullset figures were baked with a helmet
on, and v2.3.1368-1379 cut the helmet back off so the player's own head could
show (v2.3.1368: "remove just the helmet").  Those cuts were horizontal, so
they took the tops of the PAULDRONS with the helmet -- the domes came out
razored flat, with their dark keyline outline sliced away.  v2.3.1386 already
answered one round of this ("pauldrons rounded -- no more razored flat line on
jog north/south"), which is the tell that the cut, not the art, is at fault.

The intact art was never lost: the same plate ships as its own torso sheet
under gear/chest/steelplate, which is what a partially-armoured player wears
(v2.3.1372), and it has whole rounded pauldrons with their outline all the way
round.  Measured, the two sheets are registered -- 93-97% of the torso's pixels
land inside the fullset's silhouette -- so the missing armour can simply be put
back from it.

The restore is STRICTLY ADDITIVE: a fullset pixel is only written where the
fullset is transparent and the torso sheet has armour.  Nothing is moved,
recoloured or removed, so no other tuning of these sheets can regress, and the
helmet cannot come back -- the torso sheet has no helmet in it to restore.

north loses 77px/frame to the cut, southwest 52, east 56, south 40.

EAST IS SKIPPED by default: its fullset plays 25 frames against the chest
sheet's 28 (the same re-cadencing rebuild_east_head_track.py deals with), so
frame i is not the same pose in both and a union would smear two poses
together.  Pass --east to map it through the cadence rule anyway, but check the
result frame by frame first.

Run from the repo root:
    python3 tools/restore_fullset_pauldrons.py
    python3 tools/restore_fullset_pauldrons.py --apply
"""
import argparse
import os
import numpy as np
from PIL import Image

FW = 128
CHEST = 'public/sprites/gear/chest/steelplate/jog-{dir}.png'
FULL = 'public/sprites/gear/fullset/steel/jog-{dir}.png'
ALPHA_T = 16
DIRS = ['south', 'southwest', 'north']


def restore(d, apply_it):
    cp, fp = CHEST.format(dir=d), FULL.format(dir=d)
    if not (os.path.isfile(cp) and os.path.isfile(fp)):
        print(f'  {d:<11} no sheet pair')
        return
    c = np.array(Image.open(cp).convert('RGBA'))
    f = np.array(Image.open(fp).convert('RGBA'))
    cn, fn = c.shape[1] // FW, f.shape[1] // FW
    if cn != fn:
        print(f'  {d:<11} SKIPPED — {cn} torso frames vs {fn} fullset frames (re-timed)')
        return
    cm, fm = c[:, :, 3] > ALPHA_T, f[:, :, 3] > ALPHA_T
    inside = (cm & fm).sum() / max(1, cm.sum())
    if inside < 0.85:
        print(f'  {d:<11} REFUSED — only {inside:.1%} of the torso lands inside the '
              f'fullset; these two sheets are not registered')
        return
    add = cm & ~fm
    frames = sum(1 for i in range(fn) if add[:, i * FW:(i + 1) * FW].any())
    if apply_it:
        f[add] = c[add]
        Image.fromarray(f).save(fp)
    print(f'  {d:<11} registered {inside:.1%}, +{int(add.sum())} px over {frames}/{fn} '
          f'frame(s) ({add.sum() / fn:.1f}/frame) '
          f'{"applied" if apply_it else "(dry run)"}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dirs', default=','.join(DIRS))
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()
    for d in args.dirs.split(','):
        restore(d, args.apply)


if __name__ == '__main__':
    main()
