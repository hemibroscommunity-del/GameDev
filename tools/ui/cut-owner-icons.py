#!/usr/bin/env python3
"""v2.3.3481: THE OWNER'S CHOSEN ICONS, CUT FROM THEIR THIRTEEN SHEETS.

The owner, 2026-10-19, uploaded thirteen ChatGPT sheets of game UI art, now in
assets/icons-source/owner-2026-10-19/.  Most of what is on them is ChatGPT
redrawing pictures the game already shows (it drew from the review
screenshots), so a review page set the nine places where one of them fills an
empty spot or replaces a wrong picture beside what the game shows today, at the
size it would be drawn, and the owner answered: "Icon picks: 1b, 2a, 3, 4, 5,
6, 8, 9".  This tool cuts those, and nothing else:

  1b  THE EIGHT LANDS' SCENES (brotown-pixel-ui-asset-sheet-2.png, its 2 x 4
      vignettes, each a scene standing on a painted name plate), shown above
      the game's own name plate when you cross into a land of the Wheel -- for
      every land, the four with the owner's earlier animated art too, so all
      eight match ("pick 1b and I'll use the sheet's eight for every land").
      The painted plate is NOT kept: the game's plate writes the name.
  2a  the gladiator helmet (fantasy-rpg-ui-asset-sheet-2.png), the Gladiator
      Arena window's header, where the Saloon's beer mug was.
  3   the handshake (brotown-pixel-ui-asset-sheet-2.png), on the trade request
      card, as the duel challenge card shows its swords.
  4   the three quest pins over a townsperson (brotown-rpg-ui-icon-sheet-2.png):
      a gold "!" (a quest to take), a "?" (taken, waiting on you) and a gold
      ring with a green check (ready to hand in).  The "?" is also written
      GREY, its own file (-grey): the owner decided a waiting quest wears a
      grey "?" so it never looks ready, and the review page showed it greyed.
      The canvas never filters a picture (TRAPS §42), so the grey is baked.
  5   the sack of gold (overflowing-sack-of-gold-coins-3.png, a picture on its
      own) beside the Gambling Den's weekly jackpot.
  6   the pet house (colorful-rpg-game-ui-asset-sheet.png) at the start of the
      Pets page's "Pet House: 10 more places" row.
  8   the prize wheel (fantasy-game-ui-icon-collection.png) on the Daily
      Rewards window's free daily spin row.
  9   the treasure map (colorful-rpg-game-ui-asset-sheet.png) on the empty
      Journey page.
Not 7 (the compass): the owner kept today's.

v2.3.3519: and, to "Go recommended on everything" (the owner, 2026-10-19):
  10a/10b  the IRON LEGS and the CHEST beside them on the same armour row
      (brotown-rpg-ui-asset-sheet-1.png), written over the bag's two STEEL
      pictures, icons/items/greaves and chest-plate -- the art every metal's
      icon is made from (tools/gear/make-metal-icons.mjs --only
      greaves,chest-plate, the renderer's own multiply), so copper, iron and
      black steel match it.  Each card's light rim is outside the box (the
      review's boxes took two px of its bottom edge, a line under the legs).
  card 11, the five my notes called clearer than today's ("Sheet's is
      clearer"), each under a NEW name and pointed at in the code, so a re-run
      of the tool that made today's can never put the old one back: the orange
      paw (Pets: More's tile, the Pets page, the Pet House), the gold crown
      (the party's leader) and the blue pin (a member elsewhere: the party's
      blue on the maps; 64 x 64, as every small mark is), the auction gavel
      (the Auction House's window and door) and the plain no-entry sign (the
      creator's None tile where None means nothing: a bald head said "no
      hair" on the glasses' and shirts' rows too; the Skin tab's "Human" and
      the Eyes tab's "Normal" keep the bald head, a plain human).  Not the five "worth a look" ones, nor
      the "slightly clearer" ones: the black steel bar is one of a set of five
      bars one tool makes, the gear one of More's eleven tiles, the farm's
      three steps three of five, and one picture in another hand would not
      match the rest.
  FRAMES (`frame`): each sits in its square at the share of it the picture it
  replaces fills -- the larger side of the art over the frame's side, measured
  on today's files (the paw 0.67, the None sign 0.76, a party mark 0.77, the
  steel legs 0.89 and chest 0.78 of their 256) -- so it is drawn the same
  size in its slot.  The gavel is the exception: the market stall it replaces
  is square (0.62 x 0.61), and a gavel half again as wide as it is tall set
  at 0.62 of its width came out a sliver at 26 CSS px, so its width is 0.84.  `size` caps the frame
  (3x the CSS px it is drawn at; 64 for the small marks, `exact`); with no
  cap the frame is the art's own px padded, never scaled.

v2.3.3519: and CARD 11, THE OWNER'S OWN PICKS -- "Icon picks: 1b, 2a, T3.3,
  T20.2, ... T128.1" (2026-10-19), 72 codes from the review page's card 11,
  every icon on the sheets the game already has a picture for, each with its
  candidates T<n>.1, T<n>.2...  The list is tools/ui/owner-picks-card11.json:
  each pick's code, the sheet and the review page's own cut of it (the twins
  page's, which the owner chose from by eye: key from the box's border colour,
  alpha, a slate DISC keyed out round the art, or an OUTLINE flooded from the
  edge; `erase` clears a count badge painted over a corner), and the file it is
  written over, sized as today's is:
    frame  today's canvas, the art's larger side the share of it today's art
           fills, centred -- so it is drawn the same size in its slot;
    tight  no padding, the larger side that many px (the stat glyphs and the
           gold coin are tight today);
    disc   the round ability buttons (Jump, the generic Special, the sword's
           and the bow's): only the disc INSIDE the owner's ring, as sheet 5's
           specials (v2.3.3336), `rin` of its outer radius (0.85: the stone or
           gold ring and the dark line inside it measured on 72 rays), edge to
           edge on its square; the game's ring carries the cooldown arc.
  With `grey`, a -grey copy (the controls' greyed palette, cut-small-icons.py's
  own).  Five codes were already in the game from v2.3.3519's first cut (the
  file's `done`), and the party leader's crown is now the one the owner picked,
  T112.2 (sheet 3's), not the first sheet's.  Two are NEW files the code points
  at: the Forge tab's anvil (today's tab wears the copper sword, the item's own
  picture) and the chat box's smiley (drawn in code until now).  The owner
  ticked both luck stars (T69.1, T69.2), the same star twice: T69.2, from the
  sheet the other stat picks come from.  Each file written is recorded with its
  SHA-256 in tools/ui/owner-picks-card11.sha256: server/test/owner-icons.test
  fails if another tool (process_icon_sheets.py, cut-small-icons.py...) ever
  writes over one of them.

HOW: the review page's own cuts, which the owner approved by eye.
  alpha  a free-standing piece on a transparent ground: its solid core (alpha
         over `amin`) grown `grow` px is its own region, which keeps its soft
         edge and drops a neighbour's glow that only reaches in faintly; the
         alpha lifted from the background remover's ~250 to solid
         (a' = min(255, a * 255 / 250), as cut-small-icons.py), and anything
         under 40 dropped (the faint halo round every piece).
  key    an icon painted on a flat card (the helmet, the handshake): the fill
         is the median of a ring of points 4 px inside the box (a card's border
         shading at its very corner is lighter than its fill), and a px within
         `tol` of it is see-through, fully solid past tol + `ramp`.
  The boxes are the review's (its spec2 for the handshake), but for the
  helmet's: the review's [498, 522, 562, 580] took two px of the card's rounded
  corner (a speck at the cut's top left) and cut the helmet's chin off five
  rows short of the bracket line under it, so it is [502, 528, 562, 585] here.

THE LANDS' PLATE: each vignette is cut whole, then only the SCENE above its
painted plate is kept, crop (0, 0, w, plate_top - 3) as the review page did.
plate_top is the first row of the plate's parchment under its dark top edge:
the first run of rows at least 85% dark (of the row's solid px) is the edge,
and the first row after it that is 75% parchment is the plate.  The review
measured four by eye (hollows 104, mist 89, thunder 101, tidal 98) and this
tool refuses to write anything unless it measures the same four the same.
v2.3.3511: AND THE PLATE'S CURLS GO TOO.  The owner, of the scenes drawn big
over the land banner: "new land emblems look bad enlarged (revert or show
below minimap)" -- and at their own size under the minimap the plate's two
scroll ends still showed, gold arcs curling up into the scene's bottom
corners (in all eight: ember's at rows 96-100, x 8-16).  So the scene is cut
again just above them (rim_cut: in the outer quarter each side, the highest
row of the last nine holding a gold or brown px with the scene's dark outline
right above it) and its new last row is made the dark ground line its foot
always had (ground_line).

SIZES: a DOM picture at three times the CSS px it is DRAWN at (a 3x phone),
never upscaled (a picture is held decoded at its own size, so a bigger file is
memory for nothing, and a smaller source is not made sharper by stretching
it); each is the piece's own tight box, the CSS sizing it to that shape:
  helmet 26 x 28 CSS          handshake 40 x 26 (it is wider than tall)
  sack 64 x 69                pet house 40 x 33
  wheel 34 x 37               treasure map 120 x 69
  land scenes: drawn about 180-215 CSS px wide (half the banner's width), so
               written at the sheet's own ~200 px -- the most it holds.
The quest pins are drawn on the CANVAS, 32 x 38 world px each (today's badge
was a 32 px disc), and written into one 72 x 86 frame, centred (2.25x their
world size, as the 64 px talk bubble is for 28 world px: a much bigger texture
only shimmers as the view slides, cut-small-icons.py's note).  All WebP 90.

v2.3.3522: THE BLOCK BUTTON'S PICTURE.  The owner, playtesting: "Block button
needs a new icon."  The button drew the 64 px wood shield the WORLD draws on
your arm, stretched to 30 px and pixelated -- the one control on the right
cluster not in the owner's painted style.  Its new face is the owner's own
round gold shield on a gold burst (brotown-rpg-ui-asset-sheet-1.png, the
bottom row's third disc, box [293, 856, 416, 983]: the transparent columns and
rows either side of it, measured, so no neighbour's rim comes in), cut the way
the special attacks were (cut-small-icons.py sheet 5, v2.3.3336): it is drawn
as a WHOLE button -- its own gold ring -- and the game's Block button keeps its
own ring (the cooldown arc, the lit "shield up" state), so only the disc
INSIDE the owner's ring is kept (mode `disc`: that tool's inner_disc and
fit_disc, read from it, not copied), written edge to edge at the button's 160
px, with a `-grey` copy in the controls' grey palette (its `grey`) for the
cooldown -- never a CSS filter on a control (TRAPS §42).  Shield Bash keeps its
own picture (the shield striking, a free-standing piece), so the two are never
one picture.

Writes a CONTACT SHEET (--contact out.png), each piece on the game's slate and
on a light ground, to check by eye.  Refuses to overwrite an existing file
without --force; --dry cuts and reports, writes nothing; --only a,b cuts those.

  python3 tools/ui/cut-owner-icons.py [--force] [--dry] [--only name|code,..] [--contact out.png]
"""
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets', 'icons-source', 'owner-2026-10-19')
PUB = os.path.join(ROOT, 'public')
QUALITY = 90
DPR = 3                      # a DOM picture is written at 3x its CSS size...
UPSCALE_MAX = 1.0            # ...never past the source's own px
PIN_FRAME = (72, 86)         # the quest pins' frame: 2.25 x 32 x 38 world px

