/* THE CAPE-ON-EVERY-POSE CONTACT SHEET (v2.3.2129).
 *
 * Owner: "yes do the free 8 but send me previews."
 *
 * mp-cape photographs each real-body pose as a FULL frame and writes
 * out/cape-poses.json with the character's drawn position in each -- caped and
 * bare. This crops them to the figure and lays them out in two rows, so the
 * answer to "does a cape look right on a crouch" is one picture instead of ten
 * phone screenshots. The bare row is the half that makes it judgeable: a
 * cape-on picture shows that the cape is there and cannot show what it is
 * covering.
 *
 * WHY THE CROP IS NOT DONE IN THE BROWSER. A page.screenshot clip has to sit
 * inside the viewport, so it must be clamped -- and clamping is what put the
 * character in the corner of the first previews with the side a cape hangs off
 * outside the frame. Cropping here can run past the edge and pad, so the
 * figure is centred whether or not he is standing near one. (The colour-search
 * crop tried before that was worse: "reddish" found the BANK's brown door in
 * all five pictures.)
 *
 * Run: node tools/qa/mp/run.mjs cape && node tools/qa/cape-pose-sheet.mjs
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const OUT = 'tools/qa/mp/out';
const idx = JSON.parse(fs.readFileSync(`${OUT}/cape-poses.json`, 'utf8'));

/* Crop box in CSS pixels around the FOOT position the renderer reported.
   Tall enough to hold the whole figure with headroom, wide enough that a cape
   swinging out to one side is inside the picture rather than implied by it. */
const W = 168, H = 176, FOOT_FROM_BOTTOM = 34;
const ZOOM = 2;                    /* pixel art: nearest-neighbour, no blur */

const py = `
import json, sys
from PIL import Image, ImageDraw
idx = json.load(open('${OUT}/cape-poses.json'))

def crop(path, at):
    d = at.get('dpr') or 1
    im = Image.open(path).convert('RGB')
    w, h = int(${W} * d), int(${H} * d)
    x0 = int(round(at['cx'] * d - w / 2))
    y0 = int(round(at['cy'] * d - h + ${FOOT_FROM_BOTTOM} * d))
    # crop() pads with black outside the image, which is what lets the figure
    # stay centred when he is standing near an edge.
    return im.crop((x0, y0, x0 + w, y0 + h))

cells = []
for e in idx:
    if not e.get('at'):
        print('skip (no position):', e['tag']); continue
    caped = crop(e['shot'], e['at'])
    bare = crop(e['bare'], e['bareAt']) if e.get('bare') and e.get('bareAt') else None
    cells.append((e['label'], caped, bare))
if not cells:
    sys.exit('no cells -- run: node tools/qa/mp/run.mjs cape')

cw, ch = cells[0][1].size
Z = ${ZOOM}
BAR, ROW = 34, 26
rows = 2 if any(c[2] for c in cells) else 1
H_ = BAR + rows * (ch * Z + ROW)
sheet = Image.new('RGB', (cw * Z * len(cells), H_), (22, 24, 28))
d = ImageDraw.Draw(sheet)
for i, (label, caped, bare) in enumerate(cells):
    x = i * cw * Z
    d.text((x + 10, 12), label, fill=(240, 230, 205))
    d.text((x + 10, BAR + 6), 'with cape', fill=(196, 150, 150))
    sheet.paste(caped.resize((cw * Z, ch * Z), Image.NEAREST), (x, BAR + ROW))
    if bare:
        y2 = BAR + ROW + ch * Z
        d.text((x + 10, y2 + 6), 'without', fill=(150, 165, 185))
        sheet.paste(bare.resize((cw * Z, ch * Z), Image.NEAREST), (x, y2 + ROW))
    if i: d.line([(x, 0), (x, H_)], fill=(70, 74, 82))
out = '${OUT}/cape-poses-sheet.png'
sheet.save(out)
print('wrote', out, sheet.size)
`;
execFileSync('python3', ['-c', py], { stdio: 'inherit' });
