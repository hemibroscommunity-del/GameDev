/* THE WEBP TWINS ARE PIXEL-IDENTICAL TO THEIR PNGs (v2.3.2328)
 *
 * .github/workflows/optimize-assets.yml generates a .webp beside each sprite
 * .png, and the client's loadWebpOrPng() asks for the .webp first.  The whole
 * scheme rests on ONE property: lossless means the decoded pixels are exactly
 * the PNG's.  That is not cosmetic here.  The runtime recolor classifies skin,
 * pants and shoes by EXACT RGB (playerSkins._isSkin and friends) and the
 * masked-body bake keys on alpha edges, so a single channel of drift does not
 * make the art slightly worse -- it makes the recolor pick the wrong region and
 * paint a player's trousers onto their arm.
 *
 * Until v2.3.2328 that property was asserted only by a comment.  This measures
 * it: decode both files in a real browser, compare every pixel, and fail on any
 * difference.  Fully-transparent pixels are skipped on RGB (their colour is
 * undefined once alpha is 0 and encoders are free to change it) but their ALPHA
 * is still compared, because the bake reads alpha edges.
 *
 * Runs standalone, no worker and no game:
 *   node tools/qa/qa-webp-lossless.mjs
 * Exits non-zero on any drift, so it can gate a push.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIME = { '.png': 'image/png', '.webp': 'image/webp' };

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

/* Every PNG anywhere under public/sprites that HAS a twin.  Deliberately not
   limited to the optimizer's ROOTS: if a .webp appears beside a .png by any
   route, the client will prefer it, so it is in scope for this check. */
const pairs = [];
for (const f of walk(join(REPO, 'public/sprites'))) {
  if (extname(f).toLowerCase() !== '.png') continue;
  const w = f.replace(/\.png$/i, '.webp');
  if (existsSync(w)) pairs.push([f.slice(REPO.length), w.slice(REPO.length)]);
}
console.log(`${pairs.length} PNG/WebP twin pairs under public/sprites\n`);
if (!pairs.length) { console.log('nothing to verify'); process.exit(0); }

const srv = createServer(async (q, s) => {
  const p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/') { s.writeHead(200, { 'content-type': 'text/html' }); s.end('<!doctype html><body>'); return; }
  if (p.includes('..')) { s.writeHead(400); s.end(); return; }
  try {
    const buf = await readFile(join(REPO, p));
    s.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
    s.end(buf);
  } catch { s.writeHead(404); s.end(); }
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const port = srv.address().port;

const pinned = process.env.BT_CHROMIUM || '/opt/pw-browsers/chromium';
const opts = { args: ['--no-sandbox', '--disable-gpu'] };
if (existsSync(pinned)) opts.executablePath = pinned;
const browser = await chromium.launch(opts);
const page = await browser.newPage();
/* Served from the same origin as the images, so the canvas is never tainted. */
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });

/* Batched so a few hundred decodes do not build one enormous return value. */
const results = [];
const BATCH = 40;
for (let i = 0; i < pairs.length; i += BATCH) {
  const slice = pairs.slice(i, i + BATCH);
  const part = await page.evaluate(async ({ slice, port }) => {
    const load = (u) => new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('load failed'));
      im.src = `http://127.0.0.1:${port}${u}`;
    });
    const pix = async (u) => {
      const im = await load(u);
      const c = new OffscreenCanvas(im.naturalWidth, im.naturalHeight);
      const x = c.getContext('2d', { willReadFrequently: true });
      x.clearRect(0, 0, c.width, c.height);
      x.drawImage(im, 0, 0);
      return { d: x.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
    };
    const out = [];
    for (const [png, webp] of slice) {
      try {
        const a = await pix(png), b = await pix(webp);
        if (a.w !== b.w || a.h !== b.h) { out.push({ png, dim: [a.w, a.h, b.w, b.h] }); continue; }
        let rgbDiff = 0, alphaDiff = 0, maxc = 0;
        for (let k = 0; k < a.d.length; k += 4) {
          const da = Math.abs(a.d[k + 3] - b.d[k + 3]);
          if (da) { alphaDiff++; maxc = Math.max(maxc, da); }
          if (a.d[k + 3] === 0 && b.d[k + 3] === 0) continue;  /* colour undefined */
          const dr = Math.abs(a.d[k] - b.d[k]), dg = Math.abs(a.d[k + 1] - b.d[k + 1]),
                db = Math.abs(a.d[k + 2] - b.d[k + 2]);
          if (dr || dg || db) { rgbDiff++; maxc = Math.max(maxc, dr, dg, db); }
        }
        out.push({ png, rgbDiff, alphaDiff, maxc, px: a.d.length / 4 });
      } catch (e) { out.push({ png, err: String(e).slice(0, 90) }); }
    }
    return out;
  }, { slice, port });
  results.push(...part);
  process.stdout.write(`  ${results.length}/${pairs.length}\r`);
}

let clean = 0, bad = 0;
for (const r of results) {
  if (r.err) { bad++; console.log(`ERR    ${r.png}  ${r.err}`); continue; }
  if (r.dim) { bad++; console.log(`SIZE   ${r.png}  png ${r.dim[0]}x${r.dim[1]} vs webp ${r.dim[2]}x${r.dim[3]}`); continue; }
  if (!r.rgbDiff && !r.alphaDiff) { clean++; continue; }
  bad++;
  console.log(`DRIFT  ${r.png}  rgb ${r.rgbDiff}/${r.px} px, alpha ${r.alphaDiff} px, worst channel ${r.maxc}`);
}
console.log(`\n${clean} pixel-identical, ${bad} NOT identical, of ${results.length} pairs`);
await browser.close(); srv.close();
process.exit(bad ? 1 : 0);
