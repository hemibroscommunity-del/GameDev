#!/usr/bin/env python3
"""v2.3.3124: what hides the cook's pan when the farmer kneels at a bed.

    python3 tools/world/make_farm_covers.py

The owner (2026-10-06), of the farm you walk: "Cooking animation might be
better.  You can use something to occlude the part where the pan or log is."
So the farmer crouches as the cook does (public/sprites/skills/cook-strip.webp,
your skin, drawings, shirt, armour and hat on it as ever), on the three frames
where the cook holds the pan OUT to the side, clear of the hands -- and ONE
picture stands where the pan is, drawn on top of every layer the figure wears,
so it never has to know what you look like:

    dig, plant   the owner's open crate (BroTown's crate-3), filled with the
                 dug bed's earth (dig) or with the seed sack's seeds (plant)
    water        the same crate as a tub of the owner's fresh water
    feed         the owner's compost bin
    harvest      the crate as it is, a bed of straw for what you pick

All of it is the owner's own art (public/world/objects/town-1, public/world/
farm, public/world/ground/fresh-A): nothing here is drawn from nothing.

This tool:
  1. takes the pan in those frames: everything drawn right of the hands
     (PAN_X) between the shoulders and the knees -- in those three frames that
     is the pan and nothing else -- less slivers thinner than OPEN_PX (the
     arm's and the knee's own edges), grown by GROW px;
  2. makes the crate's fillings: the straw in its opening replaced, picture
     pixel by picture pixel, with a tile of the filling, shaded where the back
     rim overhangs it;
  3. fits each picture -- the smallest box, at its own shape, standing just
     below the pan and right of the hands -- so it hides every pixel of the
     pan, and FAILS if one shows;
  4. writes public/sprites/skills/farm-cover-<name>.png and the GENERATED
     src/data/farmCovers.js: each cover's box in the cook frame's own pixels,
     which step uses which, the frames the farmer plays, and each cover's
     mouth (the bits fly from there).

Deterministic: the same pictures every run.  Needs numpy and Pillow.
docs/specs/farm-walk.md "The farmer's kneel".
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
COOK = os.path.join(ROOT, 'public/sprites/skills/cook-strip.webp')
FARM = os.path.join(ROOT, 'public/world/farm')
OBJ = os.path.join(ROOT, 'public/world/objects')
GROUND = os.path.join(ROOT, 'public/world/ground')
OUT_DIR = os.path.join(ROOT, 'public/sprites/skills')
OUT_JS = os.path.join(ROOT, 'src/data/farmCovers.js')
VER = '2.3.3124'

FW, FH, NF = 213, 220, 24           # the cook strip's cell and frame count
# The farmer's frames: the three where the cook holds the pan OUT to the side,
# its bowl clear of the hands (in the rest the hands pull it in over them).
# Played to and fro, the arms work a little, as the cook's do.
FRAMES = (4, 5, 6)
PAN_X = 126                         # right of this, in those frames, is only the pan
TOP_Y, BOT_Y = 94, 186              # and between these rows
OPEN_PX = 5                         # slivers thinner than this are not the pan
GROW = 3                            # the pan's area grown by this, in frame px
MIN_X = 120                         # no cover may reach left of this: the hands
FOOT_Y = (168, 196)                 # where a cover may stand (its foot's row)

# The crate's opening (its straw), in crate-3's own picture px, inside the rims
OPENING = [(16, 38), (72, 13), (80, 13), (106, 30), (104, 37), (52, 55), (44, 55), (14, 43)]
# The compost bin's opening (its compost), as shares of its picture
BIN_MOUTH = (0.50, 0.28)


def pan_area():
    """The pan in the farmer's frames, as one mask in the cook frame's px."""
    im = np.array(Image.open(COOK).convert('RGBA')).astype(int)
    assert im.shape[1] == FW * NF and im.shape[0] == FH, im.shape
    u = np.zeros((FH, FW), bool)
    for i in FRAMES:
        m = im[:, i * FW:(i + 1) * FW, 3] > 60
        m[:TOP_Y, :] = False
        m[BOT_Y:, :] = False
        m[:, :PAN_X] = False
        u |= m
    img = Image.fromarray((u * 255).astype(np.uint8))
    opened = img.filter(ImageFilter.MinFilter(OPEN_PX)).filter(ImageFilter.MaxFilter(OPEN_PX))
    grown = np.array(opened.filter(ImageFilter.MaxFilter(2 * GROW + 1))) > 0
    return np.array(opened) > 0, grown


def figure_x():
    """The middle of the cook's boots in the farmer's frames, frame px: where
    your feet are when you kneel (the figure is placed by it, not by its
    cell's middle -- the cell is wide for the pan)."""
    im = np.array(Image.open(COOK).convert('RGBA')).astype(int)
    mids = []
    for i in FRAMES:
        a = im[180:, i * FW:(i + 1) * FW, 3] > 60
        c = np.nonzero(a.any(axis=0))[0]
        mids.append((c.min() + c.max()) / 2)
    return round(sum(mids) / len(mids), 1)


def sheet_piece(sheet, frame):
    meta = json.load(open(os.path.join(OBJ, sheet + '.json')))
    f = meta['frames'][frame]['frame']
    pic = Image.open(os.path.join(OBJ, meta['meta']['image'])).convert('RGBA')
    return pic.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))


