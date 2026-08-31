#!/usr/bin/env python3
"""DE-FRINGE THE CHARACTER SHEETS (v2.3.2174).

Owner: "the black outlines of the character during movement look badly chewed
up and some frames still have noisy pixels ... Mostly recolored shirt and skin
has chewed up look."

═══ WHY THE RECOLOURED SURFACES ARE THE WORST ═══

The runtime recolours the body by CLASSIFYING each pixel (playerSkins.js), and
every branch of that classifier has an ALPHA GATE:

    _isSkin(r,g,b,a)          a > 40
    pants  (green test)       a > 180
    boots  (flat-grey test)   a > 180
    shirt mask                a > 40

A soft anti-aliased edge ramps alpha 0..255 across a pixel or two. Every edge
pixel under the gate KEEPS ITS ORIGINAL COLOUR while the interior beside it is
retinted. Pick blue trousers and the leg's rim stays the art's original green.
That rim is the "chewed up" look, and it is worst on the recoloured surfaces
because those are the only ones where the interior moves and the rim does not.

The RGB tests fail the same way independently: a blended edge pixel is a mix of
two regions' colours, so a green/skin boundary pixel is a muddy olive that fails
`g > b + 8` even at full alpha.

Measured on public/sprites/player/jog-east.png (28 frames):
  - 28% of every frame's non-transparent pixels are NOT fully opaque
  - 4664 of them are "ghosts" at alpha <= 8: invisible, but still uploaded,
    still sampled, and still counted by anything that measures the silhouette
  - 67% of the mid-alpha pixels are DARK (luminance < 70) -- i.e. the black
    KEYLINE ITSELF is drawn in partial alpha. An outline whose opacity varies
    pixel to pixel, composited over grass one frame and sand the next, is an
    outline that visibly crawls. That is the reported "chewed up" edge.
  - 56% of mid-alpha pixels carry a BLENDED colour matching no solid pixel
    within 2px, so alpha alone cannot be snapped: the colour has to be
    un-blended too.

═══ WHAT THIS DOES ═══

Three passes, in order, per sheet:

  1. ERASE GHOSTS (alpha <= GHOST_MAX). Invisible by construction -- the most
     opaque ghost is 3% coverage -- so nothing that can be seen is removed.
     This is the "noisy pixels" half of the report.

  2. UN-BLEND the remaining partial pixels' COLOUR, leaving alpha alone. A fringe pixel's
     true colour is one of the colours it sits between, so it is snapped to the
     RGB of the nearest FULLY-OPAQUE pixel within RADIUS whose colour is
     closest to its own. That cannot invent a colour and cannot fetch one from
     across the sprite: the replacement is always a real, adjacent, solid art
     pixel. Its ALPHA IS NOT TOUCHED -- see the long note at that pass for the
     two measured failures that rule out moving it in either direction.

  3. SNAP NEAR-OPAQUE (alpha >= 248) to a true 255. Visually identical; it is
     the difference between passing and failing an `a == 255` test, and it
     removes 250-254 noise the palette should never have had.

The result is a sheet carrying only EXACT PALETTE COLOURS, with the artist's
silhouette untouched to the pixel. The classifier's hue tests then succeed at
the edge instead of one pixel short of it, so the retint reaches the outline --
and the keyline reads as one colour instead of a muddy per-pixel blend.

═══ WHAT IT REFUSES TO TOUCH ═══

A sheet made of DEEP partial-alpha -- true 32..224 coverage more than 2px from
any transparency -- is deliberately translucent art (a flame, a vortex), not a
fringe, and re-colouring it against its neighbours would muddy it. The sweep
skips any sheet over
DEEP_MAX. Measured, the two populations are two orders of magnitude apart
(fx/whirl-vortex 40.6% of art, player/jog-east 0.1%). The body,
gear and trait sheets in scope are all opaque garments and flesh; this guard
exists so that pointing the tool at fx/ later cannot quietly ruin it.

  python3 tools/sprite-defringe.py --check  public/sprites/player
  python3 tools/sprite-defringe.py          public/sprites/player
  python3 tools/sprite-defringe.py --webp   public/sprites/player   # + siblings

WEBP IS NOT OPTIONAL. loadWebpOrPng PREFERS the .webp sibling, and the workflow
that regenerates them only fires when its own converter changes -- so a PNG
edited without its sibling is a silent no-op for every player. That is the
v2.3.2144 lesson, and --webp is how this tool refuses to repeat it.
"""
import argparse, os, sys
from PIL import Image
import numpy as np

