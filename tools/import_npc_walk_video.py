#!/usr/bin/env python3
"""v2.3.2617: slice a WHITE-background NPC walk sheet delivered as a VIDEO.

A sibling to tools/import_npc_walk.py, which takes a still magenta 4x8 sheet.
This one exists because the card sharp arrived as a 6-second mp4 (528x576,
24fps): every video FRAME is a whole 6x5 sheet, and the walk cycle runs along
the TIME axis, not along the columns.  That is measured, not assumed -- see
"WHERE THE ANIMATION LIVES" below.  Everything downstream of extraction is the
same contract as the still importer, so the two produce interchangeable art.

    python3 tools/import_npc_walk_video.py <source.mp4> <out-prefix>

Needs PyAV + numpy + scipy on top of Pillow (pip install av numpy scipy).  The
still importer needs only Pillow; these are the price of decoding video and of
the connected-component work the overlapping rows below force.

WHERE THE ANIMATION LIVES, and how that was established
-------------------------------------------------------
A 6x5 grid of a walking man has two candidate animation axes and picking the
wrong one yields 30 near-identical frames that read as a standing man vibrating.
Measured on the foot-spread signal (width of the silhouette's bottom 15%):

  * The six COLUMNS are IN PHASE.  Cross-correlating each column against
    column 0 puts the best lag at 0 for all five, r = 0.60..0.87.  They are
    redundant generations of the same instant, not a cycle.
  * TIME is the cycle.  Autocorrelation of the same signal peaks at lag 24
    (r = 0.96) with a secondary at lag 12 (r = 0.87) -- a 24-frame gait whose
    half-cycle is the opposite leg.  Hence FRAMES=4 sampled STEP=6 apart:
    contact, passing, opposite contact, opposite passing.

So a direction's four frames all come from ONE cell (r, c) at four times, which
is what makes the shared-bbox rule below work: a fixed cell is a fixed
coordinate frame, exactly as a fixed cell is in the still sheet.

ROW -> VIEW.  The sheet carries THREE camera angles, not eight, and rows repeat:
rows 0 and 1 are both front, row 2 is the right profile, rows 3 and 4 are both
back (the ace on his hat sits right of centre in front views and left of it in
back views, which is the tell).  The repeats are a gift -- SOUTH_ROWS and
NORTH_ROWS are searched as pools and the cleanest window in either wins.

THE KEY IS A FLOOD FILL, NOT A COLOUR TEST.  The background is white and so are
two pieces of the art: the ace tucked in his hatband and the white ball in his
hand.  A global "is it white" test eats both.  Only white CONNECTED TO THE
BORDER is background, so the fill starts there and the interior whites survive.

THE HALO IS REPAIRED THE WAY THE REST OF THE REPO REPAIRS IT.  Keying light art
off white leaves a pale rim that is glaring on a dark map -- the exact complaint
behind tools/defringe_light_halo.py (v2.3.1636).  Its cure is used here rather
than reinvented: every semi-transparent pixel takes the RGB of the nearest
OPAQUE pixel, so the rim loses its whiteness without anyone having to estimate
what colour the background was.  Alpha is then solved from the matte equation
P = a*F + (1-a)*255 against that same F, which keeps the anti-aliasing instead
of hard-cutting it.  A hard cut was tried first and read as a dotted outline.

ROWS 3 AND 4 OVERLAP, so cells cannot be plain crops.  His feet in row 3 hang
into row 4's hat: the row gutter at y=450 still carries 12% of peak occupancy
(the clean gutters carry 0.1-3%).  A rigid crop amputates one or the other, and
feet are the one thing that must not be guessed -- they set ground contact.  So
each cell is cropped WIDE (PAD px into its neighbours) and the figure is
recovered by connected components: keep the largest component whose pixels are
mostly in this cell's own band, then re-admit only islands touching it (a bell
or the ace can key off separately).  The proximity test is load-bearing -- the
in-band test alone also passes the NEIGHBOURING COLUMN's sliver, which shipped
as a nub welded to the frame edge until this was added.  Windows where the two
figures actually fuse are marked 'merged' and are simply not selected; at 6
columns x 145 frames there is no shortage of clean ones.

THE GRID IS DETECTED, NOT DIVIDED.  528/6 = 88 looks exact and is wrong: the
content bands sit at 96/181/266/350/433, drifting up to 8px off the even split,
which clipped a shoulder off every figure in half the cells.  Splits are taken
from occupancy-profile valleys over the whole video.

FRAME CONVENTION IS THE GAME'S, identical to the still importer: a 256px frame,
feet on y=223, hat no higher than y=23, so entityRenderer needs no special case.
ONE scale is derived from the TALLEST direction and applied to all of them, so
south/east/north stay honestly proportioned against each other rather than each
being stretched to fill the same box.

EIGHT DIRECTIONS FROM THREE VIEWS.  Mirroring gives the west half for free; the
diagonals have no art at all and must borrow.  They borrow the PROFILE (see
DIAG_FROM): left-versus-right is the cue a player actually reads on a moving
figure, and a profile gets all six non-vertical directions right about that,
where borrowing front/back would get all six wrong.  Pure north and south keep
their own views.
"""
import os
import sys

