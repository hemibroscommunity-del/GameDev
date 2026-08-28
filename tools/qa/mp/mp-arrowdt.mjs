/* AN ARROW FLIES AT A SPEED, NOT AT A FRAME RATE (v2.3.1770).
 *
 * The defect v2.3.1769 fixed for the player, in the system it deliberately
 * left alone.  `dist += 8` and `life--` were BOTH per frame, so total range
 * came out fps-independent by accident — but the flight TIME did not: on a
 * 144Hz screen the arrow covered its range in 40% of the time and vanished
 * 2.4x sooner.  A shot that led a moving target on a phone missed in front of
 * it on a desktop.
 *
 * So the thing measured here is SPEED — world px per wall-clock second — at
 * two real frame rates, using the same CPU-throttling trick as mp-movespeed.
 * Measuring range instead would pass on the broken build, because range was
 * the half that already worked.
 *
 * The arrow is injected rather than fired: the tick owns _renderX and fills in
 * fields from the caster's loadout (mp-proj's header records what that costs
 * to discover), and what is under test is the integrator, not the bow.
 */
import * as H from './harness.mjs';

const SAMPLE_MS = 400;

async function speedAt(P, cdp, rate) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await P.page.waitForTimeout(600);
  /* Fresh arrow per sample, with a long life so the sample window cannot end
     on an expiry, and dist 0 so it starts at the player rather than mid-flight
     (near the screen edge it would begin PLANTING and stop advancing). */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.player) return;
    S.arrows = [{
      x: S.player.x, y: S.player.y, _renderX: S.player.x, _renderY: S.player.y,
      ang: 0, dist: 0, life: 100000, _released: true, _bornTs: Date.now(),
      _ox: 0, _oy: 0, _rangeMult: 1,
      _isStaffProj: false, isSpecial: false, ice: false, fromGrip: false,
    }];
  });
  const read = () => P.page.evaluate(() => {
    const S = window._gameState.current;
    const a = (S.arrows || [])[0];
    return { dist: a ? a.dist : null, planting: a ? !!a.planting : null,
      frames: S._frameCount || 0, t: performance.now() };
  });
  const t0 = await read();
  await P.page.waitForTimeout(SAMPLE_MS);
  const t1 = await read();
  await P.page.evaluate(() => { const S = window._gameState.current; if (S) S.arrows = []; });
  if (t0.dist == null || t1.dist == null) return null;
  const secs = (t1.t - t0.t) / 1000;
  return {
    pxPerSec: (t1.dist - t0.dist) / secs,
    fps: (t1.frames - t0.frames) / secs,
    planted: t1.planting,
  };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Archer', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);

  let cdp = null;
  try { cdp = await P.page.context().newCDPSession(P.page); } catch (e) { cdp = null; }
  if (!cdp) {
    rec.skip('arrow speed is frame-rate independent', 'no CDP session for CPU throttling');
    await P.ctx.close().catch(() => {});
    return;
  }

  const fast = await speedAt(P, cdp, 1);
  const slow = await speedAt(P, cdp, 6);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});
  rec.ok('both samples produced a flying arrow', !!fast && !!slow, { fast, slow });
  if (!fast || !slow) { await P.ctx.close().catch(() => {}); return; }
  console.log(`    normal:    ${fast.pxPerSec.toFixed(0)} px/s at ${fast.fps.toFixed(1)}fps`);
  console.log(`    throttled: ${slow.pxPerSec.toFixed(0)} px/s at ${slow.fps.toFixed(1)}fps`);

  rec.ok('the arrows actually advanced', fast.pxPerSec > 60 && slow.pxPerSec > 60,
    { fast: fast.pxPerSec, slow: slow.pxPerSec });
  /* ═══ v2.3.2019: A MEASUREMENT THAT CANNOT BE TRUSTED SAYS SO ═══
     This file's method is to throttle the CPU 6x and check the arrow still
     covers the same ground per second.  That only means anything if the
     throttle actually moved the frame rate, which is what the guard below is
     for — and the guard is NOT negotiable, because without a real frame-rate
     difference the ratio assertion holds on any build, fixed or broken.

     But the guard has a second failure mode that looks identical to a
     regression and is not one: when this machine is already saturated, the
     UNTHROTTLED baseline collapses, and a 6x throttle has no headroom left to
     bite.  Measured on the same commit, minutes apart:

         alone            42.4fps -> 18.4fps   ratio 2.3   guard passes
         12 scenarios     12.6fps ->  9.1fps   ratio 1.4   guard FAILS

     Nothing about the product differs between those two lines; the second one
     is a report about the test machine.  Failing there trains the reader to
     discount this file, which is how a real regression gets waved through.

     So a baseline that is itself degraded SKIPS rather than fails or passes.
     25fps sits well clear of both numbers above, and skipping is the honest
     third answer: the run neither confirmed nor refuted anything. */
  const TRUSTWORTHY_FPS = 25;
  if (fast.fps < TRUSTWORTHY_FPS) {
    const why = `machine too loaded to measure: unthrottled baseline was only ${fast.fps.toFixed(1)}fps `
      + `(needs ${TRUSTWORTHY_FPS}+; alone this machine gives ~42), so the 6x throttle had no headroom`;
    rec.skip('the throttle really did change the frame rate (guard)', why);
    rec.skip('an arrow covers the same ground per SECOND at either frame rate', why);
    await P.ctx.close().catch(() => {});
    return;
  }

  /* GUARD: without a real frame-rate difference the comparison below holds on
     any build, fixed or not. */
  rec.ok('the throttle really did change the frame rate (guard)',
    fast.fps > slow.fps * 1.5, { fastFps: +fast.fps.toFixed(1), slowFps: +slow.fps.toFixed(1) });

  const ratio = slow.pxPerSec / fast.pxPerSec;
  rec.ok('an arrow covers the same ground per SECOND at either frame rate',
    ratio > 0.72 && ratio < 1.28,
    { ratio: +ratio.toFixed(3), fast: +fast.pxPerSec.toFixed(0), slow: +slow.pxPerSec.toFixed(0) });

  await P.ctx.close().catch(() => {});
}
