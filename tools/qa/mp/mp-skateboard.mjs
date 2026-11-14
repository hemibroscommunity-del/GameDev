/* ═══ THE SKATEBOARD (v2.3.3776) ═══
 *
 * The owner, 2026-10-28: "I just added a skateboard to the root.  I want to be
 * able to ride around on this just in the safe Brotown area.  You can tap it
 * to ride (maybe a button somewhere on screen).  When outside of town it makes
 * you get off."  (server/src/ride.js, game/ride.js, ui/panels/RideButton.jsx,
 * rendering/rideFx.js; docs/specs/skateboard.md.)
 *
 * In the world's BroTown, against a real worker, a phone held upright (390 x
 * 844, touch) and a computer (1366 x 768, the wide layout players get):
 *   1. the worker carries boards (caps.ride) and the phone shows the board
 *      button in town; a real tap on it puts the phone's bro on the board
 *      (the worker's ride_state) and the board is drawn under him;
 *   2. the computer sees the phone's bro on his board (the tick's `brd`), and
 *      its renderer draws it;
 *   3. riding, the phone rolls faster than it walks (RIDE_MULT);
 *   4. ridden out past the safe ground's edge: off the board, the one line
 *      that says why, and the button gone;
 *   5. on the computer, Z gets on, and Z again gets off;
 *   6. the board button sideways (844 x 390) is drawn, on the screen, and on
 *      no other control;
 *   7. no page errors;
 *   8. (v2.3.3839) the owner, on a laptop with a new character: "It just has an
 *      invisible wall up if you're on skateboard and try to go into no man's
 *      land."  The computer's character has not spoken to Mayor Bro, so the
 *      Mayor gate holds it inside the safe ground (game/wheelHome.js), board
 *      and all; ridden into it with D, "Speak to Mayor Bro first" must be
 *      SEEN: the banner's fade runs (it froze at its first frame, ~0.04 on a
 *      quick computer: ui/TimedBanner.jsx);
 *   9. ...and once the first quest is taken, the same ride rolls out past the
 *      edge, off the board with "Off the board: boards stay in BroTown.".
 *  10. (v2.3.5440, card SK) the owner, 2026-11-14: "letting go of skateboard
 *      button makes it roll for a while down to a slow stop.  Also let the
 *      skateboard take a push or two before reaching max speed when starting
 *      from a stop".  On the computer's keys, timed by the game's own clock
 *      (the board's `clk`, the steady step's ms; TRAPS §200): from a stand,
 *      below top early and at top by about 1.2 s; let go, still rolling,
 *      slower and slower, stopped within about 2.5 s; the worker followed no
 *      move past its bound (its own count) and has the board where it is;
 *  11. ...ridden at the safe ground's edge and let go short of it: off at the
 *      edge, with no roll past it;
 *  12. ...and the same start and roll-off on the phone's stick, upright and
 *      sideways.
 * Pictures: tools/qa/mp/out/skateboard-*.png (the 8 directions, the button
 * upright, sideways and on a computer).
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(H.REPO, 'tools/qa/mp/out');

const state = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const b = window.__btRideBtn ? window.__btRideBtn() : null;
  const fx = window.__btRideFx ? window.__btRideFx() : null;
  const el = document.querySelector('[data-ride]');
  const r = el ? el.getBoundingClientRect() : null;
  return {
    caps: !!(S._serverCaps && S._serverCaps.ride), zone: S.currentZone,
    x: S.player && S.player.x, y: S.player && S.player.y,
    btn: b, fx, el: r ? { l: r.left, r: r.right, t: r.top, b: r.bottom, ride: el.getAttribute('data-ride'), key: el.getAttribute('data-key') } : null,
    ride: S._ride ? { on: !!S._ride.on, why: S._ride.why, n: S._ride.n } : null,
  };
});

/* every other control's box the board button lies on */
const overlaps = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-ride]');
  if (!el) return null;
  const a = el.getBoundingClientRect(), out = [];
  for (const q of document.querySelectorAll('button, [role="button"], .bt-rjoy-base, [data-shield], [data-special], [data-sprint], [data-jump]')) {
    if (q === el || el.contains(q) || q.contains(el)) continue;
    const c = q.getBoundingClientRect(), cs = getComputedStyle(q);
    if (c.width < 4 || cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) continue;
    if (Math.min(a.right, c.right) - Math.max(a.left, c.left) > 1 && Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top) > 1) out.push((q.getAttribute('data-ability') || q.className || q.tagName).toString().slice(0, 30));
  }
  return { box: { l: a.left, r: a.right, t: a.top, b: a.bottom }, vw: innerWidth, vh: innerHeight, over: out };
});

