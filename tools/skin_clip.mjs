/* skin_clip.mjs — v2.3.2642. How much of a candidate SKIN_CATALOG target
 * clips on the highlight rim, per sheet, and what the real k ceiling is.
 *
 * WHY THIS EXISTS.  playerSkins.js's header long claimed "the sheets' brightest
 * skin pixel runs k=1.10, so any channel above 231 clips".  That is the STAND
 * sheets; jog-south-head runs k=1.552, which would put the true zero-clip
 * ceiling at 164 and forbid most of the shipping catalog.  Neither number is
 * usable on its own, so the question a new tone actually has to answer is
 * "does it clip more than a tone that already ships?" — and that is what this
 * prints.  Alabaster is the reference: it is the brightest shipping tone.
 *
 * Read-only.  Reuses tools/png.mjs (zlib only, no canvas — a 2D canvas
 * premultiplies and would corrupt the very rim pixels being measured, TRAPS
 * §53), and copies _retint / _isSkin / SKIN_REF from playerSkins.js verbatim
 * so the measurement is the shipping maths and not a paraphrase of it.
 *
 * Usage:
 *   node tools/skin_clip.mjs                       # every catalog tone
 *   node tools/skin_clip.mjs 191,231,231           # one candidate target
 */
import fs from 'node:fs';
import path from 'node:path';
import { decode } from './png.mjs';

/* ── verbatim from src/rendering/playerSkins.js ── */
const SKIN_REF = 149;
const isSkin = (r, g, b, a) => a > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25;
function retint(r, g, b, t) {
  const k = (0.299 * r + 0.587 * g + 0.114 * b) / SKIN_REF;
  return [Math.round(t[0] * k), Math.round(t[1] * k), Math.round(t[2] * k)];
}

const SHIPPING = {
  alabaster: [249, 236, 226], porcelain: [245, 221, 205], ivory: [242, 218, 188],
  aliencyan: [191, 231, 231], rosy: [242, 201, 184], pale: [240, 205, 170],
  fair: [230, 194, 155], sand: [217, 177, 132], honey: [201, 162, 113],
  tan: [200, 140, 80], olive: [178, 138, 94], brown: [155, 105, 65],
  deep: [112, 76, 50], ebony: [82, 56, 39], monkeybrown: [85, 56, 23],
  /* v2.3.2657 fur colours */
  purple: [120, 72, 180], yellow: [214, 180, 60], red: [170, 50, 42], orange: [212, 118, 40],
  green: [70, 150, 70], blue: [70, 100, 200], pink: [214, 112, 168], gray: [130, 130, 138],
  charcoal: [48, 46, 50], snow: [225, 225, 230],
};

const arg = process.argv[2];
const targets = arg
  ? { candidate: arg.split(',').map(Number), alabaster: SHIPPING.alabaster }
  : SHIPPING;
if (arg && targets.candidate.length !== 3) {
  console.error('target must be "r,g,b"');
  process.exit(1);
}

const DIR = 'public/sprites/player';
/* welcome-bro.png is an ORPHAN -- grep the repo and nothing references it, so
   the recolour never bakes it.  It is also much brighter than the gameplay
   sheets, enough that leaving it in moved Alabaster's aggregate from 1.4% to
   35% and drowned every other sheet.  Excluded because it is not recoloured,
   not because the number was inconvenient. */
const SKIP = new Set(['welcome-bro.png']);
const sheets = fs.readdirSync(DIR).filter((f) => f.endsWith('.png') && !SKIP.has(f)).sort();

/* Gather skin pixels once per sheet, then score every target against them. */
const perSheet = [];
let globalKmax = 0, globalKsheet = '';
for (const f of sheets) {
  const { width: w, height: h, data } = decode(fs.readFileSync(path.join(DIR, f)));
  const px = [];
  let kmax = 0;
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], a = data[i * 4 + 3];
    if (!isSkin(r, g, b, a)) continue;
    px.push(r, g, b);
    const k = (0.299 * r + 0.587 * g + 0.114 * b) / SKIN_REF;
    if (k > kmax) kmax = k;
  }
  if (px.length < 150) continue;   // 50 px of skin is a stray, not a body
  if (kmax > globalKmax) { globalKmax = kmax; globalKsheet = f; }
  perSheet.push({ f, px, n: px.length / 3, kmax });
}

const names = Object.keys(targets);
const totals = Object.fromEntries(names.map((n) => [n, { clipped: 0, n: 0, worst: 0, worstSheet: '' }]));

for (const s of perSheet) {
  for (const name of names) {
    const t = targets[name];
    let clipped = 0;
    for (let i = 0; i < s.px.length; i += 3) {
      const [R, G, B] = retint(s.px[i], s.px[i + 1], s.px[i + 2], t);
      if (R > 255 || G > 255 || B > 255) clipped++;
    }
    const tot = totals[name];
    tot.clipped += clipped; tot.n += s.n;
    const share = clipped / s.n;
    if (share > tot.worst) { tot.worst = share; tot.worstSheet = s.f; }
  }
}

console.log(`sheets measured: ${perSheet.length}`);
console.log(`global kmax = ${globalKmax.toFixed(3)} (${globalKsheet})  =>  zero-clip ceiling ${Math.floor(255 / globalKmax)}`);
console.log(`\n${'target'.padEnd(14)} ${'maxChan'.padStart(7)} ${'clip%'.padStart(7)}  ${'worst sheet'.padStart(8)}`);
for (const name of names) {
  const t = totals[name];
  const mc = Math.max(...targets[name]);
  console.log(`${name.padEnd(14)} ${String(mc).padStart(7)} ${(100 * t.clipped / t.n).toFixed(3).padStart(7)}  ${(100 * t.worst).toFixed(2)}% ${t.worstSheet}`);
}
console.log(`\nA new light tone is acceptable if its clip% is at or under alabaster's,`);
console.log(`which ships today.  Zero is not the bar -- see playerSkins.js's header.`);
