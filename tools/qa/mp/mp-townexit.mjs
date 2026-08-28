/* CAN YOU LEAVE TOWN, AND DO YOU SPAWN INSIDE A WALL? (v2.3.2078)
 *
 * Two bugs that had shipped together, both from v2.3.2073 giving all twelve
 * town props a footprint (owner: "It should be obvious but make sure the
 * objects are unwalkable"). The directive was right; two of the placements
 * were not survivable as walls.
 *
 * ── 1. THE SPAWN WAS INSIDE THE FOUNTAIN ──
 * TOWN_SPAWN was (815, 1010). The fountain's footprint starts at y 1018, and
 * the prop grid is stamped in 16px cells, so both land in grid row 63: the
 * spawn point was a blocked cell.
 *
 * That is not a small thing, because isSolid has a never-trap escape hatch
 * (v2.3.2075) — a player standing in a blocked cell may move in every
 * direction, or they would be stuck for good. So every player arrived with
 * collision effectively OFF and kept it off until they stepped onto a clear
 * cell. You could walk through the fountain, the forge, the mayor's house.
 *
 * It is invisible from inside the game and obvious from outside: ask
 * __btIsSolid from the spawn and NOTHING in town is solid; ask again from
 * open ground and the fountain, the forge and the gate all are. This
 * scenario asks both ways round, which is what makes the answer mean
 * something.
 *
 * ── 2. THE GATE WAS WALLED ──
 * The town's only way out is the stone staircase down the south cliff, and
 * TOWN_EXITS puts the World View trail-head on it at tile (25,48) — world
 * x 800..832. banner-gate-e stood at x 810 with a 78px footprint, stamping a
 * wall across x 771..849 straight over the top of the steps. Walking south
 * at x 660, 770, 816 and 860 all stopped dead at y 1412; only x 715 got
 * through, into a 110px gap west of the stairs that leads nowhere.
 *
 * ── WHY THIS IS DRIVEN AND NOT COMPUTED ──
 * Both bugs are visible in the prop table if you go looking, and neither was
 * found that way in weeks of the town being rearranged. The only check that
 * would have caught them is the one a player makes on their first minute:
 * spawn, walk south, leave. So that is what this does — held keys, the real
 * movement code, the real transition — and the geometry is only used to say
 * WHY when it fails.
 */
import * as H from './harness.mjs';

