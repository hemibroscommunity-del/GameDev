"""Close the armour's waist for the body-hidden render and lay the chain belt on
a STABLE waist anchor.

The renderer hides the body under the full armour set (no drift peek).  The
chest->legs WAIST becomes an enclosed hole that must be covered, and a chain
belt laid over it -- consistently, every frame:

  * Anchor (no per-frame jump/flicker): crown + the median crown->chest-bottom
    offset for this direction.  The waist is a fixed length below the crown;
    using a per-frame centroid made the belt jump to the feet and vanish on
    side views.
  * Band height covers the MAX waist gap across the cycle, so the black gap
    fill is always WITHIN the chain band -> chain always on top of black,
    never black above the chain.
  * Black-fill the band (and any other enclosed hole, e.g. neck) first, then
    lay the chain over it -> chain holes read as shadow, no background hole.

Usage: python tools/fill_gear_gaps.py <pose> <dir>
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

FRAME = 256
BAND_FRAC = 0.13          # belt height as fraction of figure height (fixed)
CHAIN = Image.open('tools/posesheets/chainbelt.png').convert('RGBA')   # 706x96 strip

pose, dir_ = sys.argv[1], sys.argv[2]
# --no-backing: lay ONLY the chain (no black gap-fill / no enclosed-hole fill), so
# the background shows behind the chain instead of a black backing.
no_backing = '--no-backing' in sys.argv
# --no-enclosed: skip ONLY the enclosed-hole black-fill (keep the belt-band
# backing).  The masked-body renderer shows the body in pockets, so black-filling
# enclosed holes (e.g. the trailing-arm/leg armpit pocket) just paints a black
# blob where the body should peek through.  Use this for the body-aligned sheets.
no_enclosed = no_backing or '--no-enclosed' in sys.argv
# --band: lay the chain as a full-width horizontal BAND across the waist (over the
# cuirass bottom), not just in a transparent gap.  For front-ish views there is no
# inter-leg gap to fill -- the belt is worn over the armour as a band.  Confined
# to the central torso run so it never crosses the arms/hands at the sides.
band_mode = '--band' in sys.argv
# --patch: consistency pass over an ALREADY-BELTED sheet.  Lays the chain at the
# same legacy anchor rows on EVERY frame, drawing only into chest-transparent
# pixels over the body OR the leg plate (chest renders above legs, so frames
# where the thigh plate covered the waist gap -- which the legacy mode skipped,
# leaving the belt to pop in/out across the cycle -- now get their chain too).
# Existing chain pixels are chest-opaque and therefore untouched.
patch_mode = '--patch' in sys.argv
band_crop = float(sys.argv[sys.argv.index('--band-crop') + 1]) if '--band-crop' in sys.argv else 0.0
band_extend = float(sys.argv[sys.argv.index('--band-extend') + 1]) if '--band-extend' in sys.argv else 0.0
band_left = int(sys.argv[sys.argv.index('--band-left') + 1]) if '--band-left' in sys.argv else 0    # extend belt left edge Npx
band_right = int(sys.argv[sys.argv.index('--band-right') + 1]) if '--band-right' in sys.argv else 0  # extend belt right edge Npx
band_down = int(sys.argv[sys.argv.index('--band-down') + 1]) if '--band-down' in sys.argv else 0     # extend belt bottom Npx
# --frames i,j,k: only modify the listed frames (anchors still computed over the
# whole cycle, so the patched frames stay consistent with the rest).
only_frames = (set(int(f) for f in sys.argv[sys.argv.index('--frames') + 1].split(','))
               if '--frames' in sys.argv else None)
# --up N: raise the band top Npx (patch mode -- close a gap between the chain
# and the cuirass bottom; the chain is tiled to the taller window).
band_up = int(sys.argv[sys.argv.index('--up') + 1]) if '--up' in sys.argv else 0
chest_p = f'public/sprites/gear/chest/steelplate/{pose}-{dir_}.png'
legs_p = f'public/sprites/gear/legs/steelgreaves/{pose}-{dir_}.png'
chest = Image.open(chest_p).convert('RGBA')
legs = Image.open(legs_p).convert('RGBA')
base = Image.open(f'public/sprites/player/{pose}-{dir_}.png').convert('RGBA')
n = chest.width // FRAME
ca = np.array(chest)
la = np.array(legs)
ln = legs.width // FRAME


def enclosed(G):
    free = ~G
    lbl, num = ndimage.label(free)
    if num == 0:
        return np.zeros_like(G)
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    return free & ~np.isin(lbl, list(border))


# Pre-pass: median height + stable chest-bottom offset (the waist anchor) + the
# leg-armour top offset (so --band can FIT the belt to the actual waist gap).
heights, offsets, legtops = [], [], []
for i in range(n):
    bop = np.array(base.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME)))[:, :, 3] > 20
    ys = np.where(bop.any(1))[0]
    if not len(ys):
        continue
    y0 = int(ys.min()); hh = int(ys.max()) - y0
    heights.append(hh)
    cx = int(np.median(np.where(bop)[1]))
    cb = ca[:, i * FRAME + max(0, cx - 4):i * FRAME + cx + 5, 3] > 20
    cyr = np.where(cb.any(1))[0]
    if len(cyr):
        offsets.append(int(cyr.max()) - y0)
    lc = la[:, (i % ln) * FRAME + max(0, cx - 4):(i % ln) * FRAME + cx + 5, 3] > 20
    lyr = np.where(lc.any(1))[0]
    lyr = lyr[lyr > y0 + int(0.42 * hh)]          # leg-armour top, below the waist
    if len(lyr):
        legtops.append(int(lyr.min()) - y0)
medH = float(np.median(heights)) if heights else 150
seam_off = int(np.median(offsets)) if offsets else int(0.55 * medH)
band_h = int(BAND_FRAC * medH)
chain_h = band_h
if band_mode:
    # Fit the FULL chain to the waist GAP: from the waist (0.46*medH) down to the
    # leg-armour top.  Wide gap (back/front views with leg armour low) -> tall belt;
    # slim gap (e.g. south) -> slim belt.  No cropping/stretching of the pattern --
    # the original chain is just scaled to the gap height.
    waist_off = int(0.46 * medH)
    legtop_off = int(np.median(legtops)) if legtops else waist_off + int(0.12 * medH)
    band_h = max(6, legtop_off - waist_off + 3)
    chain_h = band_h
    if band_extend > 0:
        # Belt too thin for a small gap: LENGTHEN the window down (top stays at the
        # waist) over the leg-top, keeping the PREVIOUS link size/width -- tile the
        # same chain to fill the taller window (don't enlarge or restretch links).
        band_h = round(band_h * (1 + band_extend))
if band_mode and band_down:
    band_h += band_down                 # extend the belt bottom Npx (top stays; chain link size unchanged, tiled below)
if patch_mode and band_up:
    band_h += band_up                   # extend the belt top Npx (bottom stays)
chain_s = np.array(CHAIN.resize((max(1, int(706 * chain_h / 96)), chain_h), Image.LANCZOS))
if band_h > chain_h:
    reps = int(np.ceil(band_h / chain_h))
    chain_s = np.tile(chain_s, (reps, 1, 1))[:band_h]
if patch_mode and band_up:
    # keep the link phase of the ORIGINAL band rows (new rows added on top wrap)
    chain_s = np.roll(chain_s, band_up, axis=0)

# Bake the belt into the CHEST but ONLY where the chest is transparent (the
# waist gap) -- so it fills the hole without ever overwriting the chest's
# arms/hands (which are opaque), i.e. arms never get clipped, belt stays visible.
for i in range(n):
    if only_frames is not None and i not in only_frames:
        continue
    cs = ca[:, i * FRAME:(i + 1) * FRAME]
    ls = la[:, (i % ln) * FRAME:(i % ln + 1) * FRAME]
    chest_op = cs[:, :, 3] > 20
    G = chest_op | (ls[:, :, 3] > 20)
    bop = np.array(base.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME)))[:, :, 3] > 20
    yy = np.where(bop.any(1))[0]
    if not len(yy):
        ca[:, i * FRAME:(i + 1) * FRAME] = cs
        continue
    y0 = int(yy.min())
    interior = enclosed(G)
    if interior.any() and not no_enclosed:
        cs[interior] = [0, 0, 0, 255]               # close every hole (neck etc.)
    # Band top: in --band mode anchor to a fixed WAIST fraction of the figure
    # (the seam_off anchor is dragged down to the thighs by the hanging gauntlets
    # in the chest gear).  Otherwise the legacy crown+seam offset.
    if band_mode:
        by0 = y0 + int(0.46 * medH)                  # belt top at the waist; height = the gap
    else:
        by0 = y0 + seam_off - 22 - (band_up if patch_mode else 0)   # chain top, nudged up 20px total
    band = np.zeros_like(bop)
    band[max(0, by0):min(FRAME, by0 + band_h), :] = True
    if band_mode and band_crop > 0:                  # crop FRAC off the TOP (keep the bottom; chain bottom shows)
        band[:max(0, by0 + int(band_h * band_crop)), :] = False
    if band_mode:
        # Belt width = the LEG width.  The waist body-run is unreliable here -- the
        # shoulders/hands swung out at the sides bloat it -- so use the leg gear's
        # x-extent (sampled at the thigh tops, below the arms) as the belt span.
        cx = int(np.median(np.where(bop)[1]))
        legmask = ls[:, :, 3] > 20
        lys = np.where(legmask.any(1))[0]
        cols = np.where(legmask[int(lys.min()):min(FRAME, int(lys.min()) + 14), :].any(0))[0] if len(lys) else np.array([])
        if len(cols) == 0:
            ca[:, i * FRAME:(i + 1) * FRAME] = cs
            continue
        rl, rr = int(cols.min()), int(cols.max())
        # Make the belt symmetric about the torso centre using the NARROWER side,
        # so one wide leg/arm side can't push the belt into the armpit gap.
        tcx = int(np.median(np.where(chest_op)[1])) if chest_op.any() else (rl + rr) // 2
        half = min(tcx - rl, rr - tcx)
        if half > 0:
            rl, rr = tcx - half, tcx + half
        rl, rr = rl + 1, rr - 1            # hug the waist 1px tighter on each side
        rl, rr = rl - band_left, rr + band_right   # per-dir edge nudges
        region = band & bop & ~chest_op   # waist band, behind the arm (chest stays in front)
        if band_extend == 0:
            region &= ~(ls[:, :, 3] > 20)  # default: also behind the leg plate
        # else: --band-extend lets the belt sit OVER the leg-top (chest layer renders above legs)
        region[:, :rl] = False
        region[:, rr + 1:] = False
    elif patch_mode:
        # Same rows as the legacy belt; fill over body OR leg plate, x-confined
        # to the leg-gear span at the band rows (the hips) so the chain never
        # lands on a swinging arm at the sides.
        legmask = ls[:, :, 3] > 20
        region = band & (bop | legmask) & ~chest_op
        bandrows = legmask[max(0, by0):min(FRAME, by0 + band_h), :]
        cols = np.where(bandrows.any(0))[0]
        if len(cols):
            region[:, :int(cols.min())] = False
            region[:, int(cols.max()) + 1:] = False
    else:
        region = band & bop & ~chest_op & ~(ls[:, :, 3] > 20)   # the gap NEITHER plate covers
    if not region.any():
        ca[:, i * FRAME:(i + 1) * FRAME] = cs
        continue
    if not no_backing:
        cs[region] = [0, 0, 0, 255]                  # black under the chain
    xs = np.where(region.any(0))[0]
    rx0, rw = int(xs.min()), int(xs.max()) - int(xs.min()) + 1
    cw = chain_s.shape[1]
    if rw <= cw:
        sx = max(0, (cw - rw) // 2)
        crop = chain_s[:, sx:sx + rw]
    else:
        crop = np.tile(chain_s, (1, int(np.ceil(rw / cw)), 1))[:, :rw]
    for dy in range(crop.shape[0]):
        ry = max(0, by0) + dy
        if ry < 0 or ry >= FRAME:
            continue
        cols = np.where((crop[dy, :, 3] > 30) & region[ry, rx0:rx0 + crop.shape[1]])[0]
        cs[ry, rx0 + cols, :3] = crop[dy, cols, :3]
        cs[ry, rx0 + cols, 3] = 255
    ca[:, i * FRAME:(i + 1) * FRAME] = cs

Image.fromarray(ca, 'RGBA').save(chest_p)
print(f'{pose}-{dir_}: belt in chest-gap (off {seam_off}, band {band_h}, {n} frames)')
