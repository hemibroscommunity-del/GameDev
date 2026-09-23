#!/usr/bin/env python3
"""v2.3.2652: per-frame fixes for a species piece -- the shared compositor plus
the baker.

WHY.  A species piece (public/sprites/traits/species/<id>/) is ONE image per
facing, placed on every frame by _placeTrait's crown-anchored arithmetic.  That
holds while the head keeps its shape, and the head does not always: the hit
flinch turns and tilts it, pickup tips it down, mining raises a pickaxe past
it.  tools/species_contact_sheet.py shows every frame; the ones that look wrong
get an entry in tools/species-fixes/<id>.json and this tool BAKES those frames
into small overlay images drawn instead of the piece for just those frames.

A fix is expressed against the normal placement, per frame (or frame range
"a-b"), in the body's 256-space:
    "<part>": {"dx": 0, "dy": 0, "s": 1.0, "rot": 0, "hide": false}
        move / scale / rotate (degrees CLOCKWISE on screen; both about the
        part's own centre) / drop one PART of the piece.  The
        parts are the piece's separate blobs: "muzzle" (the lowest blob, on
        facings that have one), then the ears left-to-right, "earL" / "earR"
        (or "ear" when there is only one).
    "cover": [[x0, x1, y0, y1, "fur" | "muzzle"], ...]
        paint the body's non-flat-tone INTERIOR pixels inside the box -- the
        old human ear, the gritted teeth -- plus a 1px ring, in the head's fur
        tone (the retinted skin around it) or the muzzle's tan.
    "crown": [x, y]
        use this as the frame's head top instead of body-tops.json.  body-tops
        is the TOPMOST opaque pixel, which on a few hit frames (north 3-4,
        northeast 3-5) is the raised fist, not the head -- the parts are then
        placed against the real head.
    "eyes": [[x0, x1, y0, y1], ...]
        v2.3.2654: paint the eye's white stripe (EYE_WHITE) over the body's
        DARK pixels inside the box.  Standing, an eye is a black block with a
        white stripe down its left side (the region eyeMask.json recolours);
        on pickup 16-27 and every fish frame the art draws the eye as a solid
        dark blob and eyeMask has no entry, so on fur it reads as a black hole.
        The boxes are generated from the eye blobs, not hand-drawn.
    "front": [[x0, x1, y0, y1], ...]
        inside the box, the body's TOOL pixels -- blue-grey metal (not skin,
        blue >= red, lum > 90: the pickaxe) plus the dark outline touching
        them -- are drawn IN FRONT of the piece: the piece is cut away there.
        Only the tool: cutting every non-skin pixel would also punch the head's
        own outline through the ears.

OUTPUT (bake).  For each pose-dir with fixes: one strip PNG
    public/sprites/traits/species/<id>/frames/<pose>-<dir>.png
holding the baked frames side by side, cropped to what they draw, and in the
piece's meta.json:
    "frameOverlays": {"<pose>-<dir>": {"<frame>": [sx, sy, w, h, x, y]}}
i.e. the overlay for that frame is the strip's rect (sx, sy, w, h), and its
top-left pixel sits on BODY pixel (x, y) of that frame (256-space).  It is
drawn with the body's own scale and mirror and replaces the piece for that
frame -- no anchor, nudge or pose scale applies, it is already in body space.

FUR (v2.3.2655).  Every fur pixel this pipeline paints -- the old-ear patches
in the SW/NE art (tools/species-cover-ears.mjs) and the "fur" covers here -- is
the species tone scaled by the head's luminance, i.e. it is SKIN, baked in one
skin colour.  So that the piece follows whatever skin the player picks (the
muzzle and ears stay their own tan: the piece itself is never recoloured), the
bake also writes each image's fur as a separate layer, same size and placement,
stored as BARE SKIN -- the art's own skin colour right around each patch, in
that frame (so the 'default' skin, drawn unrecoloured, matches the art):
    <dir>.fur.png                 beside each base facing that has fur
    frames/<pose>-<dir>.fur.png   beside each strip that has fur (same rects)
The renderer runs that layer through the SAME per-pixel skin recolour the body
sheets get (playerSkins _isSkin/_retint, target * lum/SKIN_REF) and draws it
over the piece; for the 'default' skin it draws it as stored.  Bare skin rather
than a grey for a Pixi tint because a tint is 0-255 and the fur runs up to 1.07x
SKIN_REF on the brighter hit heads -- a grey clipped those (measured: 6 levels
off); skin-coloured art has the same headroom the body has.  meta.fur lists
which files exist.

Run from the repo root:
    python3 tools/species_frames.py bake --id monkey
"""
import argparse
import json
import os
import re
import numpy as np
from PIL import Image
from scipy import ndimage

