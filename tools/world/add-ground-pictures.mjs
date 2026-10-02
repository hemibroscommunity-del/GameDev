#!/usr/bin/env node
/* ═══ v2.3.2984: A GROUND PICTURE SENT IN CHAT, INTO THE GAME ═══
 *
 *   node tools/world/add-ground-pictures.mjs <id>:<A|B>=<picture> [...] [--out public/world/ground] [--dry]
 *
 * The owner sent two water pictures in chat ("Is this what you need for
 * water? Again I don't see anywhere to add water in the ground studio").  A
 * picture is made a game tile by the Ground Studio alone (public/tools/ground/:
 * the seamless cut, the snap to the pixel grid, its own 64 colours, the
 * size), so this runs the studio itself, in a headless Chromium on a fresh
 * page -- nothing of the owner's browser touched -- puts each picture on its
 * card exactly as an upload would, takes the studio's own "Download for the
 * game", and MERGES what it made into the game's copy:
 *
 *   - each picture becomes <id>-<ver>.png in public/world/ground/, as the
 *     studio packs it (a palette PNG, world/core/png8.js);
 *   - the manifest gains (or updates) that swatch's entry, its other version
 *     kept; every other swatch, the palette and the footsteps untouched;
 *   - the manifest's `made` -- the ?v= every tile is fetched at -- changes
 *     only when a picture the game already had is REPLACED: public/_headers
 *     lets a phone keep a tile forever at its address, so a replaced one must
 *     have a new address, while a new one never had an old one to go stale.
 *
 * `--dry` makes the tiles in a scratch folder and changes nothing.
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { unzip } from '../../public/tools/world/core/zip.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require_ = createRequire(path.join(REPO, 'noop.cjs'));
const { chromium } = require_('playwright-core');

const args = process.argv.slice(2);
const outArg = args.indexOf('--out');
const OUT = path.resolve(outArg >= 0 ? args[outArg + 1] : path.join(REPO, 'public/world/ground'));
const DRY = args.includes('--dry');
const jobs = [];
for (const a of args) {
  const m = /^([a-z0-9-]+):([AB])=(.+)$/.exec(a);
  if (m) jobs.push({ id: m[1], ver: m[2], file: path.resolve(m[3]) });
}
if (!jobs.length) {
  console.error('usage: node tools/world/add-ground-pictures.mjs <id>:<A|B>=<picture> [...] [--out dir] [--dry]');
  process.exit(2);
}
for (const j of jobs) if (!fs.existsSync(j.file)) { console.error(`no such picture: ${j.file}`); process.exit(2); }

/* the studio, from public/ */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json', '.mp3': 'audio/mpeg' };
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
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
let made;
try {
  const page = await (await browser.newContext({ acceptDownloads: true })).newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:${server.address().port}/tools/ground/`);
  await page.waitForFunction(() => window.__ground && window.__ground.S.ready, null, { timeout: 60000 });
  await page.evaluate(() => window.__ground.S.ready.then(() => true));
  for (const j of jobs) {
    const known = await page.evaluate((id) => !!window.__ground.S.byId[id], j.id);
    if (!known) throw new Error(`the Ground Studio has no card "${j.id}"`);
    const ext = path.extname(j.file).toLowerCase();
    await page.setInputFiles(`input[data-file="${j.id}|${j.ver}"]`, { name: `${j.id}-${j.ver}${ext}`, mimeType: ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png', buffer: fs.readFileSync(j.file) });
    await page.waitForFunction(([i, v]) => { const t = window.__ground.S.tiles[i]; return t && t.byVer[v] && document.getElementById('busy').hidden; }, [j.id, j.ver], { timeout: 120000 });
    const toast = await page.evaluate(() => (document.getElementById('toast') && !document.getElementById('toast').hidden ? document.getElementById('toast').textContent : ''));
    console.log(`  ${j.id} ${j.ver}: made by the studio${toast ? ` ("${toast.trim().slice(0, 120)}")` : ''}`);
  }
  const zips = await page.evaluate(async () => {
    const out = [];
    for (const z of await window.__ground.api.exportGameZips()) {
      let s = '';
      for (let i = 0; i < z.bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, z.bytes.subarray(i, i + 0x8000));
      out.push(btoa(s));
    }
    return out;
  });
  if (errs.length) throw new Error('the studio page threw: ' + errs[0]);
  /* every card's id, in the page's order (its download lists only the made ones) */
  made = { files: new Map(), manifest: null, order: await page.evaluate(() => window.__ground.S.cat.map((e) => e.id)) };
  for (const b64 of zips) {
    for (const e of await unzip(new Uint8Array(Buffer.from(b64, 'base64')))) {
      if (e.name === 'manifest.json') made.manifest = JSON.parse(Buffer.from(e.data).toString('utf8'));
      else made.files.set(path.basename(e.name), e.data);
    }
  }
} finally {
  await browser.close();
  server.close();
}

/* merge into the game's copy */
const target = DRY ? fs.mkdtempSync(path.join(fs.realpathSync('/tmp'), 'ground-dry-')) : OUT;
const manPath = path.join(OUT, 'manifest.json');
const man = JSON.parse(fs.readFileSync(manPath, 'utf8'));
let replaced = 0;
for (const j of jobs) {
  const name = `${j.id}-${j.ver}.png`, data = made.files.get(name);
  if (!data) throw new Error(`the studio's download has no ${name}`);
  if (fs.existsSync(path.join(OUT, name))) replaced++;
  fs.writeFileSync(path.join(target, name), data);
  const from = made.manifest.swatches.find((s) => s.id === j.id);
  let sw = man.swatches.find((s) => s.id === j.id);
  if (!sw) { sw = { ...from, versions: [] }; man.swatches.push(sw); }
  sw.versions = [...new Set([...(sw.versions || []), j.ver])].sort();
  sw.brief = from.brief; sw.madeFrom = from.madeFrom;
  console.log(`  -> ${path.relative(REPO, path.join(target, name))} (${(data.length / 1024).toFixed(0)} KB)`);
}
/* the swatches in the studio's order, as its own download lists them; one
   the studio no longer has keeps its place at the end */
const at = (id) => { const i = made.order.indexOf(id); return i < 0 ? made.order.length : i; };
man.swatches.sort((a, b) => at(a.id) - at(b.id));
if (replaced) man.made = new Date().toISOString();
fs.writeFileSync(path.join(target, 'manifest.json'), JSON.stringify(man, null, 2));
console.log(`${jobs.length} picture(s) into ${path.relative(REPO, target) || target}${replaced ? `; ${replaced} replaced, so every tile's address is new (made ${man.made})` : '; nothing replaced, every other tile keeps its address'}`);
