/* A MONSTER ABOUT TO SWING LOOKS LIKE IT (v2.3.1811).
 *
 * Owner: "add monster attack animations or just having you add something to
 * them so that way attacks are predictable enough to block."
 *
 * The server has telegraphed since v2.3.1730 and the client has drawn the
 * ground marker since — but on the FLOOR, at the aim point, while the thing a
 * player watches in a fight is the enemy.  v2.3.1811 puts the same
 * information on the body.
 *
 * Asserted as the DISPLAY SCALE moving, because that is the thing that is
 * actually different on screen and a screenshot of one frame cannot show a
 * throb.  The control matters as much as the assertion: a monster NOT winding
 * up must sit at exactly MONSTER_SIZE_MULT, or "it changed size" would be
 * satisfied by any wobble at all.
 */
import * as H from './harness.mjs';

const scaleOf = (P, id) => P.page.evaluate((mid) => {
  const r = window.__btMonsterScale;
  return r ? r(mid) : null;
}, id);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.monsters = (S.monsters || []).concat([{
      /* `statuses` is not optional: monsterCombat reads m.statuses.freeze
         unguarded every tick, so a monster without it throws inside the game
         loop — which the loop catches, so the symptom is a monster that never
         renders rather than an error anyone sees.  Copied from the shape a
         real spawn has rather than guessed at again. */
      id: 'qa-tg', x: S.player.x + 90, y: S.player.y, hp: 40, maxHp: 40,
      alive: true, arch: 'brute', type: 'brute', level: 3,
      statuses: {}, vx: 0, vy: 0, atkCd: 0, spawnX: S.player.x + 90, spawnY: S.player.y,
    }]);
  });
  await P.page.waitForTimeout(700);

  const idle = await scaleOf(P, 'qa-tg');
  rec.ok('the monster is on screen at its normal size (guard + control)',
    !!(idle && Math.abs(idle.scale - idle.baseMult) < 0.001), idle);

  /* Deliver the telegraph exactly as the worker does — same event, same
     payload shape — rather than poking _tgUntil, so the wiring from wire to
     body is what is under test and not just the renderer. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    window.__btDispatch({
      type: 'monster_ability',
      payload: {
        monsterId: 'qa-tg', ability: 'slam', phase: 'telegraph',
        radius: 55, ms: 900, ax: S.player.x, ay: S.player.y,
        x: S.player.x + 90, y: S.player.y,
      },
    });
  });
  await P.page.waitForTimeout(120);

  /* Sample across the wind-up: it must both GROW and MOVE. */
  const seen = [];
  for (let i = 0; i < 7; i++) {
    const s = await scaleOf(P, 'qa-tg');
    if (s) seen.push(+s.scale.toFixed(4));
    await P.page.waitForTimeout(90);
  }
  const base = idle ? idle.baseMult : 1;
  const maxS = Math.max(...seen), minS = Math.min(...seen);
  rec.ok('the body loads up — it grows past its resting size',
    maxS > base * 1.02, { base, maxS, seen });
  rec.ok('...and it THROBS rather than just sitting bigger',
    maxS - minS > 0.01, { minS, maxS, seen });

  /* AND IT STOPS.  A tell that never ends is a monster that is permanently
     the wrong size — the failure mode of writing scale from an FX. */
  await P.page.waitForTimeout(1200);
  const after = await scaleOf(P, 'qa-tg');
  rec.ok('when the wind-up ends the monster returns to exactly its normal size',
    !!(after && Math.abs(after.scale - after.baseMult) < 0.001), after);

  await P.ctx.close().catch(() => {});
}
