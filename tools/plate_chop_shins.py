#!/usr/bin/env python3
"""v2.3.1463: chop-west greaves finish — shin plate + PLATE BOOTS +
chain-mail crotch.  Supersedes the v2.3.1458 version of this tool.

v2.3.1458 extended the greaves over the bare shins/boots by recoloring
the body strip's own leg pixels onto the greaves' steel ramp.  Owner
follow-up: "needs crotch area textured with the gray chain belt (like
jogging animations do) and plate boots instead of default naked char
boots" — the CDF mapping kept the boots on the ramp's dark end, so
they still read as the naked character's leather boots, and the olive
pants V between the thigh plates stayed bare cloth.

This run (from the pristine pre-1458 sheet — guard below):
  1. CHAIN CROTCH: every olive-pants body pixel in rows 130..185 not
     covered by chest or greaves is filled with the real chain-belt
     weave sampled from the stand-south chest sheet (rows 61..73 — the
     baked chain band), NEAREST-upscaled x4 to chop gear density and
     anchored to the greaves' per-frame x offset so the weave rides
     the figure instead of crawling.  Region border darkened to read
     as an outline.
  2. SHIN PLATE: rows TOP..BOOT_TOP histogram-matched onto the greaves
     ramp capped at p85 (unchanged from v2.3.1458).
  3. PLATE BOOTS: rows >= BOOT_TOP mapped onto the BRIGHT segment of
     the ramp [p30..p90] so they read as polished steel sabatons, not
     dark leather; original near-black outline pixels stay dark.

Only touches public/sprites/gear/legs/steelgreaves/chop-west.png.
Restore the input first: git show bce038c:<sheet> > <sheet>.
"""
import numpy as np
from PIL import Image
from scipy import ndimage

BODY = 'public/sprites/skills/chop-strip.webp'
GEAR = 'public/sprites/gear/legs/steelgreaves/chop-west.png'
CHEST = 'public/sprites/gear/chest/steelplate/chop-west.png'
CHAIN_SRC = 'public/sprites/gear/chest/steelplate/stand-south.png'
FW, FH = 240, 220
GW, GH = 480, 440
CHOP_BASE = 12
TOP = 172          # shin fill may start here (just above the 176 cut)
BOOT_TOP = 196     # rows below = boots -> bright plate mapping
CHAIN_Y0, CHAIN_Y1 = 110, 185   # waist+pelvis band searched for bare
                                # pants/sash (the sash rides rows ~115-135)


