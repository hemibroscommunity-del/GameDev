#!/usr/bin/env python3
"""v2.3.4355: THE WATER FROG, CUT FROM THE OWNER'S VIDEOS.

    python3 tools/art/cut_water_frog.py            # every strip, into public/sprites/monsters/water-frog/
    python3 tools/art/cut_water_frog.py --preview  # and a contact sheet of every strip (docs/art/water-frog-strips.png)

The owner, 2026-11-09: "I added new monster (water frog) on GitHub.  It
included videos of 5 directions: idle, attack, movement, and death animation
(only South).  Can you cut it into the right amount of frames to make it look
smooth and wire it into the game?  I want to replace the fish man monster."

WHAT WAS UPLOADED (assets/monster animations/water-frog/): seven videos, 10 s
each at 24 frames a second on flat magenta, and one picture of the frog from
five sides (frog-views.png: front, front-left, side, back, back-right).

    frog-s-idle-hop.mp4   facing you: it breathes, then one hop
    frog-s-attack.mp4     facing you: it leaps, mouth open, and lands in a splash
    frog-s-death.mp4      facing you: its water sac spins up and bursts
    frog-sw-hop.mp4       front-left: one hop
    frog-sw-attack.mp4    front-left: the sac swells, it spits the water out
    frog-e-hop.mp4        side on: one hop
    frog-e-attack.mp4     side on: the sac swells, it roars the water out

THE VIDEOS COVER THREE OF THE FIVE SIDES.  There is no video of the frog from
behind or from back-right, so those two are made here from the still picture:
the same frog squashed, stretched and lifted through a hop (HOP_SYNTH), and
leaning into its attack (ATK_SYNTH).  When the videos arrive, add them to
SOURCES and STRIPS below and delete the two SYNTH tables.

WHAT IT DOES TO EACH FRAME
  1. keys the magenta out by its HUE, not its brightness, so the shadow some
     of the videos drew under the frog (the same magenta, darker) goes with it
     and the frog's dark mouth does not;
  2. takes one pixel off the edge (the video's compression smears magenta
     into the outline) and the magenta lean off what is left near it;
  3. scales every video by ITS OWN frog at rest, so the frog is the same size
     from every side (REST_H px tall in a 256 px cell, its feet on GROUND),
     and never per frame: a hop still rises, a crouch still sinks;
  4. writes each strip as a row of 256 x 256 cells on at most 256 colours
     (public/tools/style/quant256.js, the game's own: tools/art/strip256.mjs).

The frames of each strip are picked by hand below, by what each one shows.
A hop is 12 frames (crouch, spring, the air, the landing, the settle); an
attack is 12 of wind-up, the last of them the blow, and 3 of recovery (the
game plays the wind-up over the server's warning, however long it is, then
the recovery: src/rendering/waterFrogSprites.js); the death is 20.
"""
import os
import subprocess
import sys

import numpy as np
from PIL import Image

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(REPO, 'assets', 'monster animations', 'water-frog')
OUT = os.path.join(REPO, 'public', 'sprites', 'monsters', 'water-frog')
TMP = os.path.join(REPO, 'tools', 'art', '.water-frog-tmp')

CELL = 256
GROUND = 232      # the row the frog's feet stand on, at rest (a landing dips below it)
REST_H = 140      # the frog's height at rest, cell px
CX = CELL // 2
LIVE_SCALE_PX = 120   # MONSTER_VARIANTS.fishman.liveScalePx: the death's numbers below are worked out from it

# video -> (file, the frames it sits still in, to measure it at rest)
SOURCES = {
    's':      ('frog-s-idle-hop.mp4', (0, 6)),
    's_atk':  ('frog-s-attack.mp4', (0, 6)),
    's_die':  ('frog-s-death.mp4', (0, 6)),
    'sw':     ('frog-sw-hop.mp4', (0, 6)),
    'sw_atk': ('frog-sw-attack.mp4', (0, 6)),
    'e':      ('frog-e-hop.mp4', (0, 6)),
    'e_atk':  ('frog-e-attack.mp4', (0, 6)),
}

