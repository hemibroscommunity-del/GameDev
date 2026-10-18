#!/usr/bin/env python3
"""v2.3.3334: the farmer's three animations, cut from the owner's three sheets.

    python3 tools/make_farm_anims.py            # writes the strips + src/data/farmAnims.js
    PREVIEW=/some/dir python3 tools/make_farm_anims.py   # and contact sheets to look at

The owner (2026-10-17), of the farm you walk: "I'd like to have animations
during the farming process perhaps on a sprite sheet."  They made three in
ChatGPT from one reference picture (the fire-lighter with his log taken out),
each 8 frames in a 4 x 2 grid of 384 x 512 cells on flat magenta, kept here as
they were sent, in tools/farm_anim_src/:

    hoe.png     digging            dig
    water.png   the watering can   water
    kneel.png   hands in the soil  plant, feed (compost), harvest

The figure is the plain bro -- bald, shirtless, orange skin, olive trousers,
grey boots -- because the game dresses him: it repaints his skin, trousers and
boots in yours (playerSkins recolorStandInSkinSplit), lays your shirt over him
and puts your hair, hat and beard on his head (_placeSkillTraitsOn).  This tool
makes everything that needs:

  1. THE BACKGROUND, taken out with its soft edges: each edge pixel's alpha is
     how far it is from the magenta against how far the nearest solid colour
     is, and its colour that solid colour -- no pink fringe (a plain cut-off
     leaves one, and a dark purple rim round every outline).
  2. THE TOOL, apart from the man: the watering can (its greens) and its water
     (its blues); the hoe's handle (a brown that is never within 4 px of lit
     skin -- the browns where skin meets its outline always are), its blade
     (a grey piece no trousers stand on, unlike a boot) and the dirt it throws
     (pieces apart from the figure).  The game's repainting would otherwise
     take the can for trousers, the blade for a boot and the handle for skin.
     So the BODY strip keeps every pixel's coverage but paints the tool's
     pixels black (nothing repaints black, and the tool's own black outline
     edges it anyway), and the PROP strip holds the tool as drawn, laid over
     the body and the shirt.
  3. THE FRAMES LINED UP.  ChatGPT drew the hoe's man drifting left across
     each row (his boots 19 px apart from frame 1 to 4) and its second row
     40 px higher; the kneel's second row 13 px higher.  Each frame is moved
     so the boots (hoe, can) or the ground the figure kneels on (kneel, whose
     boots hide in most frames) and the face stay put: the measured shifts
     are printed.
  4. ONE SIZE: every sheet scaled so the head, ears to ears at the eyes, is
     HEAD_PX wide; the game draws that head FARM_ANIM_HEAD_WORLD (31.25)
     world px, a little over the walking head's 28.5 so the farmer stands
     your height (effectsRenderer's note), and the trait multiplier
     (_skillTraitMul) is HEAD_PX / 51, as the fire-lighter's 1.98 is his
     101 / 51.  ChatGPT drew the three at three sizes (heads 143, 121
     and 114 px); each sheet's frames agree with each other to 1 px.  Area
     resampling, on premultiplied colour.
  5. THE SHIRT: a white T-shirt mask made from the body itself -- the
     fire-lighter's v2.3.1713 recipe (tools/build_fire_shirt.mjs), which
     fits by construction where a painted shirt sheet has to be nudged on
     (FIRE_GEAR_REG): his skin from the collar down to his trousers that
     the middle of his chest reaches WITHOUT A DETOUR (a forearm hanging in
     front of the chest is reached only round by the shoulder), and the top
     of each arm as the sleeve; a darker hem where it meets skin.  The game
     tints it your shirt's colour and bakes your print and pattern on it,
     as on every stand-in.  KNOWN WRONG: where an arm is in front of his
     body (the can at his belly, the hoe across it) the whole arm comes out
     as shirt -- the owner: "Whole arm was green".  Their sheets drawn again
     in the game's white tee replace this (docs/ART-WISHLIST.md, "The
     farmer's moves, dressed").
  6. THE CROWNS: where the top of the head is in each frame, for the hat --
     straight up from between the eyes to the last skin pixel.

Writes, for each animation `<a>`:
    public/sprites/skills/farm-<a>.png           the man, frames side by side
    public/sprites/skills/farm-<a>-prop.png      the tool (hoe and can only)
    public/sprites/gear/shirt/tshirt/farm<a>-south.png   the shirt layer
and src/data/farmAnims.js (GENERATED): each strip's frame size, the point
under the boots it stands on, the crowns, the head's size.  Deterministic.
Needs numpy and Pillow.  docs/specs/farm-walk.md "The farmer's own moves".
"""
import json, os, sys
from collections import deque
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'tools/farm_anim_src')
SKILLS = os.path.join(ROOT, 'public/sprites/skills')
SHIRTS = os.path.join(ROOT, 'public/sprites/gear/shirt/tshirt')
OUT_JS = os.path.join(ROOT, 'src/data/farmAnims.js')
PREVIEW = os.environ.get('PREVIEW')
VER = '2.3.3334'

