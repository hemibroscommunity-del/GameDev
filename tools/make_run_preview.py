"""Animated-GIF previews of the (now 25-frame) jog cycle so the downsample can be
eyeballed for smoothness, both as the real body and as the flat green mannequin.
Writes tools/posesheets/preview-*.gif (loop them in any image viewer)."""
from PIL import Image
import numpy as np
GREEN = (0, 170, 70)
def union_bbox(frames):
    x0, y0, x1, y1 = 1e9, 1e9, -1, -1
    for f in frames:
        a = np.array(f)[:, :, 3]; ys, xs = np.where(a > 30)
        if len(xs) == 0: continue
        x0 = min(x0, xs.min()); x1 = max(x1, xs.max()); y0 = min(y0, ys.min()); y1 = max(y1, ys.max())
    return int(x0) - 3, int(y0) - 3, int(x1) + 4, int(y1) + 4
def make_gif(dir_, mannequin=False, dur=40, z=2):
    s = Image.open(f'public/sprites/player/jog-{dir_}.png').convert('RGBA'); n = s.width // 256
    frames = [s.crop((i * 256, 0, (i + 1) * 256, 256)) for i in range(n)]
    bx0, by0, bx1, by1 = union_bbox(frames)
    out = []
    for f in frames:
        if mannequin:
            a = np.array(f); op = a[:, :, 3] > 40; a[op, 0], a[op, 1], a[op, 2] = GREEN; f = Image.fromarray(a, 'RGBA')
        c = f.crop((bx0, by0, bx1, by1))
        bg = Image.new('RGBA', c.size, (245, 245, 245, 255)); bg.alpha_composite(c)
        bg = bg.resize((c.width * z, c.height * z), Image.NEAREST)
        out.append(bg.convert('P', palette=Image.ADAPTIVE))
    tag = 'mannequin-' + dir_ if mannequin else dir_
    p = f'tools/posesheets/preview-jog-{tag}.gif'
    out[0].save(p, save_all=True, append_images=out[1:], duration=dur, loop=0, disposal=2)
    print(f'{p}  ({n} frames)')
for d in ['east', 'south', 'southwest', 'northeast', 'north']:
    make_gif(d)
make_gif('south', mannequin=True)
make_gif('north', mannequin=True)
