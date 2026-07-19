#!/usr/bin/env python3
"""v2.3.1348: regenerate the jog belt sheets from the ORIGINAL fully-armored
mannequin boards (owner: "The original sprite sheet per direction fully armored
had a green midsection. Go retrieve all of those per direction").

tools/posesheets/jog-<dir>-mannequin-armored.png is the fully-armored figure
with the flat-green mannequin (#00AA46) showing through EXACTLY where the
waist is exposed — and the artist drew the arm OVER the green wherever it
crosses, so the green mask carries the hand-drawn depth the last three
approaches tried to reconstruct.  This tool maps each board cell back onto the
256 body frame with import_gear_from_sheet's ALIGNED transform (detect the
magenta-keyed figure, scale to the body bbox height, register by silhouette
overlap), takes the green pixels in the waist window, fills them with the
chain texture, and writes the belt sheet the masked-body bake paints from
(public/sprites/gear/belt/chainbelt/jog-<dir>.png).

v2.3.1350 (owner: "fix the shimmer and make sure it's the same color per
every jog direction"): ALL FIVE base dirs are generated with ONE chain
material.  East/northeast have no matching board (older cycles) but need
none — the game-geometry fill below covers their exposed waist, so their
old measurement-based sheets (darker chain, green residue) are replaced
and every direction gets identical link scale, brightness and backing.
Shimmer fix: the tile phase used to be anchored to each frame's trunk
bbox (g0/gx0), which jumps frame to frame — the links re-hashed every
frame while running.  The phase is now anchored to the frame's WAIST ROW
(jogWaist table — the run-cycle bob) and the body's horizontal center, so
the pattern rides the body instead of re-rolling.

Run AFTER patch_chest_from_mannequin — the game-geometry fill reads the
final chest sheet to chain-fill exactly what stays exposed.

Usage: python3 tools/gen_belt_from_mannequin.py [dir ...]
Do NOT pipe through `head` — SIGPIPE can kill the run before the save.
"""
import json
import re
import sys
import numpy as np
from scipy import ndimage
from PIL import Image

FRAME = 256
MAGENTA = np.array([255, 0, 255])
MAG_TOL = 60
ALPHA = 20
DIRS = ['south', 'north', 'southwest', 'east', 'northeast']
BOARD_DIRS = {'south', 'north', 'southwest'}   # boards that match today's cycles
TILE_H = 40   # ONE link scale for every dir/frame (v2.3.1350 same-color rule)

# v2.3.1349b: per-frame waist rows from the game's own table, for the
# game-geometry exposure fill below.
_JW_SRC = open('src/rendering/jogWaist.js').read()


def waist_rows(d):
    m = re.search(r'"%s"\s*:\s*\[([^\]]+)\]' % d, _JW_SRC, re.S)
    return [int(x) for x in re.findall(r'-?\d+', m.group(1))]


def key_region(reg):
    rgb = reg.astype(int)
    dist = np.sqrt(((rgb - MAGENTA) ** 2).sum(2))
    nonmag = dist > MAG_TOL
    R, G, B = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    purple = (R - G > 32) & (B - G > 32) & (R > 105) & (B > 105)
    return nonmag & ~purple


def overlap(sm, bop, px, py):
    H, W = bop.shape
    sh, sw = sm.shape
    x0, y0 = max(0, px), max(0, py)
    x1, y1 = min(W, px + sw), min(H, py + sh)
    if x1 <= x0 or y1 <= y0:
        return 0
    return int((bop[y0:y1, x0:x1] & sm[y0 - py:y1 - py, x0 - px:x1 - px]).sum())


