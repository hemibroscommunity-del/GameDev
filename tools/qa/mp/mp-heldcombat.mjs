/* ═══ v2.3.5018: THE HELD COMBAT IS THE GAME'S AGAIN ═══
 *
 * The owner, 2026-11-13: "I like combat better the old way. You just move the
 * right joystick towards the enemy and it attacks as long as it is held down.
 * A swipe on the right joystick activates the special attack."  The default
 * (nothing in the address, nothing remembered) is the held combat
 * (src/game/manualCombat.js mode 4): the old combat's every line, but no lock
 * a player chose (tapLockOn).  On a phone in the Wheel's BroTown:
 *   1. a new player plays the held combat: not manual, no tap lock;
 *   2. holding the right side attacks while held (the old held attack:
 *      S.autoAttack) and letting go stops it;
 *   3. a lock a tap would have made is dropped (targeting.js), the automatic
 *      one kept;
 *   4. `?manual=0`, the old combat, still has its tap lock (the choices
 *      and what each remembers: server/test/manual-combat.test 1);
 *   5. no page errors.
 * The held attack itself, the flick's special, the bow and the staff are the
 * old combat's lines, played by the ~120 scenarios that run `?manual=0`.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

/* a touch on the right half (the attack side), held for `ms`, then lifted;
   what the game says while it is down */
const holdRight = (P, ms) => P.page.evaluate(async (ms) => {
  const el = document.querySelector('[data-joyzone="R"]');
  if (!el) return { err: 'no right zone' };
  const b = el.getBoundingClientRect(), x = b.left + b.width * 0.5, y = b.top + b.height * 0.55;
  const mk = (t, cx, cy) => new TouchEvent(t, { bubbles: true, cancelable: true,
    touches: t === 'touchend' ? [] : [new Touch({ identifier: 71, target: el, clientX: cx, clientY: cy })],
    changedTouches: [new Touch({ identifier: 71, target: el, clientX: cx, clientY: cy })] });
  const S = window._gameState.current;
  el.dispatchEvent(mk('touchstart', x, y));
  await new Promise((r) => setTimeout(r, 120));
  el.dispatchEvent(mk('touchmove', x - 30, y - 10));   /* toward the west: the stick held over */
  await new Promise((r) => setTimeout(r, ms));
  const held = { autoAttack: !!S.autoAttack, pending: !!S._atkPending };
  el.dispatchEvent(mk('touchend', x - 30, y - 10));
  await new Promise((r) => setTimeout(r, 400));
  return { held, after: { autoAttack: !!S.autoAttack } };
}, ms);

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Heldbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', query: 'manual=default' });
  const B = await H.newPlayer(browser, { name: 'Oldbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', query: 'manual=0' });
  const errs = [];
  for (const P of [A, B]) P.page.on('pageerror', (e) => errs.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(A);
    await H.enterWorld(B);
    const inW = (Q) => H.waitFor(Q, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
    const okA = await inW(A), okB = await inW(B);
    rec.ok('both phones in the Wheel (guard)', !!okA && !!okB, { okA, okB });
    if (!okA || !okB) return;
    await A.page.waitForTimeout(2000);

    /* 1 */
    const m = await A.page.evaluate(() => ({ mode: window.__btManual.mode(), on: window.__btManual.on(), lock: window.__btManual.tapLock(), stored: localStorage.getItem('bt_manual') }));
    rec.ok(`1. a new player plays the held combat (mode ${m.mode}): not manual, no tap lock, nothing remembered`, m.mode === 4 && m.on === false && m.lock === false && m.stored === null, m);

    /* 2 */
    const me = await H.readState(A, (S) => S.myId);
    await H.devOp(wsPort, 'kit', me, { what: 'weapons' }).catch(() => null);
    await A.page.waitForTimeout(1500);
    const h = await holdRight(A, 900);
    rec.ok(`2. holding the right side attacks while held (${JSON.stringify(h.held)}), and letting go stops it (${JSON.stringify(h.after)})`,
      !h.err && h.held.autoAttack === true && h.after.autoAttack === false, h);

    /* 3 */
    const lk = await A.page.evaluate(async () => {
      const S = window._gameState.current;
      const fake = { id: 'qa-held-lock', x: S.player.x + 40, y: S.player.y, hp: 10, maxHp: 10, alive: true };
      S.lockedTarget = { type: 'monster', id: fake.id, ref: fake, src: 'tap' };
      await new Promise((r) => setTimeout(r, 1200));
      const t = S.lockedTarget;
      return { now: t ? { src: t.src || null, id: String(t.id) } : null };
    });
    rec.ok(`3. a lock a tap would have made is dropped (now ${JSON.stringify(lk.now)})`, !lk.now || (lk.now.src !== 'tap' && lk.now.id !== 'qa-held-lock'), lk);

    /* 4 */
    const o = await B.page.evaluate(() => ({ mode: window.__btManual.mode(), on: window.__btManual.on(), lock: window.__btManual.tapLock(), stored: localStorage.getItem('bt_manual') }));
    rec.ok(`4. \`?manual=0\` is the old combat with its tap lock (mode ${o.mode}, remembered '${o.stored}')`, o.mode === 0 && o.on === false && o.lock === true && o.stored === '0', o);
    rec.ok('5. no page errors', errs.length === 0, errs.slice(0, 4));
  } finally {
    await A.ctx.close().catch(() => {});
    await B.ctx.close().catch(() => {});
  }
}