CW, CH, N = 384, 512, 8          # the owner's cells, read like a page
HEAD_PX = 64                     # the head, ears to ears at the eyes, in the strips
MARGIN = 3                       # px of clear round each strip's union box
ANIMS = (
    # name, how its frames are lined up, has a tool
    ('hoe', 'boots', True),
    ('water', 'boots', True),
    ('kneel', 'ground', False),
)

# ── colours ────────────────────────────────────────────────────────────────

def bg_colour(a):
    d = np.maximum.reduce([255 - a[..., 0], a[..., 1], 255 - a[..., 2]])
    return a[d < 30].mean(0)


def from_bg(c, B):
    """How far a colour is from the sheet's magenta, 0 on it."""
    return np.maximum.reduce([B[0] - c[..., 0], c[..., 1] - B[1], B[2] - c[..., 2]])


def near(mask, it=1):
    out = mask.copy()
    for _ in range(it):
        g = out.copy()
        g[1:] |= out[:-1]; g[:-1] |= out[1:]; g[:, 1:] |= out[:, :-1]; g[:, :-1] |= out[:, 1:]
        out = g
    return out


def dilate8(mask, it=1):
    out = mask.copy()
    for _ in range(it):
        g = near(out)
        g[1:, 1:] |= out[:-1, :-1]; g[1:, :-1] |= out[:-1, 1:]; g[:-1, 1:] |= out[1:, :-1]; g[:-1, :-1] |= out[1:, 1:]
        out = g
    return out


def nearest_fill(valid, colour, maxd):
    """For every pixel within maxd steps of a valid one, that one's colour."""
    H, W = valid.shape
    out = colour.copy()
    depth = np.where(valid, 0, -1).astype(np.int32)
    q = deque(map(tuple, np.argwhere(valid)))
    while q:
        y, x = q.popleft()
        dd = depth[y, x]
        if dd >= maxd:
            continue
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < H and 0 <= nx < W and depth[ny, nx] < 0:
                depth[ny, nx] = dd + 1
                out[ny, nx] = out[y, x]
                q.append((ny, nx))
    return out, depth


def labels(mask, diag=True):
    """Connected pieces: (label image, sizes) -- 8-connected when diag."""
    H, W = mask.shape
    lab = np.zeros((H, W), np.int32)
    sizes = [0]
    steps = ((-1, 0), (1, 0), (0, -1), (0, 1)) + (((-1, -1), (-1, 1), (1, -1), (1, 1)) if diag else ())
    for sy, sx in np.argwhere(mask):
        if lab[sy, sx]:
            continue
        i = len(sizes)
        lab[sy, sx] = i
        q = deque([(sy, sx)])
        n = 0
        while q:
            y, x = q.popleft()
            n += 1
            for dy, dx in steps:
                ny, nx = y + dy, x + dx
                if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = i
                    q.append((ny, nx))
        sizes.append(n)
    return lab, np.array(sizes)


def edt(mask):
    """Distance (in px, chessboard-ish via repeated 8-dilation) to the nearest
    True pixel, capped at 16 -- all this tool asks is 'within a few px'."""
    d = np.full(mask.shape, 16, np.int32)
    cur = mask.copy()
    d[cur] = 0
    for k in range(1, 16):
        nxt = dilate8(cur)
        d[nxt & ~cur] = k
        cur = nxt
    return d


def hue(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1)
    c = mx - mn + 1e-6
    h = np.where(mx == r, ((g - b) / c) % 6, np.where(mx == g, (b - r) / c + 2, (r - g) / c + 4)) * 60
    return h, (mx - mn) / np.maximum(mx, 1)


# ── 1. the background ──────────────────────────────────────────────────────

WATER = np.array([142., 230., 253.])     # the can's water, as painted


