#!/usr/bin/env python3
"""v2.3.1345b: scrub the jog chest sheets' pristine-art junk (owner report on
the v2.3.1345 preview).

Two defect classes, both inherited from the original ChatGPT armor separation
(517aca8) and newly prominent now that the belt strip leaves the sheets
otherwise clean:

  1. DETACHED dark fragments — small floating curls/ticks above the collar
     (northeast frames 20-23 and others), leftovers of the separation.  Any
     connected component smaller than MIN_KEEP px whose bounding box doesn't
     touch the frame's main component (the plate+arms mass) is erased.
     Gauntlet blobs are hundreds of px, far above the threshold.
  2. MAGENTA BLEED — outline pixels tinted by the mannequin sheet's magenta
     background (r high, g dead).  Desaturated to a neutral dark of the same
     luminance (erasing them would open pinholes in real outlines).

Usage: python3 tools/scrub_chest_sheets.py [dir ...]   (default: all 5)
Do NOT pipe through `head` — SIGPIPE can kill the run before the save.
"""
import sys
import numpy as np
from scipy import ndimage
from PIL import Image

ALPHA = 20
MIN_KEEP = 50
DIRS = ['south', 'north', 'east', 'northeast', 'southwest']


def scrub(d):
    p = f'public/sprites/gear/chest/steelplate/jog-{d}.png'
    im = Image.open(p).convert('RGBA')
    H = im.height
    n = im.width // H
    a = np.array(im)
    removed = tinted = 0
    for i in range(n):
        fr = a[:, i * H:(i + 1) * H]
        op = fr[:, :, 3] > ALPHA
        if not op.any():
            continue
        lab, cnt = ndimage.label(op)
        if cnt > 1:
            sizes = ndimage.sum(op, lab, range(1, cnt + 1))
            main = 1 + int(np.argmax(sizes))
            # a fragment "touches" the main mass if its 1px dilation overlaps it
            for c in range(1, cnt + 1):
                if c == main or sizes[c - 1] >= MIN_KEEP:
                    continue
                m = lab == c
                if not (ndimage.binary_dilation(m, iterations=2) & (lab == main)).any():
                    fr[m] = 0
                    removed += int(sizes[c - 1])
        # magenta bleed -> neutral dark of equal luminance
        r = fr[:, :, 0].astype(int); g = fr[:, :, 1].astype(int); b = fr[:, :, 2].astype(int)
        mag = (fr[:, :, 3] > ALPHA) & (r > 45) & (g < r * 0.5) & (b > g)
        if mag.any():
            lum = (0.3 * r + 0.4 * g + 0.3 * b).astype(np.uint8)
            fr[:, :, 0][mag] = lum[mag]
            fr[:, :, 1][mag] = lum[mag]
            fr[:, :, 2][mag] = np.minimum(255, (lum[mag] * 1.1)).astype(np.uint8)
            tinted += int(mag.sum())
    Image.fromarray(a).save(p)
    print(f'jog-{d}: {removed}px detached fragments erased, {tinted}px magenta bleed neutralized')


def main():
    for d in (sys.argv[1:] or DIRS):
        scrub(d)


if __name__ == '__main__':
    main()
