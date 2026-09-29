/* ═══ v2.3.2937: THE GROUND STUDIO, PROVEN IN A REAL BROWSER — not on the CI path ═══
 *
 * public/tools/ground/ is where the owner will make the world's ground,
 * about fifty ChatGPT pictures, with the only copy in browser storage until
 * a zip is downloaded.  So what is proven is what a slip would cost them:
 *
 *   1. THE PAGE BUILDS the plan and lists every swatch, grouped, each with a
 *      prompt that carries the HD pixel art paragraph, its own brief, the
 *      quiet-ground rule and the scale line;
 *   2. THE STYLE KEY is read from the World Builder's storage on the site;
 *   3. A PICTURE IN, through the real file input, comes out as the game will
 *      use it: 512 art px, seamless, hard-edged, on one palette of at most
 *      64 colours; the progress map and the preview pick it up;
 *   4. THE PREVIEW draws the ground at game size round the bro, and says
 *      which swatches are on screen and which are not made yet;
 *   5. FROZEN COLOURS stay frozen when another swatch comes in;
 *   6. WORK SURVIVES A RELOAD, and a downloaded zip restores into a fresh
 *      browser with the same pixels;
 *   7. no page errors.
 *
 *   node tools/qa/ground-studio.mjs          (GROUND_SHOTS=dir to keep pictures)
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require_ = createRequire(path.join(REPO, 'noop.cjs'));
const { chromium } = require_('playwright-core');
const SHOTS = process.env.GROUND_SHOTS || '';

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
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const URL_ = `${ORIGIN}/tools/ground/`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, acceptDownloads: true };

async function open(ctx) {
  const page = await ctx.newPage();
  page.errs = [];
  page.on('pageerror', (e) => page.errs.push(String(e)));
  await page.goto(URL_);
  await page.waitForFunction(() => window.__ground && window.__ground.S.ready, null, { timeout: 60000 });
  await page.evaluate(() => window.__ground.S.ready.then(() => true));
  return page;
}

/* ChatGPT-shaped ground pictures: 1254 px, a textured colour, NOT seamless on
   its own, with a smooth gradient and soft blobs (what ChatGPT's "pixel art"
   really is) -- the pipeline has to make them tile and snap them */
const makePicture = (page, hex, seed) => page.evaluate(async ({ hex, seed }) => {
  const c = document.createElement('canvas'); c.width = 1254; c.height = 1254;
  const g = c.getContext('2d');
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const grd = g.createLinearGradient(0, 0, 1254, 1254);
  grd.addColorStop(0, hex); grd.addColorStop(1, '#' + [1, 3, 5].map((i) => Math.max(0, parseInt(hex.slice(i, i + 2), 16) - 40).toString(16).padStart(2, '0')).join(''));
  g.fillStyle = grd; g.fillRect(0, 0, 1254, 1254);
  for (let i = 0; i < 6000; i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.16)';
    g.beginPath(); g.arc(rnd() * 1254, rnd() * 1254, 2 + rnd() * 7, 0, 7); g.fill();
  }
  const b = await new Promise((r) => c.toBlob(r, 'image/png'));
  const buf = new Uint8Array(await b.arrayBuffer());
  let str = '';
  for (let i = 0; i < buf.length; i += 0x8000) str += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(str);
}, { hex, seed });

