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
import re
import sys
from PIL import Image

ALPHA = 20


def jog_waist_table():
    """Parse src/rendering/jogWaist.js -> {dir: [row256, ...]} (the measured
    per-frame skin->pants transition rows the renderer's band anchors on)."""
    src = open('src/rendering/jogWaist.js').read()
    m = re.search(r'JOG_WAIST\s*=\s*(\{.*?\n\})', src, re.S)
    jw = {}
    if m:
        for dm in re.finditer(r'"?(\w+)"?\s*:\s*\[([^\]]*)\]', m.group(1)):
            vals = [int(v) for v in dm.group(2).replace('\n', ' ').split(',') if v.strip()]
            if vals:
                jw[dm.group(1)] = vals
    if not jw:
        raise SystemExit('jogWaist.js parse failed')
    return jw


def arg(flag, default=None, cast=str):
    if flag in sys.argv:
        return cast(sys.argv[sys.argv.index(flag) + 1])
    return default


def main():
    d = sys.argv[1]
    only = arg('--frames', None)
    only = set(int(f) for f in only.split(',')) if only else None
    apply_ = '--apply' in sys.argv
    # v2.3.1342b (owner): --fix-only skips the erase+re-lay and runs ONLY the
    # correction passes below (belt-behind-legs + gap fill) — for east/
    # northeast, whose baked look the owner likes and which just need the
    # layering rule enforced.
    fix_only = '--fix-only' in sys.argv
    # v2.3.1343: --strip-only = erase the current chain and STOP (no re-lay,
    # no correction passes) — produces the beltless sheet the original
    # numpy/scipy bake pipeline (fill_gear_gaps -> refit_jog_belt ->
    # strip_belt_shadow) is then run against at 256px.
    strip_only = '--strip-only' in sys.argv

    _JW = jog_waist_table()
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
    # v2.3.1342c (owner: "northeast looks by far the best"): NE's chain is a
    # NARROW strip tucked into the plate<->greaves seam (W=22 at figH~100,
    # ratio ~0.22), not the wide worn band the other dirs got.  Width now
    # follows NE's proportion instead of the direction's legacy band width.
    width_frac = arg('--width-frac', 0.22, float)
    figH_med = med([m[1] for m in ok])
    W = max(10, round(width_frac * figH_med))

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
        if fix_only:
            continue

        # per-column band bottom: greaves top + 2 (bridges the sliver);
        # CLAMPED to the direction median +4 -- the greaves probe follows
        # knee/boot pixels far down on columns beside the legs, which
        # tiled chain "drips" without the clamp.  Columns with no greaves
        # fall back to the direction median.
        # v2.3.1342c: strict seam — band ends AT the greaves top (no +2
        # overlap; the layering pass would erase it anyway) like NE's
        # gap-fill.  Clamp unchanged (knee/boot pixels would drip).
        clamp = y0 + med_gt_rel + 2
        col_bot = {}
        for x in range(max(0, x0), min(H, x1 + 1)):
            lt = [y for y in range(y0 + int(0.42 * figH), H) if lpx[lx0 + x, y][3] > ALPHA]
            col_bot[x] = min(min(lt) if lt else (y0 + med_gt_rel + 1), clamp)

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

        if strip_only:
            # v2.3.1345 cleanup: the erased belt leaves AA residue on the
            # pristine sheets — inside the belt window, drop semi-alpha pixels
            # and anything over the greaves (the runtime belt layer replaces
            # all of it; gauntlets outside the window are untouched).
            lo = max(0, plate_bot - 1)
            hi = min(H, y0 + med_gt_rel + int(0.14 * figH))
            for y in range(lo, hi):
                for x in range(max(0, x0 - 6), min(H, x1 + 7)):
                    p = cpx[cx0 + x, y]
                    if p[3] <= ALPHA:
                        continue
                    if p[3] < 240 or lpx[lx0 + x, y][3] > ALPHA:
                        cpx[cx0 + x, y] = (0, 0, 0, 0)
                        changed += 1
            continue

        # ── Lay the fresh band: dark shadow backing first (NE's recipe —
        # chain links read over shadow, and chain-texture holes can never
        # show background), then the chain at constant phase from the
        # band's left edge ──
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
                else:
                    cpx[cx0 + x, y] = (20, 22, 26, 255)   # shadow backing
                changed += 1

    # ── Correction passes (all modes) — owner rules 2026-07-18: ──
    #  A. the belt renders BEHIND the leg layer: the chest sheet draws ABOVE
    #     gearLegs, so any chain pixel over opaque greaves paints ON TOP of
    #     leg armor -> erase it (the greaves cover the spot; can't open a
    #     gap).  Confined to the chain window below the plate bottom so
    #     gauntlets crossing the thighs are untouched.
    #  B. v2.3.1344 SEAL (owner: "minimal black and ZERO tan showing by the
    #     waist area (player is fully armored)"): the renderer's masked-body
    #     pants band draws BODY rows jogWaistRow+-(26/18) under the gear, so
    #     EVERY armor-transparent pixel there showed bare hip skin — the old
    #     ~W-wide belt only covered the middle.  Now every body-opaque pixel
    #     in the waist window that is vertically ENCLOSED by armor (chest
    #     above and greaves below in the same column, near proximity — the
    #     gate keeps hands/head/loose arms safe) is painted with CHAIN
    #     texture (metal, phase-continuous with the laid band), dark-steel
    #     (32,34,40) in the texture's holes.  Below the greaves-top median
    #     the fill stays flat shadow — chain specks in the inter-thigh gap
    #     read as floating debris (v2.3.1342c lesson).
    fixedA = fixedB = 0
    for i in ([] if strip_only else range(n)):
        if only is not None and i not in only:
            continue
        if not meas[i]:
            continue
        y0, figH, bcx, plate_bot, _, _ = meas[i]
        cx0, lx0, bx0f = i * H, (i % ln) * H, (i % bn) * H
        if plate_bot is None:
            plate_bot = y0 + med_plate_rel
        x0 = bcx - W // 2
        # ── v2.3.1344 pass 0: HARDEN the waist alpha.  The LANCZOS 256->128
        # ship-downscale left the re-laid belts with soft alpha ramps (south
        # 1599 / north 1352 / southwest 979 semi-transparent px in the waist
        # rows; NORTHEAST — the owner's "best looking" — has ZERO).  In-game
        # those blend with the pants-restored body behind the belt
        # (entityRenderer v2.3.650 re-opens pants-coloured pixels), so tan
        # bleeds through every soft edge and the backing reads muddy.  Snap
        # to NE's binary alpha: >=120 -> opaque, else gone (the seal below
        # re-covers anything that opens). ──
        h0, h1 = y0 + int(0.38 * figH), min(H, y0 + int(0.72 * figH))
        for y in range(h0, h1):
            for x in range(H):
                p = cpx[cx0 + x, y]
                if ALPHA < p[3] < 240:
                    cpx[cx0 + x, y] = (p[0], p[1], p[2], 255) if p[3] >= 120 else (0, 0, 0, 0)
        wlo, whi = plate_bot - 1, min(H, y0 + med_gt_rel + int(0.14 * figH))
        for y in range(wlo, whi):
            for x in range(max(0, x0 - 4), min(H, bcx + W // 2 + 5)):
                if cpx[cx0 + x, y][3] > ALPHA and lpx[lx0 + x, y][3] > ALPHA:
                    cpx[cx0 + x, y] = (0, 0, 0, 0)
                    fixedA += 1

        # v2.3.1344b (owner: "chain is in front of the swing arm"): the first
        # seal painted every uncovered body pixel — including forearm/thigh
        # pixels the game never SHOWS (the masked-body bake erases body within
        # 6px-at-256 of any gear; only pants-coloured pixels get re-opened by
        # the v2.3.650 restore, and the confinement pass kills everything
        # outside the gear silhouette except the waist band rows).  Chain over
        # those invisible pixels surfaced as chain ON the crossing arm.  Now
        # the seal mirrors the renderer's visibility rules and covers ONLY
        # pixels that would actually show:
        #   pants  (row >= the jogWaist skin->pants line): visible when within
        #          2px of gear or in the band rows -> chain;
        #   skin   (row < the line): visible only OUTSIDE the 3px dilated
        #          erase AND in the band rows within the gear span -> chain;
        #   erased interior holes: armor on both sides within 12px -> chain
        #          (background would show through the seam otherwise).
        # Rows confined to the seam (down to the greaves-top median +2): the
        # thigh/crotch region below is left alone — pants outlines beside the
        # greaves are the normal look, and the crotch shadow is already baked.
        wr256 = _JW[d][i % len(_JW[d])] if d in _JW else None
        scale = H / 256.0
        wr_s = int(wr256 * scale) if wr256 else y0 + int(0.52 * figH)
        bw0, bw1 = (max(0, int((wr256 - 26) * scale)), min(H, int((wr256 + 18) * scale))) if wr256 else (0, 0)
        # chebyshev distance-to-gear masks, radius 2 and 3 (separable)
        gearop_f = [[(cpx[cx0 + x, y][3] > ALPHA or lpx[lx0 + x, y][3] > ALPHA)
                     for x in range(H)] for y in range(H)]
        def dilate(r):
            hz = [[any(gearop_f[y][max(0, x - r):x + r + 1]) for x in range(H)] for y in range(H)]
            return [[any(hz[yy][x] for yy in range(max(0, y - r), min(H, y + r + 1)))
                     for x in range(H)] for y in range(H)]
        near2, near3 = dilate(2), dilate(3)
        span = {}
        for y in range(H):
            gx = [x for x in range(H) if gearop_f[y][x]]
            if gx:
                span[y] = (min(gx), max(gx))

        # per-frame greaves top: on airborne stride frames the legs ride LOWER
        # than the direction median and the seam stretches — the window must
        # follow, or the stretched gap stays open (north f17, 16px hole).
        lt_f = [y for y in range(y0 + int(0.42 * figH), H)
                if any(lpx[lx0 + x, y][3] > ALPHA for x in range(max(0, bcx - 4), min(H, bcx + 5)))]
        frame_gt_rel = (min(lt_f) - y0) if lt_f else med_gt_rel
        mid0, mid1 = y0 + int(0.32 * figH), min(H, y0 + max(med_gt_rel, frame_gt_rel) + 3)
        for y in range(mid0, mid1):
            sp_row = span.get(y)
            for x in range(H):
                if bpx[bx0f + x, y][3] <= ALPHA:
                    continue
                if cpx[cx0 + x, y][3] > ALPHA or lpx[lx0 + x, y][3] > ALPHA:
                    continue
                in_band = bw0 <= y < bw1 and sp_row is not None and sp_row[0] <= x <= sp_row[1]
                pants = y >= wr_s
                vis_pants = pants and (near2[y][x] or in_band)
                vis_skin = (not pants) and (not near3[y][x]) and in_band
                # below the direction's median seam bottom, ONLY interior
                # holes are covered: visible pants there are the normal
                # thigh-edge pants outline beside the greaves — chaining
                # them drew chain flecks down the thighs on stride frames.
                if y > y0 + med_gt_rel + 2:
                    vis_pants = vis_skin = False
                if not (vis_pants or vis_skin):
                    # erased in-game: cover only a tight interior hole (armor
                    # both sides within 6px), where background would punch
                    # through the seam; arm<->torso gaps stay open.
                    covered = lambda xx: (cpx[cx0 + xx, y][3] > ALPHA or lpx[lx0 + xx, y][3] > ALPHA)
                    left = any(covered(xx) for xx in range(max(0, x - 12), x))
                    right = any(covered(xx) for xx in range(x + 1, min(H, x + 13)))
                    if not (left and right):
                        continue
                sp = chpx[(x - x0) % chain_w, (y - plate_bot) % bandH]
                if sp[3] > 30:
                    cpx[cx0 + x, y] = (sp[0], sp[1], sp[2], 255)
                else:
                    cpx[cx0 + x, y] = (32, 34, 40, 255)  # link shadow, not black
                fixedB += 1

        # solid-black backing bands -> chain: flat near-black chest pixels
        # below the plate (NOT its outline: skip pixels directly under a lit
        # plate pixel) get the chain texture so no black BAND reads at the
        # waist; texture holes stay dark = the "minimal black" that remains.
        for y in range(plate_bot + 2, min(H, y0 + med_gt_rel + 1)):
            for x in range(H):
                p = cpx[cx0 + x, y]
                if p[3] <= ALPHA or max(p[0], p[1], p[2]) > 30:
                    continue
                if lpx[lx0 + x, y][3] > ALPHA or bpx[bx0f + x, y][3] <= ALPHA:
                    continue
                up = cpx[cx0 + x, y - 1]
                if up[3] > ALPHA and max(up[0], up[1], up[2]) > 60:
                    continue                      # plate bottom outline: keep
                sp = chpx[(x - x0) % chain_w, (y - plate_bot) % bandH]
                if sp[3] > 30:
                    cpx[cx0 + x, y] = (sp[0], sp[1], sp[2], 255)
                    fixedB += 1

    print(f'jog-{d}: W={W} bandH={bandH} plateRelMed={med_plate_rel} '
          f'greavesRelMed={med_gt_rel} -> {changed}px re-laid, '
          f'{fixedA}px belt-behind-legs erased, {fixedB}px waist-sealed, {n} frames')

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
