#!/usr/bin/env python3
"""v2.3.2988: SCRUB THE ERASED SWORD OUT OF THE SWING'S BODY SHEETS.

Owner: "Look at the sword frames it looks like there's some white pixels that
shouldn't be there.  But whatever changes you make make sure they are
compatible with getting recolored because all swords will get recolored using
the same base."

WHERE THE PIXELS CAME FROM.  The sword swing is a stand-in (effectsRenderer
_updateSwordSwing) drawn as layers: the recoloured BODY sheet
(sword-<dir>-body.png, or -torso.png while running), the shirt and armour,
then the WEAPON strip (sword-<dir>-weapon.png) -- one base sword, tinted per
metal (weaponTint).  The body sheet was made from the original art
(sword-<dir>.png), where the sword is drawn in KEY colours -- a magenta blade
and a cyan guard -- by erasing those colours.  The erase took the exact key
colours and left everything blended with them: the blade's highlight specks
and its motion smear (white / light grey), its anti-aliased edge (dark
purple, and in two east frames a whole dark-purple blade), the guard's edge
(teal), and the blade's dark outline.  The weapon layer covers most of that,
but not all -- the base sword is not the original blade's exact shape -- so
on every metal, a white line ran past the tip, a purple fringe along the
blade, teal at the hands.

THE FIX IS IN THE BODY SHEETS, NOT THE SWORD.  Nothing here touches the weapon
strip: it stays the one base every sword is recoloured from, so every metal
inherits the fix.  And nothing here CHANGES a body pixel either -- a pixel is
either kept exactly or made fully transparent -- so the body's own recolour
(playerSkins: skin / trousers / shoes classified by RGB) sees exactly the
pixels it saw before, minus the ghost.

WHICH PIXELS GO.  Only inside the original sword's footprint: the key-
coloured pixels of sword-<dir>.png, grown through the light pixels connected
to them (the highlight specks and the smear), dilated by 3px.  Inside it:
  1. colours the body cannot have there -- teal/cyan/blue/purple/magenta, light
     neutral grey and white, see-through fringe that is not skin or trousers --
     unless the pixel sits inside the face (an eye white has skin on three
     sides);
  2. what is left must hug the clean body: anything more than 3px from the
     body outside the footprint, and not skin- or trouser-coloured, is the
     blade's dark outline running out along it;
  3. specks of 16px or fewer, detached from everything, near the footprint.
Hands on the grip and legs behind the blade are skin and trousers, within a
few px of the body, so they stay.  Run with --check to report without
writing; the default writes the cleaned PNGs in place, IHDR/IDAT/IEND only
(the originals carry no colour chunks, and a gAMA chunk could let a browser
shift the exact RGB the recolour reads).

Needs ImageMagick (convert/identify) on PATH.  Commit only the .png: CI's
optimize-assets workflow mints the .webp twin and proves it lossless.
"""
import colorsys
import subprocess
import sys
from collections import deque

REPO = 'public/sprites/player/'
FACINGS = {'east': 201, 'south': 160, 'north': 340}   # frame width on disk
SHEETS = ('body', 'torso')


def load(path):
    w, h = map(int, subprocess.run(['identify', '-format', '%w %h', path],
                                   capture_output=True, text=True, check=True).stdout.split())
    raw = subprocess.run(['convert', path, '-depth', '8', 'RGBA:-'], capture_output=True, check=True).stdout
    assert len(raw) == w * h * 4, (path, len(raw), w, h)
    return w, h, bytearray(raw)


def save(path, w, h, buf):
    subprocess.run(['convert', '-size', f'{w}x{h}', '-depth', '8', 'RGBA:-',
                    '-define', 'png:exclude-chunks=all', 'PNG32:' + path], input=bytes(buf), check=True)


