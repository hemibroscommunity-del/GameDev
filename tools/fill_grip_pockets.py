"""Fill open "grip-curl" pockets in the armoured fists -- the C-shaped notches
where an EMPTY hand shows the background through the curl ("see-through holes in
the fists").  These survive clean_sprite_frames.py's hole fill because they open
to the frame border (the weapon would enter there), so flood-fill counts them as
background, not enclosed holes.

Detection: a transparent pixel is part of a pocket when, casting rays in the 8
compass directions up to --dist px, it hits opaque armour on at least --sides of
the 8 directions.  That fills concave dead-end pockets (open on one side) while
leaving true background (open on many sides) and narrow limb-gap channels (e.g.
arm<->torso: opaque on left/right but open top/bottom -> too few sides) alone.

Filled regions are additionally capped at --max-pocket px (connected component)
so the pass can never web two limbs together.  RGB is inpainted from the nearest
BODY-METAL pixel (opaque AND luma > --metal-luma, so the dark outline rim is not
used as the colour source), alpha set to 255 -> the filled curl is clean steel.

Usage:
  python tools/fill_grip_pockets.py [--dist N] [--sides K] [--max-pocket N]
                                    [--metal-luma L] [--dry-run] sheet.png ...
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

FRAME = 256
DIRS = [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]


def _hits_within(op, dy, dx, dist):
    """Opaque present within `dist` steps along (dy,dx) for every pixel."""
    hit = np.zeros_like(op)
    for k in range(1, dist + 1):
        s = np.roll(op, (dy * k, dx * k), axis=(0, 1))
        if dy * k > 0: s[:dy * k, :] = 0
        elif dy * k < 0: s[dy * k:, :] = 0
        if dx * k > 0: s[:, :dx * k] = 0
        elif dx * k < 0: s[:, dx * k:] = 0
        hit |= s
    return hit


def fill_frame(arr, dist, sides, max_pocket, max_extent=16, min_fill=0.42,
               metal_luma=80):
    op = arr[:, :, 3] > 128
    if not op.any():
        return 0
    trans = ~op
    count = np.zeros(op.shape, dtype=np.uint8)
    for dy, dx in DIRS:
        count += _hits_within(op, dy, dx, dist).astype(np.uint8)
    pocket = trans & (count >= sides)
    if not pocket.any():
        return 0
    # Keep only compact, fist-sized pocket components.  A grip curl fills a small
    # roughly-square blob; the arm<->torso gap and neck gap are tall thin strips
    # (large extent, low bbox fill) -- those are rejected so we never web limbs.
    lbl, nl = ndimage.label(pocket, structure=np.ones((3, 3)))
    if nl:
        for k in range(1, nl + 1):
            comp = lbl == k
            ys, xs = np.where(comp)
            h = ys.max() - ys.min() + 1
            w = xs.max() - xs.min() + 1
            area = comp.sum()
            compact = area / float(h * w)
            if (area > max_pocket or max(h, w) > max_extent
                    or compact < min_fill):
                pocket[comp] = False
    if not pocket.any():
        return 0
    # Inpaint from BODY METAL, not the dark anti-aliased rim: the nearest opaque
    # pixel to a concave notch is the black outline, which leaves a dark smudge in
    # the fist.  Build a "metal" mask = opaque AND luma above --metal-luma (drops
    # the outline/shadow band) and pull colour from the nearest metal pixel, so
    # the filled curl is clean steel.  Fall back to the full opaque mask if the
    # luma gate leaves nothing.
    rgb = arr[:, :, :3].astype(np.float32)
    luma = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    metal = op & (luma > metal_luma)
    if not metal.any():
        metal = op
    idx = ndimage.distance_transform_edt(~metal, return_distances=False, return_indices=True)
    src = arr[idx[0], idx[1]]
    arr[pocket] = src[pocket]
    arr[pocket, 3] = 255
    return int(pocket.sum())


def process(path, dist, sides, max_pocket, metal_luma, dry):
    im = np.array(Image.open(path).convert('RGBA'))
    n = im.shape[1] // FRAME
    total = 0; fr = []
    for i in range(n):
        sl = im[:, i * FRAME:(i + 1) * FRAME]
        f = fill_frame(sl, dist, sides, max_pocket, metal_luma=metal_luma)
        if f:
            fr.append((i, f)); total += f
    print(f"{'(dry) ' if dry else ''}{path}: filled {total}px pockets  {fr}")
    if total and not dry:
        Image.fromarray(im).save(path)


if __name__ == '__main__':
    a = sys.argv[1:]
    dist = 12; sides = 6; max_pocket = 180; metal_luma = 80; dry = False; paths = []
    i = 0
    while i < len(a):
        t = a[i]
        if t == '--dist': dist = int(a[i + 1]); i += 2
        elif t == '--sides': sides = int(a[i + 1]); i += 2
        elif t == '--max-pocket': max_pocket = int(a[i + 1]); i += 2
        elif t == '--metal-luma': metal_luma = int(a[i + 1]); i += 2
        elif t == '--dry-run': dry = True; i += 1
        else: paths.append(t); i += 1
    for p in paths:
        process(p, dist, sides, max_pocket, metal_luma, dry)
