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
# Extra uniform scale on the extracted armour (mannequin path).  ChatGPT
# sometimes draws the figure slightly slimmer than the base body, so the
# height-matched plate reads a touch narrow on some idle dirs -- nudge e.g. 1.05.
scale_mul = float(sys.argv[11]) if len(sys.argv) > 11 else 1.0

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

def _key_region(reg):
    """Magenta-key a slice of the sheet -> bool mask of figure pixels (kills the
    purple AA fringe too)."""
    rgb = reg.astype(int)
    dist = np.sqrt(((rgb - MAGENTA) ** 2).sum(2))
    nonmag = dist > MAG_TOL
    R, G, B = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    purple = (R - G > 32) & (B - G > 32) & (R > 105) & (B > 105)
    return nonmag & ~purple

def detect_figure(i):
    """Locate the armoured figure for frame i WITHOUT trusting the grid geometry.
    ChatGPT's returned sheet doesn't keep the exact cell pitch, so a fixed crop
    drifts by the bottom rows (slices the figure -> 'detached head' -> armour
    falls off).  Instead search a generous region around the nominal cell and
    pick the magenta-isolated blob nearest the cell centre.  Returns
    (content_rgba, top, left) in sheet pixels, or None."""
    r, c = divmod(i, cols)
    ry0 = max(0, r * ch - ch // 3); ry1 = min(arm.shape[0], (r + 1) * ch + ch // 3)
    rx0 = max(0, c * cw - cw // 3); rx1 = min(arm.shape[1], (c + 1) * cw + cw // 3)
    sub = arm[ry0:ry1, rx0:rx1]
    mask = _key_region(sub)
    mask = ndimage.binary_opening(mask, iterations=1)   # drop magenta-edge specks
    lbl, num = ndimage.label(mask)
    if num == 0:
        return None
    ccx = (c + 0.5) * cw - rx0; ccy = (r + 0.5) * ch - ry0
    best, bd = None, 1e18
    for k in range(1, num + 1):
        ys, xs = np.where(lbl == k)
        if len(ys) < 300:                                # ignore tiny fragments
            continue
        d = (xs.mean() - ccx) ** 2 + (ys.mean() - ccy) ** 2
        if d < bd:
            bd, best = d, k
    if best is None:
        return None
    ys, xs = np.where(lbl == best)
    t, l = int(ys.min()), int(xs.min())
    h, w = int(ys.max()) - t + 1, int(xs.max()) - l + 1
    content = np.zeros((h, w, 4), np.uint8)
    content[:, :, :3] = sub[t:t + h, l:l + w]
    content[:, :, 3] = (lbl[t:t + h, l:l + w] == best).astype(np.uint8) * 255
    return content, ry0 + t, rx0 + l, h, w

def base_bbox(i):
    """(x0, y0, x1, y1) of the base body in frame i."""
    op = np.array(base.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME)))[:, :, 3] > 40
    ys, xs = np.where(op)
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())

def head_anchor(mask):
    """(centre_x, top_y) of the HEAD: the largest blob in the top quarter of the
    bbox after eroding away thin limbs.  Pose-stable anchor -- unlike the bbox
    top/centre, a raised knee or swung arm above the head doesn't move it.
    (Tried 'most central' instead of 'largest' to dodge an arm in the top band,
    but that broke east jog vertical on a couple frames -- largest is right for
    every dir that was already good, so it stays.)"""
    ys = np.where(mask.any(1))[0]
    if len(ys) == 0:
        return None
    y0, h = int(ys.min()), int(ys.max()) - int(ys.min())
    top = mask.copy(); top[y0 + max(8, int(0.25 * h)):] = False
    er = ndimage.binary_erosion(top, iterations=2)
    if er.sum() < 20:
        er = top                                        # tiny head: skip erosion
    lbl, num = ndimage.label(er)
    if num == 0:
        return None
    sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, num + 1))
    k = int(np.argmax(sizes)) + 1
    hy, hx = np.where(lbl == k)
    return float(hx.mean()), float(hy.min())

# Per-sheet scale (mannequin only).  ChatGPT redraws the figure bigger/smaller
# than laid out; correct it by matching the armoured figure's HEIGHT to the base
# body's.  base_h/fig_h is pose-independent (both share the exact pose), so it's
# stable frame-to-frame -- median it for one clean scale (per-frame would jitter).
_det = {}
fig_scale = 1.0
if mannequin:
    ratios = []
    for i in range(n):
        d = detect_figure(i)
        if d is None:
            continue
        _det[i] = d
        _, _, _, fh, _ = d
        bx0, by0, bx1, by1 = base_bbox(i)
        if fh > 10:
            ratios.append((by1 - by0) / fh)
    if ratios:
        fig_scale = float(np.median(ratios))

