#!/usr/bin/env python3
"""v2.3.1465: drop in the owner's regenerated chop leg armor (drawn via
ChatGPT from a reference sheet — proper chain waist band, plated legs,
steel sabatons) in place of the v2.3.1458/1463 programmatic extension.

Input: the uploaded 4x3 magenta-keyed grid (12 armor-only frames in
play order).  Per frame:
  - key #FF00FF, defringe magenta-tinted edge pixels (nearest interior
    color), soft alpha from the key boundary;
  - uniform-scale the blob so its height spans the OLD armor frame's
    coverage envelope (components >=100px — includes the chain waist
    band), bottom pinned to the old bottom (the feet line), centered on
    the old envelope's x center; width capped at 1.12x the old envelope
    (mild x-squish beyond that) so plates read chunky but never balloon
    past the figure;
  - composited into a fresh 480x440 gear frame.

The old sheet is read only for the target envelopes — output replaces
public/sprites/gear/legs/steelgreaves/chop-west.png entirely.
"""
import numpy as np
from PIL import Image
from scipy import ndimage

import sys
UPLOAD = sys.argv[1] if len(sys.argv) > 1 else (
    '/root/.claude/uploads/85dab866-0f38-5e59-9ced-da9eaeb2cf4b/'
    '3a21fbd0-F50A106BBF85434D96A2E32DFD10FC62.png')
GEAR = 'public/sprites/gear/legs/steelgreaves/chop-west.png'
BODY = 'public/sprites/skills/chop-strip.webp'
GW, GH = 480, 440
FW, FH = 240, 220
CHEST = 'public/sprites/gear/chest/steelplate/chop-west.png'
W_CAP = 1.12


