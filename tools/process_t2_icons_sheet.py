#!/usr/bin/env python3
"""v2.3.1313: slice the owner's tier-2 build icon sheet.

Input:  assets/icons-source/sheet-t2-builds.png
        (30 icons on BLACK, 3 rows x [5 + gutter + 5], labels baked
        under each icon)
Output: public/icons/ui/t2/<cat>-<key>.webp  (256x256 RGBA)

Black background needs different keying than the magenta sheets: a
global "remove black" would eat dark outline/interior pixels, so the
key is a BFS flood fill from each tile's border over near-black pixels
(the near-white pipeline's approach, inverted).  Interior blacks
enclosed by lit pixels survive.

Layout is banded, not grid-math: y-projection finds the three TALL
icon rows (label rows are short and skipped); x-projection per row
finds the items, merging smallest gaps until exactly 10 remain (some
icons — Draw Power's loose arrow, Longshot's range posts — band into
2-3 pieces).
"""
import os
from collections import deque
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'icons-source', 'sheet-t2-builds.png')
OUT_DIR = os.path.join(ROOT, 'public', 'icons', 'ui', 't2')
OUT_SIZE = 256
MARGIN = 0.12
BG = 38  # all channels <= BG -> background-ish

# Row-major names: cat-key matching the channel tables
# (gameSystems.js WEAPON_CHANNELS/DEFENSE_CHANNELS/HP_CHANNELS/
# ENDURANCE_CHANNELS keys; hp-laststand is the owner-named 5th
# Vitality category added this same version).
NAMES = [
    'sword-edge', 'sword-precision', 'sword-executioner', 'sword-tempo', 'sword-cleave',
    'bow-drawPower', 'bow-marksmanship', 'bow-headshot', 'bow-piercing', 'bow-longshot',
    'staff-spellPower', 'staff-overload', 'staff-detonation', 'staff-attunement', 'staff-focus',
    'defense-bulwark', 'defense-ironskin', 'defense-thorns', 'defense-secondwind', 'defense-poise',
    'hp-vigor', 'hp-recovery', 'hp-lifeblood', 'hp-resilience', 'hp-laststand',
    'endurance-stamina', 'endurance-conditioning', 'endurance-swiftness', 'endurance-evasion', 'endurance-reflexes',
]


def is_bg(px):
    return px[0] <= BG and px[1] <= BG and px[2] <= BG


def bands_1d(flags, min_gap):
    """[(start,end)] runs of True, splitting on >= min_gap runs of False."""
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


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    im = Image.open(SRC).convert('RGB')
    W, H = im.size
    pix = im.load()

    # Row bands: y-projection of non-bg content; keep the 3 TALLEST
    # (icon rows) — label rows are short.
    rows_flags = []
    for y in range(H):
        has = False
        for x in range(0, W, 4):
            if not is_bg(pix[x, y]):
                has = True
                break
        rows_flags.append(has)
    ybands = bands_1d(rows_flags, 12)
    ybands = sorted(sorted(ybands, key=lambda b: b[1] - b[0], reverse=True)[:3])
    assert len(ybands) == 3, f'expected 3 icon rows, got {len(ybands)}'

    idx = 0
    for (y0, y1) in ybands:
        # Column bands within the icon row.
        cols_flags = []
        for x in range(W):
            has = False
            for y in range(y0, y1 + 1, 3):
                if not is_bg(pix[x, y]):
                    has = True
                    break
            cols_flags.append(has)
        xbands = bands_1d(cols_flags, 14)
        # Merge smallest inter-band gaps until exactly 10 items remain
        # (loose sub-parts like Draw Power's arrow band separately).
        while len(xbands) > 10:
            gaps = [(xbands[i + 1][0] - xbands[i][1], i) for i in range(len(xbands) - 1)]
            _, i = min(gaps)
            xbands[i] = (xbands[i][0], xbands[i + 1][1])
            del xbands[i + 1]
        assert len(xbands) == 10, f'row {y0}-{y1}: {len(xbands)} bands'

        for (x0, x1) in xbands:
            name = NAMES[idx]; idx += 1
            # Per-tile vertical re-crop: some rows' baked labels sit
            # closer than the row-band threshold and ride along — keep
            # only the TALLEST y-band inside this tile (the icon).
            tflags = []
            for y in range(y0, y1 + 1):
                has = False
                for x in range(x0, x1 + 1, 2):
                    if not is_bg(pix[x, y]):
                        has = True
                        break
                tflags.append(has)
            tb = bands_1d(tflags, 6)
            top, bot = max(tb, key=lambda b: b[1] - b[0])
            ty0, ty1 = y0 + top, y0 + bot
            tile = im.crop((x0, ty0, x1 + 1, ty1 + 1)).convert('RGBA')
            tp = tile.load()
            tw, th = tile.size
            # BFS flood fill from the tile border over near-black.
            seen = [[False] * tw for _ in range(th)]
            q = deque()
            for x in range(tw):
                for y in (0, th - 1):
                    if is_bg(tp[x, y]) and not seen[y][x]:
                        seen[y][x] = True; q.append((x, y))
            for y in range(th):
                for x in (0, tw - 1):
                    if is_bg(tp[x, y]) and not seen[y][x]:
                        seen[y][x] = True; q.append((x, y))
            while q:
                x, y = q.popleft()
                tp[x, y] = (0, 0, 0, 0)
                for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                    if 0 <= nx < tw and 0 <= ny < th and not seen[ny][nx] and is_bg(tp[nx, ny]):
                        seen[ny][nx] = True; q.append((nx, ny))

            side = int(max(tw, th) / (1 - 2 * MARGIN))
            canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
            canvas.paste(tile, ((side - tw) // 2, (side - th) // 2), tile)
            canvas = canvas.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
            out = os.path.join(OUT_DIR, name + '.webp')
            canvas.save(out, 'WEBP', lossless=True)
            print(f'{name}: x {x0}-{x1}, {tw}x{th} -> {out}')

    assert idx == 30, idx


if __name__ == '__main__':
    main()
