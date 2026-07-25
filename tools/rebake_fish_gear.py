#!/usr/bin/env python3
"""v2.3.1461: fish-south gear re-bake, take 2 — RIGID integer tracking
(owner on v2.3.1459: "armor is jittery and wobbly ... as he does the
slightly leaning forward and leaning backward animation").

v2.3.1459 warped the stamp with a per-ROW fractional shift field: it
tracked the centroids beautifully (wobble 4.5px -> 0.4px) but read
wrong on screen for two reasons:
  - the per-row shear bends the cuirass with the lean — plate armor is
    RIGID, a shell the body moves inside; bending it reads as rubber;
  - fractional shifts (bilinear resample) both soften the art and move
    it in sub-pixel steps while the body art moves in whole pixels —
    the mismatch reads as swimming/jitter.

Take 2 keeps the tracking but makes it rigid and integer:
  - chest + shirt: ONE integer (dx,dy) per frame from a 2D correlation
    of the torso band (rows 38-78, cols 40-88, rod-excluded) against
    frame 12 — the same measure that showed the true bob is -2..+1px.
    The stamp is np.roll'd — zero resampling, art stays crisp, and the
    plate steps exactly when the body's own pixels step.
  - the track is cleaned with a circular 3-tap median (kills any
    single-frame measurement blip without lagging the real motion).
  - legs: CONSTANT placement (frame 12's, lifted 1px so the greaves
    bottom sits on the feet at row 114).  The leg region is pinned all
    32 frames; any per-frame adjustment is pure noise.

Reference placement stays frame 12 (the v2.3.1216 de-jitter table
crossed zero at f11-12 — the owner-approved fit).  The residual misfit
of rigid-vs-lean is <=2px at the lean extremes, which is exactly how
far a rigid shell SHOULD lag a leaning body.

Guarded: refuses to run unless every frame is the identical stamp.
Restore first:  for f in chest/steelplate shirt/tshirt legs/steelgreaves; do
  git show bce038c:public/sprites/gear/$f/fish-south.png > public/sprites/gear/$f/fish-south.png; done
"""
import numpy as np
from PIL import Image
from scipy import ndimage

BODY = 'public/sprites/player/fish-south.png'
SHEETS = [
    ('public/sprites/gear/chest/steelplate/fish-south.png', True),
    ('public/sprites/gear/shirt/tshirt/fish-south.png', True),
    ('public/sprites/gear/legs/steelgreaves/fish-south.png', False),
]
FW = 128
N = 32
REF = 12
A_TH = 40
FOOT_ROW = 114


def rod_mask(fr):
    r = fr[:, :, 0].astype(int); g = fr[:, :, 1].astype(int)
    b = fr[:, :, 2].astype(int); a = fr[:, :, 3]
    return (a > A_TH) & (r > 150) & (b > 80) & (g < 100) & \
           (r - g > 80) & (b - g > 20)


def med3(vals):
    n = len(vals)
    return [sorted([vals[(i - 1) % n], vals[i], vals[(i + 1) % n]])[1]
            for i in range(n)]


