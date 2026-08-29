/* THE DOOR TO THE SECOND DEPTH (v2.3.2135)
 *
 * Owner: "Second depth zone used to exist and minimap icon still exists for
 * it but doesn't exist anymore in game.  It's the minimap icon needs be
 * removed in verdant wilds."
 * A demo reviewer had written the same thing up as "Door didnt exist".
 *
 * Both were right, and it was worse than one icon in one zone.
 * generateZoneMap stamps a 2x2 block of TILE 10 -- the depth-tier dungeon
 * entrance -- at (16,2)-(17,2) in EVERY combat zone (verdant, frost, sky,
 * mist, ember, thunder).  The transition behind it has been hard-off since
 * v2.3.54, where zoneTransitions.js still carries the gate verbatim as
 * `if (false && tile === 10)`.  So both renderers were advertising a door
 * that cannot open: the minimap drew an exit icon, and the world painted a
 * full glowing portal beam.
 *
 * WHAT THIS ASSERTS, and the third one is the point:
 *  1. The tile is STILL STAMPED.  The fix removes the advertising, not the
 *     seed -- zoneTransitions' note says to flip that `false` to re-enable,
 *     and this keeps that a one-line change.  A "fix" that deleted the tile
 *     would pass 2 and 3 while quietly making the dungeons harder to ship.
 *  2. The WORLD paints no portal there.  __btPortals is what the renderer
 *     actually drew this frame, not a re-derivation of the rule.
 *  3. The MINIMAP's exit count matches the number of REAL doors, computed
 *     from the live map -- so this cannot pass by the icon merely moving,
 *     and it stays true if a zone ever gains or loses a genuine exit.
 */
import * as H from './harness.mjs';

const TILE = 32;
const stand = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = px; S.player.y = py;
  return true;
}, { px: x, py: y }).catch(() => false);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Doorman', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2400);

  /* Out to Verdant Wilds through the real trail-heads — the zone the owner
     named.  Quests accepted first because the spokes are quest-gated
     (v2.3.1817) and a locked portal refuses entry. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) {
      for (const q of ['tut_1', 'tut_2', 'tut_3', 'tut_4']) {
        S.channel.send({ type: 'quest_accept', payload: { questId: q } });
      }
    }
  });
  await P.page.waitForTimeout(2000);
  const marks = await P.page.evaluate(() => {
    const f = window._gameFns || {};
    return {
      townOut: (f.TOWN_EXITS || []).find((e) => e.zoneId === 'worldview') || null,
      spoke: (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId === 'verdant') || null,
    };
  });
  if (!marks.townOut || !marks.spoke) {
    rec.skip('the dead depth door is not advertised in Verdant Wilds', 'no exit tables');
    await P.ctx.close().catch(() => {});
    return;
  }
  await stand(P, marks.townOut.tx * TILE + 16, marks.townOut.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'worldview',
    { timeout: 30000, label: 'World View' }).catch(() => {});
  await P.page.waitForTimeout(800);
  await stand(P, marks.spoke.tx * TILE + 16, marks.spoke.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'verdant',
    { timeout: 30000, label: 'Verdant Wilds' }).catch(() => {});
  await P.page.waitForTimeout(2600);

  const zone = await H.readState(P, (S) => S.currentZone);
  if (zone !== 'verdant') {
    rec.skip('the dead depth door is not advertised in Verdant Wilds',
      `never reached the zone (stuck in ${zone})`);
    await P.ctx.close().catch(() => {});
    return;
  }
  rec.ok('we are standing in Verdant Wilds (guard)', zone === 'verdant', { zone });

  const look = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const map = S.map || [];
    const tenAt = [];
    const realDoors = [];      /* tiles 8 and 9 — the ones that go somewhere */
    for (let r = 0; r < map.length; r++) {
      const row = map[r] || [];
      for (let c = 0; c < row.length; c++) {
        if (row[c] === 10) tenAt.push({ r, c });
        if (row[c] === 8 || row[c] === 9) realDoors.push({ r, c });
      }
    }
    /* Merge the real doors the way the minimap does (2x2 stamps, anything
       within 3 tiles is one portal) so the expected icon count is derived
       from the map rather than written down here. */
    const clusters = [];
    for (const d of realDoors) {
      if (clusters.some((k) => Math.abs(k.r - d.r) <= 3 && Math.abs(k.c - d.c) <= 3)) continue;
      clusters.push(d);
    }
    const portals = (window.__btPortals || []).map((p) => ({ r: p.r, c: p.c, zoneId: p.zoneId }));
    const mm = window.__btMinimap || null;
    return {
      tenAt, realDoors, clusters,
      portals,
      minimapExits: mm ? mm.exits : null,
      minimapZone: mm ? mm.zone : null,
    };
  });
  console.log('    ' + JSON.stringify(look));

  /* ── 1. THE SEED SURVIVES ── */
  rec.ok('the depth-entrance tile is still stamped, so re-enabling stays one line',
    look.tenAt.length > 0, look.tenAt);

  /* ── 2. THE WORLD NO LONGER PAINTS IT ──
     Read off what the renderer drew, not off the rule. */
  const nearTen = look.portals.filter((p) =>
    look.tenAt.some((t) => Math.abs(t.r - p.r) <= 1 && Math.abs(t.c - p.c) <= 1));
  rec.ok('the world paints no portal on the door that cannot open',
    nearTen.length === 0, { nearTen, portals: look.portals, tenAt: look.tenAt });
  /* ...and it still paints the ones that CAN.  A fix that stopped drawing
     every portal would pass the line above and strand the player. */
  rec.ok('...but the real way back to town is still painted',
    look.portals.length > 0, look.portals);

  /* ── 3. THE MINIMAP ICON THE OWNER ASKED ABOUT ──
     Compared against the doors that actually lead somewhere, computed from
     the live map, so this cannot be satisfied by the icon simply moving. */
  if (look.minimapExits == null) {
    rec.skip('the minimap draws an icon only for doors that go somewhere', 'no minimap probe');
  } else {
    rec.ok('the minimap draws an icon only for doors that go somewhere',
      look.minimapExits === look.clusters.length,
      { minimapExits: look.minimapExits, realDoorClusters: look.clusters.length,
        clusters: look.clusters, deadDoor: look.tenAt });
  }

  await P.ctx.close().catch(() => {});
}
