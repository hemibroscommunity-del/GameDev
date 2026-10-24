#!/usr/bin/env python3
"""v2.3.3589: THE ALIEN -- its pointed ears and its eyes, drawn from what the
game already knows about the bro's head (the eyes, since v2.3.3590, the Hemi
Bros collection's own).

The owner: "I also wanted to add the alien as another species you could play
as in character creator.  It also exists in collection art.  I think species
should be its own button on character creator screen", then "Yes make species
it's own button.  And add alien."

What an alien is (docs/specs/SPECIES-PLAN.md, measured off the owner's two
references and the Hemi Bros collection's Alien Bro): the same bro, in Alien
Cyan (a skin since v2.3.2665), with POINTED EARS and ITS OWN EYES.  Two
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

THE EYES are an EYE STYLE ('alien'): since v2.3.3590 the collection's Alien
Bro's own eyes (the owner, of the first cut's black almonds: "Biggest
difference for alien is the alien eyes.  Those weren't made the same") -- two
bust cells by two each, dark on one diagonal and the skin's shadow on the
other, laid cell by cell on the eyes the game paints (eye_style below).  Every
pose fit is the WTF style's, the head's own motion, as the first cut's was.
An eye style is the right home, not the species piece: under a style the body
bake paints the bro's own eyes out (playerSkins._blankEyes), a player can
still wear any other style on an alien, and a human can wear these.  Picking
the alien in the creator puts them on (speciesCatalog.js `eyes`).

    python3 tools/species_alien.py                     # the pieces, the meta, the fixes
    python3 tools/species_frames.py bake --id alien    # the per-frame overlays and fur
    python3 tools/ui/make_species_thumbs.py --ids alien
    python3 tools/ui/make_eyestyle_thumbs.py --ids alien
    python3 tools/ui/make_species_tab_icon.py          # the Species button: the same eyes
    python3 tools/species_contact_sheet.py --id alien --out <dir>    # every frame, to look at
"""
import importlib.util
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
# alien's eyes sat over a second pair.  So the piece paints them out there
# itself: a skin cover (species_frames.py `cover`, fur that follows the
# player's skin) over the dark pixels round each placed eye.

EYE_POSES = {'jog': ('south', 'southwest', 'east'), 'hit': ('south', 'southwest', 'east'),
             'pickup': ('south',), 'mine': ('south',), 'fish': ('south',)}
EYE_REACH = (6, 11, 5)        # a dark shape is an eye when its middle lies this near a placed
                              # eye's middle, in hi px (either side, above, below)...
EYE_REACH_LOW = {'pickup': 15,  # ...lower on a pickup, whose eyes sit up to ~10 px below the style's,
                 'hit': 10}     # and on the flinch, his eyes squeezed shut up to 9 below (the mouth 13)
EYE_REACH_SIDE = {'hit': 7, 'jog': 7}   # ...and a pixel wider where an eye's edge lies 6.5-7 out
                                        # (the south flinch's first frame, a line beside the east
                                        # run's eye); not mining, whose nose lies 6.5 out
# v2.3.3590: measured from the eye's MIDDLE, not from round the art -- the bro's
# own eyes are where they are whatever is drawn over them.  v2.3.3589 reached
# (3, 4, 6) round its 12 x 9 almonds, and that edge fell ON the mouth when
# mining (10-11 px under the eyes' middle: it was painted out on 4 of the 14
# frames) and just short of the top of the bro's eye (9 above, left showing on
# 4); round the collection's 8 x 8 eyes it took the mouth on 11.  Measured on
# every face frame: his eyes lie within 5 px either side and 10 above, the nose
# 7-9 to the side, the mouth 10 below, his ears 8 or more to the side.
EYE_MAX_PX = 120              # ...and is eye-sized (a tool's outline is not)
EYE_MAX_BOX = (16, 16)        # ...in a box no bigger than this (a grimace is)
EYE_WHOLE_BOX = (18, 18)      # the eye with its white, no bigger than this (or it ran into a tool)
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
                # v2.3.3590: the whole eye is its dark AND the grey or white
                # beside it, which can reach a pixel or two past the dark: a
                # cover sized to the dark alone left a grey stroke beside the
                # collection's eyes on the last mining frames (the almonds had
                # hidden it)
                whole, _ = ndimage.label(interior & ~SF.is_skin(raw), np.ones((3, 3)))
                lab, k = ndimage.label(placed[..., 3] > 0)
                near = []
                for i in range(1, k + 1):
                    ys, xs = np.nonzero(lab == i)
                    mx, my = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
                    side = EYE_REACH_SIDE.get(pose, EYE_REACH[0])
                    near.append((mx - side, mx + side,
                                 my - EYE_REACH[1], my + EYE_REACH_LOW.get(pose, EYE_REACH[2])))
                # each dark shape of the face whose middle is by a placed eye is
                # his eye; the nose and the mouth (their middles between and below
                # the eyes) stay, as they do where the game paints the eyes out
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
                        ids = np.unique(whole[dl == j])
                        wy, wx = np.nonzero(np.isin(whole, ids[ids > 0]))
                        if (wx.max() - wx.min() + 1 <= EYE_WHOLE_BOX[0]
                                and wy.max() - wy.min() + 1 <= EYE_WHOLE_BOX[1]):
                            xs, ys = wx, wy               # else it runs into something bigger: the dark alone
                        box = [int(xs.min()) - EYE_PAD, int(xs.max()) + EYE_PAD,
                               int(ys.min()) - EYE_PAD, int(ys.max()) + EYE_PAD, 'eye']
                        if box not in boxes:              # two darks of one eye find the same whole eye
                            boxes.append(box)
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
# v2.3.3590: THE COLLECTION'S ALIEN EYES.  The owner, of v2.3.3589's black
# almonds (a glint, the outer corner raised, the first full-body reference's):
# "Biggest difference for alien is the alien eyes.  Those weren't made the
# same."  The Hemi Bros collection's Alien Bro has eyes of its own, part of its
# bro type (the catalogue's Bro Type/alienbro.png; its NFTs, #1 to #15, wear no
# Eyes trait): small and square, two bust cells by two each, on the rows where
# the other bros' eyes have their white and pupil (15-16: Normal Eyes adds a
# dark row 14 over them, the alien has none), each the same checker --
#
#       shade  dark          dark: the collection's one outline colour
#       dark   shade         shade: the alien's skin in its own shadow
#
# The game's own eyes are the collection's Normal Eyes made the same way (a
# dark top edge, then the white beside the pupil, WWW+###, both eyes the same
# way round), so these are too: laid CELL BY CELL on the eyes the game paints,
# a bust cell two px of the 128 frame -- make_collection_eyewear.py's own
# helpers, which drew the gold glasses and the monocle so (v2.3.3587).  Each
# eye is centred on the game's eye and sits on its bottom (the white-and-pupil
# rows), the same way round on both eyes and in every facing, as the bust and
# the game's own eyes have it; the mirrored facings (southeast, west,
# northwest) turn it over, as they turn the game's own.
#
# THE SHADE IS A SHADOW, NOT A COLOUR: the dark at SHADE_A over whatever skin
# the player picked, so a purple alien's eyes are shaded purple.  SHADE_A is
# what the collection's shadow takes off its lit skin, by luminance (0.86 of
# it: alpha 38); being see-through is also what keeps it skin when the Eyes
# tab's colour row paints the dark (eyeStyleColorCatalog.js `solid`).

