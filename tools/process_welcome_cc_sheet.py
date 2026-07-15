#!/usr/bin/env python3
"""v2.3.1307: slice the owner's welcome/customizer icon sheet.

Input:  assets/icons-source/sheet-welcome-cc.png
        (4x3 grid on MAGENTA, a text label baked under each icon)
Output: public/ui/welcome/cc/<name>.webp  (256x256 RGBA, transparent)

Differences from process_icon_sheets.py (the near-white UI Bible
pipeline): the key is a GLOBAL chroma test, not a border flood fill —
the owner asked for magenta inside enclosed icon regions (the key's
bow, the rotate arrows' curl, the prohibition ring) to clear as well.
A despill pass then fades the 1-2px magenta-cast AA fringe left on
outline edges.  The baked text labels are dropped by banding each cell
vertically and keeping only the TOP content band (icons are tall, the
label band is short and separated by a clean magenta gap).
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'icons-source', 'sheet-welcome-cc.png')
OUT_DIR = os.path.join(ROOT, 'public', 'ui', 'welcome', 'cc')
OUT_SIZE = 256
MARGIN = 0.12

NAMES = [
    'cc-customize', 'cc-random-look', 'cc-random-name', 'cc-login-key',
    'cc-head', 'cc-shirt', 'cc-pants', 'cc-shoes',
    'cc-no-hair', 'cc-rotate-left', 'cc-rotate-right', 'cc-selected',
]
COLS, ROWS = 4, 3


def is_magenta(px):
    r, g, b = px[0], px[1], px[2]
    return r > 120 and b > 120 and g < min(r, b) * 0.62


def magenta_cast(px):
    """0..1 strength of magenta contamination on a KEPT pixel."""
    r, g, b = px[0], px[1], px[2]
    if r <= g or b <= g:
        return 0.0
    # both channels above green and roughly balanced = pink/magenta cast
    if abs(r - b) > 60:
        return 0.0
    excess = (min(r, b) - g) / 255.0
    return max(0.0, min(1.0, (excess - 0.18) * 3.0))


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    im = Image.open(SRC).convert('RGB')
    W, H = im.size
    cw, ch = W / COLS, H / ROWS
    pix = im.load()

    for idx, name in enumerate(NAMES):
        r, c = divmod(idx, COLS)
        x0, y0 = int(c * cw), int(r * ch)
        x1, y1 = int((c + 1) * cw), int((r + 1) * ch)

        # Vertical banding inside the cell: rows containing any
        # non-magenta pixel.  Bands split on >= 10px magenta gaps.
        content_rows = []
        for y in range(y0, y1):
            row_has = False
            for x in range(x0, x1, 2):  # stride 2: banding only
                if not is_magenta(pix[x, y]):
                    row_has = True
                    break
            content_rows.append(row_has)
        bands, start, gap = [], None, 0
        for i, has in enumerate(content_rows):
            if has:
                if start is None:
                    start = i
                gap = 0
            elif start is not None:
                gap += 1
                if gap >= 10:
                    bands.append((start, i - gap))
                    start, gap = None, 0
        if start is not None:
            bands.append((start, len(content_rows) - 1 - gap))
        if not bands:
            raise SystemExit(f'{name}: no content found in cell')
        # The icon is the TALLEST band (labels are short).
        top, bot = max(bands, key=lambda b: b[1] - b[0])
        iy0, iy1 = y0 + top, y0 + bot + 1

        # Horizontal banding within the icon band — like the vertical
        # pass, split on >= 10px magenta gaps and keep the WIDEST band:
        # grid-math cells drift a few px, so a sliver of the neighboring
        # icon can poke into the cell (seen on login-key and pants).
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
                        # fade + desaturate the fringe toward the green
                        # channel so no pink halo survives on outlines
                        g = p[1]
                        nr = int(p[0] + (g - p[0]) * cast)
                        nb = int(p[2] + (g - p[2]) * cast)
                        na = int(255 * (1.0 - cast * 0.65))
                        tp[x, y] = (nr, g, nb, na)

        # Center on a square canvas with margin, then resize.
        side = int(max(tw, th) / (1 - 2 * MARGIN))
        canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        canvas.paste(tile, ((side - tw) // 2, (side - th) // 2), tile)
        canvas = canvas.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
        out = os.path.join(OUT_DIR, name + '.webp')
        canvas.save(out, 'WEBP', lossless=True)
        print(f'{name}: band {iy0-y0}..{iy1-y0} of cell, {tw}x{th} -> {out}')


if __name__ == '__main__':
    main()
