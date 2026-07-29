#!/usr/bin/env python3
"""v2.3.1543: cut the jog head overlay as a CLOSED OVAL of the head itself.

Owner: "the southwest head is wrong.  It needs to be a complete connected oval
by following the top outline of the head all the way around until it makes
that round shape."

WHY THE PREVIOUS CUT WAS WRONG
------------------------------
v2.3.1541 cut the overlay at the ARMOUR's top edge, per column.  That fixed
the head being re-cut into a slab -- the pixels came from the naked body and
were never trimmed -- but it handed the overlay the ARMOUR's outline as its
bottom edge.  A pauldron rises, a collar steps, a gap opens between the two:
so the head's lower boundary jumped around frame to frame and read as a torn
edge rather than a head.  The head is a head.  Its boundary should come from
the head, not from whatever happens to be behind it.

THE SHAPE
---------
Follow the head's own top outline, then continue it around until it closes.

For each head column x the body's silhouette gives top(x) -- the real crown
arc, the outline the owner is pointing at.  The bottom of the oval is that
same arc MIRRORED about the head's horizontal midline:

    bottom(x) = 2*yc - top(x),      yc = crown + H/2

At the centre column that spans the full head height H.  At the outermost
columns, where the arc has already fallen to the widest point, it closes to
nothing -- which is exactly what "all the way around" means.  The result is
one connected oval per frame, and because H is a constant per direction it is
the SAME round shape on every frame of the cycle (owner, v2.3.1540: "the head
needs to be a round shape in all of the frames").

H is measured, not guessed: scanning down from the crown, the run containing
the head centre widens to the full head width, holds for ~10 rows, narrows at
the jaw, then FLARES when the shoulders and arms join.  Southwest measures
24-25 wide and ~23 tall on all 20 frames -- a head, and a stable one.

The oval is a MASK over the naked body, never a fill: a pixel only survives if
the body has one there, so nothing is invented and the composite is still the
body's own head.  Head columns remain the widest contiguous run of the crown
projection (make_jog_head_sheets.py's rule), so a raised fist at neck height
cannot be mistaken for a skull -- the failure southwest f16 produced twice.

EAST IS RE-TIMED, SO IT IS RESHAPED IN PLACE
--------------------------------------------
South, southwest and north run 1:1 against the body sheet.  East does not:
the armour plays its native 25 frames by cycle phase while the body sheet has
28, so rebuild_east_head_track.py re-timed the head sheet to the armour's
cadence and shifted each frame vertically to ride the armour's bob -- and
emitted FULLSET_CROWN / FULLSET_HEAD_RES from the result.

Re-running that rebuild would re-derive the placement from the new sheet's own
head-bottom, which the oval changes, so the head could drift off an
owner-approved seat.  Instead east is reshaped WHERE IT ALREADY SITS: frame i
maps back to body frame j by the same rule the rebuild used, and the shift is
recovered by matching crowns (the head sheet's pixels ARE the body's, moved),
so only the outline changes.  The oval preserves the top outline, so the crown
is untouched and both renderer tables stay valid.

Run from the repo root, BEFORE seal_jog_neck.py:
    python3 tools/head_oval.py --dirs southwest
    python3 tools/head_oval.py --dirs southwest --apply
    python3 tools/head_oval.py --dirs east --apply     # re-timed path, automatic
"""
import argparse
import numpy as np
from PIL import Image

FW = 128
HEAD = 'public/sprites/player/jog-{dir}-head.png'
BODY = 'public/sprites/player/jog-{dir}.png'
ALPHA_T = 16
CROWN_FRAC = 0.18    # top slice of the figure used to find the head's columns
FLARE = 1.15         # run width / head width that means shoulders, not head
MIN_H = 9            # rows below the crown before a flare can be believed


def head_columns(b):
    """Widest contiguous run of columns in the figure's crown slice."""
    ys = np.nonzero(b.any(axis=1))[0]
    if not len(ys):
        return None
    top, bot = ys[0], ys[-1]
    crown = b[top:top + max(1, int(CROWN_FRAC * max(1, bot - top)))]
    cols = crown.any(axis=0)
    runs, x = [], 0
    while x < len(cols):
        if cols[x]:
            x2 = x
            while x2 + 1 < len(cols) and cols[x2 + 1]:
                x2 += 1
            runs.append((x2 - x + 1, x, x2))
            x = x2 + 1
        else:
            x += 1
    if not runs:
        return None
    _, x0, x1 = max(runs)
    return top, x0, x1


def head_height(b, top, x0, x1):
    """Rows from the crown to the jaw, i.e. before the shoulders flare out."""
    w = x1 - x0 + 1
    cx = (x0 + x1) // 2
    for y in range(top, min(FW, top + 40)):
        row = b[y]
        if not row[cx]:
            continue
        l = cx
        while l > 0 and row[l - 1]:
            l -= 1
        r = cx
        while r + 1 < FW and row[r + 1]:
            r += 1
        if y - top >= MIN_H and (r - l + 1) > w * FLARE:
            return y - top
    return None


