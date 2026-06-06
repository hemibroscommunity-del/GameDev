"""Rewrite a jog sheet keeping only a given list of frame indices, in order.

Used to even out a jog cycle's cadence by dropping near-duplicate "stutter"
frames (see the northeast run).  The SAME keep-list must be applied to every
layer of a direction (body + each gear sheet) so the layers stay frame-aligned
-- the renderer drives all layers from one frameIdx and slices each sheet by
width/256.

Usage:
  python tools/resample_jog_frames.py --keep 0,1,2,4,... <sheet.png> [more.png ...]
"""
import sys
from PIL import Image

FRAME = 256


def resample(path, keep):
    im = Image.open(path).convert('RGBA')
    n = im.width // FRAME
    out = Image.new('RGBA', (len(keep) * FRAME, FRAME), (0, 0, 0, 0))
    for k, i in enumerate(keep):
        if i >= n:
            raise SystemExit(f"{path}: keep index {i} >= frame count {n}")
        out.paste(im.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME)), (k * FRAME, 0))
    out.save(path)
    print(f"{path}: {n} -> {len(keep)} frames")


if __name__ == '__main__':
    a = sys.argv[1:]
    keep = None
    paths = []
    i = 0
    while i < len(a):
        if a[i] == '--keep':
            keep = [int(x) for x in a[i + 1].split(',')]; i += 2
        else:
            paths.append(a[i]); i += 1
    if not keep:
        raise SystemExit("need --keep")
    for p in paths:
        resample(p, keep)
