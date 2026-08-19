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

  await P.ctx.close().catch(() => {});
}
