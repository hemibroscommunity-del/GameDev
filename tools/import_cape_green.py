#!/usr/bin/env python3
"""v2.3.2022: import a CAPE from a GREEN-SILHOUETTE sheet.

The sibling of import_headwear_green.py, and it keys the same way:

    cape = every pixel that is neither the magenta backdrop nor the green person

WHY THE SHEET'S OWN LAYOUT CANNOT BE TRUSTED.  make_cape_mannequin.py writes a
JSON sidecar mapping every cell back to 256-space, and it would be lovely to
read the cape straight out of it.  Measured on the first real sheet: the
generator returned 1853x849 for a 2798x1130 reference -- resized, and resized
NON-UNIFORMLY (0.662 across, 0.751 down).  The cell outlines came back partial.
So the sidecar is a convenience when the generator behaves and never a
correctness dependency; this tool finds the cells and fits each one.

HOW A CELL IS REGISTERED.  Not by its box, by the FIGURE.  The green silhouette
is the body, at the size and position the generator drew it, so fitting green
against the real stand-<dir> body recovers scale and offset -- and the fit score
doubles as a fidelity check on how faithfully the figure was redrawn, exactly
as it does for headwear.

The one thing that differs from a hat, and it matters: a hat covers the head,
so green is nearly the whole body and the fit is easy.  A CAPE COVERS MOST OF
THE BODY -- on north almost all of it -- so green is a strict SUBSET with big
holes.  A plain overlap score would then be maximised by any tiny scale that
tucks green somewhere inside the body.  So the score REWARDS explained green
and PENALISES spill:

    score = |green n body| - SPILL * |green \\ body|

which grows with scale until the silhouette starts hanging outside the body,
and is therefore maximised at the true fit rather than at zero.

Run from the repo root:
    python3 tools/import_cape_green.py --art sheet.png --id crimson --name "Crimson Cape"
    [--debug DIR]   per-direction overlays of the fit, which is the only
                    honest way to confirm a registration
"""
import argparse, json, os
import numpy as np
from PIL import Image

DIRS = ['south', 'southwest', 'east', 'northeast', 'north']
BODY = 'public/sprites/player/stand-{dir}.png'
OUT = 'public/sprites/traits/cape/{id}'
FRAME = 256
SPILL = 3.0          # how much a green pixel outside the body costs, vs one inside
ALPHA_T = 110
MIN_PIECE = 20       # a cape is one piece; anything smaller is keying residue        # the art arrives resampled; threshold it back to crisp edges

# ═══ v2.3.2122: THE ONE THING THE FEET CANNOT TELL YOU ═══
# Owner: "Find how the cape sits on the character it needs to go down a bit.
# South view shows it sitting over the mouth."
#
# It did: measured, the collar covered 25 of the 39 pixels of the south mouth,
# and the hood floated 21px clear of the crown against southwest's 9.
#
# WHY THE FIT COULD NOT SEE IT.  The registration is FEET-ANCHORED -- soles to
# soles -- because the feet are the one landmark a cape never covers, and the
# score is inside-minus-spill over the WHOLE silhouette.  Both are right, and
# both are blind here: a hood that rides a little high costs a handful of spill
# pixels against a 4881-pixel body, which is nothing next to the scale term it
# is traded against.  The fit is optimising total overlap; nobody asked it
# about the face, and the face is the only place a few pixels are worth more
# than a few hundred anywhere else.
#
# So this is a CORRECTION, not a parameter: a number measured off the rendered
# result and written down, per facing, in the same units the art is in. It
# lives here rather than as a renderer nudge on purpose -- capeSprites.js says
# "no anchor, no nudge table and no per-facing exception to get wrong", and the
# way to keep that true is for the ART to be right, so a re-import from the
# same sheet reproduces the fix instead of losing it.
#
# Only south is corrected. southwest and east were measured and left alone:
# southwest's mouth is 8/17 covered by the hood SIDES, which is a hood framing
# a face, and east reads correctly in profile with the hood wrapping behind.
Y_NUDGE = {'south': 10}   # pixels DOWN, in 256-space, applied after the fit