def tile_of(pic, box):
    """A patch of a picture, repeated: the filling's texture."""
    return pic.convert('RGBA').crop(box)


def fill_crate(crate, texture, back_shade=0.62):
    """The crate with its opening filled from `texture` (tiled), darker under
    the back rim, the straw that pokes above the rims taken too."""
    a = np.array(crate).astype(float)
    H, W = a.shape[:2]
    mask = Image.new('L', (W, H), 0)
    ImageDraw.Draw(mask).polygon(OPENING, fill=255)
    inside = np.array(mask) > 0
    r, g = a[..., 0], a[..., 1]
    rs = np.maximum(r, 1)
    straw = (a[..., 3] > 200) & (g / rs > 0.76) & (r > 165)
    near = np.array(mask.filter(ImageFilter.MaxFilter(9))) > 0
    take = inside | (straw & near)
    t = np.array(texture).astype(float)
    th, tw = t.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W]
    src = t[yy % th, xx % tw]
    # the back rim's shadow: the top rows of the opening, column by column
    first = np.full(W, H)
    for x in range(W):
        c = np.nonzero(inside[:, x])[0]
        if len(c):
            first[x] = c.min()
    depth = yy - first[None, :]
    shade = np.where(depth < 2, back_shade, np.where(depth < 4, (1 + back_shade) / 2, 1.0))
    out = a.copy()
    out[take, :3] = np.clip(src[take, :3] * shade[take, None], 0, 255)
    out[take, 3] = 255
    return Image.fromarray(out.astype(np.uint8), 'RGBA')


def mouth_of(box, size, at):
    """A point of the picture (its own px), where the picture stands over
    `box`: frame px, rounded."""
    x0, y0, x1, y1 = box
    return (int(round(x0 + at[0] * (x1 - x0) / size[0])), int(round(y0 + at[1] * (y1 - y0) / size[1])))


def covers_need(pic, box, need):
    """How many pixels of `need` show past the picture stretched over `box`."""
    x0, y0, x1, y1 = box
    m = np.array(pic.split()[3].resize((x1 - x0, y1 - y0), Image.NEAREST)) > 128
    pad = 400
    full = np.zeros((FH + 2 * pad, FW + 2 * pad), bool)
    full[y0 + pad:y1 + pad, x0 + pad:x1 + pad] = m
    return int((need & ~full[pad:pad + FH, pad:pad + FW]).sum())


def fit(pic, need):
    """The smallest box at the picture's own shape, standing at a foot row in
    FOOT_Y and right of MIN_X, that hides all of `need`."""
    w0, h0 = pic.size
    ys, xs = np.nonzero(need)
    span = int(xs.max() - xs.min())
    for wid in range(span, 400):
        hgt = int(round(wid * h0 / w0))
        for x0 in range(MIN_X, int(xs.min()) + 1):
            for foot in range(FOOT_Y[0], FOOT_Y[1] + 1, 2):
                box = (x0, foot - hgt, x0 + wid, foot)
                if covers_need(pic, box, need) == 0:
                    return box
    raise SystemExit('no box hides the pan with a %dx%d picture' % (w0, h0))


