"""Lay the steel chain belt over the IDLE (stand) waist -- the same chain the jog
frames use (tools/posesheets/chainbelt.png), so standing matches running.

The idle chest sheet already carries a clean BLACK waist (rebake_idle_black_waist.py,
v2.3.573): the chest->legs gap is a solid-black blob, the arms/hands are opaque
steel.  We find that black blob (restricted to a waist y-band so armor outlines
elsewhere are ignored) and lay the chain across the TOP of it -- tucked just under
the breastplate, exactly like the jog belt (fill_gear_gaps' chest-bottom anchor).
The chain is painted ONLY over black pixels, so it can never touch the steel arms,
and the black below it stays as the belt's shadow backing.

Usage: python tools/bake_idle_belt.py <dir>   (east/north/northeast/south/southwest)
"""
import sys
import numpy as np
from PIL import Image

FRAME = 256
BAND_FRAC = 0.13          # belt height as fraction of figure height (matches jog)
TUCK = 4                  # px the band starts above the gap top (under the chest)
CHAIN = Image.open('tools/posesheets/chainbelt.png').convert('RGBA')   # 706x96 strip

d = sys.argv[1]
chest_p = f'public/sprites/gear/chest/steelplate/stand-{d}.png'
chest = Image.open(chest_p).convert('RGBA')
base = Image.open(f'public/sprites/player/stand-{d}.png').convert('RGBA')
ca = np.array(chest)
n = chest.width // FRAME
bn = base.width // FRAME

for i in range(n):
    cs = ca[:, i * FRAME:(i + 1) * FRAME]
    op = cs[:, :, 3] > 20
    black = op & (cs[:, :, 0] < 18) & (cs[:, :, 1] < 18) & (cs[:, :, 2] < 18)
    bop = np.array(base.crop(((i % bn) * FRAME, 0, (i % bn + 1) * FRAME, FRAME)))[:, :, 3] > 20
    yy = np.where(bop.any(1))[0]
    if not len(yy):
        continue
    y0, H = int(yy.min()), int(yy.max()) - int(yy.min())

    # the black waist blob, isolated to a plausible waist y-band.
    waist = black.copy()
    waist[:y0 + int(0.38 * H)] = False
    waist[y0 + int(0.80 * H):] = False
    if not waist.any():
        print(f'stand-{d}: no black waist blob found -- skipped')
        continue
    band_h = max(6, int(BAND_FRAC * H))
    # the WAISTLINE is the widest black row (hip to hip); the narrow sliver above
    # it is just the gap under the breastplate centre -- placing the band there
    # left only a thread of chain.  Centre the band on the widest row instead.
    # Restrict the search to the belt zone (0.42-0.66 of figure height) so a stray
    # low black blob (e.g. between the feet on side views) can't grab the band.
    widths = waist.sum(1).astype(int)
    zmask = np.zeros_like(widths, bool)
    zmask[y0 + int(0.42 * H):y0 + int(0.66 * H)] = True
    widths[~zmask] = 0
    if not widths.any():
        print(f'stand-{d}: no black in belt zone -- skipped')
        continue
    waist_y = int(np.argmax(widths))
    top = max(0, waist_y - band_h // 2 - TUCK)
    # despill: kill any leftover GREEN mannequin AA fringe at the waist edges
    # (the black-waist rebake misses a few px on the sides) so it isn't left
    # peeking next to the chain.  Restricted to the belt band; recolor to black.
    bb0, bb1 = max(0, top - 3), min(FRAME, top + band_h + 3)
    R, Gc, B = cs[:, :, 0].astype(int), cs[:, :, 1].astype(int), cs[:, :, 2].astype(int)
    greenfr = op & (Gc > R + 12) & (Gc > B + 12) & (Gc > 50)
    greenfr[:bb0] = False
    greenfr[bb1:] = False
    cs[greenfr] = [0, 0, 0, 255]
    black = black | greenfr   # newly-blacked fringe is valid belt backing
    # x-extent + black mask come from the band rows, where the belt actually sits.
    bandmask = np.zeros_like(black)
    bandmask[top:min(FRAME, top + band_h)] = True
    inband = waist & bandmask
    wx = np.where(inband.any(0))[0]
    if not len(wx):
        print(f'stand-{d}: empty belt band -- skipped')
        continue
    bx0, bx1 = int(wx.min()), int(wx.max())
    rw = bx1 - bx0 + 1

    # chain strip sized to the band height, centered/tiled across the blob width.
    chain_s = np.array(CHAIN.resize((int(706 * band_h / 96), band_h), Image.LANCZOS))
    cw = chain_s.shape[1]
    if rw <= cw:
        sx = max(0, (cw - rw) // 2)
        crop = chain_s[:, sx:sx + rw]
    else:
        crop = np.tile(chain_s, (1, int(np.ceil(rw / cw)), 1))[:, :rw]
    laid = 0
    for dy in range(crop.shape[0]):
        ry = top + dy
        if ry < 0 or ry >= FRAME:
            continue
        # paint only where the waist is black -> chain stays inside the gap,
        # never overwrites the steel arms; chain's own holes keep black showing.
        rowmask = (crop[dy, :, 3] > 30) & black[ry, bx0:bx0 + crop.shape[1]]
        cols = np.where(rowmask)[0]
        cs[ry, bx0 + cols, :3] = crop[dy, cols, :3]
        cs[ry, bx0 + cols, 3] = 255
        laid += len(cols)
    ca[:, i * FRAME:(i + 1) * FRAME] = cs
    print(f'stand-{d}: chain laid (waistline y{waist_y}, band {band_h}, x {bx0}-{bx1}, {laid}px)')

Image.fromarray(ca, 'RGBA').save(chest_p)
