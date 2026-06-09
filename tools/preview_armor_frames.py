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
# Fraction of the body figure height (from its top) kept ALWAYS visible (head +
# neck) so the chest plate's neckline opening shows the neck, not a transparent
# gap.  Keep in sync with entityRenderer._maskedBodyFrame.
NECK_RESTORE_FRAC = 0.33
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


def _blend_ghost_hand(ba, top, bot, orig_alpha=None):
    """ChatGPT's armour drift leaves the body's bare FIST poking out below the
    waist past the gauntlet.  Where the fist sits OVER the leg, recolour it to the
    player's PANTS shade (no transparent hole); where it pokes BEYOND the leg
    outline, erase it.  The pants/skin/shoe colours are SAMPLED from this body
    (skin from the head, pants from the upper leg, shoes from the foot band) so
    the patch matches whatever skin/pants the player picked -- versatile to any
    colour-picker choice and to remote players.  The fist is found by hue-
    alignment to the sampled skin, not a fixed skin colour.  Mirrors
    entityRenderer._maskedBodyFrame -- keep in sync."""
    from scipy import ndimage
    op = ba[:, :, 3] > 40
    fh = bot - top
    neck = top + int(round(0.33 * fh))
    waist = top + int(round(0.45 * fh))   # a bit above mid-figure so waist/hip skin (chain-belt zone) is caught too
    px = ba[:, :, :3].astype(float)

    def med(y0, y1):
        m = op.copy(); m[:max(0, y0)] = False; m[min(FRAME, y1):] = False
        return np.median(ba[m][:, :3], axis=0) if m.any() else None
    shoe_top = bot - int(round(0.18 * fh))
    skin_ref = med(top, neck)
    shoes_ref = med(shoe_top, bot + 1)
    if skin_ref is None or shoes_ref is None:
        return
    # Pants colour: median of the upper-leg band, but EXCLUDING skin-toned pixels
    # -- the bare hip/fist can sit inside this band and would otherwise drag the
    # sample toward skin, making pants ~ skin so the fist test can't separate them
    # (e.g. a big pale fist over blue pants).  Exclude by hue-alignment to skin.
    band = op.copy(); band[:waist] = False; band[waist + int(round(0.40 * fh)):] = False
    sn = float(np.linalg.norm(skin_ref)) or 1.0
    pn = np.linalg.norm(px, axis=2); pn[pn == 0] = 1.0
    cos_skin = (px[:, :, 0] * skin_ref[0] + px[:, :, 1] * skin_ref[1] + px[:, :, 2] * skin_ref[2]) / (pn * sn)
    pm = band & (cos_skin < 0.985)
    if pm.any():
        pants_ref = np.median(ba[pm][:, :3], axis=0)
    elif band.any():
        pants_ref = np.median(ba[band][:, :3], axis=0)
    else:
        return

    def score(T):
        T = np.asarray(T, float); n = float(T @ T) or 1.0
        dot = px[:, :, 0] * T[0] + px[:, :, 1] * T[1] + px[:, :, 2] * T[2]
        return dot * dot / n
    s_skin = score(skin_ref)
    # Restore pants the dilated cover-mask ATE: the chest gear's 4px halo erodes
    # the pants next to the gauntlets.  The erase only zeroed alpha (RGB intact),
    # so re-open any erased pixel that reads as PANTS; skin/shoes stay erased so
    # the armour still hides the torso/arms.  v2.3.650
    if orig_alpha is not None:
        erased = (orig_alpha > 40) & (~op)
        erased[:neck] = False
        s_pants = score(pants_ref)
        restore = erased & (s_pants >= s_skin) & (s_pants >= score(shoes_ref))
        if restore.any():
            ba[restore, 3] = orig_alpha[restore]
            op = ba[:, :, 3] > 40
    low = op.copy(); low[:waist] = False
    # strict argmax (not a fixed margin): the fist is skin when skin is the MOST
    # hue-aligned of the three refs.  A margin fails for bright/desaturated skin
    # (pale tone scores almost as high to the grey boots as to skin).  Detect ONLY
    # between the waist and the shoe band -- the hand swings at the hip, never at
    # the feet -- so individual grey boot pixels can't flip to skin and get a pants
    # ring.  Then despeckle: drop tiny fist blobs (stray edge/boot misclassifs).
    region = op.copy(); region[:waist] = False; region[shoe_top:] = False
    fist = region & (s_skin > score(pants_ref)) & (s_skin > score(shoes_ref))
    lbl, nn = ndimage.label(fist)
    if nn:
        sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, nn + 1))
        fist = np.isin(lbl, list(np.nonzero(sizes >= 20)[0] + 1))
    if not fist.any():
        return
    leg = low & ~fist
    sil = np.zeros_like(leg)
    for y in range(waist, FRAME):
        xs = np.where(leg[y])[0]
        if len(xs):
            sil[y, max(0, xs.min() - 2):min(FRAME, xs.max() + 3)] = True
    dark = op & (ba[:, :, 0] < 85) & (ba[:, :, 1] < 85) & (ba[:, :, 2] < 85)
    hand = fist | (dark & ndimage.binary_dilation(fist, iterations=2))
    hand[:waist] = False
    pc = pants_ref.astype(int)
    ins = hand & sil; out = hand & ~sil
    ba[ins, 0], ba[ins, 1], ba[ins, 2], ba[ins, 3] = int(pc[0]), int(pc[1]), int(pc[2]), 255
    ba[out, 3] = 0