# strip -> (video, the frames, in order)
STRIPS = {
    # one breath, looping (its period in the video is 32 frames)
    'idle-s':  ('s', [0, 4, 8, 12, 16, 20, 24, 28]),
    'idle-sw': ('sw', [168, 174, 180, 186, 192, 198, 204, 210]),
    'idle-e':  ('e', [174, 180, 186, 192, 198, 204, 210, 216]),
    # crouch, spring, the air, the landing, the settle
    'hop-s':   ('s', [52, 62, 70, 77, 83, 90, 100, 112, 122, 130, 140, 152]),
    'hop-sw':  ('sw', [36, 46, 52, 57, 64, 74, 88, 102, 114, 122, 132, 146]),
    # (frames 86-92 of the side hop leave the top of the video: skipped)
    'hop-e':   ('e', [60, 68, 74, 78, 81, 84, 94, 97, 100, 104, 110, 120]),
    # 12 of wind-up (the last is the blow), then 3 of recovery
    'attack-s':  ('s_atk', [50, 58, 66, 72, 78, 84, 92, 102, 112, 120, 126, 132, 138, 144, 150]),
    'attack-sw': ('sw_atk', [40, 48, 56, 64, 72, 80, 86, 90, 94, 100, 110, 120, 132, 150, 156]),
    'attack-e':  ('e_atk', [20, 30, 40, 50, 58, 66, 74, 80, 84, 87, 90, 93, 104, 150, 156]),
}
# the death is cut from the middle of its video at its own scale (the burst
# is three frogs wide): DEATH_SCALE_PX / DEATH_OFFSET_Y in monsterVariants.js
# draw it back at the living frog's size, its feet where they were
DEATH = ('s_die', [4, 18, 24, 30, 40, 54, 72, 90, 96, 99, 102, 105, 108, 114, 120, 128, 138, 150, 168, 198])

# the two sides with no video: (the view's column in frog-views.png, facing)
VIEWS = {'n': 3, 'ne': 4}
# a hop from a still: (wider, taller, lifted cell px) a frame
# (frames 0-2 on the ground, as the filmed hops' are: MONSTER_VARIANTS.fishman
# hopAirFrom -- a frog stopped in its crouch waits there)
HOP_SYNTH = [(1.05, 0.93, 0), (1.10, 0.84, 0), (0.92, 1.12, 0), (0.95, 1.07, 30),
             (1.00, 1.00, 50), (0.97, 1.04, 30), (1.09, 0.87, 0), (1.03, 0.96, 0)]
# an attack from a still: it swells, rears and comes down; the last 3 recover
ATK_SYNTH = [(1.02, 0.98, 0), (1.05, 0.95, 0), (1.08, 0.92, 0), (1.04, 1.02, 4), (0.97, 1.09, 10),
             (1.10, 0.86, 0), (1.06, 0.93, 0), (1.02, 0.98, 0), (1.00, 1.00, 0)]


def video_frames(path):
    w, h = map(int, subprocess.check_output(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
         '-of', 'csv=p=0', path]).decode().strip().split(','))
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)


def grow(mask, n=1):
    """the mask, and every pixel within n of it"""
    m = mask.copy()
    for _ in range(n):
        g = m.copy()
        g[1:] |= m[:-1]; g[:-1] |= m[1:]; g[:, 1:] |= m[:, :-1]; g[:, :-1] |= m[:, 1:]
        m = g
    return m


def key_out(rgb):
    """RGBA: the magenta (and its shadow) see-through, the frog whole."""
    f = rgb.astype(np.float32)
    edge = np.concatenate([f[:6].reshape(-1, 3), f[-6:].reshape(-1, 3), f[:, :6].reshape(-1, 3), f[:, -6:].reshape(-1, 3)])
    bg = np.median(edge, axis=0)
    hue = f / (f.sum(-1, keepdims=True) + 1e-3)
    d = np.sqrt(((hue - bg / bg.sum()) ** 2).sum(-1))
    # the background and its shadow: the background's hue, at any brightness
    # down to a third of it (a nearly black pixel has no hue worth reading)
    sure = (d < 0.085) & (f.max(-1) > bg.max() * 0.3)
    # the smear between the outline and the background: its hue, near it
    smear = (d < 0.14) & grow(sure, 2)
    back = grow(sure | smear, 1)          # ...and one pixel off the edge
    out = np.dstack([rgb, np.where(back, 0, 255).astype(np.uint8)])
    # despill: within 4 px of the background, a pixel leaning magenta (red
    # AND blue both well over green) has the lean taken off both
    near = grow(back, 4) & ~back
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    lean = near & (r > g + 24) & (b > g + 24)
    spill = np.minimum(r - g, b - g) - 24
    out[..., 0] = np.where(lean, np.clip(r - spill, 0, 255), r).astype(np.uint8)
    out[..., 2] = np.where(lean, np.clip(b - spill, 0, 255), b).astype(np.uint8)
    return out


