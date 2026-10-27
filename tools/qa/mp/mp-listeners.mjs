/* ═══ WHICH EVENT LISTENERS OUTLIVE A TRIP (v2.3.3661) ═══
 *
 * mp-longplay counted the page's event listeners as adds minus removes, and on
 * the farmer's page that rose ~100 every farm visit (748 -> 1,209 in 41
 * minutes).  A count cannot tell a real leak (a listener on the window or
 * document that is never taken off, holding whatever it closes over) from a
 * listener on something already gone (an image loaded once, a sound that
 * played), which goes with its target.  This census records every listener
 * added -- its target's kind, its event, and the line that added it -- takes
 * it off when it is removed, and drops it when its target is collected (a
 * FinalizationRegistry), so what is left after a forced GC is what is really
 * held.  A trip is made several times; the sites that grow by the same amount
 * every trip are the leak.
 *
 *   node tools/qa/mp/run.mjs listeners           a farm visit, BT_LS_TRIPS times
 *   BT_LS_TRIP=farm|lands|fight                  which trip
 *   QA_DIST=dist-prof                            an unminified build, for names
 *
 * Writes tools/qa/mp/out/listeners.json and listeners.md.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FARM_BEDS, FARM_GATE } from '../../../src/data/farmLayout.js';

const TRIPS = +(process.env.BT_LS_TRIPS || 4);
const TRIP = process.env.BT_LS_TRIP || 'farm';
const PHONE = { width: 390, height: 844 };
const FOOT_DY = 52;

const CENSUS = `(() => {
  const live = new Map();                 /* key -> count */
  const byTarget = new WeakMap();          /* target -> Map(type|capture|fnId -> key) */
  const fnIds = new WeakMap(); let fnN = 0;
  const fnId = (f) => { if (!f || (typeof f !== 'function' && typeof f !== 'object')) return 'x'; let i = fnIds.get(f); if (!i) { i = ++fnN; fnIds.set(f, i); } return i; };
  const reg = new FinalizationRegistry((keys) => { for (const k of keys) { const n = (live.get(k) || 0) - 1; if (n > 0) live.set(k, n); else live.delete(k); } });
  const kindOf = (t) => {
    if (t === window) return 'window';
    if (t === document) return 'document';
    if (t && t.nodeType === 1) return '<' + t.tagName.toLowerCase() + '>';
    return (t && t.constructor && t.constructor.name) || typeof t;
  };
  const siteOf = () => {
    const st = (new Error().stack || '').split('\\n').slice(3, 8)
      .map((l) => l.trim().replace(/^at /, '').replace(/https?:\\/\\/[^/]+\\//, '').replace(/\\?[^:)]*/, ''))
      .filter((l) => !/__census/.test(l));
    return st.slice(0, 3).join(' < ');
  };
  const capOf = (o) => (typeof o === 'boolean' ? o : !!(o && o.capture));
  const _ael = EventTarget.prototype.addEventListener, _rel = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function __censusAdd(type, fn, opts) {
    try {
      if (fn) {
        let m = byTarget.get(this);
        if (!m) { m = new Map(); byTarget.set(this, m); reg.register(this, (this.__censusKeys = this.__censusKeys || [])); }
        const sig = type + '|' + capOf(opts) + '|' + fnId(fn);
        if (!m.has(sig)) {
          const key = kindOf(this) + ' ' + type + (opts && opts.once ? ' (once)' : '') + ' @ ' + siteOf();
          m.set(sig, key);
          live.set(key, (live.get(key) || 0) + 1);
          this.__censusKeys.push(key);
          const drop = () => { if (!m.has(sig)) return; m.delete(sig); const n = (live.get(key) || 0) - 1; if (n > 0) live.set(key, n); else live.delete(key); const i = this.__censusKeys.indexOf(key); if (i >= 0) this.__censusKeys.splice(i, 1); };
          if (opts && opts.once) _ael.call(this, type, drop, { once: true });
          if (opts && opts.signal) opts.signal.addEventListener('abort', drop, { once: true });
        }
      }
    } catch (e) { /* the census only */ }
    return _ael.call(this, type, fn, opts);
  };
  EventTarget.prototype.removeEventListener = function __censusRemove(type, fn, opts) {
    try {
      const m = byTarget.get(this);
      const sig = type + '|' + capOf(opts) + '|' + fnId(fn);
      const key = m && m.get(sig);
      if (key) {
        m.delete(sig);
        const n = (live.get(key) || 0) - 1; if (n > 0) live.set(key, n); else live.delete(key);
        const i = this.__censusKeys ? this.__censusKeys.indexOf(key) : -1; if (i >= 0) this.__censusKeys.splice(i, 1);
      }
    } catch (e) { /* the census only */ }
    return _rel.call(this, type, fn, opts);
  };
  window.__lsCensus = () => { const o = {}; for (const [k, n] of live) o[k] = n; return o; };
})();`;

async function gc(P) {
  const cdp = await P.ctx.newCDPSession(P.page);
  try {
    await cdp.send('HeapProfiler.enable');
    await cdp.send('HeapProfiler.collectGarbage');
    await P.page.waitForTimeout(400);
    await cdp.send('HeapProfiler.collectGarbage');
    await P.page.waitForTimeout(400);
  } finally { await cdp.detach().catch(() => {}); }
}

/* the farm, as mp-longplay's farmer goes: the Feed & Seed's "Visit Your
   Farm", two beds worked, out by the gate */
async function farmTrip(P) {
  const until = async (fn, pred, ms = 8000) => { let v = null; for (const t = Date.now(); Date.now() - t < ms;) { v = await fn(); if (pred(v)) return v; await P.page.waitForTimeout(200); } return v; };
  await P.page.evaluate(() => { try { window.__btFarm.buy(window._gameState.current, 'seed_carrot', 2); } catch (e) { /* the check says */ } });
  await P.page.waitForTimeout(1200);
  await P.page.evaluate(() => { try { window._uiPanels.building('farm'); } catch (e) { /* the check says */ } });
  const visit = await until(() => P.page.evaluate(() => { const b = document.querySelector('[data-farm-visit]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }), (v) => !!v, 8000);
  if (!visit) return 'no Visit Your Farm';
  await P.page.touchscreen.tap(visit.x, visit.y);
  const on = await until(() => H.readState(P, (S) => ({ zone: S.currentZone, hold: !!S._farmArtHold })), (v) => v.zone === 'farm_home' && !v.hold, 30000);
  if (!on || on.zone !== 'farm_home') return 'never reached the farm';
  await P.page.waitForTimeout(1500);
  const B = FARM_BEDS[0];
  await H.hopTo(P, B.x + B.w / 2, B.y - 16 - FOOT_DY, { step: 80, gap: 220, tries: 60 });
  for (let k = 0; k < 2; k++) { await P.page.keyboard.press('e'); await P.page.waitForTimeout(2600); }
  await H.hopTo(P, FARM_GATE.x, 1376 - FOOT_DY, { step: 80, gap: 220, tries: 80 });
  const out = await until(() => H.readState(P, (S) => ({ zone: S.currentZone, l: !!S._zoneLoading })), (v) => v.zone === 'wheel' && !v.l, 40000);
  return out && out.zone === 'wheel' ? 'ok' : 'never came back';
}

/* three lands' inner ends and home, as mp-longplay's walk */
async function landsTrip(P, k, home) {
  const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
  const lands = Object.keys(WHEEL_SPAWNS);
  for (const land of [lands[k % lands.length], lands[(k + 3) % lands.length]]) {
    const a = WHEEL_SPAWNS[land].points[0];
    await H.hopTo(P, a[0] + 200, a[1] + 200, { tries: 400 });
    await P.page.waitForTimeout(2500);
  }
  await H.hopTo(P, home.x, home.y, { tries: 400 });
  await P.page.waitForTimeout(3000);
  return 'ok';
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Lister', wsPort, webPort, viewport: PHONE, touch: true, dpr: 1, world: 'wheel', init: CENSUS });
  let stop = false;
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, l: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.l, { timeout: 90000, label: 'into the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!ok, ok);
    if (!ok) return;
    const myId = await H.readState(P, (S) => S.myId);
    /* past the Mayor's gate, kept open: the worker's first whole player_state
       replaces the page's quest list whenever it lands, and on a slow machine
       that is after this line (mp-membudget, v2.3.3644) */
    await P.page.evaluate(() => {
      const keep = () => {
        const S = window._gameState && window._gameState.current, R = S && S.rpg;
        if (!R) return;
        if (!R._quests || typeof R._quests !== 'object') R._quests = {};
        if (!R._quests.tut_1) R._quests.tut_1 = true;
      };
      keep();
      window.__qaGateOpen = setInterval(keep, 100);
    });
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 60 }).catch(() => null);
    await H.grant(wsPort, myId, 'gold', { amount: 5000 }).catch(() => null);
    (async () => { while (!stop) { await P.page.keyboard.press('Control').catch(() => {}); for (let i = 0; i < 40 && !stop; i++) await P.page.waitForTimeout(500).catch(() => {}); } })();
    await P.page.waitForTimeout(6000);
    const home = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    const counts = [];
    const read = async (label) => { await gc(P); const c = await P.page.evaluate(() => window.__lsCensus()); counts.push({ label, c }); return c; };
    await read('arrival');
    for (let k = 1; k <= TRIPS; k++) {
      const r = TRIP === 'farm' ? await farmTrip(P) : await landsTrip(P, k, home);
      await P.page.waitForTimeout(3000);
      const c = await read('trip ' + k);
      const total = Object.values(c).reduce((a, b) => a + b, 0);
      console.log(`    trip ${k} (${TRIP}): ${r}, ${total} listeners held`);
    }
    /* the sites that grew on every trip after the first */
    const first = counts[1] ? counts[1].c : counts[0].c, last = counts[counts.length - 1].c;
    const keys = new Set([...Object.keys(first), ...Object.keys(last)]);
    const grew = [...keys].map((k) => [k, first[k] || 0, last[k] || 0]).filter((x) => x[2] > x[1]).sort((a, b) => (b[2] - b[1]) - (a[2] - a[1]));
    const md = ['# Listeners held, trip by trip', '', `${TRIPS} ${TRIP} trips. Totals: ` + counts.map((x) => `${x.label} ${Object.values(x.c).reduce((a, b) => a + b, 0)}`).join(', '), '',
      `Grew from trip 1 to trip ${TRIPS}:`, ''];
    for (const [k, a, b] of grew.slice(0, 40)) md.push(`- +${b - a} (${a} -> ${b}): ${k}`);
    writeFileSync(join(OUT, 'listeners.md'), md.join('\n') + '\n');
    writeFileSync(join(OUT, 'listeners.json'), JSON.stringify({ counts, grew }, null, 1));
    console.log(md.slice(0, 30).join('\n'));
    rec.ok(`${TRIPS} trips made and counted (guard)`, counts.length === TRIPS + 1);
  } finally {
    stop = true;
    await P.ctx.close().catch(() => {});
  }
}
