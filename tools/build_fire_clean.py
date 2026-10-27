#!/usr/bin/env python3
"""v2.3.3655: the fire-lighter's strip with its painted fire taken out.

The owner, 2026-10-27: "work on the fire starting animation to replace the log
and flame in the animation with actual log art and code drawn smoke and flames
(actual lit fire is code drawn)", then "It might be better to just remove the
log and flame all together.  The flame looks much less realistic to what you
can do with code.  Keeping the log is optional, I don't know which is better".

The owner's eight frames (v2.3.1715, 384 x 512 each) paint a log, and from the
strike on (frame 3) a cartoon flame on it, sparks, a column of smoke and a
cream glow behind it all.  The game's own campfire (campfireFx.js) is drawn in
code and takes over when the light ends, so every light ended with one fire
swapped for another.  This tool takes the painted fire out; the game draws the
campfire's own flame, sparks and smoke catching on the log instead.

THE LOG STAYS.  The figure kneels at it with his hands on it and his knees
behind it: the art has no legs drawn behind the log, so taking the log away
leaves him cut off at the knee.  It is wood since v2.3.3649 (the bake gives its
magenta key the bark's colours).

HOW THE FIRE IS FOUND.  Not by colour alone: the figure's skin is the flame's
orange, and the frames are lit by the fire (the skin goes yellow, the outline
on the lit side dark red).  So:

  1. what is surely fire -- the flame's own yellows, oranges and reds (blue
     under 12), the glow's creams, the smoke's greys -- seeds a region that
     grows through anything fire-like that touches it (the flame's gradients,
     its pink tint over the log, its soft edges) and stops at the figure's
     near-black outline;
  2. inside the log's box only the fire's colours go: the log is magenta,
     pink and outline (blue at least green), the fire is not;
  3. in three boxes where the flame was the figure's own outline -- the fists
     on frames 4 and 5 (the bake's FIRE_KEEP_BOXES) and the arm on frame 6 --
     only what is surely fire goes, and where that leaves the hand's or the
     arm's lit side without an edge, it is outlined in the dark red-brown the
     artist used there;
  4. a small spot wholly inside the figure stays (the eyes' whites read as
     smoke-grey) unless it is the glow seen through a gap;
  5. the glow's soft rim along the figure's outline is peeled (two pixels);
  6. the log's top, under the flame, is mended by cloning each row from the
     same row further along: the log is drawn along its grain;
  7. a see-through pixel stays only beside what stays, and of what is left
     only the figure's pieces and the log's (300 px or more) are kept: sparks
     and the smoke's outline go.

Frames 0-2 have no fire and are copied unchanged.

THE FRAMES' PLACES.  The two rows of the owner's sheet were drawn apart: the
second row's log (frames 4-7) sits 26-27 px higher and a few px to one side,
and the figure with it, so in the game the bro hopped about 7 world px up at
frame 4 and dropped back when the light ended.  And the figure is not in the
middle of his frame: he stands at x 243 of 384, so he was drawn 14 world px to
the side of where you stand, at both ends of every light.  The tool measures
both and writes them to src/data/fireStrip.js: per frame the shift that lays its
log on frame 0's (dy from the log's bottom edge, which is the ground; dx by
the best overlap of the log's lower half), and the figure's middle in frame 0.
effectsRenderer applies them to the figure and everything drawn with it.

fireStrip.js also holds the strip file's SHA-256 (FIRE_STRIP_SHA256), so the
fire-strip suite (node, no Python) fails for a strip that is not the one the
tool wrote.  --check takes the pixels as the test: a newer libwebp may write
other bytes for the same pixels, so the fingerprint it expects is the file's
own when the pixels match.

  python3 tools/build_fire_clean.py [--check]

Reads assets/skill-anim-src/firemaking-strip-painted.webp (the owner's frames
as they were supplied, kept) and writes public/sprites/skills/firemaking-strip.webp
(lossless) and src/data/fireStrip.js.  --check writes nothing and fails if
either would change.
"""
import hashlib
import io
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(REPO, 'assets/skill-anim-src/firemaking-strip-painted.webp')
OUT = os.path.join(REPO, 'public/sprites/skills/firemaking-strip.webp')
DATA = os.path.join(REPO, 'src/data/fireStrip.js')
VERSION = '2.3.3655'
FW, FH, N = 384, 512, 8
STRIKE = 3                        # the first frame with fire painted in it
CLONE_W = 96                      # how far along the log a mended pixel is cloned from
# where the flame was the figure's own outline: only what is surely fire goes
KEEP_BOXES = [None, None, None, None, (168, 245, 260, 325), (195, 245, 262, 325), (192, 245, 245, 365), None]
OUTLINE_LIT = (58, 10, 2, 255)    # the dark red-brown of the figure's outline on the lit side
FOUR = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], bool)
EIGHT = np.ones((3, 3), bool)


