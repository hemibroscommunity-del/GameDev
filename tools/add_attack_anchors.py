"""Detect fist-anchor coordinates for each attack frame and merge them
into public/sprites/player/anchors.json.

For each (direction, frame) we scan the 256-px frame for opaque pixels
and pick the point most extreme along an axis matching the punch:
  - frame 0 (windup): fist is straight up — pick the topmost pixel.
  - frame 1 (strike): fist is extended along the direction's punch
    vector — pick the pixel whose dot-product with that vector is max.

The "left" anchor (used for mirrored facings) is the mirror of the
right anchor about x = FRAME/2 in the same frame.  Existing anchor
entries for non-attack poses are preserved.
"""
import json
import os
import numpy as np
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ANCHORS_PATH = os.path.join(REPO, 'public', 'sprites', 'player', 'anchors.json')
SHEETS_DIR = os.path.join(REPO, 'public', 'sprites', 'player')
FRAME = 256

# Punch direction vectors in screen space (y grows DOWN).  Frame 0 is
# always windup (fist up); frame 1 is the strike, pointing along the
# direction's punch axis.  The detector restricts y to the upper-mid
# of the frame (y_max=170 of 256) so it never picks a foot pixel.
WINDUP_VEC = (0.0, -1.0)
STRIKE_VECS = {
    'east':      ( 1.0,  0.0),
    'north':     ( 0.0, -0.5),  # north strike has no extended fist;
                                # fall back to chest-area top pixel.
    'northeast': ( 1.0, -0.5),
    'south':     ( 0.0,  1.0),  # punch comes toward camera (downward)
    'southwest': (-1.0,  0.3),
}
# Per-frame Y caps so the foot/leg pixels never win the dot product.
WINDUP_Y_MAX = 80      # fist sits high; ignore anything past mid-torso
STRIKE_Y_MAX = 170     # mid-thigh; excludes legs/feet


def detect_anchor(frame_img, vec, y_max):
    arr = np.array(frame_img)
    alpha = arr[..., 3]
    ys, xs = np.where((alpha > 80) & (np.arange(FRAME)[:, None] <= y_max))
    if len(xs) == 0:
        # Fallback: any opaque pixel.
        ys, xs = np.where(alpha > 80)
        if len(xs) == 0:
            return [FRAME // 2, FRAME // 2]
    cx = FRAME / 2.0
    cy = FRAME / 2.0
    dx, dy = vec
    proj = (xs - cx) * dx + (ys - cy) * dy
    idx = int(proj.argmax())
    return [int(xs[idx]), int(ys[idx])]


# Strike-frame anchors hand-picked from visual inspection: the
# detector struggles on directions where the punch isn't a clear
# x-extremum (north's back-view has no extended fist; south's punch
# extends *toward* the camera and reads as a chest pixel, not the
# lowest opaque pixel).  Windup anchors are still auto-detected as
# the topmost pixel.
STRIKE_OVERRIDES = {
    'east':      [200, 95],   # extended fist at upper chest, right edge
    'north':     [165, 120],  # no clear punch — right hand at hip on back view
    'northeast': [210, 90],   # extended fist up-right
    'south':     [95, 110],   # punch toward camera — fist at upper chest, character right (viewer left)
    'southwest': [55, 100],   # post-mirror: fist extended down-left
}


def main():
    with open(ANCHORS_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    for direction in STRIKE_VECS:
        sheet = Image.open(os.path.join(SHEETS_DIR, f'attack-{direction}.png')).convert('RGBA')
        frames = []
        windup_sub = sheet.crop((0, 0, FRAME, FRAME))
        r_windup = detect_anchor(windup_sub, WINDUP_VEC, WINDUP_Y_MAX)
        r_strike = STRIKE_OVERRIDES[direction]
        for r in (r_windup, r_strike):
            l = [FRAME - 1 - r[0], r[1]]
            frames.append({'r': r, 'l': l})
        data[f'attack-{direction}'] = frames
        print(f'attack-{direction}: {frames}')

    with open(ANCHORS_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    print(f'\nWROTE {ANCHORS_PATH}')


if __name__ == '__main__':
    main()
