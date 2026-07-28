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

EAST (v2.3.1546) -- owner: "what if you took out the 3 frames from the torso
sheet?  The original armor art didn't have razored off shoulders."

The instinct was right, the arithmetic turned out different.  East's fullset
plays 25 frames against a 28-frame chest sheet, so the first attempt mapped
them with the cycle-phase rule rebuild_east_head_track.py uses -- and the
pixels it wanted to add were a HALO scattered right around the silhouette,
975px of it, not a shoulder band.  Two poses averaged together.

Measured, the chest sheet is not a 28-frame animation at all: frames 14-27 are
byte-identical to 0-13.  It is a 14-frame loop stored twice, because it was
extended to sit on the 28-frame BODY clock, while the fullset is its own
25-frame animation from the owner's board (v2.3.1366/1367).  So there is no
subset of 3 frames to drop -- 14 and 25 have no common cadence.

What DOES work is to stop guessing the correspondence and measure it: for each
fullset frame, pick the chest frame whose plate sits most completely inside it.
That scores 0.91-1.00 (the three 1:1 directions scored 0.93-0.97 before their
own restore) and halves the additions to 492px, now sitting on the shoulder
tops.  The residue is at the fists and elbows, where a mismatched pose really
would paste armour in the wrong place -- so east's restore is BAND-LIMITED to
the rows within EAST_BAND of the figure's own top edge.  That is where the
razor cut is, and it drops the additions to 246px with nothing near an arm.
Widening the band to 8 rows only finds 6 more pixels, which is the evidence
that the missing armour really is a thin cap and not a general shortfall.

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
DIRS = ['south', 'southwest', 'north', 'east']
EAST_BAND = 6      # rows below the figure's top edge that count as "the cap"


def restore_east(apply_it):
    """East: matched per frame, then band-limited to the razored cap."""
    c = np.array(Image.open(CHEST.format(dir='east')).convert('RGBA'))
    f = np.array(Image.open(FULL.format(dir='east')).convert('RGBA'))
    cn, fn = c.shape[1] // FW, f.shape[1] // FW
    # the chest sheet is a 14-frame loop stored twice; use the unique half
    uniq = cn // 2 if cn % 2 == 0 and np.array_equal(
        c[:, :cn // 2 * FW], c[:, cn // 2 * FW:]) else cn
    cms = [c[:, j * FW:(j + 1) * FW, 3] > ALPHA_T for j in range(uniq)]
    add_total = frames = 0
    worst = 1.0
    for i in range(fn):
        fm = f[:, i * FW:(i + 1) * FW, 3] > ALPHA_T
        ys = np.nonzero(fm.any(axis=1))[0]
        if not len(ys):
            continue
        sc = [(cm & fm).sum() / max(1, cm.sum()) for cm in cms]
        j = int(np.argmax(sc))
        worst = min(worst, sc[j])
        add = cms[j] & ~fm
        add[ys[0] + EAST_BAND:] = False          # the cap only
        if add.any():
            frames += 1
        add_total += int(add.sum())
        if apply_it:
            f[:, i * FW:(i + 1) * FW][add] = c[:, j * FW:(j + 1) * FW][add]
    if apply_it:
        Image.fromarray(f).save(FULL.format(dir='east'))
    print(f'  {"east":<11} {uniq} unique torso frame(s), worst match {worst:.2f}, '
          f'+{add_total} px over {frames}/{fn} frame(s) in the top {EAST_BAND} rows '
          f'{"applied" if apply_it else "(dry run)"}')


def restore(d, apply_it):
    cp, fp = CHEST.format(dir=d), FULL.format(dir=d)
    if not (os.path.isfile(cp) and os.path.isfile(fp)):
        print(f'  {d:<11} no sheet pair')
        return
    c = np.array(Image.open(cp).convert('RGBA'))
    f = np.array(Image.open(fp).convert('RGBA'))
    cn, fn = c.shape[1] // FW, f.shape[1] // FW
    if cn != fn:
        restore_east(apply_it) if d == 'east' else print(
            f'  {d:<11} SKIPPED — {cn} torso frames vs {fn} fullset frames (re-timed)')
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
