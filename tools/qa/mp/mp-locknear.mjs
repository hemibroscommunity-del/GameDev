/* ═══ v2.3.6820: THE LOCK TAKES THE NEAREST, PLAYED ON A PHONE (card LOCK) ═══
 *
 * The owner, 2026-11-26: "it will lock on the wrong target.  I think it
 * should go towards the nearest enemy or at least let you switch to nearest
 * enemy."  game/lockPick.js, through targeting.js updateTargeting, on an
 * upright phone in the Wheel's BroTown with a sword in hand (mode 4, the
 * usual controls), stand-in monsters placed in S.monsters round you as
 * mp-lockfar places them (nothing else moves them):
 *   1. two stand-ins, A 110 px off and B 150: the nearer, A, has the lock;
 *   2. B moved to 100 px (both inside reach, B 9% nearer): the lock moves to B
 *      no sooner than the dwell and within the dwell plus two frames, timed
 *      by the renderer's own frames (S._frameCount, S._frameMs: TRAPS 200),
 *      the lock read at every frame;
 *   3. two near-ties, A 110 px east and B 125 px north: the stick pushed
 *      north (S.stickY -1, the field stickZones.js stickAnalog writes and the
 *      pick reads) gives B the lock within two frames, no dwell;
 *   4. `?locknear=0` (the address changed in place: switches.js reads it at
 *      each ask): step 2 again, and the lock stays on A (today's rule: B is
 *      not 12% nearer);
 *   5. no page errors.
 * Every edge of the rule is tools/guards/lock-pick.test.mjs.
 */
import * as H from './harness.mjs';
import { LOCK_PICK } from '../../../src/game/lockPick.js';
export const lane = 'full';

const PHONE = { width: 390, height: 844 };

const place = (P, list) => P.page.evaluate((list) => {
  const S = window._gameState.current;
  S.monsters = (S.monsters || []).filter((m) => !String(m.id).startsWith('qa-'));
  for (const q of list) {
    S.monsters.push({ id: q.id, alive: true, curHp: 50, maxHp: 50, hp: 50, x: S.player.x + q.dx, y: S.player.y + q.dy,
      renderX: S.player.x + q.dx, renderY: S.player.y + q.dy, type: 'slime', arch: 'slime', level: 1, zone: S.currentZone });
  }
  S.lockedTarget = null;
}, list);
const lockOf = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, lt = S.lockedTarget;
  return { id: lt ? String(lt.id) : null, rule: S._lockPickRule || null, cands: (S._targetCands || []).map((c) => String(c.m && c.m.id)) };
});
/* move one stand-in and start the frame log in ONE evaluate (the move's moment
   and frame are the log's zero) */
