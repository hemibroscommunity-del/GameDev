#!/usr/bin/env python3
"""v2.3.1345: generate src/rendering/jogBelt.js — the runtime jog-belt anchor
table.

The chain belt is no longer baked into the chest sheets (six bake/seal rounds
each produced a new on-device artifact: sliding band, chain over the swinging
arm, detached seam gaps).  Instead entityRenderer draws the belt as its OWN
layer between gearLegs and gearChest, and this tool measures where: per
direction, per frame, the body torso center-x plus a direction-wide width and
height, all in the renderer's 256 frame space.  The row anchor comes from the
existing jogWaistRow table (src/rendering/jogWaist.js) — this table only adds
what that one lacks.

Measurements (from public/sprites/player/jog-<dir>.png, alpha > 20):
  cx[i]  median opaque body column of frame i (the torso center; arms are
         side-lobes and don't move the median much)
  w[i]   the TORSO span at the waist rows of frame i (the contiguous body
         run containing cx, so a swinging arm beside the hip is excluded),
         inset 2px and median-smoothed over the neighbours — the belt must
         cover the whole waist (a narrow NE-proportion band left the skin
         beside it to the dilated erase = the on-device "detached gaps"),
         but never poke past the silhouette
  h      greaves-top median minus plate-bottom median + 4 (measured from the
         gear sheets) so the band spans the plate<->greaves seam

Usage: python3 tools/gen_jog_belt_table.py          (writes the JS module)
Do NOT pipe through `head` — SIGPIPE can kill the process before the write.
"""
import sys
from PIL import Image

ALPHA = 20
DIRS = ['south', 'north', 'east', 'northeast', 'southwest']


def jog_waist_rows(d):
    import re
    src = open('src/rendering/jogWaist.js').read()
    m = re.search(r'JOG_WAIST\s*=\s*(\{.*?\n\})', src, re.S)
    for dm in re.finditer(r'"?(\w+)"?\s*:\s*\[([^\]]*)\]', m.group(1)):
        if dm.group(1) == d:
            return [int(v) for v in dm.group(2).replace('\n', ' ').split(',') if v.strip()]
    raise SystemExit(f'jogWaist.js missing {d}')


