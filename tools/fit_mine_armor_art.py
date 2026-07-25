#!/usr/bin/env python3
"""v2.3.1478: fit the owner's generated MINING armour art onto mine-south.png
and emit the chest / legs gear sheets for the pickaxe swing.

Background
----------
`public/sprites/player/mine-south.png` is 14 south-only frames of the mining
loop.  Like the hit react before v2.3.1477, it never shipped a gear sheet, so
`getGearFrame('chest','steelplate','mine','south',...)` 404'd and the player
mined bare-chested no matter what they wore (owner: "it looked like there was
no chest armor while I was mining the ore").

Same recipe as tools/fit_hit_armor_art.py -- key the magenta grid, fit by
overlap at one constant scale, split the harness into the chest/legs slots by
the body region under each pixel, seal what the art misses -- with two things
this pose needs and the hit pose did not:

  * THE PICKAXE AND THE ROCK ARE BAKED INTO THE BODY SHEET, and both draw in
    FRONT of the character (the axe crosses his hips on the strike frames, the
    ore boulder covers his shins).  Gear draws above the body sprite, so armour
    laid over them would swallow both.  They are cut back out of the finished
    plate, and they are excluded from the fit and the seal so neither gets
    plated over.

  * THE HANDLE IS SKIN-COLOURED to the shared classifier.  Measured, the
    pickaxe shaft is (165,116,70) and passes every `_isSkin` test in
    playerSkins; the bro's skin is (237,133,55).  They separate cleanly on
    red-minus-green (49 vs ~104), so the skin rule here carries an extra
    `r - g > 70`.

The boots are deliberately NOT part of the seal: the ore boulder is drawn in
the same neutral greys as the character's boots (measured (94,95,98) /
(72,71,74) in both), so no colour rule can tell them apart, and sealing greys
would paint steel over the rock.  Nothing is lost by it -- what reads as
"naked" is orange skin and green trousers, both of which ARE sealed, and the
boulder covers the feet in every frame anyway.

Run from the repo root:
    python3 tools/fit_mine_armor_art.py <art-dir>
where <art-dir> holds mine.png as exported from the generator.
"""
import importlib.util
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

# the hit-pose fitter owns the head finder; load it as a module rather than
# copying 100 lines of morphology that took a dozen measured iterations to get
# right (see its head_masks docstring)
_spec = importlib.util.spec_from_file_location(
    'fit_hit_armor_art',
    os.path.join(os.path.dirname(os.path.abspath(__file__)),
                 'fit_hit_armor_art.py'))
_hit = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_hit)

FW = FH = 128
NFRAMES = 14
COLS = 5

BODY = 'public/sprites/player/mine-south.png'
OUT_CHEST = 'public/sprites/gear/chest/steelplate/mine-south.png'
OUT_LEGS = 'public/sprites/gear/legs/steelgreaves/mine-south.png'


