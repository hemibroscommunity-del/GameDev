#!/usr/bin/env python3
"""v2.3.3274: CUT THE OWNER'S SMALL ICONS OUT OF THEIR FOUR SHEETS.

The owner, 2026-10-16, after the list of emoji and code-drawn pictures the game
still wore ("What else can I ask it [ChatGPT] to draw that would replace
something of lesser quality"), sent four sheets drawn for it -- "Here's the art
assets for the 'small icons'":

  1. assets/icons-source/sheet-small-1-party.png (1254 x 1254)
       party · party leader · party member down · party member elsewhere
       threat skull · talk bubble (the NPC marker)
       chat: party · area · whisper
       "Defense Lv N" (a shield on a plate; only the SHIELD is cut, by its
       mirror image, as the plate runs on behind it: the game writes the
       words and the number itself)
  2. assets/icons-source/sheet-small-2-abilities.png (1448 x 1086)
       Whirlwind · Special · Shield Bash · Jump · Element Burst
  3. assets/icons-source/sheet-small-3-stick.png (1448 x 1086)
       talk · enter (door) · sleep · dig
       plant · water · fertilize · harvest
  4. assets/icons-source/sheet-small-4-buffs.png (1448 x 1086)
       cursed · bleeding · damage · mana
       regen · resist · XP · speed

Every sheet is on a TRANSPARENT ground (its corners alpha 0), so nothing is
keyed by colour -- the icons' own black outlines would not survive a colour key
(TRAPS §56).

WHAT IT DOES (the method of slice-social-icons.mjs, v2.3.2926):
  1. FINDS each icon from the sheet's own alpha, never an assumed even grid
     (TRAPS §59): pieces of alpha > 24 on a 4 px grid, 8-connected, specks
     dropped.  Unlike the social sheet, an icon here can be SEVERAL pieces --
     the party's "!" strokes, the XP star's sparkles, the bed's Zzz, the
     watering can's drops -- so pieces are put in ROWS by the widest empty
     bands across the sheet, and a row is split into its icons at its widest
     empty columns: the row and icon counts are given (LAYOUT) and the tool
     refuses to write anything unless it finds exactly those.
  2. NORMALISES ALPHA: the art came out of a background remover at alpha
     ~252, not 255 (measured: 368,990 px at 253 on sheet 1, 4,459 at 255), so
     a' = min(255, a * 255 / 250) -- solid art solid, the fringe in proportion.
  3. FITS each icon centred on a square transparent canvas with a 12% margin
     (docs/UI-BIBLE.md Part 5, the icon set's frame), Lanczos, WebP 92.
     Each is written at the size it is DRAWN (size_of): 64 px for the small
     marks the HUD, the plates and the chat show, 160 for the buttons, 128 for
     the popup's shield -- a picture a page shows or warms is held decoded at
     its own size, and 256 px for a 16 px badge is 16x the memory for nothing.
     The five ability icons get a -grey copy for their cooldown and disabled
     states -- the controls never use a CSS filter (controlSkin.jsx header,
     TRAPS §42).
  4. Writes a CONTACT SHEET of every cut (--contact) to check by eye.

Refuses to overwrite an existing file without --force.

  python3 tools/ui/cut-small-icons.py [--force] [--contact out.png]
"""
import os
import sys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets', 'icons-source')
PUB = os.path.join(ROOT, 'public')

# Paths under public/, without the extension, row by row as drawn.
LAYOUT = [
    ('sheet-small-1-party.png', [
        ['icons/ui/party-member', 'icons/ui/party-leader', 'icons/ui/party-down', 'icons/ui/party-away'],
        ['icons/ui/threat-skull', 'icons/ui/npc-talk'],
        ['icons/ui/chat-party', 'icons/ui/chat-area', 'icons/ui/chat-whisper'],
        ['icons/popups/defense-up'],
    ]),
    ('sheet-small-2-abilities.png', [
        ['ui/controls/abil-whirl', 'ui/controls/abil-special', 'ui/controls/abil-bash',
         'ui/controls/abil-jump', 'ui/controls/abil-burst'],
    ]),
    ('sheet-small-3-stick.png', [
        ['ui/controls/talk', 'ui/controls/door', 'ui/controls/sleep', 'ui/controls/farm-dig'],
        ['ui/controls/farm-plant', 'ui/controls/farm-water', 'ui/controls/farm-feed', 'ui/controls/farm-harvest'],
    ]),
    ('sheet-small-4-buffs.png', [
        ['icons/ui/buff-cursed', 'icons/ui/buff-bleed', 'icons/ui/buff-damage', 'icons/ui/buff-mana'],
        ['icons/ui/buff-regen', 'icons/ui/buff-resist', 'icons/ui/buff-xp', 'icons/ui/buff-speed'],
    ]),
]
GREY = {n for n in LAYOUT[1][1][0]}
# The plate's words are the game's: keep only the shield at the left end.
SHIELD_ONLY = {'icons/popups/defense-up'}

