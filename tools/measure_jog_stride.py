#!/usr/bin/env python3
"""v2.3.4077: how far the ground goes under a planted boot, per jog loop.

The owner (desktop playtest): "Character animation speed and actual speed is
not matching!"  The jog loops played at fixed, eye-tuned cadences
(playerSprites.js JOG_DURATION_BY_DIR), so a bro walking east at 150 px/s
had his planted boot sliding backwards: the legs ran faster than the ground.

This measures, on the body's own leg sheets (public/sprites/player/
jog-<dir>-legs.png, the same frames as jog-<dir>.png), how far a PLANTED boot
moves through the frame per loop -- which is how far the ground must go by in
one loop for that boot to stand still on it -- and turns it into world px at
the figure's default size (BODY_DIR_SCALE.jog[dir] x 0.421875 x
PLAYER_SIZE_MULT, read from entityRenderer.js).  src/game/legSync.js
JOG_STRIDE_PX holds the numbers; `--check` fails when the two disagree.

How a boot is found: the boots are the only grey of the leg sheet (low
saturation, value 18..120); per frame the SOLE is the boot pixels within 4
rows of the lowest one, cut into runs, and the run holding the lowest pixel.
A frame is PLANTED when that sole is within 3 rows of the facing's ground line
(the lowest sole of the loop).  Between two planted frames the sole's x moves
backwards (against the run) by the ground's pace; the mean of those steps is
the boot's pace in sheet px a frame.

What it does NOT see: north and south.  Their planted boots stand still in the
frame (the art steps in place, the ground passing under them up or down the
screen), so there is no slide to time and no stride to measure: those two
facings keep their tuned loop, scaled by the speed against the walk.  The
diagonals' boots slide sideways only (the art's run is drawn near side-on),
so their stride is the sideways travel over cos 45 -- the slide you can see
is the sideways one, and timing cannot remove the up-and-down part.

  python3 tools/measure_jog_stride.py           # the table, before and after
  python3 tools/measure_jog_stride.py --check   # legSync.js still matches
"""
import math
import os
import re
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEETS = os.path.join(ROOT, 'public', 'sprites', 'player')
LOGICAL_H = 256          # playerSprites FRAME_H: the sheets on disk are 128 tall
LOCAL_SCALE = 0.421875   # entityRenderer LOCAL_SCALE / LOCAL_BODY_SCALE
PLAYER_SIZE_MULT = 1.25  # entityRenderer PLAYER_SIZE_MULT
WALK = 150               # px a second: SPEED 2.5 a frame x 60 (gameSystems.js)
GROUND_TOL = 3           # rows above the ground line a sole may sit and count as planted
# The run's direction on the screen, as the facing's sheet is drawn: the
# sign a planted boot's x moves by (against the run), and the angle the
# player moves at (the sideways share of the ground's pace is cos of it).
FACINGS = {
    'east':      {'back': -1, 'angle': 0},
    'northeast': {'back': -1, 'angle': 45},
    'southwest': {'back': +1, 'angle': 45},
    'north':     {'back': 0,  'angle': 90},
    'south':     {'back': 0,  'angle': 90},
}


def read_js(path):
    with open(os.path.join(ROOT, path), encoding='utf-8') as f:
        return f.read()


def jog_dir_scale():
    """BODY_DIR_SCALE.jog, as entityRenderer.js has it."""
    src = read_js('src/rendering/systems/entityRenderer.js')
    m = re.search(r"const BODY_DIR_SCALE = \{.*?\n\s*jog:\s*\{([^}]*)\}", src, re.S)
    return {k: float(v) for k, v in re.findall(r"(\w+):\s*([\d.]+)", m.group(1))}


def fixed_ms():
    """JOG_DURATION_BY_DIR, as playerSprites.js has it (the old cadences)."""
    src = read_js('src/rendering/playerSprites.js')
    m = re.search(r"const JOG_DURATION_BY_DIR = \{(.*?)\};", src, re.S)
    body = re.sub(r"/\*.*?\*/", '', m.group(1), flags=re.S)
    return {k: int(v) for k, v in re.findall(r"(\w+):\s*(\d+)", body)}


def table_px():
    """JOG_STRIDE_PX, as src/game/legSync.js has it."""
    src = read_js('src/game/legSync.js')
    m = re.search(r"JOG_STRIDE_PX = Object\.freeze\(\{(.*?)\}\)", src, re.S)
    body = re.sub(r"/\*.*?\*/", '', m.group(1), flags=re.S)
    return {k: float(v) for k, v in re.findall(r"(\w+):\s*([\d.]+)", body)}


