/* THE PINK LINES ON THE WORLD MAP ARE WALLS (v2.3.2078)
 *
 * Owner, over two messages, sending the annotated overworld:
 *   "Use the pinkish line around the world view rock wall for blocked
 *    walkability and make sure the player doesn't spawn on the line or
 *    outside of it"
 *   "Actually just use this for walkability. Can't walk through pinkish
 *    lines"
 *
 * ── WHAT WAS NOT BEING CHECKED ──
 * The mask ships (mp-hubspawn asserts worldview_v4.webp is in the manifest)
 * and the grid is generated from the owner's own drawing. Neither of those is
 * the claim. The claim is that the CLIENT stops you, and the client has its
 * own opinion: isSolid consults the grid, the zone bounds, the prop
 * footprints and — since v2.3.2073 — a never-trap escape hatch that lets a
 * player standing inside a solid cell move out of it. A grid full of walls
 * and a client that ignores it look identical from the file.
 *
 * So this asks the game. `window.__btIsSolid(x, y)` is isSolid itself, and
 * every point below is checked against the SHIPPED grid and against the
 * client, and the two are required to agree.
 *
 * ── NOTHING IS HARD-CODED ──
 * The arrival point comes from the client, the wall comes from the grid the
 * client loaded, and the direction to walk is chosen by looking for one.
 * TRAPS §35: a coordinate copied out of the game stops being the game's
 * coordinate the moment anything moves, and this map has been re-cut twice
 * in a week.
 */
import * as H from './harness.mjs';

