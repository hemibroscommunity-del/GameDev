#!/usr/bin/env python3
"""Turn the owner's light-shaft artwork into the portal beam sprite.

v2.3.2070.  Owner: "Use this to indicate portal areas (where you go between
zones) instead of the double circles.  It should fade furthest from the zone
entrance."

THE SOURCE IS LIGHT-ON-WHITE, WHICH IS BACKWARDS FOR A GLOW.  Every other FX
strip in this repo is keyed off magenta or comes with real alpha; this one
arrived as a JPEG of pale gold and periwinkle rays on pure white, because that
is what a light shaft looks like drawn on paper -- you cannot paint brighter
than the page, so the artist encodes ray INTENSITY as distance from white.
Measured: the darkest pixel in the whole image is 103, and 45% of it is pure
white.  So there is no dark ink to key and no alpha to recover; it has to be
derived.

  alpha = (255 - min(R,G,B)) / 255      how far from white this pixel is
  color = pixel scaled so max(R,G,B)=255   its hue, at full brightness

drawn ADDITIVELY.  A gold ray adds gold light, a blue ray adds blue, and the
white page adds exactly nothing -- which is the property that makes a white
background correct rather than a mistake to work around.  Taking luminance as
alpha instead (the obvious first move) inverts the picture: the white page
becomes the brightest thing on screen.

DEADZONE.  JPEG ringing puts a little noise in the white.  Measured over three
corner blocks: mean 0.0002, p99 0.0039, max 0.0118 raw alpha.  Anything under
DEADZONE is cleared and the rest is rescaled, so the sprite has a genuinely
empty background instead of a faint rectangular haze over the map.

THE AXIAL FADE IS THE OWNER'S ACTUAL REQUEST AND IT IS NOT IN THE ART.  The
rays fan out from an apex, so the picture LOOKS like it fades -- but that is
the fan spreading, not the rays dimming.  Peak intensity per row is flat down
almost the whole length (chroma max 114 at the apex, 111 at 84% of the way
down).  So the falloff is baked here, and `--report` prints the per-row profile
with a monotonicity check, because "it fades" is a claim about numbers.

The apex becomes the BOTTOM of the sprite (the image is flipped), so it sits on
the portal tile with the beam rising away from it -- brightest where you step
through, faintest furthest from it.

  python3 tools/import_portal_beam.py --report    measure, write nothing
  python3 tools/import_portal_beam.py --write     write the sprite
"""
import sys
import numpy as np
from PIL import Image

SRC = 'assets/fx-source/portal-beam-source.jpg'
OUT = 'public/sprites/fx/portal-beam.webp'

DEADZONE = 0.02      # > 1.7x the worst measured JPEG noise (0.0118)
OUT_W = 448          # drawn ~3.5 tiles wide; 448 covers 2x DPR with headroom
FADE_POWER = 1.80    # see _fade() and report(); the lowest value that fades
                     # at EVERY band of the beam, with margin
SATURATION = 3.0     # see build(); the rays' hue, deepened so they read as
                     # light and not as haze


def _fade(t):
    """Alpha multiplier at normalised distance `t` from the apex (0) to the
    far end (1).  Deliberately starts at 1.0 and reaches 0.0 exactly, so the
    beam has no cut edge at the top of its own texture."""
    return np.clip(1.0 - t, 0.0, 1.0) ** FADE_POWER


def build():
    src = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)
    h, w, _ = src.shape

    alpha = (255.0 - src.min(axis=2)) / 255.0
    alpha = np.clip((alpha - DEADZONE) / (1.0 - DEADZONE), 0.0, 1.0)

    # THE HUE, DEEPENED.  Taking the pixel and just scaling its brightest
    # channel to 255 is the obvious move and it comes out as pale haze: a gold
    # ray on the page is (250, 230, 177), which is only 78/255 of the way from
    # white, so ADDING it to the map is very nearly adding white.  Composited
    # over the meadow at four strengths, that version reads as fog with a
    # slight tint, not as a beam.
    # So each channel is pushed away from the pixel's own brightest channel by
    # SATURATION before the rescale, which keeps the hue and deepens it --
    # (250, 230, 177) becomes gold rather than cream, and the periwinkle outer
    # rays become blue instead of vanishing into the grass.  Clipped at 0, so a
    # very saturated pixel saturates further rather than wrapping.
    mx = src.max(axis=2, keepdims=True)
    color = np.clip(mx - (mx - src) * SATURATION, 0.0, 255.0)
    # Back to full brightness.  Guarded: a pure-black pixel would divide by
    # zero, and while this source has none (min luminance 103) the guard is
    # what stops a different source file from producing NaNs silently.
    cmx = color.max(axis=2, keepdims=True)
    color = np.where(cmx > 1.0, color * (255.0 / np.maximum(cmx, 1.0)), 255.0)

    # Axial fade, in SOURCE orientation: the apex is the top row.
    t = (np.arange(h, dtype=np.float32) / max(1, h - 1))[:, None]
    alpha = alpha * _fade(t)

    # Crop to what is actually left, so the sprite carries no dead margin.
    ink = alpha > (1.0 / 255.0)
    ys, xs = np.where(ink)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    alpha = alpha[y0:y1, x0:x1]
    color = color[y0:y1, x0:x1]

    # Normalise so the brightest surviving pixel is fully opaque; the draw-time
    # sprite alpha is what sets the final strength, and starting from a full
    # range gives the pulse the most to work with.
    peak = float(alpha.max())
    if peak > 0:
        alpha = alpha / peak

    rgba = np.concatenate([color, alpha[..., None] * 255.0], axis=2)
    img = Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), 'RGBA')
    # Apex to the BOTTOM: it anchors on the portal tile, beam rising away.
    img = img.transpose(Image.FLIP_TOP_BOTTOM)
    out_h = max(1, round(img.height * OUT_W / img.width))
    return img.resize((OUT_W, out_h), Image.LANCZOS)


