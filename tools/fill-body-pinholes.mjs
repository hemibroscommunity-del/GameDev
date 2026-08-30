/* ═══ FILL THE PINHOLES IN THE BODY SHEETS (v2.3.2144) ═══
 *
 * Owner: "There are some transparent south idle face pixels."
 *
 * A pinhole is a fully ENCLOSED transparent speck inside the figure. Because
 * the body sheet is the bottom layer of the character -- traits, gear and the
 * bake all draw OVER it -- a pinhole there is literally the ground showing
 * through him. The player sprite changelog already names this exact symptom:
 * "v2.3.1456: jog body/leg sheets pinhole-filled (enclosed transparent
 * speckles -- the 'background through the face/body' dots)".
 *
 * This is the JS half of tools/fill_interior_holes.py, which does the same job
 * and cannot run here (it needs scipy). Same rules, deliberately:
 *   - opaque is alpha > 128, the Python tool's own threshold;
 *   - a hole must not reach the border of ITS OWN FRAME (4-connectivity), so
 *     every real gap that opens to the silhouette -- between the legs, under
 *     an arm, inside a bent elbow -- is excluded by construction;
 *   - filled pixels take alpha 255 and the RGB of the nearest opaque pixel.
 *
 * ONE RULE IS TIGHTER. The Python default keeps anything up to 400px, which is
 * far too loose to run unattended over every sheet: measured across all 87 body
 * sheets the enclosed regions are sharply bimodal -- 1311 components of 12px or
 * less (3282px in total, and 676 of them are a SINGLE pixel), then a long tail
 * of 100-2700px pockets that are plainly real geometry. MAX defaults to 12, the
 * knee of that distribution. A speck is a defect; a 2681px pocket is a gap
 * between two limbs and filling it would weld them together.
 *
 * Run: node tools/fill-body-pinholes.mjs [--write] [--max N] [glob ...]
 * Dry by default -- this edits the artist's sheets in place.
 */
import { readFileSync, writeFileSync, globSync } from 'node:fs';
import { decode, encode } from './png.mjs';

const args = process.argv.slice(2);
const write = args.includes('--write');
const mi = args.indexOf('--max');
const MAX = mi >= 0 ? parseInt(args[mi + 1], 10) : 12;
const pats = args.filter((a, i) => !a.startsWith('--') && !(mi >= 0 && i === mi + 1));
const PATTERNS = pats.length ? pats
  : ['public/sprites/player/*.png', 'public/sprites/player-naked/*.png'];

function fillSheet(path) {
  const im = decode(readFileSync(path));
  const { width: W, height: H, data: d } = im;
  const FR = H;
  const frames = Math.max(1, Math.round(W / FR));
  let filled = 0;
  const hitFrames = [];
  for (let f = 0; f < frames; f++) {
    const at = (x, y) => (y * W + f * FR + x) * 4;
    const bg = new Uint8Array(FR * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < FR; x++) bg[y * FR + x] = d[at(x, y) + 3] <= 128 ? 1 : 0;
    /* Reachable-from-the-frame-border background. */
    const open = new Uint8Array(FR * H);
    const st = [];
    const push = (x, y) => {
      if (x < 0 || x >= FR || y < 0 || y >= H) return;
      const i = y * FR + x;
      if (bg[i] && !open[i]) { open[i] = 1; st.push(i); }
    };
    for (let x = 0; x < FR; x++) { push(x, 0); push(x, H - 1); }
    for (let y = 0; y < H; y++) { push(0, y); push(FR - 1, y); }
    while (st.length) {
      const i = st.pop(); const y = (i / FR) | 0; const x = i - y * FR;
      push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
    }
    /* Each enclosed component, small ones only. */
    const done = new Uint8Array(FR * H);
    let frameFilled = 0;
    for (let y0 = 0; y0 < H; y0++) {
      for (let x0 = 0; x0 < FR; x0++) {
        const i0 = y0 * FR + x0;
        if (!bg[i0] || open[i0] || done[i0]) continue;
        const px = []; const q = [i0]; done[i0] = 1;
        while (q.length) {
          const i = q.pop(); const y = (i / FR) | 0; const x = i - y * FR;
          px.push([x, y]);
          for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
            if (nx < 0 || nx >= FR || ny < 0 || ny >= H) continue;
            const ni = ny * FR + nx;
            if (bg[ni] && !open[ni] && !done[ni]) { done[ni] = 1; q.push(ni); }
          }
        }
        if (px.length > MAX) continue;      /* real geometry, leave it */
        for (const [x, y] of px) {
          /* Nearest opaque pixel by expanding rings. The components are a
             handful of pixels, so this stays cheap and needs no distance
             transform (which is the only thing scipy was there for). */
          let best = null;
          for (let r = 1; r <= 6 && !best; r++) {
            for (let dy = -r; dy <= r && !best; dy++) {
              for (let dx = -r; dx <= r && !best; dx++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                const nx = x + dx; const ny = y + dy;
                if (nx < 0 || nx >= FR || ny < 0 || ny >= H) continue;
                if (!bg[ny * FR + nx]) best = at(nx, ny);
              }
            }
          }
          if (best == null) continue;
          const o = at(x, y);
          d[o] = d[best]; d[o + 1] = d[best + 1]; d[o + 2] = d[best + 2]; d[o + 3] = 255;
          frameFilled += 1;
        }
      }
    }
    if (frameFilled) { filled += frameFilled; hitFrames.push(`f${f}:${frameFilled}`); }
  }
  if (filled && write) writeFileSync(path, encode({ width: W, height: H, data: d }));
  return { filled, hitFrames };
}

const files = [];
for (const p of PATTERNS) { try { for (const f of globSync(p)) files.push(f); } catch (e) { /* none */ } }
files.sort();

let total = 0; let sheets = 0;
for (const f of files) {
  const { filled, hitFrames } = fillSheet(f);
  if (!filled) continue;
  sheets += 1; total += filled;
  console.log(`${write ? 'filled' : 'would fill'} ${String(filled).padStart(4)}px  ${f}  [${hitFrames.slice(0, 8).join(' ')}${hitFrames.length > 8 ? ' …' : ''}]`);
}
console.log(`\n${write ? 'FILLED' : 'DRY RUN'}: ${total}px across ${sheets} of ${files.length} sheet(s), holes of ${MAX}px or less`);
