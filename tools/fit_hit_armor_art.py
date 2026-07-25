#!/usr/bin/env python3
"""v2.3.1477: fit the owner's generated HIT-REACT armour art onto the hit body
sheets and emit the chest / legs gear sheets for all five base directions.

Background
----------
`public/sprites/player/hit-<dir>.png` (6 frames of 128px, all 5 dirs) is the
250 ms recoil the body plays on `_hitFlash`.  No gear sheet ever shipped for
that pose, so `getGearFrame('chest','steelplate','hit',...)` 404'd and EVERY
armour layer switched off for the whole recoil -- a fully plated knight flashed
bare every single time they took a hit.  The owner generated the missing art as
five magenta-keyed 3x2 grids (one per direction, headless full harness, frames
labelled).  This tool keys, fits, splits and seals it.

Pipeline
--------
1.  KEY.  Magenta (#FF00FF) chroma key with a despill pass, then the armour
    blobs are picked out of the grid by GREYNESS -- the labels and cell borders
    are pure black / near-white, the harness is mid-grey -- and ordered by
    (row, column) so FRAME n lands on body frame n.

2.  FIT.  ONE constant scale per direction (the median of the per-frame
    body/blob height ratios), so the armour never breathes between frames; then
    per frame the blob is placed feet-on-the-ground and centred on the body's
    own x -- the same body-anchored recipe as the chop greaves refit
    (tools/fit_chop_legs_art.py), which is what fixed "legs need to be matched
    up better".

3.  SPLIT.  The art is one harness but the game wears chest and legs as
    separate slots.  Each armour pixel is assigned to the slot whose BODY
    region it sits on (torso skin -> chest, trousers/boots -> legs), nearest
    region wins for pixels off the silhouette.  So chest-only wear still shows
    bare legs and legs-only still shows a bare chest.

4.  SEAL (owner: "make sure you remove the body beneath completely when the
    full armor is worn.  Otherwise AI drift will make the naked body beneath
    poke out").  After placement, any body pixel BELOW THE NECK that the art
    misses is filled from the nearest armour pixel, into that region's own
    sheet.  Coverage is then exact by construction: with both pieces worn there
    is no lit body pixel left to poke through, whatever the art did.

The head is never touched -- the runtime restores the head band over the plate,
and the head mask here keeps the art off the jaw.

Run from the repo root:
    python3 tools/fit_hit_armor_art.py <art-dir>
where <art-dir> holds south.png / southwest.png / east.png / northeast.png /
north.png as exported from the generator.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

DIRS = ['south', 'southwest', 'east', 'northeast', 'north']
FW = FH = 128
NFRAMES = 6

BODY = 'public/sprites/player/hit-{dir}.png'
OUT_CHEST = 'public/sprites/gear/chest/steelplate/hit-{dir}.png'
OUT_LEGS = 'public/sprites/gear/legs/steelgreaves/hit-{dir}.png'

# Explicit head box (y0, y1, x0, x1) for the one frame the detector below
# cannot resolve: south f1 is the impact frame and its skull runs straight into
# the shoulders with no neck to find -- measured row widths 30 (skull), 26
# (neck), 34 (shoulder).  Stated outright rather than guessed at.
HEAD_BOX = {('south', 1): (12, 37, 43, 82)}


# ---------------------------------------------------------------- body pixels
# Mirrors playerSkins.js `_isSkin` / the pants + boots branches of
# recolorBodyToCanvas, so a pixel is binned here exactly as the runtime
# recolour bins it.
def is_skin(r, g, b, a):
    return (a > 40) & (r > g) & (g >= b) & ((r.astype(int) - b) > 30) & \
           (r > 90) & ((r.astype(int) - g) > 25)


def is_pants(r, g, b, a):
    return (a > 180) & (g.astype(int) >= r.astype(int) - 10) & \
           (g.astype(int) > b.astype(int) + 8) & (r < 150)


def is_boots(r, g, b, a):
    mx = np.maximum(np.maximum(r, g), b).astype(int)
    mn = np.minimum(np.minimum(r, g), b).astype(int)
    return (a > 180) & ((mx - mn) < 28) & (mx >= 45) & (mx < 140)


def is_face(frame):
    """Pure-white pixels -- eyes and bared teeth.  The only white on the figure,
    and what tells the head blob from a shoulder on the doubled-over frames."""
    r, g, b, a = frame[:, :, 0], frame[:, :, 1], frame[:, :, 2], frame[:, :, 3]
    return (a > 200) & (r > 195) & (g > 195) & (b > 185)


def clean(mask, minpx=20):
    """Drop speckle components from a colour classification -- the palette
    rules fire on stray anti-aliased pixels far from their region (measured:
    `is_pants` matched shadow pixels up in the HEAD on hit-south f1)."""
    lbl, n = ndimage.label(mask)
    if not n:
        return mask
    keep = np.zeros(n + 1, bool)
    for k in range(1, n + 1):
        keep[k] = (lbl == k).sum() >= minpx
    return keep[lbl]


# ------------------------------------------------------------------ head mask
ERODES = range(6, 13)     # neck-pinch erosion depths searched per frame
HWIDTHS = range(5, 12)    # half-widths for the horizontal neck cut


def _disk(r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    return (x * x + y * y) <= r * r


def _trim_neck(head):
    """Drop bottom rows much narrower than the skull's widest row -- that is
    throat, and the shipped harness collars right up under the jaw.  Capped at
    4 rows / 0.45 ratio; an uncapped 0.62 cut ate the whole tapering jaw of the
    front-facing head (south f0 came out a 426px skull)."""
    w = head.sum(axis=1)
    rows = np.nonzero(w)[0]
    if len(rows):
        cut = 0.45 * w.max()
        y, k = rows[-1], 0
        while y > rows[0] and k < 4 and w[y] < cut:
            head[y] = False
            y -= 1
            k += 1
    return head


def _head_at(alive, e):
    """Head candidate for one isotropic depth, taking the TOPMOST core."""
    core = ndimage.binary_erosion(alive, np.ones((3, 3), bool), iterations=e)
    lbl, n = ndimage.label(core)
    if not n:
        return None
    row = lbl[np.nonzero(core.any(axis=1))[0][0]]
    top = int(row[np.nonzero(row)[0][0]])
    return _trim_neck(ndimage.binary_dilation(lbl == top, _disk(e + 1)) & alive)


def _all_blobs(alive):
    """Every head candidate the erosion sweeps can produce, as
    (blob, area, fill, aspect, top).

    Two families, because one is not enough: ISOTROPIC erosion separates head
    from torso on most frames, and HORIZONTAL-ONLY erosion severs the neck
    without shortening the skull -- on south f1 the isotropic sweep never
    splits them at any depth."""
    families = [(np.ones((3, 3), bool), e) for e in ERODES] + \
               [(np.ones((1, 2 * k + 1), bool), 1) for k in HWIDTHS]
    out = []
    for elem, iters in families:
        core = ndimage.binary_erosion(alive, elem, iterations=iters)
        lbl, n = ndimage.label(core)
        for k in range(1, n + 1):
            c = lbl == k
            if c.sum() < 8:
                continue
            if elem.shape[0] == 1:
                blob = ndimage.binary_dilation(c, elem, iterations=iters) & alive
            else:
                blob = ndimage.binary_dilation(c, _disk(iters + 1)) & alive
            blob = _trim_neck(blob)
            area = int(blob.sum())
            if area < 150 or area > 1600:
                continue
            yy, xx = np.nonzero(blob)
            h = yy.max() - yy.min() + 1
            w = xx.max() - xx.min() + 1
            out.append((blob, area, area / float(h * w),
                        min(h, w) / float(max(h, w)), int(yy.min())))
    return out


def head_masks(frames, faces, overrides):
    """Per-frame head masks for one direction's 6 hit frames.

    A horizontal row split fails on this pose set -- the recoil throws the head
    forward/back and the arms out, so the alpha width profile has no reliable
    neck minimum (measured: it put the "neck" at 74% of figure height on
    southwest f0).  Erosion severs the neck instead; the surviving cores are
    scored on size, solidity, squareness and height in the figure, because each
    of the wrong answers looks right on some of those alone -- the SHOULDER is
    the topmost blob once the bro doubles over, and the PELVIS is the roundest
    one."""
    # Head SIZE target: the smallest non-degenerate blob the TOPMOST-core sweep
    # yields per frame, median'd.  It must come from the topmost sweep, not
    # from every blob -- taking the global minimum picks up a BOOT (~250px),
    # which dragged the whole search onto small blobs and left the real head
    # inside the body target, where the seal then filled it with black.
    tops = []
    for a in frames:
        areas = [int(c.sum()) for c in (_head_at(a, e) for e in ERODES)
                 if c is not None and c.sum() > 60]
        if areas:
            tops.append(min(areas))
    target = float(np.median(tops)) if tops else 600.0

    out = []
    for i, a in enumerate(frames):
        if i in overrides:
            y0, y1, x0, x1 = overrides[i]
            box = np.zeros_like(a)
            box[y0:y1 + 1, x0:x1 + 1] = True
            out.append(a & box)
            continue
        blobs = _all_blobs(a)
        # A face pixel pins the head -- but ONLY if the blob it lands in is
        # head-sized.  south f1 draws a white IMPACT SPARK on the chest, and
        # without that gate the spark handed the whole torso to the head mask.
        # >=4 white pixels, or it is not a face: a real eye/teeth cluster is
        # 8-17px, while north f2 and south f5 carry a single stray white pixel
        # each -- and north f2's happens to sit on the SHOULDER, which was
        # enough to hand it the head mask.
        has_face = int(faces[i].sum()) >= 4
        faced = [b for b in blobs if has_face and (b[0] & faces[i]).any()
                 and abs(b[1] - target) < 0.6 * target]
        pool = faced or blobs
        rows = np.nonzero(a.any(axis=1))[0]
        f0 = float(rows[0]) if len(rows) else 0.0
        fh = float(rows[-1] - rows[0] + 1) if len(rows) else 1.0
        if not pool:
            out.append(np.zeros_like(a))
            continue
        best = min(pool, key=lambda b:
                   abs(b[1] - target) / target + 1.2 * (1.0 - b[2]) +
                   0.8 * (1.0 - b[3]) + 1.2 * (b[4] - f0) / fh)[0]
        out.append(_refine(best, target))
    return out


def _refine(blob, target):
    """Shave a shoulder off a head blob that came back too big.

    The head mask is doing two jobs: it keeps the art off the jaw, and its
    complement is the body that MUST be covered.  So an over-large head is not
    harmless -- on north/northeast f2 it swallowed a slice of upper back, which
    then sat outside the seal region and showed as bare skin through the
    finished plate.  Eroding the BLOB (rather than the whole figure) splits it
    at the neck where the figure-wide sweep could not, and the piece closest to
    the direction's head size is kept."""
    if blob.sum() <= 1.35 * target:
        return blob
    rows = np.nonzero(blob.any(axis=1))[0]
    b0, bh = float(rows[0]), float(rows[-1] - rows[0] + 1)
    for e in range(2, 9):
        lbl, n = ndimage.label(ndimage.binary_erosion(blob, _disk(e)))
        if n < 2:
            continue
        parts = []
        for k in range(1, n + 1):
            grown = ndimage.binary_dilation(lbl == k, _disk(e)) & blob
            gr = np.nonzero(grown.any(axis=1))[0]
            if not len(gr):
                continue
            # size AND height: on north f2 the severed shoulder happens to be
            # closer to head-size than the head is, so picking on area alone
            # handed the mask to the shoulder and left the real head plated.
            parts.append((abs(int(grown.sum()) - target) / target +
                          1.0 * (gr[0] - b0) / bh, grown))
        if not parts:
            continue
        cand = min(parts, key=lambda t: t[0])[1]
        if abs(int(cand.sum()) - target) < 0.45 * target:
            return cand
    return blob


