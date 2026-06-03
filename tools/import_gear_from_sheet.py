"""Import ChatGPT's armored pose-sheet back into a body-aligned, transparent gear
layer that the renderer (gearSheets.js) consumes.

Steps (inverse of make_pose_sheet.py):
  - resize ChatGPT's returned image to the expected grid size (it often changes res)
  - slice each cell, key out the magenta, crop the inner figure
  - downscale by 1/scale and paste back at the recorded crop origin -> a 256 frame
    at the EXACT base position/scale
  - (optional) register a few px to best-match the base silhouette
  - diff vs the base frame: keep pixels the armor changed/added -> transparent gear
  - despeckle + assemble -> public/sprites/gear/<slot>/<item>/<pose>-<dir>.png
  - write a side-by-side validation composite to tools/posesheets/_validate_*.png

Usage:
  python tools/import_gear_from_sheet.py <armored_png> <slot> <item> <pose> <dir> \
      [thresh] [ymin_frac] [ymax_frac]
  ymin/ymax_frac optionally restrict kept gear to a vertical band (e.g. torso for a
  chest piece) so the diff can't pick up incidental face/hand redraws.

The diff threshold / band almost certainly need tuning on the first real sheet --
run it, look at the validation image, adjust.
"""
import sys, os, json
from PIL import Image
import numpy as np
from scipy import ndimage

FRAME = 256
MAGENTA = np.array([255, 0, 255])
MAG_TOL = 60          # distance from magenta counted as background
MIN_BLOB = 8          # despeckle: drop components smaller than this

armored_path = sys.argv[1]
slot = sys.argv[2]
item = sys.argv[3]
pose = sys.argv[4]
dir_ = sys.argv[5]
thresh = int(sys.argv[6]) if len(sys.argv) > 6 else 50
ymin_frac = float(sys.argv[7]) if len(sys.argv) > 7 else 0.0
ymax_frac = float(sys.argv[8]) if len(sys.argv) > 8 else 1.0

meta = json.load(open(f'tools/posesheets/{pose}-{dir_}.json'))
cols, rows = meta['cols'], meta['rows']
cw, ch, pad = meta['cell_w'], meta['cell_h'], meta['pad']
ux0, uy0, crop_w, crop_h = meta['crop']
scale = meta['scale']
n = meta['n']
iw, ih = round(crop_w * scale), round(crop_h * scale)

# ChatGPT output -> exact grid size, then slice.
arm = Image.open(armored_path).convert('RGB').resize((cols * cw, rows * ch), Image.LANCZOS)
arm = np.array(arm)
base = Image.open(f'public/sprites/player/{pose}-{dir_}.png').convert('RGBA')

def keyed_frame(i):
    """Return the armored figure for frame i as a 256x256 RGBA, magenta keyed,
    inverse-scaled + placed at the base crop origin."""
    r, c = divmod(i, cols)
    cell = arm[r * ch + pad: r * ch + pad + ih, c * cw + pad: c * cw + pad + iw]
    rgb = cell.astype(int)
    dist = np.sqrt(((rgb - MAGENTA) ** 2).sum(2))
    alpha = (dist > MAG_TOL).astype(np.uint8) * 255
    # de-spill: kill the anti-aliased magenta fringe ring -- pixels where R and B
    # both clearly exceed G are magenta-blended (no real body pixel is purple).
    R, G, B = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    purple = (R - G > 32) & (B - G > 32) & (R > 105) & (B > 105)
    alpha[purple] = 0
    fig = np.dstack([cell, alpha]).astype(np.uint8)
    small = Image.fromarray(fig, 'RGBA').resize((crop_w, crop_h), Image.LANCZOS)
    out = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
    out.alpha_composite(small, (ux0, uy0))
    return np.array(out)

os.makedirs(f'public/sprites/gear/{slot}/{item}', exist_ok=True)
gear_sheet = Image.new('RGBA', (n * FRAME, FRAME), (0, 0, 0, 0))
val = Image.new('RGBA', (FRAME * min(n, 6), FRAME * 2), (50, 54, 62, 255))

yb0, yb1 = int(ymin_frac * FRAME), int(ymax_frac * FRAME)
for i in range(n):
    af = keyed_frame(i)
    bf = np.array(base.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME)))
    a_op = af[:, :, 3] > 40
    b_rgb = bf[:, :, :3].astype(int)
    a_rgb = af[:, :, :3].astype(int)
    diff = np.abs(a_rgb - b_rgb).sum(2)
    b_op = bf[:, :, 3] > 40
    # gear = armored-opaque AND (base transparent here OR colour changed a lot)
    gear = a_op & (~b_op | (diff > thresh))
    band = np.zeros_like(gear); band[yb0:yb1, :] = True
    gear &= band
    # despeckle
    lbl, num = ndimage.label(gear)
    if num:
        sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, num + 1))
        keep = set(np.nonzero(sizes >= MIN_BLOB)[0] + 1)
        gear = np.isin(lbl, list(keep))
    out = np.zeros_like(af)
    out[gear] = af[gear]
    gear_sheet.paste(Image.fromarray(out, 'RGBA'), (i * FRAME, 0))
    if i < 6:  # validation: top=armored-placed, bottom=base+extracted-gear
        val.paste(Image.fromarray(af, 'RGBA'), (i * FRAME, 0))
        comp = base.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME)).copy()
        comp.alpha_composite(Image.fromarray(out, 'RGBA'))
        val.paste(comp, (i * FRAME, FRAME))

dst = f'public/sprites/gear/{slot}/{item}/{pose}-{dir_}.png'
gear_sheet.save(dst)
val.save(f'tools/posesheets/_validate_{slot}_{item}_{pose}-{dir_}.png')
print(f'wrote {dst} ({n} frames)')
print(f'validation -> tools/posesheets/_validate_{slot}_{item}_{pose}-{dir_}.png '
      f'(top=placed armored, bottom=base+extracted gear). thresh={thresh} '
      f'band={ymin_frac}-{ymax_frac}; tune if dirty.')
