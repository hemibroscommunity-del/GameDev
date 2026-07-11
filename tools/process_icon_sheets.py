#!/usr/bin/env python3
"""v2.3.1223: slice ChatGPT-generated UI icon sheets into game-ready icons.

Input:  assets/icons-source/sheet-<a-i>.png  (grids of icons on near-white)
Output: public/icons/ui/<name>.webp          (256x256 RGBA, transparent bg)

Pipeline (per docs/UI-BIBLE.md Part 5 "From sheet to game files"):
  1. Find icon boxes by content banding (y-projection -> rows, then
     x-projection per row -> columns).  Banding, not fixed-grid math,
     because ChatGPT margins drift per sheet and sheet D is 2:1 wide.
  2. Abort on any count mismatch vs the manifest -- a silent off-by-one
     would mis-name every icon after it, the worst failure mode.
  3. Knock out the background with a BFS flood fill from the box border
     over near-white pixels.  Interior whites (book pages, skull, speech
     bubble) survive because the fill cannot cross the dark outlines.
  4. Center on a square canvas with 12% margin, resize to 256, save webp.

Usage: python3 tools/process_icon_sheets.py
"""
import os
import sys
from collections import deque

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, 'assets', 'icons-source')
OUT_DIR = os.path.join(ROOT, 'public', 'icons', 'ui')

# Pixels with every channel >= BG are "background-ish" for banding and fill.
BG = 225
OUT_SIZE = 256
MARGIN = 0.12  # fraction of final canvas left empty around the icon

# Sheet manifest: rows, cols, row-major icon names (docs/UI-BIBLE.md Part 4).
SHEETS = {
    'sheet-a.png': (2, 3, [
        'nav-inventory', 'nav-friends', 'nav-codex',
        'nav-journey', 'nav-map', 'nav-more']),
    'sheet-b.png': (4, 4, [
        'panel-stats', 'panel-skills', 'panel-encyclopedia', 'panel-guild',
        'panel-leaderboard', 'panel-clan', 'panel-chat', 'panel-settings',
        'panel-account', 'panel-feedback', 'panel-controls', 'panel-self',
        'panel-loadout', 'panel-weapons', 'panel-quests', 'panel-shop']),
    'sheet-c.png': (3, 4, [
        'skill-woodcutting', 'skill-fishing', 'skill-mining', 'skill-farming',
        'skill-cooking', 'skill-blacksmithing', 'skill-woodworking',
        'skill-gemcutting',
        'skill-enchanting', 'skill-trapping', 'spare-rope', 'spare-lantern']),
    'sheet-d.png': (2, 5, [
        'combat-melee', 'combat-bow', 'combat-magic', 'combat-defense',
        'stat-power',
        'stat-agility', 'stat-mind', 'stat-vitality', 'stat-endurance',
        'stat-defense']),
    'sheet-e.png': (2, 3, [
        'cur-gold', 'cur-nugget', 'cur-goldbar',
        'cur-gem', 'cur-xp', 'cur-buildpoint']),
    'sheet-f.png': (2, 5, [
        'elem-flame', 'elem-frost', 'elem-water', 'elem-venom', 'elem-storm',
        'elem-stone', 'elem-wind', 'elem-flora', 'elem-dark', 'elem-light']),
    'sheet-g.png': (3, 3, [
        'status-burn', 'status-freeze', 'status-soak',
        'status-root', 'status-shock', 'status-fracture',
        'status-slow', 'status-curse', 'status-reveal']),
    'sheet-h.png': (3, 4, [
        'bldg-bank', 'bldg-cook', 'bldg-enchant', 'bldg-exchange',
        'bldg-farm', 'bldg-forge', 'bldg-gamble', 'bldg-gemcut',
        'bldg-tavern', 'bldg-vendor', 'bldg-woodwork', 'bldg-townhall']),
    'sheet-i.png': (3, 3, [
        'evt-duel', 'evt-trade', 'evt-party',
        'evt-war', 'evt-threat', 'evt-mail',
        'evt-dungeon', 'evt-pets', 'evt-sponsorship']),
}


def is_fg(px):
    return px[0] < BG or px[1] < BG or px[2] < BG


def bands(profile, min_gap):
    """Contiguous True-runs in a boolean profile, merging gaps < min_gap."""
    runs = []
    start = None
    for i, v in enumerate(profile):
        if v and start is None:
            start = i
        elif not v and start is not None:
            runs.append([start, i - 1])
            start = None
    if start is not None:
        runs.append([start, len(profile) - 1])
    merged = []
    for r in runs:
        if merged and r[0] - merged[-1][1] - 1 < min_gap:
            merged[-1][1] = r[1]
        else:
            merged.append(r)
    return merged


