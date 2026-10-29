#!/usr/bin/env python3
"""v2.3.3580: THE TOWNSFOLK'S DIALOGUE PORTRAITS, AS HEMI BROS.

The owner: "So Hemi bros is based off the NFT characters shown here. Can you
try to model the portraits as close as you can to something found here? I
added more to the game than exists in the actual collection" -- the
collection's catalogue, github.com/hemibroscommunity-del/Hemi-Bros-catalogue:
3,333 portraits, each a 32 x 32 pixel bust turned to the viewer's left on a
flat background (640 px, 20 px a pixel), and the trait layers they are
stacked from (Bro Type, Clothes, Eyes, Eyewear, Headwear, Mouth Items).

Each townsperson's dialogue head is such a bust, built from the collection's
OWN trait art: the traits nearest his look in the game (tools/qa/
npc-looks.mjs), his skin tone, and the few colours that make him him (the
Mayor's grey beard).  Where the game has more than the collection -- a skin
tone, hair under a hat -- the collection's pieces are recoloured, or its own
way wins (a bro in a hat is bald under it), never redrawn.  They replace the
creator figure's headshot, which the owner found "fuzzy" with "some stray
pixels": each is its 32 x 32 pixels, every one a flat colour, made 6 x 6 file
px, lossless.

    python3 tools/qa/nft_portraits.py extract <catalogue>   # once: the layers
    python3 tools/qa/nft_portraits.py                       # the portraits

EXTRACT reads the catalogue and writes every trait it can place as a 32 x 32
picture on the busts' own grid, assets/portrait-source/hemi-bros/<trait>.png,
plus backgrounds.json -- so the portraits never need the catalogue again:
- READ: the layer files are each cropped and scaled differently (one of
  their pixels is 11 to 40 file px) and were enlarged smoothly, so each
  layer's own pixel grid is found from its edges and every cell is judged by
  its whole inside, a cell the file's edge cuts through included (a brim's
  tips lie in such cells).
- PLACED where it matches the real NFTs that wear it (six each, every cell
  matching).  A trait too small to show its grid (the eyes, the monocle, the
  gold glasses, the low beard, the camo) is LIFTED out of the NFTs instead:
  an NFT wearing it is rebuilt from the traits already placed, and the cells
  that differ, in at least half of up to seven NFTs, are the trait.
- MENDED: some files are not quite the art the NFTs were made with (the
  slick-back hair stops at the jaw where every NFT carries it down the nape;
  the goggles -- the sheet's "Flattened" -- have no strap and clear lenses),
  so every layer is checked cell by cell against the NFTs that wear it and
  put right where they agree.  An eyewear's GLASS is found the same way: on
  the collection's two skins, orange and brown, the cells that let what is
  under them show become one see-through tint (the goggles a blue-grey 56%,
  the monocle clear, the gold glasses gold), over a townsperson's own skin.
- CHECKED: rebuilt whole from the layers, the real NFTs of both skins come
  out within 12 of their 1,024 pixels, 0.3-0.4 on average (the WebP's own
  smear); past 12 nothing is written.

The default writes public/sprites/npc/<head>.webp: the bust at 6 file px a
pixel, 192 x 192, lossless, and a contact sheet in tools/qa/out/npc-looks/.

v2.3.3585: DRESSED AS THE GAME DRESSES THEM.  The owner, of the first busts:
"I'd rather you try to modify the existing portraits to look like how you
designed them in the game (mayor bro suspenders, larger beard, etc)".  So
past the collection's own pieces, each bust now wears what the townsperson
wears in the world, read off the game's own tables (GAME, below) and his
look in tools/qa/npc-looks.mjs:
- his T-SHIRT, its colour and its pattern (the Mayor's navy and white
  stripes, his "suspenders"; Diego's purple diagonals ...) laid on the
  collection's plain tee, its outline and its light kept (`tee`);
- his LONG BEARD, as long as the world's, run from the collection's jaw
  beard down over the neck and chest, in his beard's colour (`long_beard`);
- his eyes (`eyes: 'none'` in the game is the collection's Normal Eyes), and
  no logo the game's piece does not have (the bucket hat's, the headphones'
  "b").

v2.3.3587: AND THE GAME DRESSES THEM AS THE COLLECTION DOES.  The owner, of
the gold glasses, the Woodworker's hair and the Mayor's monocle, which the
portraits wore as the collection draws them and the world did not: "Game
matches collection".  So the game's Golden Glasses and Golden Monocle are
the collection's now (tools/ui/make_collection_eyewear.py) and the
Woodworker wears the game's Afro (tools/qa/npc-looks.mjs); here the
monocle's glass is the collection's clear again -- v2.3.3585 painted it the
world's blue, and the world's is clear now too.
"""
import csv
import json
import os
import re
import sys

import numpy as np
from PIL import Image

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(REPO, 'assets', 'portrait-source', 'hemi-bros')
OUT = os.path.join(REPO, 'public', 'sprites', 'npc')
PREVIEW = os.path.join(REPO, 'tools', 'qa', 'out', 'npc-looks')
GRID = 32
SCALE = 6           # file px a bust pixel: 192 x 192, the heads' size

FOLDER = {'bro': 'Bro Type', 'clothes': 'Clothes', 'eyes': 'Eyes', 'eyewear': 'Eyewear',
          'mouth': 'Mouth Items', 'headwear': 'Headwear'}
