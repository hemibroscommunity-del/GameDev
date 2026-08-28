/* WHAT MAYOR BRO OFFERS AFTER HIS LAST COMPLETABLE QUEST — v2.3.1972.
 *
 * mp-questline walks tut_1 -> life_2 and stops there, because that is where
 * the content the owner wrote ends.  It is NOT where the quest CHAIN ends:
 * getNpcQuest walks QUEST_CHAINS in key order and Mayor Bro owns three more
 * after life_2 (mayor_1 "Visit 3 buildings in town", mayor_2, mayor_3).  So
 * the questline suite's own last assertion — "life_2: ...already offering his
 * next quest" — is green BECAUSE mayor_1 is offered, and nothing in the suite
 * has ever asked whether it can be finished.
 *
 * It cannot.  TOWN_PROPS_ENABLED is false (worldProps.js, v2.3.1813, owner:
 * "you can just keep the buildings and NPCS removed for now"), so
 * propsForZone('town') returns [], buildingPropNear finds nothing, and
 * BroTown's proximity scan leaves S.nearBuilding null on every frame in
 * every zone — enterBuilding() is the ONLY writer of S.stats.visitedBuildings
 * and it has no caller that can fire.  mayor_1's check is
 * `visitedBuildings.size >= 3`.  A gate whose key cannot be obtained is not a
 * gate, it is a wall (the v2.3.1779 phrasing, for the identical fault one
 * chain over).
 *
 * This file pins the three facts that make it a wall, so the day the props
 * come back it starts failing and somebody re-reads the filter:
 *   1. no building anywhere in the game raises an Enter prompt,
 *   2. mayor_1's own check therefore never turns true,
 *   3. and the giver does not offer it — the filter added in v2.3.1972 skips
 *      to the next quest he CAN pay out on.
 *
 * SETUP IS OVER THE WIRE ON PURPOSE.  The DOM road through all six quests is
 * mp-questline's job and takes three minutes; repeating it here would make
 * this file a slower copy of that one.  What is asserted is read from the
 * WORKER and from the live client, never from the setup's own echo.
 */
import * as H from './harness.mjs';
/* The live tables, not literals — the same posture mp-tutorial takes with
   QUEST_REWARDS.  A hardcoded door list here would go on "passing" the day
   somebody moves or re-enables the props, which is the one day this file
   exists to notice. */
import { WORLD_PROPS, propsForZone } from '../../../src/data/worldProps.js';

/* The six Mayor Bro quests a player can actually finish, and the objective
   item each one wants.  Same table as mp-questline's ARC — kept local rather
   than exported, because the two files ask different questions of it. */
