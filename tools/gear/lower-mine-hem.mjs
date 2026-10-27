/* ═══ v2.3.3622: THE TEE'S HEM MEETS THE PANTS ON EVERY MINING FRAME ═══
 *
 * The owner's list of 2026-10-26: "The shirt shifts while mining."  In the
 * pickaxe swing the tee rides up and a band of bare belly shows between its
 * hem and the trousers -- 1,340 px over mine-south's fourteen frames (the
 * count mp-tierore makes).  v2.3.3443 hid most of it behind a taller copper
 * rock; from iron on the rocks stand further south, and on frames where the
 * swing lifts the arms the band shows whatever stands in front of it.  The
 * art (tools/fit_shirt_art.py, from the owner's generated tee) leaves the
 * belly bare on purpose -- "a tee legitimately leaves the forearms, hands and
 * belly bare" -- which is right for a tee standing still and reads as the
 * shirt jumping up and down in a swing.
 *
 * ── THE RULE (v2.3.2924's for the jog, tools/gear/lower-jog-hem.mjs) ──
 * A COLUMN WALK down from the hem.  For each column, the skin run under the
 * tee's lowest pixel; only a run of 1..MAX_RUN that ENDS on the trousers (or
 * on the body's keyline with the trousers one or two rows under it) is belly.
 * A longer run, or one that ends anywhere else, is a forearm hanging past --
 * left bare.  And only a column whose hem is within HEM_BAND rows of the
 * frame's median belly hem: a sleeve ends higher.  And only a stretch of at
 * least MIN_GROUP such columns side by side: a lone column (beside the hand,
 * the pickaxe's handle) lowered alone hung under the hem like a drip.  A gap
 * is closed by moving
 * THE HEM AS DRAWN down to the end of the run -- its keyline and the shade
 * row or two the art lays just above it -- and filling the rows it leaves
 * with the tee's own tone just above that shade.  So the shirt is simply
 * longer: the first cut moved the keyline alone and left the shade where it
 * was, a darker stripe across the middle of the longer shirt.
 *
 * INVARIANTS (any failure aborts): (a) only where the body is opaque, taking
 * the body's alpha, so the silhouette is unchanged; (b) under the old hem,
 * only over body skin; (c) additive -- no shirt pixel is removed.
 * Idempotent: after one pass no qualifying run or slit is left.
 *
 * PNG ONLY: the sheet's .webp is deleted (webpImage.js prefers it; CI mints
 * the new twin).  Bump GEAR_VERSION in gearSheets.js.
 *
 * Run: node tools/gear/lower-mine-hem.mjs [--write]
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode, encode } from './lib/png.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const WRITE = process.argv.includes('--write');
const FW = 128;
const MAX_RUN = 6;
const HEM_BAND = 6;
const MAX_SHADE = 3;
const MIN_GROUP = 3;
/* the recolour's own classifiers (playerSkins.js _isSkin / _isPants) */
const isSkin = (r, g, b, a) => a > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25;
const isPants = (r, g, b, a) => a > 180 && g >= r - 10 && g > b + 8 && r < 150;
const isInk = (r, g, b, a) => a > 180 && (r + g + b) / 3 < 50;

const shirtPath = `${REPO}/public/sprites/gear/shirt/tshirt/mine-south.png`;
const T = decode(readFileSync(shirtPath));
const B = decode(readFileSync(`${REPO}/public/sprites/player/mine-south.png`));
if (T.width !== B.width || T.height !== B.height) throw new Error('mine-south: sheet sizes differ');
const N = Math.round(T.width / FW);
const at = (f, x, y) => ((y * T.width) + f * FW + x) * 4;
const px = (I, f, x, y) => { const i = at(f, x, y); return [I.data[i], I.data[i + 1], I.data[i + 2], I.data[i + 3]]; };
const lum = (p) => p[0] * 0.299 + p[1] * 0.587 + p[2] * 0.114;

