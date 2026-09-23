#!/usr/bin/env python3
"""v2.3.2750: find WHERE on each painted map the ambient effects belong.

Owner: "make subtle effects that appear as animations on the worldview? Lava
smoke on the fire mountain maybe shimmering a bit on the lava, winds on the
desert wind area, water softly waving, etc. also doing a pass on each of the 4
currently playable zones".

The maps are single paintings, so "where is the lava / the sea / the sand" is a
question about their colours.  This samples each map, classifies pixels into
the few surfaces the effects care about, and writes a small table of points
(u, v in 0..1 of the map -- the renderer multiplies by the zone's world size,
the same way the map sprite is stretched over it) plus, for the area effects,
the box the surface occupies.

It runs OFFLINE and writes src/data/ambientSpots.js, so the client never reads
map pixels at runtime.  Re-run it when a map is repainted:
    python3 tools/maps/build_ambient_spots.py
"""
import json, os, random
import numpy as np
from PIL import Image

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(REPO, 'src', 'data', 'ambientSpots.js')
random.seed(2704)

def load(name, size=512):
    im = Image.open(os.path.join(REPO, 'public', 'maps', name)).convert('RGB').resize((size, size), Image.BILINEAR)
    a = np.asarray(im).astype(np.int32)
    return a[..., 0], a[..., 1], a[..., 2], size

def sample(mask, n, size, min_gap=0.018):
    """Up to n points spread over the mask (a crude Poisson thinning)."""
    ys, xs = np.nonzero(mask)
    if not len(xs):
        return []
    idx = list(range(len(xs)))
    random.shuffle(idx)
    pts = []
    for i in idx:
        u, v = (xs[i] + 0.5) / size, (ys[i] + 0.5) / size
        if all((u - pu) ** 2 + (v - pv) ** 2 >= min_gap ** 2 for pu, pv in pts):
            pts.append((round(u, 3), round(v, 3)))
            if len(pts) >= n:
                break
    return pts

def box(mask, size, lo=2, hi=98):
    ys, xs = np.nonzero(mask)
    if not len(xs):
        return None
    return [round(np.percentile(xs, lo) / size, 3), round(np.percentile(ys, lo) / size, 3),
            round(np.percentile(xs, hi) / size, 3), round(np.percentile(ys, hi) / size, 3)]

def region(size, u0, v0, u1, v1):
    m = np.zeros((size, size), bool)
    m[int(v0 * size):int(v1 * size), int(u0 * size):int(u1 * size)] = True
    return m

def lava_mask(r, g, b):
    return (r > 190) & (g > 50) & (g < 200) & (b < 90) & (r - b > 140)

def hot_mask(r, g, b):          # the brightest yellow-white lava: vents / fountains
    return (r > 240) & (g > 170) & (b < 140)

out = {}

# ── worldview ──
r, g, b, S = load('worldview_v4.webp')
# the volcano only -- the desert's sun-lit sandstone to the east is the same
# orange, so the box stops short of it and the test asks for lava's saturation
lava = lava_mask(r, g, b) & (r > 215) & (b < 70) & region(S, 0.44, 0.06, 0.66, 0.27)
water = (b > 120) & (b > r + 40) & (b > g - 5) & (r < 120)
sea = water & region(S, 0.0, 0.78, 1.0, 1.0)
river = water & region(S, 0.0, 0.25, 0.42, 0.62)
sand = (r > 160) & (g > 110) & (g < 185) & (b < 120) & (r - b > 60) & region(S, 0.60, 0.12, 1.0, 0.46)
snow = (r > 200) & (g > 200) & (b > 205) & region(S, 0.0, 0.05, 0.48, 0.34)
blossom = (r > 190) & (b > 150) & (g < 175) & (r - g > 35) & region(S, 0.0, 0.28, 0.35, 0.56)
out['worldview'] = {
    'lava': sample(lava, 40, S, 0.012),
    'water': sample(sea, 70, S, 0.03) + sample(river, 18, S, 0.02),
    # the crater, where the painted plume starts (measured on the art)
    'vents': [[0.572, 0.095], [0.585, 0.1], [0.56, 0.102]],
    'areas': {
        'desert': box(sand, S),
        'snow': box(snow, S),
        'blossom': box(blossom, S),
    },
}

# ── ember (Flame Fields) ──
r, g, b, S = load('ember_v6.webp')
lava = lava_mask(r, g, b)
out['ember'] = {
    # ~60, not every lava pixel: each spot is two ADDITIVE glow sprites, and on a
    # phone that is fill-rate -- 60 still lines every channel on screen
    'lava': sample(lava, 60, S, 0.03),
    'vents': sample(hot_mask(r, g, b), 14, S, 0.08),
}

# ── sky (Wind Dunes): the dune sea along the top is where sand lifts ──
r, g, b, S = load('sky_v5.webp')
out['sky'] = {
    'areas': {'dunes': [0.0, 0.0, 1.0, 0.28]},
}

# ── verdant (Verdant Wilds): the stream and its pools ──
r, g, b, S = load('verdant_v1.webp')
pool = (g > 105) & (b > 80) & (g - r > 45) & (b - r > 25) & (b > g * 0.62)
out['verdant'] = {
    # the teal pools the classifier finds, plus the small dark pool west of the
    # path, whose teal is too muted to separate from the moss (placed by eye)
    'water': sample(pool, 26, S, 0.02) + [[0.345, 0.515], [0.365, 0.505], [0.355, 0.53]],
}

# ── frost (Frost Ridge): the sea along the west and south, the ice shelves ──
r, g, b, S = load('frost_v5.webp')
sea = (b > 110) & (b > r + 45) & (r < 110) & (g < 170)
ice = (b > 215) & (g > 205) & (r > 165) & (r < 235) & (b > r + 12)
out['frost'] = {
    'water': sample(sea, 60, S, 0.03),
    'ice': sample(ice, 40, S, 0.035),
}

for z, d in out.items():
    print(z, {k: (len(v) if isinstance(v, list) else v) for k, v in d.items()})

with open(OUT, 'w') as f:
    f.write('/* GENERATED by tools/maps/build_ambient_spots.py (v2.3.2750) -- do not edit.\n'
            '   Where on each painted map the ambient effects belong: points (u, v)\n'
            '   and boxes [u0, v0, u1, v1] in 0..1 of the map, which is stretched over\n'
            '   the zone\'s world (zone.w * TILE, zone.h * TILE).  Re-run the tool when a\n'
            '   map is repainted. */\n')
    f.write('export const AMBIENT_SPOTS = ' + json.dumps(out, separators=(',', ':')) + ';\n')
print('wrote', OUT)
