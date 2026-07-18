#!/usr/bin/env python3
"""v2.3.1342b: verify the jog midsection shows NO background and the belt
stays BEHIND the plate + greaves — per frame, per direction.

Owner's rule set (2026-07-18):
  1. the chain belt must render BEHIND the chestplate and the leg layer —
     since the belt is baked into the CHEST sheet (which draws ABOVE the
     greaves), any chain pixel where the greaves are opaque paints ON TOP
     of leg armor and is a violation;
  2. no background may show through the midsection.

This tool composites body -> greaves -> chest in the renderer's draw
order over MAGENTA, emulating the masked-body pants band
(entityRenderer._maskedBodyFrame: body pants show in the jogWaistRow-
anchored band rows, within the gear's horizontal span per row), then:

  * counts chain-over-greaves pixels (belt pixels in the chest sheet
    where the greaves are opaque underneath);
  * counts magenta GAP pixels in the midsection interior (rows from the
    plate bottom to the greaves top +6, columns interior to the figure's
    coverage at that row);
  * writes a zoomed montage with violations highlighted (red = chain
    over greaves, magenta = background gap).

Usage: python3 tools/verify_waist_coverage.py [dir ...]   (default: all 5)
"""
import os
import re
import sys
from PIL import Image

ALPHA = 20
MAG = (255, 0, 255, 255)

# v2.3.1345: the chain belt is its own gear sheet now
# (belt/chainbelt/jog-<dir>.png, body-frame-aligned, drawn under legs+chest)
# — composite it the same way here so the counters reflect what ships.

_JW = None
def jog_waist_row(d, i):
    global _JW
    if _JW is None:
        src = open('src/rendering/jogWaist.js').read()
        m = re.search(r'JOG_WAIST\s*=\s*(\{.*?\n\})', src, re.S)
        _JW = {}
        if m:
            # v2.3.1344: accept QUOTED keys ("south": [...]) — the unquoted-only
            # pattern silently matched nothing, so wr=None and the pants band was
            # never emulated: the verifier passed sheets that showed bare skin
            # in-game.  A parse failure now raises instead of degrading.
            for dm in re.finditer(r'"?(\w+)"?\s*:\s*\[([^\]]*)\]', m.group(1)):
                vals = [int(v) for v in dm.group(2).replace('\n', ' ').split(',') if v.strip()]
                if vals:
                    _JW[dm.group(1)] = vals
    arr = _JW.get(d)
    if not arr:
        raise SystemExit(f'jogWaist.js parse failed for "{d}" — verifier would '
                         f'silently skip the pants band; fix the regex')
    return arr[i % len(arr)]