def is_boot(p):
    r, g, b, a = p
    return a > 200 and max(r, g, b) - min(r, g, b) < 14 and 18 < max(r, g, b) < 120


def soles(d):
    im = Image.open(os.path.join(SHEETS, f'jog-{d}-legs.png')).convert('RGBA')
    w, h = im.size
    n = w // h
    px = im.load()
    out = []
    for i in range(n):
        boot = [(x, y) for x in range(h) for y in range(h // 2, h) if is_boot(px[i * h + x, y])]
        bot = max(y for _, y in boot)
        xs = sorted(x for x, y in boot if y > bot - 4)
        runs = [[xs[0]]]
        for x in xs[1:]:
            if x - runs[-1][-1] > 3:
                runs.append([x])
            else:
                runs[-1].append(x)
        low = min(x for x, y in boot if y == bot)
        run = next(r for r in runs if low in r)
        out.append((sum(run) / len(run), bot))
    return out, h


def measure(d, scale):
    s, h = soles(d)
    n = len(s)
    ground = max(b for _, b in s)
    per_px = (LOGICAL_H / h) * LOCAL_SCALE * scale * PLAYER_SIZE_MULT   # world px a sheet px
    f = FACINGS[d]
    steps = []
    for i in range(n):
        (x0, b0), (x1, b1) = s[i], s[(i + 1) % n]
        if b0 >= ground - GROUND_TOL and b1 >= ground - GROUND_TOL:
            dx = x1 - x0
            if f['back'] and dx * f['back'] > 0 and abs(dx) < 16:
                steps.append(abs(dx))
            elif not f['back']:
                steps.append(abs(dx))
    pace = sum(steps) / len(steps) if steps else 0.0      # sheet px a frame
    side = pace * per_px * n                              # world px a loop, sideways
    stride = side / math.cos(math.radians(f['angle'])) if f['back'] else None
    return {'frames': n, 'pairs': len(steps), 'pace': pace, 'per_px': per_px, 'side': side, 'stride': stride}


def main():
    scales = jog_dir_scale()
    old = fixed_ms()
    have = table_px()
    rows = {d: measure(d, scales[d]) for d in FACINGS}
    if '--check' in sys.argv:
        bad = []
        for d, r in rows.items():
            want = round(r['stride']) if r['stride'] else 0
            if abs(have.get(d, -1) - want) > 1:
                bad.append(f'{d}: legSync.js says {have.get(d)}, the sheets say {want}')
        if bad:
            print('JOG_STRIDE_PX is stale (re-run tools/measure_jog_stride.py and copy the strides):')
            print('\n'.join('  ' + b for b in bad))
            sys.exit(1)
        print('JOG_STRIDE_PX matches the sheets')
        return
    print(f'{"facing":10} {"frames":>6} {"pairs":>5} {"boot px/f":>9} {"world/px":>8} {"side/loop":>9} {"stride":>7}')
    for d, r in rows.items():
        st = f"{r['stride']:.1f}" if r['stride'] else '--'
        print(f"{d:10} {r['frames']:>6} {r['pairs']:>5} {r['pace']:>9.2f} {r['per_px']:>8.3f} {r['side']:>9.1f} {st:>7}")
    print()
    print(f'Foot slip at the base walk ({WALK} px/s), sideways world px/s: the planted boot\'s')
    print('pace through the frame minus the ground\'s sideways pace (+ = the boot slides back,')
    print('the legs run too fast; - = it slides forward, too slow).')
    print(f'{"facing":10} {"old ms":>6} {"slip":>7} {"legs/ground":>11} | {"new ms":>6} {"slip":>7} {"legs/ground":>11}')
    for d, r in rows.items():
        f = FACINGS[d]
        if not f['back']:
            print(f"{d:10} {old[d]:>6}   steps in place (no sideways slide); the loop scales by speed/{WALK}")
            continue
        ground = WALK * math.cos(math.radians(f['angle']))
        legs_old = r['side'] / (old[d] / 1000)
        new_ms = have[d] / WALK * 1000
        legs_new = r['side'] / (new_ms / 1000)
        print(f"{d:10} {old[d]:>6} {legs_old - ground:>+7.1f} {legs_old / ground:>11.2f} | {new_ms:>6.0f} {legs_new - ground:>+7.1f} {legs_new / ground:>11.2f}")


if __name__ == '__main__':
    main()
