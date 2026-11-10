/* ═══ MANUAL COMBAT ON A PHONE AND A COMPUTER (v2.3.4357, docs/specs/manual-combat.md) ═══
 *
 * The owner, 2026-11-09: "only making an attack after manual input is better
 * than auto-attacking at precisely the correct interval."  And, 2026-11-10,
 * of the draw-and-release it first was: "I don't like it ... maybe the sword
 * you have to make a swipe motion each attack?" -- "Try version a": EVERY
 * ATTACK IS A SWIPE.  Behind `?manual=1`.
 *
 * A real phone (390 x 844, real touch events on the right stick and the
 * attack disc) in the Wheel's BroTown, with a bow, under the Town Hall:
 *   1. the switch is on; nothing is drawn for it (no gauge);
 *   2. HOLDING the stick fires NOTHING, however long; its lift (a slow drag:
 *      aimed) is ONE arrow, the way the thumb pointed;
 *   3. a quick FLICK is one arrow, the way it went;
 *   4. a tap, and a thumb that barely moved, shoot nothing;
 *   5. dragged out, brought back to where the thumb touched, lifted: no shot;
 *   6. no faster than the bow: a flick straight after a shot shoots nothing
 *      and costs nothing; one a moment before the bow is ready is kept for
 *      that moment;
 *   7. the special's button ARMS it; a bow's flick with no line on a monster
 *      is an ordinary arrow and the special stays armed; a sword's stroke
 *      takes it;
 *   8. a SWORD: a tap swings nothing; a STROKE across the disc swings; the
 *      stroke back, straight after, swings nothing (and costs nothing); once
 *      ready, a stroke swings again; a thumb that drifts is not a stroke; a
 *      stroke on the right side of the screen swings too;
 *   9. a lock a player chose does not last a frame.
 * And a computer (1280 x 800, a mouse):
 *  10. each click is one arrow at the cursor, however long the button is
 *      held; the right click arms the special; a sword's click swings.
 *  11. no page errors.
 * Pictures: tools/qa/mp/out/manualcombat-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const WIDE = { width: 1280, height: 800 };
const REPAIR_MS = 60000;

/* the Wheel's objects near the player whose footprint a shot can meet */
const objectsNear = (P, r = 1600) => P.page.evaluate((r) => {
  const S = window._gameState.current, W = window.__btWheelObjects;
  const boxes = W.blockers();
  const out = [];
  for (const o of W.near(S.player.x, S.player.y, r)) {
    if (!o.ready) continue;
    const box = boxes.find((b) => b.oi === o.i);
    if (!box) continue;
    out.push({ oi: o.i, id: o.id, box, d: Math.hypot(o.x - S.player.x, o.y - S.player.y) });
  }
  return out.sort((a, b) => a.d - b.d);
}, r);
const bootsDy = (P) => P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround ? window.__btPlayerGround() : null; return g ? g.y - S.player.y : 52; });

/* a bow (or a sword) in hand, and every shot the game sends counted */
const arm = (P, slot) => P.page.evaluate((slot) => {
  const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
  const t = ((F.WOODWORKING_TIERS || {}).pine) || { tierMult: 1 };
  if (slot === 'ranged') R.rangedWeapon = { type: 'bow', tierMult: t.tierMult, gearBase: 'pine', name: 'Pine Bow', tier: 'common' };
  else if (!R.weapon) R.weapon = { type: 'greatsword', tierMult: 1, gearBase: 'copper', name: 'Copper Great Sword', tier: 'common' };
  R.activeSlot = slot;
  S.lockedTarget = null; S.autoAttack = false; S._aiming = false;
  window.__qaShots = 0;
  const ch = S.channel;
  if (ch && !ch.__qaCounted) {
    const send = ch.send.bind(ch);
    ch.send = (m) => { try { if (m && m.event === 'player_projectile') window.__qaShots++; } catch (e) { /* counting only */ } return send(m); };
    ch.__qaCounted = true;
  }
  return { slot: R.activeSlot, wpn: slot === 'ranged' ? R.rangedWeapon.type : R.weapon.type };
}, slot);