def main():
    u, need = pan_area()
    ys, xs = np.nonzero(need)
    print('the pan in frames %s, grown %d px: x %d..%d, y %d..%d' % (FRAMES, GROW, xs.min(), xs.max(), ys.min(), ys.max()))
    crate = sheet_piece('town-1', 'crate-3')
    soil = tile_of(Image.open(os.path.join(FARM, 'bed-dug.png')), (40, 32, 156, 112))
    seeds = tile_of(Image.open(os.path.join(FARM, 'seed-sacks.png')), (104, 46, 166, 70))
    water = tile_of(Image.open(os.path.join(GROUND, 'fresh-A.png')), (0, 0, 96, 96))
    pics = {
        'soil': fill_crate(crate, soil),
        'seeds': fill_crate(crate, seeds),
        'water': fill_crate(crate, water, back_shade=0.7),
        'straw': crate,
    }
    os.makedirs(OUT_DIR, exist_ok=True)
    crate_box = fit(crate, need)       # one shape, one box, for every filling
    rows = []
    for key, pic in pics.items():
        miss = covers_need(pic, crate_box, need)
        if miss:
            raise SystemExit('the %s crate shows %d px of the pan' % (key, miss))
        pic.save(os.path.join(OUT_DIR, 'farm-cover-%s.png' % key), optimize=True)
        print('%-7s %3dx%-3d over frame box %s -- 0 pan px showing' % (key, pic.size[0], pic.size[1], crate_box))
        mouth = mouth_of(crate_box, pic.size, (sum(p[0] for p in OPENING) / len(OPENING), sum(p[1] for p in OPENING) / len(OPENING)))
        rows.append("  %s: Object.freeze({ url: '/sprites/skills/farm-cover-%s.png?v=%s', w: %d, h: %d, box: Object.freeze([%d, %d, %d, %d]), mouth: Object.freeze([%d, %d]) }),"
                    % (key, key, VER, pic.size[0], pic.size[1], *crate_box, *mouth))
    # the compost bin is a farm picture already (FARM_THINGS): its own box
    binpic = Image.open(os.path.join(FARM, 'compost-bin.png')).convert('RGBA')
    bin_box = fit(binpic, need)
    print('%-7s %3dx%-3d over frame box %s -- 0 pan px showing' % ('compost', binpic.size[0], binpic.size[1], bin_box))
    mouth = mouth_of(bin_box, binpic.size, (BIN_MOUTH[0] * binpic.size[0], BIN_MOUTH[1] * binpic.size[1]))
    rows.append("  compost: Object.freeze({ art: 'compost-bin', w: %d, h: %d, box: Object.freeze([%d, %d, %d, %d]), mouth: Object.freeze([%d, %d]) }),"
                % (binpic.size[0], binpic.size[1], *bin_box, *mouth))
    order = list(FRAMES) + list(FRAMES[-2:0:-1])
    js = """/* v2.3.3124: GENERATED by tools/world/make_farm_covers.py -- do not edit by
   hand; run the tool again.  The farmer kneels as the cook does (the owner:
   "Cooking animation might be better.  You can use something to occlude the
   part where the pan or log is"), on the cook strip's frames %s played to and
   fro, and one of the owner's own pictures stands where the pan is, drawn on
   top of every layer the figure wears: the open crate filled with earth,
   seeds or water, the compost bin, or the crate's straw.  Each cover's box is
   in the cook strip's own frame pixels (213 x 220, the figure's anchor at the
   bottom middle), and its `mouth` the middle of its opening, where what you
   take from it flies from; a cover with `art` is a farm picture
   (src/data/farmArt.js), one with `url` its own file.
   docs/specs/farm-walk.md. */
export const FARM_COVER_FRAME = Object.freeze({ w: %d, h: %d });
/* the cook strip's frames the farmer plays, in order, round and round */
export const FARM_KNEEL_ORDER = Object.freeze([%s]);
/* the pan's area in those frames, grown %d px: what every cover hides */
export const FARM_PAN_BOX = Object.freeze([%d, %d, %d, %d]);
/* the middle of the cook's boots in those frames, frame px: the figure is
   placed so they stand where yours did */
export const FARM_FIGURE_X = %s;
export const FARM_COVERS = Object.freeze({
%s
});
/* each step's cover */
export const FARM_STEP_COVER = Object.freeze({ dig: 'soil', plant: 'seeds', water: 'water', feed: 'compost', harvest: 'straw' });
""" % (', '.join(str(f) for f in FRAMES), FW, FH, ', '.join(str(f) for f in order), GROW,
       xs.min(), ys.min(), xs.max() + 1, ys.max() + 1, figure_x(), '\n'.join(rows))
    with open(OUT_JS, 'w') as f:
        f.write(js)
    print('wrote', os.path.relpath(OUT_JS, ROOT))


if __name__ == '__main__':
    main()
