/* ═══ v2.3.2931: THE WORLD BUILDER, PROVEN IN A REAL BROWSER — not on the CI path ═══
 *
 * public/tools/world/ is where the owner will spend days painting the world
 * square by square, with the only copy of the work in browser storage until
 * they download a backup.  So the properties worth proving are the ones a
 * slip in would silently cost them days:
 *
 *   1. THE PLAN BUILDS and the page offers the right first squares -- the
 *      ones touching the town painting -- with a template that really has
 *      the town in it and a prompt that says so.
 *   2. FUSING WORKS on pictures damaged the way ChatGPT damages them: each
 *      fake "ChatGPT picture" is cut from a known TRUE world (the meadow
 *      painting tiled round the town) and then shifted, zoomed, recoloured
 *      and re-textured.  Kept through the real upload button, the fused
 *      result must match the true world closely and grade "great" or "ok".
 *   3. A PICTURE THAT IGNORES ITS TEMPLATE is graded "bad", not kept quietly.
 *   4. WORK SURVIVES A RELOAD (IndexedDB), and REDO re-fuses the rest.
 *   5. A BACKUP RESTORES into a fresh browser profile and rebuilds the SAME
 *      pixels -- the owner's only defence against cleared browser storage.
 *
 * No network beyond a local static server over public/.
 *
 *   node tools/qa/world-page.mjs
 */
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require_ = createRequire(path.join(REPO, 'noop.cjs'));
const { chromium } = require_('playwright-core');
const SHOTS = process.env.WORLD_SHOTS || '';
const PSNR_MIN = 25;

let pass = 0, fail = 0;
const ok = (n, c, d = '') => {
  if (c) { pass++; console.log('  PASS ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d !== '' ? '  ' + JSON.stringify(d) : '')); }
};

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json' };
const PUB = path.join(REPO, 'public');
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(PUB, p);
  if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL_ = `http://127.0.0.1:${server.address().port}/tools/world/`;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'world-page-'));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

async function open(ctx) {
  const page = await ctx.newPage();
  page.errs = [];
  page.on('pageerror', (e) => page.errs.push(String(e)));
  page.on('dialog', (d) => d.accept());
  await page.goto(URL_);
  await page.waitForFunction(() => window.__world && window.__world.S.project, null, { timeout: 60000 });
  return page;
}

/* In-page: the TRUE world over a square (meadow painting reflect-tiled, the
   town laid on top exactly as the builder lays it), then damaged the way a
   regenerated picture is.  Returns PNG bytes as base64. */
async function fakeChatGPT(page, id, damage) {
  return page.evaluate(async ({ id, damage }) => {
    const W = window.__world, S = W.S, rect = S.info[id].rect, N = S.g.N;
    if (!window.__truthSrc) {
      const b = await (await fetch('/maps/meadow_v6.webp')).blob();
      const bmp = await createImageBitmap(b);
      const c = new OffscreenCanvas(bmp.width, bmp.height);
      c.getContext('2d').drawImage(bmp, 0, 0);
      window.__truthSrc = c.getContext('2d').getImageData(0, 0, bmp.width, bmp.height);
    }
    const M = window.__truthSrc;
    const refl = (v, n) => { const p = ((v % (2 * n)) + 2 * n) % (2 * n); return p < n ? p : 2 * n - 1 - p; };
    const truth = { w: N, h: N, data: new Uint8ClampedArray(N * N * 4) };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const sx = refl(rect.x + x, M.width), sy = refl(rect.y + y, M.height);
      const s = (sy * M.width + sx) * 4, o = (y * N + x) * 4;
      truth.data[o] = M.data[s]; truth.data[o + 1] = M.data[s + 1]; truth.data[o + 2] = M.data[s + 2]; truth.data[o + 3] = 255;
    }
    W.api.applyAnchors(truth, rect.x, rect.y);
    const c = new OffscreenCanvas(N, N), g = c.getContext('2d');
    g.putImageData(new ImageData(truth.data, N, N), 0, 0);
    if (damage === 'none') return { b64: null, truth: Array.from(truth.data.subarray(0, 0)) };
    const out = new OffscreenCanvas(damage === 'wide' ? 1254 : 1024, 1024), og = out.getContext('2d');
    if (damage === 'unrelated') {
      og.fillStyle = '#556b2f'; og.fillRect(0, 0, out.width, out.height);
      for (let i = 0; i < 400; i++) { og.fillStyle = `hsl(${(i * 37) % 360},60%,${30 + (i % 40)}%)`; og.fillRect((i * 97) % 1024, (i * 53) % 1024, 60, 60); }
    } else {
      /* shift + zoom about the centre, a colour cast, and fresh fine noise */
      og.filter = 'brightness(1.06) saturate(0.92) hue-rotate(4deg)';
      og.translate(out.width / 2 + 5, out.height / 2 - 4);
      og.scale(1.012 * (out.width / N), 1.012 * (out.height / N));
      og.drawImage(c, -N / 2, -N / 2);
      og.setTransform(1, 0, 0, 1, 0, 0);
      og.filter = 'none';
      const img = og.getImageData(0, 0, out.width, out.height);
      let seed = 12345;
      for (let i = 0; i < img.data.length; i += 4) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const n = ((seed >> 8) % 25) - 12;
        img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
      }
      og.putImageData(img, 0, 0);
    }
    const blob = await out.convertToBlob({ type: 'image/png' });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode.apply(null, buf.subarray(i, i + 32768));
    return { b64: btoa(s) };
  }, { id, damage });
}

