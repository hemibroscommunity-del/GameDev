#!/usr/bin/env python3
"""v2.3.3281: THE OWNER'S BAG ICONS, CUT FROM THEIR FIVE SHEETS.

The owner, 2026-10-17, after the bag-item prompts (docs/art/FARM-ART-PROMPTS.md
"Start here" and Sheets 1-2, docs/ART-WISHLIST.md's hardened wood and
essences): "Here are the art assets from the 5 other prompts".  Five sheets on
one flat magenta, each an equal-cell grid read like a page:

  sheet-bag-wood.png      3 x 2  hardened pine, softwood, hardwood, cedar,
                                 maple, the box trap
  sheet-bag-dishes.png    3 x 2  herb bread, root stew, pumpkin pie, garden
                                 stew, firebloom tea, compost
  sheet-bag-essences.png  3 x 3  rare / elite / godly (columns) by copper /
                                 iron / black steel (rows)
  sheet-bag-seeds.png     4 x 4  the sixteen seed packets, the crop sheet's order
  sheet-bag-crops.png     4 x 4  the sixteen crops

Each icon becomes public/icons/items/<name>.webp, 256 x 256 in the item set's
frame: its longest side 195 px, a 12% margin, centred -- as sword.webp,
amulet.webp and ore-copper.webp sit.  The hardened woods and the essences
REPLACE the stand-ins tools/make_hardened_wood_icons.py and
tools/make_essence_icons.py drew (those tools now refuse to run over them).

THE KEY is the Object Studio's (public/tools/style/process.js keyOut), in numpy:
  - background: within T0 of the border's colour, or a HOLE -- magenta's own
    hue with next to no green, a gap between wheat stalks or a vine's leaves;
  - the 2 px edge band: alpha by how far a px sits from the background toward
    the solid colour just inside it, its colour un-mixed from the background;
  - despill within 6 px: a px leaning magenta loses the lean.
And one thing keyOut does not do, for the dishes' STEAM, a see-through wisp
over magenta that keyOut keeps solid and lilac: a magenta-leaning px joined to
the background through magenta-leaning px is as see-through as its colour
allows (the least alpha that un-mixes to a real colour), and un-mixed -- so
the steam comes out white and faint, and an outline's soft edge dark.  A
purple shade INSIDE an outline (the firebloom packet's glow on navy) is walled
off by the outline and stays as drawn.

FINDING THE ICONS: pieces (8-connected, alpha over 0.15, MIN_AREA px or more)
go to the grid cell their centre falls in; each cell must hold one piece at
least a fifth the size of the sheet's median icon, and an icon is every piece
in its cell (the essences' sparkles, the steam, the stew's crumbs).  Nothing is
written unless every cell has its icon.

  python3 tools/ui/cut-bag-icons.py [--contact out.png] [--force] [--dry]

--force overwrites files this tool did not make before (the stand-ins above
are expected, and named in REPLACES).
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'assets', 'icons-source')
PUB = os.path.join(ROOT, 'public', 'icons', 'items')
SIZE, MARGIN, QUALITY = 256, 0.12, 90
MIN_AREA = 20

CROPS = ['carrot', 'potato', 'pumpkin', 'wheat', 'corn', 'tomato', 'cabbage', 'strawberry',
         'firebloom', 'rock-vine', 'cloudpetal', 'frostberry',
         'thunder-pepper', 'dewmelon', 'gloomcap', 'heartroot']
GRADES = ['rare', 'elite', 'godly']
METALS = ['copper', 'iron', 'blacksteel']
SHEETS = [
    ('sheet-bag-wood.png', 3, 2, ['hardened-pine', 'hardened-softwood', 'hardened-hardwood',
                                  'hardened-cedar', 'hardened-maple', 'trap-box']),
    ('sheet-bag-dishes.png', 3, 2, ['herb-bread', 'root-stew', 'pumpkin-pie',
                                    'garden-stew', 'firebloom-tea', 'compost']),
    ('sheet-bag-essences.png', 3, 3, ['essence-%s-%s' % (g, m) for m in METALS for g in GRADES]),
    ('sheet-bag-seeds.png', 4, 4, ['seed-' + c for c in CROPS]),
    ('sheet-bag-crops.png', 4, 4, ['crop-' + c for c in CROPS]),
]
# the stand-ins these replace, drawn by tools/make_hardened_wood_icons.py and
# tools/make_essence_icons.py: expected to be there, overwritten without --force
REPLACES = {n for _, _, _, names in SHEETS for n in names if n.startswith(('hardened-', 'essence-'))}

# keyOut's numbers (public/tools/style/process.js)
T0, EDGE_R, DESPILL_R, SPILL_OK = 60, 2, 6, 24
WIN = EDGE_R + 2
HOLE_G, HOLE_LEAN, HOLE_HUE = 75, 90, 60


def box_sum(a, r):
    """The sum over each px's (2r+1)^2 window (zeros past the edges)."""
    pad = [(r + 1, r), (r + 1, r)] + ([(0, 0)] if a.ndim == 3 else [])
    s = np.pad(a, pad).cumsum(0).cumsum(1)
    h, w = a.shape[:2]
    k = 2 * r + 1
    return s[k:k + h, k:k + w] - s[0:h, k:k + w] - s[k:k + h, 0:w] + s[0:h, 0:w]


