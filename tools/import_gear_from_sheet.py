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
# Per-frame head exclusion: chest/legs never cover the head, but ChatGPT redraws
# the face slightly -> the diff ghosts a "second face". Drop gear above
# crown + HEAD_FRAC*(body height) on EACH frame (auto-tracks the head bob, works
# across dirs/poses without per-sheet tuning). 0 disables it (e.g. for helmets).
head_frac = float(sys.argv[9]) if len(sys.argv) > 9 else 0.22
# Drop redrawn SKIN from the gear: the diff catches ChatGPT's repainted arms/
# neck/face (skin), which double over the base body and blur. The gear should be
# the ARMOUR only -- the base provides the body. Keeps steel/leather/belt, drops
# tan skin (a 'balanced warm' tone: r>g>b with r-g ~ g-b, which excludes the
# gold/red belt where one gap dominates). 1=on, 0=off.
drop_skin = int(sys.argv[10]) if len(sys.argv) > 10 else 1

meta = json.load(open(f'tools/posesheets/{pose}-{dir_}.json'))
cols, rows = meta['cols'], meta['rows']
cw, ch, pad = meta['cell_w'], meta['cell_h'], meta['pad']
ux0, uy0, crop_w, crop_h = meta['crop']
scale = meta['scale']
n = meta['n']
mannequin = meta.get('mannequin', False)
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

def _head_metrics(mask):
    """(top_y, center_x, width) of the figure's head: widest row in the top
    band.  Used to register the armoured figure (green head) to the base body
    (skin head) -- corrects ChatGPT's per-sheet position + SCALE drift."""
    rows = np.where(mask.any(1))[0]
    if len(rows) == 0:
        return None
    top = int(rows.min()); bw = 0; bcx = 0.0
    for y in range(top, min(top + 16, mask.shape[0])):
        xs = np.where(mask[y])[0]
        if len(xs):
            w = int(xs.max()) - int(xs.min())
            if w > bw:
                bw = w; bcx = (int(xs.min()) + int(xs.max())) / 2.0
    return (top, bcx, bw + 1) if bw > 2 else None

# Registration pre-pass (mannequin only): the green head (unarmoured, same in
# both) vs the base body head gives a per-frame translation and a per-sheet
# scale.  ChatGPT often redraws the figure ~10% bigger / shifted, which puts the
# armour too low; this pins it back to the body.
reg = {}; median_s = 1.0
if mannequin:
    scales = []
    for i in range(n):
        af = keyed_frame(i); a_rgb = af[:, :, :3].astype(int)
        R, G, B = a_rgb[:, :, 0], a_rgb[:, :, 1], a_rgb[:, :, 2]
        green = (G > R + 25) & (G > B + 25) & (G > 60)
        bop = np.array(base.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME)))[:, :, 3] > 40
        g = _head_metrics(green); b = _head_metrics(bop)
        if g and b:
            reg[i] = (g, b); scales.append(b[2] / g[2])
    if scales:
        median_s = float(np.median(scales)); median_s = min(1.2, max(0.8, median_s))

os.makedirs(f'public/sprites/gear/{slot}/{item}', exist_ok=True)
gear_sheet = Image.new('RGBA', (n * FRAME, FRAME), (0, 0, 0, 0))
val = Image.new('RGBA', (FRAME * min(n, 6), FRAME * 2), (50, 54, 62, 255))

yb0, yb1 = int(ymin_frac * FRAME), int(ymax_frac * FRAME)
for i in range(n):
    af = keyed_frame(i)
    a_op = af[:, :, 3] > 40
    a_rgb = af[:, :, :3].astype(int)
    band = np.zeros_like(a_op); band[yb0:yb1, :] = True
    if mannequin:
        # MANNEQUIN: the body is a flat green silhouette -> the armour is simply
        # everything opaque that isn't green (magenta bg already keyed). No diff,
        # no skin/head heuristics -> surgically clean. Dilate the green a touch to
        # take its AA fringe with it.
        R, G, B = a_rgb[:, :, 0], a_rgb[:, :, 1], a_rgb[:, :, 2]
        green = (G > R + 25) & (G > B + 25) & (G > 60)
        green = ndimage.binary_dilation(green, iterations=1)
        gear = a_op & ~green & band
    else:
        bf = np.array(base.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME)))
        b_rgb = bf[:, :, :3].astype(int)
        diff = np.abs(a_rgb - b_rgb).sum(2)
        b_op = bf[:, :, 3] > 40
        # gear = armored-opaque AND (base transparent here OR colour changed a lot)
        gear = a_op & (~b_op | (diff > thresh)) & band
        # per-frame head exclusion (from the base body's crown)
        if head_frac > 0:
            yy = np.where(b_op.any(1))[0]
            if len(yy):
                hc = yy.min() + int(round(head_frac * (yy.max() - yy.min())))
                gear[:hc, :] = False
        # drop redrawn skin (keep only the armour); dilate so the arm's dark
        # outline + AA fringe go with it.
        if drop_skin:
            R, G, B = a_rgb[:, :, 0], a_rgb[:, :, 1], a_rgb[:, :, 2]
            rg, gb = R - G, G - B
            skin = (R > G) & (G > B) & (rg > 18) & (gb > 18) & (np.abs(rg - gb) < 38) & (R > 110)
            skin = ndimage.binary_dilation(skin, iterations=2)
            gear &= ~skin
    # despeckle
    lbl, num = ndimage.label(gear)
    if num:
        sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, num + 1))
        keep = set(np.nonzero(sizes >= MIN_BLOB)[0] + 1)
        gear = np.isin(lbl, list(keep))
    out = np.zeros_like(af)
    out[gear] = af[gear]
    # register the armour to the base body: scale by the per-sheet median, then
    # align the green head to the base head (per frame).
    if mannequin and i in reg:
        (gty, gcx, _), (bty, bcx, _) = reg[i]
        ys, xs = np.where(out[:, :, 3] > 0)
        nxs = np.round((xs - gcx) * median_s + bcx).astype(int)
        nys = np.round((ys - gty) * median_s + bty).astype(int)
        v = (nys >= 0) & (nys < FRAME) & (nxs >= 0) & (nxs < FRAME)
        sh = np.zeros_like(out); sh[nys[v], nxs[v]] = out[ys[v], xs[v]]
        out = sh
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
