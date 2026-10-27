/* ═══ v2.3.3645: THE NORTH-EAST JOG'S CHAIN MEETS THE GREAVES ═══
 *
 * The owner, 2026-10-27: "check all the animations for ghost remnants of
 * either a body beneath or areas for cleanup".  mp-ghostaudit's bro in full
 * iron, jogging north-east or north-west (the second is the first mirrored),
 * showed a line of his trousers at the waist on frames 11 to 13: the chain
 * belt the armour bake paints over the waist (maskedBake.js, the v2.3.1347
 * chain paint, from belt/chainbelt/jog-northeast) stops one or two rows above
 * the greaves' top there, and the trousers the bake keeps in the waist band
 * show through the seam.  Olive in the default colours, so it read as a dark
 * line; in any other colour, a stripe.
 *
 * ── THE RULE (tools/relay_jog_belt.py's: the band's bottom bridged to the
 * greaves' top, column by column) ──
 * In each frame and column, where the greaves start ONE or TWO rows below the
 * belt's lowest pixel, those rows take the belt's lowest pixel, copied down.
 * A wider gap is not a seam (at the side, the arm) and is left.  The paint
 * only ever lands where the body is, so a bridge over nothing draws nothing.
 *
 * INVARIANTS (any failure aborts): (a) only belt pixels that were see-through
 * change; (b) only in a seam's rows; (c) idempotent: after one pass no seam
 * of one or two rows is left.
 *
 * tools/posesheets/beltmask-northeast.png (the mannequin generator's source,
 * gen_belt_from_mannequin.py) is NOT touched: it has 23 frames to the sheet's
 * 24, so it is already out of step with the sheet, and a regeneration would
 * need this run again anyway.
 *
 * PNG ONLY: the sheet's .webp is deleted (webpImage.js prefers it; CI mints
 * the new twin).  Bump GEAR_VERSION in gearSheets.js.
 *
 * Run: node tools/gear/bridge-ne-belt.mjs [--write]
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode, encode } from './lib/png.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const WRITE = process.argv.includes('--write');
const MAX_SEAM = 2;

const beltPath = `${REPO}/public/sprites/gear/belt/chainbelt/jog-northeast.png`;
const Bt = decode(readFileSync(beltPath));
const Lg = decode(readFileSync(`${REPO}/public/sprites/gear/legs/steelgreaves/jog-northeast.png`));
if (Bt.width !== Lg.width || Bt.height !== Lg.height) throw new Error('jog-northeast: the belt and the greaves differ in size');
const FW = Bt.height;
const N = Math.round(Bt.width / FW);
const at = (I, f, x, y) => ((y * I.width) + f * FW + x) * 4;
const on = (I, f, x, y) => I.data[at(I, f, x, y) + 3] > 40;

/* the seams of a frame: [x, beltBottom, greavesTop] where 1..MAX_SEAM rows lie between */
function seamsOf(f) {
  const out = [];
  for (let x = 0; x < FW; x++) {
    let bb = -1;
    for (let y = FW - 1; y >= 0; y--) if (on(Bt, f, x, y)) { bb = y; break; }
    if (bb < 0) continue;
    let gt = -1;
    for (let y = bb + 1; y < FW; y++) if (on(Lg, f, x, y)) { gt = y; break; }
    if (gt < 0) continue;
    const gap = gt - bb - 1;
    if (gap >= 1 && gap <= MAX_SEAM) out.push([x, bb, gt]);
  }
  return out;
}

const before = new Uint8Array(Bt.data);
let written = 0;
const report = [];
for (let f = 0; f < N; f++) {
  const seams = seamsOf(f);
  let n = 0;
  for (const [x, bb, gt] of seams) {
    const src = at(Bt, f, x, bb);
    for (let y = bb + 1; y < gt; y++) {
      const i = at(Bt, f, x, y);
      Bt.data[i] = Bt.data[src]; Bt.data[i + 1] = Bt.data[src + 1]; Bt.data[i + 2] = Bt.data[src + 2]; Bt.data[i + 3] = Bt.data[src + 3];
      n++;
    }
  }
  written += n;
  if (n) report.push(`frame ${f}: ${n} px`);
}
/* (a) and (b) */
for (let p = 0; p < Bt.width * Bt.height; p++) {
  const i = p * 4;
  const changed = Bt.data[i] !== before[i] || Bt.data[i + 1] !== before[i + 1] || Bt.data[i + 2] !== before[i + 2] || Bt.data[i + 3] !== before[i + 3];
  if (changed && before[i + 3] > 40) throw new Error(`invariant (a): a belt pixel changed at ${p}`);
}
/* (c) */
for (let f = 0; f < N; f++) if (seamsOf(f).length) throw new Error(`invariant (c): frame ${f} still has a seam`);

console.log(`${written} px ${WRITE ? 'written' : 'would be written'}${report.length ? ' (' + report.join(', ') + ')' : ''}`);
if (WRITE && written) {
  writeFileSync(beltPath, encode(Bt));
  const webp = beltPath.replace(/\.png$/, '.webp');
  if (existsSync(webp)) unlinkSync(webp);
  console.log('wrote', beltPath, '(and removed its stale .webp: CI mints the new one)');
}