def main():
    body = np.array(Image.open(BODY).convert('RGBA'))
    gear = np.array(Image.open(GEAR).convert('RGBA'))
    chest = np.array(Image.open(CHEST).convert('RGBA'))
    bf = [body[:, i * FW:(i + 1) * FW] for i in range(24)]
    gn = gear.shape[1] // GW
    gf = [gear[:, i * GW:(i + 1) * GW].copy() for i in range(gn)]
    cf = [chest[:, i * GW:(i + 1) * GW] for i in range(gn)]

    if any((f[360:, :, 3] > 200).sum() > 50 for f in gf):
        raise SystemExit('chop-west greaves already extended below row 360 — '
                         'restore the pristine sheet first: '
                         'git show bce038c:' + GEAR)

    # chain tile: the stand sheet's baked chain-belt weave, x4 to gear density
    cs = np.array(Image.open(CHAIN_SRC).convert('RGBA'))
    tile = cs[61:74, 50:78]
    tile = np.array(Image.fromarray(tile).resize(
        (tile.shape[1] * 4, tile.shape[0] * 4), Image.NEAREST))
    TH, TW = tile.shape[:2]

    # steel ramp from the pristine greaves
    allg = np.concatenate(gf, axis=1)
    gpx = allg[allg[:, :, 3] > 200][:, :3].astype(float)
    gsort = np.sort(gpx @ [0.299, 0.587, 0.114])

    def q(p):
        return gsort[int(p * (len(gsort) - 1))]

    out = []
    for k in range(gn):
        f = bf[CHOP_BASE + k]
        g = gf[k]
        r = f[:, :, 0].astype(int); gg = f[:, :, 1].astype(int)
        b = f[:, :, 2].astype(int); a = f[:, :, 3]

        # ---- 1. chain crotch (bare olive between the plates) ----
        olive = (a > 40) & (abs(r - gg) < 25) & (gg - b > 25) & \
                (gg > 70) & (gg < 150)
        # the orange waist sash between chest hem and pants — the jog
        # knight wears chain there too.  b<70 & r-g>90 excludes skin
        # (measured hand skin has b>=89), so down-swing hands are safe.
        sash = (a > 40) & (r > 180) & (r - gg > 90) & (b < 70)
        cov = (np.array(Image.fromarray(g).resize((FW, FH), Image.NEAREST))[:, :, 3] > 40) | \
              (np.array(Image.fromarray(np.ascontiguousarray(cf[k])).resize((FW, FH), Image.NEAREST))[:, :, 3] > 40)
        pelvis = (olive | sash) & ~cov
        pelvis[:CHAIN_Y0] = False
        pelvis[CHAIN_Y1 + 1:] = False
        pelvis = ndimage.binary_closing(pelvis, iterations=1)
        # sweep in the anti-aliased pants fringe the strict mask misses
        loose = (a > 40) & (abs(r - gg) < 40) & (gg - b > 15) & \
                (gg > 55) & (gg < 165)
        pelvis |= ndimage.binary_dilation(pelvis, iterations=2) & \
            (loose | sash) & ~cov
        # darker sash-shadow slivers (r 150-180) hug the chain border —
        # adjacency-gated so isolated hand-shadow pixels never match
        sash2 = (a > 40) & (r > 150) & (r - gg > 70) & (b < 75)
        pelvis |= ndimage.binary_dilation(pelvis, iterations=3) & sash2 & ~cov
        pelvis[:CHAIN_Y0] = False
        pelvis[CHAIN_Y1 + 1:] = False
        edge = pelvis & ~ndimage.binary_erosion(pelvis, iterations=1)

        ga = g[:, :, 3] > 40
        anchor = int(np.where(ga.any(axis=0))[0][0])   # weave rides the figure
        chain_band = np.zeros((GH, GW, 4), np.uint8)
        ys, xs = np.where(pelvis)
        for (y, x) in zip(ys, xs):
            for oy in (0, 1):
                for ox in (0, 1):
                    Y, X = y * 2 + oy, x * 2 + ox
                    t = tile[Y % TH, (X - anchor) % TW]
                    px = t[:3].astype(int)
                    if edge[y, x]:
                        px = px * 45 // 100
                    chain_band[Y, X] = (*px, 255)

        # ---- 2+3. shin plate + plate boots (body pixels below the cut) ----
        band = np.zeros((FH, FW, 4), np.uint8)
        m = (f[:, :, 3] > 0)
        m[:TOP, :] = False
        px = f[m][:, :3].astype(float)
        lum = px @ [0.299, 0.587, 0.114]
        rows = np.where(m)[0]
        ranks = np.searchsorted(np.sort(lum), lum) / max(1, len(lum) - 1)
        shin_val = np.array([q(rk * 0.85) for rk in ranks])
        boot_val = np.array([q(0.30 + rk * 0.60) for rk in ranks])
        val = np.where(rows >= BOOT_TOP, boot_val, shin_val)
        val = np.where(lum < 30, q(0.02), val)          # outlines stay dark
        band[m] = np.stack([val, val, val,
                            f[m][:, 3].astype(float)], axis=1).astype(np.uint8)
        band2 = np.array(Image.fromarray(band).resize((GW, GH), Image.BILINEAR))

        under = Image.alpha_composite(Image.fromarray(chain_band),
                                      Image.fromarray(band2))
        comp = Image.alpha_composite(under, Image.fromarray(g))
        out.append(np.array(comp))
        print(f'k{k:2d}: chain {int(pelvis.sum())}px  legs-anchor x{anchor}')

    sheet = np.concatenate(out, axis=1)
    Image.fromarray(sheet).save(GEAR)
    print('wrote', GEAR, sheet.shape)


if __name__ == '__main__':
    main()