BODY = 'public/sprites/player/{pose}-{dir}.png'
TOPS_PATH = 'public/sprites/player/body-tops.json'
TRAIT = 'public/sprites/traits/species/{id}'
FIXES = 'tools/species-fixes/{id}.json'
SKIN_REF = 149
TONES = {'monkey': (85, 56, 23)}
FRAME = 256
MUZZLE_DIRS = ('south', 'southwest', 'east')


def is_skin(p):
    r, g, b, a = [p[..., i].astype(int) for i in range(4)]
    return (a > 40) & (r > g) & (g >= b) & ((r - b) > 30) & (r > 90) & ((r - g) > 25)


def lum(p):
    return 0.299 * p[..., 0] + 0.587 * p[..., 1] + 0.114 * p[..., 2]


def body_frame(pose, d, f):
    """the raw body frame, upscaled to 256-space the way the game draws it"""
    sheet = Image.open(BODY.format(pose=pose, dir=d)).convert('RGBA')
    fw = sheet.height
    # TRAPS §93: a strip is not always a row of SQUARE frames (sword-east is
    # 402x246).  Every sheet a species piece rides is; refuse one that is not
    # rather than silently measure a window straddling two figures.
    if sheet.width % fw or f >= sheet.width // fw:
        raise SystemExit(f'{pose}-{d}: {sheet.width}x{fw} is not a row of square frames '
                         f'(or frame {f} is past its end) -- see docs/TRAPS.md §93')
    return np.array(sheet.crop((f * fw, 0, (f + 1) * fw, fw))
                    .resize((FRAME, FRAME), Image.NEAREST)).astype(int)


def retint(body, tone):
    skin = is_skin(body)
    k = lum(body) / SKIN_REF
    out = body.copy()
    for i, c in enumerate(tone):
        out[:, :, i] = np.where(skin, np.minimum(255, np.round(c * k)), body[:, :, i])
    return out


def pose_mul(meta, pose, d):
    """_placeTrait's size factor, with the eyewear path's tune (hairPoseTune)"""
    fit = meta.get('poseFit')
    legacy = {'mine': 1.21, 'fish': 0.88}.get(pose, 0.67 if (pose, d) == ('jog', 'east') else 1)
    tune = 1.40 if (pose, d) == ('jog', 'east') else 1
    return (meta.get('scale', {}).get(d, 1)
            * meta.get('scaleByPose', {}).get(pose, {}).get(d, 1)
            * (1 if fit else legacy) * (1 if fit else tune))


def parts(tex, d):
    """split the piece into its separate blobs, named"""
    lab, n = ndimage.label(tex[:, :, 3] > 16, structure=np.ones((3, 3)))
    blobs = []
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(xs) < 20:          # specks ride with the nearest real part
            continue
        blobs.append((i, xs.min(), ys.max()))
    named = {}
    if d in MUZZLE_DIRS and blobs:
        mz = max(blobs, key=lambda b: b[2])
        named['muzzle'] = mz[0]
        blobs = [b for b in blobs if b is not mz]
    blobs.sort(key=lambda b: b[1])
    names = ['ear'] if len(blobs) == 1 else ['earL', 'earR']
    for nm, b in zip(names, blobs):
        named[nm] = b[0]
    # specks (and anything unnamed) join the nearest named part
    owner = np.zeros(n + 1, int)
    for nm, i in named.items():
        owner[i] = i
    cents = {i: np.argwhere(lab == i).mean(0) for i in named.values()}
    for i in range(1, n + 1):
        if owner[i] == 0:
            c = np.argwhere(lab == i).mean(0)
            owner[i] = min(cents, key=lambda j: ((cents[j] - c) ** 2).sum())
    out = {}
    for nm, i in named.items():
        m = np.isin(lab, [j for j in range(1, n + 1) if owner[j] == i])
        out[nm] = np.where(m[..., None], tex, 0)
    return out


