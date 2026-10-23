#!/usr/bin/env python3
"""v2.3.3571: THE OWNER'S OWN ITEM PICTURES, ONE FILE EACH.

The owner, 2026-10-22, with a picture of a copper ore lump and a pickaxe:
"Ok change the art style of the copper ore and the pickaxe to this."

    python3 tools/ui/cut-owner-items.py            write every picture below
    python3 tools/ui/cut-owner-items.py --check    write nothing; say whether
                                                   every file is still the cut's

Each source is a picture the owner sent, kept as supplied under
assets/icons-source/ (a background remover's transparent PNG: the pieces stand
on alpha 0, a faint haze of alpha 1-4 round them, and solid is ~252, not 255).
Each piece is found by its COLUMNS: the columns its solid core (alpha over
AMIN) covers, runs of them split by at least GAP empty columns, read left to
right -- the tool refuses to write anything unless it finds exactly as many
pieces as the source lists.  A piece is cut as tools/ui/cut-owner-icons.py's
`alpha` mode cuts one (v2.3.3526): its core grown GROW px is its region, which
keeps its soft edge and drops the haze; the alpha lifted from the remover's
~250 to solid (a' = min(255, a * 255 / 250)); anything under 40 dropped.

Each is written over today's file at today's canvas, its larger side the share
of the canvas today's picture fills (cut-owner-icons.py `to_frame_wh`, 1 px
kept clear), centred, as a WebP at quality 90 -- so it is drawn the same size
in every place that draws today's:
  ore-copper.webp     256 x 256, 0.781 (today's lump and its shadow, 200 px):
                      the bag, the Smelting rows, the quest cards, the ore that
                      flies to the bag, and (v2.3.3571) the ore that pops out
                      of a broken copper rock (effectsRenderer ORE_ICON_TEX);
  mining-pickaxe.webp 192 x 192, 1.0 (T36.1's own rule): the bag, the mining
                      gesture's cue, the quest card's reward line and the
                      label over every rock (nodeLabels.js, whose `box` is this
                      file's opaque box -- the tool prints it).

The copper rock in the WORLD is not this picture: it is pixel art at the
world's own scale (tools/world/add-ore-art.mjs, public/sprites/ore/), and the
iron, black steel and obsidian icons are recoloured from the OLD copper lump,
kept for that at assets/icons-source/ore-copper-lump.webp (make_tier_art.py),
so they look as they did.

Each file written is recorded in tools/ui/owner-items.json -- its SHA-256, its
size and its opaque box: server/test/owner-icons.test.mjs §8 fails if another
tool ever writes over one (process_inventory_icons_sheet.py and make_tier_art.py
both once wrote these names; the fix is to run this tool again), and if
nodeLabels.js's box for the rock's label is not the pickaxe's.
"""
import hashlib
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
SUMS = os.path.join(ROOT, 'tools', 'ui', 'owner-items.json')
QUALITY = 90            # cut-owner-icons.py's
AMIN = 230              # a piece's solid core
GROW = 6                # its region: the core grown this many px
GAP = 20                # empty columns between two pieces, at least

SOURCES = [
    dict(src='assets/icons-source/owner-2026-10-22/copper-ore-and-pickaxe.png',
         said='"Ok change the art style of the copper ore and the pickaxe to this." (2026-10-22)',
         pieces=[
             dict(what='copper ore', out='public/icons/items/ore-copper.webp', canvas=(256, 256), fill=0.781),
             dict(what='pickaxe', out='public/icons/items/mining-pickaxe.webp', canvas=(192, 192), fill=1.0),
         ]),
]