SLOTS = ['Clothes', 'Mouth Items', 'Eyes', 'Eyewear', 'Headwear']
# the spreadsheet's trait names whose file is not the name squashed
FILE_OF = {
    'Normal Soldier Outfit': 'normalsoldier', 'Headphone': 'headphones', 'Nerd': 'nerdglasses',
    'White Glass': 'whiteglasses', 'Thug Life Glass': 'thuglifeglasses', 'Flat Top Hairstyle': 'flattophairstyle',
    'Grey Zipper Hoodie': 'grayzipperhoodie', 'Light Brown Fash Hoodie': 'lightbrownfashion',
    'White Puffer Jacket': 'whitepuffer', 'Blue Puffer Jacket': 'bluepuffer', 'Yellow Running Jacket': 'yellowrunning',
    "Ken's Jacket": 'kensjacket', 'Swat Armour': 'swatarmor', 'Bandana': 'redbandana', 'Head Band': 'headband',
    'Angel Ring': 'halo', 'Axe On Head': 'axehead', 'Army Helmet': 'armhelm', 'Safety Helmet': 'hardhat',
    'Naruto Headband': 'naruto', 'Cat Ear': 'catears', 'Mickey Ears': 'mickeyears', 'Viking Helmet': 'vikinghelm',
    'Spartan Helmet': 'spartanhelm', 'Ironman Helmet': 'ironmanmask', 'Blond Hair': 'lightbrownhair',
    'Backwards Cap': 'backwardshat', 'Throwup': 'vomit', 'Vampire': 'fangs', 'Cigarette': 'smoking',
    'Flattened': 'goggles',
}
# traits lifted out of the NFTs (too small to read a grid from), in order --
# the eyes first, as the others' NFTs wear eyes -- with the rows and columns
# of the bust they can be in
LIFT = [
    ('Eyes', 'Normal Eyes', (10, 20, 6, 24)), ('Eyes', 'Wtf Eyes', (10, 20, 6, 24)),
    ('Eyes', 'Sleepy Eyes', (10, 20, 6, 24)), ('Eyes', 'Happy Eyes', (10, 20, 6, 24)),
    ('Eyes', 'Sus Eyes', (10, 20, 6, 24)),
    ('Eyewear', 'Golden Monocle', (6, 32, 2, 28)), ('Eyewear', 'Golden Glasses', (8, 22, 0, 32)),
    ('Eyewear', 'Nerd', (8, 22, 0, 32)), ('Mouth Items', 'Low Beard', (12, 32, 2, 30)),
    ('Mouth Items', 'Old Wise Man Mustache', (12, 32, 2, 30)), ('Clothes', 'Normal Soldier Outfit', (18, 32, 0, 32)),
]


def file_of(name):
    return FILE_OF.get(name) or name.lower().replace(' ', '').replace("'", '')


# ── extract ────────────────────────────────────────────────────────────────

def _grid(a, axis):
    """(concentration, period, phase) of a layer's pixel grid along one axis,
    from its edges"""
    d = np.abs(np.diff(a.astype(int), axis=axis)).sum(axis=2) > 40
    hits = d.sum(axis=0) if axis == 1 else d.sum(axis=1)
    pos = np.nonzero(hits > 0)[0] + 1
    w = hits[hits > 0]
    best = None
    for p100 in range(1100, 4200, 5):
        p = p100 / 100
        ang = np.mod(pos, p) / p * 2 * np.pi
        c, s = (w * np.cos(ang)).sum(), (w * np.sin(ang)).sum()
        conc = np.hypot(c, s) / w.sum()
        if best is None or conc > best[0]:
            best = (conc, p, (np.arctan2(s, c) % (2 * np.pi)) / (2 * np.pi) * p)
    return best


def _native(path):
    """a layer file read back to its true pixels.  The files were enlarged
    smoothly, so a cell is judged by its whole inside (a fifth of a cell in
    from its edges): opaque when most of it is, its colour the commonest
    there.  A cell the file's edge cuts through counts by what of it is on
    the file -- a brim's tips and a beard's front edge lie in such cells, and
    a cell's middle alone missed them."""
    a = np.asarray(Image.open(path).convert('RGBA'))
    _, px, phx = _grid(a, 1)
    _, py, phy = _grid(a, 0)
    p = (px + py) / 2
    H, W = a.shape[:2]
    x0s = np.arange(phx % p - p, W, p)
    y0s = np.arange(phy % p - p, H, p)
    out = np.zeros((len(y0s), len(x0s), 4), np.uint8)
    for j, y0 in enumerate(y0s):
        ya, yb = max(0, int(round(y0 + p * .2))), min(H, int(round(y0 + p * .8)))
        if yb - ya < 2:
            continue
        for i, x0 in enumerate(x0s):
            xa, xb = max(0, int(round(x0 + p * .2))), min(W, int(round(x0 + p * .8)))
            if xb - xa < 2:
                continue
            blk = a[ya:yb, xa:xb].reshape(-1, 4)
            op = blk[blk[:, 3] >= 128]
            if len(op) * 2 < len(blk):
                continue
            cols, n = np.unique(op[:, :3], axis=0, return_counts=True)
            out[j, i, :3] = cols[n.argmax()]
            out[j, i, 3] = 255
    return out


# The collection's two skins of the one bro: orange (Bro) and brown (Different
# Bro).  Their NFTs are what the layers are checked on; with both, a see-through
# lens shows what is under it change.
BASES = {'Bro': 'bro', 'Different Bro': 'differentbro'}


class _Nfts:
    """the collection's NFTs, each read back once to its 32 x 32 pixels"""

    def __init__(self, cat):
        self.cat = cat
        self.rows = list(csv.DictReader(open(os.path.join(cat, 'Hemi Bro spreadsheet-CleanDataWithImages.csv'))))
        self.plain = [r for r in self.rows if r['Bro Type'] in BASES]
        self._px = {}

    def __call__(self, r):
        f = r['Image'].split('/')[-1]
        if f not in self._px:
            self._px[f] = _nft32(os.path.join(self.cat, 'images', f))
        return self._px[f]


def _nft32(path):
    """an NFT back to its 32 x 32 pixels: each cell's inner median (the WebP
    smears its edges)"""
    a = np.asarray(Image.open(path).convert('RGB'))
    H, W = a.shape[:2]
    out = np.zeros((GRID, GRID, 3), np.uint8)
    for j in range(GRID):
        for i in range(GRID):
            y0, x0 = int((j + 0.25) * H / GRID), int((i + 0.25) * W / GRID)
            blk = a[y0:y0 + int(H / (2 * GRID)), x0:x0 + int(W / (2 * GRID))].reshape(-1, 3)
            out[j, i] = np.median(blk, axis=0)
    return out


