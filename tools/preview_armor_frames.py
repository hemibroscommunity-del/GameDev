"""Per-frame armour preview that matches the in-game render.

Composites the player exactly as src/rendering/systems/entityRenderer.js does:
  - body shown UNLESS the full set (head+chest+legs) covers it
  - gear layered legs < chest < head, all pixel-aligned to the body frame
  - the per-direction armour-fit stretch (standWidth/standHeight/jogWidth/
    jogHeight) applied when chest+legs are worn (matches _armoredIdle)

Renders EVERY frame of the chosen pose/dir in a grid with a frame NUMBER in the
corner, so a misaligned piece can be spotted per frame.  --nudge-<slot> X Y
shifts that piece (source px) so you can find the offset that lines it up; bake
it into the sheet afterwards with --bake.

Usage:
  python tools/preview_armor_frames.py --dir northeast --pose jog \
      --head 1 --chest 1 --legs 1 [--nudge-chest 0 -2] [--zoom 3] [--out P.png]
  python tools/preview_armor_frames.py --dir all --pose jog --chest 1 --head 0 --legs 0
  # bake a found nudge permanently into a sheet:
  python tools/preview_armor_frames.py --bake chest northeast 0 -2
"""
import sys, argparse
import numpy as np
from PIL import Image, ImageDraw

FRAME = 256
LOCAL = 0.3515625
# --- keep in sync with entityRenderer.js ---
BODY_DIR_SCALE = {
    'stand': {'south': 1.136, 'east': 0.983, 'north': 1.039, 'northeast': 1.003, 'southwest': 0.983},
    'jog':   {'south': 1.000, 'east': 1.157, 'north': 1.050, 'northeast': 1.126, 'southwest': 1.000},
}
STAND_WIDTH  = {'south': 1.060, 'east': 1.7325, 'north': 1.326, 'northeast': 1.654, 'southwest': 1.232}
STAND_HEIGHT = {'south': 0.975, 'east': 0.945, 'north': 0.964, 'northeast': 0.946, 'southwest': 0.949}
JOG_WIDTH    = {'northeast': 0.903, 'southwest': 0.95}
JOG_HEIGHT   = {'south': 1.052, 'east': 0.985, 'north': 0.926, 'northeast': 0.977, 'southwest': 1.028}
DIRS = ['south', 'east', 'northeast', 'north', 'southwest']

SHEETS = {
    'body':  'public/sprites/player/{pose}-{dir}.png',
    'legs':  'public/sprites/gear/legs/steelgreaves/{pose}-{dir}.png',
    'chest': 'public/sprites/gear/chest/steelplate/{pose}-{dir}.png',
    'head':  'public/sprites/gear/head/steelhelm/{pose}-{dir}.png',
}


def load(slot, pose, d):
    try:
        return Image.open(SHEETS[slot].format(pose=pose, dir=d)).convert('RGBA')
    except FileNotFoundError:
        return None