def _disk(r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    return (x * x + y * y) <= r * r


# ---------------------------------------------------------------- body pixels
def classify(f):
    """(skin, pants, prop) for one mining frame.

    `prop` is everything alive that is neither: the pickaxe, the boulder, their
    outlines and the strike sparks.  It is what gets cut back out of the plate
    so those keep drawing in front."""
    r, g, b, a = (f[:, :, k].astype(int) for k in range(4))
    alive = a > 40
    # + (r - g) > 70 vs playerSkins' 25 -- see the module docstring: the
    # pickaxe shaft passes the shared skin test otherwise.
    skin = alive & (r > g) & (g >= b) & ((r - b) > 30) & (r > 90) & \
        ((r - g) > 70)
    pants = (a > 180) & (g >= r - 10) & (g > b + 8) & (r < 150)
    body = skin | pants
    # the black keyline belongs to the figure wherever it hugs the figure
    outline = alive & ~body & ndimage.binary_dilation(body, _disk(2))
    lum = f[:, :, :3].astype(float) @ [0.299, 0.587, 0.114]
    outline &= lum < 90
    return skin, pants | outline, alive & ~(body | outline)


def head_masks(bodies):
    """Head masks for the 14 mining frames, from the WIDTH PROFILE.

    Two rules were tried and dropped first.  A "topmost eroded skin blob" rule
    failed the way the hit pose's first attempt did -- he is shirtless, so head
    and torso are one skin region, and eroding far enough to isolate anything
    head-sized just leaves the thickest part, which put the mask on his chest.
    Borrowing the v2.3.1477 finder wholesale did no better: its head-size
    estimate comes out at ~200px here against a real head of ~450, so it kept
    the skull inside the body target, the fit stretched the harness up to cover
    it, and the plate swallowed his head.

    The profile works here precisely where it failed there: this pose is
    upright and south-facing in all 14 frames, so the head genuinely does
    widen, pinch at the neck, then widen again at the shoulders.  The scan
    starts from where the HEAD starts (the first row at least HEAD_W wide) and
    not from the top of the figure, because the raised pickaxe arm sits above
    the skull for half the loop.  Ties in the minimum take the LOWEST row: a
    collar a little deep leaves a sliver of throat, a collar too high plates
    the jaw."""
    HEAD_W = 15
    out = []
    for body in bodies:
        w = body.sum(axis=1)
        rows = np.nonzero(w)[0]
        wide = np.nonzero(w >= HEAD_W)[0]
        if not len(rows) or not len(wide):
            out.append(np.zeros_like(body))
            continue
        h0 = int(wide[0])
        lo, hi = h0 + 12, min(int(rows[-1]) - 1, h0 + 30)
        if hi <= lo:
            out.append(np.zeros_like(body))
            continue
        band = w[lo:hi + 1]
        neck = lo + int(np.max(np.nonzero(band == band.min())[0])) + 1
        above = body.copy()
        above[neck:] = False
        lbl, n = ndimage.label(above)
        if not n:
            out.append(np.zeros_like(body))
            continue
        sizes = [int((lbl == k).sum()) for k in range(1, n + 1)]
        blob = lbl == (int(np.argmax(sizes)) + 1)
        # The raised pickaxe arm passes right beside the skull, so above the
        # neck it is JOINED to the head -- and a head mask that swallows the
        # arm takes the arm out of the body target too, which is why the first
        # fitted knight mined with a bare orange forearm.  One erosion severs
        # it: the arm is ~10px across, the skull ~28.
        # fill the eyes/mouth first: they are white and dark-brown, so neither
        # the skin rule nor the keyline rule claims them, and the resulting
        # holes shredded the erosion (a 723px head eroded to 19px, and the mask
        # that came back was a coin on his forehead)
        blob = ndimage.binary_fill_holes(blob)
        core = ndimage.binary_erosion(blob, _disk(5))
        clbl, cn = ndimage.label(core)
        if cn:
            csz = [int((clbl == k).sum()) for k in range(1, cn + 1)]
            skull = clbl == (int(np.argmax(csz)) + 1)
            blob = ndimage.binary_dilation(skull, _disk(6)) & blob
        out.append(blob)
    return out


# --------------------------------------------------------------- the art grid
def key_magenta(img):
    a = np.array(img.convert('RGB')).astype(int)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    mag = (r > 150) & (b > 150) & (r - g > 60) & (b - g > 60)
    out = np.zeros(a.shape[:2] + (4,), np.uint8)
    keep = ~mag
    px = a[keep]
    m = np.minimum(px[:, 0], px[:, 2])
    spill = np.clip(m - px[:, 1], 0, None)
    px = np.stack([px[:, 0] - spill, px[:, 1], px[:, 2] - spill], axis=1)
    out[keep] = np.concatenate([np.clip(px, 0, 255),
                                np.full((len(px), 1), 255)], axis=1)
    return out


def art_frames(path):
    """The 14 armour blobs from the generated grid, in FRAME order.  The frame
    labels survive the chroma key, so the harness is isolated by GREYNESS (the
    text is pure black) and the survivors are sorted into rows of COLS."""
    rgba = key_magenta(Image.open(path))
    r, g, b, a = (rgba[:, :, i].astype(int) for i in range(4))
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    sat = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    grey = (a > 0) & (sat < 70) & (lum > 45) & (lum < 235)
    grey = ndimage.binary_closing(grey, np.ones((3, 3), bool), iterations=2)

    # Cut the grid by PROJECTION, not by connectivity.  Taking connected
    # components and keeping the 14 biggest silently amputated every raised
    # arm: the generator draws the forearm a pixel clear of the pauldron on the
    # windup frames, so it labels as its own small blob and loses the
    # size cutoff -- the fitted knight mined with a bare orange arm.  Rows and
    # then columns of empty space are unambiguous here and keep every piece of
    # a cell together.
    def bands(flags, gap=12):
        out, start = [], None
        for i, v in enumerate(flags):
            if v and start is None:
                start = i
            elif not v and start is not None:
                if i - start >= 8:
                    out.append((start, i - 1))
                start = None
        if start is not None:
            out.append((start, len(flags) - 1))
        merged = [out[0]] if out else []
        for lo, hi in out[1:]:
            if lo - merged[-1][1] <= gap:
                merged[-1] = (merged[-1][0], hi)
            else:
                merged.append((lo, hi))
        return merged

    cells = []
    for r0, r1 in bands(grey.any(axis=1)):
        strip = grey[r0:r1 + 1]
        for c0, c1 in bands(strip.any(axis=0)):
            if strip[:, c0:c1 + 1].sum() < 1200:
                continue
            cells.append((r0, r1, c0, c1))
    if len(cells) != NFRAMES:
        raise SystemExit(f'{path}: found {len(cells)} cells, expected {NFRAMES}')
    out = []
    for r0, r1, c0, c1 in cells:
        m = grey[r0:r1 + 1, c0:c1 + 1]
        sub = rgba[r0:r1 + 1, c0:c1 + 1].copy()
        sub[~m] = 0
        yy, xx = np.nonzero(m)
        out.append(sub[yy.min():yy.max() + 1, xx.min():xx.max() + 1])
    return out


# --------------------------------------------------------------------- fitter
SCALES = np.arange(0.20, 0.60, 0.005)


def _scaled(piece, s):
    p = np.array(Image.fromarray(piece).resize(
        (max(1, int(round(piece.shape[1] * s))),
         max(1, int(round(piece.shape[0] * s)))), Image.LANCZOS))
    p[:, :, 3] = np.where(p[:, :, 3] > 120, 255, 0)
    return p


def _corr_peak(sm, mask):
    from scipy.signal import fftconvolve
    h, w = mask.shape
    pad = np.full((FH + 2 * h, FW + 2 * w), -0.5)
    pad[h:h + FH, w:w + FW] = sm
    c = fftconvolve(pad, mask[::-1, ::-1].astype(float), mode='valid')
    k = int(np.argmax(c))
    dy, dx = divmod(k, c.shape[1])
    return (dy - h, dx - w), float(c.flat[k])


def _score_map(target):
    """+1 for body covered, -0.5 for armour landing well clear of it.  The 3px
    grace band is deliberate: a plate stands slightly proud of the limb."""
    near = ndimage.binary_dilation(target, _disk(3))
    return np.where(target, 1.0, np.where(near, 0.0, -0.5))


def _place(piece, target, s):
    p = _scaled(piece, s)
    m = p[:, :, 3] > 0
    canvas = np.zeros((FH, FW, 4), np.uint8)
    if not m.any():
        return canvas
    (dy, dx), _ = _corr_peak(_score_map(target), m)
    ys0, xs0 = max(0, dy), max(0, dx)
    ys1, xs1 = min(FH, dy + p.shape[0]), min(FW, dx + p.shape[1])
    if ys1 > ys0 and xs1 > xs0:
        canvas[ys0:ys1, xs0:xs1] = p[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
    return canvas


def main():
    art_dir = sys.argv[1] if len(sys.argv) > 1 else '.'
    sheet = np.array(Image.open(BODY).convert('RGBA'))
    frames = [sheet[:, i * FW:(i + 1) * FW] for i in range(NFRAMES)]
    art = art_frames(f'{art_dir}/mine.png')

    cls = [classify(f) for f in frames]
    heads = head_masks([sk | lp for sk, lp, _p in cls])
    torso, legsr, target, props = [], [], [], []
    for (skin, legpx, prop), head in zip(cls, heads):
        # the black keyline is split between the slots by whichever region it
        # hugs -- lumping it into the leg mask (first cut) dragged most of the
        # torso plate into the greaves sheet: chest came out ~850px against
        # ~1550 for the legs, on a figure that is mostly torso
        pants = legpx & ~ndimage.binary_dilation(skin, _disk(1))
        outline = legpx & ~pants
        if pants.any() and skin.any():
            dl = ndimage.distance_transform_edt(~pants)
            dt = ndimage.distance_transform_edt(~skin)
            torso.append((skin | (outline & (dl > dt))) & ~head)
            legsr.append((pants | (outline & (dl <= dt))) & ~head)
        else:
            torso.append(skin & ~head)
            legsr.append(legpx & ~head)
        target.append(torso[-1] | legsr[-1])
        props.append(prop)

    # one scale for the whole sheet -- the armour must not breathe between
    # frames of a loop that plays for the entire gather
    best = []
    for i in range(NFRAMES):
        sm = _score_map(target[i])
        top = (0.0, -1e18)
        for s in SCALES:
            p = _scaled(art[i], s)
            m = p[:, :, 3] > 0
            if not m.any() or m.shape[0] > FH + 40 or m.shape[1] > FW + 40:
                continue
            _off, sc = _corr_peak(sm, m)
            if sc > top[1]:
                top = (float(s), sc)
        best.append(top[0])
    s = float(np.median(best))

    chest_f, legs_f = [], []
    for i in range(NFRAMES):
        canvas = _place(art[i], target[i], s)
        canvas[ndimage.binary_erosion(heads[i], np.ones((3, 3), bool))] = 0
        # the axe and the boulder draw in FRONT of the character -- cut them
        # back out or the plate swallows both
        canvas[props[i]] = 0
        worn = canvas[:, :, 3] > 0

        dt = ndimage.distance_transform_edt(~torso[i]) if torso[i].any() \
            else np.full((FH, FW), 1e6)
        dl = ndimage.distance_transform_edt(~legsr[i]) if legsr[i].any() \
            else np.full((FH, FW), 1e6)
        chest = np.zeros((FH, FW, 4), np.uint8)
        legs = np.zeros((FH, FW, 4), np.uint8)
        chest[worn & (dt <= dl)] = canvas[worn & (dt <= dl)]
        legs[worn & (dt > dl)] = canvas[worn & (dt > dl)]

        for region, sh in ((torso[i], chest), (legsr[i], legs)):
            gap = region & ~worn & ~props[i]
            painted = sh[:, :, 3] > 0
            if not gap.any() or not painted.any():
                continue
            # never source the fill from the art's near-black keyline: it is
            # always the closest pixel to a gap at the plate edge, and blind
            # sourcing smears black blobs (v2.3.1477 incident)
            lum = sh[:, :, :3].astype(float) @ [0.299, 0.587, 0.114]
            lit = painted & (lum > np.percentile(lum[painted], 30))
            src = lit if lit.any() else painted
            idx = ndimage.distance_transform_edt(~src, return_distances=False,
                                                 return_indices=True)
            sh[gap] = sh[idx[0][gap], idx[1][gap]]

        chest_f.append(chest)
        legs_f.append(legs)
        bare = int((target[i] & ~props[i] &
                    ~((chest[:, :, 3] > 0) | (legs[:, :, 3] > 0))).sum())
        print(f'f{i:2d}: scale {s:.3f}  chest {int((chest[:,:,3]>0).sum()):4d}'
              f'  legs {int((legs[:,:,3]>0).sum()):4d}  uncovered body {bare}')

    for arrs, path in ((chest_f, OUT_CHEST), (legs_f, OUT_LEGS)):
        out = np.concatenate(arrs, axis=1)
        Image.fromarray(out).save(path)
        print('wrote', path, out.shape)


if __name__ == '__main__':
    main()
