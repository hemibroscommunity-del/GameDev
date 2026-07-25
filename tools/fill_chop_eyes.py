#!/usr/bin/env python3
"""v2.3.1469: fill the woodcutter's transparent eye holes with white
(owner: "the characters eyes are transparent they need to be white").

chop-strip.webp ships each eye as a fully TRANSPARENT hole inside the
dark eye outline — on screen the ground shows through the face, and on
a chroma background they flash green.  All 24 frames carry both holes
(~18-20px each, around x98-100 / x114-117, y72-77).

Fill rule: enclosed transparent regions (not reachable from the frame
border) that are small (<= MAX_PX) and sit in the head band
(rows < HEAD_ROWS) become opaque white.  Enclosed gaps elsewhere —
e.g. the space framed by a bent arm, which IS border-reachable anyway
— are untouched, and the size + band guards keep any future large
interior gap from being painted over.
"""
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = 'public/sprites/skills/chop-strip.webp'
FW, FH = 240, 220
HEAD_ROWS = 100
MAX_PX = 60
WHITE = (255, 255, 255, 255)


def main():
    sheet = np.array(Image.open(SRC).convert('RGBA'))
    n = sheet.shape[1] // FW
    total = 0
    for i in range(n):
        f = sheet[:, i * FW:(i + 1) * FW]
        hole = f[:, :, 3] == 0
        lbl, cnt = ndimage.label(hole)
        border = set(lbl[0].tolist()) | set(lbl[-1].tolist()) \
            | set(lbl[:, 0].tolist()) | set(lbl[:, -1].tolist())
        filled = 0
        for l in range(1, cnt + 1):
            if l in border:
                continue
            ys, xs = np.where(lbl == l)
            if len(ys) > MAX_PX or ys.max() >= HEAD_ROWS:
                continue
            f[ys, xs] = WHITE
            filled += len(ys)
        total += filled
        print(f'f{i:2d}: filled {filled}px')
    Image.fromarray(sheet).save(SRC, lossless=True)
    print(f'wrote {SRC} ({total}px total)')


if __name__ == '__main__':
    main()
