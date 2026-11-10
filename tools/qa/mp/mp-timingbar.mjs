/* mp-timingbar (v2.3.4550): THE TIMING BAR on a phone in the Wheel.
 *
 * The owner, 2026-11-10: "a sword silhouette laying horizontally that refills
 * as a bar and once the bar reaches the top it glints.  During this glinting
 * must attack to get the bonus.  Same with the bow ... It would need to be
 * north of the right joystick.  For magic I think it should be skipped for
 * now."  And: "the bar freezing in place a moment so you could see where you
 * decided to swing."  The worker's half (the perfect strike) is
 * server/test/perfect-strike.test.mjs; the rules' half manual-combat.test §14.
 * This plays the page, an upright phone with `?manual=3` in BroTown --
 *   1. the trial and the worker's caps (freeSwing, perfectStrike); the bar
 *      mounts as the sword, north of the attack disc, not touchable;
 *   2. a real stroke on the disc: the bar shows and its fill runs over the
 *      sword's cycle from empty (held at half its time, it is half full);
 *   3. a stroke a cycle later is in the glint: the frozen copy is full and
 *      wears the glint's colour, the glint runs the worker's window (held
 *      mid-way it is across the bar), and the fill restarted at once;
 *   4. a stroke half a cycle later: the frozen copy is half the bar, no glint;
 *   5. a bow shows the arrow, a staff nothing;
 *   6. a second phone NOT on the trial (the game's own swipes): no bar, after
 *      a stroke too; a third on the trial with `?timingbar=0`: no bar;
 *   7. no page errors.
 * The times that matter are held by the page's clock in one task (this box's
 * timers run late: TRAPS §200); the bar's look is read with its animations
 * held at a chosen moment, never by waiting for a frame. */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

