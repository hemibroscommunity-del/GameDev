/* ═══ v2.3.2923: THE TEE'S COLLAR HOLDS STILL ON THE NORTH JOG ═══
 *
 * Owner: "North jog t shirt has a very slight flicker near the neckline."
 *
 * ── WHAT IT MEASURED ──
 * On jog-north the body barely bobs (its crown row is 12-14 on every frame),
 * and the tee's back collar sits a constant 26 rows below that crown across
 * the neck on 17 of the 23 frames.  On six it does not: the neck columns
 * (x = 59-65 of the 128-px frame) drop to 27 or 28 rows below the crown --
 * frames 8, 11 and 21 cut a U-shaped notch two rows deep for ONE frame, frames
 * 3-4 and 10 one row.  Rendered, that is a few screen px of bare neck plus the
 * notch's keyline appearing and disappearing a few times per cycle: the
 * flicker.  (The renderer places the tee exactly on the body -- same frame,
 * same x/y, drawn unsnapped since v2.3.2922 -- so this is the art.)
 *
 * ── THE RULE ──
 * For each frame, and each column in the neck span, the collar should sit
 * `ref` rows under the crown, where `ref` is that column's own MODE across the
 * sheet (26 in every neck column).  Where a column sits lower, the notch is
 * filled from the nearest GOOD frame's own collar -- registered by crown row
 * (the head only translates here) -- over the notch's columns plus one wall
 * column either side, from the collar row down to the notch's floor.  So the
 * new collar is a copy of what the frame before or after it draws, not an
 * invented neckline.
 *
 * INVARIANTS, checked per written pixel (any failure aborts):
 *   (a) never off the body -- only where the BODY sheet is opaque, so the
 *       figure's silhouette is unchanged;
 *   (b) only in the neck span, only at or below the collar row;
 *   (c) never erases shirt -- every written source pixel is opaque shirt.
 * Idempotent: after one pass no column is below its mode, so a second pass
 * writes nothing.
 *
 * PNG ONLY.  The .webp beside it is deleted -- webpImage.js asks for the
 * .webp first, so a stale twin would keep the old art on screen; CI mints the
 * new one (precheck sprite-webp).  Bump GEAR_VERSION in gearSheets.js.
 *
 * Run: node tools/gear/raise-north-collar.mjs [--write]
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode, encode } from './lib/png.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SHIRT = `${REPO}/public/sprites/gear/shirt/tshirt/jog-north.png`;
const BODY = `${REPO}/public/sprites/player/jog-north.png`;
const FW = 128;
const NECK_X0 = 59, NECK_X1 = 65;   /* the neck interior; the notch walls ride along as xL-1 / xR+1 */
const WRITE = process.argv.includes('--write');

const T = decode(readFileSync(SHIRT));
const B = decode(readFileSync(BODY));
if (T.width !== B.width || T.height !== B.height) throw new Error('shirt and body sheets differ in size');
const N = Math.round(T.width / FW);
const at = (I, f, x, y) => ((y * I.width) + f * FW + x) * 4;
const a = (I, f, x, y) => (y < 0 || y >= I.height) ? 0 : I.data[at(I, f, x, y) + 3];

const crown = [], top = [];
for (let f = 0; f < N; f++) {
  let c = -1;
  for (let y = 0; y < B.height && c < 0; y++) for (let x = 0; x < FW; x++) if (a(B, f, x, y) > 60) { c = y; break; }
  crown.push(c);
  const t = [];
  for (let x = 0; x < FW; x++) { let r = -1; for (let y = 0; y < T.height; y++) if (a(T, f, x, y) > 60) { r = y; break; } t.push(r); }
  top.push(t);
}
/* each neck column's own usual depth under the crown */
const ref = [];
for (let x = NECK_X0; x <= NECK_X1; x++) {
  const count = new Map();
  for (let f = 0; f < N; f++) if (top[f][x] >= 0) { const d = top[f][x] - crown[f]; count.set(d, (count.get(d) || 0) + 1); }
  ref[x] = [...count.entries()].sort((p, q) => q[1] - p[1])[0][0];
}
const isGood = (f) => { for (let x = NECK_X0; x <= NECK_X1; x++) if (top[f][x] - crown[f] > ref[x]) return false; return true; };

let written = 0;
const report = [];
for (let f = 0; f < N; f++) {
  const bad = [];
  for (let x = NECK_X0; x <= NECK_X1; x++) if (top[f][x] >= 0 && top[f][x] - crown[f] > ref[x]) bad.push(x);
  if (!bad.length) continue;
  /* the nearest good frame, a same-crown one first */
  let src = -1;
  for (const sameCrown of [true, false]) {
    for (let d = 1; d < N && src < 0; d++) {
      for (const g of [(f - d + N) % N, (f + d) % N]) {
        if (src < 0 && isGood(g) && (!sameCrown || crown[g] === crown[f])) src = g;
      }
    }
    if (src >= 0) break;
  }
  if (src < 0) throw new Error(`frame ${f}: no good frame to copy the collar from`);
  const dy = crown[src] - crown[f];
  const xL = Math.max(NECK_X0 - 1, bad[0] - 1), xR = Math.min(NECK_X1 + 1, bad[bad.length - 1] + 1);
  let n = 0;
  for (let x = xL; x <= xR; x++) {
    const collar = crown[f] + (ref[x] != null ? ref[x] : ref[Math.max(NECK_X0, Math.min(NECK_X1, x))]);
    let floor = collar;
    for (const bx of bad) floor = Math.max(floor, top[f][bx]);
    for (let y = collar; y <= floor; y++) {
      const sy = y + dy;
      if (a(B, f, x, y) === 0) continue;                             /* (a) never off the body */
      if (a(T, src, x, sy) === 0) continue;                          /* (c) never erase: only opaque shirt is copied */
      if (x < NECK_X0 - 1 || x > NECK_X1 + 1 || y < collar) throw new Error('out of span');   /* (b) */
      const di = at(T, f, x, y), si = at(T, src, x, sy);
      if (T.data[di] === T.data[si] && T.data[di + 1] === T.data[si + 1] && T.data[di + 2] === T.data[si + 2] && T.data[di + 3] === T.data[si + 3]) continue;
      if (WRITE) for (let k = 0; k < 4; k++) T.data[di + k] = T.data[si + k];
      n++;
    }
  }
  written += n;
  report.push(`frame ${String(f).padStart(2)}: crown ${crown[f]}, notch x=${bad[0]}-${bad[bad.length - 1]} (${bad.map((x) => top[f][x] - crown[f] - ref[x]).join(',')} rows low), from frame ${src} (dy ${dy}): ${n} px`);
}
console.log(`neck span x=${NECK_X0}-${NECK_X1}, collar depth under the crown (mode): ${[...new Set(ref.filter((v) => v != null))].join('/')}`);
for (const r of report) console.log('  ' + r);
console.log(`${written} px ${WRITE ? 'written' : 'would be written (dry run; --write to apply)'}`);
if (WRITE && written) {
  writeFileSync(SHIRT, encode(T));
  const webp = SHIRT.replace(/\.png$/, '.webp');
  if (existsSync(webp)) { unlinkSync(webp); console.log('deleted the stale ' + webp.slice(REPO.length + 1)); }
}