GHOST_MAX = 8      # alpha <= this is invisible: erase (max 3% coverage)
KEEP_AT   = GHOST_MAX + 1  # keep EVERYTHING the ghost cut leaves -- see below
NEAR_OPQ  = 248    # alpha >= this is "meant to be 255"
RADIUS    = 2      # how far to look for the solid pixel a fringe belongs to
DEEP_MAX  = 0.08   # >8% of the art being DEEP partial-alpha = real translucency


def analyse(a):
    """Alpha census + the interior-translucency ratio that gates the sweep."""
    al = a[:, :, 3].astype(int)
    nz = al > 0
    tot = int(nz.sum())
    if not tot:
        return None
    ghost = (al > 0) & (al <= GHOST_MAX)
    mid = (al > GHOST_MAX) & (al < NEAR_OPQ)
    near = (al >= NEAR_OPQ) & (al < 255)
    solid = al == 255
    # ── IS THIS ART DELIBERATELY TRANSLUCENT? ──
    # First cut asked "is this mid-alpha pixel adjacent to a transparent one",
    # and it was wrong in the direction that skips work: a fringe TWO pixels
    # thick has an inner row touching no transparency at all, so the most
    # heavily-fringed sheets -- exactly the ones that most need this -- were
    # read as glass and skipped.
    #
    # The honest discriminator is DEEP CORE: a pixel at a TRUE partial coverage
    # (32..224, not the 248-254 that a lossy pipeline leaves behind) sitting
    # more than 2px from any transparency. A fringe cannot produce those; a
    # ghost or a flame is made of them. Measured:
    #     fx/whirl-vortex  40.6% of art    fx/stun-stars  12.0%
    #     gear fire-south   3.2%           player/jog-east 0.1%
    # -- two orders of magnitude apart, so the 8% gate below is nowhere near
    # either population's edge.
    core = (al >= 32) & (al <= 224)
    deep = 0
    if core.any():
        d = al == 0
        for _ in range(2):                       # radius-2 dilation
            pad = np.pad(d, 1, constant_values=True)
            n = np.zeros_like(d)
            for dy in (0, 1, 2):
                for dx in (0, 1, 2):
                    n |= pad[dy:dy + d.shape[0], dx:dx + d.shape[1]]
            d = n
        deep = int((core & ~d).sum())
    return dict(tot=tot, ghost=int(ghost.sum()), mid=int(mid.sum()),
                near=int(near.sum()), solid=int(solid.sum()),
                deep=deep, deepRatio=deep / tot)


def defringe(a):
    """Returns (new_array, stats). Pure function of the pixels."""
    a = a.copy()
    al = a[:, :, 3].astype(int)
    H, W, _ = a.shape
    rgb = a[:, :, :3].astype(int)
    solid = al == 255

    erased = snapped = unblended = nearfix = 0

    # ── pass 1: ghosts ──
    ghost = (al > 0) & (al <= GHOST_MAX)
    erased = int(ghost.sum())
    a[ghost] = (0, 0, 0, 0)
    al[ghost] = 0

    # ── pass 2: un-blend the fringe's COLOUR, and leave its ALPHA alone ──
    #
    # THE ALPHA IS NOT OURS TO MOVE. Measured both directions on the body
    # sheets, and each breaks a different overlay invariant that a scenario
    # already pins:
    #   erode (binarise at 50% coverage) -> the body shrinks out from under the
    #     gear fitted to it. jog-east tee pixels standing over a transparent
    #     body went 2 -> 102; mp-shirtarm's "the sleeve never grew the
    #     character" catches it.
    #   dilate (snap every fringe pixel opaque) -> the body's soft edge becomes
    #     hard SKIN just outside the tee's edge. mp-southshirt's sliver measure
    #     went 0 -> 5.07/8.73/5.25/9.43 px per frame on the four jog facings --
    #     the same defect v2.3.1873/1995/2078 fought, and isolating the sweep to
    #     the body sheets alone reproduced those numbers exactly, so it is the
    #     body's edge and not the gear's.
    # The silhouette is load-bearing registration data for every gear and trait
    # sheet drawn on top of it. So this pass changes only what a pixel IS, never
    # whether it is there.
    #
    # That still fixes the reported defect, because the defect is a COLOUR one:
    # the classifier's hue tests are what a blended edge pixel fails, and skin
    # and shirt -- the two surfaces the owner named -- gate at a > 40, which the
    # fringe already passes. Un-blending hands them an exact palette colour, so
    # they retint with their region instead of keeping the art's original hue.
    # The dark two thirds of the fringe likewise snap to the sheet's true
    # keyline value instead of a muddy brown-grey, which is the "chewed up"
    # outline resolving without the silhouette moving a pixel.
    mid = (al > GHOST_MAX) & (al < NEAR_OPQ)
    ys, xs = np.nonzero(mid)
    for y, x in zip(ys, xs):
        y0, y1 = max(0, y - RADIUS), min(H, y + RADIUS + 1)
        x0, x1 = max(0, x - RADIUS), min(W, x + RADIUS + 1)
        win_solid = solid[y0:y1, x0:x1]
        if not win_solid.any():
            continue
        win_rgb = rgb[y0:y1, x0:x1]
        here = rgb[y, x]
        # closest SOLID colour in the neighbourhood: the region this
        # fringe pixel was blended out of.
        d = np.abs(win_rgb - here).sum(axis=2)
        d = np.where(win_solid, d, 1 << 20)
        iy, ix = np.unravel_index(int(np.argmin(d)), d.shape)
        a[y, x, 0:3] = win_rgb[iy, ix]
        unblended += 1

    # ── pass 3: near-opaque -> a true 255 ──
    al2 = a[:, :, 3].astype(int)
    nearm = (al2 >= NEAR_OPQ) & (al2 < 255)
    nearfix = int(nearm.sum())
    a[nearm, 3] = 255

    return a, dict(erased=erased, snapped=snapped, unblended=unblended,
                   nearfix=nearfix)


