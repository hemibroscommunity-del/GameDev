/* ═══ v2.3.2924: THE TEE'S HEM MEETS THE PANTS ON EVERY JOG FRAME ═══
 *
 * Owner: "The bottom t shirt on jog flickers a bit."
 *
 * ── WHAT IT MEASURED ──
 * Per frame, per column across the belly: the pixels of bare BODY SKIN (the
 * recolour's own _isSkin test, playerSkins.js) directly under the tee's
 * lowest pixel.  On most frames there are none -- the hem sits on the belt.
 * On a few it is drawn short: jog-south frame 2 stops two rows high right
 * across the waist (and four on the right side), frames 8/14/15 in patches;
 * jog-north frames 10, 15 and 16 by one row.  For that one frame a strip of
 * belly shows between tee and pants, then is gone again: the flicker.  (The
 * renderer places the tee exactly on the body frame it was drawn for, so
 * this is the art, like v2.3.2923's collar.)
 *
 * ── THE RULE ──
 * A COLUMN WALK down from the hem, never a row cut.  For each column whose
 * hem is on the belly (within HEM_BAND rows of the frame's median belly hem --
 * a sleeve ends ~18 rows higher, so arms never qualify), count the skin run
 * under it.  Only a run of 1..MAX_RUN that ENDS on the pants or the body's
 * own keyline is a gap under a short hem; a longer run, or one that runs off
 * the body, is an arm swinging past and is left alone.  A gap is closed by
 * moving the hem's own bottom pixel (its keyline) down to the end of the run
 * and filling between with the tee's own fill colour from just above it --
 * so the edge keeps its ink and no second keyline stripe is painted.
 *
 * INVARIANTS (any failure aborts): (a) only where the body is opaque, taking
 * the body's alpha, so the silhouette is unchanged; (b) only over body skin;
 * (c) additive -- no shirt pixel is removed.  Idempotent: after one pass no
 * qualifying run is left.
 *
 * PNG ONLY: a touched sheet's .webp is deleted (webpImage.js prefers it; CI
 * mints the new twin).  Bump GEAR_VERSION in gearSheets.js.
 *
 * Run: node tools/gear/lower-jog-hem.mjs [--write] [dir ...]
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode, encode } from './lib/png.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const WRITE = process.argv.includes('--write');
const DIRS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const ALL = DIRS.length ? DIRS : ['south', 'north', 'east', 'northeast', 'southwest'];
const FW = 128;
const MAX_RUN = 3;
const HEM_BAND = 5;
/* the recolour's own classifiers (playerSkins.js _isSkin / _isPants) */
const isSkin = (r, g, b, a) => a > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25;
const isPants = (r, g, b, a) => a > 180 && g >= r - 10 && g > b + 8 && r < 150;
const isInk = (r, g, b, a) => a > 180 && (r + g + b) / 3 < 50;

let total = 0;
for (const dir of ALL) {
  const shirtPath = `${REPO}/public/sprites/gear/shirt/tshirt/jog-${dir}.png`;
  const T = decode(readFileSync(shirtPath));
  const B = decode(readFileSync(`${REPO}/public/sprites/player/jog-${dir}.png`));
  if (T.width !== B.width || T.height !== B.height) throw new Error(`${dir}: sheet sizes differ`);
  const N = Math.round(T.width / FW);
  const at = (f, x, y) => ((y * T.width) + f * FW + x) * 4;
  const px = (I, f, x, y) => { const i = at(f, x, y); return [I.data[i], I.data[i + 1], I.data[i + 2], I.data[i + 3]]; };
  let written = 0;
  const report = [];
  for (let f = 0; f < N; f++) {
    /* the lowest tee pixel per column, in the torso band */
    const hem = [];
    for (let x = 0; x < FW; x++) { let h = -1; for (let y = 95; y >= 35; y--) if (T.data[at(f, x, y) + 3] > 60) { h = y; break; } hem.push(h); }
    const mid = hem.slice(52, 76).filter((h) => h >= 0).sort((p, q) => p - q);
    if (!mid.length) continue;
    const med = mid[mid.length >> 1];
    let n = 0; const cols = [];
    for (let x = 0; x < FW; x++) {
      const h = hem[x];
      if (h < 0 || Math.abs(h - med) > HEM_BAND) continue;   /* a sleeve, not the belly */
      let run = 0;
      while (run <= MAX_RUN && h + 1 + run < T.height && isSkin(...px(B, f, x, h + 1 + run))) run++;
      if (run < 1 || run > MAX_RUN) continue;
      const end = px(B, f, x, h + 1 + run);
      if (!(isPants(...end) || isInk(...end))) continue;      /* ran off the body, or into an arm */
      /* the tee's fill just above its bottom pixel (skip a two-deep keyline) */
      let fillY = h - 1;
      while (fillY > h - 4 && fillY >= 0 && (T.data[at(f, x, fillY) + 3] < 60 || isInk(...px(T, f, x, fillY)))) fillY--;
      const keyI = at(f, x, h);
      const fillI = (fillY > h - 4 && fillY >= 0 && T.data[at(f, x, fillY) + 3] > 60) ? at(f, x, fillY) : keyI;
      const key = [...T.data.slice(keyI, keyI + 4)], fill = [...T.data.slice(fillI, fillI + 4)];
      for (let y = h; y <= h + run; y++) {
        const src = (y === h + run) ? key : fill;
        const bi = at(f, x, y), ba = B.data[bi + 3];
        if (ba === 0) throw new Error(`${dir} f${f} x${x} y${y}: off the body`);                 /* (a) */
        if (y > h && !isSkin(...px(B, f, x, y))) throw new Error(`${dir} f${f}: not over skin`);   /* (b) */
        if (WRITE) { T.data[bi] = src[0]; T.data[bi + 1] = src[1]; T.data[bi + 2] = src[2]; T.data[bi + 3] = y === h ? T.data[bi + 3] : ba; }
      }
      n += run; cols.push(`${x}:${run}`);
    }
    if (n) { written += n; report.push(`  frame ${String(f).padStart(2)}: ${n} px under a short hem, columns ${cols.join(' ')}`); }
  }
  console.log(`${dir}: ${written} px ${WRITE ? 'written' : 'would be written'}`);
  for (const r of report) console.log(r);
  total += written;
  if (WRITE && written) {
    writeFileSync(shirtPath, encode(T));
    const webp = shirtPath.replace(/\.png$/, '.webp');
    if (existsSync(webp)) { unlinkSync(webp); console.log('  deleted the stale ' + webp.slice(REPO.length + 1)); }
  }
}
console.log(`${total} px ${WRITE ? 'written' : 'would be written (dry run; --write to apply)'}`);