/* PSNR of the fused world over a square vs the true world there, AFTER
   fitting one per-channel gain + offset: the fake ChatGPT's hue/saturation
   cast cannot be undone by the fuser (it matches squares to their
   NEIGHBOURS, not to a truth it never sees), so raw colour would measure
   the cast.  What this measures is what must not go wrong: structures in
   the right place, the join not smearing them. */
async function psnrVsTruth(page, id) {
  return page.evaluate(async (id) => {
    const W = window.__world, S = W.S, rect = S.info[id].rect, N = S.g.N;
    const M = window.__truthSrc;
    const refl = (v, n) => { const p = ((v % (2 * n)) + 2 * n) % (2 * n); return p < n ? p : 2 * n - 1 - p; };
    const got = await W.api.worldRect(rect.x, rect.y, N, N);
    const truth = { w: N, h: N, data: new Uint8ClampedArray(N * N * 4) };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const sx = refl(rect.x + x, M.width), sy = refl(rect.y + y, M.height), s = (sy * M.width + sx) * 4, o = (y * N + x) * 4;
      truth.data[o] = M.data[s]; truth.data[o + 1] = M.data[s + 1]; truth.data[o + 2] = M.data[s + 2]; truth.data[o + 3] = 255;
    }
    W.api.applyAnchors(truth, rect.x, rect.y);
    let se = 0, n = 0;
    for (let c = 0; c < 3; c++) {
      let sx = 0, sy = 0, sxx = 0, sxy = 0, m = 0;
      for (let y = 24; y < N - 24; y += 2) for (let x = 24; x < N - 24; x += 2) {
        const o = (y * N + x) * 4 + c, a = got.data[o], b = truth.data[o];
        sx += a; sy += b; sxx += a * a; sxy += a * b; m++;
      }
      const k = (m * sxy - sx * sy) / Math.max(1e-9, m * sxx - sx * sx), b0 = (sy - k * sx) / m;
      for (let y = 24; y < N - 24; y += 2) for (let x = 24; x < N - 24; x += 2) {
        const o = (y * N + x) * 4 + c, d = got.data[o] * k + b0 - truth.data[o];
        se += d * d; n++;
      }
    }
    return 10 * Math.log10(255 * 255 / (se / n));
  }, id);
}

async function uploadAndGrade(page, id, damage) {
  await page.evaluate((id) => window.__world.api.select(id), id);
  await page.waitForFunction(() => document.querySelector('#tpl-img').naturalWidth > 0, null, { timeout: 30000 });
  const { b64 } = await fakeChatGPT(page, id, damage);
  const file = path.join(TMP, `${id}-${damage}.png`);
  fs.writeFileSync(file, Buffer.from(b64, 'base64'));
  await page.setInputFiles('#file', file);
  await page.waitForFunction(() => !document.querySelector('#sq-result').hidden && document.querySelector('#busy').hidden, null, { timeout: 60000 });
  return page.evaluate(() => ({ grade: document.querySelector('#rating').dataset.grade, text: document.querySelector('#rating').textContent }));
}