def split_to_expected(profile, found, expected):
    """If banding under-counts (icons nearly touching across the gutter),
    split the widest bands at their lowest-density valley until the count
    matches.  Only valleys thinner than 12% of the band qualify -- a dense
    'valley' means the band really is one icon, so abort instead."""
    found = [list(b) for b in found]
    while len(found) < expected:
        found.sort(key=lambda b: b[1] - b[0], reverse=True)
        b0, b1 = found[0]
        third = (b1 - b0) // 3
        valley = min(range(b0 + third, b1 - third + 1),
                     key=lambda i: profile[i])
        if profile[valley] > max(profile[b0:b1 + 1]) * 0.12:
            return None
        found[0:1] = [[b0, valley - 1], [valley + 1, b1]]
    found.sort(key=lambda b: b[0])
    return found


def icon_boxes(im, rows, cols):
    """Locate rows*cols icon bounding boxes by projection banding."""
    w, h = im.size
    pix = im.load()
    fg = [[is_fg(pix[x, y]) for x in range(w)] for y in range(h)]
    # Count-based profile: a handful of stray anti-aliased pixels must not
    # bridge two rows the way a boolean any() profile would (sheet B did).
    row_count = [sum(fg[y]) for y in range(h)]
    row_has = [c > 3 for c in row_count]
    # min_gap 2% of height: sparkles/steam sit close to their icon, real
    # row gutters on these sheets are >5%.
    row_bands = bands(row_has, max(8, h // 50))
    if len(row_bands) != rows:
        row_bands = split_to_expected(row_count, row_bands, rows)
    if not row_bands or len(row_bands) != rows:
        raise SystemExit(
            f'ABORT: could not resolve {rows} icon rows '
            f'-- fix the sheet or the manifest, never guess.')
    boxes = []
    for y0, y1 in row_bands:
        col_count = [sum(1 for y in range(y0, y1 + 1) if fg[y][x])
                     for x in range(w)]
        col_has = [c > 3 for c in col_count]
        col_bands = bands(col_has, max(8, w // 50))
        if len(col_bands) != cols:
            col_bands = split_to_expected(col_count, col_bands, cols)
        if not col_bands or len(col_bands) != cols:
            raise SystemExit(
                f'ABORT: row y={y0}-{y1}: could not resolve {cols} icons.')
        for x0, x1 in col_bands:
            boxes.append((x0, y0, x1, y1))
    return boxes


def knock_out(tile):
    """Flood-fill near-white from the border to transparent, in place."""
    w, h = tile.size
    pix = tile.load()
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y * w + x]:
            continue
        seen[y * w + x] = 1
        px = pix[x, y]
        if is_fg(px):
            continue
        pix[x, y] = (px[0], px[1], px[2], 0)
        q.append((x + 1, y))
        q.append((x - 1, y))
        q.append((x, y + 1))
        q.append((x, y - 1))


def process_sheet(fname, rows, cols, names):
    im = Image.open(os.path.join(SRC_DIR, fname)).convert('RGB')
    boxes = icon_boxes(im, rows, cols)
    assert len(boxes) == len(names)
    for (x0, y0, x1, y1), name in zip(boxes, names):
        # Pad 4px so the flood fill always starts on background.
        pad = 4
        cx0, cy0 = max(0, x0 - pad), max(0, y0 - pad)
        cx1 = min(im.size[0], x1 + 1 + pad)
        cy1 = min(im.size[1], y1 + 1 + pad)
        tile = im.crop((cx0, cy0, cx1, cy1)).convert('RGBA')
        knock_out(tile)
        # Square canvas around the content, sized for a 12% margin.
        cw, ch = tile.size
        side = max(cw, ch)
        canvas_side = int(round(side / (1 - 2 * MARGIN)))
        canvas = Image.new('RGBA', (canvas_side, canvas_side), (0, 0, 0, 0))
        canvas.paste(tile, ((canvas_side - cw) // 2, (canvas_side - ch) // 2),
                     tile)
        out = canvas.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
        out_path = os.path.join(OUT_DIR, name + '.webp')
        if os.path.exists(out_path):
            raise SystemExit(f'ABORT: {out_path} already exists -- refusing '
                             'to overwrite. Delete it first if regenerating.')
        out.save(out_path, 'WEBP', quality=92, method=6)
        print(f'  {name}.webp  <- cell ({x0},{y0})-({x1},{y1})')


def main():
    total = 0
    for fname, (rows, cols, names) in sorted(SHEETS.items()):
        print(f'{fname}: {rows}x{cols}, {len(names)} icons')
        process_sheet(fname, rows, cols, names)
        total += len(names)
    print(f'DONE: {total} icons -> {OUT_DIR}')


if __name__ == '__main__':
    main()