def place(pose, d, f, meta, tops, tex, ops=None):
    """the piece as _placeTrait draws it on this frame, as a 256x256 RGBA layer,
    with optional per-part ops"""
    ops = ops or {}
    mul = pose_mul(meta, pose, d)
    a = meta['anchors'][d]
    n = meta.get('crownNudge', {}).get(d, [0, 0])
    pn = meta.get('poseNudge', {}).get(pose, {}).get(d, [0, 0])
    top = ops.get('crown') or tops.get(f'{pose}-{d}-{f}') or tops[f'stand-{d}-0']
    layer = np.zeros((FRAME, FRAME, 4), int)
    part_ops = any(k in ops for k in ('muzzle', 'earL', 'earR', 'ear'))
    pieces = parts(tex, d) if part_ops else {'all': tex}   # no part ops: one piece, same offset
    for nm, pt in pieces.items():
        op = ops.get(nm) or {}
        if op.get('hide'):
            continue
        sz = max(1, round(FRAME * mul))
        img = np.array(Image.fromarray(pt.astype(np.uint8)).resize((sz, sz), Image.NEAREST)).astype(int)
        ys, xs = np.nonzero(img[:, :, 3] > 16)
        if not len(xs):
            continue
        ratio = op.get('s', 1.0)
        rot = op.get('rot', 0)
        ox = top[0] + n[0] + pn[0] - a[0] * mul + op.get('dx', 0)
        oy = top[1] + n[1] + pn[1] - a[1] * mul + op.get('dy', 0)
        if ratio == 1.0 and not rot:
            X = np.round(xs + ox).astype(int)
            Y = np.round(ys + oy).astype(int)
            ok = (X >= 0) & (Y >= 0) & (X < FRAME) & (Y < FRAME)
            layer[Y[ok], X[ok]] = img[ys[ok], xs[ok]]
            continue
        # scale and/or rotate about the part's own bbox centre
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
        crop = img[y0:y1 + 1, x0:x1 + 1].astype(np.uint8)
        out = transform(crop, ratio, rot)
        cx, cy = (x0 + x1) / 2 + ox, (y0 + y1) / 2 + oy
        h, w = out.shape[:2]
        px0, py0 = int(round(cx - (w - 1) / 2)), int(round(cy - (h - 1) / 2))
        oy_, ox_ = np.nonzero(out[:, :, 3] > 16)
        X, Y = ox_ + px0, oy_ + py0
        ok = (X >= 0) & (Y >= 0) & (X < FRAME) & (Y < FRAME)
        layer[Y[ok], X[ok]] = out[oy_[ok], ox_[ok]]
    layer[:, :, 3] = np.where(layer[:, :, 3] > 16, 255, 0)
    return layer


UP = 4


def transform(crop, ratio, rot):
    """scale by `ratio` and rotate `rot` degrees CLOCKWISE (screen), pixel-art
    safe: done at UPx nearest-neighbour, then brought back down by taking each
    UPxUP block's most common colour -- so the outline stays one clean pixel
    and no in-between colours appear (the RotSprite idea, simplified)."""
    im = Image.fromarray(crop, 'RGBA')
    big = im.resize((max(1, round(im.width * UP * ratio)), max(1, round(im.height * UP * ratio))), Image.NEAREST)
    if rot:
        big = big.rotate(-rot, resample=Image.NEAREST, expand=True)
    b = np.array(big)
    H, W = b.shape[0] // UP * UP + UP, b.shape[1] // UP * UP + UP
    pad = np.zeros((H, W, 4), np.uint8)
    pad[:b.shape[0], :b.shape[1]] = b
    pad[:, :, 3] = np.where(pad[:, :, 3] > 16, 255, 0)
    h, w = H // UP, W // UP
    out = np.zeros((h, w, 4), np.uint8)
    blocks = pad.reshape(h, UP, w, UP, 4).transpose(0, 2, 1, 3, 4).reshape(h, w, UP * UP, 4)
    key = (blocks[..., 0].astype(np.int64) << 24 | blocks[..., 1].astype(np.int64) << 16
           | blocks[..., 2].astype(np.int64) << 8 | blocks[..., 3])
    for yy in range(h):
        for xx in range(w):
            v, c = np.unique(key[yy, xx], return_counts=True)
            k = v[c.argmax()]
            out[yy, xx] = [(k >> 24) & 255, (k >> 16) & 255, (k >> 8) & 255, k & 255]
    return out.astype(int)


