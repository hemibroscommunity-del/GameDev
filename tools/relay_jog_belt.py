#!/usr/bin/env python3
"""v2.3.1342: re-lay the baked jog chain belt STABLY (south/north/southwest).

Owner's on-device pass after the v2.3.1341 rendering fixes: south still
shimmers hard (measured: the baked band's horizontal center swings +-15px
across the cycle -- fill_gear_gaps --band derived the belt span from the
per-frame LEG extent, so the band slid sideways chasing the stride);
north leaves a sliver above the greaves; southwest has one frame with the
belt pulled off-body.  northeast (fixed-width chain centered on the body,
refit_jog_belt.py) is the owner's reference -- this tool gives the bad
directions the same treatment:

  per frame: erase the old chain (central run-cluster below the plate
  bottom, gauntlets kept), then lay a FRESH chainbelt.png band --
  constant width W (the direction's median current chain width),
  centered on the BODY center, constant link phase (anchored to the
  band's own left edge), bottom bridged per-column to the greaves top
  (+2px) so no sliver can open.

PIL + stdlib only (the original bake tools need numpy/scipy, absent
here).  Native-resolution: all anchors are measured, not hardcoded.

Usage: python3 tools/relay_jog_belt.py <dir> [--frames i,j] [--apply]
Dry-run writes a before/after montage to $BT_SCRATCH.  Do NOT pipe the
run through `head` -- SIGPIPE can kill the process before the save.
"""
import os
import sys
from PIL import Image

ALPHA = 20


def arg(flag, default=None, cast=str):
    if flag in sys.argv:
        return cast(sys.argv[sys.argv.index(flag) + 1])
    return default