const ARC = [
  { id: 'tut_1', give: { invKey: 'snowman', count: 4 } },
  { id: 'tut_2', give: { invKey: 'slime-remnants', count: 6 } },
  { id: 'tut_3', give: { invKey: 'skeleton-remnants', count: 5 } },
  { id: 'tut_4', give: { invKey: 'fire-goblin-remnants', count: 6 } },
  { id: 'life_1', give: { invKey: 'cooked_fish_minnow', count: 2 } },
  { id: 'life_2', give: { invKey: 'ore_copper', count: 5 } },
];

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Ender', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1200);
  const myId = await H.readState(P, (S) => S.myId);
  const srv = () => H.adminPlayer(wsPort, myId).then((a) => (a && a.rpg) || null).catch(() => null);

  /* ── clear his completable chain, over the wire ── */
  for (const step of ARC) {
    await P.page.evaluate((qid) => {
      const S = window._gameState && window._gameState.current;
      if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: qid } });
    }, step.id);
    await P.page.waitForTimeout(500);
    await H.grant(wsPort, myId, 'item', step.give);
    await P.page.waitForTimeout(700);
    await P.page.evaluate((qid) => {
      const S = window._gameState && window._gameState.current;
      /* 'sword' is a PROG3.SKILLS key (displayed "Melee"); the worker refuses
         an XP-paying turn-in that names no skill (v2.3.1669). */
      if (S && S.channel) S.channel.send({ type: 'quest_turn_in', payload: { questId: qid, xpCat: 'sword' } });
    }, step.id);
    await P.page.waitForTimeout(900);
  }
  const cleared = await srv();
  const q = (cleared && cleared._quests) || {};
  rec.ok('the six completable Mayor Bro quests are turned in (setup)',
    ARC.every((s) => q[s.id] === 'turnedIn'), q);

  /* ── 1. NO BUILDING IN THE GAME RAISES AN ENTER PROMPT ──
     Stand dead-centre on every TOWN_BUILDINGS rectangle AND on every
     world-prop door, a frame at a time, and read S.nearBuilding — the single
     field enterBuilding() is gated on.  Measured rather than reasoned about:
     TRAPS §24's rule is "has this handler ever run?", and this is the cheapest
     honest way to ask it of enterBuilding. */
  /* Both candidate geometries: the TOWN_BUILDINGS collision rectangles (what
     the quest text means by "buildings") and the world-prop doors (where the
     scan actually looks since v2.3.1778). */
  const doors = WORLD_PROPS.filter((p) => p && p.action && p.zone === 'town')
    .map((p) => ({ what: 'prop:' + p.id, x: p.x, y: p.y }));
  const probe = await P.page.evaluate(async (extra) => {
    const F = window._gameFns || {};
    const S = window._gameState && window._gameState.current;
    const B = F.TOWN_BUILDINGS || [];
    if (!S || !S.player) return null;
    const spots = [];
    for (const b of B) {
      if (!b || typeof b.bx !== 'number') continue;
      spots.push({ what: b.id, x: (b.bx + b.bw / 2) * 32, y: (b.by + b.bh / 2) * 32 });
    }
    for (const e of extra) spots.push(e);
    const hits = [];
    for (const s of spots) {
      S.player.x = s.x; S.player.y = s.y;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (S.nearBuilding !== null && S.nearBuilding !== undefined) hits.push(s.what);
    }
    return { tried: spots.length, hits };
  }, doors);
  rec.ok('every building position was probed (guard: an empty probe proves nothing)',
    !!probe && probe.tried >= 12, probe);
  rec.ok('no town building can be entered — the Enter prompt never appears',
    !!probe && probe.hits.length === 0, probe);
  rec.ok('...because the town props are switched off, so there are no doors',
    propsForZone('town').filter((p) => p && p.action).length === 0,
    { placed: doors.length, live: propsForZone('town').length });

  /* ── 2. mayor_1's OWN CHECK CAN NEVER TURN TRUE ──
     Asked of the shipped quest object rather than re-derived here, so a
     future rewrite of the check is caught instead of walked past. */
  const check = await P.page.evaluate(() => {
    const F = window._gameFns || {};
    const C = F.QUEST_CHAINS;
    const S = window._gameState && window._gameState.current;
    if (!C || !C.mayor_1 || !S) return null;
    let ready = null;
    try { ready = !!C.mayor_1.check(S.rpg || {}, S); } catch (e) { ready = 'threw:' + e.message; }
    const v = S.stats && S.stats.visitedBuildings;
    return { ready, visited: v ? (v.size !== undefined ? v.size : Object.keys(v).length) : 0 };
  });
  rec.ok("mayor_1's objective is unmet after visiting every building in town",
    !!check && check.ready === false && check.visited === 0, check);

  /* ── 3. SO HE MUST NOT OFFER IT ──
     v2.3.1972 filters an unreachable quest out of getNpcQuest, which is the
     lookup BOTH doors share (the Quests panel's Next Up, and the proximity
     dialogue).  Before the filter this returned mayor_1 and accepting it
     parked the player forever: the log shows one offer at a time, so an
     active-and-unfinishable quest suppresses every later one. */
  const offered = await P.page.evaluate(() => {
    const F = window._gameFns || {};
    const S = window._gameState && window._gameState.current;
    if (!F.getNpcQuest || !S) return null;
    const r = F.getNpcQuest(S.rpg || {}, 'Mayor Bro');
    /* THE CONTROL.  "He does not offer mayor_1" is vacuously true if mayor_1
       was never next in line, so re-derive what the UNFILTERED walk would have
       returned — the same first-incomplete-in-chain-order rule getNpcQuest
       uses, minus the skip.  Without this the assertions below would go on
       passing if somebody deleted the quest, renamed the giver, or reordered
       the table, and the filter they are here to check had rotted away.
       (TRAPS §23: a score with no control is a random number generator.) */
    let wouldHaveBeen = null;
    for (const [qid, q] of Object.entries(F.QUEST_CHAINS || {})) {
      if (!q || q.npc !== 'Mayor Bro') continue;
      const st = (S.rpg && S.rpg._quests || {})[qid];
      if (st === 'turnedIn') continue;
      wouldHaveBeen = qid;
      break;
    }
    return { id: r && r.quest && r.quest.id, status: r && r.status, wouldHaveBeen };
  });
  rec.ok('control: mayor_1 IS the quest an unfiltered walk would offer next',
    !!offered && offered.wouldHaveBeen === 'mayor_1', offered);
  rec.ok('Mayor Bro does not offer the building quest he cannot be paid for',
    !offered || offered.id !== 'mayor_1', offered);
  /* mayor_2 is "kill 5 monsters", server-verified through _creditQuestObjective
     — completable today, and the thing the skip is FOR.  A filter that ate the
     whole rest of his chain would be a different wall. */
  rec.ok('...he offers the next one that IS completable instead',
    !!offered && offered.id === 'mayor_2', offered);

  /* ── 4. AND THE SAME QUESTION FOR THE ONE AFTER THAT ──
     mayor_3 is "Clear any dungeon", and there is no way into a dungeon: the
     depth-tier tile-10 entrance is hard-disabled (`if (false && tile === 10)`,
     zoneTransitions.js, v2.3.54) and the custom-dungeon workshop is in
     farm_home, reachable only through the town Farm building's panel.  Hiding
     mayor_1 alone would have moved the dead end one quest along, so this
     checks the END of the chain rather than the next step: with mayor_2 also
     turned in, he must have NOTHING left rather than an errand he cannot take
     back.  Asked by simulating the finished blob rather than by grinding five
     kills — the walk is getNpcQuest's, and it is pure. */
  const atEnd = await P.page.evaluate(() => {
    const F = window._gameFns || {};
    if (!F.getNpcQuest || !F.QUEST_CHAINS) return null;
    const done = Object.create(null);
    for (const qid of Object.keys(F.QUEST_CHAINS)) {
      if (F.QUEST_CHAINS[qid].npc !== 'Mayor Bro') continue;
      if (qid === 'mayor_3') continue;      /* everything he CAN pay out on */
      done[qid] = 'turnedIn';
    }
    const r = F.getNpcQuest({ _quests: done }, 'Mayor Bro');
    return { id: r && r.quest && r.quest.id, status: r && r.status };
  });
  rec.ok('the chain ENDS after the last payable quest, rather than on a dead end',
    !!atEnd && !atEnd.id, atEnd);

  /* And the log agrees with the giver: two doors, one answer. */
  await H.openDest(P, 'Quests');
  await P.page.waitForTimeout(700);
  await H.clickText(P, 'Available').catch(() => {});
  await P.page.waitForTimeout(500);
  const panel = await H.bodyText(P);
  rec.ok('the Quests panel does not advertise it either',
    !/Welcome Home/.test(panel), panel.slice(0, 300));
  rec.ok('...and shows the completable one', /Into the Wild/.test(panel), panel.slice(0, 300));

  await P.ctx.close().catch(() => {});
}