LANDS_SHEET = 'brotown-pixel-ui-asset-sheet-2.png'
# the review's boxes, the sheet's 2 x 4 vignettes (the plan's region ids)
LANDS = [
    ('ember', (24, 712, 232, 860)), ('frost', (230, 712, 434, 860)),
    ('sky', (434, 712, 640, 860)), ('verdant', (640, 708, 858, 860)),
    ('hollows', (24, 856, 232, 1000)), ('mist', (230, 862, 434, 1000)),
    ('thunder', (434, 856, 640, 1000)), ('tidal', (640, 862, 858, 1000)),
]
# what the review page measured, in the cut's own px (see THE LANDS' PLATE)
REVIEW_PLATE_TOP = {'hollows': 104, 'mist': 89, 'thunder': 101, 'tidal': 98}

# name: the file under public/ without .webp.  css: the size it is drawn at
# (DOM, CSS px); pin: a canvas quest pin (PIN_FRAME); scene: a land's scene.
PIECES = [
    *[dict(name='ui/banners/land-' + land, src=LANDS_SHEET, mode='alpha', box=box, grow=2, scene=land)
      for land, box in LANDS],
    dict(name='icons/ui/arena-helmet', src='fantasy-rpg-ui-asset-sheet-2.png', mode='key',
         box=(502, 528, 562, 585), css=(26, 28)),
    dict(name='icons/ui/trade-handshake', src=LANDS_SHEET, mode='key',
         box=(930, 640, 1052, 706), css=(40, 26)),
    dict(name='ui/quest/pin-offer', src='brotown-rpg-ui-icon-sheet-2.png', mode='alpha',
         box=(1128, 676, 1240, 812), grow=4, pin=True),
    dict(name='ui/quest/pin-ready', src='brotown-rpg-ui-icon-sheet-2.png', mode='alpha',
         box=(1252, 672, 1368, 812), grow=4, pin=True),
    dict(name='ui/quest/pin-waiting', src='brotown-rpg-ui-icon-sheet-2.png', mode='alpha',
         box=(1380, 668, 1492, 804), grow=4, pin=True, grey=True),
    dict(name='icons/ui/jackpot-sack', src='overflowing-sack-of-gold-coins-3.png', mode='alpha',
         box=(0, 0, 1024, 1536), grow=6, amin=200, css=(64, 69)),
    dict(name='icons/ui/pet-house', src='colorful-rpg-game-ui-asset-sheet.png', mode='alpha',
         box=(204, 788, 368, 924), grow=4, css=(40, 33)),
    dict(name='icons/ui/prize-wheel', src='fantasy-game-ui-icon-collection.png', mode='alpha',
         box=(68, 4, 456, 424), grow=4, css=(34, 37)),
    dict(name='icons/ui/journey-map', src='colorful-rpg-game-ui-asset-sheet.png', mode='alpha',
         box=(1208, 552, 1476, 708), grow=4, css=(120, 69)),
    # v2.3.3519: 10a/10b and card 11's clearer five (the header)
    dict(name='icons/items/greaves', src='brotown-rpg-ui-asset-sheet-1.png', mode='key',
         box=(318, 462, 422, 566), frame=dict(fill=0.89), metal=True),
    dict(name='icons/items/chest-plate', src='brotown-rpg-ui-asset-sheet-1.png', mode='key',
         box=(576, 462, 682, 566), frame=dict(fill=0.78), metal=True),
    dict(name='icons/ui/pets-paw', src='colorful-rpg-game-ui-asset-sheet.png', mode='key',
         box=(812, 66, 880, 131), frame=dict(size=90, fill=0.67)),
    # the owner's T112.2, sheet 3's crown (the first cut took the first sheet's)
    dict(name='icons/ui/party-crown', src='brotown-rpg-ui-icon-sheet-2.png', mode='alpha',
         box=(1160, 540, 1256, 620), grow=4, frame=dict(size=64, fill=0.77, exact=True)),
    dict(name='icons/ui/party-pin', src='brotown-rpg-ui-icon-sheet-2.png', mode='alpha',
         box=(1412, 516, 1496, 632), grow=4, frame=dict(size=64, fill=0.77, exact=True)),
    dict(name='icons/ui/bldg-auction-gavel', src='fantasy-game-ui-icon-collection.png', mode='alpha',
         box=(712, 764, 928, 908), grow=4, frame=dict(size=78, fill=0.84)),
    dict(name='ui/welcome/cc/cc-none', src='pixel-style-character-creator-ui-sheet.png', mode='alpha',
         box=(76, 24, 160, 112), grow=4, frame=dict(size=102, fill=0.76)),
    # v2.3.3522: the Block button's face (the header's note) -- a round button
    # of its own, so the disc inside its ring, 160 px like every control picture
    dict(name='ui/controls/abil-block', src='brotown-rpg-ui-asset-sheet-1.png', mode='disc',
         box=(293, 856, 416, 983), grow=4, px=160, control_grey=True),
]

