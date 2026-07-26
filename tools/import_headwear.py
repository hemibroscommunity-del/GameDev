#!/usr/bin/env python3
"""v2.3.1488: turn a generated headwear sheet into a shippable hat.

Takes the sheet that came back from drawing a hat onto
tools/make_headwear_mannequin.py's reference grid, and writes everything the
game needs:

    public/sprites/traits/headwear/<id>/{south,southwest,east,northeast,north}.png
    public/sprites/traits/headwear/<id>/thumb.png
    public/sprites/traits/headwear/<id>/meta.json
    [--clips-hair] .../hairmask/{...}.png

plus the one line to paste into HEADWEAR_CATALOG.

Why this can be EXACT
---------------------
Every hat in the repo before this was placed by eye; all ten notes end with
some variant of "crownNudge/scale start at defaults, tune per direction after
on-device review".  This tool needs no tuning round, because the mannequin
pinned down every unknown before the art was ever drawn:

  * the sheet's grid is deterministic, so `layout()` says exactly which
    256-space rect each cell shows -- a cell pixel maps home with
    p256 = box[:2] + p_cell / UPSCALE, no guessing at what we are looking at;
  * the hat is isolated by DIFFING against the mannequin -- not by
    colour-keying, which would fail the moment a hat is drawn in a skin-like
    gold or brown;
  * the hat lands in the 256 frame at its true position relative to the body,
    so the metadata is arithmetic rather than judgement:

    anchors[dir]    = the hat's own bbox top-centre
    crownNudge[dir] = anchors[dir] - body-tops["stand-<dir>-0"]
    scale[dir]      = 1

That falls straight out of _placeTrait: it puts the anchor pixel at
bodyCrown + crownNudge, so a nudge of (anchor - bodyCrown) puts the art back
exactly where it was drawn.

REGISTRATION (v2.3.1488) -- why the diff needs a search first
-------------------------------------------------------------
The first sheet (the Crown, v2.3.1483) came back byte-for-byte on the grid it
was sent out on: identical canvas size, and the diff against a rebuilt
mannequin was clean.  That turned out to be luck.  The next three sheets came
back REDRAWN -- 2170x725, 1915x821 and 1910x823 against a 2966x761 reference,
the figures re-rendered at ~73%, ~66% and ~75% of the size they were sent at,
with thousands of blended colours that were never in the source.  A generator
that regenerates the whole image rather than compositing onto it will do this
every time, so treat a size match as the exception, not the rule.

A raw diff is worthless once the two images no longer line up, so each cell is
now REGISTERED before it is diffed: search uniform scale + offset for the fit
that best overlays the drawn figure back onto the mannequin figure, scoring
ONLY on the lower part of the torso -- the one region no hat can reach, so the
hat itself can never bias the fit.  Measured on the three pilot sheets, the
torso overlap lands at 0.97-0.995 IoU on every cell, i.e. the alignment is
good to well under one game pixel, and the diff downstream is exact again.

Because the redraw also means body pixels no longer match EXACTLY, the hat is
taken as the union of two tests rather than a bare difference:

  * anything drawn outside the body silhouette (dilated a touch, so a redrawn
    outline cannot register as hat) -- robust, and catches every hat that
    breaks the head's outline;
  * anything drawn INSIDE the silhouette whose colour has changed -- this is
    what catches a headband painted flat across the forehead.

then everything is kept that connects to the crown of the head, which is the
one place every hat must cover.  Torso-level redraw noise is dropped on the
floor by that connectivity test.

Run from the repo root:
    python3 tools/import_headwear.py --art sheet.png --id crown --name "Crown"
    [--row N]  which hat row to read on a multi-hat sheet (default 0)
    [--rows N] how many rows the sheet was generated with (default 1)
    [--clips-hair]
    [--debug DIR] dump per-direction registration previews
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
OUTDIR = 'public/sprites/traits/headwear/{id}'
FRAME = 256
DIFF_T = 40          # per-channel colour change that counts as "repainted"
ALPHA_T = 16         # the alpha the meta bboxes are measured at (matches the shipped hats)
OVERSHOOT = 44       # 256-space rows sampled ABOVE the cell (see below)
TOP_MARGIN = 6       # where the hat's top sits in its own frame
EDGE_PAD = 3         # cell-space ring around the body that a redrawn outline may wander into
CHIN_SLACK = 10      # 256-space rows below the jaw a hat may still reach (chinstraps, tails)
CORE_FRAC = 0.45     # a hat must cover the top this much of the head to be believed


def ink_of(rgb):
    """Everything that is not the magenta backdrop.

    Deliberately NOT "not-background-coloured": a hat is allowed to be white,
    black or any other flat colour, so only the key colour is removed.  The
    test is loose enough to swallow the blend halo a regenerated sheet leaves
    around every edge (a halo is one art pixel, i.e. under a third of a game
    pixel once it is downscaled, so fattening the silhouette by it is free)."""
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    mag = (r > 150) & (b > 150) & (g < 90) & (np.abs(r - b) < 60)
    return ~mag


def panel_of(rgb):
    """The magenta panel's bbox — the art lives inside it, and cropping to it
    drops the page margin the generator likes to add around the sheet."""
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    mag = (r > 150) & (b > 150) & (g < 90) & (np.abs(r - b) < 60)
    lab, k = ndi.label(mag)
    if not k:
        raise SystemExit('no magenta panel found — is this a mannequin sheet?')
    sizes = np.array(ndi.sum(mag, lab, range(1, k + 1)))
    sl = ndi.find_objects(lab)[int(np.argmax(sizes))]
    return sl[1].start, sl[0].start, sl[1].stop, sl[0].stop


def find_figures(ink, rows, row):
    """The five drawn figures of one hat row, left to right.

    The five bodies are far and away the largest things on the sheet, so they
    are picked by size; the direction labels and the title are left behind.
    Anything else large enough to matter is then folded into whichever figure
    it sits above -- that is how a hat drawn as a detached piece (a floating
    halo, a brim that clears the head) gets carried along instead of dropped."""
    lab, k = ndi.label(ink, np.ones((3, 3)))
    if k < 5:
        raise SystemExit('fewer than five drawn shapes on this sheet')
    sizes = np.array(ndi.sum(ink, lab, range(1, k + 1)))
    objs = ndi.find_objects(lab)
    big = list(np.argsort(sizes)[::-1][:5 * rows])
    if rows > 1:                                   # split into row bands by y centre
        cy = sorted(big, key=lambda i: (objs[i][0].start + objs[i][0].stop) / 2)
        big = cy[row * 5:(row + 1) * 5]
    big = sorted(big, key=lambda i: objs[i][1].start)

    out = []
    for i in big:
        sl = objs[i]
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        m = (lab == i + 1)
        for j in range(k):                         # absorb detached hat pieces
            if j == i or sizes[j] < 60:
                continue
            s2 = objs[j]
            if (s2[1].start >= x0 - 20 and s2[1].stop <= x1 + 20 and s2[0].stop <= y1
                    and s2[0].start >= y0 - (y1 - y0) // 4):
                m |= (lab == j + 1)
                y0 = min(y0, s2[0].start)
                x0 = min(x0, s2[1].start)
                x1 = max(x1, s2[1].stop)
        out.append((m[y0:y1, x0:x1], (x0, y0)))
    return out


def register(fig, mcell_ink):
    """Uniform scale + offset that lays the drawn figure back onto the
    mannequin figure, fitted on the TORSO ONLY.

    The lower 42% of the mannequin figure is below the jaw in every direction,
    so no hat — however tall, however wide-brimmed — has any pixels there.  The
    fit therefore cannot be pulled around by the very thing we are trying to
    measure, which is the whole reason it is trustworthy."""
    Mh, Mw = mcell_ink.shape
    mys = np.nonzero(mcell_ink.any(axis=1))[0]
    my0, my1 = mys.min(), mys.max() + 1
    band = mcell_ink[int(my1 - 0.42 * (my1 - my0)):my1]
    bh = band.shape[0]
    mcx = np.nonzero(band.any(axis=0))[0].mean()

    ah, aw = fig.shape
    src = Image.fromarray((fig * 255).astype(np.uint8))
    best = None
    for s in np.arange(0.45, 1.35, 0.0025):
        th, tw = int(round(ah / s)), int(round(aw / s))
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
            for dx in range(d0 - 12, d0 + 13):
                sh = np.zeros_like(band)
                x0, x1 = max(0, dx), min(Mw, ba.shape[1] + dx)
                if x1 <= x0:
                    continue
                sh[:, x0:x1] = ba[:, x0 - dx:x1 - dx]
                iou = (sh & band).sum() / max(1, (sh | band).sum())
                if best is None or iou > best[0]:
                    best = (iou, float(s), int(dx), int(my1 - th + dy))
    if best is None or best[0] < 0.85:
        raise SystemExit(f'could not register this cell (best torso IoU '
                         f'{0 if best is None else best[0]:.3f}) — the art may '
                         f'have been redrawn too loosely to trust')
    return best


def cell_hat(art_rgb, art_ink, man_rgb, man_ink, fig, org, cell, crown256, debug=None):
    """The hat from one cell as a 256x256 RGBA frame, plus where the body's
    crown falls inside that frame.

    The canvas reaches OVERSHOOT rows ABOVE the cell because a tall hat does
    not fit over the head inside the 256 frame and the artist simply draws it
    in the margin: measured on the first real sheet, the crown's spikes ran
    15px above the south cell and 32px above the southwest one, and clipping
    them at the cell edge lopped the points off.

    The hat is then placed in its OWN frame wherever it fits (top at
    TOP_MARGIN, centred on 128) rather than at its absolute body position --
    which is exactly how the shipped hats are stored, since `anchors` makes the
    storage position irrelevant.  crownNudge is unaffected: it is
    anchor - crown measured in the SAME frame, so a shift applied to both
    cancels out."""
    px, py = cell['paste']
    cw, ch = cell['size']
    up = cell['upscale']
    x0, y0, _x1, y1_256 = cell['box']
    over = OVERSHOOT * up

    M = man_ink[py:py + ch, px:px + cw]
    iou, s, dx, dy = register(fig, M)

    # lay the drawn cell onto a canvas in mannequin space, OVERSHOOT rows tall
    fh, fw = fig.shape
    th, tw = int(round(fh / s)), int(round(fw / s))
    crop = art_rgb[org[1]:org[1] + fh, org[0]:org[0] + fw]
    Areg = np.array(Image.fromarray(crop.astype(np.uint8)).resize((tw, th), Image.BOX)).astype(int)
    Amsk = np.array(Image.fromarray((fig * 255).astype(np.uint8)).resize((tw, th), Image.BOX)) > 110

    H, W = over + ch, cw
    canvas = np.zeros((H, W, 3), int)
    ink = np.zeros((H, W), bool)
    ty, tx = over + dy, dx
    sy0, sx0 = max(0, -ty), max(0, -tx)
    sy1, sx1 = min(th, H - ty), min(tw, W - tx)
    if sy1 <= sy0 or sx1 <= sx0:
        raise SystemExit(f"{cell['dir']}: the drawn figure landed off the cell")
    canvas[ty + sy0:ty + sy1, tx + sx0:tx + sx1] = Areg[sy0:sy1, sx0:sx1]
    ink[ty + sy0:ty + sy1, tx + sx0:tx + sx1] = Amsk[sy0:sy1, sx0:sx1]

    body = np.zeros((H, W), bool)
    body[over:] = M
    bodyrgb = np.zeros((H, W, 3), int)
    bodyrgb[over:] = man_rgb[py:py + ch, px:px + cw]

    # the hat: drawn beyond the body's outline, or drawn over it in a new colour
    ring = ndi.binary_dilation(body, ndi.generate_binary_structure(2, 2),
                               iterations=EDGE_PAD)
    repaint = body & (np.abs(canvas - bodyrgb).max(axis=2) > DIFF_T)
    hatm = ink & (~ring | repaint)

    # drop the blend halo the regenerated sheet leaves where art meets the key
    # colour: those pixels are part magenta and read as a purple fringe along
    # every brim once composited.  A genuinely purple hat survives this (the
    # test wants BOTH channels far above green AND both bright); a magenta one
    # could not be keyed on a magenta backdrop at all, hence the warning.
    r, g, b = canvas[:, :, 0], canvas[:, :, 1], canvas[:, :, 2]
    fringe = (r - g > 55) & (b - g > 55) & (np.minimum(r, b) > 110)
    lost, whole = int((hatm & fringe).sum()), max(1, int(hatm.sum()))
    if lost > whole * 0.15:
        print(f"  warning: {cell['dir']} lost {100 * lost / whole:.0f}% of the hat to "
              f'the magenta key — is this hat drawn in a pink/magenta colour?')
    hatm &= ~fringe

    # nothing below the jaw (plus slack for a strap or a tail)
    chin = over + (y1_256 - y0 - _man.PAD_BELOW + CHIN_SLACK) * up
    hatm[max(0, chin):] = False
    hatm = ndi.binary_fill_holes(hatm)

    # keep only what connects to the top of the head — every hat covers it, and
    # this is what throws away redraw noise along the shoulders.  The core is a
    # BAND, not "everything above": the sheet's own title sits in the overshoot
    # margin above the south cell, and an open-topped test adopted it as hat.
    head_h = (y1_256 - y0) - _man.PAD_ABOVE - _man.PAD_BELOW
    core_top = over + _man.PAD_ABOVE * up
    core_row = over + int((_man.PAD_ABOVE + CORE_FRAC * head_h) * up)
    lab, k = ndi.label(hatm, np.ones((3, 3)))
    if not k:
        raise SystemExit(f"{cell['dir']}: nothing was drawn in this cell")
    keep = np.zeros(k + 1, bool)
    for i in np.unique(lab[core_top:core_row]):
        if i:
            keep[i] = True
    sizes = np.array(ndi.sum(hatm, lab, range(1, k + 1)))
    keep[1:] &= sizes >= 2 * up * up               # under two game pixels: speckle
    hatm = keep[lab]
    if not hatm.any():
        raise SystemExit(f"{cell['dir']}: found no hat covering the head")

    if debug is not None:
        dbg = np.where(body[:, :, None], bodyrgb, 0).astype(np.uint8)
        dbg = np.where(ink[:, :, None], canvas, dbg).astype(np.uint8)
        dbg[hatm] = (dbg[hatm] * 0.35 + np.array([0, 255, 0]) * 0.65).astype(np.uint8)
        Image.fromarray(dbg).save(f"{debug}/{cell['dir']}.png")

    # collapse each up x up block to one 256-space pixel
    rows, cols = H // up, W // up
    hat = np.zeros((rows, cols, 4), np.uint8)
    for v in range(rows):
        for u in range(cols):
            blk = hatm[v * up:(v + 1) * up, u * up:(u + 1) * up]
            n = int(blk.sum())
            if n * 2 <= up * up:                   # majority vote: a mostly
                continue                           # untouched edge block is not hat
            rgb = canvas[v * up:(v + 1) * up, u * up:(u + 1) * up][blk].mean(axis=0)
            hat[v, u] = (*np.round(rgb).astype(int), 255)

    m = hat[:, :, 3] > ALPHA_T
    ys, xs = np.nonzero(m)
    hy0, hy1, hx0, hx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    hh, hw = hy1 - hy0, hx1 - hx0
    if hh > FRAME or hw > FRAME:
        raise SystemExit(f"{cell['dir']}: hat is {hw}x{hh} in 256-space — "
                         'too big for the frame, it was drawn oversized')
    oy = TOP_MARGIN - hy0
    ox = FRAME // 2 - (hx0 + hx1) // 2
    out = np.zeros((FRAME, FRAME, 4), np.uint8)
    for v in range(rows):
        ty2 = v + oy
        if not (0 <= ty2 < FRAME):
            continue
        for u in range(cols):
            tx2 = u + ox
            if 0 <= tx2 < FRAME and hat[v, u, 3] > ALPHA_T:
                out[ty2, tx2] = hat[v, u]

    # the crown, in this frame's coordinates: 256-space -> cell -> frame
    crown_in_frame = [int(crown256[0] - x0 + ox),
                      int(crown256[1] - y0 + OVERSHOOT + oy)]
    return out, crown_in_frame, iou, s


def bbox_of(frame):
    m = frame[:, :, 3] > ALPHA_T
    ys, xs = np.nonzero(m)
    return [int(xs.min()), int(ys.min()),
            int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--art', required=True, help='the generated sheet')
    ap.add_argument('--id', required=True, help='kebab-case folder + catalog id')
    ap.add_argument('--name', required=True, help='label shown in the Hats picker')
    ap.add_argument('--row', type=int, default=0)
    ap.add_argument('--rows', type=int, default=1)
    ap.add_argument('--clips-hair', action='store_true',
                    help='also emit hairmask/*.png so hair cannot poke through')
    ap.add_argument('--mannequin', default=None,
                    help='rebuilt from the repo if not given')
    ap.add_argument('--debug', default=None,
                    help='directory for per-direction registration previews')
    args = ap.parse_args()

    cells = [c for c in _man.layout(args.rows) if c['row'] == args.row]
    if not cells:
        raise SystemExit(f'--row {args.row} is not in a {args.rows}-row sheet')

    # rebuild the exact mannequin this sheet was drawn over
    if args.mannequin:
        man = Image.open(args.mannequin).convert('RGB')
    else:
        tmp = os.path.join(TOOLS, '.mannequin-rebuild.png')
        os.system(f'python3 {TOOLS}/make_headwear_mannequin.py '
                  f'--rows {args.rows} --out {tmp} >/dev/null')
        man = Image.open(tmp).convert('RGB')
        os.remove(tmp)
    man_rgb = np.array(man).astype(int)
    man_ink = ink_of(man_rgb)

    art = Image.open(args.art).convert('RGB')
    art_rgb = np.array(art).astype(int)
    ax0, ay0, ax1, ay1 = panel_of(art_rgb)
    art_rgb = art_rgb[ay0:ay1, ax0:ax1]
    art_ink = ink_of(art_rgb)
    figs = find_figures(art_ink, args.rows, args.row)
    if art.size != man.size:
        print(f'note: sheet is {art.size}, mannequin is {man.size} — the art was '
              f'redrawn at another size, so each cell is registered before diffing')

    if args.debug:
        os.makedirs(args.debug, exist_ok=True)

    tops = json.load(open(BODY_TOPS))
    outdir = OUTDIR.format(id=args.id)
    os.makedirs(outdir, exist_ok=True)
    if args.clips_hair:
        os.makedirs(os.path.join(outdir, 'hairmask'), exist_ok=True)

    bboxes, anchors, nudges, scales = {}, {}, {}, {}
    for c, (fig, org) in zip(cells, figs):
        d = c['dir']
        frame, crown, iou, s = cell_hat(art_rgb, art_ink, man_rgb, man_ink, fig, org,
                                        c, tops[f'stand-{d}-0'], args.debug)
        Image.fromarray(frame).save(f'{outdir}/{d}.png')

        bb = bbox_of(frame)
        anchor = [int(bb[0] + round(bb[2] / 2)), int(bb[1])]
        bboxes[d] = bb
        anchors[d] = anchor
        # anchor and crown are both in the hat's own frame, so this is the
        # exact offset _placeTrait needs to put the art back where it was drawn
        nudges[d] = [int(anchor[0] - crown[0]), int(anchor[1] - crown[1])]
        scales[d] = 1
        print(f'{d:<10} fit IoU {iou:.3f} @ {s:.3f}x   bbox {bb}  anchor {anchor}  '
              f'crown-in-frame {crown}  crownNudge {nudges[d]}')

        if args.clips_hair:
            m = frame[:, :, 3] > ALPHA_T
            mask = np.zeros((FRAME, FRAME, 4), np.uint8)
            for x in range(FRAME):
                ys = np.nonzero(m[:, x])[0]
                if len(ys):
                    mask[ys.min():, x] = (255, 255, 255, 255)
            Image.fromarray(mask).save(f'{outdir}/hairmask/{d}.png')

    # picker thumbnail: the south hat, tight-cropped, 128 wide
    south = np.array(Image.open(f'{outdir}/south.png').convert('RGBA'))
    bb = bboxes['south']
    th = Image.fromarray(south[bb[1]:bb[1] + bb[3], bb[0]:bb[0] + bb[2]])
    th = th.resize((128, max(1, round(128 * bb[3] / bb[2]))), Image.LANCZOS)
    th.save(f'{outdir}/thumb.png')

    meta = {
        'category': 'headwear',
        'fullFrame': True,
        'note': ('Generated on the headwear mannequin (tools/'
                 'make_headwear_mannequin.py) and imported by tools/'
                 'import_headwear.py, which registers each drawn cell back onto '
                 'the mannequin before diffing. The hat was drawn ON the head, '
                 'so it lands in the 256 frame at its true position relative to '
                 'the body: anchors are its own bbox top-centre, crownNudge is '
                 'anchor minus body-tops stand-<dir>-0, scale is 1. No by-eye '
                 'tuning — adjust only if on-device review disagrees.'),
        'bboxes': bboxes,
        'anchors': anchors,
        'crownNudge': nudges,
        'scale': scales,
    }
    if args.clips_hair:
        meta['clipsHair'] = True
    with open(f'{outdir}/meta.json', 'w') as fh:
        json.dump(meta, fh, indent=2)
        fh.write('\n')

    print(f'\nwrote {outdir}/  (5 dirs + thumb + meta'
          f'{" + hairmask" if args.clips_hair else ""})')
    print('\nAdd to HEADWEAR_CATALOG in src/rendering/traits/headwearCatalog.js:')
    print(f"  {{ id: '{args.id}', name: '{args.name}' }},")


if __name__ == '__main__':
    main()