def classify(rgb):
    r, g, b = rgb[:, :, 0].astype(int), rgb[:, :, 1].astype(int), rgb[:, :, 2].astype(int)
    mag = (r > 195) & (g < 90) & (b > 195)
    grn = (g > 165) & (r < 130) & (b < 130)
    ink = (abs(r - g) < 42) & (abs(g - b) < 42) & (r < 95)      # text + box rules
    # ═══ v2.3.2022c: THE ANTI-ALIASED EDGE BETWEEN THE TWO KEY COLOURS ═══
    # The generator does not return hard pixel edges: where the green person
    # meets the magenta backdrop it blends, and a 50/50 blend of #00FF00 and
    # #FF00FF is mid GREY.  Grey is neither key, so the first cut called it
    # cape and wrote a 1px dark halo tracing the figure's own silhouette --
    # a floating outline around the face, shin and boot, most visible on east.
    # A blend of the two keys satisfies r == b and g == 255 - r, so it can be
    # named exactly instead of guessed at with a brightness cut. Checked
    # against what must SURVIVE: the cape's black outline (20,20,20) misses by
    # 215 on the second term, crimson by 100 on the first, gold by 170.
    blend = (np.abs(r - b) <= 40) & (np.abs(g - (255 - r)) <= 60)
    return mag, grn, ink, blend


def _largest_pieces(mask, min_px):
    """Keep every connected piece of at least `min_px`; report what was cut."""
    from collections import deque
    h, w = mask.shape
    seen = np.zeros((h, w), bool)
    keep = np.zeros((h, w), bool)
    dropped = 0
    for y in range(h):
        for x in range(w):
            if not mask[y, x] or seen[y, x]:
                continue
            q, px = deque([(y, x)]), []
            seen[y, x] = True
            while q:
                cy, cx = q.popleft()
                px.append((cy, cx))
                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
            if len(px) >= min_px:
                for cy, cx in px:
                    keep[cy, cx] = True
            else:
                dropped += len(px)
    return keep, dropped


def dilate(mask, k=2):
    """Grow a mask by k pixels, 8-connected. numpy shifts — scipy is not
    installed in the sandbox this repo is built in."""
    out = mask.copy()
    for _ in range(k):
        g = out.copy()
        g[1:, :] |= out[:-1, :]
        g[:-1, :] |= out[1:, :]
        g[:, 1:] |= out[:, :-1]
        g[:, :-1] |= out[:, 1:]
        out = g
    return out


