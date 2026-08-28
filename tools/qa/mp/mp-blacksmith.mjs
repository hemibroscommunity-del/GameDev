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
/* v2.3.2078: THE FORGE IS READ, NOT REMEMBERED.
   This was `{ x: 1480, y: 545 }`, copied out of worldProps at the time.  The
   forge has since moved to (480, 900) and grown roughly threefold (owner:
   "Same with blacksmith house"), so the check was measuring the smith's
   distance from a spot no building has stood on for weeks — 960px, and a
   FAIL on a smith who is standing at his forge.  mp-townhill reads the prop
   table and passes on the same frame, which is the difference.

   And it measures against the FOOTPRINT rather than the centre.  On a
   building 470px wide the centre is 235px from its own doorway, so a
   centre-distance test either fails a smith at the door or is loosened until
   it would pass one across the plaza.  Distance to the box is what "at his
   forge" means. */
/* Two distances, because the smith has a workstation and a building and they
   are not the same object.  He stands at the ANVIL (640, 960) — 50px, a
   body's length from it, which is where a smith stands — and the forge whose
   south wall ends at y 900 is 110px beyond that.  Both read as "he is at his
   forge" on a viewport ~488 world px wide; only one of them is where he is
   actually working. */
const NEAR_ANVIL = 90;
const NEAR_FORGE = 160;

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

  const forge = (await P.page.evaluate(() =>
    (window.__btWorldProps ? window.__btWorldProps() : []).find((p) => p.id === 'forge') || null));
  rec.ok('the forge is on the map to stand at (guard)',
    !!forge && !!forge.footprint, forge);
  if (!forge || !forge.footprint) { await P.ctx.close().catch(() => {}); return; }
  const f = forge.footprint;
  /* Distance to the BOX: zero anywhere inside it, and the gap to the nearest
     wall outside it. */
  const dx = Math.max(f.x0 - smith.x, 0, smith.x - f.x1);
  const dy = Math.max(f.y0 - smith.y, 0, smith.y - f.y1);
  const d = Math.hypot(dx, dy);
  rec.ok('...standing at his forge', d < NEAR_FORGE,
    { gapToWall: Math.round(d), at: { x: smith.x, y: smith.y }, footprint: f });

  /* And at the thing he actually works at.  The anvil followed the forge west
     in v2.3.2073 ("This anvil belongs near the blacksmith"), so a smith who
     drifted from it would be standing beside a building holding nothing. */
  const anvil = await P.page.evaluate(() =>
    (window.__btWorldProps ? window.__btWorldProps() : []).find((p) => p.id === 'anvil') || null);
  if (anvil && anvil.footprint) {
    const a = anvil.footprint;
    const adx = Math.max(a.x0 - smith.x, 0, smith.x - a.x1);
    const ady = Math.max(a.y0 - smith.y, 0, smith.y - a.y1);
    const ad = Math.hypot(adx, ady);
    rec.ok('...within arm\'s reach of his anvil, which is what he works at',
      ad < NEAR_ANVIL, { gap: Math.round(ad), at: { x: smith.x, y: smith.y }, anvil: a });
  } else {
    rec.skip('...within arm\'s reach of his anvil, which is what he works at',
      'the anvil is not on the map in this build');
  }
  /* ...and OUTSIDE it: the forge is solid, so a smith inside its footprint
     would be a smith you can never reach. */
  const inside = smith.x >= f.x0 && smith.x <= f.x1 && smith.y >= f.y0 && smith.y <= f.y1;
  rec.ok('...outside it, not inside the building', !inside, { smith, footprint: f });

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
