#!/usr/bin/env python3
"""worldview_v4 — the owner's new overworld, with the town wall re-cut in the
town view's own rock.  (v2.3.2074)

Owner: "Use this map instead for world view. The only thing different should
be the town walls looks more like the rocks in the town view."

So this is a two-part job and only the second part is interesting.

THE MAP is the owner's art, resized to the 1024x1024 every other zone map
ships at and encoded WebP.  Its layout matches worldview_v2's exactly -- same
volcano north, snow peaks north-west, canyon north-east, blossom west, dead
wood south-west, crystal cave east, storm dome south-east, pier south -- which
is what lets WORLDVIEW_EXITS keep the trail-head coordinates that were
verified against v2 in v2.3.1359.  That claim is not taken on faith:
check_exits() samples the painted trail under every marker and fails if one
has drifted off it.

THE WALL is the part that is not a resize.  In the owner's art the town ring
is a warm tan-grey masonry; in the town view you are standing inside pale
COLUMNAR BASALT -- cool, near-neutral, much lighter.  Two maps of the same
place should agree about what the place is made of.

HOW: a luminance-preserving palette transfer, not a hue rotation.
  - the wall band is an elliptical annulus, measured off the art rather than
    guessed (see RING);
  - inside it, only near-neutral stone is taken.  The moss growing on the wall
    is deliberately left alone: the town's basalt has moss too, and recolouring
    it would turn the greenery grey;
  - each wall pixel's luminance is quantile-matched onto the basalt patch's
    luminance distribution, then given the colour the basalt actually has at
    that luminance (BASALT_PATCH, sampled from town_v17's cliffs).
Luminance carries the shape -- the block edges, the shadows between stones,
the highlight on each top face -- so mapping through it keeps every bit of the
artist's masonry and changes only what it is made of.  A flat hue shift, the
obvious alternative, keeps the tan under the grey and reads as a wall someone
has tinted.

  python3 tools/maps/build_worldview_v4.py --check    measure, write nothing
  python3 tools/maps/build_worldview_v4.py --write    write the map
"""
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(REPO, 'assets', 'map-source', 'worldview-v4-source.png')
TOWN = os.path.join(REPO, 'public', 'maps', 'town_v17.webp')
OUT = os.path.join(REPO, 'public', 'maps', 'worldview_v4.webp')
OUT_PX = 1024                       # every other zone map ships at this size

# The wall band, measured on the source art (1254x1254).  Centre and semi-axes
# of the outer edge, and of the courtyard inside it.
RING = dict(cx=599, cy=689, ax=172, ay=126, inx=104, iny=66)
# A patch of town_v17 that is almost entirely lit column face.
BASALT_PATCH = (1400, 1250, 1500, 1350)


def lum(a):
    return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114


def basalt_reference():
    """(luminance samples, LUT) for the town's rock, moss excluded."""
    t = np.asarray(Image.open(TOWN).convert('RGB').crop(BASALT_PATCH)).astype(float)
    ch = t.max(2) - t.min(2)
    green = (t[..., 1] - t[..., 0] > 14) & (t[..., 1] - t[..., 2] > 14)
    keep = (ch < 46) & ~green
    px = t[keep]
    L = lum(px)
    stops = []
    for q in np.arange(2, 99, 4):
        lo, hi = np.percentile(L, max(0, q - 3)), np.percentile(L, min(100, q + 3))
        sel = px[(L >= lo) & (L <= hi)]
        if len(sel) >= 40:
            stops.append((float(np.percentile(L, q)), sel.mean(0)))
    return L, stops


def lut_lookup(Lq, stops):
    xs = np.array([s[0] for s in stops])
    cols = np.stack([s[1] for s in stops])
    out = np.empty(Lq.shape + (3,), float)
    for c in range(3):
        out[..., c] = np.interp(Lq, xs, cols[:, c])
    return out


def ring_mask(shape):
    h, w = shape
    yy, xx = np.mgrid[0:h, 0:w]
    outer = ((xx - RING['cx']) / RING['ax']) ** 2 + ((yy - RING['cy']) / RING['ay']) ** 2 <= 1
    inner = ((xx - RING['cx']) / RING['inx']) ** 2 + ((yy - RING['cy']) / RING['iny']) ** 2 <= 1
    return outer & ~inner


