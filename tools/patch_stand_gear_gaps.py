#!/usr/bin/env python3
"""v2.3.1462: close the stand-pose armor gaps at the waist/hip (owner:
"Armored idle south and armor idle northeast looks like there's a hole
around the right hand where the hand grips the sword and shows the
pants color coming through").

Measured (256 body-space, body pixels inside the gear span not covered
by chest+legs):
  south      x 98..107 / 152..157, y 118..153 — 10px-wide SKIN strips
             between the armored sleeve edge and the cuirass side, both
             arms, exactly at sword-grip height.  At runtime the masked
             body bake's 6px-dilated erase eats most of the strip, so
             the "hole" shows the GROUND through the figure (a tan path
             reads as pants); the surviving middle pixels show skin.
  northeast  x 98..99 y 128..139, x 146..147 y 138..153 (skin),
             x 114..119 y 148..149 + x 120..125 y 182..203 (olive
             PANTS at the outer hip, right where the hand hangs).

Intentional exposures are preserved: the neck opening above the collar
(clusters touching the gear span's top edge) and the dark between-leg
shadow strips (pure gray/near-black clusters — filling those would
weld the legs into one steel column).

Fill rule: any uncovered cluster containing >=3 olive-pants pixels or
>=6 skin pixels gets steel-filled INTO THE CHEST SHEET (chest draws
above legs, and the masked erase keys on the gear union either way).
Fill color comes from histogram-matching the covered body pixels'
luminance onto the chest sheet's own steel ramp — same technique as
the chop shin plating (v2.3.1458), so shading and outlines carry over.

Idempotent by construction: after a run the pixels are covered, so a
re-run finds no clusters.
"""
import numpy as np
from PIL import Image
from scipy import ndimage

DIRS = ['south', 'northeast']
A_TH = 40


def masks(body):
    r = body[:, :, 0].astype(int); g = body[:, :, 1].astype(int)
    b = body[:, :, 2].astype(int); a = body[:, :, 3]
    alive = a > A_TH
    skin = alive & (r > 130) & (g > 70) & (g < 160) & (b < 110) & (r - b > 55)
    olive = alive & (abs(r - g) < 30) & (g - b > 20) & (g > 60) & (g < 160) & ~skin
    return alive, skin, olive


def main():
    for d in DIRS:
        body = np.array(Image.open(
            f'public/sprites/player/stand-{d}.png').convert('RGBA'))
        chest_path = f'public/sprites/gear/chest/steelplate/stand-{d}.png'
        chest = np.array(Image.open(chest_path).convert('RGBA'))
        legs = np.array(Image.open(
            f'public/sprites/gear/legs/steelgreaves/stand-{d}.png').convert('RGBA'))

        cov128 = (chest[:, :, 3] > A_TH) | (legs[:, :, 3] > A_TH)
        cover = np.kron(cov128, np.ones((2, 2), bool))
        alive, skin, olive = masks(body)

        gys, gxs = np.where(cover)
        band = np.zeros_like(cover)
        band[gys.min():gys.max() + 1, gxs.min():gxs.max() + 1] = True
        neck_limit = gys.min() + 16

        hole = alive & band & ~cover
        lbl, n = ndimage.label(hole)

        # steel ramp from the chest sheet itself
        cpx = chest[chest[:, :, 3] > 200][:, :3].astype(float)
        ramp = np.sort(cpx @ [0.299, 0.587, 0.114])

        fill256 = np.zeros_like(hole)
        for l in range(1, n + 1):
            cl = lbl == l
            yy, _ = np.where(cl)
            if yy.min() <= neck_limit:
                continue                      # neck opening — intentional
            if (cl & olive).sum() >= 3 or (cl & skin).sum() >= 6:
                fill256 |= cl
        cnt = int(fill256.sum())
        if not cnt:
            print(d, 'no fillable gaps found')
            continue

        # 256 hole pixels -> 128 chest pixels (any-of-2x2), lum-matched
        ys, xs = np.where(fill256)
        lum = body[ys, xs][:, :3].astype(float) @ [0.299, 0.587, 0.114]
        ranks = np.searchsorted(np.sort(lum), lum) / max(1, len(lum) - 1)
        mapped = ramp[(ranks * 0.85 * (len(ramp) - 1)).astype(int)]
        for (y, x, v) in zip(ys // 2, xs // 2, mapped):
            if chest[y, x, 3] <= A_TH:
                chest[y, x] = (int(v), int(v), int(v), 255)
        Image.fromarray(chest).save(chest_path)
        print(d, f'filled {cnt} body px into {chest_path}')

    # verify: no fillable clusters remain
    print('re-scan:')
    import subprocess, sys
    for d in DIRS:
        body = np.array(Image.open(
            f'public/sprites/player/stand-{d}.png').convert('RGBA'))
        chest = np.array(Image.open(
            f'public/sprites/gear/chest/steelplate/stand-{d}.png').convert('RGBA'))
        legs = np.array(Image.open(
            f'public/sprites/gear/legs/steelgreaves/stand-{d}.png').convert('RGBA'))
        cover = np.kron((chest[:, :, 3] > A_TH) | (legs[:, :, 3] > A_TH),
                        np.ones((2, 2), bool))
        alive, skin, olive = masks(body)
        gys, gxs = np.where(cover)
        band = np.zeros_like(cover)
        band[gys.min():gys.max() + 1, gxs.min():gxs.max() + 1] = True
        hole = alive & band & ~cover
        lbl, n = ndimage.label(hole)
        left = sum(1 for l in range(1, n + 1)
                   if np.where(lbl == l)[0].min() > gys.min() + 16
                   and (((lbl == l) & olive).sum() >= 3
                        or ((lbl == l) & skin).sum() >= 6))
        print(' ', d, 'remaining fillable clusters:', left)


if __name__ == '__main__':
    main()