_csi = None


def small_icons_tool():
    """v2.3.3522: cut-small-icons.py, read once (its file name has hyphens, so
    it is loaded by path): the round control pictures' inner_disc, fit_disc and
    grey live there, and are used from there rather than copied."""
    global _csi
    if _csi is None:
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            'cut_small_icons', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cut-small-icons.py'))
        _csi = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(_csi)
    return _csi

_sheets = {}


def sheet(name):
    if name not in _sheets:
        _sheets[name] = Image.open(os.path.join(SRC, name)).convert('RGBA')
    return _sheets[name]


def lift_alpha(im):
    """The background remover's ~250 is solid: a' = min(255, a * 255 / 250)."""
    im.putalpha(im.getchannel('A').point(lambda v: min(255, int(v * 255 / 250))))
    return im


def cut_alpha(src, box, amin=230, grow=6):
    c = sheet(src).crop(box)
    a = c.getchannel('A')
    core = a.point(lambda v: 255 if v > amin else 0)
    region = core.filter(ImageFilter.MaxFilter(grow * 2 + 1))
    c.putalpha(Image.composite(a, Image.new('L', a.size, 0), region))
    c = lift_alpha(c)
    c.putalpha(c.getchannel('A').point(lambda v: 0 if v < 40 else v))
    return c.crop(c.getbbox())


