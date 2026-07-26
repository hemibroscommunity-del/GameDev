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


BANDS = (0.42, 0.25)   # fractions of the figure height used as the fit region
MIN_IOU = 0.88         # below this a cell is not trusted at all
GOOD_IOU = 0.95        # below this the cell is reported as a soft warning
TRUST_IOU = 0.98       # at or above this a cell keeps its own scale, siblings or not
SCALE_TOL = 0.04       # how far one cell's scale may stray from its sheet's median


def _fit(fig, band, mcx, Mw, my1, scales):
    """Best (IoU, scale, dx, dy_origin) over the given candidate scales."""
    bh = band.shape[0]
    ah, aw = fig.shape
    src = Image.fromarray((fig * 255).astype(np.uint8))
    best = None
    for s in scales:
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
    return best


def register(fig, mcell_ink, pin=None):
    """Uniform scale + offset that lays the drawn figure back onto the
    mannequin figure, fitted on the TORSO ONLY.

    The bottom of the mannequin figure is below the jaw in every direction, so
    no hat — however tall, however wide-brimmed — has pixels there.  The fit
    therefore cannot be pulled around by the very thing it exists to measure,
    which is the whole reason it is trustworthy.

    Two band heights are tried and the better kept.  The taller band (42%) has
    more to grip and is preferred, but it reaches high enough that a hat which
    hangs down the back of the head — an afro, a keffiyeh — spills into it on
    the EAST cell, where the body below the jaw is only a sliver to begin with.
    That cost three sheets a failed import at 0.81-0.85 IoU; the same cells fit
    at 0.90-0.93 on the short band, and where the tall band already fits well
    the two agree on scale to within 0.01, so nothing is lost by trying both.

    `pin` fixes the scale and searches position only — used to repair one bad
    cell from its sheet's median (see main)."""
    Mh, Mw = mcell_ink.shape
    mys = np.nonzero(mcell_ink.any(axis=1))[0]
    my0, my1 = mys.min(), mys.max() + 1
    best = None
    for frac in BANDS:
        band = mcell_ink[int(my1 - frac * (my1 - my0)):my1]
        mcx = np.nonzero(band.any(axis=0))[0].mean()
        if pin is not None:
            got = _fit(fig, band, mcx, Mw, my1, [pin])
        else:
            coarse = _fit(fig, band, mcx, Mw, my1, np.arange(0.45, 1.35, 0.01))
            if coarse is None:
                continue
            got = _fit(fig, band, mcx, Mw, my1,
                       np.arange(coarse[1] - 0.012, coarse[1] + 0.013, 0.0025))
        if got is not None and (best is None or got[0] > best[0]):
            best = got
    return best


def _label_marks(ink, below):
    """Centroids of the five direction captions, left to right.

    They sit under the figures on their own row, so anything below the cells is
    caption and nothing else."""
    lab, k = ndi.label(ink[below:], np.ones((3, 3)))
    if k < 5:
        return None
    objs = ndi.find_objects(lab)
    xs = sorted(((o[1].start + o[1].stop) / 2, (o[0].start + o[0].stop) / 2 + below)
                for o in objs)
    # exactly five captions, so the four widest gaps between glyphs ARE the
    # word breaks — no threshold to tune, and it survives a redrawn font
    gaps = sorted(range(1, len(xs)), key=lambda i: xs[i][0] - xs[i - 1][0])[-4:]
    cuts = [0] + sorted(gaps) + [len(xs)]
    groups = [xs[a:b] for a, b in zip(cuts, cuts[1:])]
    if any(not g for g in groups):
        return None
    return [(sum(g[0] for g in grp) / len(grp), sum(g[1] for g in grp) / len(grp))
            for grp in groups]


def register_by_labels(art_ink, man_ink, cells, figs):
    """Per-cell fit derived from the sheet's own direction captions.

    The torso fit is the good one and is always tried first, but it assumes the
    hat leaves the torso alone — and some headwear simply does not.  The
    Arabian keffiyeh drapes over both shoulders in all five directions and
    swallows the east figure whole; its per-cell scales came back 0.66, 0.66,
    0.99, 0.69, 0.75 for what must be a single number, because there was no
    uncovered body left to measure.

    The captions cannot be covered by a hat, so they give a transform that
    holds however much of the body the art buries.  It is a WHOLE-SHEET
    transform (one scale, one offset) rather than five independent fits, which
    is also the truth about how these sheets come back."""
    ma = _label_marks(man_ink, max(c['paste'][1] + c['size'][1] for c in cells) + 2)
    aa = _label_marks(art_ink, max(o[1] + f.shape[0] for f, o in figs) + 2)
    if ma is None or aa is None:
        return None
    span_m = ma[-1][0] - ma[0][0]
    span_a = aa[-1][0] - aa[0][0]
    if span_m <= 0 or span_a <= 0:
        return None
    s = span_a / span_m
    ox = sum(m[0] - a[0] / s for m, a in zip(ma, aa)) / 5
    oy = sum(m[1] - a[1] / s for m, a in zip(ma, aa)) / 5
    return s, ox, oy