/* the page's own touches on the disc, and a spin on the clock */
const PAGE_TOOLS = `
  window.__tbTouch = (el, type, x, y, id) => {
    const t = new Touch({ identifier: id, target: el, clientX: x, clientY: y });
    const end = type === 'touchend' || type === 'touchcancel';
    el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: end ? [] : [t], targetTouches: end ? [] : [t], changedTouches: [t] }));
  };
  window.__tbSpin = (until) => { while (Date.now() < until) { /* the clock, not a timer */ } };
  /* one stroke across the disc: a swing (manualCombat mcSwipeMove) */
  window.__tbStroke = (dir) => {
    const d = document.querySelector('.bt-rjoy-base');
    if (!d) return null;
    const r = d.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    window.__tbTouch(d, 'touchstart', x - 15 * dir, y, 71);
    window.__tbTouch(d, 'touchmove', x + 15 * dir, y, 71);
    window.__tbTouch(d, 'touchend', x + 15 * dir, y, 71);
    return window._gameState.current.swingTimer;
  };
  /* the bar's animations held at a moment (ms into each one's own run, after its delay) */
  window.__tbHold = (fill, glint, frz) => {
    const out = [];
    for (const a of document.getAnimations()) {
      const el = a.effect && a.effect.target;
      if (!el || !el.closest || !el.closest('.bt-tbar')) continue;
      const n = a.animationName || '', tm = a.effect.getTiming();
      const t = /^btTb(Win|In)/.test(n) ? fill : /^btTbGl/.test(n) ? glint : /^btTbFz/.test(n) ? frz : null;
      if (t == null) continue;
      a.currentTime = (tm.delay || 0) + t; a.pause();
      out.push({ n, dur: tm.duration, delay: Math.round(tm.delay || 0) });
    }
    return out;
  };
  /* how much of the bar a window shows: its visible span, as a share of the bar */
  window.__tbSpan = (sel) => {
    const bar = document.querySelector('.bt-tbar'), w = bar && bar.querySelector(sel);
    if (!bar || !w) return null;
    const b = bar.getBoundingClientRect(), r = w.getBoundingClientRect();
    const lo = Math.max(b.left, r.left), hi = Math.min(b.right, r.right);
    return { from: Math.round(((lo - b.left) / b.width) * 100) / 100, to: Math.round(((hi - b.left) / b.width) * 100) / 100 };
  };
`;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Glintbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: 'manual=3' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stop = H.keepAlive(P);
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
    rec.ok('timingbar: in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    await P.page.waitForTimeout(2000);
    await P.page.evaluate(PAGE_TOOLS);

    /* ── 1 ── */
    await P.page.evaluate(() => {
      const S = window._gameState.current, R = S.rpg;
      if (!R.weapon) R.weapon = { type: 'greatsword', tierMult: 1, gearBase: 'copper', name: 'Copper Great Sword', tier: 'common' };
      R.activeSlot = 'melee'; S.lockedTarget = null; S.autoAttack = false;
    });
    const up = await H.waitFor(P, () => (window.__btTimingBar ? window.__btTimingBar() : {}), (v) => v.drawn && v.weapon === 'sword', { timeout: 15000, label: 'the bar' }).catch(() => null);
    const one = await P.page.evaluate(() => {
      const S = window._gameState.current, c = S._serverCaps || {};
      const bar = document.querySelector('.bt-tbar'), disc = document.querySelector('.bt-rjoy-base');
      const b = bar && bar.getBoundingClientRect(), d = disc && disc.getBoundingClientRect();
      return { free: window.__btManual.free(), freeSwing: c.freeSwing, perfectStrike: c.perfectStrike,
        tbar: bar && bar.getAttribute('data-tbar'), pe: bar && getComputedStyle(bar).pointerEvents,
        north: !!(b && d) && b.bottom <= d.top, over: !!(b && d) && b.left < d.right && b.right > d.left, box: b && [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)] };
    });
    rec.ok('1 on the trial against a worker that judges the perfect strike (caps.freeSwing, caps.perfectStrike), the bar mounts as the sword',
      !!up && one.free && one.freeSwing === 1 && one.perfectStrike === 1 && one.tbar === 'sword', { up, one });
    rec.ok('1 ...north of the attack disc, over its column, and not touchable', one.north && one.over && one.pe === 'none', one);

    /* ── 2 ── a real stroke: the bar shows and fills over the cycle */
    const two = await P.page.evaluate(() => {
      window.__tbSpin(Date.now() + 1500);
      const at = window.__tbStroke(1);
      return { at, need: window.__btManual.state().meleeNeed };
    });
    const seen2 = await H.waitFor(P, () => window.__btTimingBar(), (v) => v.last && v.on === '1', { timeout: 10000, label: 'the stroke seen' }).catch(() => null);
    const held2 = await P.page.evaluate((need) => {
      const h = window.__tbHold(need / 2, -1, 0);
      return { h, fill: window.__tbSpan('.bt-tbar-fill'), on: document.querySelector('.bt-tbar').getAttribute('data-on') };
    }, two.need);
    const fillAnim = (held2.h || []).find((x) => /^btTbWin/.test(x.n));
    rec.ok('2 a stroke shows the bar, and its fill runs over the sword\'s cycle',
      !!seen2 && seen2.last.at === two.at && held2.on === '1' && !!fillAnim && Math.abs(fillAnim.dur - two.need) < 1, { two, seen2, held2 });
    rec.ok('2 ...held at half its time it is half full, from the hilt', !!held2.fill && held2.fill.from === 0 && Math.abs(held2.fill.to - 0.5) <= 0.03, held2.fill);

    /* ── 3 ── a stroke a cycle later: in the glint */
    const three = await P.page.evaluate(() => {
      const S = window._gameState.current, need = window.__btManual.state().meleeNeed;
      const last = window.__btTimingBar().last;
      window.__tbSpin(last.at + need + 40);
      return { at: window.__tbStroke(-1), prev: last.at, need };
    });
    const seen3 = await H.waitFor(P, () => window.__btTimingBar(), (v) => v.last && v.last.at === three.at, { timeout: 10000, label: 'the second stroke seen' }).catch(() => null);
    const held3 = await P.page.evaluate(() => {
      const h = window.__tbHold(0, 180, 50);
      return { h, glint: window.__tbSpan('.bt-tbar-glint'), frz: window.__tbSpan('.bt-tbar-frz > .bt-tbar-win'), fill: window.__tbSpan('.bt-tbar-fill'),
        g: document.querySelector('.bt-tbar').getAttribute('data-g'),
        frzFill: getComputedStyle(document.querySelector('.bt-tbar-froze path')).fill, frzOp: Number(getComputedStyle(document.querySelector('.bt-tbar-frz')).opacity) };
    });
    const gl = (held3.h || []).find((x) => /^btTbGl[AB]$/.test(x.n));
    rec.ok('3 a stroke a cycle later is in the glint: the frozen copy is the whole bar, in the glint\'s colour, and showing',
      !!seen3 && seen3.last.glint === true && seen3.last.frozen === 1 && held3.g === '1' && /255, 244, 214|#fff4d6/i.test(held3.frzFill) && held3.frzOp > 0.5
      && !!held3.frz && held3.frz.from === 0 && held3.frz.to === 1, { seen3, held3 });
    rec.ok('3 ...the glint runs the worker\'s window (from 60 ms before full, 360 ms long) and, held mid-way, crosses the bar',
      !!gl && gl.dur === 360 && Math.abs(gl.delay - (three.need - 60)) <= 120 && !!held3.glint && held3.glint.to - held3.glint.from > 0.2 && held3.glint.from > 0.05 && held3.glint.to < 0.95, { gl, glint: held3.glint, need: three.need });
    rec.ok('3 ...and under the frozen copy the fill restarted from empty at once (nothing waits for the freeze)', !!held3.fill && held3.fill.to <= 0.02, held3.fill);

    /* ── 4 ── half a cycle later: half the bar, no glint */
    const four = await P.page.evaluate(() => {
      const need = window.__btManual.state().meleeNeed, last = window.__btTimingBar().last;
      window.__tbSpin(last.at + Math.round(need / 2));
      return { at: window.__tbStroke(1), need };
    });
    const seen4 = await H.waitFor(P, () => window.__btTimingBar(), (v) => v.last && v.last.at === four.at, { timeout: 10000, label: 'the third stroke seen' }).catch(() => null);
    const held4 = await P.page.evaluate(() => { window.__tbHold(0, -1, 50); return { frz: window.__tbSpan('.bt-tbar-frz > .bt-tbar-win'), g: document.querySelector('.bt-tbar').getAttribute('data-g') }; });
    rec.ok('4 a stroke half a cycle later: the frozen copy is half the bar, not glinting',
      !!seen4 && !seen4.last.glint && Math.abs(seen4.last.frozen - 0.5) < 0.12 && held4.g === '0' && !!held4.frz && Math.abs(held4.frz.to - seen4.last.frozen) <= 0.03, { seen4, held4 });

    /* ── 5 ── the bow shows the arrow; a staff nothing */
    await P.page.evaluate(() => {
      for (const a of document.getAnimations()) if (a.playState === 'paused') a.play();
      const R = window._gameState.current.rpg;
      if (!R.rangedWeapon) R.rangedWeapon = { type: 'bow', tierMult: 1, gearBase: 'pine', name: 'Pine Bow', tier: 'common' };
      R.activeSlot = 'ranged';
    });
    const bow = await H.waitFor(P, () => window.__btTimingBar(), (v) => v.drawn && v.weapon === 'bow', { timeout: 10000, label: 'the arrow' }).catch(() => null);
    const bowShape = await P.page.evaluate(() => { const b = document.querySelector('.bt-tbar'); return b && b.getAttribute('data-tbar'); });
    await P.page.evaluate(() => {
      const R = window._gameState.current.rpg;
      if (!R.staffWeapon) R.staffWeapon = { type: 'staff', tierMult: 1, gearBase: 'pine', name: 'Pine Staff', tier: 'common' };
      R.activeSlot = 'staff';
    });
    const staff = await H.waitFor(P, () => window.__btTimingBar(), (v) => v.weapon === null && !v.drawn, { timeout: 10000, label: 'no bar for a staff' }).catch(() => null);
    const staffDom = await P.page.evaluate(() => !!document.querySelector('.bt-tbar'));
    rec.ok('5 a bow shows the arrow silhouette', !!bow && bowShape === 'bow', { bow, bowShape });
    rec.ok('5 a staff shows nothing (the owner: "For magic I think it should be skipped")', !!staff && !staffDom, { staff, staffDom });
    await P.page.evaluate(() => { window._gameState.current.rpg.activeSlot = 'melee'; });
  } finally {
    stop();
    await P.ctx.close().catch(() => {});
  }

  /* ── 6 ── a phone not on the trial, and one on it with `?timingbar=0` */
  for (const [label, query] of [['the game\'s own swipes (`?manual=1`)', 'manual=1'], ['the trial with `?timingbar=0`', 'manual=3&timingbar=0']]) {
    const Q = await H.newPlayer(browser, { name: 'Plainbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query });
    Q.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
    const stopQ = H.keepAlive(Q);
    try {
      await H.enterWorld(Q);
      const inQ = await H.waitFor(Q, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
      if (!inQ) { rec.ok('6 ' + label + ': in the Wheel (guard)', false); continue; }
      await Q.page.waitForTimeout(2000);
      await Q.page.evaluate(PAGE_TOOLS);
      const r = await Q.page.evaluate(() => {
        const S = window._gameState.current, R = S.rpg;
        if (!R.weapon) R.weapon = { type: 'greatsword', tierMult: 1, gearBase: 'copper', name: 'Copper Great Sword', tier: 'common' };
        R.activeSlot = 'melee';
        window.__tbSpin(Date.now() + 1500);
        const at0 = S.swingTimer, at = window.__tbStroke(1);
        return { swung: at > at0 };
      });
      await Q.page.waitForTimeout(1500);
      const after = await Q.page.evaluate(() => ({ probe: window.__btTimingBar ? window.__btTimingBar() : null, dom: !!document.querySelector('.bt-tbar') }));
      rec.ok('6 ' + label + ': no bar, after a stroke too', r.swung && !after.dom && !!after.probe && after.probe.weapon === null, { r, after });
    } finally {
      stopQ();
      await Q.ctx.close().catch(() => {});
    }
  }
  rec.ok('7 no page errors', errors.length === 0, errors);
}
