/* THE WEBP TWINS ARE PIXEL-IDENTICAL TO THEIR PNGs (v2.3.2328)
 *
 * .github/workflows/optimize-assets.yml generates a .webp beside each sprite
 * .png, and the client's loadWebpOrPng() asks for the .webp first.  The whole
 * scheme rests on ONE property: lossless means the decoded pixels are exactly
 * the PNG's.  That is not cosmetic -- the runtime recolor classifies skin,
 * pants and shoes by EXACT RGB (playerSkins._isSkin and friends), so drift does
 * not make the art slightly worse, it makes the recolor pick the wrong region.
 *
 * ═══ HOW YOU MUST MEASURE IT, AND HOW I GOT IT WRONG FIRST ═══
 * The obvious method is wrong, and it is wrong in the direction that invents a
 * catastrophe.  Drawing each file into a <canvas> and diffing getImageData
 * reported 78 of 118 twins as drifting, with a worst channel delta of 255.
 * The real number was TWO.
 *
 * A 2D canvas backing store is PREMULTIPLIED.  drawImage multiplies RGB by
 * alpha going in and getImageData divides it back out, and that round trip is
 * lossy for every pixel with partial alpha -- the fewer the alpha bits, the
 * coarser the recovered colour.  The PNG and WebP decoders hand the canvas the
 * same pixels and it hands back slightly different ones.  Sprite sheets are
 * mostly transparent with antialiased edges, so almost every pixel that differs
 * is an edge pixel, which is exactly where the eye and the recolor both look.
 *
 * The tell was in the data and I nearly walked past it: `rgbAtFullAlpha` was 0
 * in every single case.  Not one opaque pixel ever differed.  A lossy encoder
 * does not politely restrict itself to the antialiased fringe.
 *
 * So this decodes with WebCodecs `ImageDecoder` instead -- raw RGBA frames
 * straight from the codec, no canvas, no premultiply -- and the 78 became 2.
 * `sharp(...).ensureAlpha().raw()` in tools/optimize-sprites.mjs is the same
 * measurement by a different route, which is why the two now agree.
 * See docs/TRAPS.md section 53.
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
    if (typeof ImageDecoder === 'undefined') {
      return slice.map(([png]) => ({ png, err: 'no WebCodecs ImageDecoder in this browser' }));
    }
    /* Raw RGBA from the codec. NOT via a canvas -- see the header. */
    const pix = async (u, type) => {
      const buf = await (await fetch(`http://127.0.0.1:${port}${u}`)).arrayBuffer();
      const dec = new ImageDecoder({ data: buf, type });
      const { image } = await dec.decode();
      const out = new Uint8ClampedArray(image.allocationSize({ format: 'RGBA' }));
      await image.copyTo(out, { format: 'RGBA' });
      return out;
    };
    const out = [];
    for (const [png, webp] of slice) {
      try {
        const a = await pix(png, 'image/png'), b = await pix(webp, 'image/webp');
        if (a.length !== b.length) { out.push({ png, dim: [a.length, b.length] }); continue; }
        let rgbDiff = 0, alphaDiff = 0, maxc = 0, opaqueDiff = 0;
        for (let k = 0; k < a.length; k += 4) {
          const da = Math.abs(a[k + 3] - b[k + 3]);
          if (da) { alphaDiff++; maxc = Math.max(maxc, da); }
          /* A fully transparent pixel's colour is undefined; encoders may
             rewrite it. Alpha itself is never exempt -- the bake reads edges. */
          if (a[k + 3] === 0 && b[k + 3] === 0) continue;
          const dr = Math.abs(a[k] - b[k]), dg = Math.abs(a[k + 1] - b[k + 1]),
                db = Math.abs(a[k + 2] - b[k + 2]);
          if (dr || dg || db) {
            rgbDiff++; maxc = Math.max(maxc, dr, dg, db);
            if (a[k + 3] === 255 && b[k + 3] === 255) opaqueDiff++;
          }
        }
        out.push({ png, rgbDiff, alphaDiff, maxc, opaqueDiff, px: a.length / 4 });
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
  if (r.dim) { bad++; console.log(`SIZE   ${r.png}  decoded ${r.dim[0]} vs ${r.dim[1]} bytes`); continue; }
  if (!r.rgbDiff && !r.alphaDiff) { clean++; continue; }
  bad++;
  /* `opaqueDiff` is printed because it is the discriminator: a real lossy
     encode hits opaque pixels too. If it is 0 and the rest is edge pixels,
     suspect the measurement before the file (TRAPS section 53). */
  console.log(`DRIFT  ${r.png}  rgb ${r.rgbDiff}/${r.px} px (${r.opaqueDiff} of them OPAQUE), `
    + `alpha ${r.alphaDiff} px, worst channel ${r.maxc}`);
}
console.log(`\n${clean} pixel-identical, ${bad} NOT identical, of ${results.length} pairs`);
await browser.close(); srv.close();
process.exit(bad ? 1 : 0);
