/* EVERY OTHER ENTITY MOVES AT A SPEED, NOT AT A FRAME RATE (v2.3.1771).
 *
 * v2.3.1769/1770 made the PLAYER and the PROJECTILES frame-rate independent.
 * Everything else on screen was still integrated per frame: the monster
 * interpolator (25% of the gap each frame), the town NPCs (their walk AND
 * their `-= 16.7` timers), remote players' dead reckoning, and the player's
 * own facing turn rate.  On a 144Hz monitor all of it ran 2.4x faster than
 * on the phone the game is built for — a large part of "the desktop version
 * was COMPLETELY different".
 *
 * Two things are measured here, both against a real worker at two real frame
 * rates (CPU throttling, the same trick mp-movespeed/mp-arrowdt use):
 *
 *   1. the monster INTERPOLATOR — how fast renderX closes a gap to the
 *      authoritative position, expressed as a decay constant per SECOND.
 *      Measured on an injected monster whose id the server has never heard
 *      of, so its x/y hold still for the whole sample: with a live monster
 *      the target moves under the measurement and the number means nothing.
 *
 *   2. the NPC WANDER TIMER — moveTimer counts down in wall-clock ms, so the
 *      same countdown must take the same wall-clock time at either rate.
 *      This is the half a position check would miss: an NPC that walks at
 *      the right speed but re-picks its target twice as often is still a
 *      different town.
 */
import * as H from './harness.mjs';

const GAP = 60;          /* under the interpolator's 80px snap threshold */
const WINDOW_MS = 220;

/* Decay constant per second: gap(t) = gap(0) * e^(-k t).  Frame-rate
   INDEPENDENT smoothing gives the same k at any fps; the per-frame version
   gives k proportional to fps. */
async function interpDecayAt(P, cdp, rate) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await P.page.waitForTimeout(600);
  const start = await P.page.evaluate((gap) => {
    const S = window._gameState && window._gameState.current;
    const m = (S.monsters || []).find((x) => x.id === 'entitydt-1');
    if (!m) return null;
    S._serverMonsters = true;   /* see the note at the mint below */
    m.x = S.player.x + 200; m.y = S.player.y;   /* parked, and far enough not to be swung at */
    m.renderX = m.x - gap; m.renderY = m.y;
    m._stunUntil = 0; m._kbUntil = 0;
    return { gap, frames: S._frameCount || 0, t: performance.now() };
  }, GAP);
  if (!start) return null;
  await P.page.waitForTimeout(WINDOW_MS);
  const end = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = (S.monsters || []).find((x) => x.id === 'entitydt-1');
    if (!m) return null;
    return { gap: Math.abs(m.x - m.renderX), frames: S._frameCount || 0, t: performance.now() };
  });
  if (!end || !(end.gap > 0)) return null;
  const secs = (end.t - start.t) / 1000;
  return {
    k: -Math.log(end.gap / start.gap) / secs,
    fps: (end.frames - start.frames) / secs,
    remaining: end.gap,
  };
}

/* moveTimer is a millisecond countdown and the walk is px per frame, so
   ms-drained-per-second and px-walked-per-second are the two quantities that
   must not depend on fps.
   The FIRST version of this parked moveTimer high and measured it alone, and
   read a NEGATIVE drain: an NPC standing within 4px of its wander target
   re-rolls the target AND the timer every frame, so the countdown kept
   jumping back up.  Parking the target ~300px away (further than the ~21px
   this window covers) is what makes both numbers mean anything. */
async function npcRateAt(P, cdp, rate) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await P.page.waitForTimeout(600);
  const park = () => P.page.evaluate(() => {
    const S = window._gameState.current;
    const n = (S.npcs || [])[0];
    if (!n) return null;
    n.moveTimer = 900000;
    n.targetX = n.x + 300;
    n.targetY = n.y;
    return { mt: n.moveTimer, x: n.x, y: n.y, frames: S._frameCount || 0, t: performance.now() };
  });
  const read = () => P.page.evaluate(() => {
    const S = window._gameState.current;
    const n = (S.npcs || [])[0];
    return n ? { mt: n.moveTimer, x: n.x, y: n.y, frames: S._frameCount || 0, t: performance.now() } : null;
  });
  const t0 = await park();
  if (!t0) return null;
  await P.page.waitForTimeout(WINDOW_MS * 2);
  const t1 = await read();
  if (!t1) return null;
  const secs = (t1.t - t0.t) / 1000;
  const walked = Math.sqrt((t1.x - t0.x) ** 2 + (t1.y - t0.y) ** 2);
  return {
    msPerSec: (t0.mt - t1.mt) / secs,
    pxPerSec: walked / secs,
    fps: (t1.frames - t0.frames) / secs,
  };
}

