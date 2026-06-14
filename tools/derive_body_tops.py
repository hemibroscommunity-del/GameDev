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


# ── Skin-based head crown (mine / fish poses) ──────────────────────────
# The gathering poses raise a tool (pickaxe / fishing rod) ABOVE the head,
# so the topmost opaque pixel is the tool, not the crown.  Detect the head
# by skin tone instead: the head is the topmost skin run that has a wide
# "face" blob a dozen rows below it (the raised tool handle is orange too
# but stays thin / meets non-skin metal, so it fails the face test).
SKIN_MIN_RUN = 6
FACE_MIN_W = 34       # the face must reach this width below a real crown
FACE_MIN_RUN = 24     # only count face runs at least this wide (skips the
                      # thin raised hand/arm, which is also skin)
FACE_XTOL = 12        # face must sit nearly straight below the crown (px)
FACE_LO, FACE_HI = 8, 24


def _skin_mask(arr):
    a = arr[..., 3] > ALPHA_THRESHOLD
    R = arr[..., 0].astype(int); G = arr[..., 1].astype(int); B = arr[..., 2].astype(int)
    return a & (R > 165) & (G > 75) & (G < 170) & (B < 118) & (R - B > 72)


def _runs(rowmask, minlen):
    out = []; cur = 0; start = 0
    for i, v in enumerate(rowmask):
        if v:
            if cur == 0:
                start = i
            cur += 1
        else:
            if cur >= minlen:
                out.append((start, i - 1))
            cur = 0
    if cur >= minlen:
        out.append((start, len(rowmask) - 1))
    return out


def head_crown_skin(arr):
    """[center_x, crown_y] of the head, robust to a tool raised over it."""
    if arr.shape[0] != FRAME_W or arr.shape[1] != FRAME_W:
        return None
    sk = _skin_mask(arr)
    for r in range(FRAME_W):
        for (x0, x1) in _runs(sk[r], SKIN_MIN_RUN):
            cx = (x0 + x1) // 2
            face_w = 0
            for rr in range(r + FACE_LO, min(FRAME_W, r + FACE_HI)):
                for (a0, a1) in _runs(sk[rr], FACE_MIN_RUN):
                    if a0 - FACE_XTOL <= cx <= a1 + FACE_XTOL:
                        face_w = max(face_w, a1 - a0 + 1)
            if face_w >= FACE_MIN_W:
                return [int(cx), int(r)]
    return None


def process_sheet(path: str, detector=top_xy):
    im = Image.open(path).convert("RGBA")
    arr = np.array(im)
    H, W = arr.shape[0], arr.shape[1]
    if W % FRAME_W != 0:
        print(f"warn: {path} width {W} not multiple of {FRAME_W}; skipping")
        return []
    n = W // FRAME_W
    out = []
    for f in range(n):
        out.append(detector(arr[:, f * FRAME_W : (f + 1) * FRAME_W]))
    return out


def main():
    DIRS = ["east", "north", "northeast", "south", "southwest"]
    POSES = ["stand", "jog", "hit", "pickup"]
    # v2.3.855: south-only gathering poses use skin-based head detection so
    # the raised pickaxe / fishing rod doesn't get mistaken for the crown.
    SKIN_POSES = ["mine", "fish"]
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
    for pose in SKIN_POSES:
        for d in DIRS:  # south-only sheets exist; others just don't open
            path = f"public/sprites/player/{pose}-{d}.png"
            if not os.path.exists(path):
                continue
            for i, p in enumerate(process_sheet(path, head_crown_skin)):
                if p is not None:
                    body[f"{pose}-{d}-{i}"] = p
            n = sum(1 for k in body if k.startswith(f"{pose}-{d}-"))
            print(f"{pose}-{d}: {n} frames (skin-detected)")
    out = "public/sprites/player/body-tops.json"
    with open(out, "w") as f:
        json.dump(body, f, separators=(",", ":"))
    print(f"\nwrote {out}  ({len(body)} entries)")


if __name__ == "__main__":
    main()