def hsv(fr):
    r, g, b = [fr[..., i].astype(np.float32) for i in range(3)]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 0
    rr = m & (mx == r)
    gg = m & (mx == g) & ~rr
    bb = m & ~rr & ~gg
    h[rr] = 60 * (((g - b)[rr] / d[rr]) % 6)
    h[gg] = 60 * ((b - r)[gg] / d[gg] + 2)
    h[bb] = 60 * ((r - g)[bb] / d[bb] + 4)
    h[h < 0] += 360
    s = np.where(mx > 0, d / np.maximum(mx, 1), 0)
    return h, s, mx


def masks(fr):
    a = fr[..., 3].astype(np.int32)
    r, g, b = [fr[..., i].astype(np.int32) for i in range(3)]
    h, s, mx = hsv(fr)
    op = a >= 16
    # the log: the pipeline's magenta key (toolRecolor.js isToolKey)
    key = (a >= 77) & (mx >= 46) & (s > 0.4) & (h >= 315) & (h <= 350)
    dark = op & (mx < 90) & ~key
    flame = op & ~key & (r >= 225) & (b < 12) & ((g < 110) | (g > 195))
    sure = flame | (op & ~key & (((r >= 180) & (b >= 88) & (b <= g + 16)) | ((mx >= 150) & (s < 0.18))))
    near = op & ~key & ~dark & (((r >= 200) & (b < 16))
                                | ((r >= 170) & (b >= 60) & (b <= g + 24))
                                | ((mx >= 130) & (s < 0.2))
                                | ((r >= 200) & (g <= 88) & (b >= 32) & (b <= 140))
                                | (a < 200))
    return op, key, dark, sure, near, (r, g, b)


def log_box(key, dark, op):
    rows = np.nonzero(key.any(1))[0]
    cols = np.nonzero(key.any(0))[0]
    lx, rx, kb = int(cols.min()), int(cols.max()), int(rows.max())
    # its top line, read where the log's top was never covered (its right part)
    tops = []
    for x in range(int(lx + 0.55 * (rx - lx)), int(lx + 0.8 * (rx - lx))):
        ky = np.nonzero(key[:, x])[0]
        if not len(ky):
            continue
        y, n = int(ky.min()), 0
        while y > 0 and op[y - 1, x] and dark[y - 1, x] and n < 6:
            y -= 1
            n += 1
        tops.append(y)
    return lx, rx, int(np.median(tops)), kb


