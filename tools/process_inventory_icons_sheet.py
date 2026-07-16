#!/usr/bin/env python3
"""v2.3.1325: slice the owner's painted inventory-item sheets.

Inputs (assets/icons-source/):
  sheet-inv-painted-p1.png  5x3 on WHITE — fish (raw/cooked), burnt
                            dust, wood, ore, fishing pole, the four
                            remnants, amulet
  sheet-inv-painted-p2.png  4x4 on WHITE — eight zone shards, great
                            sword, sword, bow, staff, shield, chest
                            plate, greaves, cloth shirt
Output: public/icons/items/<name>.webp (256x256 RGBA, transparent)

These sheets are WHITE-keyed and the icons OVERFLOW their nominal grid
cells (the greatsword reaches into the sword's cell, armor crowns poke
into the weapons row).  Naive per-cell slicing therefore captures
neighbor fragments.  Approach instead:
  1. one global BFS flood from the sheet border over near-white pixels
     -> background mask (enclosed whites — snow, bone gaps — survive);
  2. connected components of the kept pixels;
  3. each component is assigned to the grid cell containing its
     CENTROID, so an icon may overflow its cell but neighbor slivers
     never contaminate it;
  4. per-name hole punch (bow): enclosed near-white regions larger
     than 4% of the icon are background seen through the icon's
     openings, not content — dropped.
"""
import os
from collections import deque
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'public', 'icons', 'items')
OUT_SIZE = 256
MARGIN = 0.12

SHEETS = [
    ('sheet-inv-painted-p1.png', 5, 3, [
        'fish-minnow', 'fish-clownfish', 'fish-trout', 'cooked-minnow', 'cooked-clownfish',
        'cooked-trout', 'burnt-dust', 'wood-log', 'ore-copper', 'fishing-pole',
        'remnants-slime', 'remnants-fire-goblin', 'remnants-skeleton', 'remnants-snowman', 'amulet',
    ], ['amulet']),  # v2.3.1325b: the cord loop encloses background white, same as the bow
    ('sheet-inv-painted-p2.png', 4, 4, [
        'shard_meadow', 'shard_ember', 'shard_mist', 'shard_frost',
        'shard_thunder', 'shard_hollows', 'shard_sky', 'shard_tidal',
        'great-sword', 'sword', 'bow', 'staff',
        'shield', 'chest-plate', 'greaves', 'cloth-shirt',
    ], ['bow']),
]


def is_bg(px):
    """Near-white, low-saturation — the sheet background (incl. the
    faint grey icon drop-shadows, which sit around 200-235)."""
    r, g, b = px[0], px[1], px[2]
    return min(r, g, b) > 198 and (max(r, g, b) - min(r, g, b)) < 22


def slice_sheet(src_name, cols, rows, names, punch_holes):
    im = Image.open(os.path.join(ROOT, 'assets', 'icons-source', src_name)).convert('RGB')
    W, H = im.size
    cw, ch = W / cols, H / rows
    pix = im.load()

    # 1. global border flood -> bg mask
    bg = bytearray(W * H)
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if is_bg(pix[x, y]) and not bg[y * W + x]:
                bg[y * W + x] = 1
                q.append((x, y))
    for y in range(H):
        for x in (0, W - 1):
            if is_bg(pix[x, y]) and not bg[y * W + x]:
                bg[y * W + x] = 1
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for nx, ny in ((x-1, y), (x+1, y), (x, y-1), (x, y+1)):
            if 0 <= nx < W and 0 <= ny < H and not bg[ny * W + nx] and is_bg(pix[nx, ny]):
                bg[ny * W + nx] = 1
                q.append((nx, ny))

    # 2. components of kept pixels (8-connected), assigned by centroid
    seen = bytearray(W * H)
    cell_px = {i: [] for i in range(len(names))}
    for sy in range(H):
        for sx in range(W):
            i0 = sy * W + sx
            if seen[i0] or bg[i0]:
                continue
            comp, sumx, sumy = [], 0, 0
            seen[i0] = 1
            cq = deque([(sx, sy)])
            while cq:
                x, y = cq.popleft()
                comp.append((x, y))
                sumx += x; sumy += y
                for nx in (x-1, x, x+1):
                    for ny in (y-1, y, y+1):
                        if 0 <= nx < W and 0 <= ny < H:
                            j = ny * W + nx
                            if not seen[j] and not bg[j]:
                                seen[j] = 1
                                cq.append((nx, ny))
            cx, cy = sumx / len(comp), sumy / len(comp)
            cell = int(cy / ch) * cols + int(cx / cw)
            if 0 <= cell < len(names):
                cell_px[cell].extend(comp)

    # 3. render each cell's union of components
    for idx, name in enumerate(names):
        pts = cell_px[idx]
        if not pts:
            raise SystemExit(f'{name}: no components landed in cell {idx}')
        minx = min(p[0] for p in pts); maxx = max(p[0] for p in pts)
        miny = min(p[1] for p in pts); maxy = max(p[1] for p in pts)
        iw, ih = maxx - minx + 1, maxy - miny + 1
        tile = Image.new('RGBA', (iw, ih), (0, 0, 0, 0))
        tp = tile.load()
        for x, y in pts:
            p = pix[x, y]
            tp[x - minx, y - miny] = (p[0], p[1], p[2], 255)

        # 4. hole punch: enclosed near-white regions > 4% of the icon
        if name in punch_holes:
            total = len(pts)
            hseen = bytearray(iw * ih)
            for sy2 in range(ih):
                for sx2 in range(iw):
                    j0 = sy2 * iw + sx2
                    if hseen[j0]:
                        continue
                    p = tp[sx2, sy2]
                    if p[3] == 0 or not is_bg(p):
                        hseen[j0] = 1
                        continue
                    region = []
                    hseen[j0] = 1
                    hq = deque([(sx2, sy2)])
                    while hq:
                        x, y = hq.popleft()
                        region.append((x, y))
                        for nx, ny in ((x-1, y), (x+1, y), (x, y-1), (x, y+1)):
                            if 0 <= nx < iw and 0 <= ny < ih:
                                j = ny * iw + nx
                                if not hseen[j]:
                                    pp = tp[nx, ny]
                                    if pp[3] > 0 and is_bg(pp):
                                        hseen[j] = 1
                                        hq.append((nx, ny))
                    if len(region) > total * 0.04:
                        for x, y in region:
                            tp[x, y] = (0, 0, 0, 0)
                        print(f'  {name}: punched {len(region)}px enclosed white')

        side = int(max(iw, ih) / (1 - 2 * MARGIN))
        canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        canvas.paste(tile, ((side - iw) // 2, (side - ih) // 2), tile)
        canvas = canvas.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
        out = os.path.join(OUT_DIR, name + '.webp')
        canvas.save(out, 'WEBP', lossless=True)
        print(f'{name}: {iw}x{ih} -> {out}')


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for src, cols, rows, names, punch in SHEETS:
        slice_sheet(src, cols, rows, names, punch)


if __name__ == '__main__':
    main()
