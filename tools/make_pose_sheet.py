"""Build a pose-sheet PNG for ChatGPT: all frames of a body <pose>-<dir> sheet,
each cropped to the character + uniformly upscaled (so the figure is big enough
to draw armor on) and tiled on a solid magenta grid.  Writes a sidecar JSON with
the crop/scale/grid so tools/import_gear_from_sheet.py can map ChatGPT's result
back to the exact 256-frame positions.

Usage:
  python tools/make_pose_sheet.py <pose> <dir> [cols] [target_fig_h]
  e.g. python tools/make_pose_sheet.py jog east 5 300

Hand the printed PNG to ChatGPT with the printed prompt, then run the importer
on the result.
"""
import sys, os, json, math
from PIL import Image, ImageDraw
import numpy as np

FRAME = 256
MARGIN = 6          # px of body margin kept around the union bbox
PAD = 10            # magenta padding around each figure in a cell
MAGENTA = (255, 0, 255)

pose = sys.argv[1] if len(sys.argv) > 1 else 'jog'
dir_ = sys.argv[2] if len(sys.argv) > 2 else 'east'
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 5
target_fig_h = int(sys.argv[4]) if len(sys.argv) > 4 else 300

src = f'public/sprites/player/{pose}-{dir_}.png'
sheet = Image.open(src).convert('RGBA')
n = max(1, sheet.width // FRAME)
frames = [sheet.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME)) for i in range(n)]

# Common crop window = union of the character bbox across ALL frames (+ margin).
ux0, uy0, ux1, uy1 = 1e9, 1e9, -1, -1
for fr in frames:
    a = np.array(fr)[:, :, 3]
    ys, xs = np.where(a > 30)
    if len(xs) == 0:
        continue
    ux0 = min(ux0, xs.min()); ux1 = max(ux1, xs.max())
    uy0 = min(uy0, ys.min()); uy1 = max(uy1, ys.max())
ux0 = int(max(0, ux0 - MARGIN)); uy0 = int(max(0, uy0 - MARGIN))
ux1 = int(min(FRAME - 1, ux1 + MARGIN)); uy1 = int(min(FRAME - 1, uy1 + MARGIN))
crop_w, crop_h = ux1 - ux0 + 1, uy1 - uy0 + 1

scale = target_fig_h / crop_h
iw, ih = round(crop_w * scale), round(crop_h * scale)
cell_w, cell_h = iw + 2 * PAD, ih + 2 * PAD
rows = math.ceil(n / cols)

out = Image.new('RGB', (cols * cell_w, rows * cell_h), MAGENTA)
draw = ImageDraw.Draw(out)
for i, fr in enumerate(frames):
    fig = fr.crop((ux0, uy0, ux1 + 1, uy1 + 1)).resize((iw, ih), Image.LANCZOS)
    cell = Image.new('RGBA', (cell_w, cell_h), MAGENTA + (255,))
    cell.alpha_composite(fig, (PAD, PAD))
    r, c = divmod(i, cols)
    out.paste(cell.convert('RGB'), (c * cell_w, r * cell_h))
    draw.text((c * cell_w + 2, r * cell_h + 1), str(i), fill=(0, 0, 0))

os.makedirs('tools/posesheets', exist_ok=True)
png = f'tools/posesheets/{pose}-{dir_}.png'
out.save(png)
meta = {'pose': pose, 'dir': dir_, 'n': n, 'cols': cols, 'rows': rows,
        'cell_w': cell_w, 'cell_h': cell_h, 'pad': PAD,
        'crop': [ux0, uy0, crop_w, crop_h], 'scale': scale}
json.dump(meta, open(f'tools/posesheets/{pose}-{dir_}.json', 'w'), indent=2)

print(f'wrote {png}  ({out.width}x{out.height}, {n} frames, {cols}x{rows} grid, figure {ih}px tall)')
print('--- ChatGPT prompt ---')
print(
    f'This image is a {cols}x{rows} grid of the SAME character in {n} frames of a '
    f'run cycle, left-to-right, top-to-bottom, on a solid magenta background.\n'
    f'Redraw EVERY frame with the character wearing [DESCRIBE ARMOR HERE], drawn '
    f'over the same body. Keep each frame\'s pose, silhouette, position and scale '
    f'EXACTLY the same -- only add the armor. Do not add, remove, reorder, or '
    f'resize frames. Keep the solid magenta (#FF00FF) background. Match the '
    f'pixel-art style, line weight and resolution of the reference. Return the '
    f'same grid layout.')
