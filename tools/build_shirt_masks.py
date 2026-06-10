#!/usr/bin/env python3
"""Build per-frame SHIRT MASKS for the player body sheets, offline.

Strategy (owner-specified): understand the body first, then fill the shirt
region SOLID.  Per frame:
  1. HEAD: grown from the head anchor (anchors.json) over skin, down to the
     chin (gap or width pinch under the anchor column).
  2. ARMS: grown from each hand anchor (anchors.json) over skin, while the
     local horizontal skin run stays narrow (<= ARM_MAX_W); growth stops
     where the limb merges into the shoulder/chest mass.
  3. WAIST: per-column first pants pixel (colWaist); collar from
     crown + NECK_FRAC * (waist - crown).
  4. SHIRT = every OPAQUE pixel in rows [collar, colWaist) that is neither
     HEAD nor ARM -- solid by construction (no skin classifier in the fill).
  5. SLEEVES: arm pixels within the sleeve band [collar, sleeveLine) that
     touch the torso mass get re-added (cap sleeves), so a fist raised to
     the face stays skin but the upper arm at the shoulder is covered.

Sheets without anchors (pickup, mine, welcome) fall back to a conservative
variant (no arm removal below the sleeve line; arms there are usually
forward/down and outside the torso span).

Output: public/sprites/player-shirt-mask/<pose>-<dir>.png -- white pixels
where the shirt is, transparent elsewhere.  The renderer tints these to the
chosen shirt color and composites them over the body; it does NO boundary
math at runtime.

Per-frame manual OVERRIDES at the bottom allow pixel patches for stubborn
frames without touching the algorithm.
"""
import json
import os
import sys
from collections import deque
from PIL import Image

FRAME_W = 256
NECK_FRAC = 0.48
SLEEVE_FRAC = 0.42
ARM_MAX_W = 9      # arm BFS stops where the skin run gets wider than this
HEAD_MAX_W_DROP = 0.45  # chin = width pinch below this fraction of max head width


def is_skin(p):
    r, g, b, a = p
    return a > 40 and r > g and g >= b and (r - b) > 30 and r > 90 and (r - g) > 25


def is_pants(p):
    r, g, b, a = p
    return a > 180 and g >= r - 10 and g > b + 8 and r < 150


