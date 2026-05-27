"""Build the 5 player attack sprite sheets from the user's pair of
fist-windup + fist-strike PNGs per direction.  Source images live at
the repo root with UUID filenames (uploaded via GitHub web UI); this
script white-keys the background, trims to the character, scales to a
consistent character height, and stitches windup + strike into a
horizontal 2-frame strip named attack-<dir>.png that playerSprites.js
picks up via its 'attack' pose entry.

Mapping (per visual inspection):
  east      windup 0D068A9C  strike 1E265426
  north     windup 9C78C86C  strike CB2B66CA
  south     windup 982972E3  strike 4F61C7E9
  northeast windup B9D7D86E  strike 2F74AC8E
  southwest windup A0DC47BC  strike 7475A0C4

Output: public/sprites/player/attack-<dir>.png  (5 files, 512x256 each)
"""
import os
from PIL import Image, ImageOps
import numpy as np
from scipy.ndimage import label as cc_label

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(REPO, 'public', 'sprites', 'player')
FRAME = 256
TARGET_H = 230            # how tall the character should be inside a 256 frame
BOTTOM_PAD = 8            # gap between character feet and bottom of frame
WHITE_THRESH = 235        # rgb >= this → candidate background

# Each direction's pair is (windup, strike) where each entry is
# (uuid, mirror) — mirror=True flips the source frame horizontally
# before composition.  This lets us pull a mirror-axis source (e.g. a
# West-facing PNG) into the East slot by flipping it, rather than
# requiring the artist to deliver E and W separately.
#
# Mapping notes from the user's frame-by-frame labelling:
#   - 1E265426 was labelled E2 but actually depicts a SW pose:
#     used as the SW strike unchanged.
#   - B9D7D86E was labelled SW1 but actually depicts a SE pose:
#     mirrored to become the SW windup.
#   - 7475A0C4 was labelled SW2 but actually depicts a W pose:
#     mirrored to become the E strike.
PAIRS = {
    # v2.3.241: mirror flags swapped back to the v2.3.239 layout per
    # user "the mirrors need to be swapped" — in-game SW/SE strike
    # were inverted with the v2.3.240 flip.  Keeping each pair's
    # mirror flag on the strike frame (or windup, mutatis mutandis)
    # matches what the user labelled as correct on the source-frame
    # review.
    # v2.3.243: east strike mirror flipped back off per user — frame 1
    # (windup) is correct; frame 2 (strike) reads better unmirrored.
    'east': (
        ('0D068A9C-DFC7-4AFC-8A7F-A89C381B7946', False),
        ('7475A0C4-4C37-402B-A469-8F29CD3A1BDA', False),
    ),
    'north': (
        ('9C78C86C-4C3C-48BD-8AC1-F2F0B059A6AB', False),
        ('CB2B66CA-05D0-4AA4-8556-B7FD7657F460', False),
    ),
    'northeast': (
        ('A0DC47BC-B078-4629-84A2-0701E3175B26', False),
        ('2F74AC8E-8F87-424E-92B1-EC2B7A0760F7', False),
    ),
    'south': (
        ('982972E3-BD88-40FD-B212-8013B1B3F0FD', False),
        ('4F61C7E9-F143-466E-868F-828D177DD4FE', False),
    ),
    # Per user: only east/west uses the build-time mirror trick.
    # SW source frames go in unmodified — if the SE direction looks
    # wrong, that's a code-level "don't mirror SW for SE" change, not
    # a build-time flip.
    'southwest': (
        ('B9D7D86E-AEB8-4E35-B0E3-385AAE463EEC', False),
        ('1E265426-853D-4AB2-B50D-C9A8E2F25963', False),
    ),
}


def key_and_trim(uuid):
    """White-key the background while preserving interior white regions
    that look like eyes (small + in the upper part of the figure).
    Edge-connected whites and interior whites below the head line are
    both dropped — the latter removes the armpit / under-arm gaps that
    used to bleed white when the character had a raised fist."""
    img = Image.open(os.path.join(REPO, uuid + '.png')).convert('RGBA')
    arr = np.array(img)
    white_mask = (
        (arr[..., 0] >= WHITE_THRESH)
        & (arr[..., 1] >= WHITE_THRESH)
        & (arr[..., 2] >= WHITE_THRESH)
    )

    # Pass 1: edge-connected white → outside.
    labeled, _ = cc_label(white_mask)
    edge_labels = set()
    edge_labels.update(np.unique(labeled[0, :]).tolist())
    edge_labels.update(np.unique(labeled[-1, :]).tolist())
    edge_labels.update(np.unique(labeled[:, 0]).tolist())
    edge_labels.update(np.unique(labeled[:, -1]).tolist())
    edge_labels.discard(0)
    outside = np.isin(labeled, list(edge_labels))
    arr[outside, 3] = 0

    # Pass 2: kill any remaining interior white below the head line.
    # The head is the upper ~35 % of the character's vertical extent;
    # eyes live there.  Anything below that height is armpit / hand-
    # gap / clothing crevice and should be transparent too.
    nonzero_ys = np.where(arr[..., 3] > 0)[0]
    if nonzero_ys.size:
        top = int(nonzero_ys.min())
        bottom = int(nonzero_ys.max())
        head_line = top + int((bottom - top) * 0.35)
        remaining = white_mask & (arr[..., 3] > 0)
        if remaining.any():
            rem_lab, _ = cc_label(remaining)
            for blob_id in np.unique(rem_lab):
                if blob_id == 0:
                    continue
                ys = np.where(rem_lab == blob_id)[0]
                if ys.size == 0:
                    continue
                if int(ys.mean()) > head_line:
                    arr[rem_lab == blob_id, 3] = 0

    img = Image.fromarray(arr, 'RGBA')
    bbox = img.getbbox()
    if not bbox:
        return None, None
    return img.crop(bbox), bbox


