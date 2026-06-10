#!/usr/bin/env python3
"""Preview the SHIRT recolor (playerSkins.js _torsoBands + flat fill) on the
real body sheets, outside the browser.

MIRRORS src/rendering/playerSkins.js -- keep in sync with the renderer (same
rule as preview_armor_frames.py).  --algo=v2 is the SHIPPED algorithm
(v2.3.694 neck-seeded interval tracking); --algo=v1 keeps the pre-694
chest-seed flood for comparison.

Output: tools/_shirt_preview_<algo>.png -- a board of frames (rows = sheets,
cols = frames), shirt filled in red so leaks onto arms are obvious.
"""
import sys
from PIL import Image

FRAME_W = 256
SHIRT_NECK_FRAC = 0.48
SHIRT_SLEEVE_FRAC = 0.42
SHIRT_FILL = (200, 40, 40)  # loud red for the preview
ARM_W = 7   # v2: a skin run this narrow that pokes past the torso is an arm
GROW = 2    # v2: max sideways widening of the torso interval per row
TRUNK_HALF = 10  # v2: trunk half-width window around the neck centre


def is_skin(r, g, b, a):
    return a > 40 and r > g and g >= b and (r - b) > 30 and r > 90 and (r - g) > 25


def is_pants(r, g, b, a):
    return a > 180 and g >= r - 10 and g > b + 8 and r < 150


def skin_runs(cls, col_waist, y, x0, x1):
    """Maximal horizontal runs of shirt-eligible skin on row y."""
    runs = []
    x = x0
    while x < x1:
        if cls[y][x] == 1 and y < col_waist[x]:
            r = x
            while r + 1 < x1 and cls[y][r + 1] == 1 and y < col_waist[r + 1]:
                r += 1
            runs.append((x, r))
            x = r + 1
        else:
            x += 1
    return runs


