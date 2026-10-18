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

/* ═══ v2.3.3381: PER SECOND OF GAME TIME, NOT OF THE WALL CLOCK ═══
   The game steps each frame by its real length but never more than 3/60 s
   (BroTown.jsx `_dtScale`, clamped to 3), so below 20 fps the whole world
   slows rather than jumps, by design: a tab that stalls must not teleport
   anything through a wall.  This box draws ~24 fps unthrottled and ~10-12
   at the 6x throttle, under that line, so every rate below came out at half
   (the sweep of 2026-10-18: 0.51-0.57, "fail") -- exactly what the cap
   predicts.  So each sample also sums the game time its frames were owed
   (`gameClock`, off the same animation frames the game runs on), and a rate
   is judged against the two samples' game time, and must fit it better
   than it fits their FRAME counts -- the bug this file exists for, a step
   per frame (`judge`).  Mirrors mp-movespeed.
   EVERY SAMPLE IS TIMED BY ITS FRAMES (document.timeline.currentTime: the
   last frame drawn, which is what an evaluate between frames reads), not by
   performance.now(): these windows are 140-440 ms, two to four frames at the
   throttle, and a clock that starts and stops between frames counts part of
   a frame nobody stepped at each end -- 20-35% off, measured.  From the
   frame before the sample to the last frame in it, the change, the wall
   time and the game time all cover the same frames. */
