#!/usr/bin/env python3
"""v2.3.1483: turn a generated headwear sheet into a shippable hat.

Takes the sheet that came back from drawing a hat onto
tools/make_headwear_mannequin.py's reference grid, and writes everything the
game needs:

    public/sprites/traits/headwear/<id>/{south,southwest,east,northeast,north}.png
    public/sprites/traits/headwear/<id>/thumb.png
    public/sprites/traits/headwear/<id>/meta.json
    [--clips-hair] .../hairmask/{...}.png

plus the one line to paste into HEADWEAR_CATALOG.

Why this can be EXACT
---------------------
Every hat in the repo before this was placed by eye; all ten notes end with
some variant of "crownNudge/scale start at defaults, tune per direction after
on-device review".  This tool needs no tuning round, because the mannequin
pinned down every unknown before the art was ever drawn:

  * the sheet's grid is deterministic, so `layout()` says exactly which
    256-space rect each cell shows -- a cell pixel maps home with
    p256 = box[:2] + p_cell / UPSCALE, no registration step, no guessing;
  * the heads come back UNCHANGED (measured on the first real sheet: identical
    canvas size, 8.2% of pixels differing, all of it in the hat region), so the
    hat is isolated by DIFFING against the mannequin -- not by colour-keying,
    which would fail the moment a hat is drawn in a skin-like gold or brown;
  * the hat is drawn on the grid the mannequin established (measured: 99.7% of
    touched 5x5 blocks are uniform), so the downscale back to 256-space is
    effectively lossless.

And because the hat lands in the 256 frame at its true position relative to the
body, the metadata is arithmetic rather than judgement:

    anchors[dir]    = the hat's own bbox top-centre
    crownNudge[dir] = anchors[dir] - body-tops["stand-<dir>-0"]
    scale[dir]      = 1

That falls straight out of _placeTrait: it puts the anchor pixel at
bodyCrown + crownNudge, so a nudge of (anchor - bodyCrown) puts the art back
exactly where it was drawn.

Run from the repo root:
    python3 tools/import_headwear.py --art sheet.png --id crown --name "Crown"
    [--row N]  which hat row to read on a multi-hat sheet (default 0)
    [--rows N] how many rows the sheet was generated with (default 1)
    [--clips-hair]
"""
import argparse
import importlib.util
import json
import os
import numpy as np
from PIL import Image

TOOLS = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location(
    'make_headwear_mannequin', os.path.join(TOOLS, 'make_headwear_mannequin.py'))
_man = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_man)

BODY_TOPS = 'public/sprites/player/body-tops.json'
OUTDIR = 'public/sprites/traits/headwear/{id}'
FRAME = 256
DIFF_T = 12          # per-channel difference that counts as "the artist drew here"
ALPHA_T = 16         # the alpha the meta bboxes are measured at (matches the shipped hats)
OVERSHOOT = 44       # 256-space rows sampled ABOVE the cell (see below)
TOP_MARGIN = 6       # where the hat's top sits in its own frame


def cell_hat(art, man, cell, crown256):
    """The hat from one cell as a 256x256 RGBA frame, plus where the body's
    crown falls inside that frame.

    Sampling reaches OVERSHOOT rows ABOVE the cell because a tall hat does not
    fit over the head inside the 256 frame and the artist simply draws it in the
    margin: measured on the first real sheet, the crown's spikes ran 15px above
    the south cell and 32px above the southwest one, and clipping them at the
    cell edge lopped the points off.

    The hat is then placed in its OWN frame wherever it fits (top at
    TOP_MARGIN, centred on 128) rather than at its absolute body position --
    which is exactly how the shipped hats are stored, since `anchors` makes the
    storage position irrelevant.  crownNudge is unaffected: it is
    anchor - crown measured in the SAME frame, so a shift applied to both
    cancels out."""
    px, py = cell['paste']
    w, h = cell['size']
    up = cell['upscale']
    x0, y0, _x1, _y1 = cell['box']

    top = max(0, py - OVERSHOOT * up)
    extra = (py - top) // up                      # whole 256-rows actually available
    top = py - extra * up
    A = np.array(art.crop((px, top, px + w, py + h)).convert('RGB')).astype(int)
    M = np.array(man.crop((px, top, px + w, py + h)).convert('RGB')).astype(int)
    drawn = np.abs(A - M).max(axis=2) > DIFF_T
    if not drawn.any():
        raise SystemExit(f"{cell['dir']}: nothing was drawn in this cell")

    rows, cols = drawn.shape[0] // up, drawn.shape[1] // up
    # collapse each up x up block to one 256-space pixel
    hat = np.zeros((rows, cols, 4), np.uint8)
    for v in range(rows):
        for u in range(cols):
            blk = drawn[v * up:(v + 1) * up, u * up:(u + 1) * up]
            if int(blk.sum()) * 2 <= up * up:     # majority vote: a mostly
                continue                          # untouched edge block is not hat
            rgb = A[v * up:(v + 1) * up, u * up:(u + 1) * up][blk].mean(axis=0)
            hat[v, u] = (*np.round(rgb).astype(int), 255)

    m = hat[:, :, 3] > ALPHA_T
    ys, xs = np.nonzero(m)
    hy0, hy1, hx0, hx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    ch, cw = hy1 - hy0, hx1 - hx0
    if ch > FRAME or cw > FRAME:
        raise SystemExit(f"{cell['dir']}: hat is {cw}x{ch} in 256-space — "
                         'too big for the frame, it was drawn oversized')
    # place it: top at TOP_MARGIN, horizontally centred
    oy = TOP_MARGIN - hy0
    ox = FRAME // 2 - (hx0 + hx1) // 2
    out = np.zeros((FRAME, FRAME, 4), np.uint8)
    for v in range(rows):
        ty = v + oy
        if not (0 <= ty < FRAME):
            continue
        for u in range(cols):
            tx = u + ox
            if 0 <= tx < FRAME and hat[v, u, 3] > ALPHA_T:
                out[ty, tx] = hat[v, u]

    # the crown, in this frame's coordinates: 256-space -> cell -> frame
    crown_in_frame = [int(crown256[0] - x0 + ox), int(crown256[1] - (y0 - extra) + oy)]
    return out, crown_in_frame


