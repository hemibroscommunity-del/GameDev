/* ═══ v2.3.2926: CUT THE PLAYER-CARD ICONS OUT OF THE OWNER'S SHEET ═══
 *
 * Owner, handing over a mockup of the player card plus one 1448x1086 sheet
 * of eight pixel-art icons: "Change of plans. like this better."  The sheet
 * is two rows of four on a TRANSPARENT ground:
 *
 *     party ticket   trade coins   friend smiley   duel swords
 *     mute mic       block sign    report flag     close (x)
 *
 * WHY A TOOL AND NOT EIGHT HAND CROPS.  Same posture as slice-trait-icons.mjs:
 * the sheet is the source of truth (assets/icons-source/sheet-social.png); a
 * redraw re-cuts all eight in one command and nothing is re-eyeballed.
 *
 * ── WHAT IT DOES ──
 * 1. FINDS the icons from the sheet's own alpha -- connected components of
 *    alpha > 24 on a 4px grid -- never from an assumed even grid (TRAPS §59:
 *    the one cell an artist draws bigger is the one an even grid cuts).
 *    Refuses to run unless it finds exactly 8, in 2 rows of 4, and prints
 *    every box so a straddle is visible in the log.
 * 2. NORMALISES ALPHA.  The sheet came out of a background remover that left
 *    the art at alpha 240-254 instead of 255 (measured: 369,976 px in the
 *    240-254 band, 3,685 at 255), so shipped as-is every icon would be faintly
 *    see-through over the card.  a' = min(255, a * 255/240): the body goes
 *    fully opaque and the thin antialiased fringe keeps its proportions.
 *    Nothing is keyed by colour -- the ground is already transparent, and the
 *    icons' own black outlines would not survive a colour key (TRAPS §56).
 * 3. FITS each icon into the icon set's frame: centred on a 256x256
 *    transparent canvas with a 12% margin (docs/UI-BIBLE.md Part 5, the same
 *    numbers as tools/process_icon_sheets.py), smooth downscale, WebP.
 *    Not resampled onto a native pixel grid the way slice-trait-icons.mjs
 *    does: these blocks are ~13px of the sheet and the card draws them at
 *    18-36 CSS px, so the browser always downscales a 195px icon -- the soft
 *    block edges of the source never get magnified.
 *
 * Encoding runs in Chromium's canvas (playwright-core, already a dev
 * dependency) because this box has no image library; the PNG never leaves
 * the process.  Refuses to overwrite an existing icon without --force.
 *
 *   node tools/ui/slice-social-icons.mjs [sheet.png] [--out public/icons/ui] [--force]
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const SRC = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--out')
  || 'assets/icons-source/sheet-social.png';
const outAt = args.indexOf('--out');
const OUT = outAt >= 0 ? args[outAt + 1] : 'public/icons/ui';
const FORCE = args.includes('--force');
const NAMES = [['soc-party', 'soc-trade', 'soc-friend', 'soc-duel'],
  ['soc-mute', 'soc-block', 'soc-report', 'soc-close']];
const SIZE = 256, MARGIN = 0.12, QUALITY = 0.92;

const targets = NAMES.flat().map((n) => path.join(OUT, n + '.webp'));
const clash = targets.filter((t) => fs.existsSync(t));
if (clash.length && !FORCE) {
  console.error('refusing to overwrite (pass --force to re-cut):\n  ' + clash.join('\n  '));
  process.exit(1);
}

/* This sandbox's Chromium, else whatever playwright-core resolves itself. */
const LOCAL = ['/opt/pw-browsers/chromium', process.env.QA_CHROME].filter(Boolean).find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: LOCAL, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
const b64 = fs.readFileSync(SRC).toString('base64');

