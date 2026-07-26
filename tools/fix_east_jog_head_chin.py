#!/usr/bin/env python3
"""v2.3.1481b: give frames 3 and 15 of the east-jog head overlay their chin back.

Companion to tools/fix_east_jog_collar.py.  That one dropped the gorget off the
bro's cheek on these two frames; this one fixes the other half of the same
defect, which the owner spotted straight after: "the middle frame in preview is
still cut off".

The head overlay was cut out of the fullset art along the collar line, so on the
two frames whose collar rode 2-3px high the cut took the jaw with it.  It shows
up unmistakably in the per-row widths of each head, top to bottom:

    f1   ... 17, 17, 24, 23      <- widens at the bottom: jaw flaring into neck
    f2   ... 17, 17, 25
    f4   ... 17, 16, 25, 25
    f3   ... 19, 18, 17          <- just stops; no flare at all
    f15  ... 19, 18, 17

Frames 3 and 15 are the same drawing (the east cycle repeats), and frames 2 and
14 are their neighbours -- whose heads match theirs row for row within a pixel
or two over the whole shared span.  So the missing rows are copied from the
neighbour, aligned on the crown vertically and on the last shared row
horizontally.  Only the absent rows are written; every pixel the frame already
had is left exactly as it was.

Run from the repo root:  python3 tools/fix_east_jog_head_chin.py
"""
import numpy as np
from PIL import Image

HEAD = 'public/sprites/player/jog-east-head.png'
FW = 128
# (frame to repair, frame to borrow the jaw from)
PAIRS = [(3, 2), (15, 14)]
MAX_ADD = 4        # refuse to graft more than this; a bigger gap is a different bug


def rows_of(mask):
    r = np.nonzero(mask.any(axis=1))[0]
    return int(r[0]), int(r[-1])


def main():
    sheet = np.array(Image.open(HEAD).convert('RGBA'))
    n = sheet.shape[1] // FW
    for dst, src in PAIRS:
        if dst >= n or src >= n:
            raise SystemExit(f'{HEAD}: no frame {max(dst, src)}')
        D = sheet[:, dst * FW:(dst + 1) * FW]
        S = sheet[:, src * FW:(src + 1) * FW]
        dm, sm = D[:, :, 3] > 40, S[:, :, 3] > 40
        dt, db = rows_of(dm)
        st, sb = rows_of(sm)
        add = (sb - st) - (db - dt)          # rows the neighbour has that we lack
        if add <= 0:
            print(f'frame {dst}: nothing missing, left alone')
            continue
        if add > MAX_ADD:
            raise SystemExit(f'frame {dst}: neighbour is {add} rows longer — '
                             'too far apart to graft, look at this by hand')
        # align horizontally on the LAST row both frames share
        shared = db - dt
        dxs = np.nonzero(dm[dt + shared])[0]
        sxs = np.nonzero(sm[st + shared])[0]
        if not len(dxs) or not len(sxs):
            raise SystemExit(f'frame {dst}: no shared row to align on')
        dx = int(round((dxs.min() + dxs.max()) / 2 - (sxs.min() + sxs.max()) / 2))
        wrote = 0
        for k in range(1, add + 1):
            sy, dy = st + shared + k, dt + shared + k
            if dy >= D.shape[0]:
                break
            for x in np.nonzero(sm[sy])[0]:
                tx = int(x) + dx
                if 0 <= tx < FW and D[dy, tx, 3] <= 40:   # never overwrite existing art
                    D[dy, tx] = S[sy, x]
                    wrote += 1
        print(f'frame {dst}: grafted {add} row(s) from frame {src} '
              f'(dx {dx:+d}), {wrote} px')
    Image.fromarray(sheet).save(HEAD)
    print('wrote', HEAD)


if __name__ == '__main__':
    main()