def cell_hat(art_rgb, art_ink, man_rgb, man_ink, fig, org, cell, crown256, fit,
             text_bottom=0, debug=None):
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
    iou, s, dx, dy = fit

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

    # blank the sheet's own caption band.  The canvas reaches OVERSHOOT rows
    # above the cell, which on the top row of a sheet reaches the title text.
    # On a sheet that came back the same size the title cancels out in the
    # diff, but a REDRAWN sheet moves it a few pixels and it lights up as hat
    # — measured: 'DWEAR REFERENCE' was adopted onto the wizard hat.  The band
    # is read off the rebuilt mannequin, so it is exactly the rows the caption
    # occupies and nothing more; ~30 rows of clear margin remain above the
    # cell for a tall hat (the tallest seen so far overshot by 32).
    blank = text_bottom - (py - over)
    if blank > 0:
        ink[:min(blank, H)] = False

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

    # keep only what sits on or above the head — this is what throws away
    # redraw noise along the shoulders.  Deliberately open at the top rather
    # than a band around the skull: not every hat touches the head.  The
    # lightbulb sheet draws a bulb on a stalk floating clear of the scalp, and
    # a band that started at the crown row threw the whole thing away ("found
    # no hat covering the head").  The caption blanking above is what makes an
    # open top safe.
    head_h = (y1_256 - y0) - _man.PAD_ABOVE - _man.PAD_BELOW
    core_row = over + int((_man.PAD_ABOVE + CORE_FRAC * head_h) * up)
    lab, k = ndi.label(hatm, np.ones((3, 3)))
    if not k:
        raise SystemExit(f"{cell['dir']}: nothing was drawn in this cell")
    keep = np.zeros(k + 1, bool)
    for i in np.unique(lab[:core_row]):
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

    # Register every cell first, then repair only the cells that need it.
    #
    # The tempting rule is "a sheet is ONE image, so all five cells share one
    # scale -- pin every outlier to the median".  Measured across 30 sheets,
    # that is FALSE: the generator redraws each figure independently and its
    # scale genuinely varies by up to 8% between cells.  Pinning made things
    # worse where the cell's own fit was already perfect (bandana southwest
    # 1.000 -> 0.922, frog cap south 1.000 -> 0.959).
    #
    # So the median is used only as a rescue.  A cell whose own overlap is at
    # least TRUST_IOU has matched the full torso band almost exactly and cannot
    # be wrong about its scale by any margin that matters -- it keeps what it
    # measured.  A cell that fits poorly AND disagrees with its siblings is one
    # where the hat has eaten the torso it was supposed to be measured against
    # (the EAST cell, whose visible body is a sliver to begin with, is nearly
    # always the one); there the four siblings are the better evidence, and
    # pinning to their median is what rescued afro / russian-hat / new-idea.
    # where this row's caption text ends, measured on the mannequin itself
    top_paste = min(c['paste'][1] for c in cells)
    above = np.nonzero(man_ink[:top_paste].any(axis=1))[0]
    text_bottom = int(above.max()) + 3 if len(above) else 0

    fits = []
    for c, (fig, org) in zip(cells, figs):
        px, py = c['paste']
        cw, ch = c['size']
        got = register(fig, man_ink[py:py + ch, px:px + cw])
        if got is None:
            raise SystemExit(f"{c['dir']}: could not register this cell at all")
        fits.append(got)
    med = float(np.median([f[1] for f in fits]))
    for i, (c, (fig, org)) in enumerate(zip(cells, figs)):
        if fits[i][0] >= TRUST_IOU or abs(fits[i][1] - med) <= SCALE_TOL * med:
            continue
        px, py = c['paste']
        cw, ch = c['size']
        again = register(fig, man_ink[py:py + ch, px:px + cw], pin=med)
        print(f"  {c['dir']}: scale {fits[i][1]:.3f} disagreed with the sheet's "
              f'{med:.3f} — re-fitted pinned, IoU {fits[i][0]:.3f} -> '
              f'{0 if again is None else again[0]:.3f}')
        if again is not None:
            fits[i] = again
    if any(f[0] < MIN_IOU for f in fits):
        bad = ', '.join(c['dir'] for c, f in zip(cells, fits) if f[0] < MIN_IOU)
        byl = register_by_labels(art_ink, man_ink, cells, figs)
        if byl is None:
            raise SystemExit(f'torso fit failed on {bad} and the direction '
                             'captions could not be read to fall back on')
        s, ox, oy = byl
        print(f'  torso fit failed on {bad} — this hat covers too much of the '
              f'body to measure against it, so the whole sheet is placed from '
              f'its direction captions instead (scale {s:.3f})')
        fits = [(float('nan'), s, int(round(org[0] / s + ox - c['paste'][0])),
                 int(round(org[1] / s + oy - c['paste'][1])))
                for c, (fig, org) in zip(cells, figs)]
    for i, f in enumerate(fits):
        if f[0] == f[0] and f[0] < GOOD_IOU:
            print(f"  warning: {cells[i]['dir']} torso fit {f[0]:.3f} is on the "
                  'low side; check this direction in the preview')

    bboxes, anchors, nudges, scales = {}, {}, {}, {}
    for c, (fig, org), fit in zip(cells, figs, fits):
        d = c['dir']
        frame, crown, iou, s = cell_hat(art_rgb, art_ink, man_rgb, man_ink, fig, org,
                                        c, tops[f'stand-{d}-0'], fit,
                                        text_bottom, args.debug)
        Image.fromarray(frame).save(f'{outdir}/{d}.png')

        bb = bbox_of(frame)
        anchor = [int(bb[0] + round(bb[2] / 2)), int(bb[1])]
        bboxes[d] = bb
        anchors[d] = anchor
        # anchor and crown are both in the hat's own frame, so this is the
        # exact offset _placeTrait needs to put the art back where it was drawn
        nudges[d] = [int(anchor[0] - crown[0]), int(anchor[1] - crown[1])]
        scales[d] = 1
        how = 'caption-fit ' if iou != iou else f'fit IoU {iou:.3f} '
        print(f'{d:<10} {how}@ {s:.3f}x   bbox {bb}  anchor {anchor}  '
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
