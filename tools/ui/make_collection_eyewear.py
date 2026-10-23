#!/usr/bin/env python3
"""v2.3.3587: THE GOLDEN GLASSES AND THE GOLDEN MONOCLE, AS THE COLLECTION DRAWS THEM.

The owner, after the townsfolk's dialogue portraits became Hemi Bros: "The gold
glasses look different ... Also the monocle mayor bro wears", and asked which
side should change, "Game matches collection": the game's own two pieces of
that name are drawn again in the Hemi Bros collection's design, so a player who
picks Golden Glasses or the Golden Monocle wears the collection's, and Diego
and Mayor Bro look in the world as their portraits do.

The collection's pieces (assets/portrait-source/hemi-bros/goldenglasses.png,
goldenmonocle.png, lifted off the NFTs by tools/qa/nft_portraits.py) are a few
cells on a 32 x 32 bust:

    GOLDEN GLASSES        a gold bar along the brow, lit in spots and darker
                          where it turns back to the ear; under it two pale
                          gold lenses you see the eyes through (56%), a gold
                          bridge, the near side of the frame in brown shadow,
                          and no rim under the lenses.
    GOLDEN MONOCLE        a small gold ring round one eye, its glass clear
                          with a glint, and a short chain off its lower edge.

The game's face is drawn at a higher resolution than the bust's: one bust cell
is about two of the game's pixels (an eye is two cells there and 3.5 px here,
in the 128 frame a trait is stored at).  So each piece is laid out CELL BY
CELL on the game's face, a cell two pixels, from the eyes the game actually
paints (tools/import_headwear_green.py eye_boxes: eyeMask.json and the stand
bodies) -- not scaled from the bust, which would smear its cells -- in the
collection's own colours, read from those files.  The bust is turned to the
viewer's left, which is the game's SOUTHWEST: that facing is the bust's
layout cell for cell; SOUTH is it made symmetric, EAST its profile, and
NORTHEAST only the arm or chain by the ear (the face is turned away there).
The monocle is on the eye the bust wears it on: the bro's left, which is the
viewer's right in south and southwest; in east, the eye the profile shows.
The five-direction mirroring (southeast, west, northwest are mirrors) swaps
an asymmetric piece's eye in those facings, as it always has.

Placement (meta.json) is worked out from the same numbers, so the piece lands
on the body exactly where it was drawn: the art's top-centre is the anchor
(128, 6), and crownNudge carries it to the body's crown (body-tops.json).
`scale` is 1 everywhere -- the art is drawn at the face's size, where the old
south glasses needed 0.912 to fit -- and the pose fits (scaleByPose,
poseNudge: how each pose draws the head, nothing about the art) are kept from
the meta.json already there.

Also written: hi/<dir>.png (256, the same pixels doubled: the creator's
preview), and the picker icons thumb.png / thumb-sw.png -- a front view with
the dark outline the owner's other eyewear icons have (tools/ui/
slice_eyewear_thumbs.py leaves these two alone now).

    python3 tools/ui/make_collection_eyewear.py            # write both pieces
    python3 tools/ui/make_collection_eyewear.py --out DIR  # write into DIR/<id>/ instead
    python3 tools/ui/make_collection_eyewear.py --check    # the files match, write nothing
"""
import argparse
import importlib.util
import json
import os
import sys

import numpy as np
from PIL import Image

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(REPO, 'assets', 'portrait-source', 'hemi-bros')
TRAITS = os.path.join(REPO, 'public', 'sprites', 'traits', 'eyewear')
TOPS = os.path.join(REPO, 'public', 'sprites', 'player', 'body-tops.json')
DIRS = ['south', 'southwest', 'east', 'northeast']
OUTLINE = (31, 13, 27, 255)      # the collection's one outline colour, for the icons' keyline


def _importer():
    """tools/import_headwear_green.py, for eye_boxes(): the game's own eyes"""
    cwd = os.getcwd()
    os.chdir(REPO)       # its paths are repo-relative
    try:
        spec = importlib.util.spec_from_file_location('ihg', os.path.join(REPO, 'tools', 'import_headwear_green.py'))
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        boxes = {d: mod.eye_boxes(d) for d in DIRS}
    finally:
        os.chdir(cwd)
    return boxes


def _px(name, x, y):
    a = np.asarray(Image.open(os.path.join(SRC, name + '.png')).convert('RGBA'))
    return tuple(int(v) for v in a[y, x])


