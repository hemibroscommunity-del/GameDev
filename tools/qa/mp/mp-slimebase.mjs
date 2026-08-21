/* THE SLIME STANDS WHERE THE GAME THINKS IT DOES (v2.3.1824).
 *
 * Owner, with a screenshot: "the hitbox for the slime is way off.  All
 * hitboxes need to be based on where the actual base of where the sprite is
 * shown in the game.  It's hard to see here but it's the red circle around
 * the 6G coins."
 *
 * The slime's 128px cell has 41 empty rows under the blob, and the sprite
 * was anchored at the cell's BOTTOM — so the blob's visible base floated 34
 * world px above the monster's own position, and the loot it dropped, the
 * hit tests and the tap circle all landed that far below the slime you can
 * see.
 *
 * Measured off the LIVE Pixi sprite rather than off the constants, because
 * a test that imports SLIME_BASE_ROW and checks the anchor equals
 * SLIME_BASE_ROW is only asking the source to agree with itself.  The empty-
 * row count is written out here from the sheet's own alpha bounds, so a
 * re-exported sheet with the blob somewhere else fails this loudly instead
 * of quietly sliding the hitbox back where it was.
 */
import * as H from './harness.mjs';

/* Measured from public/sprites/monsters/slime-idle-v5.png: the blob's lowest
   opaque row is 86 in a 128px cell. */
const CELL = 128;
const BLOB_BASE_ROW = 86;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Basey', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1800);

  /* Town is a safe zone, so the slime is minted through the game's OWN
     createMonster next to the player — same justification as mp-spawnfx:
     what is under test is the DRAW, not how the monster came to be there. */
  const made = await P.page.evaluate(() => {
    const f = window._gameFns;
    const S = window._gameState && window._gameState.current;
    if (!f || !f.createMonster || !S || !S.player) return null;
    /* Read the archetype key out of the game's own table rather than typing
       one: 'slime' is not a key, and createMonster throws on a miss. */
    const arch = Object.keys(f.ARCHETYPES || {}).find((k) => k === 'fodder');
    if (!arch) return null;
    const m = f.createMonster('slimebase-1', arch, 2, S.player.x + 110, S.player.y, null);
    if (!m) return null;
    m.alive = true;
    S.monsters = (S.monsters || []).concat([m]);
    return { id: m.id, y: m.y };
  });
  rec.ok('a slime was minted to measure (guard)', !!made, made);
  if (!made) { await P.ctx.close().catch(() => {}); return; }

  /* Let the spawn-in flourish finish — it scales the container, and reading
     mid-ramp would measure the growth, not the anchor. */
  await P.page.waitForTimeout(2500);

  const rows = await P.page.evaluate(() => (window._pixiRenderer && window._pixiRenderer.slimeBaseProbe
    ? window._pixiRenderer.slimeBaseProbe() : null));
  const s = (rows || []).find((r) => r.id === 'slimebase-1');
  rec.ok('the slime is on screen with its sheet drawn (guard)', !!s, rows);
  if (!s) { await P.ctx.close().catch(() => {}); return; }

  /* Bottom of the drawn CELL in world px, then back off the empty rows under
     the blob to get where the blob itself rests. */
  const cellBottomWorld = s.worldY + (s.sbY + s.texH * (1 - s.anchorY) * s.scaleY) * s.containerScaleY;
  const emptyWorld = (CELL - BLOB_BASE_ROW) * s.scaleY * s.containerScaleY;
  const blobBase = cellBottomWorld - emptyWorld;
  const off = blobBase - s.worldY;

  rec.ok("the blob's base sits on the monster's own position (was 34px above it)",
    Math.abs(off) < 6,
    { blobBaseWorldY: +blobBase.toFixed(1), monsterWorldY: +s.worldY.toFixed(1), offBy: +off.toFixed(1) });

  /* GUARD: the assertion above would ALSO pass if the sprite were still
     anchored at the cell bottom and someone had cropped the empty rows out
     of the sheet — a fine world, but not the one these constants describe.
     Pin the mechanism as well as the outcome. */
  rec.ok('...because it is anchored on the blob row, not the cell bottom',
    Math.abs(s.anchorY - BLOB_BASE_ROW / CELL) < 0.02,
    { anchorY: +s.anchorY.toFixed(4), expected: +(BLOB_BASE_ROW / CELL).toFixed(4) });

  /* A picture, because "every slime moved 34px down" is a change the owner
     will see before they read anything. */
  try {
    const fs = await import('fs');
    fs.mkdirSync('tools/qa/mp/out', { recursive: true });
    await P.page.screenshot({ path: 'tools/qa/mp/out/slimebase.png' });
  } catch (e) { /* the assertions are the test; the picture is a courtesy */ }

  await P.ctx.close().catch(() => {});
}