def near(mask, r):
    return box_sum(mask.astype(np.float64), r) > 0.5


def joined(seed, through):
    """The px of `through` reachable from `seed` through `through` (8-connected)."""
    h, w = seed.shape
    out = np.zeros_like(seed)
    q = deque()
    ys, xs = np.nonzero(near(seed, 1) & through & ~seed)
    for y, x in zip(ys.tolist(), xs.tolist()):
        out[y, x] = True
        q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                v, u = y + dy, x + dx
                if 0 <= v < h and 0 <= u < w and through[v, u] and not out[v, u] and not seed[v, u]:
                    out[v, u] = True
                    q.append((v, u))
    return out


def key(img):
    """RGBA (floats, alpha 0..1) of a sheet on one flat colour."""
    d = np.asarray(img.convert('RGB')).astype(np.float64)
    R, G, B = d[..., 0], d[..., 1], d[..., 2]
    border = np.concatenate([d[0], d[-1], d[:, 0], d[:, -1]])
    K = np.median(border, axis=0)
    if not (K[0] > 150 and K[2] > 150 and K[1] < 110):
        raise SystemExit('ABORT: the sheet is not on magenta (border %s)' % K.round().tolist())
    dist = np.sqrt(((d - K) ** 2).sum(-1))
    lean = np.minimum(R, B) - G
    bg = (dist < T0) | ((G < HOLE_G) & (lean > HOLE_LEAN) & (np.abs(R - B) < HOLE_HUE))
    # magenta-leaning px joined to the background through more of them: steam,
    # and the soft outer edge of an outline
    leaning = (lean > SPILL_OK) & (np.abs(R - B) < np.maximum(40, 0.5 * lean))
    soft = joined(bg, leaning)
    edge = near(bg, EDGE_R) & ~bg & ~soft
    solid = ~bg & ~near(bg, EDGE_R) & ~soft
    alpha = np.ones(bg.shape)
    alpha[bg] = 0
    # the edge band: how far from the background toward the solid colour inside
    cnt = box_sum(solid.astype(np.float64), WIN)
    fmean = box_sum(d * solid[..., None], WIN) / np.maximum(cnt, 1)[..., None]
    v, u = fmean - K, d - K
    vv = (v * v).sum(-1)
    a_proj = np.where(vv > 1, (u * v).sum(-1) / np.maximum(vv, 1e-9), 1.0)
    a_sliver = (dist - T0) / 120   # no solid inside: a twig, a thin stalk
    alpha[edge] = np.clip(np.where(cnt > 0, a_proj, a_sliver), 0, 1)[edge]
    # soft: the least alpha whose un-mixed colour is a real colour
    amin = np.zeros(bg.shape)
    for c in range(3):
        Kc, Pc = K[c], d[..., c]
        lo = np.where(Pc <= Kc, 1 - Pc / max(Kc, 1e-6), 0) if Kc > 0 else np.zeros(bg.shape)
        hi = np.where(Pc > Kc, (Pc - Kc) / max(255 - Kc, 1e-6), 0)
        amin = np.maximum(amin, np.maximum(lo, hi))
    alpha[soft] = np.clip(amin, 0, 1)[soft]
    rgb = d.copy()
    part = (alpha >= 0.03) & (alpha < 0.97)
    a3 = np.maximum(alpha, 1e-6)[..., None]
    un = (d - (1 - alpha[..., None]) * K) / a3
    # whatever spill is left: an un-mixed px never keeps the key's colour
    spill = np.minimum(un[..., 0], un[..., 2]) - un[..., 1]
    cut = np.maximum(spill - 50, 0)
    un[..., 0] -= cut
    un[..., 2] -= cut
    rgb[part] = un[part]
    alpha[alpha < 0.03] = 0
    # despill near the background
    l2 = np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1] - SPILL_OK
    fix = near(bg, DESPILL_R) & (alpha > 0) & (l2 > 0)
    rgb[..., 0][fix] -= l2[fix]
    rgb[..., 2][fix] -= l2[fix]
    return np.dstack([np.clip(rgb, 0, 255), alpha])