# ── the collection's colours, read off its own pieces ─────────────────────
G = dict(
    gold=_px('goldenglasses', 7, 14),      # the bar
    lit=_px('goldenglasses', 8, 14),       # its lit spots
    deep=_px('goldenglasses', 18, 14),     # where it turns back to the ear
    side=_px('goldenglasses', 7, 15),      # the near side of the frame, in shadow
    lens=_px('goldenglasses', 8, 15),      # the lens: pale gold, see-through (alpha 144)
)
M = dict(
    rim=_px('goldenmonocle', 13, 15),      # the ring, lit
    rim2=_px('goldenmonocle', 14, 13),     # its top
    rimd=_px('goldenmonocle', 13, 14),     # its shaded side
    glass=_px('goldenmonocle', 15, 14),    # the glass: clear, a glint (alpha 137)
    chain=_px('goldenmonocle', 16, 18),
)


class Art:
    """pixels in the 128 body frame (stand-<dir> halved): {(x, y): rgba}"""

    def __init__(self):
        self.p = {}

    def cell(self, x, y, c, w=2, h=2):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.p[(xx, yy)] = c

    def bbox(self):
        xs = [k[0] for k in self.p]
        ys = [k[1] for k in self.p]
        return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def _eyes(boxes, d):
    """the eyes in the 128 frame, left to right: (x0, x1, y0, y1) floats"""
    return [(a / 2, b / 2, c / 2, e / 2) for (a, b, c, e) in (boxes.get(d) or [])]


# ── the glasses ────────────────────────────────────────────────────────────

def glasses_southwest(boxes):
    """the bust's own layout, cell by cell (a cell 2 px, the bridge 3):
         bust x  6      7     8-10    11-12   13-16    17    18-19  21
         bar     gold   gold  lit/g   gold    g/lit    lit   deep
         lenses  lit    side  LENS    gold    LENS     lit          deep (the arm's end)
    the left lens on the near eye, the right on the far one, the bar on the
    eyes' dark top edge, three lens rows from just under it."""
    (l0, l1, t0, t1), (r0, r1, _, _) = _eyes(boxes, 'southwest')
    a = Art()
    bar = int(round(t0))                  # the eyes' dark top edge
    top = bar + 2                         # the lenses' first row
    lx = int(np.ceil(l1)) - 6             # the left lens: 3 cells, its right edge the near eye's
    side, corner = lx - 2, lx - 4
    bx = lx + 6                           # the bridge, 3 px
    rx = bx + 3                           # the right lens, 4 cells
    fx = rx + 8                           # the far side
    tx = fx + 2                           # the arm, 2 cells
    # the bar, row 14 of the bust: A B C D E B B F C C B G H I
    for i, c in enumerate(['gold', 'gold', 'lit', 'gold', 'lit']):
        a.cell(corner + 2 * i, bar, G[c])
    a.cell(bx, bar, G['gold'], w=3)
    for i, c in enumerate(['gold', 'lit', 'lit', 'gold']):
        a.cell(rx + 2 * i, bar, G[c])
    a.cell(fx, bar, G['lit'])
    a.cell(tx, bar, G['deep'], w=4)
    # the corner sticking out past the face, the near side in shadow
    a.cell(corner, top, G['lit'])
    a.cell(corner, top + 2, G['lens'])
    a.cell(side, top, G['side'], h=6)
    # the lenses, the bridge, the far side, the arm's end at the ear
    a.cell(lx, top, G['lens'], w=6, h=6)
    a.cell(bx, top, G['gold'], w=3)
    a.cell(bx, top + 2, G['lit'], w=3)
    a.cell(rx, top, G['lens'], w=8, h=6)
    a.cell(fx, top, G['lit'])
    a.cell(fx, top + 2, G['lens'])
    a.cell(tx + 4, top, G['deep'])
    return a


