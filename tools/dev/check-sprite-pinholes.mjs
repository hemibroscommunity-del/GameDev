/* ═══ SEE-THROUGH PIXELS INSIDE A FIGURE (v2.3.2144) ═══
 *
 * Owner: "There are some transparent south idle face pixels."
 *
 * This bug class is real and it has bitten before. The player sprite
 * changelog (playerSprites.js) carries "v2.3.1456: jog body/leg sheets
 * pinhole-filled (enclosed transparent speckles -- the 'background through the
 * face/body' dots)" -- the same words, one pose over. tools/fill_interior_holes.py
 * is the repair; it needs scipy, which this sandbox does not have, and nothing
 * ever CHECKED the sheets it does not repair.
 *
 * A pinhole is a background region that does not reach the frame border, using
 * the repair tool's own threshold (alpha > 128 is opaque) so a sheet this
 * script calls dirty is exactly a sheet that tool would fill. Anything open to
 * the silhouette edge is a real gap -- between the legs, under an arm -- and is
 * excluded by construction, which is why this can run over every sheet without
 * a per-sheet allowlist.
 *
 * WHAT IT CANNOT SEE, said plainly: a trait drawn OVER an opaque body. A hole
 * in the beard shows the chin, not the town. Only sheets that are the bottom
 * layer of the figure -- the body and the naked body -- can leak the ground
 * through a pinhole, so those are what --strict fails on; everything else is
 * reported for information.
 *
 * Run: node tools/dev/check-sprite-pinholes.mjs [--strict] [glob ...]
 */
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { decode } from '../png.mjs';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const pats = args.filter((a) => !a.startsWith('--'));
const PATTERNS = pats.length ? pats : [
  'public/sprites/player/*.png',
  'public/sprites/player-naked/*.png',
];

/* The bottom layer of the figure: nothing is drawn under these, so a pinhole
   here is literally the ground showing through the character. */
const LOAD_BEARING = /^public\/sprites\/player(-naked)?\//;

function pinholes(path) {
  const im = decode(readFileSync(path));
  const { width: W, height: H, data: d } = im;
  /* Frames are square and as tall as the sheet: the body sheets are one
     256x256 still or an N-frame strip of 128-tall frames. Slicing per frame
     matters -- a gap that opens to the edge of ITS frame is not enclosed, and
     scanning the whole strip at once would call it one. */
  const FR = H;
  const n = Math.max(1, Math.round(W / FR));
  const hits = [];
  for (let f = 0; f < n; f++) {
    const bg = new Uint8Array(FR * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < FR; x++) {
        bg[y * FR + x] = d[(y * W + f * FR + x) * 4 + 3] <= 128 ? 1 : 0;
      }
    }
    const seen = new Uint8Array(FR * H);
    const st = [];
    const push = (x, y) => {
      const i = y * FR + x;
      if (x >= 0 && x < FR && y >= 0 && y < H && bg[i] && !seen[i]) { seen[i] = 1; st.push(i); }
    };
    for (let x = 0; x < FR; x++) { push(x, 0); push(x, H - 1); }
    for (let y = 0; y < H; y++) { push(0, y); push(FR - 1, y); }
    while (st.length) {
      const i = st.pop(); const y = (i / FR) | 0; const x = i - y * FR;
      push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
    }
    let count = 0; let y0 = 1e9; let y1 = -1; let x0 = 1e9; let x1 = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < FR; x++) {
        const i = y * FR + x;
        if (bg[i] && !seen[i]) {
          count += 1;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
          if (x < x0) x0 = x; if (x > x1) x1 = x;
        }
      }
    }
    if (count) hits.push({ frame: f, px: count, box: `y${y0}-${y1} x${x0}-${x1}` });
  }
  return hits;
}

const files = [];
for (const p of PATTERNS) {
  try { for (const f of globSync(p)) files.push(f); } catch (e) { /* no matches */ }
}
files.sort();

let dirtyLoadBearing = 0;
let dirtyOther = 0;
for (const f of files) {
  let hits;
  try { hits = pinholes(f); } catch (e) { console.log(`SKIP  ${f} (${e.message})`); continue; }
  if (!hits.length) continue;
  const bearing = LOAD_BEARING.test(f);
  if (bearing) dirtyLoadBearing += 1; else dirtyOther += 1;
  const total = hits.reduce((a, h) => a + h.px, 0);
  console.log(`${bearing ? 'HOLE ' : 'note '} ${f}: ${total}px in ${hits.length} frame(s) — `
    + hits.slice(0, 4).map((h) => `f${h.frame} ${h.px}px ${h.box}`).join(', '));
}

console.log(`\nchecked ${files.length} sheet(s): `
  + `${dirtyLoadBearing} with pinholes in the FIGURE's own art, ${dirtyOther} in layers drawn over it`);
if (strict && dirtyLoadBearing) {
  console.log('FAIL — a pinhole in the body art is the ground showing through the character.');
  process.exit(1);
}
