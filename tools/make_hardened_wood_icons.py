#!/usr/bin/env python3
"""v2.3.3139: the hardened-wood bag icons, one per tree, from its own LOG icon.

The owner: "Maybe 5 logs of the raw material can make one 'hardened (name)
wood' raw material so it mirrors the same structure."  The bars' icons are one
painting recoloured per metal (make_bar_icons.py); these are each tree's own
log painting (public/icons/items/wood-*.webp), PROCESSED the way the wood is:

  1. the sprigs come off -- a hardened piece is not a fresh log: the green
     leaves (and their outlines and stems) are found by hue, everything outside
     the log's own outline goes, and the patch a sprig covered on the bark is
     filled from the bark round it;
  2. the wood is deepened -- darker and richer, as wood is when it is hardened
     (fire-hardened, oiled), the tree still telling by its colour;
  3. two IRON BANDS go round it, so it reads as worked material beside the
     raw log in the bag: each band the end face's own ellipse moved along the
     log (the near half, the half a viewer sees), shaded like a curved strap,
     with a dark edge, a glint and two rivets.

    python3 tools/make_hardened_wood_icons.py            # every wood
    python3 tools/make_hardened_wood_icons.py pine maple # just these

writes public/icons/items/hardened-<wood>.webp at 256x256, the size of every
other item icon.  numpy + PIL only.
"""
import sys

import numpy as np
from PIL import Image, ImageDraw

WOODS = {
    # wood -> its log's icon (InventoryPanel WOOD_THUMB / WOOD_THUMBS)
    'pine': 'public/icons/items/wood-log.webp',
    'softwood': 'public/icons/items/wood-softwood.webp',
    'hardwood': 'public/icons/items/wood-hardwood.webp',
    'cedar': 'public/icons/items/wood-cedar.webp',
    'maple': 'public/icons/items/wood-maple.webp',
}
OUT = 'public/icons/items/hardened-{}.webp'
SIZE = 256


def hsv(rgb):
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    d = mx - mn
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.zeros_like(mx)
    m = d > 1e-6
    i = (mx == r) & m
    h[i] = ((g - b)[i] / d[i]) % 6
    i = (mx == g) & m
    h[i] = ((b - r)[i] / d[i]) + 2
    i = (mx == b) & m
    h[i] = ((r - g)[i] / d[i]) + 4
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    return h * 60, s, mx


def dilate(mask, n):
    out = mask.copy()
    for _ in range(n):
        o = out.copy()
        o[1:, :] |= out[:-1, :]
        o[:-1, :] |= out[1:, :]
        o[:, 1:] |= out[:, :-1]
        o[:, :-1] |= out[:, 1:]
        out = o
    return out


def erode(mask, n):
    return ~dilate(~mask, n)


def largest_component(mask):
    """4-connected labelling by flood fill (small icons: plain Python is fine)."""
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    best = None
    for y0 in range(h):
        for x0 in range(w):
            if not mask[y0, x0] or seen[y0, x0]:
                continue
            stack = [(y0, x0)]
            seen[y0, x0] = True
            pts = []
            while stack:
                y, x = stack.pop()
                pts.append((y, x))
                for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = True
                        stack.append((yy, xx))
            if best is None or len(pts) > len(best):
                best = pts
    out = np.zeros_like(mask, dtype=bool)
    if best:
        ys, xs = zip(*best)
        out[list(ys), list(xs)] = True
    return out


def hull_mask(mask):
    """The convex hull of a mask, filled (monotone chain)."""
    ys, xs = np.nonzero(mask)
    pts = sorted(set(zip(xs.tolist(), ys.tolist())))

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    poly = lower[:-1] + upper[:-1]
    img = Image.new('L', (mask.shape[1], mask.shape[0]), 0)
    ImageDraw.Draw(img).polygon(poly, fill=255, outline=255)
    return np.array(img) > 0


