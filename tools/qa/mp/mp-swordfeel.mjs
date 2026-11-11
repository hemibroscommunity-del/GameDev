/* mp-swordfeel (v2.3.4800): THE SWORD'S FEEL on a phone in the Wheel.
 *
 * The owner, 2026-11-11: "Think about the sword swing" -- and "Yes remove the
 * timing bar.  It needs to be something else entirely".  The rules are
 * server/test/weapon-feel.test.mjs; this plays the page, an upright phone
 * with nothing chosen (the game's own combat, the free swing), in BroTown --
 *   1. the feel is on (the worker's caps.freeSwing and caps.perfectStrike, a
 *      sword in hand), its own world layer is there, and THE TIMING BAR IS
 *      GONE (no element, no probe, no picture warmed);
 *   2. THE GLINT FOLLOWS THE CYCLE: the loop's own frame read at chosen
 *      moments of the sword's cycle -- filling (dull) at a third, the glint
 *      at the full cycle (its ring counted once, the streak at the grip),
 *      at rest and bright after the window;
 *   3. the blade is drawn dull right after a real stroke and bright again
 *      (its tint, read off the sprite), and the glint is drawn on it;
 *   4. A SWIPE'S ARC FOLLOWS ITS DIRECTION: a real stroke left-to-right and
 *      one right-to-left on the disc, each seen by the loop: opposite turns,
 *      a forehand and a backhand, and the swing's figure drawn sweeping the
 *      cut's way; a short stroke a flick, a long drag a sweep (wider);
 *   5. the contact's weight: a quick cut light (no push), a full one full,
 *      with the camera's push in the swing's direction and the sparks;
 *   6. THE BUDGET: the feel's own work a frame, held to a small part of
 *      held-budget.mjs's frame line (the whole game's sweep is mp-heldsweep);
 *   7. a second phone with `?swordfeel=0`: the look before (off, no arc);
 *   8. no page errors.
 * The times that matter are held by the page's clock in one task (this box
 * draws a few frames a second: TRAPS §200). */
import * as H from './harness.mjs';
import { FRAME_JS_MAX_MS, HOLD_MAX_MS } from './held-budget.mjs';

const PHONE = { width: 390, height: 844 };
/* the feel's own share of a frame: a quarter of the game's line at worst
   (the first sound made, a page's first compile), a fiftieth on average */
const FEEL_MAX_MS = FRAME_JS_MAX_MS / 4;
const FEEL_MEAN_MS = FRAME_JS_MAX_MS / 50;

const PAGE_TOOLS = `
  window.__sfTouch = (el, type, x, y, id) => {
    const t = new Touch({ identifier: id, target: el, clientX: x, clientY: y });
    const end = type === 'touchend' || type === 'touchcancel';
    el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: end ? [] : [t], targetTouches: end ? [] : [t], changedTouches: [t] }));
  };
  window.__sfSpin = (until) => { while (Date.now() < until) { /* the clock, not a timer */ } };
  window.__sfDisc = () => { const d = document.querySelector('.bt-rjoy-base'); if (!d) return null; const r = d.getBoundingClientRect(); return { d, x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  /* one stroke across the disc (dir +1 left-to-right, -1 right-to-left), lifted */
  window.__sfStroke = (dir) => {
    const o = window.__sfDisc(); if (!o) return null;
    window.__sfTouch(o.d, 'touchstart', o.x - 15 * dir, o.y, 81);
    window.__sfTouch(o.d, 'touchmove', o.x + 15 * dir, o.y, 81);
    window.__sfTouch(o.d, 'touchend', o.x + 15 * dir, o.y, 81);
    return window._gameState.current.swingTimer;
  };
`;