/* A REMOTE PLAYER is dead-reckoned from _vx/_vy, which arrive as px per 60Hz
   frame.  Injected into S.others rather than driven by a second browser: what
   is under test is the integrator, and a real peer's velocity would be
   changing under the sample.  The peer is parked 5px from its render position
   (inside the 100px snap threshold, past the 0.5px idle-settle) so the moving
   branch runs and the gap term stays small next to the velocity term. */
async function remoteSpeedAt(P, cdp, rate) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await P.page.waitForTimeout(600);
  const t0 = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.player) return null;
    S.others = S.others || {};
    S.others['entitydt-peer'] = {
      id: 'entitydt-peer', name: 'Peer', x: S.player.x + 5, y: S.player.y,
      renderX: S.player.x, renderY: S.player.y,
      _vx: 2, _vy: 0, _smoothVx: 2, _smoothVy: 0,
    };
    return { rx: S.others['entitydt-peer'].renderX, frames: S._frameCount || 0, t: performance.now() };
  });
  if (!t0) return null;
  await P.page.waitForTimeout(WINDOW_MS);
  const t1 = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const o = S.others && S.others['entitydt-peer'];
    if (!o) return null;
    /* Keep the target ahead of the render position so the peer never settles
       and the moving branch keeps running for the whole window. */
    o.x = o.renderX + 5; o.y = o.renderY; o._vx = 2; o._vy = 0;
    return { rx: o.renderX, frames: S._frameCount || 0, t: performance.now() };
  });
  if (!t1) return null;
  const secs = (t1.t - t0.t) / 1000;
  await P.page.evaluate(() => { const S = window._gameState.current; if (S && S.others) delete S.others['entitydt-peer']; });
  return { pxPerSec: (t1.rx - t0.rx) / secs, fps: (t1.frames - t0.frames) / secs };
}

/* The player's own facing angle is what melee swings and aim come FROM, so
   its turn rate is gameplay, not decoration.  Measured as a decay constant
   the same way the monster interpolator is. */
