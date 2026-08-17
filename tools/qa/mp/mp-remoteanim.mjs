/* WHAT THE OTHER PLAYER SEES YOU DOING. v2.3.1749.
 *
 * Owner: "broadcasting many of the animations like cooking and firemaking I
 * don't think were correct.  Check all of them."
 *
 * The audit found the shape of it: every remote stand-in indexed its frame as
 * `floor(now / ms) % frames.length` — the same number for every viewer, tied
 * to the wall clock, never starting at frame 0.  For a LOOPING strip that is
 * merely wrong-phase.  For firemaking it is visibly broken, because that strip
 * tells a story: stand, crouch, strike, spark, flame, stand-with-fire-lit.  On
 * a free-running loop a watcher saw the peer's fire put itself out and relight,
 * over and over, starting from wherever the clock happened to land.
 *
 * IT READS THE FRAME INDEX, through a read-only probe on the renderer facade
 * (remoteSkillProbe — the sibling of the fireGearProbe added for the same kind
 * of question in v2.3.1715).  The first cut of this file tried to do it from
 * pixels, counting fire-coloured dots in the peer's patch of screen, and that
 * was the wrong instrument twice over: the town's ground is tan, so the count
 * sat at ~11,500 before anything was lit and the ~300-pixel flame was inside
 * the noise; and a Playwright screenshot costs more than a frame, so nine
 * samples could not resolve a 536ms animation at all.  A frame index is the
 * fact under test, and nothing in the game consumes the probe.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Watcher', nameB: 'Lighter' });
  const bId = await H.readState(B, (S) => S.myId);

  await B.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.player) { S.player.x += 90; }
  });
  await A.page.waitForTimeout(1200);

  const probe = () => A.page.evaluate((id) => {
    const R = window._pixiRenderer;
    return (R && R.remoteSkillProbe) ? R.remoteSkillProbe(id) : 'no-probe';
  }, bId);

  const visible = await A.page.evaluate((id) => {
    const S = window._gameState && window._gameState.current;
    return !!(S && S.others && S.others[id]);
  }, bId);
  rec.ok('the watcher can see the other player', visible, bId);

  /* B lights a fire through the game's own path. */
  await B.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.player) return;
    S._campfire = null;
    S._firemaking = { x: S.player.x, y: S.player.y + 6, startedAt: Date.now(), doneAt: Date.now() + 700 };
  });

  /* Sample fast and often — the probe is a page evaluate, not a screenshot,
     so the 536ms animation is comfortably resolvable. */
  const seen = [];
  for (let i = 0; i < 26; i++) {
    const p = await probe();
    if (p && p !== 'no-probe' && p.code === 'fire' && typeof p.frame === 'number') seen.push(p.frame);
    await A.page.waitForTimeout(35);
  }

  rec.ok('the probe is wired (guard: no samples proves nothing)',
    seen.length >= 3, { samples: seen.length, seen });
  if (seen.length < 3) { await A.ctx.close(); await B.ctx.close(); return; }

  rec.ok('a peer lighting a fire starts at the FIRST frame, not mid-way',
    seen[0] === 0, seen);
  /* The one-shot signature.  A free-running `% 8` loop must go down at some
     point; a story played once never does. */
  const wrapped = seen.some((v, i) => i > 0 && v < seen[i - 1]);
  rec.ok('...and never wraps back to an unlit frame', !wrapped, seen);
  rec.ok('...and actually advances rather than sticking on one frame',
    Math.max(...seen) > seen[0], seen);
  /* 8 frames at 67ms: the strip must finish inside the 700ms action window,
     which is what the 3x speed-up bought. */
  rec.ok('the sped-up strip reaches its final frame within the action',
    Math.max(...seen) === 7, seen);

  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
