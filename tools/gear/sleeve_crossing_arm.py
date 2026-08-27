#!/usr/bin/env python3
"""v2.3.1986: A SLEEVE ON THE ARM THAT CROSSES THE CHEST.

Owner, twice: "The bare arm showing while jogging east wearing t shirt is
still an issue."  Then, asked which of two fixes to take: "Either hand edit
or have tee drawn over crossing arm idk which would be easier and better."
This is that decision, made by measurement rather than by taste.

── WHAT IS ACTUALLY WRONG (it is not what it looks like) ──
The tee's coverage is PROPORTIONALLY the same across the whole cycle:
tee/(tee+skin) over the torso band measures 0.63-0.67 on frames 0-6 and
0.63-0.71 on frames 7-13.  So the shirt is not shrinking, and the run cycle
putting the near arm across the chest for half the stride is correct
animation, not a bug.  Two earlier readings of this defect -- "the shirt
falls apart" and "the shirt slides off the shoulder" -- were both wrong, and
that measurement is what ruled them out.

What IS missing is the SLEEVE.  On frames 8-11 the near arm tucks in FRONT of
the torso, and the artist cut it out of the tee so it draws in front
(tools/gear/seal-shirt-edges.mjs records that this cut is deliberate).  The
cut takes the sleeve with it, so the arm is bare from the shoulder JOINT down
and the character reads as wearing a tank top for those four frames.

Frames 0-7 and 12-13 are left alone, and that is the geometry rather than a
threshold: an arm whose x-span sits INSIDE the tee's is tucked in front and
has an exposed shoulder; an arm that reaches PAST the tee's silhouette has
swung clear, and its shoulder is still under the shirt.  Measured per frame
before choosing (the big skin blob's x-span against the tee's): frames 8-11
are inside, the rest reach past by 1 to 6 px.  Four consecutive frames also
means the sleeve appears and goes over four frames of a stride rather than
strobing.

── WHY NOT "DRAW THE TEE OVER THE CROSSING ARM", THE OTHER OPTION ──
Measured before choosing: the tee has ZERO fully-enclosed holes on every
frame of this sheet.  The arm always enters from the silhouette edge, so
there is nothing to flood-fill; "cover the arm" would mean picking by hand
how far up the arm to paint, which is the sleeve problem again with a bigger
number -- and it would read as the arm being BEHIND the shirt on a profile
run where it is plainly in front.

── WHY THREE EARLIER ATTEMPTS CAME OUT AS A DARK SMEAR ──
They filled by copying the nearest existing tee pixel, and the nearest tee
pixel to an arm is almost always the tee's own black KEYLINE.  This one never
samples the keyline (KEYLINE_L): it takes the arm's own luminance and re-maps
it into the tee's CLOTH ramp, so the sleeve inherits the arm's shading and
folds instead of being a flat patch -- and it still tints with the player's
chosen shirt colour, like every other pixel of the sheet.  The cuff (the
sleeve's lower edge, where bare arm continues below it) is then set to the
tee's own darkest value, so it reads as cloth ending rather than as a
bleached arm.

── RE-RUNNING IT ──
NOT idempotent: the sleeve it paints becomes tee, so a second pass sees a
shorter arm and adds a little more.  Run it from the ORIGINAL sheet (git
history) rather than compounding -- exactly what seal-shirt-edges.mjs warns
about its own cascade, for the same reason.

PNG ONLY.  There is no jog-east.webp for this sheet today; if one is ever
built, delete it alongside a re-run -- webpImage.js asks for the .webp first
and a stale one would hide the fix.

Run: python3 tools/gear/sleeve_crossing_arm.py [--dry] [--rows=5]
"""
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
SHIRT = REPO / 'public/sprites/gear/shirt/tshirt/jog-east.png'
BODY = REPO / 'public/sprites/player/jog-east.png'

DRY = '--dry' in sys.argv
ROWS = int(next((a.split('=')[1] for a in sys.argv if a.startswith('--rows=')), 5))

KEYLINE_L = 70   # below this luminance a tee pixel is its OUTLINE, not cloth
NECK = 8         # rows below the tee's top before skin counts as arm, not neck
SLACK = 2        # px a blob may reach past the tee and still count as inside
MINPX = 20       # ignore specks


def frames(path):
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    n = w // h
    return [np.array(im.crop((i * h, 0, (i + 1) * h, h))) for i in range(n)], h


def lum(a):
    return (0.299 * a[:, :, 0].astype(float)
            + 0.587 * a[:, :, 1].astype(float)
            + 0.114 * a[:, :, 2].astype(float))