def make(wood, src):
    im = np.array(Image.open(src).convert('RGBA').resize((SIZE, SIZE), Image.LANCZOS)).astype(np.float32) / 255
    rgb, a = im[..., :3], im[..., 3]
    opaque = a > 0.02
    h, s, v = hsv(rgb)

    # 1. the sprigs: green fill, grown over their dark outlines -- and the
    #    olive stems that run down into the bark (green about as strong as red,
    #    unlike bark's half), looked for only near the leaves
    leaf = opaque & (h > 55) & (h < 160) & (s > 0.25) & (v > 0.15)
    r_, g_ = rgb[..., 0], rgb[..., 1]
    olive = opaque & (h > 42) & (h < 160) & (s > 0.3) & (v > 0.05) & (g_ >= 0.8 * r_)
    leaf = leaf | (olive & dilate(leaf, 14))
    leaf_wide = dilate(leaf, 3) & opaque
    body = largest_component(opaque & ~leaf_wide)
    # a sprig's stem is a thin line into the bark: opening the body (shrink,
    # keep the log, grow back) cuts anything that thin off the outline
    core = dilate(largest_component(erode(body, 4)), 4) & body
    hull = hull_mask(core)
    # where a sprig was, the log's outline runs straight on (its convex hull)
    # and everything inside it is log; elsewhere the painting's own edge
    zone = dilate(leaf_wide, 2)
    shape = hull & (opaque | zone)
    body = body & shape & ~zone
    a = np.where(shape, np.where(zone, 1.0, a), 0.0)

    # the log's frame: its long axis (PCA of the body) and the end face
    ys, xs = np.nonzero(shape)
    pts = np.stack([xs, ys], 1).astype(np.float32)
    c = pts.mean(0)
    cov = np.cov((pts - c).T)
    evals, evecs = np.linalg.eigh(cov)
    axis = evecs[:, np.argmax(evals)]
    lum = rgb @ np.array([0.299, 0.587, 0.114])
    yy, xx = np.mgrid[0:SIZE, 0:SIZE].astype(np.float32)
    u = (xx - c[0]) * axis[0] + (yy - c[1]) * axis[1]
    vv = -(xx - c[0]) * axis[1] + (yy - c[1]) * axis[0]
    # the end face is the light end grain at one end of the axis
    uin = u[shape]
    lo, hi = np.percentile(uin, 2), np.percentile(uin, 98)
    near_lo = shape & (u < lo + 0.35 * (hi - lo))
    near_hi = shape & (u > hi - 0.35 * (hi - lo))
    if lum[near_hi].mean() > lum[near_lo].mean():   # the face is at the high end: flip
        axis = -axis
        u, vv = -u, -vv
        lo, hi = -hi, -lo
        near_lo = near_hi
    face = near_lo & (lum > np.percentile(lum[near_lo], 55))
    fy, fx = np.nonzero(face)
    fu, fv = u[fy, fx], vv[fy, fx]
    cu, cv = fu.mean(), fv.mean()
    b_ax = max(4.0, 2.0 * float(np.sqrt(np.var(fu))))   # the face's half-depth along the log
    a_ax = max(8.0, 2.0 * float(np.sqrt(np.var(fv))))   # its half-height across it
    squash = b_ax / a_ax                                 # the ring's depth for its height

    # what a sprig covered on the bark is filled with bark from further along
    # the log, the way its grain runs, so the patch keeps the bark's texture
    hole = shape & zone
    known = body
    hy, hx = np.nonzero(hole)
    for y0, x0 in zip(hy.tolist(), hx.tolist()):
        for d in (18, -18, 26, -26, 34, -34, 44, -44, 56, -56):
            sx = int(round(x0 + d * axis[0]))
            sy = int(round(y0 + d * axis[1]))
            if 0 <= sx < SIZE and 0 <= sy < SIZE and known[sy, sx] and face[sy, sx] == face[y0, x0]:
                rgb[y0, x0] = rgb[sy, sx]
                break
        else:
            rgb[y0, x0] = rgb[known].mean(0)
    # ...and the outline is inked again along that stretch, as the painter's is
    ink = shape & ~erode(shape, 2) & zone
    rgb[ink] = rgb[ink] * 0.3

    # 2. hardened: darker and richer, the tree's colour kept
    hard = np.clip(rgb ** 1.22 * 0.86, 0, 1)
    grey = hard @ np.array([0.299, 0.587, 0.114])
    hard = np.clip(grey[..., None] + (hard - grey[..., None]) * 1.18, 0, 1)
    rgb = hard

    # 3. two iron bands round the barrel
    length = hi - cu
    band_w = max(9.0, 0.075 * length)
    barrel = shape & (u > cu + b_ax * 0.6)
    out_rgb = rgb.copy()
    out_a = a.copy()
    for f in (0.36, 0.72):
        u0 = cu + f * length
        # the barrel's own height where the band goes round it (the end face
        # can read a little smaller): its extremes sit at u0, as the ring's do
        at = shape & (np.abs(u - u0) < 2.5)
        if not at.any():
            continue
        vmin, vmax = float(vv[at].min()), float(vv[at].max())
        a_b = (vmax - vmin) / 2
        c_b = (vmax + vmin) / 2
        t = np.clip((vv - c_b) / a_b, -1, 1)
        bulge = squash * a_b * np.sqrt(np.clip(1 - t * t, 0, 1))   # the near half of the ring
        du = u - (u0 + bulge)
        band = barrel & (np.abs(du) <= band_w / 2) & (np.abs(vv - c_b) <= a_b)
        if not band.any():
            continue
        # a curved strap: light across its upper middle, dark to the edges
        across = t
        shade = 0.55 + 0.45 * np.cos((across + 0.35) * np.pi / 2.2)
        edge = np.abs(du) / (band_w / 2)
        shade = shade * (1 - 0.35 * edge ** 4)
        iron = np.stack([0.42 * shade + 0.05, 0.44 * shade + 0.05, 0.48 * shade + 0.06], -1)
        # a glint along the strap's near edge
        glint = band & (du < -band_w / 2 + 2.2) & (across < 0.2)
        iron = np.where(glint[..., None], np.clip(iron + 0.32, 0, 1), iron)
        # dark edges
        rim = band & (np.abs(du) >= band_w / 2 - 1.4)
        iron = np.where(rim[..., None], iron * 0.35, iron)
        out_rgb = np.where(band[..., None], iron, out_rgb)
        out_a = np.where(band, 1.0, out_a)
        # two rivets on each band
        img_r = Image.new('L', (SIZE, SIZE), 0)
        dr = ImageDraw.Draw(img_r)
        for tv in (-0.42, 0.38):
            vv0 = c_b + tv * a_b
            uu0 = u0 + squash * a_b * np.sqrt(max(0.0, 1 - tv * tv))
            px = c[0] + uu0 * axis[0] - vv0 * axis[1]
            py = c[1] + uu0 * axis[1] + vv0 * axis[0]
            rr = max(2.2, band_w * 0.22)
            dr.ellipse([px - rr, py - rr, px + rr, py + rr], fill=255)
        riv = (np.array(img_r) > 0) & band
        out_rgb = np.where(riv[..., None], np.array([0.78, 0.80, 0.84]), out_rgb)
        riv_rim = dilate(riv, 1) & ~riv & band
        out_rgb = np.where(riv_rim[..., None], np.array([0.10, 0.10, 0.12]), out_rgb)

    res = np.dstack([np.clip(out_rgb, 0, 1), np.clip(out_a, 0, 1)])
    img = Image.fromarray((res * 255 + 0.5).astype(np.uint8), 'RGBA')
    img.save(OUT.format(wood), 'WEBP', quality=90, method=6)
    return img


def main(argv):
    names = argv or list(WOODS)
    for n in names:
        if n not in WOODS:
            raise SystemExit('unknown wood: ' + n + ' (one of ' + ', '.join(WOODS) + ')')
        make(n, WOODS[n])
        print('wrote', OUT.format(n))


if __name__ == '__main__':
    main(sys.argv[1:])
