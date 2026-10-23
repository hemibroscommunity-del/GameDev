#!/usr/bin/env python3
"""v2.3.3589: THE ALIEN -- its pointed ears and its black almond eyes, drawn
from what the game already knows about the bro's head.

The owner: "I also wanted to add the alien as another species you could play
as in character creator.  It also exists in collection art.  I think species
should be its own button on character creator screen", then "Yes make species
it's own button.  And add alien."

What an alien is (docs/specs/SPECIES-PLAN.md, measured off the owner's two
references and the Hemi Bros collection's Alien Bro): the same bro, in Alien
Cyan (a skin since v2.3.2665), with POINTED EARS and BLACK ALMOND EYES.  Two
pieces, each riding machinery that is already wired, preloaded and tested:

THE EARS are a SPECIES PIECE, the monkey's twin (speciesArt.js).  The monkey's
ears were drawn, imported and then fitted to every frame the head moves
through -- 196 frames by hand (tools/species-fixes/monkey.json).  So the
alien's are made FROM them, one for one: each monkey ear stays exactly where
it sits and how it overlaps the head (which is what hides the bro's own ear),
and is re-shaped into a pointed ear -- its lobe kept, a little narrower, its
top drawn up and out to a point.  Its inside is SKIN (fur, in the piece's
terms), so species_frames.py ships it as bare skin and the game recolours it
with the player's skin, Alien Cyan or any other; its outline is the piece's
black.  The monkey's patches that paint out the bro's own ear on the 3/4
facings are kept (they are skin too).  The muzzle is dropped.  The per-frame
fixes are the monkey's, less every op about the muzzle and its eye whites.

THE EYES are an EYE STYLE ('alien'), the WTF style's twin: the same meta --
anchors, crown nudge, every pose fit the WTF eyes were tuned and seated with --
and new pixels, a black almond in each eye's place, its outer corner raised,
with a glint.  An eye style is the right home, not the species piece: under a
style the body bake paints the bro's own eyes out (playerSkins._blankEyes), a
player can still wear any other style on an alien, and a human can wear these.
Picking the alien in the creator puts them on (speciesCatalog.js `eyes`).

    python3 tools/species_alien.py                     # the pieces, the meta, the fixes
    python3 tools/species_frames.py bake --id alien    # the per-frame overlays and fur
    python3 tools/ui/make_species_thumbs.py --ids alien
    python3 tools/ui/make_eyestyle_thumbs.py --ids alien
    python3 tools/species_contact_sheet.py --id alien --out <dir>    # every frame, to look at
"""
import json
import os
import sys

import numpy as np
from PIL import Image

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(REPO, 'tools'))
os.chdir(REPO)
import species_frames as SF  # noqa: E402

MONKEY = 'public/sprites/traits/species/monkey'
ALIEN = 'public/sprites/traits/species/alien'
EYES_FROM = 'public/sprites/traits/eyestyle/wtf'
EYES = 'public/sprites/traits/eyestyle/alien'
FIXES_FROM = 'tools/species-fixes/monkey.json'
FIXES = 'tools/species-fixes/alien.json'

OUTLINE = (0, 0, 0)          # the piece's outline, as the monkey's art has it
NARROW = 0.75                # the lobe's reach off the head, of the monkey's
TIP_LIFT = 3                 # the point's rise above the monkey ear's top, piece px
TIP_SHARE = 0.55             # how far down the ear the point's slope runs


def _lum(c):
    c = np.asarray(c, float)
    return 0.299 * c[..., 0] + 0.587 * c[..., 1] + 0.114 * c[..., 2]


def _skin(k):
    """a fur pixel in the alien's marker tone at brightness k (species_frames
    finds fur by the tone's own ratios, and ships it as bare skin)"""
    t = np.array(SF.TONES['alien'], float)
    return tuple(int(v) for v in np.clip(np.round(t * k), 0, 255))


OUTLINE_PX = 2               # the bro's own outline is 2-3 px in this 256-space


def _outline(mask, px=1):
    """the mask's own edge, `px` thick: what is left after eroding it px
    times by its 4-neighbours"""
    inner = mask.copy()
    for _ in range(px):
        e = inner.copy()
        e[1:, :] &= inner[:-1, :]
        e[:-1, :] &= inner[1:, :]
        e[:, 1:] &= inner[:, :-1]
        e[:, :-1] &= inner[:, 1:]
        e[0, :] = e[-1, :] = False
        e[:, 0] = e[:, -1] = False
        inner = e
    return mask & ~inner


