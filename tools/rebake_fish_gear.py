#!/usr/bin/env python3
"""v2.3.1459: re-bake the fish-south gear sheets to TRACK the body
(owner, overnight list: "fully armored while fishing (looks bad
animated)").

What shipped: chest/legs/shirt fish-south sheets are ONE artwork
stamped 32 times at hand-placed offsets — no per-frame lean, and the
offsets sway ~2.1x the body's real motion with a different phase
(v2.3.1216 already noted this and band-aided the chest with a runtime
X-only de-jitter table).  Measured against the body strip: the cuirass
slid around the torso, the collar seam breathed (31->58 body px painted
over the plate through the loop), and the greaves' bottom pumped 1-3px
BELOW the feet on 10 frames.

The body strip genuinely repaints every frame (the angler rocks with
the rod: torso centroid sways +-3px, and it LEANS — the shoulder band
travels up to 4.9px against the hip band).  So the fix is a re-bake
that warps the one approved stamp onto the body's measured motion:

  - per frame, per ROW: horizontal shift field D[i][y] = the body's
    rod-excluded row centroid minus the reference frame's (gaussian-
    smoothed down the rows, clamped +-6) — this carries both the sway
    and the lean (a shear, not just a slide);
  - chest + shirt additionally ride a per-frame vertical shift from the
    measured shoulder-top track (circularly smoothed — the loop wraps);
  - legs get NO vertical shift (the feet are pinned at row 114 on all
    32 frames — the shipped sheet's 115-117 dips were placement error)
    and are hard-clamped to row 114 after the warp;
  - reference placement is each sheet's OWN frame 12 (the chest
    de-jitter table crosses zero at f11-12, i.e. that placement is the
    owner-approved fit), with the legs lifted 1px so their bottom sits
    exactly on the feet.

Because the plate then agrees with the body frame-by-frame, the collar
seam under _placeFishHead's fixed head band stops flickering on its
own — no runtime change needed beyond DELETING the de-jitter table
(entityRenderer.js), whose correction would now be wrong.

Warp is bilinear on premultiplied alpha (no dark fringing), one pass.
Guarded: refuses to run unless every frame is still the identical
stamp (i.e. refuses to double-warp an already-rebaked sheet; restore
with git show bce038c:<sheet> first).
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


def smooth_loop(vals, w=(1, 2, 3, 2, 1)):
    n = len(vals); h = len(w) // 2
    return np.array([sum(vals[(i + k - h) % n] * w[k] for k in range(len(w)))
                     / sum(w) for i in range(n)])


def main():
    body = np.array(Image.open(BODY).convert('RGBA'))
    bf = [body[:, i * FW:(i + 1) * FW] for i in range(N)]
    alpha = [(f[:, :, 3] > A_TH) & ~rod_mask(f) for f in bf]

    # --- row centroid field (rod-excluded), NaN-filled + smoothed ---
    cx = np.full((N, FW), np.nan)
    for i in range(N):
        for y in range(30, FOOT_ROW + 1):
            xs = np.where(alpha[i][y])[0]
            if len(xs) >= 6:
                cx[i, y] = xs.mean()
    for i in range(N):  # fill gaps by nearest valid row
        v = np.where(~np.isnan(cx[i]))[0]
        cx[i] = np.interp(np.arange(FW), v, cx[i][v])
        cx[i] = ndimage.gaussian_filter1d(cx[i], 2.5)
    D = np.clip(cx - cx[REF], -6, 6)          # [i][y] horizontal shift

    # --- vertical shift for chest/shirt: 2D-correlate the torso band
    # against REF.  (A first cut used "topmost row wider than 30px" as a
    # shoulder line — it swung 15px because it catches the ARMS at rod
    # height, not the shoulders.  The true torso bob is -2..+1px.) ---
    dy_raw = []
    for i in range(N):
        best = None
        for dyy in range(-6, 7):
            for dxx in range(-6, 7):
                w = alpha[i][38 + dyy:78 + dyy, 40 + dxx:88 + dxx]
                s = (w & alpha[REF][38:78, 40:88]).sum()
                if best is None or s > best[0]:
                    best = (s, dyy)
        dy_raw.append(best[1])
    dy = smooth_loop(dy_raw)
    print('torso dy raw   :', dy_raw)
    print('torso dy smooth:', [round(v, 1) for v in dy])

    for path, use_dy in SHEETS:
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
                             'already rebaked?  Restore first: '
                             'git show bce038c:' + path)

        # reference canvas: the stamp exactly where frame REF shipped it,
        # legs lifted so their bottom sits on the feet (was 115 at f12)
        ref = gf[REF].astype(float)
        if not use_dy:
            a = ref[:, :, 3] > A_TH
            lift = int(np.where(a.any(axis=1))[0][-1]) - FOOT_ROW
            if lift > 0:
                ref = np.roll(ref, -lift, axis=0)
                print(path.split('/')[-2], f'ref lifted {lift}px onto feet')

        # premultiply for clean bilinear edges
        pre = ref.copy()
        pre[:, :, :3] *= pre[:, :, 3:4] / 255.0

        yy, xx = np.mgrid[0:FW, 0:FW].astype(float)
        out = []
        for i in range(N):
            sy = yy - (dy[i] if use_dy else 0.0)
            sx = xx - D[i][:, None]
            fr = np.zeros((FW, FW, 4))
            for c in range(4):
                fr[:, :, c] = ndimage.map_coordinates(pre[:, :, c],
                                                      [sy, sx], order=1,
                                                      mode='constant')
            a = fr[:, :, 3:4]
            with np.errstate(invalid='ignore', divide='ignore'):
                fr[:, :, :3] = np.where(a > 1, fr[:, :, :3] / (a / 255.0), 0)
            if not use_dy:
                fr[FOOT_ROW + 1:, :, :] = 0     # nothing below the feet
            out.append(np.clip(fr, 0, 255).astype(np.uint8))

        Image.fromarray(np.concatenate(out, axis=1)).save(path)

        # QA: gear centroid must now ride the body centroid
        rel = []
        for i in range(N):
            g = out[i]; a = g[:, :, 3] > A_TH
            ys, xs = np.where(a)
            band = slice(max(41, ys.min()), min(74, ys.max() + 1)) \
                if use_dy else slice(75, FOOT_ROW + 1)
            bxs = np.where(alpha[i][band])[1]
            gsel = a[band]
            rel.append(np.where(gsel)[1].mean() - bxs.mean())
            if not use_dy:
                assert ys.max() <= FOOT_ROW, f'{path} f{i} below feet'
        print(path.split('/')[-2],
              f'relative-wobble span {max(rel) - min(rel):.2f}px '
              f'(shipped: chest ~4.5, legs ~1.9)')


if __name__ == '__main__':
    main()