# --------------------------------------------------------------- the art grid
def key_magenta(img):
    """Chroma-key the magenta backdrop and despill the fringe."""
    a = np.array(img.convert('RGB')).astype(int)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    mag = (r > 150) & (b > 150) & (r - g > 60) & (b - g > 60)
    out = np.zeros(a.shape[:2] + (4,), np.uint8)
    keep = ~mag
    px = a[keep]
    # despill: pull R and B down to G wherever the magenta bled into the edge
    m = np.minimum(px[:, 0], px[:, 2])
    spill = np.clip(m - px[:, 1], 0, None)
    px = np.stack([px[:, 0] - spill, px[:, 1], px[:, 2] - spill], axis=1)
    out[keep] = np.concatenate([np.clip(px, 0, 255),
                                np.full((len(px), 1), 255)], axis=1)
    return out


def art_frames(path):
    """The 6 armour blobs from a generated grid, in FRAME order.

    Labels and cell borders survive the chroma key, so the harness is isolated
    by GREYNESS (the text is pure black, the borders near-white) and the six
    largest survivors are sorted by (row, column)."""
    rgba = key_magenta(Image.open(path))
    r, g, b, a = (rgba[:, :, i].astype(int) for i in range(4))
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    sat = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    grey = (a > 0) & (sat < 70) & (lum > 45) & (lum < 235)
    grey = ndimage.binary_closing(grey, np.ones((3, 3), bool), iterations=2)
    lbl, n = ndimage.label(ndimage.binary_dilation(grey, np.ones((5, 5), bool)))
    blobs = []
    for k in range(1, n + 1):
        m = (lbl == k) & (a > 0)
        if m.sum() < 1500:
            continue
        yy, xx = np.nonzero(m)
        h, w = yy.max() - yy.min() + 1, xx.max() - xx.min() + 1
        if min(h, w) < 30:          # a border line, not a figure
            continue
        blobs.append((m, yy.mean(), xx.mean(), int(m.sum())))
    blobs.sort(key=lambda t: -t[3])
    blobs = blobs[:NFRAMES]
    if len(blobs) != NFRAMES:
        raise SystemExit(f'{path}: found {len(blobs)} armour blobs, expected 6')
    rowsplit = (min(t[1] for t in blobs) + max(t[1] for t in blobs)) / 2
    blobs.sort(key=lambda t: (t[1] > rowsplit, t[2]))
    return [(rgba, m) for m, _y, _x, _n in blobs]