const CAP_MS = 50;
const gameClock = () => {
  window.__edtGame = 0;
  window.__edtLast = document.timeline.currentTime || performance.now();
  window.__edtOn = true;
  const tick = (t) => {
    if (!window.__edtOn) return;
    const d = t - window.__edtLast;
    window.__edtLast = t;
    if (d > 0) window.__edtGame += Math.min(window.__edtCap || 50, d);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
/* The ratio of two samples' per-second rates against what game time
   predicts (`expected`) and what a step per frame would give (`perFrame`).
   When both samples ran under the cap the two predictions are one number
   (a capped frame IS 50 ms of game time), and nothing can tell them apart:
   `apart` says so, and the caller skips rather than guesses. */
function judge(fastRate, slowRate, fast, slow) {
  const ratio = slowRate / fastRate;
  const expected = (fast.gameRate > 0 && slow.gameRate > 0) ? slow.gameRate / fast.gameRate : 1;
  const perFrame = fast.fps > 0 ? slow.fps / fast.fps : 1;
  const apart = Math.abs(expected - perFrame) / expected > 0.08;
  const ok = Math.abs(ratio / expected - 1) < 0.3 && Math.abs(ratio - expected) < Math.abs(ratio - perFrame);
  return { ok, apart, ratio: +ratio.toFixed(3), expected: +expected.toFixed(3), perFrame: +perFrame.toFixed(3) };
}
const TOO_LOADED = 'machine too loaded to tell a per-second rate from a per-frame one: both samples ran under the '
  + '20 fps line, where a frame is always 3/60 s of game time';

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
    (0, eval)(window.__edtClockSrc)();   /* v2.3.3381: the game clock (gameClock) */
    return { gap, frames: S._frameCount || 0, t: (document.timeline.currentTime || performance.now()) };
  }, GAP);
  if (!start) return null;
  await P.page.waitForTimeout(WINDOW_MS);
  const end = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = (S.monsters || []).find((x) => x.id === 'entitydt-1');
    if (!m) return null;
    window.__edtOn = false;
    return { gap: Math.abs(m.x - m.renderX), frames: S._frameCount || 0, t: (document.timeline.currentTime || performance.now()), game: window.__edtGame };
  });
  if (!end || !(end.gap > 0)) return null;
  const secs = (end.t - start.t) / 1000;
  if (!(secs > 0)) return null;   /* v2.3.3381: no frame drawn in the window */
  return {
    k: -Math.log(end.gap / start.gap) / secs,
    fps: (end.frames - start.frames) / secs,
    gameRate: (end.game || 0) / 1000 / secs,
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
    (0, eval)(window.__edtClockSrc)();   /* v2.3.3381: the game clock (gameClock) */
    return { mt: n.moveTimer, x: n.x, y: n.y, frames: S._frameCount || 0, t: (document.timeline.currentTime || performance.now()) };
  });
  const read = () => P.page.evaluate(() => {
    const S = window._gameState.current;
    const n = (S.npcs || [])[0];
    window.__edtOn = false;
    return n ? { mt: n.moveTimer, x: n.x, y: n.y, frames: S._frameCount || 0, t: (document.timeline.currentTime || performance.now()), game: window.__edtGame } : null;
  });
  const t0 = await park();
  if (!t0) return null;
  await P.page.waitForTimeout(WINDOW_MS * 2);
  const t1 = await read();
  if (!t1) return null;
  const secs = (t1.t - t0.t) / 1000;
  if (!(secs > 0)) return null;   /* v2.3.3381: no frame drawn in the window */
  const walked = Math.sqrt((t1.x - t0.x) ** 2 + (t1.y - t0.y) ** 2);
  return {
    msPerSec: (t0.mt - t1.mt) / secs,
    pxPerSec: walked / secs,
    fps: (t1.frames - t0.frames) / secs,
    gameRate: (t1.game || 0) / 1000 / secs,
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
    (0, eval)(window.__edtClockSrc)();   /* v2.3.3381: the game clock (gameClock) */
    return { rx: S.others['entitydt-peer'].renderX, frames: S._frameCount || 0, t: (document.timeline.currentTime || performance.now()) };
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
    window.__edtOn = false;
    return { rx: o.renderX, frames: S._frameCount || 0, t: (document.timeline.currentTime || performance.now()), game: window.__edtGame };
  });
  if (!t1) return null;
  const secs = (t1.t - t0.t) / 1000;
  if (!(secs > 0)) return null;   /* v2.3.3381: no frame drawn in the window */
  await P.page.evaluate(() => { const S = window._gameState.current; if (S && S.others) delete S.others['entitydt-peer']; });
  return { pxPerSec: (t1.rx - t0.rx) / secs, fps: (t1.frames - t0.frames) / secs, gameRate: (t1.game || 0) / 1000 / secs };
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
    (0, eval)(window.__edtClockSrc)();   /* v2.3.3381: the game clock (gameClock) */
    return { gap: Math.PI / 2, frames: S._frameCount || 0, t: (document.timeline.currentTime || performance.now()) };
  });
  if (!t0) return null;
  await P.page.waitForTimeout(140);
  const t1 = await P.page.evaluate(() => {
    const S = window._gameState.current;
    window.__edtOn = false;
    return { gap: Math.abs((S._targetFacingAngle || 0) - (S._facingAngle || 0)),
      frames: S._frameCount || 0, t: (document.timeline.currentTime || performance.now()), game: window.__edtGame };
  });
  if (!t1 || !(t1.gap > 0)) return null;
  const secs = (t1.t - t0.t) / 1000;
  if (!(secs > 0)) return null;   /* v2.3.3381: no frame drawn in the window */
  return { k: -Math.log(t1.gap / t0.gap) / secs, fps: (t1.frames - t0.frames) / secs,
    gameRate: (t1.game || 0) / 1000 / secs, remaining: t1.gap };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1800);
  /* v2.3.3381: the game clock's source, handed to the page once and started
     by each sample (gameClock above) */
  await P.page.evaluate(({ src, cap }) => { window.__edtClockSrc = src; window.__edtCap = cap; },
    { src: '(' + gameClock.toString() + ')', cap: CAP_MS });

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
    console.log(`    interp: k=${fast.k.toFixed(1)}/s at ${fast.fps.toFixed(1)}fps  vs  k=${slow.k.toFixed(1)}/s at ${slow.fps.toFixed(1)}fps (game time ${fast.gameRate.toFixed(2)} / ${slow.gameRate.toFixed(2)} of the clock)`);
    /* v2.3.2020: a degraded BASELINE skips rather than fails — the same rule
       and the same 25fps line as mp-arrowdt (v2.3.2019), which this file's
       guard is a copy of.  Throttling 6x only proves anything if the
       unthrottled sample had somewhere to fall from; when this machine is
       saturated the baseline collapses on its own and the throttle has no
       headroom.  Measured here at twelve scenarios at once: 11.1fps against
       8.7fps, ratio 1.28, guard red — and the ratio assertion below went red
       WITH it, reporting 0.696 as though the game had changed.  Alone, the
       same commit passes.  Neither number was about the product. */
    const TRUSTWORTHY_FPS = 25;
    if (fast.fps < TRUSTWORTHY_FPS) {
      const why = `machine too loaded to measure: unthrottled baseline was only ${fast.fps.toFixed(1)}fps `
        + `(needs ${TRUSTWORTHY_FPS}+), so the 6x throttle had no headroom`;
      rec.skip('the throttle really did change the frame rate (guard)', why);
      rec.skip('a monster catches up to the server at the same rate per SECOND', why);
    } else {
      rec.ok('the throttle really did change the frame rate (guard)',
        fast.fps > slow.fps * 1.5, { fastFps: +fast.fps.toFixed(1), slowFps: +slow.fps.toFixed(1) });
      rec.ok('the gap actually closed in both samples (guard)',
        fast.remaining < GAP && slow.remaining < GAP, { fast: fast.remaining, slow: slow.remaining });
      /* v2.3.3381: per second of game time (judge, above) */
      const j = judge(fast.k, slow.k, fast, slow);
      if (!j.apart) rec.skip('a monster catches up to the server at the same rate per SECOND', TOO_LOADED);
      else rec.ok('a monster catches up to the server at the same rate per SECOND', j.ok,
        { ...j, fastK: +fast.k.toFixed(1), slowK: +slow.k.toFixed(1) });
    }
  }

  const nFast = await npcRateAt(P, cdp, 1);
  const nSlow = await npcRateAt(P, cdp, 6);
  rec.ok('both NPC-timer samples read a countdown', !!nFast && !!nSlow, { nFast, nSlow });
  if (nFast && nSlow) {
    console.log(`    npc timer: ${nFast.msPerSec.toFixed(0)} ms/s at ${nFast.fps.toFixed(1)}fps  vs  ${nSlow.msPerSec.toFixed(0)} ms/s at ${nSlow.fps.toFixed(1)}fps (game time ${nFast.gameRate.toFixed(2)} / ${nSlow.gameRate.toFixed(2)} of the clock)`);
    console.log(`    npc walk:  ${nFast.pxPerSec.toFixed(0)} px/s  vs  ${nSlow.pxPerSec.toFixed(0)} px/s`);
    rec.ok('the NPC timer actually ran down, and it walked (guard)',
      nFast.msPerSec > 200 && nSlow.msPerSec > 200 && nFast.pxPerSec > 8 && nSlow.pxPerSec > 8,
      { nFast, nSlow });
    /* v2.3.3381: per second of game time (judge, above) */
    const jt = judge(nFast.msPerSec, nSlow.msPerSec, nFast, nSlow);
    if (!jt.apart) rec.skip('an NPC wander timer drains at the same ms per SECOND', TOO_LOADED);
    else rec.ok('an NPC wander timer drains at the same ms per SECOND', jt.ok,
      { ...jt, fast: +nFast.msPerSec.toFixed(0), slow: +nSlow.msPerSec.toFixed(0) });
    const jw = judge(nFast.pxPerSec, nSlow.pxPerSec, nFast, nSlow);
    if (!jw.apart) rec.skip('an NPC covers the same ground per SECOND at either frame rate', TOO_LOADED);
    else rec.ok('an NPC covers the same ground per SECOND at either frame rate', jw.ok,
      { ...jw, fast: +nFast.pxPerSec.toFixed(0), slow: +nSlow.pxPerSec.toFixed(0) });
  }

  const rFast = await remoteSpeedAt(P, cdp, 1);
  const rSlow = await remoteSpeedAt(P, cdp, 6);
  rec.ok('both remote-player samples advanced', !!rFast && !!rSlow, { rFast, rSlow });
  if (rFast && rSlow) {
    console.log(`    remote:    ${rFast.pxPerSec.toFixed(0)} px/s at ${rFast.fps.toFixed(1)}fps  vs  ${rSlow.pxPerSec.toFixed(0)} px/s at ${rSlow.fps.toFixed(1)}fps (game time ${rFast.gameRate.toFixed(2)} / ${rSlow.gameRate.toFixed(2)})`);
    rec.ok('the remote actually moved (guard)',
      rFast.pxPerSec > 20 && rSlow.pxPerSec > 20, { rFast: rFast.pxPerSec, rSlow: rSlow.pxPerSec });
    /* v2.3.3381: per second of game time (judge, above) */
    const jr = judge(rFast.pxPerSec, rSlow.pxPerSec, rFast, rSlow);
    if (!jr.apart) rec.skip('a remote player is dead-reckoned at the same px per SECOND', TOO_LOADED);
    else rec.ok('a remote player is dead-reckoned at the same px per SECOND', jr.ok,
      { ...jr, fast: +rFast.pxPerSec.toFixed(0), slow: +rSlow.pxPerSec.toFixed(0) });
  }

  const tFast = await turnDecayAt(P, cdp, 1);
  const tSlow = await turnDecayAt(P, cdp, 6);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});
  rec.ok('both facing samples turned', !!tFast && !!tSlow, { tFast, tSlow });
  if (tFast && tSlow) {
    console.log(`    facing:    k=${tFast.k.toFixed(1)}/s at ${tFast.fps.toFixed(1)}fps  vs  k=${tSlow.k.toFixed(1)}/s at ${tSlow.fps.toFixed(1)}fps (game time ${tFast.gameRate.toFixed(2)} / ${tSlow.gameRate.toFixed(2)})`);
    rec.ok('the facing angle actually closed (guard)',
      tFast.remaining < Math.PI / 2 && tSlow.remaining < Math.PI / 2,
      { fast: tFast.remaining, slow: tSlow.remaining });
    /* v2.3.3381: per second of game time (judge, above) */
    const jf = judge(tFast.k, tSlow.k, tFast, tSlow);
    if (!jf.apart) rec.skip('the player turns toward a heading at the same rate per SECOND', TOO_LOADED);
    else rec.ok('the player turns toward a heading at the same rate per SECOND', jf.ok,
      { ...jf, fastK: +tFast.k.toFixed(1), slowK: +tSlow.k.toFixed(1) });
  }

  await P.ctx.close().catch(() => {});
}