def skin(a):
    """The body sheet's own skin ramp.  Warm, red well ahead of green, green
    ahead of blue -- the same shape the shared classifier uses elsewhere, and
    it deliberately excludes the black keylines and the olive trousers."""
    r, g, b, al = (a[:, :, 0].astype(int), a[:, :, 1].astype(int),
                   a[:, :, 2].astype(int), a[:, :, 3])
    return (al > 128) & (r > 150) & ((r - g) > 45) & ((g - b) > 25)


def tee_palette(shirt):
    """The tee's CLOTH colours (keyline excluded) ordered dark -> light, plus
    the keyline colour.  Sampling the keyline as a fill source is exactly what
    turned three earlier attempts into a dark smear."""
    m = shirt[:, :, 3] > 8
    L = lum(shirt)
    cloth, key = m & (L >= KEYLINE_L), m & (L < KEYLINE_L)
    cols = shirt[cloth][:, :3].astype(int)
    order = np.argsort(L[cloth])
    kc = shirt[key][:, :3].astype(int)
    keycol = kc[np.argsort(L[key])][0] if len(kc) else np.array([20, 20, 20])
    return cols[order], keycol


def components(mask):
    h, w = mask.shape
    lab = np.zeros((h, w), int)
    n = 0
    for y, x in zip(*np.nonzero(mask)):
        if lab[y, x]:
            continue
        n += 1
        lab[y, x] = n
        q = deque([(y, x)])
        while q:
            cy, cx = q.popleft()
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = n
                    q.append((ny, nx))
    return lab, n


def crossing_arm(body, shirt):
    """The arm drawn in FRONT of the torso, if this frame has one: a skin blob
    below the neck line whose x-span sits inside the tee's and which touches
    it.  An arm reaching past the shirt has swung clear -- it is supposed to
    be bare, and its shoulder is already covered."""
    tee = shirt[:, :, 3] > 8
    if not tee.any():
        return None
    ty, tx = np.nonzero(tee.any(axis=1))[0], np.nonzero(tee.any(axis=0))[0]
    t_top, t_x0, t_x1 = int(ty.min()), int(tx.min()), int(tx.max())
    sk = skin(body).copy()
    sk[:t_top + NECK, :] = False
    lab, n = components(sk)
    h, w = sk.shape
    best = None
    for c in range(1, n + 1):
        m = lab == c
        if m.sum() < MINPX:
            continue
        ys, xs = np.nonzero(m)
        if xs.min() < t_x0 - SLACK or xs.max() > t_x1 + SLACK:
            continue
        if not any(0 <= y + dy < h and 0 <= x + dx < w and tee[y + dy, x + dx]
                   for y, x in zip(ys, xs) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            continue
        if best is None or m.sum() > best.sum():
            best = m
    return best


def sleeve(body, shirt, rows):
    arm = crossing_arm(body, shirt)
    if arm is None:
        return shirt, 0
    ys = np.nonzero(arm)[0]
    y0 = int(ys.min())                      # the shoulder end of the arm
    cap = arm & (np.arange(arm.shape[0])[:, None] < y0 + rows)
    if not cap.any():
        return shirt, 0
    cols, keycol = tee_palette(shirt)
    if not len(cols):
        return shirt, 0
    bl = lum(body)
    v = bl[cap]
    lo, hi = float(v.min()), float(v.max())
    out = shirt.copy()
    for y, x in zip(*np.nonzero(cap)):
        t = 0.5 if hi <= lo else (bl[y, x] - lo) / (hi - lo)
        out[y, x, :3] = cols[min(len(cols) - 1, int(round(t * (len(cols) - 1))))]
        out[y, x, 3] = 255
    h = arm.shape[0]
    for y, x in zip(*np.nonzero(cap)):       # the cuff, where bare arm resumes
        if y + 1 < h and arm[y + 1, x] and not cap[y + 1, x]:
            out[y, x, :3] = keycol
    return out, int(cap.sum())


def main():
    body, h = frames(BODY)
    shirt, _ = frames(SHIRT)
    outs, total, touched = [], 0, []
    for i, s in enumerate(shirt):
        o, f = sleeve(body[i % len(body)], s, ROWS)
        outs.append(o)
        total += f
        if f:
            touched.append(i)
            print(f'  frame {i:2d}: sleeve {f:3d}px')
    print(f'{total}px over {len(touched)} frame(s): {touched}')
    if DRY:
        print('--dry: nothing written')
        return
    sheet = Image.new('RGBA', (len(outs) * h, h))
    for i, o in enumerate(outs):
        sheet.paste(Image.fromarray(o.astype('uint8')), (i * h, 0))
    sheet.save(SHIRT)
    print(f'wrote {SHIRT.relative_to(REPO)}')


if __name__ == '__main__':
    main()
