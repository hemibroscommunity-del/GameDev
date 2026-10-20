#!/usr/bin/env python3
"""v2.3.3527: THE OWNER'S ACHIEVEMENT BADGES, CUT FROM THEIR TWO SHEETS.

The owner, 2026-10-19, after the achievements kit's badge prompts
(docs/ART-WISHLIST.md "Achievements", the painted look they picked on card
11), sent two ChatGPT sheets on a transparent ground, now in
assets/icons-source/achievements-2026-10-19/.  Each is a 4 x 3 grid read like
a page, in the prompts' order:

  badges-sheet-1.png  the seven common ones, then the first five rare:
      first_blood combat_10 first_dungeon first_pet / first_order first_duel
      nml_kill story_done / codex_all elder_all dungeons_all combat_50
  badges-sheet-2.png  the other four rare, the arena's, the six super-rare and
      the page's own medal:
      natural_one iron_blade golden_pet elite_piece / gladiator tempered
      golden_giant elite_iron / house_limit combat_100 godly achievements

Each badge becomes public/icons/achievements/<id>.webp, named by its
achievement's id (src/data/achievements.js points every row at its own), and
the medal public/icons/achievements/achievements.webp (More's Achievements
tile and the empty page's note).

THE CUT is cut-owner-icons.py's `alpha` cut, as the sheets are already
see-through: the background remover's ~250 lifted to solid
(a' = min(255, a * 255 / 250)) and anything under 40 dropped (the faint halo
round every icon).  Pieces (8-connected, alpha over 0.15, MIN_AREA px or more)
go to the grid cell their centre falls in -- an icon's box may cross a cell's
line (the dagger's drop, the godly breastplate's rays), its centre never does
-- and each cell must hold one piece at least a fifth the size of the sheet's
median icon.  An icon is every piece in its cell (the die's and the slimes'
sparkles, the anvil's stars, the coins), grown 3 px for its soft edge and
never into another icon's piece.  Nothing is written unless every cell has
its icon.

THE FRAME: 150 x 150, three times the 50 CSS px the largest place draws one
(the rarest box on a player's card; a page row draws it 30 px, the banner 40,
the card's title chip 24, so a 3x phone never draws it bigger than it is),
never upscaled.  A badge is drawn on its own, so its longer side is 0.94 of
the square, centred.  The MEDAL sits among More's tiles, whose pictures fill
0.63 to 0.74 of their squares, so its longer side is 0.72 -- drawn the same
size as its neighbours.  All WebP 90.

Each file written is recorded with its SHA-256 in
tools/ui/achievement-badges.sha256: server/test/achievements-client.test.mjs
fails if another tool ever writes over one of them.

Writes a CONTACT SHEET (--contact out.png), each badge on the game's slate and
on a light ground, to check by eye.  Refuses to overwrite a file it did not
make (one not in the record, or changed since) without --force; --dry cuts and
reports, writes nothing.

  python3 tools/ui/cut-achievement-badges.py [--contact out.png] [--dry] [--force]
"""
import hashlib
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'assets', 'icons-source', 'achievements-2026-10-19')
PUB = os.path.join(ROOT, 'public', 'icons', 'achievements')
RECORD = os.path.join(ROOT, 'tools', 'ui', 'achievement-badges.sha256')
SIZE, SHARE, MEDAL_SHARE, QUALITY = 150, 0.94, 0.72, 90
LIFT, FLOOR, PIECE_A, MIN_AREA, GROW = 250, 40, 0.15, 20, 3
MEDAL = 'achievements'

SHEETS = [
    ('badges-sheet-1.png', 4, 3, ['first_blood', 'combat_10', 'first_dungeon', 'first_pet',
                                  'first_order', 'first_duel', 'nml_kill', 'story_done',
                                  'codex_all', 'elder_all', 'dungeons_all', 'combat_50']),
    ('badges-sheet-2.png', 4, 3, ['natural_one', 'iron_blade', 'golden_pet', 'elite_piece',
                                  'gladiator', 'tempered', 'golden_giant', 'elite_iron',
                                  'house_limit', 'combat_100', 'godly', MEDAL]),
]


def box_sum(a, r):
    """The sum over each px's (2r+1)^2 window (zeros past the edges)."""
    pad = [(r + 1, r), (r + 1, r)] + ([(0, 0)] if a.ndim == 3 else [])
    s = np.pad(a, pad).cumsum(0).cumsum(1)
    h, w = a.shape[:2]
    k = 2 * r + 1
    return s[k:k + h, k:k + w] - s[0:h, k:k + w] - s[k:k + h, 0:w] + s[0:h, 0:w]


def near(mask, r):
    return box_sum(mask.astype(np.float64), r) > 0.5


def pieces(mask):
    """[(area, cy, cx, label)] of the 8-connected pieces, and the label image."""
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    out = []
    n = 0
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys.tolist(), xs.tolist()):
        if lab[y0, x0]:
            continue
        n += 1
        lab[y0, x0] = n
        q = deque([(y0, x0)])
        area = sy = sx = 0
        while q:
            y, x = q.popleft()
            area += 1
            sy += y
            sx += x
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    v, u = y + dy, x + dx
                    if 0 <= v < h and 0 <= u < w and mask[v, u] and not lab[v, u]:
                        lab[v, u] = n
                        q.append((v, u))
        out.append((area, sy / area, sx / area, n))
    return out, lab


