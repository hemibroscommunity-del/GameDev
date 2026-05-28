#!/usr/bin/env python3
"""
Subtractive-diff trait extractor for the Hemi-Bro NFT pipeline.

Takes two AI-rendered PNGs of the player at the same pose / angle:
  - naked Bro (baseline)
  - naked Bro wearing the trait being extracted (applied)

Subtracts the baseline from the applied image pixel-wise; pixels that
match within --tolerance become transparent.  Output is the trait
alone, positioned at the same offset it occupied in the applied image
so the renderer can composite it on top of the body sprite without
needing a per-trait anchor.

Pairs with the Phase 1 anchor tool (public/tools/anchor-v2.html) and
the Phase 4 trait-layer renderer.  See
docs/specs/ (TBD) and the plan file for context.

Usage:
  python tools/extract_trait.py \\
      --base public/sprites/player-naked/stand-south.png \\
      --applied generated/bro-with-sombrero-south.png \\
      --out public/sprites/traits/headwear/sombrero/south.png

Optional flags:
  --tolerance N      Max per-channel delta to treat as "unchanged"
                     (default 18).  Higher tolerance = more pixels
                     swallowed as background; lower = more anti-alias
                     fringe survives around the trait edge.
  --feather N        Erode N pixels into the kept region to clean up
                     anti-alias halos that hug the body sprite.
                     Default 0.
  --min-blob N       Drop connected pixel groups smaller than N px2.
                     Default 8 -- kills isolated noise pixels.
  --pad N            Add N transparent border pixels.  Default 0.
"""

import argparse
import os
import sys
from collections import deque

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required.  Run: pip install Pillow")

try:
    import numpy as np
except ImportError:
    sys.exit("NumPy is required.  Run: pip install numpy")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Subtractive diff for trait extraction."
    )
    p.add_argument("--base", required=True, help="Naked-Bro baseline PNG.")
    p.add_argument("--applied", required=True, help="Bro-with-trait PNG.")
    p.add_argument("--out", required=True, help="Output trait PNG.")
    p.add_argument("--tolerance", type=int, default=18,
                   help="Per-channel delta below which a pixel is "
                        "treated as unchanged (default 18).")
    p.add_argument("--feather", type=int, default=0,
                   help="Erode the kept region by N pixels.")
    p.add_argument("--min-blob", type=int, default=8,
                   help="Drop connected pixel groups smaller than this.")
    p.add_argument("--pad", type=int, default=0,
                   help="Transparent border around the output.")
    p.add_argument("--max-y", type=int, default=None,
                   help="Drop pixels with y >= max_y.  Use to keep only "
                        "the head region for face / headwear traits.  "
                        "Skips below-neck body noise that would otherwise "
                        "leak into the extracted trait.")
    return p.parse_args()


def load_rgba(path: str, target_size: tuple | None = None) -> np.ndarray:
    img = Image.open(path).convert("RGBA")
    if target_size is not None and img.size != target_size:
        # Lanczos to match the base; trait pixels stay aligned to the
        # body without forcing the user to pre-downscale ChatGPT outputs.
        img = img.resize(target_size, Image.LANCZOS)
    return np.array(img, dtype=np.int16)  # int16 to allow signed delta


def save_rgba(arr: np.ndarray, path: str) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(path)) or ".", exist_ok=True)
    Image.fromarray(arr.astype(np.uint8), mode="RGBA").save(path)


def compute_diff_mask(base: np.ndarray, applied: np.ndarray, tol: int) -> np.ndarray:
    """True where applied differs from base by more than `tol` on any RGB
    channel.  Alpha differences are also enough to count as a change."""
    rgb_delta = np.abs(applied[..., :3] - base[..., :3]).max(axis=-1)
    alpha_delta = np.abs(applied[..., 3] - base[..., 3])
    return (rgb_delta > tol) | (alpha_delta > tol)


def erode(mask: np.ndarray, n: int) -> np.ndarray:
    """Cheap 4-connected erosion by N steps.  Pixels stay True only if
    they and all four neighbours are also True N times over."""
    if n <= 0:
        return mask
    for _ in range(n):
        shifted = np.ones_like(mask, dtype=bool)
        shifted[1:, :]  &= mask[:-1, :]
        shifted[:-1, :] &= mask[1:, :]
        shifted[:, 1:]  &= mask[:, :-1]
        shifted[:, :-1] &= mask[:, 1:]
        mask = mask & shifted
    return mask


def drop_small_blobs(mask: np.ndarray, min_size: int) -> np.ndarray:
    """Flood-fill connected components, drop ones below min_size.
    4-connectivity, BFS, in-place visited set.  O(W*H)."""
    if min_size <= 1:
        return mask
    h, w = mask.shape
    visited = np.zeros_like(mask, dtype=bool)
    out = np.zeros_like(mask, dtype=bool)
    for y in range(h):
        for x in range(w):
            if not mask[y, x] or visited[y, x]:
                continue
            queue = deque([(y, x)])
            visited[y, x] = True
            blob = [(y, x)]
            while queue:
                cy, cx = queue.popleft()
                for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        queue.append((ny, nx))
                        blob.append((ny, nx))
            if len(blob) >= min_size:
                for by, bx in blob:
                    out[by, bx] = True
    return out


def main() -> None:
    args = parse_args()

    base = load_rgba(args.base)
    # Resize applied to match base if needed -- ChatGPT outputs are 1254x1254,
    # baseline is 256x256.
    target = (base.shape[1], base.shape[0])  # PIL is (w, h)
    applied = load_rgba(args.applied, target)

    if base.shape != applied.shape:
        sys.exit(
            f"Image dimensions still differ after resize.  base={base.shape}, "
            f"applied={applied.shape}."
        )

    mask = compute_diff_mask(base, applied, args.tolerance)
    mask = drop_small_blobs(mask, args.min_blob)
    mask = erode(mask, args.feather)

    if args.max_y is not None:
        mask[args.max_y:, :] = False

    out = np.zeros_like(applied)
    # Where mask is True, copy the applied pixel verbatim.  Where False,
    # the pixel stays 0,0,0,0 (transparent black).
    out[mask] = applied[mask]

    if args.pad > 0:
        ph, pw = out.shape[0] + 2 * args.pad, out.shape[1] + 2 * args.pad
        padded = np.zeros((ph, pw, 4), dtype=np.int16)
        padded[args.pad:args.pad + out.shape[0],
               args.pad:args.pad + out.shape[1]] = out
        out = padded

    save_rgba(out, args.out)

    kept = int(mask.sum())
    total = mask.size
    print(
        f"wrote {args.out}  ({kept}/{total} px kept, "
        f"{100.0 * kept / total:.1f}%, tolerance={args.tolerance})"
    )


if __name__ == "__main__":
    main()
