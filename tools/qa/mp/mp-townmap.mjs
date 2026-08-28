/* THE RE-FUSED TOWN, AND WHAT IS TRUE WHILE ITS BUILDINGS ARE OFF (v2.3.1813).
 *
 * Owner: "I have a better map of Brotown that I want you to use.  The fusion
 * should be better.  You can just keep the buildings and NPCS removed for now."
 *
 * HISTORY THIS FILE CARRIES, because it has now reversed itself twice.
 * v2.3.1777 gave town a walk mask DERIVED from the map art by hue, because the
 * owner said the clifftop was "Not walkable" past its edges.  After playing it:
 * "only make the objects (like each house and NPC) unwalkable areas.
 * Everything else walkable again in the brotown area.  The areas you detected
 * for the map are too unreliable."  Hue classification decides by what a pixel
 * LOOKS like — a shadowed cobble reads as not-ground, a sunlit roof reads as
 * ground — and v2.3.1777 re-tuned it twice (stairs blocked, then a 32px slot
 * that trapped the player) with each fix moving the errors rather than removing
 * them.  So collision moved to the props table, whose positions are DECLARED.
 *
 * v2.3.1813 then switched the town props off at the owner's request, and that
 * has a consequence worth stating plainly rather than testing around: with the
 * props gone and no mask, TOWN HAS NO COLLISION AT ALL.  You can walk off the
 * plateau into the painted valley.
 *
 * WHICH IS WHY THE MOVEMENT ASSERTIONS THAT USED TO LIVE HERE ARE GONE, not
 * ported.  "Walking west gets past the old cliff" passes trivially when nothing
 * can stop you anywhere — it would sit here looking like coverage and proving
 * only that the player can move.  A vacuous assertion is worse than none: it
 * makes the next person think the property is guarded.  They belong back here
 * with the props, testing the props.
 *
 * What IS testable while the town is bare: that the map and the zone actually
 * swapped and agree about their shape, that the two coordinates anchored to
 * that shape moved with it, that the one NPC left standing still blocks, and
 * that the switched-off buildings cannot come back without someone re-measuring
 * them (their v16 positions are off the new map entirely).
 */
import * as H from './harness.mjs';

/* v2.3.1813: 96x30 -> 52x55.  The new art is near-square where the old
   plateau was wide; see src/data/zones.js for the aspect arithmetic. */
const ZONE_W = 52, ZONE_H = 55, TILE = 32;

const pos = (P) => H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y) }));
const put = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState.current;
  S.player.x = px; S.player.y = py; S.player.vx = 0; S.player.vy = 0;
}, { px: x, py: y });

