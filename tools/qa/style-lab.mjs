/* ═══ v2.3.2934: THE STYLE LAB, PROVEN IN A REAL BROWSER — not on the CI path ═══
 *
 *   node tools/qa/style-lab.mjs          (STYLE_SHOTS=dir to keep pictures)
 *
 * The owner will run the art-style test (docs/STYLE-TEST.md) on an iPhone,
 * so this drives public/tools/style/ at a phone's size and density with
 * pictures shaped like ChatGPT's -- 1254 px squares, objects on a magenta
 * background with anti-aliased edges -- and checks each step the owner
 * relies on:
 *
 *   1. every look offers its prompts (or says whose pictures it borrows),
 *      and the bro's picture for the chats is made;
 *   2. pictures go in through the real file inputs, the sheet is cut into
 *      its four objects, the magenta is gone from their edges;
 *   3. a pixel look really is on one grid in one palette; the ground tiles
 *      without a seam; the borrowed looks use the borrowed pictures;
 *   4. the stand-in game screen draws, the bro walks where he is sent, night
 *      darkens it, rain falls, the open dashboard zooms out;
 *   5. scores and pictures survive a reload; a removed picture is gone;
 *   6. no page errors.
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require_ = createRequire(path.join(REPO, 'noop.cjs'));
const { chromium } = require_('playwright-core');
const SHOTS = process.env.STYLE_SHOTS || '';

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
const URL_ = `http://127.0.0.1:${server.address().port}/tools/style/`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

async function open() {
  const page = await ctx.newPage();
  page.errs = [];
  page.on('pageerror', (e) => page.errs.push(String(e)));
  await page.goto(URL_);
  await page.waitForFunction(() => window.__styleLab, null, { timeout: 30000 });
  await page.evaluate(() => window.__styleLab.ready.then(() => true));
  return page;
}

/* ChatGPT-shaped pictures, drawn in the page and handed back as PNG bytes */
const makePictures = (page) => page.evaluate(async () => {
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const out = {};
  const png = async (c) => {
    const b = await new Promise((r) => c.toBlob(r, 'image/png'));
    const buf = new Uint8Array(await b.arrayBuffer());
    let s = '';
    for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return btoa(s);
  };
  { /* ground: grass speckle with dirt patches, NOT seamless on its own */
    const c = mk(1254, 1254), g = c.getContext('2d');
    g.fillStyle = '#4f8a3a'; g.fillRect(0, 0, 1254, 1254);
    for (let i = 0; i < 9000; i++) { g.fillStyle = rnd() < 0.5 ? '#3d7430' : '#6aa24a'; g.fillRect(rnd() * 1254, rnd() * 1254, 3 + rnd() * 6, 8 + rnd() * 10); }
    for (let i = 0; i < 5; i++) { g.fillStyle = '#8a6a42'; g.beginPath(); g.ellipse(rnd() * 1254, rnd() * 1254, 60 + rnd() * 80, 40 + rnd() * 50, 0, 0, 7); g.fill(); }
    g.fillStyle = '#e7e2a0';
    for (let i = 0; i < 300; i++) { g.beginPath(); g.arc(rnd() * 1254, rnd() * 1254, 3, 0, 7); g.fill(); }
    out.ground = await png(c);
  }
  { /* the sheet: tree, boulder, bush, signpost on magenta, anti-aliased */
    const c = mk(1254, 1254), g = c.getContext('2d');
    g.fillStyle = '#ff00ff'; g.fillRect(0, 0, 1254, 1254);
    g.fillStyle = '#6b4a2a'; g.fillRect(140, 560, 40, 260);
    g.fillStyle = '#2f7d32'; g.beginPath(); g.arc(160, 480, 130, 0, 7); g.fill();
    g.fillStyle = '#3f9a3f'; g.beginPath(); g.arc(120, 440, 60, 0, 7); g.fill();
    g.fillStyle = '#8c8f93'; g.beginPath(); g.ellipse(470, 760, 110, 70, 0, 0, 7); g.fill();
    g.fillStyle = '#5f8f4a'; g.beginPath(); g.ellipse(450, 715, 50, 18, 0, 0, 7); g.fill();
    g.fillStyle = '#3c8a3c'; g.beginPath(); g.arc(760, 740, 95, 0, 7); g.fill();
    g.fillStyle = '#6b4a2a'; g.fillRect(1040, 560, 22, 260);
    g.fillStyle = '#a07a4a'; g.fillRect(960, 520, 180, 90);
    out.objects = await png(c);
  }
  { /* the store */
    const c = mk(1254, 1254), g = c.getContext('2d');
    g.fillStyle = '#ff00ff'; g.fillRect(0, 0, 1254, 1254);
    g.fillStyle = '#8a5a34'; g.fillRect(260, 380, 740, 620);
    g.fillStyle = '#5e3a22'; g.beginPath(); g.moveTo(220, 400); g.lineTo(630, 180); g.lineTo(1040, 400); g.fill();
    g.fillStyle = '#f0d060'; g.fillRect(380, 520, 120, 110); g.fillRect(760, 520, 120, 110);
    g.fillStyle = '#3a2412'; g.fillRect(570, 760, 120, 240);
    out.building = await png(c);
  }
  { /* Mayor Bro */
    const c = mk(1254, 1254), g = c.getContext('2d');
    g.fillStyle = '#ff00ff'; g.fillRect(0, 0, 1254, 1254);
    g.fillStyle = '#c98a5a'; g.beginPath(); g.arc(627, 330, 110, 0, 7); g.fill();
    g.fillStyle = '#2d4f8a'; g.fillRect(500, 440, 254, 420);
    g.fillStyle = '#d23a3a'; g.fillRect(520, 470, 40, 360);
    g.fillStyle = '#333'; g.fillRect(520, 860, 90, 200); g.fillRect(645, 860, 90, 200);
    out.npc = await png(c);
  }
  return out;
});