BANDS = 12


def report(img):
    """Print the fade profile and check it, band by band.

    MEASURED IN BANDS, NOT ROWS, and that is the whole subtlety.  Row-by-row
    the mean alpha jitters: hand-painted streaks start and stop at different
    heights, so a strict per-row test fails on the art's own texture rather
    than on the fade.  Smoothing does not fix it either -- there is a genuine
    plateau a fifth of the way up where the rays bunch.  Twelve equal bands is
    the resolution a person actually perceives a gradient at, and at
    FADE_POWER 1.8 every one of them is dimmer than the last with real margin
    (the smallest fall is 0.0056, and no band rises at any tolerance).

    Both halves of the owner's requirement are asserted:
      - it FADES: every band below the one before it, no tolerance allowed;
      - it fades to NOTHING: the last band keeps under 10% of the first."""
    a = np.asarray(img).astype(np.float32)[..., 3] / 255.0
    h = a.shape[0]
    # Mean alpha over the lit pixels of each row, apex-first.
    rows = np.array([
        (lambda ink: float(ink.mean()) if ink.size else 0.0)(a[y][a[y] > 1e-3])
        for y in range(h - 1, -1, -1)
    ])
    edges = [int(i * h / BANDS) for i in range(BANDS + 1)]
    band = np.array([rows[edges[i]:edges[i + 1]].mean() for i in range(BANDS)])

    print(f'sprite {img.width}x{img.height}   apex row = {h - 1} (bottom)')
    print('  band  dist-from-apex   mean-alpha   step      peak   lit-px')
    for i in range(BANDS):
        y = h - 1 - (edges[i] + edges[i + 1]) // 2
        lit = a[y][a[y] > 1e-3]
        step = '   —   ' if i == 0 else f'{band[i] - band[i - 1]:+7.4f}'
        print(f'   {i + 1:2d}   {edges[i] / h:4.2f}-{edges[i + 1] / h:4.2f}      '
              f'{band[i]:6.4f}    {step}   {float(a[y].max()):6.4f}   {int(lit.size)}')

    ok = True
    rises = [i for i in range(1, BANDS) if band[i] >= band[i - 1]]
    if rises:
        ok = False
        print(f'FAIL: {len(rises)} band(s) are no dimmer than the band nearer the apex '
              f'— the beam does not fade away from the entrance')
        for i in rises:
            print(f'   band {i} -> {i + 1}: {band[i - 1]:.4f} -> {band[i]:.4f}')
    fall = 1.0 - (band[-1] / max(band[0], 1e-9))
    if fall < 0.90:
        ok = False
        print(f'FAIL: the far end keeps {(1 - fall) * 100:.0f}% of the apex '
              f'(it has to lose at least 90%)')
    if ok:
        smallest = min(band[i - 1] - band[i] for i in range(1, BANDS))
        print(f'OK: all {BANDS} bands fade (smallest fall {smallest:.4f}), '
              f'{band[0]:.4f} at the entrance -> {band[-1]:.4f} at the far end '
              f'({fall * 100:.1f}% lost)')
    return ok


if __name__ == '__main__':
    img = build()
    ok = report(img)
    if '--write' in sys.argv:
        if not ok:
            sys.exit('refusing to write: the fade check failed')
        # LOSSLESS WebP.  Measured against the PNG at the size the renderer
        # actually draws it (165x168): lossless is 169 KB against the PNG's
        # 207 KB with byte-identical output, q95 is 105 KB.  The alpha plane
        # comes back exact at every quality (libwebp keeps it lossless at its
        # default alpha_quality), so the question is only the RGB, and q95's
        # error weighted by alpha -- which is what an ADDITIVE draw actually
        # contributes -- is mean 0.14/255 with a max of 15.  That is almost
        # certainly invisible, and it is still a risk taken on a smooth
        # gradient, which is the one thing lossy WebP bands.  38 KB is not
        # worth it on the owner's own artwork.
        img.save(OUT, lossless=True)
        import os
        print(f'wrote {OUT}  ({os.path.getsize(OUT) / 1024:.0f} KB)')
    sys.exit(0 if ok else 1)