def n_frames(pose, d):
    b = load('body', pose, d)
    return (b.width // FRAME) if b else 0


def frame(slot, pose, d, i, nudge=(0, 0)):
    im = load(slot, pose, d)
    if not im:
        return None
    n = im.width // FRAME
    cell = im.crop(((i % n) * FRAME, 0, (i % n + 1) * FRAME, FRAME))
    if nudge != (0, 0):
        o = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
        o.alpha_composite(cell, (nudge[0], nudge[1]))
        cell = o
    return cell


def composite(pose, d, i, worn, nudges):
    """One 256 frame composited as the renderer would."""
    full = worn['head'] and worn['chest'] and worn['legs']
    o = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
    if not full:
        b = frame('body', pose, d, i)
        if b: o.alpha_composite(b)
    for slot in ('legs', 'chest', 'head'):
        if worn[slot]:
            f = frame(slot, pose, d, i, nudges.get(slot, (0, 0)))
            if f: o.alpha_composite(f)
    return o


def fit_scale(pose, d, worn):
    armored = worn['chest'] and worn['legs']      # matches _armoredIdle
    sw = STAND_WIDTH[d] if (armored and pose == 'stand') else 1.0
    sh = STAND_HEIGHT[d] if (armored and pose == 'stand') else 1.0
    jw = JOG_WIDTH.get(d, 1.0) if (armored and pose == 'jog') else 1.0
    jh = JOG_HEIGHT.get(d, 1.0) if (armored and pose == 'jog') else 1.0
    base = BODY_DIR_SCALE[pose][d] * LOCAL
    return base * sw * jw, base * sh * jh


def render_dir(pose, d, worn, nudges, zoom):
    n = n_frames(pose, d)
    if not n:
        return None
    sx, sy = fit_scale(pose, d, worn)
    sx *= zoom * 6; sy *= zoom * 6                 # *6 so small figures are visible
    cells = []
    for i in range(n):
        c = composite(pose, d, i, worn, nudges)
        cells.append(c.resize((max(1, int(FRAME * sx)), max(1, int(FRAME * sy))), Image.NEAREST))
    # shared bbox across frames so every cell is the same size + baseline
    acc = None
    for c in cells:
        a = np.array(c)[:, :, 3] > 8
        acc = a if acc is None else (acc | a)
    ys, xs = np.where(acc)
    if not len(ys):
        return None
    x0, x1, y0, y1 = xs.min() - 2, xs.max() + 3, ys.min() - 2, ys.max() + 3
    cw, ch = x1 - x0, y1 - y0
    cols = min(n, 8); rows = (n + cols - 1) // cols
    pad, lbl = 4, 14
    out = Image.new('RGBA', (cols * (cw + pad) + pad, rows * (ch + lbl + pad) + pad), (38, 42, 50, 255))
    dr = ImageDraw.Draw(out)
    bg = Image.new('RGBA', (cw, ch), (70, 76, 86, 255))
    for i, c in enumerate(cells):
        r, cc = divmod(i, cols)
        x = pad + cc * (cw + pad); y = pad + lbl + r * (ch + lbl + pad)
        cell = bg.copy(); cell.alpha_composite(c.crop((x0, y0, x1, y1)))
        out.alpha_composite(cell, (x, y))
        dr.rectangle([x, y - lbl, x + 22, y], fill=(0, 0, 0, 200))
        dr.text((x + 3, y - lbl + 2), str(i), fill=(255, 220, 0, 255))
    return out


def bake(slot, d, dx, dy):
    """Shift a gear sheet by (dx,dy) px in every frame and save (+ its NW mirror
    note: NW uses NE mirrored at render, so only the base dir sheet is stored)."""
    path = SHEETS[slot].format(pose='jog', dir=d)
    for pose in ('jog', 'stand'):
        p = SHEETS[slot].format(pose=pose, dir=d)
        try:
            im = Image.open(p).convert('RGBA')
        except FileNotFoundError:
            continue
        n = im.width // FRAME
        out = Image.new('RGBA', im.size, (0, 0, 0, 0))
        for i in range(n):
            cell = im.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME))
            out.alpha_composite(cell, (i * FRAME + dx, dy))
        out.save(p)
        print(f'baked {slot} {pose}-{d}: shifted ({dx},{dy})')


if __name__ == '__main__':
    if len(sys.argv) >= 2 and sys.argv[1] == '--bake':
        _, _, slot, d, dx, dy = sys.argv
        bake(slot, d, int(dx), int(dy)); sys.exit(0)
    ap = argparse.ArgumentParser()
    ap.add_argument('--pose', default='jog')
    ap.add_argument('--dir', default='northeast')
    ap.add_argument('--head', type=int, default=1)
    ap.add_argument('--chest', type=int, default=1)
    ap.add_argument('--legs', type=int, default=1)
    ap.add_argument('--nudge-head', nargs=2, type=int, default=[0, 0])
    ap.add_argument('--nudge-chest', nargs=2, type=int, default=[0, 0])
    ap.add_argument('--nudge-legs', nargs=2, type=int, default=[0, 0])
    ap.add_argument('--zoom', type=float, default=1.0)
    ap.add_argument('--out', default='tools/armorframes-{dir}-{pose}.png')
    a = ap.parse_args()
    worn = {'head': bool(a.head), 'chest': bool(a.chest), 'legs': bool(a.legs)}
    nudges = {'head': tuple(a.nudge_head), 'chest': tuple(a.nudge_chest), 'legs': tuple(a.nudge_legs)}
    dirs = DIRS if a.dir == 'all' else [a.dir]
    for d in dirs:
        img = render_dir(a.pose, d, worn, nudges, a.zoom)
        if img:
            out = a.out.format(dir=d, pose=a.pose)
            img.save(out)
            print(f'-> {out}  ({img.size[0]}x{img.size[1]})  worn={worn} nudges={nudges}')
