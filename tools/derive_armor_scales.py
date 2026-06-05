"""Derive the IDLE render scales (BODY_DIR_SCALE.stand) from the armored sprites
so every idle renders at ONE consistent height that matches the jog.

Idle is a clean pose, so its full height = the character size; normalize all
idles to a single target.  Jog full height varies with leg-spread (not size), so
we DON'T match per-direction (that would inject the jog's leg-spread into the
idle); instead anchor the uniform idle target to 1.063 x the MEDIAN jog rendered
height (the user's validated standing-taller ratio, SW jog==idle => 0.941).

Then apply the user's manual tweaks (south x0.97, north x0.98).  Prints the map
to paste into src/rendering/systems/entityRenderer.js.

Usage: python tools/derive_armor_scales.py
"""
import numpy as np
from PIL import Image

LOCAL = 0.3515625
JOG = {'south': 1.000, 'east': 1.181, 'north': 1.050, 'northeast': 1.126, 'southwest': 1.000}
TWEAK = {'south': 0.97, 'north': 0.98}
RATIO = 1.063
DIRS = ['south', 'east', 'north', 'northeast', 'southwest']


def fullH(pose, d):
    ch = Image.open(f'public/sprites/gear/chest/steelplate/{pose}-{d}.png').convert('RGBA'); cn = ch.width // 256
    lg = Image.open(f'public/sprites/gear/legs/steelgreaves/{pose}-{d}.png').convert('RGBA'); ln = lg.width // 256
    n = max(cn, ln); hs = []
    for fr in range(n):
        G = (np.array(ch.crop(((fr % cn) * 256, 0, (fr % cn + 1) * 256, 256)))[:, :, 3] > 20) | \
            (np.array(lg.crop(((fr % ln) * 256, 0, (fr % ln + 1) * 256, 256)))[:, :, 3] > 20)
        ys = np.where(G.any(1))[0]
        if len(ys):
            hs.append(ys.max() - ys.min() + 1)
    return float(np.median(hs))


jog_render = {d: fullH('jog', d) * JOG[d] * LOCAL for d in DIRS}
target = RATIO * float(np.median(list(jog_render.values())))   # uniform idle render height
print(f"median jog render H = {np.median(list(jog_render.values())):.1f}; idle target = {target:.1f}\n")
sc = {}
print(f"{'dir':<11}{'idleH':>6}{'jogRend':>8}{'scale':>7}{'rendH':>7}")
for d in DIRS:
    iH = fullH('stand', d)
    s = target / (iH * LOCAL) * TWEAK.get(d, 1.0)
    sc[d] = s
    print(f"{d:<11}{iH:>6.0f}{jog_render[d]:>8.1f}{s:>7.3f}{iH*s*LOCAL:>7.1f}")
print("\nstand: { " + ", ".join(f"{d}: {sc[d]:.3f}" for d in DIRS) + " },")
