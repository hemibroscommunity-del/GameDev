/* ═══ v2.3.2964: THE OBJECT STUDIO, PROVEN IN A REAL BROWSER — not on the CI path ═══
 *
 * public/tools/objects/ is where the owner will make every object that
 * stands up in BroTown -- each building, the town's props, each land's
 * trees and rocks -- from ChatGPT pictures, with the only copy in browser
 * storage until a zip is downloaded.  So what is proven is what a slip would
 * cost them:
 *
 *   1. THE PAGE lists every object in its group, the buildings first and
 *      open, each with a prompt: every building its own (job, end of town,
 *      look, jokes, sign, porch, square-on, Built by Bros), every one the HD
 *      pixel art paragraph, the style key only (never the bro), a flat
 *      background and its size in words;
 *   2. THE STYLE KEY is read from the World Builder's storage on the site;
 *   3. A SET IN, through the real file input (four barrels on magenta, as
 *      ChatGPT draws them: soft edges, shading), comes out as four pieces,
 *      the middle one exactly its size in the game at 2 px a game px, the
 *      rest in step, hard-edged, on at most PIXEL.ownColours colours of its
 *      own, no magenta left; its pixels said to match the ground's;
 *   4. A BUILDING keeps its loose sign, drops a far-off speck, and is made
 *      exactly its plot's width; the size can be nudged;
 *   5. THE STAGE stands it on its land's ground next to the bro, as big as
 *      on a phone;
 *   6. THE CARD SAYS what went wrong: a green-key picture for the pink and
 *      purple things, a picture that is not on a flat colour, one drawn far
 *      too big for its picture, a set where two touch;
 *   7. WORK SURVIVES A RELOAD, the backup zip restores into a fresh browser
 *      with the same pixels, and the game's zip carries the same pixels as
 *      see-through palette PNGs and no originals;
 *   8. a picture made from an older prompt is marked; no page errors;
 *   9. (v2.3.2965) SPRITE SHEETS: every land's objects come on sheet
 *      pictures, each object on one; a sheet drawn as its prompt asks comes
 *      back as every object on it, each named by its place and made as from
 *      a picture of its own; a name changes with a tap; an object's own
 *      picture wins, and its sheet's take over when it goes; the backup
 *      carries the sheet and its names; and "Download for the game" packs
 *      each land into one sprite sheet with a PixiJS sheet file, every frame
 *      the very piece, anchored at its foot.
 *
 *   node tools/qa/object-studio.mjs          (OBJECT_SHOTS=dir to keep pictures)
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { PIXEL } from '../../public/tools/style/bible.js';
import { PLAN } from '../../public/tools/world/plan.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require_ = createRequire(path.join(REPO, 'noop.cjs'));
const { chromium } = require_('playwright-core');
const SHOTS = process.env.OBJECT_SHOTS || '';
const PX = 1 / PIXEL.gamePxPerArtPx;

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
const URL_ = `${ORIGIN}/tools/objects/`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, acceptDownloads: true };

async function open(ctx) {
  const page = await ctx.newPage();
  page.errs = [];
  page.on('pageerror', (e) => page.errs.push(String(e)));
  await page.goto(URL_);
  await page.waitForFunction(() => window.__objects && window.__objects.S.ready, null, { timeout: 60000 });
  await page.evaluate(() => window.__objects.S.ready.then(() => true));
  return page;
}

/* ChatGPT-shaped object pictures: 1254 px, one flat background, things
   drawn with soft (anti-aliased) edges, a dark outline and shading.  `shapes`
   are [x, y, w, h, colour, kind]: kind 'round' (a barrel, a bush) or 'box'
   (a building).  `scene` paints the background as a textured scene instead
   of one flat colour (what ChatGPT does when it ignores the prompt). */
const makePicture = (page, opts) => page.evaluate(async ({ bg, shapes, scene, grade, W, H }) => {
  const c = document.createElement('canvas'); c.width = W || 1254; c.height = H || 1254;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
  /* a flat colour shading a little toward the corners, as ChatGPT's can */
  if (grade) {
    const rg = g.createRadialGradient(c.width / 2, c.height / 2, c.width * 0.2, c.width / 2, c.height / 2, c.width * 0.75);
    rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, `rgba(0,0,0,${grade})`);
    g.fillStyle = rg; g.fillRect(0, 0, c.width, c.height);
  }
  if (scene) {
    let s = 7;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    /* grass of many greens, patches of dirt, a few flowers */
    for (let i = 0; i < 4000; i++) {
      const k = rnd();
      g.fillStyle = k < 0.7 ? `hsl(${80 + rnd() * 60},${30 + rnd() * 30}%,${20 + rnd() * 45}%)` : k < 0.95 ? `hsl(30,40%,${30 + rnd() * 25}%)` : `hsl(${rnd() * 360},80%,70%)`;
      g.beginPath(); g.arc(rnd() * c.width, rnd() * c.height, 4 + rnd() * 18, 0, 7); g.fill();
    }
  }
  for (const [x, y, w, h, col, kind] of shapes) {
    const grd = g.createLinearGradient(x, y, x + w, y + h);
    grd.addColorStop(0, col); grd.addColorStop(1, '#2a1c14');
    /* (v2.3.2965: 'solid', one flat colour, so a test can tell which kind
       a piece is by its colour) */
    g.fillStyle = kind === 'solid' ? col : grd; g.strokeStyle = '#2b1d16'; g.lineWidth = 6;
    g.beginPath();
    if (kind === 'round') g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 7);
    else g.rect(x, y, w, h);
    g.fill(); g.stroke();
    if (kind === 'solid') continue;
    /* a band of detail, so it has more than two colours */
    g.fillStyle = 'rgba(255,230,160,0.55)';
    g.fillRect(x + w * 0.15, y + h * 0.3, w * 0.7, Math.max(4, h * 0.08));
  }
  const b = await new Promise((r) => c.toBlob(r, 'image/png'));
  const buf = new Uint8Array(await b.arrayBuffer());
  let str = '';
  for (let i = 0; i < buf.length; i += 0x8000) str += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(str);
}, opts);

