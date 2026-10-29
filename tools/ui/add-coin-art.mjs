#!/usr/bin/env node
/* ═══ v2.3.3734: THE OWNER'S FOURTEEN COIN PILES, ONE AN AMOUNT ═══
 *
 *   node tools/ui/add-coin-art.mjs [--dry]
 *
 *   reads   assets/icons-source/coins/coins.png (the unlabelled sheet)
 *   writes  public/icons/coins/coin-<threshold>.png and src/data/coinPiles.js
 *
 * The owner, 2026-10-28, the night before the judges: "I want these as the
 * coin art instead of the current one (and at different amounts) shown
 * between the labelled pic and unlabeled one".  Two ChatGPT sheets of the
 * same fourteen gold piles growing in size, one with a label under each pile
 * (coins-labelled.png: 1, 2, 3, 4, 5 / 10, 50, 100, 1,000, 5,000 / 10,000,
 * 50,000, 100,000, 200,000+), one without (coins.png, the art cut here).
 * An amount shows the pile whose label is the largest at or under it
 * (src/game/coinArt.js coinArtFor).
 *
 * The Object Studio's own steps (public/tools/style/process.js) where they
 * apply, in a headless Chromium as tools/world/add-ore-art.mjs runs them:
 *   - the sheet's piles found BY COUNT (objectsIn: a pile and its sparkles
 *     one object), read like a page -- row by row (5, 5, 4), left to right;
 *     a sheet whose count or rows do not come out is refused whole;
 *   - each pile cut with a margin round its box, so its soft glow comes
 *     with it, every px of a neighbour's parts made clear (cropObject's
 *     rule), then trimmed to what shows at all;
 *   - shrunk (resize) to fit LONG_PX, never blown up.
 * NOT the world art's last steps: these are UI pictures with a glow, so the
 * alpha is NOT hardened (mapPixels would cut the glow away) and they are not
 * held to the world's 64 colours.  Instead each pile gets its own 256 colours
 * at most (the owner's standard, "256 colours at most"), see-through ones
 * included, by a median cut over RGBA here, and is written as a palette PNG
 * with its alpha (PLTE + tRNS) -- a third of the bytes of a full-colour one.
 *
 * SIZE: the biggest any use draws a pile is the coin lying on the ground
 * (effectsRenderer, 14 x LOOT_SCALE = 28 world px, ~35 screen px at the
 * world's zoom) and the drop line's picture (dropIcons.js shrinks it to 128
 * anyway): ~37 px x devicePixelRatio 3 = LONG_PX.  The purse draws it at 18.
 * At most ~112 x 90 px, 40 KB decoded: under the UI icon slot's ~50 KB
 * (docs/MEMORY-MAP.md). */
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require_ = createRequire(path.join(REPO, 'noop.cjs'));
const { chromium } = require_('playwright-core');

/* the labels, in the sheet's reading order; the rows' sizes */
export const COIN_THRESHOLDS = [1, 2, 3, 4, 5, 10, 50, 100, 1000, 5000, 10000, 50000, 100000, 200000];
const ROWS = [5, 5, 4];
const LONG_PX = 112;
/* sheet px kept round a pile's box for its glow (the piles stand ~50 apart) */
const PAD = 18;
const COLOURS = 256;
/* the alpha a px needs to count as coin when the piles are found */
const SOLID_A = 230;