def _place(lay, target):
    """the offset putting a layer's opaque cells on the target's colours
    best: (share matching, dx, dy)"""
    h, w = lay.shape[:2]
    ys, xs = np.nonzero(lay[..., 3])
    best = None
    for dy in range(-h + 4, GRID - 3):
        for dx in range(-w + 4, GRID - 3):
            ty, tx = ys + dy, xs + dx
            ok = (ty >= 0) & (ty < GRID) & (tx >= 0) & (tx < GRID)
            if ok.sum() < len(ys) * 0.6:
                continue
            d = np.abs(lay[ys[ok], xs[ok], :3].astype(int) - target[ty[ok], tx[ok]].astype(int)).sum(axis=1)
            score = (d < 60).sum() - 0.5 * (~ok).sum()
            if best is None or score > best[0]:
                best = (score, dx, dy)
    return None if best is None else (best[0] / max(1, len(ys)), best[1], best[2])


def _put(lay, dx, dy):
    out = np.zeros((GRID, GRID, 4), np.uint8)
    h, w = lay.shape[:2]
    for j in range(h):
        for i in range(w):
            y, x = j + dy, i + dx
            if 0 <= y < GRID and 0 <= x < GRID and lay[j, i, 3]:
                out[y, x] = lay[j, i]
    return out


def _over(base, top):
    """top over base; a see-through cell (a lens) blends with what is under it"""
    m = top[..., 3] > 0
    k = top[..., 3:4].astype(float) / 255
    mix = np.round(base[..., :3] * (1 - k) + top[..., :3] * k).astype(np.uint8)
    base[..., :3] = np.where(m[..., None], mix, base[..., :3])
    return base


def _none(v):
    return v in ('None', '')


def _rebuild(look, r, layers, skip=None):
    """an NFT rebuilt from the layers (its own background), without `skip`.
    The layers are drawn on the orange bro; a brown one's eyes have his skin
    where theirs has the orange, as the bake gives every townsperson his."""
    base = np.zeros((GRID, GRID, 4), np.uint8)
    base[..., :3] = look(r)[0, 0]
    base[..., 3] = 255
    _over(base, layers[BASES[r['Bro Type']]])
    for c in ORDER_SLOTS:
        if c != skip and not _none(r[c]):
            lay = layers[file_of(r[c])]
            if c == 'Eyes' and r['Bro Type'] != 'Bro':
                lay = _reskin(lay, BROWN)
            _over(base, lay)
    return base[..., :3].astype(int)


def _known(layers, r, but=None):
    return all(_none(r[c]) or file_of(r[c]) in layers for c in SLOTS if c != but)


def _lens_fit(U, V):
    """one see-through colour over whatever is under it, V = (1 - a) U + a T,
    by least squares (a shared, T per channel)"""
    n = len(U)
    A = np.zeros((3 * n, 4))
    b = np.zeros(3 * n)
    for k in range(3):
        A[k::3, 0] = -U[:, k]
        A[k::3, 1 + k] = 1
        b[k::3] = V[:, k] - U[:, k]
    sol = np.linalg.lstsq(A, b, rcond=None)[0]
    a = float(np.clip(sol[0], 0.1, 0.9))
    return a, np.clip(sol[1:] / a, 0, 255)


MEND_TOL = 24        # a cell is off when its colour is this far from the NFT's (the WebP's own noise is < 8)
MEND_SHARE = 0.7     # ...in this share of the NFTs that wear the trait, and at least 3 of them


