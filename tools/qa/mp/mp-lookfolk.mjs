/* ═══ v2.3.3809: THE TOWNSFOLK DRAWN LIVE, AGAINST THEIR PHOTOGRAPHS ═══
 *
 * With the look palette on, the townsfolk are drawn from their looks
 * (src/data/npcLooks.js), as other players are, instead of from photographs
 * of the same looks (rendering/lookFolk.js).  A phone (390 x 844, dpr 3) in
 * the world's BroTown, twice -- as it is (live) and with `?lookfolk=0` (the
 * photographs):
 *
 *   1. what the page holds on arrival (memprobe's ruler): the graphics chip,
 *      the art cache, and the cast's photographs (__btWheelNpcArt);
 *   2. the frame where you arrive: draw calls, programs and texture binds a
 *      frame (mp-crowdfight's counter: judged by those, TRAPS §225) and the
 *      game's frame ms, the townsfolk on screen;
 *   3. each of the eight, standing, cut out of the screen both ways and laid
 *      side by side (tools/qa/mp/out/lookfolk-<name>.png), with how many of
 *      his pixels differ: he breathes live where the photograph is one
 *      frame, and his plate and badge are the same either way, so the
 *      number is a guide and the picture is the check.
 *
 * Asserts: live, no photograph held and every one of the eight drawn live;
 * the photographs' way draws none live; each drawn both ways, his figure
 * within a few pixels of the photograph's height; no page errors.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MEM_INIT, memSampler } from './memprobe.mjs';
import { GL_INSTALL, GL_START, GL_READ, GL_UNINSTALL } from './mp-crowdfight.mjs';

const PHONE = { width: 390, height: 844 };
const GL_MS = 6000;
const FACINGS = ['south', 'southwest', 'west', 'northwest', 'north', 'northeast', 'east', 'southeast'];
const FACING_SAMPLE = ['Mayor Bro', 'Farmer Bro', 'Lil Bro'];
const q = (arr, p) => {
  if (!arr.length) return 0;
  const v = [...arr].sort((a, b) => a - b);
  return +v[Math.min(v.length - 1, Math.floor(v.length * p))].toFixed(1);
};

async function oneWay(browser, wsPort, webPort, rec, query, OUT) {
  const live = !query;
  const P = await H.newPlayer(browser, { name: live ? 'Folklive' : 'Folkphoto', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 3,
    init: MEM_INIT, query: query || undefined });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const out = { way: live ? 'live' : 'photographs', cuts: {}, facings: {} };
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 120000, label: 'in the world' }).catch(() => null);
    rec.ok(`${out.way}: in the world (guard)`, !!ok, ok);
    if (!ok) return out;
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'quests', me).catch(() => null);
    await H.devOp(wsPort, 'vitals', me, { god: true, godMinutes: 30 }).catch(() => null);
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    await P.page.waitForTimeout(4000);

    /* 1. memory */
    const { sample } = await memSampler(P, browser);
    const m = await sample(out.way);
    out.mem = { gpu: m.gpu, cache: m.cache, canvasMB: m.canvasMB, heapMB: m.heapMB };
    out.photos = await P.page.evaluate(() => (window.__btWheelNpcArt ? window.__btWheelNpcArt() : null));
    out.folk = await P.page.evaluate(() => (window.__btLookFolk ? window.__btLookFolk() : null));

    /* 2. the frame where you arrive */
    const glOk = await P.page.evaluate(GL_INSTALL);
    await P.page.evaluate(GL_START);
    await P.page.waitForTimeout(GL_MS);
    out.frame = await P.page.evaluate(GL_READ);
    out.frame.onScreen = await H.readState(P, (S) => (S.npcs || []).filter((n) => S.camera && n.x > S.camera.x && n.x < S.camera.x + (S._viewW || 0)
      && n.y > S.camera.y && n.y < S.camera.y + (S._viewH || 0)).length);
    out.frame.workP50 = q(out.frame.work, 0.5);
    delete out.frame.work;
    if (glOk) await P.page.evaluate(GL_UNINSTALL);

    /* 3. each townsperson, cut out of the screen */
    const cast = await H.readState(P, (S) => (S.npcs || []).filter((n) => n && n.alive !== false).map((n) => ({ name: n.name, x: n.x, y: n.y })));
    const cutOf = async (n) => {
      const box = await P.page.evaluate((nm) => {
        /* the game's own canvas (the first on the page may be another) */
        const S = window._gameState.current, c = window._pixiRenderer.app.canvas, r = c.getBoundingClientRect();
        const d = (window.__btNpcSprites ? window.__btNpcSprites() : []).find((q) => q.name === nm);
        if (!d || !S.camera) return null;
        const k = S._worldScaleX || 1;
        const x = r.left + (d.x - S.camera.x) * k, y = r.top + (d.footY - S.camera.y) * (S._worldScaleY || 1);
        return { x: Math.round(x - 50 * k), y: Math.round(y - 185 * k), width: Math.round(100 * k), height: Math.round(190 * k), live: !!d.live, h: Math.round(d.height) };
      }, n.name);
      if (!box || box.x < 0 || box.y < 0 || box.x + box.width > PHONE.width || box.y + box.height > PHONE.height) return { box, png: null };
      const png = await P.page.screenshot({ clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
      return { box, live: box.live, png: png.toString('base64') };
    };
    for (const n of cast) {
      await H.hopTo(P, n.x + 120, n.y + 160, { step: 100, gap: 260, tries: 90 });
      /* the camera eases after you (this box draws a few frames a second):
         cut only once it has stopped */
      let cam = null;
      for (let t = 0; t < 40; t++) {
        await P.page.waitForTimeout(400);
        const c = await H.readState(P, (S) => (S.camera ? [Math.round(S.camera.x), Math.round(S.camera.y)] : null));
        if (cam && c && cam[0] === c[0] && cam[1] === c[1]) break;
        cam = c;
      }
      out.cuts[n.name] = await cutOf(n);
      /* 4. live, a sample of them turned through every facing (the ghost
         check: every piece he wears comes round with him) */
      if (live && FACING_SAMPLE.indexOf(n.name) >= 0) {
        out.facings[n.name] = [];
        for (const f of FACINGS) {
          await P.page.evaluate((d) => window.__btLookFolkFace(d), f);
          await P.page.waitForTimeout(1200);
          out.facings[n.name].push(await cutOf(n));
        }
        await P.page.evaluate(() => window.__btLookFolkFace(null));
      }
    }
    out.errors = errors;
    return out;
  } finally {
    await P.ctx.close().catch(() => {});
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const A = await oneWay(browser, wsPort, webPort, rec, '', OUT);
  const B = await oneWay(browser, wsPort, webPort, rec, 'lookfolk=0', OUT);

  console.log(`    live:        chip ${A.mem && A.mem.gpu} MB, cache ${A.mem && A.mem.cache}, photographs ${A.photos && A.photos.mb} MB; a frame: ${JSON.stringify(A.frame)}`);
  console.log(`    photographs: chip ${B.mem && B.mem.gpu} MB, cache ${B.mem && B.mem.cache}, photographs ${B.photos && B.photos.mb} MB; a frame: ${JSON.stringify(B.frame)}`);
  rec.ok(`live: no photograph held (${A.photos && A.photos.mb} MB, against ${B.photos && B.photos.mb} MB)`, !!A.photos && A.photos.skipped && A.photos.mb === 0 && !!B.photos && B.photos.mb > 1, { a: A.photos, b: B.photos });

  /* side by side, and the pixels that differ (in a page: no PNG library here) */
  const P = await H.newPlayer(browser, { name: 'Folkcmp', wsPort, webPort, world: 'wheel', viewport: PHONE });
  const rows = [];
  const facingRows = [];
  try {
    for (const name of Object.keys(A.cuts)) {
      const a = A.cuts[name], b = B.cuts[name] || {};
      if (!a.png || !b.png) { rows.push({ name, missing: true, a: a.box, b: b.box }); continue; }
      const r = await P.page.evaluate(async ({ a, b }) => {
        const load = (s) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = 'data:image/png;base64,' + s; });
        const ia = await load(a), ib = await load(b);
        const w = Math.min(ia.width, ib.width), h = Math.min(ia.height, ib.height);
        const c = document.createElement('canvas'); c.width = w * 2 + 6; c.height = h;
        const x = c.getContext('2d');
        x.fillStyle = '#ff00ff'; x.fillRect(0, 0, c.width, h);
        x.drawImage(ia, 0, 0); x.drawImage(ib, w + 6, 0);
        const da = x.getImageData(0, 0, w, h).data, db = x.getImageData(w + 6, 0, w, h).data;
        let diff = 0;
        for (let i = 0; i < da.length; i += 4) {
          if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 90) diff++;
        }
        return { w, h, diff, frac: +(diff / (w * h)).toFixed(3), png: c.toDataURL('image/png').split(',')[1] };
      }, { a: a.png, b: b.png });
      writeFileSync(join(OUT, `lookfolk-${name.toLowerCase().replace(/\s+/g, '-')}.png`), Buffer.from(r.png, 'base64'));
      rows.push({ name, live: a.live, photo: b.live === false, liveH: a.box.h, photoH: b.box.h, differ: r.frac });
    }
    /* the sampled facings, eight cuts a row */
    for (const [name, cuts] of Object.entries(A.facings || {})) {
      const pngs = cuts.map((c) => c.png).filter(Boolean);
      if (!pngs.length) continue;
      const sheet = await P.page.evaluate(async (list) => {
        const load = (s) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = 'data:image/png;base64,' + s; });
        const ims = await Promise.all(list.map(load));
        const w = ims[0].width, h = ims[0].height;
        const c = document.createElement('canvas'); c.width = (w + 4) * ims.length; c.height = h;
        const x = c.getContext('2d');
        ims.forEach((im, i) => x.drawImage(im, i * (w + 4), 0));
        return c.toDataURL('image/png').split(',')[1];
      }, pngs);
      writeFileSync(join(OUT, `lookfolk-facings-${name.toLowerCase().replace(/\s+/g, '-')}.png`), Buffer.from(sheet, 'base64'));
      facingRows.push({ name, cut: pngs.length, live: cuts.every((c) => c.live) });
    }
  } finally {
    await P.ctx.close().catch(() => {});
  }
  rec.ok(`live, ${facingRows.map((f) => f.name).join(', ')} turned through all eight facings, each cut (tools/qa/mp/out/lookfolk-facings-*.png)`,
    facingRows.length === FACING_SAMPLE.length && facingRows.every((f) => f.cut === 8 && f.live), facingRows);
  for (const r of rows) console.log(`    ${r.name.padEnd(16)} ${r.missing ? 'NOT CUT ' + JSON.stringify([r.a, r.b]) : `live ${r.live} (${r.liveH} px) / photograph (${r.photoH} px): ${Math.round(r.differ * 100)}% of the cut differs`}`);
  writeFileSync(join(OUT, 'lookfolk.json'), JSON.stringify({ live: { mem: A.mem, photos: A.photos, frame: A.frame, folk: A.folk }, photographs: { mem: B.mem, photos: B.photos, frame: B.frame }, rows }, null, 2));
  rec.ok(`each of the eight drawn live (${rows.filter((r) => r.live).length}) and from his photograph the other way (${rows.filter((r) => r.photo).length})`,
    rows.length >= 8 && rows.every((r) => !r.missing && r.live && r.photo), rows);
  rec.ok(`no page errors (${(A.errors || []).length + (B.errors || []).length})`, !(A.errors || []).length && !(B.errors || []).length, [...(A.errors || []), ...(B.errors || [])].slice(0, 5));
}
