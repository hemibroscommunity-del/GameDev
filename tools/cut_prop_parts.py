"""CUT THE MOVING PARTS OUT OF THE TOWN BUILDINGS  (v2.3.2782).

    python3 tools/cut_prop_parts.py [--debug DIR]

Owner: "I'm looking for a liveness pass.  Basically making things move a
little in a way that makes sense for whatever object it is."  A building is
one painting, so nothing on it can move until the thing that should move --
a hanging sign, a flag, a crate on a chain -- is its own picture.  This tool
cuts those pieces out.

For each building it writes

  public/sprites/props/<name>-still.png   the building with its moving parts
                                          ERASED (same canvas, same size, so
                                          worldH and the bottom-centre anchor
                                          mean exactly what they meant)
  public/sprites/props/prop-parts.png     every cut piece, packed with a
                                          transparent gutter (the pieces are
                                          drawn LINEAR and rotated, so a
                                          neighbour must never bleed in)
  src/data/propParts.js                   generated: where each piece sits in
                                          the atlas and on its building, the
                                          point it hangs from, and the sparkle
                                          spots found on the bank's gold

The ORIGINAL <name>.png files are the input and are left untouched: re-run
this after any repaint.  Nothing in the game loads them any more.

HOW A PIECE IS FOUND.  Every piece here hangs against the sky (the painted
background round it is transparent), so a piece is a CONNECTED BLOB of
opaque pixels: flood-filled from a seed inside it, kept inside a box, and
stopped by CUT lines drawn where it meets the building -- across a chain just
under the beam it hangs from, or down the edge of a flagpole.  The cut line's
own pixels stay on the building, so the join is the building's art.

--debug DIR also writes, per building, the still art with each piece's
outline and hang point drawn over it: LOOK at it after changing a spec.
"""
import json
import os
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROPS = os.path.join(ROOT, 'public', 'sprites', 'props')
OUT_JS = os.path.join(ROOT, 'src', 'data', 'propParts.js')
# Two sheets, because the two kinds of piece want opposite sampling.
#   swing  ROTATES, and nearest-sampled pixel art crawls when it rotates (the
#          stair-step on every edge moves with the angle); linear at the
#          art's own size blurs it next to the crisp building.  So the pieces
#          are stored 2x, each texel a clean 2x2 block, and drawn LINEAR at
#          resolution 2: the blend only ever spans half a texel, which reads
#          as sharp and turns smoothly.
#   flag   only BENDS, column by column, like every pixel-art flag: NEAREST
#          at 1x, so a wave is whole texels stepping up and down.
SHEETS = {'swing': ('prop-swing@2x.png', 2), 'flag': ('prop-flags.png', 1)}
GUTTER = 3
ALPHA_MIN = 10