def cut_sheet(sheet, cols, rows, names):
    """[(name, rgba uint8, pieces, box)], or None (printed why) if a cell is empty."""
    d = np.asarray(Image.open(os.path.join(SRC, sheet)).convert('RGBA')).astype(np.float64)
    alpha = np.minimum(255, d[..., 3] * 255 / LIFT)
    alpha[alpha < FLOOR] = 0
    ps, lab = pieces(alpha > PIECE_A * 255)
    h, w = alpha.shape
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
    out = []
    for i, name in enumerate(names):
        rc = (i // cols, i % cols)
        got = cells.get(rc, [])
        big = max(got, key=lambda p: p[0]) if got else None
        if not big or big[0] < 0.2 * med:
            print(f'  ABORT {name}: cell row {rc[0] + 1} col {rc[1] + 1} has no icon')
            return None
        mine = np.isin(lab, [p[3] for p in got])
        others = (lab > 0) & ~mine
        region = near(mine, GROW) & (alpha > 0) & ~others
        ys, xs = np.nonzero(region)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        a = alpha[y0:y1, x0:x1] * region[y0:y1, x0:x1]
        rgba = np.dstack([d[y0:y1, x0:x1, :3], a]).round().clip(0, 255).astype(np.uint8)
        print(f'    {name:14s} {len(got):2d} piece(s)  x{x0} y{y0} {x1 - x0}x{y1 - y0}')
        out.append((name, rgba))
    return out


def fit(rgba, size, share):
    """Its longer side `share` of a `size` square, centred, resized premultiplied."""
    im = Image.fromarray(rgba, 'RGBA')
    w, h = im.size
    s = size * share / max(w, h)
    dw, dh = max(1, round(w * s)), max(1, round(h * s))
    small = im.convert('RGBa').resize((dw, dh), Image.LANCZOS).convert('RGBA')
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.alpha_composite(small, ((size - dw) // 2, (size - dh) // 2))
    return out


def sha(path):
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def read_record():
    rec = {}
    if os.path.exists(RECORD):
        for line in open(RECORD):
            parts = line.split()
            if len(parts) == 2 and not line.startswith('#'):
                rec[parts[1]] = parts[0]
    return rec


def main():
    force = '--force' in sys.argv
    dry = '--dry' in sys.argv
    contact = sys.argv[sys.argv.index('--contact') + 1] if '--contact' in sys.argv else None
    cuts = []
    for sheet, cols, rows, names in SHEETS:
        got = cut_sheet(sheet, cols, rows, names)
        if got is None:
            return 1
        cuts += got
    frames = [(name, fit(rgba, SIZE, MEDAL_SHARE if name == MEDAL else SHARE)) for name, rgba in cuts]
    if contact:
        cols_n, cell = 8, SIZE + 10
        rows_n = (len(frames) + cols_n - 1) // cols_n
        cs = Image.new('RGBA', (cols_n * cell, rows_n * cell * 2), (0, 0, 0, 255))
        for i, (name, im) in enumerate(frames):
            x, y = (i % cols_n) * cell, (i // cols_n) * cell * 2
            dark = Image.new('RGBA', (cell, cell), (30, 46, 52, 255))      # the page's slate, COL.bg
            light = Image.new('RGBA', (cell, cell), (226, 220, 206, 255))
            dark.alpha_composite(im, (5, 5))
            light.alpha_composite(im, (5, 5))
            cs.alpha_composite(dark, (x, y))
            cs.alpha_composite(light, (x, y + cell))
        cs.convert('RGB').save(contact)
        print('contact sheet:', contact)
    if dry:
        return 0
    rec = read_record()
    rel = lambda name: os.path.relpath(os.path.join(PUB, name + '.webp'), ROOT)
    clash = [rel(n) for n, _ in frames if os.path.exists(os.path.join(ROOT, rel(n)))
             and rec.get(rel(n)) != sha(os.path.join(ROOT, rel(n)))]
    if clash and not force:
        print('refusing to overwrite files this tool did not make (pass --force to re-cut):\n  ' + '\n  '.join(clash))
        return 1
    os.makedirs(PUB, exist_ok=True)
    total = 0
    lines = ['# v2.3.3527: the owner\'s achievement badges, written by tools/ui/cut-achievement-badges.py.',
             '# server/test/achievements-client.test.mjs fails if any of these files changes.']
    for name, im in frames:
        path = os.path.join(ROOT, rel(name))
        im.save(path, 'WEBP', quality=QUALITY, method=6)
        total += os.path.getsize(path)
        lines.append(sha(path) + '  ' + rel(name))
        print(f'  wrote {rel(name)}  {os.path.getsize(path) / 1024:.1f} KB')
    with open(RECORD, 'w') as f:
        f.write('\n'.join(lines) + '\n')
    print(f'{len(frames)} pictures, {total / 1024:.0f} KB; record {os.path.relpath(RECORD, ROOT)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