def _lens_find(U, V, cells, need):
    """the one see-through colour over what is under it, V = (1 - a) U + a T,
    that explains the most of these cells: (a, T, cells), or None.  A cell is
    glass when, in at least `need` NFTs, the tint gives its colour, and does
    so better than any one colour would -- a nearly opaque tint gives a solid
    cell's colour too, near enough, so a cell whose colour does not follow
    what is under it is not glass.  Two colours seen under it with their two
    colours over it fix a tint (one k = 1 - a for the three channels, by least
    squares), so it is found from pairs of what was seen."""
    def glass(a, T):
        got = []
        for y, x in cells:
            u, v = U[:, y, x], V[:, y, x]
            e = np.abs((1 - a) * u + a * T - v).sum(axis=1)
            if (e <= 2 * MEND_TOL).sum() < need:
                continue
            flat = np.abs(v - np.median(v, axis=0)).sum(axis=1)
            if e.sum() < 0.6 * flat.sum():
                got.append((y, x))
        return got

    seen = {}
    for y, x in cells:
        for k in range(len(U)):
            seen.setdefault((tuple(U[k, y, x] // 4), tuple(V[k, y, x] // 4)), (U[k, y, x].astype(float), V[k, y, x].astype(float)))
    pts = list(seen.values())
    best = None
    for i in range(len(pts)):
        for j in range(i + 1, len(pts)):
            (u1, v1), (u2, v2) = pts[i], pts[j]
            du, dv = u1 - u2, v1 - v2
            if np.abs(du).sum() < 40:
                continue
            k = float(du @ dv) / float(du @ du)
            if not 0.2 <= k <= 0.85 or np.abs(dv - k * du).max() > 8:
                continue
            a = 1 - k
            T = np.clip((v1 - k * u1) / a, 0, 255)
            got = glass(a, T)
            if best is None or len(got) > len(best[2]):
                best = (a, T, got)
    if not best or len(best[2]) < 3:
        return None
    uu = np.concatenate([U[:, y, x] for y, x in best[2]]).astype(float)
    vv = np.concatenate([V[:, y, x] for y, x in best[2]]).astype(float)
    a, T = _lens_fit(uu, vv)
    got = glass(a, T)
    return (a, T, got) if len(got) >= len(best[2]) else best


def _mend(look, layers, f, col, wear, mixed, control):
    """a layer checked against the NFTs that wear it, cell by cell, and put
    right where they agree: a cell they all show and the layer misses is
    added in their colour; one the layer has and they show the bro or
    background through is taken out; a see-through lens (an eyewear's cells
    that let what is under them show) becomes one tint over whatever it
    covers.  A cell off in NFTs that do NOT wear it (`control`) is not this
    trait's to mend.  `wear` are orange bros, so every colour stays the
    orange bro's; `mixed` has brown ones too, for the lens to show through."""
    lay = layers[f].copy()
    U = np.array([_rebuild(look, r, layers, skip=col) for r in wear])
    V = np.array([look(r).astype(int) for r in wear])
    n = len(wear)
    need = max(3, int(np.ceil(MEND_SHARE * n)))
    R = np.array([_over(np.dstack([u.astype(np.uint8), np.full((GRID, GRID), 255, np.uint8)]), lay)[..., :3].astype(int) for u in U])
    off = np.abs(V - R).sum(axis=3) > MEND_TOL
    shows_under = np.abs(V - U).sum(axis=3) <= MEND_TOL
    todo = [(y, x) for y in range(GRID) for x in range(GRID) if off[:, y, x].sum() >= need and not control[y, x]]
    lens = None
    if col == 'Eyewear' and len(mixed) >= 3:
        cand = sorted(set(todo) | {(y, x) for y, x in zip(*np.nonzero(lay[..., 3])) if not control[y, x]})
        mU = np.array([_rebuild(look, r, layers, skip=col) for r in mixed])
        mV = np.array([look(r).astype(int) for r in mixed])
        lens = _lens_find(mU, mV, cand, max(3, int(np.ceil(MEND_SHARE * len(mixed)))))
    glass = set(lens[2]) if lens else set()
    added = cut = tinted = 0
    for y, x in sorted(set(todo) | glass):
        if (y, x) in todo and shows_under[:, y, x].sum() >= need:
            if lay[y, x, 3]:
                lay[y, x] = 0
                cut += 1
            continue
        if (y, x) in glass:
            lay[y, x, :3] = np.round(lens[1])
            lay[y, x, 3] = int(round(lens[0] * 255))
            tinted += 1
            continue
        v = V[off[:, y, x], y, x]
        med = np.median(v, axis=0)
        if np.abs(v - med).sum(axis=1).max() <= 2 * MEND_TOL:
            lay[y, x, :3] = med
            lay[y, x, 3] = 255
            added += 1
    layers[f] = lay
    return added, cut, tinted


def extract(cat):
    look = _Nfts(cat)
    plain = look.plain
    kind_of = {}
    for k, folder in FOLDER.items():
        for f in os.listdir(os.path.join(cat, folder)):
            kind_of[f[:-4]] = k
    os.makedirs(SRC, exist_ok=True)
    layers = {}

    # the bro in both skins, then every trait an NFT wears, placed by the NFTs
    # that wear it
    for kind, f in BASES.items():
        bro = _native(os.path.join(cat, 'Bro Type', f + '.png'))
        votes = [_place(bro, look(r)) for r in [r for r in plain if r['Bro Type'] == kind][:5]]
        dx, dy = max(set((v[1], v[2]) for v in votes), key=[(v[1], v[2]) for v in votes].count)
        layers[f] = _put(bro, dx, dy)
        print(f'placed  {f:20s} at {dx:3d},{dy:3d}')
    names = {}
    for col in SLOTS:
        for r in plain:
            if not _none(r[col]):
                names.setdefault(file_of(r[col]), (col, r[col]))
    lifted = {file_of(v) for _, v, _ in LIFT}
    for f, (col, v) in sorted(names.items()):
        if f not in kind_of or f in lifted:
            continue
        lay = _native(os.path.join(cat, FOLDER[kind_of[f]], f + '.png'))
        offs = []
        for r in [r for r in plain if r[col] == v][:6]:
            b = _place(lay, look(r))
            if b and b[0] > 0.9:
                offs.append((b[1], b[2]))
        if offs:
            dx, dy = max(set(offs), key=offs.count)
            layers[f] = _put(lay, dx, dy)
            print(f'placed  {f:20s} at {dx:3d},{dy:3d}  ({offs.count((dx, dy))} of {len(offs)} NFTs)')

    # the small ones, lifted
    for col, val, (y0, y1, x0, x1) in LIFT:
        cands = [r for r in plain if r[col] == val and r['Bro Type'] == 'Bro' and _known(layers, r, col)]
        cands.sort(key=lambda r: sum(1 for c in SLOTS if c != col and not _none(r[c])))
        got = []
        for r in cands[:7]:
            t = look(r).astype(int)
            d = np.abs(t - _rebuild(look, r, layers, skip=col)).sum(axis=2)
            m = np.zeros((GRID, GRID), bool)
            m[y0:y1, x0:x1] = d[y0:y1, x0:x1] > 50
            got.append((m, t))
        if not got:
            print(f'NOT LIFTED {val}: no NFT wears it with only placed traits')
            continue
        agree = sum(g[0].astype(int) for g in got) >= max(2, (len(got) + 1) // 2) if len(got) > 1 else got[0][0]
        lay = np.zeros((GRID, GRID, 4), np.uint8)
        for y, x in zip(*np.nonzero(agree)):
            lay[y, x, :3] = np.median(np.array([g[1][y, x] for g in got if g[0][y, x]]), axis=0)
            lay[y, x, 3] = 255
        layers[file_of(val)] = lay
        print(f'lifted  {file_of(val):20s} {int(agree.sum())} pixels from {len(got)} NFTs')

    # MENDED against the NFTs.  Some trait files are not quite the art the
    # NFTs were made with -- the slick-back hair's file stops at the jaw where
    # every NFT carries it down the nape, the goggles' file has no strap and
    # clear lenses -- so every layer is checked against the NFTs that wear it
    # and put right where they agree.  The bro first, on the cells no trait
    # covers; then each trait, twice round (each mend sharpens the others'
    # rebuilds).
    every = [r for r in plain if _known(layers, r)]

    def offmap(rs):
        o = np.zeros((GRID, GRID), float)
        for r in rs:
            o += np.abs(look(r).astype(int) - _rebuild(look, r, layers)).sum(axis=2) > MEND_TOL
        return o / max(1, len(rs))

    for kind, base in BASES.items():
        mine = [r for r in every if r['Bro Type'] == kind][:160]
        frees = []
        hits = np.zeros((GRID, GRID), int)
        for r in mine:
            free = np.ones((GRID, GRID), bool)
            for c in SLOTS:
                if not _none(r[c]):
                    free &= layers[file_of(r[c])][..., 3] == 0
            frees.append(free)
            hits += free & (np.abs(look(r).astype(int) - _rebuild(look, r, layers)).sum(axis=2) > MEND_TOL)
        seen = np.sum(frees, axis=0)
        fixed = 0
        for y, x in zip(*np.nonzero((seen >= 20) & (hits >= MEND_SHARE * seen))):
            rs = [r for r, free in zip(mine, frees) if free[y, x]]
            vs = np.array([look(r)[y, x].astype(int) for r in rs])
            bg = np.array([look(r)[0, 0].astype(int) for r in rs])
            if (np.abs(vs - bg).sum(axis=1) <= MEND_TOL).mean() >= MEND_SHARE:
                layers[base][y, x] = 0
            else:
                layers[base][y, x, :3] = np.median(vs, axis=0)
                layers[base][y, x, 3] = 255
            fixed += 1
        print(f'mended  {base:20s} {fixed} cells')
    for rnd in (1, 2):
        for f, (col, v) in sorted(names.items()):
            if f not in layers:
                continue
            by = {}
            for kind in BASES:     # the fewest other traits first
                mine = [r for r in plain if r['Bro Type'] == kind and r[col] == v and _known(layers, r, col)]
                by[kind] = sorted(mine, key=lambda r: sum(1 for c in SLOTS if c != col and not _none(r[c])))
            wear = by['Bro'][:12]
            if len(wear) < 3:
                continue
            control = offmap([r for r in every if r[col] != v and r['Bro Type'] == 'Bro'][::17][:40]) >= 0.3
            a, c, t = _mend(look, layers, f, col, wear, by['Bro'][:8] + by['Different Bro'][:8], control)
            if a or c or t:
                print(f'mended  {f:20s} round {rnd}: {a} added, {c} taken out, {t} lens')

    # the check: real NFTs rebuilt whole
    worst = 0
    for kind in BASES:
        full = [r for r in plain if r['Bro Type'] == kind and _known(layers, r)
                and sum(not _none(r[c]) for c in SLOTS) >= 3][::3][:200]
        d = [np.abs(look(r).astype(int) - _rebuild(look, r, layers)).sum(axis=2) for r in full]
        off = [int((x > 50).sum()) for x in d]
        fine = [int((x > MEND_TOL).sum()) for x in d]
        worst = max(worst, max(off))
        print(f'check: {len(full)} {kind} NFTs rebuilt from the layers, {max(off)} of 1,024 pixels off at most, '
              f'{sum(off) / len(off):.1f} on average ({max(fine)} / {sum(fine) / len(fine):.1f} at the mending tolerance)')
    if worst > 12:
        print('NOT WRITTEN: the layers do not rebuild the NFTs')
        sys.exit(1)

    bgs = {}
    for name in sorted({r['Background'] for r in look.rows if r['Background']}):
        cs = [tuple(int(v) for v in look(r)[0, 0]) for r in [r for r in look.rows if r['Background'] == name][:5]]
        bgs[name] = list(max(set(cs), key=cs.count))
    for f in os.listdir(SRC):
        if f.endswith('.png'):
            os.remove(os.path.join(SRC, f))
    for f, lay in layers.items():
        Image.fromarray(lay, 'RGBA').save(os.path.join(SRC, f + '.png'))
    json.dump(bgs, open(os.path.join(SRC, 'backgrounds.json'), 'w'), indent=1)
    print(f'wrote {len(layers)} layers and {len(bgs)} backgrounds to', os.path.relpath(SRC, REPO))


# the order the collection stacks them, read off the rebuilds: the bro, then
# clothes, eyes, eyewear, headwear, and the mouth item over all
ORDER_SLOTS = ['Clothes', 'Eyes', 'Eyewear', 'Headwear', 'Mouth Items']


# ── bake ───────────────────────────────────────────────────────────────────

# the game's skin tones (playerSkins.js SKIN_CATALOG targets), and the bro's
# own orange, which the collection's every Bro wears
SKIN = {'fair': (230, 194, 155), 'tan': (200, 140, 80), 'brown': (155, 105, 65), 'sand': (217, 177, 132),
        'pale': (240, 205, 170), 'olive': (178, 138, 94), 'honey': (201, 162, 113), 'rosy': (242, 201, 184),
        # v2.3.3833: the new cast's five more
        'ivory': (242, 218, 188), 'porcelain': (245, 221, 205), 'alabaster': (249, 236, 226), 'deep': (112, 76, 50),
        'ebony': (82, 56, 39)}
SKIN_REF = (233, 153, 73)
BROWN = (198, 129, 61)      # the collection's other skin, the Different Bro's
SKIN_FAMILY = [(233, 153, 73), (224, 147, 70), (189, 124, 59), (148, 97, 46)]
GREY = ((96, 96, 104), (206, 206, 212))
DARK = ((42, 38, 44), (92, 86, 90))
HAT_BLACK = ((34, 32, 38), (84, 82, 92))
HAIR_BLACK = ((14, 15, 17), (52, 52, 58))   # v2.3.3585: Diego's, the slick-back's grey shine taken out
BLONDE = ((150, 104, 36), (250, 222, 128))  # v2.3.3833: Chef Blaze's flat-top
PINK = ((160, 60, 110), (250, 170, 210))     # v2.3.3833: Bean's hair and cat ears
OUTLINE = (31, 13, 27)      # the collection's one outline colour, in every layer
# The hats.  The collection wears hair OR a hat (one Headwear each): a bro in
# a hat is bald under it, his ear showing below the brim.  So is a
# townsperson's portrait, though the game gives him hair under it -- hair cut
# to what hung below the brim left a lone pixel, a sliver of brown or a grey
# band where the ear goes, the owner's "stray pixels".  A band (the bandana,
# the headphones) sits on the hair, as in the game.
HATS = {'tophat', 'buckethat', 'cowboyhat', 'derbyhat', 'brownhat', 'flatcap', 'foldedbrim', 'fez', 'bluecap',
        'backwardshat', 'redbeanie', 'sheriffhat', 'mexicanhat', 'russianhat', 'oldbuckethat', 'goldenbucket'}

# Each townsperson: the collection's traits nearest his look in the game
# (tools/qa/npc-looks.mjs NPC_LOOKS, the satire pass's stereotypes), his game
# skin, a background of the collection's own, and the colours his look
# insists on.  `hair` with a band; never under a hat (HATS).
# v2.3.3585: `look` names his NPC_LOOKS entry, whose shirt, beard and eyes the
# bust now wears as the world does (bake); `tee` places his shirt's pattern on
# the bust's few rows of chest, by eye against the world's picture; `lens` is
# a monocle's glass painted over (none since v2.3.3587: the world's monocle is
# the collection's, clear); `relogo` paints out a logo the game's piece has not
# got; `trim` cuts a hair layer at a row (Diego's hair is short in the world).
PORTRAITS = {
    # top hat, the collection's monocle (v2.3.3587: its glass clear again, as
    # the world's is now), his long grey beard; the navy and white stripes the
    # owner calls his suspenders, one either side of it
    'mayor-bro-head': dict(look='mayor', skin='fair', bg='Purple Navy', eyewear='goldenmonocle',
                           headwear='tophat', tee=dict(cell=2, ox=1)),
    # the gym bro: shirtless, red sweatband over a flat-top, his long black beard
    'blacksmith-bro-head': dict(look='blacksmith', skin='tan', bg='Rose Taupe', hair='flattophairstyle',
                                headwear='redbandana'),
    # the hustler: short slicked hair, gold glasses, the loud purple tee
    'shopkeeper-bro-head': dict(look='diego', skin='brown', bg='Dark Lavender', eyewear='goldenglasses',
                                hair='slickbackhair', trim={'hair': 14}, recolour={'hair': HAIR_BLACK}, tee=dict(cell=1)),
    # the dirt hippie: the plain green bucket hat, wide eyes, his long beard,
    # pink chevrons on yellow
    'farmer-bro-head': dict(look='farmer', skin='sand', bg='Russian Green', headwear='buckethat',
                            relogo={'headwear': [((238, 230, 234), (94, 161, 72))]}, tee=dict(cell=1)),
    # the overthinker: workshop goggles, wild grey hair, his graph-paper tee
    'woodworker-bro-head': dict(look='woodworker', skin='pale', bg='Teal Blue', eyewear='goggles',
                                hair='afro', recolour={'hair': GREY}, tee=dict(cell=2, ox=16, oy=27)),
    # the survival host: brown hat, his long beard, sleepless eyes, camo
    'beastmaster-bro-head': dict(look='beastmaster', skin='olive', bg='Camouflage Green', headwear='cowboyhat',
                                 tee=dict(cell=1)),
    # the iPad kid: plain red headphones on blonde hair, the banded tee
    'lil-bro-head': dict(look='lilbro', skin='honey', bg='Teal Blue', hair='blondehair', headwear='headphones',
                         relogo={'headwear': [((255, 255, 255), (152, 10, 4))]}, tee=dict(cell=1, oy=27)),
    # the bookie: a black derby, yellow diamonds on green felt
    'cardsharp-bro-head': dict(look='ace', skin='rosy', bg='Middle Green', headwear='derbyhat',
                               recolour={'headwear': HAT_BLACK}, tee=dict(cell=1, ox=7, oy=27)),
    # ═══ v2.3.3833: THE NEW CAST (docs/specs/npc-cast.md) ═══
    # Each from the traits the approved draft named; past them, as above, his
    # shirt, beard and eyes as the world wears them (so the draft's Suit or
    # Raincoat is his tee and its pattern, as every bust's clothes are).
    # the crypto banker: split hair, the laser visor, navy pinstripes
    'sterling-head': dict(look='banker', skin='ivory', bg='Purple Navy', hair='splithair', eyewear='laserglass',
                          recolour={'hair': HAIR_BLACK}, tee=dict(cell=1)),
    # the mixologist: black hair (the collection has no wavy), his beard, checks
    'slim-head': dict(look='barkeep', skin='deep', bg='Rose Taupe', hair='lightbrownhair',
                      recolour={'hair': HAIR_BLACK}, tee=dict(cell=1)),
    # the TV chef: a blonde flat-top, the shades, his blonde beard, flames
    'chef-blaze-head': dict(look='chef', skin='rosy', bg='Dark Lavender', hair='flattophairstyle', eyewear='thuglifeglasses',
                            recolour={'hair': BLONDE}, tee=dict(cell=1)),
    # the crystal healer: dark hair under a halo, purple polka
    'glint-head': dict(look='gemguru', skin='porcelain', bg='Teal Blue', hair='lightbrownhair', headwear='halo',
                       recolour={'hair': DARK}, tee=dict(cell=1)),
    # the clerk: the blue cap, his grey beard, bands
    'postmaster-pete-head': dict(look='postman', skin='fair', bg='Purple Navy', headwear='bluecap', tee=dict(cell=1)),
    # the swamp seller: a flat cap, teal diamonds
    'deed-dave-head': dict(look='realtor', skin='tan', bg='Middle Green', headwear='flatcap', tee=dict(cell=1)),
    # the bellhop: the fez, a red windowpane
    'benny-head': dict(look='bellhop', skin='brown', bg='Dark Lavender', headwear='fez', tee=dict(cell=1)),
    # the raid leader: the headband over blonde hair, black diamonds
    'guildmaster-gary-head': dict(look='guildmaster', skin='pale', bg='Russian Green', hair='blondehair', headwear='naruto',
                                  tee=dict(cell=1)),
    # the mall cop: the sheriff's hat, the shades, yellow stripes
    'sheriff-buck-head': dict(look='sheriff', skin='sand', bg='Camouflage Green', headwear='sheriffhat',
                              eyewear='thuglifeglasses', tee=dict(cell=1)),
    # the auctioneer: the crown, his black beard, yellow diagonals
    'gavel-greg-head': dict(look='auctioneer', skin='ebony', bg='Purple Navy', headwear='crown', tee=dict(cell=1)),
    # the old fisherman: a grey beanie, his long white beard, sleepy eyes, his yellow slicker
    'old-man-reel-head': dict(look='fisher', skin='alabaster', bg='Teal Blue', headwear='redbeanie',
                              recolour={'headwear': GREY}, tee=dict(cell=1)),
    # the kid streamer: pink cat ears on pink hair, pink polka
    'bean-head': dict(look='streamer', skin='honey', bg='Dark Lavender', hair='splithair', headwear='catears',
                      recolour={'hair': PINK, 'headwear': PINK}, tee=dict(cell=1)),
    # the lost tourist: the sombrero, the monocle, white polka
    'tourist-terry-head': dict(look='tourist', skin='porcelain', bg='Middle Green', headwear='mexicanhat',
                               eyewear='goldenmonocle', tee=dict(cell=1)),
}
# the game's eye styles as the collection's eyes
EYES = {'none': 'normaleyes', 'wtf': 'wtfeyes', 'sleepy': 'sleepyeyes', 'happy': 'happyeyes', 'sus': 'suseyes'}
STACK = ['clothes', 'eyes', 'eyewear', 'hair', 'headwear', 'mouth']


def _lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def _reskin(lay, target):
    """the bro's orange skin (and the eyes' own skin shading) to a game tone,
    by brightness, as the game's own _retint does"""
    out = lay.copy()
    for y, x in zip(*np.nonzero(lay[..., 3])):
        c = lay[y, x, :3].astype(int)
        if min(np.abs(c - np.array(s)).sum() for s in SKIN_FAMILY) <= 24:
            out[y, x, :3] = np.clip(np.array(target) * (_lum(c) / _lum(SKIN_REF)), 0, 255)
    return out


def _ramp(lay, lo, hi):
    """every colour but the outline onto lo..hi, in its own order of
    brightness.  Only the collection's outline colour stays: a dark shade
    of the hair kept as it was left half a grey afro black, and a beard's
    darkest browns brown in a grey beard."""
    out = lay.copy()
    m = lay[..., 3] > 0
    cols = sorted({tuple(int(v) for v in lay[y, x, :3]) for y, x in zip(*np.nonzero(m))}, key=_lum)
    cols = [c for c in cols if sum(abs(c[i] - OUTLINE[i]) for i in range(3)) > 12]
    if not cols:
        return out
    l0, l1 = _lum(cols[0]), _lum(cols[-1])
    for y, x in zip(*np.nonzero(m)):
        c = tuple(int(v) for v in lay[y, x, :3])
        if c in cols:
            t = 0 if l1 == l0 else (_lum(c) - l0) / (l1 - l0)
            out[y, x, :3] = [int(lo[i] + (hi[i] - lo[i]) * t) for i in range(3)]
    return out


# ── v2.3.3585: the game's own tables ───────────────────────────────────────
# Read from the game's source, never copied, so a colour or a pattern changed
# there is changed here at the next bake.

def _read(rel):
    return open(os.path.join(REPO, rel)).read()


def _rgb_targets(rel):
    """a colour catalog's {id: [r, g, b]} (its `target`s)"""
    out = {}
    for m in re.finditer(r"\{\s*id:\s*'([\w-]+)'[^}]*?target:\s*\[(\d+),\s*(\d+),\s*(\d+)\]", _read(rel)):
        out[m.group(1)] = tuple(int(m.group(i)) for i in (2, 3, 4))
    if not out:
        sys.exit(f'{rel}: no colours read')
    return out


def _game():
    """the shirt and beard colours, the drawing palette, the pattern tiles, and
    every townsperson's look (src/data/npcLooks.js NPC_LOOKS)"""
    pal_src = _read('src/rendering/traits/playerArt.js')
    pal_src = pal_src[pal_src.index('export const ART_PALETTE = ['):]
    pal_src = re.sub(r'/\*.*?\*/', '', pal_src[:pal_src.index('];')], flags=re.S)
    palette = [None] + [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in re.findall(r"'(#[0-9a-fA-F]{6})'", pal_src)]
    tiles = {}
    pat = _read('src/rendering/traits/patternCatalog.js')
    for m in re.finditer(r"id:\s*'([\w-]+)',\s*name:\s*'[^']*',\s*w:\s*(\d+),\s*h:\s*(\d+),\s*cell:\s*(\d+)[^}]*?cells:\s*((?:'[01]+'\s*\+?\s*)+)", pat, re.S):
        cells = ''.join(re.findall(r"'([01]+)'", m.group(5)))
        tiles[m.group(1)] = dict(w=int(m.group(2)), h=int(m.group(3)), cell=int(m.group(4)), cells=cells)
    looks = {}
    src = _read('src/data/npcLooks.js')   # v2.3.3809: moved from tools/qa/npc-looks.mjs
    body = src[src.index('export const NPC_LOOKS = {'):]
    body = body[:body.index('\n};')]
    for m in re.finditer(r"\n  (\w+): \{(.*?)\n  \},", body, re.S):
        b = m.group(2)
        pm = re.search(r"patterns:\s*\{([^}]*)\}", b)
        d = dict(re.findall(r"(\w+): '([^']*)'", re.sub(r"patterns:\s*\{[^}]*\}", '', b)))
        d['patterns'] = dict(re.findall(r"(\w+): '([^']*)'", pm.group(1))) if pm else {}
        looks[m.group(1)] = d
    for k, t in tiles.items():
        if len(t['cells']) != t['w'] * t['h']:
            sys.exit(f'pattern {k}: {len(t["cells"])} cells read, not {t["w"]} x {t["h"]}')
    if len(palette) < 16 or len(tiles) < 9 or len(looks) < 8:
        sys.exit(f'the game\'s tables were not read: {len(palette)} colours, {len(tiles)} patterns, {len(looks)} looks')
    return dict(shirt=_rgb_targets('src/rendering/traits/shirtColorCatalog.js'),
                beard=_rgb_targets('src/rendering/traits/facialHairColorCatalog.js'),
                palette=palette, tiles=tiles, looks=looks)


# The collection's plain tee, whose outline and light every shirt keeps: its
# fill's own main colour is the light a cell is measured against.
TEE = 'yellowshirt'
TEE_MAIN = (247, 159, 50)


def tee(G, look, ox=0, oy=0, cell=1):
    """the townsperson's T-shirt as the game dresses him: the collection's tee
    with its outline, every other cell his shirt colour or, where his pattern
    inks it, the pattern's colour -- each lit as the collection lit that cell.
    The pattern is the game's own tile (patternCatalog.js), `cell` bust px a
    tile cell from (`ox`, `oy`): the bust's chest is a few px tall, so where a
    stripe falls is placed by eye against the world's picture (PORTRAITS)."""
    L = G['looks'][look]
    base = np.asarray(Image.open(os.path.join(SRC, TEE + '.png')).convert('RGBA'))
    shirt = G['shirt'].get(L.get('shirtColor')) or G['shirt']['blue']
    p = L['patterns'].get('shirt')
    tile = ink = None
    if p:
        tid, idx = p.split(':')
        tile, ink = G['tiles'][tid], G['palette'][int(idx)]
    out = np.zeros_like(base)
    lm = _lum(TEE_MAIN)
    for y, x in zip(*np.nonzero(base[..., 3])):
        c = tuple(int(v) for v in base[y, x, :3])
        out[y, x, 3] = 255
        if sum(abs(c[i] - OUTLINE[i]) for i in range(3)) <= 12:
            out[y, x, :3] = OUTLINE
            continue
        col = shirt
        if tile:
            tx = ((x - ox) // cell) % tile['w']
            ty = ((y - oy) // cell) % tile['h']
            if tile['cells'][ty * tile['w'] + tx] == '1':
                col = ink
        k = _lum(c) / lm
        out[y, x, :3] = np.clip(np.array(col) * k, 0, 255)
    return out


# The long beard's outline, row by row from the jaw down: (first, last) x of
# each row, the outline on both ends.  It hangs from the collection's jaw
# beard (its rows to BEARD_JAW, moustache and all) over the neck and the
# chest, a little narrower as it goes, and runs off the bust's foot -- as long
# as the world's, which reaches the middle of the chest.
BEARD_JAW = 22
LONG_BEARD = {23: (8, 19), 24: (8, 19), 25: (8, 19), 26: (8, 19), 27: (8, 19), 28: (9, 19), 29: (9, 18), 30: (10, 18), 31: (10, 17)}


def long_beard():
    """the collection's beard grown long, in its own colours (a ramp gives it
    the townsperson's): lit from the front-left as the collection lights, its
    hair falling in strands"""
    lay = np.asarray(Image.open(os.path.join(SRC, 'beard.png')).convert('RGBA')).copy()
    lay[BEARD_JAW + 1:] = 0
    hi, mid, lo, dark, deep = (114, 74, 56), (91, 59, 47), (83, 53, 43), (66, 42, 36), (50, 31, 27)
    # the jaw beard's outermost cells on rows 21-22 sit outside the long one's
    # outline: the jaw's outline carries straight on down
    for y, (x0, x1) in LONG_BEARD.items():
        for x in range(x0, x1 + 1):
            if x in (x0, x1):
                c = OUTLINE
            else:
                i, n = x - x0 - 1, x1 - x0 - 1
                t = i / max(1, n - 1)                   # 0 lit side .. 1 far side
                c = hi if t < 0.25 else mid if t < 0.55 else lo if t < 0.8 else dark
                # every third column a strand, a shade darker all the way down:
                # hair falling (a speckle read as dots, a broken strand as dashes)
                if i % 3 == 2:
                    c = {hi: mid, mid: lo, lo: dark}.get(c, deep)
            lay[y, x, :3] = c
            lay[y, x, 3] = 255
    return lay


def _relogo(lay, ink, fill):
    """a logo the game's piece does not wear painted over in the piece's own colour"""
    out = lay.copy()
    m = (np.abs(out[..., :3].astype(int) - np.array(ink)).sum(axis=2) <= 12) & (out[..., 3] > 0)
    out[m, :3] = fill
    return out


def bake():
    G = _game()
    bgs = json.load(open(os.path.join(SRC, 'backgrounds.json')))
    load = lambda f: np.asarray(Image.open(os.path.join(SRC, f + '.png')).convert('RGBA')).copy()
    made = []
    for head, rec in PORTRAITS.items():
        if rec.get('hair') and rec.get('headwear') in HATS:
            sys.exit(f'{head}: hair under a hat -- the collection is bald under its hats (HATS)')
        L = G['looks'][rec['look']]
        img = np.zeros((GRID, GRID, 4), np.uint8)
        img[..., :3] = bgs[rec['bg']]
        img[..., 3] = 255
        _over(img, _reskin(load('bro'), SKIN[rec['skin']]))
        for slot in STACK:
            if slot == 'clothes':
                # his T-shirt as the game dresses him; shirtless is the bro's own chest
                if L.get('shirt', 'none') != 'none':
                    _over(img, tee(G, rec['look'], **rec.get('tee', {})))
                continue
            if slot == 'eyes':
                # the game's `eyes: 'none'` is the collection's Normal Eyes
                lay = load(EYES.get(L.get('eyes', 'none'), 'normaleyes'))
                _over(img, _reskin(lay, SKIN[rec['skin']]))
                continue
            if slot == 'mouth':
                # his beard, as long as the world's, in its colour
                if L.get('beard', 'none') != 'none':
                    t = G['beard'][L['beardColor']]
                    _over(img, _ramp(long_beard(), tuple(int(v * 0.55) for v in t), tuple(min(255, int(v * 1.3)) for v in t)))
                continue
            f = rec.get(slot)
            if not f:
                continue
            lay = load(f)
            for ink, fill in rec.get('relogo', {}).get(slot, []):
                lay = _relogo(lay, ink, fill)
            if slot == 'eyewear' and rec.get('lens'):
                # the monocle's glass as the world shows it (see-through cells)
                glass, glint = rec['lens']
                cells = list(zip(*np.nonzero((lay[..., 3] > 0) & (lay[..., 3] < 255))))
                for i, (y, x) in enumerate(sorted(cells)):
                    lay[y, x, :3] = glint if i == 0 else glass
                    lay[y, x, 3] = 255
            if rec.get('trim', {}).get(slot) is not None:
                lay[rec['trim'][slot]:] = 0
            rc = rec.get('recolour', {}).get(slot)
            if rc:
                lay = _ramp(lay, *rc)
            _over(img, lay)
        im = Image.fromarray(img, 'RGBA').convert('RGB').resize((GRID * SCALE, GRID * SCALE), Image.NEAREST)
        path = os.path.join(OUT, head + '.webp')
        im.save(path, 'WEBP', lossless=True, quality=100, method=6)
        print('wrote', os.path.relpath(path, REPO), im.size, os.path.getsize(path) // 1024, 'KB')
        made.append(im)
    os.makedirs(PREVIEW, exist_ok=True)
    sheet = Image.new('RGB', (len(made) * (GRID * SCALE + 4), GRID * SCALE), (16, 16, 16))
    for i, im in enumerate(made):
        sheet.paste(im, (i * (GRID * SCALE + 4), 0))
    sheet.save(os.path.join(PREVIEW, 'portraits.png'))
    print('contact sheet', os.path.relpath(os.path.join(PREVIEW, 'portraits.png'), REPO))


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'extract':
        extract(sys.argv[2])
    else:
        bake()