def oval(b, top, x0, x1, h):
    """The closed oval: the crown arc, mirrored about the head's midline."""
    yc = top + h / 2.0
    m = np.zeros_like(b)
    for x in range(x0, x1 + 1):
        col = np.nonzero(b[:, x])[0]
        if not len(col):
            continue
        t = col.min()
        if t > top + h:                 # column starts below the head entirely
            continue
        bot = int(round(2 * yc - t))
        m[t:max(t + 1, min(FW, bot + 1)), x] = True
    return m


def crown(m):
    """Topmost opaque pixel as (x, y); x averaged over the top 3 rows, the way
    rebuild_east_head_track.py measures it (a single top pixel is tuft noise)."""
    ys, xs = np.nonzero(m)
    if not len(ys):
        return None
    ty = ys.min()
    return float(xs[ys <= ty + 2].mean()), float(ty)


def shift(a, dx, dy):
    out = np.zeros_like(a)
    h, w = a.shape[:2]
    ys = slice(max(0, dy), min(h, h + dy))
    xs = slice(max(0, dx), min(w, w + dx))
    sy = slice(max(0, -dy), min(h, h - dy))
    sx = slice(max(0, -dx), min(w, w - dx))
    out[ys, xs] = a[sy, sx]
    return out


def build_dir(d, apply_it, force_h):
    head = np.array(Image.open(HEAD.format(dir=d)).convert('RGBA'))
    body = np.array(Image.open(BODY.format(dir=d)).convert('RGBA'))
    hn, bn = head.shape[1] // FW, body.shape[1] // FW
    # re-timed sheet (east): map each head frame back to its body frame and
    # recover the baked shift by matching crowns, so the seat is preserved
    retimed = hn != bn
    jmap = [min(bn - 1, int(((i + 0.5) / hn) * bn)) for i in range(hn)] if retimed \
        else list(range(hn))
    n = hn
    # one H for the whole direction, so the oval is the same shape every frame
    hs = []
    for j in range(bn):
        b = body[:, j * FW:(j + 1) * FW, 3] > ALPHA_T
        hc = head_columns(b)
        if hc is None:
            continue
        h = head_height(b, *hc)
        if h:
            hs.append(h)
    H = force_h or int(round(float(np.median(hs)))) if hs else force_h
    added = removed = changed = shifted = 0
    for i in range(n):
        sl = slice(i * FW, (i + 1) * FW)
        bf = body[:, jmap[i] * FW:(jmap[i] + 1) * FW]
        old = head[:, sl, 3] > ALPHA_T
        if retimed:
            cb, ch = crown(bf[:, :, 3] > ALPHA_T), crown(old)
            if cb and ch:
                dx, dy = int(round(ch[0] - cb[0])), int(round(ch[1] - cb[1]))
                if dx or dy:
                    bf = shift(bf, dx, dy)
                    shifted += 1
        b = bf[:, :, 3] > ALPHA_T
        hc = head_columns(b)
        if hc is None:
            continue
        m = oval(b, *hc, H) & b
        if not np.array_equal(m, old):
            changed += 1
        added += int((m & ~old).sum())
        removed += int((old & ~m).sum())
        if apply_it:
            out = np.zeros_like(bf)
            out[m] = bf[m]
            head[:, sl] = out
    if apply_it:
        Image.fromarray(head).save(HEAD.format(dir=d))
    print(f'  {d:<11} H={H} (per-frame {min(hs)}-{max(hs)}), {changed}/{n} frame(s) '
          f'changed, +{added} / -{removed} px'
          + (f', {shifted} re-timed frame(s) crown-aligned' if retimed else '')
          + f' {"applied" if apply_it else "(dry run)"}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dirs', default='southwest')
    # EAST NEEDS --height 21.  The flare scan is reliable on the three views
    # where the head sits above open shoulder (south 26-28, southwest 22-31,
    # north 25-27 -- one tight cluster each), but east is a PROFILE: the arm
    # swings through the head's own column, so the run containing the head
    # centre merges with it on some frames and breaks on others.  The scan
    # comes back bimodal (20 on ten frames, 29-38 on eight, nothing on six)
    # and its median, 29, is not a head height at all.  Reading the row-width
    # profile by hand gives the real answer: the east head is 21-22 wide and
    # narrows into the neck at row ~20-21, and that it is SMALLER than the
    # other views is already known -- v2.3.1454 measured the jog-east head at
    # 44px against stand-east's 47px, which is why BODY_DIR_SCALE.jog.east
    # scales that facing up by 1.25.
    ap.add_argument('--height', type=int, default=0, help='override the measured H')
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()
    for d in args.dirs.split(','):
        build_dir(d, args.apply, args.height)


if __name__ == '__main__':
    main()
