#!/usr/bin/env python3
"""v2.3.1469: replace the mining impact burst with the owner's new art
(owner: "swap out the mining effect with this (it'll look better)").

Input: a chroma-green 4x2 grid, 8 frames in reading order — impact
spark, growing rock-and-dust plume, then the dust rising and thinning.
Output: public/sprites/effects/rocks-burst-v1.webp in the shipped burst
format (8 frames of 256x256 in one horizontal strip), so nothing in
effectsRenderer changes but the URL's cache-bust version.

Chroma key: alpha falls off with green dominance (g - max(r,b)), and
every kept pixel is despilled by clamping green to that max — the dust
edges are soft, so a hard binary key would leave a green rim.

Placement: ONE transform for all 8 frames (uniform scale + offset from
the union bounding box), so the plume doesn't jitter between frames.
The union is mapped to match the sheet it replaces — horizontal centre
~124 and base ~218 in the 256px frame — so the existing ay:0.80 anchor
still drops the burst on the pickaxe strike point.
"""
import numpy as np
from PIL import Image

DST = 'public/sprites/effects/rocks-burst-v1.webp'
COLS, ROWS = 4, 2
OUT = 256
TARGET_W = 197      # union width of the sheet being replaced
TARGET_CX = 124     # its horizontal centre
TARGET_BOT = 218    # its plume base
KEY_T = 60.0        # green-dominance span mapped to alpha 1..0
A_MIN = 16          # drop near-transparent key residue


def key_green(cell):
    r = cell[:, :, 0].astype(float); g = cell[:, :, 1].astype(float)
    b = cell[:, :, 2].astype(float)
    mx = np.maximum(r, b)
    spill = g - mx
    alpha = np.clip(1.0 - np.clip(spill / KEY_T, 0, 1), 0, 1) * 255.0
    out = cell.astype(float).copy()
    out[:, :, 1] = np.where(spill > 0, mx, g)      # despill
    out[:, :, 3] = np.where(alpha < A_MIN, 0, alpha)
    return np.clip(out, 0, 255).astype(np.uint8)


def main():
    import sys
    src = sys.argv[1]
    up = np.array(Image.open(src).convert('RGBA'))
    H, W = up.shape[:2]
    cw, chh = W // COLS, H // ROWS

    cells = []
    for row in range(ROWS):
        for col in range(COLS):
            cells.append(key_green(up[row * chh:(row + 1) * chh,
                                      col * cw:(col + 1) * cw]))

    # union bbox over all cells (cell-local coords, shared by construction)
    ux0, uy0, ux1, uy1 = 10**9, 10**9, -1, -1
    for c in cells:
        a = c[:, :, 3] > 20
        if not a.any():
            continue
        ys, xs = np.where(a)
        ux0 = min(ux0, xs.min()); ux1 = max(ux1, xs.max())
        uy0 = min(uy0, ys.min()); uy1 = max(uy1, ys.max())
    s = TARGET_W / (ux1 - ux0 + 1)
    ucx = (ux0 + ux1) / 2
    print(f'union x {ux0}..{ux1} y {uy0}..{uy1}  scale {s:.3f}')

    frames = []
    for i, c in enumerate(cells):
        newW, newH = max(1, int(round(cw * s))), max(1, int(round(chh * s)))
        pre = c.astype(float)
        pre[:, :, :3] *= pre[:, :, 3:4] / 255.0
        rs = np.array(Image.fromarray(np.clip(pre, 0, 255).astype(np.uint8))
                      .resize((newW, newH), Image.LANCZOS)).astype(float)
        aa = rs[:, :, 3:4]
        with np.errstate(invalid='ignore', divide='ignore'):
            rs[:, :, :3] = np.where(aa > 1, rs[:, :, :3] / (aa / 255.0), 0)
        rs = np.clip(rs, 0, 255).astype(np.uint8)

        # cell-local (ucx, uy1) must land on (TARGET_CX, TARGET_BOT)
        px = int(round(TARGET_CX - ucx * s))
        py = int(round(TARGET_BOT - uy1 * s))
        frame = np.zeros((OUT, OUT, 4), np.uint8)
        sx0, sy0 = max(0, -px), max(0, -py)
        dx0, dy0 = max(0, px), max(0, py)
        w = min(newW - sx0, OUT - dx0); h = min(newH - sy0, OUT - dy0)
        if w > 0 and h > 0:
            chunk = rs[sy0:sy0 + h, sx0:sx0 + w]
            dst = Image.fromarray(frame)
            dst.paste(Image.fromarray(chunk), (dx0, dy0),
                      Image.fromarray(chunk))
            frame = np.array(dst)
        frames.append(frame)
        a = frame[:, :, 3] > 20
        if a.any():
            ys, xs = np.where(a)
            print(f'f{i}: x {xs.min():3d}..{xs.max():3d} '
                  f'y {ys.min():3d}..{ys.max():3d} px {int(a.sum())}')
        else:
            print(f'f{i}: empty')

    Image.fromarray(np.concatenate(frames, axis=1)).save(DST, lossless=True)
    print('wrote', DST)


if __name__ == '__main__':
    main()
