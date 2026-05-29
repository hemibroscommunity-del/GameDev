#!/usr/bin/env python3
"""
Derive head-box anchors from the player baseline sprites.

For each pose-dir-frame, find the head's bounding box (top, bottom,
left, right) by analyzing the silhouette.  Strategy:
  - find topmost opaque row (head top)
  - scan down per row, tracking width
  - the narrowest row in the upper portion is the NECK
  - head spans from top to neck
  - within head rows, leftmost/rightmost opaque columns = head edges

Outputs a body-anchors JSON consumed by the trait composition renderer.
Each entry has the head's bbox + derived center + width/height so the
renderer can place trait sprites without per-trait anchor tuning.

Usage:
  python tools/derive_body_anchors.py
"""

import json
import os
import sys
from glob import glob

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required (pip install Pillow)")

try:
    import numpy as np
except ImportError:
    sys.exit("NumPy is required (pip install numpy)")


FRAME_W = 256
ALPHA_THRESHOLD = 32


def head_box(arr: np.ndarray) -> dict | None:
    """Return head bbox for a single 256x256 RGBA frame.
    Returns None if no silhouette is found."""
    if arr.shape[0] != FRAME_W or arr.shape[1] != FRAME_W:
        return None
    alpha = arr[..., 3]
    opaque = alpha > ALPHA_THRESHOLD

    # Topmost opaque row.
    row_has = opaque.any(axis=1)
    nonzero_rows = np.where(row_has)[0]
    if len(nonzero_rows) == 0:
        return None
    top = int(nonzero_rows[0])

    # Width per row down from top.  Look for the NARROWEST row in the
    # upper region -- that's the neck (between head and shoulders).
    # Cap the search to top + 90 px so we don't accidentally pick up
    # body indents lower down.
    search_end = min(top + 90, FRAME_W)
    widths = []
    for r in range(top, search_end):
        cols = np.where(opaque[r])[0]
        if len(cols) == 0:
            continue
        widths.append((r, int(cols.max() - cols.min() + 1)))

    if not widths:
        return None

    # The first row's width is the head's TOP slice (narrow because skull
    # narrows toward crown).  Walk down until width PEAKS (widest head
    # slice), then continue and pick the next LOCAL MIN -- that's the
    # neck.  This avoids treating the head-top itself as the "narrowest".
    peak_w = 0
    peak_idx = 0
    for i, (_r, w) in enumerate(widths):
        if w > peak_w:
            peak_w = w
            peak_idx = i

    # Past the head peak, find the minimum-width row before the
    # silhouette starts widening into shoulders.
    after_peak = widths[peak_idx:]
    if len(after_peak) < 2:
        # Couldn't find a neck; use the bottom of our search window.
        head_bottom = widths[-1][0]
    else:
        # Pick the row where width is minimum past the head peak.
        neck = min(after_peak, key=lambda x: x[1])
        head_bottom = neck[0]

    # Within head rows, get the full horizontal extent.
    head_left = FRAME_W
    head_right = 0
    for r in range(top, head_bottom + 1):
        cols = np.where(opaque[r])[0]
        if len(cols) == 0:
            continue
        head_left = min(head_left, int(cols.min()))
        head_right = max(head_right, int(cols.max()))

    if head_right < head_left:
        return None

    return {
        "top":    [(head_left + head_right) // 2, top],
        "bottom": [(head_left + head_right) // 2, head_bottom],
        "left":   [head_left,  (top + head_bottom) // 2],
        "right":  [head_right, (top + head_bottom) // 2],
        "center": [(head_left + head_right) // 2, (top + head_bottom) // 2],
        "width":  head_right - head_left + 1,
        "height": head_bottom - top + 1,
    }


def process_sheet(path: str, pose: str, direction: str, frame_count_hint: int | None = None) -> list[dict | None]:
    """Process a sprite sheet (1+ frames horizontally tiled) and return
    a list of head-box entries per frame."""
    im = Image.open(path).convert("RGBA")
    arr = np.array(im)
    H, W = arr.shape[0], arr.shape[1]
    if W % FRAME_W != 0:
        print(f"warn: {path} width {W} not multiple of {FRAME_W}; skipping")
        return []
    frame_count = W // FRAME_W
    out = []
    for f in range(frame_count):
        frame = arr[:, f * FRAME_W : (f + 1) * FRAME_W]
        out.append(head_box(frame))
    return out


def main():
    DIRS = ["east", "north", "northeast", "south", "southwest"]

    body = {}

    # Stand pose: prefer the faceless mannequins so the head silhouette
    # is unobstructed by face details.  Fall back to the default body
    # sheets if mannequins are missing for a direction.
    for d in DIRS:
        cand = [
            f"public/sprites/player-naked/stand-{d}.png",
            f"public/sprites/player/stand-{d}.png",
        ]
        path = next((p for p in cand if os.path.exists(p)), None)
        if not path:
            print(f"stand-{d}: no source found")
            continue
        frames = process_sheet(path, "stand", d)
        for i, fr in enumerate(frames):
            key = f"stand-{d}-{i}"
            body[key] = {"head": fr} if fr else None
            if fr:
                print(f"{key}: head box {fr['center']} w={fr['width']} h={fr['height']} top={fr['top'][1]} bot={fr['bottom'][1]}")
            else:
                print(f"{key}: detection failed")

    # Jog / hit / pickup poses use the default body sheets (no mannequin
    # variants exist for those poses).  Detection still works because
    # silhouette is what we measure.
    for pose in ["jog", "hit", "pickup"]:
        for d in DIRS:
            path = f"public/sprites/player/{pose}-{d}.png"
            if not os.path.exists(path):
                continue
            frames = process_sheet(path, pose, d)
            for i, fr in enumerate(frames):
                key = f"{pose}-{d}-{i}"
                body[key] = {"head": fr} if fr else None
            print(f"{pose}-{d}: {sum(1 for fr in frames if fr)}/{len(frames)} frames")

    out_path = "public/sprites/player/body-anchors.json"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(body, f, separators=(",", ":"))
    print(f"\nwrote {out_path}  ({len(body)} entries)")


if __name__ == "__main__":
    main()