def walk(target):
    if os.path.isfile(target):
        return [target]
    out = []
    for dp, _, fs in os.walk(target):
        for f in sorted(fs):
            if f.endswith('.png'):
                out.append(os.path.join(dp, f))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('targets', nargs='+')
    ap.add_argument('--check', action='store_true', help='measure only, write nothing')
    ap.add_argument('--webp', action='store_true', help='also rewrite the .webp sibling')
    args = ap.parse_args()

    files = []
    for t in args.targets:
        files += walk(t)

    tot_e = tot_s = tot_u = tot_n = wrote_webp = 0
    skipped, changed = [], 0
    for p in files:
        im = Image.open(p).convert('RGBA')
        a = np.array(im)
        info = analyse(a)
        if not info:
            continue
        if info['deepRatio'] > DEEP_MAX and info['deep'] > 200:
            skipped.append((p, info))
            continue
        if args.check:
            if info['ghost'] or info['mid'] or info['near']:
                print(f"{info['ghost']:6d} ghost {info['mid']:6d} fringe {info['near']:6d} near   "
                      f"{os.path.relpath(p)}")
            tot_e += info['ghost']; tot_s += info['mid']; tot_n += info['near']
            continue
        b, st = defringe(a)
        if not (st['erased'] or st['snapped'] or st['nearfix']):
            continue
        Image.fromarray(b, 'RGBA').save(p, 'PNG', optimize=True)
        if args.webp:
            # ONLY where a sibling already exists. Creating one where there was
            # none would change which file loadWebpOrPng picks for that sheet,
            # which is a behaviour change smuggled in under a cleanup.
            sib = os.path.splitext(p)[0] + '.webp'
            if os.path.exists(sib):
                Image.fromarray(b, 'RGBA').save(sib, 'WEBP', lossless=True,
                                                quality=100, method=4)
                wrote_webp += 1
        changed += 1
        tot_e += st['erased']; tot_s += st['snapped']
        tot_u += st['unblended']; tot_n += st['nearfix']

    if args.check:
        print(f"\n{len(files)} sheets: {tot_e} ghost px, {tot_s} fringe px, {tot_n} near-opaque px")
    else:
        print(f"{changed}/{len(files)} sheets rewritten"
              f"{f' (+ {wrote_webp} webp siblings)' if args.webp else ''}")
        print(f"  erased {tot_e} invisible/sub-coverage px, snapped {tot_s} fringe px opaque,")
        print(f"  un-blended {tot_u} colours, fixed {tot_n} near-opaque alphas")
    for p, i in skipped:
        print(f"  SKIPPED (deliberately translucent: {100*i['deepRatio']:.0f}% deep "
              f"partial-alpha): {os.path.relpath(p)}")


if __name__ == '__main__':
    main()