const put = async (page, pics, styleId, slot, ver, name) => {
  await page.setInputFiles(`input[data-file="${styleId}|${slot}|${ver}"]`, { name: name || `${slot}.png`, mimeType: 'image/png', buffer: Buffer.from(pics[slot], 'base64') });
  await page.waitForFunction((k) => !!window.__styleLab.S.pics.get(k), `${styleId}|${slot}|${ver}`, { timeout: 30000 });
};

const shot = async (page, name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, `style-lab-${name}.png`) }); } };

/* mean brightness and spread of the preview canvas */
const canvasStats = (page) => page.evaluate(() => {
  const cv = document.getElementById('pv-canvas');
  const g = cv.getContext('2d');
  const d = g.getImageData(0, 0, cv.width, Math.round(cv.height * 0.9)).data;
  let n = 0, sum = 0, sum2 = 0;
  for (let i = 0; i < d.length; i += 4 * 211) { const l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; sum += l; sum2 += l * l; n++; }
  const m = sum / n;
  return { mean: m, sd: Math.sqrt(Math.max(0, sum2 / n - m * m)) };
});

try {
  console.log('Style Lab — ' + URL_);
  let page = await open();

  await shot(page, 'page-top');
  /* ── 1. the looks, their prompts, the bro ── */
  const cards = await page.evaluate(() => {
    const L = window.__styleLab;
    return L.STYLES.map((st) => ({
      id: st.id, card: !!document.getElementById('style-' + st.id),
      prompts: [...document.querySelectorAll('textarea[data-prompt^="' + st.id + '|"]')].map((t) => t.value),
      style: st.style || null,
    }));
  });
  ok('six looks, each with its card', cards.length === 6 && cards.every((c) => c.card), cards.map((c) => c.id));
  const gen = cards.filter((c) => c.style);
  ok('the four looks ChatGPT makes each offer four prompts in their own style, all asking to match the bro',
    gen.length === 4 && gen.every((c) => c.prompts.length === 4 && c.prompts.every((p) => p.includes(c.style) && /attached picture is our hero/.test(p))),
    gen.map((c) => [c.id, c.prompts.length]));
  ok('...with the same content in every look (only the style paragraph differs)',
    [0, 1, 2, 3].every((k) => new Set(gen.map((c) => c.prompts[k].replace(c.style, ''))).size === 1));
  ok('the two borrowing looks ask for no pictures of their own',
    cards.filter((c) => !c.style).every((c) => c.prompts.length === 0) && cards.filter((c) => !c.style).length === 2);
  await page.waitForFunction(() => { const i = document.getElementById('bro-img'); return i && !i.hidden && i.complete && i.naturalWidth > 0; }, null, { timeout: 30000 });
  const bro = await page.evaluate(async () => {
    const i = document.getElementById('bro-img');
    const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight;
    const g = c.getContext('2d'); g.drawImage(i, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let fig = 0;
    for (let k = 0; k < d.length; k += 4) if (Math.abs(d[k] - 0x8f) + Math.abs(d[k + 1] - 0x94) + Math.abs(d[k + 2] - 0x8c) > 30) fig++;
    return { w: i.naturalWidth, h: i.naturalHeight, figShare: fig / (c.width * c.height), save: !document.getElementById('bro-save').hidden };
  });
  ok("the bro's picture for the chats is made: 1024 square, three poses on grey, with a save button",
    bro.w === 1024 && bro.h === 1024 && bro.figShare > 0.03 && bro.figShare < 0.4 && bro.save, bro);

  /* ── 2. pictures in, through the real inputs ── */
  const pics = await makePictures(page);
  for (const slot of ['ground', 'objects', 'building', 'npc']) await put(page, pics, 'pixel', slot, 'A');
  for (const slot of ['ground', 'objects', 'building', 'npc']) await put(page, pics, 'painted', slot, 'A');
  await page.evaluate(() => document.getElementById('style-pixel').scrollIntoView());
  await shot(page, 'page-card');
  const after = await page.evaluate(() => ({
    toast: document.getElementById('toast').textContent,
    chips: Object.fromEntries([...document.querySelectorAll('[data-chip]')].map((c) => [c.dataset.chip, c.textContent])),
    thumbs: [...document.querySelectorAll('img[data-thumb]')].filter((i) => !i.hidden).length,
  }));
  ok('pictures go in through the file inputs and show as thumbnails', after.thumbs === 8, after);
  ok('...and every look counts what it has, the borrowing ones included',
    after.chips.pixel === '4 of 4 pictures' && after.chips.painted === '4 of 4 pictures' && after.chips['painted-snap'] === '4 of 4 pictures' && after.chips.mix === '4 of 4 pictures' && after.chips.flat === '0 of 4 pictures', after.chips);

  const look = await page.evaluate(async () => {
    const L = window.__styleLab;
    const res = {};
    for (const id of ['pixel', 'painted', 'painted-snap', 'mix', 'hdpixel']) {
      const st = L.STYLES.find((s) => s.id === id);
      const { look, missing } = await L.lookFor(st, 'A');
      const info = (c) => {
        if (!c) return null;
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        const cols = new Set(); let semi = 0, magenta = 0, opaque = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] > 0 && d[i + 3] < 255) semi++;
          if (d[i + 3] > 0) { opaque++; cols.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]); if (d[i] > 170 && d[i + 1] < 110 && d[i + 2] > 170) magenta++; }
        }
        return { w: c.width, h: c.height, colours: cols.size, semi, magenta, opaque };
      };
      const g = look.ground;
      let seam = null;
      if (g) {
        const d = g.getContext('2d').getImageData(0, 0, g.width, g.height).data;
        const col = (x) => { let s = 0; for (let y = 0; y < g.height; y++) { const i = (y * g.width + x) * 4; s += d[i] + d[i + 1] + d[i + 2]; } return s; };
        const diff = (a, b) => { let s = 0; for (let y = 0; y < g.height; y++) { const i = (y * g.width + a) * 4, j = (y * g.width + b) * 4; s += Math.abs(d[i] - d[j]) + Math.abs(d[i + 1] - d[j + 1]) + Math.abs(d[i + 2] - d[j + 2]); } return s / g.height; };
        void col;
        seam = { wrap: diff(0, g.width - 1), inside: diff(Math.floor(g.width / 3), Math.floor(g.width / 3) + Math.floor(g.width / 5)) };
      }
      res[id] = {
        missing, palette: look.palette ? look.palette.length : 0, snap: look.thingsRender.snap, groundSmooth: look.groundRender.smooth,
        tree: info(look.things.tree[0] && look.things.tree[0].c), treeWorld: look.things.tree[0] && [Math.round(look.things.tree[0].w), Math.round(look.things.tree[0].h)],
        kinds: Object.fromEntries(Object.entries(look.things).map(([k, v]) => [k, v.length])),
        building: info(look.building && look.building.c), npc: info(look.npc && look.npc.c), ground: info(g), seam,
      };
    }
    return res;
  });
  ok('the sheet is cut into its four objects, one of each kind', JSON.stringify(look.pixel.kinds) === '{"tree":1,"rock":1,"bush":1,"sign":1}', look.pixel.kinds);
  ok('...with the magenta taken out of every edge (smooth look: no magenta rim)',
    look.painted.tree && look.painted.tree.magenta === 0 && look.painted.building.magenta === 0 && look.painted.npc.magenta === 0,
    { tree: look.painted.tree, building: look.painted.building });

  /* ── 3. the pixel look is on one grid, in one palette ── */
  const P = look.pixel;
  ok('Simple pixel art: the tree is on a 2 game px grid (190 game px tall -> 95 art pixels)',
    P.snap === 2 && Math.abs(P.tree.h - 95) <= 1 && Math.abs(P.treeWorld[1] - 190) <= 1, { tree: P.tree, world: P.treeWorld });
  ok('...with hard edges only (no half-transparent pixels)', P.tree.semi === 0 && P.building.semi === 0 && P.npc.semi === 0 && P.ground.semi === 0,
    { tree: P.tree.semi, building: P.building.semi, npc: P.npc.semi });
  ok('...and the whole look shares one palette of at most 32 colours', P.palette > 4 && P.palette <= 32 && P.tree.colours <= 32 && P.building.colours <= 32 && P.ground.colours <= 32,
    { palette: P.palette, tree: P.tree.colours, ground: P.ground.colours });
  ok('...the ground on the same grid (640 game px tile -> 320 art pixels)', P.ground.w === 320 && P.ground.h === 320, P.ground);
  ok('HD pixel art keeps every colour (no palette) on a 1 game px grid', look.hdpixel.palette === 0 && look.hdpixel.snap === 1 && look.hdpixel.missing.length === 4, look.hdpixel);
  ok('Painterly stays smooth: soft edges, many colours, no palette',
    look.painted.palette === 0 && look.painted.groundSmooth && look.painted.tree.semi > 0 && look.painted.ground.colours > 200, { tree: look.painted.tree, ground: look.painted.ground.colours });
  ok('the ground tiles without a seam: its wrap-round edge is no worse than two columns inside it',
    look.painted.seam && look.painted.seam.wrap <= look.painted.seam.inside * 1.1, look.painted.seam);
  ok('"Painterly, snapped" borrows the painterly pictures and puts them on the grid, 48 colours',
    look['painted-snap'].missing.length === 0 && look['painted-snap'].snap === 2 && look['painted-snap'].palette <= 48 && look['painted-snap'].palette > 4 && look['painted-snap'].tree.semi === 0,
    look['painted-snap']);
  ok('"Your mix": painted ground stays smooth, the objects are pixel art on a 32-colour palette',
    look.mix.missing.length === 0 && look.mix.groundSmooth === true && look.mix.snap === 2 && look.mix.tree.semi === 0 && look.mix.palette <= 32 && look.mix.ground.colours > 200,
    look.mix);

  /* ── 4. the stand-in game screen ── */
  await page.evaluate(() => window.__styleLab.setOpt('auto', '0'));
  await page.evaluate(() => { document.querySelector('#style-pixel .brass').click(); });
  await page.waitForFunction(() => { const s = window.__styleLab.stats(); return s && s.frames > 20 && s.objects > 0; }, null, { timeout: 30000 });
  const st1 = await page.evaluate(() => window.__styleLab.stats());
  ok('the preview opens full screen and draws the look round the bro',
    await page.evaluate(() => !document.getElementById('pv').hidden) && st1.objects === 17 && st1.characters === 3 && st1.water === true, st1);
  const day = await canvasStats(page);
  ok('...and it is a picture, not a blank screen', day.sd > 6, day);
  await shot(page, 'pixel-day');

  /* walk: hold a finger to the right of the bro for a second */
  const b0 = st1.bro;
  const box = await page.evaluate(() => { const r = document.getElementById('pv-canvas').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  await page.evaluate(async ({ box }) => {
    const cv = document.getElementById('pv-canvas');
    const L = window.__styleLab;
    const sc = L.scene(), m = sc._metrics();
    const dpr = cv.width / box.w;
    const sx = ((sc.bro.x + 220 - sc.cam.x) * m.s) / dpr, sy = ((sc.bro.y - sc.cam.y) * m.s) / dpr;
    const ev = (type) => cv.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 3, pointerType: 'touch', clientX: box.x + sx, clientY: box.y + sy }));
    ev('pointerdown');
    await new Promise((r) => setTimeout(r, 1100));
    ev('pointerup');
  }, { box });
  const b1 = await page.evaluate(() => window.__styleLab.stats().bro);
  ok('dragging walks the bro where the finger is (east, about 150 game px a second)',
    b1.x - b0.x > 60 && Math.abs(b1.y - b0.y) < 30 && /east/.test(b1.face), { from: b0, to: b1 });

  await page.evaluate(() => window.__styleLab.setOpt('time', 'night'));
  await page.waitForTimeout(500);
  const night = await canvasStats(page);
  ok('night darkens the screen (lights leave pools round the bro and the store)', night.mean < day.mean * 0.6 && (await page.evaluate(() => window.__styleLab.stats().night)), { day: day.mean, night: night.mean });
  await shot(page, 'pixel-night');
  await page.evaluate(() => { window.__styleLab.setOpt('time', 'day'); window.__styleLab.setOpt('weather', 'rain'); });
  await page.waitForTimeout(400);
  ok('rain falls', (await page.evaluate(() => window.__styleLab.stats().weather)) === 150);
  await shot(page, 'pixel-rain');
  const sClosed = await page.evaluate(() => window.__styleLab.scene()._metrics().s);
  await page.evaluate(() => { window.__styleLab.setOpt('weather', 'none'); window.__styleLab.setOpt('dash', 'open'); });
  await page.waitForTimeout(300);
  const sOpen = await page.evaluate(() => window.__styleLab.scene()._metrics().s);
  ok('the open dashboard zooms the world out, as the game does (1024 game px over a shorter canvas)', sOpen < sClosed * 0.8 && sOpen > sClosed * 0.6, { sClosed, sOpen });
  await page.evaluate(() => window.__styleLab.setOpt('dash', 'closed'));

  /* the stroll when nobody touches the screen */
  await page.evaluate(() => window.__styleLab.setOpt('auto', '1'));
  const p0 = await page.evaluate(() => window.__styleLab.stats().bro);
  await page.waitForTimeout(6500);
  const p1 = await page.evaluate(() => window.__styleLab.stats().bro);
  ok('left alone, the bro takes a stroll', Math.hypot(p1.x - p0.x, p1.y - p0.y) > 60, { p0, p1 });

  /* the other looks draw too; pictures for the page's own record */
  await page.click('#pv-next');
  await page.waitForTimeout(700);
  ok('▶ moves to the next look', (await page.evaluate(() => document.getElementById('pv-name').textContent)) === 'HD pixel art');
  for (const id of ['painted', 'painted-snap', 'mix']) {
    await page.evaluate((i) => { const L = window.__styleLab; L.S.cur = L.STYLES.findIndex((s) => s.id === i); document.getElementById('pv-ver').click(); document.getElementById('pv-ver').click(); }, id);
    await page.waitForTimeout(900);
    await shot(page, id);
  }
  const lastStats = await page.evaluate(() => window.__styleLab.stats());
  ok('the borrowing look draws with the borrowed pictures', lastStats.objects === 17, lastStats);
  await page.click('#pv-close');

  /* ── 5. scores and pictures survive a reload ── */
  await page.evaluate(() => { document.querySelector('details[data-score="pixel"]').open = true; });
  for (let i = 0; i < 7; i++) await page.click(`button[data-star="pixel|${i}|${i === 6 ? 3 : 5}"]`);
  await page.fill('textarea[data-notes="pixel"]', 'The bro fits.');
  await page.close();
  page = await open();
  const kept = await page.evaluate(() => ({
    stars: [...document.querySelectorAll('button[data-star^="pixel|0|"]')].filter((b) => b.classList.contains('on')).length,
    notes: document.querySelector('textarea[data-notes="pixel"]').value,
    thumbs: [...document.querySelectorAll('img[data-thumb]')].filter((i) => !i.hidden).length,
    text: window.__styleLab.resultsText(),
  }));
  ok('scores and notes survive a reload', kept.stars === 5 && kept.notes === 'The bro fits.', kept);
  ok('pictures survive a reload', kept.thumbs === 8, kept.thumbs);
  ok('the results to send are in order, best first, with the settings', /^BroTown style test: results\n\nSimple pixel art: 4\.7/.test(kept.text) && /pixel size 2, colours 32, ground 640 px/.test(kept.text) && /notes: The bro fits\./.test(kept.text), kept.text.slice(0, 300));
  await page.click('button[data-remove="pixel|npc|A"]');
  await page.waitForTimeout(300);
  const removed = await page.evaluate(async () => {
    const L = window.__styleLab;
    const { missing } = await L.lookFor(L.STYLES.find((s) => s.id === 'pixel'), 'A');
    return { chip: document.querySelector('[data-chip="pixel"]').textContent, missing };
  });
  ok('a removed picture is gone, and the look says what it now lacks', removed.chip === '3 of 4 pictures' && removed.missing.join() === 'NPC', removed);

  /* ── 6. ── */
  ok('no page errors', page.errs.length === 0, page.errs.slice(0, 3));
} catch (e) {
  fail++;
  console.log('  FAIL (threw) ' + (e.stack || e));
} finally {
  await browser.close();
  server.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