let written = 0;
const report = [];
for (let f = 0; f < N; f++) {
  const hem = [];
  for (let x = 0; x < FW; x++) { let h = -1; for (let y = T.height - 1; y >= 0; y--) if (T.data[at(f, x, y) + 3] > 60) { h = y; break; } hem.push(h); }
  /* the belly columns: a short skin run under the hem that ends on the trousers */
  const cand = [];
  for (let x = 0; x < FW; x++) {
    const h = hem[x];
    if (h < 0) continue;
    let run = 0;
    while (run <= MAX_RUN && h + 1 + run < T.height && isSkin(...px(B, f, x, h + 1 + run))) run++;
    if (run < 1 || run > MAX_RUN) continue;
    const yEnd = h + 1 + run;
    let onPants = yEnd < T.height && isPants(...px(B, f, x, yEnd));
    if (!onPants && yEnd < T.height && isInk(...px(B, f, x, yEnd))) {
      for (let d = 1; d <= 2 && yEnd + d < T.height; d++) if (isPants(...px(B, f, x, yEnd + d))) onPants = true;
    }
    if (onPants) cand.push({ x, h, run });
  }
  if (!cand.length) continue;
  const hs = cand.map((c) => c.h).sort((p, q) => p - q);
  const med = hs[hs.length >> 1];
  /* the belly's columns, in stretches side by side: a sleeve's hem ends
     higher, and a lone column would hang as a drip */
  const belly = cand.filter((c) => Math.abs(c.h - med) <= HEM_BAND);
  const keep = [];
  for (let i = 0; i < belly.length;) {
    let j = i + 1;
    while (j < belly.length && belly[j].x === belly[j - 1].x + 1) j++;
    if (j - i >= MIN_GROUP) keep.push(...belly.slice(i, j));
    i = j;
  }
  let n = 0;
  const cols = [];
  for (const { x, h, run } of keep) {
    /* the column as drawn, read before anything is written */
    const col = [];
    for (let y = 0; y <= h; y++) { const i = at(f, x, y); col.push([T.data[i], T.data[i + 1], T.data[i + 2], T.data[i + 3]]); }
    const cloth = (p) => p[3] > 60 && !isInk(...p);
    /* the tee's own tone near the hem: the brightest of its last eight rows */
    let ref = 0;
    for (let y = h - 1; y >= Math.max(0, h - 8); y--) if (cloth(col[y])) ref = Math.max(ref, lum(col[y]));
    /* the hem's shade: the rows just above the keyline darker than that */
    let s = 0;
    while (s < MAX_SHADE && h - 1 - s >= 0 && cloth(col[h - 1 - s]) && lum(col[h - 1 - s]) < ref - 8) s++;
    const top = h - s;                                /* the hem band is rows top..h */
    const fill = (top - 1 >= 0 && cloth(col[top - 1])) ? col[top - 1] : col[h];
    for (let y = top; y <= h + run; y++) {
      const src = y < top + run ? fill : col[y - run];
      const bi = at(f, x, y), ba = B.data[bi + 3];
      if (ba === 0) throw new Error(`f${f} x${x} y${y}: off the body`);                  /* (a) */
      if (y > h && !isSkin(...px(B, f, x, y))) throw new Error(`f${f}: not over skin`);   /* (b) */
      if (y <= h && T.data[bi + 3] <= 60) throw new Error(`f${f} x${x}: no hem here`);     /* (c) */
      T.data[bi] = src[0]; T.data[bi + 1] = src[1]; T.data[bi + 2] = src[2]; T.data[bi + 3] = y <= h ? T.data[bi + 3] : ba;
    }
    n += run;
    cols.push(`${x}:${run}`);
  }
  /* a one-column SLIT between two lowered stretches (frame 9's column 73:
     the tee left a pixel's gap down its middle, and the body's belly line
     showed through it): closed with its left neighbour's column as it now is,
     from the slit's top to the lowered hem -- else the slit ran on through
     the longer shirt to the trousers */
  const endAt = new Map(keep.map((c) => [c.x, c.h + c.run]));
  for (let x = 1; x < FW - 1; x++) {
    if (endAt.has(x) || !endAt.has(x - 1) || !endAt.has(x + 1)) continue;
    const yEnd = Math.min(endAt.get(x - 1), endAt.get(x + 1));
    let yTop = yEnd;
    while (yTop - 1 >= 0 && T.data[at(f, x, yTop - 1) + 3] <= 60 && T.data[at(f, x - 1, yTop - 1) + 3] > 60) yTop--;
    if (yTop >= yEnd) continue;
    for (let y = yTop; y <= yEnd; y++) {
      const bi = at(f, x, y), li = at(f, x - 1, y), ba = B.data[bi + 3];
      if (ba === 0) throw new Error(`f${f} x${x} y${y}: slit off the body`);                         /* (a) */
      if (T.data[bi + 3] > 60) throw new Error(`f${f} x${x} y${y}: no slit here`);                  /* (c) */
      T.data[bi] = T.data[li]; T.data[bi + 1] = T.data[li + 1]; T.data[bi + 2] = T.data[li + 2];
      T.data[bi + 3] = Math.min(T.data[li + 3], ba);
    }
    n += yEnd - yTop + 1;
    cols.push(`slit ${x}:${yTop}-${yEnd}`);
  }
  if (n) { written += n; report.push(`  frame ${String(f).padStart(2)}: ${n} px under a short hem, columns ${cols.join(' ')}`); }
}
console.log(`mine-south: ${written} px ${WRITE ? 'written' : 'would be written'}`);
for (const r of report) console.log(r);
if (WRITE && written) {
  writeFileSync(shirtPath, encode(T));
  const webp = shirtPath.replace(/\.png$/, '.webp');
  if (existsSync(webp)) { unlinkSync(webp); console.log('  deleted the stale ' + webp.slice(REPO.length + 1)); }
}
console.log(`${written} px ${WRITE ? 'written' : 'would be written (dry run; --write to apply)'}`);
