#!/usr/bin/env bash
# regen_attack_sprites.sh
# Extract attack-animation frames from a Grok Imagine video and key out the
# (muddy, non-pure) magenta background using a sampled-bg tolerant key + despill.
#
# Why not a plain ffmpeg colorkey on #FF00FF: the generated clips come back as a
# muddy ~#C9138E magenta that drifts a few values per frame and fades in from
# near-white on the first frames. A fixed pure-magenta key leaves a halo or
# misses it. This samples the actual bg from corner pixels and keys with
# tolerance + despill, matching the "varied magenta shades" resource recipe.
#
# Usage:
#   tools/regen_attack_sprites.sh <video.mp4> <out_dir> [drop_ranges] [tol]
#     drop_ranges : comma list of frames/ranges to skip, e.g. "1-2,102-107"
#                   (white intro frames + any stray-weapon frames)
#     tol         : key tolerance (default 62). Raise if a pink halo remains,
#                   lower if it eats into the character.
#
# Produces in <out_dir>:
#   frames/fNNN.png   - raw extracted frames
#   keyed/fNNN.png    - background removed (transparent), intro/drop frames omitted
#   strip.png         - all kept keyed frames tiled left-to-right (over gray)
#
# NOTE: this does NOT yet crop to the waist or pick the final ~6 strip frames --
# those are set per-direction once a clean clip exists. See the TODO at the end.

set -euo pipefail

VIDEO="${1:?usage: regen_attack_sprites.sh <video.mp4> <out_dir> [drop_ranges] [tol]}"
OUT="${2:?missing out_dir}"
DROP="${3:-}"
TOL="${4:-62}"

mkdir -p "$OUT/frames" "$OUT/keyed"

echo "[1/3] extracting frames from $VIDEO"
ffmpeg -v error -y -i "$VIDEO" "$OUT/frames/f%03d.png"
N=$(ls "$OUT/frames" | wc -l)
echo "      $N frames"

echo "[2/3] sampling bg + keying (tol=$TOL, drop=[$DROP])"
python - "$OUT" "$DROP" "$TOL" <<'PY'
import sys, os, glob
from PIL import Image

out, drop_arg, tol = sys.argv[1], sys.argv[2], float(sys.argv[3])
fdir = os.path.join(out, "frames")
kdir = os.path.join(out, "keyed")
files = sorted(glob.glob(os.path.join(fdir, "f*.png")))

# parse drop ranges like "1-2,102-107"
drop = set()
for part in filter(None, (p.strip() for p in drop_arg.split(","))):
    if "-" in part:
        a, b = part.split("-"); drop.update(range(int(a), int(b) + 1))
    else:
        drop.add(int(part))

def dist(p, q):
    return ((p[0]-q[0])**2 + (p[1]-q[1])**2 + (p[2]-q[2])**2) ** 0.5

# sample bg from corners of several clean (non-dropped) frames
sample = []
for f in files:
    n = int(os.path.basename(f)[1:4])
    if n in drop:
        continue
    im = Image.open(f).convert("RGB"); px = im.load(); w, h = im.size
    for x, y in [(3,3),(w-4,3),(3,h-4),(w-4,h-4),(w//2,3)]:
        sample.append(px[x, y])
    if len(sample) >= 40:
        break
bg = tuple(sum(c[i] for c in sample)//len(sample) for i in range(3))
print("      sampled bg = %r (#%02X%02X%02X)" % (bg, *bg))

kept = []
for f in files:
    n = int(os.path.basename(f)[1:4])
    if n in drop:
        continue
    im = Image.open(f).convert("RGB"); px = im.load(); w, h = im.size
    o = Image.new("RGBA", (w, h), (0,0,0,0)); po = o.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]; dd = dist((r,g,b), bg)
            if dd < tol:
                po[x, y] = (0,0,0,0)                  # background -> transparent
            elif dd < tol + 53:                       # fringe -> keep but despill magenta
                if r > g and b > g:
                    r = min(r, int(g + (r-g)*0.4))
                    b = min(b, int(g + (b-g)*0.4))
                po[x, y] = (r, g, b, 255)
            else:
                po[x, y] = (r, g, b, 255)
    o.save(os.path.join(kdir, os.path.basename(f)))
    kept.append(o)

# contact strip over gray so any residual halo is visible
if kept:
    cell = 160; gray = (136,136,136)
    strip = Image.new("RGB", (cell*len(kept), cell), gray)
    for i, k in enumerate(kept):
        t = Image.new("RGBA", (cell, cell), gray+(255,))
        t.alpha_composite(k.resize((cell, cell), Image.NEAREST))
        strip.paste(t.convert("RGB"), (i*cell, 0))
    strip.save(os.path.join(out, "strip.png"))
    print("      kept %d frames -> keyed/ + strip.png" % len(kept))
PY

echo "[3/3] done -> $OUT/keyed/  and  $OUT/strip.png"

# TODO (per-direction, once a clean clip exists):
#   - set the waist crop line so legs come from the locomotion layer
#   - subsample the kept frames down to the final ~5-7 strip frames
#   - assemble the horizontal sprite strip at the in-game cell size