def measure(d):
    base = Image.open(f'public/sprites/player/jog-{d}.png').convert('RGBA')
    chest = Image.open(f'public/sprites/gear/chest/steelplate/jog-{d}.png').convert('RGBA')
    legs = Image.open(f'public/sprites/gear/legs/steelgreaves/jog-{d}.png').convert('RGBA')
    H = base.height
    n, cn, ln = base.width // H, chest.width // H, legs.width // H
    bpx, cpx, lpx = base.load(), chest.load(), legs.load()
    scale = 256.0 / H
    jw = jog_waist_rows(d)

    cxs, ws, figHs, plate_rel, gt_rel = [], [], [], [], []
    top_gaps, bot_gaps = [], []
    for i in range(max(n, cn)):
        bx0 = (i % n) * H
        ys = [y for y in range(H) if any(bpx[bx0 + x, y][3] > ALPHA for x in range(0, H, 2))]
        if not ys:
            cxs.append(128); ws.append(30); continue
        y0, y1 = min(ys), max(ys)
        figH = y1 - y0
        figHs.append(figH)
        cols = [x for x in range(H) if any(bpx[bx0 + x, y][3] > ALPHA for y in range(y0, y1, 3))]
        bcx = cols[len(cols) // 2] if cols else H // 2
        cxs.append(round(bcx * scale))

        # belt width: the wider of (a) the torso span at the waist rows and
        # (b) the PLATE's bottom-rim span — the erased-skin slivers between
        # the plate edge and the arms sit beyond the bare torso but inside
        # the plate width, and the belt must cover them (they showed as the
        # on-device "detached gaps").  Contiguous runs containing bcx only,
        # so a swinging arm/gauntlet beside the hip never widens the belt.
        wr_s = jw[i % len(jw)] / scale
        def run_span(px_, x0_, y):
            if px_[x0_ + bcx, y][3] <= ALPHA:
                return 0
            xl = bcx
            while xl > 0 and px_[x0_ + xl - 1, y][3] > ALPHA:
                xl -= 1
            xr = bcx
            while xr < H - 1 and px_[x0_ + xr + 1, y][3] > ALPHA:
                xr += 1
            return xr - xl + 1
        span = 0
        for y in range(max(0, int(wr_s - 8 / scale)), min(H, int(wr_s + 2 / scale) + 1)):
            span = max(span, run_span(bpx, bx0, y))
        cx0i = (i % cn) * H
        # plate bottom rim for THIS frame: the widest of the plate's LAST few
        # torso rows (contiguous run containing bcx, >=10px so stray pixels
        # don't count) before the chest layer ends above the seam
        spans_p = []
        for y in range(int(y0 + 0.35 * figH), min(H, int(y0 + 0.62 * figH))):
            s = run_span(cpx, cx0i, y)
            if s >= 10:
                spans_p.append(s)
        pspan = max(spans_p[-4:]) if spans_p else 0
        w_px = max(span, pspan) + 2
        ws.append(max(10, round(w_px * scale)) if w_px > 2 else 30)

        # plate bottom: chest span narrows to <=82% of the upper-torso median
        cx0 = (i % cn) * H
        spans = {}
        for y in range(H):
            xs = [x for x in range(H) if cpx[cx0 + x, y][3] > ALPHA]
            if xs:
                spans[y] = xs[-1] - xs[0] + 1
        upper = [spans[y] for y in sorted(spans) if y < y0 + 0.45 * figH]
        baseline = sorted(upper)[len(upper) // 2] if upper else 40
        ysort = sorted(spans)
        plate_y = None
        for k, y in enumerate(ysort[:-1]):
            if (y > y0 + 0.40 * figH and spans[y] <= 0.82 * baseline
                    and spans[ysort[k + 1]] <= 0.82 * baseline):
                plate_y = y
                plate_rel.append(y - y0)
                break
        lx0 = (i % ln) * H
        lt = [y for y in range(y0 + int(0.42 * figH), H)
              if any(lpx[lx0 + x, y][3] > ALPHA for x in range(max(0, bcx - 3), min(H, bcx + 4)))]
        gt_y = min(lt) if lt else None
        if gt_y is not None:
            gt_rel.append(gt_y - y0)
        # seam offsets relative to the committed waist row (what the renderer
        # anchors on): how far the plate bottom sits ABOVE it, and the greaves
        # top BELOW it, per frame
        if plate_y is not None:
            top_gaps.append(wr_s - plate_y)
        if gt_y is not None:
            bot_gaps.append(gt_y - wr_s)

    med = lambda a: sorted(a)[len(a) // 2] if a else 0
    # band top: plate-bottom median + margin (the plate silhouette curves UP
    # at its sides, so the extra height hides behind the plate at center and
    # covers the corner slivers).  band bottom: greaves-top median + margin
    # (north's greaves ride BELOW the waist row — a fixed bottom left an
    # uncovered strip).  b = bottom offset from the waist row, 256-space.
    top = max(6, round((med(top_gaps) + 2) * scale) + 6)
    bot = max(4, round(med(bot_gaps) * scale) + 8)
    h = top + bot
    # median-smooth the widths over the neighbours (circular) so a single
    # frame's silhouette wobble can't flicker the belt width
    ws = ws[:n]
    sm = [sorted([ws[(i - 1) % n], ws[i], ws[(i + 1) % n]])[1] for i in range(n)]
    return {'wm': max(sm), 'h': h, 'b': bot, 'w': sm, 'cx': cxs[:n]}


def render_sheet(d, t):
    """Write public/sprites/gear/belt/chainbelt/jog-<d>.png — a body-frame-
    aligned strip (128px cells, like every other shipped gear sheet): per
    frame, the measured belt rect filled with dark backing + tiled chain,
    CLIPPED to the body silhouette so the band can never poke past the torso
    on leaning frames (an axis-aligned rect stuck out sideways on southwest).
    The renderer then treats it as a normal gear layer — same transform as
    the body, no runtime anchor math at all."""
    base = Image.open(f'public/sprites/player/jog-{d}.png').convert('RGBA')
    H = base.height
    n = base.width // H
    bpx = base.load()
    s = H / 256.0
    jw = jog_waist_rows(d)
    chain = Image.open('tools/posesheets/chainbelt.png').convert('RGBA')
    h = max(4, round(t['h'] * s))
    tile_w = max(1, round(chain.width * h / chain.height))
    tile = chain.resize((tile_w, h), Image.LANCZOS)
    tpx = tile.load()
    out = Image.new('RGBA', (n * H, H), (0, 0, 0, 0))
    opx = out.load()
    for i in range(n):
        bx0 = i * H
        w = max(2, round(t['w'][i % len(t['w'])] * s))
        cx = round(t['cx'][i % len(t['cx'])] * s)
        wr = round(jw[i % len(jw)] * s)
        y1 = wr + round(t['b'] * s)          # band bottom
        y0b = y1 - h                          # band top
        x0 = cx - w // 2
        for y in range(max(0, y0b), min(H, y1)):
            for x in range(max(0, x0), min(H, x0 + w)):
                if bpx[bx0 + x, y][3] <= ALPHA:
                    continue                  # clip to the body silhouette
                sp = tpx[(x - x0) % tile_w, (y - y0b) % h]
                if sp[3] > 30:
                    opx[bx0 + x, y] = (sp[0], sp[1], sp[2], 255)
                else:
                    opx[bx0 + x, y] = (20, 22, 26, 255)   # backing: reads solid
    path = f'public/sprites/gear/belt/chainbelt/jog-{d}.png'
    import os
    os.makedirs(os.path.dirname(path), exist_ok=True)
    out.save(path)
    return path


def main():
    tables = {d: measure(d) for d in DIRS}
    for d in DIRS:
        t = tables[d]
        p = render_sheet(d, t)
        print(f'{d}: wm={t["wm"]} h={t["h"]} b={t["b"]} frames={len(t["cx"])} '
              f'w[0..5]={t["w"][:6]} -> {p}')


if __name__ == '__main__':
    main()