def main():
    d = sys.argv[1]
    only = arg('--frames', None)
    only = set(int(f) for f in only.split(',')) if only else None
    apply_ = '--apply' in sys.argv

    chest_p = f'public/sprites/gear/chest/steelplate/jog-{d}.png'
    chest = Image.open(chest_p).convert('RGBA')
    legs = Image.open(f'public/sprites/gear/legs/steelgreaves/jog-{d}.png').convert('RGBA')
    base = Image.open(f'public/sprites/player/jog-{d}.png').convert('RGBA')
    H = chest.height
    n, ln, bn = chest.width // H, legs.width // H, base.width // H
    cpx, lpx, bpx = chest.load(), legs.load(), base.load()
    before = chest.copy()

    # ── Pass 1: per-frame measurements ──
    meas = []          # (figTop, figH, bodyCx, plateBot|None, chainL, chainR)
    for i in range(n):
        bx0, cx0 = (i % bn) * H, i * H
        ys = [y for y in range(H) if any(bpx[bx0 + x, y][3] > ALPHA for x in range(0, H, 2))]
        if not ys:
            meas.append(None); continue
        y0, y1 = min(ys), max(ys)
        figH = y1 - y0
        bcols = [x for x in range(H) if any(bpx[bx0 + x, y][3] > ALPHA for y in range(y0, y1, 3))]
        bcx = bcols[len(bcols) // 2] if bcols else H // 2
        spans = {}
        for y in range(H):
            xs = [x for x in range(H) if cpx[cx0 + x, y][3] > ALPHA]
            if xs:
                spans[y] = (min(xs), max(xs))
        upper = [spans[y][1] - spans[y][0] + 1 for y in sorted(spans) if y < y0 + 0.45 * figH]
        baseline = sorted(upper)[len(upper) // 2] if upper else 40
        plate_bot = None
        ysort = sorted(spans)
        for k, y in enumerate(ysort[:-1]):
            w = spans[y][1] - spans[y][0] + 1
            w2 = spans[ysort[k + 1]][1] - spans[ysort[k + 1]][0] + 1
            if y > y0 + 0.40 * figH and w <= 0.82 * baseline and w2 <= 0.82 * baseline:
                plate_bot = y
                break
        # current chain x-extent (central cluster at rows below plate_bot)
        chainL = chainR = None
        if plate_bot is not None and spans:
            cbot = max(ysort)
            lows = [spans[y] for y in range(plate_bot, cbot + 1) if y in spans]
            if lows:
                chainL = min(a for a, b in lows)
                chainR = max(b for a, b in lows)
        meas.append((y0, figH, bcx, plate_bot, chainL, chainR))

    ok = [m for m in meas if m]
    med = lambda vals: sorted(vals)[len(vals) // 2] if vals else None
    med_plate_rel = med([m[3] - m[0] for m in ok if m[3] is not None])
    med_W = med([m[5] - m[4] + 1 for m in ok if m[4] is not None])
    if med_plate_rel is None or med_W is None:
        raise SystemExit(f'{d}: could not establish medians')
    W = med_W

    # ── Direction-wide greaves anchor for the band height ──
    gt_rel = []
    for i in range(n):
        if not meas[i]:
            continue
        y0, figH, bcx = meas[i][0], meas[i][1], meas[i][2]
        lx0 = (i % ln) * H
        lt = [y for y in range(y0 + int(0.42 * figH), H)
              if any(lpx[lx0 + x, y][3] > ALPHA for x in range(max(0, bcx - 3), min(H, bcx + 4)))]
        if lt:
            gt_rel.append(min(lt) - y0)
    med_gt_rel = med(gt_rel) or (med_plate_rel + int(0.10 * med([m[1] for m in ok])))
    bandH = max(5, med_gt_rel - med_plate_rel + 3)

    chain_src = Image.open('tools/posesheets/chainbelt.png').convert('RGBA')
    chain_w = max(1, round(chain_src.width * bandH / chain_src.height))
    chain = chain_src.resize((chain_w, bandH), Image.LANCZOS)
    chpx = chain.load()

    changed = 0
    for i in range(n):
        if only is not None and i not in only:
            continue
        if not meas[i]:
            continue
        y0, figH, bcx, plate_bot, _, _ = meas[i]
        cx0, lx0 = i * H, (i % ln) * H
        if plate_bot is None:
            plate_bot = y0 + med_plate_rel   # irregular frames use the direction median
        x0, x1 = bcx - W // 2, bcx + W // 2

        # per-column band bottom: greaves top + 2 (bridges the sliver);
        # CLAMPED to the direction median +4 -- the greaves probe follows
        # knee/boot pixels far down on columns beside the legs, which
        # tiled chain "drips" without the clamp.  Columns with no greaves
        # fall back to the direction median.
        clamp = y0 + med_gt_rel + 4
        col_bot = {}
        for x in range(max(0, x0), min(H, x1 + 1)):
            lt = [y for y in range(y0 + int(0.42 * figH), H) if lpx[lx0 + x, y][3] > ALPHA]
            col_bot[x] = min((min(lt) + 2) if lt else (y0 + med_gt_rel + 2), clamp)

        # ── Erase the old chain: central run-cluster in rows below the plate ──
        cbot_rows = range(plate_bot, min(H, y0 + med_gt_rel + int(0.10 * figH)))
        for y in cbot_rows:
            runs, start, prev = [], None, -10
            for x in range(H):
                if cpx[cx0 + x, y][3] > ALPHA:
                    if start is None:
                        start = x
                    prev = x
                elif start is not None and x - prev > 2:
                    runs.append((start, prev)); start = None
            if start is not None:
                runs.append((start, prev))
            for (ra, rb) in runs:
                # a run belongs to the belt if it overlaps the chain window
                # and is not a wide plate remnant (plate rows sit above)
                if rb >= x0 - 3 and ra <= x1 + 3 and not (ra < x0 - 12 and rb > x1 + 12):
                    for x in range(max(ra, x0 - 3), min(rb, x1 + 3) + 1):
                        if cpx[cx0 + x, y][3] > ALPHA:
                            cpx[cx0 + x, y] = (0, 0, 0, 0)
                            changed += 1

        # ── Lay the fresh band: constant phase from the band's left edge ──
        bx0 = (i % bn) * H
        for x in range(max(0, x0), min(H, x1 + 1)):
            for y in range(plate_bot, min(H, col_bot[x])):
                if cpx[cx0 + x, y][3] > ALPHA:
                    continue          # never over plate/gauntlet pixels
                # the belt is worn ON the body -- mirror the bake's
                # `band & bop` gate so nothing is drawn off the figure
                if bpx[bx0 + x, y][3] <= ALPHA:
                    continue
                sp = chpx[(x - x0) % chain_w, (y - plate_bot) % bandH]
                if sp[3] > 30:
                    cpx[cx0 + x, y] = (sp[0], sp[1], sp[2], 255)
                    changed += 1

    print(f'jog-{d}: W={W} bandH={bandH} plateRelMed={med_plate_rel} '
          f'greavesRelMed={med_gt_rel} -> {changed}px changed across {n} frames')

    zy0, zy1 = int(0.30 * H), int(0.95 * H)
    zh = zy1 - zy0
    m = Image.new('RGBA', (n * (H + 2), zh * 2 + 6), (40, 44, 52, 255))
    for i in range(n):
        m.paste(before.crop((i * H, zy0, (i + 1) * H, zy1)), (i * (H + 2), 0))
        m.paste(chest.crop((i * H, zy0, (i + 1) * H, zy1)), (i * (H + 2), zh + 6))
    mp = os.path.join(os.environ.get('BT_SCRATCH', '.'), f'belt-relay-{d}.png')
    m.save(mp)
    print('montage:', mp)

    if apply_:
        chest.save(chest_p)
        print('APPLIED ->', chest_p)
    else:
        print('dry run (pass --apply to write)')


if __name__ == '__main__':
    main()