def main():
    body = np.array(Image.open(BODY).convert('RGBA'))
    bf = [body[:, i * FW:(i + 1) * FW] for i in range(N)]
    alpha = [(f[:, :, 3] > A_TH) & ~rod_mask(f) for f in bf]

    # ---- integer track, chosen to COVER THE BODY ----
    # v2.3.1471 (owner: "bare hand coming through the armor near the
    # hand"): the first cut maximised silhouette correlation against
    # frame 12, which is not the same thing as covering skin — on
    # frames 15-23 it parked the plate up to 8px off the old placement
    # and let 12-16px of collar/arm skin through.  The objective is now
    # the actual defect: uncovered SKIN under the render-time erase
    # (the game erases body only where the dilated gear is, so any
    # skin the plate misses is skin the player sees).
    #
    # Solved as a DP over the frame loop with a movement penalty, so
    # the track stays smooth — a pure per-frame minimum would jitter,
    # which is the v2.3.1461 complaint this must not reintroduce.
    ref_chest = np.array(Image.open(SHEETS[0][0]).convert('RGBA'))
    ref_legs = np.array(Image.open(SHEETS[2][0]).convert('RGBA'))
    cREF = ref_chest[:, REF * FW:(REF + 1) * FW][:, :, 3] > A_TH
    lREF = ref_legs[:, REF * FW:(REF + 1) * FW][:, :, 3] > A_TH

    def skin_of(f):
        r = f[:, :, 0].astype(int); g = f[:, :, 1].astype(int)
        b = f[:, :, 2].astype(int); a = f[:, :, 3]
        return (a > A_TH) & (r > 150) & (g > 70) & (g < 170) & (b < 130) \
            & (r - b > 60)

    # The track is the BODY'S OWN motion (2D correlation of the torso
    # band against REF, median-cleaned) — that is what makes the plate
    # move exactly when the body moves, i.e. zero relative wobble, the
    # property v2.3.1461 bought and this must not spend.
    #
    # (Two rejected alternatives, both measured: optimising the offsets
    # purely for coverage — with or without a smoothness penalty —
    # covers the skin but stops the plate following the body's sway,
    # putting relative wobble back at ~4.8px, i.e. the original defect.
    # Coverage is instead bought by a CONSTANT correction, which cannot
    # add motion, plus a local seal for what is left.)
    track = []
    refw = alpha[REF][38:78, 40:88]
    for i in range(N):
        best = None
        for dy in range(-6, 7):
            for dx in range(-6, 7):
                s = (alpha[i][38 + dy:78 + dy, 40 + dx:88 + dx] & refw).sum()
                if best is None or s > best[0]:
                    best = (s, dy, dx)
        track.append((best[1], best[2]))
    bdy = med3([t[0] for t in track])
    bdx = med3([t[1] for t in track])

    def exposed_px(dys_, dxs_):
        tot = 0
        for i in range(N):
            sk = skin_of(bf[i]); sk[:39] = False
            cov = np.roll(np.roll(cREF, dys_[i], axis=0), dxs_[i], axis=1) | lREF
            tot += (sk & ~ndimage.binary_dilation(cov, iterations=3)).sum()
        return int(tot)

    # Constant baseline correction, deliberately capped at +-1px.  The
    # unconstrained optimum was (-2,-5): it covered the most skin by
    # dragging the whole cuirass left onto the arm, which visibly
    # de-centred the plate under the head.  Coverage is the SEAL's job;
    # this only takes a free pixel if one is available.
    bestC, bestTot = (0, 0), None
    for cy in range(-1, 2):
        for cx in range(-1, 2):
            t = exposed_px([d + cy for d in bdy], [d + cx for d in bdx])
            if bestTot is None or t < bestTot:
                bestTot, bestC = t, (cy, cx)
    dys = [d + bestC[0] for d in bdy]
    dxs = [d + bestC[1] for d in bdx]
    print(f'body track + constant correction {bestC}: '
          f'{bestTot}px exposed skin (before seal)')
    print('dy:', dys)
    print('dx:', dxs)
    jump = max(max(abs(dys[(i + 1) % N] - dys[i]),
                   abs(dxs[(i + 1) % N] - dxs[i])) for i in range(N))
    print('max adjacent-frame step:', jump, 'px')

    for path, tracked in SHEETS:
        sheet = np.array(Image.open(path).convert('RGBA'))
        gf = [sheet[:, i * FW:(i + 1) * FW] for i in range(N)]

        def crop_of(fr):
            a = fr[:, :, 3] > A_TH
            ys, xs = np.where(a)
            return fr[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        c0 = crop_of(gf[0])
        if not all(crop_of(g).shape == c0.shape and (crop_of(g) == c0).all()
                   for g in gf[1:]):
            raise SystemExit(path + ': frames are not one identical stamp — '
                             'already rebaked?  Restore first (see docstring).')

        ref = gf[REF]
        if not tracked:
            a = ref[:, :, 3] > A_TH
            lift = int(np.where(a.any(axis=1))[0][-1]) - FOOT_ROW
            if lift > 0:
                ref = np.roll(ref, -lift, axis=0)
                print(path.split('/')[-2], f'ref lifted {lift}px onto feet')

        out = []
        for i in range(N):
            fr = np.roll(np.roll(ref, dys[i], axis=0), dxs[i], axis=1) \
                if tracked else ref
            out.append(fr)

        # v2.3.1471: seal the residual.  No rigid placement covers every
        # skin pixel — the angler's arm MOVES while the plate is one
        # stamp — so ~10px per frame still showed at the rod hand, which
        # is exactly what the owner spotted.  Grow the PLATE over just
        # those pixels, colour taken from the nearest existing plate
        # pixel, so the gauntlet reaches the hand instead of bare skin
        # showing.  (This extends the armor; it is NOT the chop-style
        # under-layer that read as a second body.)  Chest only: the
        # shirt hides under it and the greaves are nowhere near.
        if path is SHEETS[0][0] or path == SHEETS[0][0]:
            legs_sheet = np.array(Image.open(SHEETS[2][0]).convert('RGBA'))
            sealed = 0
            for i in range(N):
                sk = skin_of(bf[i]); sk[:39] = False
                lg = legs_sheet[:, i * FW:(i + 1) * FW][:, :, 3] > A_TH
                cov = (out[i][:, :, 3] > A_TH) | lg
                exposed = sk & ~ndimage.binary_dilation(cov, iterations=3)
                if not exposed.any():
                    continue
                src = out[i][:, :, 3] > A_TH
                _, (iy, ix) = ndimage.distance_transform_edt(
                    ~src, return_indices=True)
                ys, xs = np.where(exposed)
                out[i][ys, xs] = out[i][iy[ys, xs], ix[ys, xs]]
                out[i][ys, xs, 3] = 255
                sealed += len(ys)
            print(f'  sealed {sealed}px of exposed skin into the plate')

        Image.fromarray(np.concatenate(out, axis=1)).save(path)
        print(path.split('/')[-2], 'written',
              'tracked' if tracked else 'constant')


if __name__ == '__main__':
    main()
