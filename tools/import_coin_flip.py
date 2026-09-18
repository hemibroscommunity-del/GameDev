#!/usr/bin/env python3
"""v2.3.2618: slice the card sharp's coin-flip sheets into two strips.

    python3 tools/import_coin_flip.py <win.png> <lose.png>

The owner supplied the flip as two contact sheets -- one landing BLUE HEADS
(the player wins) and one landing RED SKULL (the player loses) -- drawn as a
row of black-bordered boxes on white.  Both become one horizontal strip apiece
under public/sprites/fx/, the same shape npcSprites.js _sliceStrip already
cuts for walking NPCs and animated props.

THE GRID IS READ OFF THE BORDERS, not divided.  The two sheets are not the
same size (2804x561 and 1916x821) and neither divides evenly by its frame
count, so the boxes are found by their own ink: the long horizontal rules give
the band, and inside that band the long vertical rules give the cells.
Measured that way both sheets carry ELEVEN frames on a regular ~253px /
~172px pitch -- eyeballing the contact sheet suggests twelve, which is the
sort of off-by-one that silently drops the landing frame.

THE KEY IS A FLOOD FILL FROM THE CELL EDGE, for the same reason the NPC
importer's is (import_npc_walk_video.py): a global "is it white" test would
eat the coin's own specular highlight, which is near-white and interior.  The
black rule itself is cropped away before keying, so its ink never anchors a
region.

ONE SCALE PER SHEET, TAKEN FROM THE FACE-ON DIAMETER.  Each sheet is fitted by
the WIDTH of the union of all its frames -- the widest the coin ever gets is
the face-on disc -- so the two animations agree on how big the coin is even
though their source cells differ by 80px.  Fitting by cell size instead would
have shipped a win coin half again the size of the loss coin, and the flip
would change size at the moment it matters.  Within a sheet every frame is
placed against that same union box, so the flip keeps its natural bob instead
of being re-centred frame by frame into a jitter.
"""
import os
import sys

import numpy as np
import scipy.ndimage as ndi
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRAME_W = 128        # output cell width; the panel draws it at ~112 CSS px
# TALLER THAN IT IS WIDE, and that is the point: the coin BOBS almost the full
# height of its source cell, so the win sheet's union is 243px against a 153px
# width.  Fitted to a square frame at the diameter below it stood 172px tall in
# a 128px cell and lost its top and bottom to the crop -- including the landing
# frame's rim.  Fitting by height instead would have shrunk the win coin below
# the loss coin, which is the one thing the shared diameter exists to prevent.
FRAME_H = 192
DIAMETER = 108       # face-on coin width; SHARED by both sheets (see note)
INSET = 3            # px trimmed off each cell interior, to clear the rule's AA


def _group(idx, gap=3):
    out, s, p = [], None, None
    for i in idx:
        if s is None:
            s = i
        elif i - p > gap:
            out.append((s, p)); s = i
        p = i
    if s is not None:
        out.append((s, p))
    return out


def cells(img):
    """The boxes, found by their own ink. See the module note."""
    a = np.asarray(img.convert('RGB')).astype(int)
    dark = a.max(axis=2) < 110
    rows = np.nonzero(dark.sum(axis=1) > a.shape[1] * 0.25)[0]
    hb = _group(rows)
    y0, y1 = hb[0][1] + 1, hb[-1][0] - 1
    band = dark[y0:y1 + 1]
    cols = np.nonzero(band.sum(axis=0) > band.shape[0] * 0.7)[0]
    vb = _group(cols)
    out = []
    for i in range(len(vb) - 1):
        x0, x1 = vb[i][1] + 1, vb[i + 1][0] - 1
        if x1 - x0 > 40:
            out.append((x0 + INSET, y0 + INSET, x1 - INSET, y1 - INSET))
    return out


def key(img):
    """White background out by flood fill from the crop's edge; the coin's own
    near-white highlight is interior and survives."""
    a = np.asarray(img.convert('RGB')).astype(np.float64)
    mx, mn = a.max(axis=2), a.min(axis=2)
    near_white = (mn > 195) & ((mx - mn) < 34)
    lab, _ = ndi.label(near_white)
    border = set(lab[0, :]) | set(lab[-1, :]) | set(lab[:, 0]) | set(lab[:, -1])
    border.discard(0)
    bg = np.isin(lab, sorted(border))
    ring = ndi.binary_dilation(bg, iterations=2) & (~bg)
    core = (~bg) & (~ring)
    if not core.any():
        return None
    idx = ndi.distance_transform_edt(~core, return_indices=True)[1]
    F = a[idx[0], idx[1]]
    den, num = 255.0 - F, 255.0 - a
    with np.errstate(invalid='ignore', divide='ignore'):
        est = np.where(den > 25, num / np.where(den > 25, den, 1), np.nan)
    with np.errstate(invalid='ignore'):
        al = np.nanmean(est, axis=2)
    al = np.where(np.isnan(al), np.clip((255 - a.mean(axis=2)) / 60, 0, 1), al)
    alpha = np.where(core, 255.0, 0.0)
    alpha = np.where(ring, np.clip(al, 0, 1) * 255, alpha)
    rgb = a.copy(); rgb[ring] = F[ring]
    return np.dstack([rgb, alpha]).clip(0, 255).astype(np.uint8)


def build(src, name):
    im = Image.open(src)
    boxes = cells(im)
    frames = []
    for b in boxes:
        k = key(im.crop(b))
        if k is None:
            continue
        frames.append(Image.fromarray(k, 'RGBA'))
    if not frames:
        raise SystemExit(f'{name}: nothing survived the key')
    box = None
    for f in frames:
        bb = f.getbbox()
        box = bb if box is None else (min(box[0], bb[0]), min(box[1], bb[1]),
                                      max(box[2], bb[2]), max(box[3], bb[3]))
    bw, bh = box[2] - box[0], box[3] - box[1]
    scale = DIAMETER / bw
    tw, th = max(1, round(bw * scale)), max(1, round(bh * scale))
    if th > FRAME_H:
        raise SystemExit(f'{name}: {th}px tall in a {FRAME_H}px frame -- raise FRAME_H')
    ox, oy = (FRAME_W - tw) // 2, (FRAME_H - th) // 2
    strip = Image.new('RGBA', (FRAME_W * len(frames), FRAME_H), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        cell = f.crop(box).resize((tw, th), Image.LANCZOS)
        strip.alpha_composite(cell, (i * FRAME_W + ox, oy))
    out_dir = os.path.join(ROOT, 'public', 'sprites', 'fx')
    os.makedirs(out_dir, exist_ok=True)
    strip.save(os.path.join(out_dir, f'{name}.webp'), 'WEBP', quality=94, method=6)
    print(f'{name}: {len(frames)} frames, union {bw}x{bh} -> {tw}x{th} in '
          f'({FRAME_W}x{FRAME_H}) -> public/sprites/fx/{name}.webp')
    return len(frames)


def main(argv):
    if len(argv) < 3:
        print(__doc__, file=sys.stderr)
        return 2
    a = build(argv[1], 'coinflip-win')
    b = build(argv[2], 'coinflip-lose')
    if a != b:
        print(f'NOTE: frame counts differ ({a} vs {b}) -- the panel reads each '
              f'strip\'s own count, so this is allowed, not a failure.')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
