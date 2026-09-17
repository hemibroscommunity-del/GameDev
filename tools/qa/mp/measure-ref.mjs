/* THE OWNER'S REFERENCE SHOT, MEASURED FROM ITS PIXELS (v2.3.2597).
 *
 * The owner sent a screenshot of the Points screen they want. A screenshot is
 * a shape, not a spec: to build it you need its row pitch, its [+] geometry and
 * — the part that actually decides the design — how much vertical room its card
 * needs once it holds today's SIX weapon stats and SEVEN shared ones instead of
 * the four the shot was drawn with (it pre-dates v2.3.2592, which folded Crit
 * into Luck and added Special and Elemental).
 *
 * The shot is 941x1672, a resized 16:9 frame rather than a device resolution,
 * so every number is reported as a FRACTION OF SCREEN WIDTH and then scaled to
 * 390 and 360 CSS px. That is scale-invariant and survives the resize.
 *
 * Two things fooled earlier passes of this file and are now handled explicitly:
 *   - the card's continuous gold BORDER beats the [+] buttons on "most gold
 *     pixels", so the [+] column is chosen by RUN COUNT, not gold count;
 *   - the dark "+" glyph splits each gold button into two runs, so eight runs
 *     appear for four buttons and they have to be merged.
 *
 *   node tools/qa/mp/measure-ref.mjs
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SHOT = `${REPO}/docs/triage-2026-09-16/assets/points-target-detail-view.png`;
const b64 = readFileSync(SHOT).toString('base64');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
const out = await page.evaluate(async (src) => {
  const img = new Image();
  await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = src; });
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const cx = cv.getContext('2d');
  cx.drawImage(img, 0, 0);
  const W = img.width, H = img.height;
  const d = cx.getImageData(0, 0, W, H).data;
  const at = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
  const isGold = (p) => p[0] > 200 && p[1] > 150 && p[1] < 230 && p[2] < 150 && (p[0] - p[2]) > 80;

  const runsAt = (x) => {
    const r = []; let start = -1;
    for (let y = Math.floor(H * 0.55); y < H; y++) {
      const g = isGold(at(x, y));
      if (g && start < 0) start = y;
      if (!g && start >= 0) { if (y - start > H * 0.015) r.push([start, y - 1]); start = -1; }
    }
    if (start >= 0 && H - 1 - start > H * 0.015) r.push([start, H - 1]);
    return r;
  };
  let bestX = 0, best = [];
  for (let x = Math.floor(W * 0.55); x < Math.floor(W * 0.95); x++) {
    const r = runsAt(x);
    const sc = (q) => q.length * 10000 + q.reduce((a, v) => a + (v[1] - v[0]), 0);
    if (r.length >= 2 && sc(r) > sc(best)) { best = r; bestX = x; }
  }
  const runs = [];
  for (const r of best) {
    const last = runs[runs.length - 1];
    if (last && (r[0] - last[1]) < H * 0.02) { last[1] = r[1]; continue; }
    runs.push([r[0], r[1]]);
  }

  /* Width, sampled a QUARTER into the button — the middle is the dark glyph. */
  let plusW = null;
  if (runs.length) {
    const my = Math.round(runs[0][0] + (runs[0][1] - runs[0][0]) * 0.25);
    let x0 = bestX, x1 = bestX;
    while (x0 > 0 && isGold(at(x0 - 1, my))) x0--;
    while (x1 < W - 1 && isGold(at(x1 + 1, my))) x1++;
    plusW = { x0, x1, w: x1 - x0 + 1, sampledAt: my };
  }

  /* The card's gold border: first and last gold row near the left/right edges. */
  const lx = Math.floor(W * 0.02) + 4, rx = W - Math.floor(W * 0.02) - 5;
  let cardTop = null, cardBot = null;
  for (let y = Math.floor(H * 0.5); y < H; y++) {
    if (isGold(at(lx, y)) || isGold(at(rx, y))) { cardTop = y; break; }
  }
  for (let y = H - 1; y > Math.floor(H * 0.5); y--) {
    if (isGold(at(lx, y)) || isGold(at(rx, y))) { cardBot = y; break; }
  }
  return { W, H, bestX, runs, plusW, cardTop, cardBot };
}, `data:image/png;base64,${b64}`);
await browser.close();

const { W, H, runs, plusW, cardTop, cardBot } = out;
const f390 = (v) => (v / W * 390), f360 = (v) => (v / W * 360);

console.log(`reference shot ${W}x${H}   [+] column x=${out.bestX}\n`);
console.log(`${runs.length} [+] buttons:`);
runs.forEach((r, i) => console.log(`  row ${i + 1}: y ${r[0]}..${r[1]}  height ${r[1] - r[0] + 1}px`));

const pitches = runs.slice(1).map((r, i) => r[0] - runs[i][0]);
const pitch = pitches.reduce((a, b) => a + b, 0) / pitches.length;
const bh = runs.reduce((a, r) => a + (r[1] - r[0] + 1), 0) / runs.length;

console.log(`\nSCALE-INVARIANT (fraction of screen width -> CSS px):`);
const row = (label, v) => console.log(`  ${label.padEnd(14)} ${(v / W).toFixed(4)}   ${f390(v).toFixed(1).padStart(6)} @390   ${f360(v).toFixed(1).padStart(6)} @360`);
row('row pitch', pitch);
row('[+] height', bh);
row('[+] width', plusW.w);

const head = runs[0][0] - cardTop;
const tail = cardBot - runs[runs.length - 1][1];
console.log(`\nCARD: y ${cardTop}..${cardBot}  (${cardBot - cardTop}px tall)`);
row('header block', head);
row('bottom pad', tail);

console.log(`\nCARD HEIGHT NEEDED at the reference's own row pitch:`);
for (const [label, n] of [['4 rows (the shot)', 4], ['6 rows (a weapon today)', 6], ['7 rows (Shared today)', 7]]) {
  const h = head + n * pitch + tail;
  console.log(`  ${label.padEnd(26)} ${f390(h).toFixed(0).padStart(4)} CSS @390   ${f360(h).toFixed(0).padStart(4)} @360`);
}
console.log(`\n(The sheet's scrolling window on a phone is ~191px — see the`);
console.log(` v2.3.2441/2592 notes in HeroExpanded.jsx. Compare against that.)`);