async function regionHash(page, x, y, w, h) {
  return page.evaluate(async ({ x, y, w, h }) => {
    const img = await window.__world.api.squaresRect(x, y, w, h);
    let hsh = 0x811c9dc5;
    for (let i = 0; i < img.data.length; i += 7) { hsh ^= img.data[i]; hsh = Math.imul(hsh, 0x01000193); }
    return (hsh >>> 0).toString(16);
  }, { x, y, w, h });
}

try {
  /* ── 1. the plan and the first squares ── */
  console.log('1. plan, suggestions, first template');
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  let page = await open(ctxA);
  const info = await page.evaluate(() => {
    const S = window.__world.S;
    return { bw: S.bp.w, anchors: S.anchors.length, sug: window.__world.api.suggestions(), squares: Object.keys(S.project.squares).length, progress: document.querySelector('#progress').textContent };
  });
  ok('blueprint built (1184 cells across)', info.bw === 1184, info.bw);
  ok('the town painting loaded as an anchor', info.anchors === 1, info.anchors);
  ok('fresh project starts empty', info.squares === 0, info.squares);
  ok('first suggestions are the squares round the town', ['F6', 'G6', 'F7', 'G7'].every((s) => info.sug.includes(s)), info.sug);
  ok('progress counts 126 land squares', /of 126 land squares/.test(info.progress), info.progress);

  await page.evaluate(() => window.__world.api.select('F8'));
  await page.waitForFunction(() => document.querySelector('#tpl-img').naturalWidth > 0, null, { timeout: 30000 });
  const prompt = await page.inputValue('#prompt');
  ok('F8 prompt names the square', prompt.startsWith('Paint square F8'), prompt.slice(0, 40));
  ok('F8 prompt says the town is finished art', /the town on its clifftop plateau/.test(prompt));
  ok('F8 prompt carries the style bible', /No horizon, no sky/.test(prompt) && /Never add:/.test(prompt));
  const tplPainted = await page.evaluate(async () => {
    const S = window.__world.S, r = S.info.F8.rect;
    const img = await window.__world.api.worldRect(r.x, r.y, S.g.N, S.g.N);
    let k = 0;
    for (let i = 3; i < img.data.length; i += 4) if (img.data[i] > 250) k++;
    return k / (S.g.N * S.g.N);
  });
  ok('F8 template has the town painted into its top part', tplPainted > 0.05 && tplPainted < 0.6, tplPainted.toFixed(3));

  /* ── 2. fuse three neighbouring squares ── */
  console.log('2. fusing damaged pictures through the upload button');
  for (const id of ['F8', 'G8', 'F9']) {
    const t0 = Date.now();
    const r = await uploadAndGrade(page, id, 'damaged');
    ok(`${id} grades great/ok (${r.grade}, ${Date.now() - t0} ms)`, r.grade === 'great' || r.grade === 'ok', r.text);
    await page.click('#keep');
    await page.waitForFunction((id) => window.__world.S.project.squares[id] && document.querySelector('#busy').hidden, id, { timeout: 30000 });
    const p = await psnrVsTruth(page, id);
    ok(`${id} fused structure matches the true world (PSNR ${p.toFixed(1)} dB after a colour fit)`, p > PSNR_MIN, p);
  }
  if (SHOTS) {
    await page.evaluate(() => window.__world.api.select('F9'));
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SHOTS, 'world-builder-done.png'), fullPage: true });
  }

  /* ── 3. a picture that ignores its template ── */
  console.log('3. a picture that ignores its template');
  const bad = await uploadAndGrade(page, 'G9', 'unrelated');
  ok('an unrelated picture grades bad', bad.grade === 'bad', bad);
  await page.click('#retry');
  ok('Try again keeps nothing', await page.evaluate(() => !window.__world.S.project.squares.G9));

  /* a wide picture (ChatGPT sometimes answers 1254 x 1024): centre square used, still fuses */
  const wide = await uploadAndGrade(page, 'G9', 'wide');
  ok('a non-square picture is centre-cropped and still joins', wide.grade !== 'bad' && /not square/.test(wide.text), wide);
  await page.click('#retry');

  /* ── 4. reload, then redo ── */
  console.log('4. persistence and redo');
  const before = await regionHash(page, 3840, 5376, 1792, 1792);
  await page.reload();
  await page.waitForFunction(() => window.__world && window.__world.S.project, null, { timeout: 60000 });
  const after = await page.evaluate(() => Object.keys(window.__world.S.project.squares).sort());
  ok('three squares survive a reload', JSON.stringify(after) === '["F8","F9","G8"]', after);
  /* iPhone Safari reloads a background tab while you are in the ChatGPT app */
  const reopened = await page.waitForFunction(() => window.__world.S.selected === 'G9', null, { timeout: 15000 }).then(() => true, () => false);
  ok('the square you were on (G9) is reopened after a reload', reopened);
  ok('fused pixels survive a reload', (await regionHash(page, 3840, 5376, 1792, 1792)) === before);
  await page.evaluate(() => window.__world.api.redo('G8', { confirmFirst: false }));
  const afterRedo = await page.evaluate(() => Object.keys(window.__world.S.project.squares).sort());
  ok('redo removes the square and keeps the rest', JSON.stringify(afterRedo) === '["F8","F9"]', afterRedo);
  const g8Empty = await page.evaluate(async () => {
    const S = window.__world.S, r = S.info.G8.rect;
    const img = await window.__world.api.squaresRect(r.x + 400, r.y + 400, 200, 200);
    for (let i = 3; i < img.data.length; i += 4) if (img.data[i]) return false;
    return true;
  });
  ok('the redone square is empty again in the middle', g8Empty);

  /* re-keep G8 so the backup has three squares */
  const again = await uploadAndGrade(page, 'G8', 'damaged');
  ok(`G8 re-painted grades great/ok (${again.grade})`, again.grade === 'great' || again.grade === 'ok', again.text);
  await page.click('#keep');
  await page.waitForFunction(() => window.__world.S.project.squares.G8 && document.querySelector('#busy').hidden, null, { timeout: 30000 });

  /* ── 5. backup -> fresh profile -> restore ── */
  console.log('5. backup and restore into a fresh browser profile');
  const b64 = await page.evaluate(async () => {
    const blob = await window.__world.api.backupBlob();
    const u = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768));
    return btoa(s);
  });
  const zipBytes = Buffer.from(b64, 'base64');
  ok('backup is a zip with the record and three pictures', zipBytes.readUInt32LE(0) === 0x04034b50 && zipBytes.includes(Buffer.from('backup.json')) &&
    ['F8', 'G8', 'F9'].every((s) => zipBytes.includes(Buffer.from(`squares/${s}.png`))));
  const orig = await regionHash(page, 3840, 5376, 1792, 1792);
  const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const pageB = await open(ctxB);
  ok('the fresh profile starts empty', await pageB.evaluate(() => Object.keys(window.__world.S.project.squares).length === 0));
  const zipFile = path.join(TMP, 'backup.zip');
  fs.writeFileSync(zipFile, zipBytes);
  await pageB.setInputFiles('#restore', zipFile);
  await pageB.waitForFunction(() => Object.keys(window.__world.S.project.squares).length === 3 && document.querySelector('#busy').hidden, null, { timeout: 90000 });
  ok('restore rebuilds the same fused pixels', (await regionHash(pageB, 3840, 5376, 1792, 1792)) === orig);
  if (SHOTS) {
    await pageB.evaluate(() => window.__world.api.select('G8'));
    await pageB.waitForTimeout(800);
    await pageB.screenshot({ path: path.join(SHOTS, 'world-builder-phone.png'), fullPage: false });
  }
  ok('no page errors', page.errs.length === 0 && pageB.errs.length === 0, page.errs.concat(pageB.errs));
  await ctxA.close();
  await ctxB.close();
} catch (e) {
  fail++;
  console.log('  FAIL threw: ' + (e.stack || e));
} finally {
  await browser.close();
  server.close();
  fs.rmSync(TMP, { recursive: true, force: true });
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