def hsl(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    return round(h * 360) % 360, round(s * 100), round(l * 100)


def px(img, x, y):
    w, _, d = img
    i = (y * w + x) * 4
    return d[i], d[i + 1], d[i + 2], d[i + 3]


def is_key(r, g, b, a):
    """the original art's sword: magenta blade, cyan guard"""
    if a < 40:
        return False
    magenta = r > 140 and b > 140 and g < 110 and (r - g) > 70 and (b - g) > 70
    cyan = g > 140 and b > 140 and r < 120 and (g - r) > 50
    return magenta or cyan


def footprint(orig, radius=3, steps=6):
    w, h, _ = orig
    grow = {(x, y) for y in range(h) for x in range(w) if is_key(*px(orig, x, y))}
    for _ in range(steps):   # the highlight specks and the motion smear, connected to the blade
        add = set()
        for (x, y) in grow:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                X, Y = x + dx, y + dy
                if 0 <= X < w and 0 <= Y < h and (X, Y) not in grow:
                    r, g, b, a = px(orig, X, Y)
                    _, S, L = hsl(r, g, b)
                    if a > 20 and (min(r, g, b) > 150 or (S < 18 and L >= 50)):
                        add.add((X, Y))
        grow |= add
    foot = set()
    for (x, y) in grow:
        for dy in range(-radius, radius + 1):
            for dx in range(-radius, radius + 1):
                X, Y = x + dx, y + dy
                if 0 <= X < w and 0 <= Y < h:
                    foot.add((X, Y))
    return foot


def skinish(r, g, b, a):
    H, S, L = hsl(r, g, b)
    return a > 100 and (H <= 45 or H >= 345) and S >= 30 and 25 <= L <= 80


def trouserish(r, g, b, a):
    H, S, L = hsl(r, g, b)
    return a > 100 and 40 <= H <= 95 and S >= 8 and 15 <= L <= 60


def ghost_colour(r, g, b, a):
    """a colour the body cannot have where the sword was"""
    H, S, L = hsl(r, g, b)
    if 150 <= H < 330 and S >= 10 and not (H >= 300 and L < 20 and S < 30):
        return True   # teal, cyan, blue, purple, magenta
    if S < 12 and L >= 45:
        return True   # the blade's highlight and smear: light grey, white
    if a < 200 and not ((H <= 90 or H >= 345) and S >= 10):
        return True   # see-through fringe that is not skin or trousers
    return False


def in_face(img, x, y):
    """an eye white: skin within 3px on at least three of four sides"""
    w, h, _ = img
    hits = 0
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        for k in range(1, 4):
            X, Y = x + dx * k, y + dy * k
            if 0 <= X < w and 0 <= Y < h and skinish(*px(img, X, Y)):
                hits += 1
                break
    return hits >= 3


def clean(facing, sheet, near_px=3, speck_px=16):
    orig = load(f'{REPO}sword-{facing}.png')
    img = load(f'{REPO}sword-{facing}-{sheet}.png')
    w, h, data = img
    assert (orig[0], orig[1]) == (w, h), 'sheet and original differ in size'
    foot = footprint(orig)
    out = bytearray(data)
    gone = set()

    def drop(x, y):
        i = (y * w + x) * 4
        out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0
        gone.add((x, y))

    # 1. colours the body cannot have, where the sword was
    for (x, y) in foot:
        r, g, b, a = px(img, x, y)
        if a and ghost_colour(r, g, b, a) and not in_face(img, x, y):
            drop(x, y)
    # 2. what is left in the footprint must hug the clean body
    dist = [[1 << 30] * w for _ in range(h)]
    q = deque()
    for y in range(h):
        for x in range(w):
            if (x, y) not in foot and data[(y * w + x) * 4 + 3] >= 128:
                dist[y][x] = 0
                q.append((x, y))
    while q:
        x, y = q.popleft()
        nd = dist[y][x] + 1
        if nd > near_px + 1:
            continue
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            X, Y = x + dx, y + dy
            if 0 <= X < w and 0 <= Y < h and dist[Y][X] > nd:
                dist[Y][X] = nd
                q.append((X, Y))
    for (x, y) in foot:
        if (x, y) in gone:
            continue
        i = (y * w + x) * 4
        p = (out[i], out[i + 1], out[i + 2], out[i + 3])
        if p[3] and dist[y][x] > near_px and not skinish(*p) and not trouserish(*p):
            drop(x, y)
    # 3. small detached specks near where the sword was, frame by frame
    near = set()
    for (x, y) in foot:
        for dy in range(-6, 7):
            for dx in range(-6, 7):
                near.add((x + dx, y + dy))
    fw = FACINGS[facing]
    seen = set()
    for y in range(h):
        for x in range(w):
            if (x, y) in seen or not out[(y * w + x) * 4 + 3]:
                continue
            comp, q, frame = [], deque([(x, y)]), x // fw
            seen.add((x, y))
            while q:
                cx, cy = q.popleft()
                comp.append((cx, cy))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
                    X, Y = cx + dx, cy + dy
                    if 0 <= X < w and 0 <= Y < h and X // fw == frame and (X, Y) not in seen and out[(Y * w + X) * 4 + 3]:
                        seen.add((X, Y))
                        q.append((X, Y))
            if len(comp) <= speck_px and any(p in near for p in comp):
                for (cx, cy) in comp:
                    drop(cx, cy)
    return w, h, out, len(gone)


if __name__ == '__main__':
    check = '--check' in sys.argv
    for facing in FACINGS:
        for sheet in SHEETS:
            path = f'{REPO}sword-{facing}-{sheet}.png'
            w, h, out, n = clean(facing, sheet)
            if not check and n:
                save(path, w, h, out)
            print(f'{path}: {n} ghost px {"found" if check else "removed"}')