def verify(d):
    chest = Image.open(f'public/sprites/gear/chest/steelplate/jog-{d}.png').convert('RGBA')
    legs = Image.open(f'public/sprites/gear/legs/steelgreaves/jog-{d}.png').convert('RGBA')
    base = Image.open(f'public/sprites/player/jog-{d}.png').convert('RGBA')
    H = chest.height
    n, ln, bn = chest.width // H, legs.width // H, base.width // H
    cpx, lpx, bpx = chest.load(), legs.load(), base.load()
    scale = H / 256.0
    try:
        beltS = Image.open(f'public/sprites/gear/belt/chainbelt/jog-{d}.png').convert('RGBA')
        beltSpx, beltN = beltS.load(), beltS.width // beltS.height
    except FileNotFoundError:
        beltSpx, beltN = None, 0

    over = gaps = tan = black = semi = 0
    over_f, gap_f, tan_f, semi_f = set(), set(), set(), set()
    comp = Image.new('RGBA', (n * (H + 2), H), (60, 64, 72, 255))
    for i in range(n):
        cx0, lx0, bx0 = i * H, (i % ln) * H, (i % bn) * H
        wr = jog_waist_row(d, i)
        w0 = int((wr - 26) * scale) if wr else None
        w1 = int((wr + 18) * scale) if wr else None

        # v2.3.1345: the belt sheet frame for this body frame (frame-aligned)
        beltFx0 = (i % beltN) * H if beltN else None

        # gear-enclosed POCKETS: the renderer's fill = gear | unreached, so
        # body pixels enclosed by gear (armpit pockets etc.) stay visible.
        # Flood transparency from the frame border; what the flood can't
        # reach is enclosed.
        from collections import deque
        gearop = [[(cpx[cx0 + x, y][3] > ALPHA or lpx[lx0 + x, y][3] > ALPHA)
                   for x in range(H)] for y in range(H)]
        reach = [[False] * H for _ in range(H)]
        dq = deque()
        for x in range(H):
            for y in (0, H - 1):
                if not gearop[y][x] and not reach[y][x]:
                    reach[y][x] = True; dq.append((x, y))
        for y in range(H):
            for x in (0, H - 1):
                if not gearop[y][x] and not reach[y][x]:
                    reach[y][x] = True; dq.append((x, y))
        while dq:
            x, y = dq.popleft()
            for nx, ny in ((x-1, y), (x+1, y), (x, y-1), (x, y+1)):
                if 0 <= nx < H and 0 <= ny < H and not gearop[ny][nx] and not reach[ny][nx]:
                    reach[ny][nx] = True; dq.append((nx, ny))

        # v2.3.1344: mirror the renderer's DILATED gear erase
        # (entityRenderer._maskedBodyFrame: destination-out with the gear
        # silhouette box-dilated by 6 at 256 -> 3 here).  Body survives only
        # OUTSIDE the dilated silhouette; the earlier model drew body wherever
        # opaque, so bare skin the game shows (far from any armor pixel) and
        # holes the erase opens (near armor, nothing over) were both invisible
        # to the verifier.  Separable box dilation: rows then columns.
        def dilate(r):
            hz = [[False] * H for _ in range(H)]
            for y in range(H):
                g = gearop[y]
                for x in range(H):
                    hz[y][x] = any(g[max(0, x - r):min(H, x + r + 1)])
            out = [[False] * H for _ in range(H)]
            for x in range(H):
                for y in range(H):
                    out[y][x] = any(hz[yy][x] for yy in range(max(0, y - r), min(H, y + r + 1)))
            return out
        dil_r = max(1, round(6 * scale))
        dil = dilate(dil_r)
        # v2.3.1345: the PANTS-RESTORE (entityRenderer v2.3.650) re-opens any
        # erased pixel whose colour reads as pants; positionally that's the
        # body below the measured skin->pants line (the jogWaist row).  The
        # confinement pass then keeps restored pixels only near the gear
        # silhouette (fill = gear|pockets dilated 2) or in the band rows.
        # Without this model every seam pixel near armor counted as a
        # "background gap" — yet northeast, which passes on-device, showed
        # 761px of them: in the real game they render as pants.
        near2 = dilate(2)

        # per-row gear span (chest|greaves opaque) for the pants band rule
        frame = Image.new('RGBA', (H, H), MAG)
        fpx = frame.load()
        srcmap = [[0] * H for _ in range(H)]   # [y][x]: 0 none 1 body 2 legs 3 chest
        for y in range(H):
            gxmin, gxmax = H, -1
            for x in range(H):
                if gearop[y][x]:
                    if x < gxmin: gxmin = x
                    if x > gxmax: gxmax = x
            for x in range(H):
                # draw order: pants band / pocket body -> BELT -> greaves ->
                # chest.  Band/pocket body only survives OUTSIDE the dilated
                # erase.  The belt is the v2.3.1345 runtime layer.
                p = None
                in_band = (w0 is not None and w0 <= y < w1 and gxmin <= x <= gxmax)
                in_pocket = (not gearop[y][x] and not reach[y][x])
                if bpx[bx0 + x, y][3] > ALPHA:
                    if (in_band or in_pocket) and not dil[y][x]:
                        p = bpx[bx0 + x, y]; srcmap[y][x] = 1   # surviving skin/pants
                    elif (wr is not None and y >= int(wr * scale)
                          and (near2[y][x] or in_band or in_pocket)):
                        p = bpx[bx0 + x, y]; srcmap[y][x] = 1   # pants-restore
                if beltFx0 is not None:
                    bp = beltSpx[beltFx0 + x, y]
                    if bp[3] > ALPHA:
                        p = bp; srcmap[y][x] = 4
                if lpx[lx0 + x, y][3] > ALPHA:
                    p = lpx[lx0 + x, y]; srcmap[y][x] = 2
                if cpx[cx0 + x, y][3] > ALPHA:
                    p = cpx[cx0 + x, y]; srcmap[y][x] = 3
                if p is not None:
                    fpx[x, y] = (p[0], p[1], p[2], 255)

        # figure geometry for the interior test
        ys = [y for y in range(H) if any(bpx[bx0 + x, y][3] > ALPHA for x in range(0, H, 2))]
        if not ys:
            comp.paste(frame, (i * (H + 2), 0)); continue
        y0, y1 = min(ys), max(ys)
        figH = y1 - y0
        mid0, mid1 = y0 + int(0.42 * figH), y0 + int(0.68 * figH)

        for y in range(mid0, mid1):
            for x in range(H):
                # violation 1: belt over the leg layer -- a chest pixel over
                # opaque greaves in the sub-plate rows paints ON TOP of leg
                # armor (the chest layer draws above gearLegs).
                if cpx[cx0 + x, y][3] > ALPHA and lpx[lx0 + x, y][3] > ALPHA:
                    over += 1
                    over_f.add(i)
                    fpx[x, y] = (255, 40, 40, 255)
                # violation 2: true background gap -- the BODY exists here
                # (figure interior; between-legs/arm background has body
                # transparent and is legit), nothing rendered, AND something
                # IS rendered on both sides of this row (otherwise it's the
                # figure's outer-edge AA halo, where world background
                # legitimately surrounds the character).
                elif bpx[bx0 + x, y][3] > ALPHA and fpx[x, y][:3] == MAG[:3]:
                    left = any(fpx[xx, y][:3] != MAG[:3] for xx in range(max(0, x - 20), x))
                    right = any(fpx[xx, y][:3] != MAG[:3] for xx in range(x + 1, min(H, x + 21)))
                    if left and right:
                        gaps += 1
                        gap_f.add(i)
                        if os.environ.get('VWC_DEBUG'):
                            print(f'  GAP {d} f{i} ({x},{y})')
                # violation 3 (owner: fully armored => ZERO tan): a rendered
                # BODY pixel in the SKIN rows (above the jogWaist skin->pants
                # line).  Pants below the line are the designed band backing
                # around the runtime belt, not a violation.  Highlighted cyan.
                elif srcmap[y][x] == 1 and wr is not None and y < int(wr * scale):
                    tan += 1
                    tan_f.add(i)
                    fpx[x, y] = (0, 255, 255, 255)
                # "minimal black" tracker: near-black CHEST pixels (belt
                # backing / shadow fills) in the midsection — counted, not a
                # hard violation.
                if srcmap[y][x] == 3:
                    pr, pg, pb2 = fpx[x, y][:3]
                    if max(pr, pg, pb2) <= 34:
                        black += 1
                # violation 4 (v2.3.1344): SEMI-TRANSPARENT chest pixels — the
                # game alpha-blends them with the pants-restored body behind
                # the belt (tan bleed-through).  NE, the owner's reference,
                # has zero.  Highlighted yellow.
                ca4 = cpx[cx0 + x, y][3]
                if ALPHA < ca4 < 240:
                    semi += 1
                    semi_f.add(i)
                    fpx[x, y] = (255, 255, 0, 255)
        comp.paste(frame, (i * (H + 2), 0))

    S = os.environ.get('BT_SCRATCH', '.')
    mp = os.path.join(S, f'waist-verify-{d}.png')
    comp.save(mp)
    print(f'jog-{d}: chain-over-greaves px={over} (frames {sorted(over_f)}), '
          f'interior background gaps px={gaps} (frames {sorted(gap_f)}), '
          f'TAN body px={tan} (frames {sorted(tan_f)}), near-black px={black}, '
          f'semi-alpha px={semi} (frames {sorted(semi_f)})')
    print('  montage:', mp)
    return over, gaps, tan, black, semi


def main():
    dirs = sys.argv[1:] or ['south', 'north', 'east', 'northeast', 'southwest']
    total = [0, 0, 0, 0, 0]
    for d in dirs:
        o, g, t, b, s = verify(d)
        total[0] += o; total[1] += g; total[2] += t; total[3] += b; total[4] += s
    print(f'TOTAL: chain-over-greaves={total[0]}px, background-gaps={total[1]}px, '
          f'TAN={total[2]}px, near-black={total[3]}px, semi-alpha={total[4]}px')


if __name__ == '__main__':
    main()