def composite(pose, d, i, worn, nudges, mask_dilate=6):
    """One 256 frame composited as the renderer would.
    v2: erase the body wherever a worn piece's silhouette (dilated by
    mask_dilate px to swallow the per-frame AI misalignment) covers, so the
    body never pokes past an armour edge; the body still shows in bare
    regions.  Then the armour is drawn on top."""
    from scipy import ndimage
    full = worn['head'] and worn['chest'] and worn['legs']
    pieces = {}
    for slot in ('legs', 'chest', 'head'):
        if worn[slot]:
            f = frame(slot, pose, d, i, nudges.get(slot, (0, 0)))
            if f is not None:
                pieces[slot] = np.array(f)
    o = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
    if not full:
        b = frame('body', pose, d, i)
        if b is not None:
            ba = np.array(b)
            if pieces and mask_dilate >= 0:
                cover = np.zeros((FRAME, FRAME), bool)
                for arr in pieces.values():
                    cover |= arr[:, :, 3] > 30
                if mask_dilate > 0:
                    cover = ndimage.binary_dilation(cover, iterations=mask_dilate)
                orig_alpha = ba[:, :, 3].copy()
                ba[cover, 3] = 0           # erase body under/just-outside the armour
                # Restore the head+neck band: the chest plate has a neckline
                # opening that the body's neck fills.  Without this the dilated
                # collar mask closes the narrow neck gap and the head floats
                # detached above the plate.  Anchored to the body figure's own
                # bbox so it tracks the bob.
                op = orig_alpha > 40
                ys = np.where(op.any(axis=1))[0]
                neck_y = 0
                if len(ys):
                    neck_y = ys[0] + int(round(NECK_RESTORE_FRAC * (ys[-1] - ys[0])))
                    ba[:neck_y, :, 3] = orig_alpha[:neck_y, :]
                    if worn.get('chest'):
                        _blend_ghost_hand(ba, ys[0], ys[-1], orig_alpha)
                # v2.3.681: erase the naked-body OUTLINE/SHADOW remnants that
                # survive OUTSIDE the armour silhouette where the AI drawing
                # drifted (floating arcs hugging the figure).  When armoured,
                # the body may only show INSIDE the filled gear silhouette
                # (+2px) -- pants in plate gaps, armpit windows -- or in the
                # restored head band above neck_y.  Row-ranges keep partial
                # equips intact: chest-only must not erase the bare legs etc.
                # Runs AFTER the blend so the pant-restore can't re-open these.
                gop = np.zeros((FRAME, FRAME), bool)
                for arr in pieces.values():
                    gop |= arr[:, :, 3] > 30
                if gop.any():
                    allowed = ndimage.binary_dilation(
                        ndimage.binary_fill_holes(gop), iterations=2)
                    gys = np.where(gop.any(axis=1))[0]
                    lo = int(gys.min()); hi = int(gys.max())
                    outside = ~allowed
                    outside[:neck_y] = False               # head band stays
                    if not worn.get('chest'):
                        outside[:lo] = False               # bare torso stays
                    if not worn.get('legs'):
                        outside[hi:] = False               # bare legs stay
                    else:
                        hi2 = min(FRAME, hi + 8)           # boots end the figure:
                        outside[hi2:] = True               # kill under-boot shadow
                    ba[outside, 3] = 0
            o.alpha_composite(Image.fromarray(ba))
    for slot in ('legs', 'chest', 'head'):
        if slot in pieces:
            o.alpha_composite(Image.fromarray(pieces[slot]))
    return o


def fit_scale(pose, d, worn):
    armored = worn['chest'] and worn['legs']      # matches _armoredIdle
    sw = STAND_WIDTH[d] if (armored and pose == 'stand') else 1.0
    sh = STAND_HEIGHT[d] if (armored and pose == 'stand') else 1.0
    jw = JOG_WIDTH.get(d, 1.0) if (armored and pose == 'jog') else 1.0
    jh = JOG_HEIGHT.get(d, 1.0) if (armored and pose == 'jog') else 1.0
    base = BODY_DIR_SCALE[pose][d] * LOCAL
    return base * sw * jw, base * sh * jh


def render_dir(pose, d, worn, nudges, zoom, mask_dilate=5):
    n = n_frames(pose, d)
    if not n:
        return None
    sx, sy = fit_scale(pose, d, worn)
    sx *= zoom * 6; sy *= zoom * 6                 # *6 so small figures are visible
    cells = []
    for i in range(n):
        c = composite(pose, d, i, worn, nudges, mask_dilate)
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
    ap.add_argument('--mask-dilate', type=int, default=4)
    ap.add_argument('--out', default='tools/armorframes-{dir}-{pose}.png')
    a = ap.parse_args()
    worn = {'head': bool(a.head), 'chest': bool(a.chest), 'legs': bool(a.legs)}
    nudges = {'head': tuple(a.nudge_head), 'chest': tuple(a.nudge_chest), 'legs': tuple(a.nudge_legs)}
    dirs = DIRS if a.dir == 'all' else [a.dir]
    for d in dirs:
        img = render_dir(a.pose, d, worn, nudges, a.zoom, a.mask_dilate)
        if img:
            out = a.out.format(dir=d, pose=a.pose)
            img.save(out)
            print(f'-> {out}  ({img.size[0]}x{img.size[1]})  worn={worn} nudges={nudges}')
