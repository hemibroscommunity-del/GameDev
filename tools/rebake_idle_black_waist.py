"""Rebake ONE idle (stand) facing's armored chest+legs from the re-drawn source,
with a clean BLACK WAIST and nothing else -- no chain belt, no enclosed-hole
flood fill (which used to spill black into the feet/hands).

The source mannequin sheet draws the waist gap as GREEN (exposed mannequin).
Instead of the old fill_gear_gaps chain/flood machinery, we simply RECOLOR the
green to BLACK before extraction, so the waist comes out black and the extractor
keeps it as part of the figure.  Green only ever appears at the waist (+ minor
neck/shoulder gaps in 3/4 views), never at the feet -- so no spill.

Steps:
  1. recolor green -> black in the source (dilated 2px to take the AA fringe).
  2. extract chest (band 0.0-0.70) and legs (0.55-1.0) via the mannequin path.
  3. despill leftover magenta/purple AA fringe (R,B clearly > G; spares neutral
     steel where R==G==B).
  4. fill any remaining enclosed transparent holes ABOVE 0.88 of height (neck /
     waist slivers) with black -- never the feet region.

Body render scale is uniform (BODY_DIR_SCALE.stand, scale.x==scale.y) so the
drawn proportions are preserved; this tool only changes gear CONTENT.

Usage: python tools/rebake_idle_black_waist.py <dir> <source_mannequin_png>
"""
import sys, subprocess
import numpy as np
from PIL import Image
from scipy import ndimage

FRAME = 256
d = sys.argv[1]
src = sys.argv[2]
SCALE_MUL = 1.12

# 1) recolor green -> black
a = np.array(Image.open(src).convert('RGB'))
R, G, B = a[:, :, 0].astype(int), a[:, :, 1].astype(int), a[:, :, 2].astype(int)
green = (G > R + 25) & (G > B + 25) & (G > 60)
green = ndimage.binary_dilation(green, iterations=2)
a[green] = [0, 0, 0]
recolored = f'tools/_recolor_{d}.png'
Image.fromarray(a, 'RGB').save(recolored)

# 2) extract chest + legs (mannequin path; no chain / gap-fill afterwards)
subprocess.run([sys.executable, 'tools/import_gear_from_sheet.py', recolored,
                'chest', 'steelplate', 'stand', d, '50', '0.0', '0.70', '0', '1', str(SCALE_MUL), '0'],
               check=True, capture_output=True)
subprocess.run([sys.executable, 'tools/import_gear_from_sheet.py', recolored,
                'legs', 'steelgreaves', 'stand', d, '50', '0.55', '1.0', '0', '1', str(SCALE_MUL), '0'],
               check=True, capture_output=True)

cp = f'public/sprites/gear/chest/steelplate/stand-{d}.png'
lp = f'public/sprites/gear/legs/steelgreaves/stand-{d}.png'
ch = np.array(Image.open(cp).convert('RGBA'))
lg = np.array(Image.open(lp).convert('RGBA'))

# 3) despill magenta/purple AA fringe on both sheets (any brightness)
for arr in (ch, lg):
    r, g, b, al = [arr[:, :, k].astype(int) for k in range(4)]
    fringe = (al > 0) & (r - g > 15) & (b - g > 15) & (np.abs(r - b) < 25)
    arr[fringe] = [0, 0, 0, 0]

# 4) fill enclosed holes above 0.88 of height (neck / waist slivers) -> black
op = (ch[:, :, 3] > 20) | (lg[:, :, 3] > 20)
ys = np.where(op.any(1))[0]
cr, H = int(ys.min()), int(ys.max()) - int(ys.min())
free = ~op
lbl, _ = ndimage.label(free)
border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1]); border.discard(0)
holes = free & ~np.isin(lbl, list(border))
holes[cr + int(0.88 * H):, :] = False
ch[holes] = [0, 0, 0, 255]

Image.fromarray(ch, 'RGBA').save(cp)
Image.fromarray(lg, 'RGBA').save(lp)
print(f'stand-{d}: black-waist rebake done (green {int(green.sum())}px -> black, '
      f'{int(holes.sum())}px holes filled, fringe despilled)')