def muzzle_tan(tex, d):
    p = parts(tex, d).get('muzzle')
    if p is None:
        return (145, 118, 94)
    px = p[p[:, :, 3] > 16][:, :3]
    px = px[lum(px) > 90]
    vals, counts = np.unique(px, axis=0, return_counts=True)
    return tuple(int(v) for v in vals[counts.argmax()])


def apply_cover(layer, body_raw, boxes, tone, tan):
    op = body_raw[:, :, 3] > 40
    inter = op.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            inter &= np.roll(np.roll(op, dy, 0), dx, 1)
    skin = is_skin(body_raw)
    L = lum(body_raw)
    for x0, x1, y0, y1, kind in boxes:
        box = np.zeros_like(op)
        box[y0:y1 + 1, x0:x1 + 1] = True
        ring = np.zeros_like(op)
        ring[max(0, y0 - 4):y1 + 5, max(0, x0 - 4):x1 + 5] = True
        base = np.median(L[ring & skin]) if (ring & skin).any() else SKIN_REF
        target = (box & inter & (layer[:, :, 3] == 0)
                  & (~skin | (np.abs(L - base) > 4)))
        grow = ndimage.binary_dilation(target, np.ones((3, 3))) & inter & (layer[:, :, 3] == 0)
        col = tan if kind == 'muzzle' else tuple(min(255, round(c * base / SKIN_REF)) for c in tone)
        for i in range(3):
            layer[:, :, i] = np.where(grow, col[i], layer[:, :, i])
        layer[:, :, 3] = np.where(grow, 255, layer[:, :, 3])
    return layer


def apply_front(layer, body_raw, boxes):
    op = body_raw[:, :, 3] > 40
    r, g, b = [body_raw[:, :, i] for i in range(3)]
    tool = op & ~is_skin(body_raw) & (b >= r) & (lum(body_raw) > 90)
    dark = op & (lum(body_raw) < 60)
    cut = tool | (dark & ndimage.binary_dilation(tool, np.ones((3, 3))))
    for x0, x1, y0, y1 in boxes:
        box = np.zeros_like(op)
        box[y0:y1 + 1, x0:x1 + 1] = True
        layer[:, :, 3] = np.where(box & cut, 0, layer[:, :, 3])
    return layer


EYE_WHITE = (238, 241, 245)    # eyeColorCatalog.js 'white' -- the art's own is 206-255


def apply_eyes(layer, body_raw, boxes):
    dark = (body_raw[:, :, 3] > 40) & (lum(body_raw) < 90)
    for x0, x1, y0, y1 in boxes:
        box = np.zeros_like(dark)
        box[y0:y1 + 1, x0:x1 + 1] = True
        m = box & dark & (layer[:, :, 3] == 0)
        for i in range(3):
            layer[:, :, i] = np.where(m, EYE_WHITE[i], layer[:, :, i])
        layer[:, :, 3] = np.where(m, 255, layer[:, :, 3])
    return layer


DEFAULT_SKIN = (205, 134, 75)  # SKIN_CATALOG 'default' swatch: lum 148.5, the art's own tan


def fur_mask(a, tone):
    """the pixels that are skin baked in `tone` (fur): tone * k for some k.
    The tan muzzle/ears, outline and eye white never match (checked: 0 hits
    on the S/E/N art, which has no patches)."""
    r, g, b, al = [a[..., i].astype(int) for i in range(4)]
    return ((al > 16) & (r >= 40) & (r <= 140)
            & (np.abs(g - r * tone[1] / tone[0]) <= 3) & (np.abs(b - r * tone[2] / tone[0]) <= 3))


