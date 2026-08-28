/* IS YOUR PET ACTUALLY ON THE SCREEN? (v2.3.2078)
 *
 * ── THE BUG THIS EXISTS FOR ──
 * entityRenderer's `_updatePet` opened with `const pet = S._activePet`, and
 * nothing in the whole client has ever written `S._activePet` — not
 * BroTown.jsx, not gameEvents, not wsClient, not any panel, at any point in
 * the history. So the early return fired on every frame and the pet display
 * was never made visible to anybody, ever.
 *
 * It survived because the pet is NOT a dormant feature and everything else
 * about it works:
 *   - the follow simulation runs each frame (BroTown.jsx §18.1), keeping
 *     S._petX / S._petY;
 *   - the auto-loot really collects coins inside PET_LOOT_RADIUS;
 *   - wsClient floats a "PET +N G" popup at S._petX, over empty ground;
 *   - the pet house, the roster and the inspect card all show the emoji.
 * A player who bought a pet and switched it on got the loot, got a popup out
 * of thin air, and never saw the animal. Every surface agreed it was there
 * except the world.
 *
 * ── WHY THIS IS ASSERTED ON THE DISPLAY AND NOT ON PIXELS ──
 * The pet is an emoji in a Text object, drawn at the system emoji font. What
 * that rasterises to is a property of the container's font stack, not of the
 * game, so counting coloured pixels would be measuring Chromium. What the
 * game owns is: is there a pet display, is it visible, is it at the position
 * the follow simulation computed, and is it showing THIS pet's emoji and
 * name. That is the whole of the bug and all of it is readable.
 *
 * The position check is the part that would have caught the popup mismatch
 * too: renderer and popup now read the same S._petX/_petY.
 */
import * as H from './harness.mjs';

const PET = { name: 'Biscuit', emoji: '🐕', color: '#f5c542', tier: 0 };

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'PetOwner', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1200);

  const probe = () => P.page.evaluate(() => {
    const r = window._pixiRenderer;
    return (r && r.petDrawn) ? r.petDrawn() : 'no-probe';
  });

  /* ── NO PET: nothing on the ground ── */
  const none = await probe();
  rec.ok('the renderer offers a pet probe at all (guard)', none !== 'no-probe', none);
  rec.ok('with no pet active, nothing pet-shaped is visible',
    none === null || none.visible === false, none);

  /* ── ONE PET, ACTIVE ──
     Written where the rest of the game keeps it: R.lifeSkills.pets, indexed
     by R.lifeSkills.activePet. That is PetHousePanel's own storage, which is
     the point — a renderer that only follows a field the panels do not write
     is exactly the defect. */
  const armed = await P.page.evaluate((pet) => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.rpg) return null;
    S.rpg.lifeSkills = S.rpg.lifeSkills || {};
    S.rpg.lifeSkills.pets = [pet];
    S.rpg.lifeSkills.activePet = 0;
    S._petX = null;  /* let the follow simulation seed it */
    return { pets: S.rpg.lifeSkills.pets.length, active: S.rpg.lifeSkills.activePet };
  }, PET);
  rec.ok('a pet could be put in the pet house and switched on (guard)',
    !!armed && armed.pets === 1 && armed.active === 0, armed);

  const drew = await H.waitFor(P, () => {
    const r = window._pixiRenderer;
    const d = (r && r.petDrawn) ? r.petDrawn() : null;
    return d && d.visible ? d : null;
  }, (d) => !!d, { timeout: 8000, label: 'the pet appears' }).catch(() => null);

  rec.ok('THE REGRESSION: an active pet is actually drawn in the world',
    !!drew && drew.visible === true, drew || (await probe()));
  rec.ok("...showing that pet's own emoji, the one every menu shows",
    !!drew && drew.emoji === PET.emoji, drew);
  rec.ok('...and its name', !!drew && drew.name === PET.name, drew);

  /* ── IT IS WHERE THE SIMULATION PUT IT ──
     Not "somewhere on screen": at S._petX/_petY, which is also where wsClient
     floats the coin popup. The two disagreeing is how a popup ends up over
     bare ground. */
  const agree = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const d = window._pixiRenderer.petDrawn();
    return { px: S._petX, py: S._petY, dx: d && d.x, dy: d && d.y,
      plx: S.player.x, ply: S.player.y };
  });
  rec.ok('the drawn pet sits exactly where the follow simulation put it '
       + '(so the coin popup lands on it)',
    typeof agree.px === 'number' && Math.abs(agree.dx - agree.px) < 0.5
    && Math.abs(agree.dy - agree.py) < 0.5, agree);
  rec.ok('...and that is near the player, not at the world origin',
    Math.hypot(agree.dx - agree.plx, agree.dy - agree.ply) < 200, agree);

  /* ── IT FOLLOWS ──
     A pet pinned at its spawn point would pass everything above. */
  const before = { x: agree.dx, y: agree.dy };
  await P.page.keyboard.down('d');
  await P.page.waitForTimeout(2200);
  await P.page.keyboard.up('d');
  await P.page.waitForTimeout(1200);
  const after = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const d = window._pixiRenderer.petDrawn();
    return { dx: d && d.x, dy: d && d.y, plx: S.player.x, ply: S.player.y };
  });
  rec.ok('the pet followed the player across the plaza',
    Math.hypot(after.dx - before.x, after.dy - before.y) > 60, { before, after });
  rec.ok('...and is still beside them at the end of the walk',
    Math.hypot(after.dx - after.plx, after.dy - after.ply) < 200, after);

  /* ── SWITCHED OFF, IT GOES AWAY ──
     The other half of the gate: a renderer that ignores the field on the way
     in can just as easily ignore it on the way out. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.lifeSkills.activePet = null;
  });
  await P.page.waitForTimeout(900);
  const off = await probe();
  rec.ok('putting the pet away takes it off the screen',
    !!off && off.visible === false, off);

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors while the pet came and went', errs.length === 0, errs.slice(0, 3));

  await P.ctx.close().catch(() => {});
}