def matte(c, B):
    """(colour, alpha) of one cell, the magenta taken out with its blend."""
    d = from_bg(c, B)
    bgish = d < 60
    core = (d >= 150) & ~near(bgish)
    # the water's pale drops are painted half into the magenta: lilac, which
    # reads as solid -- they are water, as much of it as the green says
    lilac = (c[..., 2] > 200) & (c[..., 0] > 110) & (c[..., 1] > 110) & (np.abs(c[..., 0] - c[..., 1]) < 70) \
        & (c[..., 0] < 225) & (c[..., 1] < 225)
    core &= ~lilac
    F, depth = nearest_fill(core, c, 12)
    F[lilac] = WATER
    dF = np.maximum(from_bg(F, B), 1)
    alpha = np.clip(d / dF, 0, 1)
    alpha[d < 28] = 0
    alpha[core] = 1
    alpha[depth < 0] = 0
    col = np.where(core[..., None], c, F)
    return col, alpha


# ── 2. what is the man and what is his tool ────────────────────────────────

def body_classes(rgb, alpha):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1)
    op = alpha > 0.5
    return {
        'op': op,
        'skin': op & (r > 200) & (g > 95) & (g < 180) & (b < 100) & (r - g > 55),
        'pants': op & (np.abs(r - g) < 30) & (g - b > 25) & (r > 60) & (r < 170),
        'grey': op & ((mx - mn) < 28) & (mx >= 45) & (mx < 150),
        'brown': op & (r - g > 25) & (g >= b - 8) & (r - b > 35) & (mx >= 50),
        'eye': op & (r > 200) & (g > 200) & (b > 200),
    }


def tool_mask(name, rgb, alpha, K):
    """The pixels of the tool in one frame (hoe: handle, blade, dirt; water:
    the can and its water)."""
    seen = alpha > 0.04
    if name == 'kneel':
        return np.zeros(alpha.shape, bool)
    prop = np.zeros(alpha.shape, bool)
    if name == 'water':
        h, s = hue(rgb)
        r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
        green = seen & (h > 78) & (h < 170) & (s > 0.22) & (rgb.max(-1) > 25)
        blue = seen & (b > r + 35) & (g > r + 10)
        prop = green | blue
        darkgreen = seen & (g > r + 6) & (g > b + 6) & ~K['pants']
        for _ in range(3):
            prop |= near(prop) & darkgreen
    else:  # hoe
        dsk = edt(K['skin'])
        wood = K['brown'] & ~K['skin'] & (dsk >= 4) & (rgb[..., 0] < 178)
        lab, sizes = labels(wood)
        wood = sizes[lab] >= 60
        wood &= lab > 0
        r = rgb[..., 0]
        dark = K['op'] & (rgb.max(-1) < 95) & (r >= rgb[..., 1]) & ~K['grey']
        for _ in range(3):
            wood |= near(wood) & (K['brown'] | dark) & (dsk >= 2)
        # the blade: a grey piece no trousers stand on (a boot always has
        # them within 14 px above most of its top), beside the handle
        lab, sizes = labels(K['grey'])
        blade = np.zeros(alpha.shape, bool)
        handle_near = dilate8(wood, 8)
        for i in range(1, len(sizes)):
            if sizes[i] < 40:
                continue
            m = lab == i
            ys, xs = np.nonzero(m)
            top = {}
            for y, x in zip(ys, xs):
                if x not in top or y < top[x]:
                    top[x] = y
            hits = sum(1 for x, y0 in top.items() if K['pants'][max(0, y0 - 14):y0, x].any())
            boot = hits >= 0.5 * len(top)
            if not boot and (m & handle_near).any():
                blade |= m
        blade |= dilate8(blade, 2) & K['grey']
        prop = wood | blade
    # pieces of the drawing apart from the figure (dirt, drops) are the tool's
    lab, sizes = labels(seen)
    if len(sizes) > 1:
        main = int(np.argmax(sizes[1:]) + 1)
        prop |= (lab > 0) & (lab != main)
    # specks: a lone prop piece of a few px inside the figure is a misread
    lab, sizes = labels(prop)
    keep = sizes[lab] >= 20
    keep &= lab > 0
    return keep


# ── 3. lining the frames up ────────────────────────────────────────────────

