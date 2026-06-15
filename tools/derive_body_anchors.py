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


# ── Skin-based head box (mine / fish poses) ────────────────────────────
# The gathering poses raise a tool above the head, so the opaque-silhouette
# detector above would box the tool, not the head.  Find the head by skin
# tone: the crown is the topmost skin run with a wide "face" blob below it
# (the raised tool handle is orange too but stays thin), then measure the
# head box from the skin head/face region down to the neck pinch.
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


def head_box_skin(arr: np.ndarray) -> dict | None:
    if arr.shape[0] != FRAME_W or arr.shape[1] != FRAME_W:
        return None
    sk = _skin_mask(arr)
    crown = None
    for r in range(FRAME_W):
        for (x0, x1) in _runs(sk[r], 6):
            cx = (x0 + x1) // 2
            face_w = 0
            for rr in range(r + 8, min(FRAME_W, r + 24)):
                for (a0, a1) in _runs(sk[rr], 24):   # skip the thin raised hand
                    if a0 - 12 <= cx <= a1 + 12:      # face must sit straight below
                        face_w = max(face_w, a1 - a0 + 1)
            if face_w >= 34:
                crown = (cx, r); break
        if crown:
            break
    if crown is None:
        return None
    cx, top = crown
    widths = []  # (row, width, x0, x1) of the head/face run near cx
    for r in range(top, min(FRAME_W, top + 60)):
        best = 0; bx0 = bx1 = None
        for (a0, a1) in _runs(sk[r], 3):
            if a0 - 25 <= cx <= a1 + 25 and (a1 - a0 + 1) > best:
                best = a1 - a0 + 1; bx0, bx1 = a0, a1
        if best > 0:
            widths.append((r, best, bx0, bx1))
    if not widths:
        return None
    peak_i = max(range(len(widths)), key=lambda i: widths[i][1])
    after = widths[peak_i:]
    head_bottom = widths[-1][0] if len(after) < 2 else min(after, key=lambda x: x[1])[0]
    hl, hr = FRAME_W, 0
    for (r, w, a0, a1) in widths:
        if r > head_bottom:
            break
        hl = min(hl, a0); hr = max(hr, a1)
    if hr < hl:
        return None
    return {
        "top":    [(hl + hr) // 2, top],
        "bottom": [(hl + hr) // 2, head_bottom],
        "left":   [hl, (top + head_bottom) // 2],
        "right":  [hr, (top + head_bottom) // 2],
        "center": [(hl + hr) // 2, (top + head_bottom) // 2],
        "width":  hr - hl + 1,
        "height": head_bottom - top + 1,
    }


def process_sheet(path: str, pose: str, direction: str, frame_count_hint: int | None = None, detector=head_box) -> list[dict | None]:
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
        out.append(detector(frame))
    return out


def smooth_head_boxes(frames: list[dict | None], window: int = 5) -> list[dict | None]:
    """Apply a centered moving average to head-center coords across a
    jog cycle so per-frame silhouette noise (arms swinging in front,
    shadow edges) doesn't jitter the trait overlay.

    Width / height / extents are smoothed too -- helps prevent
    "breathing" on subtle frame-to-frame width changes.

    Window=5: each frame averaged with its 2 neighbours on each side.
    For pose strips < window, no smoothing (degenerate)."""
    if len(frames) < window or window < 2:
        return frames
    half = window // 2
    out = []
    keys_xy = ["top", "bottom", "left", "right", "center"]
    for i, fr in enumerate(frames):
        if fr is None:
            out.append(None)
            continue
        # Collect neighbour windows; skip Nones.
        lo = max(0, i - half)
        hi = min(len(frames), i + half + 1)
        bucket = [f for f in frames[lo:hi] if f is not None]
        if not bucket:
            out.append(fr)
            continue
        smoothed = {}
        for k in keys_xy:
            sx = sum(f[k][0] for f in bucket) / len(bucket)
            sy = sum(f[k][1] for f in bucket) / len(bucket)
            smoothed[k] = [round(sx), round(sy)]
        smoothed["width"]  = round(sum(f["width"]  for f in bucket) / len(bucket))
        smoothed["height"] = round(sum(f["height"] for f in bucket) / len(bucket))
        out.append(smoothed)
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
    # silhouette is what we measure.  SMOOTHED with a moving average so
    # arm-swing / shadow noise in the silhouette doesn't jitter traits.
    for pose in ["jog", "hit", "pickup"]:
        for d in DIRS:
            path = f"public/sprites/player/{pose}-{d}.png"
            if not os.path.exists(path):
                continue
            frames = process_sheet(path, pose, d)
            frames = smooth_head_boxes(frames, window=5)
            for i, fr in enumerate(frames):
                key = f"{pose}-{d}-{i}"
                body[key] = {"head": fr} if fr else None
            print(f"{pose}-{d}: {sum(1 for fr in frames if fr)}/{len(frames)} frames (smoothed)")

    # v2.3.855: south-only gathering poses — skin-based head box so the
    # raised pickaxe / fishing rod isn't measured as the head.  Smoothed
    # like the others to keep the trait overlay from jittering on the swing.
    for pose in ["mine", "fish"]:
        for d in DIRS:
            path = f"public/sprites/player/{pose}-{d}.png"
            if not os.path.exists(path):
                continue
            frames = process_sheet(path, pose, d, detector=head_box_skin)
            frames = smooth_head_boxes(frames, window=5)
            for i, fr in enumerate(frames):
                key = f"{pose}-{d}-{i}"
                body[key] = {"head": fr} if fr else None
            print(f"{pose}-{d}: {sum(1 for fr in frames if fr)}/{len(frames)} frames (skin, smoothed)")

    out_path = "public/sprites/player/body-anchors.json"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(body, f, separators=(",", ":"))
    print(f"\nwrote {out_path}  ({len(body)} entries)")


if __name__ == "__main__":
    main()
