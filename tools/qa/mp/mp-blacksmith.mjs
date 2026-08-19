/* THE BLACKSMITH IS STANDING BY THE FOUNTAIN (v2.3.1773).
 *
 * Owner: "Add this npc to the game near the water fountain he'll be the
 * blacksmith.  Size him about the same as mayor bro."
 *
 * Three things have to be true, and each has its own way of quietly failing:
 *
 *   1. HE SPAWNS.  NPC_DATA is not the gate — _spawnTownNpcs filters it
 *      through an ACTIVE_NPCS allowlist, so a record can be present and
 *      correct and still never appear.
 *   2. HE IS BY THE FOUNTAIN.  Checked against the fountain's MEASURED world
 *      position (765, 866 — read off the town art, see the note in NPC_DATA)
 *      rather than against the number in his own record, which would be the
 *      test agreeing with itself.
 *   3. HE IS THE MAYOR'S SIZE.  Read off the live sprites the renderer is
 *      holding, not off the asset: the renderer normalises every NPC through
 *      one frame geometry, so the only way to be sure the art matches that
 *      geometry is to measure what got drawn.
 */
import * as H from './harness.mjs';

/* The fountain basin's centre in world px, measured off /maps/town_v15.webp
   (art 1254px stretched to the zone's 1536, so world = art x 1.2249). */
const FOUNTAIN = { x: 765, y: 866 };
/* Close enough to read as "at the fountain" on a phone screen: the basin is
   ~76px in radius and the viewport is ~488 world px wide. */
const NEAR = 200;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Visitor', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  const npcs = await H.readState(P, (S) => (S.npcs || []).map((n) => ({
    id: n.id, name: n.name, x: n.x, y: n.y, sprite: n.sprite, portrait: n.portrait,
  })));
  const smith = npcs.find((n) => n.id === 'blacksmith_bro');
  rec.ok('the blacksmith spawned in town (the ACTIVE_NPCS gate, not just the record)',
    !!smith, npcs);
  if (!smith) { await P.ctx.close().catch(() => {}); return; }

  const d = Math.hypot(smith.x - FOUNTAIN.x, smith.y - FOUNTAIN.y);
  rec.ok('...standing near the water fountain', d < NEAR,
    { dist: Math.round(d), at: { x: smith.x, y: smith.y }, fountain: FOUNTAIN });
  /* ...and NOT in the basin: a fountain-shaped hole is where "near" ends. */
  rec.ok('...beside it, not in it', d > 90, { dist: Math.round(d) });

  rec.ok('he carries his own art, so he is not the emoji fallback',
    !!smith.sprite && /blacksmith/.test(smith.sprite), smith.sprite);

  /* ── the marker over his head ──
     He gives no quests, and getNpcQuest returns null both for "all of theirs
     are turned in" and for "he has none" — so before v2.3.1773 he wore the
     green all-done tick, telling you that you had cleared out a character you
     had never spoken to.  The mayor's own marker is asserted alongside it
     because the cheap wrong fix (drop the branch) would silence his too. */
  const markers = await H.readState(P, (S) => {
    const out = {};
    for (const n of (S.npcs || [])) out[n.id] = n._questMarker || null;
    return out;
  });
  rec.ok('the blacksmith wears no quest marker — he has no quests to finish',
    markers.blacksmith_bro === null, markers);
  rec.ok('...and the mayor still wears his (guard: the fix did not blank them all)',
    !!markers.mayor_bro, markers);

  /* ── the size claim, measured on screen ── */
  const drawn = await P.page.evaluate(() => (window.__btNpcSprites ? window.__btNpcSprites() : null));
  const mayor = drawn && drawn.find((s) => s.id === 'mayor_bro');
  const bs = drawn && drawn.find((s) => s.id === 'blacksmith_bro');
  rec.ok('both NPC figures are on screen to compare (guard)', !!mayor && !!bs, drawn);
  if (mayor && bs) {
    /* Same drawn HEIGHT is the owner's "about the same size": width differs
       because he is a broader man holding a hammer, and pinning width would
       be asking the art to be someone else. */
    const ratio = bs.height / mayor.height;
    rec.ok('the blacksmith is drawn at the mayor\'s scale',
      ratio > 0.9 && ratio < 1.1, { ratio: +ratio.toFixed(3), bs: bs.height, mayor: mayor.height });
    rec.ok('...and his feet sit on the same ground line as his position',
      Math.abs(bs.footY - bs.y) < 3, bs);
  }

  await P.ctx.close().catch(() => {});
}
