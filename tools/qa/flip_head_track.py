#!/usr/bin/env python3
"""v2.3.3732: where the HEAD is on every frame of the roll (dodge) sheets.

The owner, on the double jump's flip (the roll's tumble, in the air): "The
double jump head is transparent and needs at least the hat rotated to match
the head during the flip."  Two things need the head's place on each tumble
frame, and the sheets record neither:
  - the armoured body's bake (maskedBake.js) keeps the top third of the
    figure as "the head", and the tumble's head is at the bottom upside down,
    so it was erased with the body under the plate -- the see-through head;
  - the head pieces (hat, hair, beard, glasses) are placed on the standing
    crown, so they were hidden for the whole roll; to carry them through the
    tumble they need the head's centre and its turn on each frame.

The head is the skin the chest plate leaves uncovered (the steel plate's own
roll sheet), its largest blob: the hands are small, the neck joins the head.
Its centre and radius come from the blob; its TURN from the line from the
figure's middle to the head, against the same line standing (stand-<dir>):
upright it points straight up, and on the handstand frame it points down.

Prints the table for src/rendering/flipHead.js (256-space, the sheet's own
frame; the east sheet is drawn mirrored for the west facings, which the
renderer handles).  Run from the repo root:  python3 tools/qa/flip_head_track.py
"""
import json, math
import numpy as np
from PIL import Image

def skin(a):
    r, g, b, al = (a[..., i].astype(int) for i in range(4))
    return (al > 200) & (r > 170) & (g > 80) & (g < 175) & (b < 120) & (r - b > 100)

def blobs(m):
    seen = np.zeros_like(m, bool); out = []
    H, W = m.shape
    for y in range(H):
        for x in range(W):
            if m[y, x] and not seen[y, x]:
                st = [(y, x)]; seen[y, x] = True; px = []
                while st:
                    cy, cx = st.pop(); px.append((cy, cx))
                    for ny, nx in ((cy+1, cx), (cy-1, cx), (cy, cx+1), (cy, cx-1)):
                        if 0 <= ny < H and 0 <= nx < W and m[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True; st.append((ny, nx))
                out.append(px)
    return sorted(out, key=len, reverse=True)

def head_of(body, chest):
    m = skin(body) & ~(chest[..., 3] > 30)
    b = blobs(m)[0]
    ys = np.array([p[0] for p in b]); xs = np.array([p[1] for p in b])
    cx, cy = xs.mean(), ys.mean()
    r = math.sqrt(len(b) / math.pi)
    fy, fx = np.nonzero(body[..., 3] > 40)
    ang = math.atan2(cy - fy.mean(), cx - fx.mean())   # figure middle -> head
    return cx, cy, r, ang

table = {}
for d in ('east', 'south'):
    st = np.array(Image.open(f'public/sprites/player/stand-{d}.png').convert('RGBA'))
    stc = np.array(Image.open(f'public/sprites/gear/chest/steelplate/stand-{d}.png').convert('RGBA')) \
        if False else np.zeros_like(st)
    # standing: the head is the top of the figure (the chest sheet's stand frame
    # is cut differently), so take the skin above the shoulders' flare
    fy, fx = np.nonzero(st[..., 3] > 40)
    top = fy.min(); hgt = fy.max() - top
    m = skin(st); m[top + int(0.2 * hgt):, :] = False
    ys, xs = np.nonzero(m)
    s_cx, s_cy = xs.mean(), ys.mean()
    s_ang = math.atan2(s_cy - fy.mean(), s_cx - fx.mean())
    s_r = math.sqrt(m.sum() / math.pi)
    body = np.array(Image.open(f'public/sprites/player/dodge-{d}.png').convert('RGBA'))
    chest = np.array(Image.open(f'public/sprites/gear/chest/steelplate/dodge-{d}.png').convert('RGBA'))
    n = body.shape[1] // 256
    frames = []
    for f in range(n):
        cx, cy, r, ang = head_of(body[:, f*256:(f+1)*256], chest[:, f*256:(f+1)*256])
        turn = ang - s_ang
        turn = (turn + math.pi) % (2 * math.pi) - math.pi
        frames.append([round(cx, 1), round(cy, 1), round(r, 1), round(turn, 3)])
    table[d] = {'stand': [round(s_cx, 1), round(s_cy, 1), round(s_r, 1)], 'frames': frames}
print(json.dumps(table, indent=1))