const moveAndWatch = (P, id, dx, dy) => P.page.evaluate(({ id, dx, dy }) => {
  const S = window._gameState.current;
  const m = S.monsters.find((q) => String(q.id) === id);
  m.x = S.player.x + dx; m.y = S.player.y + dy; m.renderX = m.x; m.renderY = m.y;
  const log = window.__qaLockLog = { t0: Date.now(), f0: S._frameCount || 0, rows: [] };
  const step = () => {
    const lt = S.lockedTarget;
    log.rows.push({ t: Date.now() - log.t0, f: (S._frameCount || 0) - log.f0, ms: S._frameMs || 16.667, id: lt ? String(lt.id) : null });
    if (log.rows.length < 400) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  return true;
}, { id, dx, dy });
const watched = (P) => P.page.evaluate(() => window.__qaLockLog);
const firstOn = (log, id) => log.rows.find((r) => r.id === id) || null;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Nearest', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'kit', myId, { what: 'weapons' });
    await P.page.waitForTimeout(1200);
    const eq = await H.equipWeapon(P, 'greatsword', 'weapon', 'melee');
    await P.page.waitForTimeout(800);
    rec.ok('a sword in hand, the usual controls (guard)', !!eq.ok && await H.readState(P, (S) => S.rpg && S.rpg.activeSlot === 'melee'), eq);

    /* ── 1. the nearer has the lock ── */
    await place(P, [{ id: 'qa-a', dx: 110, dy: 0 }, { id: 'qa-b', dx: 0, dy: 150 }]);
    await P.page.waitForTimeout(800);
    const l1 = await lockOf(P);
    rec.ok(`1. of two stand-ins (110 and 150 px), the nearer has the lock (${l1.id}, ${l1.rule})`, l1.id === 'qa-a' && l1.cands[0] === 'qa-a', l1);

    /* ── 2. the other becomes nearer inside reach: the lock moves within the dwell plus two frames ── */
    await moveAndWatch(P, 'qa-b', 0, 100);
    await P.page.waitForTimeout(1500);
    const w2 = await watched(P);
    const on2 = firstOn(w2, 'qa-b');
    const fms2 = Math.max(...w2.rows.map((r) => r.ms));
    rec.ok(`2. B moved to 100 px (9% nearer): the lock moves to it after the dwell (${LOCK_PICK.DWELL_MS} ms) and within the dwell plus two frames (${on2 ? on2.t + ' ms, frame ' + on2.f : 'never'}; a frame ${Math.round(fms2)} ms)`,
      !!on2 && on2.t >= LOCK_PICK.DWELL_MS - 1 && on2.t <= LOCK_PICK.DWELL_MS + 2 * fms2 + 20 && w2.rows.filter((r) => r.t < LOCK_PICK.DWELL_MS - 1).every((r) => r.id === 'qa-a'),
      { on2, rows: w2.rows.slice(0, 14) });

    /* ── 3. two near-ties: the push chooses ── */
    await place(P, [{ id: 'qa-a', dx: 110, dy: 0 }, { id: 'qa-b', dx: 0, dy: -125 }]);
    await P.page.waitForTimeout(800);
    const l3a = await lockOf(P);
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      const log = window.__qaLockLog = { t0: Date.now(), f0: S._frameCount || 0, rows: [] };
      S.stickX = 0; S.stickY = -1;
      const step = () => {
        const lt = S.lockedTarget;
        log.rows.push({ t: Date.now() - log.t0, f: (S._frameCount || 0) - log.f0, ms: S._frameMs || 16.667, id: lt ? String(lt.id) : null, rule: S._lockPickRule });
        if (log.rows.length < 60 && !(lt && String(lt.id) === 'qa-b')) requestAnimationFrame(step);
        else { S.stickX = 0; S.stickY = 0; }
      };
      requestAnimationFrame(step);
    });
    await P.page.waitForTimeout(1200);
    await P.page.evaluate(() => { const S = window._gameState.current; S.stickX = 0; S.stickY = 0; });
    const w3 = await watched(P);
    const on3 = firstOn(w3, 'qa-b');
    rec.ok(`3. two near-ties (110 east, 125 north): the stick pushed north gives the farther the lock within two frames (${on3 ? 'frame ' + on3.f + ', ' + on3.t + ' ms, ' + on3.rule : 'never'})`,
      l3a.id === 'qa-a' && !!on3 && on3.f <= 2 && on3.rule === 'push', { l3a, rows: w3.rows.slice(0, 8) });

    /* ── 4. ?locknear=0: step 2's lock stays ── */
    await P.page.evaluate(() => { const u = new URL(location.href); u.searchParams.set('locknear', '0'); history.replaceState(history.state, '', u.toString()); });
    await place(P, [{ id: 'qa-a', dx: 110, dy: 0 }, { id: 'qa-b', dx: 0, dy: 150 }]);
    await P.page.waitForTimeout(800);
    const l4a = await lockOf(P);
    await moveAndWatch(P, 'qa-b', 0, 100);
    await P.page.waitForTimeout(1500);
    const w4 = await watched(P);
    const l4 = await lockOf(P);
    rec.ok(`4. ?locknear=0: B moved to 100 px (9% nearer) and the lock stays on A: today's 12% step (${l4.id}, ${l4.rule})`,
      l4a.id === 'qa-a' && l4.id === 'qa-a' && w4.rows.every((r) => r.id === 'qa-a'), { l4a, l4, rows: w4.rows.slice(-3) });
    await P.page.evaluate(() => { const u = new URL(location.href); u.searchParams.delete('locknear'); history.replaceState(history.state, '', u.toString()); });
    await P.page.evaluate(() => { const S = window._gameState.current; S.monsters = (S.monsters || []).filter((m) => !String(m.id).startsWith('qa-')); S.lockedTarget = null; });

    rec.ok('5. no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
