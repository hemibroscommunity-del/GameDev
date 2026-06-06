"""Vertically shorten just the baked-in helmet of a steelplate chest sheet.

The northeast/northwest helmet reads a touch vertically elongated.  This
compresses only the head+helmet band (crown down to the neckline) by `factor`,
anchored at the neckline so the shoulders/torso below don't move; the crown
simply drops, making the helmet rounder/shorter.

Neckline is taken as top_opaque_row + `helmet_h` (the head bobs per frame, but
the helmet's own height is near-constant, so a fixed offset off the moving top
row tracks it more robustly than a noisy per-frame width-minimum).

Usage: python tools/squash_helmet.py --helmet-h 45 --factor 0.82 [--dry-run] <sheet.png> ...
"""
import sys
import numpy as np
from PIL import Image

FRAME = 256


def squash_frame(cell, helmet_h, factor):
    """cell: PIL RGBA 256x256 (one frame). Returns new PIL RGBA."""
    arr = np.array(cell)
    a = arr[:, :, 3] > 40
    rows = np.where(a.any(axis=1))[0]
    if not len(rows):
        return cell
    y0 = int(rows.min())
    neck = y0 + helmet_h
    strip = cell.crop((0, y0, FRAME, neck))
    new_h = max(1, int(round(strip.height * factor)))
    strip = strip.resize((FRAME, new_h), Image.LANCZOS)
    out = cell.copy()
    # clear the original helmet band, then drop the compressed helmet so its
    # bottom still sits on the neckline
    clear = Image.new('RGBA', (FRAME, neck - y0), (0, 0, 0, 0))
    out.paste(clear, (0, y0))
    out.alpha_composite(strip, (0, neck - new_h))
    return out


def process(path, helmet_h, factor, dry):
    im = Image.open(path).convert('RGBA')
    n = im.width // FRAME
    out = Image.new('RGBA', (n * FRAME, FRAME), (0, 0, 0, 0))
    for i in range(n):
        cell = im.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME))
        out.paste(squash_frame(cell, helmet_h, factor), (i * FRAME, 0))
    print(f"{'(dry) ' if dry else ''}{path}: {n} frames, helmet x{factor} (band {helmet_h}px)")
    if not dry:
        out.save(path)


if __name__ == '__main__':
    a = sys.argv[1:]
    helmet_h, factor, dry, paths = 45, 0.82, False, []
    i = 0
    while i < len(a):
        if a[i] == '--helmet-h': helmet_h = int(a[i + 1]); i += 2
        elif a[i] == '--factor': factor = float(a[i + 1]); i += 2
        elif a[i] == '--dry-run': dry = True; i += 1
        else: paths.append(a[i]); i += 1
    for p in paths:
        process(p, helmet_h, factor, dry)