def body_box(rgba):
    a = rgba[..., 3] > 0
    cols = np.where(a.sum(0) > 3)[0]
    rows = np.where(a.sum(1) > 3)[0]
    return cols.min(), rows.min(), cols.max() + 1, rows.max() + 1


def place(rgba, scale, src_cx, src_ground, ground=GROUND):
    """One cell: the keyed frame scaled by `scale`, the source point
    (src_cx, src_ground) on (CX, ground).  Hard edges: a pixel is there or not."""
    h, w = rgba.shape[:2]
    im = Image.fromarray(rgba, 'RGBA')
    # premultiplied, so a see-through pixel's colour does not bleed in
    pm = np.array(im).astype(np.float32)
    pm[..., :3] *= pm[..., 3:4] / 255.0
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    small = np.array(Image.fromarray(pm.astype(np.uint8), 'RGBA').resize((nw, nh), Image.LANCZOS)).astype(np.float32)
    a = small[..., 3:4]
    small[..., :3] = np.where(a > 0, small[..., :3] * 255.0 / np.maximum(a, 1), 0)
    small[..., 3] = np.where(small[..., 3] >= 128, 255, 0)
    small[..., :3] *= (small[..., 3:4] > 0)
    cell = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    ox = round(CX - src_cx * scale)
    oy = round(ground - src_ground * scale)
    cell.paste(Image.fromarray(np.clip(small, 0, 255).astype(np.uint8), 'RGBA'), (ox, oy))
    return cell


