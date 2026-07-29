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

EAST (v2.3.1548) -- owner: "you have the original jog east torso armor sprites
still.  Retrieve it" ... "what if you took out the 3 frames from the torso
sheet?"

Both were right, and it took three wrong answers to find the correspondence
that makes them work.

East's fullset plays 25 frames against a 28-frame chest sheet, so the first
attempt (v2.3.1546, reverted) paired them with the cycle-phase formula, and the
second scored each pairing by "how much of the torso plate lands inside the
fullset".  That score is meaningless here: the chest plate is a small piece and
the fullset is a whole figure, so a small plate scores ~1.00 against ANY frame
it fits inside.  Rendered side by side, the "matches" were unrelated poses.

The correspondence has to be measured against something both sheets are
registered to, and that is the BODY.  The chest sheet sits inside its own body
frame at 0.94, index for index.  The fullset is the same figure at the same
scale, just headless -- its bbox is 63px tall against the body's 84, and 84-63
is 21, exactly the east head height.  So matching the fullset's silhouette to
the head-stripped body's, frame against frame, gives the real answer:

    fullset 0..13  ->  body 0..13, one to one
    fullset 14..24 ->  body 0..13 WITH THREE FRAMES DROPPED (3, 10, 13)

which is the owner's "take out the 3 frames", found rather than assumed.  The
chest sheet is 14 unique frames doubled to 28, so chest frame j is the plate
for body frame j and the map above reaches all of it.  Mean silhouette
agreement 0.94 (worst 0.88) at a constant (0,+2) offset, against 0.93-0.97 for
the three directions that restored cleanly.

Even on the right map the additions include the chest sheet's sleeve edges,
where the two arms differ by a pixel or two, so east stays BAND-LIMITED to
EAST_BAND rows below the figure's own top edge -- the pauldron cap, which is
what was razored.  177px over 15 frames.

HONEST SCOPE: 38 of those 177px are visible in play; the head overlay covers
the rest.  That is also why east never read as broken as north did.

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
# v2.3.1548: derived, not assumed -- see the module docstring.  fullset frame i
# takes its plate from chest frame EAST_MAP[i]; the second lap is the same cycle
# with frames 3, 10 and 13 dropped.
EAST_MAP = list(range(14)) + [0, 1, 2, 4, 5, 6, 7, 8, 9, 11, 12]
EAST_OFF = (0, 2)   # constant offset that maximises silhouette agreement
EAST_BAND = 8       # rows below the figure's top edge that count as the cap


def _shift(a, dx, dy):
    o = np.zeros_like(a)
    h, w = a.shape[:2]
    o[max(0, dy):min(h, h + dy), max(0, dx):min(w, w + dx)] = \
        a[max(0, -dy):min(h, h - dy), max(0, -dx):min(w, w - dx)]
    return o


def restore_east(apply_it):
    c = np.array(Image.open(CHEST.format(dir='east')).convert('RGBA'))
    f = np.array(Image.open(FULL.format(dir='east')).convert('RGBA'))
    dx, dy = EAST_OFF
    add_total = frames = 0
    ins = []
    for i, j in enumerate(EAST_MAP):
        sl = slice(i * FW, (i + 1) * FW)
        fm = f[:, sl, 3] > ALPHA_T
        ys = np.nonzero(fm.any(axis=1))[0]
        if not len(ys):
            continue
        cf = _shift(c[:, j * FW:(j + 1) * FW], dx, dy)
        cm = cf[:, :, 3] > ALPHA_T
        ins.append((cm & fm).sum() / max(1, cm.sum()))
        add = cm & ~fm
        add[ys[0] + EAST_BAND:] = False          # the pauldron cap only
        if add.any():
            frames += 1
        add_total += int(add.sum())
        if apply_it:
            f[:, sl][add] = cf[add]
    if apply_it:
        Image.fromarray(f).save(FULL.format(dir='east'))
    print(f'  {"east":<11} silhouette agreement {np.mean(ins):.2f} (worst {min(ins):.2f}) '
          f'at offset {EAST_OFF}, +{add_total} px over {frames}/{len(EAST_MAP)} frame(s) '
          f'in the top {EAST_BAND} rows {"applied" if apply_it else "(dry run)"}')


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
