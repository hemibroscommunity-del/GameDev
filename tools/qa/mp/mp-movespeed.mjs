/* WALKING SPEED DOES NOT DEPEND ON THE SCREEN (v2.3.1769).
 *
 * Owner, on desktop: "the player movement speed was way higher."  Movement was
 * integrated per FRAME with no time term, so speed was proportional to refresh
 * rate — 2.4x on a 144Hz monitor, and half speed on a phone dipping to 30fps.
 *
 * Testing this needs the frame rate to actually CHANGE, so it does: the same
 * walk is measured twice, once normally and once with the renderer's CPU
 * throttled through CDP, and the two distances are compared over WALL CLOCK
 * time.  Anything less (counting frames, reading the speed constant) would be
 * measuring the fix's own arithmetic rather than its effect.
 *
 * Distance is read from S.player, not from the worker: this is about what the
 * client's own integrator does, and involving the network would add a second
 * variable to a two-sample comparison.
 */
import * as H from './harness.mjs';

const WALK_MS = 2500;

/* ═══ v2.3.2078: A LANE WITH ROOM TO WALK DOWN IT ═══
   The comment below has always said "re-centre", and nothing ever did.  Both
   samples started wherever the previous one stopped, walking east from the
   plaza spawn — and since v2.3.2069 made every town prop solid, east of the
   spawn is the east bench.  The sweep measured 129px on the first sample
   (the player pulled up at the bench's west edge, x 944) and 0px on the
   second, and both assertions failed on a build whose movement was fine.

   x 300..1450 at y 1140 is the longest clear east-west run in town:
   walkable end to end on town_v17's grid and more than 14px clear of all
   twelve prop footprints, checked against both.  2.5s at 7.6px/frame and
   60fps is ~1140px, which fits inside it with room to spare — and BOTH
   samples now start at the west end, so the slow one is not measuring the
   distance the fast one left over. */
const LANE = { x: 300, y: 1140 };

async function walkAndMeasure(P, cdp, throttleRate) {
  /* Back to the lane head BEFORE the throttle goes on: hopTo needs a
     responsive page (100px steps, 260ms apart) and a 6x-throttled client
     takes the trip several times over. */
  await H.hopTo(P, LANE.x, LANE.y);
  if (cdp) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttleRate });
  /* Settle so both samples start from rest, and let the throttle take
     effect before the clock starts. */
  await P.page.waitForTimeout(700);
  const before = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { x: S.player.x, y: S.player.y, frames: S._frameCount || 0, t: performance.now() };
  });
  await P.page.keyboard.down('d');
  await P.page.waitForTimeout(WALK_MS);
  await P.page.keyboard.up('d');
  const after = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { x: S.player.x, y: S.player.y, frames: S._frameCount || 0, t: performance.now() };
  });
  const secs = (after.t - before.t) / 1000;
  return {
    dist: Math.hypot(after.x - before.x, after.y - before.y),
    fps: (after.frames - before.frames) / secs,
    secs,
  };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Walker', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);

  let cdp = null;
  try { cdp = await P.page.context().newCDPSession(P.page); }
  catch (e) { cdp = null; }
  if (!cdp) {
    rec.skip('walking speed is frame-rate independent', 'no CDP session for CPU throttling');
    await P.ctx.close().catch(() => {});
    return;
  }

  const fast = await walkAndMeasure(P, cdp, 1);
  const slow = await walkAndMeasure(P, cdp, 6);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});
  console.log(`    normal: ${fast.dist.toFixed(1)}px in ${fast.secs.toFixed(2)}s at ${fast.fps.toFixed(1)}fps`);
  console.log(`    throttled: ${slow.dist.toFixed(1)}px in ${slow.secs.toFixed(2)}s at ${slow.fps.toFixed(1)}fps`);

  rec.ok('the player actually walked in both samples',
    fast.dist > 40 && slow.dist > 40, { fast: fast.dist, slow: slow.dist });

  /* GUARD, and the one that makes this test mean anything: the throttle has to
     have actually changed the frame rate.  If both samples ran at the same fps
     the comparison below is satisfied by ANY build, fixed or not. */
  rec.ok('the throttle really did change the frame rate (guard)',
    fast.fps > slow.fps * 1.5, { fastFps: +fast.fps.toFixed(1), slowFps: +slow.fps.toFixed(1) });

  /* THE PROPERTY.  Same wall-clock seconds of holding the key, so the distance
     should match regardless of how many frames the machine managed.  Generous
     band: a throttled headless box has ragged frame pacing, and the clamp
     deliberately refuses to compensate for very long stalls. */
  const ratio = slow.dist / fast.dist;
  rec.ok('the same walk covers the same ground at a different frame rate',
    ratio > 0.72 && ratio < 1.28,
    { ratio: +ratio.toFixed(3), fast: +fast.dist.toFixed(1), slow: +slow.dist.toFixed(1),
      fastFps: +fast.fps.toFixed(1), slowFps: +slow.fps.toFixed(1) });

  await P.ctx.close().catch(() => {});
}
