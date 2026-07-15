#!/usr/bin/env python3
"""v2.3.1311: generic slicer for the owner's magenta icon sheets.

Same pipeline as process_welcome_cc_sheet.py (v2.3.1307) — global
magenta chroma key (enclosed regions clear too), despill pass, baked
text labels dropped by keeping only the tallest vertical band, side
fragments dropped by keeping the widest horizontal band — but driven
by a manifest so each new sheet is a table entry, not a new script.

Usage: python3 tools/process_magenta_sheet.py [sheet-name ...]
       (no args = process every sheet in SHEETS)
"""
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, 'assets', 'icons-source')
OUT_SIZE = 256
MARGIN = 0.12

SHEETS = {
    'sheet-bag.png': {
        'out': 'public/icons/bag',
        'cols': 4, 'rows': 4,
        'names': [
            'bag-all', 'bag-weapons', 'bag-armor', 'bag-potions',
            'bag-crafting', 'bag-recent', 'bag-new-item', 'bag-equipped',
            'slot-weapon', 'slot-shield', 'slot-chest', 'slot-legs',
            'slot-cape', 'slot-amulet', 'bag-sort', 'bag-compare',
        ],
    },
}


def is_magenta(px):
    r, g, b = px[0], px[1], px[2]
    return r > 120 and b > 120 and g < min(r, b) * 0.62


def magenta_cast(px):
    r, g, b = px[0], px[1], px[2]
    if r <= g or b <= g:
        return 0.0
    if abs(r - b) > 60:
        return 0.0
    excess = (min(r, b) - g) / 255.0
    return max(0.0, min(1.0, (excess - 0.18) * 3.0))


def bands(flags, min_gap=10):
    out, start, gap = [], None, 0
    for i, has in enumerate(flags):
        if has:
            if start is None:
                start = i
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                out.append((start, i - gap))
                start, gap = None, 0
    if start is not None:
        out.append((start, len(flags) - 1 - gap))
    return out


def process(sheet, cfg):
    im = Image.open(os.path.join(SRC_DIR, sheet)).convert('RGB')
    W, H = im.size
    cw, ch = W / cfg['cols'], H / cfg['rows']
    pix = im.load()
    out_dir = os.path.join(ROOT, cfg['out'])
    os.makedirs(out_dir, exist_ok=True)

    for idx, name in enumerate(cfg['names']):
        r, c = divmod(idx, cfg['cols'])
        x0, y0 = int(c * cw), int(r * ch)
        x1, y1 = int((c + 1) * cw), int((r + 1) * ch)

        rows_have = [any(not is_magenta(pix[x, y]) for x in range(x0, x1, 2)) for y in range(y0, y1)]
        vb = bands(rows_have)
        if not vb:
            raise SystemExit(f'{name}: no content')
        top, bot = max(vb, key=lambda b: b[1] - b[0])
        iy0, iy1 = y0 + top, y0 + bot + 1

        cols_have = [any(not is_magenta(pix[x, y]) for y in range(iy0, iy1, 2)) for x in range(x0, x1)]
        hb = bands(cols_have)
        if not hb:
            raise SystemExit(f'{name}: empty box')
        left, right = max(hb, key=lambda b: b[1] - b[0])
        ix0, ix1 = x0 + left, x0 + right + 1

        tile = im.crop((ix0, iy0, ix1, iy1)).convert('RGBA')
        tp = tile.load()
        tw, th = tile.size
        for y in range(th):
            for x in range(tw):
                p = tp[x, y]
                if is_magenta(p):
                    tp[x, y] = (0, 0, 0, 0)
                else:
                    cast = magenta_cast(p)
                    if cast > 0:
                        g = p[1]
                        nr = int(p[0] + (g - p[0]) * cast)
                        nb = int(p[2] + (g - p[2]) * cast)
                        tp[x, y] = (nr, g, nb, int(255 * (1.0 - cast * 0.65)))

        side = int(max(tw, th) / (1 - 2 * MARGIN))
        canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        canvas.paste(tile, ((side - tw) // 2, (side - th) // 2), tile)
        canvas = canvas.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
        canvas.save(os.path.join(out_dir, name + '.webp'), 'WEBP', lossless=True)
        print(f'{name}: {tw}x{th}')


if __name__ == '__main__':
    targets = sys.argv[1:] or list(SHEETS)
    for t in targets:
        process(t, SHEETS[t])