def board_mask(arm, meta, i, base, bop):
    """Board green trunks + under-skirt shadow mapped onto frame i (256-space).
    Returns a bool mask (all-False when the cell has no usable figure)."""
    cols, ch_, cw = meta['cols'], meta['cell_h'], meta['cell_w']
    r, c = divmod(i, cols)
    ry0 = max(0, r * ch_ - ch_ // 3); ry1 = min(arm.shape[0], (r + 1) * ch_ + ch_ // 3)
    rx0 = max(0, c * cw - cw // 3); rx1 = min(arm.shape[1], (c + 1) * cw + cw // 3)
    sub = arm[ry0:ry1, rx0:rx1]
    mask = ndimage.binary_opening(key_region(sub), iterations=1)
    lbl, num = ndimage.label(mask)
    if num == 0:
        return np.zeros((FRAME, FRAME), bool)
    ccx = (c + 0.5) * cw - rx0; ccy = (r + 0.5) * ch_ - ry0
    best, bd = None, 1e18
    for k in range(1, num + 1):
        ys, xs = np.where(lbl == k)
        if len(ys) < 300:
            continue
        dd = (xs.mean() - ccx) ** 2 + (ys.mean() - ccy) ** 2
        if dd < bd:
            bd, best = dd, k
    if best is None:
        return np.zeros((FRAME, FRAME), bool)
    ys, xs = np.where(lbl == best)
    t, l = int(ys.min()), int(xs.min())
    h, w = int(ys.max()) - t + 1, int(xs.max()) - l + 1
    content = np.zeros((h, w, 4), np.uint8)
    content[:, :, :3] = sub[t:t + h, l:l + w]
    content[:, :, 3] = (lbl[t:t + h, l:l + w] == best).astype(np.uint8) * 255

    # aligned placement: scale to the body bbox height, register by overlap
    byy, bxx = np.where(bop)
    by0, by1 = int(byy.min()), int(byy.max())
    s = (by1 - by0) / h if h else 1.0
    nw, nh = max(1, round(w * s)), max(1, round(h * s))
    sm = np.array(Image.fromarray(((content[:, :, 3] > 40) * 255).astype(np.uint8), 'L')
                  .resize((nw, nh), Image.NEAREST)) > 40
    sy, sx = np.where(sm)
    px0 = bxx.mean() - sx.mean(); py0 = byy.mean() - sy.mean()
    bestp, bestov = (px0, py0), -1
    for dy in range(-8, 9):
        for dx in range(-8, 9):
            ov = overlap(sm, bop, int(round(px0 + dx)), int(round(py0 + dy)))
            if ov > bestov:
                bestov, bestp = ov, (px0 + dx, py0 + dy)
    px_, py_ = int(round(bestp[0])), int(round(bestp[1]))
    placed = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
    placed.alpha_composite(
        Image.fromarray(content, 'RGBA').resize((nw, nh), Image.LANCZOS), (px_, py_))
    parr = np.array(placed)

    # v2.3.1348b (owner): the source art's waist connective is a GREEN
    # UPSIDE-DOWN TRIANGLE (trunks) — the only green visible on the armored
    # figure.  Loose test + close + dilate to swallow the AA fringe.
    R = parr[:, :, 0].astype(int); G = parr[:, :, 1].astype(int); B = parr[:, :, 2].astype(int)
    green = (parr[:, :, 3] > 40) & (G > 80) & (G > R + 25) & (G > B + 20)
    green = ndimage.binary_closing(green, iterations=2)
    green = ndimage.binary_dilation(green, iterations=1)
    # v2.3.1349b (owner: "black superhero underwear"): the boards also paint a
    # DARK shadow region under the plate skirt / around the trunks (50-65 warm
    # gray).  patch_chest_from_mannequin EXCLUDES that shadow from the chest
    # merge, so chain-fill it here.
    figop = parr[:, :, 3] > 40
    dark = figop & ~green & (np.maximum(np.maximum(R, G), B) < 70)
    shadow = ndimage.binary_dilation(ndimage.binary_erosion(dark, iterations=1), iterations=1)
    if green.any():
        gr = np.where(green.any(axis=1))[0]
        win = np.zeros_like(green)
        # tight window: the under-skirt shadow hugs the trunks; reaching 40
        # rows up pulled the board's mid-torso armor shading into the belt
        win[max(0, gr[0] - 14):min(FRAME, gr[-1] + 9)] = True
        green = green | (shadow & win)
    return green


def gen(d):
    base128 = Image.open(f'public/sprites/player/jog-{d}.png').convert('RGBA')
    n = base128.width // base128.height
    base = base128.resize((base128.width * 2, base128.height * 2), Image.NEAREST)

    meta = arm = None
    if d in BOARD_DIRS:
        meta = json.load(open(f'tools/posesheets/jog-{d}.json'))
        if meta['n'] != n:
            raise SystemExit(f'{d}: board has {meta["n"]} frames but body sheet has {n}')
        arm = Image.open(f'tools/posesheets/jog-{d}-mannequin-armored.png').convert('RGB')
        arm = np.array(arm.resize((meta['cols'] * meta['cell_w'],
                                   meta['rows'] * meta['cell_h']), Image.LANCZOS))

    # ONE chain material for every dir and frame (v2.3.1350): fixed link
    # scale, fixed brightness, fixed backing — the belt can no longer read
    # lighter or darker depending on which way the player runs.
    chain = Image.open('tools/posesheets/chainbelt.png').convert('RGBA')
    tw = max(1, round(chain.width * TILE_H / chain.height))
    tile = np.array(chain.resize((tw, TILE_H), Image.LANCZOS)).astype(int)
    # brighten the links toward steel (x1.9 read as WHITE briefs — mid-steel)
    tile[:, :, :3] = np.clip(tile[:, :, :3] * 1.55 + 18, 0, 225)
    tile = tile.astype(np.uint8)

    # v2.3.1349b: the GAME's chest/greaves sheets (the chest already carries
    # the restored skirt — run patch_chest_from_mannequin FIRST).  The board's
    # green+shadow mask only approximates the game's exposed waist, so the
    # chain must cover body ∧ ¬chest ∧ ¬greaves in the waist band — measured
    # from the sheets that actually render.  For east/northeast (no matching
    # board) this is the ONLY mask, which is exactly why no board is needed.
    def load_gear(p):
        im = Image.open(p).convert('RGBA')
        if im.height == 128:
            im = im.resize((im.width * 2, 256), Image.NEAREST)
        return np.array(im)[:, :, 3] > 40
    chestop = load_gear(f'public/sprites/gear/chest/steelplate/jog-{d}.png')
    legsop = load_gear(f'public/sprites/gear/legs/steelgreaves/jog-{d}.png')
    wrs = waist_rows(d)

    out = Image.new('RGBA', (n * 128, 128), (0, 0, 0, 0))
    stats = []
    for i in range(n):
        bfr = np.array(base.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME)))
        bop = bfr[:, :, 3] > 40
        if not bop.any():
            stats.append(0); continue
        green = (board_mask(arm, meta, i, base, bop) if arm is not None
                 else np.zeros((FRAME, FRAME), bool))
        # game-geometry fill — every body pixel in the waist band not covered
        # by the game's chest or greaves gets chain, no matter what the board
        # shows there.  The bake paint replaces only pants/dark/erased pixels,
        # so the arm crossing the band keeps its skin and depth.
        exposed = (bop & ~chestop[:, i * FRAME:(i + 1) * FRAME]
                   & ~legsop[:, i * FRAME:(i + 1) * FRAME])
        band = np.zeros_like(exposed)
        wrow = wrs[i] if i < len(wrs) else wrs[-1]
        band[max(0, wrow - 30):min(FRAME, wrow + 26)] = True
        green = green | (exposed & band)
        # v2.3.1349: clip against the body dilated by 2, not the exact
        # silhouette — the ±8px alignment wobble clipped the trunks' hip
        # edges, which the game's erase turned into hip-side holes (SW).
        green &= ndimage.binary_dilation(bop, iterations=2)
        stats.append(int(green.sum()))
        if not green.any():
            continue

        # chain fill.  v2.3.1350 shimmer fix: phase anchored to the waist row
        # (the run-cycle bob) + the body's horizontal center — NOT the trunk
        # bbox, whose per-frame jumps re-rolled the link pattern every frame.
        byy, bxx = np.where(bop)
        cx = int(round(bxx.mean()))
        gys, gxs = np.where(green)
        frame_out = np.zeros((FRAME, FRAME, 4), np.uint8)
        for y, x in zip(gys, gxs):
            sp = tile[(y - wrow) % TILE_H, (x - cx) % tw]
            if sp[3] > 30:
                frame_out[y, x] = (sp[0], sp[1], sp[2], 255)
            else:
                frame_out[y, x] = (44, 47, 54, 255)   # recessed mail, not void
        # 1px darkened rim so the band has the game's outline style
        op_ = frame_out[:, :, 3] > 0
        rim = op_ & ~ndimage.binary_erosion(op_, iterations=1)
        for ch2 in range(3):
            frame_out[:, :, ch2][rim] = (frame_out[:, :, ch2][rim] * 0.45).astype(np.uint8)

        cell_rgb = Image.fromarray(frame_out).resize((128, 128), Image.LANCZOS)
        cell_a = Image.fromarray(frame_out[:, :, 3], 'L').resize((128, 128), Image.NEAREST)
        cell = np.array(cell_rgb)
        cell[:, :, 3] = np.array(cell_a)              # binary alpha, smooth RGB
        out.paste(Image.fromarray(cell), (i * 128, 0))

    path = f'public/sprites/gear/belt/chainbelt/jog-{d}.png'
    out.save(path)
    print(f'{d}: chain px per frame (256-space) {stats[:8]}... -> {path}')


def main():
    for d in (sys.argv[1:] or DIRS):
        gen(d)


if __name__ == '__main__':
    main()
