/* NEVER "TOWN" ON THE WAY BACK FROM A DEATH (v2.3.3840)
 *
 * A phone judge pass on 2026-10-29 found the top bar reading "Town" -- the
 * RETIRED map's name (TRAPS §244) -- for 5-8 s at every death: the respawn
 * puts you in today's `town` for a moment and takes you to the Wheel's
 * BroTown under one see-through veil (wheelHome.js), and the bar printed the
 * zone you were in (zoneTitle.js).
 *
 * A real death, at the Flame Fields' level 1s, on an upright phone and on a
 * computer (the sideways layout); the page records the bar's words and the
 * zone every 50 ms from the death until it is back in BroTown, and:
 *   - the trip through `town` was seen (else the check proves nothing);
 *   - the bar never read "Town" on the way;
 *   - it reads "BroTown" once home.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const WIDE = { width: 1280, height: 800 };

async function inWheel(P, timeout = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const z = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone)).catch(() => null);
    if (z === 'wheel') return true;
    await P.page.waitForTimeout(500);
  }
  return false;
}

/* the nearest living first-stretch Flame Fields monster this page holds
   (mp-deathpile's) */
const nearestGoblin = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const m = (S.monsters || []).filter((x) => x && x.home === 'ember' && x.alive !== false && x.hp > 0 && !/-t\d+-\d+$/.test(x.id))
    .sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y))[0];
  return m ? { x: Math.round(m.x), y: Math.round(m.y) } : null;
}).catch(() => null);

/* the bar's words and the zone, every 50 ms, from now */
const startTape = (P) => P.page.evaluate(() => {
  window.__rtTape = [];
  window.__rtTimer = setInterval(() => {
    const S = window._gameState && window._gameState.current;
    const el = document.querySelector('[data-zone-title]');
    window.__rtTape.push({ z: S ? S.currentZone : null, t: el ? el.textContent : null, dying: !!(S && S._dying) });
    if (window.__rtTape.length > 4000) window.__rtTape.shift();
  }, 50);
});
const stopTape = (P) => P.page.evaluate(() => { clearInterval(window.__rtTimer); return window.__rtTape || []; });

async function pass(view, { browser, wsPort, webPort, rec }) {
  const phone = view === 'phone';
  const A = await H.newPlayer(browser, phone
    ? { name: 'Rtphone', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true }
    : { name: 'Rtdesk', wsPort, webPort, world: 'wheel', viewport: WIDE, wide: true });
  const errs = [];
  A.page.on('pageerror', (e) => errs.push(String((e && e.message) || e).slice(0, 200)));
  await H.enterWorld(A);
  const stop = H.keepAlive(A);
  const tag = (s) => `${view}: ${s}`;
  try {
    const ok = await inWheel(A);
    rec.ok(tag('setup: in the Wheel'), ok);
    if (!ok) return;
    const id = await H.readState(A, (S) => S.myId);
    await H.devOp(wsPort, 'quests', id).catch(() => {});   /* past the Mayor's gate */
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const geom = await H.wheelGeom();
    const inner = WHEEL_SPAWNS.ember.points.slice(0, 6 * geom.long).reduce((a, p) => (!a || p[2] < a[2] ? p : a), null);
    const spot = { x: Math.round(inner[0]), y: Math.round(inner[1] + 20) };

    /* out in god mode, then 1 HP among the level 1s until the worker's
       player_died lands */
    await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 4 });
    await H.hopTo(A, spot.x, spot.y, { step: 100 });
    await A.page.waitForTimeout(1200);
    await startTape(A);
    await H.devOp(wsPort, 'vitals', id, { heal: false, hp: 1, god: false });
    let died = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 90000 && !died) {
      died = await H.readState(A, (S) => !!S._dying).catch(() => false);
      if (died) break;
      const g = await nearestGoblin(A);
      if (g) await H.hopTo(A, g.x, g.y + 8, { step: 60, tries: 6 });
      else await A.page.waitForTimeout(500);
    }
    rec.ok(tag('a monster the worker runs takes the last HP (player_died)'), died);
    if (!died) { await stopTape(A); return; }

    /* back in BroTown, alive, the veil gone, and a beat more for the bar */
    const t1 = Date.now();
    let home = false;
    while (Date.now() - t1 < 60000 && !home) {
      home = await H.readState(A, (S) => S.currentZone === 'wheel' && !S._dying && !S._zoneLoading && !S._wheelTripVeil).catch(() => false);
      if (!home) await A.page.waitForTimeout(250);
    }
    await A.page.waitForTimeout(1500);
    const tape = await stopTape(A);
    const after = tape.slice(tape.findIndex((r) => r.dying));
    const viaTown = after.filter((r) => r.z === 'town');
    const words = [...new Set(after.map((r) => r.t))];
    rec.ok(tag('the respawn went by the retired town (so the check below means something)'), viaTown.length > 0,
      { samples: after.length, inTown: viaTown.length });
    rec.ok(tag('the top bar never read "Town" on the way back'), !after.some((r) => r.t && /^\s*Town\b/.test(r.t)),
      { words, inTownWords: [...new Set(viaTown.map((r) => r.t))] });
    const last = after.length ? after[after.length - 1] : null;
    rec.ok(tag('home in BroTown, and the bar says so'), home && !!last && last.z === 'wheel' && /BroTown/.test(last.t || ''), { home, last });
    rec.ok(tag('no page errors'), errs.length === 0, errs.slice(0, 4));
  } finally {
    stop();
    await A.ctx.close().catch(() => {});
  }
}

export async function run(ctx) {
  await pass('phone', ctx);
  await pass('desk', ctx);
}