def fur_layer(layer, body_raw, tone):
    """the fur of a body-space `layer` as bare skin: each fur patch takes the
    MEDIAN colour of the art's own skin in a 3px ring around it, in this very
    frame -- so on the 'default' skin (drawn unrecoloured) the patch matches
    the surrounding art exactly, and recoloured like the body it matches the
    body.  A patch with no skin around it falls back to DEFAULT_SKIN at the
    fur's own luminance."""
    m = fur_mask(layer, tone)
    out = np.zeros(layer.shape[:2] + (4,), np.uint8)
    if not m.any():
        return out
    skin = is_skin(body_raw)
    lab, n = ndimage.label(m, np.ones((3, 3)))
    for i in range(1, n + 1):
        c = lab == i
        ring = ndimage.binary_dilation(c, np.ones((3, 3)), iterations=3) & ~m & skin
        if ring.sum() >= 4:
            col = np.median(body_raw[ring][:, :3], axis=0)
        else:
            k = lum(layer[c][:, :3].astype(float)).mean() / lum(np.array(tone, float))
            col = np.array(DEFAULT_SKIN) * k
        for j in range(3):
            out[..., j] = np.where(c, int(round(min(255, col[j]))), out[..., j])
        out[..., 3] = np.where(c, 255, out[..., 3])
    return out


def draw_fur(layer, fur, skin):
    """what the game draws: the piece, then its fur layer on top -- recoloured
    exactly like the body for skin target `skin`, or as stored for None
    ('default')"""
    f = fur.astype(int)
    if skin is not None:
        f = retint(f, skin)
    m = f[..., 3] > 0
    out = layer.copy()
    out[m, :3] = f[m, :3]
    out[m, 3] = 255
    return out


def expand(spec):
    """{"1-3": x, "5": y} -> {1: x, 2: x, 3: x, 5: y}"""
    out = {}
    for k, v in spec.items():
        m = re.fullmatch(r'(\d+)(?:-(\d+))?', k)
        a = int(m.group(1))
        b = int(m.group(2) or a)
        for f in range(a, b + 1):
            out[f] = v
    return out


def fixed_layer(pose, d, f, meta, tops, tex, fix, tone):
    raw = body_frame(pose, d, f)
    layer = place(pose, d, f, meta, tops, tex, fix)
    if fix.get('cover'):
        layer = apply_cover(layer, raw, fix['cover'], tone, muzzle_tan(tex, d))
    if fix.get('eyes'):
        layer = apply_eyes(layer, raw, fix['eyes'])
    if fix.get('front'):
        layer = apply_front(layer, raw, fix['front'])
    return layer


def crown_of(pose, d, f, tops, fixes):
    """the head top a reviewer should centre on: the fix's override, else body-tops"""
    fx = expand(fixes.get(f'{pose}-{d}', {})).get(f, {})
    return fx.get('crown') or tops.get(f'{pose}-{d}-{f}') or tops[f'stand-{d}-0']


def load(sid):
    tdir = TRAIT.format(id=sid)
    meta = json.load(open(tdir + '/meta.json'))
    tops = json.load(open(TOPS_PATH))
    tex = {d: np.array(Image.open(f'{tdir}/{d}.png').convert('RGBA').resize((FRAME, FRAME), Image.NEAREST)).astype(int)
           for d in meta['anchors']}
    fixes = json.load(open(FIXES.format(id=sid))) if os.path.exists(FIXES.format(id=sid)) else {}
    return tdir, meta, tops, tex, fixes


def load_fur(tdir, meta):
    """the shipped fur layers: {dir: tex} for the facings, {key: strip} for the strips"""
    fb = meta.get('fur', {})
    ftex = {d: np.array(Image.open(f'{tdir}/{d}.fur.png').convert('RGBA')).astype(int) for d in fb.get('base', [])}
    fstrips = {k: np.array(Image.open(f'{tdir}/frames/{k}.fur.png').convert('RGBA')).astype(int)
               for k in fb.get('frames', [])}
    return ftex, fstrips


def layer_for(pose, d, f, meta, tops, tex, tone, strips=None):
    """what the game will draw for this frame: the baked overlay if meta has
    one (read back from the strip, so the preview proves the shipped data),
    else the normal placement.  Pass the fur textures/strips (load_fur) as
    tex/strips to get the fur layer the same way; a facing or strip with no fur
    file gives an empty layer."""
    fo = meta.get('frameOverlays', {}).get(f'{pose}-{d}', {}).get(str(f))
    if fo and strips is not None:
        sx, sy, w, h, x, y = fo
        st = strips.get(f'{pose}-{d}')
        if st is None:
            return np.zeros((FRAME, FRAME, 4), int)
        layer = np.zeros((FRAME, FRAME, 4), int)
        crop = st[sy:sy + h, sx:sx + w]
        layer[y:y + h, x:x + w] = crop
        return layer
    if d not in tex:
        return np.zeros((FRAME, FRAME, 4), int)
    return place(pose, d, f, meta, tops, tex[d])


