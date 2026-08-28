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

  /* The mayor's gate is a HARD one (v2.3.1676: no leaving town before
     accepting tut_1, which is what hands over the sword and shield), and it
     is not what this file is about — mp-townexit asserts it. Accepted the
     way every other travelling scenario does. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  await H.waitFor(P, (S) => !!((S.rpg || {})._quests || {}).tut_1, (v) => v === true,
    { timeout: 12000, label: 'tut_1 lands' }).catch(() => {});

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

  /* ═══ AN ANCHOR THAT IS NOT ON A TRAIL-HEAD ═══
     The world map is a HUB. WORLDVIEW_ARRIVAL (744, 848) is tile (23, 26) and
     the town trail-head is tile (24, 28) — Manhattan 3, against a
     TOWN_EXIT_R of 2. One step south of the arrival is inside the radius and
     the player is sent straight home, which is what the first cut of this
     file spent its whole walk doing: it measured a TOWN coordinate against
     the WORLD MAP's grid and called (806, 1680) a breach.
     So the walking tests run from a spot derived at runtime — walkable, and
     at least four tiles from EVERY live marker, computed from the same
     WORLDVIEW_EXITS the game reads rather than from a number typed here. */
  const marks = await P.page.evaluate(() =>
    ((window._gameFns && window._gameFns.WORLDVIEW_EXITS) || [])
      .map((e) => ({ zoneId: e.zoneId, tx: e.tx, ty: e.ty })));
  rec.ok('the world map declares its trail-heads (guard)', marks.length > 0, marks);
  const farFromMarks = (x, y) => {
    const tx = Math.floor(x / 32), ty = Math.floor(y / 32);
    /* EIGHT tiles, not four. TOWN_EXIT_R is 2, and a walking leg covers
       ground fast: from four tiles out the player is inside a trail-head's
       radius within half a second, which is what the first cut did on its
       very first sample. Eight tiles plus a leg short enough to be stopped
       by the wall keeps the walk on the map. */
    return marks.every((m) => Math.abs(tx - m.tx) + Math.abs(ty - m.ty) >= 8);
  };

  let anchor = null, wall = null;
  outer:
  for (let r = 60; r <= 500; r += 20) {
    for (let a = 0; a < 360; a += 10) {
      const x = Math.round(at.x + r * Math.cos(a * Math.PI / 180));
      const y = Math.round(at.y + r * Math.sin(a * Math.PI / 180));
      if (x < 60 || y < 60 || x > ZONE_W - 60 || y > ZONE_H - 60) continue;
      if (gridSolid(x, y) || !farFromMarks(x, y)) continue;
      /* ...with a wall within reach of it, or there is nothing to walk into —
         and no NEARER than 120px, or there is no run-up either and "did the
         player move" cannot tell a wall from a frozen client (the first cut
         picked a wall 40px out and failed its own guard on 23px of travel). */
      for (let wr = 120; wr <= 320; wr += 16) {
        for (let wa = 0; wa < 360; wa += 15) {
          const wx = Math.round(x + wr * Math.cos(wa * Math.PI / 180));
          const wy = Math.round(y + wr * Math.sin(wa * Math.PI / 180));
          if (wx < 8 || wy < 8 || wx > ZONE_W - 8 || wy > ZONE_H - 8) continue;
          if (!gridSolid(wx, wy)) continue;
          /* the ground between them has to be open, or the "wall" the walk
             stops at is not the one that was measured */
          let clear = true;
          for (let t = 16; t < wr - 8 && clear; t += 8) {
            const mx = x + t * Math.cos(wa * Math.PI / 180);
            const my = y + t * Math.sin(wa * Math.PI / 180);
            if (gridSolid(mx, my)) clear = false;
          }
          if (!clear) continue;
          anchor = { x, y }; wall = { x: wx, y: wy, r: wr, a: wa };
          break outer;
        }
      }
    }
  }
  rec.ok('there is open ground clear of every trail-head, with a wall within '
       + 'reach of it, to test against (guard)', !!anchor && !!wall, { anchor, wall });
  if (wall) {
    rec.ok(`the client calls that wall solid too (${wall.r}px from the anchor, `
         + `bearing ${wall.a})`,
      (await clientSolid(wall.x, wall.y)) === true, wall);
  }

  /* ── 3. AND YOU CANNOT WALK THROUGH IT ──
     The property the owner asked for, driven through the real movement code:
     hold the key toward the wall and see where the game leaves you. A player
     put ON a wall would be let out by the never-trap hatch, so the walk
     starts from open ground and heads at it. */
  /* ═══ EVERY SAMPLE CARRIES ITS ZONE ═══
     The world map is a HUB: its own exits are trail-heads a few tiles wide,
     and a long walk in any direction eventually stands on one. The first cut
     of this file did not check, so a leg that portalled into town kept
     walking — and reported a town coordinate (806, 1680, which is town's own
     bottom clamp) against the WORLD MAP's grid. Two coordinate systems, one
     verdict, and the verdict was nonsense.
     A leg that leaves the map is not a breach and not a pass: it ends, and
     the run says so. */
  const walkLeg = async (dir, ms, step = 400) => {
    const samples = [];
    await P.page.keyboard.down(dir);
    for (let t = 0; t < ms; t += step) {
      await P.page.waitForTimeout(step);
      const q = await H.readState(P, (S) => ({ zone: S.currentZone,
        x: Math.round(S.player.x), y: Math.round(S.player.y) }));
      if (q.zone !== 'worldview') { samples.push({ ...q, left: true }); break; }
      samples.push(q);
    }
    await P.page.keyboard.up(dir);
    await P.page.waitForTimeout(300);
    return samples;
  };
  const backToAnchor = async () => {
    const z = await H.readState(P, (S) => S.currentZone);
    if (z !== 'worldview' || !anchor) return false;
    await P.page.evaluate((p) => {
      const S = window._gameState.current;
      S.player.x = p.x; S.player.y = p.y;
    }, anchor);
    await P.page.waitForTimeout(400);
    return true;
  };

  if (wall && anchor) {
    const dir = Math.abs(wall.x - anchor.x) > Math.abs(wall.y - anchor.y)
      ? (wall.x > anchor.x ? 'd' : 'a') : (wall.y > anchor.y ? 's' : 'w');
    await backToAnchor();
    const legs = await walkLeg(dir, 2000, 250);
    const onMap = legs.filter((q) => !q.left);
    const end = onMap[onMap.length - 1] || anchor;
    rec.ok('walking at the wall actually moved the player (guard)',
      Math.hypot(end.x - anchor.x, end.y - anchor.y) > 20,
      { from: anchor, to: end, dir, legs });
    const through = onMap.filter((q) => gridSolid(q.x, q.y));
    rec.ok('...and never put them through the line',
      through.length === 0, { end, dir, through: through.slice(0, 3),
        leftTheMap: legs.some((q) => q.left) });
  }

  /* ── 4. THE RING HOLDS ON EVERY SIDE ──
     Four long walks outward. Every sample along the way has to be legal
     ground: one that is not means the player crossed a line, and the last
     sample being legal would not catch a pass THROUGH a wall into open
     ground beyond it. */
  const breaches = [], leftBy = [];
  for (const [dir, label] of [['w', 'north'], ['s', 'south'], ['a', 'west'], ['d', 'east']]) {
    if (!(await backToAnchor())) { leftBy.push(label + ' (off the map, skipped)'); continue; }
    const legs = await walkLeg(dir, 2000, 250);
    for (const q of legs) {
      if (q.left) { leftBy.push(label + ' -> ' + q.zone); break; }
      if (gridSolid(q.x, q.y)) { breaches.push({ label, ...q }); break; }
    }
  }
  rec.ok('walking hard at the rock wall in all four directions never crosses it',
    breaches.length === 0, { breaches, leftByPortal: leftBy });
  /* A run where every leg portalled out has proved nothing, and would
     otherwise be reported as a clean pass. */
  rec.ok('...and at least half those walks stayed on the map long enough to '
       + 'mean something', leftBy.length <= 2, { leftByPortal: leftBy });

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors while walking the world map', errs.length === 0, errs.slice(0, 3));

  await P.ctx.close().catch(() => {});
}
