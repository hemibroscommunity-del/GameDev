#!/usr/bin/env python3
"""v2.3.1377 (owner: SW f1/f4/f7-10/f12/f13/f18/f19 "too much neck shoulder
showing except 4 which just has a decapitated floating head"): the fixed
0.27-of-figure helmet cut (v2.3.1370) tracks the BODY's bob, but the knight
figure's collar — drawn by the artist and registered by silhouette — does
not bob identically.  Where the cut landed below the collar the erase
clipped the collar and the head overlay showed neck/shoulder skin over the
armor; where it landed above, the overlay stopped short of the collar and
the head floated.

The cut is now PER-FRAME, anchored to the KNIGHT's own shoulder line:
the topmost armor row measured just OUTSIDE the helmet's columns (the
pauldron/collar shelf, unobstructed by the helmet), plus a small overlap
so the neck always tucks into the collar.  Both the fullset-sheet helmet
erase and the head-overlay sheet derive from the SAME per-frame row, so
they can never disagree.

Rebuilds from the PRISTINE (pre-erase) fullset sheet — restore it from
git first:  git show f162e5e:public/sprites/gear/fullset/steel/jog-<dir>.png

Usage: python3 tools/rebuild_fullset_neck.py <dir> [overlap_px]
Do NOT pipe through `head` — SIGPIPE can kill the run before the save.
"""
import sys
import numpy as np
from scipy import ndimage
from PIL import Image

OVERLAP = 2   # px of skin allowed to tuck over the collar top
# v2.3.1377c: hand-tuned per-frame cut nudges (negative = cut higher =
# less neck skin, more helmet risk).  Applied after the min() rule.
# southwest f8/f18: the collar sits genuinely low there (leaning pose),
# so the body-line cut left a long bare throat (owner's frame list).
OFFSETS = {'southwest': {1: 4, 8: -3, 18: -3}}
# per-frame right-slack clip for the head band (default +7): f1's lowered
# cut otherwise scoops the raised arm's skin into the overlay.
RSLACK = {'southwest': {1: 1}}
# frames whose cut sits BELOW the armor shoulder line: between the two,
# erase only the FACE-width columns so the pauldrons keep their tops
# (owner: f1 "chunk still missing from that shoulder").  Value =
# (left inset, right inset) applied to the head cols for the mid band.
MIDBAND = {'southwest': {1: (0, 3)}}
# v2.3.1378: frames where a smidge of helmet edge survived BEYOND the
# column slack (owner: SW f0/f1/f2/f13/f14).  For these, a wider band
# is shaved down to the armor SHELF: everything above the first row
# whose armor run spans most of the band is erased.
SHELF_ERASE = {'southwest': [0, 1, 2, 13, 14]}
# v2.3.1379b (owner: "take off more on 1"): frames whose head overlay
# carries a thick dark hair/shadow arc along the skull edge that reads
# as helmet next to the armor.  Mid-dark pixels within 3px of the
# silhouette edge are erased (the 1px black outline survives).
EDGE_STRIP = {}
# v2.3.1385 (owner: north/south "top of the armor is clipped a little
# around the head"): the erase used the same row as the head cut, so the
# 2px tuck overlap shaved the collar top.  The ERASE now stops RELIEF px
# higher; the head overlay still reaches the cut and covers the strip in
# between, so the neck keeps tucking with the collar top intact.
# v2.3.1457 (owner: SW "armor shoulder during full arm backswing is
# getting clipped at the top"): southwest finally gets the same relief —
# it was cut before v2.3.1385 existed and never re-ran.
RELIEF = {'south': 2, 'north': 2, 'southwest': 2}
# v2.3.1386 (owner: "top of the armor was razored off in a straight line
# ... round the pauldrons out"): after the erase, the armor top is a flat
# ruler line.  For these dirs the flat top's ends are tapered into a dome
# (progressively deeper erase over the outermost columns) and any stray
# nubs above the line are removed.
# v2.3.1457: southwest joins, but through the BAND-LIMITED variant below
# (BAND_ROUND) — the 3/4 view's trailing pauldron legitimately rises
# above the flat line on the backswing, so the north/south "clear
# everything above the line" rule would re-clip the exact dome the owner
# is missing.  BAND_ROUND scans and tapers only inside the head band and
# only at genuinely free run ends.
ROUND_TOP = {'south', 'north'}
BAND_ROUND = {'southwest'}
ROUND_DROPS = [4, 3, 2, 1, 1]   # extra rows erased at run-end columns