def pointed(ear, outward):
    """the monkey ear's mask re-shaped to a pointed ear: the lobe below the
    point's slope kept (its reach off the head NARROWed, so the side that
    overlaps the head -- and hides the bro's own ear -- is where it was), the
    top drawn to a point TIP_LIFT px above it, out on the far side"""
    ys, xs = np.nonzero(ear)
    y0, y1 = ys.min(), ys.max()
    out = np.zeros_like(ear)
    rows = {}
    for y in range(y0, y1 + 1):
        r = np.nonzero(ear[y])[0]
        if len(r):
            rows[y] = (r.min(), r.max())
    # the attached side: toward the head (the piece's middle column, 128)
    def attach(y):
        a, b = rows[y]
        return b if outward < 0 else a

    def reach(y):
        a, b = rows[y]
        far = a if outward < 0 else b
        near = attach(y)
        return int(round(near + (far - near) * NARROW))

    ymid = int(round(y0 + (y1 - y0) * TIP_SHARE))
    while ymid not in rows:
        ymid += 1
    for y in range(ymid, y1 + 1):
        if y not in rows:
            continue
        a, b = sorted((attach(y), reach(y)))
        out[y, a:b + 1] = True
    # the point: out past the lobe's furthest reach, above the ear's top
    far = min(reach(y) for y in rows) if outward < 0 else max(reach(y) for y in rows)
    tip_x, tip_y = far, y0 - TIP_LIFT
    ia, ra = attach(ymid), reach(ymid)
    for y in range(tip_y, ymid):
        t = (ymid - y) / max(1, ymid - tip_y)          # 0 at the lobe, 1 at the tip
        i = int(round(ia + (tip_x - ia) * t))
        r = int(round(ra + (tip_x - ra) * t))
        a, b = sorted((i, r))
        out[y, a:b + 1] = True
    return out


def draw_ear(canvas, mask, outward):
    """outline, skin, and the bro's own ear's inner line: a short dark stroke
    inside the lobe, a pixel in from the attached side"""
    edge = _outline(mask, OUTLINE_PX)
    inside = mask & ~edge
    for y, x in zip(*np.nonzero(inside)):
        canvas[y, x] = (*_skin(1.0), 255)
    for y, x in zip(*np.nonzero(edge)):
        canvas[y, x] = (*OUTLINE, 255)
    ys, xs = np.nonzero(inside)
    if len(ys) > 12:
        y0, y1 = ys.min(), ys.max()
        h = y1 - y0
        for y in range(int(y0 + h * 0.45), int(y0 + h * 0.8) + 1):
            row = np.nonzero(inside[y])[0]
            if len(row) >= 5:
                x = row.max() - 2 if outward < 0 else row.min() + 1
                canvas[y, x:x + 2] = (*OUTLINE, 255)


def species_piece():
    os.makedirs(ALIEN, exist_ok=True)
    meta = json.load(open(MONKEY + '/meta.json'))
    mtone = SF.TONES['monkey']
    for d in meta['anchors']:
        tex = np.array(Image.open(f'{MONKEY}/{d}.png').convert('RGBA').resize((SF.FRAME, SF.FRAME), Image.NEAREST)).astype(int)
        parts = SF.parts(tex, d)
        out = np.zeros((SF.FRAME, SF.FRAME, 4), np.uint8)
        for name, pt in parts.items():
            if name == 'muzzle':
                continue
            fur = SF.fur_mask(pt, mtone)
            # the patches that paint the bro's own ear out stay, in the alien's tone
            for y, x in zip(*np.nonzero(fur)):
                k = float(_lum(pt[y, x, :3])) / float(_lum(mtone))
                out[y, x] = (*_skin(k), 255)
            ear = (pt[..., 3] > 16) & ~fur
            if not ear.any():
                continue
            cx = np.nonzero(ear)[1].mean()
            outward = -1 if cx < 128 else 1
            draw_ear(out, pointed(ear, outward), outward)
        Image.fromarray(out, 'RGBA').save(f'{ALIEN}/{d}.png', optimize=True)
        print(f'species/alien/{d}.png  {int((out[..., 3] > 0).sum())} px')
    for k in ('frameOverlays', 'fur'):
        meta.pop(k, None)
    meta['muzzle'] = False
    meta['note'] = ('v2.3.3589: made by tools/species_alien.py from the monkey piece -- its ears re-shaped '
                    'to points where they sit, their inside skin (fur), its muzzle dropped; anchors, '
                    'nudges and pose fits are the monkey\'s.  frameOverlays and fur: species_frames.py bake.')
    json.dump(meta, open(ALIEN + '/meta.json', 'w'), indent=2)
    open(ALIEN + '/meta.json', 'a').write('\n')


