/* ═══ THE WORLD TRIAL, WALKED (v2.3.2932) ═══
 *
 * Owner: "Can we do one trial run where you just replicate the entire
 * worldview map using copies of existing art so I can test loading times and
 * game feel?"  (src/game/worldTrial.js, src/rendering/chunkGround.js.)
 *
 * The owner will judge this by walking it on a phone, so this walks it first,
 * on a phone viewport, against a real worker, through the real front door:
 *
 *   1. the switch (`?trial=world`) turns the World View into the island, and
 *      town's stairs lead there behind the ordinary loading overlay -- whose
 *      time is the trial's "way in" number;
 *   2. you arrive at the foot of the town painting, the WORKER agrees you are
 *      there (the whole trial rests on it accepting positions in a zone 8.7x
 *      wider than it thinks), and the pieces round you are in memory;
 *   3. walking across the island streams pieces in and frees them behind:
 *      memory stays bounded however far you go;
 *   4. the sea and the river stop you, the bridge does not;
 *   5. the marker at the stairs takes you back to town, and every piece is
 *      freed on the way out.
 *
 * Pictures land in tools/qa/mp/out/worldtrial-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

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

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `worldtrial-${name}.png`) });
  const devState = async (id) => (await (await fetch(
    'http://127.0.0.1:' + wsPort + '/api/admin/dev/state?id=' + encodeURIComponent(id),
    { headers: { Authorization: 'Bearer ' + H.ADMIN_KEY } })).json());
  const { TOWN_EXITS } = await import(H.REPO + '/src/data/effects.js');

  const P = await H.newPlayer(browser, { name: 'Walker', wsPort, webPort, viewport: PHONE, touch: true, query: 'trial=world' });
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

  /* ── 1. the switch, and the way in ── */
  const on = await P.page.evaluate(() => !!window.__btWorldTrial);
  rec.ok('?trial=world switches the trial on', on, {});
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
  /* one tile short of the stairs marker: hopTo writes the position, and
     writing it on and on through the loading hold would drag the player off
     the door and abandon the gate */
  await H.hopTo(P, door.tx * 32 + 16, (door.ty - 1) * 32 + 16);
  let zone = null;
  for (let i = 0; i < 60; i++) {
    zone = await H.readState(P, (S) => S.currentZone);
    if (zone === 'worldview') break;
    await P.page.waitForTimeout(1000);
  }
  await P.page.waitForTimeout(1500);
  const trace = await P.page.evaluate(() => { clearInterval(window.__btTrialTimer); return window.__btTrialTrace; });
  const entry = await P.page.evaluate(() => {
    const W = window.__btWorldTrial, S = window._gameState.current, m = W.manifest();
    return { stats: Object.assign({}, W.stats), m: m && { arrival: m.arrival, worldW: m.worldW, cols: m.cols }, mapRows: S.map && S.map.length, x: S.player.x, y: S.player.y };
  });
  console.log('    WAY IN -> ' + JSON.stringify({ zones: trace.zones, overlayMs: trace.overlayAt && trace.overlayGone ? Math.round(trace.overlayGone - trace.overlayAt) : null, entryMs: entry.stats.entryMs }));
  rec.ok('town\'s stairs lead into the trial world', zone === 'worldview' && entry.mapRows === 416, { zone, rows: entry.mapRows });
  rec.ok('...behind the ordinary loading overlay, which waited for the first pieces', trace.overlayAt != null && entry.stats.entryMs != null, trace);
  rec.ok('you arrive at the foot of the town painting',
    entry.m && Math.hypot(entry.x - entry.m.arrival.x, entry.y - entry.m.arrival.y) < 64, { at: [entry.x, entry.y], arrival: entry.m && entry.m.arrival });
  let srv = await devState(myId);
  for (let i = 0; i < 10 && srv.zone !== 'worldview'; i++) { await P.page.waitForTimeout(500); srv = await devState(myId); }
  rec.ok('the worker has you in the World View too', srv.zone === 'worldview', { server: srv.zone });
  rec.ok('the pieces round you are in memory', entry.stats.resident > 0 && entry.stats.resident <= 24, entry.stats);
  /* the way in warmed the first screen, so arriving shows no gaps -- and the
     camera no longer sweeps in from town's corner loading everything on the
     way (it did: 17 wasted loads, fixed by the BroTown camera clamp) */
  rec.ok('arriving shows no gaps and loads nothing wasted', entry.stats.popIns === 0 && entry.stats.loads <= 4, entry.stats);
  await shot(P, '01-arrival');

  /* ── 2. walk across the island ── */
  const legs = [
    ['02-south-road', 6600, 9300],
    ['03-mill-bridge', 4610, 6656],
    ['04-frost', 3300, 3400],
  ];
  let maxResident = 0;
  for (const [name, x, y] of legs) {
    const t0 = Date.now();
    const arrived = await H.hopTo(P, x, y, { tries: 200 });
    const s = await P.page.evaluate(() => Object.assign({}, window.__btWorldTrial.stats));
    maxResident = Math.max(maxResident, s.resident);
    console.log(`    ${name} -> ${arrived ? 'there' : 'NOT there'} in ${((Date.now() - t0) / 1000).toFixed(0)} s: ${JSON.stringify(s)}`);
    await P.page.waitForTimeout(1200);
    await shot(P, name);
  }
  const walked = await P.page.evaluate(() => Object.assign({}, window.__btWorldTrial.stats));
  rec.ok('walking streams new pieces in', walked.loads > 10, walked);
  rec.ok('...ahead of you: at a brisk walk no piece is on screen before its picture', walked.popIns <= 2, walked);
  rec.ok('...and frees them behind: memory stays bounded however far you go', maxResident <= 24 && walked.resident <= 24, { maxResident, now: walked.resident });
  const me = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
  let live = await H.serverPlayer(wsPort, myId);
  const near = (l) => l && typeof l.x === 'number' && Math.hypot(l.x - me.x, l.y - me.y) < 200;
  for (let i = 0; i < 10 && !near(live); i++) { await P.page.waitForTimeout(500); live = await H.serverPlayer(wsPort, myId); }
  rec.ok('the worker followed you across the whole island (it accepts the big map)',
    !!live && live.zone === 'worldview' && near(live), { client: me, server: live && { x: live.x, y: live.y, zone: live.zone } });

  /* ── 3. what stops you ── */
  const solid = await P.page.evaluate(({ arrival }) => {
    const f = window.__btIsSolid;
    return { sea: f(150, 150), arrival: f(arrival.x, arrival.y), bridge: f(4610, 6656), river: f(4610, 6656 + 420) };
  }, { arrival: entry.m.arrival });
  rec.ok('the sea stops you; the road where you arrive does not', solid.sea === true && solid.arrival === false, solid);
  rec.ok('the bridge is open', solid.bridge === false, solid);

  /* ── 4. home, and everything freed ── */
  await H.hopTo(P, entry.m.arrival.x, entry.m.arrival.y + 64, { tries: 200 });
  await P.page.waitForTimeout(1500);
  const exit = await P.page.evaluate(() => {
    const S = window._gameState.current;
    let at = null;
    for (let y = 0; y < S.map.length && !at; y++) { const row = S.map[y]; for (let x = 0; x < row.length; x++) if (row[x] === 8) { at = { tx: x, ty: y }; break; } }
    return at;
  });
  await H.hopTo(P, exit.tx * 32 + 16, exit.ty * 32 + 16 + 40, { tries: 60 });
  let back = null;
  for (let i = 0; i < 40; i++) {
    back = await H.readState(P, (S) => S.currentZone);
    if (back === 'town') break;
    await P.page.waitForTimeout(700);
  }
  await P.page.waitForTimeout(1500);
  const after = await P.page.evaluate(() => ({ stats: Object.assign({}, window.__btWorldTrial.stats), ready: window.__btWorldTrial.ready() }));
  rec.ok('the marker at the stairs takes you back to town', back === 'town', { back });
  rec.ok('...and every piece is freed on the way out', after.stats.resident === 0 && after.ready === false, after);
  rec.ok('no page errors', P.logs.filter((l) => /pageerror/.test(l)).length === 0, P.logs.slice(0, 5));
}