/* real touches (mp-bowgate's shim): the handlers are the page's own */
const installTouch = (P) => P.page.evaluate(() => {
  window.__touch = (el, type, x, y, id) => {
    const t = new Touch({ identifier: id, target: el, clientX: x, clientY: y });
    const end = type === 'touchend' || type === 'touchcancel';
    el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: end ? [] : [t], targetTouches: end ? [] : [t], changedTouches: [t] }));
  };
  window.__zone = () => document.querySelector('[data-joyzone="R"]');
  window.__disc = () => document.querySelector('.bt-rjoy-base');
  /* the clock, not a timer: this box's timers run late (a 100 ms interval fires every 800) */
  window.__spin = (until) => { while (Date.now() < until) { /* wait */ } };
  /* one whole flick in one task: down at (x, y), through the middle, up at (x + dx, y + dy) */
  window.__flick = (el, x, y, dx, dy, id) => {
    window.__touch(el, 'touchstart', x, y, id);
    window.__touch(el, 'touchmove', x + dx / 2, y + dy / 2, id);
    window.__touch(el, 'touchmove', x + dx, y + dy, id);
    window.__touch(el, 'touchend', x + dx, y + dy, id);
  };
  /* resolve when the weapon is ready (and `extra` ms more) */
  window.__ready = (extra) => new Promise((res) => { const t0 = performance.now(); const tick = () => { const st = window.__btManual.state(); if ((st && st.ready) || performance.now() - t0 > 6000) setTimeout(res, extra || 0); else setTimeout(tick, 20); }; tick(); });
});
const mc = (P) => P.page.evaluate(() => ({ st: window.__btManual ? window.__btManual.state() : null, aim: window._gameState.current._lastAimAngle, shots: window.__qaShots, swingTimer: window._gameState.current.swingTimer, early: window._gameState.current._mcEarly || 0 }));
const wait = (P, ms) => P.page.waitForTimeout(ms);
/* thumb down on the stick's zone at (x, y), then dragged `dy` up (the aim: straight up the screen) */
const down = (P, x, y, dy = -60, id = 7) => P.page.evaluate(({ x, y, dy, id }) => { const z = window.__zone(); window.__touch(z, 'touchstart', x, y, id); window.__touch(z, 'touchmove', x, y + dy / 2, id); window.__touch(z, 'touchmove', x, y + dy, id); }, { x, y, dy, id });
const move = (P, x, y, id = 7) => P.page.evaluate(({ x, y, id }) => window.__touch(window.__zone(), 'touchmove', x, y, id), { x, y, id });
const up = (P, x, y, id = 7) => P.page.evaluate(({ x, y, id }) => window.__touch(window.__zone(), 'touchend', x, y, id), { x, y, id });
const shotsNow = (P) => P.page.evaluate(() => window.__qaShots);
const resetShots = (P) => P.page.evaluate(() => { window.__qaShots = 0; });
/* shots counted once the loop has had frames to take a lift (this box draws a few frames a second) */
const settleShots = async (P, want, ms = 2500) => { const t0 = Date.now(); let n = 0; while (Date.now() - t0 < ms) { n = await shotsNow(P); if (n >= want) break; await wait(P, 120); } await wait(P, 500); return shotsNow(P); };

async function standUnderHall(P, rec, tag) {
  const dy = await bootsDy(P);
  const near = await objectsNear(P);
  const hall = near.find((o) => o.id === 'townhall');
  rec.ok(`${tag}setup: the Town Hall is near (guard)`, !!hall, near.slice(0, 5).map((o) => o.id));
  if (!hall) return null;
  const hx = (hall.box.x0 + hall.box.x1) / 2 + 18;
  await H.hopTo(P, hx, hall.box.y1 + 120 - dy, { tries: 80 });
  await wait(P, 1200);
  return hall;
}

