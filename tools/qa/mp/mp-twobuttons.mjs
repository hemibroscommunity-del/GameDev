/* ═══ v2.3.6541: THE TWO BUTTONS, PLAYED ON A PHONE (card CT; `?manual=5`, a trial) ═══
 *
 * The owner, 2026-11-23: "The left joystick rotates the character
 * directionally if pressed at or below about 30% from center and begin
 * walking in the pointed direction if moved further."  Played with REAL
 * touches (the browser's own touch input, CDP Input.dispatchTouchEvent), in
 * the Wheel's BroTown, upright AND sideways, each touch landing at the left
 * disc's centre:
 *
 * PART 1 (PR 2, tag 6541): THE LEFT STICK
 *   1a. `?manual=5` plays the two buttons, and the disc draws the turn's
 *       border as a ring at 30% of its drawn radius;
 *   1b. a thumb at 20% of the drawn radius, pointed west, TURNS the body
 *       west (the facing drawn, and the facing angle) and does not walk;
 *   1c. lifted: the stick at rest, the body still faces west (the turn is a
 *       facing, not a pose);
 *   1d. a thumb at 70% WALKS that way;
 *   1e. lifted: at rest, the walk stopped;
 *   1f. a fast flick (120 px) is the dodge roll (the swipe judged first;
 *       its four touches sent to the zone's listeners in one task: see 1f);
 *   1g. no page errors.
 *
 * Today's stick with the mode off is played by mp-sprint (the thumb and the
 * button together) and mp-heldcombat (the default, mode 4).
 */
import * as H from './harness.mjs';
export const lane = 'full';

const UPRIGHT = { width: 390, height: 844 };
const SIDEWAYS = { width: 844, height: 390 };

/* the left disc's drawn box and the turn ring's */
const DISC = (P) => P.page.evaluate(() => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height }; };
  return { base: r(document.querySelector('.bt-joystick-base')), ring: r(document.querySelector('[data-turnring]')) };
});

/* what the stick, the walk and the facing are now */
const STICK = (P) => H.readState(P, (S) => ({
  phase: S._stickPhase || 'rest', sx: S.stickX || 0, sy: S.stickY || 0,
  x: S.player.x, y: S.player.y, facing: S._renderFacing || null,
  ang: S._facingAngle, roll: !!S._dodgeRoll,
}));