# ── the pieces, in the ORIGINAL art's pixels ──
#   kind  'swing'  hangs from `pivot` and swings like a pendulum
#         'flag'   cloth pinned along its left edge (`pole` = that edge's x)
#         'erase'  removed and replaced by something drawn live (the forge's
#                  painted smoke, which the chimney now makes for real)
#   box   (x0, y0, x1, y1), inclusive-exclusive, the piece cannot leave it
#   seeds points inside the piece
#   cuts  line segments ((x0, y0), (x1, y1)) the fill cannot cross.  A cut
#         is where the piece HANGS FROM the building unless it ends in 'sep'
#         -- a 'sep' cut only parts it from something it merely touches.
#
# OVERLAP AT THE HANG POINT.  The renderer rounds every sprite to whole screen
# pixels (roundPixels), each on its own, so a piece and the building it hangs
# from can land half a pixel apart in opposite directions: a hairline of
# background opens along the cut and flickers as the camera glides (seen on
# the auction house's banner, v2.3.2782).  So along every hang cut the piece
# also takes the building's pixels for OVERLAP px back across the line --
# drawn twice, identically, at rest; right at the pivot, where a swing hardly
# moves anything.  A 'sep' cut gets none: there the piece swings AWAY from
# its neighbour, and a copied sliver of the neighbour would swing with it.
OVERLAP = 2
SPECS = {
    'forge': [
        # The smith's sign: a shield on two chains under the beam on the
        # right.  Cut across each chain just under the beam.
        dict(id='sign', kind='swing', box=(440, 176, 510, 280), seeds=[(470, 235)],
             cuts=[((446, 180), (467, 180)), ((475, 195), (493, 195)),
                   # the diagonal brace on its left touches the shield's rim
                   ((444, 186), (444, 238), 'sep')], pivot=(470.5, 187.5)),
        # The painted smoke over the chimney.  Everything above the chimney's
        # top ring in this box is smoke.
        # The column itself runs on down into the mouth, in front of the
        # ring's back stones, so it is not erased below the box -- the rows
        # just under the cut are FADED in instead (`feather`: x0, x1, first
        # row, rows) so no flat edge is left for the live smoke to sit on.
        dict(id='smoke', kind='erase', box=(78, 0, 206, 63), feather=(130, 176, 63, 4)),
    ],
    'auction-house': [
        # The big AUCTION HOUSE board on its two chains off the beam.
        # The beam runs DOWNHILL to the left, so the left cut is long: the
        # beam's underside sits right beside the left chain's top.
        dict(id='sign', kind='swing', box=(402, 54, 512, 262), seeds=[(455, 170)],
             cuts=[((396, 66), (447, 66)), ((458, 54), (488, 54))], pivot=(456.5, 60.0)),
        # The red BROS BUY SELL banner hanging straight off the same beam.
        dict(id='banner', kind='swing', box=(362, 66, 406, 172), seeds=[(384, 120)],
             cuts=[((360, 66), (407, 66))], pivot=(384.0, 60.0)),
        # The scale pan on a chain off the tower's left bracket.
        dict(id='scales', kind='swing', box=(0, 207, 82, 352), seeds=[(38, 320)],
             cuts=[((26, 207), (48, 207))], pivot=(36.0, 204.0)),
        # The blue crown flag on the tower's pole.
        # Its lower corner touches the tower's roof cone: cut along the cone.
        dict(id='flag', kind='flag', box=(127, 10, 213, 110), seeds=[(170, 60)],
             cuts=[((126, 0), (126, 120)), ((127, 79), (153, 110), 'sep')], pole=126),
    ],
    'bank': [
        # The coin crate hanging off the end of the big key.
        dict(id='crate', kind='swing', box=(424, 102, 510, 214), seeds=[(466, 170)],
             cuts=[((458, 102), (478, 102))], pivot=(467.0, 99.0)),
        # The red flag on the top-left coin tower.
        dict(id='flagTL', kind='flag', box=(148, 2, 222, 60), seeds=[(180, 30)],
             cuts=[((147, 0), (147, 62)), ((147, 48), (166, 48), 'sep')], pole=147),
        # The red flag on the dome's finial, right side.
        dict(id='flagR', kind='flag', box=(425, 208, 482, 257), seeds=[(450, 232)],
             cuts=[((424, 200), (424, 262)), ((424, 249), (433, 249), 'sep')], pole=424),
    ],
    'mayor-house': [
        dict(id='flagS', kind='flag', box=(377, 22, 406, 64), seeds=[(388, 42)],
             cuts=[((376, 18), (376, 66))], pole=376),
        dict(id='flagL', kind='flag', box=(417, 4, 466, 72), seeds=[(440, 35)],
             cuts=[((416, 0), (416, 74)), ((416, 49), (428, 72), 'sep')], pole=416),
    ],
}

# Where the bank's gold catches the light: bright, saturated, yellow pixels
# that are the brightest in their neighbourhood.  Found once here rather than
# at load so the game only reads a list.
GLINT_PROPS = {'bank': 110, 'mayor-house': 26, 'auction-house': 30}


def load(name):
    im = Image.open(os.path.join(PROPS, name + '.png')).convert('RGBA')
    return np.array(im)


