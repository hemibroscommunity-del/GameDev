/* ═══ v2.3.3648: NO PINHOLES IN THE MINER'S TEE ═══
 *
 * The owner, 2026-10-27: "check all the animations for ghost remnants of
 * either a body beneath or areas for cleanup".  mp-pickwood's green miner in a
 * white tee wore green dots on his chest: the tee's mining sheet
 * (shirt/tshirt/mine-south) has pinholes, one to six pixels enclosed by the
 * tee on every frame, 154 px over the fourteen frames, and every one shows the
 * skin under it.  The other tee sheets have none to speak of (the jog's 3-4,
 * pickup's 28 over 29 frames).
 *
 * ── THE RULE ──
 * A hole is a see-through pixel of the tee that the frame's edge cannot reach
 * through see-through pixels (4-connected): the tee encloses it.  One over the
 * body's skin (the recolour's own skin test) is filled with the tee's own
 * colour, the per-channel median of its opaque neighbours, from the hole's
 * edge inward, pass by pass.  A hole over anything else (the pickaxe's steel,
 * an outline) is left: the tee may mean to show it.
 *
 * INVARIANTS (any failure aborts): (a) only where the body is opaque and skin;
 * (b) additive -- no tee pixel is changed but a hole's; (c) idempotent: after
 * one pass no hole over skin is left.
 *
 * PNG ONLY: the sheet's .webp is deleted (webpImage.js prefers it; CI mints
 * the new twin).  Bump GEAR_VERSION in gearSheets.js.
 *
 * Run: node tools/gear/fill-mine-tee-holes.mjs [--write]
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode, encode } from './lib/png.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const WRITE = process.argv.includes('--write');
const FW = 128;
/* the recolour's own skin test (playerSkins.js _isSkin) */
const isSkin = (r, g, b, a) => a > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25;

const shirtPath = `${REPO}/public/sprites/gear/shirt/tshirt/mine-south.png`;
const T = decode(readFileSync(shirtPath));
const B = decode(readFileSync(`${REPO}/public/sprites/player/mine-south.png`));
if (T.width !== B.width || T.height !== B.height) throw new Error('mine-south: sheet sizes differ');
const N = Math.round(T.width / FW);
const at = (f, x, y) => ((y * T.width) + f * FW + x) * 4;
const opaque = (f, x, y) => T.data[at(f, x, y) + 3] > 40;

/* the holes of a frame over the body's skin, as [x, y] */
function holesOf(f) {
  const seen = new Uint8Array(FW * T.height);
  const stack = [];
  for (let y = 0; y < T.height; y++) {
    for (let x = 0; x < FW; x++) {
      if ((x === 0 || y === 0 || x === FW - 1 || y === T.height - 1) && !opaque(f, x, y)) { seen[y * FW + x] = 1; stack.push(y * FW + x); }
    }
  }
  while (stack.length) {
    const p = stack.pop(), x = p % FW, y = (p - x) / FW;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= FW || yy >= T.height) continue;
      const q = yy * FW + xx;
      if (!seen[q] && !opaque(f, xx, yy)) { seen[q] = 1; stack.push(q); }
    }
  }
  const out = [];
  for (let y = 0; y < T.height; y++) {
    for (let x = 0; x < FW; x++) {
      if (seen[y * FW + x] || opaque(f, x, y)) continue;
      const i = at(f, x, y);
      if (isSkin(B.data[i], B.data[i + 1], B.data[i + 2], B.data[i + 3])) out.push([x, y]);
    }
  }
  return out;
}

const median = (v) => { const s = v.slice().sort((a, b) => a - b); return s[s.length >> 1]; };
let written = 0;
const report = [];
const before = new Uint8Array(T.data);
for (let f = 0; f < N; f++) {
  let left = holesOf(f);
  const n0 = left.length;
  /* from the edge inward: each pass fills the holes with three or more opaque
     neighbours, from those neighbours */
  for (let pass = 0; pass < 8 && left.length; pass++) {
    const fill = [];
    for (const [x, y] of left) {
      const R = [], G = [], Bb = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= FW || yy >= T.height || !opaque(f, xx, yy)) continue;
          const i = at(f, xx, yy);
          R.push(T.data[i]); G.push(T.data[i + 1]); Bb.push(T.data[i + 2]);
        }
      }
      if (R.length >= 3) fill.push([x, y, median(R), median(G), median(Bb)]);
    }
    if (!fill.length) break;
    for (const [x, y, r, g, b] of fill) {
      const i = at(f, x, y);
      T.data[i] = r; T.data[i + 1] = g; T.data[i + 2] = b; T.data[i + 3] = 255;
      written++;
    }
    const done = new Set(fill.map(([x, y]) => y * FW + x));
    left = left.filter(([x, y]) => !done.has(y * FW + x));
  }
  if (left.length) throw new Error(`mine-south frame ${f}: ${left.length} hole(s) could not be filled`);
  report.push(`frame ${f}: ${n0} px`);
}
/* (a) and (b): only holes over skin changed, nothing else */
for (let p = 0; p < T.width * T.height; p++) {
  const i = p * 4;
  const changed = T.data[i] !== before[i] || T.data[i + 1] !== before[i + 1] || T.data[i + 2] !== before[i + 2] || T.data[i + 3] !== before[i + 3];
  if (!changed) continue;
  if (before[i + 3] > 40) throw new Error(`invariant (b): a tee pixel changed at ${p}`);
  if (!isSkin(B.data[i], B.data[i + 1], B.data[i + 2], B.data[i + 3])) throw new Error(`invariant (a): not over skin at ${p}`);
}
/* (c) idempotent */
for (let f = 0; f < N; f++) if (holesOf(f).length) throw new Error(`invariant (c): frame ${f} still has a hole over skin`);

console.log(`${written} px ${WRITE ? 'written' : 'would be written'} (${report.join(', ')})`);
if (WRITE && written) {
  writeFileSync(shirtPath, encode(T));
  const webp = shirtPath.replace(/\.png$/, '.webp');
  if (existsSync(webp)) unlinkSync(webp);
  console.log('wrote', shirtPath, '(and removed its stale .webp: CI mints the new one)');
}
