#!/usr/bin/env python3
"""v2.3.1502: import a hat from a GREEN-SILHOUETTE sheet.

Supersedes the diff-based path in import_headwear.py, which is kept only for
reference.  That one had to *infer* which pixels were hat, by subtracting a
rebuilt mannequin and then rescuing the result with colour tests, connectivity
rules and size filters.  Every one of those is a guess, and they failed the way
guesses do: the whole batch shipped with the drawn head still inside each hat
frame, and the erase written to remove it tore holes in the hats instead.

Here the generator is asked to paint the person flat #00FF00 and leave the hat
alone.  That turns the hard question into a trivial one:

    hat  = every pixel that is neither the magenta backdrop nor the green person
    head = the green, which IS the body silhouette, at the size and position it
           was drawn at

No diff, no rebuilt mannequin to line up against, no colour heuristics, nothing
to tear.  A hat may be any colour it likes -- a skin tone, black, the same grey
as the body outline -- and it still comes out whole.

The green also makes registration better rather than merely possible.  The diff
path had to fit on the TORSO alone, because the head was the thing being
measured and could not be used to measure itself.  A flat silhouette has no such
conflict, so the fit runs against the whole body: far more constrained, and
immune to the "redrawn at 73% and re-laid-out" sheets that forced registration
into existence in the first place.

What makes a good sheet (measured, v2.3.1506)
--------------------------------------------
Every cell is fitted by matching its green silhouette against the real body, so
the fit score doubles as a fidelity check on how faithfully the generator
redrew that figure.  Across 15 sheets:

  * ONE AT A TIME BEATS BATCHING.  Ten sheets processed in one go all came back
    with east fits of 0.767-0.880.  Sent individually, three of four landed at
    0.947-0.967.  Not a guarantee -- Russian Hat still came back 0.809 -- but
    clearly worth the extra effort.
  * EAST IS ALWAYS THE WEAKEST CELL, on every sheet, however it was produced.
  * A SECOND EDITING PASS IS NOT MEASURABLY WORSE.  Safety Helmet was sent
    through twice (its outline was incomplete the first time) and came back at
    the same drift as single-pass Russian Hat -- east 12% off that sheet's own
    mean scale, 0.25 scale spread, against 0.02-0.16 for the well-behaved ones.
    Two samples is not proof either way; recorded so the next person does not
    assume re-editing is free OR that it is ruinous.

  Correction: v2.3.1506's commit message called Safety Helmet the batched
  control.  It was not -- it was a re-edit.  The case for one-at-a-time rests
  on the four singles against the earlier ten-sheet batch, not on it.

Run from the repo root:
    python3 tools/import_headwear_green.py --art sheet.png --id fez --name "Fez"
    [--clips-hair]  also emit hairmask/*.png
    [--debug DIR]   per-direction previews of what was keyed
"""
import argparse
import importlib.util
import json
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

TOOLS = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location(
    'make_headwear_mannequin', os.path.join(TOOLS, 'make_headwear_mannequin.py'))
_man = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_man)

BODY_TOPS = 'public/sprites/player/body-tops.json'
OUTDIR = 'public/sprites/traits/{cat}/{id}'
FRAME = 256
ALPHA_T = 16
TOP_MARGIN = 6       # where the hat's top sits inside its own frame
OVERSHOOT = 60       # 256-space rows sampled ABOVE the cell, for tall hats
KEY_TOL = 60         # how far a green region may sit from the key and still be head
TEXT_DROP = 0.30     # a real hat reaches at least this far down toward the crown


def keys(rgb):
    """(magenta backdrop, green-ish, everything else).

    Green is keyed on DOMINANCE -- how much greener than either other channel --
    rather than on absolute values, because a hat is allowed to be green too.
    The Kermit cap is mint: its shadow reads (98,184,100), only 84 greener,
    against the key's 230.  A loose "is it greenish" test ate 4857px of that hat.

    Both keys stay loose at the edges on purpose; dekey_fringe below cleans up
    the blend band they leave behind, which is a job that needs the hat mask and
    cannot be done here."""
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    mag = (r > 150) & (b > 150) & (g < 90) & (np.abs(r - b) < 60)
    grn = (g > 150) & ((g - np.maximum(r, b)) > 120)
    return mag, grn, ~(mag | grn)


