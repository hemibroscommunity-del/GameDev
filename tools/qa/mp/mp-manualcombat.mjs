/* ═══ MANUAL COMBAT ON A PHONE AND A COMPUTER (v2.3.4357, docs/specs/manual-combat.md) ═══
 *
 * The owner, 2026-11-09: "only making an attack after manual input is better
 * than auto-attacking at precisely the correct interval ... the timing of the
 * attack is based on when you release."  Behind `?manual=1`.
 *
 * A real phone (390 x 844, real touch events on the right stick and the
 * attack disc) in the Wheel's BroTown, with a bow, standing under the Town
 * Hall (a bow looses only at something: the hall is something, and takes the
 * arrows -- mp-bowprops' own ground):
 *   1. the switch is on, and the worker was told nothing new;
 *   2. HOLDING the stick toward the hall fires NOTHING, however long: the
 *      build-up ring appears on the button, fills and lights up (full), the
 *      bow's badge showing;
 *   3. LIFTING at full looses exactly ONE arrow;
 *   4. lifting BEFORE full looses nothing and the draw is lost;
 *   5. a thumb that slips off and is back within 100 ms keeps its draw, and
 *      the lift at full looses one;
 *   6. drawn to full, brought back to where the thumb first touched, then
 *      lifted: CANCELLED, no arrow;
 *   7. the special's button ARMS it (it reads armed), and the next lift at
 *      full is the special, once;
 *   8. a SWORD: its tap on the disc swings; a tap straight after it (early)
 *      does nothing, is not kept, and a hold swings nothing; once ready, a
 *      tap swings again; the badge is the sword;
 *   9. a lock a player chose does not last a frame.
 * And a computer (1280 x 800, a mouse):
 *  10. holding the mouse button fires nothing; its release at full looses
 *      one arrow toward the cursor; the right click arms the special.
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
});
const mc = (P) => P.page.evaluate(() => ({ st: window.__btManual ? window.__btManual.state() : null, gauge: window.__btManualGauge ? { ...window.__btManualGauge } : null, shots: window.__qaShots, swingTimer: window._gameState.current.swingTimer, early: window._gameState.current._mcEarly || 0 }));
const wait = (P, ms) => P.page.waitForTimeout(ms);
/* thumb down on the stick's zone at (x, y), then dragged `dy` up (the aim: straight up the screen) */
const down = (P, x, y, dy = -60, id = 7) => P.page.evaluate(({ x, y, dy, id }) => { const z = window.__zone(); window.__touch(z, 'touchstart', x, y, id); window.__touch(z, 'touchmove', x, y + dy / 2, id); window.__touch(z, 'touchmove', x, y + dy, id); }, { x, y, dy, id });
const move = (P, x, y, id = 7) => P.page.evaluate(({ x, y, id }) => window.__touch(window.__zone(), 'touchmove', x, y, id), { x, y, id });
const up = (P, x, y, id = 7) => P.page.evaluate(({ x, y, id }) => window.__touch(window.__zone(), 'touchend', x, y, id), { x, y, id });
const shotsNow = (P) => P.page.evaluate(() => window.__qaShots);
const resetShots = (P) => P.page.evaluate(() => { window.__qaShots = 0; });
const waitFull = (P, extra = 250) => P.page.evaluate((extra) => new Promise((res) => {
  const t0 = performance.now();
  const tick = () => { const s = window.__btManual.state(); if ((s && s.ready) || performance.now() - t0 > 6000) setTimeout(() => res(s), extra); else setTimeout(tick, 30); };
  tick();
}), extra);
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
    rec.ok('1 `?manual=1` turns manual combat on, remembers it, and mounts the build-up gauge', on.on && on.stored === '1' && on.gauge, on);

    const armed = await arm(P, 'ranged');
    const hall = await standUnderHall(P, rec, 'phone ');
    if (!hall) return;
    const X = 300, Y = 430;   /* on the right half, over the world, clear of the buttons */

    /* ── 2 ── holding fires nothing; the gauge fills and lights */
    await resetShots(P);
    await wait(P, 300);
    const rest = await mc(P);
    rec.ok('2z at rest nothing is drawn (the gauge is there only while something builds)',
      !rest.gauge || rest.gauge.vis === false, rest.gauge);
    await down(P, X, Y);
    await wait(P, 400);
    const mid = await mc(P);
    const full = await waitFull(P, 900);
    const held = await mc(P);
    await shot('1-full-draw');
    rec.ok(`2a holding the stick toward the hall fires nothing (${held.shots} arrows in ${Math.round((held.st && held.st.need) || 0)} ms and more)`,
      armed.wpn === 'bow' && held.shots === 0 && !!held.st && held.st.drawAt > 0 && held.st.ready === true, { mid: mid.st, held: held.st, shots: held.shots });
    rec.ok('2b the build-up shows on the button: the ring fills, then lights up at full, the bow\'s badge on it',
      !!held.gauge && held.gauge.vis === true && held.gauge.full === true && held.gauge.kind === 'bow' && !!full && full.ready === true
      && !!mid.gauge && mid.gauge.vis === true && mid.gauge.frac > 0 && mid.gauge.frac <= 1, { mid: mid.gauge, held: held.gauge });
    /* v2.3.4357 (the owner: "The thumb covers the indicator and the indicator itself is too subtle"): the
       gauge is ROUND THE BRO, big, and nowhere near the disc a thumb sits on */
    const ring = await P.page.evaluate(() => {
      const g = document.querySelector('[data-manual-gauge]'), d = document.querySelector('.bt-rjoy-base');
      const a = g.getBoundingClientRect(), b = d ? d.getBoundingClientRect() : null;
      const S = window._gameState.current, cv = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas'), c = cv.getBoundingClientRect();
      const px = c.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1), py = c.top + (S.player.y - S.camera.y) * (S._worldScaleY || 1);
      const band = g.querySelectorAll('svg circle')[2], bw = band ? parseFloat(getComputedStyle(band).strokeWidth) * a.width / 100 : 0;
      const gx = a.left + a.width / 2, gy = a.top + a.height / 2;
      return { full: g.getAttribute('data-mc-full'), kind: g.getAttribute('data-mc-kind'), pe: getComputedStyle(g).pointerEvents,
        g: [Math.round(a.left), Math.round(a.top), Math.round(a.width), Math.round(a.height)], d: b ? [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)] : null,
        bro: [Math.round(px), Math.round(py)], bw: Math.round(bw * 10) / 10,
        round: Math.abs(gx - px) <= 4 && Math.abs(gy - py) <= 12 && a.width >= 100,
        clear: !b || a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom,
        lit: (() => { const h = g.querySelector('.bt-mc-halo'); return !!h && h.classList.contains('bt-mc-lit') && parseFloat(getComputedStyle(h).opacity) > 0.2; })(),
        inside: a.left >= -8 && a.right <= innerWidth + 8 && a.bottom <= innerHeight + 8 };
    });
    rec.ok(`2c ...round the bro (a ${ring.g[2]} px ring, its band ${ring.bw} px thick, lit at full), clear of the attack disc a thumb sits on, taking no touch`,
      ring.full === '1' && ring.kind === 'bow' && ring.pe === 'none' && ring.round && ring.clear && ring.lit && ring.bw >= 7 && ring.inside, ring);

    /* ── 3 ── the lift at full looses one */
    await up(P, X, Y - 60);
    const n3 = await settleShots(P, 1);
    const after3 = await mc(P);
    rec.ok(`3 lifting at full looses exactly ONE arrow (${n3})`, n3 === 1 && after3.st.drawAt === 0 && after3.st.shots === 1, { n3, st: after3.st });
    await wait(P, 900);

    /* ── 4 ── an early lift looses nothing, and the draw is lost */
    await resetShots(P);
    /* in one task: this box's frames are a few hundred ms long, and a lift
       sent by a second call could come after the draw is full */
    const e1 = await P.page.evaluate(({ X, Y }) => {
      const z = window.__zone();
      window.__touch(z, 'touchstart', X, Y, 7); window.__touch(z, 'touchmove', X, Y - 30, 7); window.__touch(z, 'touchmove', X, Y - 60, 7);
      const before = window.__btManual.state();
      window.__touch(z, 'touchend', X, Y - 60, 7);
      return { before, after: window.__btManual.state() };
    }, { X, Y });
    await wait(P, 1500);
    const e2 = await mc(P);
    rec.ok('4 lifting before full looses nothing, and the draw is lost (the timer resets)',
      !!e1.before && e1.before.drawAt > 0 && e1.before.ready === false && e1.after.liftAt > 0 && e2.shots === 0 && e2.st.drawAt === 0 && e2.st.shots === 1, { e1, e2: e2.st, shots: e2.shots });

    /* ── 5 ── a slip inside the allowance keeps the draw */
    await resetShots(P);
    const slip = await P.page.evaluate(({ X, Y }) => new Promise((res) => {
      const z = window.__zone();
      window.__touch(z, 'touchstart', X, Y, 8); window.__touch(z, 'touchmove', X, Y - 30, 8); window.__touch(z, 'touchmove', X, Y - 60, 8);
      const d0 = window.__btManual.state().drawAt;
      /* the thumb leaves the glass and is back at once (one task: a timer of
         40 ms can be 300 ms late under this box's frames, past the allowance) */
      window.__touch(z, 'touchend', X, Y - 60, 8);
      const off = window.__btManual.state().liftAt;
      window.__touch(z, 'touchstart', X, Y, 9); window.__touch(z, 'touchmove', X, Y - 30, 9); window.__touch(z, 'touchmove', X, Y - 60, 9);
      const s = window.__btManual.state();
      res({ d0, off, d1: s.drawAt, liftAt: s.liftAt });
    }), { X, Y });
    await waitFull(P, 300);
    await up(P, X, Y - 60, 9);
    const n5 = await settleShots(P, 1);
    rec.ok(`5 a thumb that slips off and is straight back keeps its draw (the same one), and the lift at full looses one (${n5})`,
      slip.d0 > 0 && slip.off > 0 && slip.d1 === slip.d0 && slip.liftAt === 0 && n5 === 1, { slip, n5 });
    await wait(P, 900);

    /* ── 6 ── cancel */
    await resetShots(P);
    await down(P, X, Y);
    await waitFull(P, 300);
    await move(P, X, Y - 3);          /* back to where the thumb first touched */
    await up(P, X, Y - 3);
    await wait(P, 1500);
    const c6 = await mc(P);
    rec.ok('6 drawn to full, brought back to the stick\'s centre, then lifted: cancelled, no arrow', c6.shots === 0 && c6.st.drawAt === 0 && c6.st.fireAt === 0, { st: c6.st, shots: c6.shots });

    /* ── 7 ── the special is armed by its button, and is the next attack */
    await resetShots(P);
    const before7 = await P.page.evaluate(() => {
      const b = document.querySelector('[data-special]');
      if (!b) return { btn: false };
      const r = b.getBoundingClientRect();
      window.__touch(b, 'touchstart', r.left + r.width / 2, r.top + r.height / 2, 11);
      window.__touch(b, 'touchend', r.left + r.width / 2, r.top + r.height / 2, 11);
      const S = window._gameState.current;
      return { btn: true, armed: window.__btManual.state().armed, lastSwipe: S._lastSwipe || 0, mana: S.rpg.mana };
    });
    await wait(P, 500);
    const btn7 = await P.page.evaluate(() => ({ attr: (document.querySelector('[data-special]') || { getAttribute: () => null }).getAttribute('data-special'), star: (document.querySelector('[data-manual-gauge]') || { getAttribute: () => null }).getAttribute('data-mc-armed') }));
    await down(P, X, Y);
    await waitFull(P, 300);
    await shot('2-armed-full');
    await up(P, X, Y - 60);
    await settleShots(P, 1, 3000);
    const after7 = await P.page.evaluate(() => { const S = window._gameState.current; return { armed: window.__btManual.state().armed, lastSwipe: S._lastSwipe || 0, queued: !!S._bowSpecialQueued, shots: window.__qaShots, mana: S.rpg.mana }; });
    rec.ok('7a the special\'s button is there and ARMS it for the next attack (it reads armed; the gauge wears its star)',
      before7.btn && before7.armed === true && btn7.attr === 'armed' && btn7.star === '1', { before7, btn7 });
    rec.ok(`7b the next lift at full is the special (its clock stamped, mana ${before7.mana} -> ${after7.mana}), and it is armed no longer`,
      after7.armed === false && (after7.lastSwipe > before7.lastSwipe || after7.queued) && after7.shots >= 1, after7);
    await wait(P, 1200);

    /* ── 9 ── a lock a player chose does not last */
    const lock = await P.page.evaluate(() => new Promise((res) => {
      const S = window._gameState.current;
      S.lockedTarget = { type: 'monster', id: 'qa-none', ref: { id: 'qa-none', alive: true, curHp: 10, hp: 10, x: S.player.x + 60, y: S.player.y, type: 'fodder' }, src: 'tap' };
      const t0 = performance.now();
      const tick = () => { if (!S.lockedTarget || performance.now() - t0 > 3000) res({ gone: !S.lockedTarget, ms: Math.round(performance.now() - t0) }); else setTimeout(tick, 30); };
      tick();
    }));
    rec.ok(`9 a lock a player chose is not kept (gone in ${lock.ms} ms)`, lock.gone, lock);

    /* ── 8 ── a sword */
    const sw = await arm(P, 'melee');
    await wait(P, 1500);
    const tapDisc = () => P.page.evaluate(() => { const d = window.__disc(); const r = d.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; window.__touch(d, 'touchstart', x, y, 21); window.__touch(d, 'touchend', x, y, 21); return Date.now(); });
    const s0 = await mc(P);
    /* two taps in one task: the second is straight after the first, so early */
    const two = await P.page.evaluate(() => {
      const S = window._gameState.current, d = window.__disc(); const r = d.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const tap = (id) => { window.__touch(d, 'touchstart', x, y, id); window.__touch(d, 'touchend', x, y, id); };
      tap(21);
      const a = { swingTimer: S.swingTimer, early: S._mcEarly || 0, st: window.__btManual.state() };
      tap(22);
      return { a, b: { swingTimer: S.swingTimer, early: S._mcEarly || 0, st: window.__btManual.state() } };
    });
    const s1 = two.a, s2 = two.b;
    await wait(P, 150);
    const g1 = await mc(P);
    /* a HOLD on the disc: its press is a tap (one swing, it is ready by now),
       and holding on swings nothing more */
    await wait(P, 900);
    const sP = await P.page.evaluate(() => { const S = window._gameState.current, d = window.__disc(); const r = d.getBoundingClientRect(); window.__touch(d, 'touchstart', r.left + r.width / 2, r.top + r.height / 2, 23); return S.swingTimer; });
    await wait(P, 2200);
    const s3 = await mc(P);
    await P.page.evaluate(() => { const d = window.__disc(); const r = d.getBoundingClientRect(); window.__touch(d, 'touchend', r.left + r.width / 2, r.top + r.height / 2, 23); });
    await wait(P, 200);
    await tapDisc();                 /* ready again by now */
    await wait(P, 60);
    const s4 = await mc(P);
    /* the picture only: this box takes seconds over a screenshot, longer than the ring stays, so the
       sword is held part-built for it (every check above is already read) */
    await P.page.evaluate(() => { window.__mcHold = setInterval(() => { window._gameState.current.swingTimer = Date.now() - 380; }, 30); });
    await wait(P, 200);
    await shot('3-sword-building');
    await P.page.evaluate(() => { clearInterval(window.__mcHold); });
    rec.ok('8a a sword\'s tap on the disc swings (it was ready)', sw.wpn === 'greatsword' && s0.st.ready === true && s1.swingTimer > s0.swingTimer, { s0: s0.swingTimer, s1: s1.swingTimer, st: s0.st });
    rec.ok('8b a tap straight after it does nothing ("Tapping early does nothing")', s2.swingTimer === s1.swingTimer && s2.early === s1.early + 1 && s2.st.ready === false, { s1: s1.swingTimer, s2: s2.swingTimer, early: s2.early, st: s2.st });
    rec.ok('8c a held thumb is one tap and no more: its press swung once (the early tap before it was not kept), and 2 s of holding swung nothing else',
      sP > s1.swingTimer && s3.swingTimer === sP && s3.st.ready === true, { s1: s1.swingTimer, sP, s3: s3.swingTimer, st: s3.st });
    rec.ok('8e the sword\'s ring and badge show round the bro while it builds', !!g1.gauge && g1.gauge.vis === true && g1.gauge.kind === 'sword', g1.gauge);
    rec.ok('8d once ready, a tap swings again', s4.swingTimer > sP, { sP, s4: s4.swingTimer });

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
    await P.page.mouse.down();
    await waitFull(P, 900);
    const held = await mc(P);
    const dRing = await P.page.evaluate(() => {
      const g = document.querySelector('[data-manual-gauge]'), a = g.getBoundingClientRect();
      const S = window._gameState.current, cv = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas'), c = cv.getBoundingClientRect();
      const px = c.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1), py = c.top + (S.player.y - S.camera.y) * (S._worldScaleY || 1);
      return { g: [Math.round(a.left + a.width / 2), Math.round(a.top + a.height / 2), Math.round(a.width)], bro: [Math.round(px), Math.round(py)], canvas: [Math.round(c.left), Math.round(c.top)] };
    });
    await P.page.screenshot({ path: join(OUT, 'manualcombat-4-computer-full.png') }).catch(() => {});
    await P.page.mouse.up();
    const n = await settleShots(P, 1);
    rec.ok(`10a a computer: holding the mouse button fires nothing (${held.shots}), the gauge fills round the bro`,
      at.desk && held.shots === 0 && !!held.st && held.st.ready === true && !!held.gauge && held.gauge.vis && held.gauge.full, { at, st: held.st, gauge: held.gauge });
    rec.ok(`10b ...and its release at full looses one arrow (${n})`, n === 1, { n });
    rec.ok('10d ...and the ring is round the bro on a computer too (its window is not the game\'s box)', Math.abs(dRing.g[0] - dRing.bro[0]) <= 4 && Math.abs(dRing.g[1] - dRing.bro[1]) <= 12 && dRing.g[2] >= 100, dRing);
    await wait(P, 600);
    await P.page.mouse.click(at.x, at.y, { button: 'right' });
    await wait(P, 300);
    const armed = await P.page.evaluate(() => window.__btManual.state().armed);
    rec.ok('10c the right click arms the special for the next attack', armed === true, { armed });
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