async function hold(P, key, ms) {
  await P.page.keyboard.down(key);
  await P.page.waitForTimeout(ms);
  await P.page.keyboard.up(key);
  await P.page.waitForTimeout(250);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Surveyor', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);

  /* ── 1. the zone and the art agree about the town's shape ── */
  const zone = await H.readState(P, (S) => {
    const z = (window.__btZones || {})[S.currentZone] || null;
    return { id: S.currentZone, w: z && z.w, h: z && z.h };
  }).catch(() => null);
  rec.ok('town is the new 52x55 zone, not the old 96x30 plateau',
    !!(zone && zone.id === 'town' && zone.w === ZONE_W && zone.h === ZONE_H), zone);

  /* The map file itself — a zone resize with the OLD art still wired up would
     pass everything below and look completely wrong on screen. */
  const art = await P.page.evaluate(() => {
    const m = window.__btZoneMapUrl ? window.__btZoneMapUrl('town') : null;
    return m || null;
  }).catch(() => null);
  if (art) {
    rec.ok('...and it is drawing town_v17, the re-fused art', /town_v17/.test(art), { art });
  }

  /* ASPECT.  This is the assertion that catches a stretched map: the zone's
     world box and the art must have the same shape to within a couple of
     percent, or the painting is squashed to fit.  Checked as a RATIO so it
     survives either side being retuned, and it is the reason 52x55 was picked
     over anything else. */
  const artAspect = 1674 / 1774;
  const zoneAspect = (ZONE_W * TILE) / (ZONE_H * TILE);
  rec.ok('the zone box matches the art\'s aspect (the map is not stretched)',
    Math.abs(zoneAspect / artAspect - 1) < 0.02,
    { zoneAspect: +zoneAspect.toFixed(4), artAspect: +artAspect.toFixed(4) });

  /* ── 2. no HUE-DERIVED walk mask came back ──
     The v2.3.1794 property, still the owner's standing call: collision
     inferred from map colours was rejected, and without this check someone
     re-enabling WALK_MASKS_ENABLED re-ships exactly what was thrown out.

     v2.3.2078: it is an ALLOWLIST now, because two entries in
     S._tiledWalkable are legitimate and this used to fail on both.
       - 'worldview' is AUTHORED, not inferred. The owner drew the boundary
         himself and asked for it twice ("Use the pinkish line around the
         world view rock wall for blocked walkability", then "Actually just
         use this for walkability. Can't walk through pinkish lines"), and
         tiledMaps.js switched exactly that one on — WALK_MASK_ZONES is a
         one-zone Set, which is the mechanism the v2.3.1794 note kept the
         Set alive FOR.
       - 'town' is not a mask at all: spriteSheets.js installPropOnlyGrids
         stamps the prop footprints into the same map when a zone has no
         real mask, which is what makes the buildings solid.
     Anything ELSE appearing here is the rejected thing coming back, and
     still fails. The allowlist is spelled out rather than counted so that
     enabling a third zone has to be a deliberate edit here too. */
  const MASK_OK = new Set(['worldview', 'town']);
  const grids = await H.readState(P, (S) => Object.keys(S._tiledWalkable || {}));
  const unexpected = grids.filter((z) => !MASK_OK.has(z));
  rec.ok('no zone has a HUE-DERIVED walk mask loaded (the v2.3.1794 verdict holds)',
    unexpected.length === 0, { unexpected, grids, allowed: [...MASK_OK] });
  /* The prop grid IS in this map — that is how the town's buildings block at
     all — so an empty set here would mean collision had quietly gone away.
     (The world map's authored mask loads on ENTRY to that zone, so it is not
     visible from town and is not asserted here; mp-worldwalk drives it from
     inside worldview, which is the only place the claim can be tested.) */
  rec.ok('...and the town\'s prop grid IS loaded, or nothing in town blocks',
    grids.includes('town'), grids);

  /* ── 3. the two coordinates anchored to the town's shape moved with it ──
     Both were off the new map before this version: TOWN_SPAWN sat past the
     bottom edge and the World View trail-head past the right edge.  That is
     the failure mode a shape change causes, and it has now happened twice
     (v2.3.1777 did it to ty 41), so it gets a test rather than a comment. */
  const spawn = await pos(P);
  rec.ok('you spawn inside the new bounds',
    spawn.x > 0 && spawn.x < ZONE_W * TILE && spawn.y > 0 && spawn.y < ZONE_H * TILE, spawn);

  const exits = await P.page.evaluate(() => (window.__btTownExits ? window.__btTownExits() : null));
  if (exits) {
    const off = exits.filter((e) => e.tx < 0 || e.ty < 0 || e.tx >= 52 || e.ty >= 55);
    rec.ok('the way out of town is on a tile the new zone actually has',
      exits.length > 0 && off.length === 0, { exits, off });
  }

  /* ── 4. the one NPC left standing still behaves ──
     Read AFTER letting him settle: NPCs walk toward spawnX/spawnY every frame,
     so reading in the first seconds catches them mid-walk from wherever they
     were placed — which is how the v2.3.1794 move was caught leaving its
     wander anchor behind in the old plaza. */
  await P.page.waitForTimeout(4000);
  const npc = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const n = (S.npcs || []).find((q) => q && q.alive !== false && q.x != null);
    return n ? { id: n.id, x: n.x, y: n.y, spawnX: n.spawnX, spawnY: n.spawnY } : null;
  });
  /* Mayor Bro is KEPT while the buildings are off — the whole quest chain hangs
     off him, so "NPCs removed" must not quietly mean "onboarding deleted". */
  rec.ok('Mayor Bro is still in town (the quest chain needs him)', !!npc, { npc });
  if (npc) {
    rec.ok('...standing inside the new bounds',
      npc.x > 0 && npc.x < ZONE_W * TILE && npc.y > 0 && npc.y < ZONE_H * TILE, { npc });
    rec.ok('...and settled at his anchor, not walking back from the old plaza',
      Math.hypot(npc.x - npc.spawnX, npc.y - npc.spawnY) < 24, { npc });
    /* NPC collision is a live radius, not the grid — so this one real piece of
       town collision survives the props being switched off, and is worth
       keeping honest. */
    await put(P, npc.x, npc.y + 70);
    await P.page.waitForTimeout(300);
    await hold(P, 'w', 2500);
    const atN = await pos(P);
    rec.ok(`${npc.id} still blocks you — you cannot stand inside him`,
      atN.y > npc.y + 8, { npc, stoppedAt: atN });
  }

  /* ── 5. the buildings are off, and cannot come back half-done ──
     SELF-PRUNING, deliberately.  The town props still carry their v16
     positions (x up to 2560, on a map now 1664 wide), so flipping
     TOWN_PROPS_ENABLED without re-measuring them would strand seven buildings
     in the trees.  This passes while they are off, and the moment someone
     turns them on it demands the positions be fixed too. */
  const props = await P.page.evaluate(() => (window.__btWorldProps ? window.__btWorldProps() : []));
  const outOfBounds = props.filter((p) => p.x >= 52 * 32 || p.y >= 55 * 32 || p.x <= 0 || p.y <= 0);
  rec.ok('town buildings are switched off, or else placed on the new map',
    props.length === 0 || outOfBounds.length === 0,
    { count: props.length, outOfBounds: outOfBounds.slice(0, 4) });

  await P.ctx.close().catch(() => {});
}