def panel_of(mag):
    """The magenta panel's bbox — crops off the page margin the generator adds."""
    lab, k = ndi.label(mag)
    if not k:
        raise SystemExit('no magenta panel found — is this a mannequin sheet?')
    sizes = np.array(ndi.sum(mag, lab, range(1, k + 1)))
    sl = ndi.find_objects(lab)[int(np.argmax(sizes))]
    return sl[1].start, sl[0].start, sl[1].stop, sl[0].stop


def dekey_fringe(rgb, hat, mag, grn):
    """Drop the blend band where the hat meets a key colour.

    A regenerated sheet has soft edges, so along every boundary sits a band that
    is part key and part hat.  It matches neither key test, falls into the hat,
    and survives the downscale as a coloured rim.

    The threshold has to be PER HAT, which took two goes to get right.  A fixed
    "tinted toward the key" test is wrong because a hat may legitimately be that
    colour -- 1134 of the Kermit cap's pixels read as green-tinted.  A brightness
    test is wrong too, and that is the one that shipped: it assumed the blend is
    the key mixed with the near-black OUTLINE, so it only caught dark ones, and
    the Dirty Blonde's blends are the key mixed with pale hair -- bright, and
    left a scatter of green speckles along every hair edge.

    So the hat sets its own threshold.  Pixels far from the key show what this
    hat's colour actually does (blonde hair sits at -60 green dominance, mint at
    +58); anything hugging the key that exceeds that by a clear margin is a
    blend, whatever the hat is made of."""
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    out = hat.copy()
    st = ndi.generate_binary_structure(2, 2)
    for key, tint in ((grn, g - np.maximum(r, b)), (mag, np.minimum(r, b) - g)):
        if not key.any():
            continue
        # Reach is in ART pixels, and the art is ~3.5 art px per game pixel, so
        # a one-game-pixel blend band is ~3.5 wide.  Searching 3 covered less
        # than a game pixel of it and left the rest to survive the downscale.
        near = ndi.binary_dilation(key, st, iterations=9)
        far = hat & ~ndi.binary_dilation(key, st, iterations=16)
        if far.sum() < 200:
            continue
        thresh = max(np.median(tint[far]) + 30, 15)
        out &= ~(hat & near & (tint > thresh))
    return out


def split_green(rgb, grn):
    """The head mask, and the five cells' body slices.

    Green regions come in three kinds and all three have bitten:

      * the five bodies;
      * SPLITS of a body -- a hat that crosses the head cuts the scalp off as
        its own region (Blue Bandana, Naruto Headband), and gaps between spiky
        hair leave a scatter of small ones (Dirty Blonde, 1209px across 5 cells);
      * a green HAT's own shading, which keys as green but is not head (the
        Kermit cap threw off 121 regions).

    Sorting them by SIZE fails: a hair gap and a shading blob are both small.
    Sorting by COLOUR works, because the first two kinds are the literal key
    colour the generator painted, while a green hat is some other green.  Every
    region is therefore compared against the colour of the five bodies: within
    KEY_TOL it is head, beyond it is hat.  Kermit's mint sits ~150 away, hair
    gaps sit at ~0.

    Sizing was tried first and shipped the Dirty Blonde with green speckles
    along every hair edge -- the final key guard could not catch them because a
    5x5 block averaging gap-green with hair no longer matches the key."""
    lab, k = ndi.label(grn, np.ones((3, 3)))
    if k < 5:
        raise SystemExit(f'found {k} green regions, expected at least 5 — did the '
                         'generator paint the person flat #00FF00?')
    sizes = np.array(ndi.sum(grn, lab, range(1, k + 1)))
    objs = ndi.find_objects(lab)
    bodies = sorted(np.argsort(sizes)[::-1][:5], key=lambda i: objs[i][1].start)
    key_rgb = rgb[np.isin(lab, [i + 1 for i in bodies]) & grn].mean(axis=0)

    keep, rejected = [], 0
    for i in range(k):
        m = (lab == i + 1)
        # CLOSEST pixel to the key, not the average.  A gap between hair strands
        # is only a few pixels and its edges blend into the hair, so its MEAN
        # drifts far enough off-key to be mistaken for hat -- which is exactly
        # how the Dirty Blonde kept green in its east and northeast frames after
        # the mean-based test went in.  Any region that is really head contains
        # at least one untouched key pixel; a green hat's shading contains none.
        if np.abs(rgb[m] - key_rgb).max(axis=1).min() <= KEY_TOL:
            keep.append(i)
        else:
            rejected += int(sizes[i])
    heads = np.isin(lab, [i + 1 for i in keep]) & grn
    return heads, [((lab == i + 1), objs[i]) for i in bodies], len(keep) - 5, rejected


