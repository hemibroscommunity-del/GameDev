/* ═══ THE WHEEL TRIAL, WALKED (v2.3.2943) ═══
 *
 * Owner: "I want to continue on."  `?trial=wheel` puts the World View on the
 * Wheel -- the plan the World Builder and the Ground Studio build -- at full
 * size, its ground laid on the device from the owner's swatches by a worker
 * (src/game/worldTrial.js, src/game/wheelTrial.js, src/rendering/wheelGround.js,
 * public/tools/world/core/ground-worker.js).  Walked here the way the owner
 * will walk it, on a phone viewport, against a real worker:
 *
 *   0. a swatch is made in the Ground Studio on this site -- planted in its
 *      storage exactly as the studio keeps it (the picture before the
 *      palette, and the palette) -- and never uploaded anywhere; (v2.3.2951)
 *      with the yards and the BLEND between the square and the yards;
 *   1. town's stairs lead into the Wheel behind the ordinary loading
 *      overlay, which waits for the plan and the first screen of ground;
 *   2. you arrive in the town square, the worker agrees, and the pieces round
 *      you are laid -- with the planted swatch under your feet, on screen;
 *   3. walking lays new pieces ahead and frees them behind;
 *   4. the sea stops you, the town does not;
 *   5. the marker beside where you landed takes you home, every piece is
 *      freed, and the worker is stopped a few seconds later.
 *
 * Pictures land in tools/qa/mp/out/wheeltrial-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
/* the planted swatch: 16 px checks of two colours no plan colour is near */
const MAGENTA = [230, 60, 200], CYAN = [40, 200, 220];
/* v2.3.2951: the yards' swatch, and the blend between the square and the
   yards, each in two more such colours */
const ORANGE = [240, 140, 20], PURPLE = [120, 50, 170], YELLOW = [250, 230, 40], GREEN = [60, 200, 60];
const ARRIVAL = { x: 21504, y: 21792 };

