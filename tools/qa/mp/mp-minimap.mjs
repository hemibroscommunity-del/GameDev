/* THE MINIMAP SHOWS THE MAP THAT EXISTS (v2.3.1781).
 *
 * Owner: "I think it'd be good to add a little minimap in the upper right
 * corner.  But I don't know the best way to do that."
 *
 * The interesting property is not "a box appeared" — it is that the box is
 * pinned to the real world.  The minimap this replaces (the dashboard's Map
 * panel) DID appear, and drew a cross-junction and a ring road that exist
 * nowhere in the game, because it painted generateZoneMap()'s procedural
 * grid.  So a screenshot-only check would have passed against the bug this
 * whole change exists to fix.
 *
 * What is asserted instead is the pan transform, read from __btMinimap:
 * where the map image sits inside the box for a given player position.  That
 * is the one number that ties the picture to the world, and it is checked at
 * three positions so the check cannot be satisfied by a box that never moves.
 *
 * MEASURED BASELINE (town, 96x30 tiles = 3072x960 world px, box 104px,
 * window 960 world px -> scale 0.10833, spanW 332.8, spanH 104):
 *     player x=100    panX  0        (clamped at the west edge)
 *     player x=1536   panX -114.4    (free-panning mid-map)
 *     player x=2972   panX -228.8    (clamped at the east edge)
 * The east clamp is MINIMAP_PX - spanW = 104 - 332.8 = -228.8.
 *
 * FALSIFIED: with the clamp removed, x=100 gives panX +41.2 — the map slides
 * right and leaves empty tray down the west side of the box.  With the pan
 * hard-wired to 0, the mid-map and east assertions both fail.
 */
import * as H from './harness.mjs';

const BOX = 104;              /* MINIMAP_PX  */
const EPS = 1.5;

