#!/usr/bin/env python3
"""v2.3.1458: extend the chop-west steelgreaves over the shins + boots
(owner, overnight list: "woodcutting ... armor doesn't cover shins and
boots").

The shipped chop-west greaves art hard-stops at gear row 352 of 440 —
exactly 0.80 x frame height, on every one of the 12 frames — while the
lumberjack's legs run to body row 218-219.  So ~43 of 220 body rows
(19.5% of the figure, ~22 screen px at CHOP_H=112) render as the BODY
strip's bare gray-cloth shins and black boots under a full steel set.
The compositing code is correct (effectsRenderer.js:4390-4450 draws the
whole gear frame); the art is just short.  No other pose has this cut:
cook's greaves reach row 200/219.

Fix: for each frame, take the body strip's OWN leg pixels below the
greaves cut (they repaint every frame, so they track the swing
perfectly), re-map their luminance onto the greaves' measured steel
ramp (histogram match, so shading/outline survive and the metal reads
as the same material), upscale x2 into gear space, and lay the result
UNDER the existing greaves art.  The plate then covers shin + boot with
per-frame-correct silhouette, and the finished greaves edges stay
exactly as drawn.

Only touches public/sprites/gear/legs/steelgreaves/chop-west.png.
Guarded: refuses to run if the sheet already has opaque art below gear
row 360 (i.e. has already been extended).
"""
import numpy as np
from PIL import Image

BODY = 'public/sprites/skills/chop-strip.webp'
GEAR = 'public/sprites/gear/legs/steelgreaves/chop-west.png'
FW, FH = 240, 220          # body frame
GW, GH = 480, 440          # gear frame (2x)
CHOP_BASE = 12             # gear frame k composites over body frame 12+k
TOP = 172                  # body row where the fill may start (just above
                           # the 176 cut, to seal sub-cut slivers) — only
                           # where the existing greaves leave alpha 0

def main():
    body = np.array(Image.open(BODY).convert('RGBA'))
    gear = np.array(Image.open(GEAR).convert('RGBA'))
    bf = [body[:, i * FW:(i + 1) * FW] for i in range(24)]
    gn = gear.shape[1] // GW
    gf = [gear[:, i * GW:(i + 1) * GW].copy() for i in range(gn)]

    if any((f[360:, :, 3] > 200).sum() > 50 for f in gf):
        raise SystemExit('chop-west greaves already extend below row 360 — '
                         'already plated.  Restore the short sheet first: '
                         'git show bce038c:' + GEAR)

    # Steel ramp from the greaves' own opaque pixels: sorted luminance ->
    # mean RGB per luminance bin.  Boots (near-black in the body strip)
    # land on the ramp's dark end and read as dark sabatons, not cloth.
    allg = np.concatenate(gf, axis=1)
    gm = allg[:, :, 3] > 200
    gpx = allg[gm][:, :3].astype(float)
    glum = gpx @ [0.299, 0.587, 0.114]
    gsort = np.sort(glum)

    out = []
    for k in range(gn):
        f = bf[CHOP_BASE + k]
        g = gf[k]
        band = np.zeros((FH, FW, 4), np.uint8)
        m = (f[:, :, 3] > 0)
        m[:TOP, :] = False
        px = f[m][:, :3].astype(float)
        lum = px @ [0.299, 0.587, 0.114]
        # histogram match: band-lum CDF -> greaves-lum quantiles.  Both
        # arts outline in near-black, so the darkest ranks land back on
        # black outline; the boots' flat darks spread onto the ramp's
        # lower-mid steel and read as dark sabatons instead of cloth.
        ranks = np.searchsorted(np.sort(lum), lum) / max(1, len(lum) - 1)
        # cap at the ramp's p85 — the band's brightest pixels (the olive
        # upper shin) otherwise land on the plate's white speculars and
        # read as a hot stripe right under the knee
        mapped = gsort[(ranks * 0.85 * (len(gsort) - 1)).astype(int)]
        band[m] = np.stack([mapped, mapped, mapped,
                            f[m][:, 3].astype(float)], axis=1).astype(np.uint8)
        band2 = np.array(Image.fromarray(band).resize((GW, GH),
                                                      Image.BILINEAR))
        # existing greaves art stays ON TOP (finished edges win)
        comp = Image.alpha_composite(Image.fromarray(band2),
                                     Image.fromarray(g))
        out.append(np.array(comp))
        filled = int((band2[:, :, 3] > 40).sum() - (g[:, :, 3] > 40).sum())
        print(f'k{k:2d}: plated (net new alpha px ~{filled})')

    sheet = np.concatenate(out, axis=1)
    Image.fromarray(sheet).save(GEAR)
    print('wrote', GEAR, sheet.shape)


if __name__ == '__main__':
    main()