import numpy as np
import scipy.ndimage as ndi
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COLS, ROWS = 6, 5
FRAMES, STEP = 4, 6          # 4 game frames off the measured 24-frame gait
FRAME = 256
FEET_Y = 223                 # must match entityRenderer NPC_FRAME_FEET_Y
TOP_Y = 23                   # must match entityRenderer NPC_FRAME_TOP_Y
PAD = 30                     # cell overcrop, > the rows 3/4 overlap
RING = 2                     # halo band width; 1 leaves rim, 3 eats the ace

SOUTH_ROWS, EAST_ROWS, NORTH_ROWS = (0, 1), (2,), (3, 4)
DIRS = ['south', 'southwest', 'west', 'northwest',
        'north', 'northeast', 'east', 'southeast']
# view to take, and whether to mirror it.  Diagonals borrow the profile.
DIAG_FROM = {
    'south':     ('south', False), 'north':     ('north', False),
    'east':      ('east',  False), 'west':      ('east',  True),
    'southeast': ('east',  False), 'northeast': ('east',  False),
    'southwest': ('east',  True),  'northwest': ('east',  True),
}


def decode(src):
    import av
    c = av.open(src)
    return [f.to_image().convert('RGB') for f in c.decode(video=0)]


def key_sheet(img):
    """White background out by border flood fill; halo out by nearest-opaque
    RGB + a matte solve for alpha.  See the module note."""
    a = np.asarray(img).astype(np.float64)
    mx, mn = a.max(axis=2), a.min(axis=2)
    near_white = (mn > 200) & ((mx - mn) < 30)
    lab, _ = ndi.label(near_white)
    border = set(lab[0, :]) | set(lab[-1, :]) | set(lab[:, 0]) | set(lab[:, -1])
    border.discard(0)
    bg = np.isin(lab, sorted(border))
    ring = ndi.binary_dilation(bg, iterations=RING) & (~bg)
    core = (~bg) & (~ring)
    if not core.any():
        raise SystemExit('nothing survived the key -- check near_white')
    idx = ndi.distance_transform_edt(~core, return_indices=True)[1]
    F = a[idx[0], idx[1]]
    den, num = 255.0 - F, 255.0 - a
    with np.errstate(invalid='ignore', divide='ignore'):
        est = np.where(den > 25, num / np.where(den > 25, den, 1), np.nan)
    with np.errstate(invalid='ignore'):
        al = np.nanmean(est, axis=2)
    al = np.where(np.isnan(al), np.clip((255 - a.mean(axis=2)) / 60, 0, 1), al)
    alpha = np.where(core, 255.0, 0.0)
    alpha = np.where(ring, np.clip(al, 0, 1) * 255, alpha)
    rgb = a.copy()
    rgb[ring] = F[ring]
    return np.dstack([rgb, alpha]).clip(0, 255).astype(np.uint8)


def splits(occ, n):
    """Band edges from occupancy valleys.  The even split is off by up to 8px."""
    L = len(occ)
    out = []
    for i in range(n - 1):
        g = round((i + 1) * L / n)
        lo, hi = max(0, g - 30), min(L, g + 30)
        out.append(lo + int(np.argmin(occ[lo:hi])))
    return [0] + out + [L]