export async function run({ browser, wsPort, webPort, rec }) {
  const players = [];
  const errs = [];
  try {
    for (const [label, viewport] of [['upright', UPRIGHT], ['sideways', SIDEWAYS]]) {
      const P = await H.newPlayer(browser, { name: label === 'upright' ? 'Twobro' : 'Sidebro', wsPort, webPort, viewport, touch: true, dpr: 3, world: 'wheel', query: 'manual=5' });
      players.push(P);
      P.page.on('pageerror', (e) => errs.push(label + ': ' + String((e && e.message) || e).slice(0, 200)));
      await H.enterWorld(P);
      const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
        { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
      rec.ok(`${label}: in the Wheel (guard)`, !!inW, inW);
      if (!inW) continue;
      await P.page.waitForTimeout(2000);
      const cdp = await P.ctx.newCDPSession(P.page);
      const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });

      /* 1a */
      const mode = await P.page.evaluate(() => window.__btManual.mode());
      const D = await DISC(P);
      const R = D.base ? D.base.w / 2 : 0;
      rec.ok(`1a. ${label}: \`?manual=5\` plays the two buttons (mode ${mode}); the ring at 30% of the drawn radius (${D.ring && D.ring.w / 2} of ${R} px)`,
        mode === 5 && !!D.ring && R > 0 && Math.abs(D.ring.w / 2 - 0.3 * R) < 1.5 && Math.abs(D.ring.x - D.base.x) < 1 && Math.abs(D.ring.y - D.base.y) < 1, D);
      if (!D.base) continue;
      const c = { x: D.base.x, y: D.base.y, id: 1 };

      /* 1b: 20% west, held */
      await touch('touchStart', [c]);
      await P.page.waitForTimeout(80);
      await touch('touchMove', [{ x: c.x - 0.2 * R, y: c.y, id: 1 }]);
      const t0 = await STICK(P);
      /* the body slews to its facing a share a frame (visualSystems), and this
         box draws a few frames a second: wait on the renderer, not a clock (TRAPS 200) */
      await H.waitFor(P, (S) => S._renderFacing, (v) => v === 'west', { timeout: 10000, label: 'facing west' }).catch(() => null);
      const t1 = await STICK(P);
      const moved = Math.hypot(t1.x - t0.x, t1.y - t0.y);
      rec.ok(`1b. ${label}: a thumb at 20% turns the body west (${t1.phase}, faces ${t1.facing}, angle ${t1.ang && t1.ang.toFixed(2)}) and does not walk (${moved.toFixed(1)} px)`,
        t1.phase === 'turn' && t1.sx === 0 && t1.sy === 0 && t1.facing === 'west' && Math.abs(Math.abs(t1.ang) - Math.PI) < 0.35 && moved < 1, { t0, t1 });

      /* 1c */
      await touch('touchEnd', [{ x: c.x - 0.2 * R, y: c.y, id: 1 }]);
      await P.page.waitForTimeout(700);
      const t2 = await STICK(P);
      rec.ok(`1c. ${label}: lifted, the stick at rest and the body still faces west (${t2.facing})`, t2.phase === 'rest' && t2.facing === 'west', t2);

      /* 1d: 70% east, held (a slow push: not a swipe) */
      await touch('touchStart', [c]);
      await P.page.waitForTimeout(80);
      for (let k = 1; k <= 7; k++) { await touch('touchMove', [{ x: c.x + 0.1 * k * R, y: c.y, id: 1 }]); await P.page.waitForTimeout(40); }
      const w0 = await STICK(P);
      await P.page.waitForTimeout(900);
      const w1 = await STICK(P);
      const walked = Math.hypot(w1.x - w0.x, w1.y - w0.y);
      rec.ok(`1d. ${label}: a thumb at 70% walks that way (${w1.phase}, stick ${w1.sx.toFixed(2)}, ${walked.toFixed(1)} px)`,
        w1.phase === 'walk' && w1.sx > 0.4 && Math.abs(w1.sy) < 0.01 && (walked > 4 || w1.x > w0.x), { w0, w1 });

      /* 1e */
      await touch('touchEnd', [{ x: c.x + 0.7 * R, y: c.y, id: 1 }]);
      await P.page.waitForTimeout(300);
      const e0 = await STICK(P);
      await P.page.waitForTimeout(500);
      const e1 = await STICK(P);
      rec.ok(`1e. ${label}: lifted, at rest and the walk stopped`, e1.phase === 'rest' && e1.sx === 0 && e1.sy === 0 && Math.hypot(e1.x - e0.x, e1.y - e0.y) < 2, { e0, e1 });

      /* 1f: a fast flick */
      await P.page.waitForTimeout(1200);
      const before = await P.page.evaluate(() => Date.now());
      /* The one gesture NOT sent through CDP: on this box each CDP touch waits
         behind a frame of a few hundred ms, so a flick's release lands past the
         swipe's 300 ms (and moves sent with no frame between are coalesced into
         a tap).  So the flick's four touches go to the movement zone's own
         listeners in one task, at the disc's centre, 120 px in about 40 ms of
         the page's clock (TRAPS 200: time by the page, not by this script). */
      await P.page.evaluate(async ({ x, y }) => {
        const el = document.querySelector('[data-joyzone="L"]');
        const mk = (t, cx) => new TouchEvent(t, { bubbles: true, cancelable: true,
          touches: t === 'touchend' ? [] : [new Touch({ identifier: 61, target: el, clientX: cx, clientY: y })],
          changedTouches: [new Touch({ identifier: 61, target: el, clientX: cx, clientY: y })] });
        const until = (ms) => { const e = performance.now() + ms; while (performance.now() < e) { /* the page's own clock */ } };
        el.dispatchEvent(mk('touchstart', x));
        for (const k of [40, 80, 120]) { until(12); el.dispatchEvent(mk('touchmove', x + k)); }
        el.dispatchEvent(mk('touchend', x + 120));
      }, { x: c.x, y: c.y });
      /* the roll's own stamp (game/dodge.js), not the roll itself: it is over in a few of this box's frames */
      await P.page.waitForTimeout(600);
      const f = await H.readState(P, (S) => ({ flash: S._dodgeFlash || 0, stamina: S.rpg && S.rpg.stamina }));
      rec.ok(`1f. ${label}: a fast flick is the dodge roll (the swipe judged first)`, f.flash >= before, { before, ...f });
      await P.page.waitForTimeout(800);
    }
    rec.ok('1g. no page errors', errs.length === 0, errs.slice(0, 4));
  } finally {
    for (const P of players) await P.ctx.close().catch(() => {});
  }
}