def clean(fr, keepbox):
    op, key, dark, sure, near, (r, g, b) = masks(fr)
    lx, rx, yt, kb = log_box(key, dark, op)
    grow = near | sure
    kb_m = np.zeros_like(op)
    if keepbox:
        x0, y0, x1, y1 = keepbox
        kb_m[max(0, y0 - 6):y1 + 6, max(0, x0 - 6):x1 + 6] = True
        bright_red = op & ~key & (r >= 200) & (g < 70) & (b < 70)
        grow = (grow & ~kb_m) | ((sure | bright_red) & kb_m)
    lab, _ = ndimage.label(grow, structure=EIGHT)
    hit = np.unique(lab[sure])
    erase = np.isin(lab, hit[hit > 0])
    # a small spot wholly inside the figure is the figure's own (the eyes' whites) --
    # unless it is the glow seen through a gap in it
    elab, en = ndimage.label(erase, structure=FOUR)
    for i in range(1, en + 1):
        m = elab == i
        if m.sum() >= 250:
            continue
        cream = (r[m] >= 200) & (g[m] >= 150) & (b[m] >= 90) & (b[m] < g[m] - 15)
        if cream.mean() > 0.5:
            continue
        ring = ndimage.binary_dilation(m, structure=FOUR) & ~m
        if ring.any() and (op[ring] & ~erase[ring]).all():
            erase &= ~m
    # the log's box: everything of the log is magenta, pink or outline
    box = np.zeros_like(op)
    box[yt - 3:kb + 4, max(0, lx - 4):rx + 5] = True
    logown = key | dark | (b >= g)
    erase = (erase & ~(box & logown)) | (box & op & ~logown)
    # the glow's soft rim along the figure's outline
    for _ in range(2):
        rim = op & ~erase & ~dark & ~key & ndimage.binary_dilation(erase, structure=FOUR)
        erase |= rim & ~(box & logown) & ~kb_m
    out = fr.copy()
    out[erase] = 0
    # where the flame's rim was the hand's or the arm's own outline, draw it back
    if keepbox:
        skin = (out[..., 3] >= 128) & ~dark & ~key & kb_m
        edge = erase & kb_m & ndimage.binary_dilation(skin, structure=FOUR)
        out[edge] = OUTLINE_LIT
        erase &= ~edge
    # mend the log's top where the flame covered it, along the grain
    mended = 0
    for x in range(lx + 4, rx - CLONE_W + 1):
        for y in range(yt - 3, kb + 1):
            if not erase[y, x]:
                continue
            sx = x + CLONE_W
            if not (box[y, sx] and out[y, sx, 3] >= 16 and logown[y, sx]):
                continue
            if y < yt - 1 and not dark[y, sx]:
                continue
            out[y, x] = out[y, sx]
            mended += 1
    # the fire's faint soft edges: a see-through pixel stays only beside what stays
    solid = ndimage.binary_dilation(out[..., 3] >= 128, structure=EIGHT, iterations=2)
    out[(out[..., 3] > 0) & (out[..., 3] < 128) & ~solid] = 0
    # then sparks and the smoke's outline: only the figure's pieces and the log's stay
    op3 = out[..., 3] >= 16
    blab, bn = ndimage.label(op3, structure=EIGHT)
    sizes = ndimage.sum(np.ones_like(blab), blab, index=range(1, bn + 1)) if bn else []
    keep = [i + 1 for i, s in enumerate(sizes) if s >= 300]
    keep += [int(i) for i in np.unique(blab[key & op3]) if i > 0 and int(i) not in keep]
    out[op3 & ~np.isin(blab, keep)] = 0
    return out, mended


def frame_places(frames):
    """Per frame, the (dx, dy) that lays its log on frame 0's; and frame 0's figure middle."""
    geo = []
    for fr in frames:
        op, key, dark, _, _, _ = masks(fr)
        lx, rx, yt, kb = log_box(key, dark, op)
        solid = fr[..., 3] >= 128
        bottoms = [int(np.nonzero(solid[:, x])[0].max()) for x in range(150, 240) if solid[:, x].any()]
        rows = np.nonzero(key.any(1))[0]
        mid = (int(rows.min()) + int(rows.max())) // 2
        low = key.copy()
        low[:mid] = False
        geo.append((int(np.median(bottoms)), low))
    places = []
    b0, low0 = geo[0]
    for b, low in geo:
        dy = b0 - b
        best = None
        for dx in range(-12, 13):
            sh = np.roll(np.roll(low, dy, 0), dx, 1)
            iou = (sh & low0).sum() / max(1, (sh | low0).sum())
            if best is None or iou > best[0] + 1e-9:
                best = (iou, dx)
        places.append((best[1], dy))
    # the figure's middle: frame 0's head (the topmost large blob of skin)
    fr = frames[0].astype(np.int32)
    a, r, g, b = fr[..., 3], fr[..., 0], fr[..., 1], fr[..., 2]
    skin = (a > 200) & (r > 190) & (g > 90) & (g < 200) & (b >= 12) & (b < 90)
    lab, n = ndimage.label(skin)
    head = None
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(ys) >= 1500 and (head is None or ys.min() < head[0]):
            head = (int(ys.min()), float(xs.mean()))
    return places, int(round(head[1]))