def glasses_south(boxes):
    """face on: the bust's layout made symmetric about the face -- a side, a
    lens of 3 cells, a bridge of 2, a lens, a side; the bar over it all on the
    eyes' dark top edge, lit over each lens; the sides in shadow."""
    (l0, l1, t0, t1), (r0, r1, _, _) = _eyes(boxes, 'south')
    mid = (l0 + r1) / 2                   # the face's middle, between the eyes
    a = Art()
    bar = int(round(t0)) - 1
    top = bar + 2
    c = int(round(mid))                   # the bridge's middle: columns c-2 .. c+1
    lx, rx = c - 2 - 6, c + 2
    for x in (lx - 2, rx + 6):
        a.cell(x, top, G['side'], h=6)
    for x0, cols in ((lx - 2, ['gold', 'lit', 'gold', 'lit', 'gold']), (c + 2, ['gold', 'lit', 'gold', 'lit', 'gold'])):
        for i, k in enumerate(cols if x0 < c else cols[::-1]):
            a.cell(x0 + 2 * i, bar, G[k])
    a.cell(c - 2, bar, G['gold'], w=4)
    a.cell(lx, top, G['lens'], w=6, h=6)
    a.cell(rx, top, G['lens'], w=6, h=6)
    # the bridge, the bust's 2 x 2 cells: gold, lit / lit, gold
    a.cell(c - 2, top, G['gold'])
    a.cell(c, top, G['lit'])
    a.cell(c - 2, top + 2, G['lit'])
    a.cell(c, top + 2, G['gold'])
    return a


def glasses_east(boxes):
    """the profile, facing right: the lens on the eye the profile shows, the
    frame's corner past the face's front, its side in shadow behind it, and
    the bar running back along the head as the arm, darker as it goes, to a
    hook behind the ear"""
    (e0, e1, t0, t1), = _eyes(boxes, 'east')
    a = Art()
    bar = int(round(t0)) - 1
    top = bar + 2
    lx = int(np.floor(e0))                # the lens: 2 cells from the eye's back edge
    side = lx + 4                         # the frame's side, then its corner past the face
    a.cell(lx, top, G['lens'], w=4, h=6)
    a.cell(side, top, G['side'], h=6)
    a.cell(side + 2, bar, G['gold'])
    a.cell(side + 2, top, G['lit'])
    for i, k in enumerate(['lit', 'gold']):
        a.cell(lx + 2 * i, bar, G[k])
    a.cell(side, bar, G['gold'])
    # the arm, back to the ear (bust row 14's dark end, then its hook, x21)
    arm = lx - 12
    a.cell(arm, bar, G['deep'], w=12)
    a.cell(arm, top, G['deep'])
    return a


# where the old piece drew its arm in the back three-quarter view, on the
# 128 body frame (the stand-northeast body's right side, over the ear): the
# face that would place it is turned away there, so it is kept, not derived
NE_ARM = (68, 24)


def glasses_northeast():
    """the back three quarters: only the arm shows, at the side of the head
    (NE_ARM), hooking down behind the ear"""
    x0, y0 = NE_ARM
    a = Art()
    a.cell(x0, y0, G['deep'], w=8)
    a.cell(x0, y0 + 2, G['deep'])
    return a


# ── the monocle ────────────────────────────────────────────────────────────

def monocle_on(eye, a=None):
    """the bust's ring, cell by cell, round one eye (bust x13-16, rows 13-19,
    the eye at x14-15 from row 14):
          .  top top  .
         dk  hole gls rim
         rim gls hole rim
         dk  gls hole rim
          .  bot bot  .
                     chain
                     chain"""
    x0, x1, y0, y1 = eye
    a = a or Art()
    ix = int(round((x0 + x1) / 2)) - 2    # the ring's inside, 2 cells, centred on the eye
    iy = int(round(y0))                   # ...from the eye's dark top edge
    a.cell(ix, iy - 2, M['rim2'], w=4)
    a.cell(ix - 2, iy, M['rimd'])
    a.cell(ix - 2, iy + 2, M['rim'])
    a.cell(ix - 2, iy + 4, M['rimd'])
    for dy in (0, 2, 4):
        a.cell(ix + 4, iy + dy, M['rim'])
    a.cell(ix + 2, iy, M['glass'])         # the glint, a diagonal of glass
    a.cell(ix, iy + 2, M['glass'])
    a.cell(ix, iy + 4, M['glass'])
    a.cell(ix, iy + 6, M['rim'], w=4)
    a.cell(ix + 4, iy + 8, M['chain'], h=4)
    return a


# ── placement and files ────────────────────────────────────────────────────

def place(art, tops, d):
    """the 128 piece canvas, the 256 one, and the meta numbers for one facing"""
    x0, y0, x1, y1 = art.bbox()
    w, h = x1 - x0, y1 - y0
    offx, offy = x0 + w // 2 - 64, y0 - 3      # body = piece + off: the art's top-centre on (64, 3)
    lo = np.zeros((128, 128, 4), np.uint8)
    for (x, y), c in art.p.items():
        lo[y - offy, x - offx] = c
    hi = np.repeat(np.repeat(lo, 2, 0), 2, 1)
    cx, cy = tops[f'stand-{d}-0']
    nudge = [2 * offx + 128 - cx, 2 * offy + 6 - cy]
    px0, py0 = x0 - offx, y0 - offy
    return lo, hi, dict(bbox=[2 * px0, 2 * py0, 2 * w, 2 * h], nudge=nudge)