async function main() {
  const DRY = process.argv.includes('--dry');
  const SHEET = path.join(REPO, 'assets/icons-source/coins/coins.png');
  const PUB = path.join(REPO, 'public');
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' };
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/__coin-art.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<!doctype html><meta charset="utf-8"><body>coin art</body>'); }
    const f = path.join(PUB, p);
    if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let got;
  try {
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(`http://127.0.0.1:${server.address().port}/__coin-art.html`);
    got = await page.evaluate(async ({ b64, ROWS, LONG_PX, PAD, SOLID_A }) => {
      const P = await import('/tools/style/process.js');
      const want = ROWS.reduce((s, n) => s + n, 0);
      const blob = await (await fetch('data:image/png;base64,' + b64)).blob();
      const src = await P.blobToCanvas(blob, 4096);
      /* found on the coins alone: the 50,000 and 100,000 piles' glows
         touch, so a copy with only the near-solid px is searched, and each
         pile is then cut from the sheet itself, glow and all */
      const solid = P.copy(src), sg = solid.getContext('2d', { willReadFrequently: true });
      const si = sg.getImageData(0, 0, solid.width, solid.height);
      for (let i = 3; i < si.data.length; i += 4) if (si.data[i] < SOLID_A) si.data[i] = 0;
      sg.putImageData(si, 0, 0);
      const found = P.objectsIn(solid, want, { minArea: 0, relMin: 0.002 });
      if (found.boxes.length !== want) return { err: `found ${found.boxes.length} piles, the sheet has ${want}: ` + JSON.stringify(found.boxes.map((b) => [b.x, b.y, b.w, b.h])) };
      /* like a page: top to bottom by the boxes' middles, then each row's
         boxes left to right; a row whose middles spread wider than the gap
         to the next row is not a row */
      const byY = [...found.boxes].sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2));
      const order = [];
      let at = 0;
      for (const n of ROWS) {
        const row = byY.slice(at, at + n);
        at += n;
        const lo = Math.min(...row.map((b) => b.y + b.h / 2)), hi = Math.max(...row.map((b) => b.y + b.h / 2));
        const next = byY[at];
        if (next && next.y + next.h / 2 - hi < hi - lo) return { err: 'the piles do not stand in rows of ' + ROWS.join(', ') };
        order.push(...row.sort((a, b) => (a.x + a.w / 2) - (b.x + b.w / 2)));
      }
      const g0 = src.getContext('2d', { willReadFrequently: true });
      const { lab, gw, cell } = found;
      const out = [];
      for (const b of order) {
        const x0 = Math.max(0, b.x - PAD), y0 = Math.max(0, b.y - PAD);
        const x1 = Math.min(src.width, b.x + b.w + PAD), y1 = Math.min(src.height, b.y + b.h + PAD);
        const w = x1 - x0, h = y1 - y0;
        const img = g0.getImageData(x0, y0, w, h), d = img.data;
        const mine = new Set(b.ids);
        for (let y = 0; y < h; y++) {
          const row = (((y0 + y) / cell) | 0) * gw;
          for (let x = 0; x < w; x++) {
            const L = lab[row + (((x0 + x) / cell) | 0)];
            if (L >= 0 && !mine.has(L)) d[(y * w + x) * 4 + 3] = 0;
          }
        }
        const c = P.mk(w, h);
        c.getContext('2d').putImageData(img, 0, 0);
        const t = P.trim(c, 2) || c;
        const k = Math.min(1, LONG_PX / Math.max(t.width, t.height));
        const s = k < 1 ? P.resize(t, t.width * k, t.height * k, true) : t;
        const sd = s.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, s.width, s.height).data;
        let bin = '';
        for (let q = 0; q < sd.length; q += 0x8000) bin += String.fromCharCode.apply(null, sd.subarray(q, q + 0x8000));
        out.push({ w: s.width, h: s.height, sheet: [t.width, t.height], rgba: btoa(bin) });
      }
      return { out };
    }, { b64: fs.readFileSync(SHEET).toString('base64'), ROWS, LONG_PX, PAD, SOLID_A });
    if (errs.length) throw new Error('the page threw: ' + errs[0]);
  } finally {
    await browser.close();
    server.close();
  }
  if (got.err) { console.error('refused: ' + got.err); process.exit(1); }

  const OUT = DRY ? fs.mkdtempSync(path.join(os.tmpdir(), 'coin-art-')) : path.join(REPO, 'public/icons/coins');
  fs.mkdirSync(OUT, { recursive: true });
  const rows = [];
  got.out.forEach((o, i) => {
    const n = COIN_THRESHOLDS[i];
    const rgba = new Uint8Array(Buffer.from(o.rgba, 'base64'));
    const { pal, idx } = quantise(rgba, COLOURS);
    const png = palettePng(idx, pal, o.w, o.h);
    const name = `coin-${n}.png`;
    fs.writeFileSync(path.join(OUT, name), png);
    rows.push({ n, url: `/icons/coins/${name}`, w: o.w, h: o.h });
    console.log(`  ${name.padEnd(17)} ${o.w} x ${o.h} px (cut ${o.sheet[0]} x ${o.sheet[1]}), ${pal.length / 4} colours, ` +
      `${(png.length / 1024).toFixed(1)} KB, ${((o.w * o.h * 4) / 1024).toFixed(1)} KB decoded`);
  });
  const js = `/* v2.3.3734: GENERATED by tools/ui/add-coin-art.mjs -- do not edit by hand;
   run the tool again from assets/icons-source/coins/.  The owner's fourteen
   coin piles, one an amount: \`min\` the label under the pile on the owner's
   sheet (an amount shows the largest at or under it: game/coinArt.js), \`w\`
   x \`h\` the picture's own px. */
export const COIN_PILES = Object.freeze([
${rows.map((r) => `  Object.freeze({ min: ${r.n}, url: '${r.url}', w: ${r.w}, h: ${r.h} }),`).join('\n')}
]);
`;
  const dataFile = DRY ? path.join(OUT, 'coinPiles.js') : path.join(REPO, 'src/data/coinPiles.js');
  fs.writeFileSync(dataFile, js);
  console.log(`  wrote ${rows.length} piles to ${path.relative(REPO, OUT) || OUT} and ${path.relative(REPO, dataFile)}`);
}

