/* mp-freeswing (v2.3.4520): THE FREE-SWING TRIAL on a phone in the Wheel.
 *
 * The owner, 2026-11-10: "What if the attack speed was uncapped (you can
 * swipe as many times as you want to hit) but the DPS is prorated by the time
 * elapsed relative to the full swing cycle?"  The worker's half (each swing's
 * share, the extras, the floor) is server/test/free-swing.test.mjs; the
 * rules' half manual-combat.test §13.  This plays the page: an upright phone
 * with `?manual=3` in BroTown, a sword in hand --
 *   1. the trial is on for this device, and the worker said it can
 *      (caps.freeSwing): the join asked.  v2.3.4797: since v2.3.4655 (#1547)
 *      the trial is everyone's default, so `?manual=3` is what a player with
 *      nothing chosen plays, and it is NOT remembered: it forgets any other
 *      choice (src/game/manualCombat.js manualMode; it was remembered as '3');
 *   2. a stroke swings; a stroke back 160 ms later swings again (on the
 *      untried swipes it waits the sword's whole interval);
 *   3. a stroke sooner than FREE_GAP_MS (150 ms) swings nothing;
 *   4. no page errors.
 * The times that matter are held by the page's clock in one task (this box's
 * timers run late: TRAPS §200). */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Freebro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: 'manual=3' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stop = H.keepAlive(P);
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
    rec.ok('freeswing: in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    await P.page.waitForTimeout(2000);

    /* ── 1 ── */
    const on = await P.page.evaluate(() => ({
      free: !!(window.__btManual && window.__btManual.free()), stored: localStorage.getItem('bt_manual'),
      cap: (window._gameState.current._serverCaps || {}).freeSwing,
    }));
    /* v2.3.4797: nothing stored -- `?manual=3` comes back to the game's own
       combat (the trial, since v2.3.4655) and forgets, as a device that never
       chose plays it */
    rec.ok('1 `?manual=3` is the trial on this device, the game\'s own (nothing remembered: it forgets any other choice), and the worker can do it (caps.freeSwing)', on.free && on.stored === null && on.cap === 1, on);

    /* ── 2, 3 ── a sword, and real touches on the attack disc */
    const sw = await P.page.evaluate(() => {
      const S = window._gameState.current, R = S.rpg;
      if (!R.weapon) R.weapon = { type: 'greatsword', tierMult: 1, gearBase: 'copper', name: 'Copper Great Sword', tier: 'common' };
      R.activeSlot = 'melee'; S.lockedTarget = null; S.autoAttack = false;
      const touch = (el, type, x, y, id) => {
        const t = new Touch({ identifier: id, target: el, clientX: x, clientY: y });
        const end = type === 'touchend' || type === 'touchcancel';
        el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: end ? [] : [t], targetTouches: end ? [] : [t], changedTouches: [t] }));
      };
      const spin = (until) => { while (Date.now() < until) { /* the clock, not a timer */ } };
      const d = document.querySelector('.bt-rjoy-base');
      if (!d) return { noDisc: true };
      const r = d.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      spin(Date.now() + 1200);   /* the sword ready on any reading */
      const sw0 = S.swingTimer;
      touch(d, 'touchstart', x - 15, y, 61);
      touch(d, 'touchmove', x + 15, y, 61);
      const one = S.swingTimer;
      spin(one + 160);
      touch(d, 'touchmove', x - 15, y, 61);
      const two = S.swingTimer;
      touch(d, 'touchmove', x + 15, y, 61);
      const three = S.swingTimer;
      touch(d, 'touchend', x + 15, y, 61);
      return { sw0, one, two, three, gap: two - one, need: window.__btManual.state().meleeNeed };
    });
    rec.ok('2 a stroke swings, and a stroke back 160 ms later swings again (the untried sword waits its whole interval)',
      !sw.noDisc && sw.one > sw.sw0 && sw.two > sw.one && sw.gap >= 150 && sw.gap < sw.need, sw);
    rec.ok('3 a stroke sooner than 150 ms after the last swings nothing', !sw.noDisc && sw.three === sw.two, sw);
    rec.ok('4 no page errors', errors.length === 0, errors);
  } finally {
    stop();
    await P.ctx.close().catch(() => {});
  }
}