const arm = () => {
  const S = window._gameState.current, R = S.rpg;
  if (!R.weapon) R.weapon = { type: 'greatsword', tierMult: 1, gearBase: 'copper', name: 'Copper Great Sword', tier: 'common' };
  R.activeSlot = 'melee'; S.lockedTarget = null; S.autoAttack = false;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Gleambro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: 'manual=default' });   /* the game's own combat: nothing chosen */
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stop = H.keepAlive(P);
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
    rec.ok('swordfeel: in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    await P.page.waitForTimeout(2000);
    await P.page.evaluate(PAGE_TOOLS);
    await P.page.evaluate(arm);

    /* ── 1 ── */
    const on = await H.waitFor(P, () => (window.__btWeaponFeel ? window.__btWeaponFeel() : {}), (v) => v.on && v.view, { timeout: 15000, label: 'the feel' }).catch(() => null);
    const one = await P.page.evaluate(() => {
      const S = window._gameState.current, c = S._serverCaps || {};
      return { free: window.__btManual.free(), freeSwing: c.freeSwing, perfectStrike: c.perfectStrike, fx: window.__btWeaponFeelFx ? window.__btWeaponFeelFx() : null,
        layers: window.__btLayerOrder || null,
        barDom: !!document.querySelector('.bt-tbar'), /* the bar's two probes, by name: none of the page's handles starts with it now */
        barProbes: Object.keys(window).filter((k) => /^__btTimingBar/.test(k)),
        barImg: performance.getEntriesByType('resource').some((r) => /\/sprites\/timingbar\//.test(r.name)) };
    });
    rec.ok('1 the game\'s own combat against a worker that judges the perfect strike: the sword\'s feel is on, its own world layer under the damage numbers',
      !!on && one.free && one.freeSwing === 1 && one.perfectStrike === 1 && !!one.fx && one.fx.layer === 'weaponFeel'
      && Array.isArray(one.layers) && one.layers.indexOf('weaponFeel') > one.layers.indexOf('glows') && one.layers.indexOf('weaponFeel') < one.layers.indexOf('damageNumbers'), { on, one });
    rec.ok('1 THE TIMING BAR IS GONE: no element, no probe, its picture never fetched', !one.barDom && one.barProbes.length === 0 && !one.barImg, one);

    /* ── 2 ── the glint follows the cycle: the loop's own frame at chosen moments, in one task */
    const two = await P.page.evaluate(() => {
      const S = window._gameState.current, F = window.__btWeaponFeel;
      const need = window.__btManual.state().meleeNeed;
      const at = (ms) => { S.swingTimer = Date.now() - ms; F.tick(); const v = F(); return { phase: v.view.phase, r: +v.view.r.toFixed(2), dim: +v.view.dim.toFixed(2), glintT: +v.view.glintT.toFixed(2), glints: v.glints }; };
      S.swingTimer = Date.now() - 5000; F.tick();
      const rest0 = at(5000), third = at(Math.round(need / 3)), glint = at(need - 50), glint2 = at(need + 250), after = at(need + 700);
      return { need, rest0, third, glint, glint2, after };
    });
    rec.ok('2 the blade refills over the sword\'s own cycle: filling and dull at a third, the glint at the full cycle (the streak at the grip), at rest and bright after the window',
      two.third.phase === 'fill' && Math.abs(two.third.r - 0.33) < 0.05 && two.third.dim < 0.8 && two.glint.phase === 'glint' && two.glint.glintT < 0.1
      && two.glint2.phase === 'glint' && two.glint2.glintT === 1 && two.after.phase === 'rest' && two.after.r === 1 && two.after.dim === 1, two);
    rec.ok('2 ...its ring counted once a window (not every frame of it)', two.glint.glints === two.rest0.glints + 1 && two.glint2.glints === two.glint.glints, two);

    /* ── 3 ── the blade DRAWN dull, bright, and glinting: the swing clock held at a moment of the cycle for a few
       of the page's own frames (requestAnimationFrame: the game's frame runs first, so each sample is what that
       frame drew), then read off the blade's sprite and the feel's layer */
    const three = await P.page.evaluate(async () => {
      const need = window.__btManual.state().meleeNeed;
      /* `ms` how long ago the swing was as the NEXT frame draws: the gap between this box's frames (hundreds of
         ms) is taken off, measured frame to frame */
      const hold = (ms, frames) => new Promise((res) => {
        const out = [];
        const S = window._gameState.current;
        let last = Date.now(), dt = 250;
        const set = () => { S.isSwinging = false; S.swingTimer = Date.now() - ms + dt; };
        set();
        let n = 0;
        const f = () => { const t = Date.now(); dt = Math.min(600, t - last); last = t; out.push(window.__btWeaponTint().local); set(); if (++n >= frames) res(out); else requestAnimationFrame(f); };
        requestAnimationFrame(f);
      });
      const red = (t) => (typeof t === 'number' ? (t >> 16) & 255 : null);
      const bright = (await hold(5000, 4)).map(red);
      const g0 = window.__btWeaponFeelFx().stats.glintDrawn;
      /* just swung, held there: the stamp a little AHEAD of the page's clock, because this box's frames come
         hundreds of ms apart and a sword's whole cycle is 600 (readiness 0 until it is reached: the dullest) */
      const dull = (await hold(-1500, 5)).map(red);   /* (taking the gap off a stamp ahead changes nothing: still 0) */
      const glint = await hold(need + 120, 6);   /* the middle of the window (60 before full to 300 after) */
      return { need, bright, dull, g0, glintDrawn: window.__btWeaponFeelFx().stats.glintDrawn, keyed: window.__btWeaponFeelFx().keyed };
    });
    const bR = three.bright[three.bright.length - 1], dR = three.dull[three.dull.length - 1];
    rec.ok('3 the blade is DRAWN dull right after a swing (half its brightness, weaponFeel DIM) and bright when full (its tint, read off the sprite)',
      typeof bR === 'number' && typeof dR === 'number' && Math.abs(dR - Math.round(bR * 0.5)) <= 2, { bR, dR, three });
    rec.ok('3 ...and in the glint the glint is drawn on it (in the feel\'s own layer)', three.glintDrawn > three.g0, three);

    /* ── 4 ── a swipe's arc follows its direction */
    await P.page.evaluate(() => { window.__btSwordCutLog = []; });
    const cut = async (dir) => {
      const at = await P.page.evaluate((d) => { window.__sfSpin(Date.now() + 900); return window.__sfStroke(d); }, dir);
      const seen = await H.waitFor(P, () => window.__btWeaponFeel(), (v) => v.last && v.last.at >= at, { timeout: 8000, label: 'the cut seen' }).catch(() => null);
      await P.page.waitForTimeout(700);
      const drawn = await P.page.evaluate((a) => (window.__btSwordCutLog || []).filter((e) => e.at === a), at);
      return { at, last: seen && seen.last, drawn };
    };
    const lr = await cut(1), rl = await cut(-1);
    const sweepOf = (e) => (e.back ? -1 : 1) * (e.mirror ? 1 : -1);   /* the authored sheets sweep -1 as drawn, +1 mirrored; a frame run back the other way */
    rec.ok('4 a stroke left-to-right is a forehand and right-to-left a backhand: opposite turns, each seen by the loop',
      !!lr.last && !!rl.last && lr.last.hand === 'fore' && rl.last.hand === 'back' && lr.last.dir === -rl.last.dir && !lr.last.click && !rl.last.click, { lr: lr.last, rl: rl.last });
    rec.ok('4 ...and the swing\'s figure is drawn sweeping the cut\'s way each time',
      lr.drawn.length > 0 && rl.drawn.length > 0 && lr.drawn.every((e) => e.dir === lr.last.dir && sweepOf(e) === e.dir) && rl.drawn.every((e) => e.dir === rl.last.dir && sweepOf(e) === e.dir),
      { lr: lr.drawn.slice(0, 3), rl: rl.drawn.slice(0, 3) });
    /* a flick and a sweep, in one task: the loop's angle given as monsterCombat gives it, then the thumb keeps going */
    const sweep = await P.page.evaluate(() => {
      const S = window._gameState.current, F = window.__btWeaponFeel, o = window.__sfDisc();
      window.__sfSpin(Date.now() + 900);
      window.__sfTouch(o.d, 'touchstart', o.x - 40, o.y, 82);
      window.__sfTouch(o.d, 'touchmove', o.x - 12, o.y, 82);   /* 28 px: the stroke, a swing */
      S._swingAng = Math.PI / 2; F.tick();                      /* the loop's angle (monsterCombat), then its frame */
      const flick = Object.assign({}, F().last);
      for (let x = o.x; x <= o.x + 120; x += 30) window.__sfTouch(o.d, 'touchmove', x, o.y, 82);
      F.tick();
      const swept = Object.assign({}, F().last);
      window.__sfTouch(o.d, 'touchend', o.x + 120, o.y, 82);
      return { flick, swept, fx: window.__btWeaponFeelFx() };
    });
    rec.ok('4 a short stroke is a flick (a narrow, quick arc); the thumb going on makes it a sweep, wider, the same swing',
      sweep.flick.kind === 'flick' && sweep.swept.kind === 'sweep' && sweep.swept.width > sweep.flick.width && sweep.swept.at === sweep.flick.at, sweep);

    /* ── 5 ── the contact's weight */
    const five = await P.page.evaluate(() => {
      const S = window._gameState.current, F = window.__btWeaponFeel;
      const m = { id: 'qa-dummy', x: S.player.x + 40, y: S.player.y, alive: true };
      window.__sfSpin(Date.now() + 1500);
      const a1 = window.__sfStroke(1);
      S._camPunch = null;
      const full = F.contact(m, 0.5);
      const punch = S._camPunch ? { dx: S._camPunch.dx, dy: S._camPunch.dy } : null;
      window.__sfSpin(a1 + 170);
      const a2 = window.__sfStroke(-1);
      S._camPunch = null;
      const light = a2 > a1 ? F.contact(m, 0.5) : null;
      return { a1, a2, full, punch, light, lightPunch: S._camPunch, active: window.__btWeaponFeelFx().active, contacts: F().contacts };
    });
    rec.ok('5 a cut after a full cycle lands full (debris, knock-back, the camera pushed the swing\'s way); a quick cut after it light (no push)',
      !!five.full && (five.full.tier === 'full' || five.full.tier === 'perfect') && five.full.debris && !!five.punch && five.punch.dx > 0 && five.punch.dy > 0
      && !!five.light && five.light.tier === 'light' && five.light.push === 0 && !five.lightPunch, five);
    await P.page.waitForTimeout(400);
    const sparks = await P.page.evaluate(() => window.__btWeaponFeelFx().stats);
    rec.ok('5 ...and its sparks are drawn in the feel\'s layer', sparks.bursts >= 2 && sparks.arcs >= 2, sparks);

    /* ── 6 ── the budget */
    const six = await P.page.evaluate(() => ({ feel: window.__btWeaponFeel().cost, fx: window.__btWeaponFeelFx().stats.maxMs }));
    rec.ok(`6 THE PAGE'S BUDGET: the feel's own work a frame is at most ${FEEL_MAX_MS} ms (a quarter of held-budget's ${FRAME_JS_MAX_MS} ms frame line, far from its ${HOLD_MAX_MS} ms hold) and ${FEEL_MEAN_MS} ms on average`,
      !!six.feel && six.feel.n > 10 && six.feel.max < FEEL_MAX_MS && six.feel.mean < FEEL_MEAN_MS && six.fx < FEEL_MAX_MS, six);
  } finally {
    stop();
    await P.ctx.close().catch(() => {});
  }

  /* ── 7 ── `?swordfeel=0`: the look before */
  const Q = await H.newPlayer(browser, { name: 'Plainbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: 'manual=default&swordfeel=0' });
  Q.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopQ = H.keepAlive(Q);
  try {
    await H.enterWorld(Q);
    const inQ = await H.waitFor(Q, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
    if (!inQ) rec.ok('7 `?swordfeel=0`: in the Wheel (guard)', false);
    else {
      await Q.page.waitForTimeout(2000);
      await Q.page.evaluate(PAGE_TOOLS);
      await Q.page.evaluate(arm);
      const r = await Q.page.evaluate(() => { window.__sfSpin(Date.now() + 1500); const a0 = window._gameState.current.swingTimer; const a = window.__sfStroke(1); return { swung: a > a0 }; });
      await Q.page.waitForTimeout(1500);
      const v = await Q.page.evaluate(() => window.__btWeaponFeel());
      rec.ok('7 `?swordfeel=0` on one phone: the swing as before -- no feel, no arc, nothing drawn in its layer', r.swung && !v.on && !v.wanted && v.arcs === 0 && !v.view, { r, v });
    }
  } finally {
    stopQ();
    await Q.ctx.close().catch(() => {});
  }
  rec.ok('8 no page errors', errors.length === 0, errors);
}