# ── the bro's own eyes, where the game does not paint them out ──
# Under an eye style the body bake paints the bro's eyes out with skin --
# only on the frames eyeBlankMask.json covers: stand, jog south/southwest, 12
# of jog east's 28, 17 of pickup's 29.  On the rest (the hit flinch, mining,
# fishing, the back of a pickup) his eyes stay under the style, and an
# alien's almonds sat over a second pair.  So the piece paints them out there
# itself: a skin cover (species_frames.py `cover`, fur that follows the
# player's skin) over the dark pixels round each placed almond.

EYE_POSES = {'jog': ('south', 'southwest', 'east'), 'hit': ('south', 'southwest', 'east'),
             'pickup': ('south',), 'mine': ('south',), 'fish': ('south',)}
EYE_NEAR = (3, 4, 6)          # a dark shape is an eye when its middle lies this near a
                              # placed almond (either side, above, below)...
EYE_NEAR_LOW = {'pickup': 10}  # ...lower on a pickup, whose eyes sit up to ~10 px below the style's
EYE_MAX_PX = 120              # ...and is eye-sized (a tool's outline is not)
EYE_MAX_BOX = (16, 16)        # ...in a box no bigger than this (a grimace is)
EYE_PAD = 2                   # the cover reaches this far past the dark shape: its edge


def eye_cover_boxes():
    """{'pose-dir': {frame: [[x0, x1, y0, y1, 'fur'], ...]}} for every face
    frame eyeBlankMask.json does not cover"""
    from scipy import ndimage
    blank = json.load(open('src/rendering/eyeBlankMask.json'))
    emeta = json.load(open(EYES + '/meta.json'))
    eyes = {d: np.array(Image.open(f'{EYES}/hi/{d}.png').convert('RGBA')).astype(int) for d in emeta['anchors']}
    tops = json.load(open(SF.TOPS_PATH))
    out = {}
    for pose, dirs in EYE_POSES.items():
        for d in dirs:
            n = sum(1 for k in tops if k.startswith(f'{pose}-{d}-'))
            masks = blank.get(f'{pose}-{d}') or []
            for f in range(n):
                if f < len(masks) and masks[f]:
                    continue                       # the game paints these out itself
                placed = SF.place(pose, d, f, emeta, tops, eyes[d])
                raw = SF.body_frame(pose, d, f)
                op = raw[..., 3] > 40
                interior = op.copy()
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        interior &= np.roll(np.roll(op, dy, 0), dx, 1)
                dark = interior & (SF.lum(raw) < 90) & ~SF.is_skin(raw)
                lab, k = ndimage.label(placed[..., 3] > 0)
                near = []
                for i in range(1, k + 1):
                    ys, xs = np.nonzero(lab == i)
                    near.append((xs.min() - EYE_NEAR[0], xs.max() + EYE_NEAR[0],
                                 ys.min() - EYE_NEAR[1], ys.max() + EYE_NEAR_LOW.get(pose, EYE_NEAR[2])))
                # each dark shape of the face whose middle is by an almond is his
                # eye; the nose and the mouth (their middles between and below the
                # eyes) stay, as they do where the game paints the eyes out
                dl, dn = ndimage.label(dark, np.ones((3, 3)))
                boxes = []
                for j in range(1, dn + 1):
                    ys, xs = np.nonzero(dl == j)
                    if len(xs) < 4 or len(xs) > EYE_MAX_PX:
                        continue
                    if xs.max() - xs.min() + 1 > EYE_MAX_BOX[0] or ys.max() - ys.min() + 1 > EYE_MAX_BOX[1]:
                        continue
                    cx, cy = xs.mean(), ys.mean()
                    if any(x0 <= cx <= x1 and y0 <= cy <= y1 for x0, x1, y0, y1 in near):
                        boxes.append([int(xs.min()) - EYE_PAD, int(xs.max()) + EYE_PAD,
                                      int(ys.min()) - EYE_PAD, int(ys.max()) + EYE_PAD, 'eye'])
                if boxes:
                    out.setdefault(f'{pose}-{d}', {})[str(f)] = boxes
    return out