def torso_bands(px, w, h, algo):
    """Port of _torsoBands.  Returns set of (x, y) shirt pixels."""
    cls = [[0] * w for _ in range(h)]
    shirt = set()
    frames = max(1, w // FRAME_W)
    for f in range(frames):
        x0, x1 = f * FRAME_W, min(w, (f + 1) * FRAME_W)
        pants_row = [0] * h
        crown = bottom = -1
        for y in range(h):
            pc = sc = 0
            any_op = False
            for x in range(x0, x1):
                r, g, b, a = px[x, y]
                if a <= 40:
                    continue
                any_op = True
                if is_skin(r, g, b, a):
                    sc += 1
                    cls[y][x] = 1
                elif is_pants(r, g, b, a):
                    pc += 1
                    cls[y][x] = 3
                else:
                    cls[y][x] = 2
            pants_row[y] = pc
            if sc > 0 and crown < 0:
                crown = y
            if any_op:
                bottom = y
        if crown < 0 or bottom <= crown:
            continue
        mid = (crown + bottom) >> 1
        waist = -1
        for y in range(mid, bottom):
            if pants_row[y] >= 3:
                waist = y
                break
        if waist < 0:
            waist = round(crown + 0.62 * (bottom - crown))
        collar = max(0, round(crown + SHIRT_NECK_FRAC * (waist - crown)))
        sleeve_cap = min(bottom, round(collar + SHIRT_SLEEVE_FRAC * (waist - collar)))
        col_waist = {}
        for x in range(x0, x1):
            cw = waist
            for y in range(mid, bottom):
                if cls[y][x] == 3:
                    cw = y
                    break
            col_waist[x] = cw

        if algo == 'v1':
            _v1(cls, col_waist, shirt, x0, x1, collar, sleeve_cap, bottom, w)
        else:
            _v2(cls, col_waist, shirt, x0, x1, collar, sleeve_cap, bottom)
    return shirt


def _v1(cls, col_waist, shirt, x0, x1, collar, sleeve_cap, bottom, w):
    """Shipped algorithm: cap = all skin in band; seed flood from chest centre."""
    for y in range(collar, sleeve_cap):
        for x in range(x0, x1):
            if cls[y][x] == 1 and y < col_waist[x]:
                shirt.add((x, y))
    cxl, cxr = 10 ** 9, -1
    for y in range(collar, min(collar + 6, sleeve_cap + 1)):
        for x in range(x0, x1):
            if cls[y][x] == 1:
                cxl = min(cxl, x)
                cxr = max(cxr, x)
    cx = (cxl + cxr) >> 1 if cxr >= cxl else (x0 + x1) >> 1
    seed_row = min(sleeve_cap, bottom - 1)
    sx = -1
    if cls[seed_row][cx] == 1:
        sx = cx
    else:
        for dd in range(1, FRAME_W):
            if cx - dd >= x0 and cls[seed_row][cx - dd] == 1:
                sx = cx - dd
                break
            if cx + dd < x1 and cls[seed_row][cx + dd] == 1:
                sx = cx + dd
                break
    if sx < 0:
        return
    l = sx
    while l > x0 and cls[seed_row][l - 1] == 1:
        l -= 1
    r = sx
    while r < x1 - 1 and cls[seed_row][r + 1] == 1:
        r += 1
    cur = set()
    for xx in range(l, r + 1):
        if seed_row < col_waist[xx]:
            cur.add(xx)
            shirt.add((xx, seed_row))
    for y in range(seed_row + 1, bottom):
        nxt = set()
        lx = 0
        while lx < FRAME_W:
            x = x0 + lx
            if x >= x1 or cls[y][x] != 1 or y >= col_waist[x]:
                lx += 1
                continue
            if not (lx in cur or lx - 1 in cur or lx + 1 in cur):
                lx += 1
                continue
            l2 = lx
            while l2 > 0 and cls[y][x0 + l2 - 1] == 1:
                l2 -= 1
            r2 = lx
            while r2 < FRAME_W - 1 and x0 + r2 + 1 < x1 and cls[y][x0 + r2 + 1] == 1:
                r2 += 1
            for k in range(l2, r2 + 1):
                xx = x0 + k
                if y < col_waist[xx]:
                    nxt.add(k)
                    shirt.add((xx, y))
            lx = r2 + 1
        cur = nxt
        if not cur:
            break


def _v2(cls, col_waist, shirt, x0, x1, collar, sleeve_cap, bottom):
    """Candidate fix: torso tracked as an interval seeded at the NECK.

    - Cap band [collar, sleeveCap): paint runs connected (row overlap) to the
      neck, growing freely (shoulders widen fast).  A forearm/hand raised into
      the band but not connected to the neck stays skin.
    - Below the cap the frontier is PINCHED back to the trunk: a window of
      +/- TRUNK_HALF around the neck centre (the one landmark that is always
      torso).  Arms emerge from the cap outside that window and stay skin.
    - Trunk rows then grow at most GROW px/row, and a NARROW run (<= ARM_W)
      that pokes past the interval is an arm crossing in front -- skipped
      entirely so it stays skin even where it overlaps the chest.
    """
    # neck seed: collar-row runs (the neck is the only skin at collar height
    # connected upward to the crown; take all collar runs, they're narrow)
    frontier = []
    for (l, r) in skin_runs(cls, col_waist, collar, x0, x1):
        frontier.append((l, r))
        for xx in range(l, r + 1):
            shirt.add((xx, collar))
    if not frontier:
        return
    fl = min(l for l, _ in frontier)
    fr = max(r for _, r in frontier)
    ncx = (fl + fr) >> 1
    # cap band: free growth, but only neck-connected runs
    for y in range(collar + 1, sleeve_cap):
        nl, nr = 10 ** 9, -1
        for (l, r) in skin_runs(cls, col_waist, y, x0, x1):
            if r < fl - 1 or l > fr + 1:
                continue
            for xx in range(l, r + 1):
                shirt.add((xx, y))
            nl = min(nl, l)
            nr = max(nr, r)
        if nr < 0:
            break
        fl, fr = nl, nr
    # pinch back to the trunk below the sleeves
    fl = max(fl, ncx - TRUNK_HALF)
    fr = min(fr, ncx + TRUNK_HALF)
    # trunk: slow growth + arm rejection
    for y in range(sleeve_cap, bottom):
        nl, nr = 10 ** 9, -1
        painted = False
        for (l, r) in skin_runs(cls, col_waist, y, x0, x1):
            if r < fl - 1 or l > fr + 1:
                continue                      # not touching the torso interval
            if (r - l + 1) <= ARM_W and (l < fl - 1 or r > fr + 1):
                continue                      # narrow + pokes out: crossing arm
            cl, cr = max(l, fl - GROW), min(r, fr + GROW)
            if cl > cr:
                continue
            for xx in range(cl, cr + 1):
                shirt.add((xx, y))
            nl = min(nl, cl)
            nr = max(nr, cr)
            painted = True
        if not painted:
            break
        fl, fr = nl, nr


def main():
    algo = 'v2' if '--algo=v2' in sys.argv else 'v1'
    sheets = []
    for pose in ('stand', 'jog'):
        for d in ('south', 'east', 'north', 'northeast', 'southwest'):
            sheets.append((pose, d, f'public/sprites/player/{pose}-{d}.png'))
    rendered = []
    max_frames = 0
    for pose, d, path in sheets:
        im = Image.open(path).convert('RGBA')
        w, h = im.size
        px = im.load()
        shirt = torso_bands(px, w, h, algo)
        out = im.copy()
        opx = out.load()
        for (x, y) in shirt:
            a = px[x, y][3]
            opx[x, y] = (*SHIRT_FILL, a)
        n = max(1, w // FRAME_W)
        max_frames = max(max_frames, n)
        rendered.append((pose, d, out, n))
    board = Image.new('RGBA', (max_frames * FRAME_W, len(rendered) * 256), (28, 28, 32, 255))
    for row, (pose, d, out, n) in enumerate(rendered):
        board.paste(out, (0, row * 256), out)
    board.save(f'tools/_shirt_preview_{algo}.png')
    print(f'wrote tools/_shirt_preview_{algo}.png  rows={len(rendered)} (stand x5 dirs, then jog x5)')


if __name__ == '__main__':
    main()