def hat_of(ink, sl):
    """The hat belonging to one figure: ink near this cell that reaches down
    toward the head.  That last test is what drops the sheet's own title and
    direction labels, which are ink too but float clear of every head."""
    y0, y1 = sl[0].start, sl[0].stop
    x0, x1 = sl[1].start, sl[1].stop
    gh = y1 - y0
    pad = int((x1 - x0) * 0.55)              # wide brims overhang the silhouette
    lo, hi = max(0, x0 - pad), min(ink.shape[1], x1 + pad)
    region = np.zeros_like(ink)
    region[:y1, lo:hi] = ink[:y1, lo:hi]
    lab, k = ndi.label(region, np.ones((3, 3)))
    out = np.zeros_like(ink)
    for i, o in enumerate(ndi.find_objects(lab)):
        if o is not None and o[0].stop >= y0 - TEXT_DROP * gh:
            out |= (lab == i + 1)
    return out


def register(fig, mcell):
    """Uniform scale + offset laying the green silhouette onto the mannequin's
    body, scored on the SHOULDERS ONLY.

    The obvious thing -- fit the whole silhouette -- does not work, and the
    reason is worth writing down: the hat COVERS part of the head, so the green
    is the body minus whatever the hat hides.  Matching that against a complete
    body is matching against a shape the sheet cannot contain, and it showed:
    whole-figure fits landed at 0.87-0.89 IoU and drifted 18% in scale trying to
    make up the missing crown.

    The bottom 45% of the figure is below the jaw in every direction, so no hat
    -- however tall or wide-brimmed -- has any pixels there.  Both figures are
    bust crops cut at the same line, so bottom-anchoring is exact rather than a
    convenience."""
    mys = np.nonzero(mcell.any(axis=1))[0]
    my0, my1 = mys.min(), mys.max() + 1
    band = mcell[int(my1 - 0.45 * (my1 - my0)):my1]
    bh, Mw = band.shape
    mcx = np.nonzero(band.any(axis=0))[0].mean()

    ah, aw = fig.shape
    src = Image.fromarray((fig * 255).astype(np.uint8))
    best = None
    for s in np.arange(0.9, 2.6, 0.01):
        th, tw = int(round(ah * s)), int(round(aw * s))
        if th < bh + 12 or tw < 8 or th > 4000 or tw > 4000:
            continue
        am = np.array(src.resize((tw, th), Image.BOX)) > 110
        for dy in range(-8, 9, 2):
            top = am.shape[0] - bh + dy
            if top < 0 or top + bh > am.shape[0]:
                continue
            ba = am[top:top + bh]
            xs = np.nonzero(ba.any(axis=0))[0]
            if not len(xs):
                continue
            d0 = int(round(mcx - xs.mean()))
            for dx in range(d0 - 10, d0 + 11):
                sh = np.zeros_like(band)
                lo, hi = max(0, dx), min(Mw, ba.shape[1] + dx)
                if hi <= lo:
                    continue
                sh[:, lo:hi] = ba[:, lo - dx:hi - dx]
                iou = int((sh & band).sum()) / max(1, int((sh | band).sum()))
                if best is None or iou > best[0]:
                    best = (iou, float(s), int(dx), int(my1 - th + dy))
    if best is None or best[0] < 0.70:
        raise SystemExit(f'could not register a cell at all (best shoulder IoU '
                         f'{0 if best is None else best[0]:.3f}) — is the green flat?')
    iou, s, dx, oy = best
    return iou, s, dx, oy


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--art', required=True)
    ap.add_argument('--id', required=True)
    ap.add_argument('--name', required=True)
    ap.add_argument('--clips-hair', action='store_true')
    # v2.3.1504: some of these sheets are hairstyles, not hats.  They are drawn
    # on the same mannequin and share _placeTrait, so the only differences are
    # which folder they land in and the category recorded in meta -- and hair is
    # the thing that gets CLIPPED by a hat, so it never sets clipsHair.
    ap.add_argument('--category', default='headwear', choices=['headwear', 'hair'])
    ap.add_argument('--debug', default=None)
    args = ap.parse_args()

    rgb = np.array(Image.open(args.art).convert('RGB')).astype(int)
    mag, grn, ink = keys(rgb)
    px0, py0, px1, py1 = panel_of(mag)
    rgb, grn = (a[py0:py1, px0:px1] for a in (rgb, grn))
    heads, figs, extra, reclaimed = split_green(rgb, grn)
    if extra:
        print(f'note: the silhouette is split into {extra} extra region(s) — kept as '
              f'head (a scalp above a band, or gaps between hair spikes)')
    pmag = mag[py0:py1, px0:px1]
    ink = dekey_fringe(rgb, ~(pmag | heads), pmag, heads)
    if reclaimed:
        print(f'note: {reclaimed}px of green did not match the key colour — '
              f'returned to the hat (the hat itself is green)')

    tmp = os.path.join(TOOLS, '.mannequin-rebuild.png')
    os.system(f'python3 {TOOLS}/make_headwear_mannequin.py --out {tmp} >/dev/null')
    man = np.array(Image.open(tmp).convert('RGB')).astype(int)
    os.remove(tmp)
    mmag, _mg, mink = keys(man)

    cells = _man.layout(1)
    tops = json.load(open(BODY_TOPS))
    outdir = OUTDIR.format(cat=args.category, id=args.id)
    os.makedirs(outdir, exist_ok=True)
    if args.clips_hair:
        os.makedirs(os.path.join(outdir, 'hairmask'), exist_ok=True)
    if args.debug:
        os.makedirs(args.debug, exist_ok=True)

    bboxes, anchors, nudges, scales = {}, {}, {}, {}
    for c, (fg, sl) in zip(cells, figs):
        d = c['dir']
        cx, cy = c['paste']
        cw, ch = c['size']
        up = c['upscale']
        bx0, by0 = c['box'][0], c['box'][1]
        fy0, fy1, fx0, fx1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop

        iou, scale, ox, oy = register(fg[fy0:fy1, fx0:fx1], mink[cy:cy + ch, cx:cx + cw])
        hat = hat_of(ink, sl)
        ys, xs = np.nonzero(hat)
        if not len(ys):
            raise SystemExit(f'{d}: no hat found beside the silhouette')
        hy0, hy1, hx0, hx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1

        # map the hat into the mannequin cell, then down to 256-space
        sub = Image.fromarray((hat[hy0:hy1, hx0:hx1] * 255).astype(np.uint8))
        col = Image.fromarray(rgb[hy0:hy1, hx0:hx1].astype(np.uint8))
        tw, th = max(1, int(round((hx1 - hx0) * scale))), max(1, int(round((hy1 - hy0) * scale)))
        m2 = np.array(sub.resize((tw, th), Image.BOX)) > 110
        c2 = np.array(col.resize((tw, th), Image.BOX)).astype(int)

        over = OVERSHOOT * up
        H, W = over + ch, cw
        canvas = np.zeros((H, W, 3), int)
        cmask = np.zeros((H, W), bool)
        ty = over + oy + int(round((hy0 - fy0) * scale))
        tx = ox + int(round((hx0 - fx0) * scale))
        sy0, sx0 = max(0, -ty), max(0, -tx)
        sy1, sx1 = min(th, H - ty), min(tw, W - tx)
        if sy1 <= sy0 or sx1 <= sx0:
            raise SystemExit(f'{d}: the hat landed outside the cell')
        canvas[ty + sy0:ty + sy1, tx + sx0:tx + sx1] = c2[sy0:sy1, sx0:sx1]
        cmask[ty + sy0:ty + sy1, tx + sx0:tx + sx1] = m2[sy0:sy1, sx0:sx1]

        rows, cols = H // up, W // up
        art256 = np.zeros((rows, cols, 4), np.uint8)
        for v in range(rows):
            for u in range(cols):
                blk = cmask[v * up:(v + 1) * up, u * up:(u + 1) * up]
                if int(blk.sum()) * 2 <= up * up:
                    continue
                px = canvas[v * up:(v + 1) * up, u * up:(u + 1) * up][blk].mean(axis=0)
                art256[v, u] = (*np.round(px).astype(int), 255)

        # v2.3.1506: speckle guard on the FINISHED frame.  dekey_fringe works in
        # ART space, but a 5x5 block can average several mildly-green art pixels
        # into one clearly-green game pixel that no single art pixel would have
        # tripped -- which is how the Dirty Blonde kept its green edge speckles
        # through two earlier fixes.  Threshold is the hat's own 99th percentile
        # so a green hat keeps its colour, and only SMALL clusters are dropped so
        # a deliberate green accent (a gem, a band) survives.
        _m0 = art256[:, :, 3] > ALPHA_T
        if _m0.sum() > 40:
            _rr, _gg, _bb = (art256[:, :, i].astype(int) for i in range(3))
            _dom = _gg - np.maximum(_rr, _bb)
            # MEDIAN, not a high percentile: speckles sit inside the top 1% and
            # would set their own threshold, which is why a p99 cut removed none
            # of them.  The median is the hat's bulk colour and cannot be moved
            # by a scatter of edge pixels.
            _t = max(np.median(_dom[_m0]) + 30, 15)
            _cand = _m0 & (_dom > _t)
            if _cand.any():
                _lb, _nk = ndi.label(_cand, np.ones((3, 3)))
                _sz = np.array(ndi.sum(_cand, _lb, range(1, _nk + 1)))
                art256[np.concatenate([[False], _sz < 6])[_lb]] = 0

        # v2.3.1505: last-ditch guard.  Nothing that survives to a finished frame
        # should still BE the key colour -- no real hat is #00FF00 or the
        # backdrop magenta.  A handful slip through per sheet (3 on the blonde
        # hair) where a block's majority vote lands on blend pixels; drop them
        # here rather than hope the earlier stages caught everything.
        _r, _g, _b = art256[:, :, 0].astype(int), art256[:, :, 1].astype(int), art256[:, :, 2].astype(int)
        _key = ((_g > 150) & ((_g - np.maximum(_r, _b)) > 120)) | \
               ((_r > 150) & (_b > 150) & (_g < 90) & (np.abs(_r - _b) < 60))
        art256[_key] = 0

        m = art256[:, :, 3] > ALPHA_T
        ys2, xs2 = np.nonzero(m)
        ay0, ay1, ax0, ax1 = ys2.min(), ys2.max() + 1, xs2.min(), xs2.max() + 1
        if ay1 - ay0 > FRAME or ax1 - ax0 > FRAME:
            raise SystemExit(f'{d}: hat is {ax1 - ax0}x{ay1 - ay0} in 256-space — too big')
        off_y = TOP_MARGIN - ay0
        off_x = FRAME // 2 - (ax0 + ax1) // 2
        out = np.zeros((FRAME, FRAME, 4), np.uint8)
        for v in range(rows):
            t2 = v + off_y
            if not (0 <= t2 < FRAME):
                continue
            for u in range(cols):
                x2 = u + off_x
                if 0 <= x2 < FRAME and art256[v, u, 3] > ALPHA_T:
                    out[t2, x2] = art256[v, u]
        Image.fromarray(out).save(f'{outdir}/{d}.png')

        crown = tops[f'stand-{d}-0']
        crown_in_frame = [int(crown[0] - bx0 + off_x),
                          int(crown[1] - by0 + OVERSHOOT + off_y)]
        bb = [int(ax0 + off_x), int(ay0 + off_y), int(ax1 - ax0), int(ay1 - ay0)]
        anchor = [int(bb[0] + round(bb[2] / 2)), int(bb[1])]
        bboxes[d] = bb
        anchors[d] = anchor
        nudges[d] = [int(anchor[0] - crown_in_frame[0]), int(anchor[1] - crown_in_frame[1])]
        scales[d] = 1
        # A low fit is a SHEET problem, not a tool problem: the generator
        # redrew that figure's torso off-model, so nothing lines up against the
        # real body.  Reported per cell so the owner can see which directions
        # are trustworthy and regenerate only those.
        grade = 'good' if iou >= 0.95 else 'soft' if iou >= 0.90 else 'POOR — regenerate this direction'
        print(f'{d:<10} fit {iou:.3f} @ {scale:.3f}x  {grade:<32} '
              f'bbox {bb}  crownNudge {nudges[d]}')

        if args.clips_hair:
            mm = out[:, :, 3] > ALPHA_T
            mask = np.zeros((FRAME, FRAME, 4), np.uint8)
            for x in range(FRAME):
                colys = np.nonzero(mm[:, x])[0]
                if len(colys):
                    mask[colys.min():, x] = (255, 255, 255, 255)
            Image.fromarray(mask).save(f'{outdir}/hairmask/{d}.png')

        if args.debug:
            dbg = np.zeros((H, W, 3), np.uint8)
            dbg[cmask] = canvas[cmask].astype(np.uint8)
            Image.fromarray(dbg).save(f'{args.debug}/{args.id}-{d}.png')

    south = np.array(Image.open(f'{outdir}/south.png').convert('RGBA'))
    bb = bboxes['south']
    th_img = Image.fromarray(south[bb[1]:bb[1] + bb[3], bb[0]:bb[0] + bb[2]])
    th_img = th_img.resize((128, max(1, round(128 * bb[3] / bb[2]))), Image.LANCZOS)
    th_img.save(f'{outdir}/thumb.png')

    meta = {
        'category': args.category,
        'fullFrame': True,
        'note': ('Imported by tools/import_headwear_green.py from a sheet whose '
                 'person was painted flat #00FF00. The hat is simply everything '
                 'that is neither the magenta backdrop nor the green person, so '
                 'no head can leak into the frame and no colour heuristic can '
                 'eat a hat pixel. The green silhouette also registers the cell '
                 'against the mannequin on the WHOLE body rather than the torso '
                 'alone. anchors are the hat bbox top-centre, crownNudge is '
                 'anchor minus body-tops stand-<dir>-0, scale is 1.'),
        'bboxes': bboxes,
        'anchors': anchors,
        'crownNudge': nudges,
        'scale': scales,
    }
    if args.clips_hair and args.category == 'headwear':
        meta['clipsHair'] = True
    with open(f'{outdir}/meta.json', 'w') as fh:
        json.dump(meta, fh, indent=2)
        fh.write('\n')

    print(f'\nwrote {outdir}/  (5 dirs + thumb + meta'
          f'{" + hairmask" if args.clips_hair else ""})')


if __name__ == '__main__':
    main()
