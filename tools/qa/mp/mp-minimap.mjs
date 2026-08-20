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

  const mid = await at(P, 1536, 700);
  console.log('    mid ', JSON.stringify(mid));
  rec.ok('the minimap is drawing in town', !!(mid && mid.visible && mid.zone === 'town'), { mid });
  if (!mid) { await P.ctx.close().catch(() => {}); return; }

  /* GUARD: the probe is live.  Everything below reads one object; if it were
     stale from the first frame, every comparison would still "agree". */
  const west = await at(P, 100, 700);
  const east = await at(P, 2972, 700);
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
  for (const [key, what] of [
    ['forge', 'the forge and the blacksmith'],
    ['bank', 'the bank'],
    ['enchant', 'the enchanter'],
    ['shop', 'the general store and the storekeeper'],
    ['house', "the mayor's house"],
    ['star', 'the mayor himself'],
    ['portal', 'the way out'],
  ]) {
    rec.ok(`${what} has its own symbol on the map`, (ic[key] || 0) > 0, { key, census: ic });
  }
  /* A trade shared by a building AND the person who runs it draws the same
     mark twice — that is the point, so you can find either one. */
  rec.ok('the blacksmith and his forge share the anvil', (ic.forge || 0) >= 2, { forge: ic.forge });
  rec.ok('the storekeeper and his store share the satchel', (ic.shop || 0) >= 2, { shop: ic.shop });
  /* GUARD: they are genuinely DIFFERENT textures, not one glyph counted
     under several names.  Six distinct keys is only possible if six
     distinct textures are in use. */
  rec.ok('at least six distinct symbols are actually in use (guard)',
    Object.keys(ic).length >= 6, { keys: Object.keys(ic) });

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
  rec.ok('a monster draws as the hostile spike, not another dot',
    !!(withMob && withMob.icons && withMob.icons.monster > 0), { icons: withMob && withMob.icons });

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

  await P.ctx.close().catch(() => {});
}