def bake(sid):
    tdir, meta, tops, tex, fixes = load(sid)
    tone = TONES[sid]
    fdir = tdir + '/frames'
    os.makedirs(fdir, exist_ok=True)
    for old in os.listdir(fdir):
        os.remove(os.path.join(fdir, old))
    overlays = {}
    fur_frames = []
    for key, spec in fixes.items():
        if key.startswith('_'):
            continue
        pose, d = key.split('-', 1)
        tiles = []
        for f, fix in sorted(expand(spec).items()):
            layer = fixed_layer(pose, d, f, meta, tops, tex[d], fix, tone)
            ys, xs = np.nonzero(layer[:, :, 3] > 0)
            if not len(xs):
                continue
            fl = fur_layer(layer, body_frame(pose, d, f), tone)
            x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
            tiles.append((f, int(x0), int(y0), layer[y0:y1 + 1, x0:x1 + 1], fl[y0:y1 + 1, x0:x1 + 1]))
        if not tiles:
            continue
        W = sum(t[3].shape[1] for t in tiles) + 2 * (len(tiles) - 1)
        H = max(t[3].shape[0] for t in tiles)
        strip = np.zeros((H, W, 4), np.uint8)
        fstrip = np.zeros((H, W, 4), np.uint8)
        cur, ent = 0, {}
        for f, x0, y0, im, fim in tiles:
            h, w = im.shape[:2]
            strip[:h, cur:cur + w] = im
            fstrip[:h, cur:cur + w] = fim
            ent[str(f)] = [cur, 0, w, h, x0, y0]
            cur += w + 2               # 2px gutter: no bleed under linear filtering
        Image.fromarray(strip, 'RGBA').save(f'{fdir}/{key}.png', optimize=True)
        overlays[key] = ent
        if fstrip[..., 3].any():
            Image.fromarray(fstrip, 'RGBA').save(f'{fdir}/{key}.fur.png', optimize=True)
            fur_frames.append(key)
        print(f'{key:18s} {len(tiles):2d} frames baked  -> frames/{key}.png  {W}x{H}')
    if overlays:
        meta['frameOverlays'] = overlays
    else:
        meta.pop('frameOverlays', None)
    fur_base = []
    for d in meta['anchors']:
        path = f'{tdir}/{d}.fur.png'
        # the facing's fur, measured against the frame it was painted for
        # (stand, where _placeTrait's scale is 1 and the offset is a whole pixel)
        layer = place('stand', d, 0, meta, tops, tex[d])
        fl = fur_layer(layer, body_frame('stand', d, 0), tone)
        if fl[..., 3].any():
            top = tops[f'stand-{d}-0']
            a_, n_ = meta['anchors'][d], meta.get('crownNudge', {}).get(d, [0, 0])
            ox, oy = int(round(top[0] + n_[0] - a_[0])), int(round(top[1] + n_[1] - a_[1]))
            g = np.zeros((FRAME, FRAME, 4), np.uint8)
            ys, xs = np.nonzero(fl[..., 3] > 0)
            ok = (xs - ox >= 0) & (ys - oy >= 0) & (xs - ox < FRAME) & (ys - oy < FRAME)
            g[ys[ok] - oy, xs[ok] - ox] = fl[ys[ok], xs[ok]]
            Image.fromarray(g, 'RGBA').save(path, optimize=True)
            fur_base.append(d)
        elif os.path.exists(path):
            os.remove(path)
    meta['fur'] = {'base': fur_base, 'frames': fur_frames,
                   'note': 'v2.3.2655: <dir>.fur.png / frames/<key>.fur.png = the fur as BARE SKIN '
                           '(default tan). Recolour like the body (playerSkins _isSkin/_retint) and '
                           'draw over the piece; the muzzle and ears are never recoloured.'}
    print(f'fur layers: {len(fur_base)} facings, {len(fur_frames)} strips')
    json.dump(meta, open(tdir + '/meta.json', 'w'), indent=2)
    open(tdir + '/meta.json', 'a').write('\n')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['bake'])
    ap.add_argument('--id', default='monkey')
    args = ap.parse_args()
    bake(args.id)


if __name__ == '__main__':
    main()