def figure_mask(mask, r, c, CS, RS):
    """One figure out of an overcropped cell.  See the module note on rows 3/4."""
    y0 = max(0, RS[r] - PAD)
    y1 = min(mask.shape[0], RS[r + 1] + PAD)
    sub = mask[y0:y1, CS[c]:CS[c + 1]]
    lab, n = ndi.label(sub)
    if n == 0:
        return None, 'empty', (y0, CS[c])
    b0, b1 = RS[r] - y0, RS[r + 1] - y0
    cands = [(lab == k) for k in range(1, n + 1)
             if (lab == k).sum() >= 25 and
             (lab == k)[b0:b1].sum() / (lab == k).sum() > 0.5]
    if not cands:
        return None, 'tiny', (y0, CS[c])
    anchor = max(cands, key=lambda m: m.sum())
    near = ndi.binary_dilation(anchor, iterations=4)
    keep = anchor.copy()
    for comp in cands:
        if comp is not anchor and (comp & near).any():
            keep |= comp
    ys = np.nonzero(keep.any(axis=1))[0]
    merged = ys.min() < b0 - PAD * 0.8 or ys.max() > b1 + PAD * 0.8
    return keep, ('merged' if merged else 'ok'), (y0, CS[c])


def pose(mask):
    ys, xs = np.nonzero(mask)
    h = ys.max() - ys.min()
    band = mask[int(ys.max() - h * 0.15):ys.max() + 1]
    bx = np.nonzero(band.any(axis=0))[0]
    return h, (bx.max() - bx.min() if len(bx) else 0)


def pick(masks, rows, T):
    """Best (row, col, t0): four clean frames whose spread goes high-low-high-low
    (the gait), penalised for the figure changing height across the window --
    generation boil, which reads as the man growing as he walks."""
    best = None
    for r in rows:
        for c in range(COLS):
            for t0 in range(T - STEP * (FRAMES - 1)):
                fr = [masks.get((r, c, t0 + i * STEP)) for i in range(FRAMES)]
                if any(f is None for f in fr):
                    continue
                p = [pose(f) for f in fr]
                h = [x[0] for x in p]
                s = [x[1] for x in p]
                phase = (s[0] + s[2] - s[1] - s[3]) / max(1, np.mean(s))
                sc = phase - 3.0 * (np.std(h) / max(1, np.mean(h)))
                if best is None or sc > best[0]:
                    best = (sc, r, c, t0)
    if best is None:
        raise SystemExit('no clean window -- every candidate cell was merged')
    return best


