#!/usr/bin/env python3
"""
Direct topmost-opaque-pixel anchor per (pose, dir, frame).

Unlike derive_body_anchors.py, this does NO head/neck detection and
NO smoothing.  For every 256x256 frame in the player sheets, find:
  - the topmost row that has any opaque pixel (head crown)
  - the horizontal center of opaque pixels in that row

This gives the renderer a frame-exact pin point for trait stickers
that should track the head's crown through animation cycles.

Output: public/sprites/player/body-tops.json
  { "stand-southwest-0": [129, 21], "jog-southwest-5": [126, 35], ... }
"""

import json
import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow required: pip install Pillow")

try:
    import numpy as np
except ImportError:
    sys.exit("numpy required: pip install numpy")


FRAME_W = 256
ALPHA_THRESHOLD = 32
MIN_WIDTH = 20  # ignore rows narrower than this so the X anchor lands
                # on a "settled" crown row, not whatever 1-2 pixel hair
                # tip happens to stick up that frame.  Our character has
                # ~24px wide crown rows in most jog frames; one frame
                # (sw-jog 27) has a 14px lopsided top row that produced
                # a visible helmet snap.  Threshold of 20 skips it.


def top_xy(arr: np.ndarray):
    """Return [center_x_of_topmost_substantial_row, that_row_y] for
    a single 256x256 RGBA frame, or None.

    "Substantial" = at least MIN_WIDTH opaque pixels in that row.  This
    skips lone hair tips above the crown that would otherwise jitter X
    frame-to-frame and produce visible helmet snaps in the jog cycle."""
    if arr.shape[0] != FRAME_W or arr.shape[1] != FRAME_W:
        return None
    alpha = arr[..., 3] > ALPHA_THRESHOLD
    for r in range(FRAME_W):
        cols = np.where(alpha[r])[0]
        if len(cols) >= MIN_WIDTH:
            cx = int((int(cols.min()) + int(cols.max())) // 2)
            return [cx, r]
    return None


def process_sheet(path: str):
    im = Image.open(path).convert("RGBA")
    arr = np.array(im)
    H, W = arr.shape[0], arr.shape[1]
    if W % FRAME_W != 0:
        print(f"warn: {path} width {W} not multiple of {FRAME_W}; skipping")
        return []
    n = W // FRAME_W
    out = []
    for f in range(n):
        out.append(top_xy(arr[:, f * FRAME_W : (f + 1) * FRAME_W]))
    return out


def main():
    DIRS = ["east", "north", "northeast", "south", "southwest"]
    POSES = ["stand", "jog", "hit", "pickup"]
    body = {}
    for pose in POSES:
        for d in DIRS:
            path = f"public/sprites/player/{pose}-{d}.png"
            if not os.path.exists(path):
                continue
            for i, p in enumerate(process_sheet(path)):
                if p is not None:
                    body[f"{pose}-{d}-{i}"] = p
            n = sum(1 for k in body if k.startswith(f"{pose}-{d}-"))
            print(f"{pose}-{d}: {n} frames")
    out = "public/sprites/player/body-tops.json"
    with open(out, "w") as f:
        json.dump(body, f, separators=(",", ":"))
    print(f"\nwrote {out}  ({len(body)} entries)")


if __name__ == "__main__":
    main()
