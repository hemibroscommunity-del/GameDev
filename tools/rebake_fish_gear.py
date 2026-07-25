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

    # integer torso track vs REF
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
    dys = med3([t[0] for t in track])
    dxs = med3([t[1] for t in track])
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
        Image.fromarray(np.concatenate(out, axis=1)).save(path)
        print(path.split('/')[-2], 'written',
              'tracked' if tracked else 'constant')


if __name__ == '__main__':
    main()