const TILE = 32;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Leaver', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);

  const probeOk = await P.page.evaluate(() => typeof window.__btIsSolid === 'function');
  rec.ok('the client answers where its walls are (guard)', probeOk);

  /* ── 1. YOU DO NOT SPAWN IN A WALL ──
     Asked at the spawn AND from open ground, because the escape hatch makes
     the first answer a lie whenever the spawn is bad: a client that reports
     "nothing is solid" from where it put you is reporting the bug. */
  const spawn = await H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y) }));
  const fromSpawn = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const f = (window.__btWorldProps ? window.__btWorldProps() : []).find((p) => p.id === 'fountain');
    return {
      here: window.__btIsSolid(S.player.x, S.player.y),
      fountain: f ? window.__btIsSolid(f.x, f.y - 4) : null,
    };
  });
  rec.ok('the client does not think you are standing in a wall', fromSpawn.here === false,
    { spawn, ...fromSpawn });
  rec.ok('THE REGRESSION: the world still has walls when asked from the spawn — '
       + 'a "nothing is solid" answer here means the escape hatch is holding '
       + 'the whole town open',
    fromSpawn.fountain === true, { spawn, ...fromSpawn });

  /* The same question from ground that is certainly clear, as the control:
     if THIS also said the fountain is walkable the probe would be broken
     rather than the spawn. */
  await H.hopTo(P, H.TOWN_CLEAN_SPOT.x, H.TOWN_CLEAN_SPOT.y);
  await P.page.waitForTimeout(400);
  const fromClear = await P.page.evaluate(() => {
    const f = (window.__btWorldProps ? window.__btWorldProps() : []).find((p) => p.id === 'fountain');
    return f ? window.__btIsSolid(f.x, f.y - 4) : null;
  });
  rec.ok('...and the same answer comes back from open ground (control)',
    fromClear === true, { fromClear, at: H.TOWN_CLEAN_SPOT });

  /* ── 2. THE GATE IS OPEN ──
     From the spawn, on foot, south — the walk a player makes to reach the
     "World View ↓" trail the game labels for them. */
  const exit = await P.page.evaluate(() => {
    const f = window._gameFns;
    const e = f && f.TOWN_EXITS && f.TOWN_EXITS.find((x) => x.zoneId === 'worldview');
    return e ? { tx: e.tx, ty: e.ty } : null;
  });
  rec.ok('town declares a way out to the world map (guard)', !!exit, exit);
  if (!exit) { await P.ctx.close().catch(() => {}); return; }

  const ex = exit.tx * TILE + TILE / 2, ey = exit.ty * TILE + TILE / 2;
  const gateSolid = await P.page.evaluate(([x, y]) => window.__btIsSolid(x, y), [ex, 1440]);
  rec.ok('the corridor above the exit tile is not walled off',
    gateSolid === false, { exit, probedAt: { x: ex, y: 1440 }, solid: gateSolid });

  /* ── THE MAYOR'S GATE COMES FIRST, AND IT IS SUPPOSED TO ──
     Owner, v2.3.1676: "not be allowed to leave town without speaking to mayor
     bro first. He'll give you the sword and shield." A HARD gate, and a fresh
     character walking south is meant to be turned back — so that is asserted
     before the gate is opened, or "you cannot leave town" would pass for the
     wrong reason and the banner wall would have hidden behind the tutorial. */
  await P.page.evaluate((s) => {
    const S = window._gameState.current;
    S.player.x = s.x; S.player.y = s.y;
  }, spawn);
  await P.page.waitForTimeout(400);
  await P.page.keyboard.down('s');
  const leftEarly = await H.waitFor(P, (S) => S.currentZone, (v) => v === 'worldview',
    { timeout: 6000, label: 'leave before the mayor' }).then(() => true).catch(() => false);
  await P.page.keyboard.up('s');
  await P.page.waitForTimeout(400);
  rec.ok('a character who has not met Mayor Bro is turned back at the gate',
    leftEarly === false, await H.readState(P, (S) => S.currentZone));

  /* Accept tut_1 the way every other scenario does — the quest record IS the
     gate ("has talked to him" and "is equipped to leave" are the same fact). */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  await H.waitFor(P, (S) => !!((S.rpg || {})._quests || {}).tut_1, (v) => v === true,
    { timeout: 12000, label: 'tut_1 lands' }).catch(() => {});
  rec.ok('the tutorial quest is on the character, so the gate is open (guard)',
    await H.readState(P, (S) => !!((S.rpg || {})._quests || {}).tut_1));

  /* Back to the spawn and walk it. Several legs, because the stairs are south
     of the plaza and the exit is a tile rather than the whole cliff edge:
     south to the gate row, then along it onto the trail-head. A player does
     the same thing with a thumb. */
  await P.page.evaluate((s) => {
    const S = window._gameState.current;
    S.player.x = s.x; S.player.y = s.y;
  }, spawn);
  await P.page.waitForTimeout(500);

  /* One leg: straight south. That is the whole point of where the spawn is —
     if the route out needs a detour round the fountain then the plaza is
     boxed in, and a scenario that zig-zags would hide it. */
  await P.page.keyboard.down('s');
  const reached = await H.waitFor(P, (S) => S.currentZone, (v) => v === 'worldview',
    { timeout: 14000, label: 'walk out of town' }).then(() => true).catch(() => false);
  await P.page.keyboard.up('s');
  await P.page.waitForTimeout(600);
  const end = await H.readState(P, (S) => ({
    zone: S.currentZone, x: Math.round(S.player.x), y: Math.round(S.player.y) }));
  rec.ok('THE REGRESSION: you can walk out of town to the world map',
    reached && end.zone === 'worldview', { end, exit, spawn });

  /* And you arrive somewhere legal, which is the owner's own ask on the
     world map: "make sure the player doesn't spawn on the line or outside
     of it". */
  if (end.zone === 'worldview') {
    const legal = await P.page.evaluate(() => {
      const S = window._gameState.current;
      return window.__btIsSolid(S.player.x, S.player.y);
    });
    rec.ok('...and you arrive on open ground, not inside the rock wall',
      legal === false, end);
  }

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors on the way out', errs.length === 0, errs.slice(0, 3));

  await P.ctx.close().catch(() => {});
}
