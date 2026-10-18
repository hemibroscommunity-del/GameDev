#!/usr/bin/env python3
"""v2.3.3411: the farmer's three animations, cut from the owner's three sheets.

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
  5. THE SHIRT AND THE ARMOUR, from the owner's DRESSED sheets: each sheet
     drawn again by ChatGPT with the bro in the game's white tee
     (<name>-tee.png) and in its steel plate and greaves (<name>-armour.png),
     from the references in docs/art/.  The first cut made the shirt out of
     the bare body and got the arms wrong wherever one crossed in front of
     him -- the owner: "Whole arm was green".  ChatGPT kept every pose: each
     dressed frame lies within a px or two of the bare one.  It is lined up
     to the bare frame by the skin of his head (the shift, within 4 px each
     way, that lays the two heads' skin best over each other -- not by the
     eyes, which each drawing splits differently round the pupil), then cut
     with the bare frame's own shift and scale, so its layers lie on the
     bare body as the walking layers lie on the walking body:
       - the SHIRT: the white cloth below the face and its black edge, never
         on his trousers, boots or the tool (the bare frame's classes);
       - the ARMOUR: the steel and its edge, split by what lies under it in
         the bare frame -- over skin (arms, chest, neck) the PLATE, over
         trousers and boots the GREAVES (the chain-mail belt rides with the
         greaves: it sits over the trousers' top);
       - the BODY UNDER GREAVES (`under`): the bare body with every trouser
         and boot pixel the greaves do not cover taken out, so no strip of
         trouser or boot shows round the plates.  A boot is the boot grey
         below the trousers or beside them (dilated 25 px), or a grey piece
         of 40+ px wholly below his waist, never a pixel of the tool: the
         hoe's blade is that grey too.
     The game tints the shirt your colour and bakes your print and pattern
     on it, and tints the armour its metal, as on every stand-in.
  6. THE CROWNS: where the top of the head is in each frame, for the hat --
     straight up from between the eyes to the last skin pixel.

Writes, for each animation `<a>`:
    public/sprites/skills/farm-<a>.png           the man, frames side by side
    public/sprites/skills/farm-<a>-greaves.png   the man under greaves
    public/sprites/skills/farm-<a>-prop.png      the tool (hoe and can only)
    public/sprites/gear/shirt/tshirt/farm<a>-south.png        the shirt layer
    public/sprites/gear/chest/steelplate/farm<a>-south.png    the plate
    public/sprites/gear/legs/steelgreaves/farm<a>-south.png   the greaves
and src/data/farmAnims.js (GENERATED): each strip's frame size, the point
under the boots it stands on, the crowns, the head's size.  Deterministic
(about 75 s).  Needs numpy and Pillow.  PREVIEW's sheets show every outfit
the game can put together -- bare, the tee, plate and greaves, greaves under
the tee, the plate over trousers -- as the mixed ones are where a misfit
between the sheets would show.  docs/specs/farm-walk.md "The farmer's own
moves".
"""
import json, os, sys
from collections import deque
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'tools/farm_anim_src')
SKILLS = os.path.join(ROOT, 'public/sprites/skills')
SHIRTS = os.path.join(ROOT, 'public/sprites/gear/shirt/tshirt')
CHESTS = os.path.join(ROOT, 'public/sprites/gear/chest/steelplate')
LEGS = os.path.join(ROOT, 'public/sprites/gear/legs/steelgreaves')
OUT_JS = os.path.join(ROOT, 'src/data/farmAnims.js')
PREVIEW = os.environ.get('PREVIEW')
VER = '2.3.3411'

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


def matte(c, B, drops=True):
    """(colour, alpha) of one cell, the magenta taken out with its blend."""
    d = from_bg(c, B)
    bgish = d < 60
    core = (d >= 150) & ~near(bgish)
    # the water's pale drops are painted half into the magenta: lilac, which
    # reads as solid -- they are water, as much of it as the green says.  Not
    # in a dressed sheet (drops=False): there the armour's pale steel, blended
    # into the magenta at its edges, is lilac too, and its tools and drops are
    # the bare sheet's anyway
    lilac = (c[..., 2] > 200) & (c[..., 0] > 110) & (c[..., 1] > 110) & (np.abs(c[..., 0] - c[..., 1]) < 70) \
        & (c[..., 0] < 225) & (c[..., 1] < 225) & drops
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