async function at(P, x, y) {
  await P.page.evaluate(({ x, y }) => {
    const S = window._gameState.current;
    S.player.x = x; S.player.y = y;
  }, { x, y });
  await P.page.waitForTimeout(700);
  return P.page.evaluate(() => window.__btMinimap || null);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Mini', wsPort, webPort, viewport: { width: 390, height: 844 } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  /* v2.3.1813: the probe points are DERIVED from the zone, not typed in.
     They used to be (100 / 1536 / 2972), measured for the 96x30 clifftop —
     and when town became 52x55 the "mid" and "east" samples both landed past
     the right-hand edge, clamped to the same pan, and three assertions failed
     as though the minimap had broken.  It had not; the coordinates had.  That
     is twice a town shape change has invalidated hardcoded town coordinates
     (TOWN_EXITS was the other), so this reads the zone instead. */
  const zw = await P.page.evaluate(() => {
    const z = (window.__btZones || {}).town;
    return z ? z.w * 32 : null;
  });
  rec.ok('the town zone reports a width (guard: everything below is relative to it)',
    !!zw && zw > 320, { zw });
  const midX = Math.round(zw * 0.50);
  const westX = Math.round(zw * 0.03);
  const eastX = Math.round(zw * 0.97);

  const mid = await at(P, midX, 700);
  console.log('    mid ', JSON.stringify(mid));
  rec.ok('the minimap is drawing in town', !!(mid && mid.visible && mid.zone === 'town'), { mid });
  if (!mid) { await P.ctx.close().catch(() => {}); return; }

  /* GUARD: the probe is live.  Everything below reads one object; if it were
     stale from the first frame, every comparison would still "agree". */
  const west = await at(P, westX, 700);
  const east = await at(P, eastX, 700);
  console.log('    west', JSON.stringify(west));
  console.log('    east', JSON.stringify(east));
  rec.ok('the probe actually tracks the player (guard)',
    west.panX !== mid.panX && east.panX !== mid.panX,
    { west: west.panX, mid: mid.panX, east: east.panX });

  /* THE MAP IS PINNED TO THE WORLD. */
  rec.ok('at the west edge the map is clamped, not slid off the box',
    Math.abs(west.panX - 0) < EPS, { panX: west.panX, expected: 0 });
  rec.ok('at the east edge it clamps to the far side',
    Math.abs(east.panX - (BOX - east.spanW)) < EPS,
    { panX: east.panX, expected: BOX - east.spanW });
  rec.ok('mid-map it pans freely between those two',
    mid.panX < -EPS && mid.panX > BOX - mid.spanW + EPS,
    { panX: mid.panX, bounds: [BOX - mid.spanW, 0] });

  /* THE PLAYER DOT NEVER LEAVES THE BOX — including at both clamped edges,
     which is where a centre-locked dot would be drawn outside it. */
  for (const [name, m] of [['west', west], ['mid', mid], ['east', east]]) {
    rec.ok(`the player dot stays inside the box (${name})`,
      m.playerBoxX >= -EPS && m.playerBoxX <= BOX + EPS &&
      m.playerBoxY >= -EPS && m.playerBoxY <= BOX + EPS,
      { x: m.playerBoxX, y: m.playerBoxY });
  }

  /* NO EMPTY TRAY VERTICALLY.  WINDOW_WORLD is tied to the town's depth
     precisely so this holds; if someone raises it, this goes red. */
  rec.ok('the town fills the box top to bottom (no letterbox)',
    mid.spanH >= BOX - EPS, { spanH: mid.spanH, box: BOX });

  /* MARKERS.  Town is safe (no monsters), so what must be there is the NPC
     set and the portals — the two things a player opens a map to find. */
  rec.ok('portals are marked', mid.exits > 0, { exits: mid.exits });
  /* markers COUNTS the portals too, so subtract them — otherwise a build
     with three exits and no NPC dots would satisfy this. */
  rec.ok('the town NPCs are marked', mid.markers - mid.exits >= 3,
    { markers: mid.markers, exits: mid.exits, npcDots: mid.markers - mid.exits });

  /* Land back in the plaza before the shot — the clamp positions above are
     off the walkable town and make a misleading picture. */
  await at(P, 1050, 780);
  await P.page.screenshot({ path: 'tools/qa/mp/out/minimap.png' }).catch(() => {});

  /* ── the dashboard's Map panel, which drew a place that did not exist ──
     Its rewrite depends on one thing being true: that the zone texture the
     renderer holds is <img>-backed (pixiRenderer forces
     preferCreateImageBitmap:false) and so can be drawn to a 2D canvas
     without loading anything.  Assert that precondition directly — if a
     future pixi upgrade flips it back to ImageBitmap the panel goes blank,
     and this says so instead of leaving it to be noticed three taps deep. */
  rec.ok('the zone texture is <img>-backed, so the Map panel can draw it with no load',
    mid.texNaturalW > 0 && /Image/.test(String(mid.texKind)),
    { texKind: mid.texKind, texNaturalW: mid.texNaturalW });

  /* ── v2.3.1783: it clears the zone-header rail ──────────────────────
     Owner: "The minimap is sitting a bit too high (it gets cut off by the
     bar at the top with the map name on it)."  Measured against the rail's
     real bottom edge rather than a number, because the rail is
     50px + env(safe-area-inset-top) and the constant would be wrong on
     exactly the notched phone that is the primary platform. */
  const hdr = await P.page.evaluate(() => {
    const h = document.querySelector('.bt-zone-header');
    const c = document.querySelector('canvas');
    if (!h || !c) return null;
    const hr = h.getBoundingClientRect(), cr = c.getBoundingClientRect();
    return { headerBottom: Math.round(hr.bottom - cr.top), height: Math.round(hr.height) };
  });
  console.log('    header', JSON.stringify(hdr), 'topInset', mid.topInset);
  rec.ok('the zone-header rail is actually there to be cleared (guard)',
    !!(hdr && hdr.height > 20), { hdr });
  if (hdr) {
    rec.ok('the minimap starts below the zone-header rail',
      mid.topInset >= hdr.headerBottom, { topInset: mid.topInset, headerBottom: hdr.headerBottom });
  }

  /* ── v2.3.1783: symbols, not a legend of coloured dots ─────────────
     Owner: "there needs to be better symbols on the minimap.  Stuff for
     portal, quest marker, icon representing what the building or NPC does
     (blacksmith, general store, etc).  Monsters should also have an icon
     that makes sense."

     The census counts markers by WHICH MINTED TEXTURE each one is using, so
     these assertions fail if two different things quietly share a glyph —
     the exact regression that makes an icon set worthless.  A screenshot
     cannot tell an anvil from a satchel at 11px; this can. */
  const ic = mid.icons || {};
  console.log('    icons', JSON.stringify(ic));
  /* v2.3.1813: the BUILDING marks only exist while the buildings do, and the
     owner switched town's props off with the re-fused map ("keep the buildings
     and NPCS removed for now").  Split rather than dropped: the marks that do
     not depend on a building — the mayor, the way out — are still asserted
     unconditionally, and the building ones come back automatically with the
     props.  Gated on the FLAG, not on an empty census, so a genuinely broken
     icon set still fails while the props are off. */
  const propsOn = await P.page.evaluate(
    () => (window.__btTownPropsEnabled ? window.__btTownPropsEnabled() : true));
  /* v2.3.1819: the mayor draws the plain NPC mark now, not a star.  The star
     was minted once and drawn twice — blue under him, gold on the quest's
     portal — one glyph carrying two meanings, separated only by a colour the
     player was never told about.  He keeps the '!' / '?' pin above his head,
     which says more than a star did. */
  for (const [key, what] of [
    ['npc', 'the mayor, as an NPC'],
    ['portal', 'the way out'],
  ]) {
    rec.ok(`${what} has its own symbol on the map`, (ic[key] || 0) > 0, { key, census: ic });
  }
  if (propsOn) {
    for (const [key, what] of [
      ['forge', 'the forge and the blacksmith'],
      ['bank', 'the bank'],
      ['enchant', 'the enchanter'],
      ['shop', 'the general store and the storekeeper'],
      ['house', "the mayor's house"],
    ]) {
      rec.ok(`${what} has its own symbol on the map`, (ic[key] || 0) > 0, { key, census: ic });
    }
    /* A trade shared by a building AND the person who runs it draws the same
       mark twice — that is the point, so you can find either one. */
    rec.ok('the blacksmith and his forge share the anvil', (ic.forge || 0) >= 2, { forge: ic.forge });
    rec.ok('the storekeeper and his store share the satchel', (ic.shop || 0) >= 2, { shop: ic.shop });
    /* GUARD: they are genuinely DIFFERENT textures, not one glyph counted
       under several names. */
    rec.ok('at least six distinct symbols are actually in use (guard)',
      Object.keys(ic).length >= 6, { keys: Object.keys(ic) });
  } else {
    rec.ok('building marks are absent because the buildings are switched off', true,
      { flag: 'TOWN_PROPS_ENABLED=false', census: ic });
    /* Still a real distinctness claim, at the size the bare town supports:
       the marks that ARE drawn must not have collapsed onto one glyph. */
    rec.ok('...and the marks still drawn are distinct textures (guard)',
      Object.keys(ic).length >= 3, { keys: Object.keys(ic) });
  }

  /* The quest pin, read off the same npc._questMarker the in-world badge
     uses — so the map cannot claim work the NPC is not offering. */
  const quest = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const n = (S.npcs || []).find((x) => x && x._questMarker);
    return n ? { name: n.name, marker: n._questMarker } : null;
  });
  console.log('    quest npc', JSON.stringify(quest));
  if (quest) {
    rec.ok('an NPC offering work is pinned on the map',
      (ic.quest || 0) + (ic.questDone || 0) > 0, { census: ic, npc: quest });
  }

  /* Monsters get the hostile glyph.  Town is safe, so inject one — the
     renderer reads x/y/hp off the array and nothing else, which is exactly
     the surface under test. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.monsters = (S.monsters || []).concat([{ id: 'qa-mob', x: 1500, y: 700, hp: 10, maxHp: 10 }]);
  });
  await P.page.waitForTimeout(600);
  const withMob = await P.page.evaluate(() => window.__btMinimap || null);
  rec.ok('a monster draws as its own mark, not another dot',
    !!(withMob && withMob.icons && withMob.icons.monster > 0), { icons: withMob && withMob.icons });

  /* ═══ v2.3.1810: AND IT GOES WHEN IT DIES ═══
     Owner: "remove monster icons from minimap when they die."
     The filter checked m.dead and m.hp and never checked m.alive — which is
     the field the kill paths actually set (monsterCombat 202 / 849 / 1833,
     wsClient on a server-side kill).  `dead` is not set on those paths at all
     and hp is left wherever the killing blow put it, so a corpse kept its pin
     until the respawn recycled the slot.
     Killed the way the game kills, and asserted as the COUNT dropping rather
     than the key vanishing: with two mobs up, one dying must take exactly one
     pin with it — a test that only checked "no monster icons" would pass
     against a map that had lost both. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.monsters = (S.monsters || []).concat([{ id: 'qa-mob2', x: 1560, y: 720, hp: 10, maxHp: 10 }]);
  });
  await P.page.waitForTimeout(500);
  const twoMobs = await P.page.evaluate(() => window.__btMinimap || null);
  rec.ok('two monsters draw two marks (guard)',
    !!(twoMobs && twoMobs.icons && twoMobs.icons.monster === 2), { icons: twoMobs && twoMobs.icons });

  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = (S.monsters || []).find((x) => x && x.id === 'qa-mob');
    if (m) m.alive = false;          /* exactly what monsterCombat does */
  });
  await P.page.waitForTimeout(500);
  const oneDead = await P.page.evaluate(() => window.__btMinimap || null);
  rec.ok('a dead monster loses its mark, and only its own',
    !!(oneDead && oneDead.icons && oneDead.icons.monster === 1), { icons: oneDead && oneDead.icons });

  /* The player chevron points where the player faces.  SECTORS order is
     E,SE,S,SW,W,NW,N,NE and the glyph is authored pointing north. */
  const rots = {};
  for (const [name, idx] of [['east', 0], ['south', 2], ['north', 6]]) {
    await P.page.evaluate((i) => {
      const S = window._gameState.current;
      S._facingAngle = i * Math.PI / 4; S._aimAngle = undefined; S.lockedMonster = null;
    }, idx);
    await P.page.waitForTimeout(350);
    const m = await P.page.evaluate(() => window.__btMinimap || null);
    rots[name] = m ? +m.facingRot.toFixed(3) : null;
  }
  console.log('    chevron rotations', JSON.stringify(rots));
  rec.ok('the you-arrow turns with your facing',
    rots.east !== rots.south && rots.south !== rots.north && rots.east !== rots.north, rots);
  rec.ok('...and points north when you face north',
    Math.abs(((rots.north % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - 2 * Math.PI) < 0.01
      || Math.abs(rots.north % (Math.PI * 2)) < 0.01,
    { north: rots.north });

  /* ═══ v2.3.1817: THE QUEST STAR POINTS AT THE RIGHT PORTAL ═══
     Owner: "Make star active quest mark marking portals that you're supposed
     to go to on minimap for next steps."

     "Is there a star" is not the claim worth testing — every portal already
     draws a mark.  What matters is WHICH one it lands on, and that it lands
     on nothing when there is nothing to point at.  So this drives the real
     quest state and checks the route the renderer resolved, including the two
     negative cases that a naive "star the destination" implementation gets
     wrong. */
  /* THE STAR IS EXCLUSIVE.  Asserted directly, because "the mayor uses npc"
     and "the star means quest" are two halves of one fix and the second is
     the one a future NPC_ICON entry would quietly break. */
  const censusNow = await P.page.evaluate(() => ((window.__btMinimap || {}).icons) || {});
  rec.ok('the star is not spent on anything but a quest destination',
    !censusNow.star || censusNow.star === 0, { census: censusNow });

  const route = () => P.page.evaluate(() => (window.__btMinimap || {}).questRoute || null);
  const setQuests = (obj) => P.page.evaluate((q) => {
    const S = window._gameState.current;
    if (!S.rpg) S.rpg = {};
    S.rpg._quests = q;
  }, obj);

  /* No quest -> nothing starred.  Without this, a star that is always drawn
     passes every positive check below. */
  await setQuests({});
  await P.page.waitForTimeout(400);
  rec.ok('with no active quest, no portal is starred', (await route()) === null, await route());

  /* tut_1 sends you to FROST.  Standing in TOWN, the next step is not a frost
     portal — town has none — it is the way up to the World View.  A literal
     destination match would star nothing here and read as "no quest". */
  await setQuests({ tut_1: 'active' });
  await P.page.waitForTimeout(400);
  const fromTown = await route();
  rec.ok('a frost quest in TOWN stars the way out of town, not nothing',
    !!(fromTown && fromTown.zoneId === 'worldview'), fromTown);
  /* And it is a real tile of this zone, not an off-map coordinate — the same
     failure two town reshapes have already caused for the exit tables. */
  rec.ok('...at a coordinate inside the town zone',
    !!(fromTown && fromTown.x > 0 && fromTown.y > 0
       && fromTown.x < 52 * 32 && fromTown.y < 55 * 32), fromTown);

  /* Already IN the target zone: the star must go away.  Otherwise it points
     at the way home while the quest says hunt here. */
  await P.page.evaluate(() => { window._gameState.current.currentZone = 'frost'; });
  await P.page.waitForTimeout(400);
  rec.ok('standing in the target zone stars nothing', (await route()) === null, await route());

  /* From the hub the spoke itself is present, so it is starred directly. */
  await P.page.evaluate(() => { window._gameState.current.currentZone = 'worldview'; });
  await P.page.waitForTimeout(400);
  const fromHub = await route();
  rec.ok('from the World View it stars the FROST spoke itself',
    !!(fromHub && fromHub.zoneId === 'frost'), fromHub);
  /* GUARD: a different quest must move the star, or the check above is
     satisfied by a hardcoded frost. */
  await setQuests({ tut_4: 'active' });
  await P.page.waitForTimeout(400);
  const emberHub = await route();
  rec.ok('...and a different quest stars a different spoke (guard)',
    !!(emberHub && emberHub.zoneId === 'ember'), { fromHub, emberHub });

  await P.ctx.close().catch(() => {});
}