def main():
    up = np.array(Image.open(UPLOAD).convert('RGBA'))
    r = up[:, :, 0].astype(int); g = up[:, :, 1].astype(int)
    b = up[:, :, 2].astype(int)
    mag = (r > 180) & (g < 110) & (b > 180)
    fg = ~mag
    lbl, n = ndimage.label(fg)
    sizes = ndimage.sum(fg, lbl, range(1, n + 1))
    blobs = [i + 1 for i in range(n) if sizes[i] > 2000]
    assert len(blobs) == 12, f'expected 12 blobs, got {len(blobs)}'
    boxes = []
    for l in blobs:
        ys, xs = np.where(lbl == l)
        boxes.append((l, xs.min(), ys.min(), xs.max(), ys.max()))
    boxes.sort(key=lambda t: (t[2] // 300, t[1]))

    old = np.array(Image.open(GEAR).convert('RGBA'))
    body = np.array(Image.open(BODY).convert('RGBA'))
    chest = np.array(Image.open(CHEST).convert('RGBA'))

    # ---- ONE scale for all frames (a first cut fit each frame to its
    # old envelope; sash fragments inflate some envelopes, so adjacent
    # frames scaled up to 30% apart — armor would pulse).  Target: the
    # body's waist-to-feet band, per frame, then take the median ratio.
    def body_band(k):
        f = body[:, (12 + k) * 240:(13 + k) * 240]
        br = f[:, :, 0].astype(int); bg = f[:, :, 1].astype(int)
        bb = f[:, :, 2].astype(int); ba = f[:, :, 3]
        olive = (ba > 40) & (abs(br - bg) < 25) & (bg - bb > 25) & \
                (bg > 70) & (bg < 150)
        sash = (ba > 40) & (br > 180) & (br - bg > 90) & (bb < 70)
        band = (olive | sash).sum(axis=1) >= 6
        band[:100] = False                 # the shirt is olive too — the
        band[161:] = False                 # waist/sash lives in 100..160
        rows = np.where(band)[0]
        feet = int(np.where((ba).any(axis=1))[0][-1])
        waist = int(rows[0]) if len(rows) else 115
        return waist, feet                 # waist row, feet row (body px)

    # scale by WIDTH match to the old greaves footprint — height-fitting
    # to the waist band ballooned the chunkier new art 40% past the
    # figure ("legs dwarf the torso").  The old footprint's coverage is
    # owner-verified; matching its width keeps the proportions.
    ratios = []
    blobs_data = []
    for k, (l, x0, y0, x1, y1) in enumerate(boxes):
        of = old[:, k * GW:(k + 1) * GW]
        oa = of[:, :, 3] > 40
        ol, on = ndimage.label(oa)
        osz = ndimage.sum(oa, ol, range(1, on + 1))
        oys, oxs = np.where(ol == (np.argmax(osz) + 1))
        ratios.append((oxs.max() - oxs.min() + 1) / (x1 - x0 + 1))
        blobs_data.append((l, x0, y0, x1, y1, 0))
    s = float(np.median(ratios))
    print(f'constant scale s = {s:.3f} (per-frame ratios '
          f'{[round(r, 2) for r in ratios]})')

    out = []
    for k, (l, x0, y0, x1, y1, feet) in enumerate(blobs_data):
        # --- extract + defringe the new blob ---
        crop = up[y0:y1 + 1, x0:x1 + 1].copy()
        m = (lbl[y0:y1 + 1, x0:x1 + 1] == l)
        crop[:, :, 3] = np.where(m, 255, 0)
        cr = crop[:, :, 0].astype(int); cg = crop[:, :, 1].astype(int)
        cb = crop[:, :, 2].astype(int)
        fringe = m & (cr - cg > 40) & (cb - cg > 40)
        if fringe.any():
            good = m & ~fringe
            _, (iy, ix) = ndimage.distance_transform_edt(
                ~good, return_indices=True)
            fy, fx = np.where(fringe)
            crop[fy, fx, :3] = crop[iy[fy, fx], ix[fy, fx], :3]

        # --- per-frame anchor: old main component (mid-thigh down) is
        # stable — use its x center + bottom (the feet line) ---
        of = old[:, k * GW:(k + 1) * GW]
        oa = of[:, :, 3] > 40
        ol, on = ndimage.label(oa)
        osz = ndimage.sum(oa, ol, range(1, on + 1))
        main = ol == (np.argmax(osz) + 1)
        oys, oxs = np.where(main)
        cx = (oxs.min() + oxs.max()) / 2
        bot = oys.max()

        nh, nw = crop.shape[:2]
        pre = crop.astype(float)
        pre[:, :, :3] *= pre[:, :, 3:4] / 255.0
        newW, newH = max(1, int(round(nw * s))), max(1, int(round(nh * s)))
        rs = np.array(Image.fromarray(np.clip(pre, 0, 255).astype(np.uint8))
                      .resize((newW, newH), Image.LANCZOS)).astype(float)
        aa = rs[:, :, 3:4]
        with np.errstate(invalid='ignore', divide='ignore'):
            rs[:, :, :3] = np.where(aa > 1, rs[:, :, :3] / (aa / 255.0), 0)
        rs = np.clip(rs, 0, 255).astype(np.uint8)

        frame = np.zeros((GH, GW, 4), np.uint8)
        px = int(round(cx - newW / 2))
        py = bot + 1 - newH
        sx0, sy0 = max(0, -px), max(0, -py)
        dx0, dy0 = max(0, px), max(0, py)
        w = min(newW - sx0, GW - dx0); h = min(newH - sy0, GH - dy0)
        dst = Image.fromarray(frame)
        dst.paste(Image.fromarray(rs[sy0:sy0 + h, sx0:sx0 + w]),
                  (dx0, dy0),
                  Image.fromarray(rs[sy0:sy0 + h, sx0:sx0 + w]))
        res = np.array(dst)
        # carry over the old sheet's coverage ABOVE the new art's top —
        # the v2.3.1463 chain fill over the waist sash; without it the
        # orange sash peeks between chest hem and the new chain band
        keep = of[:dy0].copy()
        km = keep[:, :, 3] > 40
        res[:dy0][km] = keep[km]
        # final seal: any waist-band sash/pants pixel the new silhouette
        # leaves bare (the new plates are cut differently from the old)
        # gets the old frame's covering pixel (chain or plate)
        bfr = body[:, (12 + k) * 240:(13 + k) * 240]
        br = bfr[:, :, 0].astype(int); bg = bfr[:, :, 1].astype(int)
        bb = bfr[:, :, 2].astype(int); ba = bfr[:, :, 3]
        # any leg pixel: olive pants, gray shin, near-black boot, orange
        # sash — the new art's stances don't exactly match the body's
        # (worst on the wide backswing frames), so uncovered body legs
        # must render as the old covering steel, not as bare cloth/skin.
        # Browns (axe handle) and skin stay excluded.
        gray = (abs(br - bg) < 18) & (abs(bg - bb) < 18) & (br < 170)
        bare = (ba > 40) & (
            ((abs(br - bg) < 40) & (bg - bb > 15) & (bg > 55) & (bg < 165)) |
            ((br > 150) & (br - bg > 70) & (bb < 75)) | gray)
        bare[:110] = False
        bare[220:] = False
        chf = chest[:, k * GW:(k + 1) * GW]
        cov = (np.array(Image.fromarray(res).resize((FW, FH), Image.NEAREST))[:, :, 3] > 40) | \
              (np.array(Image.fromarray(np.ascontiguousarray(chf)).resize((FW, FH), Image.NEAREST))[:, :, 3] > 40)
        hys, hxs = np.where(bare & ~cov)
        filled = 0
        for (y, x) in zip(hys, hxs):
            blk = of[y * 2:y * 2 + 2, x * 2:x * 2 + 2]
            bm = blk[:, :, 3] > 40
            if bm.any():
                tgt = res[y * 2:y * 2 + 2, x * 2:x * 2 + 2]
                tgt[bm] = blk[bm]
                filled += int(bm.sum())
        out.append(res)
        print(f'k{k:2d}: blob {nw}x{nh} -> {newW}x{newH} at ({dx0},{dy0})')

    Image.fromarray(np.concatenate(out, axis=1)).save(GEAR)
    print('wrote', GEAR)


if __name__ == '__main__':
    main()
