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
 *      use it: 1024 px for 512 game px (v2.3.2942: 2 px per game px, never
 *      blown up), seamless, hard-edged, on one palette of at most
 *      PIXEL.palette colours (128 since v2.3.2940); the progress map and the preview pick it up;
 *   4. THE PREVIEW draws the ground at game size round the bro, and says
 *      which swatches are on screen and which are not made yet;
 *   5. FROZEN COLOURS stay frozen when another swatch comes in;
 *   6. WORK SURVIVES A RELOAD, and a downloaded zip restores into a fresh
 *      browser with the same pixels;
 *   7. no page errors;
 *   8. (v2.3.2947) WHERE TWO GROUNDS MEET: the page explains the edges, every
 *      ground that lies over another has an edge-pieces prompt, and such a
 *      picture comes out as whole pieces on see-through that the preview
 *      scatters along its edges and the zip carries.
 *   9. (v2.3.2951) BLENDS: every pair of alike grounds that meet has a slot,
 *      the town's first, with a prompt that attaches the two grounds; a
 *      blend picture comes out like a swatch, never shifts the colours, is
 *      laid in the preview where the pair meets, marked to redo when one of
 *      its grounds is made again, carried by the zip and removable.
 *
 *   node tools/qa/ground-studio.mjs          (GROUND_SHOTS=dir to keep pictures)
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { PIXEL, personScale } from '../../public/tools/style/bible.js';
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

