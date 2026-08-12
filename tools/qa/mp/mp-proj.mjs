/* Monster projectiles are VISIBLE (v2.3.1678).
 *
 * Owner: "I couldn't see the snowman projectile."  It was drawing — as the
 * green slime orb, because the renderer resolves one projectile texture per
 * ZONE from the variant map, and Frost Ridge has no entry, so every ball fell
 * through to the slime fallback.  A green blob against snow is invisible in
 * the way that matters.
 *
 * Injecting the projectile directly is deliberate: waiting for a snowman to
 * choose to throw makes the test a coin flip on monster AI, and what is being
 * tested is the DRAW, not the decision to throw.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Target', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1200);

  const before = await H.screenshotPixels(P);
  const whiteBefore = before.count((r, g, b) => r > 235 && g > 240 && b > 240);

  /* Park a snowball right beside the player and hold it there — the
     simulator ticks life down every frame, so a one-shot push would be gone
     before the screenshot. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.player) return;
    S.slimeProjectiles = S.slimeProjectiles || [];
    for (let i = 0; i < 6; i++) {
      S.slimeProjectiles.push({
        x: S.player.x + 30 + i * 14, y: S.player.y - 40,
        ang: 0, speed: 0, life: 600, displayOnly: true,
        ownerId: 'test', rawDmg: 0, kind: 'snowball', ts: Date.now(),
      });
    }
  });
  await P.page.waitForTimeout(900);

  const after = await H.screenshotPixels(P);
  const whiteAfter = after.count((r, g, b) => r > 235 && g > 240 && b > 240);
  rec.ok('a snowball paints as WHITE, not as a green slime orb',
    whiteAfter - whiteBefore > 150, { whiteBefore, whiteAfter, delta: whiteAfter - whiteBefore });

  await P.ctx.close().catch(() => {});
}