# Skin retint: match the stand-south skin distribution (mean + std)
# so the attack sheets read as the same character.  Wider classifier
# than tools/retint_hit_skin.py's because the attack source pushed
# some highlight pixels past R≥240 — those used to escape the shift
# and kept the post-retint skin reading too bright.
SKIN_TARGET_MEAN = np.array([193, 125, 69], dtype=float)
SKIN_TARGET_STD  = np.array([16, 10, 6],   dtype=float)


def _skin_mask(rgb_int, alpha):
    """Skin classifier — R > G > B with R in 120..252 and G in 70..180.
    The upper bound was 240 originally; bumped to 252 so the brightest
    highlights also get shifted (otherwise they bypass the retint and
    keep south reading too warm)."""
    R, G, B = rgb_int[..., 0], rgb_int[..., 1], rgb_int[..., 2]
    return (
        (alpha > 200)
        & (R > G) & (G > B)
        & (R > 120) & (R < 252)
        & (G > 70) & (G < 180)
    )


def retint_skin_inplace(sheet_img):
    """Iterative per-frame skin retint.  Each pass classifies the
    current skin pixels, computes the mean delta to SKIN_TARGET_MEAN,
    and shifts the masked pixels by that delta.  After the shift some
    formerly-classified pixels fall below the R>120 cutoff and stop
    being counted toward the mean, which leaves the visible bright
    highlights still warmer than target.  Running the shift 3 times
    converges the post-classification mean onto the target so the
    visible skin actually matches stand/jog.  Conservative classifier
    (R>120, R<252, G>70, G<180) keeps olive pants out of the mask."""
    arr = np.array(sheet_img)
    h, w = arr.shape[:2]
    n_frames = max(1, w // h)
    rgb = arr[..., :3].astype(float)
    alpha = arr[..., 3]
    for i in range(n_frames):
        x0, x1 = i * h, (i + 1) * h
        sub_rgb = rgb[:, x0:x1]
        sub_alpha = alpha[:, x0:x1]
        for _pass in range(3):
            mask = _skin_mask(sub_rgb.astype(int), sub_alpha)
            if mask.sum() < 50:
                break
            cur_mean = sub_rgb[mask].mean(axis=0)
            sub_rgb[mask] += SKIN_TARGET_MEAN - cur_mean
            np.clip(sub_rgb, 0, 255, out=sub_rgb)
        rgb[:, x0:x1] = sub_rgb
    arr[..., :3] = rgb.astype(np.uint8)
    return Image.fromarray(arr, 'RGBA')


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for direction, entries in PAIRS.items():
        processed = []
        for uuid, mirror in entries:
            img, box = key_and_trim(uuid)
            if img is None:
                processed.append((None, None, mirror))
                continue
            if mirror:
                img = ImageOps.mirror(img)
            processed.append((img, box, mirror))
        if any(p[0] is None for p in processed):
            print(f'SKIP {direction}: missing source after key')
            continue

        # Scale both frames by the same factor so the windup and strike
        # poses read at a consistent character size.  Use the taller of
        # the two bboxes as the reference so the bigger pose fits 230 px.
        union_h = max(p[1][3] - p[1][1] for p in processed)
        scale = TARGET_H / union_h

        sheet = Image.new('RGBA', (FRAME * 2, FRAME), (0, 0, 0, 0))
        for i, (frame, _box, _mirror) in enumerate(processed):
            new_w = max(1, round(frame.width * scale))
            new_h = max(1, round(frame.height * scale))
            scaled = frame.resize((new_w, new_h), Image.LANCZOS)
            ox = i * FRAME + (FRAME - new_w) // 2
            oy = FRAME - new_h - BOTTOM_PAD
            sheet.paste(scaled, (ox, oy), scaled)

        sheet = retint_skin_inplace(sheet)
        out = os.path.join(OUT_DIR, f'attack-{direction}.png')
        sheet.save(out, optimize=True)
        print(f'WROTE {out}  (scale={scale:.3f}, union_h={union_h})')


if __name__ == '__main__':
    main()