const put = async (page, id, ver, b64) => {
  await page.setInputFiles(`input[data-file="${id}|${ver}"]`, { name: `${id}-${ver}.png`, mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') });
  await page.waitForFunction(([i, v]) => { const t = window.__ground.S.tiles[i]; return t && t.byVer[v] && document.getElementById('busy').hidden; }, [id, ver], { timeout: 60000 });
};

/* facts about a finished tile: size, colours, hard alpha, and how well its
   wrap-round edge matches compared with two columns inside it */
const tileFacts = (page, id, ver) => page.evaluate(([i, v]) => {
  const t = window.__ground.S.tiles[i].byVer[v];
  const d = t.data, w = t.w, h = t.h;
  const cols = new Set(); let semi = 0;
  for (let k = 0; k < d.length; k += 4) { cols.add((d[k] << 16) | (d[k + 1] << 8) | d[k + 2]); if (d[k + 3] !== 255) semi++; }
  const diff = (a, b) => { let s = 0; for (let y = 0; y < h; y++) { const p = (y * w + a) * 4, q = (y * w + b) * 4; s += Math.abs(d[p] - d[q]) + Math.abs(d[p + 1] - d[q + 1]) + Math.abs(d[p + 2] - d[q + 2]); } return s / h; };
  const pal = new Set((window.__ground.S.palette || []).map((c) => (c[0] << 16) | (c[1] << 8) | c[2]));
  let off = 0; for (const c of cols) if (!pal.has(c)) off++;
  return { w, h, colours: cols.size, semi, offPalette: off, wrap: diff(0, w - 1), inside: diff(Math.floor(w / 3), Math.floor(w / 3) + 1) };
}, [id, ver]);

const shot = async (page, name, sel) => {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  const file = path.join(SHOTS, `ground-${name}.png`);
  if (sel) await page.locator(sel).screenshot({ path: file }); else await page.screenshot({ path: file, fullPage: false });
};

try {
  console.log('Ground Studio — ' + URL_);
  const ctxA = await browser.newContext(phone);
  let page = await open(ctxA);

  /* ── 1. the page, the swatches, the prompts ── */
  console.log('1. the swatches and their prompts');
  const first = await page.evaluate(() => {
    const { S } = window.__ground;
    const prompts = [...document.querySelectorAll('textarea[data-prompt]')];
    return {
      n: S.cat.length, groups: [...document.querySelectorAll('#list h3')].map((h) => h.textContent),
      prompts: prompts.length, count: document.getElementById('count').textContent,
      commons: (prompts.find((t) => t.dataset.prompt === 'commons') || {}).value || '',
      road: (prompts.find((t) => t.dataset.prompt === 'road') || {}).value || '',
      frost1: (prompts.find((t) => t.dataset.prompt === 'frost-1') || {}).value || '',
      map: [document.getElementById('map').width, document.getElementById('map').height],
    };
  });
  ok(`every swatch is listed, in groups (${first.n}: ${first.groups.length} groups)`, first.n === 48 && first.prompts === 48 && first.groups.length === 11 && first.count === '0 of 48', { n: first.n, groups: first.groups, count: first.count });
  ok('a prompt carries the HD pixel art paragraph, its brief, the quiet-ground rule and the scale', /BroTown HD pixel art/.test(first.commons) &&
    /short green grass/.test(first.commons) && /The texture is quiet/.test(first.commons) && /one seventh as tall as this picture/.test(first.commons) &&
    /style key/.test(first.commons) && /seamlessly into the opposite edge/.test(first.commons), first.commons.slice(0, 200));
  /* v2.3.2939, owner: the bro is simple pixel art and the world HD, so only
     the style key is attached, and every material is drawn as itself. */
  ok('...attaching only the style key (never the bro) and asking for every material drawn as itself',
    /Attached is the game's style key/.test(first.commons) && !/hero|\bbro\b/i.test(first.commons) && /Every material is drawn as itself/.test(first.commons));
  ok("a stage's prompt is that stage's ground, and a road's allows the road", /patchy snow melting over wet brown grass/.test(first.frost1) && /whole square is this one surface/.test(first.road) && !/no objects, paths or water/.test(first.road));
  ok('the progress map is the whole Wheel, a pixel a cell', first.map[0] === 1792 && first.map[1] === 1792, first.map);
  const noKey = await page.evaluate(() => !document.getElementById('key-none').hidden);
  ok('with no style key yet, the page sends you to the World Builder for it', noKey);

  /* ── 2. the style key, from the World Builder's storage ── */
  console.log('2. the style key');
  await page.evaluate(async () => {
    const { openStore } = await import('/tools/world/store.js');
    const c = document.createElement('canvas'); c.width = 300; c.height = 300;
    const g = c.getContext('2d');
    const cols = ['#86b94f', '#7b4a26', '#e6d6a3', '#eef3f8', '#3b2c27', '#dfc27c', '#8c8378', '#5f6d3f', '#4f8a3a'];
    cols.forEach((col, i) => { g.fillStyle = col; g.fillRect((i % 3) * 100, Math.floor(i / 3) * 100, 98, 98); });
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    const wb = await openStore('brotown-world-builder');
    await wb.put('misc', 'styleKey', { blob, ext: 'png' });
    wb.close();
  });
  await page.close();
  page = await open(ctxA);
  const key = await page.evaluate(() => ({ chip: document.getElementById('key-chip').textContent, img: !document.getElementById('key-img').hidden, pal: (window.__ground.S.palette || []).length }));
  ok('the style key is found in the World Builder and the colours start from it', key.chip === 'found' && key.img && key.pal === 64, key);

  /* ── 3. pictures in ── */
  console.log('3. pictures in, through the file inputs');
  const pics = {
    commons: await makePicture(page, '#6fa847', 11), road: await makePicture(page, '#b89060', 12),
    'frost-1': await makePicture(page, '#c9d4cf', 13), 'ember-1': await makePicture(page, '#8a7a40', 14),
    'border-ember-frost': await makePicture(page, '#4a4a50', 15),
  };
  for (const id of Object.keys(pics)) await put(page, id, 'A', pics[id]);
  const f = await tileFacts(page, 'commons', 'A');
  ok('a picture comes out as one 512 art px tile on the 1.5 px grid', f.w === 512 && f.h === 512, f);
  ok('...hard-edged, on the one palette, at most 64 colours', f.semi === 0 && f.offPalette === 0 && f.colours <= 64 && f.colours > 4, f);
  ok('...and seamless: its wrap-round edge is no worse than two columns inside it', f.wrap <= f.inside * 1.6 + 6, f);
  const after = await page.evaluate(() => {
    const S = window.__ground.S;
    return { count: document.getElementById('count').textContent, chip: document.querySelector('[data-chip="commons"]').textContent,
      thumb: document.querySelector('canvas[data-thumb="commons|A"]').width, means: Object.keys(S.means).length };
  });
  ok('progress counts it, its card says A, and a thumbnail shows the repeat', after.count === '5 of 48' && after.chip === 'A' && after.thumb === 192 && after.means === 5, after);
  const mapPx = await page.evaluate(() => {
    const S = window.__ground.S, cv = document.getElementById('map'), g = cv.getContext('2d');
    const i = S.mm.mat.findIndex((q) => S.mm.ids[q] === 'commons');
    const x = i % S.bp.w, y = Math.floor(i / S.bp.w);
    const d = g.getImageData(x, y, 1, 1).data;
    return { px: [d[0], d[1], d[2]], mean: S.means.commons };
  });
  ok('the progress map shows the commons in its new colour', mapPx.px.every((v, k) => Math.abs(v - mapPx.mean[k]) <= 2), mapPx);

  /* ── 4. the preview ── */
  console.log('4. the preview at game size');
  await page.evaluate(() => { const S = window.__ground.S; const sp = window.__ground.api.spotFor('commons'); window.__ground.api.setSpot(sp.x, sp.y, 'test'); });
  const pv = await page.evaluate(() => {
    const cv = document.getElementById('pv'), g = cv.getContext('2d');
    const d = g.getImageData(0, 0, cv.width, cv.height).data;
    let n = 0, sum = 0, sum2 = 0;
    for (let i = 0; i < d.length; i += 4 * 97) { const l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; sum += l; sum2 += l * l; n++; }
    const m = sum / n;
    /* the bro: dark outline pixels round the middle of the screen, where he stands */
    const cx = Math.round(cv.width / 2), cy = Math.round(cv.height * 0.56);
    let dark = 0;
    for (let y = cy - 200; y < cy; y += 3) for (let x = cx - 40; x < cx + 40; x += 3) { const o = (y * cv.width + x) * 4; if (d[o] + d[o + 1] + d[o + 2] < 120) dark++; }
    return { w: cv.width, h: cv.height, sd: Math.sqrt(Math.max(0, sum2 / n - m * m)), dark, inview: document.getElementById('inview').textContent };
  });
  ok('the preview draws the ground on a phone-shaped screen', pv.w > 900 && pv.h > 2000 && pv.sd > 4, pv);
  ok('...with the bro standing in the middle', pv.dark > 20, pv.dark);
  ok('...and says which swatches are on screen', /Brotown Commons/.test(pv.inview), pv.inview);
  await page.evaluate(() => { const sp = window.__ground.api.spotFor('frost-2'); window.__ground.api.setSpot(sp.x, sp.y, 'test'); });
  const missing = await page.evaluate(() => document.getElementById('inview').textContent);
  ok('...and which are not made yet', /not made yet/.test(missing), missing);
  await page.evaluate(() => { const sp = window.__ground.api.spotFor('road'); window.__ground.api.setSpot(sp.x, sp.y, 'The Mill Bridge'); });
  await page.evaluate(() => document.getElementById('toast').setAttribute('hidden', ''));
  await shot(page, 'preview', '#phone');
  await shot(page, 'map', '.mapwrap');
  const moved = await page.evaluate(async () => {
    const S = window.__ground.S, before = { ...S.view };
    const ph = document.getElementById('phone').getBoundingClientRect();
    const fire = (type, x, y) => document.getElementById('phone').dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 1 }));
    fire('pointerdown', ph.left + 200, ph.top + 300); fire('pointermove', ph.left + 120, ph.top + 300); fire('pointerup', ph.left + 120, ph.top + 300);
    return { dx: S.view.x - before.x, draws: S.stats.previewDraws };
  });
  ok('dragging the preview looks around', moved.dx > 20, moved);

  /* ── 5. frozen colours ── */
  console.log('5. frozen colours');
  await page.click('#freeze');
  const pal1 = await page.evaluate(() => JSON.stringify(window.__ground.S.palette));
  await put(page, 'frost-2', 'A', await makePicture(page, '#e8eef6', 16));
  const frozen = await page.evaluate((p1) => ({ same: JSON.stringify(window.__ground.S.palette) === p1, chip: document.getElementById('pal-chip').textContent }), pal1);
  const f2 = await tileFacts(page, 'frost-2', 'A');
  ok('frozen colours stay the same when a new swatch comes in, and it is moved onto them', frozen.same && frozen.chip === 'frozen' && f2.offPalette === 0, { frozen, f2 });
  await put(page, 'commons', 'B', await makePicture(page, '#79b04e', 17));
  const both = await page.evaluate(() => document.querySelector('[data-chip="commons"]').textContent);
  ok('a second version goes in beside the first', both === 'A + B', both);

  /* ── 6. reload, and a zip into a fresh browser ── */
  console.log('6. reload, download and restore');
  const hashOf = (p) => p.evaluate(() => {
    const S = window.__ground.S; let h = 0;
    for (const id of Object.keys(S.tiles).sort()) for (const v of ['A', 'B']) {
      const t = S.tiles[id].byVer[v]; if (!t) continue;
      for (let i = 0; i < t.data.length; i += 61) h = (Math.imul(h, 31) + t.data[i]) | 0;
    }
    return { h, n: Object.keys(S.tiles).length, frozen: S.frozen };
  });
  const h1 = await hashOf(page);
  await page.close();
  page = await open(ctxA);
  const h2 = await hashOf(page);
  ok('everything survives a reload, the same to the pixel', h1.h === h2.h && h2.n === 6 && h2.frozen, { h1, h2 });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#export')]);
  const zipPath = await dl.path();
  const zipBytes = fs.readFileSync(zipPath);
  ok('Download all gives a zip with the manifest, every swatch as the game uses it, and every original',
    zipBytes.includes(Buffer.from('manifest.json')) && zipBytes.includes(Buffer.from('ground/commons-A.png')) && zipBytes.includes(Buffer.from('ground/commons-B.png')) &&
    zipBytes.includes(Buffer.from('originals/frost-2-A.png')) && zipBytes.includes(Buffer.from('"frozen": true')), zipBytes.length);
  const ctxB = await browser.newContext(phone);
  const pageB = await open(ctxB);
  await pageB.setInputFiles('#restore', { name: 'backup.zip', mimeType: 'application/zip', buffer: zipBytes });
  await pageB.waitForFunction(() => Object.keys(window.__ground.S.tiles).length === 6 && document.getElementById('busy').hidden, null, { timeout: 60000 });
  const h3 = await hashOf(pageB);
  ok('restoring the zip in a fresh browser gives the same swatches, pixel for pixel', h3.h === h1.h && h3.frozen, { h1, h3 });
  await shot(pageB, 'restored');

  ok('no page errors', page.errs.length === 0 && pageB.errs.length === 0, [...page.errs, ...pageB.errs].slice(0, 3));
} finally {
  await browser.close();
  server.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