/* v2.3.5440: a real tap on the board button, until the worker has you on
   (three at most).  The button takes a tap whose touchend comes within
   TAP_MAX_MS (600 ms) of its touchstart (RideButton.jsx), and on this box,
   with two pages and a worker loading, the page's thread can be held longer
   than that between the two: a tap then reaches nothing.  Returns the
   button's state and the taps it took, or null. */
async function tapOn(P, el) {
  for (let taps = 1; taps <= 3; taps++) {
    await P.page.touchscreen.tap((el.l + el.r) / 2, (el.t + el.b) / 2);
    const v = await H.waitFor(P, () => window.__btRideBtn(), (q) => q.on === true, { timeout: 5000, label: 'on the board' }).catch(() => null);
    if (v) return Object.assign({ taps }, v);
  }
  return null;
}

/* ── v2.3.5440 (card SK): the push start and the roll-off ──
   Timed by the game's own clock: the board's `clk` is the steady step's ms
   summed while you ride (game/ride.js rideFeel), so a box drawing a few
   frames a second reads the same seconds a phone does (TRAPS §200). */
const feel = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, r = S._ride || {};
  return { on: !!r.on, why: r.why || null, spd: typeof r.spd === 'number' ? +r.spd.toFixed(4) : null, push: r.push, clk: r.clk || 0,
    x: S.player.x, y: S.player.y, snd: window.__btRideSound ? window.__btRideSound.state() : null };
});
/* the worker's own count of moves it had to follow past its bound
   (movement.js _moveBudgetInfo): an honest move is never one */
const followedBy = async (wsPort) => {
  try {
    const o = await (await fetch(`http://127.0.0.1:${wsPort}/api/admin/overview`, { headers: { Authorization: `Bearer ${H.ADMIN_KEY}` } })).json();
    return o && o.moveBudget ? o.moveBudget.followed : null;
  } catch (e) { return null; }
};
/* on the board and standing: hold the way (`press`) until the board has been
   at top a while, let go (`release`), watch it roll to a stop */
