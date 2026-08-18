/* A RESPAWNING MONSTER ARRIVES AS A GROWING WHITE SILHOUETTE (v2.3.1765).
 *
 * Owner: "It would be cool to see a 'pre spawned monster' coming back into the
 * game by showing a tiny white silhouette grow and then match the outline of
 * the monster then become the monster."
 *
 * Read through spawnFxProbe rather than off the screen.  A screenshot can see
 * a pale blob near a spawn point, but it cannot tell the intended silhouette
 * from a monster whose art has not loaded — which is the failure this effect
 * would most plausibly be confused with, and the one a test has to rule out.
 *
 * The effect is triggered by flipping `alive` on a live monster rather than by
 * killing one and waiting out a respawn timer: the renderer's trigger IS the
 * dead->alive transition, so this drives exactly the input under test instead
 * of a minute of combat that happens to produce it.
 */
import * as H from './harness.mjs';

/* MONSTER_SIZE_MULT in entityRenderer — the resting scale every monster
   settles at, and the ceiling the growth ramp climbs toward. */
const FULL_SCALE = 1.5;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Spawner', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1800);

  const probe = () => P.page.evaluate(() => (window._pixiRenderer && window._pixiRenderer.spawnFxProbe
    ? window._pixiRenderer.spawnFxProbe() : null));

  /* Town has no monsters (safe zone), and walking to a spoke to find one would
     make this a test of the route.  Minted through the game's OWN
     createMonster so the display is built from a real archetype record — a
     hand-rolled object would be testing whatever fields I happened to guess.
     Same justification as mp-proj injecting a projectile: the DRAW is what is
     under test, not how the monster came to be there. */
  const settled = await P.page.evaluate(() => {
    const f = window._gameFns;
    const S = window._gameState && window._gameState.current;
    if (!f || !f.createMonster || !S || !S.player) return 0;
    /* The archetype name is READ from the game's own table, not typed here —
       'slime' looked obvious and is not a key, and createMonster throws on a
       miss rather than returning null. */
    const arch = Object.keys(f.ARCHETYPES || {})[0];
    if (!arch) return 0;
    const m = f.createMonster('spawnfx-1', arch, 3, S.player.x + 90, S.player.y, null);
    if (!m) return 0;
    m.alive = true;
    S.monsters = (S.monsters || []).concat([m]);
    return 1;
  });
  rec.ok('there is a live monster to respawn', settled > 0, settled);
  if (!settled) { await P.ctx.close().catch(() => {}); return; }
  /* ── the arrival itself ──
     Sampled from the instant the monster is introduced, with no settle: a
     brand-new sighting is an arrival, and it runs the SAME ramp a respawn
     does (both stamp _spawnFxAt; see the note at the top of the monster loop).
     BE STRAIGHT ABOUT WHAT THIS DOES AND DOES NOT COVER.  The dead->alive
     half of that trigger is NOT exercised here: this harness cannot hold an
     injected monster dead — the client's monster sync puts `alive` back
     within a frame, which the discarded guard below proved before it was
     removed.  So the ramp is tested and the respawn edge is one line of
     reasoning next to it. */
  const seen = { silhouette: false, grew: false, minScale: 99, sawHpUiHidden: false, everSpawning: false };
  for (let i = 0; i < 60; i++) {
    const p = await probe();
    const row = (p || []).find((r) => r.id === 'spawnfx-1');
    if (row) {
      if (row.spawning) seen.everSpawning = true;
      if (row.spawning && row.filtered) seen.silhouette = true;
      if (row.spawning && row.scale < FULL_SCALE * 0.95) seen.grew = true;
      if (row.spawning && row.scale < seen.minScale) seen.minScale = row.scale;
      if (row.spawning && !row.hpUi) seen.sawHpUiHidden = true;
    }
    if (seen.silhouette && seen.grew && seen.sawHpUiHidden) break;
    await P.page.waitForTimeout(20);
  }
  rec.ok('it arrives as a WHITE SILHOUETTE, not the finished monster',
    seen.silhouette, seen);
  rec.ok('...starting small and growing (owner: "a tiny white silhouette grow")',
    seen.grew && seen.minScale < FULL_SCALE * 0.8, { ...seen, FULL_SCALE });
  rec.ok('...with no health bar floating over something still arriving',
    seen.sawHpUiHidden, seen);

  /* And it BECOMES the monster — an effect that never ends is a worse bug
     than no effect, since it would leave a permanently white, permanently
     filtered monster standing in the world. */
  await P.page.waitForTimeout(1200);
  const after = await probe();
  const afterOne = (after || []).find((r) => r.id === 'spawnfx-1');
  rec.ok('...and then it is simply the monster again, filter off, full size',
    !!afterOne && afterOne.spawning === false && afterOne.filtered === false
    && Math.abs(afterOne.scale - FULL_SCALE) < 0.01 && afterOne.alpha === 1
    && afterOne.hpUi === true,
    { afterOne, FULL_SCALE });

  await P.ctx.close().catch(() => {});
}