def data_module(places, figure_x, sha):
    rows = ', '.join(f'[{dx}, {dy}]' for dx, dy in places)
    return f"""/* GENERATED by tools/build_fire_clean.py -- do not edit by hand.

   v{VERSION}: the fire-lighter's strip (public/sprites/skills/firemaking-strip.webp)
   with its painted fire taken out; the game draws the campfire's own flame
   catching on the log instead (campfireFx.js, the light's fire).  These are
   the strip's places, measured on the owner's frames:

   FIRE_FRAME_OFF  per frame, the shift in art px that lays its log on frame
                   0's.  The second row of the owner's sheet (frames 4-7) was
                   drawn 26-27 px higher, the figure with it, so the bro
                   hopped up at frame 4 and dropped when the light ended.
   FIRE_FIGURE_X   the figure's middle in frame 0, art px of the 384 px frame:
                   the bro stands right of the frame's middle, so he was drawn
                   14 world px to the side of where you stand.
   FIRE_STRIKE_FRAME  the first frame of the strike: where the fire catches.
   FIRE_STRIP_SHA256  the strip file's fingerprint (the fire-strip suite). */
export const FIRE_STRIP_V = '{VERSION}';
export const FIRE_STRIP_SHA256 = '{sha}';
export const FIRE_FRAME_OFF = Object.freeze([{rows}].map((p) => Object.freeze(p)));
export const FIRE_FIGURE_X = {figure_x};
export const FIRE_STRIKE_FRAME = {STRIKE};
"""


def main():
    check = '--check' in sys.argv
    src = Image.open(SRC)
    icc = src.info.get('icc_profile')
    im = np.array(src.convert('RGBA'))
    assert im.shape[1] == FW * N and im.shape[0] == FH, im.shape
    frames = [im[:, f * FW:(f + 1) * FW] for f in range(N)]
    outs = []
    for f, fr in enumerate(frames):
        if f < STRIKE:
            outs.append(fr.copy())
            continue
        o, mended = clean(fr, KEEP_BOXES[f])
        outs.append(o)
        print(f'frame {f}: {int((fr[..., 3] >= 16).sum()) - int((o[..., 3] >= 16).sum())} px of fire out, {mended} px of log mended')
    # measured on the frames without their fire: the glow reached below the log
    places, figure_x = frame_places(outs)
    strip = Image.fromarray(np.concatenate(outs, 1), 'RGBA')
    buf = io.BytesIO()
    kw = {'lossless': True, 'quality': 100, 'method': 6, 'exact': True}
    if icc:
        kw['icc_profile'] = icc
    strip.save(buf, 'WEBP', **kw)
    webp = buf.getvalue()
    print('places', places, 'figure x', figure_x, 'webp', len(webp), 'bytes')
    if check:
        old = np.array(Image.open(OUT).convert('RGBA')) if os.path.exists(OUT) else None
        same_px = old is not None and old.shape == np.array(strip).shape and (old == np.array(strip)).all()
        # the pixels are the test: the fingerprint is the file's own when they match
        sha = hashlib.sha256(open(OUT, 'rb').read() if same_px else webp).hexdigest()
        js = data_module(places, figure_x, sha)
        same_js = os.path.exists(DATA) and open(DATA).read() == js
        if not (same_js and same_px):
            print('CHANGED: re-run tools/build_fire_clean.py' + ('' if same_px else ' (the strip)') + ('' if same_js else ' (fireStrip.js)'))
            sys.exit(1)
        print('ok: the strip and fireStrip.js match the tool')
        return
    js = data_module(places, figure_x, hashlib.sha256(webp).hexdigest())
    with open(OUT, 'wb') as f:
        f.write(webp)
    with open(DATA, 'w') as f:
        f.write(js)
    print('wrote', OUT, 'and', DATA)


if __name__ == '__main__':
    main()
