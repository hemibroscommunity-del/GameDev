/* Standing still, which way is he pointing? (v2.3.1837)
 *
 * Owner: "the character when idle faces whatever direction he last moved
 * instead of the direction he last rotated.  It needs to be the direction
 * last faced."
 *
 * The shape of the test is the shape of the bug: walk one way, turn a
 * DIFFERENT way, let go, and see which one the idle body kept.  The two
 * directions are deliberately opposite so a wrong answer cannot be mistaken
 * for a rounding error between neighbouring sectors.
 */
import * as H from './harness.mjs';

const OPP = { east: 'west', west: 'east', north: 'south', south: 'north' };
const ANG = { east: 0, south: Math.PI / 2, west: Math.PI, north: -Math.PI / 2 };
const KEY = { east: 'KeyD', west: 'KeyA', north: 'KeyW', south: 'KeyS' };

const facingNow = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  return S ? { facing: S._renderFacing, src: S._facingSrc,
    angle: S._facingAngle, target: S._targetFacingAngle } : null;
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Idler', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  for (const walked of ['east', 'north']) {
    const turned = OPP[walked];

    /* 1. WALK. Real keys, so velocity is real and the movement branch of the
          facing ladder is the one that decides. */
    await P.page.keyboard.down(KEY[walked]);
    await P.page.waitForTimeout(900);
    await P.page.keyboard.up(KEY[walked]);
    await P.page.waitForTimeout(700);
    const afterWalk = await facingNow(P);
    rec.ok(`${walked}: walking ${walked} leaves him facing ${walked} (guard)`,
      !!(afterWalk && afterWalk.facing === walked), afterWalk);

    /* 2. TURN the other way with the right stick — the aim path a player
          uses, which sets autoAttack and makes the aim branch decide. */
    await P.page.evaluate((a) => {
      const S = window._gameState.current;
      window.__aim = { on: true, a };
      const tick = () => {
        const s = window._gameState && window._gameState.current;
        if (s && window.__aim && window.__aim.on) {
          s._aimAngle = window.__aim.a;
          s._lastAimAngle = window.__aim.a;
          s._aiming = true;
          s.autoAttack = true;
          if (s.player) { s.player.vx = 0; s.player.vy = 0; }
        }
        if (window.__aim && window.__aim.on) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      return !!S;
    }, ANG[turned]);
    await P.page.waitForTimeout(1400);
    const whileTurned = await facingNow(P);
    rec.ok(`${walked}: turning to ${turned} actually turns the body (guard)`,
      !!(whileTurned && whileTurned.facing === turned), whileTurned);

    /* 3. LET GO and go idle. */
    await P.page.evaluate(() => {
      window.__aim.on = false;
      const S = window._gameState.current;
      S._aiming = false;
      S.autoAttack = false;
      S._backpedaling = false;
    });
    await P.page.waitForTimeout(1600);
    const idle = await facingNow(P);

    rec.ok(`${walked}: idle, he keeps facing ${turned} — the way he last TURNED`,
      !!(idle && idle.facing === turned),
      { expected: turned, walkedEarlier: walked, idle, whileTurned, afterWalk });
  }
}
