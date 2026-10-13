/* ═══ v2.3.3196: A FAR PLAYER LESS OFTEN, A NEAR ONE ON EVERY MOVE ═══
 *
 * Owner, 2026-10-13: "Send far away players less often and using shorter
 * position numbers make sense go ahead with it" (server/src/tick.js
 * FAR_PLAYERS: past NEAR_R, 2,400 px, a player's moves reach you at most every
 * EVERY_MS, 250 ms, each time where they are now; positions in whole pixels).
 *
 * Two real players against a real worker, in the Wheel; the watcher stands in
 * BroTown and the walker
 *   1. walks beside the watcher: the watcher's copy of them is updated on
 *      nearly every move the walker sends;
 *   2. is carried out past NEAR_R and walks there: the watcher's copy is
 *      updated about four times a second, never drops out of the watcher's
 *      players, and ends where the walker stopped;
 *   3. comes back and walks beside the watcher again: every move again;
 *   4. positions reach the watcher in whole pixels;
 *   5. no page errors on either side.
 *
 *   node tools/qa/mp/run.mjs farpeer
 */
import * as H from './harness.mjs';

const VIEW = { width: 900, height: 700 };
const NEAR_R = 2400;   /* server/src/tick.js FAR_PLAYERS.NEAR_R */

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Walker', wsPort, webPort, world: 'wheel', viewport: VIEW });
  const B = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, world: 'wheel', viewport: VIEW, guest: true });
  await H.enterWorld(A);
  await H.enterWorld(B);
  const inWheel = async (P) => {
    for (let i = 0; i < 120; i++) {
      const z = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
      if (z === 'wheel') return true;
      await P.page.waitForTimeout(500);
    }
    return false;
  };
  const okA = await inWheel(A), okB = await inWheel(B);
  await A.page.waitForTimeout(2500);
  const idA = await H.readState(A, (S) => S.myId);
  const idB = await H.readState(B, (S) => S.myId);
  /* past the Mayor's gate, and nothing out there may end the walk */
  await H.devOp(wsPort, 'quests', idA);
  await H.devOp(wsPort, 'quests', idB);
  await H.devOp(wsPort, 'vitals', idA, { heal: true, god: true });
  let stopAlive = false;
  for (const P of [A, B]) {
    (async () => {
      while (!stopAlive) {
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
  }

  /* open ground with a clear east-west line, `r` px from (cx, cy) */
  const openSpot = (P, cx, cy, rMin, rMax, angles) => P.page.evaluate(({ cx, cy, rMin, rMax, angles }) => {
    const W = window.__btWheelObjects;
    for (let r = rMin; r <= rMax; r += 50) {
      for (const a of angles) {
        const x = cx + Math.cos(a * Math.PI / 180) * r, y = cy + Math.sin(a * Math.PI / 180) * r;
        let clear = true;
        for (let dx = -40; dx <= 560 && clear; dx += 40) {
          if (window.__btIsSolid && (window.__btIsSolid(x + dx, y) || window.__btIsSolid(x + dx, y + 60))) clear = false;
          if (clear && W && W.near && W.near(x + dx, y, 40).length) clear = false;
        }
        if (clear) return { x, y };
      }
    }
    return null;
  }, { cx, cy, rMin, rMax, angles });

  const home = await openSpot(A, 21504, 21504, 300, 1600, Array.from({ length: 36 }, (_, i) => i * 10));
  await H.hopTo(B, home.x + 160, home.y + 90, { step: 100, gap: 260, tries: 60 });
  await H.hopTo(A, home.x, home.y, { step: 100, gap: 260, tries: 60 });
  await A.page.waitForTimeout(1200);
  const seen = await B.page.evaluate((id) => !!(window._gameState.current.others || {})[id], idA);
  rec.ok('setup: both in the Wheel, the watcher in BroTown seeing the walker', okA && okB && !!home && seen, { okA, okB, home, seen });

  /* the watcher counts how often its copy of the walker is updated (each
     tick carrying them stamps _lastUpdate) */
  await B.page.evaluate((id) => {
    window.__farS = { id, n: 0, last: 0, present: 0, missing: 0 };
    setInterval(() => {
      const f = window.__farS;
      const o = (window._gameState.current.others || {})[f.id];
      if (!o) { f.missing++; return; }
      f.present++;
      if (o._lastUpdate && o._lastUpdate !== f.last) { f.last = o._lastUpdate; f.n++; }
    }, 4);
  }, idA);
  const rateWhileWalking = async (key, ms) => {
    await B.page.evaluate(() => { window.__farS.n = 0; window.__farS.present = 0; window.__farS.missing = 0; });
    await A.page.keyboard.down(key);
    await A.page.waitForTimeout(ms);
    await A.page.keyboard.up(key);
    const s = await B.page.evaluate(() => ({ n: window.__farS.n, present: window.__farS.present, missing: window.__farS.missing }));
    s.perSec = Math.round(s.n / (ms / 1000) * 10) / 10;
    return s;
  };
  const sent = async (ms) => {
    /* how often the walker itself sends: the worker's ceiling for the watcher */
    return A.page.evaluate((ms) => new Promise((res) => {
      const S = window._gameState.current;
      let n = 0, last = S.lastBroadcast;
      const t = setInterval(() => { if (S.lastBroadcast !== last) { last = S.lastBroadcast; n++; } }, 4);
      setTimeout(() => { clearInterval(t); res(Math.round(n / (ms / 1000) * 10) / 10); }, ms);
    }), ms);
  };
  const where = async () => {
    const a = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y }));
    const b = await B.page.evaluate((id) => {
      const S = window._gameState.current, o = (S.others || {})[id];
      return { x: S.player.x, y: S.player.y, peer: o ? { x: o.x, y: o.y, z: o.zone || o.z } : null };
    }, idA);
    return { a, b, dist: Math.hypot(a.x - b.x, a.y - b.y) };
  };

  /* ── 1. near ── */
  const sendNear = sent(2000);
  const near = await rateWhileWalking('d', 2000);
  const nearSends = await sendNear;
  await A.page.waitForTimeout(400);
  const w1 = await where();
  rec.ok(`near (${Math.round(w1.dist)} px): the watcher's copy updated ${near.perSec} times a second while the walker sent ${nearSends}`,
    near.perSec >= 15 && w1.dist < NEAR_R, { near, nearSends, w1 });
  rec.ok(`positions arrive in whole pixels (${w1.b.peer && w1.b.peer.x}, ${w1.b.peer && w1.b.peer.y})`,
    !!w1.b.peer && Number.isInteger(w1.b.peer.x) && Number.isInteger(w1.b.peer.y), w1.b.peer);

  /* ── 2. far ── */
  const out = await openSpot(A, w1.b.x, w1.b.y, 2650, 2900, [-90, -100, -80, -110, -70, 90, 100, 80, 110, 70]);
  const reached = out ? await H.hopTo(A, out.x, out.y, { step: 100, gap: 220, tries: 80 }) : false;
  await A.page.waitForTimeout(1500);
  const sendFar = sent(2500);
  const far = await rateWhileWalking('d', 2500);
  const farSends = await sendFar;
  await A.page.waitForTimeout(900);   /* the next far send, and its trip */
  const w2 = await where();
  const gap = w2.b.peer ? Math.hypot(w2.b.peer.x - w2.a.x, w2.b.peer.y - w2.a.y) : Infinity;
  rec.ok(`far (${Math.round(w2.dist)} px): the watcher's copy updated ${far.perSec} times a second while the walker sent ${farSends}`,
    reached && w2.dist > NEAR_R && far.perSec >= 2 && far.perSec <= 6 && farSends >= 15, { out, reached, far, farSends, w2 });
  rec.ok(`far: the walker never dropped out of the watcher's players (${far.missing} of ${far.present + far.missing} samples missing)`,
    far.missing === 0 && far.present > 0, far);
  rec.ok(`far: once they stop, the watcher's copy is where they stopped (${gap.toFixed(1)} px off)`, gap <= 2, { gap, w2 });

  /* ── 3. near again ── */
  const back = await openSpot(A, w2.b.x, w2.b.y, 300, 900, Array.from({ length: 36 }, (_, i) => i * 10));
  await H.hopTo(A, back.x, back.y, { step: 100, gap: 220, tries: 80 });
  await A.page.waitForTimeout(1200);
  const near2 = await rateWhileWalking('d', 2000);
  const w3 = await where();
  rec.ok(`back near (${Math.round(w3.dist)} px): updated ${near2.perSec} times a second again`, near2.perSec >= 15 && w3.dist < NEAR_R, { near2, w3 });

  stopAlive = true;
  const errs = [...A.logs, ...B.logs].filter((l) => /pageerror/.test(l));
  rec.ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  void idB;
  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