async function phone({ browser, wsPort, webPort, rec, OUT }) {
  const shot = (name) => P.page.screenshot({ path: join(OUT, `manualcombat-${name}.png`) }).catch(() => {});
  const P = await H.newPlayer(browser, { name: 'Drawbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: `manual=1&repairms=${REPAIR_MS}` });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stop = H.keepAlive(P);
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
    rec.ok('phone: in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    await wait(P, 2000);
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, [data-coach-card], [data-coach-ring], *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true }).catch(() => {});
    await installTouch(P);

    /* ── 1 ── */
    const on = await P.page.evaluate(() => ({ on: !!(window.__btManual && window.__btManual.on()), stored: localStorage.getItem('bt_manual'), gauge: !!document.querySelector('[data-manual-gauge]') }));
    rec.ok('1 `?manual=1` turns manual combat on and remembers it; nothing is drawn for it (no gauge)', on.on && on.stored === '1' && !on.gauge, on);

    const armed = await arm(P, 'ranged');
    const hall = await standUnderHall(P, rec, 'phone ');
    if (!hall) return;
    const X = 300, Y = 430;   /* on the right half, over the world, clear of the buttons */
    const near = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

    /* ── 2 ── holding fires nothing; the lift is the shot */
    await resetShots(P);
    await down(P, X, Y);              /* thumb down, dragged 60 px up the screen */
    await wait(P, 1800);              /* three of the bow's intervals and more */
    const held = await mc(P);
    await up(P, X, Y - 60);
    const n2 = await settleShots(P, 1);
    const after2 = await mc(P);
    rec.ok(`2a holding the stick fires nothing (${held.shots} arrows in 1.8 s, the bow's interval ${Math.round((held.st && held.st.need) || 0)} ms)`,
      armed.wpn === 'bow' && held.shots === 0 && !!held.st && held.st.need < 1500, { st: held.st, shots: held.shots });
    rec.ok(`2b its lift is exactly ONE arrow (${n2}), straight up the screen as the thumb pointed`, n2 === 1 && near(after2.aim, -Math.PI / 2) < 0.05, { n2, aim: after2.aim });

    /* ── 3 ── a quick flick */
    await resetShots(P);
    await P.page.evaluate(() => window.__ready(60));
    await P.page.evaluate(({ X, Y }) => window.__flick(window.__zone(), X, Y, 40, -40, 31), { X, Y });
    const n3 = await settleShots(P, 1);
    const after3 = await mc(P);
    rec.ok(`3 a quick flick up and to the right is ONE arrow (${n3}), the way it went`, n3 === 1 && near(after3.aim, -Math.PI / 4) < 0.05, { n3, aim: after3.aim });

    /* ── 4 ── a tap, a thumb that barely moved */
    await resetShots(P);
    await P.page.evaluate(() => window.__ready(60));
    await P.page.evaluate(({ X, Y }) => { const z = window.__zone(); window.__touch(z, 'touchstart', X, Y, 32); window.__touch(z, 'touchend', X, Y, 32); window.__flick(z, X, Y, 12, -8, 33); }, { X, Y });
    await wait(P, 1200);
    const n4 = await shotsNow(P);
    rec.ok(`4 a tap and a 14 px nudge shoot nothing (${n4})`, n4 === 0, { n4 });

    /* ── 5 ── out, back to the centre, lift: no shot */
    await P.page.evaluate(({ X, Y }) => { const z = window.__zone(); window.__touch(z, 'touchstart', X, Y, 34); window.__touch(z, 'touchmove', X, Y - 60, 34); window.__touch(z, 'touchmove', X + 3, Y - 2, 34); window.__touch(z, 'touchend', X + 3, Y - 2, 34); }, { X, Y });
    await wait(P, 1200);
    const n5 = await shotsNow(P);
    rec.ok(`5 dragged out, brought back to where the thumb touched, lifted: no shot (${n5})`, n5 === 0, { n5 });

    /* ── 6 ── no faster than the bow.  The times are held by the clock in ONE task (this box's timers
       run late), and "an arrow has just left" is stamped on the bow's own clock (S.swingTimer, which
       every shot stamps) rather than waited for across this box's slow frames. */
    await resetShots(P);
    await P.page.evaluate(() => window.__ready(60));
    const pace = await P.page.evaluate(({ X, Y }) => {
      const S = window._gameState.current, z = window.__zone(), st = () => window.__btManual.state();
      const need = st().need, e0 = st().early;
      const T = Date.now(); S.swingTimer = T;   /* an arrow has just left */
      window.__spin(T + 80);
      window.__flick(z, X, Y, 0, -50, 36);      /* far too soon */
      const a = { early: st().early, fireAt: st().fireAt, readyIn: st().readyIn, swingTimer: S.swingTimer };
      window.__spin(T + need - 100);
      window.__flick(z, X, Y, 0, -50, 37);      /* a moment too soon: kept */
      const b = { early: st().early, fireAt: st().fireAt, readyIn: st().readyIn };
      return { need, e0, T, a, b };
    }, { X, Y });
    const n6 = await settleShots(P, 1, 3500);
    rec.ok(`6a a flick 80 ms after a shot shoots nothing and costs nothing (the bow's ${Math.round(pace.need || 0)} ms is not started again)`,
      pace.a.early === pace.e0 + 1 && pace.a.fireAt === 0 && pace.a.swingTimer === pace.T && pace.need > 300, pace);
    rec.ok(`6b a flick 100 ms before the bow is ready is kept for that moment, and is the one arrow of the two flicks (${n6})`, pace.b.fireAt > 0 && pace.b.early === pace.a.early && n6 === 1, { pace, n6 });

    /* ── 7 ── the special is armed by its button */
    await resetShots(P);
    await P.page.evaluate(() => window.__ready(60));
    const before7 = await P.page.evaluate(() => {
      const b = document.querySelector('[data-special]');
      if (!b) return { btn: false };
      const r = b.getBoundingClientRect();
      window.__touch(b, 'touchstart', r.left + r.width / 2, r.top + r.height / 2, 11);
      window.__touch(b, 'touchend', r.left + r.width / 2, r.top + r.height / 2, 11);
      const S = window._gameState.current;
      return { btn: true, armed: window.__btManual.state().armed, lastSwipe: S._lastSwipe || 0, sight: !!(S._bowSight && S._bowSight.d != null) };
    });
    await wait(P, 500);
    const btn7 = await P.page.evaluate(() => (document.querySelector('[data-special]') || { getAttribute: () => null }).getAttribute('data-special'));
    await shot('1-special-armed');
    await P.page.evaluate(({ X, Y }) => window.__flick(window.__zone(), X, Y, -40, -40, 38), { X, Y });   /* up and to the left: open ground */
    const n7 = await settleShots(P, 1, 3000);
    const after7 = await P.page.evaluate(() => { const S = window._gameState.current; return { armed: window.__btManual.state().armed, lastSwipe: S._lastSwipe || 0, queued: !!S._bowSpecialQueued, sight: !!(S._bowSight && S._bowSight.d != null) }; });
    rec.ok('7a the special\'s button is there and ARMS it for the next attack (it reads armed)', before7.btn && before7.armed === true && btn7 === 'armed', { before7, btn7 });
    /* a bow's special needs a line: with one, this flick IS the special; with none, it is an ordinary
       arrow and the special stays armed (never queued for a held bow's next line: a flick has none) */
    rec.ok(after7.sight
      ? `7b the flick had a line: it was the special (${n7} arrows), armed no longer`
      : `7b the flick had no line: an ordinary arrow (${n7}), the special still armed`,
      after7.sight ? (n7 >= 1 && after7.armed === false && after7.lastSwipe > before7.lastSwipe) : (n7 === 1 && after7.armed === true && !after7.queued && after7.lastSwipe === before7.lastSwipe), after7);
    await wait(P, 800);

    /* ── 9 ── a lock a player chose does not last */
    const lock = await P.page.evaluate(() => new Promise((res) => {
      const S = window._gameState.current;
      S.lockedTarget = { type: 'monster', id: 'qa-none', ref: { id: 'qa-none', alive: true, curHp: 10, hp: 10, x: S.player.x + 60, y: S.player.y, type: 'fodder' }, src: 'tap' };
      const t0 = performance.now();
      const tick = () => { if (!S.lockedTarget || performance.now() - t0 > 3000) res({ gone: !S.lockedTarget, ms: Math.round(performance.now() - t0) }); else setTimeout(tick, 30); };
      tick();
    }));
    rec.ok(`9 a lock a player chose is not kept (gone in ${lock.ms} ms)`, lock.gone, lock);

    /* ── 8 ── a sword: every swing is a stroke */
    const sw = await arm(P, 'melee');
    await wait(P, 1500);
    await P.page.evaluate(() => window.__ready(60));
    const sword = await P.page.evaluate(() => {
      const S = window._gameState.current, d = window.__disc(); const r = d.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const st = () => window.__btManual.state();
      /* the special armed for the sword's first stroke (mana for it: the arming asks) */
      if (!st().armed) {
        S.rpg.mana = Math.max(S.rpg.mana || 0, S.rpg.maxMana || 100);
        const b = document.querySelector('[data-special]');
        if (b) { const q = b.getBoundingClientRect(); window.__touch(b, 'touchstart', q.left + q.width / 2, q.top + q.height / 2, 40); window.__touch(b, 'touchend', q.left + q.width / 2, q.top + q.height / 2, 40); }
      }
      const need = st().meleeNeed, e0 = st().early, armed0 = st().armed, ls0 = S._lastSwipe || 0, sw0 = S.swingTimer;
      /* a tap */
      window.__touch(d, 'touchstart', x, y, 41); window.__touch(d, 'touchend', x, y, 41);
      const tap = { sw: S.swingTimer };
      /* a stroke across the disc: the special it was armed with, or a swing */
      window.__touch(d, 'touchstart', x - 15, y, 42);
      window.__touch(d, 'touchmove', x + 15, y, 42);
      const T = S.swingTimer, one = { sw: T, armed: st().armed, ls: S._lastSwipe || 0 };
      /* the stroke back, straight after: too soon */
      window.__touch(d, 'touchmove', x - 15, y, 42);
      const two = { sw: S.swingTimer, early: st().early };
      /* ready again: the first move after the pause is followed (not a stroke), the next is one */
      window.__spin(Math.max(T, Date.now()) + need + 30);
      window.__touch(d, 'touchmove', x + 15, y, 42);
      const follow = { sw: S.swingTimer };
      window.__touch(d, 'touchmove', x - 15, y, 42);
      const three = { sw: S.swingTimer };
      window.__touch(d, 'touchend', x - 15, y, 42);
      /* a thumb that drifts 30 px over 0.7 s is not a stroke */
      window.__spin(S.swingTimer + need + 30);
      const T3 = S.swingTimer;
      window.__touch(d, 'touchstart', x - 15, y, 43);
      window.__spin(Date.now() + 340); window.__touch(d, 'touchmove', x - 5, y, 43);
      window.__spin(Date.now() + 340); window.__touch(d, 'touchmove', x + 5, y, 43);
      window.__spin(Date.now() + 340); window.__touch(d, 'touchmove', x + 15, y, 43);
      window.__touch(d, 'touchend', x + 15, y, 43);
      const drift = { sw: S.swingTimer, T3 };
      /* a stroke on the right side of the screen, off the disc */
      const z = window.__zone();
      window.__touch(z, 'touchstart', 300, 430, 44);
      window.__touch(z, 'touchmove', 300, 400, 44);
      const side = { sw: S.swingTimer };
      window.__touch(z, 'touchend', 300, 400, 44);
      return { need, e0, armed0, ls0, sw0, tap, T, one, two, follow, three, drift, side };
    });
    await wait(P, 400);
    rec.ok('8a a sword\'s tap swings nothing', sw.wpn === 'greatsword' && sword.tap.sw === sword.sw0, { sw0: sword.sw0, tap: sword.tap });
    rec.ok('8b a STROKE across the disc swings', sword.T > sword.sw0, { sw0: sword.sw0, T: sword.T });
    rec.ok('7c ...and that stroke took the special armed for it (its own attack, or its refusal and a swing): armed no longer',
      sword.armed0 === true && sword.one.armed === false, { armed0: sword.armed0, one: sword.one, ls0: sword.ls0 });
    rec.ok('8c the stroke back, straight after, swings nothing (too soon), and costs nothing', sword.two.sw === sword.T && sword.two.early === sword.e0 + 1, sword.two);
    rec.ok(`8d once the sword is ready (${Math.round(sword.need)} ms) a stroke swings again -- the first move after the pause only follows the thumb`,
      sword.follow.sw === sword.T && sword.three.sw > sword.T, { T: sword.T, follow: sword.follow, three: sword.three });
    rec.ok('8e a thumb that drifts 30 px over a second is not a stroke: nothing swings', sword.drift.sw === sword.drift.T3, sword.drift);
    rec.ok('8f a stroke on the right side of the screen, off the disc, swings too', sword.side.sw > sword.drift.sw, { drift: sword.drift, side: sword.side });

    rec.ok('11a phone: no page errors', errors.length === 0, errors);
  } finally {
    stop();
    await P.ctx.close().catch(() => {});
  }
}