def eyes(rgb, alpha):
    """Middle of the two eyes and the head's width at them (ears to ears,
    outline included -- the convention the fire-lighter's 101 px is)."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    white = (alpha > 0.5) & (r > 200) & (g > 200) & (b > 200)
    lab, sizes = labels(white)
    pieces = []
    for i in range(1, len(sizes)):
        if sizes[i] >= 20:
            ys, xs = np.nonzero(lab == i)
            pieces.append((sizes[i], xs.mean(), ys.mean()))
    pieces.sort(key=lambda p: -p[0])
    # an eye white is split by its pupil in some frames: join pieces on a row
    # that lie within 20 px of each other
    eyes_ = []
    for s, x, y in pieces[:4]:
        for e in eyes_:
            if abs(e[1] - x) < 20 and abs(e[2] - y) < 8:
                break
        else:
            eyes_.append((s, x, y))
    eyes_ = sorted(eyes_[:2], key=lambda e: e[1])
    if len(eyes_) < 2:
        raise SystemExit('could not find two eyes')
    ex = (eyes_[0][1] + eyes_[1][1]) / 2
    ey = (eyes_[0][2] + eyes_[1][2]) / 2
    ink = alpha > 0.5
    y, x = int(round(ey)), int(round(ex))
    lft = x
    while lft > 0 and ink[y, lft - 1]:
        lft -= 1
    rgt = x
    while rgt < ink.shape[1] - 1 and ink[y, rgt + 1]:
        rgt += 1
    return ex, ey, rgt - lft + 1


def boots_anchor(K, alpha):
    """(x between the boots, y of their soles) -- the two grey pieces that
    trousers stand on."""
    lab, sizes = labels(K['grey'])
    boots = []
    for i in range(1, len(sizes)):
        if sizes[i] < 400:
            continue
        m = lab == i
        ys, xs = np.nonzero(m)
        top = {}
        for y, x in zip(ys, xs):
            if x not in top or y < top[x]:
                top[x] = y
        hits = sum(1 for x, y0 in top.items() if K['pants'][max(0, y0 - 14):y0, x].any())
        if hits >= 0.5 * len(top):
            boots.append((xs.mean(), ys.max(), xs.min(), xs.max()))
    boots.sort()
    if len(boots) < 2:
        raise SystemExit('could not find two boots')
    l, rr = boots[0], boots[-1]
    # the sole: the lowest drawn row under the boots' grey (their outline)
    x0, x1 = int(l[2]), int(rr[3])
    ink = alpha[:, x0:x1 + 1] > 0.5
    y = int(max(l[1], rr[1]))
    while y + 1 < ink.shape[0] and ink[y + 1].sum() > 0.3 * ink.shape[1] * 0.5:
        y += 1
    return (l[0] + rr[0]) / 2, y


def ground_anchor(alpha, ex):
    """(the face's x, the lowest drawn row) -- the kneel: knee, boots or
    hands, whatever it rests on, is on the ground."""
    ys = np.nonzero((alpha > 0.5).any(1))[0]
    return ex, int(ys.max())


def shift(arr, dx, dy):
    out = np.zeros_like(arr)
    H, W = arr.shape[:2]
    ys0, ys1 = max(0, dy), min(H, H + dy)
    xs0, xs1 = max(0, dx), min(W, W + dx)
    out[ys0:ys1, xs0:xs1] = arr[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
    return out


# ── 5. the shirt ───────────────────────────────────────────────────────────

def geodesic(S, seeds, lim):
    """Distance from the nearest seed through S only (8 steps, diagonals
    1.414), up to lim; inf beyond."""
    import heapq
    H, W = S.shape
    geo = np.full(S.shape, np.inf)
    hq = []
    for y, x in seeds:
        if S[y, x]:
            geo[y, x] = 0
            hq.append((0.0, y, x))
    heapq.heapify(hq)
    steps = ((-1, 0, 1.0), (1, 0, 1.0), (0, -1, 1.0), (0, 1, 1.0),
             (-1, -1, 1.414), (-1, 1, 1.414), (1, -1, 1.414), (1, 1, 1.414))
    while hq:
        d0, y, x = heapq.heappop(hq)
        if d0 > geo[y, x] or d0 > lim:
            continue
        for dy, dx, w in steps:
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and S[ny, nx]:
                nd = d0 + w
                if nd < geo[ny, nx]:
                    geo[ny, nx] = nd
                    heapq.heappush(hq, (nd, ny, nx))
    return geo


SLEEVE = 0.50     # how far the shirt reaches out of the middle of the trunk, through it, x the head
CAP = 0.36        # a shoulder that is a piece of its own (leaning forward): its cap, x the head


def erode4(m):
    e = m.copy()
    e[1:] &= m[:-1]; e[:-1] &= m[1:]; e[:, 1:] &= m[:, :-1]; e[:, :-1] &= m[:, 1:]
    return e


def shirt_mask(K, rgb, alpha, ex, ey, hw, tool):
    """The T-shirt.  His skin below the collar and above the trousers, less
    the face, is cut apart where the drawing's outlines cut it (one px eaten
    off first, so a hand touching the chest through a gap in its outline is a
    piece of its own); the TRUNK is the piece that fills the middle of the
    body, and the shirt is the trunk out to SLEEVE heads from its middle
    column -- the chest, the belly, the shoulders and the tops of the arms
    -- while a hand or forearm in front of it, a piece of its own, stays
    bare.  Leaning forward, his shoulders are pieces of their own beside his
    face: each one's cap, CAP heads down from its top."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    op = K['op']
    H, W = alpha.shape
    # all the painted skin, shading lines included (what the game's _isSkin takes)
    skin = op & (r > g) & (g >= b) & (r - b > 30) & (r > 90) & (r - g > 25) & ~K['eye'] & ~tool
    yy, xx = np.indices((H, W))
    collar = int(round(ey + 0.50 * hw))
    # the face: its skin, filled from the cheek down to the chin, never past it
    head_box = (yy <= ey + 0.47 * hw) & (np.abs(xx - ex) <= 0.52 * hw)
    labF, _ = labels(skin & head_box, diag=False)
    win = labF[int(ey - 0.05 * hw):int(ey + 0.25 * hw), int(ex - 0.2 * hw):int(ex + 0.2 * hw)]
    ids = np.bincount(win[win > 0])
    face = (labF == int(np.argmax(ids))) if len(ids) > 1 else np.zeros_like(skin)
    neck = (np.abs(xx - ex) <= 0.34 * hw) & (yy < collar)
    # the waist: the first row of the trunk with a real run of trousers
    cols = (max(0, int(ex - 0.5 * hw)), min(W, int(ex + 0.5 * hw)))
    pants = K['pants'] & ~dilate8(tool, 3)
    waist = H
    for y in range(collar, H):
        row = pants[y, cols[0]:cols[1]]
        run = best = 0
        for v in row:
            run = run + 1 if v else 0
            best = max(best, run)
        if best >= 0.25 * hw:
            waist = y
            break
    S = skin & ~face & ~neck & (yy >= ey - 0.1 * hw) & (yy < waist)
    lab, sizes = labels(erode4(S), diag=False)
    mid = S & (np.abs(xx - ex) <= 0.30 * hw) & (yy >= collar)
    counts = np.bincount(lab[mid], minlength=len(sizes))
    counts[0] = 0
    if not counts.any():
        return np.zeros_like(S), collar, waist
    # leaning forward, his shoulders rise beside his face, each arm a piece of
    # its own from there down to the hand on the ground: such a piece starts
    # high beside the face, lies mostly to one side and holds nothing at its
    # top (a piece whose top is a hand on the tool's handle is an arm lifting
    # it, not a shoulder) -- it gets a cap, never the trunk's sleeve
    grip = dilate8(tool, int(0.10 * hw)) if tool.any() else np.zeros_like(S)
    cap_ids = []
    for i in range(1, len(sizes)):
        if sizes[i] < 0.02 * hw * hw:
            continue
        pys, pxs = np.nonzero(lab == i)
        t = int(pys.min())
        tx = int(np.round(pxs[pys == t].mean()))
        if t <= ey + 0.35 * hw and abs(tx - ex) >= 0.30 * hw and abs(pxs.mean() - ex) >= 0.30 * hw \
                and not grip[t, tx]:
            cap_ids.append((i, t, tx))
    for i, _, _ in cap_ids:
        counts[i] = 0
    if not counts.any():
        return np.zeros_like(S), collar, waist
    # the trunk: the piece filling the middle of the body -- and any other
    # holding a good share of it, when an arm across the chest cuts the trunk
    # in two (the hoe lifted to the shoulder)
    tl = int(np.argmax(counts))
    trunk_ids = [i for i in range(1, len(counts)) if counts[i] >= 0.15 * counts[tl]]
    trunk = near(np.isin(lab, trunk_ids)) & S
    seeds = [tuple(p) for p in np.argwhere(trunk & mid)]
    geo = geodesic(trunk, seeds, SLEEVE * hw)
    m = geo <= SLEEVE * hw
    for i, t, tx in cap_ids:
        piece = near(lab == i) & S
        start = (t, tx) if piece[t, tx] else tuple(np.argwhere(piece)[0])
        m |= geodesic(piece, [start], CAP * hw) <= CAP * hw
    # a hand raised to the shoulder round the tool's handle (the hoe lifted
    # over it) is part of the arm's piece: above the collar, what touches the
    # tool is a hand
    m &= ~(dilate8(tool, int(0.10 * hw)) & (yy < collar))
    return m, collar, waist


