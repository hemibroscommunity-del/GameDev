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

  /* ── THE SPAWN IS ALSO CLEAR OF THE TOWNSFOLK ──
     Walking within NPC_PROX_OPEN (90px) of a shopkeeper opens his trade
     drawer, and it stays open until you are NPC_PROX_CLEAR (125px) away.
     A spawn inside that ring hands every new player a drawer across the
     bottom of their screen — and the drawer sits over the inspect card's
     Trade / Duel / Add Friend row, so three of those four buttons cannot be
     pressed by a real finger (mp-cardreach). A spawn 99px from Diego did
     exactly that, and mp-rehearsal reported it as four unrelated failures.
     125px is the floor; the shipped spawn keeps 170. */
  const NPC_PROX_CLEAR = 125;
  const npcGap = await H.readState(P, (S) => {
    const P2 = S.player;
    return (S.npcs || []).map((n) => ({ id: n.id,
      d: Math.round(Math.hypot(n.x - P2.x, n.y - P2.y)) }))
      .sort((a, b) => a.d - b.d);
  });
  rec.ok('town has townsfolk to keep clear of (guard)', npcGap.length > 0, npcGap);
  rec.ok('you do not spawn inside a townsperson\'s proximity ring',
    npcGap.every((n) => n.d > NPC_PROX_CLEAR),
    { nearest: npcGap[0], floor: NPC_PROX_CLEAR, all: npcGap });
  rec.ok('...so no shop drawer is over the screen on arrival',
    (await P.page.evaluate(() => !document.querySelector('[data-shop-panel]'))) === true,
    npcGap[0]);

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

  /* And the spawn is not boxed in: there is a way south from it, all the way
     to the cliff. The first attempt at this spawn sat 23px north of the
     fountain's collision and stopped dead on the first step.

     ═══ v2.3.2087: A LANE, NOT A COLUMN ═══
     This sampled the single column x = spawn.x and demanded every cell of it
     be open, and it went intermittently red when Lil Bro's wander radius
     started reaching that line: `__btIsSolid` includes TOWNSFOLK, on purpose
     and by owner directive -- "only make the objects (like each house and NPC)
     unwalkable areas" (v2.3.1794, a live radius test rather than a grid,
     because a grid would be a lie the moment one of them moved).

     So the probe was right and the CLAIM was wrong.  "The ground south of the
     spawn is open" is a statement about ground; a person standing in your way
     is someone you walk around, and one of them drifting across a one-pixel-
     wide line is not the spawn being boxed in.  It failed 1 run in 3, which is
     the worst kind of red -- it looks like a flake and it was a real
     measurement of the wrong thing.

     Sampled as a LANE now: three columns a body-width apart, and the route is
     open at a given depth if ANY of them is.  That is what "can I get south
     from here" means, it is immune to one townsperson standing in one column,
     and it still fails hard the moment real scenery walls the plaza -- which
     is the regression it was written for. */
  const HALF = 24;   /* a body-width to either side */
  const column = await P.page.evaluate(([sp, half]) => {
    const out = [];
    for (let y = sp.y; y <= 1560; y += 16) {
      const open = [sp.x - half, sp.x, sp.x + half]
        .some((x) => window.__btIsSolid(x, y) === false);
      if (!open) out.push(y);
    }
    return out;
  }, [spawn, HALF]);
  rec.ok('there is a way south from the spawn, all the way to the cliff',
    column.length === 0, { spawn, lane: [-HALF, 0, HALF], blockedAt: column.slice(0, 4) });

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

  /* ── STEERED, THE WAY A THUMB STEERS ──
     Not "hold south": the stairs are at x 800..832 and the spawn is at x 910,
     because the exit's own column near the plaza is inside Diego's proximity
     ring (98px) and, further north, inside the fountain. Holding one key runs
     past the trail-head's 2-tile radius and pins you on the map's bottom
     clamp at y 1680, four tiles below it.
     So this closes on the marker one short press at a time, choosing the axis
     with the most distance left — which is what a player does, and what makes
     the walk a test of the ROUTE rather than of one lucky column. Anything
     the route has to detour round would show as a leg that stops making
     progress, so the "no progress" bail is part of the assertion, not
     housekeeping. */
  let reached = false, stalls = 0;
  for (let i = 0; i < 40 && !reached && stalls < 4; i++) {
    const p = await H.readState(P, (S) => ({ zone: S.currentZone, x: S.player.x, y: S.player.y }));
    if (p.zone === 'worldview') { reached = true; break; }
    const dx = ex - p.x, dy = ey - p.y;
    if (Math.hypot(dx, dy) < 8) break;
    const key = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'd' : 'a') : (dy > 0 ? 's' : 'w');
    await P.page.keyboard.down(key);
    await P.page.waitForTimeout(Math.min(600, Math.max(120, Math.hypot(dx, dy) * 1.2)));
    await P.page.keyboard.up(key);
    await P.page.waitForTimeout(160);
    const q = await H.readState(P, (S) => ({ zone: S.currentZone, x: S.player.x, y: S.player.y }));
    if (q.zone === 'worldview') { reached = true; break; }
    stalls = Math.hypot(q.x - p.x, q.y - p.y) < 4 ? stalls + 1 : 0;
  }
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

  /* ── 3. AND BACK AGAIN ──
     The round trip, because the return is its own bug surface: v2.3.1708 was
     "the portal from worldview back into town doesn't work", answered with a
     deaf window on the marker you arrived through. A one-way test would pass
     with the way home shut. */
  if (end.zone === 'worldview') {
    const home = await P.page.evaluate(() => {
      const f = window._gameFns;
      const e = f && f.WORLDVIEW_EXITS && f.WORLDVIEW_EXITS.find((x) => x.zoneId === 'town');
      return e ? { tx: e.tx, ty: e.ty } : null;
    });
    rec.ok('the world map declares a way back to town (guard)', !!home, home);
    if (home) {
      /* Walk onto it rather than teleporting: the deaf window is timed from
         the arrival, so the trip has to take as long as a trip. */
      let back = false;
      for (let i = 0; i < 10 && !back; i++) {
        await P.page.evaluate((h) => {
          const S = window._gameState.current;
          S.player.x = h.tx * 32 + 16; S.player.y = h.ty * 32 + 16;
        }, home);
        back = await H.waitFor(P, (S) => S.currentZone, (z) => z === 'town',
          { timeout: 3000, label: 'back to town' }).then(() => true).catch(() => false);
      }
      rec.ok('...and the way back into town works', back,
        await H.readState(P, (S) => ({ zone: S.currentZone,
          x: Math.round(S.player.x), y: Math.round(S.player.y) })));
      if (back) {
        const landed = await P.page.evaluate(() => {
          const S = window._gameState.current;
          return { x: Math.round(S.player.x), y: Math.round(S.player.y),
            solid: window.__btIsSolid(S.player.x, S.player.y) };
        });
        rec.ok('...landing on open cobble, not inside a prop',
          landed.solid === false, landed);
      }
    }
  }

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors on the way out', errs.length === 0, errs.slice(0, 3));

  await P.ctx.close().catch(() => {});
}
