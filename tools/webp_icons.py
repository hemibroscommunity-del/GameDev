#!/usr/bin/env python3
"""v2.3.2068: convert public/icons PNGs to WebP, and MEASURE the damage first.

Backlog item G (docs/ARCHITECTURE-HANDOFF.md) said this needed a machine with
`cwebp` because "the sandbox has no lossless WebP encoder".  That is no longer
true: Pillow here is built with libwebp (`PIL.features.check('webp')`), so both
lossless VP8L and lossy VP8 encodes run locally — no Chromium canvas, no CI
round trip.  tools/webp_convert.mjs (the canvas driver) stays for machines
without Pillow.

WHY a per-file quality rather than one flag:

  * Alpha is never the problem.  libwebp compresses the alpha plane losslessly
    at its default alpha_quality=100, and this tool asserts it: every encode is
    decoded again and the alpha channel must come back bit-identical.  A file
    whose alpha moved is rejected, not shipped.
  * RGB is the problem, and only on the painted item art.  Measured on OPAQUE
    pixels (a==255), lossy q90 shifts the item icons by a mean of 2.6-6.9/255
    with 7-59% of opaque pixels off by more than 8 — visible banding on the
    gradients those icons are painted with.  They ship LOSSLESS.
  * The `-3x` UI frames are the opposite case: authored at 3x and drawn at 1/3
    (a 360px source paints a ~120px button), so the error that survives the
    downscale is what a player can see.  At draw size q90 costs them a mean of
    0.5-0.9/255 with 0.0-0.1% of opaque pixels off by more than 8, and buys a
    10-25x size cut over lossless.  That is the same standard the encoding note
    in tools/defringe_matte_sweep.py set (mean 2.2/255, 0.47% above 8, judged
    "at the 64px the UI actually draws").
  * toolbar-button-selected-3x is the one frame that fails that budget even at
    draw size (mean 1.12, 3.3% above 8 — its selected-state texture is high
    frequency), so it is on the lossless list with the item art.

NOT CONVERTED: public/icons/shards/*.png.  A `shard_<zone>.webp` of the SAME
NAME already sits in that directory and is the LIVE art (256px, drawn by
effectsRenderer + shards.js) — the .png twins are stale 128px sources from
tools/shards/build_shards.py that nothing references.  Converting them would
overwrite live art with an older picture at half the resolution.

Usage:
  python3 tools/webp_icons.py            # measure only, writes nothing
  python3 tools/webp_icons.py --convert  # write the .webp files, remove the .png
"""
import io
import os
import sys

import numpy as np
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS = os.path.join(REPO, 'public/icons')

LOSSLESS = dict(lossless=True, quality=100, method=6, exact=True)
LOSSY = dict(quality=90, method=6)

# Frames that ship lossy q90 (see the module docstring for the measurement).
LOSSY_FILES = {
    'ui/chip-frame-inactive-3x.png',
    'ui/chip-frame-pressed-3x.png',
    'ui/chip-frame-selected-3x.png',
    'ui/recessed-well-3x.png',
    'ui/toolbar-button-danger-3x.png',
    'ui/toolbar-button-danger-pressed-3x.png',
    'ui/toolbar-button-frame-only-3x.png',
    'ui/toolbar-button-inactive-3x.png',
    'ui/toolbar-button-pressed-3x.png',
    'ui/toolbar-button-primary-brass-3x.png',
}
SKIP_DIRS = {'shards'}          # live .webp of the same name — see docstring


def png_files():
    out = []
    for root, dirs, files in os.walk(ICONS):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fn in sorted(files):
            if fn.lower().endswith('.png'):
                out.append(os.path.relpath(os.path.join(root, fn), ICONS))
    return sorted(out)


def damage(src, dec, scale=1):
    """RGB error on opaque pixels, at `scale` (1 = source, 3 = drawn at 1/3)."""
    if scale != 1:
        size = (src.width // scale, src.height // scale)
        src = src.resize(size, Image.LANCZOS)
        dec = dec.resize(size, Image.LANCZOS)
    a = np.asarray(src).astype(np.int32)
    b = np.asarray(dec).astype(np.int32)
    op = a[:, :, 3] == 255
    d = np.abs(b - a)
    e = d[:, :, :3][op] if op.sum() else np.zeros((1, 3), np.int32)
    return float(e.mean()), int(e.max()), float((e.max(axis=1) > 8).mean() * 100)


def main():
    convert = '--convert' in sys.argv[1:]
    before = after = 0
    print(f'{"file":42} {"mode":8} {"png":>8} {"webp":>8}  {"alpha":>5}  mean/max  >8%   (at draw size)')
    for rel in png_files():
        p = os.path.join(ICONS, rel)
        src = Image.open(p).convert('RGBA')
        lossy = rel.replace(os.sep, '/') in LOSSY_FILES
        buf = io.BytesIO()
        src.save(buf, 'WEBP', **(LOSSY if lossy else LOSSLESS))
        data = buf.getvalue()
        dec = Image.open(io.BytesIO(data)).convert('RGBA')

        # Alpha must survive EXACTLY — the masked edges of every icon depend on
        # it, and a lossy alpha would be invisible in a size table.
        a_src = np.asarray(src)[:, :, 3]
        a_dec = np.asarray(dec)[:, :, 3]
        alpha_ok = bool((a_src == a_dec).all())
        if not alpha_ok:
            print(f'  !! ALPHA MOVED on {rel} — refusing to write')
            return 1

        scale = 3 if rel.endswith('-3x.png') else 1
        mean, mx, over8 = damage(src, dec, scale)
        pngsz = os.path.getsize(p)
        before += pngsz
        after += len(data)
        print(f'{rel:42} {"q90" if lossy else "lossless":8} {pngsz:>8} {len(data):>8}  '
              f'{"exact":>5}  {mean:5.2f}/{mx:<3} {over8:5.2f}%'
              f'{"   (1/3)" if scale == 3 else ""}')
        if convert:
            with open(p[:-4] + '.webp', 'wb') as fh:
                fh.write(data)
            os.remove(p)

    pct = 100 * (1 - after / before) if before else 0
    print(f'\ntotal {before} -> {after} bytes ({pct:.1f}% smaller)')
    if not convert:
        print('(measure only — pass --convert to write)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