def strip_of(cells):
    s = Image.new('RGBA', (CELL * len(cells), CELL), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        s.paste(c, (i * CELL, 0))
    return s


def clipped(cell):
    a = np.array(cell)[..., 3] > 0
    return bool(a[0].any() or a[-1].any() or a[:, 0].any() or a[:, -1].any())


def rest_of(frames, span):
    boxes = [body_box(key_out(frames[i])) for i in range(span[0], span[1])]
    b = np.median(np.array(boxes), axis=0)
    return {'cx': (b[0] + b[2]) / 2, 'ground': b[3], 'h': b[3] - b[1], 'w': b[2] - b[0]}


def view_cell(col):
    """One of the five still views (frog-views.png, on black), keyed and
    stood on the ground at the frog's size."""
    im = np.array(Image.open(os.path.join(SRC, 'frog-views.png')).convert('RGB'))
    v = im.max(-1)
    cols = np.where((v > 40).sum(0) > 3)[0]
    runs, s, p = [], cols[0], cols[0]
    for c in cols[1:]:
        if c - p > 20:
            runs.append((s, p)); s = c
        p = c
    runs.append((s, p))
    x0, x1 = runs[col]
    part = im[:, max(0, x0 - 8):x1 + 9]
    # the black behind it: black, reached from the picture's edge (the
    # frog's own outline is nearly black, and is not)
    dark = part.max(-1) < 14
    seen = np.zeros_like(dark)
    seen[0] = dark[0]; seen[-1] = dark[-1]; seen[:, 0] = dark[:, 0]; seen[:, -1] = dark[:, -1]
    while True:
        g = grow(seen, 1) & dark
        if (g == seen).all():
            break
        seen = g
    rgba = np.dstack([part, np.where(grow(seen, 1), 0, 255).astype(np.uint8)])
    b = body_box(rgba)
    return rgba, {'cx': (b[0] + b[2]) / 2, 'ground': b[3], 'h': b[3] - b[1]}


def synth(base, sx, sy, lift):
    """the still, `sx` wider and `sy` taller about its feet, `lift` px up"""
    a = np.array(base)[..., 3] > 0
    rows = np.where(a.any(1))[0]
    colsx = np.where(a.any(0))[0]
    crop = base.crop((colsx.min(), rows.min(), colsx.max() + 1, rows.max() + 1))
    w, h = crop.size
    nw, nh = max(1, round(w * sx)), max(1, round(h * sy))
    r = np.array(crop.resize((nw, nh), Image.NEAREST))
    cell = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    mid = (colsx.min() + colsx.max() + 1) / 2
    cell.paste(Image.fromarray(r, 'RGBA'), (round(mid - nw / 2), round(rows.max() + 1 - nh - lift)))
    return cell


def main():
    preview = '--preview' in sys.argv
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(TMP, exist_ok=True)
    vids, rest = {}, {}
    for k, (fn, span) in SOURCES.items():
        vids[k] = video_frames(os.path.join(SRC, fn))
        rest[k] = rest_of(vids[k], span)
        print(f'  {fn}: {len(vids[k])} frames, at rest {rest[k]["w"]:.0f} x {rest[k]["h"]:.0f}')
    made = {}
    for name, (vk, picks) in STRIPS.items():
        r = rest[vk]
        k = REST_H / r['h']
        cells = [place(key_out(vids[vk][i]), k, r['cx'], r['ground']) for i in picks]
        cut = [picks[i] for i, c in enumerate(cells) if clipped(c)]
        if cut:
            print(f'  ! {name}: frames {cut} reach the edge of their cell')
        made[name] = cells
    # the death: the middle 720 x 720 of its video, whole
    vk, picks = DEATH
    r = rest[vk]
    fh = vids[vk].shape[1]
    k = CELL / fh
    made['death'] = [place(key_out(vids[vk][i]), k, r['cx'], fh, ground=CELL) for i in picks]
    dpx = LIVE_SCALE_PX * REST_H / (r['h'] * k)
    print(f'  death: the frog {r["h"] * k:.1f} px tall in its cell, its feet on row {r["ground"] * k:.1f}'
          f' -> deathScalePx {dpx:.1f},'
          f' deathOffsetY {(CELL - r["ground"] * k) * dpx / CELL - (CELL - GROUND) * LIVE_SCALE_PX / CELL:.1f},'
          f' headTopPx {(CELL - (GROUND - REST_H)) * LIVE_SCALE_PX / CELL:.1f} (MONSTER_VARIANTS.fishman)')
    # the two sides with no video
    # (the picture draws all five at one scale: its front view sets it)
    k_views = REST_H / view_cell(0)[1]['h']
    for d, col in VIEWS.items():
        rgba, r = view_cell(col)
        base = place(rgba, k_views, r['cx'], r['ground'])
        made[f'idle-{d}'] = [base]
        made[f'hop-{d}'] = [synth(base, *t) for t in HOP_SYNTH]
        made[f'attack-{d}'] = [synth(base, *t) for t in ATK_SYNTH]
    for name, cells in made.items():
        strip_of(cells).save(os.path.join(TMP, name + '.png'))
    subprocess.check_call(['node', os.path.join(REPO, 'tools', 'art', 'strip256.mjs'), TMP, OUT] + sorted(made))
    for name in made:
        os.remove(os.path.join(TMP, name + '.png'))
    os.rmdir(TMP)
    if preview:
        rows = sorted(made)
        W = max(len(made[n]) for n in rows) * 128
        sheet = Image.new('RGB', (W, 128 * len(rows)), (46, 52, 64))
        for y, n in enumerate(rows):
            s = Image.open(os.path.join(OUT, n + '.png')).convert('RGBA')
            s = s.resize((s.width // 2, 128), Image.LANCZOS)
            sheet.paste(s, (0, y * 128), s)
        p = os.path.join(REPO, 'docs', 'art', 'water-frog-strips.png')
        # (on 256 colours: it is a picture to look at, 0.4 MB and not 1.8)
        sheet.quantize(255, method=Image.MEDIANCUT, dither=Image.NONE).save(p, optimize=True)
        print('  preview:', os.path.relpath(p, REPO))


if __name__ == '__main__':
    main()