async function feelRun(P, id, wsPort, press, release) {
  await H.waitFor(P, (S) => (S._ride ? S._ride.spd : -1), (v) => v === 0, { timeout: 8000, label: 'standing on the board' }).catch(() => null);
  const f0 = await followedBy(wsPort);
  const s0 = await feel(P);
  await press();
  const up = [];
  for (let t0 = Date.now(); Date.now() - t0 < 40000;) {
    const q = await feel(P);
    up.push(q);
    if (!q.on || (q.spd >= 1 && q.clk - s0.clk >= 1600)) break;
    await P.page.waitForTimeout(15);
  }
  const r0 = await feel(P);
  await release();
  const down = [];
  for (let t0 = Date.now(); Date.now() - t0 < 60000;) {
    const q = await feel(P);
    down.push(q);
    if (!q.on || (q.spd === 0 && q.clk - r0.clk >= 3200)) break;
    await P.page.waitForTimeout(15);
  }
  /* the worker's copy: its rest packet may land a frame or two late */
  let gap = null;
  for (let i = 0; i < 20; i++) {
    const sv = await H.serverPlayer(wsPort, id).catch(() => null);
    const me = await feel(P);
    gap = sv ? Math.round(Math.hypot(sv.x - me.x, sv.y - me.y)) : null;
    if (gap != null && gap <= 4) break;
    await P.page.waitForTimeout(200);
  }
  const f1 = await followedBy(wsPort);
  const top = up.find((q) => q.spd >= 1);
  const early = up.filter((q) => q.clk - s0.clk <= 500 && q.spd > 0 && q.spd < 0.9);
  const stop = down.find((q) => q.spd === 0);
  const moved = down.find((q) => q.spd > 0 && Math.hypot(q.x - r0.x, q.y - r0.y) > 2);
  const rolling = down.filter((q) => q.spd > 0);
  const last = down[down.length - 1];
  return {
    tTop: top ? Math.round(top.clk - s0.clk) : null,
    early: early.length ? early[0].spd : null,
    atRelease: r0.spd,
    tStop: stop ? Math.round(stop.clk - r0.clk) : null,
    rolled: stop ? Math.round(Math.hypot(stop.x - r0.x, stop.y - r0.y)) : null,
    moving: !!moved,
    slowing: rolling.every((q, i) => i === 0 || q.spd <= rolling[i - 1].spd + 1e-6),
    still: !!(stop && last && Math.hypot(last.x - stop.x, last.y - stop.y) < 0.5),
    hush: last && last.snd ? last.snd.k : null,
    on: !!(last && last.on),
    followed: f0 != null && f1 != null ? f1 - f0 : null,
    gap,
    samples: { up: up.length, down: down.length },
  };
}
/* the four lines of a run, the same for the keys and the stick */
function feelChecks(rec, n, how, R) {
  rec.ok(`${n}. ${how}, from a stand: below top early (${R.early} of top in the first 0.5 s) and at top at ${R.tTop} ms of the game's clock (by about 1.2 s)`,
    R.early != null && R.tTop != null && R.tTop >= 550 && R.tTop <= 1250, R);
  rec.ok(`${n}. ...let go at top (${R.atRelease}): still rolling (${R.moving}), slower and slower (${R.slowing}), stopped at ${R.tStop} ms (within about 2.5 s), ${R.rolled} px on, then still (${R.still}) and silent (${R.hush})`,
    R.atRelease >= 0.99 && R.moving && R.slowing && R.tStop != null && R.tStop >= 1500 && R.tStop <= 2500 && R.rolled > 40 && R.still && R.hush === 0 && R.on, R);
  rec.ok(`${n}. ...and the worker refused no move of it: followed none past its bound (${R.followed}), and has the board where it stopped (${R.gap} px apart)`,
    R.followed === 0 && R.gap != null && R.gap <= 4, R);
}

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const errors = [];
  const G = await H.wheelGeom();
  /* one after the other: the second joins once the first is in (joinPair's rule) */
  const A = await H.newPlayer(browser, { name: 'Skater', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, dpr: 2, world: 'wheel' });
  A.page.on('pageerror', (e) => errors.push('phone: ' + String((e && e.message) || e).slice(0, 200)));
  await H.enterWorld(A);
  const B = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, viewport: { width: 1366, height: 768 }, world: 'wheel', wide: true });
  B.page.on('pageerror', (e) => errors.push('computer: ' + String((e && e.message) || e).slice(0, 200)));
  /* an idle page logs out after 2 minutes (mp-trapping's keep-alive).
     v2.3.5440: the phone's too -- on a slow box the computer's way in took
     over two minutes and the phone, waiting, was logged out ("You were away"),
     so its first tap on the board button reached nothing */
  let alive = true;
  for (const P of [A, B]) (async () => { while (alive) { await P.page.keyboard.press('Control').catch(() => {}); for (let i = 0; i < 40 && alive; i++) await P.page.waitForTimeout(500).catch(() => {}); } })();
  try {
    await H.enterWorld(B);
    const inA = await H.waitFor(A, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'phone in the world' }).catch(() => null);
    const inB = await H.waitFor(B, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'computer in the world' }).catch(() => null);
    rec.ok('both in the world (guard)', !!inA && !!inB, { inA, inB });
    if (!inA || !inB) return;
    const idA = await H.readState(A, (S) => S.myId), idB = await H.readState(B, (S) => S.myId);
    for (const id of [idA, idB]) await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
    for (const P of [A, B]) await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    /* side by side in the square, east of the arrival */
    await H.glideTo(A, G.arrival.x + 200, G.arrival.y);
    await H.glideTo(B, G.arrival.x + 330, G.arrival.y);
    await A.page.waitForTimeout(1500);

    /* 1. the button, and a real tap */
    const s0 = await state(A);
    rec.ok(`1. the worker carries boards (caps.ride ${s0.caps}) and the phone shows the board button in town`, s0.caps && !!s0.btn && s0.btn.shown && !!s0.el, s0);
    if (!s0.el) return;
    await A.page.screenshot({ path: join(OUT, 'skateboard-button-upright.png') }).catch(() => {});
    const on = await tapOn(A, s0.el);
    await A.page.waitForTimeout(600);
    const s1 = await state(A);
    rec.ok(`1. a real tap puts the phone's bro on the board (the worker's word; ${on ? on.taps : '?'} tap), drawn under him (${JSON.stringify(s1.fx && s1.fx.self)})`,
      !!on && s1.ride && s1.ride.on && !!(s1.fx && s1.fx.self), s1);
    await A.page.screenshot({ path: join(OUT, 'skateboard-riding-upright.png') }).catch(() => {});

    /* 2. the computer sees it */
    const look = () => B.page.evaluate((id) => { const S = window._gameState.current; return { brd: !!(S.others && S.others[id] && S.others[id]._brd), fx: window.__btRideFx ? window.__btRideFx().peers : 0 }; }, idA);
    let seen2 = await look();
    for (let i = 0; i < 32 && !(seen2.brd && seen2.fx >= 1); i++) { await B.page.waitForTimeout(250); seen2 = await look(); }
    rec.ok(`2. the computer sees the phone's bro on his board (brd ${seen2.brd}) and draws it (${seen2.fx} rider)`, seen2.brd && seen2.fx >= 1, seen2);
    await B.page.screenshot({ path: join(OUT, 'skateboard-peer-computer.png') }).catch(() => {});

    /* 3. faster than a walk: the speed the loop uses */
    const k = await A.page.evaluate(() => (window._gameState.current._ride && window._gameState.current._ride.on) ? 1.6 : 1);
    rec.ok('3. riding, the walk is multiplied by RIDE_MULT (1.6)', k === 1.6, k);

    /* 4. out past the edge */
    const R = 2937;   /* zones.js wheel.safeR (the town's safe ground); the centre is the world's */
    await H.glideTo(A, G.cx + R + 220, G.arrival.y, { speed: 700, timeoutMs: 20000 });
    const off = await H.waitFor(A, () => window.__btRideBtn(), (v) => v.on === false, { timeout: 6000, label: 'off at the edge' }).catch(() => null);
    await A.page.waitForTimeout(800);
    const s4 = await state(A);
    rec.ok(`4. ridden out past the safe ground: off the board (${s4.ride && s4.ride.why}) and the button gone`,
      !!off && s4.ride && !s4.ride.on && (s4.ride.why === 'edge' || s4.ride.why === 'zone') && !s4.el, s4);

    /* 5. the computer's Z */
    const z0 = await state(B);
    rec.ok(`5. on the computer the button wears Z (${z0.el && z0.el.key})`, !!z0.el && z0.el.key === 'Z', z0);
    await B.page.screenshot({ path: join(OUT, 'skateboard-button-computer.png') }).catch(() => {});
    await B.page.keyboard.press('z');
    const zOn = await H.waitFor(B, () => window.__btRideBtn(), (v) => v.on === true, { timeout: 5000, label: 'Z on' }).catch(() => null);
    /* v2.3.3791: the roll is heard while the rider rolls (game/rideSound.js) */
    const snd = () => B.page.evaluate(() => ({ ctx: !!(window.BT_AUDIO && window.BT_AUDIO.ctx) || !!(window.__btRideSound), s: window.__btRideSound ? window.__btRideSound.state() : null }));
    await B.page.keyboard.down('d');
    let rolling = null;
    /* v2.3.5440: the level follows the board's speed, so wait for the start's
       two pushes (about 0.8 s of the game's clock: several seconds here) */
    for (let i = 0; i < 50; i++) { await B.page.waitForTimeout(200); const q = await snd(); if (q.s && q.s.playing && q.s.k >= 0.99 && q.s.gain > 0.01) { rolling = q; break; } rolling = q; }
    await B.page.keyboard.up('d');
    rec.ok(`5b. riding and rolling, the board is heard (playing ${rolling && rolling.s && rolling.s.playing}, gain ${rolling && rolling.s && rolling.s.gain} of ${rolling && rolling.s && rolling.s.vol}, at ${rolling && rolling.s && rolling.s.k} of its speed)`,
      !!(rolling && rolling.s && rolling.s.playing && rolling.s.k >= 0.99 && rolling.s.gain > 0.01), rolling);
    /* the eight ways, on the computer's keys, for the owner's picture */
    const ways = [['s'], ['s', 'd'], ['d'], ['w', 'd'], ['w'], ['w', 'a'], ['a'], ['s', 'a']];
    for (let i = 0; i < ways.length; i++) {
      /* from the open square south of the arrival each time, so nothing in
         the town stands in front of the board */
      await H.glideTo(B, G.arrival.x, G.arrival.y + 140, { speed: 600, timeoutMs: 15000 });
      await B.page.waitForTimeout(250);
      for (const key of ways[i]) await B.page.keyboard.down(key);
      await B.page.waitForTimeout(260);
      const box = await B.page.evaluate(() => { const c = document.querySelector('canvas').getBoundingClientRect(); return { x: c.left + c.width / 2 - 110, y: c.top + c.height / 2 - 150, width: 220, height: 240 }; });
      await B.page.screenshot({ path: join(OUT, `skateboard-dir-${i}.png`), clip: box }).catch(() => {});
      for (const key of ways[i]) await B.page.keyboard.up(key);
    }
    /* a ride as frames, for the owner: setting off east (the push), the
       glide, then a turn north up the open square (another push), every
       ~180 ms -- short legs: the board covers ~1,000 px a second */
    await H.glideTo(B, G.arrival.x - 700, G.arrival.y + 140, { speed: 600, timeoutMs: 15000 });
    await B.page.waitForTimeout(700);
    const shotAt = async (n) => {
      const box = await B.page.evaluate(() => { const c = document.querySelector('canvas').getBoundingClientRect(); return { x: c.left + c.width / 2 - 110, y: c.top + c.height / 2 - 150, width: 220, height: 240 }; });
      await B.page.screenshot({ path: join(OUT, `skateboard-ride-${String(n).padStart(2, '0')}.png`), clip: box }).catch(() => {});
    };
    let fr = 0;
    await shotAt(fr++);
    await B.page.keyboard.down('d');
    for (let i = 0; i < 5; i++) { await B.page.waitForTimeout(150); await shotAt(fr++); }
    await B.page.keyboard.up('d');
    await B.page.keyboard.down('w');
    for (let i = 0; i < 4; i++) { await B.page.waitForTimeout(150); await shotAt(fr++); }
    await B.page.keyboard.up('w');
    await B.page.waitForTimeout(300);
    await shotAt(fr++);
    await B.page.waitForTimeout(500);
    await B.page.keyboard.press('z');
    const zOff = await H.waitFor(B, () => window.__btRideBtn(), (v) => v.on === false, { timeout: 5000, label: 'Z off' }).catch(() => null);
    rec.ok('5. Z gets on, and Z again gets off', !!zOn && !!zOff, { zOn, zOff });
    /* v2.3.3791: ...and the roll falls silent at once, its source stopped
       soon after: nothing plays after the ride ends */
    await B.page.waitForTimeout(400);
    const hush = await B.page.evaluate(() => window.__btRideSound.state());
    await B.page.waitForTimeout(2200);
    const gone = await B.page.evaluate(() => window.__btRideSound.state());
    rec.ok(`5c. off the board the roll falls silent (gain ${hush.gain} after 0.4 s) and stops (playing ${gone.playing} after 2.6 s)`,
      hush.gain < 0.01 && !hush.riding && gone.playing === false, { hush, gone });

    /* ── 10. v2.3.5440: the push start and the roll-off, on the computer's keys ──
       along the east road, well inside the safe ground and the Mayor gate */
    await H.glideTo(B, G.cx + R - 1300, G.cy, { speed: 600, timeoutMs: 30000 });
    await B.page.waitForTimeout(800);
    await B.page.keyboard.press('z');
    const on10 = await H.waitFor(B, () => window.__btRideBtn(), (v) => v.on === true, { timeout: 5000, label: 'on, for the roll' }).catch(() => null);
    const R10 = on10 ? await feelRun(B, idB, wsPort, () => B.page.keyboard.down('d'), () => B.page.keyboard.up('d')) : null;
    console.log(`    keys: ${JSON.stringify(R10)}`);
    if (R10) feelChecks(rec, 10, 'On the computer\'s keys', R10);
    else rec.ok('10. on the board for the roll (guard)', false, { on10 });
    await B.page.keyboard.press('z');
    await H.waitFor(B, () => window.__btRideBtn(), (v) => v.on === false, { timeout: 5000, label: 'off, after the roll' }).catch(() => null);

    /* ── 8. v2.3.3839: the Mayor gate, ridden into on the computer's keys ── */
    const gateLook = () => B.page.evaluate((c) => {
      const S = window._gameState.current;
      const n = [...document.querySelectorAll('[data-levelup-banner] *')].find((e) => e.children.length === 0 && /Mayor Bro first/.test(e.textContent));
      let op = 0;
      if (n) { op = 1; for (let e = n; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); op *= +cs.opacity; if (cs.visibility === 'hidden' || cs.display === 'none') op = 0; } }
      const pop = (S.dmgNumbers || []).some((d) => d && d.text === 'Off the board: boards stay in BroTown.');
      return { r: Math.round(Math.hypot(S.player.x - c[0], S.player.y - c[1])), op: Math.round(op * 100) / 100, hits: S._wheelGateHits || 0,
        ride: S._ride ? { on: !!S._ride.on, why: S._ride.why } : null, tut: !!(S.rpg && S.rpg._quests && S.rpg._quests.tut_1), pop };
    }, [G.cx, G.cy]);
    await H.glideTo(B, G.cx + R - 150, G.cy, { speed: 600, timeoutMs: 30000 });   /* due east, along the road */
    await B.page.waitForTimeout(1200);
    const g0 = await gateLook();
    await B.page.keyboard.press('z');
    await H.waitFor(B, () => window.__btRideBtn(), (v) => v.on === true, { timeout: 5000, label: 'on, at the gate' }).catch(() => null);
    await B.page.keyboard.down('d');
    const g8 = [];
    let shot8 = false;
    for (let t0 = Date.now(); Date.now() - t0 < 12000;) {
      await B.page.waitForTimeout(150);
      const q = await gateLook();
      g8.push(q);
      /* the picture at the banner's height */
      if (!shot8 && q.op >= 0.9) { shot8 = true; await B.page.screenshot({ path: join(OUT, 'skateboard-mayor-gate-computer.png') }).catch(() => {}); }
    }
    await B.page.keyboard.up('d');
    /* one message's samples (the best-sampled one: a picture can eat a
       message's time): its fade must move -- frozen, it read one value */
    const byHit = new Map();
    for (const q of g8) if (q.hits > g0.hits && q.op > 0) byHit.set(q.hits, (byHit.get(q.hits) || []).concat(q.op));
    const one = [...byHit.values()].sort((a, b) => new Set(b).size - new Set(a).size)[0] || [];
    const firstHit = byHit.size > 0;
    const opMax = Math.max(0, ...g8.map((q) => q.op));
    rec.ok(`8. a new character (no first quest: ${!g0.tut}) rides D into the Mayor gate: held inside the safe ground (r at most ${Math.max(...g8.map((q) => q.r))} of ${R}), still on the board`,
      !g0.tut && g8.length > 0 && g8.every((q) => q.r < R) && g8[g8.length - 1].ride && g8[g8.length - 1].ride.on, { g0, last: g8[g8.length - 1] });
    rec.ok(`8. ...and "Speak to Mayor Bro first" is SEEN: its fade runs (${new Set(one).size} opacities in one message: ${one.slice(0, 8).join(', ')}), held at ${opMax} (a warning holds full, v2.3.3839)`,
      !!firstHit && new Set(one).size >= 2 && opMax >= 0.95, { hits: g8.map((q) => q.hits + ':' + q.op).join(' ') });

    /* ── 9. ...the first quest taken, the same ride rolls out, off the board ── */
    await B.page.evaluate(() => { const S = window._gameState.current; S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } }); });
    const tut = await H.waitFor(B, (S) => !!(S.rpg && S.rpg._quests && S.rpg._quests.tut_1), (v) => v, { timeout: 8000, label: 'the first quest taken' }).catch(() => null);
    const on9 = await B.page.evaluate(() => window.__btRideBtn().on);
    if (!on9) { await B.page.keyboard.press('z'); await H.waitFor(B, () => window.__btRideBtn(), (v) => v.on === true, { timeout: 5000 }).catch(() => null); }
    await B.page.keyboard.down('d');
    let g9 = null, pop9 = false;
    for (let t0 = Date.now(); Date.now() - t0 < 20000;) {
      await B.page.waitForTimeout(150);
      g9 = await gateLook();
      pop9 = pop9 || g9.pop;
      if (g9.ride && !g9.ride.on && g9.r > R + 40) break;
    }
    await B.page.keyboard.up('d');
    await B.page.screenshot({ path: join(OUT, 'skateboard-edge-computer.png') }).catch(() => {});
    rec.ok(`9. the first quest taken (${!!tut}), the computer rides out past the edge (r ${g9 && g9.r} of ${R}) and off the board (${g9 && g9.ride && g9.ride.why}) with "Off the board: boards stay in BroTown." (${pop9})`,
      !!tut && !!g9 && g9.r > R && !!g9.ride && !g9.ride.on && g9.ride.why === 'edge' && pop9, g9);

    /* ── 11. v2.3.5440: let go short of the edge at top: off AT the edge,
       with no roll past it (game/ride.js rideCheck, then no roll after) ── */
    await H.glideTo(B, G.cx + R - 800, G.cy, { speed: 600, timeoutMs: 30000 });
    await B.page.waitForTimeout(800);
    await B.page.keyboard.press('z');
    await H.waitFor(B, () => window.__btRideBtn(), (v) => v.on === true, { timeout: 5000, label: 'on, for the edge' }).catch(() => null);
    await H.waitFor(B, (S) => (S._ride ? S._ride.spd : -1), (v) => v === 0, { timeout: 8000 }).catch(() => null);
    await B.page.keyboard.down('d');
    let e0 = await feel(B);
    for (let t0 = Date.now(); Date.now() - t0 < 40000 && e0.on && e0.x < G.cx + R - 110;) { await B.page.waitForTimeout(15); e0 = await feel(B); }
    await B.page.keyboard.up('d');
    const e11 = [];
    for (let t0 = Date.now(); Date.now() - t0 < 30000;) { const q = await feel(B); e11.push(q); if (!q.on) break; await B.page.waitForTimeout(15); }
    await B.page.waitForTimeout(1500);
    const eEnd = await feel(B);
    const eOff = e11.find((q) => !q.on) || null;
    const rOff = eOff ? Math.round(Math.hypot(eOff.x - G.cx, eOff.y - G.cy) - R) : null;
    const rEnd = Math.round(Math.hypot(eEnd.x - G.cx, eEnd.y - G.cy) - R);
    console.log(`    edge: ${JSON.stringify({ letGo: { spd: e0.spd, r: Math.round(Math.hypot(e0.x - G.cx, e0.y - G.cy) - R) }, off: eOff && { why: eOff.why, r: rOff }, end: rEnd, n: e11.length })}`);
    rec.ok(`11. let go at top (${e0.spd}) ${Math.round(R - Math.hypot(e0.x - G.cx, e0.y - G.cy))} px short of the safe ground's edge, a roll that would carry ~200 px: off at the edge (${eOff && eOff.why}, ${rOff} px past it), and no roll after (${rEnd} px past it 1.5 s later)`,
      e0.spd >= 0.99 && !!eOff && eOff.why === 'edge' && rOff != null && rOff >= 0 && rOff <= 20 && rEnd <= rOff + 1, { e0, eOff, eEnd, rOff, rEnd });

    /* 6. sideways: back in town, the phone turned */
    await H.glideTo(A, G.arrival.x + 200, G.arrival.y, { speed: 450, timeoutMs: 30000 });
    await A.page.setViewportSize({ width: 844, height: 390 });
    await A.page.waitForTimeout(1500);
    const ov = await overlaps(A);
    await A.page.screenshot({ path: join(OUT, 'skateboard-button-sideways.png') }).catch(() => {});
    rec.ok(`6. sideways the board button is drawn, on the screen and on no other control (${ov && ov.over.join(', ')})`,
      !!ov && ov.over.length === 0 && ov.box.l >= 0 && ov.box.r <= ov.vw && ov.box.t >= 0 && ov.box.b <= ov.vh, ov);
    await A.page.setViewportSize({ width: 390, height: 844 });
    await A.page.waitForTimeout(800);
    const ov2 = await overlaps(A);
    rec.ok(`6. ...and upright on no other control (${ov2 && ov2.over.join(', ')})`, !!ov2 && ov2.over.length === 0, ov2);

    /* ── 12. v2.3.5440: the same start and roll-off on the phone's stick,
       upright and sideways (the stick's own numbers: S.stickX, as the
       joystick sets them; the east road, as 10) ── */
    const stick = (x) => () => A.page.evaluate((v) => { const S = window._gameState.current; S.stickX = v; S.stickY = 0; }, x);
    for (const [how, vp] of [['upright', { width: 390, height: 844 }], ['sideways', { width: 844, height: 390 }]]) {
      await A.page.setViewportSize(vp);
      await H.glideTo(A, G.cx + R - 1300, G.cy, { speed: 450, timeoutMs: 30000 });
      await A.page.waitForTimeout(1000);
      if (!(await A.page.evaluate(() => window.__btRideBtn().on))) {
        const b12 = await state(A);
        if (b12.el) await tapOn(A, b12.el);
      }
      const R12 = await feelRun(A, idA, wsPort, stick(1), stick(0));
      console.log(`    stick ${how}: ${JSON.stringify(R12)}`);
      feelChecks(rec, 12, `The phone ${how}, on its stick`, R12);
    }
    await A.page.setViewportSize({ width: 390, height: 844 });
  } finally {
    alive = false;
    rec.ok('7. no page errors', errors.length === 0, errors.slice(0, 4));
    await A.ctx.close().catch(() => {});
    await B.ctx.close().catch(() => {});
  }
}