async function turnDecayAt(P, cdp, rate) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await P.page.waitForTimeout(600);
  const t0 = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S) return null;
    S._facingAngle = 0;
    S._targetFacingAngle = Math.PI / 2;
    return { gap: Math.PI / 2, frames: S._frameCount || 0, t: performance.now() };
  });
  if (!t0) return null;
  await P.page.waitForTimeout(140);
  const t1 = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { gap: Math.abs((S._targetFacingAngle || 0) - (S._facingAngle || 0)),
      frames: S._frameCount || 0, t: performance.now() };
  });
  if (!t1 || !(t1.gap > 0)) return null;
  const secs = (t1.t - t0.t) / 1000;
  return { k: -Math.log(t1.gap / t0.gap) / secs, fps: (t1.frames - t0.frames) / secs, remaining: t1.gap };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1800);

  let cdp = null;
  try { cdp = await P.page.context().newCDPSession(P.page); } catch (e) { cdp = null; }
  if (!cdp) {
    rec.skip('entity motion is frame-rate independent', 'no CDP session for CPU throttling');
    await P.ctx.close().catch(() => {});
    return;
  }

  /* Minted through the game's own createMonster (see mp-spawnfx for why a
     hand-rolled object is worse), with an id no server tick will match. */
  const minted = await P.page.evaluate(() => {
    const f = window._gameFns;
    const S = window._gameState && window._gameState.current;
    if (!f || !f.createMonster || !S || !S.player) return 0;
    const arch = Object.keys(f.ARCHETYPES || {})[0];
    if (!arch) return 0;
    const m = f.createMonster('entitydt-1', arch, 3, S.player.x + 200, S.player.y, null);
    if (!m) return 0;
    m.alive = true;
    S.monsters = (S.monsters || []).concat([m]);
    /* The interpolator only runs under `_serverMonsters`, and the harness
       stands in TOWN — a safe zone the worker sends no monsters for, so the
       flag is off here and the local AI would run instead.  Every combat
       zone in production has it on, so it is set explicitly rather than
       walking a spoke and making this a test of the route.  The injected id
       matches no server monster, so nothing else is affected by the flag and
       the target position holds still for the sample.  The check below is
       still a guard: it proves the code under test is the interpolator. */
    S._serverMonsters = true;
    const before = { renderX: m.renderX, x: m.x };
    return (S._serverMonsters && before) ? 2 : 1;
  });
  rec.ok('the injected monster runs the SERVER-interpolated path (guard)', minted === 2, minted);
  if (!minted) { await P.ctx.close().catch(() => {}); return; }

  const fast = await interpDecayAt(P, cdp, 1);
  const slow = await interpDecayAt(P, cdp, 6);
  rec.ok('both interpolation samples produced a shrinking gap', !!fast && !!slow, { fast, slow });
  if (fast && slow) {
    console.log(`    interp: k=${fast.k.toFixed(1)}/s at ${fast.fps.toFixed(1)}fps  vs  k=${slow.k.toFixed(1)}/s at ${slow.fps.toFixed(1)}fps`);
    rec.ok('the throttle really did change the frame rate (guard)',
      fast.fps > slow.fps * 1.5, { fastFps: +fast.fps.toFixed(1), slowFps: +slow.fps.toFixed(1) });
    rec.ok('the gap actually closed in both samples (guard)',
      fast.remaining < GAP && slow.remaining < GAP, { fast: fast.remaining, slow: slow.remaining });
    const ratio = slow.k / fast.k;
    rec.ok('a monster catches up to the server at the same rate per SECOND',
      ratio > 0.7 && ratio < 1.4,
      { ratio: +ratio.toFixed(3), fastK: +fast.k.toFixed(1), slowK: +slow.k.toFixed(1) });
  }

  const nFast = await npcRateAt(P, cdp, 1);
  const nSlow = await npcRateAt(P, cdp, 6);
  rec.ok('both NPC-timer samples read a countdown', !!nFast && !!nSlow, { nFast, nSlow });
  if (nFast && nSlow) {
    console.log(`    npc timer: ${nFast.msPerSec.toFixed(0)} ms/s at ${nFast.fps.toFixed(1)}fps  vs  ${nSlow.msPerSec.toFixed(0)} ms/s at ${nSlow.fps.toFixed(1)}fps`);
    console.log(`    npc walk:  ${nFast.pxPerSec.toFixed(0)} px/s  vs  ${nSlow.pxPerSec.toFixed(0)} px/s`);
    rec.ok('the NPC timer actually ran down, and it walked (guard)',
      nFast.msPerSec > 200 && nSlow.msPerSec > 200 && nFast.pxPerSec > 8 && nSlow.pxPerSec > 8,
      { nFast, nSlow });
    const nRatio = nSlow.msPerSec / nFast.msPerSec;
    rec.ok('an NPC wander timer drains at the same ms per SECOND',
      nRatio > 0.7 && nRatio < 1.4,
      { ratio: +nRatio.toFixed(3), fast: +nFast.msPerSec.toFixed(0), slow: +nSlow.msPerSec.toFixed(0) });
    const wRatio = nSlow.pxPerSec / nFast.pxPerSec;
    rec.ok('an NPC covers the same ground per SECOND at either frame rate',
      wRatio > 0.7 && wRatio < 1.4,
      { ratio: +wRatio.toFixed(3), fast: +nFast.pxPerSec.toFixed(0), slow: +nSlow.pxPerSec.toFixed(0) });
  }

  const rFast = await remoteSpeedAt(P, cdp, 1);
  const rSlow = await remoteSpeedAt(P, cdp, 6);
  rec.ok('both remote-player samples advanced', !!rFast && !!rSlow, { rFast, rSlow });
  if (rFast && rSlow) {
    console.log(`    remote:    ${rFast.pxPerSec.toFixed(0)} px/s at ${rFast.fps.toFixed(1)}fps  vs  ${rSlow.pxPerSec.toFixed(0)} px/s at ${rSlow.fps.toFixed(1)}fps`);
    rec.ok('the remote actually moved (guard)',
      rFast.pxPerSec > 20 && rSlow.pxPerSec > 20, { rFast: rFast.pxPerSec, rSlow: rSlow.pxPerSec });
    const rRatio = rSlow.pxPerSec / rFast.pxPerSec;
    rec.ok('a remote player is dead-reckoned at the same px per SECOND',
      rRatio > 0.7 && rRatio < 1.4,
      { ratio: +rRatio.toFixed(3), fast: +rFast.pxPerSec.toFixed(0), slow: +rSlow.pxPerSec.toFixed(0) });
  }

  const tFast = await turnDecayAt(P, cdp, 1);
  const tSlow = await turnDecayAt(P, cdp, 6);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});
  rec.ok('both facing samples turned', !!tFast && !!tSlow, { tFast, tSlow });
  if (tFast && tSlow) {
    console.log(`    facing:    k=${tFast.k.toFixed(1)}/s at ${tFast.fps.toFixed(1)}fps  vs  k=${tSlow.k.toFixed(1)}/s at ${tSlow.fps.toFixed(1)}fps`);
    rec.ok('the facing angle actually closed (guard)',
      tFast.remaining < Math.PI / 2 && tSlow.remaining < Math.PI / 2,
      { fast: tFast.remaining, slow: tSlow.remaining });
    const tRatio = tSlow.k / tFast.k;
    rec.ok('the player turns toward a heading at the same rate per SECOND',
      tRatio > 0.7 && tRatio < 1.4,
      { ratio: +tRatio.toFixed(3), fastK: +tFast.k.toFixed(1), slowK: +tSlow.k.toFixed(1) });
  }

  await P.ctx.close().catch(() => {});
}