def build():
    src = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
    band = ring_mask(src.shape[:2])
    ch = src.max(2) - src.min(2)
    r, g, b = src[..., 0], src[..., 1], src[..., 2]
    # Wall stone: near-neutral and bright enough to be masonry rather than the
    # shadow under it.  Grass fails on g-r, the tent roofs on chroma, the sand
    # path outside the ring on r-b.
    # 45, not 62: the mortar between the blocks is darker than the blocks, and a
    # threshold that keeps it out leaves tan grouting between grey stones.
    stone = band & (ch < 66) & ((g - r) < 24) & ((r - b) < 66) & (src.min(2) > 45)

    refL, stops = basalt_reference()
    srcL = lum(src)[stone]
    # ═══ LUMINANCE IS KEPT EXACTLY.  ONLY THE MATERIAL CHANGES. ═══
    # The first cut quantile-matched the wall's brightness onto the rock's, so
    # that a wall painted lighter than the cliffs would be pulled to match.
    # That is the wrong transfer for this picture: the town-view patch is a
    # close-up with deep shadow between columns, and forcing the worldview's
    # small, evenly-lit ring to share that distribution dropped its mean
    # luminance from 131 to 80 -- a wall in shade, on a map where the sun is
    # plainly on it.
    # The artist's lighting is not the thing the owner asked to change. So the
    # basalt colour is looked up at the pixel's OWN luminance and then rescaled
    # so its luminance is exactly what it was. Hue and chroma become the town's
    # rock; every highlight, every shadow between stones and the ring's overall
    # brightness are untouched.
    base = lut_lookup(srcL, stops)
    keepL = srcL / np.maximum(lum(base), 1e-6)
    out = src.copy()
    out[stone] = np.clip(base * keepL[:, None], 0, 255)
    return np.clip(out, 0, 255).astype(np.uint8), stone, src


def report(out, stone, src):
    print(f'wall pixels re-cut: {int(stone.sum())}')
    before = src[stone]
    after = out[stone].astype(float)
    def desc(px):
        c = px.max(1) - px.min(1)
        return (f'mean RGB {px.mean(0).round(0)}  chroma {c.mean():5.1f}  '
                f'lum {lum(px).mean():5.1f}  warm(r-b) {(px[:, 0] - px[:, 2]).mean():+5.1f}')
    print('  before: ' + desc(before))
    print('  after : ' + desc(after))
    ref, _ = basalt_reference()
    print(f'  town rock reference luminance mean {ref.mean():.1f}')
    ok = True
    warm_before = float((before[:, 0] - before[:, 2]).mean())
    warm_after = float((after[:, 0] - after[:, 2]).mean())
    if not (warm_after < warm_before - 4):
        ok = False
        print(f'FAIL: the wall is no cooler than it was ({warm_before:+.1f} -> {warm_after:+.1f} r-b)')
    # Luminance is preserved BY DESIGN, so the check is that it really was --
    # a transfer that shifts brightness has changed the lighting, not the rock.
    if abs(lum(after).mean() - lum(before).mean()) > 1.5:
        ok = False
        print(f'FAIL: the lighting moved ({lum(before).mean():.1f} -> '
              f'{lum(after).mean():.1f}); only the material should change')
    if abs(after.max(1).mean() - after.min(1).mean() - 16) > 12:
        ok = False
        print(f'FAIL: the wall is not near-neutral like the rock '
              f'(chroma {after.max(1).mean() - after.min(1).mean():.1f}, want ~16)')
    # the artist's masonry has to survive: structure is luminance VARIATION
    if lum(after).std() < lum(before).std() * 0.55:
        ok = False
        print(f'FAIL: the stonework flattened out (luminance sd '
              f'{lum(before).std():.1f} -> {lum(after).std():.1f})')
    if ok:
        print(f'OK: cooler ({warm_before:+.1f} -> {warm_after:+.1f} r-b), chroma '
              f'{before.max(1).mean() - before.min(1).mean():.1f} -> '
              f'{after.max(1).mean() - after.min(1).mean():.1f} (rock is ~16), lighting '
              f'unmoved ({lum(before).mean():.1f} -> {lum(after).mean():.1f}), masonry intact '
              f'(luminance sd {lum(before).std():.1f} -> {lum(after).std():.1f})')
    return ok


