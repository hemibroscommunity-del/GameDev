#!/usr/bin/env python3
"""v2.3.1323: slice the owner's hero Records + section-tab icon sheets.

Inputs:  assets/icons-source/sheet-hero-records.png  (3x2 on MAGENTA:
         kills, deaths, lifetime gold / lifetime xp, duels won,
         deepest zone — a text label baked under each icon)
         assets/icons-source/sheet-hero-tabs.png     (3x1 on MAGENTA:
         overview, build, records)
Output:  public/icons/ui/hero/rec-<name>.webp / tab-<name>.webp
         (256x256 RGBA, transparent)

Same pipeline as process_hero_stats_sheet.py (v2.3.1311): global
magenta chroma key, despill fade on the AA fringe, baked label dropped
by keeping the tallest vertical content band per cell, widest
horizontal band to shrug off neighbor slivers.
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'public', 'icons', 'ui', 'hero')
OUT_SIZE = 256
MARGIN = 0.12

SHEETS = [
    # (src, cols, rows, row-major names, per-name VGAP overrides)
    ('sheet-hero-records.png', 3, 2,
     ['rec-kills', 'rec-deaths', 'rec-gold',
      'rec-xp', 'rec-duels', 'rec-zone'],
     # rec-xp measured: star+chevrons are ONE run (22..312), label
     # 21px below — the default 10px split drops it cleanly.
     {}),
    ('sheet-hero-tabs.png', 3, 1,
     ['tab-overview', 'tab-build', 'tab-records'],
     {}),
]


def is_magenta(px):
    r, g, b = px[0], px[1], px[2]
    return r > 120 and b > 120 and g < min(r, b) * 0.62


def magenta_cast(px):
    """0..1 strength of magenta contamination on a KEPT pixel."""
    r, g, b = px[0], px[1], px[2]
    if r <= g or b <= g:
        return 0.0
    if abs(r - b) > 60:
        return 0.0
    excess = (min(r, b) - g) / 255.0
    return max(0.0, min(1.0, (excess - 0.18) * 3.0))


def slice_sheet(src_name, cols, rows, names, vgap_over):
    im = Image.open(os.path.join(ROOT, 'assets', 'icons-source', src_name)).convert('RGB')
    W, H = im.size
    cw, ch = W / cols, H / rows
    pix = im.load()

    for idx, name in enumerate(names):
        r, c = divmod(idx, cols)
        x0, y0 = int(c * cw), int(r * ch)
        x1, y1 = int((c + 1) * cw), int((r + 1) * ch)

        content_rows = []
        for y in range(y0, y1):
            row_has = False
            for x in range(x0, x1, 2):
                if not is_magenta(pix[x, y]):
                    row_has = True
                    break
            content_rows.append(row_has)
        vgap = vgap_over.get(name, 10)
        bands, start, gap = [], None, 0
        for i, has in enumerate(content_rows):
            if has:
                if start is None:
                    start = i
                gap = 0
            elif start is not None:
                gap += 1
                if gap >= vgap:
                    bands.append((start, i - gap))
                    start, gap = None, 0
        if start is not None:
            bands.append((start, len(content_rows) - 1 - gap))
        if not bands:
            raise SystemExit(f'{name}: no content found in cell')
        top, bot = max(bands, key=lambda b: b[1] - b[0])
        iy0, iy1 = y0 + top, y0 + bot + 1

        content_cols = []
        for x in range(x0, x1):
            col_has = False
            for y in range(iy0, iy1, 2):
                if not is_magenta(pix[x, y]):
                    col_has = True
                    break
            content_cols.append(col_has)
        hbands, hstart, hgap = [], None, 0
        for i, has in enumerate(content_cols):
            if has:
                if hstart is None:
                    hstart = i
                hgap = 0
            elif hstart is not None:
                hgap += 1
                if hgap >= 10:
                    hbands.append((hstart, i - hgap))
                    hstart, hgap = None, 0
        if hstart is not None:
            hbands.append((hstart, len(content_cols) - 1 - hgap))
        if not hbands:
            raise SystemExit(f'{name}: empty icon box')
        left, right = max(hbands, key=lambda b: b[1] - b[0])
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
                        na = int(255 * (1.0 - cast * 0.65))
                        tp[x, y] = (nr, g, nb, na)

        side = int(max(tw, th) / (1 - 2 * MARGIN))
        canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        canvas.paste(tile, ((side - tw) // 2, (side - th) // 2), tile)
        canvas = canvas.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
        out = os.path.join(OUT_DIR, name + '.webp')
        canvas.save(out, 'WEBP', lossless=True)
        print(f'{name}: band {iy0-y0}..{iy1-y0} of cell, {tw}x{th} -> {out}')


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for src, cols, rows, names, vgap in SHEETS:
        slice_sheet(src, cols, rows, names, vgap)


if __name__ == '__main__':
    main()