def bbox_of(frame):
    m = frame[:, :, 3] > ALPHA_T
    ys, xs = np.nonzero(m)
    return [int(xs.min()), int(ys.min()),
            int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--art', required=True, help='the generated sheet')
    ap.add_argument('--id', required=True, help='kebab-case folder + catalog id')
    ap.add_argument('--name', required=True, help='label shown in the Hats picker')
    ap.add_argument('--row', type=int, default=0)
    ap.add_argument('--rows', type=int, default=1)
    ap.add_argument('--clips-hair', action='store_true',
                    help='also emit hairmask/*.png so hair cannot poke through')
    ap.add_argument('--mannequin', default=None,
                    help='rebuilt from the repo if not given')
    args = ap.parse_args()

    art = Image.open(args.art).convert('RGB')
    cells = [c for c in _man.layout(args.rows) if c['row'] == args.row]
    if not cells:
        raise SystemExit(f'--row {args.row} is not in a {args.rows}-row sheet')

    # rebuild the exact mannequin this sheet was drawn over
    if args.mannequin:
        man = Image.open(args.mannequin).convert('RGB')
    else:
        tmp = os.path.join(TOOLS, '.mannequin-rebuild.png')
        os.system(f'python3 {TOOLS}/make_headwear_mannequin.py '
                  f'--rows {args.rows} --out {tmp} >/dev/null')
        man = Image.open(tmp).convert('RGB')
        os.remove(tmp)
    if man.size != art.size:
        raise SystemExit(f'sheet is {art.size} but the mannequin is {man.size} — '
                         'the art was resized, so the cells cannot be trusted')

    tops = json.load(open(BODY_TOPS))
    outdir = OUTDIR.format(id=args.id)
    os.makedirs(outdir, exist_ok=True)
    if args.clips_hair:
        os.makedirs(os.path.join(outdir, 'hairmask'), exist_ok=True)

    bboxes, anchors, nudges, scales = {}, {}, {}, {}
    for c in cells:
        d = c['dir']
        frame, crown = cell_hat(art, man, c, tops[f'stand-{d}-0'])
        Image.fromarray(frame).save(f'{outdir}/{d}.png')

        bb = bbox_of(frame)
        anchor = [int(bb[0] + round(bb[2] / 2)), int(bb[1])]
        bboxes[d] = bb
        anchors[d] = anchor
        # anchor and crown are both in the hat's own frame, so this is the
        # exact offset _placeTrait needs to put the art back where it was drawn
        nudges[d] = [int(anchor[0] - crown[0]), int(anchor[1] - crown[1])]
        scales[d] = 1
        print(f'{d:<10} bbox {bb}  anchor {anchor}  crown-in-frame {crown}  '
              f'crownNudge {nudges[d]}')

        if args.clips_hair:
            m = frame[:, :, 3] > ALPHA_T
            mask = np.zeros((FRAME, FRAME, 4), np.uint8)
            for x in range(FRAME):
                ys = np.nonzero(m[:, x])[0]
                if len(ys):
                    mask[ys.min():, x] = (255, 255, 255, 255)
            Image.fromarray(mask).save(f'{outdir}/hairmask/{d}.png')

    # picker thumbnail: the south hat, tight-cropped, 128 wide
    south = np.array(Image.open(f'{outdir}/south.png').convert('RGBA'))
    bb = bboxes['south']
    th = Image.fromarray(south[bb[1]:bb[1] + bb[3], bb[0]:bb[0] + bb[2]])
    th = th.resize((128, max(1, round(128 * bb[3] / bb[2]))), Image.LANCZOS)
    th.save(f'{outdir}/thumb.png')

    meta = {
        'category': 'headwear',
        'fullFrame': True,
        'note': (f'Generated on the headwear mannequin (tools/'
                 f'make_headwear_mannequin.py) and imported by tools/'
                 f'import_headwear.py. The hat was drawn ON the head, so it '
                 f'lands in the 256 frame at its true position relative to the '
                 f'body: anchors are its own bbox top-centre, crownNudge is '
                 f'anchor minus body-tops stand-<dir>-0, scale is 1. No '
                 f'by-eye tuning — adjust only if on-device review disagrees.'),
        'bboxes': bboxes,
        'anchors': anchors,
        'crownNudge': nudges,
        'scale': scales,
    }
    if args.clips_hair:
        meta['clipsHair'] = True
    with open(f'{outdir}/meta.json', 'w') as fh:
        json.dump(meta, fh, indent=2)
        fh.write('\n')

    print(f'\nwrote {outdir}/  (5 dirs + thumb + meta'
          f'{" + hairmask" if args.clips_hair else ""})')
    print('\nAdd to HEADWEAR_CATALOG in src/rendering/traits/headwearCatalog.js:')
    print(f"  {{ id: '{args.id}', name: '{args.name}' }},")


if __name__ == '__main__':
    main()