def build_frame_mask(px, x0, x1, h, anchors):
    """Returns set of (x, y) shirt pixels for one 256px frame."""
    W = x1 - x0
    skin = [[False] * W for _ in range(h)]
    pants = [[False] * W for _ in range(h)]
    opaque = [[False] * W for _ in range(h)]
    for y in range(h):
        for x in range(W):
            p = px[x0 + x, y]
            if p[3] > 40:
                opaque[y][x] = True
                if is_skin(p):
                    skin[y][x] = True
                elif is_pants(p):
                    pants[y][x] = True
    # landmarks
    crown = next((y for y in range(h) if any(skin[y])), -1)
    if crown < 0:
        return set()
    bottom = max(y for y in range(h) if any(opaque[y]))
    mid = (crown + bottom) >> 1
    waist = next((y for y in range(mid, bottom)
                  if sum(pants[y]) >= 3), round(crown + 0.62 * (bottom - crown)))
    collar = max(0, round(crown + NECK_FRAC * (waist - crown)))
    sleeve_line = min(bottom, round(collar + SLEEVE_FRAC * (waist - collar)))
    col_waist = [waist] * W
    for x in range(W):
        for y in range(mid, bottom):
            if pants[y][x]:
                col_waist[x] = y
                break

    def run_width(x, y):
        l = x
        while l > 0 and skin[y][l - 1]:
            l -= 1
        r = x
        while r < W - 1 and skin[y][r + 1]:
            r += 1
        return r - l + 1

    def thickness(x, y):
        """min(horizontal, vertical) skin run through (x,y) -- a limb is
        thin across SOME axis regardless of its orientation."""
        u = y
        while u > 0 and skin[u - 1][x]:
            u -= 1
        d = y
        while d < h - 1 and skin[d + 1][x]:
            d += 1
        return min(run_width(x, y), d - u + 1)

    def grow(seed, limit_width, max_px=4000, y_stop=None, neck_stop_below=None, max_dist=None):
        """BFS over skin from seed; don't expand through wide rows."""
        out = set()
        if seed is None:
            return out
        sx, sy = seed
        # snap seed to nearest skin pixel within 4px
        best = None
        for dy in range(-4, 5):
            for dx in range(-4, 5):
                x, y = sx + dx, sy + dy
                if 0 <= x < W and 0 <= y < h and skin[y][x]:
                    d = dx * dx + dy * dy
                    if best is None or d < best[0]:
                        best = (d, x, y)
        if best is None:
            return out
        q = deque([(best[1], best[2])])
        out.add((best[1], best[2]))
        while q and len(out) < max_px:
            x, y = q.popleft()
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if not (0 <= nx < W and 0 <= ny < h):
                    continue
                if (nx, ny) in out or not skin[ny][nx]:
                    continue
                if y_stop is not None and ny > y_stop:
                    continue
                if (neck_stop_below is not None and ny > neck_stop_below
                        and thickness(nx, ny) <= 7):
                    continue          # entering the neck: stop, keep it skin
                if max_dist is not None:
                    ddx, ddy = nx - best[1], ny - best[2]
                    if ddx * ddx + ddy * ddy > max_dist * max_dist:
                        continue      # the head is compact -- a leak through
                                      # a thick profile neck must not swallow
                                      # the torso (hit-east f0)
                if limit_width and thickness(nx, ny) > limit_width:
                    continue
                out.add((nx, ny))
                q.append((nx, ny))
        return out

    # HEAD: grown from the head anchor, bounded by the chin
    head_px = set()
    if anchors and 'head' in anchors:
        hxa, hya = anchors['head']
        hxa -= x0
        # chin: walk down at the anchor column
        chin = crown
        max_w = 0
        for y in range(max(0, hya - 20), min(collar + 12, bottom)):
            if not (0 <= hxa < W):
                break
            if not any(skin[y][max(0, hxa - 2):min(W, hxa + 3)]):
                if max_w >= 8:
                    chin = y - 1
                    break
                continue
            wd = run_width(min(W - 1, max(0, hxa)), y) if skin[y][hxa] else 0
            if max_w >= 10 and 0 < wd <= HEAD_MAX_W_DROP * max_w:
                chin = y - 1
                break
            max_w = max(max_w, wd)
            chin = y
        head_px = grow((hxa, hya), None, neck_stop_below=hya, max_dist=26)
        # geometric head zone: the lower face can be in shadow (fails the
        # skin test) and a bent chin can touch the chest -- the skin-growth
        # alone misses those.  The anchor marks the head centre; every
        # opaque pixel within HEAD_R of it is head, color notwithstanding.
        HEAD_R = 20
        for dy in range(-HEAD_R, HEAD_R + 1):
            for dx in range(-HEAD_R, HEAD_R + 1):
                if dx * dx + dy * dy > HEAD_R * HEAD_R:
                    continue
                x, y = hxa + dx, hya + dy
                if 0 <= x < W and 0 <= y < h and opaque[y][x]:
                    head_px.add((x, y))
    else:
        # no anchor: everything above the collar is head/neck
        for y in range(0, collar):
            for x in range(W):
                if skin[y][x]:
                    head_px.add((x, y))

    # ARMS: grown from each hand anchor through narrow skin
    arm_px = set()
    for key in ('l', 'r'):
        if anchors and key in anchors:
            ax, ay = anchors[key]
            arm_px |= grow((ax - x0, ay), ARM_MAX_W)

    # SHIRT: every opaque pixel in [collar, colWaist) not head / not arm
    shirt = set()
    for y in range(collar, bottom):
        for x in range(W):
            if not opaque[y][x] or y >= col_waist[x]:
                continue
            if (x, y) in head_px or (x, y) in arm_px:
                continue
            shirt.add((x, y))
    # SLEEVES: arm pixels in the sleeve band touching the torso get covered
    for (x, y) in list(arm_px):
        if collar <= y < sleeve_line and y < col_waist[x]:
            near = any((x + dx, y + dy) in shirt
                       for dx in (-2, -1, 0, 1, 2) for dy in (-1, 0, 1))
            if near:
                shirt.add((x, y))
    return shirt


def main():
    anchors_all = json.load(open('public/sprites/player/anchors.json'))
    outdir = 'public/sprites/player-shirt-mask'
    os.makedirs(outdir, exist_ok=True)
    only = sys.argv[1] if len(sys.argv) > 1 else None
    sheets = []
    for pose in ('stand', 'jog', 'hit', 'attack', 'pickup', 'mine'):
        for d in ('south', 'east', 'north', 'northeast', 'southwest'):
            p = f'public/sprites/player/{pose}-{d}.png'
            if os.path.exists(p):
                sheets.append((pose, d, p))
    for pose, d, p in sheets:
        key = f'{pose}-{d}'
        if only and key != only:
            continue
        im = Image.open(p).convert('RGBA')
        w, h = im.size
        px = im.load()
        n = w // FRAME_W
        per_frame = anchors_all.get(key)
        mask = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        mp = mask.load()
        for f in range(n):
            a = per_frame[f] if per_frame and f < len(per_frame) else None
            shirt = build_frame_mask(px, f * FRAME_W, min(w, (f + 1) * FRAME_W), h, a)
            shirt = OVERRIDES.get((key, f), lambda s: s)(shirt)
            for (x, y) in shirt:
                mp[f * FRAME_W + x, y] = (255, 255, 255, 255)
        mask.save(f'{outdir}/{key}.png')
        print(key, n, 'frames')


# Per-frame manual patches: (sheet, frame) -> fn(shirt_set) -> shirt_set.
# Use for stubborn frames instead of bending the algorithm around them.
OVERRIDES = {}


if __name__ == '__main__':
    main()
