#!/usr/bin/env node
/* ═══ v2.3.3907: THE OWNER'S TEN ELEMENT ICONS, CUT FROM THEIR SHEET ═══
 *
 * The owner, 2026-11-02: "None of the elements should have shapes behind
 * them. Just the element itself. Give prompt to redo the element icons." --
 * and then the sheet from that prompt (docs/ART-WISHLIST.md, "The ten element
 * icons"), uploaded to the top of the repo and kept, untouched, at
 * assets/icons-source/owner-2026-11-02/element-icons-sheet.png: 1983 x 793,
 * flat magenta, a 5 x 2 grid read like a page --
 *   row 1: flame, frost, water, venom, flora
 *   row 2: stone, storm, wind, dark, light
 *
 * Cut by the house picture pipeline, public/tools/style/process.js, run in
 * Chromium (it is canvas code, written for the studios):
 *   1. keyOut: the magenta keyed out and its fringe taken back out of the
 *      edge pixels;
 *   2. the sheet split into its two rows at the widest empty band across it,
 *      and each row into its five icons by splitObjects (found by their own
 *      see-through edges, never an assumed even grid: TRAPS §59), left to right;
 *   3. each trimmed and fitted centred on a 256 x 256 see-through square, its
 *      long side FILL of it (the size today's icons are drawn at);
 *   4. reduceColours: 256 colours or fewer (quant256, the memory law).
 * Written as lossless WebP (PIL), so the file holds exactly those colours, to
 * public/icons/ui/elem-<name>.webp -- the names every screen already reads.
 * The 64 x 64 copies the monsters' name plates draw are made from these by
 * tools/ui/make-elem-small.py (v2.3.3906).
 *
 * tools/ui/draw-element-icons.py stays as the fallback (the icons drawn in
 * code); it no longer writes into public/icons/ui/ without --force.
 *
 *   node tools/ui/cut-element-sheet.mjs [--contact out.png]
 */
import http from 'node:http';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SHEET = path.join(REPO, 'assets/icons-source/owner-2026-11-02/element-icons-sheet.png');
const OUT = path.join(REPO, 'public/icons/ui');
export const ROWS = [['flame', 'frost', 'water', 'venom', 'flora'], ['stone', 'storm', 'wind', 'dark', 'light']];
const SIZE = 256;
const FILL = 0.76;   /* the long side, as cut-owner-icons.py's element pick (0.758) */
const contactAt = process.argv.indexOf('--contact');
const CONTACT = contactAt > 0 ? process.argv[contactAt + 1] : null;

/* the style folder and the sheet, served to the page */
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  try {
    if (u === '/sheet.png') { res.writeHead(200, { 'content-type': 'image/png' }); res.end(readFileSync(SHEET)); return; }
    if (u === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><title>cut</title>'); return; }
    if (u.startsWith('/tools/style/') && u.endsWith('.js') && !u.includes('..')) {
      res.writeHead(200, { 'content-type': 'text/javascript' });
      res.end(readFileSync(path.join(REPO, 'public', u))); return;
    }
  } catch (e) { /* fall through */ }
  res.writeHead(404); res.end();
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const require = createRequire(path.join(REPO, 'noop.cjs'));
const { chromium } = require('playwright-core');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });   /* as tools/qa/style-lab.mjs */
const page = await browser.newPage();
await page.goto(base + '/');
const cut = await page.evaluate(async ({ ROWS, SIZE, FILL }) => {
  const P = await import('/tools/style/process.js');
  const img = new Image();
  img.src = '/sheet.png';
  await img.decode();
  const src = P.mk(img.naturalWidth, img.naturalHeight);
  src.getContext('2d').drawImage(img, 0, 0);
  const keyed = P.keyOut(src);
  if (!keyed.keyed) return { error: 'the sheet was not keyed (no flat background found)' };
  const k = keyed.canvas;
  const w = k.width, h = k.height;
  const d = k.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  /* the widest empty band across the middle half: the rows' parting */
  const rowFull = new Uint8Array(h);
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 24) { rowFull[y] = 1; break; } }
  let best = -1, bestLen = 0, run = 0;
  for (let y = Math.floor(h * 0.25); y < Math.ceil(h * 0.75); y++) {
    if (!rowFull[y]) { run++; if (run > bestLen) { bestLen = run; best = y - Math.floor(run / 2); } } else run = 0;
  }
  if (best < 0) return { error: 'no empty band between the two rows' };
  const out = [];
  const bands = [[0, best], [best, h]];
  for (let r = 0; r < 2; r++) {
    const [y0, y1] = bands[r];
    const row = P.mk(w, y1 - y0);
    row.getContext('2d').drawImage(k, 0, y0, w, y1 - y0, 0, 0, w, y1 - y0);
    const parts = P.splitObjects(row, ROWS[r].length);
    if (parts.length !== ROWS[r].length) return { error: `row ${r + 1}: found ${parts.length} icons, want ${ROWS[r].length}` };
    for (let i = 0; i < parts.length; i++) {
      const t = P.trim(parts[i]) || parts[i];
      const s = (SIZE * FILL) / Math.max(t.width, t.height);
      const fw = Math.round(t.width * s), fh = Math.round(t.height * s);
      const fit = P.resize(t, fw, fh, true);
      const sq = P.mk(SIZE, SIZE);
      sq.getContext('2d').drawImage(fit, Math.round((SIZE - fw) / 2), Math.round((SIZE - fh) / 2));
      const red = P.reduceColours(sq, 256);
      out.push({ name: ROWS[r][i], png: red.toDataURL('image/png'), colours: P.countColours(red), src: [t.width, t.height] });
    }
  }
  return { out, rowsAt: best };
}, { ROWS, SIZE, FILL });
await browser.close();
server.close();
if (cut.error) { console.error('cut-element-sheet: ' + cut.error + ' -- nothing written'); process.exit(1); }

const tmp = mkdtempSync(path.join(tmpdir(), 'elemcut-'));
const pairs = [];
for (const c of cut.out) {
  const p = path.join(tmp, c.name + '.png');
  writeFileSync(p, Buffer.from(c.png.split(',')[1], 'base64'));
  pairs.push(p, path.join(OUT, 'elem-' + c.name + '.webp'));
  console.log(`elem-${c.name}.webp  from ${c.src.join('x')} on the sheet, ${c.colours} colours`);
}
/* PNG -> lossless WebP: every pixel exactly as cut (the colour count holds) */
const py = 'import sys\nfrom PIL import Image\na=sys.argv[1:]\nfor i in range(0,len(a),2):\n  Image.open(a[i]).convert("RGBA").save(a[i+1],"WEBP",lossless=True)\n';
execFileSync('python3', ['-c', py, ...pairs]);
if (CONTACT) {
  const cs = 'import sys\nfrom PIL import Image\nfs=sys.argv[2:]\nim=Image.new("RGBA",(256*5,512),(70,90,80,255))\nfor i,f in enumerate(fs):\n  im.alpha_composite(Image.open(f).convert("RGBA"),((i%5)*256,(i//5)*256))\nim.save(sys.argv[1])\n';
  execFileSync('python3', ['-c', cs, CONTACT, ...ROWS.flat().map((n) => path.join(OUT, 'elem-' + n + '.webp'))]);
  console.log('contact sheet: ' + CONTACT);
}
rmSync(tmp, { recursive: true, force: true });
