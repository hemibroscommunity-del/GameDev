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
 *   7. no page errors.
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
  /* an idle page logs out after 2 minutes (mp-trapping's keep-alive) */
  let alive = true;
  (async () => { while (alive) { await B.page.keyboard.press('Control').catch(() => {}); for (let i = 0; i < 40 && alive; i++) await B.page.waitForTimeout(500).catch(() => {}); } })();
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
    await A.page.touchscreen.tap((s0.el.l + s0.el.r) / 2, (s0.el.t + s0.el.b) / 2);
    const on = await H.waitFor(A, () => window.__btRideBtn(), (v) => v.on === true, { timeout: 5000, label: 'on the board' }).catch(() => null);
    await A.page.waitForTimeout(600);
    const s1 = await state(A);
    rec.ok(`1. a real tap puts the phone's bro on the board (the worker's word), drawn under him (${JSON.stringify(s1.fx && s1.fx.self)})`,
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
    for (let i = 0; i < 20; i++) { await B.page.waitForTimeout(200); const q = await snd(); if (q.s && q.s.playing && q.s.k === 1 && q.s.gain > 0.01) { rolling = q; break; } rolling = q; }
    await B.page.keyboard.up('d');
    rec.ok(`5b. riding and rolling, the board is heard (playing ${rolling && rolling.s && rolling.s.playing}, gain ${rolling && rolling.s && rolling.s.gain} of ${rolling && rolling.s && rolling.s.vol})`,
      !!(rolling && rolling.s && rolling.s.playing && rolling.s.k === 1 && rolling.s.gain > 0.01), rolling);
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
  } finally {
    alive = false;
    rec.ok('7. no page errors', errors.length === 0, errors.slice(0, 4));
    await A.ctx.close().catch(() => {});
    await B.ctx.close().catch(() => {});
  }
}
