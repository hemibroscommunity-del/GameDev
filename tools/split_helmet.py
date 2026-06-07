"""Split the baked helmet out of the steelplate CHEST sheets into their own
head/steelhelm sheets, so helmet + chest become independent equip slots.

The chest sheet currently bakes the whole upper body (helmet + torso + arms +
hands + belt).  We cut at the NECKLINE (top opaque row + a per-sheet-stable
offset, same model squash_helmet.py uses) and move the HELMET -- the top
connected blob above the neckline -- into gear/head/steelhelm/<pose>-<dir>.png,
leaving the chest sheet as torso+arms+hands+belt.

Per-frame head bob is handled by anchoring the cut to each frame's own top row;
the neck OFFSET (helmet height) is a per-sheet median so it's stable and tracks
the NE squashed helmet too.  We keep only the top blob so a leading hand swung
up near the neck is never pulled into the helmet sheet.

Usage: python tools/split_helmet.py            # all chest steelplate sheets
       python tools/split_helmet.py --dry-run
"""
import sys, os, glob
import numpy as np
from PIL import Image
from scipy import ndimage

FRAME = 256
SRC_ITEM = 'public/sprites/gear/chest/steelplate'
DST_ITEM = 'public/sprites/gear/head/steelhelm'


def neck_offset(im, n):
    """Per-sheet stable neck offset = median (over frames) of the min-width row
    within the head band [top+25, top+72], measured from each frame's top row."""
    offs = []
    for i in range(n):
        a = np.array(im.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME)))[:, :, 3] > 40
        rows = np.where(a.any(1))[0]
        if not len(rows):
            continue
        y0 = int(rows.min())
        lo, hi = y0 + 25, min(y0 + 72, FRAME)
        widths = a[lo:hi, :].sum(1)
        if not len(widths) or widths.max() == 0:
            continue
        # narrowest row in the band = the neck pinch
        offs.append(int(np.argmin(widths)) + (lo - y0))
    return int(np.median(offs)) if offs else 48


def split_frame(cell, neck_off):
    arr = np.array(cell)
    op = arr[:, :, 3] > 40
    rows = np.where(op.any(1))[0]
    head = np.zeros_like(arr)
    chest = arr.copy()
    if not len(rows):
        return Image.fromarray(head), Image.fromarray(chest)
    y0 = int(rows.min())
    neck = y0 + neck_off
    above = np.zeros(op.shape, bool)
    above[:neck, :] = True
    cand = op & above
    if cand.any():
        # keep only the helmet = the top blob (largest component touching y0 band)
        lbl, nl = ndimage.label(cand, structure=np.ones((3, 3)))
        toprows = lbl[y0:y0 + 6, :]
        topset = set(int(v) for v in np.unique(toprows) if v)
        if topset:
            keep = np.isin(lbl, list(topset))
        else:
            sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, nl + 1))
            keep = lbl == (int(np.argmax(sizes)) + 1)
        head[keep] = arr[keep]
        chest[keep] = 0
    return Image.fromarray(head), Image.fromarray(chest)


def main():
    dry = '--dry-run' in sys.argv
    os.makedirs(DST_ITEM, exist_ok=True)
    for src in sorted(glob.glob(f'{SRC_ITEM}/*.png')):
        name = os.path.basename(src)
        im = Image.open(src).convert('RGBA')
        n = im.width // FRAME
        noff = neck_offset(im, n)
        head_sheet = Image.new('RGBA', (n * FRAME, FRAME), (0, 0, 0, 0))
        chest_sheet = Image.new('RGBA', (n * FRAME, FRAME), (0, 0, 0, 0))
        hpx = 0
        for i in range(n):
            cell = im.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME))
            h, c = split_frame(cell, noff)
            head_sheet.paste(h, (i * FRAME, 0))
            chest_sheet.paste(c, (i * FRAME, 0))
            hpx += int((np.array(h)[:, :, 3] > 40).sum())
        print(f"{name}: neck_off={noff}, helmet {hpx}px -> head/steelhelm; chest stripped")
        if not dry:
            head_sheet.save(f'{DST_ITEM}/{name}')
            chest_sheet.save(f'{SRC_ITEM}/{name}')


if __name__ == '__main__':
    main()