def eyes(rgb, alpha, win=None):
    """Middle of the two eyes and the head's width at them (ears to ears,
    outline included -- the convention the fire-lighter's 101 px is).  `win`
    keeps the search to a box: in a dressed frame the shirt is white and the
    armour's highlights nearly so."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    white = (alpha > 0.5) & (r > 200) & (g > 200) & (b > 200)
    if win is not None:
        white &= win
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


# ── 5. the shirt and the armour, from the dressed sheets ──────────────────

def eye_box(shape, ex, ey, hw):
    """The eyes and round them: white there is an eye, never cloth or steel."""
    yy, xx = np.indices(shape)
    return (np.abs(xx - ex) <= 0.45 * hw) & (np.abs(yy - ey) <= 0.22 * hw)


def legs_of(bare):
    """His trousers and boots in a bare frame.  The trousers are olive, as
    body_classes says, and greener than a dark-brown shading px it also lets
    through, in pieces of some size (one such px at a shoulder's edge once
    pulled the shoulder plate into the greaves); the boots grey with
    trousers just above them, as a boot always has (boots_anchor's rule, per
    pixel) -- not a grey edge of the can, or the hoe's blade."""
    K, tool = bare['K'], bare['tool']
    pants = K['pants'] & (bare['rgb'][..., 1] > 55) & ~tool
    lab, sizes = labels(pants)
    pants = (sizes[lab] >= 40) & (lab > 0)
    above = np.zeros_like(pants)
    for d in range(1, 61):      # a boot is up to ~50 px tall under its trousers
        above[d:] |= pants[:-d]
    # ...or beside them: kneeling, the boot lies behind the knee, its trousers
    # alongside, and a hand on the ground next to it would claim it as skin
    grey = K['grey'] & ~tool
    boots = grey & (above | dilate8(pants, 25))
    # v2.3.3411: ...or a grey piece of some size lying wholly below his
    # waist: nothing else of him is grey down there (the hoe and the can are
    # the tool).  The kneel's boot as he leans forward, its trousers hidden by
    # his arm, and the can's toe beside the splash lay further from their
    # trousers than either rule reaches -- so they were "skin", and showed
    # round the greaves (the two specks) and took their steel into the plate.
    if pants.any():
        waist = np.nonzero(pants)[0].min()
        glab, gsz = labels(grey)
        for i in np.nonzero(gsz >= 40)[0]:
            if i == 0:
                continue
            piece = glab == i
            if np.nonzero(piece)[0].min() > waist:
                boots |= piece
    return pants | boots


def bare_classes(bare):
    """What every pixel of a bare frame is nearest to: 1 his skin (arms,
    chest, neck, face: the painted skin, shading lines included), 2 his
    trousers or boots -- filled outwards over the outlines and past the
    body's edge, so steel drawn bulkier than the body still finds what it
    covers."""
    rgb, K = bare['rgb'], bare['K']
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    # (not the tool: the hoe's dirt is his skin's orange-brown, and once made
    # the boots beside it "skin", under the plate)
    skin = K['op'] & (r > g) & (g >= b) & (r - b > 30) & (r > 90) & (r - g > 25) & ~bare['tool']
    lab = np.zeros(K['op'].shape, np.int32)
    lab[skin | K['eye']] = 1
    lab[legs_of(bare)] = 2
    filled, depth = nearest_fill(lab > 0, lab[..., None], 80)
    return filled[..., 0]


