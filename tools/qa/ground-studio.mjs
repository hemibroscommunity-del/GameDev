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
    st.close();
  }, oldPic);
  await page.close();
  page = await open(ctxA);
  const stale = await page.evaluate(() => ({
    street: !!document.querySelector('[data-stale="street"]'),
    road: !!document.querySelector('[data-stale="road"]'),
    commons: !!document.querySelector('[data-stale="commons"]'),
    text: (document.querySelector('[data-stale="street"]') || {}).textContent || '',
  }));
  ok("a swatch made from an older prompt (the Main Street ruts) is marked to make again; ones made from today's prompts are not",
    stale.street && !stale.road && !stale.commons && /Make this one again/.test(stale.text), stale);
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
    away.bullets === 4 && /The higher ground lies over the lower/.test(away.card) && away.spots >= 8, { bullets: away.bullets, spots: away.spots });
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

  ok('no page errors', page.errs.length === 0 && pageB.errs.length === 0 && pageC.errs.length === 0 && pageP.errs.length === 0, [...page.errs, ...pageB.errs, ...pageC.errs, ...pageP.errs].slice(0, 3));
} finally {
  await browser.close();
  server.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