def fixes():
    src = json.load(open(FIXES_FROM))
    out = {'_doc': 'Per-frame fixes for the alien piece -- the monkey\'s (monkey.json), less every op '
                   'about its muzzle and its eye whites: written by tools/species_alien.py, not by hand.  '
                   'Bake with: python3 tools/species_frames.py bake --id alien'}
    kept = 0
    for key, spec in src.items():
        if key.startswith('_'):
            continue
        frames = {}
        for f, fix in spec.items():
            fx = {k: v for k, v in fix.items() if k not in ('muzzle', 'eyes')}
            # a frame whose muzzle the fix moved covers the gritted TEETH under
            # it (hit south and east): with no muzzle, the alien keeps his
            # teeth -- a skin cover there was a flat patch on the face
            if fx.get('cover') and 'muzzle' in fix:
                del fx['cover']
            if fx.get('cover'):
                fx['cover'] = [c for c in fx['cover'] if c[4] != 'muzzle']
                if not fx['cover']:
                    del fx['cover']
            if fx:
                frames[f] = fx
                kept += 1
        if frames:
            out[key] = frames
    added = 0
    for key, per in eye_cover_boxes().items():
        frames = out.setdefault(key, {})
        for f, boxes in per.items():
            fx = frames.setdefault(f, {})
            fx['cover'] = fx.get('cover', []) + boxes
            added += 1
    print(f'species-fixes/alien.json  {added} frames paint the bro\'s own eyes out')
    json.dump(out, open(FIXES, 'w'), indent=1)
    open(FIXES, 'a').write('\n')
    print(f'species-fixes/alien.json  {kept} frame fixes')


# ── the eyes ───────────────────────────────────────────────────────────────

EYE_BLACK = (10, 10, 16)
EYE_GLINT = (236, 246, 250)
EYE_HALF_W = 6.8              # hi (256) px: each almond's half length...
EYE_HALF_H = 4.0              # ...and half height
EYE_TILT = 20                 # degrees the outer corner is raised


def _blobs(a):
    """the separate eyes of a piece: (cx, cy, x0, x1) per blob, left to right"""
    from scipy import ndimage
    lab, n = ndimage.label(a[..., 3] > 16)
    out = []
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(xs) < 6:
            continue
        out.append((xs.mean(), ys.mean(), xs.min(), xs.max()))
    return sorted(out)


def almond(canvas, cx, cy, outer_left):
    """a black almond centred on (cx, cy), its outer corner raised EYE_TILT"""
    th = np.deg2rad(EYE_TILT if outer_left else -EYE_TILT)
    H, W = canvas.shape[:2]
    m = np.zeros((H, W), bool)
    for y in range(int(cy - 10), int(cy + 11)):
        for x in range(int(cx - 11), int(cx + 12)):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            # rotate into the almond's frame (screen y down: raise the outer corner)
            u = dx * np.cos(th) - dy * np.sin(th)
            v = dx * np.sin(th) + dy * np.cos(th)
            # an almond: an ellipse pinched toward both corners
            w = EYE_HALF_H * (1 - (u / EYE_HALF_W) ** 2) ** 0.7 if abs(u) < EYE_HALF_W else -1
            if w > 0 and abs(v) <= w:
                m[y, x] = True
    for y, x in zip(*np.nonzero(m)):
        canvas[y, x] = (*EYE_BLACK, 255)
    # the glint: 2 x 2 px of light, up and toward the nose, as the bro's own
    # eyes carry their white on the inner side
    ys, xs = np.nonzero(m)
    if len(ys):
        gy = ys.min() + 2
        row = xs[ys == gy]
        if len(row):
            gx = row.max() - 3 if outer_left else row.min() + 2
            canvas[gy:gy + 2, gx:gx + 2] = (*EYE_GLINT, 255)


def eye_style():
    os.makedirs(EYES + '/hi', exist_ok=True)
    meta = json.load(open(EYES_FROM + '/meta.json'))
    bboxes = {}
    for d in meta['anchors']:
        src = np.array(Image.open(f'{EYES_FROM}/hi/{d}.png').convert('RGBA'))
        out = np.zeros_like(src)
        eyes = _blobs(src)
        for i, (cx, cy, x0, x1) in enumerate(eyes):
            if d == 'east':
                outer_left = True                  # in profile the outer corner is at the back
            else:
                outer_left = (i == 0)              # the left eye's outer corner is on the left
            almond(out, cx, cy, outer_left)
        Image.fromarray(out, 'RGBA').save(f'{EYES}/hi/{d}.png', optimize=True)
        Image.fromarray(out, 'RGBA').resize((128, 128), Image.BOX).save(f'{EYES}/{d}.png', optimize=True)
        ys, xs = np.nonzero(out[..., 3] > 0)
        bboxes[d] = [int(xs.min()), int(ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)]
        print(f'eyestyle/alien/{d}.png  {len(eyes)} eye(s)')
    meta['bboxes'] = bboxes
    meta['note'] = ('v2.3.3589: made by tools/species_alien.py -- a black almond in each of the WTF '
                    'style\'s eyes\' places, its outer corner raised; every placement number (anchors, '
                    'crownNudge, scaleByPose, poseNudge) is the WTF style\'s, which were tuned and seated.')
    json.dump(meta, open(EYES + '/meta.json', 'w'), indent=2)
    open(EYES + '/meta.json', 'a').write('\n')


if __name__ == '__main__':
    species_piece()
    eye_style()
    fixes()