def crop(rgba, mask):
    yy, xx = np.nonzero(mask)
    y0, y1, x0, x1 = yy.min(), yy.max() + 1, xx.min(), xx.max() + 1
    sub = rgba[y0:y1, x0:x1].copy()
    sub[~mask[y0:y1, x0:x1]] = 0
    return sub


# --------------------------------------------------------------------- fitter
SCALES = np.arange(0.20, 0.60, 0.005)


def _scaled(piece, s):
    p = np.array(Image.fromarray(piece).resize(
        (max(1, int(round(piece.shape[1] * s))),
         max(1, int(round(piece.shape[0] * s)))), Image.LANCZOS))
    p[:, :, 3] = np.where(p[:, :, 3] > 120, 255, 0)
    return p


def _score_map(target):
    """+1 for every body pixel the armour covers, -0.5 for armour that lands
    well clear of the body.  The 3px grace band is deliberate -- a plate is
    meant to stand slightly proud of the limb it wraps."""
    near = ndimage.binary_dilation(target, _disk(3))
    return np.where(target, 1.0, np.where(near, 0.0, -0.5))


def _corr_peak(sm, mask):
    """Best (dy, dx) and score for sliding `mask` over score map `sm`."""
    from scipy.signal import fftconvolve
    h, w = mask.shape
    pad = np.zeros((FH + 2 * h, FW + 2 * w))
    pad[h:h + FH, w:w + FW] = sm
    pad[:h, :] = -0.5
    pad[h + FH:, :] = -0.5
    pad[:, :w] = -0.5
    pad[:, w + FW:] = -0.5
    c = fftconvolve(pad, mask[::-1, ::-1].astype(float), mode='valid')
    k = int(np.argmax(c))
    dy, dx = divmod(k, c.shape[1])
    return (dy - h, dx - w), float(c.flat[k])