def head_cols(op, top, figh):
    crown = op[top:top + max(1, int(0.18 * figh))]
    cm = crown.any(axis=0)
    runs = []
    x = 0
    while x < len(cm):
        if cm[x]:
            x2 = x
            while x2 + 1 < len(cm) and cm[x2 + 1]:
                x2 += 1
            runs.append((x2 - x + 1, x, x2))
            x = x2 + 1
        else:
            x += 1
    _, hx0, hx1 = max(runs)
    return hx0, hx1


def main():
    d = sys.argv[1]
    overlap = int(sys.argv[2]) if len(sys.argv) > 2 else OVERLAP
    # v2.3.1457: pristine guard (the rebuild_east_head_track.py pattern) —
    # this tool is destructive; running it on an ALREADY-CUT sheet erases
    # a second band and eats more armor.  A cut sheet has a long flat top
    # run inside the head band on most frames; the pristine helmeted
    # sheet never does.
    _pp = f'public/sprites/gear/fullset/steel/jog-{d}.png'
    _pa = np.array(Image.open(_pp).convert('RGBA'))
    _pw = _pa.shape[0]
    _flatish = 0
    for _i in range(_pa.shape[1] // _pw):
        _fr = _pa[:, _i * _pw:(_i + 1) * _pw, 3] > 40
        _ys = np.where(_fr.any(axis=1))[0]
        if not len(_ys):
            continue
        if _fr[_ys[0]].sum() >= 18:
            _flatish += 1
    if _flatish > 3:
        raise SystemExit(
            f'{_pp} looks ALREADY CUT ({_flatish} flat-top frames) — restore '
            f'the pristine sheet first:  git show f162e5e:{_pp} > {_pp}')
    b = Image.open(f'public/sprites/player/jog-{d}.png').convert('RGBA')
    fw = b.height
    n = b.width // fw
    ba = np.array(b)
    p = f'public/sprites/gear/fullset/steel/jog-{d}.png'
    fs = np.array(Image.open(p).convert('RGBA'))
    ffw = fs.shape[0]
    fn = fs.shape[1] // ffw
    heads = np.zeros_like(ba)
    cuts = []
    for i in range(n):
        bf = ba[:, i * fw:(i + 1) * fw]
        op = bf[:, :, 3] > 40
        ys = np.where(op.any(axis=1))[0]
        if not len(ys):
            cuts.append(None)
            continue
        top, bot = ys[0], ys[-1]
        hx0, hx1 = head_cols(op, top, max(1, bot - top))
        # knight shoulder line: topmost armor just outside the helmet cols
        fi = min(fn - 1, round(i * fn / n))
        ff = fs[:, fi * ffw:(fi + 1) * ffw]
        fop = ff[:, :, 3] > 40
        tops = []
        for x in list(range(max(0, hx0 - 9), max(0, hx0 - 1))) \
                + list(range(min(ffw, hx1 + 2), min(ffw, hx1 + 10))):
            col = np.where(fop[:, x])[0]
            if len(col):
                tops.append(col.min())
        if not tops:
            cuts.append(None)
            continue
        neck27 = top + int(round(0.27 * max(1, bot - top)))
        # v2.3.1377b: take the HIGHER of the two anchors.  The shoulder
        # measure alone went wild on frames where the swing vacates the
        # sample columns (median landed on the chest -> giant skin patch);
        # the body fraction alone ignored the knight's actual collar
        # (owner's frame list).  min() = never cut below the body line,
        # cut higher wherever the armor really sits higher.
        cut = min(int(np.median(tops)) + overlap, neck27)
        cut += OFFSETS.get(d, {}).get(i, 0)
        cuts.append((cut, hx0, hx1))
        # head overlay: body band above the cut, head cols only, largest blob
        band = op.copy()
        band[cut:] = False
        band[:, :max(0, hx0 - 6)] = False
        band[:, min(fw, hx1 + 1 + RSLACK.get(d, {}).get(i, 6)):] = False
        lbl, num = ndimage.label(band)
        if num:
            sizes = ndimage.sum(band, lbl, range(1, num + 1))
            headm = lbl == (int(np.argmax(sizes)) + 1)
            hf = heads[:, i * fw:(i + 1) * fw]
            hf[headm] = bf[headm]
    # helmet erase from the SAME cuts
    tot = 0
    for fi in range(fn):
        bi = min(n - 1, round(fi * n / fn))
        if cuts[bi] is None:
            continue
        cut, hx0, hx1 = cuts[bi]
        ff = fs[:, fi * ffw:(fi + 1) * ffw]
        zone = np.zeros(ff.shape[:2], bool)
        mb = MIDBAND.get(d, {}).get(bi)
        if mb is not None:
            fop0 = ff[:, :, 3] > 40
            tops0 = []
            for x in list(range(max(0, hx0 - 9), max(0, hx0 - 1))) \
                    + list(range(min(ffw, hx1 + 2), min(ffw, hx1 + 10))):
                col0 = np.where(fop0[:, x])[0]
                if len(col0):
                    tops0.append(col0.min())
            shelf0 = int(np.median(tops0)) if tops0 else cut
            _mbShelf = min(shelf0, cut)
            zone[:min(shelf0, cut), max(0, hx0 - 4):min(ffw, hx1 + 5)] = True
            zone[min(shelf0, cut):cut, max(0, hx0 + mb[0]):min(ffw, hx1 - mb[1] + 1)] = True
        else:
            _mbShelf = None
            zone[:cut - RELIEF.get(d, 0), max(0, hx0 - 4):min(ffw, hx1 + 5)] = True
        zone &= ff[:, :, 3] > 0
        ff[:, :, 3][zone] = 0
        tot += int(zone.sum())
        if bi in SHELF_ERASE.get(d, []):
            bx0, bx1 = max(0, hx0 - 8), min(ffw, hx1 + 11)
            bw2 = bx1 - bx0
            fop2 = ff[:, :, 3] > 40
            shelf = _mbShelf   # two-band frames: the real shoulder line —
                               # scanning after the center erase would land
                               # at the cut and re-eat the pauldron tops
            if shelf is None:
                for y in range(ffw):
                    if fop2[y, bx0:bx1].sum() >= 0.55 * bw2:
                        shelf = y
                        break
            if shelf is not None:
                # v2.3.1457 (owner: SW backswing "shoulder ... clipped at
                # the top"): the blind [:shelf] band erase also ate the
                # trailing PAULDRON dome wherever it rises through the
                # shelf row — and the band reaches 11px past the head
                # overlay's cover, so the destroyed strip showed as a
                # flat-cut shoulder with nothing drawn over it.  The
                # erase is now CONNECTIVITY-GATED: label the opaque
                # pixels above-and-including the shelf row; components
                # anchored on the shelf row are the armor itself (the
                # dome rising through the line) and survive, floating
                # components are helmet crumbs and die.  This keeps the
                # v2.3.1378 owner fix (crumbs gone) without flattening
                # the shoulder.
                sub = ff[:shelf + 1, bx0:bx1, 3] > 0
                lbl2, num2 = ndimage.label(sub)
                if num2:
                    anchored = set(lbl2[shelf][lbl2[shelf] > 0].tolist())
                    kill = np.zeros_like(sub)
                    for l2 in range(1, num2 + 1):
                        if l2 not in anchored:
                            kill |= (lbl2 == l2)
                    kill[shelf] = False
                    ff[:shelf + 1, bx0:bx1, 3][kill] = 0
                    tot += int(kill.sum())
    if d in BAND_ROUND:
        # v2.3.1457: band-limited round-top for the 3/4 views.  Unlike
        # ROUND_TOP below, this (a) scans for the razor line only INSIDE
        # the head band, (b) never clears above it (the backswing
        # pauldron dome legitimately lives there), and (c) tapers a run
        # end only when the column just beyond it is transparent at the
        # razor row — a genuinely free end, not a dome or arm the run
        # continues into.
        for fi in range(fn):
            bi = min(n - 1, round(fi * n / fn))
            if cuts[bi] is None:
                continue
            _, hx0, hx1 = cuts[bi]
            bx0, bx1 = max(0, hx0 - 4), min(ffw, hx1 + 5)
            ff = fs[:, fi * ffw:(fi + 1) * ffw]
            op2 = ff[:, :, 3] > 40
            flat = None
            for y in range(ffw):
                row = op2[y, bx0:bx1]
                best = 0
                run = 0
                for v in row:
                    run = run + 1 if v else 0
                    best = max(best, run)
                if best >= 16:
                    flat = y
                    break
            if flat is None:
                continue
            rowa = ff[:, :, 3][flat] > 40
            xs = np.where(rowa[bx0:bx1])[0]
            if not len(xs):
                continue
            x0, x1 = bx0 + int(xs.min()), bx0 + int(xs.max())
            for k, drop in enumerate(ROUND_DROPS):
                for side, x in ((0, x0 + k), (1, x1 - k)):
                    if not (0 <= x < ffw):
                        continue
                    ox = x0 - 1 if side == 0 else x1 + 1
                    if 0 <= ox < ffw and rowa[ox]:
                        continue   # run continues past the band: not a free end
                    ff[:, :, 3][flat:flat + drop, x] = 0
    if d in ROUND_TOP:
        for fi in range(fn):
            ff = fs[:, fi * ffw:(fi + 1) * ffw]
            op2 = ff[:, :, 3] > 40
            flat = None
            for y in range(ffw):
                row = op2[y]
                # longest run on this row
                best = 0
                run = 0
                for v in row:
                    run = run + 1 if v else 0
                    best = max(best, run)
                if best >= 20:
                    flat = y
                    break
            if flat is None:
                continue
            # stray nubs above the line: clear everything above it
            ff[:, :, 3][:flat][op2[:flat]] = 0
            # find the flat run's extent on the line
            row = ff[:, :, 3][flat] > 40
            xs = np.where(row)[0]
            if not len(xs):
                continue
            x0, x1 = xs.min(), xs.max()
            for k, drop in enumerate(ROUND_DROPS):
                for x in (x0 + k, x1 - k):
                    if 0 <= x < ffw:
                        ff[:, :, 3][flat:flat + drop, x] = 0
    Image.fromarray(fs).save(p)
    hp = f'public/sprites/player/jog-{d}-head.png'
    # jaw side trim (bottom 2 rows to the central 60%) — the jaw is wider
    # than the neck and poked out beside the collar (v2.3.1374, north)
    trimmed = 0
    for i in range(n):
        hf = heads[:, i * fw:(i + 1) * fw]
        op2 = hf[:, :, 3] > 40
        if not op2.any():
            continue
        ys = np.where(op2.any(axis=1))[0]
        bot = ys.max()
        xs = np.where(op2.any(axis=0))[0]
        x0, x1 = xs.min(), xs.max()
        w = x1 - x0
        k0, k1 = x0 + int(0.20 * w), x1 - int(0.20 * w)
        for y in range(max(0, bot - 1), bot + 1):
            for x in range(fw):
                if hf[y, x, 3] > 40 and not (k0 <= x <= k1):
                    hf[y, x, 3] = 0
                    trimmed += 1
    # v2.3.1379 (owner: SW f0/f1 "smidge too much helmet left over"): the
    # body art draws parts of the head outline in NEUTRAL GRAY (~75,75,74)
    # — on the bare body it reads as shading, but over the knight it reads
    # as leftover helmet steel.  Recolor neutral grays in the OVERLAY to
    # the skin-outline brown; the body sheet itself is untouched.
    for i in EDGE_STRIP.get(d, []):
        hf = heads[:, i * fw:(i + 1) * fw]
        op3 = hf[:, :, 3] > 40
        if not op3.any():
            continue
        from scipy.ndimage import binary_erosion
        inner = binary_erosion(op3, iterations=3)
        edge3 = op3 & ~inner
        Rz = hf[:, :, 0].astype(int)
        Gz = hf[:, :, 1].astype(int)
        Bz = hf[:, :, 2].astype(int)
        lz = 0.3 * Rz + 0.45 * Gz + 0.25 * Bz
        # neutral grays only — warm skin-shadow browns share the
        # luminance band but have R far above B (v2.3.1379c: the first
        # lum-only filter ate the shaded side of the face)
        strip = edge3 & (lz > 40) & (lz < 135) & ((Rz - Bz) < 25)
        hf[:, :, 3][strip] = 0
    Rh = heads[:, :, 0].astype(int)
    Gh = heads[:, :, 1].astype(int)
    Bh = heads[:, :, 2].astype(int)
    lum = 0.3 * Rh + 0.45 * Gh + 0.25 * Bh
    grayish = (heads[:, :, 3] > 40) & (np.abs(Rh - Gh) < 16) \
        & (np.abs(Gh - Bh) < 16) & (lum > 50) & (lum < 120)
    heads[:, :, 0][grayish] = 65
    heads[:, :, 1][grayish] = 38
    heads[:, :, 2][grayish] = 18
    Image.fromarray(heads).save(hp)
    print(f'{d}: {int(grayish.sum())} gray outline px recolored to skin-outline brown')
    print(f'{d}: per-frame cuts {[c[0] if c else None for c in cuts]}')
    print(f'{d}: helmet erased ({tot} px) -> {p}; head sheet -> {hp} (jaw trim {trimmed} px)')


if __name__ == '__main__':
    main()
