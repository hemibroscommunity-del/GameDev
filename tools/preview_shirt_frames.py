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
    """v2.3.694 algorithm + v3 audit fixes: torso tracked as an interval
    seeded at the NECK.

    - Seed: first row in [collar, collar+5] with eligible skin (the collar
      row itself can land on the 1-2px chin-shadow line -> whole frame used
      to bail with no shirt).  Seed run = the widest on that row (beats a
      raised hand).
    - Cap band [collar, sleeveCap): paint runs connected (row overlap) to the
      frontier, EXCEPT limb runs -- narrow (<= ARM_W) with >= 2px gaps on
      both sides and not containing the neck centre: a fist raised to the
      face stays skin, while sleeves (contiguous with the shoulder mass)
      stay covered.
    - Below the cap the frontier is PINCHED back to the trunk: a window of
      +/- TRUNK_HALF around the neck centre (the one landmark that is always
      torso).  Arms emerge from the cap outside that window and stay skin.
    - Trunk rows grow at most GROW px/row; limb runs are skipped (crossing
      arm/hand stays skin even inside the chest); up to 2 consecutive
      unpaintable rows are coasted over (belt/shadow lines) so the shirt
      always reaches the waist instead of stopping at the belly.
    """
    def gap_ge2(xx, step, y):
        """>=2px of non-skin at (xx+step, xx+2*step) -- frame edge counts."""
        g = 0
        x = xx + step
        while 0 <= g < 2 and x0 <= x < x1:
            if cls[y][x] == 1 and y < col_waist[x]:
                return False
            g += 1
            x += step
        return True

    def is_limb(l, r, y, ncx):
        if (r - l + 1) > ARM_W:
            return False
        if ncx is not None and l - 2 <= ncx <= r + 2:
            return False
        return gap_ge2(l, -1, y) and gap_ge2(r, 1, y)

    # head centre: per row in [crown(top skin), collar), take the widest skin
    # run; the median of their centres is the head x (robust against a fist
    # raised above the head -- the head wins by row count).
    head_cs = []
    for y in range(0, collar):
        rs = skin_runs(cls, col_waist, y, x0, x1)
        if rs:
            l, r = max(rs, key=lambda lr: lr[1] - lr[0])
            head_cs.append((l + r) >> 1)
    hx = sorted(head_cs)[len(head_cs) // 2] if head_cs else (x0 + x1) >> 1
    # seed: first row at/below the collar with skin; the run UNDER THE HEAD
    # wins (not the widest -- a horizontally outstretched arm can be wider
    # than the neck/chest).
    seed_row, seed = -1, None
    for y in range(collar, min(collar + 6, bottom)):
        rs = skin_runs(cls, col_waist, y, x0, x1)
        if rs:
            seed_row = y
            seed = min(rs, key=lambda lr: 0 if lr[0] <= hx <= lr[1]
                       else min(abs(lr[0] - hx), abs(lr[1] - hx)))
            break
    if seed is None:
        return
    fl, fr = seed
    ncx = (fl + fr) >> 1
    for xx in range(fl, fr + 1):
        shirt.add((xx, seed_row))
    # cap band: free growth, neck-connected, hands rejected
    for y in range(seed_row + 1, sleeve_cap):
        nl, nr = 10 ** 9, -1
        for (l, r) in skin_runs(cls, col_waist, y, x0, x1):
            if r < fl - 1 or l > fr + 1:
                continue
            if is_limb(l, r, y, ncx):
                continue
            for xx in range(l, r + 1):
                shirt.add((xx, y))
            nl = min(nl, l)
            nr = max(nr, r)
        if nr < 0:
            break
        fl, fr = nl, nr
    # pinch back to the trunk below the sleeves: re-anchor on the CHEST (the
    # widest non-limb run under the cap), not the neck centre -- in a hard
    # forward lean (attack/jog east) the trunk drifts out of the neck window.
    t_start = max(sleeve_cap, seed_row + 1)
    ty, tseed = -1, None
    for y in range(t_start, min(t_start + 4, bottom)):
        cands = [(l, r) for (l, r) in skin_runs(cls, col_waist, y, x0, x1)
                 if not (r < fl - 1 or l > fr + 1) and not is_limb(l, r, y, None)]
        if cands:
            tseed = max(cands, key=lambda lr: lr[1] - lr[0])
            ty = y
            break
    if tseed is None:
        # no usable trunk row under the cap (limbs crossing everywhere) --
        # anchor the backstop window on the neck and let it do the filling.
        tcx, ty = ncx, t_start - 1
        fl, fr = ncx - TRUNK_HALF, ncx + TRUNK_HALF
    else:
        tcx = (tseed[0] + tseed[1]) >> 1
        fl = max(tseed[0], tcx - TRUNK_HALF)
        fr = min(tseed[1], tcx + TRUNK_HALF)
        for xx in range(fl, fr + 1):
            shirt.add((xx, ty))
    # trunk: slow growth + arm rejection + coasting over blank rows
    blanks = 0
    for y in range(ty + 1, bottom):
        fcx = (fl + fr) >> 1
        nl, nr = 10 ** 9, -1
        painted = False
        for (l, r) in skin_runs(cls, col_waist, y, x0, x1):
            if r < fl - 1 or l > fr + 1:
                continue                      # not touching the torso interval
            if (r - l + 1) <= ARM_W and (l < fl - 1 or r > fr + 1):
                continue                      # narrow + pokes out: crossing arm
            if l >= fl + 2 and r <= fr - 2 and is_limb(l, r, y, fcx):
                continue                      # hand strictly inside the chest
            cl, cr = max(l, fl - GROW), min(r, fr + GROW)
            if cl > cr:
                continue
            for xx in range(cl, cr + 1):
                shirt.add((xx, y))
            nl = min(nl, cl)
            nr = max(nr, cr)
            painted = True
        if painted:
            fl, fr = nl, nr
            blanks = 0
        else:
            blanks += 1
            if blanks > 2:
                break
    # backstop: no bare belly.  Any row between the sleeves and the hem that
    # has torso skin inside the trunk window but no shirt (the tracker
    # stumbled on a weird pose) gets its non-limb runs painted, clipped to
    # the window.  Rows where only a crossing limb occupies the window stay
    # skin -- the belly is occluded there anyway.
    wl, wr = tcx - TRUNK_HALF, tcx + TRUNK_HALF
    for y in range(ty + 1, bottom):
        if any((xx, y) in shirt for xx in range(wl, wr + 1)):
            continue
        for (l, r) in skin_runs(cls, col_waist, y, x0, x1):
            if r < wl or l > wr:
                continue
            if is_limb(l, r, y, None):
                continue
            for xx in range(max(l, wl), min(r, wr) + 1):
                shirt.add((xx, y))


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