def main(argv):
    if len(argv) < 3:
        print(__doc__, file=sys.stderr)
        return 2
    src, prefix = argv[1], argv[2]
    out_dir = os.path.join(ROOT, 'public', 'sprites', 'npc')

    print('decoding...')
    imgs = decode(src)
    T = len(imgs)
    print(f'{T} frames of {imgs[0].size[0]}x{imgs[0].size[1]}')
    keyed = [key_sheet(im) for im in imgs]
    alphas = np.stack([k[..., 3] for k in keyed]) > 128

    occ = alphas.sum(axis=0)
    CS = splits(occ.sum(axis=0).astype(float), COLS)
    RS = splits(occ.sum(axis=1).astype(float), ROWS)
    print(f'grid cols {CS}\n     rows {RS}')

    masks, origins = {}, {}
    for r in range(ROWS):
        for c in range(COLS):
            for t in range(T):
                m, st, org = figure_mask(alphas[t], r, c, CS, RS)
                if m is not None and st == 'ok':
                    masks[(r, c, t)] = m
                    origins[(r, c, t)] = org

    views = {}
    for name, rows in (('south', SOUTH_ROWS), ('east', EAST_ROWS), ('north', NORTH_ROWS)):
        sc, r, c, t0 = pick(masks, rows, T)
        views[name] = (r, c, t0)
        print(f'{name:5s}: row{r} col{c} t0={t0} score={sc:.2f}')

    # ── ONE SHARED BOX PER VIEW, ONE SHARED SCALE FOR ALL VIEWS ──
    boxes, bodies = {}, {}
    for name, (r, c, t0) in views.items():
        ms = [masks[(r, c, t0 + i * STEP)] for i in range(FRAMES)]
        b = None
        for m in ms:
            ys, xs = np.nonzero(m)
            bb = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
            b = bb if b is None else (min(b[0], bb[0]), min(b[1], bb[1]),
                                      max(b[2], bb[2]), max(b[3], bb[3]))
        boxes[name] = b
        # Body centre from the HAT band, not the box: his coat flares and the
        # box centre swings with it, which walks the anchor out from under him.
        cx = []
        for m in ms:
            ys, xs = np.nonzero(m)
            top = m[ys.min():ys.min() + max(1, int((ys.max() - ys.min()) * 0.25))]
            _, hx = np.nonzero(top)
            cx.append(hx.mean())
        bodies[name] = float(np.mean(cx))
    tallest = max(b[3] - b[1] for b in boxes.values())
    scale = (FEET_Y - TOP_Y) / tallest
    print(f'tallest view {tallest}px -> scale {scale:.3f}')

    strips = {}
    for name, (r, c, t0) in views.items():
        x0, y0, x1, y1 = boxes[name]
        strip = Image.new('RGBA', (FRAME * FRAMES, FRAME), (0, 0, 0, 0))
        for i in range(FRAMES):
            t = t0 + i * STEP
            m = masks[(r, c, t)]
            oy, ox = origins[(r, c, t)]
            sub = keyed[t][oy:oy + m.shape[0], ox:ox + m.shape[1]].copy()
            sub[..., 3] = np.where(m, sub[..., 3], 0)
            cell = Image.fromarray(sub[y0:y1, x0:x1], 'RGBA')
            tw = max(1, round(cell.width * scale))
            th = max(1, round(cell.height * scale))
            cell = cell.resize((tw, th), Image.LANCZOS)
            px = round(FRAME // 2 - (bodies[name] - x0) * scale)
            strip.alpha_composite(cell, (i * FRAME + px, FEET_Y - th))
        strips[name] = strip

    os.makedirs(out_dir, exist_ok=True)
    for d in DIRS:
        view, mirror = DIAG_FROM[d]
        s = strips[view]
        if mirror:
            # Mirror per FRAME, not the whole strip: flipping the strip would
            # also reverse the order of the four frames and run the gait backwards.
            f = Image.new('RGBA', s.size, (0, 0, 0, 0))
            for i in range(FRAMES):
                cell = s.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME))
                f.alpha_composite(cell.transpose(Image.FLIP_LEFT_RIGHT), (i * FRAME, 0))
            s = f
        s.save(os.path.join(out_dir, f'{prefix}-walk-{d}.webp'), 'WEBP',
               quality=92, method=6)
    print(f'8 strips -> {out_dir}/{prefix}-walk-*.webp')

    # ── PORTRAIT, from his own south frame, so the chip cannot drift ──
    head_src = strips['south'].crop((0, 0, FRAME, FRAME))
    hb = head_src.getbbox()
    a = np.asarray(head_src).astype(np.int16)
    r_, g_, b_, al_ = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    skin = (al_ > 128) & (r_ > 150) & (g_ > 90) & (g_ < 200) & (b_ < 175) & (r_ - b_ > 40)
    top, bot = hb[1], hb[3]
    skin[int(top + (bot - top) * 0.55):, :] = False
    ys, xs = np.nonzero(skin)
    if len(ys) > 30:
        cy, cx = ys.mean(), xs.mean()
    else:
        cy, cx = top + (bot - top) * 0.22, (hb[0] + hb[2]) / 2
    half = max(24, int((bot - top) * 0.24))
    bx0, by0 = int(cx - half), int(cy - half)
    head = head_src.crop((bx0, by0, bx0 + half * 2, by0 + half * 2))
    head.resize((96, 96), Image.LANCZOS).save(
        os.path.join(out_dir, f'{prefix}-head.webp'), 'WEBP', quality=92, method=6)
    print(f'portrait -> {out_dir}/{prefix}-head.webp ({len(ys)} skin px)')

    contact = Image.new('RGBA', (FRAME * FRAMES, FRAME * 8), (30, 40, 46, 255))
    for i, d in enumerate(DIRS):
        contact.alpha_composite(
            Image.open(os.path.join(out_dir, f'{prefix}-walk-{d}.webp')), (0, i * FRAME))
    contact.convert('RGB').save(os.path.join(ROOT, 'tools', f'{prefix}-contact.png'))
    print(f'contact sheet -> tools/{prefix}-contact.png (rows = {DIRS})')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