async function desk({ browser, wsPort, webPort, rec, OUT }) {
  const P = await H.newPlayer(browser, { name: 'Drawdesk', wsPort, webPort, viewport: WIDE, wide: true, world: 'wheel', query: `manual=1&repairms=${REPAIR_MS}` });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stop = H.keepAlive(P);
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
    rec.ok('computer: in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    await wait(P, 2000);
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, [data-coach-card], [data-coach-ring], *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    await installTouch(P);   /* its helpers (__ready): no touch is made here */
    await arm(P, 'ranged');
    const hall = await standUnderHall(P, rec, 'computer ');
    if (!hall) return;
    /* the cursor straight above the player, on the canvas */
    const at = await P.page.evaluate(() => {
      const S = window._gameState.current, cv = document.querySelector('canvas');
      const r = cv.getBoundingClientRect();
      const k = r.width / (S._viewW || r.width);
      return { x: Math.round(r.left + (S.player.x - S.camera.x) * k), y: Math.round(r.top + (S.player.y - S.camera.y) * k) - 110, desk: !!S._isDesktop };
    });
    await P.page.mouse.move(at.x, at.y);
    await wait(P, 400);
    await resetShots(P);
    await P.page.evaluate(() => window.__ready(60));
    await P.page.mouse.down();
    const n10a = await settleShots(P, 1);
    await wait(P, 1500);              /* held: three intervals and more */
    const heldN = await shotsNow(P);
    await P.page.mouse.up();
    await wait(P, 600);
    const upN = await shotsNow(P);
    rec.ok(`10a a computer: a click is ONE arrow at the cursor (${n10a}), however long the button is held (${heldN}) and whatever its release (${upN})`,
      at.desk && n10a === 1 && heldN === 1 && upN === 1, { at, n10a, heldN, upN });
    await P.page.evaluate(() => window.__ready(60));
    await P.page.mouse.down(); await P.page.mouse.up();
    const n10b = await settleShots(P, 2);
    rec.ok(`10b ...and the next click is the next arrow (${n10b})`, n10b === 2, { n10b });
    await wait(P, 600);
    await P.page.mouse.click(at.x, at.y, { button: 'right' });
    await wait(P, 300);
    const armedD = await P.page.evaluate(() => window.__btManual.state().armed);
    rec.ok('10c the right click arms the special for the next attack', armedD === true, { armedD });
    await P.page.mouse.click(at.x, at.y, { button: 'right' });   /* and disarms */
    await arm(P, 'melee');
    await wait(P, 1200);
    await P.page.evaluate(() => window.__ready(60));
    const dsw0 = await P.page.evaluate(() => window._gameState.current.swingTimer);
    await P.page.mouse.down(); await P.page.mouse.up();
    await wait(P, 500);
    const dsw1 = await P.page.evaluate(() => window._gameState.current.swingTimer);
    rec.ok('10d a sword\'s click is one swing', dsw1 > dsw0, { dsw0, dsw1 });
    rec.ok('11b computer: no page errors', errors.length === 0, errors);
  } finally {
    stop();
    await P.ctx.close().catch(() => {});
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  await phone({ browser, wsPort, webPort, rec, OUT });
  await desk({ browser, wsPort, webPort, rec, OUT });
}
