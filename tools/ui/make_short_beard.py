"""v2.3.3588: THE SHORT BEARD, THE GAME'S OWN BEARD TRIMMED AT THE CHIN.

The owner, weighing whether the townsfolk's portraits should match the game or
the game the portraits: "Or maybe make the characters in game just look more
like the portraits. Can you do it both ways so I can compare?"  Four of the
townsfolk's Hemi Bros portraits (the Mayor, Blacksmith Bro, Farmer Bro,
Beastmaster Bro) wear the collection's jaw beard, which ends at the chin; the
creator's only beard hangs to the chest.  So the creator gets a second one.

    python3 tools/ui/make_short_beard.py            # writes facialhair/short-beard/
    python3 tools/ui/make_short_beard.py --check    # the files match a fresh run

-- TRIMMED, NOT DRAWN --
It is the long beard's own art (public/sprites/traits/facialhair/beard/), so
it keeps the game's look -- its shading, its colours (the beard colour row
recolours it by the same brightness ratio), its moustache and mouth -- and
its placement: the same frame, anchors and crownNudge, so every pose that
draws the long beard draws this one exactly where it would.  Only the part
that HANGS changes: every row down to KEEP rows under the bottom of the mouth
stays as drawn, and the rows below are squeezed into FRAC of their height,
each output row the source row at its share of the way down.  That keeps the
long beard's taper and its ragged tips, so the trim ends in hair at the chin
rather than in a cut.  FRAC 0.3 was picked from 0.2 / 0.3 / 0.4 on the body:
0.2 left a band of stubble, 0.4 still reached the chest.

-- THE SIZES --
The 256 art (hi/) is trimmed and the 128 world art is made from it the way the
long beard's was: a 2 x 2 box over premultiplied colour (measured against the
long beard's own pair: the closest of nearest, box, bilinear and lanczos).
The picker's icons are made as the long beard's are: thumb.png the front view
scaled into a 128 square, thumb-sw.png the three-quarter view's tight crop
(tools/ui/make-southwest-thumbs.mjs's own rule: alpha over 20).
No north and no northeast, as the long beard: the face is turned away.
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(REPO, 'public/sprites/traits/facialhair/beard')
OUT = os.path.join(REPO, 'public/sprites/traits/facialhair/short-beard')
DIRS = ['south', 'southwest', 'east']
KEEP = 3        # rows kept as drawn under the bottom of the mouth (256 art)
FRAC = 0.3      # the hanging part's share kept, squeezed
THUMB = 128     # thumb.png's square
THUMB_FIT = 104 # the content's longest side in it (the long beard's is 103 x 109)


def mouth_bottom(a):
    """The last row of the mouth: in the beard's top half, a row whose opaque
    span holds a gap of 3 or more pixels (the open mouth is see-through in the
    art), below the moustache's own first rows."""
    ys = np.where(a.any(1))[0]
    top, bot = int(ys.min()), int(ys.max())
    last = None
    for y in range(top + 4, top + (bot - top) // 2):
        xs = np.where(a[y])[0]
        if len(xs) < 2:
            continue
        if (~a[y, xs.min():xs.max() + 1]).sum() >= 3:
            last = y
    if last is None:
        raise SystemExit('no mouth found in the beard art: the trim needs one')
    return last


def trim(hi):
    """The 256 art trimmed: as drawn to KEEP rows under the mouth, the rest squeezed."""
    a = hi[..., 3] > 0
    ys = np.where(a.any(1))[0]
    bot = int(ys.max())
    cut = mouth_bottom(a) + KEEP
    rest = bot - cut
    k = max(2, round(rest * FRAC))
    out = np.zeros_like(hi)
    out[:cut + 1] = hi[:cut + 1]
    for i in range(k):
        out[cut + 1 + i] = hi[cut + 1 + min(rest - 1, int((i + 0.5) / k * rest))]
    return out


def down(hi):
    """256 -> 128: a 2 x 2 box over premultiplied colour."""
    f = hi.astype(float)
    a = f[..., 3:4] / 255.0
    pm = np.concatenate([f[..., :3] * a, f[..., 3:4]], axis=2)
    pm = pm.reshape(128, 2, 128, 2, 4).mean(axis=(1, 3))
    al = pm[..., 3:4]
    rgb = np.where(al > 0, pm[..., :3] / np.maximum(al / 255.0, 1e-6), 0)
    return np.clip(np.concatenate([rgb, al], axis=2) + 0.5, 0, 255).astype(np.uint8)


def content(arr, floor=0):
    ys, xs = np.where(arr[..., 3] > floor)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def thumb_front(hi):
    x0, y0, x1, y1 = content(hi)
    crop = Image.fromarray(hi[y0:y1, x0:x1], 'RGBA')
    k = THUMB_FIT / max(crop.width, crop.height)
    w, h = max(1, round(crop.width * k)), max(1, round(crop.height * k))
    canvas = Image.new('RGBA', (THUMB, THUMB), (0, 0, 0, 0))
    canvas.alpha_composite(crop.resize((w, h), Image.NEAREST), ((THUMB - w) // 2, (THUMB - h) // 2))
    return np.asarray(canvas)


def thumb_sw(hi):
    x0, y0, x1, y1 = content(hi, 20)
    return hi[y0:y1, x0:x1].copy()


def build():
    """{relative path: array} and the meta, from the long beard's files."""
    meta = json.load(open(os.path.join(SRC, 'meta.json')))
    files, boxes = {}, {}
    for d in DIRS:
        hi = trim(np.asarray(Image.open(os.path.join(SRC, 'hi', d + '.png')).convert('RGBA')))
        files['hi/%s.png' % d] = hi
        files['%s.png' % d] = down(hi)
        x0, y0, x1, y1 = content(hi)
        boxes[d] = [x0, y0, x1 - x0, y1 - y0]
        if d == 'south':
            files['thumb.png'] = thumb_front(hi)
        if d == 'southwest':
            files['thumb-sw.png'] = thumb_sw(hi)
    out_meta = {
        'category': 'facialhair',
        'fullFrame': True,
        'note': ('v2.3.3588: the long beard (facialhair/beard) trimmed at the chin by '
                 'tools/ui/make_short_beard.py -- the same frame, anchors and crownNudge, '
                 'so it sits exactly where the long one does; only the rows under the '
                 'mouth are squeezed. No north and no northeast: the face is turned away.'),
        'bboxes': boxes,
        'anchors': {d: meta['anchors'][d] for d in DIRS},
        'crownNudge': {d: meta['crownNudge'][d] for d in DIRS},
    }
    for k in ('scale', 'scaleByPose', 'poseNudge', 'poseFit'):
        if k in meta:
            out_meta[k] = meta[k]
    return files, out_meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true', help='compare a fresh run with the files, write nothing')
    args = ap.parse_args()
    files, meta = build()
    if args.check:
        bad = []
        for rel, arr in files.items():
            p = os.path.join(OUT, rel)
            if not os.path.exists(p) or not np.array_equal(np.asarray(Image.open(p).convert('RGBA')), arr):
                bad.append(rel)
        p = os.path.join(OUT, 'meta.json')
        if not os.path.exists(p) or json.load(open(p)) != meta:
            bad.append('meta.json')
        print('OK' if not bad else 'STALE: ' + ', '.join(bad))
        sys.exit(1 if bad else 0)
    os.makedirs(os.path.join(OUT, 'hi'), exist_ok=True)
    for rel, arr in files.items():
        Image.fromarray(arr, 'RGBA').save(os.path.join(OUT, rel), optimize=True)
    with open(os.path.join(OUT, 'meta.json'), 'w') as f:
        json.dump(meta, f, indent=2)
        f.write('\n')
    for d in DIRS:
        print('%-10s %s' % (d, meta['bboxes'][d]))
    print('wrote', os.path.relpath(OUT, REPO))


if __name__ == '__main__':
    main()