def lift_alpha(a):
    """The background remover's ~250 is solid: a' = min(255, a * 255 / 250)."""
    return np.minimum(255, (a.astype(np.int32) * 255) // 250)


def find_pieces(im, want):
    a = np.array(im.getchannel('A'))
    cols = np.where((a > AMIN).any(axis=0))[0]
    if cols.size == 0:
        raise SystemExit('ABORT: no solid piece in the source')
    runs, start, prev = [], cols[0], cols[0]
    for c in cols[1:]:
        if c - prev > GAP:
            runs.append((start, prev))
            start = c
        prev = c
    runs.append((start, prev))
    if len(runs) != want:
        raise SystemExit(f'ABORT: found {len(runs)} pieces, the source lists {want}: {runs}')
    return runs


def cut_piece(im, x0, x1):
    """cut-owner-icons.py's `alpha` mode on the columns x0..x1 (plus room to grow)."""
    w, h = im.size
    lo, hi = max(0, x0 - GROW - 2), min(w, x1 + GROW + 3)
    c = im.crop((lo, 0, hi, h))
    a = c.getchannel('A')
    core = a.point(lambda v: 255 if v > AMIN else 0)
    region = np.array(core.filter(ImageFilter.MaxFilter(GROW * 2 + 1))) > 0
    al = lift_alpha(np.array(a))
    al[~region] = 0
    al[al < 40] = 0
    c.putalpha(Image.fromarray(al.astype(np.uint8), 'L'))
    bb = c.getbbox()
    return c.crop(bb)


def resize(im, size):
    """Lanczos on premultiplied colour, so a see-through px's colour never
    bleeds into the edge (cut-owner-icons.py's)."""
    if im.size == size:
        return im
    return im.convert('RGBa').resize(size, Image.LANCZOS).convert('RGBA')


def to_frame_wh(im, wh, fill):
    """cut-owner-icons.py's: today's canvas, the art's larger side `fill` of the
    canvas's larger side, never past the canvas (1 px kept clear), centred."""
    W, H = wh
    w, h = im.size
    k = min(fill * max(W, H) / max(w, h), (W - 2) / w, (H - 2) / h)
    art = resize(im, (max(1, round(w * k)), max(1, round(h * k))))
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    out.alpha_composite(art, ((W - art.width) // 2, (H - art.height) // 2))
    return out


def opaque_box(im, amin=8):
    """[x, y, w, h] of what is drawn (nodeLabels.js's `box`)."""
    a = im.getchannel('A').point(lambda v: 255 if v > amin else 0)
    x0, y0, x1, y1 = a.getbbox()
    return [x0, y0, x1 - x0, y1 - y0]


def sha(path):
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def main():
    check = '--check' in sys.argv[1:]
    record, bad = {}, []
    for s in SOURCES:
        im = Image.open(os.path.join(ROOT, s['src'])).convert('RGBA')
        runs = find_pieces(im, len(s['pieces']))
        for p, (x0, x1) in zip(s['pieces'], runs):
            art = cut_piece(im, x0, x1)
            out = to_frame_wh(art, p['canvas'], p['fill'])
            path = os.path.join(ROOT, p['out'])
            if check:
                if not os.path.exists(path):
                    bad.append(p['out'] + ' missing')
                continue
            out.save(path, 'WEBP', quality=QUALITY, method=6)
            record[p['out']] = dict(what=p['what'], sha256=sha(path), size=list(out.size), box=opaque_box(out),
                                    src=s['src'])
            print(f"wrote {p['out']}: the {p['what']}, cut {art.size[0]} x {art.size[1]} from columns "
                  f"{x0}-{x1}, {out.size[0]} x {out.size[1]}, opaque box {opaque_box(out)}")
    if check:
        with open(SUMS) as f:
            want = json.load(f)
        for rel, e in want.items():
            p = os.path.join(ROOT, rel)
            if not os.path.exists(p) or sha(p) != e['sha256']:
                bad.append(rel + ' is not the cut')
        print('\n'.join(bad) if bad else f'all {len(want)} files are the cut')
        sys.exit(1 if bad else 0)
    with open(SUMS, 'w') as f:
        json.dump(record, f, indent=1)
        f.write('\n')
    print('wrote', os.path.relpath(SUMS, ROOT))


if __name__ == '__main__':
    main()