const holdTitle = (P, ms) => P.page.evaluate(async (hold) => {
  const el = document.querySelector('.bt-zone-header__title');
  if (!el) return 'no title element';
  const r = el.getBoundingClientRect();
  const opts = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, pointerType: 'touch' };
  el.dispatchEvent(new PointerEvent('pointerdown', opts));
  await new Promise((res) => setTimeout(res, hold));
  el.dispatchEvent(new PointerEvent('pointerup', opts));
  return 'ok';
}, ms);
const panelUp = (P) => P.page.evaluate(() => !!Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel'));
const tap = (P, text) => P.page.evaluate((t) => {
  const b = Array.from(document.querySelectorAll('button')).find((n) => (n.textContent || '').indexOf(t) >= 0);
  if (!b) return false;
  b.click();
  return true;
}, text);

/* In the page: the Ground Studio's storage, as addPicture leaves it for the
   town square's swatch (public/tools/ground/app.js). */
const plant = (P) => P.page.evaluate(async ({ A, B, Y1, Y2, M1, M2 }) => {
  const T = 1024;
  const checks = async (p, q) => {
    const c = document.createElement('canvas');
    c.width = c.height = T;
    const g = c.getContext('2d');
    for (let y = 0; y < T; y += 16) for (let x = 0; x < T; x += 16) {
      const col = ((x >> 4) + (y >> 4)) & 1 ? p : q;
      g.fillStyle = `rgb(${col.join(',')})`;
      g.fillRect(x, y, 16, 16);
    }
    return new Promise((r) => c.toBlob(r, 'image/png'));
  };
  const blob = await checks(A, B);
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('brotown-ground-studio', 1);
    r.onupgradeneeded = () => { for (const s of ['raw', 'prep', 'misc']) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const put = (store, key, val) => new Promise((res, rej) => {
    const q = db.transaction(store, 'readwrite').objectStore(store).put(val, key);
    q.onsuccess = () => res();
    q.onerror = () => rej(q.error);
  });
  await put('raw', 'plaza|A', { blob, name: 'checks.png', type: 'image/png' });
  await put('prep', 'plaza|A', blob);
  /* v2.3.2951: the yards, and the square and the yards' BLEND, as the
     studio keeps it: under the pair's key, version M */
  const yard = await checks(Y1, Y2), mixed = await checks(M1, M2);
  await put('raw', 'town-yard|A', { blob: yard, name: 'yard.png', type: 'image/png' });
  await put('prep', 'town-yard|A', yard);
  await put('raw', 'plaza__town-yard|M', { blob: mixed, name: 'blend.png', type: 'image/png' });
  await put('prep', 'plaza__town-yard|M', mixed);
  /* v2.3.2947: and the commons' EDGE PIECES, as the studio keeps them: its
     tile before the palette, the magenta already cut away -- sixty round
     clumps on see-through, laid where the commons lies over the road */
  const e = document.createElement('canvas');
  e.width = e.height = T;
  const eg = e.getContext('2d');
  for (let k = 0; k < 60; k++) {
    const x = 60 + (k % 8) * 120 + (k * 37) % 40, y = 60 + Math.floor(k / 8) * 120 + (k * 53) % 40;
    eg.fillStyle = k % 2 ? 'rgb(255,255,255)' : 'rgb(0,0,0)';
    eg.beginPath(); eg.arc(x, y, 14, 0, 7); eg.fill();
  }
  const eblob = await new Promise((r) => e.toBlob(r, 'image/png'));
  await put('raw', 'commons|E', { blob: eblob, name: 'commons-pieces.png', type: 'image/png' });
  await put('prep', 'commons|E', eblob);
  await put('misc', 'palette', { colours: [A, B, [0, 0, 0], [255, 255, 255], Y1, Y2, M1, M2], frozen: true });
  db.close();
  return blob.size;
}, { A: MAGENTA, B: CYAN, Y1: ORANGE, Y2: PURPLE, M1: YELLOW, M2: GREEN });

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `wheeltrial-${name}.png`) });
  const devState = async (id) => (await (await fetch(
    'http://127.0.0.1:' + wsPort + '/api/admin/dev/state?id=' + encodeURIComponent(id),
    { headers: { Authorization: 'Bearer ' + H.ADMIN_KEY } })).json());
  const stats = (P) => P.page.evaluate(() => Object.assign({}, window.__btWorldTrial.stats));
  const { TOWN_EXITS } = await import(H.REPO + '/src/data/effects.js');

  const P = await H.newPlayer(browser, { name: 'Wheeler', wsPort, webPort, viewport: PHONE, touch: true, query: 'trial=wheel' });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  const myId = await H.readState(P, (S) => S.myId);

  /* setup: the Mayor gate stands between town and the World View */
  if (!(await panelUp(P))) { await holdTitle(P, 1500); await P.page.waitForTimeout(900); }
  await P.page.evaluate((k) => {
    const inp = document.querySelector('input[type="password"]');
    if (!inp) return;
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(inp, k);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, H.ADMIN_KEY);
  await tap(P, 'Save key on this device');
  await P.page.waitForTimeout(1500);
  await tap(P, 'Finish all quests');
  await P.page.waitForTimeout(2000);
  await tap(P, 'Close');
  await P.page.waitForTimeout(600);

  /* ── 0. a swatch made in the Ground Studio, on this site ── */
  const bytes = await plant(P);
  rec.ok('a swatch is planted in the Ground Studio\'s storage, as the studio keeps it', bytes > 1000, { bytes });

  /* ── 1. the switch, and the way in ── */
  const mode = await P.page.evaluate(() => window.__btWorldTrial && window.__btWorldTrial.mode);
  rec.ok('?trial=wheel switches the Wheel trial on', mode === 'wheel', { mode });
  const door = TOWN_EXITS.find((e) => e.zoneId === 'worldview');
  await P.page.evaluate(() => {
    window.__btTrialTrace = { overlayAt: null, overlayGone: null, zones: [] };
    window.__btTrialTimer = setInterval(() => {
      const t = window.__btTrialTrace, S = window._gameState && window._gameState.current;
      if (!S) return;
      if (t.zones[t.zones.length - 1] !== S.currentZone) t.zones.push(S.currentZone);
      const el = document.querySelector('.bt-zone-loading');
      if (el && t.overlayAt == null) t.overlayAt = performance.now();
      if (!el && t.overlayAt != null && t.overlayGone == null) t.overlayGone = performance.now();
    }, 50);
  });
  await H.hopTo(P, door.tx * 32 + 16, (door.ty - 1) * 32 + 16);
  let zone = null;
  for (let i = 0; i < 60; i++) {
    zone = await H.readState(P, (S) => S.currentZone);
    if (zone === 'worldview') break;
    await P.page.waitForTimeout(1000);
  }
  await P.page.waitForTimeout(2000);
  const trace = await P.page.evaluate(() => { clearInterval(window.__btTrialTimer); return window.__btTrialTrace; });
  const entry = await P.page.evaluate(() => {
    const W = window.__btWorldTrial, S = window._gameState.current;
    return { stats: Object.assign({}, W.stats), mapRows: S.map && S.map.length, shared: !!(S.map && S.map[3] === S.map[900]),
      x: S.player.x, y: S.player.y, ready: W.ready() };
  });
  console.log('    WAY IN -> ' + JSON.stringify({ zones: trace.zones, overlayMs: trace.overlayAt && trace.overlayGone ? Math.round(trace.overlayGone - trace.overlayAt) : null, stats: entry.stats }));
  rec.ok('town\'s stairs lead into the Wheel (43,008 game px, 1344 tiles a side)', zone === 'worldview' && entry.mapRows === 1344, { zone, rows: entry.mapRows });
  rec.ok('...whose tile map is one shared row, not 1.8 million cells', entry.shared, {});
  rec.ok('...behind the ordinary loading overlay, which waited for the plan and the first screen',
    trace.overlayAt != null && entry.stats.entryMs != null && entry.stats.planMs != null && entry.ready, { trace, stats: entry.stats });
  rec.ok('you arrive in the Wheel\'s town square', Math.hypot(entry.x - ARRIVAL.x, entry.y - ARRIVAL.y) < 64, { at: [entry.x, entry.y] });
  let srv = await devState(myId);
  for (let i = 0; i < 10 && srv.zone !== 'worldview'; i++) { await P.page.waitForTimeout(500); srv = await devState(myId); }
  rec.ok('the worker has you in the World View too', srv.zone === 'worldview', { server: srv.zone });
  rec.ok('the pieces round you are laid and in memory', entry.stats.resident >= 12 && entry.stats.resident <= 70, entry.stats);
  const map = await P.page.evaluate(() => window.__btWorldTrial.map());
  rec.ok('the Map panel has the whole Wheel to show, drawn on the device', !!map && map.w === 448 && map.h === 448, { map });
  rec.ok('arriving shows no gaps', entry.stats.popIns === 0, entry.stats);

  /* ── 2. the planted swatch is the ground you stand on ── */
  let hud = '';
  for (let i = 0; i < 10; i++) {
    hud = await P.page.evaluate(() => window.__btWorldTrial.hud());
    if (/here\s+Town square/.test(hud)) break;
    await P.page.waitForTimeout(400);
  }
  console.log('    HUD ->\n      ' + hud.split('\n').join('\n      '));
  rec.ok('the readout finds the swatches made in the Ground Studio', /2 yours/.test(hud), { hud });
  /* v2.3.2951, owner: "Bottom right looks the best by a moderate margin" --
     "Yes build it": the blend between the square and the yards */
  rec.ok('...and the blend between the square and the yards made there', /blends\s+1 made/.test(hud), { hud });
  /* v2.3.2948: the edge pieces are put away -- the game's worker leaves the
     commons' planted ones unread -- but a worker told `edgepieces` (the
     game's ?trial=wheel&edgepieces) still finds them (v2.3.2947) */
  rec.ok('...but not the commons\' edge pieces made there: they are put away (v2.3.2948)', !/with edge pieces/.test(hud), { hud });
  const told = await P.page.evaluate(() => new Promise((resolve) => {
    const w = new Worker('/tools/world/core/ground-worker.js', { type: 'module' });
    let t = null;
    const done = (v) => { clearTimeout(t); w.terminate(); resolve(v); };
    w.onmessage = (ev) => { const m = ev.data || {}; if (m.type === 'ready') done({ edges: m.edges, made: Object.keys(m.made || {}), blends: m.blends }); else if (m.type === 'error') done({ error: m.message }); };
    w.onerror = (ev) => done({ error: (ev && ev.message) || 'the worker failed' });
    t = setTimeout(() => done({ error: 'no answer in 60 s' }), 60000);
    w.postMessage({ type: 'init', search: '?trial=wheel&edgepieces' });
  }));
  rec.ok('...which a worker told ?edgepieces still finds: put away, not gone', Array.isArray(told.edges) && told.edges.join() === 'commons', told);
  rec.ok('...(and the blend is found either way, under its pair\'s key)', Array.isArray(told.blends) && told.blends.join() === 'plaza__town-yard', told);
  rec.ok('...and says it is under your feet', /here\s+Town square ✓/.test(hud), { hud });
  await shot(P, '01-arrival');
  const px = await H.screenshotPixels(P);
  const near = (k) => (r, g, b) => Math.abs(r - k[0]) + Math.abs(g - k[1]) + Math.abs(b - k[2]) < 30;
  const nMag = px.count(near(MAGENTA)), nCyan = px.count(near(CYAN));
  const all = px.width * px.height;
  rec.ok(`...and it is on screen, laid in its own colours (${(100 * (nMag + nCyan) / all).toFixed(0)}% of the screen)`,
    nMag > all * 0.03 && nCyan > all * 0.03, { nMag, nCyan, all });
  const nYard = px.count(near(ORANGE)) + px.count(near(PURPLE)), nBlend = px.count(near(YELLOW)) + px.count(near(GREEN));
  rec.ok(`...with the yards beyond it, and the blend laid where the square meets them (${(100 * nBlend / all).toFixed(1)}% of the screen)`,
    nYard > all * 0.03 && nBlend > all * 0.01, { nYard, nBlend, all });

  /* ── 3. walk ── */
  const legs = [
    ['02-east', ARRIVAL.x + 1800, ARRIVAL.y + 700],
    ['03-north', ARRIVAL.x, ARRIVAL.y - 2200],
    ['04-back', ARRIVAL.x + 200, ARRIVAL.y + 96],
  ];
  let maxResident = 0;
  for (const [name, x, y] of legs) {
    const t0 = Date.now();
    const arrived = await H.hopTo(P, x, y, { tries: 60 });
    const s = await stats(P);
    maxResident = Math.max(maxResident, s.resident);
    console.log(`    ${name} -> ${arrived ? 'there' : 'NOT there'} in ${((Date.now() - t0) / 1000).toFixed(0)} s: ${JSON.stringify(s)}`);
    await P.page.waitForTimeout(1500);
    await shot(P, name);
  }
  const walked = await stats(P);
  rec.ok('walking lays new pieces', walked.loads > 30, walked);
  rec.ok('...ahead of you: at a brisk walk few pieces are on screen before they are laid', walked.popIns <= 6, walked);
  rec.ok('...and frees them behind: memory stays bounded however far you go', maxResident <= 70 && walked.resident <= 70, { maxResident, now: walked.resident });
  rec.ok('...every piece laid, and every swatch picture unpacked', walked.failures === 0 && walked.unreadable === 0, walked);
  rec.ok(`...each piece laid in the worker in ${Math.round(walked.sumMs / Math.max(1, walked.loads))} ms on average`, walked.loads > 0 && walked.maxMs < 2000, walked);
  const me = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
  let live = await H.serverPlayer(wsPort, myId);
  const closeTo = (l) => l && typeof l.x === 'number' && Math.hypot(l.x - me.x, l.y - me.y) < 200;
  for (let i = 0; i < 10 && !closeTo(live); i++) { await P.page.waitForTimeout(500); live = await H.serverPlayer(wsPort, myId); }
  rec.ok('the worker followed you (it accepts the Wheel\'s size)', !!live && live.zone === 'worldview' && closeTo(live),
    { client: me, server: live && { x: live.x, y: live.y, zone: live.zone } });

  /* ── 4. what stops you ── */
  const solid = await P.page.evaluate(({ a }) => {
    const f = window.__btIsSolid;
    return { sea: f(300, 300), farSea: f(42000, 800), square: f(a.x, a.y), east: f(a.x + 1800, a.y + 700) };
  }, { a: ARRIVAL });
  rec.ok('the sea stops you; the town square does not', solid.sea === true && solid.farSea === true && solid.square === false, solid);

  /* ── 5. home, everything freed, the worker stopped ── */
  const exit = await P.page.evaluate(() => {
    const S = window._gameState.current;
    for (let y = 0; y < S.map.length; y++) { const row = S.map[y]; const x = row.indexOf(8); if (x >= 0) return { tx: x, ty: y }; }
    return null;
  });
  /* beside you, not on the roads north and south out of the square: a marker
     there sent the walk back home the first time it set off north */
  rec.ok('the way home is marked on the square beside where you landed, off the roads out',
    !!exit && Math.abs(exit.ty * 32 + 16 - ARRIVAL.y) < 48 && ARRIVAL.x - exit.tx * 32 > 96 && ARRIVAL.x - exit.tx * 32 < 200, { exit });
  const offRoad = await P.page.evaluate(({ a }) => {
    const S = window._gameState.current, row = Math.floor(a.y / 32), col = Math.floor(a.x / 32);
    let hit = 0;
    for (let ty = row - 40; ty <= row + 40; ty++) if (S.map[ty] && (S.map[ty][col] === 8 || S.map[ty][col - 1] === 8 || S.map[ty][col + 1] === 8)) hit++;
    return hit;
  }, { a: ARRIVAL });
  rec.ok('...so walking straight north or south from the square never steps on it', offRoad === 0, { offRoad });
  await H.hopTo(P, exit.tx * 32 + 16 + 40, exit.ty * 32 + 16, { tries: 60 });
  let back = null;
  for (let i = 0; i < 40; i++) {
    back = await H.readState(P, (S) => S.currentZone);
    if (back === 'town') break;
    await P.page.waitForTimeout(700);
  }
  await P.page.waitForTimeout(1500);
  const after = await P.page.evaluate(() => ({ stats: Object.assign({}, window.__btWorldTrial.stats), ready: window.__btWorldTrial.ready() }));
  rec.ok('the marker takes you back to town', back === 'town', { back });
  rec.ok('...and every piece is freed on the way out', after.stats.resident === 0 && after.ready === false, after);
  await P.page.waitForTimeout(6500);
  const running = await P.page.evaluate(() => window.__btWorldTrial.running());
  rec.ok('...and the worker is stopped a few seconds later, freeing the plan and the swatches', running === false, { running });
  rec.ok('no page errors', P.logs.filter((l) => /pageerror/.test(l)).length === 0, P.logs.filter((l) => /pageerror/.test(l)).slice(0, 5));
}
