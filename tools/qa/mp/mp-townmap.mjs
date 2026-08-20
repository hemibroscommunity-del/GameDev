/* TOWN IS OPEN GROUND WITH SOLID OBJECTS ON IT (v2.3.1794).
 *
 * This file used to assert the opposite, and the reversal is the point.
 *
 * v2.3.1777 gave town a walk mask DERIVED from the map art by hue, because the
 * owner said the new clifftop was "Not walkable" past its edges.  After playing
 * it: "only make the objects (like each house and NPC) unwalkable areas.
 * Everything else walkable again in the brotown area.  The areas you detected
 * for the map are too unreliable."
 *
 * That is the right call and the reason is worth keeping.  Hue classification
 * decides by what a pixel LOOKS like, so a shadowed cobble reads as not-ground
 * and a sunlit roof reads as ground.  v2.3.1777 re-tuned it twice — the stairs
 * came out blocked, then a 32px slot trapped the player — and each fix moved
 * the errors rather than removing them.  Collision now comes from the props
 * table, whose positions are DECLARED rather than guessed and are the same
 * data that draws them.
 *
 * So what is tested here is the new contract, and the first assertion is the
 * INVERSE of the one this file used to make: walking west from the plaza used
 * to have to stop at the cliff, and now has to get past it.  A test written
 * that way cannot quietly keep passing if a mask comes back.
 */
import * as H from './harness.mjs';