def head_skin(rgb, al, ex, ey, hw):
    """His head's painted skin, in a box round it."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    yy, xx = np.indices(al.shape)
    box = (np.abs(xx - ex) <= 0.70 * hw) & (yy >= ey - 0.85 * hw) & (yy <= ey + 0.45 * hw)
    return box & (al > 0.5) & (r > g) & (g >= b) & (r - b > 30) & (r > 90) & (r - g > 25)


def register(bare, rgb, al, hw):
    """A dressed frame moved onto its bare frame by the head: the shift, at
    most 4 px each way, that lays its skin best on the bare frame's.  ChatGPT
    kept the pose -- measured, every frame within a px or two -- but not the
    eyes' whites: a pupil splits one of them in two, in pieces of other sizes
    in each drawing, so their middles wander."""
    A = head_skin(bare['rgb'], bare['al'], bare['ex'], bare['ey'], hw)
    best = None
    for oy in range(-4, 5):
        for ox in range(-4, 5):
            S = shift(head_skin(rgb, al, bare['ex'] - ox, bare['ey'] - oy, hw), ox, oy)
            score = int((A & S).sum()) - int((A ^ S).sum())
            if best is None or score > best[0]:
                best = (score, ox, oy)
    _, ox, oy = best
    if abs(ox) == 4 or abs(oy) == 4:
        raise SystemExit(f'a dressed frame is {ox},{oy} px or more off its bare frame: not the same pose')
    return shift(rgb, ox, oy), shift(al, ox, oy), (ox, oy)


def tee_layer(rgb, al, bare, cls, hw):
    """The white T-shirt and its black edge: grey-white cloth that is not an
    eye, not the tool, and not over his trousers or boots."""
    mx, mn = rgb.max(-1), rgb.min(-1)
    away = ~eye_box(al.shape, bare['ex'], bare['ey'], hw) & ~bare['tool']
    legs = legs_of(bare)
    cloth = (al > 0.5) & ((mx - mn) < 45) & (mx >= 150) & away & ~legs
    lab, sizes = labels(cloth)
    cloth = (sizes[lab] >= 30) & (lab > 0)
    edge = (al > 0.04) & (mx < 110) & dilate8(cloth, 2) & away & ~legs
    return cloth | edge


def armour_layers(rgb, al, bare, cls, hw):
    """The steel and its black edge -- no helmet, so nothing round the eyes --
    split by what is under it in the bare frame: over skin the PLATE (chest,
    arms, the gorget at his neck), over trousers and boots the GREAVES."""
    mx, mn = rgb.max(-1), rgb.min(-1)
    away = ~eye_box(al.shape, bare['ex'], bare['ey'], hw) & ~bare['tool']
    steel = (al > 0.5) & ((mx - mn) < 50) & (mx >= 40) & away
    lab, sizes = labels(steel)
    steel = (sizes[lab] >= 30) & (lab > 0)
    edge = (al > 0.04) & (mx < 60) & dilate8(steel, 2) & away
    m = steel | edge
    return m & (cls != 2), m & (cls == 2)


# ── 4. resampling ──────────────────────────────────────────────────────────

def resample(rgba, s):
    """Area resampling on premultiplied colour."""
    im = Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), 'RGBA').convert('RGBa')
    W, H = im.size
    im = im.resize((max(1, round(W * s)), max(1, round(H * s))), Image.BOX)
    return np.array(im.convert('RGBA')).astype(np.float32)


# ── main ───────────────────────────────────────────────────────────────────

def load_sheet(file):
    """(background colour, the 8 cells) of one of the owner's sheets."""
    src = np.array(Image.open(os.path.join(SRC, file)).convert('RGB')).astype(np.float32)
    return bg_colour(src), [src[(f // 4) * CH:(f // 4 + 1) * CH, (f % 4) * CW:(f % 4 + 1) * CW] for f in range(N)]


DRESSED = ('tee', 'armour')
LAYERS = ('body', 'prop', 'shirt', 'chest', 'legs', 'under')


def build(name, anchor, has_tool):
    B, cells = load_sheet(name + '.png')
    dressed = {v: load_sheet(f'{name}-{v}.png') for v in DRESSED}
    frames = []
    for f, c in enumerate(cells):
        rgb, al = matte(c, B)
        K = body_classes(rgb, al)
        ex, ey, hw = eyes(rgb, al)
        if anchor == 'boots':
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
        # the dressed copies of this frame, lined up on it, and their layers
        cls = bare_classes(fr)
        lay, moved = {}, {}
        for v, (Bv, cv) in dressed.items():
            vrgb, val = matte(cv[f], Bv, drops=False)
            vrgb, val, moved[v] = register(fr, vrgb, val, hw)
            if v == 'tee':
                m = tee_layer(vrgb, val, fr, cls, hw)
                lay['shirt'] = np.dstack([vrgb, np.where(m, val, 0) * 255])
            else:
                ch, lg = armour_layers(vrgb, val, fr, cls, hw)
                lay['chest'] = np.dstack([vrgb, np.where(ch, val, 0) * 255])
                lay['legs'] = np.dstack([vrgb, np.where(lg, val, 0) * 255])
        # the body under greaves: his trousers and boots where the armoured
        # legs are not -- between the legs, a boot's edge past the sabaton --
        # taken out, so with greaves on nothing of them shows through
        cut = (cls == 2) & (al > 0) & ~(lay['legs'][..., 3] > 127)
        under = body.copy()
        under[cut, 3] = 0
        lay['under'] = under
        body, prop = shift(body, dx, dy), shift(prop, dx, dy)
        lay = {k: shift(v, dx, dy) for k, v in lay.items()}
        crown = crown_of(shift(fr['K']['skin'], dx, dy), fr['ex'] + dx, fr['ey'] + dy)
        print(f'  f{f}: shift ({dx:+d},{dy:+d})  eyes ({fr["ex"] + dx:.0f},{fr["ey"] + dy:.0f})  '
              f'crown {crown}  tool {int(tool.sum())} px  dressed moved {moved}  '
              + '  '.join(f'{k} {int((v[..., 3] > 127).sum())} px' for k, v in lay.items()))
        out.append(dict(body=body, prop=prop, crown=crown, eyes=(fr['ex'] + dx, fr['ey'] + dy), **lay))
    # one box round every frame, at the strip's scale
    seen = np.zeros((CH, CW), bool)
    for o in out:
        for k in LAYERS:
            seen |= o[k][..., 3] > 4
    ys, xs = np.nonzero(seen)
    pad = int(np.ceil((MARGIN + 1) / s))
    x0, x1 = max(0, xs.min() - pad), min(CW, xs.max() + 1 + pad)
    y0, y1 = max(0, ys.min() - pad), min(CH, ys.max() + 1 + pad)
    # snap the box so the anchor lands on whole strip px
    fw, fh = round((x1 - x0) * s), round((y1 - y0) * s)
    strips = {k: [] for k in LAYERS}
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
    out_['ink'] = ink_regions(out_)
    return out_


# ── your drawings on him (v2.3.3411) ───────────────────────────────────────
# The game stamps your face, chest and arm drawings on a pre-drawn figure from
# a table per frame (src/rendering/standInInk.js, read by playerSkins
# _stampStandInInk): seed points the head, torso and arms flood out from over
# the skin the game finds (playerDecal splitSkinBySeeds, a 4-connected flood
# that the painted outlines stop), and the head's and the torso's whole boxes,
# which the face and chest drawings are fitted into.  The lumberjack's, the
# cook's and the fire-lighter's were fitted by eye; these are measured here,
# from what this tool already knows of every frame: his eyes, his head's size,
# and the white tee drawn on him -- where the tee is, his torso is.

def game_skin(strip):
    """The skin the game's stand-in bake finds on a strip frame:
    playerSkins _isSkin, in pieces of FARM_MIN_BLOB (12) px or more, 4-way."""
    r, g, b, a = (strip[..., i] for i in range(4))
    sk = (a > 40) & (r > g) & (g >= b) & (r - b > 30) & (r > 90) & (r - g > 25)
    lab, sizes = labels(sk, diag=False)
    return (sizes[lab] >= 12) & (lab > 0)


def _seed_points(mask, most, least=6):
    """Points well inside each piece of a mask (4-way pieces of 6+ px), the
    biggest first: one in every piece -- a hand cut off from its arm by the
    can's outline, unseeded, is taken by whichever flood reaches it -- and in
    the two biggest, a quarter and three quarters of the way down as well.
    Every piece's own point comes before those extras, so `most` cuts the
    extras first: the other way round, the torso's six went to his chest and
    one shoulder, and the other shoulder, leaning up beside his face, went
    to the head's flood."""
    lab, sizes = labels(mask, diag=False)
    mids, extras = [], []
    order = [i for i in np.argsort(-sizes) if i > 0 and sizes[i] >= least]
    for rank, i in enumerate(order):
        ys, xs = np.nonzero(lab == i)
        cy, cx = ys.mean(), xs.mean()
        targets = (cy, np.quantile(ys, 0.25), np.quantile(ys, 0.75)) if rank < 2 else (cy,)
        for j, ty in enumerate(targets):
            k = np.argmin((ys - ty) ** 2 + (xs - cx) ** 2)
            (extras if j else mids).append([int(xs[k]), int(ys[k])])
    pts = []
    for pt in mids + extras:
        if pt not in pts:
            pts.append(pt)
    return pts[:most]


def _across(head):
    """Lines across the head, its own edge to edge 2 px in, at 60% and 85% of
    the way down it (his cheeks and his jaw) -- [x0, y, x1, y], a line the
    game's splitSkinBySeeds seeds on every skin pixel it crosses."""
    ys, xs = np.nonzero(head)
    t, b = ys.min(), ys.max()
    out = []
    for k in (0.6, 0.85):
        y = int(round(t + k * (b - t)))
        row = xs[ys == y]
        if row.size and row.max() - row.min() > 8:
            out.append([int(row.min()) + 2, y, int(row.max()) - 2, y])
    return out


def ink_regions(a):
    """Where your drawings go on him, in the shape standInInk.js's hand-fitted
    tables have (the lumberjack's, the cook's, the fire-lighter's), measured
    here instead of by eye.  Per frame: seeds {head, torso, arms} (points
    [x, y] and lines [x0, y0, x1, y1] the game's split floods out from), the
    face's and the torso's boxes [left, right, top, bottom], and armCuts, frame
    px.  PREVIEW draws each frame as the game splits it (ink-<name>.png)."""
    S, hw = a['strips'], HEAD_PX
    seeds, faces, torsos, cuts = [], [], [], []
    # the tee's height down his middle in each frame, neckline to hem -- the
    # can held at his belly hides the lower half of it on four of the
    # watering frames, so no frame's torso is taken as under 90% of the
    # move's middling one
    def tee_span(f):
        tee = S['shirt'][f][..., 3] > 127
        ex = a['eyes'][f][0]
        xx = np.arange(tee.shape[1])[None, :]
        mid = tee & (np.abs(xx - ex) <= 0.3 * hw)
        wide = tee & (np.abs(xx - ex) <= 1.2 * hw)
        if not mid.any() or not wide.any():
            return None
        return int(np.nonzero(mid)[0].min()), int(np.nonzero(wide)[0].max())
    spans = [tee_span(f) for f in range(N)]
    tall = float(np.median([b - t for t, b in (sp for sp in spans if sp)]))
    for f in range(N):
        skin = game_skin(S['body'][f])
        tee = S['shirt'][f][..., 3] > 127
        ex, ey = a['eyes'][f]
        yy, xx = np.indices(skin.shape)
        # the head: crown to chin, ears to ears (his head is hw across at the
        # eyes) -- no wider: leaning over the bed, his shoulders come up
        # beside his face, and a box as wide as the cutting's own took them
        chin = ey + 0.45 * hw
        crown = a['crowns'][f][1]
        hbox = (np.abs(xx - ex) <= 0.55 * hw) & (yy >= crown - 2) & (yy <= chin)
        # ...and round, as a head is, hw across round the head's own middle
        # (the crown's x: the eyes' middle sits a pixel or two off it): the
        # tops of his shoulders reach into the box's lower corners as he leans
        # over the bed, joined to his face by skin, and are the torso's.  Round
        # the eyes' middle and 1.1 hw across, three of the kneel's frames took
        # 7 px of shoulder, and their face boxes were 65-66 px wide against
        # the 57-60 of every other frame -- the face drawing stretched a
        # seventh wider as he leant in
        hx = a['crowns'][f][0]
        cy, ry = (crown + chin) / 2, (chin - crown) / 2 + 2
        round_ = ((xx - hx) / (0.5 * hw)) ** 2 + ((yy - cy) / ry) ** 2 <= 1
        lab, sizes = labels(skin & hbox & round_, diag=False)
        head = lab == int(np.argmax(sizes[1:]) + 1)
        # his shoulders: under the tee beside his jaw, where they come up as
        # he leans or bends to the bed -- below the eyes (never the crown's
        # corners) and off his middle (never his neck, which joined the two
        # into one piece seeded at its middle); never bare skin, which there
        # is an arm raised past his face (the hoe's lift)
        side = np.abs(xx - hx) > 0.3 * hw
        shoulders = skin & tee & hbox & ~head & (yy > ey) & side
        ys, xs = np.nonzero(head)
        faces.append([int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())])
        # the torso: under the tee, in a band down his middle (the sleeves'
        # upper arms are left to the arms' flood) -- and its whole box, the
        # tee's, neckline to hem, hidden parts included (an arm or the can in
        # front of it hides some, and the drawing holds still behind them, as
        # the hand-fitted tables do), 0.38 of his head either side of it:
        # the tee's half-width below the sleeves wherever it shows (24 px,
        # measured on the upright frames of all three moves)
        t, bot = spans[f] if spans[f] else (int(chin), int(chin + tall))
        # ...and his neck, between the chin and the tee, is the torso's too --
        # down to the tee's neckline AT HIS MIDDLE, not to its top in the
        # band: with the hoe raised the shoulder seams rise past the collar,
        # and the collar's lower half, taken for bare arm and seeded so,
        # joined his two raised arms into one piece across his chest (one arm
        # drawing stretched over both)
        fb = faces[-1][3]
        col = tee & (np.abs(xx - hx) <= 3) & (yy > fb)
        neckline = int(np.nonzero(col)[0].min()) if col.any() else t
        neckline = min(max(neckline, t), int(fb + 0.4 * hw))
        neck = skin & ~tee & (np.abs(xx - hx) <= 0.3 * hw) & (yy > min(chin, fb)) & (yy <= neckline + 2)
        torso = (skin & tee & (np.abs(xx - ex) <= 0.55 * hw) & (yy > chin)) | neck
        bot = max(bot, int(round(t + 0.9 * tall)))
        half = 0.38 * hw
        torsos.append([int(round(ex - half)), int(round(ex + half)), t, min(bot, a['fh'] - 1)])
        # the arms: his skin outside the tee and the head's box
        arms = skin & ~dilate8(tee, 1) & ~hbox & ~neck
        # the shoulders seeded each on its own, apart from the chest: run into
        # it under the tee, they were one piece with it, seeded at its middle,
        # and on the kneel's third frame the head's flood reached the right
        # one first through the skin it shares with his jaw (40 px or more: a
        # sleeve's corner by his face as the hoe goes up is the arm's)
        # -- seeded a few pixels clear of his face, and his face seeded right
        # across, at his cheeks and at his jaw: the shoulder's seed by the
        # jaw on the hoe's strike flooded up his cheek before the head's flood
        # got there from the middle of his face
        shoulders &= ~dilate8(head, 4)
        sd = {'head': _seed_points(head, 3) + _across(head),
              'torso': _seed_points(torso, 6)
              + _seed_points(shoulders & (xx < hx), 2, least=40)
              + _seed_points(shoulders & (xx > hx), 2, least=40),
              'arms': _seed_points(arms, 12)}
        _fence_chin(skin, sd, faces[-1])
        seeds.append(sd)
        cuts.append(_arm_cuts(skin, sd, hx, hw))
    return {'seeds': seeds, 'face': faces, 'torso': torsos, 'armCuts': cuts}


def _arm_cuts(skin, sd, hx, hw):
    """Where his two hands hold the hoe together his arms are one piece of
    skin, and the game fits the arm drawing to each piece's box: one drawing
    stretched over both arms and the gap between them, on the strike's two
    frames, where every other frame has one on each arm.  So such a piece is
    cut down the column, near his middle, where it is thinnest -- [x, top,
    bottom] runs the bake leaves out of the arms (a pixel's width of the hands
    without ink) -- and the two halves are the two arms again."""
    lab = split_like_the_game(skin, sd)
    al, sz = labels(lab == 3, diag=False)
    out = []
    for i in range(1, len(sz)):
        piece = al == i
        xs = np.nonzero(piece.any(0))[0]
        if not (xs.min() < hx - 0.3 * hw and xs.max() > hx + 0.3 * hw):
            continue
        cols = range(int(hx - 0.25 * hw), int(hx + 0.25 * hw) + 1)
        x = min((c for c in cols if piece[:, c].any()), key=lambda c: piece[:, c].sum())
        runs = _runs(piece[:, x])
        cut = piece.copy()
        cut[:, x] = False
        halves = sorted(labels(cut, diag=False)[1][1:], reverse=True)
        if len(halves) < 2 or halves[1] < 0.35 * halves[0]:
            raise SystemExit(f'no clean cut between the arms (column {x}: {halves[:3]})')
        out += [[x, y0, y1] for y0, y1 in runs]
    return out


def _runs(row):
    """[x0, x1] of each run of True in a row."""
    xs = np.nonzero(row)[0]
    if not xs.size:
        return []
    cut = np.nonzero(np.diff(xs) > 1)[0]
    starts = np.r_[xs[0], xs[cut + 1]]
    ends = np.r_[xs[cut], xs[-1]]
    return [[int(s), int(e)] for s, e in zip(starts, ends)]


def _fence_chin(skin, sd, face):
    """Nothing under his chin is his face.  Leaning over the bed his jaw's
    corners run down beside his neck as skin, past the chin's outline, and the
    head's flood followed them into the top corners of the chest drawing's box
    (57-105 px on four of the kneel's frames: holes in the drawing).  So where
    the game's split would do that, the row under the face's box is seeded as
    torso and the face's last row as head -- the head's seeds go first in the
    flood's queue, so the face keeps its own last row -- until the split
    leaves no face below its box."""
    b = face[3]
    for _ in range(4):
        lab = split_like_the_game(skin, sd)
        if not (lab[b + 1:] == 1).any():
            return
        for x0, x1 in _runs(lab[b + 1] == 1):
            sd['torso'].append([x0, b + 1, x1, b + 1])
        row = (lab[b] == 1)
        row[:face[0]] = False
        row[face[1] + 1:] = False
        for x0, x1 in _runs(row):
            line = [x0, b, x1, b]
            if line not in sd['head']:
                sd['head'].append(line)
    raise SystemExit(f'the face flood still runs under the chin (face box {face})')


def seed_pixels(pl):
    """playerDecal _seedLine: [x, y] is a point, a longer list a polyline
    through its points, every pixel along it (Math.round)."""
    rnd = lambda v: int(np.floor(v + 0.5))
    if len(pl) == 2:
        return [(rnd(pl[0]), rnd(pl[1]))]
    out = []
    for i in range(0, len(pl) - 3, 2):
        ax, ay, bx, by = pl[i:i + 4]
        n = max(1, int(np.ceil(max(abs(bx - ax), abs(by - ay)))))
        out += [(rnd(ax + (bx - ax) * k / n), rnd(ay + (by - ay) * k / n)) for k in range(n + 1)]
    return out


def split_like_the_game(skin, sd):
    """playerDecal splitSkinBySeeds on one frame: the head's, then the
    torso's, then the arms' seeds queued, one 4-way flood from all of them
    (first come keeps a pixel), and skin no flood reached is arm."""
    H, W = skin.shape
    lab = np.zeros((H, W), np.uint8)
    q = deque()
    for i, k in ((1, 'head'), (2, 'torso'), (3, 'arms')):
        for pl in sd[k]:
            for x, y in seed_pixels(pl):
                if 0 <= x < W and 0 <= y < H and skin[y, x] and not lab[y, x]:
                    lab[y, x] = i
                    q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((0, -1), (0, 1), (-1, 0), (1, 0)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and skin[ny, nx] and not lab[ny, nx]:
                lab[ny, nx] = lab[y, x]
                q.append((ny, nx))
    lab[skin & (lab == 0)] = 3
    return lab


def preview_ink(a):
    """Where your drawings would go on every frame, as the game splits him:
    head red, torso green, arms blue, the face's box yellow, the torso's cyan."""
    fw, fh, Z = a['fw'], a['fh'], 3
    cells = []
    for f in range(N):
        body = a['strips']['body'][f]
        img = np.zeros((fh, fw, 3), np.float32) + (40, 40, 48)
        al = body[..., 3:4] / 255
        img = body[..., :3] * al + img * (1 - al)
        lab = split_like_the_game(game_skin(body), a['ink']['seeds'][f])
        for x, y0, y1 in a['ink']['armCuts'][f]:
            lab[y0:y1 + 1, x] = 0
        for i, c in ((1, (230, 60, 60)), (2, (60, 200, 90)), (3, (70, 110, 240))):
            img[lab == i] = img[lab == i] * 0.35 + np.array(c) * 0.65
        for box, c in ((a['ink']['face'][f], (255, 230, 0)), (a['ink']['torso'][f], (0, 230, 255))):
            l, r, t, b = box
            img[t, l:r + 1] = c; img[b, l:r + 1] = c; img[t:b + 1, l] = c; img[t:b + 1, r] = c
        for k in ('head', 'torso', 'arms'):
            for pl in a['ink']['seeds'][f][k]:
                for x, y in seed_pixels(pl):
                    img[max(0, y - 1):y + 2, max(0, x - 1):x + 2] = (255, 255, 255)
        cells.append(img)
    sheet = np.concatenate(cells, axis=1)
    im = Image.fromarray(np.clip(sheet, 0, 255).astype(np.uint8))
    im = im.resize((im.width * Z, im.height * Z), Image.NEAREST)
    im.save(os.path.join(PREVIEW, f'ink-{a["name"]}.png'))


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
    for name, anchor, tool in ANIMS:
        a = build(name, anchor, tool)
        bw, bh = save_strip(a['strips']['body'], os.path.join(SKILLS, f'farm-{name}.png'))
        save_strip(a['strips']['under'], os.path.join(SKILLS, f'farm-{name}-greaves.png'))
        if tool:
            save_strip(a['strips']['prop'], os.path.join(SKILLS, f'farm-{name}-prop.png'))
        save_strip(a['strips']['shirt'], os.path.join(SHIRTS, f'farm{name}-south.png'))
        save_strip(a['strips']['chest'], os.path.join(CHESTS, f'farm{name}-south.png'))
        save_strip(a['strips']['legs'], os.path.join(LEGS, f'farm{name}-south.png'))
        print(f'  -> farm-{name}.png {bw}x{bh} ({a["fw"]}x{a["fh"]} x{N}), foot {a["foot"]}, work {a["work"]}')
        made.append(a)
        if PREVIEW:
            preview(a)
            preview_ink(a)
    write_js(made)


def write_js(made):
    lines = [
        "/* v2.3.3411: GENERATED by tools/make_farm_anims.py -- do not edit by hand;",
        "   run the tool again.  The farmer's three animations, cut from the owner's",
        "   three sheets (tools/farm_anim_src): the hoe for digging, the watering can",
        "   for watering, kneeling with his hands in the soil for planting, the",
        "   compost and the harvest.  Each strip is N frames of fw x fh side by side",
        "   (public/sprites/skills/farm-<name>.png, the tool apart in farm-<name>-prop.png",
        "   for the two that hold one; `under` the body worn under greaves, its trousers",
        "   and boots trimmed to the armoured legs; the shirt, plate and greaves in",
        "   gear/{shirt/tshirt,chest/steelplate,legs/steelgreaves}/farm<name>-south.png),",
        "   drawn so its head is FARM_ANIM_HEAD px wide ears to ears: `foot` is the point between",
        "   his boots on the ground, frame px, `work` where the work happens (the",
        "   blade striking, the water landing, the hands in the soil: the bits fly",
        "   from there), `crowns` the top of his head in each frame (the hat sits",
        "   there), and `ink` where your drawings go on him, in the shape of the",
        "   hand-fitted tables in rendering/standInInk.js (playerSkins",
        "   _stampStandInInk).  docs/specs/farm-walk.md \"The farmer's own moves\". */",
        f"export const FARM_ANIM_HEAD = {HEAD_PX};",
        "export const FARM_ANIMS = Object.freeze({",
    ]
    for a in made:
        n = a['name']
        prop = f"'/sprites/skills/farm-{n}-prop.png?v={VER}'" if a['has_tool'] else 'null'
        crowns = ', '.join(f'[{c[0]}, {c[1]}]' for c in a['crowns'])
        lines.append(f"  {n}: Object.freeze({{ url: '/sprites/skills/farm-{n}.png?v={VER}', "
                     f"under: '/sprites/skills/farm-{n}-greaves.png?v={VER}', prop: {prop}, "
                     f"pose: 'farm{n}', fw: {a['fw']}, fh: {a['fh']}, n: {N}, "
                     f"foot: Object.freeze([{a['foot'][0]}, {a['foot'][1]}]), "
                     f"work: Object.freeze([{a['work'][0]}, {a['work'][1]}]), "
                     f"crowns: Object.freeze([{crowns}]),")
        ink, js = a['ink'], lambda v: json.dumps(v, separators=(', ', ': '))
        lines.append(f"    ink: Object.freeze({{ fw: {a['fw']}, fh: {a['fh']},")
        lines.append("      seeds: [")
        for sd in ink['seeds']:
            lines.append(f"        {{ head: {js(sd['head'])}, torso: {js(sd['torso'])}, arms: {js(sd['arms'])} }},")
        lines.append("      ],")
        lines.append(f"      face: {js(ink['face'])},")
        lines.append(f"      torso: {js(ink['torso'])},")
        lines.append(f"      armCuts: {js(ink['armCuts'])} }}) }}),")
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
    pa = (a > 180) & (g >= r - 10) & (g > b + 8) & (r < 150) & (g > 55)
    lab, sizes = labels(pa)     # in pieces of some size: never an outline px
    pa = (sizes[lab] >= 40) & (lab > 0)
    mx, mn = rgb.max(-1), rgb.min(-1)
    # a boot is grey with trousers above it or beside it, as the game's own
    # repaint has it (playerSkins _standInClothes) -- never the grey round an
    # eye, which a rule of grey alone painted the boots' colour
    near = np.zeros_like(pa)
    for d in range(1, 61):
        near[d:] |= pa[:-d]
    near |= dilate8(pa, 25)
    bo = (a > 180) & ((mx - mn) < 28) & (mx >= 45) & (mx < 140) & near
    for m, t, ref in ((sk, skin_t, 149), (pa, pants_t, 112), (bo, boots_t, 75)):
        k = (lum[m] / ref)[:, None]
        rgb[m] = np.clip(np.array(t)[None] * k, 0, 255)
    return np.dstack([rgb, a])


def over(dst, src):
    a = src[..., 3:4] / 255
    dst[..., :3] = src[..., :3] * a + dst[..., :3] * (1 - a)
    return dst


def preview(a):
    """Every outfit the game can put together, on grass, in a made-up look:
    bare; the shirt; plate and greaves; the shirt and greaves; the plate
    over trousers -- the mixed ones are where a misfit between the sheets
    would show."""
    fw, fh = a['fw'], a['fh']
    Z = 2
    look = ((90, 56, 38), (50, 70, 160), (160, 40, 40))
    green = np.array((60, 170, 90)) / 255
    rows = []
    for outfit in ((), ('shirt',), ('legs', 'chest'), ('legs', 'shirt'), ('chest',)):
        row = []
        for f in range(N):
            bgc = np.zeros((fh, fw, 4), np.float32)
            bgc[..., :3] = (96, 140, 70)        # grass
            bgc[..., 3] = 255
            body = a['strips']['under' if 'legs' in outfit else 'body'][f]
            over(bgc, recolour(body, *look))
            for k in outfit:
                if k == 'shirt' and 'chest' in outfit:
                    continue
                lay = a['strips'][k][f].copy()
                if k == 'shirt':
                    lay[..., :3] = lay[..., :3] * green[None, None]
                over(bgc, lay)
            if a['has_tool']:
                over(bgc, a['strips']['prop'][f])
            row.append(bgc)
        rows.append(np.concatenate(row, axis=1))
    sheet = np.concatenate(rows, axis=0)
    im = Image.fromarray(np.clip(sheet, 0, 255).astype(np.uint8)[..., :3])
    im = im.resize((im.width * Z, im.height * Z), Image.NEAREST)
    os.makedirs(PREVIEW, exist_ok=True)
    im.save(os.path.join(PREVIEW, f'preview-{a["name"]}.png'))


if __name__ == '__main__':
    main()