MARGIN, QUALITY = 0.12, 92
# Each icon at the size it is DRAWN, not the icon set's 256 (a browser keeps a
# shown or warmed picture decoded at its own size): the party marks, chat lanes,
# buff badges, skull and talk bubble are drawn 13-24 CSS px -- 72 device px at
# most on a 3x phone -- the ability and stick pictures ~50 CSS px, the popup's
# shield ~37 world px.
def size_of(name):
    if name.startswith('ui/controls/'):
        return 160
    if name.startswith('icons/popups/'):
        return 128
    return 64
ALPHA_MIN, CELL, SPECK = 24, 4, 3
OPAQUE = 250


def pieces(img):
    """Pieces of alpha > ALPHA_MIN on a CELL grid, 8-connected: [x0, y0, x1, y1] in px."""
    w, h = img.size
    a = img.split()[3].load()
    cw, ch = (w + CELL - 1) // CELL, (h + CELL - 1) // CELL
    occ = bytearray(cw * ch)
    for y in range(h):
        row = (y // CELL) * cw
        for x in range(w):
            if a[x, y] > ALPHA_MIN:
                occ[row + x // CELL] = 1
    seen = bytearray(cw * ch)
    out = []
    for i in range(cw * ch):
        if not occ[i] or seen[i]:
            continue
        stack = [i]
        seen[i] = 1
        x0 = y0 = 10 ** 9
        x1 = y1 = -1
        n = 0
        while stack:
            k = stack.pop()
            x, y = k % cw, k // cw
            n += 1
            x0, y0, x1, y1 = min(x0, x), min(y0, y), max(x1, x), max(y1, y)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < cw and 0 <= ny < ch:
                        kk = ny * cw + nx
                        if occ[kk] and not seen[kk]:
                            seen[kk] = 1
                            stack.append(kk)
        if n >= SPECK:
            out.append([x0 * CELL, y0 * CELL, min(w, (x1 + 1) * CELL), min(h, (y1 + 1) * CELL)])
    return out


def split_by_gaps(items, lo, hi, count):
    """Split items into `count` groups at the widest empty bands along one axis
    (lo/hi pick each item's extent on it).  None when there are too few gaps."""
    items = sorted(items, key=lambda p: p[lo])
    spans = []          # merged extents, each with its items
    for p in items:
        if spans and p[lo] <= spans[-1][1]:
            spans[-1][1] = max(spans[-1][1], p[hi])
            spans[-1][2].append(p)
        else:
            spans.append([p[lo], p[hi], [p]])
    if len(spans) < count:
        return None
    gaps = sorted(range(1, len(spans)), key=lambda i: spans[i][0] - spans[i - 1][1], reverse=True)[:count - 1]
    cuts = sorted(gaps)
    groups, start = [], 0
    for c in cuts + [len(spans)]:
        groups.append([p for s in spans[start:c] for p in s[2]])
        start = c
    widths = sorted(spans[i][0] - spans[i - 1][1] for i in gaps)
    return groups, (widths[0] if widths else None)


def tight_box(img, box):
    a = img.split()[3]
    sub = a.crop(box).point(lambda v: 255 if v > ALPHA_MIN else 0)
    bb = sub.getbbox()
    return (box[0] + bb[0], box[1] + bb[1], box[0] + bb[2], box[1] + bb[3])


def union(group):
    return [min(p[0] for p in group), min(p[1] for p in group), max(p[2] for p in group), max(p[3] for p in group)]


def shield_only(img, box):
    """The plate runs on behind the shield's right side, so no straight cut
    separates them.  The shield is symmetric: its middle is where it is
    tallest, its right edge mirrors its left, and a pixel on its right half is
    kept only where its mirror image on the left half is shield."""
    x0, y0, x1, y1 = box
    a = img.split()[3].load()
    ext = []
    for x in range(x0, x1):
        col = [y for y in range(y0, y1) if a[x, y] > ALPHA_MIN]
        ext.append((col[-1] - col[0]) if col else 0)
    left = x0 + next(i for i, e in enumerate(ext) if e > 0)
    tallest = max(ext[:len(ext) // 2])
    peak = [x0 + i for i, e in enumerate(ext[:len(ext) // 2]) if e >= tallest - 2]
    mid = (peak[0] + peak[-1]) / 2
    right = int(round(2 * mid - left))
    crop = img.crop((left, y0, right + 1, y1)).copy()
    px = crop.load()
    w, h = crop.size
    for x in range(w):
        mx = int(round(2 * (mid - left) - x))
        if x <= mid - left or mx < 0:
            continue
        for y in range(h):
            if a[left + mx, y0 + y] <= ALPHA_MIN:
                r, g, b, _ = px[x, y]
                px[x, y] = (r, g, b, 0)
    return crop


def normalise(icon):
    r, g, b, a = icon.split()
    a = a.point(lambda v: min(255, round(v * 255 / OPAQUE)))
    return Image.merge('RGBA', (r, g, b, a))


def fit(icon, size):
    w, h = icon.size
    box = size * (1 - 2 * MARGIN)
    s = box / max(w, h)
    dw, dh = max(1, round(w * s)), max(1, round(h * s))
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.alpha_composite(icon.resize((dw, dh), Image.LANCZOS), ((size - dw) // 2, (size - dh) // 2))
    return out


def grey(icon):
    """The controls' greyed palette: luminance squeezed into 30..214, as the
    SVG icons' grey sets run (#15181B outline to #C0C4C8 light)."""
    r, g, b, a = icon.split()
    lum = Image.merge('RGB', (r, g, b)).convert('L').point(lambda v: 30 + round(v * 0.72))
    return Image.merge('RGBA', (lum, lum, lum, a))


def main():
    force = '--force' in sys.argv
    contact = sys.argv[sys.argv.index('--contact') + 1] if '--contact' in sys.argv else None
    writes, cuts, ok = [], [], True
    for sheet, rows in LAYOUT:
        img = Image.open(os.path.join(SRC, sheet)).convert('RGBA')
        ps = pieces(img)
        res = split_by_gaps(ps, 1, 3, len(rows))
        if not res:
            print(f'ABORT {sheet}: fewer than {len(rows)} rows of pieces')
            return 1
        row_groups, row_gap = res
        print(f'{sheet}: {len(ps)} pieces, {len(rows)} rows (narrowest row gap {row_gap}px)')
        for ri, (names, group) in enumerate(zip(rows, row_groups)):
            res = split_by_gaps(group, 0, 2, len(names))
            if not res:
                print(f'  ABORT row {ri + 1}: fewer than {len(names)} icons')
                return 1
            icons, gap = res
            print(f'  row {ri + 1}: {len(names)} icons (narrowest gap {gap}px)')
            for name, g in zip(names, icons):
                box = tight_box(img, union(g))
                if name in SHIELD_ONLY:
                    icon = shield_only(img, box)
                    icon = normalise(icon.crop(icon.getbbox()))
                else:
                    icon = normalise(img.crop(box))
                print(f'    {name:28s} {len(g):3d} piece(s)  box x{box[0]} y{box[1]} {box[2] - box[0]}x{box[3] - box[1]}')
                cuts.append((name, icon))
                writes.append((name, fit(icon, size_of(name))))
                if name in GREY:
                    writes.append((name + '-grey', grey(fit(icon, size_of(name)))))
    if contact:
        n = len(cuts)
        cols = 8
        rows_n = (n + cols - 1) // cols
        cs = Image.new('RGBA', (cols * 160, rows_n * 160), (60, 66, 72, 255))
        for i, (name, icon) in enumerate(cuts):
            t = fit(icon, 150)
            cs.alpha_composite(t, ((i % cols) * 160 + 5, (i // cols) * 160 + 5))
        cs.convert('RGB').save(contact)
        print('contact sheet:', contact)
    clash = [n for n, _ in writes if os.path.exists(os.path.join(PUB, n + '.webp'))]
    if clash and not force:
        print('refusing to overwrite (pass --force to re-cut):\n  ' + '\n  '.join(clash))
        return 1
    for name, im in writes:
        path = os.path.join(PUB, name + '.webp')
        os.makedirs(os.path.dirname(path), exist_ok=True)
        im.save(path, 'WEBP', quality=QUALITY, method=6)
        print(f'  wrote {path[len(ROOT) + 1:]}  {os.path.getsize(path) / 1024:.1f} KB')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