/* ── 256 colours, see-through ones among them ── a median cut over the
   picture's RGBA (every px a sample; a pile is ~10,000), the wholly clear
   px held out as entry 0, each px then the nearest entry (alpha weighed as
   a channel, so the glow keeps its fall-off). */
export function quantise(rgba, n) {
  const px = rgba.length / 4, samples = [];
  for (let p = 0; p < px; p++) if (rgba[p * 4 + 3] > 0) samples.push(p);
  const span = (b) => {
    let range = -1, ch = 0;
    for (let c = 0; c < 4; c++) {
      let lo = 255, hi = 0;
      for (const p of b) { const v = rgba[p * 4 + c]; if (v < lo) lo = v; if (v > hi) hi = v; }
      if (hi - lo > range) { range = hi - lo; ch = c; }
    }
    return { b, range: b.length < 2 ? -1 : range, ch };
  };
  const boxes = samples.length ? [span(samples)] : [];
  while (boxes.length < n - 1) {
    let bi = -1, best = 0;
    for (let k = 0; k < boxes.length; k++) if (boxes[k].range > best) { best = boxes[k].range; bi = k; }
    if (bi < 0) break;
    const { b, ch } = boxes[bi];
    b.sort((u, v) => rgba[u * 4 + ch] - rgba[v * 4 + ch]);
    const mid = b.length >> 1;
    boxes.splice(bi, 1, span(b.slice(0, mid)), span(b.slice(mid)));
  }
  const entries = [[0, 0, 0, 0]].concat(boxes.map(({ b }) => {
    const s = [0, 0, 0, 0];
    for (const p of b) for (let c = 0; c < 4; c++) s[c] += rgba[p * 4 + c];
    return s.map((v) => Math.round(v / b.length));
  }));
  const idx = new Uint8Array(px), memo = new Map();
  for (let p = 0; p < px; p++) {
    const o = p * 4;
    if (rgba[o + 3] === 0) continue;
    const key = (rgba[o] << 24 >>> 0) + (rgba[o + 1] << 16) + (rgba[o + 2] << 8) + rgba[o + 3];
    let k = memo.get(key);
    if (k === undefined) {
      let bd = Infinity;
      for (let j = 1; j < entries.length; j++) {
        const e = entries[j];
        const dr = rgba[o] - e[0], dg = rgba[o + 1] - e[1], db = rgba[o + 2] - e[2], da = rgba[o + 3] - e[3];
        const dd = 2 * dr * dr + 4 * dg * dg + 3 * db * db + 4 * da * da;
        if (dd < bd) { bd = dd; k = j; }
      }
      memo.set(key, k);
    }
    idx[p] = k;
  }
  const pal = new Uint8Array(entries.length * 4);
  entries.forEach((e, j) => pal.set(e, j * 4));
  return { pal, idx };
}

/* a palette PNG (colour type 3) with each entry's alpha in tRNS */
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(u8) { let c = 0xffffffff; for (const b of u8) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
export function palettePng(idx, pal, w, h) {
  const n = pal.length / 4;
  const plte = Buffer.alloc(n * 3), trns = Buffer.alloc(n);
  for (let j = 0; j < n; j++) { plte[j * 3] = pal[j * 4]; plte[j * 3 + 1] = pal[j * 4 + 1]; plte[j * 3 + 2] = pal[j * 4 + 2]; trns[j] = pal[j * 4 + 3]; }
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(idx.subarray(y * w, (y + 1) * w)).copy(raw, y * (w + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 3;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('PLTE', plte),
    chunk('tRNS', trns), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/* last, so the tables above are made before it runs */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