def figure_blob(nonmag, green):
    """The cape+person blob, as ONE connected component.

    v2.3.2022b: the first cut took the cape to be every non-magenta,
    non-green, non-near-black pixel, and excluded near-black to drop the sheet's
    labels and cell rules.  Both halves were wrong in opposite directions: the
    CAPE'S OWN OUTLINE is near-black, so excluding ink ate the outline (the
    defect the pine bow had, v2.3.2010), while a cell rule touching the figure
    still came through as a slab of cape -- visible on east as a black rectangle
    behind the drape.

    The figure is one connected thing and the furniture around it is not, so the
    component carrying the green IS the answer, and it needs no colour test at
    all: ink inside it is the cape's outline and is kept, ink outside it is a
    rule or a letter and is dropped."""
    from collections import deque
    h, w = nonmag.shape
    seen = np.zeros((h, w), bool)
    q = deque()
    gy, gx = np.where(green & nonmag)
    for y, x in zip(gy.tolist(), gx.tolist()):
        if not seen[y, x]:
            seen[y, x] = True
            q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and nonmag[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    return seen


def cells(mag, grn, ink, top, bot):
    """The five figure column-groups, found from figure content only."""
    fig = (~mag) & (~ink)
    cols = fig[top:bot].sum(0)
    runs, s = [], None
    for x, v in enumerate(cols):
        if v > 3 and s is None:
            s = x
        elif v <= 3 and s is not None:
            if x - s > 40:
                runs.append((s, x))
            s = None
    if s is not None and len(cols) - s > 40:
        runs.append((s, len(cols)))
    return runs


def stance_extent(mask, frac=0.25):
    """Horizontal spread of the lowest `frac` of a silhouette — the legs.

    The one measurement available in EVERY cell: a cape covers the torso and on
    north the head too, but the shins and boots are always drawn."""
    ys, xs = np.where(mask)
    if not len(ys):
        return None
    y1 = ys.max()
    y0 = y1 - max(2, int((y1 - ys.min()) * frac))
    band = mask[y0:y1 + 1]
    bxs = np.where(band.any(0))[0]
    return None if not len(bxs) else (int(bxs.max() - bxs.min() + 1), int(y1))


def fit(green_cell, body, blob=None):
    """Best (w, h, x, y) placing the cell's green onto the body.

    v2.3.2022b seeded the scale from the STANCE — the spread of the lowest
    quarter — because the legs are drawn on every facing however much the cape
    hides.  v2.3.2022d: that holds only while the generator keeps the figure's
    PROPORTIONS, and a re-generated northeast sheet did not.  Its boots came
    back 94px wide against the body's 57, seeding 0.61, while the same cell's
    figure height said 0.28.  The cape rendered at over twice size and filled
    the whole 256 frame.

    So the seed is the FIGURE'S HEIGHT — the cape+person blob, crown to hem —
    against the body's own height.  A hood overhangs the skull a little and a
    hem may fall past the soles, so the estimate runs slightly small and the
    local search corrects it; what matters is that height cannot be thrown off
    by one limb being drawn fat, which is what happened here.  Stance is kept
    as the fallback for a cell with no blob to measure.

    Both seeds are only seeds: the score that picks the answer is still
    inside-minus-spill against the real body, feet-anchored."""
    ys, xs = np.where(green_cell)
    if not len(ys):
        return None
    bys, bxs = np.where(body)
    bodyH = bys.max() - bys.min() + 1
    seed = None
    if blob is not None and blob.any():
        lys, _ = np.where(blob)
        seed = bodyH / max(1, lys.max() - lys.min() + 1)
    if seed is None:
        gs, bs = stance_extent(green_cell), stance_extent(body)
        if gs is None or bs is None:
            return None
        seed = bs[0] / max(1, gs[0])
    crop = green_cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    best = None
    for k in np.linspace(seed * 0.78, seed * 1.28, 21):
        tw = max(2, int(round(crop.shape[1] * k)))
        th = max(2, int(round(crop.shape[0] * k)))
        sm = np.array(Image.fromarray((crop * 255).astype(np.uint8))
                      .resize((tw, th), Image.BILINEAR)) > 110
        for dy in range(-10, 11):
            for dx in range(-10, 11):
                y0 = bys.max() - th + 1 + dy          # soles to soles
                x0 = bxs.min() + (bxs.max() - bxs.min() + 1 - tw) // 2 + dx
                canvas = np.zeros((FRAME, FRAME), bool)
                ya, yb = max(0, y0), min(FRAME, y0 + th)
                xa, xb = max(0, x0), min(FRAME, x0 + tw)
                if yb <= ya or xb <= xa:
                    continue
                canvas[ya:yb, xa:xb] = sm[ya - y0:yb - y0, xa - x0:xb - x0]
                inside = int((canvas & body).sum())
                spill = int((canvas & ~body).sum())
                sco = inside - SPILL * spill
                if best is None or sco > best[0]:
                    best = (sco, tw, th, x0, y0, inside, spill)
    return best


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--art', required=True)
    ap.add_argument('--id', required=True)
    ap.add_argument('--name', required=True)
    ap.add_argument('--only', help='comma-separated facings to import, e.g. northeast. '
                                   'The rest are left on disk untouched and their meta is merged '
                                   'forward -- a re-generated sheet is usually a fix for ONE cell, '
                                   'and re-importing all five would swap four verified frames for '
                                   'four unverified ones from a different generation.')
    ap.add_argument('--debug')
    a = ap.parse_args()

    sheet = Image.open(a.art).convert('RGB')
    rgb = np.array(sheet)
    mag, grn, ink, blend = classify(rgb)
    rows = ((~mag) & (~ink)).sum(1)
    nz = [y for y, v in enumerate(rows) if v > 6]
    top, bot = nz[0], nz[-1] + 1
    runs = cells(mag, grn, ink, top, bot)
    if len(runs) != 5:
        raise SystemExit(f'expected 5 figure cells, found {len(runs)}: {runs}')

    only = set(x.strip() for x in a.only.split(',')) if a.only else None
    if only and (only - set(DIRS)):
        raise SystemExit(f'--only: unknown facing(s) {sorted(only - set(DIRS))}')

    outdir = OUT.format(id=a.id)
    os.makedirs(outdir, exist_ok=True)
    if a.debug:
        os.makedirs(a.debug, exist_ok=True)
    meta = {'category': 'cape', 'name': a.name, 'fullFrame': True, 'fits': {}, 'anchors': {},
            'note': ('Imported by tools/import_cape_green.py from a sheet whose person was painted '
                     'flat #00FF00. The cape is everything that is neither the magenta backdrop nor '
                     'the green person, so no colour heuristic can eat a cape pixel. Registered by '
                     'fitting the GREEN silhouette against the real stand-<dir> body, feet-anchored '
                     '(the one landmark a cape never covers), scoring inside-minus-spill so a cape '
                     'that hides most of the body still fits at its true scale rather than at zero. '
                     'v2.3.2122: a per-facing Y_NUDGE is applied after the fit -- south is dropped 10px, '
                     'because a feet-anchored inside-minus-spill score cannot see a hood riding high over '
                     'a face (a few pixels there are worth more than a few hundred anywhere else).')}

    prev_path = f'{outdir}/meta.json'
    if only and os.path.exists(prev_path):
        prev = json.load(open(prev_path))
        meta['fits'].update(prev.get('fits', {}))
        meta['anchors'].update(prev.get('anchors', {}))

    for (x0c, x1c), d in zip(runs, DIRS):
        if only and d not in only:
            continue
        cellm = slice(top, bot), slice(x0c, x1c)
        cg = grn[cellm]
        cmag = mag[cellm]
        cink = ink[cellm]
        cblend = blend[cellm]
        blob = figure_blob(~cmag, cg)
        # ═══ v2.3.2022c: DROP THE PERSON'S OWN OUTLINE ═══
        # The generator does not hand back a flat green silhouette on flat
        # magenta: it OUTLINES the person, and that outline is neither key
        # colour, so the blob keeps it and it exports as a dark ring tracing
        # the face, shin and boot -- a floating outline around a character the
        # cape is not even touching.  Measured on east: 718 stray pixels, all
        # near-black or a dark green/magenta mix.
        # It cannot be dropped by darkness, because THE CAPE'S OWN OUTLINE IS
        # ALSO BLACK and removing that is the pine-bow defect (v2.3.2010).
        # What separates them is what they sit between: the person's outline
        # has green on one side and backdrop on the other, while the cape's
        # outer edge has cape and backdrop, and the hood's inner edge has cape
        # and green.  Only the person's ring touches BOTH keys.
        # RADIUS 4, and the number matters: the transition between the person
        # and the backdrop runs 3-4px (an outline, soft on both sides), so
        # dilating each key by 2 produced two DISJOINT halves whose
        # intersection was empty and dropped 18 pixels of 718.  4 reaches
        # across.  It stays safe at that width because the cape's own edges
        # never have both keys within 4px: its outer edge has backdrop on one
        # side and cape on the other, and the hood's inner edge has green and
        # cape, with the backdrop far away.
        ring = dilate(cg, 4) & dilate(cmag, 4)
        cape_mask = blob & (~cg) & (~cblend) & (~ring)
        body_im = np.array(Image.open(BODY.format(dir=d)).convert('RGBA').crop((0, 0, FRAME, FRAME)))
        body = body_im[:, :, 3] > 16

        f = fit(cg, body, blob)
        if f is None:
            raise SystemExit(f'{d}: no green found in the cell')
        sco, tw, th, X, Y, inside, spill = f
        cover = inside / max(1, int(cg.sum()) * (tw * th) / max(1, cg.shape[0] * cg.shape[1]))

        # ═══ v2.3.2022b: CROP THE BLOB, NOT THE GREEN ═══
        # The transform is fitted on the green because the green is what can be
        # matched against a known body.  It must then be APPLIED to the whole
        # cape+person blob, because on north the green bbox is a pair of shins
        # and everything above it is cape: cropping the source to the green
        # threw that away and wrote a 265px cape (57x29, a hem and nothing
        # else).  Same transform, wider crop, offset by the gap between the two
        # bounding boxes so the green still lands exactly where it fitted.
        ys, xs = np.where(cg)
        gy0, gx0 = int(ys.min()), int(xs.min())
        bys2, bxs2 = np.where(blob)
        by0, bx0 = int(bys2.min()), int(bxs2.min())
        by1, bx1 = int(bys2.max()) + 1, int(bxs2.max()) + 1
        k = tw / max(1, xs.max() + 1 - gx0)          # the fitted scale
        src = Image.fromarray(rgb[cellm][by0:by1, bx0:bx1]).convert('RGBA')
        am = Image.fromarray((cape_mask[by0:by1, bx0:bx1] * 255).astype(np.uint8))
        src.putalpha(am)
        src = src.resize((max(1, int(round((bx1 - bx0) * k))),
                          max(1, int(round((by1 - by0) * k)))), Image.LANCZOS)
        PX = int(round(X + (bx0 - gx0) * k))
        PY = int(round(Y + (by0 - gy0) * k)) + Y_NUDGE.get(d, 0)   # v2.3.2122
        frame = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
        frame.alpha_composite(src, (max(0, PX), max(0, PY)))
        arr = np.array(frame)
        keep = arr[:, :, 3] >= ALPHA_T          # crisp edges back after the resample
        arr[:, :, 3] = np.where(keep, 255, 0)
        arr[~keep] = (0, 0, 0, 0)
        # A cape is ONE piece.  What survives the keying as separate specks is
        # the tail of the person's outline the ring test could not reach --
        # measured on east, 6 fragments totalling 14px against a 7134px cape.
        # Dropping by connectivity rather than by colour keeps the cape's own
        # black outline, which is 911px on that same facing and is joined to it.
        big, dropped = _largest_pieces(arr[:, :, 3] > 0, MIN_PIECE)
        if dropped:
            arr[~big] = (0, 0, 0, 0)
        out = Image.fromarray(arr, 'RGBA')
        out.save(f'{outdir}/{d}.png')

        cys, cxs = np.where(arr[:, :, 3] > 0)
        meta['anchors'][d] = [int((cxs.min() + cxs.max()) // 2), int(cys.min())] if len(cys) else [128, 0]
        meta['fits'][d] = {'scale': round(k, 4), 'inside': inside,
                           'spill': spill, 'spillShare': round(spill / max(1, inside + spill), 4)}
        print(f'  {d:10} cape {int(arr[:,:,3].gt(0).sum()) if hasattr(arr[:,:,3],"gt") else int((arr[:,:,3]>0).sum()):6d}px'
              f'   fit spill {meta["fits"][d]["spillShare"]*100:5.1f}%   placed {tw}x{th} at ({X},{Y})')

        if a.debug:
            dbg = Image.fromarray(body_im, 'RGBA').convert('RGBA')
            dbg.alpha_composite(out)
            dbg.resize((FRAME * 2, FRAME * 2), Image.NEAREST).save(f'{a.debug}/{d}.png')

    with open(f'{outdir}/meta.json', 'w') as fh:
        json.dump(meta, fh, indent=1)
    print(f'wrote {outdir}/  (5 frames + meta.json)')


if __name__ == '__main__':
    main()
