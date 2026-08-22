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

/* v2.3.1778: HE STANDS AT HIS FORGE, NOT AT THE FOUNTAIN.
   The original ask put him by the water because there was nothing else to put
   him by; the owner has since supplied a forge and it is placed in
   worldProps.js, so the relationship worth pinning is the one that now means
   something.  Loosening the old fountain check to make it pass would have kept
   a test that asserts nothing — he is 423px from the water and correct. */
const FORGE = { x: 1480, y: 545 };
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

  const d = Math.hypot(smith.x - FORGE.x, smith.y - FORGE.y);
  rec.ok('...standing at his forge', d < NEAR,
    { dist: Math.round(d), at: { x: smith.x, y: smith.y }, forge: FORGE });
  /* ...and OUTSIDE it: the forge is solid, so a smith inside its footprint
     would be a smith you can never reach. */
  rec.ok('...outside it, not inside the building', smith.y > FORGE.y, { smith, forge: FORGE });

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
       be asking the art to be someone else.
       v2.3.1822: the mayor is now deliberately drawn 10% larger than everyone
       else (owner: "Make mayor bro 10% larger"), so the expected ratio is
       1/1.10 = 0.909, not 1.0.  The band is stated around that number rather
       than left to squeak past the old 0.9 floor by two thousandths — a
       tolerance that only just holds is a test that will lie next time. */
    const ratio = bs.height / mayor.height;
    rec.ok('the blacksmith is drawn a touch under the mayor, who is the 10% larger one',
      ratio > 0.86 && ratio < 0.96, { ratio: +ratio.toFixed(3), bs: bs.height, mayor: mayor.height });
    rec.ok('...and his feet sit on the same ground line as his position',
      Math.abs(bs.footY - bs.y) < 3, bs);
  }

  await P.ctx.close().catch(() => {});
}