const MAP = '/maps/worldview_v4.walk.json';
const ZONE_W = 48 * 32, ZONE_H = 48 * 32;   /* zones.js worldview w/h x TILE */

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Wanderer', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);

  /* ── GET THERE THE WAY A PLAYER DOES ──
     Re-stand rather than wait once: a trail-head fires off the game loop's
     proximity scan and a single position write can land on a frame the loop
     skips (mp-harvest v2.3.1706). */
  /* TOWN_EXITS off the _gameFns bridge — the same table the game reads, in
     TILE coordinates, which is how mp-harvest gets out of town too. */
  const exit = await P.page.evaluate(() => {
    const f = window._gameFns;
    if (!f || !f.TOWN_EXITS) return null;
    const e = f.TOWN_EXITS.find((x) => x.zoneId === 'worldview');
    return e ? { tx: e.tx, ty: e.ty, zoneId: e.zoneId } : null;
  });
  rec.ok('town has an exit to the world map (guard)', !!exit, exit);
  if (!exit) { await P.ctx.close().catch(() => {}); return; }

  let reached = false;
  for (let i = 0; i < 8 && !reached; i++) {
    await P.page.evaluate((e) => {
      const S = window._gameState.current;
      S.player.x = e.tx * 32 + 16; S.player.y = e.ty * 32 + 16;
    }, exit);
    reached = await H.waitFor(P, (S) => S.currentZone, (z) => z === 'worldview',
      { timeout: 5000, label: 'reach worldview' }).then(() => true).catch(() => false);
  }
  rec.ok('the player reaches the world map', reached,
    await H.readState(P, (S) => S.currentZone));
  if (!reached) { await P.ctx.close().catch(() => {}); return; }
  await P.page.waitForTimeout(1200);

  /* ── THE SHIPPED GRID, AND THE CLIENT'S OWN ANSWER ── */
  const grid = await P.page.evaluate(async (u) => {
    const r = await fetch(u);
    return r.ok ? r.json() : null;
  }, MAP);
  rec.ok('the world map ships a walk mask', !!grid && !!grid.grid, grid && { w: grid.width, h: grid.height });
  if (!grid || !grid.grid) { await P.ctx.close().catch(() => {}); return; }
  const blockedCells = grid.grid.reduce((a, row) => a + row.filter((c) => c === false).length, 0);
  rec.ok('...with walls in it, not an empty grid',
    blockedCells > 0 && blockedCells < grid.width * grid.height,
    { blocked: blockedCells, of: grid.width * grid.height });

  const probeOk = await P.page.evaluate(() => typeof window.__btIsSolid === 'function');
  rec.ok('the client offers its own walkability answer (guard)', probeOk);
  const clientSolid = (x, y) => P.page.evaluate(([px, py]) => window.__btIsSolid(px, py), [x, y]);
  const gridSolid = (x, y) => {
    const tx = Math.floor(x * grid.width / ZONE_W);
    const ty = Math.floor(y * grid.height / ZONE_H);
    if (!(tx >= 0 && tx < grid.width && ty >= 0 && ty < grid.height)) return true;
    return grid.grid[ty][tx] === false;
  };

  /* ── 1. YOU DO NOT ARRIVE ON THE LINE ──
     The owner's first ask, in his words: "make sure the player doesn't spawn
     on the line or outside of it". */
  const at = await H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y) }));
  rec.ok('you arrive INSIDE the ring, on open ground and not on the wall',
    !gridSolid(at.x, at.y), { at, gridSaysWall: gridSolid(at.x, at.y) });
  rec.ok('...and the client agrees you are standing somewhere legal',
    (await clientSolid(at.x, at.y)) === false, at);

  /* ── 2. A WALL THE GRID KNOWS ABOUT IS A WALL THE CLIENT KNOWS ABOUT ──
     Found by looking, not remembered: step outward from the arrival point
     until the grid says wall. */
  let wall = null;
  for (let r = 40; r <= 700 && !wall; r += 20) {
    for (let a = 0; a < 360; a += 15) {
      const x = at.x + r * Math.cos(a * Math.PI / 180);
      const y = at.y + r * Math.sin(a * Math.PI / 180);
      if (x < 8 || y < 8 || x > ZONE_W - 8 || y > ZONE_H - 8) continue;
      if (gridSolid(x, y)) { wall = { x: Math.round(x), y: Math.round(y), r, a }; break; }
    }
  }
  rec.ok('there is a wall within reach of the arrival point to test against (guard)',
    !!wall, wall);
  if (wall) {
    rec.ok(`the client calls that wall solid too (${wall.r}px out, bearing ${wall.a})`,
      (await clientSolid(wall.x, wall.y)) === true, wall);
  }

  /* ── 3. AND YOU CANNOT WALK THROUGH IT ──
     The property the owner asked for, driven through the real movement code:
     hold the key toward the wall and see where the game leaves you. A player
     put ON a wall would be let out by the never-trap hatch, so the walk
     starts from open ground and heads at it. */
  if (wall) {
    const dir = Math.abs(wall.x - at.x) > Math.abs(wall.y - at.y)
      ? (wall.x > at.x ? 'd' : 'a') : (wall.y > at.y ? 's' : 'w');
    await P.page.evaluate((p) => {
      const S = window._gameState.current;
      S.player.x = p.x; S.player.y = p.y;
    }, at);
    await P.page.waitForTimeout(400);
    await P.page.keyboard.down(dir);
    await P.page.waitForTimeout(4000);
    await P.page.keyboard.up(dir);
    await P.page.waitForTimeout(500);
    const end = await H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y) }));
    rec.ok('walking at the wall actually moved the player (guard)',
      Math.hypot(end.x - at.x, end.y - at.y) > 30, { from: at, to: end, dir });
    rec.ok('...and left them on walkable ground, not through the line',
      !gridSolid(end.x, end.y), { end, dir, gridSaysWall: gridSolid(end.x, end.y) });
  }

  /* ── 4. THE RING HOLDS ON EVERY SIDE ──
     Four long walks outward. Every sample along the way has to be legal
     ground: one that is not means the player crossed a line, and the last
     sample being legal would not catch a pass THROUGH a wall into open
     ground beyond it. */
  const breaches = [];
  for (const [dir, label] of [['w', 'north'], ['s', 'south'], ['a', 'west'], ['d', 'east']]) {
    await P.page.evaluate((p) => {
      const S = window._gameState.current;
      S.player.x = p.x; S.player.y = p.y;
    }, at);
    await P.page.waitForTimeout(350);
    await P.page.keyboard.down(dir);
    for (let i = 0; i < 14; i++) {
      await P.page.waitForTimeout(400);
      const p = await H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y) }));
      if (gridSolid(p.x, p.y)) { breaches.push({ label, ...p }); break; }
    }
    await P.page.keyboard.up(dir);
    await P.page.waitForTimeout(300);
  }
  rec.ok('walking hard at the rock wall in all four directions never crosses it',
    breaches.length === 0, breaches);

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors while walking the world map', errs.length === 0, errs.slice(0, 3));

  await P.ctx.close().catch(() => {});
}
