#!/usr/bin/env python3
"""Turn a Grok Imagine clip into a game-ready horizontal sprite strip.

Steps (see docs/skill-animation-pipeline.md, processing path):
  1. read the clip frames
  2. pick a frame range + resample to N frames
  3. key the white background to transparent (edge-connected flood fill, so
     white highlights *inside* the subject are preserved)
  4. shave the 1px anti-alias halo
  5. crop every frame to one shared bounding box (keeps the subject anchored)
  6. pad to square and downscale to the frame size
  7. stitch into a single {pose}-{dir}.png strip (+ a preview.gif)

Generic on purpose — this is the `build_skill_sheet.py` the pipeline doc
flagged as "tool to add". Example:

  python tools/build_skill_sheet.py clip.mp4 out/mine-south.png \
      --start 53 --end 68 --frames 14 --size 256
"""

import argparse, glob
import numpy as np
import imageio.v3 as iio
from PIL import Image, ImageDraw


def read_frames(path):
    return np.stack(list(iio.imiter(glob.glob(path)[0])))


def key_white(rgb, thresh=40, erode=1):
    """Flood-fill near-white background from the borders -> RGBA with alpha."""
    im = Image.fromarray(rgb, "RGB").copy()
    sentinel = (1, 2, 3)
    w, h = im.size
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
             (w // 2, 0), (0, h // 2), (w - 1, h // 2), (w // 2, h - 1)]
    for s in seeds:
        px = im.getpixel(s)
        if min(px) > 200:                       # only seed on near-white
            ImageDraw.floodfill(im, s, sentinel, thresh=thresh)
    arr = np.asarray(im)
    bg = np.all(arr == sentinel, axis=-1)
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    out = np.dstack([rgb, alpha])
    out[bg] = 0                                  # zero RGB on transparent pixels
    if erode:                                    # shave AA fringe
        a = out[..., 3]
        for _ in range(erode):
            shrink = (
                a & np.roll(a, 1, 0) & np.roll(a, -1, 0)
                & np.roll(a, 1, 1) & np.roll(a, -1, 1)
            )
            a = np.where(shrink > 0, a, 0)
        out[..., 3] = a
        out[a == 0] = 0
    return out


def union_bbox(frames):
    mask = np.zeros(frames[0].shape[:2], bool)
    for f in frames:
        mask |= f[..., 3] > 0
    ys, xs = np.where(mask)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def square_pad(img):
    h, w = img.shape[:2]
    s = max(h, w)
    out = np.zeros((s, s, 4), np.uint8)
    out[(s - h) // 2:(s - h) // 2 + h, (s - w) // 2:(s - w) // 2 + w] = img
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("clip"); ap.add_argument("out")
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--end", type=int, default=-1)
    ap.add_argument("--frames", type=int, default=14)
    ap.add_argument("--size", type=int, default=256)
    ap.add_argument("--thresh", type=int, default=40)
    a = ap.parse_args()

    clip = read_frames(a.clip)
    end = a.end if a.end >= 0 else clip.shape[0] - 1
    idxs = np.linspace(a.start, end, a.frames).round().astype(int)
    keyed = [key_white(clip[i], a.thresh) for i in idxs]

    x0, y0, x1, y1 = union_bbox(keyed)
    cells = []
    for f in keyed:
        crop = f[y0:y1, x0:x1]
        sq = square_pad(crop)
        cells.append(Image.fromarray(sq, "RGBA").resize((a.size, a.size), Image.LANCZOS))

    strip = Image.new("RGBA", (a.size * len(cells), a.size), (0, 0, 0, 0))
    for j, c in enumerate(cells):
        strip.paste(c, (j * a.size, 0))
    strip.save(a.out)

    gif = a.out.rsplit(".", 1)[0] + "_preview.gif"
    flat = [Image.alpha_composite(Image.new("RGBA", c.size, (245, 245, 245, 255)), c).convert("P")
            for c in cells]
    flat[0].save(gif, save_all=True, append_images=flat[1:], duration=90, loop=0)
    print(f"wrote {a.out}  ({len(cells)} frames @ {a.size}px)  + {gif}")


if __name__ == "__main__":
    main()
