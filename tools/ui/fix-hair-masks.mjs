/* ═══ v2.3.1937: CLAMP EACH HAIR MASK TO ITS OWN HAT ═══
 *
 * Owner: "Some southwest views with hat and hair combos show hair coming
 * through sides of hat" — spartan-helmet named as the example.
 *
 * WHAT THE MASK IS.  Each hat ships hairmask/<dir>.png, and both renderers
 * clip hair to it (entityRenderer._clipHairToHat; characterPortrait's
 * destination-in pass).  Hair is KEPT where the mask is opaque, so anywhere the
 * mask is WIDER than the hat, hair renders beside a hat that is not covering
 * it — which is the leak.
 *
 * MEASURED on spartan-helmet southwest, row by row against the hat's own art:
 * the mask's left edge sits 1-5px outside the helmet's on rows 3-36 (e.g. row
 * 10, helmet 57-73, mask 52-71).  That strip is the hair you can see.
 *
 * WHAT THIS DOES NOT TOUCH, and why the fix is a clamp rather than a
 * regeneration: below the hat's lowest row the masks deliberately FLARE wider
 * than the hat (spartan's goes 49-78 at the hat's base and 47-80 below it).
 * That flare is what lets long hair hang past a small cap, so rebuilding every
 * mask as a plain downward-fill would clip hair that is supposed to show.  Only
 * rows where the hat actually has pixels are clamped.
 *
 * The bound per row is the hat's DOWNWARD-FILLED extent — the widest the hat
 * has been at or above that row — not the hat's extent on that row alone.  A
 * brim is wider than the crown above it, and hair under the crown has to
 * survive.
 *
 *   node tools/ui/fix-hair-masks.mjs [--dry] [trait ...]
 */
import fs from 'node:fs';
import path from 'node:path';
import { decode, encode } from '../png.mjs';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const ROOT = path.join(REPO, 'public/sprites/traits/headwear');
const DRY = process.argv.includes('--dry');
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const DIRS = ['south', 'southwest', 'east', 'northeast', 'north'];

/** Per-row [left,right] of opaque pixels, or null. */
function extents(p) {
  const out = [];
  for (let y = 0; y < p.height; y++) {
    let a = Infinity, b = -1;
    for (let x = 0; x < p.width; x++) if (p.data[(y * p.width + x) * 4 + 3] > 40) { if (x < a) a = x; if (x > b) b = x; }
    out.push(b < 0 ? null : [a, b]);
  }
  return out;
}

let touched = 0, cleared = 0;
const report = [];
for (const id of fs.readdirSync(ROOT).sort()) {
  if (ONLY.length && !ONLY.includes(id)) continue;
  const base = path.join(ROOT, id);
  if (!fs.statSync(base).isDirectory()) continue;
  const mdir = path.join(base, 'hairmask');
  if (!fs.existsSync(mdir)) continue;
  for (const d of DIRS) {
    const mf = path.join(mdir, d + '.png');
    const hf = path.join(base, d + '.png');
    if (!fs.existsSync(mf) || !fs.existsSync(hf)) continue;
    const mask = decode(fs.readFileSync(mf));
    const hat = decode(fs.readFileSync(hf));
    if (mask.width !== hat.width || mask.height !== hat.height) {
      report.push(`${id}/${d}  SKIPPED: mask ${mask.width}x${mask.height} vs hat ${hat.width}x${hat.height}`);
      continue;
    }
    const he = extents(hat);
    let lastHatRow = -1;
    for (let y = 0; y < he.length; y++) if (he[y]) lastHatRow = y;
    if (lastHatRow < 0) continue;
    let lo = Infinity, hi = -1, n = 0;
    for (let y = 0; y <= lastHatRow; y++) {
      if (he[y]) { lo = Math.min(lo, he[y][0]); hi = Math.max(hi, he[y][1]); }
      if (hi < 0) continue;   /* above the hat entirely: nothing to bound against */
      for (let x = 0; x < mask.width; x++) {
        if (x >= lo && x <= hi) continue;
        const i = (y * mask.width + x) * 4;
        if (mask.data[i + 3] > 40) { mask.data[i + 3] = 0; n++; }
      }
    }
    /* ── PASS 2: POCKETS ──
     * The clamp above bounds the mask by how wide the hat has been at or above
     * each row, which is right at the hat's outer edge but bridges any
     * CONCAVITY in its profile.  spartan-helmet southwest is the case: its left
     * edge bulges at rows 3-6, pinches in on rows 7-14, then bulges again -- so
     * the running extent covers the pinch and hair renders in it, which is the
     * "hair coming through the side of the hat" that was reported.
     *
     * A pocket is defined structurally, not by width: a mask pixel with NO hat
     * on it, that has hat pixels both ABOVE and BELOW it in its own column.
     * Bridging air is what that is, and no hair belongs there.
     *
     * Deliberately NOT a per-row clamp, which was built and measured first:
     * bounding every row by the hat's own extent clears 13,015px against this
     * rule's much smaller cut, because it also deletes hair that legitimately
     * sits BESIDE a hat -- an afro puffing out around a beanie has no hat above
     * or below it, so this rule leaves it alone and a per-row clamp shaves it. */
    const colTop = new Int32Array(mask.width).fill(-1);
    const colBot = new Int32Array(mask.width).fill(-1);
    for (let x = 0; x < hat.width; x++) {
      for (let y = 0; y < hat.height; y++) {
        if (hat.data[(y * hat.width + x) * 4 + 3] > 40) { if (colTop[x] < 0) colTop[x] = y; colBot[x] = y; }
      }
    }
    for (let x = 0; x < mask.width; x++) {
      if (colTop[x] < 0) continue;
      for (let y = colTop[x] + 1; y < colBot[x]; y++) {
        if (hat.data[(y * hat.width + x) * 4 + 3] > 40) continue;   /* hat covers it */
        const i = (y * mask.width + x) * 4;
        if (mask.data[i + 3] > 40) { mask.data[i + 3] = 0; n++; }
      }
    }
    if (!n) continue;
    touched++; cleared += n;
    report.push(`${id}/${d}`.padEnd(30) + `${n}px of mask outside the hat`);
    if (!DRY) fs.writeFileSync(mf, encode({ width: mask.width, height: mask.height, data: mask.data }));
  }
}
console.log(report.join('\n'));
console.log(`\n${touched} mask(s) clamped, ${cleared} px cleared` + (DRY ? '  (dry run)' : ''));