# ── 4. resampling ──────────────────────────────────────────────────────────

def resample(rgba, s):
    """Area resampling on premultiplied colour."""
    im = Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), 'RGBA').convert('RGBa')
    W, H = im.size
    im = im.resize((max(1, round(W * s)), max(1, round(H * s))), Image.BOX)
    return np.array(im.convert('RGBA')).astype(np.float32)


# ── main ───────────────────────────────────────────────────────────────────

def build(name, register, has_tool):
    src = np.array(Image.open(os.path.join(SRC, name + '.png')).convert('RGB')).astype(np.float32)
    B = bg_colour(src)
    cells = [src[(f // 4) * CH:(f // 4 + 1) * CH, (f % 4) * CW:(f % 4 + 1) * CW] for f in range(N)]
    frames = []
    for f, c in enumerate(cells):
        rgb, al = matte(c, B)
        K = body_classes(rgb, al)
        ex, ey, hw = eyes(rgb, al)
        if register == 'boots':
            ax, ay = boots_anchor(K, al)
        else:
            ax, ay = ground_anchor(al, ex)
        tool = tool_mask(name, rgb, al, K)
        frames.append(dict(rgb=rgb, al=al, K=K, ex=ex, ey=ey, hw=hw, ax=ax, ay=ay, tool=tool))
    hw = float(np.median([fr['hw'] for fr in frames]))
    ax0 = float(np.median([fr['ax'] for fr in frames]))
    ay0 = float(np.median([fr['ay'] for fr in frames]))
    s = HEAD_PX / hw
    print(f'{name}: background {B.round(1).tolist()}, head {hw:.0f} px -> {HEAD_PX} (x{s:.4f}), '
          f'heads {[fr["hw"] for fr in frames]}')
    out = []
    for f, fr in enumerate(frames):
        dx, dy = int(round(ax0 - fr['ax'])), int(round(ay0 - fr['ay']))
        rgb, al, tool = fr['rgb'], fr['al'], fr['tool']
        body = np.dstack([np.where(tool[..., None], 0, rgb), al * 255])
        prop = np.dstack([rgb, np.where(tool, al, 0) * 255])
        shirt, collar, waist = shirt_mask(fr['K'], rgb, al, fr['ex'], fr['ey'], hw, tool)
        shirt &= ~tool
        # the hem: a darker line where the shirt meets bare skin (collar, sleeves)
        r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
        skin = fr['K']['op'] & (r > g) & (g >= b) & (r - b > 30) & (r > 90) & (r - g > 25)
        bare = skin & ~shirt
        hem = shirt & dilate8(bare, 2)
        sh = np.zeros(rgb.shape[:2] + (4,), np.float32)
        sh[shirt] = (255, 255, 255, 255)
        sh[hem] = (150, 150, 150, 255)
        body, prop, sh = shift(body, dx, dy), shift(prop, dx, dy), shift(sh, dx, dy)
        crown = crown_of(shift(fr['K']['skin'], dx, dy), fr['ex'] + dx, fr['ey'] + dy)
        print(f'  f{f}: shift ({dx:+d},{dy:+d})  eyes ({fr["ex"] + dx:.0f},{fr["ey"] + dy:.0f})  '
              f'crown {crown}  tool {int(tool.sum())} px  shirt {int(shirt.sum())} px (collar {collar}, waist {waist})')
        out.append(dict(body=body, prop=prop, shirt=sh, crown=crown, eyes=(fr['ex'] + dx, fr['ey'] + dy)))
    # one box round every frame, at the strip's scale
    seen = np.zeros((CH, CW), bool)
    for o in out:
        seen |= (o['body'][..., 3] > 4) | (o['prop'][..., 3] > 4)
    ys, xs = np.nonzero(seen)
    pad = int(np.ceil((MARGIN + 1) / s))
    x0, x1 = max(0, xs.min() - pad), min(CW, xs.max() + 1 + pad)
    y0, y1 = max(0, ys.min() - pad), min(CH, ys.max() + 1 + pad)
    # snap the box so the anchor lands on whole strip px
    fw, fh = round((x1 - x0) * s), round((y1 - y0) * s)
    strips = {k: [] for k in ('body', 'prop', 'shirt')}
    for o in out:
        for k in strips:
            cut = o[k][y0:y1, x0:x1]
            img = resample(cut, s)
            img = img[:fh, :fw]
            if img.shape[0] < fh or img.shape[1] < fw:
                pad_ = np.zeros((fh, fw, 4), np.float32)
                pad_[:img.shape[0], :img.shape[1]] = img
                img = pad_
            strips[k].append(img)
    foot = [round(float((ax0 - x0) * s), 1), round(float((ay0 + 1 - y0) * s), 1)]
    crowns = [[int(round((o['crown'][0] - x0) * s)), int(round((o['crown'][1] - y0) * s))] for o in out]
    eyes_ = [[round(float((o['eyes'][0] - x0) * s), 1), round(float((o['eyes'][1] - y0) * s), 1)] for o in out]
    out_ = dict(name=name, fw=fw, fh=fh, strips=strips, foot=foot, crowns=crowns, eyes=eyes_,
                has_tool=has_tool, scale=s, src_head=hw)
    out_['work'] = work_point(name, strips)
    return out_


def crown_of(skin, ex, ey):
    """The head's top: straight up from between the eyes to the last skin
    row, and across, the middle of the skin a few rows under it -- the eyes'
    middle moves with where he looks (a pupil turned aside splits an eye's
    white), the head does not."""
    x = int(round(ex))
    y = int(round(ey))
    while y > 0 and not skin[y, x]:
        y -= 1                      # between the eyes may be a pupil's edge
    while y > 0 and skin[y - 1, x]:
        y -= 1
    row = skin[min(skin.shape[0] - 1, y + 6)]
    l = r = x
    while l > 0 and row[l - 1]:
        l -= 1
    while r < len(row) - 1 and row[r + 1]:
        r += 1
    return [(l + r) / 2, y]


WORK_FRAME = {'hoe': 4, 'water': 4, 'kneel': 2}


def work_point(name, strips):
    """Where the work happens, frame px: the hoe's blade on the ground as it
    strikes, the can's water where it lands, the hands pressed into the soil
    -- what is thrown up flies from here (farmWorld.js _burst)."""
    f = WORK_FRAME[name]
    if name == 'kneel':
        body = strips['body'][f]
        r, g, b, a = (body[..., i] for i in range(4))
        sk = (a > 128) & (r > g) & (g >= b) & (r - b > 30) & (r > 90) & (r - g > 25)
        ys, xs = np.nonzero(sk)
        low = ys >= ys.max() - 6
        return [round(float(xs[low].mean()), 1), float(ys.max())]
    prop = strips['prop'][f]
    a = prop[..., 3] > 128
    if name == 'water':
        r, g, b = prop[..., 0], prop[..., 1], prop[..., 2]
        a &= (b > r + 35) & (g > r + 10)
    lab, sizes = labels(a)
    big = int(np.argmax(sizes[1:]) + 1)
    ys, xs = np.nonzero(lab == big) if name == 'hoe' else np.nonzero(a)
    low = ys >= ys.max() - 6
    return [round(float(xs[low].mean()), 1), float(ys.max())]


def save_strip(frames, path):
    arr = np.concatenate(frames, axis=1)
    Image.fromarray(np.clip(np.round(arr), 0, 255).astype(np.uint8), 'RGBA').save(path, optimize=True)
    return arr.shape[1], arr.shape[0]


def main():
    made = []
    for name, register, tool in ANIMS:
        a = build(name, register, tool)
        bw, bh = save_strip(a['strips']['body'], os.path.join(SKILLS, f'farm-{name}.png'))
        if tool:
            save_strip(a['strips']['prop'], os.path.join(SKILLS, f'farm-{name}-prop.png'))
        save_strip(a['strips']['shirt'], os.path.join(SHIRTS, f'farm{name}-south.png'))
        print(f'  -> farm-{name}.png {bw}x{bh} ({a["fw"]}x{a["fh"]} x{N}), foot {a["foot"]}, work {a["work"]}')
        made.append(a)
        if PREVIEW:
            preview(a)
    write_js(made)


def write_js(made):
    lines = [
        "/* v2.3.3334: GENERATED by tools/make_farm_anims.py -- do not edit by hand;",
        "   run the tool again.  The farmer's three animations, cut from the owner's",
        "   three sheets (tools/farm_anim_src): the hoe for digging, the watering can",
        "   for watering, kneeling with his hands in the soil for planting, the",
        "   compost and the harvest.  Each strip is N frames of fw x fh side by side",
        "   (public/sprites/skills/farm-<name>.png, the tool apart in farm-<name>-prop.png",
        "   for the two that hold one, the shirt in gear/shirt/tshirt/farm<name>-south.png),",
        "   drawn so its head is FARM_ANIM_HEAD px wide ears to ears: `foot` is the point between",
        "   his boots on the ground, frame px, `work` where the work happens (the",
        "   blade striking, the water landing, the hands in the soil: the bits fly",
        "   from there), and `crowns` the top of his head in each frame (the hat sits",
        "   there).  docs/specs/farm-walk.md \"The farmer's own moves\". */",
        f"export const FARM_ANIM_HEAD = {HEAD_PX};",
        "export const FARM_ANIMS = Object.freeze({",
    ]
    for a in made:
        n = a['name']
        prop = f"'/sprites/skills/farm-{n}-prop.png?v={VER}'" if a['has_tool'] else 'null'
        crowns = ', '.join(f'[{c[0]}, {c[1]}]' for c in a['crowns'])
        lines.append(f"  {n}: Object.freeze({{ url: '/sprites/skills/farm-{n}.png?v={VER}', prop: {prop}, "
                     f"pose: 'farm{n}', fw: {a['fw']}, fh: {a['fh']}, n: {N}, "
                     f"foot: Object.freeze([{a['foot'][0]}, {a['foot'][1]}]), "
                     f"work: Object.freeze([{a['work'][0]}, {a['work'][1]}]), "
                     f"crowns: Object.freeze([{crowns}]) }}),")
    lines.append("});")
    with open(OUT_JS, 'w') as fh:
        fh.write('\n'.join(lines) + '\n')
    print('wrote', os.path.relpath(OUT_JS, ROOT))


# ── previews (PREVIEW=dir) ─────────────────────────────────────────────────

def recolour(body, skin_t, pants_t, boots_t):
    """A rough stand-in for the game's repaint, to look at the separation."""
    rgb = body[..., :3].copy()
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    a = body[..., 3]
    lum = (0.299 * r + 0.587 * g + 0.114 * b)
    sk = (a > 40) & (r > g) & (g >= b) & (r - b > 30) & (r > 90) & (r - g > 25) & (g < 0.8 * r)
    pa = (a > 180) & (g >= r - 10) & (g > b + 8) & (r < 150)
    mx, mn = rgb.max(-1), rgb.min(-1)
    bo = (a > 180) & ((mx - mn) < 28) & (mx >= 45) & (mx < 140)
    for m, t, ref in ((sk, skin_t, 149), (pa, pants_t, 112), (bo, boots_t, 75)):
        k = (lum[m] / ref)[:, None]
        rgb[m] = np.clip(np.array(t)[None] * k, 0, 255)
    return np.dstack([rgb, a])


def over(dst, src):
    a = src[..., 3:4] / 255
    dst[..., :3] = src[..., :3] * a + dst[..., :3] * (1 - a)
    return dst


def preview(a):
    fw, fh = a['fw'], a['fh']
    Z = 2
    rows = []
    for look in (None, ((90, 56, 38), (50, 70, 160), (160, 40, 40), (60, 170, 90))):
        row = []
        for f in range(N):
            bgc = np.zeros((fh, fw, 4), np.float32)
            bgc[..., :3] = (96, 140, 70)        # grass
            bgc[..., 3] = 255
            body = a['strips']['body'][f]
            if look:
                body = recolour(body, *look[:3])
            over(bgc, body)
            sh = a['strips']['shirt'][f].copy()
            if look:
                sh[..., :3] = sh[..., :3] * (np.array(look[3]) / 255)[None, None]
                over(bgc, sh)
            if a['has_tool']:
                over(bgc, a['strips']['prop'][f])
            cx, cy = a['crowns'][f]
            bgc[max(0, cy - 1):cy + 1, max(0, cx - 4):cx + 5, :3] = (255, 0, 255)
            fx, fy = a['foot']
            fy = int(fy) - 1
            bgc[max(0, fy):fy + 1, max(0, int(fx) - 6):int(fx) + 7, :3] = (255, 255, 0)
            row.append(bgc)
        rows.append(np.concatenate(row, axis=1))
    sheet = np.concatenate(rows, axis=0)
    im = Image.fromarray(np.clip(sheet, 0, 255).astype(np.uint8)[..., :3])
    im = im.resize((im.width * Z, im.height * Z), Image.NEAREST)
    os.makedirs(PREVIEW, exist_ok=True)
    im.save(os.path.join(PREVIEW, f'preview-{a["name"]}.png'))


if __name__ == '__main__':
    main()