const res = await page.evaluate(async ({ b64, NAMES, SIZE, MARGIN, QUALITY }) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, W, H).data;

  /* 1. components of alpha > 24 on a 4px grid, 8-connected */
  const CELL = 4, cw = Math.ceil(W / CELL), ch = Math.ceil(H / CELL);
  const occ = new Uint8Array(cw * ch);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (d[(y * W + x) * 4 + 3] > 24) occ[((y / CELL) | 0) * cw + ((x / CELL) | 0)] = 1;
  }
  const seen = new Uint8Array(cw * ch), comps = [];
  for (let i = 0; i < occ.length; i++) {
    if (!occ[i] || seen[i]) continue;
    const stack = [i]; seen[i] = 1;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
    while (stack.length) {
      const k = stack.pop(), x = k % cw, y = (k / cw) | 0; n++;
      if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
        const kk = ny * cw + nx;
        if (occ[kk] && !seen[kk]) { seen[kk] = 1; stack.push(kk); }
      }
    }
    /* specks (stray remover dust) are not icons */
    if (n > 60) comps.push({ x0: x0 * CELL, y0: y0 * CELL, x1: Math.min(W, (x1 + 1) * CELL), y1: Math.min(H, (y1 + 1) * CELL) });
  }
  if (comps.length !== 8) return { error: 'expected 8 icons, found ' + comps.length, comps };

  /* tighten each box to exact pixels */
  for (const c of comps) {
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = c.y0; y < c.y1; y++) for (let x = c.x0; x < c.x1; x++) {
      if (d[(y * W + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    }
    Object.assign(c, { x0, y0, x1: x1 + 1, y1: y1 + 1, cy: (y0 + y1) / 2, cx: (x0 + x1) / 2 });
  }
  /* 2 rows by the biggest vertical gap between centres, then left to right */
  comps.sort((a, b) => a.cy - b.cy);
  let cut = 0, gap = -1;
  for (let i = 1; i < comps.length; i++) if (comps[i].cy - comps[i - 1].cy > gap) { gap = comps[i].cy - comps[i - 1].cy; cut = i; }
  const rows = [comps.slice(0, cut), comps.slice(cut)].map((r) => r.sort((a, b) => a.cx - b.cx));
  if (rows[0].length !== 4 || rows[1].length !== 4) return { error: 'expected 2 rows of 4, got ' + rows.map((r) => r.length).join('+'), comps };

  const out = [];
  rows.forEach((row, ri) => row.forEach((c, ci) => {
    const w = c.x1 - c.x0, h = c.y1 - c.y0;
    /* 2. alpha normalised on the crop, before any resampling */
    const crop = document.createElement('canvas');
    crop.width = w; crop.height = h;
    const cg = crop.getContext('2d');
    const id = g.getImageData(c.x0, c.y0, w, h);
    for (let i = 3; i < id.data.length; i += 4) id.data[i] = Math.min(255, Math.round(id.data[i] * 255 / 240));
    cg.putImageData(id, 0, 0);
    /* 3. centred in the set's 256 frame, 12% margin */
    const box = SIZE * (1 - 2 * MARGIN), s = box / Math.max(w, h);
    const dw = Math.round(w * s), dh = Math.round(h * s);
    const fin = document.createElement('canvas');
    fin.width = SIZE; fin.height = SIZE;
    const fg = fin.getContext('2d');
    fg.imageSmoothingEnabled = true;
    fg.imageSmoothingQuality = 'high';
    fg.drawImage(crop, Math.round((SIZE - dw) / 2), Math.round((SIZE - dh) / 2), dw, dh);
    out.push({ name: NAMES[ri][ci], box: [c.x0, c.y0, w, h], drawn: [dw, dh], url: fin.toDataURL('image/webp', QUALITY) });
  }));
  return { out };
}, { b64, NAMES, SIZE, MARGIN, QUALITY });
await browser.close();

if (res.error) {
  console.error('ABORT: ' + res.error);
  for (const c of res.comps || []) console.error('  box', JSON.stringify(c));
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });
for (const o of res.out) {
  const buf = Buffer.from(o.url.split(',')[1], 'base64');
  const file = path.join(OUT, o.name + '.webp');
  fs.writeFileSync(file, buf);
  console.log(`${o.name.padEnd(11)} sheet box x${o.box[0]} y${o.box[1]} ${o.box[2]}x${o.box[3]} -> ${o.drawn[0]}x${o.drawn[1]} in ${SIZE}x${SIZE}  ${(buf.length / 1024).toFixed(1)}KB  ${file}`);
}