const put = async (page, id, b64) => {
  await page.evaluate(() => { window.__lastToast = ''; });
  await page.setInputFiles(`input[data-file="${id}"]`, { name: `${id}.png`, mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') });
  await page.waitForFunction((i) => document.getElementById('busy').hidden && (window.__objects.S.fin.has(i) || !document.getElementById('toast').hidden), id, { timeout: 60000 });
};

/* facts about an object's finished pieces */
const facts = (page, id) => page.evaluate(async (i) => {
  const f = window.__objects.S.fin.get(i);
  if (!f) return null;
  const out = { n: f.pieces.length, ratio: f.ratio, found: f.found, src: f.src || 'own', colours: 0, semi: 0, magenta: 0, green: 0, pieces: [] };
  const all = new Set();
  let hash = 0;
  for (const p of f.pieces) {
    const bm = await createImageBitmap(p.png);
    const c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height;
    const g = c.getContext('2d'); g.drawImage(bm, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let clear = 0;
    for (let k = 0; k < d.length; k += 4) {
      if (d[k + 3] !== 0 && d[k + 3] !== 255) out.semi++;
      if (d[k + 3] === 0) { clear++; continue; }
      all.add((d[k] << 16) | (d[k + 1] << 8) | d[k + 2]);
      if (d[k] > 200 && d[k + 2] > 200 && d[k + 1] < 90) out.magenta++;
      if (d[k + 1] > 200 && d[k] < 90 && d[k + 2] < 90) out.green++;
      hash = (hash * 31 + d[k] * 7 + d[k + 1] * 13 + d[k + 2] * 17) >>> 0;
    }
    /* its commonest solid colour */
    const tally = new Map();
    for (let k = 0; k < d.length; k += 4) if (d[k + 3]) { const key = (d[k] << 16) | (d[k + 1] << 8) | d[k + 2]; tally.set(key, (tally.get(key) || 0) + 1); }
    let top = 0, topN = 0;
    for (const [key, n] of tally) if (n > topN) { topN = n; top = key; }
    out.pieces.push({ w: c.width, h: c.height, clear: clear / (c.width * c.height), main: [top >> 16, (top >> 8) & 255, top & 255] });
  }
  out.colours = all.size;
  out.hash = hash;
  return out;
}, id);

const shot = async (page, name, sel) => {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  const file = path.join(SHOTS, `objects-${name}.png`);
  if (sel) await page.locator(sel).screenshot({ path: file }); else await page.screenshot({ path: file, fullPage: false });
};

/* read a PNG's chunks */
const chunks = (buf) => {
  const out = {}; let o = 8;
  while (o < buf.length) { const len = buf.readUInt32BE(o), type = buf.toString('latin1', o + 4, o + 8); (out[type] = out[type] || []).push(buf.subarray(o + 8, o + 8 + len)); o += 12 + len; }
  return out;
};

try {
  console.log('Object Studio — ' + URL_);
  const ctxA = await browser.newContext(phone);
  let page = await open(ctxA);

  /* ── 1. the page, the objects, the prompts ── */
  console.log('1. the objects and their prompts');
  const first = await page.evaluate(() => {
    const { S } = window.__objects;
    const prompts = Object.fromEntries([...document.querySelectorAll('textarea[data-prompt]')].map((t) => [t.dataset.prompt, t.value]));
    const groups = [...document.querySelectorAll('details.group')].map((d) => ({ id: d.dataset.group, open: d.open, n: d.querySelectorAll('.ob').length }));
    return { n: S.cat.length, buildings: S.cat.filter((e) => e.kind === 'building').map((e) => e.id), prompts, groups, count: document.getElementById('count').textContent, status: document.getElementById('status').textContent };
  });
  const lots = [PLAN.town.hallLot.id];
  for (const sides of Object.values(PLAN.town.lots)) for (const list of Object.values(sides)) for (const l of list) lots.push(l.id);
  ok(`every object is listed in its group, the buildings first and open (${first.n} in ${first.groups.length} groups)`,
    first.n === Object.keys(first.prompts).length && first.groups.length === 11 && first.groups[0].id === 'buildings' && first.groups[0].open && first.groups.slice(1).every((g) => !g.open) && first.count === `0 of ${first.n} made`,
    { groups: first.groups, count: first.count });
  ok(`every one of the town's ${lots.length} plots has its building, under the plot's own id`,
    first.buildings.length === lots.length && lots.every((id) => first.buildings.includes(id)), { lots, buildings: first.buildings });
  const P = first.prompts;
  const eachBuilding = first.buildings.every((id) => /Built by Bros/.test(P[id]) && /raised wooden porch/.test(P[id]) && /Drawn square-on/.test(P[id]) && /One big, simple sign reads "[A-Z &]+"/.test(P[id]) && /BroTown HD pixel art/.test(P[id]) && /one fifth as tall as this picture/.test(P[id]) && /Its door is a little taller than a person/.test(P[id]));
  ok("every building's prompt is its own: its job, its end of town, its look, its jokes, its one sign, the porch, square-on, Built by Bros",
    eachBuilding && /the Blacksmith, where players forge their gear/.test(P.blacksmith) && /workshop end of town/.test(P.blacksmith) && /hammers/.test(P.blacksmith) && /"BLACKSMITH"/.test(P.blacksmith) &&
    /moose head wearing sunglasses/.test(P.saloon) && /saloon end of town/.test(P.saloon) && /stone lions in sunglasses/.test(P.bank) && /money end of town/.test(P.bank) && /"DEALS"/.test(P.store) && /apart from the one big 0/.test(P.sheriff),
    P.blacksmith.slice(0, 300));
  ok('...and no two buildings share a prompt', new Set(first.buildings.map((id) => P[id])).size === first.buildings.length);
  const every = Object.values(P);
  ok('every prompt attaches the style key only (never the bro), asks for HD pixel art on one flat background, and gives the size in words',
    every.every((p) => /Attached is the game's style key/.test(p) && /BroTown HD pixel art/.test(p) && /ONE flat (magenta|bright green) colour/.test(p) && /Scale: a person standing here would be about one fifth as tall as this picture/.test(p) && !/attach(ed)? (your|the|a) (bro|character|hero)/i.test(p)));
  ok('a set asks for that many different ones, side by side and not touching; a prop is Built by Bros too',
    /a set of four .*wooden barrels.*four different ones in a row, side by side and not touching/s.test(P.barrel) && /waist-high on a person/.test(P.barrel) && /proud repair or a dent/.test(P.barrel) && /No text, letters or numbers anywhere/.test(P.barrel) &&
    /A wide picture \(3:2, landscape\) of a set of two/.test(P.oak) && /three times as tall as a person/.test(P.oak));
  ok('the pink and purple things are drawn on green, and say so', /ONE flat bright green colour \(#00FF00\)/.test(P.coral) && /ONE flat bright green colour/.test(P.gemcutter) && /ONE flat magenta colour/.test(P.bush));
  /* v2.3.2965: the sheet pictures */
  const sheets0 = await page.evaluate(() => {
    const { S } = window.__objects;
    const prompts = Object.fromEntries([...document.querySelectorAll('textarea[data-sheet-prompt]')].map((t) => [t.dataset.sheetPrompt, t.value]));
    const on = Object.create(null);
    for (const sh of S.sheets) for (const id of sh.rows.flat()) on[id] = (on[id] || 0) + 1;
    return {
      n: S.sheets.length, cards: document.querySelectorAll('.ob.sheet').length, prompts,
      everyOnce: S.cat.filter((e) => e.kind !== 'building').every((e) => (on[e.id] || 0) + (S.alone.has(e.id) ? 1 : 0) === 1),
      buildingsOn: S.cat.filter((e) => e.kind === 'building' && on[e.id]).length,
      groupsWithSheets: [...new Set(S.sheets.map((sh) => sh.group))].length,
      lines: [...document.querySelectorAll('#ob-crate .ob-where')].map((x) => x.textContent).join(' | '),
    };
  });
  ok(`most objects come on sheet pictures: ${sheets0.n} sheets for every land, each object on one sheet or with a picture of its own, never a building`,
    sheets0.n >= 12 && sheets0.n <= 24 && sheets0.cards === sheets0.n && sheets0.everyOnce && sheets0.buildingsOn === 0 && sheets0.groupsWithSheets === 10 && /On Town props, sheet/.test(sheets0.lines), sheets0);
  ok("every sheet's prompt asks for a SPRITE SHEET in rows read like a page, each kind's ones together, at their sizes, on one flat background, with the style key",
    Object.values(sheets0.prompts).every((p) => /SPRITE SHEET/.test(p) && /Row 1, left to right/.test(p) && /each kind's ones stay together/.test(p) && /ONE flat (magenta|bright green) colour/.test(p) && /Attached is the game's style key/.test(p) && /one fifth as tall as this picture/.test(p)),
    Object.keys(sheets0.prompts));
  const saved0 = await page.evaluate(() => ({ chip: document.getElementById('saved-chip').textContent, line: document.getElementById('saved-line').textContent, noKey: !document.getElementById('key-none').hidden }));
  ok('with nothing made, the page says nothing is saved here yet, and sends you to the World Builder for the style key', saved0.chip === 'none yet' && /Nothing is saved in this browser yet/.test(saved0.line) && saved0.noKey, saved0);

  /* ── 2. the style key ── */
  console.log('2. the style key');
  await page.evaluate(async () => {
    const { openStore } = await import('/tools/world/store.js');
    const c = document.createElement('canvas'); c.width = 300; c.height = 300;
    const g = c.getContext('2d');
    ['#86b94f', '#7b4a26', '#e6d6a3', '#eef3f8', '#3b2c27', '#dfc27c', '#8c8378', '#5f6d3f', '#4f8a3a'].forEach((col, i) => { g.fillStyle = col; g.fillRect((i % 3) * 100, Math.floor(i / 3) * 100, 98, 98); });
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    const wb = await openStore('brotown-world-builder');
    await wb.put('misc', 'styleKey', { blob, ext: 'png' });
    wb.close();
  });
  await page.close();
  page = await open(ctxA);
  const key = await page.evaluate(() => ({ chip: document.getElementById('key-chip').textContent, img: !document.getElementById('key-img').hidden }));
  ok('the style key is found in the World Builder', key.chip === 'found' && key.img, key);

  /* ── 3. a set in: four barrels ── */
  console.log('3. a set in: four barrels');
  /* drawn the size the prompt asks: 52 game px of a 512 game px picture is
     127 of its 1254 px; one lying on its side, one a small keg */
  const S_ = 1254 / 512;
  const bh = Math.round(52 * S_);
  const barrels = await makePicture(page, { bg: '#ff00ff', shapes: [
    [150, 560, Math.round(bh * 0.8), bh, '#a0662e', 'round'],
    [420, 590, Math.round(bh * 1.3), Math.round(bh * 0.8), '#94602c', 'round'],
    [720, 600, Math.round(bh * 0.6), Math.round(bh * 0.75), '#b07038', 'round'],
    [950, 555, Math.round(bh * 0.8), Math.round(bh * 1.04), '#9a6430', 'round'],
  ] });
  /* (in a folded group, as the owner's would be until opened: the stage
     opens it) */
  await put(page, 'barrel', barrels);
  const fb = await facts(page, 'barrel');
  const hs = fb.pieces.map((p) => p.h).sort((a, b) => a - b);
  ok(`a set of four comes out as four pieces, the middle two ${(hs[1] + hs[2]) / 2} px tall on average: 52 game px at 2 px a game px`,
    fb.n === 4 && Math.abs((hs[1] + hs[2]) / 2 - 52 * PX) <= 2, { hs, n: fb.n });
  ok('...the rest in step: the lying one wide, the keg small', fb.pieces[1].w > fb.pieces[1].h && fb.pieces[2].h === hs[0], fb.pieces);
  ok(`...hard-edged, on at most ${PIXEL.ownColours} colours of its own, with no magenta left`, fb.semi === 0 && fb.colours <= PIXEL.ownColours && fb.colours > 4 && fb.magenta === 0, { semi: fb.semi, colours: fb.colours, magenta: fb.magenta });
  ok(`...and drawn the size the prompt asks, its pixels match the ground's (${fb.ratio.toFixed(2)})`, Math.abs(fb.ratio - 1) < 0.15, fb.ratio);
  const card1 = await page.evaluate(() => ({
    chip: document.querySelector('[data-chip="barrel"]').textContent, count: document.getElementById('count').textContent,
    group: document.querySelector('[data-group-count="town"]').textContent, thumbs: document.querySelectorAll('[data-piece="barrel"]').length,
    note: (document.querySelector('#ob-barrel .ob-note') || {}).textContent || '', warn: !!document.querySelector('[data-warn="barrel"]'),
    saved: document.getElementById('saved-chip').textContent, savedList: document.getElementById('saved-list').textContent, when: document.getElementById('saved-when').textContent,
  }));
  ok('its card, the counts and the top of the page say it is made and saved here', card1.chip === '4 made' && /^1 of \d+ made$/.test(card1.count) && card1.group === '1 of 14' && card1.thumbs === 4 && card1.saved === '1 saved' && /Barrels/.test(card1.savedList) && /today at/.test(card1.when), card1);
  ok('...and says its pixels match the ground\'s, with nothing to warn about', /Its pixels match the ground's/.test(card1.note) && !card1.warn, card1.note);

  /* ── 5. the stage ── */
  console.log('5. the stage');
  await page.waitForFunction(() => !!document.querySelector('canvas[data-stage-canvas="barrel"]'), null, { timeout: 30000 }).catch(() => {});
  const st = await page.evaluate(() => {
    const cv = document.querySelector('canvas[data-stage-canvas="barrel"]');
    if (!cv) return null;
    const g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data;
    /* the bro's white tee: near-white pixels the street has none of */
    let white = 0;
    for (let k = 0; k < d.length; k += 4) if (d[k] > 225 && d[k + 1] > 225 && d[k + 2] > 225) white++;
    return { w: cv.width, h: cv.height, cssW: parseFloat(cv.style.width), cap: cv.closest('[data-stage]').textContent, white, ground: !!window.__objects.S.ground.made, open: cv.closest('details.group').open };
  });
  ok('putting it in shows it on the stage at once, its group opened, at 2 px a game px, as big as on a phone held upright (844 px for 1024 game px)',
    st && st.open && Math.abs(st.cssW - (st.w / PX) * (844 / 1024)) <= 1 && /As big as on your phone held upright/.test(st.cap), st);
  ok('...standing on its land\'s ground from the game\'s own swatches, the bro beside it', st && st.ground && /on Main Street/.test(st.cap) && st.white > 50, st);
  await shot(page, 'barrels', '#ob-barrel');

  /* ── 4. a building ── */
  console.log('4. a building');
  /* the Saloon, drawn a little wider than the prompt asks, with a sign on
     its own post beside it and a speck far off */
  const bw = Math.round(276 * S_ * 1.1);
  const saloon = await makePicture(page, { bg: '#ff00ff', shapes: [
    [200, 300, bw, 640, '#8c3b2a', 'box'],
    [200 + bw + 14, 760, 60, 180, '#7a5030', 'box'],
    [40, 40, 14, 14, '#7a5030', 'box'],
  ] });
  await put(page, 'saloon', saloon);
  const fs1 = await facts(page, 'saloon');
  ok(`a building comes out as one piece exactly its plot's width: ${fs1.pieces[0].w} px, 276 game px`, fs1.n === 1 && fs1.pieces[0].w === 276 * PX, fs1.pieces);
  /* the sign is kept (the piece is wider than the building alone), the
     speck is not (the piece is no taller than the building) */
  const sx = (bw + 14 + 60) / bw;
  ok('...keeping the sign on its own post beside it, and dropping a speck far off', fs1.pieces[0].h < fs1.pieces[0].w * (640 / bw) * sx * 1.1 && fs1.pieces[0].h > fs1.pieces[0].w * (640 / (bw + 74)) * 0.9, { piece: fs1.pieces[0], bw });
  /* (the stage is drawn just after the picture is in) */
  await page.waitForFunction(() => !!document.querySelector('canvas[data-stage-canvas="saloon"]'), null, { timeout: 30000 }).catch(() => {});
  const stage2 = await page.evaluate(() => ({ barrel: !!document.querySelector('canvas[data-stage-canvas="barrel"]'), saloon: !!document.querySelector('canvas[data-stage-canvas="saloon"]'), cap: (document.querySelector('[data-stage="saloon"]') || {}).textContent || '' }));
  ok('...the stage moves to it (one stage at a time), on the town\'s yards', stage2.saloon && !stage2.barrel && /on the town's yards/.test(stage2.cap), stage2);
  await shot(page, 'saloon', '#ob-saloon');
  /* nudge its size */
  await page.selectOption('select[data-size="saloon"]', '1.25');
  await page.waitForFunction(() => document.getElementById('busy').hidden && window.__objects.S.fin.get('saloon').size === 1.25, null, { timeout: 30000 });
  const fs2 = await facts(page, 'saloon');
  const shown2 = await page.evaluate(() => ({ cv: !!document.querySelector('canvas[data-stage-canvas="saloon"]'), sel: document.querySelector('select[data-size="saloon"]').value }));
  ok(`its size can be nudged: 125% makes it ${fs2.pieces[0].w} px, and the stage shows the new size`, fs2.pieces[0].w === Math.round(276 * 1.25 * PX) && shown2.cv && shown2.sel === '1.25', { w: fs2.pieces[0].w, shown2 });

  /* ── 6. what the card warns about ── */
  console.log('6. what the card says when a picture is off');
  /* coral on green: pink and purple kept, no green left */
  const ch = Math.round(80 * S_);
  const coral = await makePicture(page, { bg: '#00ff00', grade: 0.09, shapes: [
    [120, 500, ch, ch, '#ff7aa8', 'round'], [420, 500, ch, ch, '#ff9a40', 'round'], [700, 500, ch, ch, '#a050c8', 'round'], [980, 500, ch, ch, '#40b8b0', 'round'],
  ] });
  await put(page, 'coral', coral);
  const fc = await facts(page, 'coral');
  const coralNote = await page.evaluate(() => [...document.querySelectorAll('#ob-coral .ob-note')].map((n) => n.textContent).join(' | '));
  ok('a picture on green (the pink and purple things) is cut out the same way: four pieces, no green left', fc.n === 4 && fc.green === 0 && fc.semi === 0, { n: fc.n, green: fc.green });
  ok('...its background shading a little toward the corners still counts as one flat colour', !/not one flat colour/.test(coralNote) && /Its pixels match/.test(coralNote), coralNote);
  /* a bush drawn on a scene, not a flat colour */
  const sceneBush = await makePicture(page, { bg: '#5a7a3a', scene: true, shapes: [[400, 500, 200, 150, '#3f7f30', 'round']] });
  await put(page, 'bush', sceneBush);
  const bushNote = await page.evaluate(() => [...document.querySelectorAll('#ob-bush .ob-note')].map((n) => n.textContent).join(' | '));
  ok('a picture that is not on one flat colour is caught: the card says to ask for one', /The background is not one flat colour/.test(bushNote) && /one flat magenta background/.test(bushNote), bushNote);
  /* stones drawn two and a half times too big, and two of them touching */
  const sh = Math.round(50 * S_ * 2.5);
  const stones = await makePicture(page, { bg: '#ff00ff', shapes: [
    [30, 300, sh, sh, '#8a8a8a', 'round'], [30 + sh - 10, 320, sh, sh, '#7a7a7a', 'round'], [700, 300, Math.round(sh * 0.9), Math.round(sh * 0.9), '#909090', 'round'], [1020, 700, 210, 210, '#858585', 'round'],
  ] });
  await put(page, 'stone', stones);
  const stoneNote = await page.evaluate(() => [...document.querySelectorAll('#ob-stone .ob-note')].map((n) => n.textContent).join(' | '));
  ok('a set where two touch is caught: the card says how many were found and why', /Found 3 of 4/.test(stoneNote) && /not touching/.test(stoneNote), stoneNote);
  ok('...and one drawn far too big for its picture: the card says its pixels are finer than the ground\'s', /times too big for the picture/.test(stoneNote) && /finer than the ground's/.test(stoneNote), stoneNote);

  /* ── 6b. v2.3.2965: a sheet picture ── */
  console.log('6b. a sheet picture: many objects in rows, each named by its place');
  /* the town's second sheet, drawn as the prompt asks: its rows top to
     bottom, each kind's ones left to right, at the sizes the packer
     planned, standing on each row's line -- every kind in a colour of its
     own, so the test can tell which object each piece is */
  const KC = ['#c0392b', '#2e86c1', '#27ae60', '#f1c40f', '#8e44ad', '#e67e22', '#16a085'];
  const plan = await page.evaluate(() => {
    const { S } = window.__objects;
    const sh = S.sheetById['town-sheet-2'];
    return { rows: sh.rows, kinds: Object.fromEntries(sh.rows.flat().map((id) => { const e = S.byId[id]; return [id, { count: e.count, fit: e.fit, size: e.size, ar: e.ar || 1 }]; })) };
  });
  const kindColour = Object.create(null);
  plan.rows.flat().forEach((id, i) => { kindColour[id] = KC[i % KC.length]; });
  const SPX = 1024 / 512;   /* a wide picture 1024 px tall: 2 px a game px */
  const shapes = [];
  let ry = 16 * SPX;
  for (const ids of plan.rows) {
    const boxes = ids.map((id) => { const k = plan.kinds[id]; const w = k.fit === 'w' ? k.size : k.size * k.ar, h = k.fit === 'w' ? k.size / k.ar : k.size; return { id, w: w * SPX, h: h * SPX, n: k.count }; });
    const rowH = Math.max(...boxes.map((b) => b.h));
    let x = 16 * SPX;
    for (const b of boxes) for (let i = 0; i < b.n; i++) { shapes.push([Math.round(x), Math.round(ry + rowH - b.h), Math.round(b.w), Math.round(b.h), kindColour[b.id], 'solid']); x += b.w + 28 * SPX; }
    ry += rowH + 28 * SPX;
  }
  const sheetPic = await makePicture(page, { bg: '#ff00ff', shapes, W: 1536, H: 1024 });
  await page.setInputFiles('input[data-sheet-file="town-sheet-2"]', { name: 'town-sheet-2.png', mimeType: 'image/png', buffer: Buffer.from(sheetPic, 'base64') });
  await page.waitForFunction(() => document.getElementById('busy').hidden && window.__objects.S.sheetRaw.has('town-sheet-2'), null, { timeout: 60000 });
  const nearestKind = (rgb) => {
    let best = null, bd = Infinity;
    for (const [id, hex] of Object.entries(kindColour)) {
      const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      const dd = (c[0] - rgb[0]) ** 2 + (c[1] - rgb[1]) ** 2 + (c[2] - rgb[2]) ** 2;
      if (dd < bd) { bd = dd; best = id; }
    }
    return best;
  };
  const sheetKinds = plan.rows.flat();
  const made = {};
  for (const id of sheetKinds) made[id] = await facts(page, id);
  const fromSheet = sheetKinds.filter((id) => id !== 'barrel');
  ok(`a sheet comes back as every object on it (${shapes.length}), each named by its place: ${fromSheet.length} kinds made from it, each with its own ones and nobody else's`,
    fromSheet.every((id) => made[id] && made[id].src === 'town-sheet-2' && made[id].n === plan.kinds[id].count && made[id].pieces.every((p) => nearestKind(p.main) === id)),
    Object.fromEntries(fromSheet.map((id) => [id, made[id] && { src: made[id].src, n: made[id].n, mains: made[id].pieces.map((p) => nearestKind(p.main)) }])));
  ok('...each sized like an object from its own picture: the middle of a set at its size, hard-edged, on its own colours, no magenta left',
    fromSheet.every((id) => { const f = made[id], k = plan.kinds[id], d = f.pieces.map((p) => (k.fit === 'w' ? p.w : p.h)).sort((a, b) => a - b); return Math.abs((d[(d.length - 1) >> 1] + d[d.length >> 1]) / 2 - k.size * PX) <= 2 && f.semi === 0 && f.magenta === 0 && f.colours <= PIXEL.ownColours; }));
  const card6 = await page.evaluate(() => ({
    chip: document.querySelector('[data-sheet-chip="town-sheet-2"]').textContent,
    selects: [...document.querySelectorAll('select[data-assign^="town-sheet-2|"]')].map((x) => x.value),
    warn: !!document.querySelector('[data-warn="town-sheet-2"]'),
    text: document.getElementById('sheet-town-sheet-2').textContent,
    from: (document.querySelector('[data-from="crate"]') || {}).textContent || '',
  }));
  ok('...its card shows every object found with its name, nothing to warn about, and the crates\' card says where they came from',
    card6.chip === 'made' && card6.selects.length === shapes.length && card6.selects.every((v) => v) && !card6.warn && /Made from Town props, sheet 2/.test(card6.from), card6);
  ok("...and an object with its own picture keeps it: the barrels made earlier are not replaced, and the sheet says so",
    made.barrel.src === 'own' && /Barrels: kept its own picture/.test(card6.text), { src: made.barrel.src });
  /* a name changed by hand: one crate is "not used", then a crate again */
  const firstCrate = card6.selects.indexOf('crate');
  await page.selectOption(`select[data-assign="town-sheet-2|${firstCrate}"]`, '');
  await page.waitForFunction(() => document.getElementById('busy').hidden && window.__objects.S.fin.get('crate').pieces.length === 3, null, { timeout: 30000 });
  const crates3 = (await facts(page, 'crate')).n;
  await page.selectOption(`select[data-assign="town-sheet-2|${firstCrate}"]`, 'crate');
  await page.waitForFunction(() => document.getElementById('busy').hidden && window.__objects.S.fin.get('crate').pieces.length === 4, null, { timeout: 30000 });
  ok('a name can be changed with a tap: a crate set to "not used" leaves three crates, and set back makes four again', crates3 === 3 && (await facts(page, 'crate')).n === 4);
  await shot(page, 'sheet', '#sheet-town-sheet-2');

  /* ── 7. a reload, the zips, a restore ── */
  console.log('7. a reload, the zips, a restore');
  const KEEP = ['barrel', 'saloon', 'coral', 'crate', 'fence', 'haybale'];
  const hashes = async (pg) => { const o = {}; for (const id of KEEP) o[id] = (await facts(pg, id)).hash; return o; };
  const before = await hashes(page);
  await page.close();
  page = await open(ctxA);
  const after = await hashes(page);
  const afterUi = await page.evaluate(() => ({ saved: document.getElementById('saved-chip').textContent, size: document.querySelector('select[data-size="saloon"]').value, sheet: document.querySelector('[data-sheet-chip="town-sheet-2"]').textContent }));
  const nMade = 5 + fromSheet.length;
  ok('everything survives a reload, the same to the pixel, the size choice and the sheet too', JSON.stringify(before) === JSON.stringify(after) && afterUi.saved === `${nMade} saved` && afterUi.size === '1.25' && afterUi.sheet === 'made', { before, after, afterUi });

  const backup = await page.evaluate(async () => {
    const bytes = await window.__objects.api.exportZip();
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  });
  const backupBuf = Buffer.from(backup, 'base64');
  const { unzip } = await import('../../public/tools/world/core/zip.js');
  const entries = await unzip(new Uint8Array(backupBuf));
  const names = entries.map((e) => e.name);
  const manifest = JSON.parse(new TextDecoder().decode(entries.find((e) => e.name === 'manifest.json').data));
  const mBarrel = manifest.objects.find((o) => o.id === 'barrel'), mSaloon = manifest.objects.find((o) => o.id === 'saloon');
  const mSheet = (manifest.sheets || []).find((x) => x.id === 'town-sheet-2');
  ok('Download all gives a zip with the manifest, every piece as the game uses it, and every original: the objects\' own pictures and the sheet',
    names.includes('objects/barrel-1.png') && names.includes('objects/barrel-4.png') && names.includes('objects/saloon-1.png') && names.includes('objects/crate-4.png') && names.includes('originals/barrel.png') && names.includes('originals/saloon.png') && names.includes('originals/sheets/town-sheet-2.png') && !names.includes('originals/crate.png') && manifest.objects.length === nMade,
    names);
  ok("...the manifest recording the sheet: where each object was found on it and what it is",
    mSheet && mSheet.boxes.length === shapes.length && mSheet.assign.length === shapes.length && manifest.objects.find((o) => o.id === 'crate').from === 'town-sheet-2' && mBarrel.from === 'own', mSheet && { boxes: mSheet.boxes.length });
  ok("...the manifest saying each piece's size in the game and where it stands, and the size choice",
    mBarrel.pieces.length === 4 && mBarrel.pieces.every((p) => p.foot[0] === Math.round(p.w / 2) && p.foot[1] === p.h && p.gameH === p.h / PX) && mSaloon.sizeMul === 1.25 && mSaloon.pieces[0].gameW === Math.round(276 * 1.25 * PX) / PX && manifest.gamePxPerArtPx === PIXEL.gamePxPerArtPx,
    { barrel: mBarrel.pieces, saloon: mSaloon });

  const game = await page.evaluate(async () => {
    const zips = await window.__objects.api.exportGameZips();
    return zips.map((z) => { let s = ''; for (let i = 0; i < z.bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, z.bytes.subarray(i, i + 0x8000)); return btoa(s); });
  });
  const gEntries = await unzip(new Uint8Array(Buffer.from(game[0], 'base64')));
  const gNames = gEntries.map((e) => e.name);
  const gManifest = JSON.parse(new TextDecoder().decode(gEntries.find((e) => e.name === 'manifest.json').data));
  /* v2.3.2965: each land's objects in its own sprite sheet, with its PixiJS
     sheet file; every frame the very piece the backup holds */
  const sheetsIn = gNames.filter((n) => /^objects\/[a-z]+-\d+\.png$/.test(n));
  const b64 = (u8) => Buffer.from(u8).toString('base64');
  const atlasCheck = await page.evaluate(async ({ atlases, jsons, pieces }) => {
    const decode = async (s) => {
      const bin = atob(s), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const bm = await createImageBitmap(new Blob([u8], { type: 'image/png' }));
      const c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height;
      const g = c.getContext('2d'); g.drawImage(bm, 0, 0);
      return { w: c.width, h: c.height, d: g.getImageData(0, 0, c.width, c.height).data };
    };
    let frames = 0, same = 0, anchored = 0, scaled = 0;
    const missing = [];
    for (const [name, json] of Object.entries(jsons)) {
      const sheet = JSON.parse(json), A = await decode(atlases[name]);
      if (sheet.meta.scale === '2' && sheet.meta.size.w === A.w && sheet.meta.size.h === A.h) scaled++;
      for (const [frame, f] of Object.entries(sheet.frames)) {
        frames++;
        if (f.anchor && f.anchor.x === 0.5 && f.anchor.y === 1) anchored++;
        if (!pieces[frame]) { missing.push(frame); continue; }
        const P = await decode(pieces[frame]);
        let ok = P.w === f.frame.w && P.h === f.frame.h;
        for (let y = 0; y < P.h && ok; y++) for (let x = 0; x < P.w && ok; x++) {
          const a = ((f.frame.y + y) * A.w + f.frame.x + x) * 4, p = (y * P.w + x) * 4;
          ok = A.d[a + 3] === P.d[p + 3] && (P.d[p + 3] === 0 || (A.d[a] === P.d[p] && A.d[a + 1] === P.d[p + 1] && A.d[a + 2] === P.d[p + 2]));
        }
        if (ok) same++;
      }
    }
    return { frames, same, anchored, scaled, missing };
  }, {
    atlases: Object.fromEntries(sheetsIn.map((n) => [n.replace(/^objects\/|\.png$/g, ''), b64(gEntries.find((e) => e.name === n).data)])),
    jsons: Object.fromEntries(sheetsIn.map((n) => [n.replace(/^objects\/|\.png$/g, ''), new TextDecoder().decode(gEntries.find((e) => e.name === n.replace(/\.png$/, '.json')).data)])),
    pieces: Object.fromEntries(entries.filter((e) => /^objects\/.+\.png$/.test(e.name)).map((e) => [e.name.replace(/^objects\/|\.png$/g, ''), b64(e.data)])),
  });
  const piecesInBackup = names.filter((n) => /^objects\/.+\.png$/.test(n)).length;
  ok(`Download for the game packs each land's objects into its own sprite sheet (${sheetsIn.map((n) => n.slice(8)).join(', ')}), each with its sheet file, and no originals, in one zip under 25 MB`,
    game.length === 1 && sheetsIn.includes('objects/town-1.png') && sheetsIn.includes('objects/buildings-1.png') && sheetsIn.every((n) => gNames.includes(n.replace(/\.png$/, '.json'))) && !gNames.some((n) => n.startsWith('originals/')) && Buffer.from(game[0], 'base64').length < 25e6 && gManifest.atlases.length === sheetsIn.length,
    gNames);
  ok(`...every one of the ${piecesInBackup} objects in it, each frame the very same pixels as the backup's piece, its anchor at its foot, at 2 px a game px`,
    atlasCheck.frames === piecesInBackup && atlasCheck.same === piecesInBackup && atlasCheck.anchored === piecesInBackup && atlasCheck.scaled === sheetsIn.length && !atlasCheck.missing.length,
    atlasCheck);
  ok("...and the game's manifest says which sprite sheet and frame each object's pieces are",
    gManifest.objects.length === nMade && gManifest.objects.every((o) => o.pieces.every((p) => sheetsIn.includes(`objects/${p.atlas}.png`) && /^[a-z-]+-\d+$/.test(p.frame))), gManifest.objects.slice(0, 2));

  const ctxB = await browser.newContext(phone);
  const pageB = await open(ctxB);
  const nB = await pageB.evaluate(async (b64) => {
    const bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return window.__objects.api.restoreZip(u8);
  }, backup);
  const restored = await hashes(pageB);
  const restoredSheet = await pageB.evaluate(() => { const r = window.__objects.S.sheetRaw.get('town-sheet-2'); return r && r.assign.filter(Boolean).length; });
  ok(`restoring the backup in a fresh browser gives the same objects, pixel for pixel, the sheet's names too (${nB} pictures restored)`,
    nB === 6 && JSON.stringify(restored) === JSON.stringify(before) && restoredSheet === shapes.length, { nB, restored, before, restoredSheet });
  await ctxB.close();

  /* ── 8. an older prompt; removing; errors ── */
  console.log('8. an older prompt, removing, errors');
  await page.evaluate(async () => {
    const { openStore } = await import('/tools/world/store.js');
    const st = await openStore('brotown-object-studio', ['raw', 'fin', 'misc']);
    const rec = await st.get('raw', 'barrel');
    rec.promptId = 'older';
    await st.put('raw', 'barrel', rec);
    st.close();
  });
  await page.close();
  page = await open(ctxA);
  const stale = await page.evaluate(() => ({ barrel: !!document.querySelector('[data-stale="barrel"]'), saloon: !!document.querySelector('[data-stale="saloon"]') }));
  ok("a picture made from an older prompt is marked to make again; one made from today's is not", stale.barrel && !stale.saloon, stale);
  await page.evaluate(() => { document.querySelector('details[data-group="tidal"]').open = true; });
  await page.click('[data-remove="coral"]');
  await page.waitForFunction(() => document.getElementById('busy').hidden && !window.__objects.S.fin.has('coral'), null, { timeout: 30000 });
  const gone = await page.evaluate(() => ({ chip: document.querySelector('[data-chip="coral"]').textContent, saved: document.getElementById('saved-chip').textContent }));
  ok('an object can be removed', gone.chip === 'not made' && gone.saved === `${nMade - 1} saved`, gone);
  /* v2.3.2965: the barrels' own picture removed, the sheet's barrels take its place */
  await page.evaluate(() => { document.querySelector('details[data-group="town"]').open = true; });
  await page.click('[data-remove="barrel"]');
  await page.waitForFunction(() => document.getElementById('busy').hidden && window.__objects.S.fin.has('barrel') && window.__objects.S.fin.get('barrel').src === 'town-sheet-2', null, { timeout: 30000 });
  const fb2 = await facts(page, 'barrel');
  ok("an object's own picture removed, its sheet's ones take its place", fb2.src === 'town-sheet-2' && fb2.n === 4 && fb2.pieces.every((p) => nearestKind(p.main) === 'barrel'), { src: fb2.src, n: fb2.n });
  await shot(page, 'page');
  ok('no page errors', page.errs.length === 0, page.errs);
} catch (e) {
  fail++;
  console.log('  FAIL (threw) ' + (e && e.stack || e));
} finally {
  await browser.close();
  server.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
