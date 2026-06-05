"""Normalize an IDLE facing's armored BODY width to match the bare body's
per-angle width, leaving the helmet at native width (so the helmet never
distorts).  Bare-body silhouettes already have the correct width per angle
(front wide, 3/4 medium, side narrow), so they're the reference.

Method: measure the body width (max width in the torso band 0.35-0.60 of height)
for both the composited gear and the bare body; wfac = bare/gear; horizontally
scale the gear BELOW the neck (chest body + whole legs) about the figure centre
by wfac via an affine transform; keep the helmet rows untouched.

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
bd = np.array(Image.open(f'public/sprites/player/stand-{d}.png').convert('RGBA'))[:, :FRAME]


def band_w(mask, top, h):
    lo, hi = top + int(TORSO[0] * h), top + int(TORSO[1] * h)
    ws = [int(mask[r].sum()) for r in range(lo, hi) if mask[r].any()]
    return max(ws) if ws else 1


G = (ch[:, :, 3] > 20) | (lg[:, :, 3] > 20)
ys = np.where(G.any(1))[0]
crown = int(ys.min()); H = int(ys.max()) - crown
cx = int(np.median(np.where(G)[1]))
neck = crown + int(HEAD_FRAC * H)
gear_bw = band_w(G, crown, H)

bop = bd[:, :, 3] > 20
bys = np.where(bop.any(1))[0]
bcrown = int(bys.min()); bH = int(bys.max()) - bcrown
bare_bw = band_w(bop, bcrown, bH)

wfac = bare_bw / gear_bw


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
print(f'stand-{d}: body width x{wfac:.2f} (gear {gear_bw} -> bare {bare_bw})')
