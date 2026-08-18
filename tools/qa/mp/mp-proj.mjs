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

  /* ═══ v2.3.1765: A LANDED ARROW HIDES ITS HEAD ═══
     Owner: "arrows should not show the tips when they've reached their
     destination (like the arrowhead should be stuck in the material)."
     Injected the same way the snowball above is, and for the same reason: the
     draw is what is under test, not a bow's decision to fire.
     Read through arrowProbe rather than off the screen — a pixel search cannot
     tell a buried head from an arrow that was never painted, and that is the
     one distinction this change is about. */
  const arrowCase = (planted) => P.page.evaluate((isPlanted) => {
    const S = window._gameState && window._gameState.current;
    if (!S) return false;
    /* _isStaffProj / isSpecial / ice set EXPLICITLY, not left undefined: the
       game tick fills them in from the caster's active slot, and a character
       with no bow equipped gets _isStaffProj:true — which routes the arrow
       into the magic-bolt branch and draws no arrow at all.  That cost a round
       of "the probe reports zero arrows" before the injected object was
       printed and the extra key showed up. */
    /* The TICK owns _renderX (projectiles.js recomputes it every frame from
       dist for a flying arrow and from _plantX/_plantY for a planted one), so
       an injected arrow has to carry what the tick reads or it is nulled and
       skipped by `if (!a._renderX) continue`. */
    const px = S.player.x, py = S.player.y;
    S.arrows = [{
      x: px + 40, y: py, _renderX: px + 40, _renderY: py,
      ang: 0, life: 60, dist: 40, _released: true,
      planted: isPlanted, plantedAt: Date.now(),
      _plantX: px + 40, _plantY: py, _plantStartY: py,
      _isStaffProj: false, isSpecial: false, ice: false,
    }];
    return true;
  }, planted);
  /* Sampled ACROSS frames, taking the max.  The probe reports the last frame
     only (the tallies reset at the top of every _updateProjectiles), and the
     game tick reaps an injected arrow within a few hundred ms — so a single
     read lands on an empty frame and reports 0 arrows whatever the head logic
     did.  Re-injecting each poll keeps one on screen for the window. */
  const readArrows = async (planted) => {
    const best = { arrows: 0, heads: 0 };
    for (let i = 0; i < 20; i++) {
      await arrowCase(planted);
      const p = await P.page.evaluate(() => (window._pixiRenderer && window._pixiRenderer.arrowProbe
        ? window._pixiRenderer.arrowProbe() : null));
      if (p) {
        if (p.arrows > best.arrows) best.arrows = p.arrows;
        if (p.heads > best.heads) best.heads = p.heads;
      }
      if (best.arrows > 0 && (planted || best.heads > 0)) break;
      await P.page.waitForTimeout(60);
    }
    return best;
  };

  /* GUARD FIRST: an arrow still in the air MUST keep its head.  Without this,
     "no heads on a landed arrow" is satisfied by a renderer that stopped
     drawing heads entirely — or stopped drawing arrows. */
  const flying = await readArrows(false);
  rec.ok('an arrow in flight is drawn, with its head (guard)',
    !!flying && flying.arrows >= 1 && flying.heads >= 1, flying);

  const landed = await readArrows(true);
  rec.ok('a landed arrow is still drawn', !!landed && landed.arrows >= 1, landed);
  rec.ok('...but its head is buried in what it hit',
    !!landed && landed.heads === 0, landed);
  await P.page.evaluate(() => { const S = window._gameState.current; if (S) S.arrows = []; });

  await P.ctx.close().catch(() => {});
}