BASELINE = os.path.join(REPO, 'public', 'maps', 'worldview_v2.webp')
EXIT_TOL = 8.0          # percentage points a marker may lose against the baseline


def _trail_pct(img_rgb, tx, ty):
    """How much painted trail sits under a marker, as a percentage."""
    a = img_rgb.astype(int)
    h, w, _ = a.shape
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    trail = (r > 120) & ((r - b) > 34) & ((r - g) > -6)
    ZW = 48 * 32                       # worldview is 48x48 tiles
    ix, iy = int((tx * 32 + 16) * w / ZW), int((ty * 32 + 16) * h / ZW)
    disc = trail[max(0, iy - 18):iy + 18, max(0, ix - 18):ix + 18]
    return float(disc.mean()) * 100 if disc.size else 0.0


def check_exits(out):
    """Every WORLDVIEW_EXITS marker still stands where it stood on the map
    this one replaces.

    This is the claim the whole swap rests on: the trail-heads were measured
    against worldview_v2 in v2.3.1359 and are not re-derived here, on the
    grounds that the new art is a re-render of the same layout. "Should still
    line up" is exactly the phrase that has cost this repo a map twice --
    v2.3.1777 and v2.3.1813 both shipped exits on tiles that no longer existed.

    MEASURED AGAINST THE SHIPPED MAP, NOT AGAINST AN ABSOLUTE BAR, and that is
    the whole subtlety. The first cut of this asked for 25% painted trail under
    each marker and failed three of the five live ones -- but running the same
    detector over worldview_v2, which is in production and works, gives sky
    13.7% and frost 10.1%. The markers are not centred on their trails on the
    CURRENT map either; several sit at a trail-head beside the path rather than
    on it. An absolute threshold was measuring my detector, not the art.

    So the question is the one that actually matters for a drop-in swap: is any
    marker WORSE OFF than it is today? A few points of noise is a re-render; a
    collapse is a spoke that moved.
    """
    r = subprocess.run(['node', '-e',
        "import('%s/src/data/effects.js').then(m=>console.log(JSON.stringify(m.WORLDVIEW_EXITS)))" % REPO],
        capture_output=True, text=True, cwd=REPO)
    live = [(e['zoneId'], e['tx'], e['ty']) for e in json.loads(r.stdout)]
    # The four spokes the owner switched off as unfinished (effects.js keeps
    # them commented out). Reported, not gated: the day one is switched back on
    # its marker has to be somewhere sane, and noticing that here costs nothing.
    dormant = [('hollows', 43, 22), ('thunder', 42, 36), ('tidal', 24, 40), ('mist', 8, 32)]
    base = np.asarray(Image.open(BASELINE).convert('RGB'))
    ok = True
    print('\ntrail under each WORLDVIEW_EXITS marker, new art vs the map it replaces:')
    for zid, tx, ty in live + dormant:
        was, now = _trail_pct(base, tx, ty), _trail_pct(out, tx, ty)
        gated = (zid, tx, ty) in live
        bad = gated and now < was - EXIT_TOL
        if bad:
            ok = False
        print(f'  {zid:9s} ({tx:2d},{ty:2d})  was {was:5.1f}%  now {now:5.1f}%  '
              f'{now - was:+5.1f}  ' + ('*** LOST ITS TRAIL ***' if bad
              else ('ok' if gated else 'ok (spoke disabled)')))
    if not ok:
        print(f'FAIL: a live trail-head lost more than {EXIT_TOL:.0f} points of trail')
    return ok


if __name__ == '__main__':
    out, stone, src = build()
    ok = report(out, stone, src)
    ok = check_exits(out) and ok
    if '--write' in sys.argv:
        if not ok:
            sys.exit('refusing to write: the wall check failed')
        im = Image.fromarray(out).resize((OUT_PX, OUT_PX), Image.LANCZOS)
        im.save(OUT, 'WEBP', quality=82, method=6)
        print(f'wrote {OUT}  ({OUT_PX}x{OUT_PX}, {os.path.getsize(OUT)/1024:.0f} KB)')
    sys.exit(0 if ok else 1)