def _best_fit(piece, target):
    sm = _score_map(target)
    best = (1.0, -1e18, (0, 0))
    for s in SCALES:
        p = _scaled(piece, s)
        m = p[:, :, 3] > 0
        if not m.any() or m.shape[0] > FH + 40 or m.shape[1] > FW + 40:
            continue
        off, sc = _corr_peak(sm, m)
        if sc > best[1]:
            best = (float(s), sc, off)
    return best


def _place(piece, target, s):
    """Drop the armour onto a 128x128 frame at the fixed scale, offset solved
    by the same overlap correlation."""
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
    for d in DIRS:
        body = np.array(Image.open(BODY.format(dir=d)).convert('RGBA'))
        frames = [body[:, i * FW:(i + 1) * FW] for i in range(NFRAMES)]
        alive = [f[:, :, 3] > 40 for f in frames]
        heads = head_masks(alive, [is_face(f) for f in frames],
                           {fi: box for (dd, fi), box in HEAD_BOX.items()
                            if dd == d})
        art = [crop(rgba, m) for rgba, m in art_frames(f'{art_dir}/{d}.png')]

        # ---- body target: everything below the neck, split into slots ----
        torso, legsr, target = [], [], []
        for i, f in enumerate(frames):
            r, g, b, a = f[:, :, 0], f[:, :, 1], f[:, :, 2], f[:, :, 3]
            head = heads[i]
            sk = clean(is_skin(r, g, b, a) & ~head)
            pa = clean(is_pants(r, g, b, a) & ~head)
            bo = clean(is_boots(r, g, b, a) & ~head)
            leg = pa | bo
            other = alive[i] & ~head & ~sk & ~leg
            if leg.any() and sk.any():
                dl = ndimage.distance_transform_edt(~leg)
                dt = ndimage.distance_transform_edt(~sk)
                torso.append(sk | (other & (dl > dt)))
                legsr.append(leg | (other & (dl <= dt)))
            else:
                torso.append(sk | (other if not leg.any() else np.zeros_like(other)))
                legsr.append(leg | (other if not sk.any() else np.zeros_like(other)))
            target.append(torso[-1] | legsr[-1])

        # ---- fit by OVERLAP, one scale for the whole direction ----
        # Bounding boxes do not work here.  The art is headless, so its box top
        # is the collar, while the body's box top is whichever limb the recoil
        # threw highest -- matching them dropped the whole harness ~20px too
        # high and buried the head under the pauldrons.  Overlap with the
        # body-minus-head mask is the thing we actually want maximised, so
        # maximise it directly: per scale, one FFT correlation against a score
        # map that pays for covering the body and charges for spilling far off
        # it.  Scale is then locked to the median best across the six frames,
        # so the armour cannot breathe between frames, and only the offsets are
        # re-solved at that fixed scale.
        fits = [_best_fit(art[i], target[i]) for i in range(NFRAMES)]
        s = float(np.median([f[0] for f in fits]))
        placed = [_place(art[i], target[i], s) for i in range(NFRAMES)]

        chest_f, legs_f = [], []
        for i in range(NFRAMES):
            canvas = placed[i]
            # never cover the head: the runtime paints the bare head over the
            # plate, and a plated jaw reads as a helmet the set does not have
            canvas[ndimage.binary_erosion(heads[i], np.ones((3, 3), bool))] = 0

            worn = canvas[:, :, 3] > 0
            # ---- slot split + seal ----
            dt = ndimage.distance_transform_edt(~torso[i]) if torso[i].any() \
                else np.full((FH, FW), 1e6)
            dl = ndimage.distance_transform_edt(~legsr[i]) if legsr[i].any() \
                else np.full((FH, FW), 1e6)
            to_chest = worn & (dt <= dl)
            to_legs = worn & (dt > dl)

            chest = np.zeros((FH, FW, 4), np.uint8)
            legs = np.zeros((FH, FW, 4), np.uint8)
            chest[to_chest] = canvas[to_chest]
            legs[to_legs] = canvas[to_legs]

            for region, sheet in ((torso[i], chest), (legsr[i], legs)):
                gap = region & ~worn
                painted = sheet[:, :, 3] > 0
                if not gap.any() or not painted.any():
                    continue
                # Fill from the nearest painted armour pixel of this slot --
                # but never from an OUTLINE pixel.  The art's silhouette is a
                # near-black keyline, and it is always the closest source to a
                # gap at the plate's edge, so sourcing blind smeared black
                # blobs (a whole black head on the first cut).
                lum = sheet[:, :, :3].astype(float) @ [0.299, 0.587, 0.114]
                lit = painted & (lum > np.percentile(lum[painted], 30))
                src = lit if lit.any() else painted
                idx = ndimage.distance_transform_edt(
                    ~src, return_distances=False, return_indices=True)
                sheet[gap] = sheet[idx[0][gap], idx[1][gap]]

            chest_f.append(chest)
            legs_f.append(legs)
            bare = int((target[i] & ~((chest[:, :, 3] > 0) |
                                      (legs[:, :, 3] > 0))).sum())
            print(f'{d} f{i}: scale {s:.3f}  chest {int((chest[:,:,3]>0).sum()):4d}'
                  f'  legs {int((legs[:,:,3]>0).sum()):4d}  uncovered body {bare}')

        for arrs, path in ((chest_f, OUT_CHEST), (legs_f, OUT_LEGS)):
            sheet = np.concatenate(arrs, axis=1)
            Image.fromarray(sheet).save(path.format(dir=d))
            print('wrote', path.format(dir=d), sheet.shape)


if __name__ == '__main__':
    main()