# ── the picker's icons ─────────────────────────────────────────────────────
# A front view, as the owner's other eyewear icons are drawn (tools/ui/
# slice_eyewear_thumbs.py): the piece in the collection's cells and colours,
# each cell CELL px, the arms turned back at the ends, a dark keyline round
# it.  The glass is drawn solid here: see-through, it shows the dark tile and
# the lenses read as holes.
CELL = 8
GLASSES_ICON = [
    'd................d',
    'dgglgglggggglglggd',
    '.sLLLLLLglLLLLLLs.',
    '.sLLLLLLlgLLLLLLs.',
    '..LLLLLL..LLLLLL..',
]
MONOCLE_ICON = [
    '..ttt..',
    '.kWwwr.',
    'kWwwwwr',
    'kwwwwwr',
    'kwwwwwr',
    '.kwwwr.',
    '..bbb..',
    '.....c.',
    '......c',
    '.....c.',
]


def _grid_icon(rows, colours, cell=CELL):
    h, w = len(rows), len(rows[0])
    m = np.zeros((h + 2, w + 2, 4), np.uint8)
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != '.':
                m[y + 1, x + 1] = colours[ch]
    solid = m[..., 3] > 0
    ring = np.zeros_like(solid)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            ring |= np.roll(np.roll(solid, dy, 0), dx, 1)
    m[ring & ~solid] = OUTLINE
    return Image.fromarray(m, 'RGBA').resize(((w + 2) * cell, (h + 2) * cell), Image.NEAREST)


def glasses_icon():
    solid = lambda c: c[:3] + (255,)
    return _grid_icon(GLASSES_ICON, dict(g=G['gold'], l=G['lit'], d=G['deep'], s=G['side'], L=solid(G['lens'])), cell=6)


def monocle_icon():
    glass = (196, 214, 226, 255)          # the clear glass on a dark tile, and its glint
    return _grid_icon(MONOCLE_ICON, dict(t=M['rim2'], k=M['rimd'], r=M['rim'], b=M['rim'], c=M['chain'],
                                         W=M['glass'][:3] + (255,), w=glass), cell=10)


PIECES = {
    'golden-glasses': dict(
        make=lambda b: {
            'south': glasses_south(b), 'southwest': glasses_southwest(b), 'east': glasses_east(b),
            'northeast': glasses_northeast(),
        },
        icon=lambda: glasses_icon(),
        note=('v2.3.3587: THE COLLECTION\'S GOLDEN GLASSES (owner: "Game matches collection"), drawn by '
              'tools/ui/make_collection_eyewear.py cell by cell from the Hemi Bros piece '
              '(assets/portrait-source/hemi-bros/goldenglasses.png) onto the eyes the game paints, a bust cell two '
              'px of the 128 frame: a gold bar on the eyes\' dark top edge, see-through pale gold lenses (alpha '
              '144), a gold bridge, the near side of the frame in brown shadow.  Southwest is the bust\'s own '
              'layout, south it made symmetric, east its profile, northeast the arm alone where the old piece '
              'drew it.  The art\'s top-centre is the anchor (128, 6) and crownNudge carries it to the crown '
              '(body-tops stand-<dir>-0), so it lands where it was drawn; scale 1 everywhere (the old south '
              'needed 0.912).  The pose fits below are the head\'s, kept from the piece before.  Re-run the tool, '
              'never edit by hand.'),
    ),
    'golden-monocle': dict(
        make=lambda b: {
            'south': monocle_on(_eyes(b, 'south')[1]),
            'southwest': monocle_on(_eyes(b, 'southwest')[1]),
            'east': monocle_on(_eyes(b, 'east')[0]),
        },
        icon=lambda: monocle_icon(),
        note=('v2.3.3587: THE COLLECTION\'S GOLDEN MONOCLE (owner: "Game matches collection"), drawn by '
              'tools/ui/make_collection_eyewear.py cell by cell from the Hemi Bros piece '
              '(assets/portrait-source/hemi-bros/goldenmonocle.png) round the eye the game paints, a bust cell two '
              'px of the 128 frame: a small gold ring, its glass clear with a glint (alpha 137), a short chain off '
              'its lower edge.  On the bust\'s eye, the bro\'s left (the viewer\'s right in south and southwest); '
              'in east on the eye the profile shows; none on northeast or north, where the face is turned away (no png, no anchor: the renderer hides it, the beard precedent).  The '
              'art\'s top-centre is the anchor (128, 6), crownNudge carries it to the crown, scale 1; the pose fits '
              'are the head\'s, kept from the piece before.  Re-run the tool, never edit by hand.'),
    ),
}