# the collection's Alien Bro, read off alienbro.png (A, C and D in its cells)
ALIEN_LIT = (200, 251, 251)
ALIEN_SHADE = (155, 224, 224)
EYE_DARK = (31, 13, 27)
EYE_CELLS = (('shade', 'dark'),       # the bust's cells (9-10, 15-16) and (14-15, 15-16)
             ('dark', 'shade'))
EYE_DIRS = ('south', 'southwest', 'east')   # north and northeast show no face: no png, no anchor


SHADE_A = int(round(255 * float(_lum(ALIEN_LIT) - _lum(ALIEN_SHADE)) / float(_lum(ALIEN_LIT) - _lum(EYE_DARK))))


def _eyewear_tool():
    """tools/ui/make_collection_eyewear.py: Art, place, _eyes and the game's eye boxes"""
    spec = importlib.util.spec_from_file_location(
        'make_collection_eyewear', os.path.join(REPO, 'tools', 'ui', 'make_collection_eyewear.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def alien_eye(art, eye):
    """one eye, 2 x 2 cells of 2 px, on one of the game's eyes ((x0, x1, y0, y1)
    in the 128 frame): centred on its width, its bottom on the eye's"""
    x0, x1, y0, y1 = eye
    ex = int(np.floor((x0 + x1) / 2 + 0.5)) - 2
    ey = int(np.floor(y1 + 0.5)) - 4
    for r, row in enumerate(EYE_CELLS):
        for c, k in enumerate(row):
            art.cell(ex + 2 * c, ey + 2 * r, EYE_DARK + ((255,) if k == 'dark' else (SHADE_A,)))


def eye_style():
    mce = _eyewear_tool()
    boxes = mce._importer()
    tops = json.load(open(mce.TOPS))
    fits = json.load(open(EYES_FROM + '/meta.json'))     # the WTF style's: the head's pose fits
    meta = {
        'category': 'eyestyle', 'fullFrame': True,
        'note': ('v2.3.3590: THE COLLECTION\'S ALIEN EYES (owner: "Biggest difference for alien is the alien '
                 'eyes.  Those weren\'t made the same"), drawn by tools/species_alien.py cell by cell from the Hemi '
                 'Bros Alien Bro onto the eyes the game paints, a bust cell two px of the 128 frame: each eye a '
                 'checker of two cells by two, the dark (31,13,27) on one diagonal and on the other the same dark at '
                 f'alpha {SHADE_A}, the skin\'s own shadow over any skin.  The art\'s top-centre is the anchor (128, 6) '
                 'and crownNudge carries it to the crown (body-tops stand-<dir>-0), so it lands where it was drawn '
                 '(make_collection_eyewear.py place); scale 1.  The pose fits are the WTF style\'s, the head\'s own '
                 'motion.  Re-run the tool, never edit by hand.'),
        'bboxes': {}, 'anchors': {}, 'crownNudge': {}, 'scale': {},
    }
    os.makedirs(EYES + '/hi', exist_ok=True)
    for d in EYE_DIRS:
        art = mce.Art()
        eyes = mce._eyes(boxes, d)
        for eye in eyes:
            alien_eye(art, eye)
        lo, hi, m = mce.place(art, tops, d)
        Image.fromarray(lo, 'RGBA').save(f'{EYES}/{d}.png', optimize=True)
        Image.fromarray(hi, 'RGBA').save(f'{EYES}/hi/{d}.png', optimize=True)
        meta['bboxes'][d] = m['bbox']
        meta['anchors'][d] = [128, 6]
        meta['crownNudge'][d] = m['nudge']
        meta['scale'][d] = 1
        print(f'eyestyle/alien/{d}.png  {len(eyes)} eye(s)')
    for k in ('poseFit', 'scaleByPose', 'poseNudge'):
        if k in fits:
            meta[k] = fits[k]
    json.dump(meta, open(EYES + '/meta.json', 'w'), indent=2)
    open(EYES + '/meta.json', 'a').write('\n')


if __name__ == '__main__':
    species_piece()
    eye_style()
    fixes()