def raster_line(mask, a, b):
    (x0, y0), (x1, y1) = a, b
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(n + 1):
        t = i / max(1, n)
        x = int(round(x0 + (x1 - x0) * t))
        y = int(round(y0 + (y1 - y0) * t))
        if 0 <= y < mask.shape[0] and 0 <= x < mask.shape[1]:
            mask[y, x] = True


def piece_mask(arr, spec):
    h, w = arr.shape[:2]
    x0, y0, x1, y1 = spec['box']
    x1 = min(x1, w)
    y1 = min(y1, h)
    opaque = arr[:, :, 3] > ALPHA_MIN
    if spec['kind'] == 'erase':
        m = np.zeros((h, w), bool)
        m[y0:y1, x0:x1] = opaque[y0:y1, x0:x1]
        return m
    wall = np.zeros((h, w), bool)
    for c in spec.get('cuts', []):
        raster_line(wall, c[0], c[1])
    ok = np.zeros((h, w), bool)
    ok[y0:y1, x0:x1] = True
    ok &= opaque & ~wall
    m = np.zeros((h, w), bool)
    q = deque()
    for sx, sy in spec['seeds']:
        if not ok[sy, sx]:
            raise SystemExit('%s: seed %s is not inside the piece' % (spec['id'], (sx, sy)))
        m[sy, sx] = True
        q.append((sx, sy))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and ok[ny, nx] and not m[ny, nx]:
                m[ny, nx] = True
                q.append((nx, ny))
    # the faint antialiased rim just outside the blob belongs to it too
    rim = np.zeros_like(m)
    rim[1:, :] |= m[:-1, :]
    rim[:-1, :] |= m[1:, :]
    rim[:, 1:] |= m[:, :-1]
    rim[:, :-1] |= m[:, 1:]
    faint = (arr[:, :, 3] > 0) & (arr[:, :, 3] <= ALPHA_MIN) & ~wall
    m |= rim & faint
    return m


def dilate(m, n):
    out = m.copy()
    for _ in range(n):
        g = out.copy()
        g[1:, :] |= out[:-1, :]
        g[:-1, :] |= out[1:, :]
        g[:, 1:] |= out[:, :-1]
        g[:, :-1] |= out[:, 1:]
        out = g
    return out


def overlap_mask(arr, spec, m):
    """The building's pixels just across each HANG cut from the piece: copied
    into the piece (not erased from the building) so the join never opens."""
    h, w = arr.shape[:2]
    hang = np.zeros((h, w), bool)
    for c in spec.get('cuts', []):
        if len(c) > 2 and c[2] == 'sep':
            continue
        raster_line(hang, c[0], c[1])
    if not hang.any():
        return np.zeros((h, w), bool)
    near = dilate(m, OVERLAP + 1) & dilate(hang, OVERLAP)
    return near & (arr[:, :, 3] > ALPHA_MIN) & ~m


def glint_spots(arr, n):
    r = arr[:, :, 0].astype(int)
    g = arr[:, :, 1].astype(int)
    b = arr[:, :, 2].astype(int)
    a = arr[:, :, 3]
    lum = r + g
    gold = (a > 200) & (r > 222) & (g > 178) & (b < 140) & (r - b > 110)
    cand = []
    h, w = lum.shape
    for y in range(3, h - 3):
        for x in range(3, w - 3):
            if not gold[y, x]:
                continue
            win = lum[y - 3:y + 4, x - 3:x + 4]
            if lum[y, x] >= win.max():
                cand.append((int(lum[y, x]), x, y))
    cand.sort(reverse=True)
    picked = []
    for _, x, y in cand:
        if all((x - px) ** 2 + (y - py) ** 2 >= 11 ** 2 for px, py in picked):
            picked.append((x, y))
        if len(picked) >= n:
            break
    return sorted(picked, key=lambda p: (p[1], p[0]))


def shelf(order, W):
    x = y = GUTTER
    row = 0
    spots = []
    for p in order:
        ph, pw = p['img'].shape[:2]
        if x + pw + GUTTER > W:
            x = GUTTER
            y += row + GUTTER
            row = 0
        spots.append((x, y))
        x += pw + GUTTER
        row = max(row, ph)
    return spots, y + row + GUTTER