def pieces(alpha):
    """[(area, cy, cx, (y0, x0, y1, x1), label)] and the label image."""
    m = alpha > 0.15
    h, w = m.shape
    lab = np.zeros((h, w), np.int32)
    out = []
    n = 0
    ys, xs = np.nonzero(m)
    for y0, x0 in zip(ys.tolist(), xs.tolist()):
        if lab[y0, x0]:
            continue
        n += 1
        lab[y0, x0] = n
        q = deque([(y0, x0)])
        area = sy = sx = 0
        by0, bx0, by1, bx1 = y0, x0, y0, x0
        while q:
            y, x = q.popleft()
            area += 1
            sy += y
            sx += x
            by0, bx0, by1, bx1 = min(by0, y), min(bx0, x), max(by1, y), max(bx1, x)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    v, u = y + dy, x + dx
                    if 0 <= v < h and 0 <= u < w and m[v, u] and not lab[v, u]:
                        lab[v, u] = n
                        q.append((v, u))
        out.append((area, sy / area, sx / area, (by0, bx0, by1 + 1, bx1 + 1), n))
    return out, lab


def fit(rgba, size):
    """Into the item set's frame: longest side size * (1 - 2 MARGIN), centred."""
    im = Image.fromarray(rgba, 'RGBA')
    w, h = im.size
    s = size * (1 - 2 * MARGIN) / max(w, h)
    dw, dh = max(1, round(w * s)), max(1, round(h * s))
    small = im.convert('RGBa').resize((dw, dh), Image.LANCZOS).convert('RGBA')
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.alpha_composite(small, ((size - dw) // 2, (size - dh) // 2))
    return out


def main():
    force = '--force' in sys.argv
    dry = '--dry' in sys.argv   # cut and show, write nothing
    contact = sys.argv[sys.argv.index('--contact') + 1] if '--contact' in sys.argv else None
    cuts = []
    for sheet, cols, rows, names in SHEETS:
        img = Image.open(os.path.join(SRC, sheet))
        k = key(img)
        h, w = k.shape[:2]
        ps, lab = pieces(k[..., 3])
        cells = {}
        dropped = 0
        for p in ps:
            if p[0] < MIN_AREA:
                dropped += 1
                continue
            r = min(rows - 1, int(p[1] * rows / h))
            c = min(cols - 1, int(p[2] * cols / w))
            cells.setdefault((r, c), []).append(p)
        mains = [max(cells[rc], key=lambda p: p[0])[0] for rc in cells]
        med = float(np.median(mains)) if mains else 0
        print(f'{sheet}: {len(ps)} pieces ({dropped} specks under {MIN_AREA} px dropped), '
              f'{cols} x {rows} cells, median icon {med:.0f} px')
        for i, name in enumerate(names):
            rc = (i // cols, i % cols)
            got = cells.get(rc, [])
            big = max(got, key=lambda p: p[0]) if got else None
            if not big or big[0] < 0.2 * med:
                print(f'  ABORT {name}: cell row {rc[0] + 1} col {rc[1] + 1} has no icon')
                return 1
            ids = [p[4] for p in got]
            mine = np.isin(lab, ids)
            mine = near(mine, 3) & (k[..., 3] > 0)
            ys, xs = np.nonzero(mine)
            y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            crop = k[y0:y1, x0:x1].copy()
            crop[..., 3] *= mine[y0:y1, x0:x1]
            rgba = np.dstack([crop[..., :3], crop[..., 3] * 255]).round().clip(0, 255).astype(np.uint8)
            print(f'    {name:26s} {len(got):2d} piece(s)  x{x0} y{y0} {x1 - x0}x{y1 - y0}')
            cuts.append((name, rgba))
    if contact:
        cols_n, cell = 8, 140
        rows_n = (len(cuts) + cols_n - 1) // cols_n
        cs = Image.new('RGBA', (cols_n * cell, rows_n * cell * 2), (0, 0, 0, 255))
        for i, (name, rgba) in enumerate(cuts):
            t = fit(rgba, cell - 8)
            x, y = (i % cols_n) * cell, (i // cols_n) * cell * 2
            dark = Image.new('RGBA', (cell, cell), (34, 40, 46, 255))
            light = Image.new('RGBA', (cell, cell), (226, 220, 206, 255))
            dark.alpha_composite(t, (4, 4))
            light.alpha_composite(t, (4, 4))
            cs.alpha_composite(dark, (x, y))
            cs.alpha_composite(light, (x, y + cell))
        cs.convert('RGB').save(contact)
        print('contact sheet:', contact)
    if dry:
        return 0
    clash = [n for n, _ in cuts if n not in REPLACES and os.path.exists(os.path.join(PUB, n + '.webp'))]
    if clash and not force:
        print('refusing to overwrite (pass --force to re-cut):\n  ' + '\n  '.join(clash))
        return 1
    total = 0
    for name, rgba in cuts:
        path = os.path.join(PUB, name + '.webp')
        fit(rgba, SIZE).save(path, 'WEBP', quality=QUALITY, method=6)
        total += os.path.getsize(path)
        print(f'  wrote {os.path.relpath(path, ROOT)}  {os.path.getsize(path) / 1024:.1f} KB')
    print(f'{len(cuts)} icons, {total / 1024:.0f} KB')
    return 0


if __name__ == '__main__':
    sys.exit(main())