const ZONE_W = 96, ZONE_H = 30, TILE = 32;

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

  const zone = await H.readState(P, (S) => {
    const z = (window.__btZones || {})[S.currentZone] || null;
    return { id: S.currentZone, w: z && z.w, h: z && z.h };
  }).catch(() => null);

  const grids = await H.readState(P, (S) => Object.keys(S._tiledWalkable || {}));
  /* v2.3.1794: town still has a grid, but it is the PROPS-ONLY one — open
     everywhere, stamped solid where the buildings stand.  isSolid treats any
     grid as authoritative, so an all-open grid is how "walkable except the
     objects" is expressed; there is no separate no-mask path. */
  rec.ok('town has a collision grid', grids.includes('town'), grids);
  /* The other zones' hand-painted masks have been wrong since v2.3.1693 and
     must stay off.  Without this, someone "fixing" the flag re-enables seven
     broken masks and this file would not notice. */
  rec.ok('...and no other zone has one', grids.length === 1, grids);

  const spawn = await pos(P);
  rec.ok('you spawn on the plateau, inside the new bounds',
    spawn.x > 0 && spawn.x < ZONE_W * TILE && spawn.y > 0 && spawn.y < ZONE_H * TILE, spawn);

  /* ── 1. the plateau is OPEN ──
     The inverse of this file's old assertion.  At y=700 the derived mask made
     the walkable band x 672..2664, so it stopped a westward walk at ~672;
     crossing well past that is only possible with no mask at all.  The hold is
     long enough to reach the zone bound, and the guard proves the walk
     happened rather than the player never having moved. */
  await put(P, 1400, 700);
  await P.page.waitForTimeout(300);
  const beforeW = await pos(P);
  await hold(P, 'a', 9000);
  const afterW = await pos(P);
  rec.ok('walking west actually moved the player (guard)', afterW.x < beforeW.x - 200, { beforeW, afterW });
  rec.ok('the old west cliff no longer stops you — the plateau is open ground',
    afterW.x < 400, { afterW, oldMaskStoppedAtX: 672 });

  /* North likewise: the mask put the walkable edge at y=208 for x=2000. */
  await put(P, 2000, 800);
  await P.page.waitForTimeout(300);
  await hold(P, 'w', 9000);
  const afterN = await pos(P);
  rec.ok('...and neither does the old north cliff',
    afterN.y < 120, { afterN, oldMaskStoppedAtY: 208 });

  /* ── 1b. BUT THE OBJECTS DO STOP YOU ──
     Discovered from live state rather than hard-coded, so moving a building in
     worldProps.js moves the test with it.  Approached from below, walking up
     into the footprint: stopping short of the centre is the whole claim. */
  const building = await P.page.evaluate(() => {
    /* Pick something that actually BLOCKS.  The props probe reports it now
       (v2.3.1794) because the first cut of this test picked the anvil — which
       is scenery with no footprint — walked straight through it, and failed
       for entirely the right reason. */
    const ps = (window.__btWorldProps ? window.__btWorldProps() : []).filter((p) => p.blocks);
    const b = ps[0];
    return b ? { id: b.id, x: b.x, y: b.y, footprint: b.footprint } : null;
  });
  rec.ok('there is a building in town to walk into (guard)', !!building, { building });
  if (building) {
    await put(P, building.x, building.y + 150);
    await P.page.waitForTimeout(300);
    await hold(P, 'w', 3000);
    const atB = await pos(P);
    rec.ok(`the ${building.id} blocks you — you cannot walk through it`,
      atB.y > building.y + 8, { building, stoppedAt: atB });
  }

  /* NPCs are objects too, and they block as a live radius rather than a grid. */
  /* Read the mayor AFTER letting him settle.  NPCs walk toward spawnX/spawnY
     every frame, so reading a position in the first seconds of a session
     catches them mid-walk from wherever they were placed — which is exactly
     how the v2.3.1794 move was caught leaving his wander anchor behind in the
     old plaza. */
  await P.page.waitForTimeout(4000);
  const npc = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const n = (S.npcs || []).find((q) => q && q.alive !== false && q.x != null);
    return n ? { id: n.id, x: n.x, y: n.y, spawnX: n.spawnX, spawnY: n.spawnY } : null;
  });
  rec.ok('the townsfolk settle where they are placed, not where they used to be',
    !!(npc && Math.hypot(npc.x - npc.spawnX, npc.y - npc.spawnY) < 24),
    { npc });
  rec.ok('there is a townsperson to walk into (guard)', !!npc, { npc });
  if (npc) {
    await put(P, npc.x, npc.y + 70);
    await P.page.waitForTimeout(300);
    await hold(P, 'w', 2500);
    const atN = await pos(P);
    rec.ok(`${npc.id} blocks you — you cannot stand inside him`,
      atN.y > npc.y + 8, { npc, stoppedAt: atN });
  }

  /* ── 2. the stairs are a way up, not a picture of one ── */
  await put(P, 960, 470);             /* plaza, at the foot of the steps */
  await P.page.waitForTimeout(300);
  const footOfSteps = await pos(P);
  await hold(P, 'w', 4000);
  const upTop = await pos(P);
  rec.ok('the stairs carry you up into the walled courtyard',
    upTop.y < 330, { from: footOfSteps, to: upTop });

  /* ── 3. everything placed in town stands on ground you can reach ── */
  const placed = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const out = [];
    for (const n of (S.npcs || [])) out.push({ id: n.id, x: n.x, y: n.y });
    for (const p of (window.__btWorldProps ? window.__btWorldProps() : [])) out.push({ id: p.id, x: p.x, y: p.y });
    return out;
  });
  const offGrid = placed.filter((p) => p.x <= 0 || p.y <= 0 || p.x >= ZONE_W * TILE || p.y >= ZONE_H * TILE);
  rec.ok('every NPC and prop is inside the new zone bounds', offGrid.length === 0, { offGrid, placed });

  /* Each of them is somewhere the player can actually stand next to. */
  const stuck = [];
  for (const p of placed) {
    await put(P, p.x, p.y + 60);
    await P.page.waitForTimeout(120);
    const at = await pos(P);
    if (Math.abs(at.x - p.x) > 200) stuck.push({ p, at });
  }
  rec.ok('...and none of them is stranded off the walkable plateau',
    stuck.length === 0, stuck);

  await P.ctx.close().catch(() => {});
}