def _raw_place(i):
    """Raw (px, py) to drop the (scaled) armoured figure so its green head sits
    on the base body's skin head (the v2.3.517 anchor that east/NE were good
    with).  None if a head couldn't be found."""
    d = _det.get(i)
    if d is None:
        return None
    content = d[0]
    s = fig_scale * scale_mul
    bop = np.array(base.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME)))[:, :, 3] > 40
    cmask = content[:, :, 3] > 40
    crgb = content[:, :, :3].astype(int)
    R, G, B = crgb[:, :, 0], crgb[:, :, 1], crgb[:, :, 2]
    cgreen = (G > R + 25) & (G > B + 25) & (G > 60) & cmask
    bh, ah = head_anchor(bop), head_anchor(cgreen)
    if bh and ah:
        return (bh[0] - ah[0] * s, bh[1] - ah[1] * s)
    bx0, by0, bx1, by1 = base_bbox(i)
    return ((bx0 + bx1) / 2 - content.shape[1] * s / 2, float(by0))

# Placement pre-pass + spike rejection.  The head anchor occasionally latches
# onto a raised arm that swings into the top band (SW frames 1/12 jumped ~18px
# right -> 'armour shifts off the body near the end of the cycle').  The plate
# should track the body smoothly, so replace any frame whose offset deviates
# > SPIKE px from its neighbours' median with that median.
_place = {}
if mannequin:
    raw = {i: _raw_place(i) for i in range(n)}
    SPIKE = 6
    for i in range(n):
        if raw[i] is None:
            continue
        if n >= 3:
            nb = [raw[j] for j in (i - 1, i, i + 1) if 0 <= j < n and raw[j] is not None]
            mx = float(np.median([p[0] for p in nb])); my = float(np.median([p[1] for p in nb]))
            px = mx if abs(raw[i][0] - mx) > SPIKE else raw[i][0]
            py = my if abs(raw[i][1] - my) > SPIKE else raw[i][1]
            _place[i] = (px, py)
        else:
            _place[i] = raw[i]

def keyed_frame(i):
    """Armoured figure for frame i as a 256x256 RGBA: detected blob, scaled by
    the per-sheet figure scale, head-anchored to the base body (spike-rejected
    placement -> no grid drift, no jitter, no arm-fooled shifts)."""
    if not mannequin:
        # legacy diff path: keep the old fixed-crop inverse map
        r, c = divmod(i, cols)
        cell = arm[r * ch + pad: r * ch + pad + ih, c * cw + pad: c * cw + pad + iw]
        m = _key_region(cell)
        fig = np.dstack([cell, (m * 255).astype(np.uint8)]).astype(np.uint8)
        small = Image.fromarray(fig, 'RGBA').resize((crop_w, crop_h), Image.LANCZOS)
        o = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
        o.alpha_composite(small, (ux0, uy0))
        return np.array(o)
    d = _det.get(i)
    if d is None or i not in _place:
        return np.zeros((FRAME, FRAME, 4), np.uint8)
    content, _, _, h, w = d
    s = fig_scale * scale_mul
    nw, nh = max(1, round(w * s)), max(1, round(h * s))
    small = Image.fromarray(content, 'RGBA').resize((nw, nh), Image.LANCZOS)
    o = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
    o.alpha_composite(small, (int(round(_place[i][0])), int(round(_place[i][1]))))
    return np.array(o)

os.makedirs(f'public/sprites/gear/{slot}/{item}', exist_ok=True)
gear_sheet = Image.new('RGBA', (n * FRAME, FRAME), (0, 0, 0, 0))
val = Image.new('RGBA', (FRAME * min(n, 6), FRAME * 2), (50, 54, 62, 255))

for i in range(n):
    af = keyed_frame(i)
    a_op = af[:, :, 3] > 40
    a_rgb = af[:, :, :3].astype(int)
    # FIGURE-RELATIVE band: the chest/legs split must track the figure, not the
    # 256 frame.  Some dirs (e.g. jog-south) sink down the frame over the cycle,
    # so a fixed y-slice clips the chest more each frame (8x decay -> "armour
    # falls off").  Anchor the band to the armoured figure's own bbox.
    ys_all = np.where(a_op.any(1))[0]
    if len(ys_all):
        fy0, fh = int(ys_all.min()), int(ys_all.max()) - int(ys_all.min())
        yb0, yb1 = fy0 + int(ymin_frac * fh), fy0 + int(ymax_frac * fh)
    else:
        yb0, yb1 = int(ymin_frac * FRAME), int(ymax_frac * FRAME)
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