async function open(ctx, query = '') {
  const page = await ctx.newPage();
  page.errs = [];
  page.on('pageerror', (e) => page.errs.push(String(e)));
  await page.goto(URL_ + query);
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
const tileFacts = (page, id, ver) => page.evaluate(async ([i, v]) => {
  const t = await window.__ground.api.pixelsOf(i, v);
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
    /short green grass/.test(first.commons) && /The texture is quiet/.test(first.commons) && first.commons.includes(personScale(PIXEL.groundTile * PIXEL.gamePxPerArtPx)) && /one fifth as tall as this picture/.test(first.commons) &&
    /style key/.test(first.commons) && /seamlessly into the opposite edge/.test(first.commons), first.commons.slice(0, 200));
  /* v2.3.2939, owner: the bro is simple pixel art and the world HD, so only
     the style key is attached, and every material is drawn as itself. */
  ok('...attaching only the style key (never the bro) and asking for every material drawn as itself',
    /Attached is the game's style key/.test(first.commons) && !/hero|\bbro\b/i.test(first.commons) && /Every material is drawn as itself/.test(first.commons));
  ok("a stage's prompt is that stage's ground, and a road's allows the road", /patchy snow melting over wet brown grass/.test(first.frost1) && /whole square is this one surface/.test(first.road) && !/no objects, paths or water/.test(first.road));
  /* v2.3.2944, owner: "It's tiling wagon trails sideways" -- nothing in a
     swatch may run one way, and the road no longer asks for ruts */
  ok('every prompt says nothing in it may run one way, and the road asks for no ruts',
    /Nothing in it runs one way/.test(first.commons) && /Nothing in it runs one way/.test(first.road) && /worn evenly all over/.test(first.road) && !/wheel ruts/.test(first.road),
    first.road.slice(0, 260));
  ok('the progress map is the whole Wheel, a pixel a cell', first.map[0] === 1792 && first.map[1] === 1792, first.map);
  /* v2.3.2946, owner: "I can't tell if the ground studio has saved what I
     put in earlier" -- the page says so at the top */
  const saved0 = await page.evaluate(() => ({ chip: document.getElementById('saved-chip').textContent, line: document.getElementById('saved-line').textContent }));
  ok('with nothing made, the page says nothing is saved in this browser yet', saved0.chip === 'none yet' && /Nothing is saved in this browser yet/.test(saved0.line), saved0);
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
  ok('the style key is found in the World Builder and the colours start from it', key.chip === 'found' && key.img && key.pal > 16 && key.pal <= PIXEL.palette, key);
  /* (not exactly PIXEL.palette: the median cut stops early when the test's
     made-up key has too few distinct colours -- 127 of 128 in v2.3.2940) */

  /* ── 3. pictures in ── */
  console.log('3. pictures in, through the file inputs');
  const pics = {
    commons: await makePicture(page, '#6fa847', 11), road: await makePicture(page, '#b89060', 12),
    'frost-1': await makePicture(page, '#c9d4cf', 13), 'ember-1': await makePicture(page, '#8a7a40', 14),
    'border-ember-frost': await makePicture(page, '#4a4a50', 15),
  };
  for (const id of Object.keys(pics)) await put(page, id, 'A', pics[id]);
  const f = await tileFacts(page, 'commons', 'A');
  ok('a picture comes out as one 1024 px tile: 512 game px at 2 px per game px, never blown up', f.w === PIXEL.groundTile && f.h === PIXEL.groundTile && PIXEL.groundTile * PIXEL.gamePxPerArtPx === 512, f);
  ok(`...hard-edged, on the one palette, at most ${PIXEL.palette} colours`, f.semi === 0 && f.offPalette === 0 && f.colours <= PIXEL.palette && f.colours > 4, f);
  ok('...and seamless: its wrap-round edge is no worse than two columns inside it', f.wrap <= f.inside * 1.6 + 6, f);
  const after = await page.evaluate(() => {
    const S = window.__ground.S;
    return { count: document.getElementById('count').textContent, chip: document.querySelector('[data-chip="commons"]').textContent,
      thumb: document.querySelector('canvas[data-thumb="commons|A"]').width, means: Object.keys(S.means).length };
  });
  ok('progress counts it, its card says A, and a thumbnail shows the repeat', after.count === '5 of 48' && after.chip === 'A' && after.thumb === 192 && after.means === 5, after);
  const saved1 = await page.evaluate(() => ({ chip: document.getElementById('saved-chip').textContent, line: document.getElementById('saved-line').textContent,
    items: [...document.querySelectorAll('#saved-list li')].map((li) => li.textContent), when: document.getElementById('saved-when').textContent }));
  ok('...and the top of the page says which swatches are saved here, and when the last went in',
    saved1.chip === '5 saved' && /These 5 swatches are saved here/.test(saved1.line) && saved1.items.length === 5 &&
    saved1.items.includes('Brotown Commons') && saved1.items.includes('Road') && /today at/.test(saved1.when), saved1);
  await shot(page, 'saved', '#saved');
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
  await page.evaluate(() => { const sp = window.__ground.api.spotFor('commons'); return window.__ground.api.setSpot(sp.x, sp.y, 'test'); });
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
  await page.evaluate(() => { const sp = window.__ground.api.spotFor('frost-2'); return window.__ground.api.setSpot(sp.x, sp.y, 'test'); });
  const missing = await page.evaluate(() => document.getElementById('inview').textContent);
  ok('...and which are not made yet', /not made yet/.test(missing), missing);
  await page.evaluate(() => { const sp = window.__ground.api.spotFor('road'); return window.__ground.api.setSpot(sp.x, sp.y, 'The Mill Bridge'); });
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
  const hashOf = (p) => p.evaluate(async () => {
    const S = window.__ground.S; let h = 0;
    for (const id of Object.keys(S.tiles).sort()) for (const v of ['A', 'B']) {
      if (!S.tiles[id].byVer[v]) continue;
      const t = await window.__ground.api.pixelsOf(id, v);
      for (let i = 0; i < t.data.length; i += 61) h = (Math.imul(h, 31) + t.data[i]) | 0;
    }
    return { h, n: Object.keys(S.tiles).length, frozen: S.frozen };
  });
  const h1 = await hashOf(page);
  await page.close();
  page = await open(ctxA);
  const h2 = await hashOf(page);
  ok('everything survives a reload, the same to the pixel', h1.h === h2.h && h2.n === 6 && h2.frozen, { h1, h2 });
  const saved2 = await page.evaluate(() => document.getElementById('saved-chip').textContent);
  ok('...and after the reload the page still says they are saved', saved2 === '6 saved', saved2);
  /* v2.3.2953: tiles saved before the seamless step changed (the cross-fade
     that left the stones see-through) are made again from the uploads, once:
     the mark taken away and one saved tile spoiled, a reload must bring
     back every swatch the same to the pixel, and put the mark back */
  await page.evaluate(async () => {
    const S = window.__ground.S, c = document.createElement('canvas');
    c.width = c.height = 1024;
    const g = c.getContext('2d'); g.fillStyle = '#ff00ff'; g.fillRect(0, 0, 1024, 1024);
    await S.store.put('prep', 'commons|A', await new Promise((r) => c.toBlob(r, 'image/png')));
    await S.store.del('misc', 'prepMade');
  });
  await page.close();
  page = await open(ctxA);
  const h2b = await hashOf(page);
  const madeMark = await page.evaluate(() => window.__ground.S.store.get('misc', 'prepMade'));
  ok('saved tiles made the old way are made again from the uploads, once, the same to the pixel', h2b.h === h1.h && h2b.n === 6 && /v2\.3\.2953/.test(madeMark || ''), { h1, h2b, madeMark });
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

  /* ── 7. v2.3.2944: a swatch made from an older prompt is marked ── */
  console.log('7. a swatch made from an older prompt');
  const oldPic = await makePicture(page, '#a08050', 18);
  await page.evaluate(async (b64) => {
    const { openStore } = await import('/tools/world/store.js');
    const bin = atob(b64), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const blob = new Blob([u], { type: 'image/png' });
    const st = await openStore('brotown-ground-studio', ['raw', 'prep', 'misc']);
    /* as the studio saved a picture before v2.3.2944: no brief recorded */
    await st.put('raw', 'street|A', { blob, name: 'street-A.png', type: 'image/png' });
    await st.put('prep', 'street|A', blob);
    /* v2.3.2949: the owner's planks, made while the boardwalk's prompt still
       asked for the basket weave -- so recorded with that brief */
    await st.put('raw', 'boardwalk|A', { blob, name: 'boardwalk-A.png', type: 'image/png', at: Date.now(),
      brief: 'weathered wooden decking of short boards in a basket weave: small square blocks of three or four boards, each block turned a quarter turn from its neighbours' });
    await st.put('prep', 'boardwalk|A', blob);
    st.close();
  }, oldPic);
  await page.close();
  page = await open(ctxA);
  const stale = await page.evaluate(() => ({
    street: !!document.querySelector('[data-stale="street"]'),
    road: !!document.querySelector('[data-stale="road"]'),
    commons: !!document.querySelector('[data-stale="commons"]'),
    boardwalk: !!document.querySelector('[data-stale="boardwalk"]'),
    text: (document.querySelector('[data-stale="street"]') || {}).textContent || '',
    walkCard: (document.getElementById('sw-boardwalk') || {}).textContent || '',
    walkPrompt: (document.querySelector('textarea[data-prompt="boardwalk"]') || {}).value || '',
  }));
  ok("a swatch made from an older prompt (the Main Street ruts) is marked to make again; ones made from today's prompts are not",
    stale.street && !stale.road && !stale.commons && /Make this one again/.test(stale.text), stale);
  ok("the boardwalk asks for plain boards that run one way, says the game lays them, and the owner's planks (made under the old prompt) are not marked to redo (v2.3.2949)",
    !stale.boardwalk && /The game lays these boards itself/.test(stale.walkCard) && /The boards all run the same way/.test(stale.walkPrompt) &&
    !/Nothing in it runs one way/.test(stale.walkPrompt) && !/basket weave/.test(stale.walkPrompt), { boardwalk: stale.boardwalk, prompt: stale.walkPrompt.slice(0, 160) });
  await shot(page, 'stale', '#sw-street');

  /* ── 8. v2.3.2947: where two grounds meet ── */
  console.log('8. where two grounds meet: layers and edges; the edge pieces put away (v2.3.2948)');
  /* v2.3.2948, owner: "I don't see any difference I'll put away the edge
     piece stuff."  The plain page shows none of them... */
  const away = await page.evaluate(() => ({
    on: window.__ground.pieces,
    prompts: document.querySelectorAll('textarea[data-edge-prompt]').length,
    blocks: document.querySelectorAll('[data-edge]').length,
    hidden: [...document.querySelectorAll('[data-pieces]')].map((n) => n.hidden),
    steps: [...document.querySelectorAll('ol.plan li')].filter((li) => li.offsetParent !== null).map((li) => li.textContent.slice(0, 40)),
    card: document.getElementById('edges').innerText,
    bullets: document.querySelectorAll('#edges > ul.plan li').length,
    spots: [...document.querySelectorAll('#spot optgroup')].filter((g) => g.label === 'Where grounds meet').map((g) => g.children.length)[0] || 0,
  }));
  ok('edge pieces are put away: no slot or prompt under any swatch, and no step or paragraph about them',
    away.on === false && away.prompts === 0 && away.blocks === 0 && away.hidden.length === 3 && away.hidden.every(Boolean) &&
    !away.steps.some((t) => /Edge pieces/i.test(t)) && !/edge pieces/i.test(away.card), away);
  ok('...while the page still says how grounds meet, and the preview can jump to the longest edges',
    away.bullets === 5 && /The higher ground lies over the lower/.test(away.card) && /much alike mix over a wide zone/.test(away.card) && away.spots >= 8, { bullets: away.bullets, spots: away.spots });
  /* ...and ?edgepieces brings every part of them back, as before */
  const pageP = await open(ctxA, '?edgepieces');
  const meet = await pageP.evaluate(() => ({
    pairs: +document.getElementById('pair-count').textContent, road: +document.getElementById('road-count').textContent,
    made: document.getElementById('edge-count').textContent,
    prompts: [...document.querySelectorAll('textarea[data-edge-prompt]')].map((t) => t.dataset.edgePrompt),
    commons: (document.querySelector('textarea[data-edge-prompt="commons"]') || {}).value || '',
    over: (document.querySelector('[data-edge="commons"] .sw-where') || {}).textContent || '',
    spots: [...document.querySelectorAll('#spot optgroup')].filter((g) => g.label === 'Where grounds meet').map((g) => g.children.length)[0] || 0,
  }));
  ok(`the page explains how grounds meet: ${meet.pairs} pairs touch on the Wheel, ${meet.road} of them with the road`, meet.pairs > 150 && meet.road > 30 && /of 39 made/.test(meet.made), meet);
  ok('every ground that lies over another has an edge-pieces prompt, and only those (39: not the road, the boardwalk, the square or the metal floors)',
    meet.prompts.length === 39 && meet.prompts.includes('commons') && !meet.prompts.includes('road') && !meet.prompts.includes('boardwalk') && !meet.prompts.includes('plaza') && !meet.prompts.includes('thunder-2'), meet.prompts.length);
  ok("...asking for the ground's own loose pieces on one flat magenta, matched to its swatch, never the bro, nothing running one way",
    /Loose EDGE PIECES/.test(meet.commons) && /short green grass/.test(meet.commons) && /#FF00FF/.test(meet.commons) && /this ground's own swatch/.test(meet.commons) &&
    /style key/.test(meet.commons) && /Nothing in it runs one way/.test(meet.commons) && !/hero|\bbro\b/i.test(meet.commons) && /BroTown HD pixel art/.test(meet.commons), meet.commons.slice(0, 240));
  ok('...says what that ground lies over, and the preview can jump to the longest edges', /lies over Road/.test(meet.over) && meet.spots >= 8, { over: meet.over, spots: meet.spots });
  /* a ChatGPT-shaped edge-pieces picture: 1254 px of flat magenta, fifty
     soft-edged clumps in three greens, and two cut by the picture's edge */
  const piecesPic = await pageP.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 1254; c.height = 1254;
    const g = c.getContext('2d');
    g.fillStyle = '#FF00FF'; g.fillRect(0, 0, 1254, 1254);
    let s = 99;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const clump = (x, y, r) => {
      for (const [col, k] of [['#3f7a2c', 1], ['#5f9a3a', 0.72], ['#8cc454', 0.4]]) {
        g.fillStyle = col; g.beginPath(); g.arc(x - r * 0.1 * (1 - k), y - r * 0.15 * (1 - k), r * k, 0, 7); g.fill();
      }
    };
    for (let i = 0; i < 50; i++) { const col = i % 10, row = Math.floor(i / 10); clump(90 + col * 118 + rnd() * 30, 110 + row * 235 + rnd() * 60, 18 + rnd() * 12); }
    clump(0, 600, 30); clump(700, 1254, 30);
    const b = await new Promise((r) => c.toBlob(r, 'image/png'));
    const buf = new Uint8Array(await b.arrayBuffer());
    let str = '';
    for (let i = 0; i < buf.length; i += 0x8000) str += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return btoa(str);
  });
  await pageP.setInputFiles('input[data-file="commons|E"]', { name: 'commons-E.png', mimeType: 'image/png', buffer: Buffer.from(piecesPic, 'base64') });
  await pageP.waitForFunction(() => window.__ground.S.edges.commons && document.getElementById('busy').hidden, null, { timeout: 60000 });
  const ef = await pageP.evaluate(async () => {
    const S = window.__ground.S, t = await window.__ground.api.pixelsOf('commons', 'E'), d = t.data;
    const pal = new Set((S.palette || []).map((c) => (c[0] << 16) | (c[1] << 8) | c[2]));
    let clear = 0, magenta = 0, off = 0, semi = 0;
    for (let k = 0; k < d.length; k += 4) {
      if (d[k + 3] === 0) { clear++; continue; }
      if (d[k + 3] !== 255) semi++;
      if (d[k] > 190 && d[k + 1] < 90 && d[k + 2] > 190) magenta++;
      if (!pal.has((d[k] << 16) | (d[k + 1] << 8) | d[k + 2])) off++;
    }
    return { w: t.w, pieces: S.edges.commons.pieces, clear: clear / (d.length / 4), magenta, off, semi,
      card: (document.querySelector('[data-edge="commons"]') || {}).textContent || '', made: document.getElementById('edge-count').textContent,
      saved: [...document.querySelectorAll('#saved-list li')].map((li) => li.textContent) };
  });
  ok(`an edge-pieces picture comes out as its pieces, cut out whole (${ef.pieces} of the 50; the two the picture's edge cuts are left out)`, ef.pieces >= 45 && ef.pieces <= 50 && ef.w === PIXEL.groundTile, ef);
  ok('...on see-through, with no magenta left on them, hard-edged and on the one palette', ef.clear > 0.8 && ef.magenta === 0 && ef.semi === 0 && ef.off === 0, ef);
  ok('...and the page says so: its card, the count, and what is saved here', new RegExp(`${ef.pieces} pieces found`).test(ef.card) && /1 of 39 made/.test(ef.made) && ef.saved.includes('Brotown Commons (A and B, edge pieces)'), { made: ef.made, saved: ef.saved });
  await pageP.evaluate(() => window.__ground.api.showEdge('commons'));
  const laid = await pageP.evaluate(async () => {
    const { composeGround } = await import('/tools/world/core/ground.js');
    const S = window.__ground.S, api = window.__ground.api, rect = S.pv.rect;
    const tiles = { commons: { A: await api.pixelsOf('commons', 'A'), B: await api.pixelsOf('commons', 'B'), E: await api.pixelsOf('commons', 'E') }, road: { A: await api.pixelsOf('road', 'A') } };
    const withE = composeGround(S.plan, S.bp, S.mm, rect, tiles, { scale: 3 });
    const noE = composeGround(S.plan, S.bp, S.mm, rect, { ...tiles, commons: { ...tiles.commons, E: null } }, { scale: 3 });
    let changed = 0, onRoad = 0;
    for (let i = 0; i < withE.mat.length; i++) if (withE.data[i * 4] !== noE.data[i * 4] || withE.data[i * 4 + 1] !== noE.data[i * 4 + 1]) { changed++; if (S.mm.ids[noE.mat[i]] === 'road') onRoad++; }
    return { name: S.view.name, changed, onRoad, inview: document.getElementById('inview').textContent };
  });
  ok(`"See an edge on the map" shows where the commons lies over the road, and its pieces are scattered on the road there (${laid.onRoad} px)`,
    /Brotown Commons over Road/.test(laid.name) && laid.changed > 200 && laid.onRoad > 100, laid);
  await pageP.evaluate(() => document.getElementById('toast').setAttribute('hidden', ''));
  await shot(pageP, 'edge', '#phone');
  await shot(pageP, 'edge-card', '[data-edge="commons"]');
  const [dl2] = await Promise.all([pageP.waitForEvent('download'), pageP.click('#export')]);
  const zip2 = fs.readFileSync(await dl2.path());
  const edgeHash = (p) => p.evaluate(async () => {
    const t = await window.__ground.api.pixelsOf('commons', 'E');
    let h = 0; for (let i = 0; i < t.data.length; i += 7) h = (Math.imul(h, 31) + t.data[i]) | 0;
    return { h, pieces: window.__ground.S.edges.commons && window.__ground.S.edges.commons.pieces };
  });
  const e1 = await edgeHash(pageP);
  const ctxC = await browser.newContext(phone);
  const pageC = await open(ctxC);
  await pageC.setInputFiles('#restore', { name: 'backup.zip', mimeType: 'application/zip', buffer: zip2 });
  await pageC.waitForFunction(() => window.__ground.S.edges.commons && document.getElementById('busy').hidden, null, { timeout: 60000 });
  const e2 = await edgeHash(pageC);
  ok('the zip carries the edge pieces (ground/commons-E.png and the original), and they restore pixel for pixel',
    zip2.includes(Buffer.from('ground/commons-E.png')) && zip2.includes(Buffer.from('originals/commons-E.png')) && e1.h === e2.h && e1.pieces === e2.pieces, { e1, e2 });
  /* v2.3.2948: that browser has no ?edgepieces -- it kept them (above), and
     shows none: the preview is the ground with no pieces, to the pixel */
  const quiet = await pageC.evaluate(async () => {
    const { composeGround, swatchesUnder } = await import('/tools/world/core/ground.js');
    const S = window.__ground.S, api = window.__ground.api;
    await api.showEdge('commons');
    const rect = S.pv.rect, tiles = Object.create(null);
    for (const id of swatchesUnder(S.bp, S.mm, rect)) {
      const t = S.tiles[id];
      if (!t) continue;
      const A = t.byVer.A ? await api.pixelsOf(id, 'A') : null, B = t.byVer.B ? await api.pixelsOf(id, 'B') : null;
      tiles[id] = { A: A || B, B: A && B ? B : null, E: null };
    }
    const noE = composeGround(S.plan, S.bp, S.mm, rect, tiles, { scale: 3 });
    const c = S.pv.canvas, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let diff = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] !== noE.data[i] || d[i + 1] !== noE.data[i + 1] || d[i + 2] !== noE.data[i + 2]) diff++;
    return { name: S.view.name, diff, same: c.width === noE.w && c.height === noE.h, pieces: window.__ground.pieces,
      blocks: document.querySelectorAll('[data-edge]').length, saved: [...document.querySelectorAll('#saved-list li')].map((li) => li.textContent) };
  });
  ok('...and a browser without ?edgepieces keeps them but shows none: not on the map, not under the swatch, not in the saved list',
    quiet.pieces === false && /Brotown Commons over Road/.test(quiet.name) && quiet.same && quiet.diff === 0 && quiet.blocks === 0 &&
    quiet.saved.includes('Brotown Commons (A and B)') && !quiet.saved.some((t) => /edge pieces/.test(t)), quiet);
  /* a swatch picture put in as edge pieces by mistake: nothing to cut out */
  await pageP.setInputFiles('input[data-file="ember-1|E"]', { name: 'ember-1-E.png', mimeType: 'image/png', buffer: Buffer.from(pics['ember-1'], 'base64') });
  await pageP.waitForFunction(() => window.__ground.S.edges['ember-1'] && document.getElementById('busy').hidden, null, { timeout: 60000 });
  const wrong = await pageP.evaluate(() => ({ pieces: window.__ground.S.edges['ember-1'].pieces, bad: !!document.querySelector('[data-edge="ember-1"] .edge-bad') }));
  ok('a picture with no magenta background gives no pieces, and the card says why', wrong.pieces === 0 && wrong.bad, wrong);

  /* ── 9. v2.3.2951: blends between alike grounds ── */
  console.log('9. blends between alike grounds');
  /* Owner: "have chatGPT make a blend of the two surfaces that are mapped
     together" ... "Bottom right looks the best by a moderate margin" ...
     "Yes build it". */
  /* v2.3.2955: then, once two pictures a pair were enough: "Yeah hide it".
     Put away like the edge pieces: no card, step or mention without ?blends */
  const blOff = await page.evaluate(() => ({
    on: window.__ground.blends, card: !!document.getElementById('blends') && document.getElementById('blends').offsetParent !== null,
    blocks: document.querySelectorAll('[data-blend]').length,
    step: [...document.querySelectorAll('ol.plan li')].some((li) => /Blends/.test(li.textContent) && li.offsetParent !== null),
    mention: [...document.querySelectorAll('[data-blends]')].some((n) => n.offsetParent !== null),
  }));
  ok('blends are put away: no Blends card, no step, no mention, unless the address says ?blends (v2.3.2955)',
    blOff.on === false && !blOff.card && blOff.blocks === 0 && !blOff.step && !blOff.mention, blOff);
  const offErrs = page.errs;
  await page.close();
  page = await open(ctxA, '?blends');
  const bl0 = await page.evaluate(() => {
    const S = window.__ground.S;
    const blocks = [...document.querySelectorAll('#blend-list [data-blend]')];
    const card = (k) => (document.querySelector(`[data-blend="${k}"]`) || {}).textContent || '';
    return {
      n: blocks.length, pairs: S.blendPairs.length, first: blocks.slice(0, 3).map((b) => b.dataset.blend),
      restN: document.querySelectorAll('#blend-rest [data-blend]').length, rest: (document.querySelector('#blend-rest > summary') || {}).textContent || '',
      chip: document.getElementById('blend-chip').textContent,
      prompt: (document.querySelector('textarea[data-blend-prompt="plaza__town-yard"]') || {}).value || '',
      sqCard: card('plaza__town-yard'),
      step: [...document.querySelectorAll('ol.plan li')].some((li) => /Blends/.test(li.textContent) && li.offsetParent !== null),
    };
  });
  ok(`every pair of alike grounds that meet has a blend slot (${bl0.n}), the town's three first, the rest folded away`,
    bl0.n === 42 && bl0.pairs === 42 && JSON.stringify(bl0.first) === '["plaza__town-yard","street__town-yard","plaza__street"]' && bl0.restN === 39 && /The other 39 pairs/.test(bl0.rest) && bl0.chip === 'optional' && bl0.step, bl0);
  ok('...its prompt asks for the ground halfway between the two, attaching the two ground pictures (not the style key, never the bro), nothing running one way, seamless',
    /halfway between two grounds/.test(bl0.prompt) && /Town square: packed pale gravel/.test(bl0.prompt) && /Brotown yards: packed earth/.test(bl0.prompt) &&
    /Attached are the two ground pictures it goes between: Town square and Brotown yards/.test(bl0.prompt) && !/style key/.test(bl0.prompt) && !/hero|\bbro\b/i.test(bl0.prompt) &&
    /Nothing in it runs one way/.test(bl0.prompt) && /seamlessly into the opposite edge/.test(bl0.prompt) && /BroTown HD pixel art/.test(bl0.prompt), bl0.prompt.slice(0, 300));
  ok('...and a pair whose grounds are not made yet says to make them first', /Make Town square and Brotown yards first/.test(bl0.sqCard), bl0.sqCard.slice(0, 200));
  await put(page, 'plaza', 'A', await makePicture(page, '#c8bca0', 21));
  await put(page, 'town-yard', 'A', await makePicture(page, '#b07840', 22));
  /* colours made from the swatches, not frozen: a blend must not change them */
  await page.evaluate(async () => { if (window.__ground.S.frozen) document.getElementById('freeze').click(); });
  await page.waitForFunction(() => !window.__ground.S.frozen && document.getElementById('busy').hidden, null, { timeout: 60000 });
  const palBefore = await page.evaluate(() => JSON.stringify(window.__ground.S.palette));
  const pairBtn = await page.evaluate(() => !!document.querySelector('[data-blend="plaza__town-yard"] [data-pair="plaza__town-yard"]'));
  ok('...once both are made, the button to save or share the two pictures is there', pairBtn);
  await page.setInputFiles('input[data-file="plaza__town-yard|M"]', { name: 'plaza-yard-blend.png', mimeType: 'image/png', buffer: Buffer.from(await makePicture(page, '#bc9a70', 23), 'base64') });
  await page.waitForFunction(() => window.__ground.S.blends['plaza__town-yard'] && document.getElementById('busy').hidden, null, { timeout: 60000 });
  const bf = await tileFacts(page, 'plaza__town-yard', 'M');
  ok('a blend picture comes out like a swatch: one 1024 px tile, hard-edged, on the palette, seamless', bf.w === PIXEL.groundTile && bf.semi === 0 && bf.offPalette === 0 && bf.wrap <= bf.inside * 1.6 + 6, bf);
  const bl1 = await page.evaluate(async () => {
    const S = window.__ground.S;
    await new Promise((r) => setTimeout(r, 50));
    return {
      pal: JSON.stringify(S.palette), chip: document.getElementById('blend-chip').textContent,
      card: (document.querySelector('[data-blend-chip="plaza__town-yard"]') || {}).textContent,
      view: S.view.name, laid: (S.pv.blendsLaid || []).find((b) => b.key === 'plaza__town-yard') || null,
      inview: document.getElementById('inview').textContent,
      saved: [...document.querySelectorAll('#saved-list li')].map((li) => li.textContent), status: document.getElementById('status').textContent,
    };
  });
  ok('...never changes the colours the swatches are moved onto', bl1.pal === palBefore);
  ok('...its card and the count say it is made, and the top of the page says it is saved', bl1.card === 'made' && bl1.chip === '1 of 42 made' && bl1.saved.includes('Town square and Brotown yards (blend)') && /and 1 blend\./.test(bl1.status), bl1);
  ok(`...and the preview jumps to where the square meets the yards and lays it there (${bl1.laid && bl1.laid.px} px)`,
    /Where Town square and Brotown yards meet/.test(bl1.view) && !!bl1.laid && bl1.laid.px > 1000 && /blend: Town square and Brotown yards/.test(bl1.inview), bl1);
  const blLaid = await page.evaluate(async () => {
    const { composeGround, swatchesUnder } = await import('/tools/world/core/ground.js');
    const S = window.__ground.S, api = window.__ground.api, rect = S.pv.rect, tiles = Object.create(null);
    for (const id of swatchesUnder(S.bp, S.mm, rect)) {
      const t = S.tiles[id];
      if (!t) continue;
      const A = t.byVer.A ? await api.pixelsOf(id, 'A') : null, B = t.byVer.B ? await api.pixelsOf(id, 'B') : null;
      tiles[id] = { A: A || B, B: A && B ? B : null, E: null };
    }
    const bt = await api.pixelsOf('plaza__town-yard', 'M');
    const withB = composeGround(S.plan, S.bp, S.mm, rect, tiles, { scale: 3, blends: { 'plaza__town-yard': bt } });
    const noB = composeGround(S.plan, S.bp, S.mm, rect, tiles, { scale: 3 });
    const c = S.pv.canvas, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const cols = new Set();
    for (let i = 0; i < bt.data.length; i += 4) cols.add((bt.data[i] << 16) | (bt.data[i + 1] << 8) | bt.data[i + 2]);
    let asPv = 0, changed = 0, notBlend = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] !== withB.data[i] || d[i + 1] !== withB.data[i + 1] || d[i + 2] !== withB.data[i + 2]) asPv++;
      if (withB.data[i] !== noB.data[i] || withB.data[i + 1] !== noB.data[i + 1] || withB.data[i + 2] !== noB.data[i + 2]) { changed++; if (!cols.has((withB.data[i] << 16) | (withB.data[i + 1] << 8) | withB.data[i + 2])) notBlend++; }
    }
    return { asPv, changed, notBlend, n: d.length / 4 };
  });
  ok(`...the preview is the ground laid with the blend, to the pixel; it changes ${blLaid.changed} px, each from the blend picture or its two grounds`,
    blLaid.asPv === 0 && blLaid.changed > 1000 && blLaid.notBlend < blLaid.changed * 0.35, blLaid);
  await page.evaluate(() => document.getElementById('toast').setAttribute('hidden', ''));
  await shot(page, 'blend', '#phone');
  await shot(page, 'blend-card', '[data-blend="plaza__town-yard"]');
  /* (colours frozen again before the zip, as the owner will have them: a
     fresh browser remakes unfrozen colours from what it has -- here, no
     style key -- so only frozen ones restore to the pixel) */
  await page.click('#freeze');
  await page.waitForFunction(() => window.__ground.S.frozen && document.getElementById('busy').hidden, null, { timeout: 60000 });
  const [dl3] = await Promise.all([page.waitForEvent('download'), page.click('#export')]);
  const zip3 = fs.readFileSync(await dl3.path());
  const blendHash = (p) => p.evaluate(async () => {
    const t = await window.__ground.api.pixelsOf('plaza__town-yard', 'M');
    if (!t) return null;
    let h = 0; for (let i = 0; i < t.data.length; i += 7) h = (Math.imul(h, 31) + t.data[i]) | 0;
    return h;
  });
  const bh1 = await blendHash(page);
  const ctxD = await browser.newContext(phone);
  const pageD = await open(ctxD);
  await pageD.setInputFiles('#restore', { name: 'backup.zip', mimeType: 'application/zip', buffer: zip3 });
  await pageD.waitForFunction(() => window.__ground.S.blends['plaza__town-yard'] && document.getElementById('busy').hidden, null, { timeout: 60000 });
  const bh2 = await blendHash(pageD);
  ok('the zip carries the blend (ground/plaza__town-yard-M.png, the original, and the manifest), and it restores pixel for pixel',
    zip3.includes(Buffer.from('ground/plaza__town-yard-M.png')) && zip3.includes(Buffer.from('originals/plaza__town-yard-M.png')) && zip3.includes(Buffer.from('"key": "plaza__town-yard"')) && bh1 !== null && bh1 === bh2, { bh1, bh2 });
  /* v2.3.2955: ...into a browser without ?blends too, which keeps it and
     shows none of it: not in the card, the counts or the preview */
  const dOff = await pageD.evaluate(() => ({
    card: document.getElementById('blends').offsetParent !== null, status: document.getElementById('status').textContent,
    saved: document.getElementById('saved-list').textContent, laid: (window.__ground.S.pv && window.__ground.S.pv.blendsLaid || []).length,
  }));
  ok('...and a browser without ?blends keeps it but shows none of it: no card, not counted, not laid in the preview', !dOff.card && !/blend/.test(dOff.status) && !/blend/.test(dOff.saved) && dOff.laid === 0, dOff);
  /* one of its grounds made again after it: marked to redo */
  await put(page, 'plaza', 'A', await makePicture(page, '#ccc0a4', 24));
  const redo = await page.evaluate(() => ((document.querySelector('[data-blend="plaza__town-yard"] .sw-stale') || {}).textContent || ''));
  ok('...and when one of its grounds is made again after it, the blend is marked to make again', /Town square was made again after this blend/.test(redo), redo);
  await page.click('[data-blend="plaza__town-yard"] [data-remove="plaza__town-yard|M"]');
  await page.waitForFunction(() => !window.__ground.S.blends['plaza__town-yard'] && document.getElementById('busy').hidden, null, { timeout: 60000 });
  const gone = await page.evaluate(() => ({ chip: document.getElementById('blend-chip').textContent, card: (document.querySelector('[data-blend-chip="plaza__town-yard"]') || {}).textContent }));
  ok('...and it can be removed: the pair mixes without one again', gone.chip === 'optional' && gone.card === 'not made', gone);

  /* ── 10. v2.3.2957: download for the game ── */
  console.log('10. download for the game');
  /* Owner: "It's 279mb in the zip file. Isn't that way too much for GitHub?
     And the game in general?" -- the game's zips carry no originals, every
     finished tile as palette numbers, each zip under GitHub's 25 MB */
  const game = await page.evaluate(async () => {
    const api = window.__ground.api;
    const { unzip } = await import('/tools/world/core/zip.js');
    const full = await unzip(await api.exportZip());
    const fullGround = full.filter((f) => f.name.startsWith('ground/'));
    const decode = async (bytes) => {
      const bm = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const c = new OffscreenCanvas(bm.width, bm.height), x = c.getContext('2d');
      x.drawImage(bm, 0, 0);
      return x.getImageData(0, 0, bm.width, bm.height).data;
    };
    const check = async (zips) => {
      const names = [], sizes = [], bad = [];
      let originals = 0, manifests = 0, palette = 0, bytes = 0;
      for (const z of zips) {
        sizes.push(z.bytes.length);
        for (const f of await unzip(z.bytes)) {
          if (f.name === 'manifest.json') {
            const m = JSON.parse(new TextDecoder().decode(f.data));
            if (m.forGame === true && m.part === z.part && m.parts === z.parts && Array.isArray(m.swatches) && m.swatches.length && Array.isArray(m.palette)) manifests++;
            continue;
          }
          if (f.name.startsWith('originals/')) { originals++; continue; }
          names.push(f.name);
          bytes += f.data.length;
          if (f.data[25] === 3) palette++;          /* IHDR's colour type: 3, palette */
          const ref = fullGround.find((g) => g.name === f.name);
          const a = await decode(f.data), b = ref ? await decode(ref.data) : null;
          if (!b || a.length !== b.length || a.some((v, i) => v !== b[i])) bad.push(f.name);
        }
      }
      return { parts: zips.length, sizes, names: names.sort(), bad, originals, manifests, palette, bytes };
    };
    const one = await check(await api.exportGameZips());
    /* parts small enough to hold two or three pictures, to see the split */
    const biggest = Math.max(...fullGround.map((f) => f.data.length));
    const limit = Math.ceil(2.5 * biggest) + 8192;
    const split = await check(await api.exportGameZips(limit));
    return { one, split, limit, fullNames: fullGround.map((f) => f.name).sort(), fullBytes: fullGround.reduce((s, f) => s + f.data.length, 0),
      fullOriginals: full.filter((f) => f.name.startsWith('originals/')).length };
  });
  const opaque = (names) => names.filter((n) => !/-E\.png$/.test(n)).length;
  ok(`"Download for the game" carries every finished picture the backup does (${game.one.names.length}) and none of the originals (the backup has ${game.fullOriginals}), in one zip under GitHub's 25 MB`,
    game.one.parts === 1 && game.one.sizes[0] < 24e6 && game.one.originals === 0 && game.fullOriginals > 0 && game.one.manifests === 1 &&
    JSON.stringify(game.one.names) === JSON.stringify(game.fullNames) && game.one.names.length >= 3, { ...game.one, bad: game.one.bad.slice(0, 3) });
  ok(`...every one the very same pixels as the backup's, the opaque ones saved as palette numbers: ${(game.one.bytes / 1e6).toFixed(2)} MB against ${(game.fullBytes / 1e6).toFixed(2)}`,
    game.one.bad.length === 0 && game.one.palette === opaque(game.one.names) && game.one.bytes < game.fullBytes, { bad: game.one.bad.slice(0, 3), palette: game.one.palette, bytes: game.one.bytes, fullBytes: game.fullBytes });
  ok(`...and more than fits one zip is split, every part under its limit and carrying the manifest, together every picture once (${game.split.parts} parts of up to ${(game.limit / 1e6).toFixed(2)} MB)`,
    game.split.parts >= 2 && game.split.sizes.every((n) => n <= game.limit) && game.split.manifests === game.split.parts && game.split.originals === 0 &&
    JSON.stringify(game.split.names) === JSON.stringify(game.fullNames) && game.split.bad.length === 0, { parts: game.split.parts, sizes: game.split.sizes, limit: game.limit });
  /* the button: a tap-to-save link per part (a phone saves one download a tap) */
  await page.click('#export-game');
  await page.waitForFunction(() => document.querySelectorAll('#game-parts a[download]').length > 0 && document.getElementById('busy').hidden, null, { timeout: 120000 });
  const links = await page.evaluate(() => [...document.querySelectorAll('#game-parts a[download]')].map((a) => ({ text: a.textContent, file: a.getAttribute('download'), shown: a.offsetParent !== null })));
  const [dlg] = await Promise.all([page.waitForEvent('download'), page.click('#game-parts a[data-part="1"]')]);
  const gameZip = fs.readFileSync(await dlg.path());
  ok('...and the page shows a "Save part" button for each part, which saves that zip',
    links.length === 1 && /^Save part 1 of 1 \([0-9.]+ MB\)$/.test(links[0].text) && /^brotown-ground-game-\d{8}-\d{4}-part1of1\.zip$/.test(links[0].file) && links[0].shown &&
    gameZip.includes(Buffer.from('manifest.json')) && !gameZip.includes(Buffer.from('originals/')), { links, size: gameZip.length });
  await shot(page, 'game-download', '#save');

  ok('no page errors', offErrs.length === 0 && page.errs.length === 0 && pageB.errs.length === 0 && pageC.errs.length === 0 && pageP.errs.length === 0 && pageD.errs.length === 0, [...offErrs, ...page.errs, ...pageB.errs, ...pageC.errs, ...pageP.errs, ...pageD.errs].slice(0, 3));
} finally {
  await browser.close();
  server.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