def pack(pieces):
    """Shelf-pack the pieces, tallest first, at whichever width wastes least
    (every texel here is resident on a phone, so the sheet is kept small)."""
    order = sorted(pieces, key=lambda p: -p['img'].shape[0])
    widest = max(p['img'].shape[1] for p in order) + 2 * GUTTER
    best = None
    for W in range(max(64, widest), 513, 4):
        spots, H = shelf(order, W)
        if best is None or W * H < best[0] * best[1]:
            best = (W, H, spots)
    W, H, spots = best
    sheet = np.zeros((H, W, 4), np.uint8)
    for p, (x, y) in zip(order, spots):
        ph, pw = p['img'].shape[:2]
        p['ax'], p['ay'] = x, y
        sheet[y:y + ph, x:x + pw] = p['img']
    return sheet


def main():
    debug = None
    if '--debug' in sys.argv:
        debug = sys.argv[sys.argv.index('--debug') + 1]
        os.makedirs(debug, exist_ok=True)
    pieces = []
    table = {}
    for name, specs in SPECS.items():
        src = load(name)
        still = src.copy()
        h, w = src.shape[:2]
        entry = {'still': '/sprites/props/%s-still.png' % name, 'w': w, 'h': h, 'parts': []}
        outlines = []
        for spec in specs:
            m = piece_mask(src, spec)
            if not m.any():
                raise SystemExit('%s/%s: empty mask' % (name, spec['id']))
            still[m] = 0
            if spec.get('feather'):
                fx0, fx1, fy0, rows = spec['feather']
                for i in range(rows):
                    row = still[fy0 + i, fx0:fx1]
                    row[:, 3] = (row[:, 3].astype(float) * (i + 1) / (rows + 1)).astype(np.uint8)
            outlines.append((spec, m))
            if spec['kind'] == 'erase':
                entry['parts'].append({'id': spec['id'], 'kind': 'erase'})
                continue
            drawn = m | overlap_mask(src, spec, m)
            ys, xs = np.nonzero(drawn)
            bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
            img = np.zeros((by1 - by0, bx1 - bx0, 4), np.uint8)
            sub = drawn[by0:by1, bx0:bx1]
            img[sub] = src[by0:by1, bx0:bx1][sub]
            p = {'prop': name, 'id': spec['id'], 'kind': spec['kind'], 'img': img,
                 'x': int(bx0), 'y': int(by0), 'w': int(bx1 - bx0), 'h': int(by1 - by0),
                 'px': int(m.sum())}
            if spec['kind'] == 'swing':
                p['pivot'] = [float(spec['pivot'][0]), float(spec['pivot'][1])]
            else:
                p['pole'] = int(spec['pole'])
            pieces.append(p)
            entry['parts'].append(p)
        Image.fromarray(still, 'RGBA').save(os.path.join(PROPS, name + '-still.png'), optimize=True)
        if name in GLINT_PROPS:
            entry['glints'] = [list(s) for s in glint_spots(still, GLINT_PROPS[name])]
        table[name] = entry
        if debug:
            im = Image.fromarray(still, 'RGBA')
            bg = Image.new('RGBA', im.size, (60, 80, 60, 255))
            bg.alpha_composite(im)
            over = np.array(bg)
            for spec, m in outlines:
                edge = m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1))
                over[edge] = (255, 0, 255, 255) if spec['kind'] != 'erase' else (0, 255, 255, 255)
            dim = Image.fromarray(over, 'RGBA').resize((w * 2, h * 2), Image.NEAREST)
            d = ImageDraw.Draw(dim)
            for spec, _ in outlines:
                if 'pivot' in spec:
                    px, py = spec['pivot']
                    d.ellipse([px * 2 - 5, py * 2 - 5, px * 2 + 5, py * 2 + 5], outline=(255, 255, 0, 255), width=2)
                for c in spec.get('cuts', []):
                    d.line([c[0][0] * 2, c[0][1] * 2, c[1][0] * 2, c[1][1] * 2], fill=(255, 255, 0, 255), width=1)
            for gx, gy in entry.get('glints', []):
                d.point([gx * 2, gy * 2], fill=(255, 0, 0, 255))
                d.ellipse([gx * 2 - 3, gy * 2 - 3, gx * 2 + 3, gy * 2 + 3], outline=(255, 40, 40, 255))
            dim.save(os.path.join(debug, 'cut_%s.png' % name))
    sizes = {}
    for sheet_id, (fname, res) in SHEETS.items():
        mine = [p for p in pieces if p['kind'] == sheet_id]
        sheet = pack(mine)
        img = Image.fromarray(sheet, 'RGBA')
        if res != 1:
            img = img.resize((sheet.shape[1] * res, sheet.shape[0] * res), Image.NEAREST)
        img.save(os.path.join(PROPS, fname), optimize=True)
        sizes[sheet_id] = (sheet.shape[1], sheet.shape[0])
        if debug:
            bg = Image.new('RGBA', img.size, (60, 80, 60, 255))
            bg.alpha_composite(img)
            k = 2 if res == 1 else 1
            bg.resize((img.width * k, img.height * k), Image.NEAREST).save(os.path.join(debug, 'sheet_%s.png' % sheet_id))

    out = {}
    for name, entry in table.items():
        parts = []
        for p in entry['parts']:
            if p['kind'] == 'erase':
                parts.append({'id': p['id'], 'kind': 'erase'})
                continue
            q = {'id': p['id'], 'kind': p['kind'], 'frame': [p['ax'], p['ay'], p['w'], p['h']], 'at': [p['x'], p['y']]}
            # (the sheet is the kind: a swing piece lives on the swing sheet)
            if 'pivot' in p:
                q['pivot'] = p['pivot']
            if 'pole' in p:
                q['pole'] = p['pole']
            parts.append(q)
        o = {'still': entry['still'], 'w': entry['w'], 'h': entry['h'], 'parts': parts}
        if 'glints' in entry:
            o['glints'] = entry['glints']
        out[name] = o
    js = [
        '/* GENERATED by tools/cut_prop_parts.py -- do not edit by hand; change the',
        '   SPECS there and re-run it.  v2.3.2782: the town buildings\' moving parts.',
        '',
        '   Per building (keyed by the prop id in worldProps.js): the art with its',
        '   moving parts erased (`still`, same size as the original), and each part:',
        '   `frame` its rectangle on the sheet named by its kind (in the sheet\'s',
        '   1x units -- the swing sheet is stored 2x, see `res`), `at` where its',
        '   top-left sits on the building (original texture px), `pivot` the point a',
        '   swinging part hangs from, `pole` the x a flag is pinned along.',
        '   `glints`: spots on the building\'s gold where a sparkle may appear. */',
        'export const PROP_PART_SHEETS = {',
    ]
    for sheet_id, (fname, res) in SHEETS.items():
        js.append("  %s: { url: '/sprites/props/%s', w: %d, h: %d, res: %d }," % (sheet_id, fname, sizes[sheet_id][0], sizes[sheet_id][1], res))
    js += [
        '};',
        'export const PROP_PARTS = {',
    ]
    for name, o in out.items():
        js.append("  '%s': {" % name)
        js.append("    still: '%s', w: %d, h: %d," % (o['still'], o['w'], o['h']))
        js.append('    parts: [')
        for q in o['parts']:
            js.append('      ' + json.dumps(q, separators=(', ', ': ')) + ',')
        js.append('    ],')
        if 'glints' in o:
            js.append('    glints: ' + json.dumps(o['glints'], separators=(',', ':')) + ',')
        js.append('  },')
    js += ['};', '']
    with open(OUT_JS, 'w') as f:
        f.write('\n'.join(js))
    print('sheets %s, %d pieces' % (sizes, len(pieces)))
    for p in pieces:
        print('  %-14s %-7s %-6s at (%d,%d) %dx%d, %d px' % (p['prop'], p['id'], p['kind'], p['x'], p['y'], p['w'], p['h'], p['px']))


if __name__ == '__main__':
    main()