def build(pid, boxes, tops):
    old = json.load(open(os.path.join(TRAITS, pid, 'meta.json')))
    arts = PIECES[pid]['make'](boxes)
    files, meta = {}, {
        'category': 'eyewear', 'fullFrame': True, 'note': PIECES[pid]['note'],
        'bboxes': {}, 'anchors': {}, 'crownNudge': {}, 'scale': {},
    }
    for d in DIRS:
        if d not in arts:
            continue      # not drawn from this side: no png, no anchor, so the renderer hides it
        lo, hi, m = place(arts[d], tops, d)
        files[f'{d}.png'] = Image.fromarray(lo, 'RGBA')
        files[f'hi/{d}.png'] = Image.fromarray(hi, 'RGBA')
        meta['bboxes'][d] = m['bbox']
        meta['anchors'][d] = [128, 6]
        meta['crownNudge'][d] = m['nudge']
        meta['scale'][d] = 1
    # the pose fits are the head's (how each pose draws it), nothing about the art
    for k in ('poseFit', 'scaleByPose', 'poseNudge'):
        if k in old:
            meta[k] = old[k]
    th = PIECES[pid]['icon']()
    files['thumb.png'] = th
    files['thumb-sw.png'] = th
    gone = [f'{d}.png' for d in DIRS if d not in arts] + [f'hi/{d}.png' for d in DIRS if d not in arts]
    return files, meta, arts, gone


def coverage(art, eye):
    """the share of an eye box (128 frame) under the piece"""
    x0, x1, y0, y1 = eye
    n = hit = 0
    for y in range(int(np.floor(y0)), int(np.ceil(y1))):
        for x in range(int(np.floor(x0)), int(np.ceil(x1))):
            n += 1
            hit += (x, y) in art.p
    return hit / n if n else 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=None, help='write DIR/<id>/ instead of the game folders')
    ap.add_argument('--check', action='store_true', help='compare with the files there, write nothing')
    args = ap.parse_args()
    boxes = _importer()
    tops = json.load(open(TOPS))
    bad = 0
    for pid in PIECES:
        files, meta, arts, gone = build(pid, boxes, tops)
        for d in ('south', 'southwest', 'east'):
            cov = [f'{coverage(arts[d], e):.0%}' for e in _eyes(boxes, d)]
            print(f'{pid:15s} {d:9s} eyes covered {" ".join(cov):12s} crownNudge {meta["crownNudge"][d]}')
        dest = os.path.join(args.out, pid) if args.out else os.path.join(TRAITS, pid)
        text = json.dumps(meta, indent=2) + '\n'
        if args.check:
            for name, im in files.items():
                p = os.path.join(dest, name)
                if not os.path.isfile(p) or not np.array_equal(np.asarray(Image.open(p).convert('RGBA')), np.asarray(im.convert('RGBA'))):
                    print('DIFFERS', os.path.relpath(p, REPO))
                    bad += 1
            if open(os.path.join(dest, 'meta.json')).read() != text:
                print('DIFFERS', os.path.relpath(os.path.join(dest, 'meta.json'), REPO))
                bad += 1
            for name in gone:
                if os.path.isfile(os.path.join(dest, name)):
                    print('LEFT OVER', os.path.relpath(os.path.join(dest, name), REPO))
                    bad += 1
            continue
        os.makedirs(os.path.join(dest, 'hi'), exist_ok=True)
        for name, im in files.items():
            im.save(os.path.join(dest, name), optimize=True)
        open(os.path.join(dest, 'meta.json'), 'w').write(text)
        for name in gone:
            if os.path.isfile(os.path.join(dest, name)):
                os.remove(os.path.join(dest, name))
        print('wrote', os.path.relpath(dest, REPO) if dest.startswith(REPO) else dest)
    if args.check:
        print('OK' if not bad else f'{bad} file(s) differ')
        sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