def cut_key(src, box, tol=16, ramp=18):
    c = sheet(src).crop(box)
    px = c.load()
    w, h = c.size
    ring = []
    for t in range(20):
        u = t / 19
        for (x, y) in ((int(4 + u * (w - 9)), 4), (int(4 + u * (w - 9)), h - 5),
                       (4, int(4 + u * (h - 9))), (w - 5, int(4 + u * (h - 9)))):
            ring.append(px[x, y])
    f = tuple(sorted(p[i] for p in ring)[len(ring) // 2] for i in range(3))
    out = Image.new('RGBA', c.size)
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            d = math.sqrt((r - f[0]) ** 2 + (g - f[1]) ** 2 + (b - f[2]) ** 2)
            k = 0 if d <= tol else (1 if d >= tol + ramp else (d - tol) / ramp)
            op[x, y] = (r, g, b, int(min(255, a * 255 / 250) * k))
    bb = out.getbbox()
    return out.crop(bb) if bb else out


def plate_top(im):
    """The first row of a land vignette's painted plate (see the header)."""
    w, h = im.size
    px = im.load()
    rows = []
    for y in range(h):
        op = tan = dark = 0
        for x in range(w):
            r, g, b, a = px[x, y]
            if a <= 128:
                continue
            op += 1
            if r > 170 and g > 120 and b < 140 and r - b > 50:
                tan += 1
            if max(r, g, b) < 70:
                dark += 1
        rows.append((op, tan, dark))
    y = h // 3
    while y < h and not (rows[y][0] and rows[y][2] >= 0.85 * rows[y][0]):
        y += 1
    while y < h and rows[y][0] and rows[y][2] >= 0.85 * rows[y][0]:
        y += 1
    while y < h and not (rows[y][0] and rows[y][1] >= 0.75 * rows[y][0]):
        y += 1
    if y >= h - 8:
        raise SystemExit('ABORT plate_top: no painted plate found')
    return y


def _curl(r, g, b, a):
    """v2.3.3511: a px of the plate's scroll ends: gold to brown."""
    return a > 128 and r > 120 and g > 80 and b < 140 and r - b > 30 and r >= g


def _dark(r, g, b, a):
    return a > 128 and max(r, g, b) < 70


def rim_cut(im):
    """v2.3.3511: the first row of the plate's scroll ends left under a
    scene cut at plate_top - 3 (THE LANDS' PLATE), or None: in the outer
    quarter each side, the highest row of the last nine holding a curl px
    with a dark px (the scene's outline) within three rows straight above it.
    Sand and lava are as gold, but sit ABOVE the outline."""
    w, h = im.size
    px = im.load()
    top = None
    for y in range(max(1, h - 9), h):
        for x in list(range(0, int(w * 0.25))) + list(range(int(w * 0.75), w)):
            if not _curl(*px[x, y]):
                continue
            if any(_dark(*px[x, yy]) for yy in range(max(0, y - 3), y)):
                if top is None or y < top:
                    top = y
    return top


def ground_line(im):
    """v2.3.3511: each column's lowest solid px dark, as the plate's dark top
    edge was: the scene's ground line, after rim_cut took the rows under it."""
    px = im.load()
    for x in range(im.width):
        for y in range(im.height - 1, -1, -1):
            r, g, b, a = px[x, y]
            if a > 128:
                if max(r, g, b) >= 70:
                    px[x, y] = (int(r * 0.18), int(g * 0.14), int(b * 0.12), a)
                break
    return im


def resize(im, size):
    """Lanczos on premultiplied colour, so a see-through px's colour never
    bleeds into the edge (cut-bag-icons.py fit)."""
    if im.size == size:
        return im
    return im.convert('RGBa').resize(size, Image.LANCZOS).convert('RGBA')


def to_css(im, css):
    w, h = im.size
    k = min(UPSCALE_MAX, DPR * css[0] / w, DPR * css[1] / h)
    return resize(im, (max(1, round(w * k)), max(1, round(h * k))))


def to_pin(im):
    fw, fh = PIN_FRAME
    w, h = im.size
    k = min(fw / w, fh / h)
    small = resize(im, (max(1, round(w * k)), max(1, round(h * k))))
    out = Image.new('RGBA', PIN_FRAME, (0, 0, 0, 0))
    out.alpha_composite(small, ((fw - small.width) // 2, (fh - small.height) // 2))
    return out


def to_frame(im, size=None, fill=0.8, exact=False):
    """v2.3.3519: the art centred in a square, its larger side `fill` of the
    square's (the header's FRAMES).  With `size` the square is at most that
    (exactly that if `exact`), the art scaled down to fit; never scaled up."""
    w, h = im.size
    big = max(w, h)
    side = round(big / fill)
    if size is not None:
        side = size if exact else min(size, side)
    k = min(1.0, fill * side / big)
    art = resize(im, (max(1, round(w * k)), max(1, round(h * k))))
    out = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    out.alpha_composite(art, ((side - art.width) // 2, (side - art.height) // 2))
    return out


def grey(im):
    """Plain luminance, the alpha kept: the review page's greyed "?"."""
    g = ImageOps.grayscale(im.convert('RGB')).convert('RGBA')
    g.putalpha(im.getchannel('A'))
    return g


def contact_sheet(cuts, path):
    cell = 172
    cols = 6
    rows_n = (len(cuts) + cols - 1) // cols
    cs = Image.new('RGBA', (cols * cell, rows_n * cell * 2), (0, 0, 0, 255))
    d = ImageDraw.Draw(cs)
    for i, (name, im) in enumerate(cuts):
        x, y = (i % cols) * cell, (i // cols) * cell * 2
        for j, ground in enumerate(((26, 37, 44, 255), (226, 220, 206, 255))):
            tile = Image.new('RGBA', (cell, cell), ground)
            k = min(1.0, (cell - 24) / im.width, (cell - 24) / im.height)
            t = resize(im, (max(1, round(im.width * k)), max(1, round(im.height * k))))
            tile.alpha_composite(t, ((cell - t.width) // 2, 18 + (cell - 18 - t.height) // 2))
            cs.alpha_composite(tile, (x, y + j * cell))
        d.text((x + 4, y + 3), name.split('/')[-1], fill=(220, 220, 220, 255))
    cs.convert('RGB').save(path)
    print('contact sheet:', path)


# ═══ v2.3.3519: CARD 11 -- the twins page's cuts (scratchpad twincut.py, the
# page the owner picked from), and how each is sized ═══
CARD11 = os.path.join(ROOT, 'tools', 'ui', 'owner-picks-card11.json')
CARD11_SUMS = os.path.join(ROOT, 'tools', 'ui', 'owner-picks-card11.sha256')


def erase(img, box, marks):
    """Clear each mark (sheet coords): [cx, cy, r] a circle, [x0, y0, x1, y1]
    a rectangle -- a count badge painted over an item's corner."""
    m = Image.new('L', img.size, 255)
    d = ImageDraw.Draw(m)
    for c in marks:
        if len(c) == 4:
            d.rectangle([c[0] - box[0], c[1] - box[1], c[2] - box[0], c[3] - box[1]], fill=0)
        else:
            x, y, r = c[0] - box[0], c[1] - box[1], c[2]
            d.ellipse([x - r, y - r, x + r, y + r], fill=0)
    img.putalpha(Image.composite(img.getchannel('A'), Image.new('L', img.size, 0), m))
    return img


def twin_alpha(src, box, amin=230, grow=6, marks=None):
    c = sheet(src).crop(box)
    if marks:
        c = erase(c, box, marks)
    a = c.getchannel('A')
    core = a.point(lambda v: 255 if v > amin else 0)
    region = core.filter(ImageFilter.MaxFilter(grow * 2 + 1))
    c.putalpha(Image.composite(a, Image.new('L', a.size, 0), region))
    c = lift_alpha(c)
    c.putalpha(c.getchannel('A').point(lambda v: 0 if v < 40 else v))
    return c.crop(c.getbbox())


def twin_key(src, box, tol=18, ramp=22, flood=False, fill=None, marks=None):
    """The card's flat fill (the median of the box's border, its solid px) and
    every px within tol of it see-through; with `flood` only what the border
    reaches through such px."""
    c = sheet(src).crop(box)
    if marks:
        c = erase(c, box, marks)
    px = c.load()
    w, h = c.size
    if fill:
        f = tuple(fill)
    else:
        b = [px[x, 0] for x in range(w)] + [px[x, h - 1] for x in range(w)] + \
            [px[0, y] for y in range(h)] + [px[w - 1, y] for y in range(h)]
        b = [q for q in b if q[3] > 200] or b
        f = tuple(sorted(q[i] for q in b)[len(b) // 2] for i in range(3))

    def kf(q):
        dd = math.dist(q[:3], f)
        return 0.0 if dd <= tol else (1.0 if dd >= tol + ramp else (dd - tol) / ramp)
    k = [[1.0] * w for _ in range(h)]
    if flood:
        st = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
        seen = set()
        while st:
            x, y = st.pop()
            if (x, y) in seen:
                continue
            seen.add((x, y))
            v = kf(px[x, y])
            if v >= 1.0:
                continue
            k[y][x] = v
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen:
                    st.append((nx, ny))
    else:
        for y in range(h):
            for x in range(w):
                k[y][x] = kf(px[x, y])
    out = Image.new('RGBA', c.size)
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b_, a = px[x, y]
            op[x, y] = (r, g, b_, int(min(255, a * 255 / 250) * k[y][x]))
    out.putalpha(out.getchannel('A').point(lambda v: 0 if v < 30 else v))
    bb = out.getbbox()
    return out.crop(bb) if bb else out


def twin_disc(src, centre, r, tol=18, ramp=22):
    """An icon painted on a round slate disc in a rim (the right stick's
    pictures on the sheets): what is inside radius r, the disc's own fill (the
    median of a thin ring just inside r) keyed out."""
    cx, cy = centre
    box = (int(cx - r), int(cy - r), int(cx + r + 1), int(cy + r + 1))
    c = sheet(src).crop(box)
    px = c.load()
    w, h = c.size
    ox, oy = cx - box[0], cy - box[1]
    ring = [px[x, y] for y in range(h) for x in range(w) if r - 4 <= math.hypot(x - ox, y - oy) <= r - 1]
    f = tuple(sorted(q[i] for q in ring)[len(ring) // 2] for i in range(3))
    out = Image.new('RGBA', c.size)
    op = out.load()
    for y in range(h):
        for x in range(w):
            d = math.hypot(x - ox, y - oy)
            if d > r:
                continue
            pr, pg, pb, pa = px[x, y]
            dd = math.dist((pr, pg, pb), f)
            k = 0.0 if dd <= tol else (1.0 if dd >= tol + ramp else (dd - tol) / ramp)
            op[x, y] = (pr, pg, pb, int(min(255, pa * 255 / 250) * k * min(1.0, r - d)))
    out.putalpha(out.getchannel('A').point(lambda v: 0 if v < 30 else v))
    bb = out.getbbox()
    return out.crop(bb) if bb else out


def twin_outline(src, box, dark=70, marks=None):
    """An icon in a dark outline on a light or gradient button (the Forge's
    anvil on its gold Craft button): flooded from the box's edge through every
    px brighter than `dark`; the outline stops it, so the icon is kept whole."""
    c = sheet(src).crop(box)
    if marks:
        c = erase(c, box, marks)
    px = c.load()
    w, h = c.size
    bg = [[False] * w for _ in range(h)]
    st = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
    while st:
        x, y = st.pop()
        if bg[y][x]:
            continue
        r, g, b_, a = px[x, y]
        if a > 40 and max(r, g, b_) <= dark:
            continue
        bg[y][x] = True
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not bg[ny][nx]:
                st.append((nx, ny))
    out = c.copy()
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b_, a = px[x, y]
            if bg[y][x]:
                op[x, y] = (r, g, b_, 0)
            else:
                nb = sum(1 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                         if 0 <= x + dx < w and 0 <= y + dy < h and bg[y + dy][x + dx])
                op[x, y] = (r, g, b_, int(min(255, a * 255 / 250) * (0.75 if nb >= 2 else 1.0)))
    bb = out.getbbox()
    return out.crop(bb) if bb else out


def card11_cut(e):
    c, src = e['cut'], e['src']
    m = c.get('mode', 'alpha')
    if m == 'alpha':
        return twin_alpha(src, tuple(c['box']), c.get('amin', 230), c.get('grow', 6), c.get('erase'))
    if m == 'key':
        return twin_key(src, tuple(c['box']), c.get('tol', 18), c.get('ramp', 22), c.get('flood', False),
                        c.get('fill'), c.get('erase'))
    if m == 'disc':
        return twin_disc(src, c['c'], c['r'], c.get('tol', 18), c.get('ramp', 22))
    if m == 'outline':
        return twin_outline(src, tuple(c['box']), c.get('dark', 70), c.get('erase'))
    raise SystemExit(f'ABORT {e["code"]}: no cut mode {m}')


def to_frame_wh(im, wh, fill):
    """Today's canvas (w, h), the art's larger side `fill` of the canvas's
    larger side -- the share today's art fills -- but never past the canvas
    (1 px kept clear), centred."""
    W, H = wh
    w, h = im.size
    k = min(fill * max(W, H) / max(w, h), (W - 2) / w, (H - 2) / h)
    art = resize(im, (max(1, round(w * k)), max(1, round(h * k))))
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    out.alpha_composite(art, ((W - art.width) // 2, (H - art.height) // 2))
    return out


def to_tight(im, side):
    w, h = im.size
    k = side / max(w, h)
    return resize(im, (max(1, round(w * k)), max(1, round(h * k))))


def fit_circle(pts):
    """Least squares (Kasa): the circle x^2 + y^2 + a x + b y + c = 0 through
    the points, solved from its 3 x 3 normal equations."""
    sxx = sxy = syy = sx = sy = n = 0.0
    sxz = syz = sz = 0.0
    for x, y in pts:
        z = x * x + y * y
        sxx += x * x; sxy += x * y; syy += y * y; sx += x; sy += y; n += 1
        sxz += x * z; syz += y * z; sz += z
    # [sxx sxy sx; sxy syy sy; sx sy n] [a b c]' = -[sxz syz sz]'
    m = [[sxx, sxy, sx, -sxz], [sxy, syy, sy, -syz], [sx, sy, n, -sz]]
    for i in range(3):
        piv = max(range(i, 3), key=lambda r: abs(m[r][i]))
        m[i], m[piv] = m[piv], m[i]
        for r in range(3):
            if r != i:
                f = m[r][i] / m[i][i]
                for c in range(i, 4):
                    m[r][c] -= f * m[i][c]
    a, b, c = (m[i][3] / m[i][i] for i in range(3))
    cx, cy = -a / 2, -b / 2
    return cx, cy, math.sqrt(max(0.0, cx * cx + cy * cy - c))


def disc_inside_ring(im, rin):
    """The round button's disc inside its own ring.  Its edge: on 72 rays from
    the solid core's middle, the first solid px walked in from outside; a
    circle fitted to those points, then fitted again without the ones more
    than 3% off it (a sword's tip, an arrow, a spark or a stone through the
    ring -- a ray-median centre was pulled off by them).  Kept: a circle of
    rin times its radius, its edge supersampled 4x."""
    w, h = im.size
    px = im.load()
    core = im.getchannel('A').point(lambda v: 255 if v > 200 else 0).getbbox()
    ox, oy = (core[0] + core[2] - 1) / 2, (core[1] + core[3] - 1) / 2
    pts = []
    for k in range(72):
        t = 2 * math.pi * k / 72
        r = max(w, h)
        while r > 0:
            x, y = int(round(ox + r * math.cos(t))), int(round(oy + r * math.sin(t)))
            if 0 <= x < w and 0 <= y < h and px[x, y][3] > 200:
                pts.append((ox + r * math.cos(t), oy + r * math.sin(t)))
                break
            r -= 0.5
    cx, cy, R = fit_circle(pts)
    for _ in range(2):
        keep = [q for q in pts if abs(math.hypot(q[0] - cx, q[1] - cy) - R) <= 0.03 * R]
        cx, cy, R = fit_circle(keep)
    if len(keep) < 36:
        raise SystemExit(f'ABORT disc: the ring was found on only {len(keep)} of 72 rays')
    ri = rin * R
    side = int(math.ceil(ri * 2))
    x0, y0 = int(round(cx - ri)), int(round(cy - ri))
    disc = im.crop((x0, y0, x0 + side, y0 + side))
    SS = 4
    mk = Image.new('L', (side * SS, side * SS), 0)
    ImageDraw.Draw(mk).ellipse((0, 0, side * SS - 1, side * SS - 1), fill=255)
    mk = mk.resize((side, side), Image.LANCZOS)
    from PIL import ImageChops
    disc.putalpha(ImageChops.multiply(disc.getchannel('A'), mk))
    return disc, (round(cx, 1), round(cy, 1), round(R, 1), len(keep))


def controls_grey(im):
    """The controls' greyed palette (cut-small-icons.py grey): luminance
    squeezed into 30..214, the alpha kept."""
    r, g, b_, a = im.split()
    lum = Image.merge('RGB', (r, g, b_)).convert('L').point(lambda v: 30 + round(v * 0.72))
    return Image.merge('RGBA', (lum, lum, lum, a))


def card11_entries():
    import json
    with open(CARD11) as f:
        return json.load(f)['picks']


def main():
    force = '--force' in sys.argv
    dry = '--dry' in sys.argv
    contact = sys.argv[sys.argv.index('--contact') + 1] if '--contact' in sys.argv else None
    only = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
    writes, cuts = [], []
    for p in PIECES:
        short = p['name'].split('/')[-1]
        if only and short not in only and p['name'] not in only:
            continue
        if p['mode'] in ('alpha', 'disc'):
            im = cut_alpha(p['src'], p['box'], p.get('amin', 230), p.get('grow', 6))
        else:
            im = cut_key(p['src'], p['box'], p.get('tol', 16), p.get('ramp', 18))
        raw = im.size
        if p.get('scene'):
            top = plate_top(im)
            want = REVIEW_PLATE_TOP.get(p['scene'])
            if want is not None and top != want:
                print(f'ABORT {short}: plate top measured {top}, the review measured {want}')
                return 1
            im = im.crop((0, 0, im.width, top - 3))
            im = im.crop(im.getbbox())
            # v2.3.3511: and the plate's scroll ends under it (the header)
            rim = rim_cut(im)
            if rim is None:
                print(f'ABORT {short}: no scroll ends found under the scene (the sheet changed?)')
                return 1
            im = ground_line(im.crop((0, 0, im.width, rim)))
            im = im.crop(im.getbbox())
            print(f'  {short:16s} vignette {raw[0]}x{raw[1]}, plate from row {top}'
                  f'{" (the review: " + str(want) + ")" if want is not None else ""}, scroll ends from row {rim},'
                  f' scene {im.width}x{im.height}')
            out = im
        elif p['mode'] == 'disc':
            # v2.3.3522: a round button's face -- the disc inside its own ring
            csi = small_icons_tool()
            out = csi.fit_disc(csi.inner_disc(im), p['px'])
            print(f'  {short:16s} cut {raw[0]}x{raw[1]} -> the disc inside its ring, {out.width}x{out.height}')
        elif p.get('pin'):
            out = to_pin(im)
            print(f'  {short:16s} cut {raw[0]}x{raw[1]} -> {out.width}x{out.height} frame')
        elif p.get('frame'):
            out = to_frame(im, **p['frame'])
            print(f'  {short:16s} cut {raw[0]}x{raw[1]} -> {out.width}x{out.height} frame'
                  f' (art {im.width}x{im.height}, fill {p["frame"]["fill"]})'
                  + ('  -- now run: node tools/gear/make-metal-icons.mjs --only greaves,chest-plate' if p.get('metal') else ''))
        else:
            out = to_css(im, p['css'])
            print(f'  {short:16s} cut {raw[0]}x{raw[1]} -> {out.width}x{out.height}'
                  f' (drawn {p["css"][0]}x{p["css"][1]} CSS px)')
        cuts.append((p['name'], out))
        writes.append((p['name'], out))
        if p.get('grey'):
            g = grey(out)
            cuts.append((p['name'] + '-grey', g))
            writes.append((p['name'] + '-grey', g))
        if p.get('control_grey'):
            # v2.3.3522: the controls' grey palette, as every -grey control picture
            g = small_icons_tool().grey(out)
            cuts.append((p['name'] + '-grey', g))
            writes.append((p['name'] + '-grey', g))
    # v2.3.3519: card 11, the owner's own picks (owner-picks-card11.json)
    for e in card11_entries():
        short = e['name'].split('/')[-1]
        if only and short not in only and e['name'] not in only and e['code'] not in only:
            continue
        im = card11_cut(e)
        raw = im.size
        o = e['out']
        if 'disc' in o:
            disc, (cx, cy, R, n) = disc_inside_ring(im, o['rin'])
            out = resize(disc, (o['disc'], o['disc']))
            how = f'disc r {R} at ({cx}, {cy}) on {n}/72 rays, kept {o["rin"]} -> {o["disc"]} square'
        elif 'tight' in o:
            out = to_tight(im, o['tight'])
            how = f'tight {out.width}x{out.height}'
        else:
            out = to_frame_wh(im, tuple(o['frame']), o['fill'])
            how = f'frame {o["frame"][0]}x{o["frame"][1]} fill {o["fill"]}'
        print(f'  {e["code"]:7s} {short:22s} cut {raw[0]}x{raw[1]} -> {how}')
        ext = '.' + e.get('ext', 'webp')
        cuts.append((e['name'] + ext, out))
        writes.append((e['name'] + ext, out))
        if e.get('grey'):
            g = controls_grey(out)
            cuts.append((e['name'] + '-grey' + ext, g))
            writes.append((e['name'] + '-grey' + ext, g))
    if contact:
        contact_sheet(cuts, contact)
    if dry:
        return 0
    def file_of(n):
        # a card 11 name carries its own extension (a stat glyph is a PNG)
        return n if n.endswith('.png') or n.endswith('.webp') else n + '.webp'
    clash = [n for n, _ in writes if os.path.exists(os.path.join(PUB, file_of(n)))]
    if clash and not force:
        print('refusing to overwrite (pass --force to re-cut):\n  ' + '\n  '.join(clash))
        return 1
    total = decoded = 0
    import hashlib
    sums = {}
    if os.path.exists(CARD11_SUMS):
        with open(CARD11_SUMS) as f:
            for line in f:
                if line.strip():
                    hx, path_ = line.split(None, 1)
                    sums[path_.strip()] = hx
    card11_names = set()
    for e in card11_entries():
        ext = '.' + e.get('ext', 'webp')
        card11_names.add(e['name'] + ext)
        if e.get('grey'):
            card11_names.add(e['name'] + '-grey' + ext)
    for name, im in writes:
        path = os.path.join(PUB, file_of(name))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        if path.endswith('.png'):
            im.save(path, 'PNG', optimize=True)
        else:
            im.save(path, 'WEBP', quality=QUALITY, method=6)
        if name in card11_names:
            with open(path, 'rb') as f:
                sums['public/' + file_of(name)] = hashlib.sha256(f.read()).hexdigest()
        n = os.path.getsize(path)
        total += n
        decoded += im.width * im.height * 4
        print(f'  wrote {os.path.relpath(path, ROOT)}  {im.width}x{im.height}  {n} bytes'
              f'  ({im.width * im.height * 4 / 1024:.0f} KB decoded)')
    print(f'{len(writes)} files, {total / 1024:.0f} KB, {decoded / 1024:.0f} KB decoded')
    if sums:
        with open(CARD11_SUMS, 'w') as f:
            for path_ in sorted(sums):
                f.write(f'{sums[path_]}  {path_}\n')
        print(f'card 11: {len(sums)} files recorded in {os.path.relpath(CARD11_SUMS, ROOT)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
