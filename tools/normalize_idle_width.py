"""Normalize an IDLE facing's armored BODY width to match the JOG armor's bulk
(arms-at-side), leaving the helmet at native width (so the helmet never
distorts).

WHY jog and not the bare body: the idle armor was drawn THINNER than the jog
armor.  The previous version normalized to the BARE body width, which stripped
all the armor bulk and left the idle reading too narrow / stretched next to the
running figure.  The jog sheets carry the correct armored bulk -- so they are the
reference.

WHY the NARROWEST jog frame (jMin) and not the median: the jog torso-band width
is inflated by ARM SWING in the side/3-4 views (east swings 52..105 across the
cycle).  The median would balloon those dirs.  jMin == the frame with the arms
tucked == the true armored body width.  (Same logic derive_armor_scales uses to
dodge leg-spread-confounded jog HEIGHT.)

Clamp wfac >= 1.0: never NARROW an idle (southwest is already at jog bulk).

Method: measure the body width (max width in the torso band 0.35-0.60 of height)
for the composited idle gear; target = max(gear_bw, jMin jog width for this dir);
wfac = target/gear_bw; horizontally scale the gear BELOW the neck (chest body +
whole legs) about the figure centre by wfac via an affine transform; keep the
helmet rows untouched.

Run BEFORE fill_gear_gaps.py (so the chain belt is laid fresh at the widened gap,
not stretched with the body).

Usage: python tools/normalize_idle_width.py <dir>
"""
import sys
import numpy as np
from PIL import Image

FRAME = 256
HEAD_FRAC = 0.21
TORSO = (0.35, 0.60)
d = sys.argv[1]
chest_p = f'public/sprites/gear/chest/steelplate/stand-{d}.png'
legs_p = f'public/sprites/gear/legs/steelgreaves/stand-{d}.png'
ch = np.array(Image.open(chest_p).convert('RGBA'))[:, :FRAME].copy()
lg = np.array(Image.open(legs_p).convert('RGBA'))[:, :FRAME].copy()


def band_w(mask, top, h):
    lo, hi = top + int(TORSO[0] * h), top + int(TORSO[1] * h)
    ws = [int(mask[r].sum()) for r in range(lo, hi) if mask[r].any()]
    return max(ws) if ws else 1


def fig_w(a, b):
    G = (a[:, :, 3] > 20) | (b[:, :, 3] > 20)
    ys = np.where(G.any(1))[0]
    if not len(ys):
        return None
    cr = int(ys.min()); H = int(ys.max()) - cr
    return band_w(G, cr, H)


# jMin: narrowest jog torso width for this dir (arms-at-side armored bulk).
jch = Image.open(f'public/sprites/gear/chest/steelplate/jog-{d}.png').convert('RGBA'); cn = jch.width // FRAME
jlg = Image.open(f'public/sprites/gear/legs/steelgreaves/jog-{d}.png').convert('RGBA'); ln = jlg.width // FRAME
jws = []
for fr in range(max(cn, ln)):
    a = np.array(jch.crop(((fr % cn) * FRAME, 0, (fr % cn + 1) * FRAME, FRAME)))
    b = np.array(jlg.crop(((fr % ln) * FRAME, 0, (fr % ln + 1) * FRAME, FRAME)))
    w = fig_w(a, b)
    if w:
        jws.append(w)
jmin = int(np.min(jws))

G = (ch[:, :, 3] > 20) | (lg[:, :, 3] > 20)
ys = np.where(G.any(1))[0]
crown = int(ys.min()); H = int(ys.max()) - crown
cx = int(np.median(np.where(G)[1]))
neck = crown + int(HEAD_FRAC * H)
gear_bw = band_w(G, crown, H)

target = max(gear_bw, jmin)
wfac = target / gear_bw


def widen(arr, top):
    inv = 1.0 / wfac
    wide = np.array(Image.fromarray(arr, 'RGBA').transform(
        (FRAME, FRAME), Image.AFFINE, (inv, 0, cx * (1 - inv), 0, 1, 0),
        resample=Image.BILINEAR))
    out = arr.copy()
    out[top:] = wide[top:]
    return out


Image.fromarray(widen(ch, neck), 'RGBA').save(chest_p)
Image.fromarray(widen(lg, 0), 'RGBA').save(legs_p)
print(f'stand-{d}: body width x{wfac:.2f} (gear {gear_bw} -> jog-min {target})')
